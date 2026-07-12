from __future__ import annotations

import os
import secrets
from typing import Any

VERSION = "churvox-runtime-jwt-secret-20260712"
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


def install(module) -> None:
    current = _text(os.environ.get("JWT_SECRET") or getattr(module, "JWT_SECRET", ""))
    if _strong(current):
        setattr(module, "JWT_SECRET", current)
        setattr(module, "CHURVOX_JWT_SECRET_SOURCE", "environment")
        return

    runtime_secret = secrets.token_urlsafe(64)
    os.environ["JWT_SECRET"] = runtime_secret
    setattr(module, "JWT_SECRET", runtime_secret)
    setattr(module, "CHURVOX_JWT_SECRET_SOURCE", "runtime_generated")
    setattr(module, "CHURVOX_JWT_SECRET_VERSION", VERSION)
