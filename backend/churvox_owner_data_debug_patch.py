from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from fastapi import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
COLLECTIONS = ["jobs", "clients", "quotes", "invoices", "users", "worker_messages", "worker_field_slips", "approved_notifications", "notifications"]


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
            if key in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}:
                continue
            clean["id" if key == "_id" else key] = safe(item)
        return clean
    return value


def user_identity(user, ObjectId):
    uid = text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))
    bid = text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or uid)
    email = lower((user or {}).get("email"))
    values = {uid, bid}
    values = {v for v in values if v}
    final_values = list(values)
    for value in list(values):
        try:
            final_values.append(ObjectId(value))
        except Exception:
            pass
    return uid, bid, email, final_values


def owner_scope(user, ObjectId):
    uid, bid, email, values = user_identity(user, ObjectId)
    ors = [
        {"business_id": {"$in": values}},
        {"businessId": {"$in": values}},
        {"contractor_id": {"$in": values}},
        {"owner_business_id": {"$in": values}},
        {"owner_id": {"$in": values}},
        {"user_id": {"$in": values}},
        {"created_by": {"$in": values}},
        {"created_by_id": {"$in": values}},
        {"employer_id": {"$in": values}},
        {"account_id": {"$in": values}},
    ]
    if email:
        ors.extend([
            {"owner_email": email},
            {"created_by_email": email},
            {"business_email": email},
            {"email": email},
        ])
    return {"$or": ors}


async def count_collection(db, collection_name, query):
    try:
        return await getattr(db, collection_name).count_documents(query)
    except Exception:
        return 0


async def sample_keys(db, collection_name):
    try:
        row = await getattr(db, collection_name).find_one({})
        if not row:
            return []
        return sorted([key for key in row.keys() if key not in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}])[:40]
    except Exception:
        return []


async def sample_owned(db, collection_name, query):
    try:
        row = await getattr(db, collection_name).find_one(query)
        if not row:
            return None
        clean = safe(row)
        wanted = ["id", "business_id", "businessId", "contractor_id", "owner_business_id", "owner_id", "user_id", "created_by", "created_by_id", "employer_id", "owner_email", "created_by_email", "email", "title", "name", "client_name", "status"]
        return {key: clean.get(key) for key in wanted if key in clean}
    except Exception:
        return None


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

    async def owner_data(request: Request):
        user = await get_current_user(request)
        uid, bid, email, values = user_identity(user, ObjectId)
        query = owner_scope(user, ObjectId)
        counts = {}
        total_counts = {}
        keys = {}
        samples = {}
        for collection in COLLECTIONS:
            counts[collection] = await count_collection(db, collection, query)
            total_counts[collection] = await count_collection(db, collection, {})
            keys[collection] = await sample_keys(db, collection)
            samples[collection] = await sample_owned(db, collection, query)
        return {
            "success": True,
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "user": {
                "id": uid,
                "business_id": bid,
                "email": email,
                "role": text((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type")),
                "plan": text((user or {}).get("plan") or (user or {}).get("plan_key") or (user or {}).get("subscription_plan") or (user or {}).get("tier")),
            },
            "matched_counts": counts,
            "total_collection_counts": total_counts,
            "sample_keys": keys,
            "matched_samples": samples,
            "note": "matched_counts are the records Churvox can see for this logged-in user. total_collection_counts are broad collection totals, not shown in the app.",
        }

    remove_route(app, "/api/health/owner-data", "GET")
    app.add_api_route("/api/health/owner-data", owner_data, methods=["GET"])
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
