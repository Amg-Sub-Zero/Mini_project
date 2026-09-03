import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

MAIL_USERNAME = os.getenv("MAIL_USERNAME", "")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM     = f"ScamShield <{MAIL_USERNAME}>"
SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587


def send_verification_email(to_email: str, full_name: str, token: str, base_url: str) -> bool:
    """
    Send an email verification link to the user.
    The link points directly to the backend /api/verify/<token> endpoint
    which redirects to the frontend login page on success.
    Returns True on success, False on failure.
    """
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print("[email_service] MAIL_USERNAME or MAIL_PASSWORD not set — skipping email.")
        return False

    # Link goes directly to backend — works from any network as long as backend is reachable
    verify_url = f"{base_url}/api/verify/{token}"

    subject = "Verify your ScamShield account"

    html_body = f"""
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
      <h2 style="color: #0f172a; margin-bottom: 8px;">🛡️ ScamShield</h2>
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

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = MAIL_FROM
        msg["To"]      = to_email
        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(MAIL_USERNAME, MAIL_PASSWORD)
            server.sendmail(MAIL_USERNAME, to_email, msg.as_string())

        print(f"[email_service] Verification email sent to {to_email}")
        return True

    except Exception as e:
        print(f"[email_service] Failed to send email: {e}")
        return False
