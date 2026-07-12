from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys
from datetime import datetime, timezone
from typing import Any

TARGETS = {"server", "backend.server"}
DONE = set()

PLAN_ALIASES = {
    "start": "start",
    "solo": "start",
    "crew": "crew",
    "team": "crew",
    "operator": "operator",
    "pro": "operator",
    "command": "command",
    "enterprise": "command",
}

LOCKED_LIMITS = {
    "start": {"clients": 250, "jobs_per_month": 50, "ai_actions": 25, "active_team_members": 1},
    "crew": {"clients": 1000, "jobs_per_month": 150, "ai_actions": 100, "active_team_members": 5},
    "operator": {"clients": 3000, "jobs_per_month": 500, "ai_actions": 500, "active_team_members": 15},
    "command": {"clients": 10000, "jobs_per_month": 1500, "ai_actions": 2000, "active_team_members": 50},
}

GROWTH_PACK_CAPACITY = {
    "jobs_per_month": 1500,
    "ai_actions": 1000,
    "active_team_members": 50,
}


def clean(value: Any) -> str:
    return str(value or "").strip().lower()


def truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return clean(value) in {"1", "true", "yes", "active", "enabled", "on", "granted"}


def plan_name(user: dict[str, Any] | None) -> str:
    user = user or {}
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
    return PLAN_ALIASES.get(clean(raw), "start")


def growth_pack_count(user: dict[str, Any] | None) -> int:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    raw = (
        user.get("growth_packs")
        or user.get("command_growth_packs")
        or user.get("extra_user_blocks")
        or business.get("growth_packs")
        or business.get("command_growth_packs")
        or business.get("extra_user_blocks")
        or 0
    )
    try:
        return max(0, int(raw))
    except Exception:
        return 0


def has_accounting_sync(user: dict[str, Any] | None) -> bool:
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    addons = user.get("addons") if isinstance(user.get("addons"), dict) else {}
    business_addons = business.get("addons") if isinstance(business.get("addons"), dict) else {}
    return any(truthy(value) for value in (
        user.get("accounting_sync"),
        user.get("accounting_sync_active"),
        user.get("accounting_sync_addon"),
        user.get("xero_addon_active"),
        user.get("xero_enabled"),
        addons.get("accounting_sync"),
        business.get("accounting_sync"),
        business.get("accounting_sync_active"),
        business.get("xero_addon_active"),
        business_addons.get("accounting_sync"),
    ))


def limits_for(plan: str, packs: int = 0) -> dict[str, int]:
    clean_plan = PLAN_ALIASES.get(clean(plan), "start")
    limits = dict(LOCKED_LIMITS[clean_plan])
    if clean_plan == "command" and packs > 0:
        for key, extra in GROWTH_PACK_CAPACITY.items():
            limits[key] += packs * extra
    return limits


def matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def import_any(*names: str):
    for name in names:
        try:
            return importlib.import_module(name)
        except Exception:
            continue
    return None


async def count_usage(module, user: dict[str, Any]) -> tuple[dict[str, Any], dict[str, str]]:
    db = module.db
    ObjectId = module.ObjectId
    team_limits = import_any("churvox_team_client_limit_patch", "backend.churvox_team_client_limit_patch")
    job_limits = import_any("churvox_monthly_job_limit", "backend.churvox_monthly_job_limit")
    ai_limits = import_any("churvox_ai_action_limit", "backend.churvox_ai_action_limit")

    values = []
    if team_limits and hasattr(team_limits, "business_values"):
        values = team_limits.business_values(user, ObjectId)
    if not values:
        raw = user.get("business_id") or user.get("id") or user.get("_id")
        if raw is not None:
            values.append(str(raw))
            try:
                values.append(ObjectId(str(raw)))
            except Exception:
                pass

    counters = {
        "clients": getattr(team_limits, "active_client_count", None),
        "active_team_members": getattr(team_limits, "active_worker_count", None),
        "jobs_this_month": getattr(job_limits, "job_count_this_month", None),
        "ai_actions": getattr(ai_limits, "ai_actions_this_month", None),
    }

    used: dict[str, Any] = {}
    errors: dict[str, str] = {}
    for key, counter in counters.items():
        if not callable(counter):
            used[key] = None
            errors[key] = "Usage counter is not available"
            continue
        try:
            used[key] = int(await counter(db, values))
        except Exception as exc:
            used[key] = None
            errors[key] = str(exc)[:240]
    return used, errors


def install(module):
    name = getattr(module, "__name__", "")
    if name in DONE:
        return
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    db = getattr(module, "db", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or not get_current_user or Request is None or db is None or ObjectId is None:
        return

    async def plan_usage_guard(request: Request):
        user = await get_current_user(request)
        plan = plan_name(user)
        packs = growth_pack_count(user) if plan == "command" else 0
        limits = limits_for(plan, packs)
        used, usage_errors = await count_usage(module, user)
        verified = not usage_errors
        slots_left = {
            "clients": max(0, limits["clients"] - used["clients"]) if used.get("clients") is not None else None,
            "jobs_this_month": max(0, limits["jobs_per_month"] - used["jobs_this_month"]) if used.get("jobs_this_month") is not None else None,
            "ai_actions": max(0, limits["ai_actions"] - used["ai_actions"]) if used.get("ai_actions") is not None else None,
            "active_team_members": max(0, limits["active_team_members"] - used["active_team_members"]) if used.get("active_team_members") is not None else None,
        }
        return {
            "success": True,
            "plan": plan,
            "current_plan": plan,
            "limits": limits,
            "used": used,
            "usage": used,
            "slots_left": slots_left,
            "usage_verified": verified,
            "usage_errors": usage_errors,
            "addons": {
                "growth_pack": packs,
                "command_growth_pack": packs,
                "accounting_sync": plan == "command" or has_accounting_sync(user),
            },
            "limit_source": "locked_paid_launch_limits_2026_07_12",
            "guarded_at": datetime.now(timezone.utc).isoformat(),
        }

    app.router.routes = [route for route in app.router.routes if not matches(route, "/api/plan/usage", "GET")]
    app.add_api_route("/api/plan/usage", plan_usage_guard, methods=["GET"])
    DONE.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, old):
        self.old = old

    def create_module(self, spec):
        if hasattr(self.old, "create_module"):
            return self.old.create_module(spec)
        return None

    def exec_module(self, module):
        self.old.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
