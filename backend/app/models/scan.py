from app import db
from datetime import datetime, timezone

class Scan(db.Model):
    __tablename__ = "scans"

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    input_text    = db.Column(db.Text, nullable=False)
    scan_type     = db.Column(db.String(20), nullable=False)
    result        = db.Column(db.String(20), nullable=False)
    risk_score    = db.Column(db.Integer, nullable=False)
    flags         = db.Column(db.Text, nullable=True)        # comma-separated keywords
    ai_explanation= db.Column(db.Text, nullable=True)        # Gemini explanation
    created_at    = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id":             self.id,
            "input_text":     self.input_text,
            "scan_type":      self.scan_type,
            "result":         self.result,
            "risk_score":     self.risk_score,
            "flags":          self.flags.split(",") if self.flags else [],
            "ai_explanation": self.ai_explanation,
            "created_at":     self.created_at.isoformat()
        }
