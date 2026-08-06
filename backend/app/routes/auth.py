from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    # Validate required fields
    missing = [f for f in ("full_name", "email", "password") if not data or not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    full_name = data["full_name"].strip()
    email     = data["email"].strip().lower()
    password  = data["password"]

    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(full_name=full_name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "message": "Account created successfully",
        "user": user.to_dict()
    }), 201
