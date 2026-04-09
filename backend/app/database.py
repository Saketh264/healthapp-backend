from pymongo import MongoClient
import os
from dotenv import load_dotenv
from pathlib import Path

# ---------------- LOAD ENV ----------------
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

# ---------------- CONFIG ----------------
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "healthapp")

if not MONGO_URI:
    raise ValueError("MONGO_URI not found in .env file")

# ---------------- CLIENT ----------------
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

# ---------------- VERIFY CONNECTION ----------------
try:
    client.admin.command("ping")
    print("MongoDB connected successfully")
except Exception as e:
    print("MongoDB connection failed:", e)

# ---------------- DATABASE ----------------
db = client[DB_NAME]

# ---------------- COLLECTIONS ----------------
reports_collection = db["reports"]
patients_collection = db["patients"]
doctors_collection = db["doctors"]

# ---------------- INDEXES ----------------
patients_collection.create_index("email", unique=True)
doctors_collection.create_index("email", unique=True)