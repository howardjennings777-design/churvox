from __future__ import annotations

import os
import secrets
from typing import Any

VERSION = "churvox-runtime-jwt-secret-20260712b"
SOURCE_ENV = "CHURVOX_JWT_SECRET_SOURCE"
PERSISTENT_ENV = "CHURVOX_JWT_SECRET_PERSISTENT"
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
    return marker if marker in {"environment", "runtime_generated", "module"} else ""


def _apply(module, secret: str, source: str) -> None:
    persistent = source == "environment"
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

    if _strong(current):
        # A generated process secret is also stored in os.environ so all imported
        # server modules use the same value. Never reclassify that value as a
        # permanent Render secret on a later module install.
        if marker == "runtime_generated":
            source = "runtime_generated"
        elif marker == "environment":
            source = "environment"
        elif env_secret:
            source = "environment"
        else:
            source = "module"
        _apply(module, current, source)
        return

    runtime_secret = secrets.token_urlsafe(64)
    os.environ["JWT_SECRET"] = runtime_secret
    _apply(module, runtime_secret, "runtime_generated")
