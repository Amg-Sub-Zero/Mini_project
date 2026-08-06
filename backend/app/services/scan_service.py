import re

SCAM_KEYWORDS = [
    "won", "winner", "claim", "prize", "reward", "gift card", "lottery",
    "urgent", "verify", "suspended", "confirm your account", "bank details",
    "click here", "free money", "congratulations", "OTP", "password",
    "transfer funds", "inheritance", "investment opportunity", "act now"
]

SUSPICIOUS_URL_PATTERNS = [
    r"bit\.ly", r"tinyurl", r"goo\.gl",
    r"\d{1,3}\.\d{1,3}\.\d{1,3}",   # IP address as domain
    r"paypa[^l]", r"secure.*login", r"verify.*account",
    r"free.*gift", r"claim.*now"
]

def analyze(input_text: str, scan_type: str) -> dict:
    if scan_type == "url":
        return _analyze_url(input_text)
    return _analyze_text(input_text)

def _analyze_text(text: str) -> dict:
    lower = text.lower()
    hits  = [kw for kw in SCAM_KEYWORDS if kw in lower]
    score = min(100, len(hits) * 18 + (5 if len(text) > 20 else 0))
    return {"score": score, "flags": hits}

def _analyze_url(url: str) -> dict:
    hits = [p for p in SUSPICIOUS_URL_PATTERNS if re.search(p, url, re.IGNORECASE)]
    score = min(100, len(hits) * 30 + (10 if len(url) > 60 else 0))
    return {"score": score, "flags": hits}

def get_verdict(score: int) -> str:
    if score >= 60:
        return "scam"
    if score >= 30:
        return "suspicious"
    return "safe"
