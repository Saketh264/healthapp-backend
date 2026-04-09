from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime


# ---------------- PATIENT ----------------
class Patient(BaseModel):
    email: EmailStr
    password: str
    health_id: str
    role: str = "patient"


# ---------------- DOCTOR ----------------
class Doctor(BaseModel):
    email: EmailStr
    password: str
    role: str = "doctor"


# ---------------- MEDICINE ----------------
class Medicine(BaseModel):
    name: str
    dosage: Optional[str] = ""
    frequency: Optional[str] = ""


# ---------------- STRUCTURED DATA ----------------
class ReportData(BaseModel):
    doctor_name: Optional[str]
    hospital_name: Optional[str]
    medicines: List[Medicine]


# ---------------- REPORT ----------------
class Report(BaseModel):
    filename: str
    filepath: str
    raw_text: str
    structured_data: ReportData
    patient_email: str
    created_at: datetime = datetime.utcnow()