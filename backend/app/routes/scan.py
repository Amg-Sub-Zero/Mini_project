from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.scan import Scan
from app.services.scan_service import analyze, get_verdict
from app.services.gemini_service import get_ai_explanation

scan_bp = Blueprint("scan", __name__, url_prefix="/api")

@scan_bp.route("/scan", methods=["POST"])
@jwt_required()
def run_scan():
    data = request.get_json()

    if not data or not data.get("input_text") or not data.get("scan_type"):
        return jsonify({"error": "input_text and scan_type are required"}), 400

    scan_type  = data["scan_type"].lower()
    input_text = data["input_text"].strip()

    if scan_type not in ("message", "email", "url"):
        return jsonify({"error": "scan_type must be message, email, or url"}), 400

    # Step 1: Rule-based detection
    user_id  = int(get_jwt_identity())
    analysis = analyze(input_text, scan_type)
    result   = get_verdict(analysis["score"])

    # Step 2: Gemini AI explanation
    ai_explanation = get_ai_explanation(input_text, scan_type, result, analysis["score"], analysis["flags"])

    # Step 3: Save to database
    scan = Scan(
        user_id        = user_id,
        input_text     = input_text,
        scan_type      = scan_type,
        result         = result,
        risk_score     = analysis["score"],
        flags          = ",".join(analysis["flags"]),
        ai_explanation = ai_explanation
    )
    db.session.add(scan)
    db.session.commit()

    return jsonify({
        "result":         result,
        "risk_score":     analysis["score"],
        "flags":          analysis["flags"],
        "ai_explanation": ai_explanation,
        "scan":           scan.to_dict()
    }), 200


@scan_bp.route("/scans", methods=["GET"])
@jwt_required()
def get_scans():
    user_id = int(get_jwt_identity())
    scans   = Scan.query.filter_by(user_id=user_id).order_by(Scan.created_at.desc()).all()
    return jsonify({"scans": [s.to_dict() for s in scans]}), 200
