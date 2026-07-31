import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False) # 'receptionist', 'doctor', 'admin'
    specialty = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)
    is_currently_active = Column(Boolean, default=False)

    notes_written = relationship("PatientNote", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, index=True, nullable=False)
    phone = Column(String, index=True, nullable=False)
    email = Column(String, nullable=True)
    national_id = Column(String, unique=True, index=True, nullable=False)
    dob = Column(String, nullable=False) # YYYY-MM-DD
    gender = Column(String, nullable=False)
    blood_type = Column(String, default="Unknown")
    allergies = Column(Text, default="None")
    pre_existing_conditions = Column(Text, default="None")
    created_at = Column(DateTime, default=datetime.utcnow)

    notes = relationship("PatientNote", back_populates="patient", order_by="desc(PatientNote.created_at)")
    appointments = relationship("Appointment", back_populates="patient")

class PatientNote(Base):
    __tablename__ = "patient_notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    doctor_name = Column(String, nullable=False)
    visit_type = Column(String, default="General Consultation")
    note = Column(Text, nullable=False)
    vitals_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="notes")
    doctor = relationship("User", back_populates="notes_written")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    datetime_slot = Column(String, nullable=False)
    status = Column(String, default="scheduled") # scheduled, completed, cancelled
    reason = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", back_populates="appointments")

class SMSReminderLog(Base):
    __tablename__ = "sms_reminder_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    appointment_id = Column(String, ForeignKey("appointments.id"), nullable=False)
    patient_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String, default="delivered")
    provider = Column(String, default="Africa's Talking Kenya")
    sent_at = Column(DateTime, default=datetime.utcnow)

class LoginEvent(Base):
    __tablename__ = "login_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    user_name = Column(String, nullable=True)
    email = Column(String, nullable=False, index=True)
    method = Column(String, nullable=False) # 'password', 'google', 'password+sms_otp', 'password+email_otp'
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, nullable=False, index=True)
    user_name = Column(String, nullable=False)
    user_role = Column(String, nullable=False)
    action = Column(String, nullable=False) # 'created_patient', 'appended_note', 'booked_appointment', 'updated_appointment', 'created_user', 'updated_2fa_info'
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    details = Column(Text, nullable=True) # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)

class OTPCode(Base):
    __tablename__ = "otp_codes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String, nullable=False)
    method = Column(String, nullable=False) # 'sms', 'email'
    purpose = Column(String, default="login")
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Pending2FASession(Base):
    __tablename__ = "pending_2fa_sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    token_hash = Column(String, nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
