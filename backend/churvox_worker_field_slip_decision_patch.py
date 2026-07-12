from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_ROLES = {"employer", "owner", "admin", "manager", "office_admin", "business_owner"}


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def promote_route(app, path, method):
    try:
        method = method.upper()
        preferred = [
            route for route in app.router.routes
            if getattr(route, "path", "") == path
            and method in set(getattr(route, "methods", set()) or set())
        ]
        if not preferred:
            return
        remaining = [route for route in app.router.routes if route not in preferred]
        app.router.routes = preferred + remaining
    except Exception:
        pass


def remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method.upper() in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("id") or (user or {}).get("_id"))


def values(raw, ObjectId):
    output = []
    value = text(raw)
    if value:
        output.append(value)
        try:
            output.append(ObjectId(value))
        except Exception:
            pass
    return output


def business_query(user, ObjectId):
    ids = values(business_id(user), ObjectId)
    return {"$or": [
        {"business_id": {"$in": ids}},
        {"businessId": {"$in": ids}},
        {"contractor_id": {"$in": ids}},
        {"owner_business_id": {"$in": ids}},
        {"owner_id": {"$in": ids}},
    ]}


def install(module):
    name = getattr(module, "__name__", "")
    # These paths can be overwritten by legacy routers later in startup.
    # Re-running install is intentional: remove the competing route and reassert
    # the final business-scoped handler every time the final wrapper calls us.
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def decide(slip_id: str, decision: str, request: Request):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type"))
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Owner access required")

        mapped = {
            "approve": "approved",
            "approved": "approved",
            "edit": "needs_owner_edit",
            "park": "parked",
            "parked": "parked",
            "reject": "rejected",
            "rejected": "rejected",
            "dismiss": "dismissed",
            "dismissed": "dismissed",
            "ignore": "dismissed",
        }.get(lower(decision), "parked")

        try:
            payload = await request.json()
        except Exception:
            payload = {}

        slip_values = values(slip_id, ObjectId)
        query = {
            "$and": [
                business_query(user, ObjectId),
                {"$or": [{"id": slip_id}, {"_id": {"$in": slip_values}}]},
            ]
        }
        now = datetime.now(timezone.utc)
        result = await db.worker_field_slips.update_one(query, {"$set": {
            "status": mapped,
            "owner_decision": mapped,
            "decision_note": text(payload.get("note") or payload.get("owner_note")),
            "decided_by": text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("email")),
            "decided_at": now,
            "updated_at": now,
        }})
        if getattr(result, "matched_count", 0) == 0:
            raise HTTPException(status_code=404, detail="Worker field slip not found")

        try:
            await db.command_decisions.insert_one({
                "business_id": business_id(user),
                "action_id": slip_id,
                "decision": mapped,
                "status": mapped,
                "source": "worker_field_slip_decision",
                "note": text(payload.get("note") or payload.get("owner_note") or "Owner decision recorded."),
                "created_at": now,
                "updated_at": now,
            })
        except Exception:
            pass

        return {
            "success": True,
            "id": slip_id,
            "decision": mapped,
            "safety": "Owner decision recorded. Nothing was sent, synced, charged or changed.",
        }

    path = "/api/command/field-slips/{slip_id}/{decision}"
    remove_route(app, path, "POST")
    app.add_api_route(path, decide, methods=["POST"])
    promote_route(app, path, "POST")
    INSTALLED.add(name)


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
