import re
import os
import json
from dotenv import load_dotenv
from rapidfuzz import process
from groq import Groq

# ---------------- LOAD ENV ----------------
load_dotenv()

# ---------------- INIT GROQ ----------------
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# 🔥 Known medicines list (expand anytime)
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

# ---------------- DOCTOR + HOSPITAL EXTRACTION ----------------
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

# ---------------- MEDICINE EXTRACTION (FALLBACK) ----------------
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
                if freq in ["OD", "BD", "TID", "BID"]:
                    frequency = freq

            medicines.append({
                "name": correct_medicine_name(name),
                "dosage": dosage,
                "frequency": frequency
            })

    return medicines

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
- Return STRICT JSON only (no extra text)
- If something missing → return empty string ""

Prescription:
{text}
"""

    try:
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0
        )

        content = response.choices[0].message.content.strip()

        # 🔥 Handle bad JSON (very common in LLMs)
        try:
            data = json.loads(content)
        except:
            # Try to extract JSON substring
            start = content.find("{")
            end = content.rfind("}") + 1
            data = json.loads(content[start:end])

        # 🔥 Post-process correction
        for med in data.get("medicines", []):
            med["name"] = correct_medicine_name(med["name"])

        return data

    except Exception as e:
        print("GROQ ERROR:", e)
        return None

# ---------------- FINAL SUMMARY ----------------
def generate_summary(text: str):
    cleaned = clean_text(text)

    # ✅ Try LLM first
    llm_result = extract_with_llm(cleaned)

    if llm_result:
        return llm_result

    # 🔥 Fallback if LLM fails
    doctor, hospital = basic_info_extraction(cleaned)
    medicines = extract_medicines_basic(cleaned)

    return {
        "doctor_name": doctor,
        "hospital_name": hospital,
        "medicines": medicines,
        "note": "Fallback extraction used"
    }