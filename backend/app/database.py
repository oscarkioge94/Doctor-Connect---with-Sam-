import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://clinic_admin:clinic_password_2026@localhost:5432/medflow_clinic_db"
)

def create_db_engine():
    if DATABASE_URL.startswith("sqlite"):
        return create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    try:
        eng = create_engine(DATABASE_URL)
        # Test connection
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        print(f"[DB] PostgreSQL connection failed ({e}), using SQLite database fallback.")
        sqlite_url = "sqlite:///./medflow_clinic_db.sqlite3"
        return create_engine(sqlite_url, connect_args={"check_same_thread": False})

engine = create_db_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

