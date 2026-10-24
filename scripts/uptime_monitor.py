import json
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ISSUE_TITLE = "[uptime-monitor] CyberGuard backend outage"


def required_environment(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Required GitHub Actions variable or secret is missing: {name}")
    return value


def github_request(method: str, path: str, payload: dict | None = None):
    token = required_environment("GITHUB_TOKEN")
    repository = required_environment("GITHUB_REPOSITORY")
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(
        f"https://api.github.com/repos/{repository}{path}",
        data=body,
        method=method,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "CyberGuardLive-Uptime-Monitor",
            **({"Content-Type": "application/json"} if body is not None else {}),
        },
    )
    with urlopen(request, timeout=20) as response:
        if response.status == 204:
            return None
        return json.loads(response.read())


def get_open_outage_issue() -> dict | None:
    issues = github_request("GET", "/issues?state=open&per_page=100")
    return next(
        (
            issue
            for issue in issues
            if "pull_request" not in issue and issue.get("title") == ISSUE_TITLE
        ),
        None,
    )


def check_backend(url: str) -> tuple[bool, str]:
    request = Request(url, headers={"User-Agent": "CyberGuardLive-Uptime-Monitor"})
    try:
        with urlopen(request, timeout=20) as response:
            if not 200 <= response.status < 300:
                return False, f"Health endpoint returned HTTP {response.status}."
            payload = json.loads(response.read())
            if not isinstance(payload, dict) or payload.get("status") != "ok":
                return False, "Health endpoint did not report status 'ok'."
            return True, "Health endpoint returned status 'ok'."
    except HTTPError as error:
        return False, f"Health endpoint returned HTTP {error.code}."
    except (URLError, TimeoutError, json.JSONDecodeError) as error:
        return False, f"Health check failed: {error}"


def send_email(subject: str, body: str) -> None:
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = required_environment("SMTP_FROM_EMAIL")
    message["To"] = required_environment("ALERT_EMAIL")
    message.set_content(body)

    host = required_environment("SMTP_HOST")
    port = int(required_environment("SMTP_PORT"))
    username = required_environment("SMTP_USERNAME")
    password = required_environment("SMTP_PASSWORD")
    context = ssl.create_default_context()

    if os.getenv("SMTP_USE_SSL", "false").lower() in {"1", "true", "yes"}:
        with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as server:
            server.login(username, password)
            server.send_message(message)
        return

    with smtplib.SMTP(host, port, timeout=20) as server:
        if os.getenv("SMTP_USE_TLS", "true").lower() in {"1", "true", "yes"}:
            server.starttls(context=context)
        server.login(username, password)
        server.send_message(message)


def main() -> int:
    health_url = required_environment("BACKEND_HEALTH_URL")
    # Fail early rather than silently running a monitor that cannot notify.
    for name in (
        "ALERT_EMAIL",
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USERNAME",
        "SMTP_PASSWORD",
        "SMTP_FROM_EMAIL",
        "GITHUB_TOKEN",
        "GITHUB_REPOSITORY",
    ):
        required_environment(name)
    if "@" not in os.environ["ALERT_EMAIL"] or "@" not in os.environ["SMTP_FROM_EMAIL"]:
        raise RuntimeError("ALERT_EMAIL and SMTP_FROM_EMAIL must be valid email addresses")
    port = int(os.environ["SMTP_PORT"])
    if not 1 <= port <= 65535:
        raise RuntimeError("SMTP_PORT must be between 1 and 65535")

    healthy, detail = check_backend(health_url)
    issue = get_open_outage_issue()

    if not healthy and issue is None:
        send_email(
            "CyberGuard Live backend is offline",
            f"The CyberGuard Live backend health check failed.\n\n{detail}\n"
            f"Health URL: {health_url}",
        )
        github_request(
            "POST",
            "/issues",
            {
                "title": ISSUE_TITLE,
                "body": f"Automated health check detected an outage.\n\n"
                f"- Health URL: {health_url}\n- Result: {detail}",
            },
        )
        print(f"Outage detected and alert sent: {detail}")
    elif healthy and issue is not None:
        send_email(
            "CyberGuard Live backend has recovered",
            f"The CyberGuard Live backend is responding again.\n\n{detail}\n"
            f"Health URL: {health_url}",
        )
        github_request(
            "PATCH",
            f"/issues/{issue['number']}",
            {"state": "closed"},
        )
        print("Backend recovered and recovery alert sent.")
    elif healthy:
        print("Backend is healthy; no outage alert is active.")
    else:
        print(f"Backend remains offline; an outage alert is already active: {detail}")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, HTTPError, URLError, ValueError, smtplib.SMTPException) as error:
        print(f"Uptime monitor failed: {error}", file=sys.stderr)
        sys.exit(1)
