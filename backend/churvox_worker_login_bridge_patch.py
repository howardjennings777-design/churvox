from __future__ import annotations

from datetime import datetime, timezone
import asyncio
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
WORKER_COLLECTIONS = ["users", "workers", "team", "team_members", "staff", "employees"]
PASSWORD_FIELDS = ["password_hash", "hashed_password", "passwordHash", "bcrypt_hash", "pass_hash"]
PLAIN_FIELDS = ["password", "plain_password", "temp_password", "temporary_password", "invite_password"]


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def first(*values):
    for value in values:
        text = clean(value)
        if text:
            return text
    return ""


def safe(value):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "hash", "token", "secret"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    if isinstance(value, list):
        return [safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    Request = getattr(module, "Request", None)
    Response = getattr(module, "Response", None)
    Body = getattr(module, "Body", None)
    HTTPException = getattr(module, "HTTPException", None)
    ObjectId = getattr(module, "ObjectId", None)
    bcrypt = getattr(module, "bcrypt", None)
    create_access_token = getattr(module, "create_access_token", None)
    create_refresh_token = getattr(module, "create_refresh_token", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    hash_password = getattr(module, "hash_password", None)

    required = [app, db, Request, Response, Body, HTTPException, ObjectId, bcrypt, create_access_token, create_refresh_token, set_auth_cookies, clear_auth_cookies, hash_password]
    if any(item is None for item in required):
        return

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def collections():
        last_error = None
        for attempt in range(3):
            try:
                names = await asyncio.wait_for(db.list_collection_names(), timeout=6)
                return set(names), None
            except Exception as exc:
                last_error = exc
                if attempt < 2:
                    await asyncio.sleep(0.35 * (attempt + 1))
        return set(WORKER_COLLECTIONS), last_error

    async def find_worker_by_email(email):
        checks = [
            {"email": email},
            {"user_email": email},
            {"worker_email": email},
            {"staff_email": email},
            {"contact_email": email},
        ]
        last_error = None
        for attempt in range(3):
            names, collection_error = await collections()
            last_error = collection_error or last_error
            for collection_name in WORKER_COLLECTIONS:
                if collection_name not in names:
                    continue
                for query in checks:
                    try:
                        doc = await asyncio.wait_for(db[collection_name].find_one(query), timeout=6)
                    except Exception as exc:
                        last_error = exc
                        doc = None
                    if doc:
                        return collection_name, doc, None
            if attempt < 2:
                await asyncio.sleep(0.35 * (attempt + 1))
        return None, None, last_error

    def check_password(password, doc):
        for field in PASSWORD_FIELDS:
            stored = doc.get(field)
            if not isinstance(stored, str) or not stored.strip():
                continue
            try:
                if bcrypt.checkpw(str(password or "").encode("utf-8"), stored.encode("utf-8")):
                    return True, field, stored
            except Exception:
                continue
        for field in PLAIN_FIELDS:
            stored = doc.get(field)
            if isinstance(stored, str) and stored and stored == password:
                return True, field, None
        return False, None, None

    def business_id_from(doc):
        return first(doc.get("business_id"), doc.get("owner_business_id"), doc.get("owner_id"), doc.get("contractor_id"), doc.get("employer_id"), doc.get("company_id"), doc.get("parent_user_id"), doc.get("created_by"))

    async def sync_worker_user(collection_name, worker_doc, email, password, matched_field, stored_hash):
        existing = await db.users.find_one({"email": email})
        business_id = business_id_from(worker_doc)
        if not business_id and existing:
            business_id = first(existing.get("business_id"), existing.get("owner_business_id"), existing.get("id"), existing.get("_id"))
        password_hash = stored_hash
        if not password_hash:
            password_hash = hash_password(password)
        update = {
            "email": email,
            "password_hash": password_hash,
            "name": first(worker_doc.get("name"), worker_doc.get("full_name"), worker_doc.get("worker_name"), worker_doc.get("staff_name"), email.split("@")[0]),
            "business_name": first(worker_doc.get("business_name"), worker_doc.get("company"), "Worker account"),
            "role": "worker",
            "user_role": "worker",
            "worker_role": "worker",
            "is_worker": True,
            "worker": True,
            "worker_login": True,
            "worker_id": first(worker_doc.get("worker_id"), worker_doc.get("id"), worker_doc.get("_id")),
            "team_member_id": first(worker_doc.get("team_member_id"), worker_doc.get("staff_id"), worker_doc.get("id"), worker_doc.get("_id")),
            "status": "active",
            "email_verified": True,
            "has_app_access": True,
            "billing_lock_reason": None,
            "source_worker_collection": collection_name,
            "last_login_at": now_utc(),
            "updated_at": now_utc(),
        }
        if business_id:
            update["business_id"] = str(business_id)
        if existing:
            await db.users.update_one({"_id": existing["_id"]}, {"$set": update})
            existing.update(update)
            return existing
        update["created_at"] = now_utc()
        result = await db.users.insert_one(update)
        update["_id"] = result.inserted_id
        return update

    def response_for(user, token=None):
        user_id = str(user.get("_id") or user.get("id") or "")
        payload = {
            "id": user_id,
            "email": lower(user.get("email")),
            "name": first(user.get("name"), user.get("full_name"), "Worker"),
            "business_name": user.get("business_name"),
            "business_id": str(user.get("business_id") or user_id),
            "role": "worker",
            "user_role": "worker",
            "worker_role": "worker",
            "is_worker": True,
            "worker": True,
            "worker_login": True,
            "worker_id": first(user.get("worker_id"), user_id),
            "team_member_id": first(user.get("team_member_id"), user.get("staff_id"), user_id),
            "plan": user.get("plan") or "worker",
            "subscription_status": "worker",
            "has_app_access": True,
            "billing_lock_reason": None,
            "email_verified": True,
        }
        if token:
            payload["token"] = token
        return {"success": True, **safe(payload), "user": safe(payload)}

    async def worker_login(payload: dict = Body(default={}), response: Response = None, request: Request = None):
        email = lower(payload.get("email"))
        password = clean(payload.get("password"))
        if not email or not password:
            if response:
                response.status_code = 400
            return {"success": False, "detail": "Enter worker email and password."}
        if response:
            clear_auth_cookies(response)
        collection_name, worker_doc, lookup_error = await find_worker_by_email(email)
        if not worker_doc:
            if lookup_error is not None:
                if response:
                    response.status_code = 503
                return {"success": False, "detail": "Worker login service is temporarily unavailable. Please try again."}
            if response:
                response.status_code = 401
            return {"success": False, "detail": "Worker account not found."}
        ok, matched_field, stored_hash = check_password(password, worker_doc)
        if not ok:
            if response:
                response.status_code = 401
            return {"success": False, "detail": "Invalid worker email or password."}
        user = await sync_worker_user(collection_name, worker_doc, email, password, matched_field, stored_hash)
        token = create_access_token(str(user["_id"]), email)
        refresh = create_refresh_token(str(user["_id"]))
        if response:
            set_auth_cookies(response, token, refresh)
        try:
            await db.worker_login_events.insert_one({"created_at": now_utc(), "email": email, "collection": collection_name, "user_id": str(user.get("_id")), "business_id": str(user.get("business_id") or "")})
        except Exception:
            pass
        return response_for(user, token)

    # Nested functions plus postponed annotations otherwise become query parameters in FastAPI.
    worker_login.__annotations__ = {
        "payload": dict,
        "response": Response,
        "request": Request,
    }

    for path in ["/api/worker/auth/login", "/api/auth/worker-login"]:
        remove_route(app, path, "POST")
        app.add_api_route(path, worker_login, methods=["POST"])

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None
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


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
