from __future__ import annotations

import hashlib
import inspect
import os
from typing import Any

VERSION = "churvox-jwt-health-fingerprint-20260712"
ROUTE_PATH = "/api/auth/login-health"


def _text(value: Any) -> str:
    return str(value or "").strip()


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _text(value).lower() in {"1", "true", "yes", "on", "active", "enabled"}


def _key_id(secret: Any) -> str:
    raw = _text(secret)
    if len(raw) < 32:
        return ""
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _matches(route) -> bool:
    return (
        getattr(route, "path", "") == ROUTE_PATH
        and "GET" in set(getattr(route, "methods", set()) or set())
    )


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None:
        return

    routes = [route for route in list(getattr(app.router, "routes", []) or []) if _matches(route)]
    if not routes:
        return

    original = routes[-1].endpoint
    if getattr(original, "__churvox_jwt_health_fingerprint__", False):
        return

    app.router.routes = [route for route in list(app.router.routes) if not _matches(route)]

    async def fingerprinted_health():
        result = original()
        if inspect.isawaitable(result):
            result = await result
        if not isinstance(result, dict):
            return result

        output = dict(result)
        source = _text(
            getattr(module, "CHURVOX_JWT_SECRET_SOURCE", output.get("jwt_source"))
        ).lower()
        persistent = bool(
            getattr(module, "CHURVOX_JWT_SECRET_PERSISTENT", False)
            or _truthy(os.environ.get("CHURVOX_JWT_SECRET_PERSISTENT"))
            or source in {"environment", "database"}
        )
        key_id = _key_id(getattr(module, "JWT_SECRET", os.environ.get("JWT_SECRET")))

        output.update({
            "jwt_source": source or "unknown",
            "jwt_persistent": persistent,
            "restart_persistence_ready": persistent and bool(key_id),
            "jwt_key_id": key_id,
            "jwt_health_version": VERSION,
        })
        return output

    fingerprinted_health.__churvox_jwt_health_fingerprint__ = True
    fingerprinted_health.__wrapped__ = original
    app.add_api_route(ROUTE_PATH, fingerprinted_health, methods=["GET"])
    app.state.churvox_jwt_health_fingerprint = VERSION
