from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any, Dict

from fastapi import HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server"}
INSTALLED = set()
PLATFORM_OWNER_EMAIL = "hello@churvox.com"


def now_utc():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def low(value):
    return text(value).lower()


def email_of(doc: Dict[str, Any] | None) -> str:
    return low((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("tester_email") or (doc or {}).get("to"))


def parse_dt(value):
    if not value:
        return None
    try:
        d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


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
        out = {}
        for k, v in value.items():
            lk = str(k).lower()
            if any(word in lk for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if k == "_id" else k] = safe(v)
        return out
    return value


def is_internal(doc: Dict[str, Any] | None) -> bool:
    email = email_of(doc)
    hay = " ".join(str((doc or {}).get(k) or "") for k in ["email", "user_email", "business_name", "name", "company"]).lower()
    return email == PLATFORM_OWNER_EMAIL or "example.com" in hay or "sample" in hay or "fake" in hay or "demo" in hay


def is_tester_user(doc: Dict[str, Any] | None) -> bool:
    if not doc or is_internal(doc):
        return False
    status = low(doc.get("subscription_status"))
    return bool(
        doc.get("free_tester_access") is True
        or doc.get("is_tester") is True
        or doc.get("tester_access") is True
        or doc.get("tester_invited") is True
        or status == "tester_free"
        or text(doc.get("free_tester_until"))
        or text(doc.get("free_tester_granted_at"))
    )


def tester_status(user: Dict[str, Any] | None, invite: Dict[str, Any] | None = None) -> str:
    if user:
        active_at = parse_dt(user.get("last_active") or user.get("last_login") or user.get("last_seen") or user.get("updated_at"))
        if active_at:
            return "active"
        return "accepted"
    inv_status = low((invite or {}).get("status") or (invite or {}).get("tester_status") or (invite or {}).get("invite_status"))
    if inv_status in {"accepted", "access_granted", "active", "signed_up", "signup_complete"}:
        return "accepted"
    return "invited"


def display_tester(email: str, user: Dict[str, Any] | None = None, invite: Dict[str, Any] | None = None) -> Dict[str, Any]:
    src = user or invite or {}
    status = tester_status(user, invite)
    accepted_at = (user or {}).get("created_at") or (user or {}).get("free_tester_granted_at") or (invite or {}).get("accepted_at") or (invite or {}).get("updated_at")
    active_at = (user or {}).get("last_active") or (user or {}).get("last_login") or (user or {}).get("last_seen")
    return safe({
        "email": email,
        "name": src.get("name") or src.get("full_name") or src.get("business_name") or src.get("company") or email,
        "business_name": src.get("business_name") or src.get("company") or src.get("business") or "",
        "status": status,
        "accepted": bool(user),
        "active": status == "active",
        "plan": (user or {}).get("plan") or (invite or {}).get("plan") or "operator",
        "subscription_status": (user or {}).get("subscription_status") or (invite or {}).get("status") or "invited",
        "free_tester_until": (user or {}).get("free_tester_until") or (invite or {}).get("free_tester_until"),
        "invited_at": (invite or {}).get("created_at") or (invite or {}).get("invited_at") or (user or {}).get("free_tester_granted_at"),
        "accepted_at": accepted_at,
        "last_active": active_at,
        "source": "user" if user else "invite",
        "user_id": text((user or {}).get("_id") or (user or {}).get("id")),
        "invite_id": text((invite or {}).get("_id") or (invite or {}).get("id")),
    })


async def collection_exists(db, name: str) -> bool:
    try:
        return name in set(await db.list_collection_names())
    except Exception:
        return False


async def read_collection(db, name: str, query: Dict[str, Any], limit: int = 500):
    try:
        if not await collection_exists(db, name):
            return []
        cursor = db[name].find(query)
        try:
            cursor = cursor.sort("created_at", -1)
        except Exception:
            pass
        return await cursor.limit(limit).to_list(length=limit)
    except Exception:
        return []


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if email_of(user) != PLATFORM_OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def tester_status_endpoint(request: Request):
        await require_owner(request)
        users = await read_collection(db, "users", {"$or": [
            {"free_tester_access": True},
            {"subscription_status": "tester_free"},
            {"is_tester": True},
            {"tester_access": True},
            {"tester_invited": True},
            {"free_tester_until": {"$exists": True}},
            {"free_tester_granted_at": {"$exists": True}},
        ]}, 1000)
        users_by_email = {}
        for user in users:
            email = email_of(user)
            if email and is_tester_user(user):
                users_by_email[email] = user

        invite_rows = []
        for collection in ["tester_invites", "tester_intake", "tester_access", "tester_invite_log", "invite_tokens", "invite_emails"]:
            invite_rows.extend(await read_collection(db, collection, {"$or": [
                {"tester": True},
                {"is_tester": True},
                {"type": {"$in": ["tester", "tester_invite", "tester_access"]}},
                {"kind": {"$in": ["tester", "tester_invite", "tester_access"]}},
                {"status": {"$in": ["invited", "accepted", "access_granted", "active", "signed_up", "signup_complete", "tester_free"]}},
                {"free_tester_access": True},
            ]}, 1000))

        invites_by_email = {}
        for invite in invite_rows:
            email = email_of(invite)
            if email and not is_internal(invite):
                invites_by_email[email] = invite

        all_emails = sorted(set(users_by_email) | set(invites_by_email))
        testers = [display_tester(email, users_by_email.get(email), invites_by_email.get(email)) for email in all_emails]
        accepted = [t for t in testers if t.get("accepted")]
        active = [t for t in testers if t.get("active")]
        invited = [t for t in testers if not t.get("accepted")]

        return {
            "success": True,
            "source": "churvox_hq_tester_status",
            "generated_at": now_utc().isoformat(),
            "counts": {
                "total": len(testers),
                "accepted": len(accepted),
                "active": len(active),
                "invited_not_accepted": len(invited),
            },
            "testers": testers,
            "accepted_testers": accepted,
            "active_testers": active,
            "invited_testers": invited,
        }

    for path in ["/api/admin/owner/testers", "/api/admin/owner/tester-status"]:
        remove_route(path, "GET")
        app.add_api_route(path, tester_status_endpoint, methods=["GET"])
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
