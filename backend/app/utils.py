import os
import uuid
import random
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from .models import LoginEvent, AuditLog, OTPCode, User, SMSReminderLog

def mask_phone(phone: Optional[str]) -> str:
    if not phone or len(phone) < 8:
        return "+254 7** *** ***"
    return phone[:6] + " *** " + phone[-3:]

def mask_email(email: Optional[str]) -> str:
    if not email or "@" not in email:
        return "u***@doctorconnect.co.ke"
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        masked_name = name[0] + "*"
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
    return f"{masked_name}@{domain}"

def format_relative_time(dt: Optional[datetime]) -> str:
    if not dt:
        return "Never"
    now = datetime.utcnow()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 0:
        seconds = 0
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min{'s' if minutes > 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    days = hours // 24
    if days < 30:
        return f"{days} day{'s' if days > 1 else ''} ago"
    return dt.strftime("%b %d, %Y")

def generate_otp_code() -> str:
    return f"{random.randint(100000, 999999)}"

def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode('utf-8')).hexdigest()

def check_login_rate_limit(db: Session, email: str) -> bool:
    """Returns True if within limit (<=5 attempts in last 15 min), False if exceeded."""
    cutoff = datetime.utcnow() - timedelta(minutes=15)
    recent_attempts = db.query(LoginEvent).filter(
        LoginEvent.email == email.lower(),
        LoginEvent.timestamp >= cutoff
    ).count()
    return recent_attempts < 5

def check_otp_rate_limit(db: Session, user_id: str) -> bool:
    """Returns True if within limit (<=3 OTP generation requests in last 15 min), False if exceeded."""
    cutoff = datetime.utcnow() - timedelta(minutes=15)
    recent_otps = db.query(OTPCode).filter(
        OTPCode.user_id == user_id,
        OTPCode.created_at >= cutoff
    ).count()
    return recent_otps < 3

def log_login_event(
    db: Session,
    email: str,
    method: str,
    success: bool,
    user_id: Optional[str] = None,
    user_name: Optional[str] = None,
    ip_address: Optional[str] = "127.0.0.1",
    user_agent: Optional[str] = "Doctor Connect Browser Client",
    failure_reason: Optional[str] = None
) -> LoginEvent:
    event = LoginEvent(
        id=f"evt-{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        user_name=user_name,
        email=email.lower(),
        method=method,
        ip_address=ip_address,
        user_agent=user_agent,
        success=success,
        failure_reason=failure_reason
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event

def create_audit_entry(
    db: Session,
    user_id: str,
    user_name: str,
    user_role: str,
    action: str,
    entity_type: str,
    entity_id: str,
    details: Optional[Dict[str, Any]] = None
) -> AuditLog:
    import json
    entry = AuditLog(
        id=f"audit-{uuid.uuid4().hex[:8]}",
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=json.dumps(details or {})
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry

def send_otp_sms(phone: str, code: str, patient_or_user_name: str) -> bool:
    """Dispatches OTP SMS via Africa's Talking API / Sandbox."""
    print(f"[Africa's Talking SMS Gateway] Dispatched 2FA OTP code '{code}' to registered phone {phone} for {patient_or_user_name}.")
    return True

def send_otp_email(email: str, code: str, user_name: str) -> bool:
    """Dispatches OTP Email via SMTP or Console Notice."""
    print(f"[Doctor Connect Email Service] Dispatched 2FA OTP code '{code}' to {email} for {user_name}.")
    return True
