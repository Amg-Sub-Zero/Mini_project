import base64
import os
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app import db
from app.models.gmail_connection import GmailConnection
from app.models.scan import Scan
from app.services.scan_service import analyze, get_verdict
from app.services.groq_service import get_ai_analysis


SCAM_LABEL_NAME       = "ScamShield - Scam"
SUSPICIOUS_LABEL_NAME = "ScamShield - Suspicious"


# ── Credential helpers ────────────────────────────────────────────────────────

def _build_credentials(conn: GmailConnection) -> Credentials:
    """Build a refreshed Google Credentials object from the stored tokens."""
    creds = Credentials(
        token         = conn.access_token,
        refresh_token = conn.refresh_token,
        token_uri     = "https://oauth2.googleapis.com/token",
        client_id     = os.getenv("GOOGLE_CLIENT_ID"),
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes        = ["https://www.googleapis.com/auth/gmail.modify"]
    )
    # Refresh if expired
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        conn.access_token  = creds.token
        conn.token_expiry  = creds.expiry
        db.session.commit()
    return creds


def _get_or_create_label(service, label_name: str) -> str:
    """Return the label ID for label_name, creating it if it doesn't exist."""
    labels = service.users().labels().list(userId="me").execute().get("labels", [])
    for lbl in labels:
        if lbl["name"] == label_name:
            return lbl["id"]
    # Create the label
    created = service.users().labels().create(
        userId="me",
        body={"name": label_name, "labelListVisibility": "labelShow", "messageListVisibility": "show"}
    ).execute()
    return created["id"]


# ── Email parsing ─────────────────────────────────────────────────────────────

def _extract_email_text(msg_payload: dict) -> str:
    """Pull plain text content out of the Gmail message payload."""
    parts = msg_payload.get("parts", [])
    body  = ""

    if not parts:
        # Single-part message
        data = msg_payload.get("body", {}).get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
        return body

    for part in parts:
        mime = part.get("mimeType", "")
        if mime == "text/plain":
            data = part.get("body", {}).get("data", "")
            if data:
                body += base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")

    return body.strip()


def _get_header(headers: list, name: str) -> str:
    for h in headers:
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


# ── Main scanner ─────────────────────────────────────────────────────────────

def scan_gmail_inbox(user_id: int) -> dict:
    """
    Fetch unread emails for the connected Gmail account, run them through
    the scam detection engine, and take action based on the result.

    Returns a summary dict: { scanned, scam, suspicious, safe, errors }
    """
    conn = GmailConnection.query.filter_by(user_id=user_id, is_active=True).first()
    if not conn:
        return {"error": "No active Gmail connection found"}

    summary = {"scanned": 0, "scam": 0, "suspicious": 0, "safe": 0, "errors": 0}

    try:
        creds   = _build_credentials(conn)
        service = build("gmail", "v1", credentials=creds, cache_discovery=False)

        # Fetch unread messages in inbox (max 20 per run to stay within rate limits)
        result   = service.users().messages().list(
            userId="me", labelIds=["INBOX", "UNREAD"], maxResults=20
        ).execute()
        messages = result.get("messages", [])

        if not messages:
            conn.last_scanned_at = datetime.now(timezone.utc)
            db.session.commit()
            return summary

        scam_label_id       = None
        suspicious_label_id = None

        for msg_ref in messages:
            try:
                msg      = service.users().messages().get(
                    userId="me", id=msg_ref["id"], format="full"
                ).execute()
                headers  = msg["payload"].get("headers", [])
                sender   = _get_header(headers, "From")
                subject  = _get_header(headers, "Subject")
                body     = _extract_email_text(msg["payload"])

                if not body and not subject:
                    continue  # nothing to scan

                input_text = f"{sender} {subject} {body}".strip()
                scan_type  = "email"

                # Run detection
                analysis    = analyze(input_text, scan_type)
                rule_result = get_verdict(analysis["score"])
                ai          = get_ai_analysis(input_text, scan_type, rule_result, analysis["flags"])
                final       = ai["verdict"] if ai["available"] else rule_result

                # Save to scans table
                scan = Scan(
                    user_id      = user_id,
                    input_text   = f"[Auto] {subject or sender or input_text[:80]}",
                    scan_type    = scan_type,
                    result       = final,
                    risk_score   = analysis["score"],
                    flags        = ",".join(analysis["flags"]),
                    ai_verdict   = ai["verdict"],
                    ai_reason    = ai["reason"],
                    ai_available = ai["available"]
                )
                db.session.add(scan)
                summary["scanned"] += 1

                # Take action based on result
                if final == "scam":
                    summary["scam"] += 1
                    if conn.scam_action == "trash":
                        service.users().messages().trash(userId="me", id=msg_ref["id"]).execute()
                    else:
                        if scam_label_id is None:
                            scam_label_id = _get_or_create_label(service, SCAM_LABEL_NAME)
                        service.users().messages().modify(
                            userId="me", id=msg_ref["id"],
                            body={"addLabelIds": [scam_label_id]}
                        ).execute()

                elif final == "suspicious":
                    summary["suspicious"] += 1
                    if conn.suspicious_action == "label":
                        if suspicious_label_id is None:
                            suspicious_label_id = _get_or_create_label(service, SUSPICIOUS_LABEL_NAME)
                        service.users().messages().modify(
                            userId="me", id=msg_ref["id"],
                            body={"addLabelIds": [suspicious_label_id]}
                        ).execute()
                else:
                    summary["safe"] += 1

            except Exception as e:
                print(f"[gmail_service] Error processing message {msg_ref['id']}: {e}")
                summary["errors"] += 1
                continue

        conn.last_scanned_at = datetime.now(timezone.utc)
        db.session.commit()

    except HttpError as e:
        print(f"[gmail_service] Gmail API error for user {user_id}: {e}")
        summary["error"] = str(e)
    except Exception as e:
        print(f"[gmail_service] Unexpected error for user {user_id}: {e}")
        summary["error"] = str(e)

    return summary
