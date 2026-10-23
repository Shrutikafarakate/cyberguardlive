
import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017"
)

MONGO_DB_NAME = os.getenv(
    "MONGO_DB_NAME",
    "cyberguard_live"
)

APP_NAME = os.getenv(
    "APP_NAME",
    "CyberGuard Live"
)

REQUEST_TIMEOUT_SECONDS = float(
    os.getenv(
        "REQUEST_TIMEOUT_SECONDS",
        "10"
    )
)

MONITOR_INTERVAL_MINUTES = int(
    os.getenv(
        "MONITOR_INTERVAL_MINUTES",
        "5"
    )
)

JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be configured before starting the backend")

JWT_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_EXPIRE_MINUTES",
        "1440"
    )
)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5174"
)

NVD_API_KEY = os.getenv(
    "NVD_API_KEY",
    ""
)

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}
BACKEND_PUBLIC_URL = os.getenv(
    "BACKEND_PUBLIC_URL",
    os.getenv("RENDER_EXTERNAL_URL", "http://localhost:8000"),
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5174")
PUBLIC_FRONTEND_URL = os.getenv("PUBLIC_FRONTEND_URL", "").rstrip("/")
BACKEND_HOST = os.getenv("BACKEND_HOST", "localhost")
BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
EMAIL_VERIFICATION_EXPIRE_HOURS = int(
    os.getenv("EMAIL_VERIFICATION_EXPIRE_HOURS", "24")
)
