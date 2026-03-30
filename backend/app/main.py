from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas import Signup
from app.database import engine, SessionLocal
from app import models
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import uuid
import os
import shutil
import pytesseract
from PIL import Image

# ---------------- TESSERACT CONFIG ----------------
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# ---------------- DB INIT ----------------
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

pwd_context = CryptContext(schemes=["bcrypt"])

SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# ---------------- DATABASE DEP ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
def signup(data: Signup, db: Session = Depends(get_db)):
    hashed_password = pwd_context.hash(data.password)
    new_patient = models.Patient(
        email=data.email,
        password=hashed_password,
        health_id=str(uuid.uuid4())
    )

    db.add(new_patient)
    db.commit()

    return {"message": "Patient created"}


@app.post("/doctor/signup")
def doctor_signup(data: Signup, db: Session = Depends(get_db)):
    hashed_password = pwd_context.hash(data.password)

    new_doctor = models.Doctor(
        email=data.email,
        password=hashed_password
    )

    db.add(new_doctor)
    db.commit()

    return {"message": "Doctor created"}


@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    patient = db.query(models.Patient).filter(models.Patient.email == form_data.username).first()
    doctor = db.query(models.Doctor).filter(models.Doctor.email == form_data.username).first()

    user = patient if patient else doctor

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    if not pwd_context.verify(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    role = "patient" if patient else "doctor"

    access_token = create_access_token(data={"sub": user.email, "role": role})

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# ---------------- UPLOAD + OCR ----------------
@app.post("/upload-report")
def upload_report(
    file: UploadFile = File(...),
    user: dict = Depends(require_patient),
    db: Session = Depends(get_db)
):

    patient = db.query(models.Patient).filter(
        models.Patient.email == user["email"]
    ).first()

    upload_folder = "uploads"
    os.makedirs(upload_folder, exist_ok=True)

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(upload_folder, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # ---------------- OCR PROCESSING ----------------
    extracted_text = ""

    try:
        # Preprocessing for better OCR
        image = Image.open(file_path).convert("L")  # grayscale
        image = image.point(lambda x: 0 if x < 140 else 255)  # threshold

        extracted_text = pytesseract.image_to_string(
            image,
            config="--oem 3 --psm 6"
        )

        print("OCR SUCCESS")

    except Exception as e:
        print("OCR ERROR:", e)
        extracted_text = ""  # Do NOT store failure message

    new_report = models.Report(
        filename=file.filename,
        filepath=file_path,
        extracted_text=extracted_text,
        patient_id=patient.id
    )

    db.add(new_report)
    db.commit()

    return {
        "message": "Report uploaded and OCR processed",
        "preview": extracted_text[:200] if extracted_text else "No readable text found"
    }


# ---------------- DOCTOR SUMMARY ----------------
@app.get("/doctor/summarize/{patient_email}")
def summarize_patient_reports(
    patient_email: str,
    user: dict = Depends(require_doctor),
    db: Session = Depends(get_db)
):

    patient = db.query(models.Patient).filter(
        models.Patient.email == patient_email
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    reports = db.query(models.Report).filter(
        models.Report.patient_id == patient.id
    ).all()

    if not reports:
        return {"summary": "No reports available"}

    # Ignore empty OCR results
    valid_texts = [
        r.extracted_text
        for r in reports
        if r.extracted_text and r.extracted_text.strip()
    ]

    if not valid_texts:
        return {"summary": "No readable text found in reports"}

    combined_text = " ".join(valid_texts)

    # Simple summarization (first 150 words)
    words = combined_text.split()
    summary = " ".join(words[:150])

    return {
        "patient": patient_email,
        "summary": summary
    }