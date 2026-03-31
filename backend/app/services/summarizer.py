import re

# ---------------- CLEAN TEXT ----------------
def clean_text(text: str):
    text = re.sub(r"DEA#.*", "", text)
    text = re.sub(r"REFILL.*", "", text)
    text = re.sub(r"signature.*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


# ---------------- EXTRACT MEDICINES ----------------
def extract_medicines(text: str):
    pattern = r"([A-Za-z]{4,})\s*\d+mg.*?(BID|TID|QD)"
    matches = re.findall(pattern, text)

    medicines = []
    for name, freq in matches:
        medicines.append({
            "name": name,
            "frequency": freq
        })

    return medicines


# ---------------- FINAL SUMMARY ----------------
def generate_summary(text: str):
    cleaned = clean_text(text)

    medicines = extract_medicines(cleaned)

    if not medicines:
        return {
            "summary": "No medicines clearly detected",
            "raw_preview": cleaned[:200]
        }

    return {
        "medicines": medicines
    }