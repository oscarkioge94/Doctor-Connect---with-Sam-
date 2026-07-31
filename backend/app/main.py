from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from .database import get_db, engine, Base
from . import models, schemas

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MedFlow Clinic Management System API",
    description="FastAPI + PostgreSQL backend for clinic appointments, patient medical history, and Africa's Talking Kenya SMS reminders.",
    version="1.0.0"
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
        "version": "1.0.0"
    }

@app.get("/api/patients", response_model=List[schemas.PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return db.query(models.Patient).all()

@app.post("/api/patients", response_model=schemas.PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(patient: schemas.PatientCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Patient).filter(models.Patient.national_id == patient.national_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient with this National ID already exists.")

    db_patient = models.Patient(**patient.dict())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

@app.get("/api/patients/{patient_id}")
def get_patient_detail(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return patient

@app.post("/api/appointments", response_model=schemas.AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(apt: schemas.AppointmentCreate, db: Session = Depends(get_db)):
    # Double-booking check
    conflict = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == apt.doctor_id,
        models.Appointment.datetime_slot == apt.datetime_slot,
        models.Appointment.status != "cancelled"
    ).first()

    if conflict:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Double-booking conflict: This doctor is already booked at this exact time slot."
        )

    db_apt = models.Appointment(**apt.dict())
    db.add(db_apt)
    db.commit()
    db.refresh(db_apt)
    return db_apt
