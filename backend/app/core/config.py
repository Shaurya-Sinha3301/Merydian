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
    # Background jobs. An owner renews its lease every JOB_HEARTBEAT_SECONDS; a lease not renewed for
    # JOB_LEASE_SECONDS lets another worker take the job over (with a higher fence, so the old owner can no
    # longer write). A job waiting for its trip or for an earlier job gives up after JOB_WAIT_DEADLINE_SECONDS.
    JOB_LEASE_SECONDS: int = 90
    JOB_HEARTBEAT_SECONDS: int = 30
    JOB_WAIT_DEADLINE_SECONDS: int = 600
    # How long a trip-creation request waits (without blocking) for its plan before answering 202 Accepted
    TRIP_INIT_WAIT_SECONDS: float = 8
    # Login protection: this many wrong passwords for one account within the window locks sign-in for the window.
    LOGIN_MAX_FAILURES: int = 5
    LOGIN_LOCK_SECONDS: int = 900
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # Refresh tokens valid for 7 days

    # DATABASE
    # Direct (non-pooled) address used only by migrations. Left empty, it is derived from a pooled address
    # or falls back to SQLALCHEMY_DATABASE_URI.
    MIGRATION_DATABASE_URI: str = ""
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
    # No longer used: optimizer state lives in the trip_iterations table. Kept so older environments that
    # still set these variables start without error.
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
    # The broker lives on the queue Redis unless set explicitly. Celery results are not stored: job state
    # lives in Postgres, so CELERY_RESULT_BACKEND is ignored.
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    REDIS_URL: str = "redis://localhost:6379/0"
    # Split Redis roles (see app/core/redis.py); each falls back to REDIS_URL
    REDIS_QUEUE_URL: str = ""
    REDIS_EPHEMERAL_URL: str = ""

    # PUBLIC DEMO SANDBOX
    # "showcase" opens the demo door and lets DEV_OUTBOX work; "production" shuts both whatever their own
    # settings say, so a forgotten flag cannot leave a real deployment open. Production is the default.
    APP_MODE: str = "production"
    DEMO_ENABLED: bool = True
    # Number of proxies in front of the app that append to X-Forwarded-For (0 = no proxy, use the socket address)
    TRUSTED_PROXY_HOPS: int = 0
    # Bearer token for /metrics, /ops and /ops/errors. Without one they are open in showcase mode and hidden in production.
    METRICS_TOKEN: str = ""
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

    @property
    def showcase(self) -> bool:
        return str(self.APP_MODE).strip().lower() == "showcase"

    @field_validator("SQLALCHEMY_DATABASE_URI")
    @classmethod
    def _normalize_db_uri(cls, v: str) -> str:
        # Quotes pasted from a provider's snippet, the legacy "postgres://" scheme, and the explicit
        # psycopg2 driver (a bare "postgresql://" defaults to psycopg 3 on newer SQLAlchemy) are all
        # handled in one place.
        from app.core.db_url import normalize

        return normalize(v)

    class Config:
        case_sensitive = True
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
        env_file_encoding = 'utf-8'
        extra = 'ignore'

settings = Settings()
