from __future__ import annotations

import importlib
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse

VERSION = "churvox-production-launch-security-20260712g"
PLATFORM_OWNER_EMAIL = "hello@churvox.com"
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
ACCOUNT_DISABLED_STATUSES = {"revoked", "locked", "disabled", "removed", "archived"}
PAID_STATUSES = {"active", "paid", "past_due"}
LOCKED_STATUSES = {
    "cancelled", "canceled", "unpaid", "incomplete", "incomplete_expired",
    "expired", "payment_required", "plan_required",
}


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
    return (
        len(secret) >= 32
        and lowered not in WEAK_SECRETS
        and "change" not in lowered
        and "default" not in lowered
    )


def _stripe_secret_ready(value: Any) -> bool:
    raw = _text(value)
    return raw.startswith("sk" + "_") and len(raw) > 10


def _stripe_webhook_ready(value: Any) -> bool:
    raw = _text(value)
    return raw.startswith("whsec" + "_") and len(raw) > 10


def _current_jwt_secret(module) -> str:
    return _text(os.environ.get("JWT_SECRET") or getattr(module, "JWT_SECRET", ""))


def _ensure_runtime_jwt_secret(module) -> bool:
    if _secret_is_strong(_current_jwt_secret(module)):
        return True
    patch = None
    for name in ("churvox_runtime_jwt_secret_patch", "backend.churvox_runtime_jwt_secret_patch"):
        try:
            patch = importlib.import_module(name)
            break
        except Exception:
            continue
    if patch is not None:
        try:
            patch.install(module)
        except Exception:
            pass
    return _secret_is_strong(_current_jwt_secret(module))


def _owner_emails() -> list[str]:
    # The platform owner is a product invariant, not an environment-configurable list.
    return [PLATFORM_OWNER_EMAIL]


def _checks(module) -> dict[str, dict[str, Any]]:
    jwt_value = _current_jwt_secret(module)
    jwt_source = _text(
        getattr(
            module,
            "CHURVOX_JWT_SECRET_SOURCE",
            "environment" if os.environ.get("JWT_SECRET") else "missing",
        )
    )
    jwt_persistent = bool(
        getattr(module, "CHURVOX_JWT_SECRET_PERSISTENT", False)
        or _truthy(os.environ.get("CHURVOX_JWT_SECRET_PERSISTENT"))
        or jwt_source in {"environment", "database"}
    )
    frontend = _text(os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
    webhook_secret = next(
        (
            _text(os.environ.get(key))
            for key in (
                "STRIPE_WEBHOOK_SECRET",
                "STRIPE_BILLING_WEBHOOK_SECRET",
                "STRIPE_SIGNING_SECRET",
                "STRIPE_ENDPOINT_SECRET",
            )
            if _text(os.environ.get(key))
        ),
        "",
    )
    owners = _owner_emails()

    if jwt_source == "environment":
        persistent_detail = "Permanent Render JWT_SECRET configured"
    elif jwt_source == "database":
        persistent_detail = "Persistent Mongo-backed JWT signing key active"
    else:
        persistent_detail = "A secure runtime secret is active, but it is not restart-persistent"

    return {
        "jwt_secret": {
            "ok": _secret_is_strong(jwt_value),
            "detail": (
                f"Strong signing secret active ({jwt_source})"
                if _secret_is_strong(jwt_value)
                else "Missing, weak or using a known default"
            ),
        },
        "jwt_secret_persistent": {
            "ok": jwt_persistent,
            "detail": persistent_detail,
        },
        "database": {
            "ok": bool(_text(os.environ.get("MONGO_URL")) and _text(os.environ.get("DB_NAME"))),
            "detail": (
                "Mongo URL and database name configured"
                if _text(os.environ.get("MONGO_URL")) and _text(os.environ.get("DB_NAME"))
                else "Mongo URL or database name missing"
            ),
        },
        "stripe_secret": {
            "ok": _stripe_secret_ready(os.environ.get("STRIPE_SECRET_KEY")),
            "detail": (
                "Stripe secret configured"
                if _stripe_secret_ready(os.environ.get("STRIPE_SECRET_KEY"))
                else "Stripe secret missing or invalid"
            ),
        },
        "stripe_webhook": {
            "ok": _stripe_webhook_ready(webhook_secret),
            "detail": (
                "Stripe endpoint signing secret configured"
                if _stripe_webhook_ready(webhook_secret)
                else "Stripe endpoint signing secret missing or invalid"
            ),
        },
        "transactional_email": {
            "ok": bool(
                _text(os.environ.get("POSTMARK_SERVER_TOKEN"))
                and _text(os.environ.get("POSTMARK_FROM_EMAIL"))
            ),
            "detail": (
                "Postmark token and sender configured"
                if _text(os.environ.get("POSTMARK_SERVER_TOKEN"))
                and _text(os.environ.get("POSTMARK_FROM_EMAIL"))
                else "Postmark token or sender missing"
            ),
        },
        "frontend_url": {
            "ok": frontend in {"https://www.churvox.com", "https://churvox.com"},
            "detail": frontend or "Missing",
        },
        "platform_owner": {
            "ok": owners == [PLATFORM_OWNER_EMAIL],
            "detail": (
                f"{PLATFORM_OWNER_EMAIL} only"
                if owners == [PLATFORM_OWNER_EMAIL]
                else "Unexpected platform owner/admin email configuration"
            ),
        },
        "protected_access_policy": {
            "ok": True,
            "detail": "Protected owner APIs require a current trial, verified billing or a current tester grant",
        },
    }


def _remove_status_route(app) -> None:
    app.router.routes = [
        route
        for route in list(getattr(app.router, "routes", []) or [])
        if not (
            getattr(route, "path", "") == "/api/security/launch-status"
            and "GET" in set(getattr(route, "methods", set()) or set())
        )
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


def _identity_disabled(user: dict[str, Any]) -> bool:
    status = _text(
        user.get("account_status")
        or user.get("login_status")
        or user.get("access_status")
        or user.get("status")
    ).lower()
    return bool(
        status in ACCOUNT_DISABLED_STATUSES
        or user.get("account_locked") is True
        or user.get("revoked_at")
        or user.get("removed_at")
        or user.get("disabled_at")
        or user.get("active") is False
        or user.get("is_active") is False
    )


def _billing_status(user: dict[str, Any]) -> str:
    return _text(
        user.get("subscription_status")
        or user.get("plan_status")
        or user.get("billing_status")
        or user.get("stripe_status")
        or user.get("status")
    ).lower()


def _plan(user: dict[str, Any]) -> str:
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return _text(
        user.get("plan")
        or user.get("ui_plan")
        or user.get("current_plan")
        or user.get("subscription_plan")
        or user.get("billing_plan")
        or user.get("tier")
        or business.get("plan")
        or business.get("subscription_plan")
    ).lower()


def _billing_proof(user: dict[str, Any]) -> bool:
    return bool(
        user.get("stripe_subscription_id")
        or user.get("stripe_customer_id")
        or user.get("stripe_checkout_session_id")
        or user.get("checkout_session_id")
        or _truthy(user.get("billing_verified"))
        or _truthy(user.get("subscription_verified"))
        or _truthy(user.get("checkout_verified_by_stripe"))
        or _truthy(user.get("manual_access_granted_by_app_owner"))
        or _truthy(user.get("access_granted_by_app_owner"))
    )


def _tester_access(user: dict[str, Any]) -> bool:
    if _identity_disabled(user):
        return False
    tester = bool(
        user.get("free_tester_access") is True
        or user.get("is_tester") is True
        or _billing_status(user) == "tester_free"
    )
    if not tester:
        return False
    expires = _date(user.get("free_tester_until") or user.get("free_until"))
    return expires is None or expires > datetime.now(timezone.utc)


def _paid_owner_access(user: dict[str, Any]) -> tuple[bool, str]:
    email = _text(user.get("email")).lower()
    role = _role(user)
    billing = _billing_status(user)
    plan = _plan(user)

    if email == PLATFORM_OWNER_EMAIL:
        return True, "platform-owner"
    if role in WORKER_ROLES or role in PAYROLL_ROLES:
        return (not _identity_disabled(user), "worker-or-payroll")
    if role not in OWNER_ROLES:
        return False, "owner-role-required"
    if user.get("email_verified") is False:
        return False, "email-verification-required"
    if _identity_disabled(user):
        return False, "account-disabled"
    if _tester_access(user):
        return True, "tester-access"
    if billing in LOCKED_STATUSES:
        return False, "payment-required"
    if billing in {"trial", "trialing"}:
        trial_end = _date(user.get("trial_ends_at"))
        if not plan or plan in {"none", "free", "worker", "null", "undefined"}:
            return False, "plan-required"
        if trial_end is None or trial_end <= datetime.now(timezone.utc):
            return False, "trial-expired"
        return True, "current-trial"
    if billing in PAID_STATUSES and _billing_proof(user):
        return True, "verified-paid-state"
    return False, "verified-billing-required"


def install(module) -> None:
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None:
        return

    _ensure_runtime_jwt_secret(module)
    module.PLATFORM_OWNER_EMAILS = [PLATFORM_OWNER_EMAIL]
    module.is_platform_owner = lambda user: _text((user or {}).get("email")).lower() == PLATFORM_OWNER_EMAIL

    _remove_status_route(app)

    async def launch_status():
        checks = _checks(module)
        failures = [name for name, result in checks.items() if not result.get("ok")]
        return {
            "success": True,
            "version": VERSION,
            "ready_for_paid_launch": not failures,
            "checks": checks,
            "critical_failures": failures,
        }

    app.add_api_route("/api/security/launch-status", launch_status, methods=["GET"])

    if not callable(get_current_user) or getattr(app.state, "churvox_production_launch_security_installed", False):
        return

    @app.middleware("http")
    async def production_launch_security(request: Request, call_next):
        path = request.url.path
        if not _secret_is_strong(_current_jwt_secret(module)):
            if any(path == item or path.startswith(item) for item in PUBLIC_WHEN_AUTH_UNSAFE):
                return await call_next(request)
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "detail": "Churvox protected API access is paused because the production JWT secret is not safely configured.",
                    "version": VERSION,
                },
            )

        if request.method == "OPTIONS" or any(path.startswith(prefix) for prefix in ACCESS_EXEMPT_PREFIXES):
            return await call_next(request)

        try:
            user = await get_current_user(request)
        except Exception:
            return await call_next(request)
        if not isinstance(user, dict):
            return await call_next(request)

        allowed, reason = _paid_owner_access(user)
        if not allowed:
            return JSONResponse(
                status_code=402,
                content={
                    "success": False,
                    "detail": "A current Churvox plan, trial or tester access is required.",
                    "billing_lock_reason": reason,
                    "plan_required": True,
                    "redirect": "/plans",
                    "version": VERSION,
                },
            )
        return await call_next(request)

    app.state.churvox_production_launch_security_installed = True
