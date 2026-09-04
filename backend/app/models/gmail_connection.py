from app import db
from datetime import datetime, timezone


class GmailConnection(db.Model):
    __tablename__ = "gmail_connections"

    id            = db.Column(db.Integer, primary_key=True)
    user_id       = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    gmail_address = db.Column(db.String(120), nullable=True)
    access_token  = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    token_expiry  = db.Column(db.DateTime, nullable=True)
    is_active     = db.Column(db.Boolean, default=True, nullable=False)
    # How to handle scam emails: "trash" or "label"
    scam_action       = db.Column(db.String(20), default="trash", nullable=False)
    # How to handle suspicious emails: "label" or "nothing"
    suspicious_action = db.Column(db.String(20), default="label", nullable=False)
    last_scanned_at   = db.Column(db.DateTime, nullable=True)
    created_at        = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "gmail_address":      self.gmail_address,
            "is_active":          self.is_active,
            "scam_action":        self.scam_action,
            "suspicious_action":  self.suspicious_action,
            "last_scanned_at":    self.last_scanned_at.isoformat() if self.last_scanned_at else None,
            "connected_at":       self.created_at.isoformat()
        }
