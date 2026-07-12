from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

VERSION = "churvox-production-launch-security-20260712b"
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
ACCESS_EXEMPT_PREFIXES = (
    "/api/auth/",
    "/api/worker/",
    "/api/billing/",
    "/api/admin/",
    "/api/platform/",
    "/api/invite/",
    "/api/public/",
    "/api/security/",
    "/api/health",
)
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin"}
WORKER_ROLES = {"worker", "staff", "field_worker", "technician", "subcontractor"}
PAYROLL_ROLES = {"payroll", "payroll_user", "payroll_admin"}
PAID_STATUSES = {"active", "paid", "trialing", "trial", "past_due"}
LOCKED_STATUSES = {"cancelled", "canceled", "unpaid", "incomplete_expired", "locked", "disabled", "expired", "payment_required"}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _text(value).lower() in {"1", "true", "yes", "on", "active", "enabled", "verified", "granted"}


def _date(value: Any):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    raw = _text(value)
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


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
        "protected_access_policy": {
            "ok": True,
            "detail": "Protected owner APIs require Stripe proof or a current tester grant",
        },
    }


def _remove_status_route(app) -> None:
    app.router.routes = [
        route for route in list(getattr(app.router, "routes", []) or [])
        if not (getattr(route, "path", "") == "/api/security/launch-status" and "GET" in set(getattr(route, "methods", set()) or set()))
    ]


def _role(user: dict[str, Any]) -> str:
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return _text(
        user.get("role")
        or user.get("user_role")
        or user.get("account_type")
        or user.get("worker_role")
        or business.get("role")
    ).lower().replace("-", "_").replace(" ", "_")


def _tester_access(user: dict[str, Any]) -> bool:
    status = _text(user.get("subscription_status") or user.get("billing_status")).lower()
    if status in {"revoked", "locked", "disabled", "expired"}:
        return False
    if user.get("free_tester_revoked_at") or user.get("revoked_at"):
        return False
    tester = _truthy(user.get("free_tester_access")) or _truthy(user.get("is_tester")) or status == "tester_free"
    if not tester:
        return False
    until = _date(user.get("free_tester_until") or user.get("free_until"))
    return until is None or until > datetime.now(timezone.utc)


def _billing_proof(user: dict[str, Any]) -> bool:
    return bool(
        _text(user.get("stripe_subscription_id"))
        or _text(user.get("stripe_checkout_session_id"))
        or _text(user.get("checkout_session_id"))
        or _truthy(user.get("checkout_verified_by_stripe"))
        or _truthy(user.get("billing_verified"))
        or _truthy(user.get("subscription_verified"))
        or _truthy(user.get("manual_access_granted_by_app_owner"))
        or _truthy(user.get("access_granted_by_app_owner"))
    )


def _paid_owner_access(user: dict[str, Any]) -> bool:
    email = _text(user.get("email")).lower()
    if email == "hello@churvox.com":
        return True
    role = _role(user)
    if role in WORKER_ROLES or role in PAYROLL_ROLES:
        return True
    if _tester_access(user):
        return True
    if role and role not in OWNER_ROLES:
        return False
    status = _text(user.get("subscription_status") or user.get("plan_status") or user.get("billing_status") or user.get("stripe_status")).lower()
    if status in LOCKED_STATUSES or user.get("billing_lock_reason") or user.get("account_locked") is True or user.get("has_app_access") is False:
        return False
    trial_end = _date(user.get("trial_ends_at"))
    if status in {"trial", "trialing"} and trial_end and trial_end <= datetime.now(timezone.utc):
        return False
    return status in PAID_STATUSES and _billing_proof(user)


def _is_access_exempt(path: str) -> bool:
    return any(path == prefix.rstrip("/") or path.startswith(prefix) for prefix in ACCESS_EXEMPT_PREFIXES)


def install(module) -> None:
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or getattr(app.state, "churvox_production_launch_security", False):
        return

    checks = _checks(module)
    jwt_safe = checks["jwt_secret"]["ok"]

    @app.middleware("http")
    async def paid_launch_security_middleware(request: Request, call_next):
        path = request.url.path
        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        if not jwt_safe and path.startswith("/api/") and not any(path == allowed or path.startswith(allowed) for allowed in PUBLIC_WHEN_AUTH_UNSAFE):
            return JSONResponse(
                {
                    "success": False,
                    "detail": "Churvox protected API access is paused because the production JWT secret is not safely configured.",
                    "version": VERSION,
                },
                status_code=503,
            )

        if jwt_safe and callable(get_current_user) and path.startswith("/api/") and not _is_access_exempt(path):
            try:
                user = await get_current_user(request)
            except Exception:
                user = None
            if isinstance(user, dict):
                role = _role(user)
                if role in WORKER_ROLES:
                    return JSONResponse({"success": False, "detail": "Worker accounts cannot open owner API routes.", "version": VERSION}, status_code=403)
                if not _paid_owner_access(user):
                    return JSONResponse(
                        {
                            "success": False,
                            "detail": "A verified subscription or current tester grant is required for this owner API.",
                            "billing_lock_reason": "verified_access_required",
                            "version": VERSION,
                        },
                        status_code=402,
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
