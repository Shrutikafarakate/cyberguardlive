from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import REQUEST_TIMEOUT_SECONDS


async def check_api_availability(api_name: str, url: str) -> dict[str, Any]:
    started_at = datetime.now(timezone.utc)
    status = "OFFLINE"
    status_code: int | None = None
    response_time = 0

    try:
        timeout = httpx.Timeout(float(REQUEST_TIMEOUT_SECONDS))
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            start = datetime.now(timezone.utc)
            response = await client.get(url)
            end = datetime.now(timezone.utc)
            status_code = response.status_code
            response_time = int((end - start).total_seconds() * 1000)
            status = "ONLINE" if 200 <= response.status_code < 400 else "OFFLINE"
    except httpx.InvalidURL:
        status = "OFFLINE"
        response_time = 0
    except (httpx.TimeoutException, httpx.ConnectError, httpx.RequestError):
        status = "OFFLINE"
        response_time = 0

    last_checked = started_at.isoformat()

    return {
        "api_name": api_name,
        "url": url,
        "status": status,
        "status_code": status_code,
        "response_time": response_time,
        "last_checked": last_checked,
    }
