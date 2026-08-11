from app import db
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
import secrets

class User(db.Model):
    __tablename__ = "users"

    id                 = db.Column(db.Integer, primary_key=True)
    full_name          = db.Column(db.String(120), nullable=False)
    email              = db.Column(db.String(120), unique=True, nullable=False)
    password_hash      = db.Column(db.String(256), nullable=False)
    is_verified        = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(64), nullable=True, unique=True)
    created_at         = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def generate_verification_token(self):
        self.verification_token = secrets.token_urlsafe(32)
        return self.verification_token

    def to_dict(self):
        return {
            "id":          self.id,
            "full_name":   self.full_name,
            "email":       self.email,
            "is_verified": self.is_verified,
            "created_at":  self.created_at.isoformat()
        }
