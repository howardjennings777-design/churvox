from __future__ import annotations

import os
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

VERSION = "churvox-production-launch-security-20260712"
WEAK_SECRETS = {
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
PUBLIC_WHEN_AUTH_UNSAFE = (
    "/api/healthz",
    "/healthz",
    "/api/security/launch-status",
    "/api/billing/webhook",
    "/billing/webhook",
    "/api/billing/webhook-status",
    "/api/public/",
    "/public/",
    "/api/platform/visit",
    "/api/command/live-smoke-marker",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _secret_is_strong(value: Any) -> bool:
    secret = _text(value)
    lowered = secret.lower()
    return len(secret) >= 32 and lowered not in WEAK_SECRETS and "change" not in lowered and "default" not in lowered


def _owner_emails() -> list[str]:
    values = []
    for key in ("PLATFORM_OWNER_EMAIL", "PLATFORM_OWNER_EMAILS", "PLATFORM_ADMIN_EMAILS"):
        for item in _text(os.environ.get(key)).split(","):
            email = item.strip().lower()
            if email and email not in values:
                values.append(email)
    return values or ["hello@churvox.com"]


def _checks(module) -> dict[str, dict[str, Any]]:
    jwt_value = os.environ.get("JWT_SECRET") or getattr(module, "JWT_SECRET", "")
    frontend = _text(os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
    webhook_secret = next((_text(os.environ.get(key)) for key in (
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_BILLING_WEBHOOK_SECRET",
        "STRIPE_SIGNING_SECRET",
        "STRIPE_ENDPOINT_SECRET",
    ) if _text(os.environ.get(key))), "")
    owners = _owner_emails()

    return {
        "jwt_secret": {
            "ok": _secret_is_strong(jwt_value),
            "detail": "Configured with at least 32 non-default characters" if _secret_is_strong(jwt_value) else "Missing, weak or using a known default",
        },
        "database": {
            "ok": bool(_text(os.environ.get("MONGO_URL")) and _text(os.environ.get("DB_NAME"))),
            "detail": "Mongo URL and database name configured" if _text(os.environ.get("MONGO_URL")) and _text(os.environ.get("DB_NAME")) else "Mongo URL or database name missing",
        },
        "stripe_secret": {
            "ok": _text(os.environ.get("STRIPE_SECRET_KEY")).startswith("sk_"),
            "detail": "Stripe secret configured" if _text(os.environ.get("STRIPE_SECRET_KEY")).startswith("sk_") else "Stripe secret missing or invalid",
        },
        "stripe_webhook": {
            "ok": webhook_secret.startswith("whsec_"),
            "detail": "Stripe endpoint signing secret configured" if webhook_secret.startswith("whsec_") else "Stripe endpoint signing secret missing or invalid",
        },
        "transactional_email": {
            "ok": bool(_text(os.environ.get("POSTMARK_SERVER_TOKEN")) and _text(os.environ.get("POSTMARK_FROM_EMAIL"))),
            "detail": "Postmark token and sender configured" if _text(os.environ.get("POSTMARK_SERVER_TOKEN")) and _text(os.environ.get("POSTMARK_FROM_EMAIL")) else "Postmark token or sender missing",
        },
        "frontend_url": {
            "ok": frontend in {"https://www.churvox.com", "https://churvox.com"},
            "detail": frontend or "Missing",
        },
        "platform_owner": {
            "ok": owners == ["hello@churvox.com"],
            "detail": "hello@churvox.com only" if owners == ["hello@churvox.com"] else "Unexpected platform owner/admin email configuration",
        },
    }


def _remove_status_route(app) -> None:
    app.router.routes = [
        route for route in list(getattr(app.router, "routes", []) or [])
        if not (getattr(route, "path", "") == "/api/security/launch-status" and "GET" in set(getattr(route, "methods", set()) or set()))
    ]


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_production_launch_security", False):
        return

    checks = _checks(module)
    jwt_safe = checks["jwt_secret"]["ok"]

    @app.middleware("http")
    async def fail_closed_when_auth_secret_is_unsafe(request: Request, call_next):
        path = request.url.path
        if not jwt_safe and path.startswith("/api/") and not any(path == allowed or path.startswith(allowed) for allowed in PUBLIC_WHEN_AUTH_UNSAFE):
            return JSONResponse(
                {
                    "success": False,
                    "detail": "Churvox protected API access is paused because the production JWT secret is not safely configured.",
                    "version": VERSION,
                },
                status_code=503,
            )
        return await call_next(request)

    _remove_status_route(app)

    async def launch_security_status():
        current = _checks(module)
        ready = all(item.get("ok") is True for item in current.values())
        return {
            "success": True,
            "version": VERSION,
            "ready_for_paid_launch": ready,
            "checks": current,
            "critical_failures": [key for key, item in current.items() if item.get("ok") is not True],
        }

    app.add_api_route("/api/security/launch-status", launch_security_status, methods=["GET"])
    app.state.churvox_production_launch_security = True
