from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request as StarletteRequest

VERSION = "churvox-command-slip-decisions-20260713a"
TARGETS = {"server", "backend.server"}
OWNER_ROLES = {"employer", "owner", "admin", "manager", "office_admin", "business_owner"}
DECISIONS = {
    "ignore": "dismissed",
    "dismiss": "dismissed",
    "reject": "rejected",
    "park": "parked",
    "snooze": "snoozed",
}


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


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


def business_id(user):
    return text(
        (user or {}).get("business_id")
        or (user or {}).get("businessId")
        or (user or {}).get("owner_business_id")
        or (user or {}).get("id")
        or (user or {}).get("_id")
    )


def business_query(user, ObjectId):
    ids = values(business_id(user), ObjectId)
    return {
        "$or": [
            {"business_id": {"$in": ids}},
            {"businessId": {"$in": ids}},
            {"contractor_id": {"$in": ids}},
            {"owner_business_id": {"$in": ids}},
            {"owner_id": {"$in": ids}},
        ]
    }


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or HTTPException is None:
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
        return {
            "success": True,
            "version": VERSION,
            "safety": "Owner-only route health. Nothing changed.",
        }

    health_path = "/api/command/decision-route-health"
    remove_route(app, health_path, "GET")
    app.add_api_route(health_path, health, methods=["GET"])
    promote_route(app, health_path, "GET")

    def endpoint_for(decision):
        async def endpoint(slip_id: str, request: StarletteRequest):
            user = await require_owner(request)
            try:
                payload = await request.json()
            except Exception:
                payload = {}

            mapped = DECISIONS[decision]
            slip_values = values(slip_id, ObjectId)
            query = {
                "$and": [
                    business_query(user, ObjectId),
                    {
                        "$or": [
                            {"_id": {"$in": slip_values}},
                            {"id": slip_id},
                            {"action_id": slip_id},
                            {"source_id": slip_id},
                        ]
                    },
                ]
            }
            now = datetime.now(timezone.utc)
            note = text(
                payload.get("note")
                or payload.get("owner_note")
                or payload.get("reason")
                or f"Owner chose {decision}."
            )
            update = {
                "status": mapped,
                "owner_decision": mapped,
                "decision": mapped,
                "decision_note": note,
                "decided_by": text(
                    (user or {}).get("id")
                    or (user or {}).get("_id")
                    or (user or {}).get("email")
                ),
                "decided_at": now,
                "updated_at": now,
            }

            matched = 0
            collections = []
            for collection_name in (
                "command_slips",
                "ai_approval_actions",
                "worker_field_slips",
            ):
                try:
                    result = await db[collection_name].update_many(query, {"$set": update})
                    count = int(getattr(result, "matched_count", 0) or 0)
                    if count:
                        matched += count
                        collections.append(collection_name)
                except Exception:
                    continue

            if matched == 0:
                raise HTTPException(status_code=404, detail="Command slip not found")

            try:
                await db.command_decisions.insert_one(
                    {
                        "business_id": business_id(user),
                        "action_id": slip_id,
                        "decision": mapped,
                        "status": mapped,
                        "source": "final_command_slip_decision",
                        "note": note,
                        "route_version": VERSION,
                        "created_at": now,
                        "updated_at": now,
                    }
                )
            except Exception:
                pass

            return {
                "success": True,
                "id": slip_id,
                "decision": mapped,
                "matched": matched,
                "collections": collections,
                "route_version": VERSION,
                "safety": "Owner decision recorded. Nothing was sent, synced, charged or changed.",
            }

        endpoint.__name__ = f"command_slip_{decision}_final"
        return endpoint

    for decision in DECISIONS:
        path = f"/api/command/slips/{{slip_id}}/{decision}"
        remove_route(app, path, "POST")
        app.add_api_route(path, endpoint_for(decision), methods=["POST"])
        promote_route(app, path, "POST")


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
