import json
from datetime import datetime, timezone
from typing import Any

from app.config import BASE_DIR
from app.database import (
    delete_user_records,
    migration_state_collection,
    pending_registration_collection,
    user_collection,
)
from pymongo.errors import DuplicateKeyError


USER_STORE_PATH = BASE_DIR / "data" / "users.json"


def _read_users() -> list[dict[str, Any]]:
    if not USER_STORE_PATH.exists():
        return []

    with USER_STORE_PATH.open("r", encoding="utf-8") as store_file:
        users = json.load(store_file)

    if not isinstance(users, list) or not all(isinstance(user, dict) for user in users):
        raise ValueError("User store must contain a JSON list of user records")

    return users


def migrate_legacy_users() -> None:
    migration_key = "legacy-users-v1"
    if migration_state_collection.find_one({"_id": migration_key}):
        return

    for user in _read_users():
        email = user.get("email", "").strip().lower()
        hashed_password = user.get("hashed_password")
        if not email or not hashed_password:
            raise ValueError("Legacy user record is missing required fields")

        user_collection.update_one(
            {"email": email},
            {
                "$setOnInsert": {
                    "name": user.get("name", "").strip(),
                    "email": email,
                    "hashed_password": hashed_password,
                    "created_at": user.get(
                        "created_at",
                        datetime.now(timezone.utc).isoformat(),
                    ),
                }
            },
            upsert=True,
        )

    migration_state_collection.update_one(
        {"_id": migration_key},
        {
            "$setOnInsert": {
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )


def find_user_by_email(email: str) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    return user_collection.find_one(
        {"email": normalized_email},
        {"_id": 0},
    )


def create_user(
    name: str,
    email: str,
    hashed_password: str,
) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    user = {
        "name": name.strip(),
        "email": normalized_email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        user_collection.insert_one(user)
        return user
    except DuplicateKeyError:
        return None


def save_pending_registration(
    name: str,
    email: str,
    hashed_password: str,
    token_hash: str,
    expires_at: datetime,
) -> None:
    normalized_email = email.strip().lower()
    registration = {
        "name": name.strip(),
        "email": normalized_email,
        "hashed_password": hashed_password,
        "token_hash": token_hash,
        "expires_at": expires_at,
    }
    pending_registration_collection.update_one(
        {"email": normalized_email},
        {
            "$set": registration,
        },
        upsert=True,
    )


def find_pending_registration(email: str) -> dict[str, Any] | None:
    normalized_email = email.strip().lower()
    return pending_registration_collection.find_one(
        {
            "email": normalized_email,
            "expires_at": {"$gt": datetime.now(timezone.utc)},
        },
        {"_id": 0},
    )


def delete_pending_registration(email: str, token_hash: str) -> bool:
    normalized_email = email.strip().lower()
    result = pending_registration_collection.delete_one(
        {"email": normalized_email, "token_hash": token_hash}
    )
    return result.deleted_count > 0


def update_user_password(email: str, hashed_password: str) -> bool:
    normalized_email = email.strip().lower()
    result = user_collection.update_one(
        {"email": normalized_email},
        {"$set": {"hashed_password": hashed_password}},
    )
    return result.matched_count > 0


def delete_user_account(email: str) -> bool:
    normalized_email = email.strip().lower()
    users = _read_users()
    remaining_users = [
        user
        for user in users
        if str(user.get("email") or "").strip().lower() != normalized_email
    ]

    if len(remaining_users) != len(users):
        USER_STORE_PATH.write_text(
            json.dumps(remaining_users, indent=2) + "\n",
            encoding="utf-8",
        )

    return delete_user_records(normalized_email)
