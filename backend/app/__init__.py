from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS so the frontend can connect
    CORS(app, origins="*")

    # Init database
    db.init_app(app)

    # Register blueprints
    from .routes.health import health_bp
    from .routes.auth import auth_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)

    # Create tables if they don't exist
    with app.app_context():
        from .models.user import User  # noqa: ensure table is registered
        db.create_all()

    return app
