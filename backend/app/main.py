from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import Signup
from app.database import patients_collection, doctors_collection, reports_collection

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta

import uuid
import os
import shutil
import pytesseract
from PIL import Image
from bson import ObjectId
from pymongo import MongoClient

# ---------------- DB ----------------
client = MongoClient("mongodb://localhost:27017")
db = client["health_app"]
requests_collection = db["requests"]

# ---------------- TESSERACT ----------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ---------------- APP ----------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- AUTH ----------------
pwd_context = CryptContext(schemes=["bcrypt"])

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        role = payload.get("role")

        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        return {"email": email, "role": role}

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_patient(user: dict = Depends(get_current_user)):
    if user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Patients only")
    return user


def require_doctor(user: dict = Depends(get_current_user)):
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctors only")
    return user


# ---------------- ROUTES ----------------
@app.get("/")
def home():
    return {"message": "Backend running"}


# ---------------- AUTH ----------------
@app.post("/signup")
def signup(data: Signup):
    hashed_password = pwd_context.hash(data.password)

    patients_collection.insert_one({
        "email": data.email,
        "password": hashed_password,
        "health_id": str(uuid.uuid4()),
        "role": "patient"
    })

    return {"message": "Patient created"}


@app.post("/doctor/signup")
def doctor_signup(data: Signup):
    hashed_password = pwd_context.hash(data.password)

    doctors_collection.insert_one({
        "email": data.email,
        "password": hashed_password,
        "role": "doctor"
    })

    return {"message": "Doctor created"}


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if "@" not in form_data.username:
        raise HTTPException(status_code=400, detail="Use email to login")

    patient = patients_collection.find_one({"email": form_data.username})
    doctor = doctors_collection.find_one({"email": form_data.username})

    user = None
    role = None

    if patient:
        user = patient
        role = "patient"
    elif doctor:
        user = doctor
        role = "doctor"

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    if not pwd_context.verify(form_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    token = create_access_token({
        "sub": user["email"],
        "role": role
    })

    return {"access_token": token, "token_type": "bearer"}


# ---------------- UPLOAD REPORT ----------------
@app.post("/upload-report")
def upload_report(
    file: UploadFile = File(...),
    title: str = Form(...),
    record_type: str = Form(...),
    description: str = Form(""),
    user: dict = Depends(require_patient),
):
    upload_folder = "uploads"
    os.makedirs(upload_folder, exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    path = os.path.join(upload_folder, filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = ""

    try:
        image = Image.open(path).convert("L")
        image = image.point(lambda x: 0 if x < 140 else 255)

        extracted_text = pytesseract.image_to_string(
            image,
            config="--oem 3 --psm 6"
        )
    except:
        pass

    from app.services.summarizer import generate_summary
    structured = generate_summary(extracted_text) if extracted_text.strip() else {}

    reports_collection.insert_one({
        "patient_email": user["email"],
        "title": title,
        "record_type": record_type,
        "description": description,
        "file_path": path,
        "ocr_text": extracted_text,
        "structured_data": structured,
        "summary": structured,
        "created_at": datetime.utcnow(),
    })

    return {"message": "Uploaded", "preview": structured}


# ---------------- PATIENT REPORTS ----------------
@app.get("/my-reports")
def get_reports(user: dict = Depends(require_patient)):
    data = list(reports_collection.find({
        "patient_email": user["email"]
    }))

    for d in data:
        d["_id"] = str(d["_id"])

    return data


# ---------------- REQUEST ACCESS ----------------
@app.post("/request-access")
def request_access(
    data: dict = Body(...),
    user: dict = Depends(require_doctor),
):
    requests_collection.insert_one({
        "doctor_email": user["email"],
        "patient_email": data.get("patient_email"),
        "purpose": data.get("purpose"),
        "status": "pending"
    })

    return {"message": "Request sent"}


# ---------------- PATIENT VIEW REQUESTS ----------------
@app.get("/patient/requests")
def get_patient_requests(user: dict = Depends(require_patient)):
    data = list(requests_collection.find({
        "patient_email": user["email"]
    }))

    for r in data:
        r["_id"] = str(r["_id"])

    return data


# ---------------- APPROVE / REJECT ----------------
@app.post("/request-decision/{request_id}")
def handle_request_decision(
    request_id: str,
    data: dict = Body(...),   # 🔥 CHANGE HERE
    user: dict = Depends(require_patient),
):
    status = data.get("status")   # 🔥 extract manually

    if not status:
        raise HTTPException(status_code=400, detail="Status required")

    request = requests_collection.find_one({"_id": ObjectId(request_id)})

    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request["patient_email"] != user["email"]:
        raise HTTPException(status_code=403, detail="Not your request")

    requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": status}}
    )

    return {"message": "Updated"}


# ---------------- DOCTOR REQUESTS ----------------
@app.get("/doctor/requests")
def get_doctor_requests(user: dict = Depends(require_doctor)):
    data = list(requests_collection.find({
        "doctor_email": user["email"]
    }))

    for r in data:
        r["_id"] = str(r["_id"])

    return data


# ---------------- DOCTOR APPROVED RECORDS ----------------
@app.get("/doctor/approved-records")
def get_approved_records(user: dict = Depends(require_doctor)):

    approved = list(requests_collection.find({
        "doctor_email": user["email"],
        "status": "approved"
    }))

    patient_emails = [r["patient_email"] for r in approved]

    reports = list(reports_collection.find({
        "patient_email": {"$in": patient_emails}
    }))

    for r in reports:
        r["_id"] = str(r["_id"])

    return reports


# ---------------- AI SUMMARY ----------------
@app.get("/doctor/summarize/{patient_email}")
def summarize_patient_reports(
    patient_email: str,
    user: dict = Depends(require_doctor),
):
    reports = list(reports_collection.find({
        "patient_email": patient_email
    }))

    if not reports:
        return {"summary": "No reports available"}

    structured_reports = [
        r.get("structured_data")
        for r in reports
        if r.get("structured_data")
    ]

    if not structured_reports:
        return {"summary": "No structured data found"}

    all_medicines = []
    doctor = ""
    hospital = ""

    for report in structured_reports:
        doctor = doctor or report.get("doctor_name", "")
        hospital = hospital or report.get("hospital_name", "")
        all_medicines.extend(report.get("medicines", []))

    combined = {
        "doctor_name": doctor,
        "hospital_name": hospital,
        "medicines": all_medicines
    }

    from app.services.summarizer import generate_readable_summary
    summary_text = generate_readable_summary(combined)

    return {"patient": patient_email, "summary": summary_text}