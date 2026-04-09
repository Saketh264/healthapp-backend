from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
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
from app.services.report_service import save_report
from app.services.summarizer import generate_summary

# ---------------- TESSERACT ----------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = FastAPI()

pwd_context = CryptContext(schemes=["bcrypt"])

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- JWT ----------------
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
    
    # 🔥 Enforce email login
    if "@" not in form_data.username:
        raise HTTPException(
            status_code=400,
            detail="Please use email to login (example: saketh@gmail.com)"
        )

    print("LOGIN INPUT:", form_data.username)

    # 🔍 Find user
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

    print("USER FOUND:", user)

    # ❌ No user
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    # ❌ Wrong password
    if not pwd_context.verify(form_data.password, user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")

    # 🔐 Create token
    access_token = create_access_token(
        data={"sub": user["email"], "role": role}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.post("/upload-report")
def upload_report(
    file: UploadFile = File(...),
    user: dict = Depends(require_patient),
):
    upload_folder = "uploads"
    os.makedirs(upload_folder, exist_ok=True)

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(upload_folder, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    extracted_text = ""

    try:
        image = Image.open(file_path).convert("L")
        image = image.point(lambda x: 0 if x < 140 else 255)

        extracted_text = pytesseract.image_to_string(
            image,
            config="--oem 3 --psm 6"
        )

        print("OCR SUCCESS")

    except Exception as e:
        print("OCR ERROR:", e)

    # ✅ Safe LLM call
    structured = {}
    if extracted_text.strip():
        structured = generate_summary(extracted_text)

    # ✅ Use service
    report_id = save_report(
        file,
        file_path,
        extracted_text,
        structured,
        user["email"]
    )

    return {
        "message": "Report uploaded and stored",
        "report_id": report_id,
        "preview": structured
    }
@app.get("/doctor/summarize/{patient_email}")
def summarize_patient_reports(
    patient_email: str,
    user: dict = Depends(require_doctor),
):
    # 🔍 Fetch reports
    reports = list(reports_collection.find({
        "patient_email": patient_email
    }))

    if not reports:
        return {"summary": "No reports available"}

    # 🔍 Extract structured data
    structured_reports = [
        r.get("structured_data")
        for r in reports
        if r.get("structured_data")
    ]

    if not structured_reports:
        return {"summary": "No structured data found"}

    # 🔥 Combine data
    all_medicines = []
    doctor = ""
    hospital = ""

    for report in structured_reports:
        if not doctor:
            doctor = report.get("doctor_name", "")

        if not hospital:
            hospital = report.get("hospital_name", "")

        all_medicines.extend(report.get("medicines", []))

    combined_data = {
        "doctor_name": doctor,
        "hospital_name": hospital,
        "medicines": all_medicines
    }

    # 🔥 Generate readable summary
    from app.services.summarizer import generate_readable_summary

    summary_text = generate_readable_summary(combined_data)
    latest_report = reports_collection.find_one(
    {"patient_email": patient_email},
    sort=[("created_at", -1)]
)

    if latest_report:
        reports_collection.update_one(
        {"_id": latest_report["_id"]},
        {"$set": {"readable_summary": summary_text}}
    )
    return {
        "patient": patient_email,
        "summary": summary_text
    }