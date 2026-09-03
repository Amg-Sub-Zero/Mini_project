import os
import json
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, APIError

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

VALID_VERDICTS = {"scam", "suspicious", "safe"}


def _fallback(rule_result: str, flags: list) -> dict:
    """Returned when Groq is unavailable or the call fails."""
    flag_str = ", ".join(flags[:3]) if flags else "suspicious patterns"
    if rule_result == "scam":
        reason = (
            f"AI service is currently unavailable. "
            f"The rule-based analysis indicates this content is likely a scam "
            f"because it contains suspicious keywords such as: {flag_str}."
        )
    elif rule_result == "suspicious":
        reason = (
            f"AI service is currently unavailable. "
            f"The rule-based analysis flagged this content as suspicious. "
            f"It contains some warning signs ({flag_str}) — proceed with caution."
        )
    else:
        reason = (
            "AI service is currently unavailable. "
            "The rule-based analysis found no major red flags in this content. "
            "Always stay cautious with unsolicited messages."
        )
    return {"verdict": None, "reason": reason, "available": False}


def get_ai_analysis(input_text: str, scan_type: str, rule_result: str, flags: list = None) -> dict:
    """
    Independently analyze the input with Groq and return:
      {
        "verdict":   "scam" | "suspicious" | "safe" | None,
        "reason":    str,
        "available": bool
      }
    AI verdict is None when the service is unavailable (use rule_result as fallback).
    """
    if flags is None:
        flags = []

    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return _fallback(rule_result, flags)

    prompt = f"""You are a scam detection expert. A user submitted the following {scan_type} for analysis.

Content: "{input_text}"

Analyze this content independently and determine whether it is a scam, suspicious, or safe.

Respond with ONLY a JSON object in this exact format (no extra text):
{{"verdict": "scam" | "suspicious" | "safe", "reason": "2 sentence explanation for a non-technical user"}}"""

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1"
        )
        response = client.chat.completions.create(
            model="groq/compound-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        raw = (response.choices[0].message.content or "").strip()

        # Strip markdown code fences if the model wraps the JSON
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        parsed = json.loads(raw)
        verdict = parsed.get("verdict", "").lower().strip()
        reason  = parsed.get("reason", "").strip()

        if verdict not in VALID_VERDICTS or not reason:
            return _fallback(rule_result, flags)

        return {"verdict": verdict, "reason": reason, "available": True}

    except (APIError, json.JSONDecodeError, AttributeError, ValueError):
        return _fallback(rule_result, flags)
    except Exception:
        return _fallback(rule_result, flags)
