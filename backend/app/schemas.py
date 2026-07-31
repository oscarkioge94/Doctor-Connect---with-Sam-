from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    specialty: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: str

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PatientBase(BaseModel):
    name: str
    dob: str
    gender: str
    phone: str
    national_id: str

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class PatientNoteCreate(BaseModel):
    note: str
    visit_type: Optional[str] = "Consultation Note"
    vitals_bp: Optional[str] = None
    vitals_temp: Optional[str] = None
    vitals_pulse: Optional[str] = None
    appointment_id: Optional[str] = None

class PatientNoteResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    doctor_name: str
    note: str
    visit_type: Optional[str]
    vitals_bp: Optional[str]
    vitals_temp: Optional[str]
    vitals_pulse: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    datetime_slot: str
    reason: str

class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    datetime_slot: str
    status: str
    reason: str
    reminder_sent: str
    created_at: datetime

    class Config:
        from_attributes = True
