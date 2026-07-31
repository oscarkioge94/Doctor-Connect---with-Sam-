import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum
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
    created_at = Column(DateTime, default=datetime.utcnow)

    notes_written = relationship("PatientNote", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, index=True, nullable=False)
    dob = Column(String, nullable=False) # YYYY-MM-DD
    gender = Column(String, nullable=False)
    phone = Column(String, index=True, nullable=False)
    national_id = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    notes = relationship("PatientNote", back_populates="patient", order_by="desc(PatientNote.created_at)")
    appointments = relationship("Appointment", back_populates="patient")

class PatientNote(Base):
    __tablename__ = "patient_notes"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    doctor_name = Column(String, nullable=False)
    note = Column(Text, nullable=False)
    visit_type = Column(String, default="General Consultation")
    vitals_bp = Column(String, nullable=True)
    vitals_temp = Column(String, nullable=True)
    vitals_pulse = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="notes")
    doctor = relationship("User", back_populates="notes_written")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = Column(String, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(String, ForeignKey("users.id"), nullable=False)
    datetime_slot = Column(String, nullable=False) # e.g. "2026-07-31 10:30"
    status = Column(String, default="scheduled") # scheduled, completed, cancelled, no-show
    reason = Column(Text, nullable=False)
    reminder_sent = Column(String, default="false")
    created_at = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("User", back_populates="appointments")
