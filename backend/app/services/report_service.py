from app.database import reports_collection
from datetime import datetime

def save_report(file, file_path, extracted_text, structured, user_email):
    document = {
        "filename": file.filename,
        "filepath": file_path,
        "raw_text": extracted_text,
        "structured_data": structured,
        "patient_email": user_email,
        "created_at": datetime.utcnow()
    }

    result = reports_collection.insert_one(document)
    return str(result.inserted_id)