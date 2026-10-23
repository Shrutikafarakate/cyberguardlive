import ipaddress
import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode, urlsplit

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pymongo.errors import PyMongoError

from app.config import (
    BACKEND_PUBLIC_URL,
    EMAIL_VERIFICATION_EXPIRE_HOURS,
    FRONTEND_URL,
    PUBLIC_FRONTEND_URL,
    CORS_ORIGINS,
)

from app.database import (
    clear_alerts,
    delete_registered_api,
    delete_orphaned_user_records,
    ensure_indexes,
    list_alerts,
    list_monitor_activity,
    list_registered_apis,
    save_monitor_result,
    update_registered_api,
)

from app.user_store import (
    find_user_by_email,
    create_user,
    delete_user_account,
    delete_pending_registration,
    find_pending_registration,
    migrate_legacy_users,
    save_pending_registration,
    update_user_password,
)

from app.monitoring import check_api_availability
from app.security import inspect_api_security

from app.auth import (
    create_access_token,
    create_email_verification_token,
    decode_email_verification_token,
    get_current_user,
    hash_password,
    verify_password,
)

from app.email_service import is_email_configured, send_verification_email

from app.scheduler import (
    save_alert_and_notify,
    start_scheduler,
    stop_scheduler,
)

from app.schemas import (
    MonitorRequest,
    MonitorResponse,
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    UpdateAPIRequest,
)


app = FastAPI(
    title="CyberGuard Live Monitoring API"
)

logger = logging.getLogger(__name__)


def _request_frontend_origin(request: Request) -> str | None:
    candidates = []
    origin = request.headers.get("origin")
    if origin:
        candidates.append(origin)

    forwarded_host = request.headers.get("x-forwarded-host")
    forwarded_proto = request.headers.get("x-forwarded-proto", "http")
    if forwarded_host and forwarded_proto in {"http", "https"}:
        candidates.append(f"{forwarded_proto}://{forwarded_host}")

    referer = request.headers.get("referer")
    if referer:
        try:
            referer_url = urlsplit(referer)
            if referer_url.scheme and referer_url.netloc:
                candidates.append(f"{referer_url.scheme}://{referer_url.netloc}")
        except ValueError:
            pass

    for candidate in candidates:
        try:
            parsed_origin = urlsplit(candidate)
            hostname = parsed_origin.hostname
            if (
                parsed_origin.scheme not in {"http", "https"}
                or not hostname
                or parsed_origin.username
                or parsed_origin.password
                or parsed_origin.path not in {"", "/"}
                or parsed_origin.query
                or parsed_origin.fragment
            ):
                continue

            origin_port = parsed_origin.port
            configured_origin = urlsplit(FRONTEND_URL)
            if (
                parsed_origin.scheme.lower() == configured_origin.scheme.lower()
                and hostname.lower() == (configured_origin.hostname or "").lower()
                and origin_port == configured_origin.port
            ):
                return candidate.rstrip("/")

            normalized_host = hostname.rstrip(".").lower()
            is_localhost = normalized_host == "localhost" or normalized_host.endswith(".localhost")
            try:
                address = ipaddress.ip_address(normalized_host)
                is_local_network = address.is_private or address.is_loopback
            except ValueError:
                is_local_network = False

            if is_localhost or is_local_network:
                return f"{parsed_origin.scheme}://{parsed_origin.netloc}"
        except ValueError:
            continue
    return None


def _verification_login_redirect(
    status: str,
    request: Request | None = None,
) -> RedirectResponse:
    frontend_origin = (
        PUBLIC_FRONTEND_URL
        or (
            _request_frontend_origin(request)
            if request is not None
            else None
        )
        or FRONTEND_URL.rstrip("/")
    )
    login_url = f"{frontend_origin}/#/login"
    return RedirectResponse(f"{login_url}?verified={status}", status_code=303)


def _verification_confirmation_redirect(
    token: str,
    request: Request,
) -> RedirectResponse:
    frontend_origin = (
        PUBLIC_FRONTEND_URL
        or _request_frontend_origin(request)
        or FRONTEND_URL.rstrip("/")
    )
    query = urlencode({"token": token})
    return RedirectResponse(
        f"{frontend_origin}/#/verify-email?{query}",
        status_code=303,
    )


# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip().rstrip("/")
        for origin in CORS_ORIGINS.split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================
# Startup
# =========================

@app.on_event("startup")
def startup_event() -> None:

    ensure_indexes()
    migrate_legacy_users()
    delete_orphaned_user_records()

    start_scheduler()


# =========================
# Shutdown
# =========================

@app.on_event("shutdown")
def shutdown_event() -> None:

    stop_scheduler()


# =========================
# Health Check
# =========================

@app.get("/health")
def health_check() -> dict[str, str]:

    return {
        "status": "ok"
    }


# =========================
# Register
# =========================

@app.post(
    "/auth/register",
    response_model=RegisterResponse
)
async def register_user(
    payload: RegisterRequest,
    request: Request,
) -> RegisterResponse:

    email = str(
        payload.email
    ).lower().strip()

    existing_user = find_user_by_email(
        email
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    if not is_email_configured():
        raise HTTPException(
            status_code=503,
            detail="Email verification is unavailable because SMTP is not configured.",
        )

    hashed_password = hash_password(
        payload.password
    )

    expires_at = datetime.now(timezone.utc) + timedelta(
        hours=EMAIL_VERIFICATION_EXPIRE_HOURS
    )
    token = create_email_verification_token(email, expires_at)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    save_pending_registration(
        name=payload.name.strip(),
        email=email,
        hashed_password=hashed_password,
        token_hash=token_hash,
        expires_at=expires_at,
    )

    try:
        await run_in_threadpool(
            send_verification_email,
            email,
            payload.name.strip(),
            token,
            BACKEND_PUBLIC_URL,
        )
    except Exception as exc:
        logger.exception("Failed to send email verification link")
        raise HTTPException(
            status_code=502,
            detail="Unable to send the verification email. Check SMTP settings and try again.",
        ) from exc

    return RegisterResponse(
        message="Check your email and verify your address before logging in.",
        name=payload.name.strip(),
        email=email,
    )


def _complete_email_verification(
    token: str,
    request: Request,
) -> RedirectResponse:
    email = decode_email_verification_token(token)
    if not email:
        return _verification_login_redirect("0", request)

    pending = find_pending_registration(email)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    if pending is None:
        status = "1" if find_user_by_email(email) else "0"
        return _verification_login_redirect(status, request)
    if not secrets.compare_digest(pending.get("token_hash", ""), token_hash):
        return _verification_login_redirect("0", request)

    user = create_user(
        name=pending["name"],
        email=email,
        hashed_password=pending["hashed_password"],
    )
    if user is None and not find_user_by_email(email):
        raise HTTPException(
            status_code=500,
            detail="Registration could not be completed.",
        )

    delete_pending_registration(email, token_hash)
    return _verification_login_redirect("1", request)


@app.get("/auth/verify-email")
async def show_email_verification(
    token: str,
    request: Request,
) -> RedirectResponse:
    return _verification_confirmation_redirect(token, request)


@app.post("/auth/verify-email")
async def verify_email(token: str, request: Request) -> RedirectResponse:
    return _complete_email_verification(token, request)


# =========================
# Login
# =========================

@app.post(
    "/auth/login",
    response_model=LoginResponse
)
async def login_user(
    payload: LoginRequest
) -> LoginResponse:

    email = str(
        payload.email
    ).lower().strip()

    user = find_user_by_email(
        email
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="Email address is not registered."
        )

    password_is_valid = verify_password(
        payload.password,
        user["hashed_password"]
    )

    if not password_is_valid:

        raise HTTPException(
            status_code=401,
            detail="Incorrect password."
        )

    return LoginResponse(
        message="Login successful",
        name=user["name"],
        email=user["email"],
        access_token=create_access_token({"sub": user["email"]}),
    )


# =========================
# Forgot Password
# =========================

@app.post(
    "/auth/forgot-password",
    response_model=ForgotPasswordResponse
)
async def forgot_password(
    payload: ForgotPasswordRequest
) -> ForgotPasswordResponse:

    email = str(
        payload.email
    ).lower().strip()

    user = find_user_by_email(
        email
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="Email not registered"
        )

    hashed_password = hash_password(
        payload.new_password
    )

    updated = update_user_password(
        email,
        hashed_password
    )

    if not updated:

        raise HTTPException(
            status_code=500,
            detail="Password update failed"
        )

    return ForgotPasswordResponse(
        message="Password reset successful"
    )


@app.delete("/api/account")
async def delete_account(
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    try:
        deleted = delete_user_account(current_user["email"])
    except (OSError, PyMongoError, ValueError) as exc:
        logger.exception("Failed to delete account and related data")
        raise HTTPException(
            status_code=500,
            detail="Account deletion failed. Please retry.",
        ) from exc

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    return {"message": "Account and related data deleted"}


# =========================
# Monitor API
# =========================

@app.post(
    "/api/monitor",
    response_model=MonitorResponse
)
async def monitor_api(
    payload: MonitorRequest,
    current_user: dict = Depends(get_current_user),
) -> MonitorResponse:

    try:

        result = await check_api_availability(
            payload.api_name,
            str(payload.url)
        )

        # Keep frontend-selected metadata
        result["method"] = payload.method
        result["interval"] = payload.interval
        result["owner_email"] = current_user["email"]

        saved_result = save_monitor_result(
            result
        )

        if saved_result.get("status") == "OFFLINE":
            code = saved_result.get("status_code") or "N/A"
            await save_alert_and_notify(
                current_user["email"],
                "critical",
                "API Downtime Detected",
                f"API '{payload.api_name}' ({payload.url}) is OFFLINE. Status code: {code}.",
                str(payload.url),
            )

        return MonitorResponse(
            **saved_result
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Monitoring failed: {str(exc)}"
        ) from exc


# =========================
# Get Registered APIs
# =========================

@app.get(
    "/api/apis",
    response_model=list[MonitorResponse]
)
async def get_registered_apis(
    current_user: dict = Depends(get_current_user),
) -> list[MonitorResponse]:

    records = list_registered_apis(current_user["email"])

    return [
        MonitorResponse(**record)
        for record in records
    ]


# =========================
# Update Registered API
# =========================

@app.put(
    "/api/apis",
    response_model=MonitorResponse
)
async def update_api(
    payload: UpdateAPIRequest,
    current_user: dict = Depends(get_current_user),
) -> MonitorResponse:

    try:

        updated = update_registered_api(
            old_url=str(payload.old_url),
            api_name=payload.api_name,
            new_url=str(payload.url),
            method=payload.method,
            interval=payload.interval,
            owner_email=current_user["email"],
        )

        if updated is None:

            raise HTTPException(
                status_code=404,
                detail="API not found"
            )

        return MonitorResponse(
            **updated
        )

    except ValueError as exc:

        raise HTTPException(
            status_code=400,
            detail=str(exc)
        ) from exc

    except HTTPException:

        raise

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"API update failed: {str(exc)}"
        ) from exc


# =========================
# Delete Registered API
# =========================

@app.delete("/api/apis")
async def delete_api(
    payload: dict[str, str],
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:

    url = payload.get("url")

    if not url:

        raise HTTPException(
            status_code=400,
            detail="URL is required"
        )

    deleted = delete_registered_api(
        url,
        current_user["email"],
    )

    if not deleted:

        raise HTTPException(
            status_code=404,
            detail="API not found"
        )

    return {
        "status": "deleted",
        "url": url
    }


# =========================
# Security Monitoring
# =========================

@app.get("/api/security")
async def get_security_status(
    current_user: dict = Depends(get_current_user),
) -> list[dict]:

    apis = list_registered_apis(current_user["email"])
    if not apis:
        return []

    security_results = []
    for record in apis:
        url = record.get("url")
        api_name = record.get("api_name") or "Unnamed API"
        if not url:
            continue

        security_data = await inspect_api_security(api_name, str(url))
        security_results.append(security_data)

    return security_results


# =========================
# Alert Routes
# =========================

@app.get("/api/alerts")
async def get_user_alerts(
    current_user: dict = Depends(get_current_user),
) -> list[dict]:

    return list_alerts(current_user["email"])


@app.get("/api/activity")
async def get_user_activity(
    current_user: dict = Depends(get_current_user),
) -> list[dict]:

    return list_monitor_activity(current_user["email"])


@app.delete("/api/alerts")
async def delete_user_alerts(
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:

    clear_alerts(current_user["email"])
    return {"message": "All alerts cleared"}
