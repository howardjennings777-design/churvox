from __future__ import annotations

from dataclasses import dataclass
from typing import Any

VERSION = "churvox-feature-tier-paid-launch-20260712d"
PLAN_ORDER = ("start", "crew", "operator", "command")
PLAN_ALIASES = {
    "solo": "start",
    "start": "start",
    "team": "crew",
    "crew": "crew",
    "pro": "operator",
    "operator": "operator",
    "enterprise": "command",
    "command": "command",
}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin", "super_admin"}


@dataclass(frozen=True)
class FeatureAccess:
    feature: str
    label: str
    minimum_plan: str
    addon: str = ""


EXEMPT_PREFIXES = (
    "/auth",
    "/billing",
    "/public",
    "/worker",
    "/invite",
    "/lifecycle",
    "/health",
    "/security",
    "/platform",
    "/admin",
    "/plan",
    "/onboarding",
)

EXEMPT_EXACT = {
    "/command/live-smoke-marker",
    "/team/limits",
    "/smart-hub",
    "/smarthub",
}

FEATURE_PREFIXES = (
    (FeatureAccess("owner_intelligence_scenarios", "What Happens If?", "command"), (
        "/owner-intelligence/what-if",
    )),
    (FeatureAccess("owner_intelligence_operator", "Owner Intelligence analysis", "operator"), (
        "/owner-intelligence/explain-my-week", "/owner-intelligence/approval-budget",
    )),
    (FeatureAccess("worker_proof_coach", "Worker Proof Coach", "crew"), (
        "/owner-intelligence/worker-proof-coach",
    )),
    (FeatureAccess("owner_intelligence_core", "Churvox Intelligence core", "start"), (
        "/owner-intelligence/features", "/owner-intelligence/summary",
        "/owner-intelligence/money-left-behind", "/owner-intelligence/job-truth-receipts",
        "/owner-intelligence/promise-memory", "/owner-intelligence/voice-to-business",
    )),
    (FeatureAccess("owner_intelligence_scenarios", "What Happens If?", "command"), (
        "/owner-intelligence/what-if",
    )),
    (FeatureAccess("owner_intelligence_operator", "Owner Intelligence analysis", "operator"), (
        "/owner-intelligence/explain-my-week", "/owner-intelligence/approval-budget",
    )),
    (FeatureAccess("worker_proof_coach", "Worker Proof Coach", "crew"), (
        "/owner-intelligence/worker-proof-coach",
    )),
    (FeatureAccess("owner_intelligence_core", "Churvox Intelligence core", "start"), (
        "/owner-intelligence/features", "/owner-intelligence/summary",
        "/owner-intelligence/money-left-behind", "/owner-intelligence/job-truth-receipts",
        "/owner-intelligence/promise-memory", "/owner-intelligence/voice-to-business",
    )),
    (FeatureAccess("accounting_sync", "Accounting Sync", "command", "accounting_sync"), (
        "/xero", "/integrations/xero", "/accounting", "/myob",
    )),
    (FeatureAccess("command", "Command Approval System", "operator"), (
        "/command", "/command-hub", "/ai-operator", "/operator/slips", "/slips", "/ai/actions",
        "/ai/operator/ask", "/ai/operator/business-health", "/ai/operator/today-plan", "/ai/operator/slips",
        "/ai/customer-updates", "/ai/receptionist", "/ai/quotes/drafts", "/ai/recurring",
        "/ai/client-memory", "/approved-notifications",
    )),
    (FeatureAccess("payroll", "Payroll", "operator"), (
        "/payroll", "/hours-review", "/admin-debt", "/followups", "/automation",
    )),
    (FeatureAccess("team", "Team, worker and messaging tools", "crew"), (
        "/messages", "/logic/team-members", "/workers", "/team",
    )),
    (FeatureAccess("proof", "Worker proof and customer proof packs", "crew"), (
        "/proof-packs", "/job-proof-packs", "/client-portal/proof-job", "/field-activity",
        "/time-approval", "/timesheets",
    )),
    (FeatureAccess("reports", "Command reporting and back-office tools", "command"), (
        "/control-score", "/reports/control", "/imports", "/exports",
    )),
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _text(value).lower() in {"1", "true", "yes", "active", "enabled", "on", "granted", "included"}


def _normal_path(path: Any) -> str:
    value = "/" + _text(path).lstrip("/")
    if value == "/api":
        return "/"
    if value.startswith("/api/"):
        value = value[4:]
    return value.rstrip("/") or "/"


def _role(user: dict[str, Any] | None) -> str:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    return _text(user.get("role") or user.get("user_role") or user.get("account_type") or business.get("role")).lower().replace("-", "_").replace(" ", "_")


def _tester_full_access(user: dict[str, Any] | None) -> bool:
    user = user or {}
    status = _text(user.get("subscription_status") or user.get("billing_status")).lower()
    if status in {"revoked", "locked", "disabled", "expired"} or user.get("free_tester_revoked_at") or user.get("revoked_at"):
        return False
    is_tester = _truthy(user.get("free_tester_access")) or _truthy(user.get("is_tester")) or status == "tester_free"
    pack = _text(user.get("tester_pack") or user.get("pack") or user.get("free_tester_pack")).lower()
    return is_tester and pack in {"full_access", "command_pack", "command_growth_pack"}


def effective_plan(user: dict[str, Any] | None) -> str:
    user = user or {}
    if _text(user.get("email")).lower() == "hello@churvox.com" or _tester_full_access(user):
        return "command"
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    raw = (
        user.get("ui_plan")
        or user.get("current_plan")
        or user.get("plan")
        or user.get("subscription_plan")
        or user.get("billing_plan")
        or user.get("tier")
        or business.get("ui_plan")
        or business.get("plan")
        or business.get("subscription_plan")
    )
    return PLAN_ALIASES.get(_text(raw).lower(), "start")


def has_accounting_sync(user: dict[str, Any] | None) -> bool:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    addons = user.get("addons") if isinstance(user.get("addons"), dict) else {}
    business_addons = business.get("addons") if isinstance(business.get("addons"), dict) else {}
    return any(_truthy(value) for value in (
        user.get("accounting_sync"), user.get("accounting_sync_active"), user.get("accounting_sync_addon"),
        user.get("xero_addon_active"), user.get("xero_enabled"), addons.get("accounting_sync"),
        business.get("accounting_sync"), business.get("accounting_sync_active"), business.get("xero_addon_active"),
        business_addons.get("accounting_sync"),
    ))


def plan_meets(plan: str, minimum: str) -> bool:
    try:
        return PLAN_ORDER.index(PLAN_ALIASES.get(_text(plan).lower(), "start")) >= PLAN_ORDER.index(PLAN_ALIASES.get(_text(minimum).lower(), "start"))
    except ValueError:
        return False


def required_access(path: Any) -> FeatureAccess | None:
    clean_path = _normal_path(path)
    if clean_path in EXEMPT_EXACT or any(clean_path == prefix or clean_path.startswith(prefix + "/") for prefix in EXEMPT_PREFIXES):
        return None
    for access, prefixes in FEATURE_PREFIXES:
        if any(clean_path == prefix or clean_path.startswith(prefix + "/") for prefix in prefixes):
            return access
    return None


def can_access(path: Any, user: dict[str, Any] | None) -> tuple[bool, FeatureAccess | None, str]:
    access = required_access(path)
    if access is None:
        return True, None, effective_plan(user)
    plan = effective_plan(user)
    if access.addon == "accounting_sync" and (plan == "command" or has_accounting_sync(user)):
        return True, access, plan
    return plan_meets(plan, access.minimum_plan), access, plan


def install(module) -> None:
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or not callable(get_current_user):
        return
    if getattr(app.state, "churvox_feature_tier_paid_launch", False):
        return
    try:
        from fastapi.responses import JSONResponse
    except Exception:
        return

    @app.middleware("http")
    async def paid_launch_feature_tier_guard(request, call_next):
        if request.method.upper() == "OPTIONS":
            return await call_next(request)
        access = required_access(request.url.path)
        if access is None:
            return await call_next(request)

        try:
            user = await get_current_user(request)
        except Exception:
            return await call_next(request)
        if not isinstance(user, dict) or _role(user) not in OWNER_ROLES:
            return await call_next(request)

        allowed, resolved_access, plan = can_access(request.url.path, user)
        if allowed:
            return await call_next(request)

        label = resolved_access.label if resolved_access else "This feature"
        minimum = resolved_access.minimum_plan if resolved_access else "command"
        addon = resolved_access.addon if resolved_access else ""
        message = f"{label} requires the {minimum.title()} plan or higher."
        if addon == "accounting_sync":
            message = "Accounting Sync requires Command or the Accounting Sync Add-on."
        return JSONResponse(
            {
                "success": False,
                "detail": message,
                "error": "feature_tier_required",
                "feature": resolved_access.feature if resolved_access else "unknown",
                "current_plan": plan,
                "required_plan": minimum,
                "addon_option": addon or None,
                "upgrade_path": "/plans",
                "version": VERSION,
            },
            status_code=403,
        )

    app.state.churvox_feature_tier_paid_launch = True
