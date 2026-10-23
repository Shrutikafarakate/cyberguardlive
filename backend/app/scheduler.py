from datetime import datetime, timezone
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi.concurrency import run_in_threadpool

from app.config import MONITOR_INTERVAL_MINUTES
from app.database import (
    delete_orphaned_user_records,
    list_registered_apis,
    save_monitor_result,
    save_alert,
)
from app.email_service import is_email_configured, send_alert_email
from app.monitoring import check_api_availability

scheduler = AsyncIOScheduler()
logger = logging.getLogger(__name__)


async def save_alert_and_notify(
    owner_email: str,
    alert_type: str,
    title: str,
    message: str,
    api_url: str,
) -> None:
    alert = save_alert(
        owner_email=owner_email,
        alert_type=alert_type,
        title=title,
        message=message,
        api_url=api_url,
    )
    if not alert:
        return

    if not is_email_configured():
        logger.warning("Alert email skipped because SMTP is not configured")
        return

    try:
        await run_in_threadpool(send_alert_email, owner_email, alert)
    except Exception:
        logger.exception("Failed to email monitoring alert to %s", owner_email)


async def monitor_registered_apis() -> None:
    records = list_registered_apis()
    if not records:
        return

    for record in records:
        url = record.get("url")
        api_name = record.get("api_name") or "Unnamed API"
        owner_email = record.get("owner_email")
        if not url:
            continue

        result = await check_api_availability(api_name, str(url))
        result["owner_email"] = owner_email
        save_monitor_result(result)

        # Trigger Alerts if needed
        if owner_email:
            if result.get("status") == "OFFLINE":
                code = result.get("status_code") or "N/A"
                await save_alert_and_notify(
                    owner_email,
                    "critical",
                    "API Downtime Detected",
                    f"API '{api_name}' ({url}) is OFFLINE. Status code: {code}.",
                    url,
                )
            elif result.get("response_time", 0) > 3000:
                await save_alert_and_notify(
                    owner_email,
                    "warning",
                    "High Latency Warning",
                    f"API '{api_name}' response time exceeded threshold: {result.get('response_time')} ms.",
                    url,
                )


async def remove_orphaned_user_records() -> None:
    try:
        await run_in_threadpool(delete_orphaned_user_records)
    except Exception:
        logger.exception("Failed to remove records belonging to deleted users")



def start_scheduler() -> None:
    if not scheduler.running:
        scheduler.add_job(
            remove_orphaned_user_records,
            "interval",
            minutes=1,
            id="orphaned-user-data-cleanup",
            replace_existing=True,
        )
        scheduler.add_job(
            monitor_registered_apis,
            "interval",
            minutes=MONITOR_INTERVAL_MINUTES,
            id="api-monitor-scheduler",
            replace_existing=True,
            next_run_time=datetime.now(timezone.utc),
        )
        scheduler.start()


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
