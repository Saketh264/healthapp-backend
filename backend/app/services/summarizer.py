import re
import os
import json
from dotenv import load_dotenv
from rapidfuzz import process
from groq import Groq
from pathlib import Path

# ---------------- LOAD ENV ----------------
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(env_path)

# ---------------- INIT GROQ ----------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("❌ GROQ_API_KEY not found in .env")

client = Groq(api_key=GROQ_API_KEY)

# ---------------- KNOWN MEDICINES ----------------
KNOWN_MEDICINES = [
    "Betaloc",
    "Dorzolamide",
    "Cimetidine",
    "Oxprelol",
    "Paracetamol",
    "Aspirin"
]

# ---------------- CLEAN TEXT ----------------
def clean_text(text: str):
    text = re.sub(r"DEA#.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"REFILL.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"signature.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"[^a-zA-Z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ---------------- NAME CORRECTION ----------------
def correct_medicine_name(name: str):
    if not name:
        return name

    match, score, _ = process.extractOne(name, KNOWN_MEDICINES)

    if score > 70:
        return match

    return name


# ---------------- BASIC INFO EXTRACTION ----------------
def basic_info_extraction(text):
    words = text.split()

    doctor = ""
    hospital = ""

    for i, word in enumerate(words):
        w = word.lower()

        if w in ["dr", "dr.", "doctor"]:
            doctor = " ".join(words[i:i+3])

        if "hospital" in w or "clinic" in w or "care" in w:
            hospital = " ".join(words[i:i+4])

    return doctor, hospital


# ---------------- BASIC MEDICINE EXTRACTION ----------------
def extract_medicines_basic(text):
    medicines = []
    words = text.split()

    for i, word in enumerate(words):
        word_lower = word.lower()

        if re.match(r"\d+(mg|ml|g)", word_lower):
            name = words[i-1] if i > 0 else ""
            dosage = word
            frequency = ""

            if i + 1 < len(words):
                freq = words[i+1].upper()
                if freq in ["OD", "BD", "TID", "BID", "QD"]:
                    frequency = freq

            medicines.append({
                "name": correct_medicine_name(name),
                "dosage": dosage,
                "frequency": frequency
            })

    return medicines


# ---------------- SAFE JSON PARSER ----------------
def safe_json_parse(content: str):
    try:
        return json.loads(content)
    except:
        try:
            start = content.find("{")
            end = content.rfind("}") + 1
            return json.loads(content[start:end])
        except:
            return None


# ---------------- GROQ LLM EXTRACTION ----------------
def extract_with_llm(text: str):
    prompt = f"""
Extract structured information from this medical prescription.

Return ONLY JSON:

{{
  "doctor_name": "",
  "hospital_name": "",
  "medicines": [
    {{
      "name": "",
      "dosage": "",
      "frequency": ""
    }}
  ]
}}

Rules:
- STRICT JSON only
- No explanations
- No markdown
- If missing → return ""

Prescription:
{text}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )

        content = response.choices[0].message.content.strip()

        data = safe_json_parse(content)

        if not data:
            return None

        # Normalize medicines
        for med in data.get("medicines", []):
            med["name"] = correct_medicine_name(med.get("name", ""))
            med["dosage"] = med.get("dosage", "")
            med["frequency"] = med.get("frequency", "")

        return data

    except Exception as e:
        print("❌ GROQ ERROR:", e)
        return None


# ---------------- FINAL SUMMARY ----------------
def generate_summary(text: str):
    if not text or not text.strip():
        return {
            "doctor_name": "",
            "hospital_name": "",
            "medicines": [],
            "note": "Empty OCR text"
        }

    cleaned = clean_text(text)

    # 🔥 Try LLM first
    llm_result = extract_with_llm(cleaned)

    if llm_result:
        return llm_result

    # 🔥 Fallback
    doctor, hospital = basic_info_extraction(cleaned)
    medicines = extract_medicines_basic(cleaned)

    return {
        "doctor_name": doctor,
        "hospital_name": hospital,
        "medicines": medicines,
        "note": "Fallback extraction used"
    }

def generate_readable_summary(data: dict):
    import json

    prompt = f"""
You are a medical system.

Convert the data into a STRICT structured summary.

FORMAT:

Doctor: <name>
Hospital: <name>

Medications:
- <name> - <dosage> - <frequency in simple words>

Instructions:
- <short important instruction>
- <short important instruction>

RULES:
- NO paragraphs
- NO storytelling
- NO explanations
- ONLY clean structured output
- Keep it SHORT and PROFESSIONAL
- Expand frequency:
  BID → Twice daily
  TID → Three times daily
  QD/OD → Once daily

Data:
{json.dumps(data)}
"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0  # 🔥 IMPORTANT (no creativity)
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print("❌ SUMMARY LLM ERROR:", e)
        return "Summary unavailable"