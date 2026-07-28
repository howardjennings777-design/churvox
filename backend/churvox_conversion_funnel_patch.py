from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import os
import sys
from typing import Any, Dict, List

from fastapi import Body, HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}
ALLOWED_EVENTS = {
    "homepage_viewed",
    "pricing_viewed",
    "signup_started",
    "email_verified",
    "first_client_created",
    "first_job_created",
    "first_invoice_created",
}
INTERNAL_MARKERS = ("sample", "fake", "seed", "example.com", "mailinator", "tempmail", "localhost", "127.0.0.1")


def now_utc():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        if isinstance(value, dict):
            value = value.get("$oid") or value.get("id") or value.get("_id") or value.get("email")
        return str(value or "").strip()
    except Exception:
        return ""


def lower(value: Any) -> str:
    return text(value).lower()


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
        return [safe(item) for item in value]
    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ("password", "token", "secret", "hash")):
                continue
            result["id" if key == "_id" else key] = safe(item)
        return result
    return value


def configured_owner_emails():
    raw = os.environ.get("PLATFORM_OWNER_EMAILS") or os.environ.get("CHURVOX_PLATFORM_OWNER_EMAILS") or ""
    return OWNER_EMAILS | {lower(item) for item in raw.replace(";", ",").split(",") if lower(item)}


def email_of(row: Dict[str, Any] | None) -> str:
    row = row or {}
    return lower(row.get("email") or row.get("user_email") or row.get("owner_email") or row.get("login_email"))


def nested(row: Dict[str, Any], dotted: str):
    value: Any = row
    for part in dotted.split("."):
        if not isinstance(value, dict) or part not in value:
            return ""
        value = value.get(part)
    return value


def actor_key(row: Dict[str, Any] | None) -> str:
    row = row or {}
    for field in (
        "business_id",
        "businessId",
        "company_id",
        "tenant_id",
        "owner_business_id",
        "contractor_id",
        "business.id",
        "owner_id",
        "user_id",
        "created_by",
    ):
        value = text(nested(row, field))
        if value:
            return f"business:{value}"
    email = email_of(row) or lower(row.get("created_by_email") or row.get("business_owner_email"))
    return f"email:{email}" if email else ""


def internal_row(row: Dict[str, Any] | None) -> bool:
    row = row or {}
    if email_of(row) in configured_owner_emails():
        return True
    haystack = " ".join(text(row.get(key)) for key in ("email", "user_email", "owner_email", "business_name", "name", "source", "user_agent")).lower()
    return any(marker in haystack for marker in INTERNAL_MARKERS)


def visitor_fingerprint(visitor_id: str, ip: str, user_agent: str) -> str:
    raw = f"browser:{visitor_id}" if visitor_id else f"fallback:{ip}|{user_agent}"
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()[:32]


def path_event(path: str) -> str:
    clean_path = "/" + text(path).split("?")[0].strip("/")
    if clean_path == "/":
        return "homepage_viewed"
    if clean_path == "/pricing":
        return "pricing_viewed"
    if clean_path in {"/signup", "/register"}:
        return "signup_started"
    return ""


def verified_user(user: Dict[str, Any]) -> bool:
    return bool(
        user.get("email_verified") is True
        or user.get("is_email_verified") is True
        or user.get("verified") is True
        or user.get("email_verified_at")
        or user.get("verified_at")
    )


def stage_rate(current: int, previous: int):
    if previous <= 0 or current < 0 or current > previous:
        return None
    return round((current / previous) * 100, 1)


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    async def optional_user(request: Request):
        try:
            return await get_current_user(request)
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type")).replace("-", "_").replace(" ", "_")
        allowed = email_of(user) in configured_owner_emails() or role in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool((user or {}).get("is_platform_owner") or (user or {}).get("is_platform_admin") or (user or {}).get("is_super_admin") or (user or {}).get("is_admin"))
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox conversion funnel is locked to the platform owner")
        return user

    def remove_route(route_path: str, method: str):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == route_path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def ensure_indexes():
        try:
            await db.platform_funnel_events.create_index("dedupe_key", unique=True)
            await db.platform_funnel_events.create_index("event")
            await db.platform_funnel_events.create_index("last_seen")
            await db.platform_funnel_events.create_index("business_id")
            await db.platform_funnel_events.create_index("user_email")
        except Exception:
            pass

    async def funnel_event(request: Request, payload: Dict[str, Any] = Body(default={})):
        await ensure_indexes()
        event = lower(payload.get("event") or path_event(payload.get("path")))
        if event not in ALLOWED_EVENTS:
            raise HTTPException(status_code=400, detail="Unsupported Churvox funnel event")

        user = await optional_user(request)
        if user and internal_row(user):
            return {"ok": True, "recorded": False, "reason": "internal_owner"}

        now = now_utc()
        visitor_id = text(payload.get("visitor_id") or payload.get("visitorId"))[:160]
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "") or ""
        user_agent = request.headers.get("user-agent", "")[:500]
        visitor_key = visitor_fingerprint(visitor_id, ip, user_agent)
        user_email = email_of(user)
        business_id = text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("company_id") or (user or {}).get("tenant_id"))
        identity = business_id or user_email or visitor_key
        dedupe_key = hashlib.sha256(f"{event}|{identity}".encode("utf-8", errors="ignore")).hexdigest()
        document = {
            "dedupe_key": dedupe_key,
            "event": event,
            "visitor_key": visitor_key,
            "visitor_id_present": bool(visitor_id),
            "path": text(payload.get("path"))[:500],
            "source": text(payload.get("source"))[:200],
            "referrer": text(request.headers.get("referer") or payload.get("referrer"))[:500],
            "user_id": text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id")),
            "user_email": user_email,
            "business_id": business_id,
            "business_name": text((user or {}).get("business_name") or (user or {}).get("company_name"))[:250],
            "user_agent": user_agent,
            "last_seen": now,
            "updated_at": now,
        }
        await db.platform_funnel_events.update_one(
            {"dedupe_key": dedupe_key},
            {
                "$setOnInsert": {"first_seen": now, "created_at": now},
                "$set": document,
                "$inc": {"event_count": 1},
            },
            upsert=True,
        )
        return {"ok": True, "recorded": True, "event": event}

    async def list_rows(collection: str, limit: int):
        try:
            return await db[collection].find({}).sort("created_at", -1).limit(limit).to_list(length=limit)
        except Exception:
            return []

    async def conversion_funnel(request: Request):
        await require_owner(request)
        await ensure_indexes()
        events = await list_rows("platform_funnel_events", 20000)
        visits = await list_rows("platform_visits", 30000)
        users = [row for row in await list_rows("users", 10000) if not internal_row(row)]
        clients = [row for row in await list_rows("clients", 30000) if not internal_row(row)]
        jobs = [row for row in await list_rows("jobs", 30000) if not internal_row(row)]
        invoices = [row for row in await list_rows("invoices", 30000) if not internal_row(row)]

        event_actors: Dict[str, set] = {event: set() for event in ALLOWED_EVENTS}
        for row in events:
            event = lower(row.get("event"))
            identity = text(row.get("business_id") or row.get("user_email") or row.get("visitor_key") or row.get("dedupe_key"))
            if event in event_actors and identity and not internal_row(row):
                event_actors[event].add(identity)
        for row in visits:
            event = path_event(row.get("path"))
            identity = text(row.get("visitor_key") or row.get("user_email") or row.get("business_id"))
            if event and identity and not internal_row(row):
                event_actors[event].add(identity)

        verified_actors = {actor_key(user) or f"email:{email_of(user)}" for user in users if verified_user(user) and (actor_key(user) or email_of(user))}
        client_actors = {actor_key(row) for row in clients if actor_key(row)}
        job_actors = {actor_key(row) for row in jobs if actor_key(row)}
        invoice_actors = {actor_key(row) for row in invoices if actor_key(row)}
        counts = {
            "homepage_viewed": len(event_actors["homepage_viewed"]),
            "pricing_viewed": len(event_actors["pricing_viewed"]),
            "signup_started": len(event_actors["signup_started"]),
            "email_verified": len(verified_actors),
            "first_client_created": len(client_actors),
            "first_job_created": len(job_actors),
            "first_invoice_created": len(invoice_actors),
        }
        order = [
            ("homepage_viewed", "Homepage viewed"),
            ("pricing_viewed", "Pricing viewed"),
            ("signup_started", "Signup started"),
            ("email_verified", "Email verified"),
            ("first_client_created", "First client"),
            ("first_job_created", "First job"),
            ("first_invoice_created", "First invoice"),
        ]
        stages: List[Dict[str, Any]] = []
        previous = 0
        for key, label in order:
            count = int(counts.get(key) or 0)
            stages.append({
                "key": key,
                "label": label,
                "count": count,
                "from_previous_percent": stage_rate(count, previous),
                "source": "visitor_event" if key in {"homepage_viewed", "pricing_viewed", "signup_started"} else "live_business_records",
            })
            previous = count

        recent_events = sorted(
            [safe(row) for row in events if not internal_row(row)],
            key=lambda row: str(row.get("last_seen") or row.get("created_at") or ""),
            reverse=True,
        )[:200]
        return {
            "success": True,
            "source": "churvox_real_conversion_funnel",
            "generated_at": now_utc().isoformat(),
            "counts": counts,
            "stages": stages,
            "measurement_note": "Public stages use distinct first-party visitor records. Verified, client, job and invoice stages use distinct live account or business records. A percentage is omitted when older business records predate visitor-event tracking or make stages non-comparable.",
            "recent_events": recent_events,
        }

    for route_path, endpoint, method in (
        ("/api/platform/funnel-event", funnel_event, "POST"),
        ("/api/admin/owner/conversion-funnel", conversion_funnel, "GET"),
    ):
        remove_route(route_path, method)
        app.add_api_route(route_path, endpoint, methods=[method])

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
