from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from typing import Any

VERSION = "churvox-runtime-jwt-secret-20260712c"
SOURCE_ENV = "CHURVOX_JWT_SECRET_SOURCE"
PERSISTENT_ENV = "CHURVOX_JWT_SECRET_PERSISTENT"
DATABASE_SOURCE = "database"
DATABASE_COLLECTION = "platform_security"
DATABASE_DOCUMENT_ID = "jwt-signing-secret-v1"
MONGO_TIMEOUT_MS = 5000
WEAK_VALUES = {
    "",
    "default_secret_change_me",
    "changeme",
    "change_me",
    "secret",
    "jwt_secret",
    "development",
    "dev",
    "test",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _strong(value: Any) -> bool:
    raw = _text(value)
    lowered = raw.lower()
    return len(raw) >= 32 and lowered not in WEAK_VALUES and "default" not in lowered and "change" not in lowered


def _source_marker() -> str:
    marker = _text(os.environ.get(SOURCE_ENV)).lower()
    allowed = {"environment", DATABASE_SOURCE, "runtime_generated", "module"}
    return marker if marker in allowed else ""


def _new_mongo_client(uri: str):
    from pymongo import MongoClient

    return MongoClient(
        uri,
        serverSelectionTimeoutMS=MONGO_TIMEOUT_MS,
        connectTimeoutMS=MONGO_TIMEOUT_MS,
        socketTimeoutMS=MONGO_TIMEOUT_MS,
        retryWrites=True,
    )


def _database_secret() -> str:
    """Return one strong signing key shared by every process and restart.

    The environment secret remains preferred. This Mongo singleton is only used
    when Render has no strong JWT_SECRET. Mongo Atlas encrypts the stored record
    at rest and the value is never returned by an API or written to logs.
    """

    mongo_url = _text(os.environ.get("MONGO_URL"))
    db_name = _text(os.environ.get("DB_NAME"))
    if not mongo_url or not db_name:
        return ""

    client = None
    try:
        client = _new_mongo_client(mongo_url)
        collection = client[db_name][DATABASE_COLLECTION]
        now = datetime.now(timezone.utc)
        candidate = secrets.token_urlsafe(64)

        # $setOnInsert makes first creation atomic. If two instances start at the
        # same time, both read the one document selected by its fixed _id.
        try:
            collection.update_one(
                {"_id": DATABASE_DOCUMENT_ID},
                {
                    "$setOnInsert": {
                        "secret": candidate,
                        "source": DATABASE_SOURCE,
                        "created_at": now,
                    },
                    "$set": {
                        "last_loaded_at": now,
                        "version": VERSION,
                    },
                },
                upsert=True,
            )
        except Exception:
            # A duplicate-key race can happen between two first-time instances.
            # Reading the fixed record below is the safe resolution.
            pass

        document = collection.find_one({"_id": DATABASE_DOCUMENT_ID}, {"secret": 1}) or {}
        stored = _text(document.get("secret"))
        if _strong(stored):
            return stored

        # Repair an old, empty or weak record with compare-and-set semantics.
        replacement = secrets.token_urlsafe(64)
        previous = document.get("secret")
        repair_filter: dict[str, Any] = {"_id": DATABASE_DOCUMENT_ID}
        if previous is None:
            repair_filter["secret"] = {"$exists": False}
        else:
            repair_filter["secret"] = previous
        try:
            collection.update_one(
                repair_filter,
                {
                    "$set": {
                        "secret": replacement,
                        "source": DATABASE_SOURCE,
                        "rotated_at": now,
                        "last_loaded_at": now,
                        "version": VERSION,
                    }
                },
            )
        except Exception:
            pass

        document = collection.find_one({"_id": DATABASE_DOCUMENT_ID}, {"secret": 1}) or {}
        stored = _text(document.get("secret"))
        return stored if _strong(stored) else ""
    except Exception:
        return ""
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                pass


def _apply(module, secret: str, source: str) -> None:
    persistent = source in {"environment", DATABASE_SOURCE}
    os.environ["JWT_SECRET"] = secret
    setattr(module, "JWT_SECRET", secret)
    setattr(module, "CHURVOX_JWT_SECRET_SOURCE", source)
    setattr(module, "CHURVOX_JWT_SECRET_PERSISTENT", persistent)
    setattr(module, "CHURVOX_JWT_SECRET_VERSION", VERSION)
    os.environ[SOURCE_ENV] = source
    os.environ[PERSISTENT_ENV] = "1" if persistent else "0"


def install(module) -> None:
    env_secret = _text(os.environ.get("JWT_SECRET"))
    module_secret = _text(getattr(module, "JWT_SECRET", ""))
    current = env_secret or module_secret
    marker = _source_marker()

    if marker and _strong(current):
        # A generated process secret is stored in os.environ so all imported
        # modules share it. Before serving traffic, retry Mongo once so a brief
        # first connection delay does not force restart-unsafe sessions.
        if marker == "runtime_generated":
            persisted = _database_secret()
            if _strong(persisted):
                _apply(module, persisted, DATABASE_SOURCE)
                return
        _apply(module, current, marker)
        return

    if _strong(env_secret):
        _apply(module, env_secret, "environment")
        return

    if _strong(module_secret):
        _apply(module, module_secret, "module")
        return

    persisted = _database_secret()
    if _strong(persisted):
        _apply(module, persisted, DATABASE_SOURCE)
        return

    runtime_secret = secrets.token_urlsafe(64)
    _apply(module, runtime_secret, "runtime_generated")
