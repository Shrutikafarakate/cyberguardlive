from email.message import EmailMessage
from html import escape
import smtplib
from urllib.parse import quote

from app.config import (
    APP_NAME,
    BACKEND_PUBLIC_URL,
    EMAIL_VERIFICATION_EXPIRE_HOURS,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USE_SSL,
    SMTP_USE_TLS,
    SMTP_USERNAME,
)


def is_email_configured() -> bool:
    return bool(SMTP_HOST and SMTP_FROM_EMAIL)


def _send_email(recipient: str, subject: str, text_body: str, html_body: str) -> None:
    if not is_email_configured():
        raise RuntimeError("SMTP email settings are not configured")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{APP_NAME} <{SMTP_FROM_EMAIL}>"
    message["To"] = recipient
    message.set_content(text_body)
    message.add_alternative(html_body, subtype="html")

    smtp_class = smtplib.SMTP_SSL if SMTP_USE_SSL else smtplib.SMTP
    with smtp_class(SMTP_HOST, SMTP_PORT, timeout=15) as server:
        if SMTP_USE_TLS and not SMTP_USE_SSL:
            server.ehlo()
            server.starttls()
            server.ehlo()
        if SMTP_USERNAME:
            password = (
                "".join(SMTP_PASSWORD.split())
                if SMTP_HOST.lower() == "smtp.gmail.com"
                else SMTP_PASSWORD
            )
            server.login(SMTP_USERNAME, password)
        server.send_message(message)


def send_verification_email(
    recipient: str,
    name: str,
    token: str,
    verification_base_url: str | None = None,
) -> None:
    verification_url = (
        f"{(verification_base_url or BACKEND_PUBLIC_URL).rstrip('/')}"
        f"/auth/verify-email?token={quote(token)}"
    )
    safe_name = escape(name)
    safe_url = escape(verification_url, quote=True)
    _send_email(
        recipient,
        f"Verify your {APP_NAME} email",
        (
            f"Hello {name},\n\n"
            f"Confirm your email address to finish creating your {APP_NAME} account:\n"
            f"{verification_url}\n\n"
            f"This link expires in {EMAIL_VERIFICATION_EXPIRE_HOURS} hours. "
            "If you did not request this, ignore this email."
        ),
        (
            f"<p>Hello {safe_name},</p>"
            f"<p>Confirm your email address to finish creating your {escape(APP_NAME)} account.</p>"
            f'<p><a href="{safe_url}">Verify email address</a></p>'
            f"<p>This link expires in {EMAIL_VERIFICATION_EXPIRE_HOURS} hours. "
            "If you did not request this, ignore this email.</p>"
        ),
    )


def send_alert_email(recipient: str, alert: dict) -> None:
    title = str(alert.get("title") or "API monitoring alert")
    detail = str(alert.get("message") or "A new monitoring alert was recorded.")
    api_url = str(alert.get("api_url") or "")
    text_body = f"{title}\n\n{detail}"
    if api_url:
        text_body += f"\n\nAPI: {api_url}"

    safe_title = escape(title)
    safe_detail = escape(detail)
    safe_api_url = escape(api_url)
    html_body = (
        f"<h2>{safe_title}</h2><p>{safe_detail}</p>"
        + (f"<p>API: {safe_api_url}</p>" if api_url else "")
    )
    _send_email(recipient, f"{APP_NAME}: {title}", text_body, html_body)