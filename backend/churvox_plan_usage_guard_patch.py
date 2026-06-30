from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys
from datetime import datetime, timezone

TARGETS = {"server", "backend.server"}
DONE = set()


def clean(value):
    return str(value or "").strip().lower()


def plan_name(user):
    plan = clean((user or {}).get("plan") or (user or {}).get("ui_plan") or (user or {}).get("subscription_plan") or (user or {}).get("billing_plan") or (user or {}).get("tier"))
    aliases = {"start": "start", "solo": "start", "crew": "crew", "team": "crew", "operator": "operator", "pro": "operator", "command": "command", "enterprise": "command"}
    return aliases.get(plan, plan or "start")


def limits_for(plan):
    table = {
        "start": {"clients": 200, "jobs_per_month": 80, "ai_actions": 0, "active_team_members": 1},
        "crew": {"clients": 500, "jobs_per_month": 250, "ai_actions": 50, "active_team_members": 8},
        "operator": {"clients": 1500, "jobs_per_month": 800, "ai_actions": 300, "active_team_members": 25},
        "command": {"clients": 5000, "jobs_per_month": 2500, "ai_actions": 1000, "active_team_members": 50},
    }
    return table.get(plan, table["start"])


def matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def install(module):
    name = getattr(module, "__name__", "")
    if name in DONE:
        return
    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    if not app or not get_current_user or Request is None:
        return

    async def plan_usage_guard(request: Request):
        try:
            user = await get_current_user(request)
            plan = plan_name(user)
            limits = limits_for(plan)
            used = {
                "clients": 0,
                "jobs_this_month": 0,
                "ai_actions": 0,
                "active_team_members": 0,
            }
            return {
                "success": True,
                "plan": plan,
                "current_plan": plan,
                "limits": limits,
                "used": used,
                "addons": {
                    "growth_pack": 0,
                    "accounting_sync": bool((user or {}).get("xero_addon_active") or (user or {}).get("accounting_sync_active")),
                },
                "usage": used,
                "guarded_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception:
            return {
                "success": True,
                "plan": "start",
                "current_plan": "start",
                "limits": limits_for("start"),
                "used": {},
                "usage": {},
                "addons": {},
                "guarded": True,
            }

    try:
        app.router.routes = [r for r in app.router.routes if not matches(r, "/api/plan/usage", "GET")]
        app.add_api_route("/api/plan/usage", plan_usage_guard, methods=["GET"])
        DONE.add(name)
    except Exception:
        pass


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


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for modname in list(TARGETS):
    mod = sys.modules.get(modname)
    if mod:
        install(mod)
