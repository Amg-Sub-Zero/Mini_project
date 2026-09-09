import os
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# ===== Brevo (formerly Sendinblue) transactional email API =====
# Render's free tier blocks outbound SMTP ports (25, 465, 587), so we send
# email over plain HTTPS via Brevo's API instead of smtplib.
BREVO_API_KEY     = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER      = os.getenv("BREVO_SENDER_EMAIL", "")   # must be a verified sender in Brevo
BREVO_SENDER_NAME = "ScamShield"
BREVO_API_URL     = "https://api.brevo.com/v3/smtp/email"


def send_verification_email(to_email: str, full_name: str, token: str, base_url: str) -> bool:
    """
    Send an email verification link to the user via Brevo's HTTP API.
    The link points directly to the backend /api/verify/<token> endpoint
    which redirects to the frontend login page on success.
    Returns True on success, False on failure.
    """
    if not BREVO_API_KEY or not BREVO_SENDER:
        print("[email_service] BREVO_API_KEY or BREVO_SENDER_EMAIL not set â skipping email.", flush=True)
        return False

    # Link goes directly to backend â works from any network as long as backend is reachable
    verify_url = f"{base_url}/api/verify/{token}"

    subject = "Verify your ScamShield account"

    html_body = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">ð¡ï¸ ScamShield</h2>
      <h3 style="color: #0f172a; font-weight: 700; margin-bottom: 16px;">Verify your email address</h3>
      <p style="color: #64748b; margin-bottom: 24px;">Hi {full_name}, thanks for signing up! Click the button below to verify your email and activate your account.</p>
      <a href="{verify_url}"
         style="display: inline-block; background: #4f46e5; color: #fff; padding: 12px 28px;
                border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem;">
        Verify Email Address
      </a>
      <p style="color: #94a3b8; font-size: 0.85rem; margin-top: 24px;">
        If you didn't create a ScamShield account, you can safely ignore this email.<br/>
        This link expires in 5 minutes.
      </p>
    </div>
    """

    plain_body = f"Hi {full_name},\n\nVerify your ScamShield account by visiting:\n{verify_url}\n\nIf you didn't sign up, ignore this email."

    payload = {
        "sender": {"name": BREVO_SENDER_NAME, "email": BREVO_SENDER},
        "to": [{"email": to_email, "name": full_name}],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": plain_body,
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
    }

    try:
        response = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=10)

        if response.status_code in (200, 201):
            print(f"[email_service] Verification email sent to {to_email}", flush=True)
            return True

        print(
            f"[email_service] Failed to send email: {response.status_code} {response.text}",
            flush=True
        )
        return False

    except Exception as e:
        print(f"[email_service] Failed to send email: {e}", flush=True)
        return False
