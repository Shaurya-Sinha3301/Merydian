from pydantic import field_validator
from pydantic_settings import BaseSettings
from pathlib import Path
from typing import List
import os

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MeiliAi"

    # SECURITY
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh tokens valid for 7 days

    # DATABASE
    SQLALCHEMY_DATABASE_URI: str
    DB_ECHO: bool = False

    # CORS (JSON list in env, e.g. '["https://my-app.vercel.app"]')
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8443", "http://127.0.0.1:8443", "http://localhost:5174", "http://127.0.0.1:5174"]
    # Also allow Vercel preview/production domains by pattern
    BACKEND_CORS_ORIGIN_REGEX: str = r"https://.*\.vercel\.app"

    # AGENT CONFIGURATION (optional: agents fall back / health reports missing)
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""

    # ML OPTIMIZER PATHS
    ML_OPTIMIZER_BASE_DATA: str = "ml_or/data"
    TRIP_SESSION_STORAGE: str = "./trip_sessions"
    OPTIMIZER_OUTPUT_DIR: str = "./optimizer_outputs"

    # TBO HOTEL API (optional: booking features are disabled without credentials)
    TBO_API_URL: str = ""
    TBO_USERNAME: str = ""
    TBO_PASSWORD: str = ""

    # TBO AIR API (optional)
    TBO_AIR_AUTHENTICATE_URL: str = ""
    TBO_AIR_SERVICE_URL: str = ""
    TBO_AIR_USERNAME: str = ""
    TBO_AIR_PASSWORD: str = ""

    # CELERY / REDIS
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    REDIS_URL: str = "redis://localhost:6379/0"

    # PUBLIC DEMO SANDBOX
    DEMO_ENABLED: bool = True
    # Required (header X-Admin-Key) to reset demo data; reset is disabled when empty.
    DEMO_ADMIN_KEY: str = ""
    # Password for the seeded demo accounts; random per seed run when empty,
    # which keeps password login closed (visitors enter through /demo/load).
    DEMO_PASSWORD: str = ""

    # REAL (NON-DEMO) USE
    # Entering this code at sign-up creates a travel agent account; empty disables agent sign-up.
    AGENT_SIGNUP_CODE: str = ""
    # A traveller's own first plan is published straight away; every later change still needs an agent.
    SELF_SERVE_AUTO_APPROVE: bool = True

    # Webhooks may call private addresses (localhost, 10.x) only when this is on; leave off in production.
    WEBHOOK_ALLOW_PRIVATE: bool = False

    # EMAIL AND SMS (optional): without these, messages are recorded as "logged" instead of sent
    FRONTEND_URL: str = "http://localhost:5173"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_TLS: bool = True
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM: str = ""
    # Local testing only: lets /dev/outbox show recent messages so reset links can be read
    DEV_OUTBOX: bool = False

    # TEST CREDENTIALS
    TEST_USER_EMAIL: str = "test@example.com"
    TEST_USER_PASSWORD: str = "testpassword123"

    @property
    def ML_DATA_DIR(self) -> str:
        """Absolute path of the optimizer data folder, wherever the process was started."""
        configured = Path(self.ML_OPTIMIZER_BASE_DATA)
        if configured.is_absolute():
            return str(configured)
        repo_root = Path(__file__).resolve().parents[3]
        for candidate in (Path.cwd() / configured, repo_root / configured):
            if candidate.exists():
                return str(candidate)
        return str(repo_root / configured)

    @field_validator("SQLALCHEMY_DATABASE_URI")
    @classmethod
    def _normalize_db_uri(cls, v: str) -> str:
        # Hosted Postgres providers often hand out the legacy "postgres://" scheme,
        # which SQLAlchemy 1.4+ rejects.
        if v.startswith("postgres://"):
            return "postgresql://" + v[len("postgres://"):]
        return v

    class Config:
        case_sensitive = True
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
        env_file_encoding = 'utf-8'
        extra = 'ignore'

settings = Settings()
