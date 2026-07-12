from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request as StarletteRequest

VERSION = "churvox-command-slip-create-20260713a"
TARGETS = {"server", "backend.server"}
OWNER_ROLES = {"employer", "owner", "admin", "manager", "office_admin", "business_owner"}


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            if key in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}:
                continue
            output["id" if key == "_id" else key] = safe(item)
        return output
    return value


def business_id(user):
    return text(
        (user or {}).get("business_id")
        or (user or {}).get("businessId")
        or (user or {}).get("owner_business_id")
        or (user or {}).get("id")
        or (user or {}).get("_id")
    )


def remove_route(app, path, method):
    method = method.upper()
    app.router.routes = [
        route
        for route in app.router.routes
        if not (
            getattr(route, "path", "") == path
            and method in set(getattr(route, "methods", set()) or set())
        )
    ]


def promote_route(app, path, method):
    method = method.upper()
    preferred = [
        route
        for route in app.router.routes
        if getattr(route, "path", "") == path
        and method in set(getattr(route, "methods", set()) or set())
    ]
    if preferred:
        app.router.routes = preferred + [route for route in app.router.routes if route not in preferred]


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or HTTPException is None:
        return

    async def require_owner(request):
        user = await get_current_user(request)
        role = lower(
            (user or {}).get("role")
            or (user or {}).get("user_role")
            or (user or {}).get("account_type")
        )
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Owner access required")
        if not business_id(user):
            raise HTTPException(status_code=400, detail="Business id is missing")
        return user

    async def health(request: StarletteRequest):
        await require_owner(request)
        return {"success": True, "version": VERSION, "safety": "Owner-only Command create route. Nothing changed."}

    async def create(request: StarletteRequest):
        user = await require_owner(request)
        try:
            payload = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="A JSON Command slip is required")
        if not isinstance(payload, dict):
            raise HTTPException(status_code=400, detail="Command slip must be an object")
        title = text(payload.get("title"))
        if not title:
            raise HTTPException(status_code=400, detail="Command slip title is required")

        now = datetime.now(timezone.utc)
        prepared_payload = payload.get("payload") if isinstance(payload.get("payload"), dict) else {}
        row = {
            **payload,
            "business_id": business_id(user),
            "owner_id": text((user or {}).get("id") or (user or {}).get("_id")),
            "created_by": text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("email")),
            "created_by_email": text((user or {}).get("email")),
            "source_type": text(payload.get("source_type") or payload.get("sourceType") or "owner_workspace"),
            "action_type": text(payload.get("action_type") or payload.get("actionType") or "owner_prepared_review"),
            "source_id": text(payload.get("source_id") or f"owner-prepared-{int(now.timestamp() * 1000)}"),
            "title": title,
            "found": text(payload.get("found") or "The owner prepared a draft for Command review."),
            "prepared": text(payload.get("prepared") or "Prepared for owner review. Nothing was sent, synced, charged or changed."),
            "why": text(payload.get("why") or "Owner approval is required before a real record changes."),
            "urgency": text(payload.get("urgency") or "Owner review"),
            "status": "pending",
            "payload": {
                **prepared_payload,
                "prepared_only": True,
                "owner_review_only": True,
                "no_auto_send": True,
                "no_auto_sync": True,
                "no_auto_charge": True,
                "no_auto_record_change": True,
            },
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_at": now,
            "updated_at": now,
            "route_version": VERSION,
        }
        result = await db.command_slips.insert_one(row)
        row["_id"] = result.inserted_id
        output = safe(row)
        return {
            "success": True,
            "slip": output,
            "data": {"slip": output},
            "route_version": VERSION,
            "safety": "Prepared for owner review. Nothing was sent, synced, charged or changed.",
        }

    for path, method, endpoint in [
        ("/api/command/create-route-health", "GET", health),
        ("/api/command/slips", "POST", create),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
        promote_route(app, path, method)


class Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
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
