import os
from datetime import datetime, timezone

from flask import Blueprint, redirect, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from app import db
from app.models.gmail_connection import GmailConnection
from app.services.gmail_service import scan_gmail_inbox

gmail_bp = Blueprint("gmail", __name__, url_prefix="/api/gmail")

SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]


def _flow() -> Flow:
    """Build the OAuth flow from env vars."""
    return Flow.from_client_config(
        {
            "web": {
                "client_id":                os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret":            os.getenv("GOOGLE_CLIENT_SECRET"),
                "auth_uri":                 "https://accounts.google.com/o/oauth2/auth",
                "token_uri":                "https://oauth2.googleapis.com/token",
                "redirect_uris":            [os.getenv("GOOGLE_REDIRECT_URI")],
            }
        },
        scopes=SCOPES,
        redirect_uri=os.getenv("GOOGLE_REDIRECT_URI")
    )


# ── Step 1a: Return the OAuth URL as JSON (for frontend fetch) ───────────────

@gmail_bp.route("/auth-url")
@jwt_required()
def auth_url():
    user_id  = get_jwt_identity()
    flow     = _flow()
    url, _   = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=str(user_id)
    )
    return jsonify({"auth_url": url}), 200


# ── Step 1b: Redirect user to Google consent page (legacy / direct) ──────────

@gmail_bp.route("/connect")
@jwt_required()
def connect():
    user_id = get_jwt_identity()
    flow    = _flow()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=str(user_id)
    )
    return redirect(auth_url)


# ── Step 2: Google redirects back here with the auth code ────────────────────

@gmail_bp.route("/callback")
def callback():
    host         = request.host.split(":")[0]
    frontend_url = f"http://{host}:5500"

    error = request.args.get("error")
    if error:
        return redirect(f"{frontend_url}/profile.html?gmail=denied")

    state   = request.args.get("state", "")
    code    = request.args.get("code", "")

    if not state or not code:
        return redirect(f"{frontend_url}/profile.html?gmail=error")

    try:
        user_id = int(state)
    except ValueError:
        return redirect(f"{frontend_url}/profile.html?gmail=error")

    try:
        flow = _flow()
        flow.fetch_token(code=code)
        creds = flow.credentials

        # Get the Gmail address for this token
        service      = build("gmail", "v1", credentials=creds, cache_discovery=False)
        profile      = service.users().getProfile(userId="me").execute()
        gmail_address = profile.get("emailAddress", "")

        # Upsert — one connection per user
        conn = GmailConnection.query.filter_by(user_id=user_id).first()
        if conn:
            conn.access_token  = creds.token
            conn.refresh_token = creds.refresh_token or conn.refresh_token
            conn.token_expiry  = creds.expiry
            conn.gmail_address = gmail_address
            conn.is_active     = True
        else:
            conn = GmailConnection(
                user_id       = user_id,
                gmail_address = gmail_address,
                access_token  = creds.token,
                refresh_token = creds.refresh_token,
                token_expiry  = creds.expiry,
                is_active     = True
            )
            db.session.add(conn)

        db.session.commit()
        return redirect(f"{frontend_url}/profile.html?gmail=connected")

    except Exception as e:
        print(f"[gmail_callback] Error: {e}")
        return redirect(f"{frontend_url}/profile.html?gmail=error")


# ── Status ────────────────────────────────────────────────────────────────────

@gmail_bp.route("/status")
@jwt_required()
def status():
    user_id = int(get_jwt_identity())
    conn    = GmailConnection.query.filter_by(user_id=user_id).first()
    if not conn:
        return jsonify({"connected": False}), 200
    return jsonify({"connected": conn.is_active, "connection": conn.to_dict()}), 200


# ── Disconnect ────────────────────────────────────────────────────────────────

@gmail_bp.route("/disconnect", methods=["DELETE"])
@jwt_required()
def disconnect():
    user_id = int(get_jwt_identity())
    conn    = GmailConnection.query.filter_by(user_id=user_id).first()
    if conn:
        db.session.delete(conn)
        db.session.commit()
    return jsonify({"message": "Gmail disconnected."}), 200


# ── Update settings (scam_action / suspicious_action) ────────────────────────

@gmail_bp.route("/settings", methods=["PATCH"])
@jwt_required()
def update_settings():
    user_id = int(get_jwt_identity())
    conn    = GmailConnection.query.filter_by(user_id=user_id, is_active=True).first()
    if not conn:
        return jsonify({"error": "No active Gmail connection"}), 404

    data = request.get_json() or {}
    if "scam_action" in data and data["scam_action"] in ("trash", "label"):
        conn.scam_action = data["scam_action"]
    if "suspicious_action" in data and data["suspicious_action"] in ("label", "nothing"):
        conn.suspicious_action = data["suspicious_action"]

    db.session.commit()
    return jsonify({"message": "Settings updated.", "connection": conn.to_dict()}), 200


# ── Manual trigger (for testing) ─────────────────────────────────────────────

@gmail_bp.route("/scan-now", methods=["POST"])
@jwt_required()
def scan_now():
    user_id = int(get_jwt_identity())
    result  = scan_gmail_inbox(user_id)
    return jsonify(result), 200
