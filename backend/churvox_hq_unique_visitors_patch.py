from __future__ import annotations

from datetime import datetime, timezone, timedelta
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any, Dict

from fastapi import Body, HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server"}
INSTALLED = set()
PLATFORM_OWNER_EMAIL = "hello@churvox.com"
INTERNAL_MARKERS = ["test", "demo", "sample", "fake", "mock", "preview", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker"]


def _now():
    return datetime.now(timezone.utc)


def _text(value):
    return str(value or "").strip()


def _email(doc: Dict[str, Any] | None) -> str:
    return _text((doc or {}).get("email") or (doc or {}).get("user_email")).lower()


def _safe_value(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_safe_value(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            lk = str(k).lower()
            if any(word in lk for word in ["secret", "token", "password", "hash"]):
                continue
            out["id" if k == "_id" else k] = _safe_value(v)
        return out
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    return value


def _parse_dt(value):
    if not value:
        return None
    try:
        d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _fingerprint(raw: str) -> str:
    return hashlib.sha256(_text(raw).encode("utf-8", errors="ignore")).hexdigest()[:32]


def _visitor_key(visitor_id: str, ip: str, user_agent: str) -> str:
    raw = _text(visitor_id)
    if raw:
        return _fingerprint(f"browser:{raw}")
    return _fingerprint(f"fallback:{ip}|{user_agent}")


def _internal(doc: Dict[str, Any] | None) -> bool:
    hay = " ".join(str((doc or {}).get(k) or "") for k in ["email", "user_email", "business_name", "path", "referrer", "source", "user_agent"]).lower()
    return _email(doc) == PLATFORM_OWNER_EMAIL or any(marker in hay for marker in INTERNAL_MARKERS)


def _client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "") or ""


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
        if _email(user) != PLATFORM_OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def ensure_indexes():
        try:
            await db.platform_unique_visitors.create_index("visitor_key", unique=True)
            await db.platform_unique_visitors.create_index("first_seen")
            await db.platform_unique_visitors.create_index("last_seen")
            await db.platform_visits.create_index("visitor_key")
        except Exception:
            pass

    async def track_visit(request: Request, payload: Dict[str, Any] = Body(default={})):
        await ensure_indexes()
        now = _now()
        ip = _client_ip(request)
        user_agent = request.headers.get("user-agent", "")[:500]
        visitor_id = _text(payload.get("visitor_id") or payload.get("visitorId"))[:160]
        visitor_key = _visitor_key(visitor_id, ip, user_agent)
        user = await optional_user(request)
        path = _text(payload.get("path"))[:500]
        title = _text(payload.get("title") or "Churvox")[:200]
        referrer = _text(request.headers.get("referer") or payload.get("referrer"))[:500]
        source = _text(payload.get("source"))[:200]
        pageview = {
            "created_at": now,
            "last_seen": now,
            "path": path,
            "title": title,
            "referrer": referrer,
            "source": source,
            "ip": ip,
            "visitor_key": visitor_key,
            "visitor_id_present": bool(visitor_id),
            "user_agent": user_agent,
            "kind": "pageview",
            "user_id": (user or {}).get("id") or (user or {}).get("_id"),
            "user_email": (user or {}).get("email"),
            "user_name": (user or {}).get("name"),
            "business_id": (user or {}).get("business_id"),
            "business_name": (user or {}).get("business_name"),
        }
        unique_doc = {
            "visitor_key": visitor_key,
            "last_seen": now,
            "last_path": path,
            "last_title": title,
            "last_referrer": referrer,
            "last_source": source,
            "last_ip": ip,
            "user_agent": user_agent,
            "user_id": pageview.get("user_id"),
            "user_email": pageview.get("user_email"),
            "user_name": pageview.get("user_name"),
            "business_id": pageview.get("business_id"),
            "business_name": pageview.get("business_name"),
            "internal": _internal(pageview),
            "updated_at": now,
        }
        try:
            await db.platform_visits.insert_one(pageview)
            await db.platform_unique_visitors.update_one(
                {"visitor_key": visitor_key},
                {
                    "$setOnInsert": {"visitor_key": visitor_key, "first_seen": now, "first_path": path, "first_referrer": referrer, "first_source": source, "first_ip": ip, "created_at": now},
                    "$set": unique_doc,
                    "$inc": {"pageview_count": 1, "visit_count": 1},
                },
                upsert=True,
            )
            if user:
                try:
                    await db.users.update_one({"email": str(user.get("email") or "").lower()}, {"$set": {"last_active": now, "last_seen_path": path}})
                except Exception:
                    pass
        except Exception:
            pass
        return {"ok": True, "unique": True, "visitor_key": visitor_key}

    async def unique_visitors(request: Request):
        await require_owner(request)
        await ensure_indexes()
        now = _now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        seven_days = now - timedelta(days=7)
        thirty_days = now - timedelta(days=30)
        rows = []
        try:
            rows = await db.platform_unique_visitors.find({}).sort("last_seen", -1).limit(2000).to_list(length=2000)
        except Exception:
            rows = []
        if not rows:
            visits = []
            try:
                visits = await db.platform_visits.find({}).sort("last_seen", -1).limit(4000).to_list(length=4000)
            except Exception:
                visits = []
            seen = {}
            for visit in visits:
                key = visit.get("visitor_key") or _visitor_key("", visit.get("ip", ""), visit.get("user_agent", ""))
                current = seen.get(key) or {"visitor_key": key, "first_seen": visit.get("created_at"), "last_seen": visit.get("last_seen") or visit.get("created_at"), "first_path": visit.get("path"), "last_path": visit.get("path"), "user_email": visit.get("user_email"), "business_name": visit.get("business_name"), "pageview_count": 0}
                current["pageview_count"] = int(current.get("pageview_count") or 0) + 1
                d = _parse_dt(visit.get("last_seen") or visit.get("created_at"))
                cd = _parse_dt(current.get("last_seen"))
                if d and (not cd or d >= cd):
                    current.update({"last_seen": visit.get("last_seen") or visit.get("created_at"), "last_path": visit.get("path"), "last_referrer": visit.get("referrer"), "last_source": visit.get("source"), "user_email": visit.get("user_email"), "business_name": visit.get("business_name")})
                seen[key] = current
            rows = list(seen.values())
        public_rows = [r for r in rows if not _internal(r)]
        def at(row, field):
            return _parse_dt(row.get(field))
        unique_today = [r for r in public_rows if (at(r, "first_seen") or at(r, "created_at") or at(r, "last_seen")) and (at(r, "first_seen") or at(r, "created_at") or at(r, "last_seen")) >= today]
        active_7d = [r for r in public_rows if (at(r, "last_seen") or at(r, "created_at")) and (at(r, "last_seen") or at(r, "created_at")) >= seven_days]
        active_30d = [r for r in public_rows if (at(r, "last_seen") or at(r, "created_at")) and (at(r, "last_seen") or at(r, "created_at")) >= thirty_days]
        return {
            "success": True,
            "source": "churvox_unique_visitors_once",
            "generated_at": now.isoformat(),
            "counts": {
                "unique_total": len(public_rows),
                "new_unique_today": len(unique_today),
                "unique_active_7d": len(active_7d),
                "unique_active_30d": len(active_30d),
                "pageviews_total": sum(int(r.get("pageview_count") or 0) for r in public_rows),
            },
            "visitors": [_safe_value(r) for r in public_rows[:500]],
        }

    for path, endpoint, method in [
        ("/api/platform/visit", track_visit, "POST"),
        ("/api/admin/owner/unique-visitors", unique_visitors, "GET"),
    ]:
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])
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
