import os
import uuid
from datetime import datetime, timedelta
import bcrypt
from .database import engine, SessionLocal, Base
from .models import User, Patient, PatientNote, Appointment, SMSReminderLog

def hash_password(password: str) -> str:
    pwd_bytes = (password or "").encode('utf-8')[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if users already seeded
        if db.query(User).first():
            print("[Seed] Database already seeded. Skipping seed process.")
            return

        print("[Seed] Seeding default clinic users, patients, notes, and appointments...")

        # Default users with password test123
        default_users = [
            {
                "id": "u-rec-1",
                "email": "receptionist@doctorconnect.co.ke",
                "password": "test123",
                "full_name": "Sarah Wanjiku",
                "role": "receptionist",
                "specialty": "Front Desk & Scheduling",
                "phone": "+254 712 345678"
            },
            {
                "id": "u-doc-1",
                "email": "dr.jane@doctorconnect.co.ke",
                "password": "test123",
                "full_name": "Dr. Jane Muthoni",
                "role": "doctor",
                "specialty": "General Practice & Pediatrics",
                "phone": "+254 722 112233"
            },
            {
                "id": "u-doc-2",
                "email": "dr.kamau@doctorconnect.co.ke",
                "password": "test123",
                "full_name": "Dr. Peter Kamau",
                "role": "doctor",
                "specialty": "Cardiology & Internal Medicine",
                "phone": "+254 733 445566"
            },
            {
                "id": "u-admin-1",
                "email": "admin@doctorconnect.co.ke",
                "password": "test123",
                "full_name": "Clinic Administrator",
                "role": "admin",
                "specialty": "Operations & Analytics",
                "phone": "+254 700 999888"
            }
        ]

        for u in default_users:
            user_obj = User(
                id=u["id"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                specialty=u["specialty"],
                phone=u["phone"]
            )
            db.add(user_obj)

        # Patients
        patients = [
            {
                "id": "p-1001",
                "full_name": "Mary Otieno",
                "phone": "+254 723 456789",
                "email": "mary.otieno@gmail.com",
                "national_id": "28374910",
                "dob": "1988-05-14",
                "gender": "Female",
                "blood_type": "O+",
                "allergies": "Penicillin",
                "pre_existing_conditions": "Hypertension"
            },
            {
                "id": "p-1002",
                "full_name": "John Omondi",
                "phone": "+254 711 987654",
                "email": "jomondi@yahoo.com",
                "national_id": "31982745",
                "dob": "1992-11-03",
                "gender": "Male",
                "blood_type": "A+",
                "allergies": "None",
                "pre_existing_conditions": "Asthma"
            },
            {
                "id": "p-1003",
                "full_name": "Grace Njuguna",
                "phone": "+254 734 555123",
                "email": "grace.njuguna@outlook.com",
                "national_id": "24561987",
                "dob": "1975-08-22",
                "gender": "Female",
                "blood_type": "B-",
                "allergies": "Sulfa drugs",
                "pre_existing_conditions": "Type 2 Diabetes"
            },
            {
                "id": "p-1004",
                "full_name": "David Kiprop",
                "phone": "+254 701 443322",
                "email": "dkiprop@gmail.com",
                "national_id": "33441122",
                "dob": "1996-03-30",
                "gender": "Male",
                "blood_type": "O-",
                "allergies": "Peanuts",
                "pre_existing_conditions": "None"
            },
            {
                "id": "p-1005",
                "full_name": "Amina Hassan",
                "phone": "+254 725 667788",
                "email": "amina.h@gmail.com",
                "national_id": "29881100",
                "dob": "1990-12-19",
                "gender": "Female",
                "blood_type": "AB+",
                "allergies": "Latex",
                "pre_existing_conditions": "Migraine"
            }
        ]

        for p in patients:
            db.add(Patient(**p))

        # Notes
        notes = [
            {
                "id": "n-5001",
                "patient_id": "p-1001",
                "doctor_id": "u-doc-1",
                "doctor_name": "Dr. Jane Muthoni",
                "visit_type": "General Checkup",
                "note": "Patient presents with mild tension headaches over 3 days. Prescribed Paracetamol 500mg BD for 5 days. Recommended hydration & rest.",
                "vitals_json": '{"bp": "125/82", "temp": "36.7", "pulse": "74", "weight": "68kg"}',
                "created_at": datetime.utcnow() - timedelta(days=5)
            },
            {
                "id": "n-5002",
                "patient_id": "p-1002",
                "doctor_id": "u-doc-2",
                "doctor_name": "Dr. Peter Kamau",
                "visit_type": "Cardiology Follow-up",
                "note": "ECG normal sinus rhythm. Blood pressure within target range on current ACE inhibitor regime.",
                "vitals_json": '{"bp": "118/76", "temp": "36.5", "pulse": "68", "weight": "81kg"}',
                "created_at": datetime.utcnow() - timedelta(days=2)
            }
        ]

        for n in notes:
            db.add(PatientNote(**n))

        # Appointments
        today_str = datetime.utcnow().strftime("%Y-%m-%d")
        tomorrow_str = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%d")

        appointments = [
            {
                "id": "apt-9001",
                "patient_id": "p-1001",
                "doctor_id": "u-doc-1",
                "datetime_slot": f"{today_str}T09:00:00",
                "reason": "Follow-up consultation for BP review",
                "status": "confirmed"
            },
            {
                "id": "apt-9002",
                "patient_id": "p-1002",
                "doctor_id": "u-doc-2",
                "datetime_slot": f"{today_str}T10:30:00",
                "reason": "Chest discomfort evaluation & ECG",
                "status": "scheduled"
            },
            {
                "id": "apt-9003",
                "patient_id": "p-1003",
                "doctor_id": "u-doc-1",
                "datetime_slot": f"{tomorrow_str}T11:00:00",
                "reason": "Routine HbA1c lab review & diabetes follow-up",
                "status": "scheduled"
            },
            {
                "id": "apt-9004",
                "patient_id": "p-1004",
                "doctor_id": "u-doc-2",
                "datetime_slot": f"{tomorrow_str}T14:00:00",
                "reason": "Annual health checkup & blood panel",
                "status": "scheduled"
            }
        ]

        for a in appointments:
            db.add(Appointment(**a))

        db.commit()
        print("[Seed] Successfully seeded default users, patients, notes, and appointments!")
    except Exception as e:
        db.rollback()
        print(f"[Seed] Error seeding database: {e}")
    finally:
        db.close()
