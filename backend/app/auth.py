
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import (
    EMAIL_VERIFICATION_EXPIRE_HOURS,
    JWT_EXPIRE_MINUTES,
    JWT_SECRET,
)
from app.user_store import find_user_by_email


ALGORITHM = "HS256"


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password
    )


def create_access_token(data: dict) -> str:
    payload = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=JWT_EXPIRE_MINUTES
    )

    payload["exp"] = expire

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=ALGORITHM
    )


def create_email_verification_token(email: str, expires_at: datetime) -> str:
    return jwt.encode(
        {
            "sub": email,
            "purpose": "email_verification",
            "exp": expires_at,
        },
        JWT_SECRET,
        algorithm=ALGORITHM,
    )


def decode_email_verification_token(token: str) -> str | None:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None

    email = payload.get("sub")
    if payload.get("purpose") != "email_verification" or not isinstance(email, str):
        return None

    return email.strip().lower()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[ALGORITHM],
        )
        email = payload.get("sub")
    except JWTError as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if not email:
        raise HTTPException(
            status_code=401,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = find_user_by_email(email)
    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
