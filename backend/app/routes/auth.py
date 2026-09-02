from flask import Blueprint, request, jsonify, redirect
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.scan import Scan
from app.services.email_service import send_verification_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    missing = [f for f in ("full_name", "email", "password") if not data or not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    full_name = data["full_name"].strip()
    email     = data["email"].strip().lower()
    password  = data["password"]

    if len(password) < 5:
        return jsonify({"error": "Password must be at least 5 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(full_name=full_name, email=email)
    user.set_password(password)
    token = user.generate_verification_token()
    db.session.add(user)
    db.session.commit()

    # Build the backend base URL so the verify link hits the Flask server directly
    host     = request.host  # e.g. 172.20.10.6:5000
    scheme   = "http"
    base_url = f"{scheme}://{host}"

    send_verification_email(email, full_name, token, base_url)

    return jsonify({
        "message": "Account created. Please check your email to verify your account.",
        "user": user.to_dict()
    }), 201


@auth_bp.route("/verify/<token>", methods=["GET"])
def verify_email(token):
    user = User.query.filter_by(verification_token=token).first()

    # Frontend is on port 5500, backend on 5000 — same host
    host         = request.host.split(":")[0]  # just the IP/hostname
    frontend_url = f"http://{host}:5500"

    if not user:
        return redirect(f"{frontend_url}/login.html?verify=invalid")

    if user.is_verified:
        return redirect(f"{frontend_url}/login.html?verify=already")

    if user.is_verification_token_expired():
        user.verification_token            = None
        user.verification_token_created_at = None
        db.session.commit()
        return redirect(f"{frontend_url}/login.html?verify=expired")

    user.is_verified                   = True
    user.verification_token            = None
    user.verification_token_created_at = None
    db.session.commit()

    return redirect(f"{frontend_url}/login.html?verify=success")


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    missing = [f for f in ("email", "password") if not data or not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    email    = data["email"].strip().lower()
    password = data["password"]

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_verified:
        return jsonify({"error": "Please verify your email before logging in. Check your inbox."}), 403

    token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)

    if not user:
        return jsonify({"error": "User not found"}), 404

    total_scans = Scan.query.filter_by(user_id=user_id).count()

    return jsonify({
        "user": {
            **user.to_dict(),
            "total_scans": total_scans
        }
    }), 200
