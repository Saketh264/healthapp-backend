from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Body
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import Signup
from app.database import patients_collection, doctors_collection, reports_collection

from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Request
import cv2
import numpy as np
import uuid
import os
import shutil
import pytesseract
from PIL import Image
from bson import ObjectId
from pymongo import MongoClient
from fastapi.staticfiles import StaticFiles

from groq import Groq
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

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


from fastapi import Request

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")

    print("AUTH HEADER:", auth_header)  # DEBUG

    if not auth_header:
        raise HTTPException(status_code=401, detail="No Authorization header")

    try:
        scheme, token = auth_header.split()

        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        print("DECODED PAYLOAD:", payload)  # DEBUG

        email = payload.get("sub")
        role = payload.get("role")

        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload")

        return {"email": email, "role": role}

    except Exception as e:
        print("JWT ERROR:", e)
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/profile")
def get_profile(user: dict = Depends(get_current_user)):

    if user["role"] == "patient":
        data = patients_collection.find_one({"email": user["email"]})

    else:
        data = doctors_collection.find_one({"email": user["email"]})

    if not data:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "email": data["email"],
        "role": user["role"],
        "health_id": data.get("health_id", "N/A")
    }
def require_patient(user: dict = Depends(get_current_user)):
    if user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Patients only")
    return user


def require_doctor(user: dict = Depends(get_current_user)):
    if user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Doctors only")
    return user


# ---------------- LLM ----------------
def generate_llm_summary(text: str):
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": """
You are a medical AI assistant.

RULES:
- Extract visible information carefully
- If partially readable → still extract best possible value
- Only write "Not available" if truly missing
- Ignore noise like barcodes or random numbers

IMPORTANT:
- This is a structured prescription
- Look for fields like Patient Name, Age, Address, Rx, SIG

OUTPUT FORMAT:

Patient Details
---------------
Name:
ID:
Age:
Address:

Hospital
--------
Name:
Address:

Medications
-----------
• Medicine – Dosage – Duration

Doctor
------
Name:
Registration:

Advice
------
Follow-up:
"""
                },
                {
                    "role": "user",
                    "content": text[:2000],
                },
            ],
        )

        return response.choices[0].message.content

    except Exception as e:
        print("LLM ERROR:", e)
        return "Failed to generate AI summary"

def generate_overall_summary(text: str):
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": """
You are a medical AI assistant analyzing MULTIPLE medical reports.

Your goal is to produce ONE clean, unified patient summary.

STRICT RULES:

1. Patient Details:
   - Show ONLY once
   - If repeated → merge intelligently

2. Hospital & Doctor:
   - Show once
   - Merge if needed

3. Medications:
   - Combine ALL medications from all reports
   - Remove duplicates
   - Keep dosage and frequency

4. DO NOT separate reports
   ❌ No "Report 1", "Report 2"

5. FINAL SECTION (VERY IMPORTANT):

Patient Condition Summary
-------------------------
- Write 3–4 lines about patient's condition
- Infer from medications and prescription
- Keep it simple and clinical

6. If something is unclear → write "Not available"

OUTPUT FORMAT:

Patient Details
---------------
Name:
Age:
Address:

Hospital
--------
Name:
Address:

Medications
-----------
• Medicine – Dosage – Duration

Doctor
------
Name:

Patient Condition Summary
-------------------------
(3–4 lines summary)
"""
                },
                {
                    "role": "user",
                    "content": text[:4000],
                },
            ],
        )

        return response.choices[0].message.content

    except Exception as e:
        print("LLM ERROR:", e)
        return "Failed to generate overall summary"
# ---------------- ROUTES ----------------
@app.get("/")
def home():
    return {"message": "Backend running"}


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
    patient = patients_collection.find_one({"email": form_data.username})
    doctor = doctors_collection.find_one({"email": form_data.username})

    user, role = None, None

    if patient:
        user, role = patient, "patient"
    elif doctor:
        user, role = doctor, "doctor"

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    if not pwd_context.verify(form_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    token = create_access_token({"sub": user["email"], "role": role})
    return {"access_token": token, "token_type": "bearer"}


# ---------------- PATIENT REPORTS ----------------
@app.get("/my-reports")
def get_reports(user: dict = Depends(require_patient)):
    data = list(reports_collection.find({"patient_email": user["email"]}))

    for d in data:
        d["_id"] = str(d["_id"])

    return data


# ---------------- UPLOAD ----------------
@app.post("/upload-report")
def upload_report(
    file: UploadFile = File(...),
    title: str = Form(...),
    record_type: str = Form(...),
    description: str = Form(""),
    user: dict = Depends(require_patient),
):
    os.makedirs("uploads", exist_ok=True)

    filename = f"{uuid.uuid4()}_{file.filename}"
    path = os.path.join("uploads", filename)

    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = ""

    try:
        image = Image.open(path).convert("L")
        img_np = np.array(image)
        img_np = cv2.convertScaleAbs(img_np, alpha=1.5, beta=0)
        img_np = cv2.resize(img_np, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        extracted_text = pytesseract.image_to_string(img_np, config="--psm 6")

        print("OCR OUTPUT:\n", extracted_text)
    except Exception as e:
        print("OCR ERROR:", e)

    reports_collection.insert_one({
        "patient_email": user["email"],
        "title": title,
        "record_type": record_type,
        "description": description,
        "file_path": path,
        "ocr_text": extracted_text,
        "created_at": datetime.utcnow(),
    })

    return {"message": "Uploaded"}


# ---------------- VIEW REPORT ----------------
@app.get("/report/{report_id}")
def get_report(report_id: str, user: dict = Depends(require_patient)):
    report = reports_collection.find_one({"_id": ObjectId(report_id)})

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return {
        "_id": str(report["_id"]),
        "title": report["title"],
        "file_url": f"http://127.0.0.1:8000/{report['file_path'].replace('\\', '/')}",
        "ocr_text": report.get("ocr_text", "")
    }


# ---------------- LLM SUMMARY ----------------
@app.get("/report-summary/{report_id}")
def get_report_summary(report_id: str, user: dict = Depends(require_doctor)):
    report = reports_collection.find_one({"_id": ObjectId(report_id)})

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    raw_text = report.get("ocr_text", "")

    if not raw_text.strip():
        return {"summary": "No readable content"}

    summary = generate_llm_summary(raw_text)

    summary = summary.replace("**", "").replace("###", "")
    if "Medical Tests" in summary:
        summary = summary.split("Medical Tests")[0]

    return {"summary": summary.strip()}

@app.get("/doctor/summarize/{patient_email}")
def get_overall_summary(patient_email: str, user: dict = Depends(require_doctor)):

    # ✅ FIXED: case-insensitive + trimmed
    reports = list(reports_collection.find({
        "patient_email": {"$regex": f"^{patient_email.strip()}$", "$options": "i"}
    }))

    print("TOTAL REPORTS:", len(reports))  # 🔍 DEBUG

    if not reports:
        return {"summary": "No reports found"}

    combined_text = ""

    # ✅ FIXED: separate reports clearly
    for i, r in enumerate(reports):
        text = r.get("ocr_text", "")
        if text.strip():
            combined_text += text + "\n"

    if not combined_text.strip():
        return {"summary": "No readable content"}

    # 🤖 LLM
    summary = generate_overall_summary(combined_text)

    # 🧹 cleanup
    summary = summary.replace("**", "").replace("###", "")

    if "Medical Tests" in summary:
        summary = summary.split("Medical Tests")[0]

    return {"summary": summary.strip()}
# ---------------- REQUEST ACCESS ----------------
@app.post("/request-access")
def request_access(data: dict = Body(...), user: dict = Depends(require_doctor)):
    requests_collection.insert_one({
        "doctor_email": user["email"],
        "patient_email": data.get("patient_email"),
        "purpose": data.get("purpose"),
        "status": "pending"
    })
    return {"message": "Request sent"}


@app.get("/doctor/requests")
def get_doctor_requests(user: dict = Depends(require_doctor)):
    data = list(requests_collection.find({"doctor_email": user["email"]}))
    for r in data:
        r["_id"] = str(r["_id"])
    return data


@app.get("/patient/requests")
def get_patient_requests(user: dict = Depends(require_patient)):
    data = list(requests_collection.find({"patient_email": user["email"]}))
    for r in data:
        r["_id"] = str(r["_id"])
    return data


@app.post("/request-decision/{request_id}")
def handle_request_decision(request_id: str, data: dict = Body(...), user: dict = Depends(require_patient)):
    requests_collection.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": data.get("status")}}
    )
    return {"message": "Updated"}


@app.get("/doctor/approved-records")
def get_approved_records(user: dict = Depends(require_doctor)):
    approved = list(requests_collection.find({
        "doctor_email": user["email"],
        "status": "approved"
    }))

    emails = [r["patient_email"] for r in approved]

    reports = list(reports_collection.find({
        "patient_email": {"$in": emails}
    }))

    for r in reports:
        r["_id"] = str(r["_id"])

    return reports