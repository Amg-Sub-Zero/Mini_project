import os
from dotenv import load_dotenv

load_dotenv()


def _resolve_database_uri() -> str:
    """
    Render's PostgreSQL connection strings start with 'postgres://', but
    modern SQLAlchemy/psycopg2 require 'postgresql://'. Rewrite it so both
    local SQLite and Render's Postgres work without manual edits.
    """
    uri = os.getenv("DATABASE_URL", "sqlite:///scamshield.db")
    if uri.startswith("postgres://"):
        uri = uri.replace("postgres://", "postgresql://", 1)
    return uri


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret")
    SQLALCHEMY_DATABASE_URI = _resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"
    FRONTEND_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGIN",
            "http://127.0.0.1:5500,http://localhost:5500"
        ).split(",")
        if origin.strip()
    ]
