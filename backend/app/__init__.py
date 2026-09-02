from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, origins=app.config["FRONTEND_ORIGINS"])

    db.init_app(app)
    jwt.init_app(app)

    from .routes.health import health_bp
    from .routes.auth import auth_bp
    from .routes.scan import scan_bp
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(scan_bp)

    with app.app_context():
        from .models.user import User  # noqa
        from .models.scan import Scan  # noqa
        db.create_all()

    return app
