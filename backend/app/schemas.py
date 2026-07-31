from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    fullName: str
    role: str
    specialty: Optional[str] = None
    phone: Optional[str] = None
    lastLoginAt: Optional[str] = None
    isCurrentlyActive: Optional[bool] = False

class LoginInitResponse(BaseModel):
    requires2FA: bool
    pendingToken: str
    userId: str
    maskedPhone: Optional[str] = None
    maskedEmail: Optional[str] = None
    availableMethods: List[str]
    defaultMethod: str

class LoginResponse(BaseModel):
    user: UserResponse
    token: str

class Send2FARequest(BaseModel):
    pendingToken: str
    method: str # 'sms' or 'email'

class Verify2FARequest(BaseModel):
    pendingToken: str
    code: str

class GoogleLoginRequest(BaseModel):
    idToken: Optional[str] = None
    code: Optional[str] = None
    email: Optional[str] = None

class UserCreateRequest(BaseModel):
    email: str
    fullName: str
    role: str # 'receptionist', 'doctor', 'admin'
    specialty: Optional[str] = None
    phone: Optional[str] = None
    password: str

class Update2FAInfoRequest(BaseModel):
    currentPassword: str
    phone: Optional[str] = None
    email: Optional[str] = None

class PatientCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    national_id: str
    dob: str
    gender: str
    blood_type: Optional[str] = "Unknown"
    allergies: Optional[str] = "None"
    pre_existing_conditions: Optional[str] = "None"

class PatientResponse(BaseModel):
    id: str
    fullName: str
    phone: str
    email: Optional[str] = None
    nationalId: str
    dob: str
    gender: str
    bloodType: Optional[str] = "Unknown"
    allergies: Optional[str] = "None"
    preExistingConditions: Optional[str] = "None"
    createdAt: Optional[str] = None

class PatientNoteCreate(BaseModel):
    note: str
    visit_type: Optional[str] = "General Encounter"
    vitals: Optional[Dict[str, Any]] = None

class PatientNoteResponse(BaseModel):
    id: str
    patientId: str
    doctorId: str
    doctorName: str
    visitType: str
    note: str
    vitals: Optional[Dict[str, Any]] = None
    createdAt: Optional[str] = None

class PatientDetailResponse(BaseModel):
    patient: PatientResponse
    notes: List[PatientNoteResponse]
    appointments: List[Any]

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    datetime_slot: str
    reason: str

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    patientId: str
    patientName: str
    patientPhone: str
    doctorId: str
    doctorName: str
    doctorSpecialty: Optional[str] = None
    datetimeSlot: str
    reason: str
    status: str
    notes: Optional[str] = None
    createdAt: Optional[str] = None

class SMSReminderRequest(BaseModel):
    appointment_id: str

class SMSReminderLogResponse(BaseModel):
    id: str
    appointmentId: str
    patientName: str
    phone: str
    message: str
    status: str
    provider: str
    sentAt: Optional[str] = None

class SMSReminderResponse(BaseModel):
    success: bool
    message: str
    log: SMSReminderLogResponse

class AdminStatsResponse(BaseModel):
    totalPatients: int
    todayAppointments: int
    completedAppointments: int
    totalRemindersSent: int

class LoginEventResponse(BaseModel):
    id: str
    userId: Optional[str] = None
    userName: Optional[str] = None
    email: str
    method: str
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None
    success: bool
    failureReason: Optional[str] = None
    timestamp: str
    relativeTime: str

class AuditLogResponse(BaseModel):
    id: str
    userId: str
    userName: str
    userRole: str
    action: str
    entityType: str
    entityId: str
    details: Optional[Dict[str, Any]] = None
    createdAt: str
    relativeTime: str
    description: str
