from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from apscheduler.schedulers.background import BackgroundScheduler
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()
scheduler = BackgroundScheduler()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=app.config["FRONTEND_ORIGINS"])

    db.init_app(app)
    jwt.init_app(app)

    from .routes.health import health_bp
    from .routes.auth import auth_bp
    from .routes.scan import scan_bp
    from .routes.gmail import gmail_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(scan_bp)
    app.register_blueprint(gmail_bp)

    with app.app_context():
        from .models.user import User            # noqa
        from .models.scan import Scan            # noqa
        from .models.gmail_connection import GmailConnection  # noqa
        db.create_all()

    # ── Background Gmail polling every 5 minutes ──────────────────────────
    if not scheduler.running:
        def poll_all_gmail():
            """Scan inboxes for every user with an active Gmail connection."""
            with app.app_context():
                from .models.gmail_connection import GmailConnection
                from .services.gmail_service import scan_gmail_inbox
                connections = GmailConnection.query.filter_by(is_active=True).all()
                for conn in connections:
                    try:
                        scan_gmail_inbox(conn.user_id)
                    except Exception as e:
                        print(f"[scheduler] Error scanning user {conn.user_id}: {e}")

        scheduler.add_job(poll_all_gmail, "interval", minutes=5, id="gmail_poll")
        scheduler.start()

    return app
