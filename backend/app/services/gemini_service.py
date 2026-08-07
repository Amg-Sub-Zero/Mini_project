import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

def _fallback_explanation(rule_result: str, flags: list) -> str:
    flag_str = ", ".join(flags[:3]) if flags else "suspicious patterns"
    if rule_result == "scam":
        return (
            f"AI service is temporarily unavailable. "
            f"The rule-based analysis indicates this content is likely a scam "
            f"because it contains suspicious keywords such as: {flag_str}."
        )
    elif rule_result == "suspicious":
        return (
            f"AI service is temporarily unavailable. "
            f"The rule-based analysis flagged this content as suspicious. "
            f"It contains some warning signs ({flag_str}) — proceed with caution."
        )
    return (
        "AI service is temporarily unavailable. "
        "The rule-based analysis found no major red flags in this content. "
        "Always stay cautious with unsolicited messages."
    )

def get_ai_explanation(input_text: str, scan_type: str, rule_result: str, risk_score: int, flags: list = []) -> str:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return _fallback_explanation(rule_result, flags)

    prompt = f"""
You are a scam detection AI assistant. A user submitted the following {scan_type} for analysis.

Input: "{input_text}"

A rule-based system already analyzed it and found:
- Verdict: {rule_result}
- Risk Score: {risk_score}/100

Provide a clear, concise explanation (2-3 sentences) of why this content is or isn't a scam.
Be specific. Write in plain English for a non-technical user.
"""
    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt
        )
        return response.text.strip()
    except Exception:
        return _fallback_explanation(rule_result, flags)
