import os
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, Query, Request, Response, Cookie
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
import bcrypt
from jose import jwt, JWTError

from .database import get_db, engine, Base
from .models import (
    User, Patient, PatientNote, Appointment, SMSReminderLog,
    LoginEvent, AuditLog, OTPCode, Pending2FASession
)
from .schemas import (
    LoginRequest, LoginResponse, LoginInitResponse, UserResponse,
    Send2FARequest, Verify2FARequest, GoogleLoginRequest, UserCreateRequest, Update2FAInfoRequest,
    PatientCreate, PatientResponse, PatientDetailResponse,
    PatientNoteCreate, PatientNoteResponse,
    AppointmentCreate, AppointmentResponse, AppointmentUpdate,
    SMSReminderRequest, SMSReminderResponse, SMSReminderLogResponse,
    AdminStatsResponse, LoginEventResponse, AuditLogResponse
)
from .seed import seed_database
from .utils import (
    mask_phone, mask_email, format_relative_time, generate_otp_code, hash_code,
    check_login_rate_limit, check_otp_rate_limit, log_login_event, create_audit_entry,
    send_otp_sms, send_otp_email
)

# Initialize database schema and auto-seed on app boot
Base.metadata.create_all(bind=engine)
seed_database()

JWT_SECRET = os.getenv("JWT_SECRET", "medflow-clinic-jwt-secret-key-2026")
ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = (plain_password or "").encode('utf-8')[:72]
        hash_bytes = (hashed_password or "").encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False

def hash_password(password: str) -> str:
    pwd_bytes = (password or "").encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def create_access_token(user: User) -> str:
    # 15 minutes short-lived access token
    expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "type": "access",
        "exp": expire
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def create_refresh_token(user: User) -> str:
    # 7 days long-lived refresh token
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {
        "sub": user.id,
        "type": "refresh",
        "exp": expire
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def create_pending_2fa_token(user: User) -> str:
    # 5 minutes pending 2FA token
    expire = datetime.utcnow() + timedelta(minutes=5)
    to_encode = {
        "sub": user.id,
        "type": "pending_2fa",
        "exp": expire
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

def format_user(user: User) -> dict:
    active = False
    if user.last_login_at:
        diff = datetime.utcnow() - user.last_login_at
        active = diff.total_seconds() < 1800 # 30 mins
    return {
        "id": user.id,
        "email": user.email,
        "fullName": user.full_name,
        "role": user.role,
        "specialty": user.specialty,
        "phone": user.phone,
        "lastLoginAt": user.last_login_at.isoformat() if user.last_login_at else None,
        "isCurrentlyActive": active or user.is_currently_active
    }

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized: Missing Authorization Bearer token."
        )
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid auth token payload.")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found.")
    return user

def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            return None
        user_id: str = payload.get("sub")
        if not user_id:
            return None
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None

def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Administrative privileges required."
        )
    return current_user

def require_doctor(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["doctor", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Clinical notes can only be recorded by licensed medical doctors."
        )
    return current_user

app = FastAPI(
    title="MedFlow Clinic System API",
    description="FastAPI Backend with 2FA, OAuth, Audit Logs, and Refresh Tokens.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "database": "connected",
        "service": "FastAPI Clinic Backend",
        "version": "2.0.0 (Hardened Auth & 2FA)"
    }

# --- AUTH ROUTES ---

@app.post("/api/auth/login", response_model=LoginInitResponse)
def login_init(credentials: LoginRequest, request: Request, db: Session = Depends(get_db)):
    email = credentials.email.strip().lower()
    password = credentials.password

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    # Rate limiting check (max 5 tries per 15 min per email)
    if not check_login_rate_limit(db, email):
        log_login_event(
            db, email=email, method="password", success=False,
            ip_address=request.client.host if request.client else "127.0.0.1",
            failure_reason="Rate limit exceeded (5 attempts in 15 mins)"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 15 minutes before trying again."
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        log_login_event(
            db, email=email, method="password", success=False,
            user_id=user.id if user else None,
            user_name=user.full_name if user else None,
            ip_address=request.client.host if request.client else "127.0.0.1",
            failure_reason="Invalid credentials"
        )
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    # Generate 2FA pending session & 6-digit OTP code
    pending_token = create_pending_2fa_token(user)
    token_h = hash_code(pending_token)

    pending_sess = Pending2FASession(
        id=f"p2fa-{uuid.uuid4().hex[:6]}",
        token_hash=token_h,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(pending_sess)

    raw_code = generate_otp_code()
    default_method = "sms" if user.phone else "email"

    otp_obj = OTPCode(
        id=f"otp-{uuid.uuid4().hex[:6]}",
        user_id=user.id,
        code_hash=hash_code(raw_code),
        method=default_method,
        purpose="login",
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(otp_obj)
    db.commit()

    # Dispatch OTP code
    if default_method == "sms":
        send_otp_sms(user.phone or "+254 700 000000", raw_code, user.full_name)
    else:
        send_otp_email(user.email, raw_code, user.full_name)

    return {
        "requires2FA": True,
        "pendingToken": pending_token,
        "userId": user.id,
        "maskedPhone": mask_phone(user.phone),
        "maskedEmail": mask_email(user.email),
        "availableMethods": ["sms", "email"] if user.phone else ["email"],
        "defaultMethod": default_method
    }

@app.post("/api/auth/2fa/send")
def send_2fa_code(payload: Send2FARequest, db: Session = Depends(get_db)):
    token_h = hash_code(payload.pendingToken)
    sess = db.query(Pending2FASession).filter(
        Pending2FASession.token_hash == token_h,
        Pending2FASession.used == False,
        Pending2FASession.expires_at > datetime.utcnow()
    ).first()

    if not sess:
        # Return generic message to prevent enumeration
        return {"success": True, "message": "If a valid account session exists, a 2FA verification code has been dispatched."}

    # Rate limiting check (max 3 OTP requests per 15 min)
    if not check_otp_rate_limit(db, sess.user_id):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="2FA request limit reached. Please wait 15 minutes before requesting a new code."
        )

    user = db.query(User).filter(User.id == sess.user_id).first()
    if not user:
        return {"success": True, "message": "If a valid account session exists, a 2FA verification code has been dispatched."}

    raw_code = generate_otp_code()
    method = payload.method if payload.method in ["sms", "email"] else "sms"

    otp_obj = OTPCode(
        id=f"otp-{uuid.uuid4().hex[:6]}",
        user_id=user.id,
        code_hash=hash_code(raw_code),
        method=method,
        purpose="login",
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(otp_obj)
    db.commit()

    if method == "sms":
        send_otp_sms(user.phone or "+254 700 000000", raw_code, user.full_name)
    else:
        send_otp_email(user.email, raw_code, user.full_name)

    return {"success": True, "message": "If a valid account session exists, a 2FA verification code has been dispatched."}

@app.post("/api/auth/2fa/verify")
def verify_2fa(
    payload: Verify2FARequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    token_h = hash_code(payload.pendingToken)
    sess = db.query(Pending2FASession).filter(
        Pending2FASession.token_hash == token_h,
        Pending2FASession.used == False
    ).first()

    if not sess or sess.expires_at < datetime.utcnow():
        log_login_event(
            db, email="unknown", method="2fa_verify", success=False,
            ip_address=request.client.host if request.client else "127.0.0.1",
            failure_reason="Expired or invalid 2FA pending session"
        )
        raise HTTPException(status_code=400, detail="Invalid or expired verification session. Please log in again.")

    user = db.query(User).filter(User.id == sess.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User account not found.")

    code_h = hash_code(payload.code.strip())
    otp = db.query(OTPCode).filter(
        OTPCode.user_id == user.id,
        OTPCode.code_hash == code_h,
        OTPCode.used == False,
        OTPCode.expires_at > datetime.utcnow()
    ).first()

    if not otp:
        log_login_event(
            db, email=user.email, method="2fa_verify", success=False,
            user_id=user.id, user_name=user.full_name,
            ip_address=request.client.host if request.client else "127.0.0.1",
            failure_reason="Invalid or expired 2FA code"
        )
        raise HTTPException(status_code=400, detail="Invalid or expired verification code. Please check your entry and try again.")

    # Mark OTP & Pending session used
    otp.used = True
    sess.used = True

    user.last_login_at = datetime.utcnow()
    user.is_currently_active = True
    db.commit()

    log_login_event(
        db, email=user.email, method=f"password+{otp.method}_otp", success=True,
        user_id=user.id, user_name=user.full_name,
        ip_address=request.client.host if request.client else "127.0.0.1"
    )

    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    # Set httpOnly cookie for long-lived refresh token
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        path="/",
        max_age=7 * 24 * 3600,
        samesite="lax"
    )

    return {
        "user": format_user(user),
        "token": access_token,
        "refreshToken": refresh_token
    }

@app.post("/api/auth/refresh")
def refresh_token(
    request: Request,
    response: Response,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: Session = Depends(get_db)
):
    token = refresh_token_cookie
    if not token:
        # Fallback to Authorization header if cookie not provided
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(status_code=401, detail="Missing refresh token cookie or header.")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token type.")
        user_id = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Expired or invalid refresh token.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User record not found.")

    user.is_currently_active = True
    db.commit()

    new_access_token = create_access_token(user)
    new_refresh_token = create_refresh_token(user)

    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        path="/",
        max_age=7 * 24 * 3600,
        samesite="lax"
    )

    return {
        "token": new_access_token,
        "refreshToken": new_refresh_token,
        "user": format_user(user)
    }

@app.post("/api/auth/logout")
def logout(response: Response, current_user: Optional[User] = Depends(get_optional_current_user), db: Session = Depends(get_db)):
    if current_user:
        current_user.is_currently_active = False
        db.commit()

    response.delete_cookie(key="refresh_token", path="/")
    return {"success": True, "message": "Logged out successfully."}

@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"user": format_user(current_user)}

# Google OAuth Integration Endpoint
@app.get("/api/auth/google/login")
def google_login_url():
    client_id = os.getenv("GOOGLE_CLIENT_ID", "mock-google-client-id")
    return {
        "url": f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={client_id}&redirect_uri=http://localhost:3000/api/auth/google/callback&scope=openid%20email%20profile"
    }

@app.post("/api/auth/google/verify")
def google_verify(payload: GoogleLoginRequest, request: Request, db: Session = Depends(get_db)):
    email = (payload.email or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Google email credential is required.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        log_login_event(
            db, email=email, method="google", success=False,
            ip_address=request.client.host if request.client else "127.0.0.1",
            failure_reason="No matching staff account found"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: No staff account registered for '{email}'. Google Sign-In is restricted to pre-authorized clinic personnel."
        )

    # Mandatory 2FA for Google Sign In as well!
    pending_token = create_pending_2fa_token(user)
    token_h = hash_code(pending_token)

    pending_sess = Pending2FASession(
        id=f"p2fa-{uuid.uuid4().hex[:6]}",
        token_hash=token_h,
        user_id=user.id,
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(pending_sess)

    raw_code = generate_otp_code()
    default_method = "sms" if user.phone else "email"

    otp_obj = OTPCode(
        id=f"otp-{uuid.uuid4().hex[:6]}",
        user_id=user.id,
        code_hash=hash_code(raw_code),
        method=default_method,
        purpose="login",
        expires_at=datetime.utcnow() + timedelta(minutes=5)
    )
    db.add(otp_obj)
    db.commit()

    if default_method == "sms":
        send_otp_sms(user.phone or "+254 700 000000", raw_code, user.full_name)
    else:
        send_otp_email(user.email, raw_code, user.full_name)

    return {
        "requires2FA": True,
        "pendingToken": pending_token,
        "userId": user.id,
        "maskedPhone": mask_phone(user.phone),
        "maskedEmail": mask_email(user.email),
        "availableMethods": ["sms", "email"] if user.phone else ["email"],
        "defaultMethod": default_method
    }

# --- STAFF USER SELF SERVICE ---
@app.put("/api/users/me")
def update_my_contact_info(
    payload: Update2FAInfoRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.currentPassword, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password verification failed. Please try again.")

    updated_fields = []
    if payload.phone and payload.phone.strip() != current_user.phone:
        current_user.phone = payload.phone.strip()
        updated_fields.append("phone number")
    if payload.email and payload.email.strip().lower() != current_user.email:
        # Check unique
        existing = db.query(User).filter(User.email == payload.email.strip().lower()).first()
        if existing and existing.id != current_user.id:
            raise HTTPException(status_code=400, detail="This email address is already in use by another staff member.")
        current_user.email = payload.email.strip().lower()
        updated_fields.append("email address")

    db.commit()

    create_audit_entry(
        db, user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role,
        action="updated_2fa_info", entity_type="staff", entity_id=current_user.id,
        details={"updatedFields": updated_fields, "newPhone": current_user.phone, "newEmail": current_user.email}
    )

    return {"success": True, "message": "2FA contact information updated successfully.", "user": format_user(current_user)}

# --- ADMIN ENDPOINTS ---

@app.post("/api/admin/users", status_code=status.HTTP_201_CREATED)
def admin_create_user(
    req: UserCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    email = req.email.strip().lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user account with this email address already exists.")

    new_user = User(
        id=f"u-{uuid.uuid4().hex[:6]}",
        email=email,
        password_hash=hash_password(req.password),
        full_name=req.fullName.strip(),
        role=req.role.strip().lower(),
        specialty=req.specialty.strip() if req.specialty else None,
        phone=req.phone.strip() if req.phone else None
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    create_audit_entry(
        db, user_id=admin_user.id, user_name=admin_user.full_name, user_role=admin_user.role,
        action="created_user", entity_type="user", entity_id=new_user.id,
        details={"newUserName": new_user.full_name, "newUserRole": new_user.role, "email": new_user.email}
    )

    return format_user(new_user)

@app.get("/api/admin/users")
def get_admin_users(admin_user: User = Depends(require_admin), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [format_user(u) for u in users]

@app.get("/api/admin/logins")
def get_login_events(
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(LoginEvent)
    if user_id and user_id != "all":
        query = query.filter(LoginEvent.user_id == user_id)

    total = query.count()
    events = query.order_by(desc(LoginEvent.timestamp)).offset((page - 1) * limit).limit(limit).all()

    items = []
    for e in events:
        usr = db.query(User).filter(User.id == e.user_id).first() if e.user_id else None
        items.append({
            "id": e.id,
            "userId": e.user_id,
            "userName": e.user_name or (usr.full_name if usr else "Unknown User"),
            "email": e.email,
            "method": e.method,
            "ipAddress": e.ip_address,
            "userAgent": e.user_agent,
            "success": e.success,
            "failureReason": e.failure_reason,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            "relativeTime": format_relative_time(e.timestamp)
        })

    return {"items": items, "total": total, "page": page, "limit": limit}

@app.get("/api/admin/audit-logs")
def get_audit_logs(
    user_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if user_id and user_id != "all":
        query = query.filter(AuditLog.user_id == user_id)

    total = query.count()
    logs = query.order_by(desc(AuditLog.created_at)).offset((page - 1) * limit).limit(limit).all()

    items = []
    for l in logs:
        det = {}
        if l.details:
            try:
                det = json.loads(l.details)
            except Exception:
                pass

        # Human friendly description
        desc_text = f"{l.user_name} ({l.user_role}) performed {l.action}"
        if l.action == "created_patient":
            desc_text = f"{l.user_name} ({l.user_role}) registered patient {det.get('patientName', 'a patient')}"
        elif l.action == "appended_note":
            desc_text = f"{l.user_name} ({l.user_role}) appended a clinical note for patient {det.get('patientName', '')}"
        elif l.action == "booked_appointment":
            desc_text = f"{l.user_name} ({l.user_role}) scheduled an appointment for patient {det.get('patientName', '')}"
        elif l.action == "updated_appointment":
            desc_text = f"{l.user_name} ({l.user_role}) updated appointment status to {det.get('status', '')}"
        elif l.action == "created_user":
            desc_text = f"{l.user_name} ({l.user_role}) created staff account for {det.get('newUserName', '')} ({det.get('newUserRole', '')})"
        elif l.action == "updated_2fa_info":
            desc_text = f"{l.user_name} ({l.user_role}) updated their 2FA contact information"

        items.append({
            "id": l.id,
            "userId": l.user_id,
            "userName": l.user_name,
            "userRole": l.user_role,
            "action": l.action,
            "entityType": l.entity_type,
            "entityId": l.entity_id,
            "details": det,
            "createdAt": l.created_at.isoformat() if l.created_at else None,
            "relativeTime": format_relative_time(l.created_at),
            "description": desc_text
        })

    return {"items": items, "total": total, "page": page, "limit": limit}

# --- DOCTORS ENDPOINT ---
@app.get("/api/doctors")
def get_doctors(db: Session = Depends(get_db)):
    doctors = db.query(User).filter(User.role == "doctor").all()
    return [format_user(d) for d in doctors]

# --- PATIENTS ENDPOINTS ---
@app.get("/api/patients")
def get_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    result = []
    for p in patients:
        result.append({
            "id": p.id,
            "fullName": p.full_name,
            "phone": p.phone,
            "email": p.email,
            "nationalId": p.national_id,
            "dob": p.dob,
            "gender": p.gender,
            "bloodType": p.blood_type,
            "allergies": p.allergies,
            "preExistingConditions": p.pre_existing_conditions,
            "createdAt": p.created_at.isoformat() if p.created_at else None
        })
    return result

@app.post("/api/patients", status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Patient).filter(Patient.national_id == patient_in.national_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient with this National ID already exists.")

    new_patient = Patient(
        id=f"p-{uuid.uuid4().hex[:6]}",
        full_name=patient_in.full_name,
        phone=patient_in.phone,
        email=patient_in.email,
        national_id=patient_in.national_id,
        dob=patient_in.dob,
        gender=patient_in.gender,
        blood_type=patient_in.blood_type or "Unknown",
        allergies=patient_in.allergies or "None",
        pre_existing_conditions=patient_in.pre_existing_conditions or "None"
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    # Write Audit Log
    create_audit_entry(
        db, user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role,
        action="created_patient", entity_type="patient", entity_id=new_patient.id,
        details={"patientName": new_patient.full_name, "nationalId": new_patient.national_id}
    )

    return {
        "id": new_patient.id,
        "fullName": new_patient.full_name,
        "phone": new_patient.phone,
        "email": new_patient.email,
        "nationalId": new_patient.national_id,
        "dob": new_patient.dob,
        "gender": new_patient.gender,
        "bloodType": new_patient.blood_type,
        "allergies": new_patient.allergies,
        "preExistingConditions": new_patient.pre_existing_conditions
    }

@app.get("/api/patients/{patient_id}")
def get_patient_detail(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    notes_db = db.query(PatientNote).filter(PatientNote.patient_id == patient_id).order_by(desc(PatientNote.created_at)).all()
    appointments_db = db.query(Appointment).filter(Appointment.patient_id == patient_id).order_by(desc(Appointment.datetime_slot)).all()

    formatted_notes = []
    for n in notes_db:
        vitals = {}
        if n.vitals_json:
            try:
                vitals = json.loads(n.vitals_json)
            except Exception:
                pass
        formatted_notes.append({
            "id": n.id,
            "patientId": n.patient_id,
            "doctorId": n.doctor_id,
            "doctorName": n.doctor_name,
            "visitType": n.visit_type,
            "note": n.note,
            "vitals": vitals,
            "createdAt": n.created_at.isoformat() if n.created_at else None
        })

    formatted_apts = []
    for a in appointments_db:
        doc = db.query(User).filter(User.id == a.doctor_id).first()
        formatted_apts.append({
            "id": a.id,
            "patientId": a.patient_id,
            "patientName": patient.full_name,
            "patientPhone": patient.phone,
            "doctorId": a.doctor_id,
            "doctorName": doc.full_name if doc else "Doctor",
            "doctorSpecialty": doc.specialty if doc else "",
            "datetimeSlot": a.datetime_slot,
            "reason": a.reason,
            "status": a.status,
            "notes": a.notes,
            "createdAt": a.created_at.isoformat() if a.created_at else None
        })

    return {
        "patient": {
            "id": patient.id,
            "fullName": patient.full_name,
            "phone": patient.phone,
            "email": patient.email,
            "nationalId": patient.national_id,
            "dob": patient.dob,
            "gender": patient.gender,
            "bloodType": patient.blood_type,
            "allergies": patient.allergies,
            "preExistingConditions": patient.pre_existing_conditions,
            "createdAt": patient.created_at.isoformat() if patient.created_at else None
        },
        "notes": formatted_notes,
        "appointments": formatted_apts
    }

# --- CLINICAL NOTES ENDPOINTS ---
@app.post("/api/patients/{patient_id}/notes", status_code=status.HTTP_201_CREATED)
def append_clinical_note(
    patient_id: str,
    note_in: PatientNoteCreate,
    current_user: User = Depends(require_doctor),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    vitals_str = json.dumps(note_in.vitals) if note_in.vitals else "{}"

    new_note = PatientNote(
        id=f"n-{uuid.uuid4().hex[:6]}",
        patient_id=patient_id,
        doctor_id=current_user.id,
        doctor_name=current_user.full_name,
        visit_type=note_in.visit_type or "General Encounter",
        note=note_in.note,
        vitals_json=vitals_str
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    # Write Audit Log
    create_audit_entry(
        db, user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role,
        action="appended_note", entity_type="patient_note", entity_id=new_note.id,
        details={"patientId": patient_id, "patientName": patient.full_name, "visitType": new_note.visit_type}
    )

    return {
        "id": new_note.id,
        "patientId": new_note.patient_id,
        "doctorId": new_note.doctor_id,
        "doctorName": new_note.doctor_name,
        "visitType": new_note.visit_type,
        "note": new_note.note,
        "vitals": note_in.vitals or {},
        "createdAt": new_note.created_at.isoformat() if new_note.created_at else None
    }

@app.put("/api/notes/{note_id}")
def update_note(note_id: str):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Medical Compliance Error: Medical records and clinical notes are immutable once committed to prevent tampering."
    )

@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Medical Compliance Error: Medical records and clinical notes are immutable once committed to prevent tampering."
    )

# --- APPOINTMENT ENDPOINTS ---
@app.get("/api/appointments")
def get_appointments(
    date: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(Appointment)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    if date:
        query = query.filter(Appointment.datetime_slot.like(f"{date}%"))

    apts = query.order_by(Appointment.datetime_slot.asc()).all()
    result = []
    for a in apts:
        patient = db.query(Patient).filter(Patient.id == a.patient_id).first()
        doctor = db.query(User).filter(User.id == a.doctor_id).first()
        result.append({
            "id": a.id,
            "patientId": a.patient_id,
            "patientName": patient.full_name if patient else "Unknown Patient",
            "patientPhone": patient.phone if patient else "",
            "doctorId": a.doctor_id,
            "doctorName": doctor.full_name if doctor else "Unknown Doctor",
            "doctorSpecialty": doctor.specialty if doctor else "",
            "datetimeSlot": a.datetime_slot,
            "reason": a.reason,
            "status": a.status,
            "notes": a.notes,
            "createdAt": a.created_at.isoformat() if a.created_at else None
        })
    return result

@app.post("/api/appointments", status_code=status.HTTP_201_CREATED)
def create_appointment(
    apt_in: AppointmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == apt_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    doctor = db.query(User).filter(User.id == apt_in.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor account not found.")

    conflict = db.query(Appointment).filter(
        Appointment.doctor_id == apt_in.doctor_id,
        Appointment.datetime_slot == apt_in.datetime_slot,
        Appointment.status != "cancelled"
    ).first()

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Double-booking conflict: {doctor.full_name} already has an appointment scheduled at {apt_in.datetime_slot}."
        )

    new_apt = Appointment(
        id=f"apt-{uuid.uuid4().hex[:6]}",
        patient_id=apt_in.patient_id,
        doctor_id=apt_in.doctor_id,
        datetime_slot=apt_in.datetime_slot,
        reason=apt_in.reason,
        status="scheduled"
    )
    db.add(new_apt)
    db.commit()
    db.refresh(new_apt)

    create_audit_entry(
        db, user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role,
        action="booked_appointment", entity_type="appointment", entity_id=new_apt.id,
        details={"patientName": patient.full_name, "doctorName": doctor.full_name, "slot": new_apt.datetime_slot}
    )

    return {
        "id": new_apt.id,
        "patientId": new_apt.patient_id,
        "patientName": patient.full_name,
        "patientPhone": patient.phone,
        "doctorId": new_apt.doctor_id,
        "doctorName": doctor.full_name,
        "doctorSpecialty": doctor.specialty,
        "datetimeSlot": new_apt.datetime_slot,
        "reason": new_apt.reason,
        "status": new_apt.status,
        "notes": new_apt.notes,
        "createdAt": new_apt.created_at.isoformat() if new_apt.created_at else None
    }

@app.patch("/api/appointments/{appointment_id}")
def update_appointment(
    appointment_id: str,
    apt_update: AppointmentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    apt = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    if apt_update.status:
        apt.status = apt_update.status
    if apt_update.notes:
        apt.notes = apt_update.notes

    db.commit()
    db.refresh(apt)

    patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()

    create_audit_entry(
        db, user_id=current_user.id, user_name=current_user.full_name, user_role=current_user.role,
        action="updated_appointment", entity_type="appointment", entity_id=apt.id,
        details={"status": apt.status, "patientName": patient.full_name if patient else ""}
    )

    return {
        "id": apt.id,
        "patientId": apt.patient_id,
        "patientName": patient.full_name if patient else "",
        "patientPhone": patient.phone if patient else "",
        "doctorId": apt.doctor_id,
        "doctorName": doctor.full_name if doctor else "",
        "doctorSpecialty": doctor.specialty if doctor else "",
        "datetimeSlot": apt.datetime_slot,
        "reason": apt.reason,
        "status": apt.status,
        "notes": apt.notes,
        "createdAt": apt.created_at.isoformat() if apt.created_at else None
    }

# --- REMINDERS & SMS ENDPOINTS ---
@app.post("/api/reminders/send")
def send_reminder(reminder_in: SMSReminderRequest, db: Session = Depends(get_db)):
    apt = db.query(Appointment).filter(Appointment.id == reminder_in.appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found.")

    patient = db.query(Patient).filter(Patient.id == apt.patient_id).first()
    doctor = db.query(User).filter(User.id == apt.doctor_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient details missing.")

    phone = patient.phone or "+254 700 000000"
    message_text = f"Jambo {patient.full_name}, reminder for your appointment with {doctor.full_name if doctor else 'Doctor'} on {apt.datetime_slot}. Reply 1 to Confirm or 2 to Reschedule."

    sms_log = SMSReminderLog(
        id=f"sms-{uuid.uuid4().hex[:6]}",
        appointment_id=apt.id,
        patient_name=patient.full_name,
        phone=phone,
        message=message_text,
        status="delivered",
        provider="Africa's Talking Kenya"
    )
    db.add(sms_log)
    db.commit()
    db.refresh(sms_log)

    return {
        "success": True,
        "message": f"SMS reminder dispatched to {patient.full_name} ({phone}) via Africa's Talking.",
        "log": {
            "id": sms_log.id,
            "appointmentId": sms_log.appointment_id,
            "patientName": sms_log.patient_name,
            "phone": sms_log.phone,
            "message": sms_log.message,
            "status": sms_log.status,
            "provider": sms_log.provider,
            "sentAt": sms_log.sent_at.isoformat() if sms_log.sent_at else None
        }
    }

@app.get("/api/reminders/logs")
def get_reminder_logs(db: Session = Depends(get_db)):
    logs = db.query(SMSReminderLog).order_by(desc(SMSReminderLog.sent_at)).all()
    return [{
        "id": l.id,
        "appointmentId": l.appointment_id,
        "patientName": l.patient_name,
        "phone": l.phone,
        "message": l.message,
        "status": l.status,
        "provider": l.provider,
        "sentAt": l.sent_at.isoformat() if l.sent_at else None
    } for l in logs]

# --- ADMIN STATS & EXPORT ---
@app.get("/api/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    total_patients = db.query(Patient).count()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    today_apts = db.query(Appointment).filter(Appointment.datetime_slot.like(f"{today_str}%")).count()
    completed_apts = db.query(Appointment).filter(Appointment.status == "completed").count()
    total_reminders = db.query(SMSReminderLog).count()

    return {
        "totalPatients": total_patients,
        "todayAppointments": today_apts,
        "completedAppointments": completed_apts,
        "totalRemindersSent": total_reminders
    }

@app.get("/api/admin/export")
def export_clinic_data(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    apts = db.query(Appointment).all()
    notes = db.query(PatientNote).all()

    return {
        "exportDate": datetime.utcnow().isoformat(),
        "summary": {
            "patientsCount": len(patients),
            "appointmentsCount": len(apts),
            "clinicalNotesCount": len(notes)
        },
        "patients": [{
            "id": p.id,
            "name": p.full_name,
            "phone": p.phone,
            "nationalId": p.national_id
        } for p in patients]
    }
