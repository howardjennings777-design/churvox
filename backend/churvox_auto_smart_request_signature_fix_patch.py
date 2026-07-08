from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any

from fastapi import HTTPException
from starlette.requests import Request

try:
    import churvox_auto_smart_patch as auto_smart
except Exception:
    auto_smart = None

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(v) for v in value]
    if isinstance(value, dict):
        return {"id" if k == "_id" else k: safe(v) for k, v in value.items() if not any(word in str(k).lower() for word in ["password", "token", "secret", "hash"])}
    return value


def business_id(user: Any) -> str:
    if auto_smart is not None and hasattr(auto_smart, "business_id"):
        try:
            return text(auto_smart.business_id(user))
        except Exception:
            pass
    if isinstance(user, dict):
        return text(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id"))
    return text(getattr(user, "business_id", "") or getattr(user, "id", ""))


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method.upper() in set(getattr(r, "methods", set()) or set()))]
        except Exception:
            pass

    async def auto_smart_endpoint(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        bid = business_id(user)
        actions = []
        errors = []
        stored = 0
        if auto_smart is not None:
            try:
                if hasattr(auto_smart, "collect_actions"):
                    actions, errors = await auto_smart.collect_actions(db, user, ObjectId)
                if hasattr(auto_smart, "store_actions"):
                    stored = await auto_smart.store_actions(db, bid, actions)
            except Exception as exc:
                errors.append(f"auto_smart: {exc}")
        return safe({
            "success": True,
            "source": "churvox_auto_smart_request_signature_fix",
            "message": "Auto-smart scan complete. Churvox prepared owner review actions only.",
            "business_id": bid,
            "action_count": len(actions),
            "stored_count": stored,
            "errors": errors,
            "actions": actions[:120],
            "updated_at": now_iso(),
        })

    for method, path in [
        ("GET", "/api/smart-hub/auto-scan"),
        ("POST", "/api/smart-hub/auto-scan"),
        ("GET", "/api/command/auto-smart"),
        ("POST", "/api/command/auto-smart"),
        ("GET", "/api/ai/auto-smart"),
        ("POST", "/api/ai/auto-smart"),
    ]:
        remove_route(path, method)
        app.add_api_route(path, auto_smart_endpoint, methods=[method])

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

    def exec_module(self, module):
        self.original.exec_module(module)
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
