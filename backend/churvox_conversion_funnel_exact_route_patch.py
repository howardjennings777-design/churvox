from __future__ import annotations

import hashlib
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any, Dict

from fastapi.responses import JSONResponse

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
PATH = "/api/platform/funnel-event"
ALLOWED_ORIGINS = {
    "https://www.churvox.com",
    "https://churvox.com",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
}


def funnel_helpers():
    try:
        import churvox_conversion_funnel_patch as funnel
    except Exception:
        from backend import churvox_conversion_funnel_patch as funnel
    return funnel


def cors_origin(request) -> str:
    origin = request.headers.get("origin") or ""
    if origin in ALLOWED_ORIGINS:
        return origin
    if origin.endswith(".onrender.com") or origin.endswith(".vercel.app"):
        return origin
    return "https://www.churvox.com"


def add_cors(response, request):
    response.headers["Access-Control-Allow-Origin"] = cors_origin(request)
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Access-Control-Max-Age"] = "86400"
    response.headers["Vary"] = "Origin"
    return response


async def ensure_indexes(db):
    try:
        await db.platform_funnel_events.create_index("dedupe_key", unique=True)
        await db.platform_funnel_events.create_index("event")
        await db.platform_funnel_events.create_index("last_seen")
        await db.platform_funnel_events.create_index("business_id")
        await db.platform_funnel_events.create_index("user_email")
    except Exception:
        pass


async def optional_user(get_current_user, request):
    try:
        return await get_current_user(request)
    except Exception:
        return None


async def record_event(db, get_current_user, request, payload: Dict[str, Any]):
    funnel = funnel_helpers()
    await ensure_indexes(db)
    event = funnel.lower(payload.get("event") or funnel.path_event(payload.get("path")))
    if event not in funnel.ALLOWED_EVENTS:
        return JSONResponse({"ok": False, "detail": "Unsupported Churvox funnel event"}, status_code=400)

    user = await optional_user(get_current_user, request)
    if user and funnel.internal_row(user):
        return JSONResponse({"ok": True, "recorded": False, "reason": "internal_owner", "event": event})

    now = funnel.now_utc()
    visitor_id = funnel.text(payload.get("visitor_id") or payload.get("visitorId"))[:160]
    ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "") or ""
    user_agent = request.headers.get("user-agent", "")[:500]
    visitor_key = funnel.visitor_fingerprint(visitor_id, ip, user_agent)
    user_email = funnel.email_of(user)
    business_id = funnel.text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("company_id") or (user or {}).get("tenant_id"))
    identity = business_id or user_email or visitor_key
    dedupe_key = hashlib.sha256(f"{event}|{identity}".encode("utf-8", errors="ignore")).hexdigest()
    document = {
        "dedupe_key": dedupe_key,
        "event": event,
        "visitor_key": visitor_key,
        "visitor_id_present": bool(visitor_id),
        "path": funnel.text(payload.get("path"))[:500],
        "source": funnel.text(payload.get("source"))[:200],
        "referrer": funnel.text(request.headers.get("referer") or payload.get("referrer"))[:500],
        "user_id": funnel.text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id")),
        "user_email": user_email,
        "business_id": business_id,
        "business_name": funnel.text((user or {}).get("business_name") or (user or {}).get("company_name"))[:250],
        "user_agent": user_agent,
        "last_seen": now,
        "updated_at": now,
    }
    try:
        await db.platform_funnel_events.update_one(
            {"dedupe_key": dedupe_key},
            {
                "$setOnInsert": {"first_seen": now, "created_at": now},
                "$set": document,
                "$inc": {"event_count": 1},
            },
            upsert=True,
        )
    except Exception:
        return JSONResponse({"ok": False, "detail": "Funnel event could not be recorded"}, status_code=500)
    return JSONResponse({"ok": True, "recorded": True, "event": event, "source": "churvox_conversion_funnel_exact_route"})


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    @app.middleware("http")
    async def exact_conversion_funnel_event(request, call_next):
        if request.url.path != PATH:
            return await call_next(request)
        method = request.method.upper()
        if method == "OPTIONS":
            return add_cors(JSONResponse({"ok": True, "source": "churvox_conversion_funnel_exact_route"}), request)
        if method != "POST":
            return await call_next(request)
        try:
            payload = await request.json()
            if not isinstance(payload, dict):
                payload = {}
        except Exception:
            payload = {}
        response = await record_event(db, get_current_user, request, payload)
        return add_cors(response, request)

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
