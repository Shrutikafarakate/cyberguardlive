from datetime import datetime, timezone
from typing import Any

from pymongo import MongoClient
from pymongo.database import Database

from app.config import MONGO_DB_NAME, MONGO_URI


client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

db: Database = client[MONGO_DB_NAME]

api_collection = db["apis"]
user_collection = db["users"]
alert_collection = db["alerts"]
activity_collection = db["activity"]
pending_registration_collection = db["pending_registrations"]
migration_state_collection = db["migration_state"]


def delete_user_records(email: str) -> bool:
    api_collection.delete_many({"owner_email": email})
    alert_collection.delete_many({"owner_email": email})
    activity_collection.delete_many({"owner_email": email})
    pending_registration_collection.delete_many({"email": email})
    result = user_collection.delete_one({"email": email})
    return result.deleted_count > 0


def delete_orphaned_user_records() -> None:
    registered_emails = [
        email.strip().lower()
        for email in user_collection.distinct("email")
        if isinstance(email, str) and email.strip()
    ]
    orphan_filter = {
        "owner_email": {
            "$exists": True,
            "$nin": registered_emails,
        }
    }

    api_collection.delete_many(orphan_filter)
    alert_collection.delete_many(orphan_filter)
    activity_collection.delete_many(orphan_filter)


# =========================
# Database Indexes
# =========================

def ensure_indexes() -> None:

    try:
        api_collection.drop_index("url_1")
    except Exception:
        pass

    api_collection.create_index(
        [("owner_email", 1), ("url", 1)],
        unique=True
    )

    api_collection.create_index(
        "last_checked"
    )

    activity_collection.create_index(
        [("owner_email", 1), ("timestamp", -1)]
    )

    user_collection.create_index(
        "email",
        unique=True
    )

    pending_registration_collection.create_index(
        "email",
        unique=True
    )

    pending_registration_collection.create_index(
        "expires_at",
        expireAfterSeconds=0
    )


# =========================
# Save Monitoring Result
# =========================

def save_monitor_result(
    payload: dict[str, Any]
) -> dict[str, Any]:

    now = datetime.now(timezone.utc)

    api_name = (
        payload.get("api_name")
        or "Unnamed API"
    )

    url = str(
        payload.get("url")
    )
    owner_email = payload.get("owner_email")

    record = {
        "api_name": api_name,
        "url": url,
        "status": payload.get("status"),
        "status_code": payload.get("status_code"),
        "response_time": payload.get("response_time"),
        "last_checked": payload.get("last_checked"),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "method": payload.get("method", "GET"),
        "interval": payload.get("interval", "60"),
    }

    if owner_email:
        record["owner_email"] = owner_email

    activity_collection.insert_one({
        "owner_email": owner_email,
        "api_name": api_name,
        "url": url,
        "status": payload.get("status"),
        "status_code": payload.get("status_code"),
        "response_time": payload.get("response_time"),
        "timestamp": payload.get("last_checked") or now.isoformat(),
    })

    existing = api_collection.find_one(
        {"url": url, "owner_email": owner_email}
    )

    if existing:

        total_checks = existing.get("total_checks", 0) + 1
        successful_checks = existing.get("successful_checks", 0)
        if payload.get("status") == "ONLINE":
            successful_checks += 1

        record["created_at"] = existing.get(
            "created_at",
            record["created_at"]
        )
        record["total_checks"] = total_checks
        record["successful_checks"] = successful_checks
        record["uptime_percentage"] = (
            successful_checks / total_checks * 100
        )

        # Preserve existing method and interval
        # when monitoring updates the API status.
        record["method"] = existing.get(
            "method",
            record["method"]
        )

        record["interval"] = existing.get(
            "interval",
            record["interval"]
        )

        api_collection.update_one(
            {"_id": existing["_id"]},
            {
                "$set": record
            }
        )

        updated_record = {
            **existing,
            **record
        }

        updated_record.pop(
            "_id",
            None
        )

        return updated_record

    record["total_checks"] = 1
    record["successful_checks"] = int(payload.get("status") == "ONLINE")
    record["uptime_percentage"] = record["successful_checks"] * 100.0

    api_collection.insert_one(
        record
    )

    record.pop(
        "_id",
        None
    )

    return record


# =========================
# List Registered APIs
# =========================

def list_registered_apis(
    owner_email: str | None = None
) -> list[dict[str, Any]]:

    return list(
        api_collection
        .find(
            {"owner_email": owner_email} if owner_email else {},
            {"_id": 0}
        )
        .sort(
            "last_checked",
            -1
        )
    )


def list_monitor_activity(owner_email: str) -> list[dict[str, Any]]:
    records = list(
        activity_collection.find(
            {"owner_email": owner_email},
            {"_id": 0, "owner_email": 0},
        ).sort("timestamp", -1)
    )
    return records


# =========================
# Update Registered API
# =========================

def update_registered_api(
    old_url: str,
    api_name: str,
    new_url: str,
    method: str,
    interval: str,
    owner_email: str,
) -> dict[str, Any] | None:

    try:

        old_url = str(old_url)
        new_url = str(new_url)

        existing = api_collection.find_one(
            {"url": old_url, "owner_email": owner_email}
        )

        if not existing:
            return None

        # If URL is changed, make sure another API
        # is not already using the new URL.
        if old_url != new_url:

            duplicate = api_collection.find_one(
                {
                    "url": new_url,
                    "owner_email": owner_email,
                    "_id": {
                        "$ne": existing["_id"]
                    }
                }
            )

            if duplicate:
                raise ValueError(
                    "Another API with this URL already exists."
                )

        now = datetime.now(timezone.utc).isoformat()

        api_collection.update_one(
            {
                "_id": existing["_id"]
            },
            {
                "$set": {
                    "api_name": api_name.strip(),
                    "url": new_url,
                    "method": method,
                    "interval": interval,
                    "updated_at": now,
                }
            }
        )

        updated = api_collection.find_one(
            {
                "_id": existing["_id"]
            },
            {
                "_id": 0
            }
        )

        return updated

    except ValueError:
        raise

    except Exception:
        return None


# =========================
# Delete Registered API
# =========================

def delete_registered_api(
    url: str,
    owner_email: str,
) -> bool:

    try:

        result = api_collection.delete_one(
            {
                "url": url,
                "owner_email": owner_email,
            }
        )

        return result.deleted_count > 0

    except Exception:

        return False


# =========================
# Alert Management
# =========================

def save_alert(
    owner_email: str,
    alert_type: str,
    title: str,
    message: str,
    api_url: str | None = None
) -> dict[str, Any] | None:

    if not owner_email:
        return None

    now = datetime.now(timezone.utc)

    # De-duplicate recent identical alerts within 15 mins
    recent = alert_collection.find_one(
        {
            "owner_email": owner_email,
            "title": title,
            "api_url": api_url,
        },
        sort=[("timestamp", -1)]
    )

    if recent:
        try:
            prev_time = datetime.fromisoformat(recent["timestamp"])
            if (now - prev_time).total_seconds() < 900:  # 15 minutes
                return None
        except Exception:
            pass

    alert_doc = {
        "owner_email": owner_email,
        "type": alert_type,  # 'critical', 'warning', 'info'
        "title": title,
        "message": message,
        "api_url": api_url,
        "timestamp": now.isoformat(),
        "read": False
    }

    res = alert_collection.insert_one(alert_doc)
    alert_doc["id"] = str(res.inserted_id)
    alert_doc.pop("_id", None)
    return alert_doc


def list_alerts(owner_email: str) -> list[dict[str, Any]]:

    records = list(
        alert_collection.find(
            {"owner_email": owner_email},
            {"_id": 0}
        ).sort("timestamp", -1)
    )
    return records


def clear_alerts(owner_email: str) -> bool:

    try:
        alert_collection.delete_many({"owner_email": owner_email})
        return True
    except Exception:
        return False
