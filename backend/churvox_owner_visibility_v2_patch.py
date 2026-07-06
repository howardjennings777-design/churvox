from datetime import datetime, timezone
import sys

from fastapi import Request

INSTALLED = set()
COLLECTIONS = {"jobs": "jobs", "clients": "clients", "quotes": "quotes", "invoices": "invoices"}


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
        clean = {}
        for key, item in value.items():
            if key == "password_hash":
                continue
            clean["id" if key == "_id" else key] = safe(item)
        return clean
    return value


def user_id(user):
    return text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or user_id(user))


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {v for v in values if v}
    final_values = list(values)
    for value in list(values):
        try:
            final_values.append(ObjectId(value))
        except Exception:
            pass
    email = lower((user or {}).get("email"))
    ors = [
        {"business_id": {"$in": final_values}},
        {"businessId": {"$in": final_values}},
        {"contractor_id": {"$in": final_values}},
        {"owner_business_id": {"$in": final_values}},
        {"owner_id": {"$in": final_values}},
        {"user_id": {"$in": final_values}},
        {"created_by": {"$in": final_values}},
        {"created_by_id": {"$in": final_values}},
        {"employer_id": {"$in": final_values}},
    ]
    if email:
        ors.extend([{"owner_email": email}, {"created_by_email": email}])
    return {"$or": ors}


def remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))
        ]
    except Exception:
        pass


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

    def make_list(kind):
        async def endpoint(request: Request):
            user = await get_current_user(request)
            rows = []
            try:
                cursor = getattr(db, COLLECTIONS[kind]).find(scope(user, ObjectId)).sort("created_at", -1).limit(500)
                async for row in cursor:
                    rows.append(safe(row))
            except Exception as exc:
                print(f"Churvox owner visibility list skipped {kind}: {exc}", file=sys.stderr)
            return {"success": True, kind: rows, "items": rows, "data": rows}
        return endpoint

    async def team(request: Request):
        user = await get_current_user(request)
        rows = []
        try:
            query = {"$and": [scope(user, ObjectId), {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}
            cursor = db.users.find(query).sort("created_at", -1).limit(500)
            async for row in cursor:
                rows.append(safe(row))
        except Exception as exc:
            print(f"Churvox owner visibility team skipped: {exc}", file=sys.stderr)
        return {"success": True, "workers": rows, "team": rows, "items": rows, "data": rows}

    async def messages(request: Request):
        user = await get_current_user(request)
        rows = []
        for collection in ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]:
            try:
                cursor = getattr(db, collection).find(scope(user, ObjectId)).sort("created_at", -1).limit(120)
                async for row in cursor:
                    rows.append(safe(row))
            except Exception:
                pass
        rows = sorted(rows, key=lambda row: text(row.get("created_at")), reverse=True)[:200]
        return {"success": True, "messages": rows, "items": rows, "data": rows}

    async def command_actions(request: Request):
        data = await messages(request)
        actions = []
        for row in data.get("items", [])[:80]:
            title = row.get("title") or row.get("summary") or row.get("message") or "Owner check"
            actions.append({"id": row.get("id") or title, "type": row.get("type") or row.get("kind") or "Owner check", "title": title, "summary": row.get("summary") or row.get("message") or "Review this update.", "status": row.get("status") or "waiting", "record": row})
        return {"success": True, "actions": actions, "items": actions, "data": actions}

    for kind in COLLECTIONS:
        remove_route(app, f"/api/{kind}", "GET")
        app.add_api_route(f"/api/{kind}", make_list(kind), methods=["GET"])
    for path in ["/api/team", "/api/team/workers", "/api/workers"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, team, methods=["GET"])
    remove_route(app, "/api/messages", "GET")
    app.add_api_route("/api/messages", messages, methods=["GET"])
    for path in ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"]:
        remove_route(app, path, "GET")
        app.add_api_route(path, command_actions, methods=["GET"])
    INSTALLED.add(name)
