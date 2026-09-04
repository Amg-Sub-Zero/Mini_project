from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.scan import Scan
from app.services.scan_service import analyze, get_verdict
from app.services.groq_service import get_ai_analysis

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

    user_id = int(get_jwt_identity())

    # Step 1: Rule-based detection
    analysis     = analyze(input_text, scan_type)
    rule_result  = get_verdict(analysis["score"])
    rule_score   = analysis["score"]
    rule_flags   = analysis["flags"]

    # Step 2: AI independent analysis (Groq)
    ai = get_ai_analysis(input_text, scan_type, rule_result, rule_flags)

    # Step 3: Final verdict — AI takes priority when available
    final_result = ai["verdict"] if ai["available"] else rule_result

    # Step 4: Save to database
    scan = Scan(
        user_id       = user_id,
        input_text    = input_text,
        scan_type     = scan_type,
        result        = final_result,
        risk_score    = rule_score,
        flags         = ",".join(rule_flags),
        ai_verdict    = ai["verdict"],
        ai_reason     = ai["reason"],
        ai_available  = ai["available"]
    )
    db.session.add(scan)
    db.session.commit()

    return jsonify({
        # Final (AI-preferred) verdict — drives the main result panel
        "result":        final_result,
        # Rule-based details
        "rule_result":   rule_result,
        "risk_score":    rule_score,
        "flags":         rule_flags,
        # AI details
        "ai_verdict":    ai["verdict"],
        "ai_reason":     ai["reason"],
        "ai_available":  ai["available"],
        "scan":          scan.to_dict()
    }), 200


@scan_bp.route("/scans", methods=["GET"])
@jwt_required()
def get_scans():
    user_id = int(get_jwt_identity())
    scans   = Scan.query.filter_by(user_id=user_id).order_by(Scan.created_at.desc()).all()
    return jsonify({"scans": [s.to_dict() for s in scans]}), 200


@scan_bp.route("/scans", methods=["DELETE"])
@jwt_required()
def clear_scans():
    user_id = int(get_jwt_identity())
    Scan.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"message": "Scan history cleared."}), 200
