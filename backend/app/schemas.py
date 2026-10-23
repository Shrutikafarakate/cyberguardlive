from pydantic import BaseModel, Field, HttpUrl, EmailStr


# =========================
# API Monitoring Schemas
# =========================

class MonitorRequest(BaseModel):

    api_name: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    url: HttpUrl

    method: str = "GET"

    interval: str = "60"


class MonitorResponse(BaseModel):

    api_name: str

    url: str

    status: str

    status_code: int | None

    response_time: int

    last_checked: str

    uptime_percentage: float | None = None

    method: str = "GET"

    interval: str = "60"


class UpdateAPIRequest(BaseModel):

    old_url: HttpUrl

    api_name: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    url: HttpUrl

    method: str = "GET"

    interval: str = "60"


# =========================
# Registration Schemas
# =========================

class RegisterRequest(BaseModel):

    name: str = Field(
        ...,
        min_length=3,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        ...,
        min_length=8
    )


class RegisterResponse(BaseModel):

    message: str

    name: str

    email: EmailStr


# =========================
# Login Schemas
# =========================

class LoginRequest(BaseModel):

    email: EmailStr

    password: str = Field(
        ...,
        min_length=1
    )


class LoginResponse(BaseModel):

    message: str

    name: str

    email: EmailStr

    access_token: str

    token_type: str = "bearer"


# =========================
# Forgot Password Schemas
# =========================

class ForgotPasswordRequest(BaseModel):

    email: EmailStr

    new_password: str = Field(
        ...,
        min_length=8
    )


class ForgotPasswordResponse(BaseModel):

    message: str