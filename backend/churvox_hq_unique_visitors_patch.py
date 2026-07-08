from __future__ import annotations

from datetime import datetime, timezone, timedelta
import hashlib
import importlib
import importlib.abc
import importlib.machinery
import os
import sys
from typing import Any, Dict

from fastapi import Body, HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}
# Keep this list narrow. Public paths like /demo are real marketing traffic and must not be filtered out.
INTERNAL_MARKERS = ["sample", "fake", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker", "localhost", "127.0.0.1"]
INTERNAL_PATH_PREFIXES = ("/admin", "/churvox-hq", "/owner", "/platform-dashboard", "/app-owner", "/dashboard", "/worker", "/plans", "/setup", "/setup-guide", "/guide")


def _now():
    return datetime.now(timezone.utc)


def _text(value):
    return str(value or "").strip()


def _lower(value):
    return _text(value).lower()


def owner_emails():
    raw = os.environ.get("PLATFORM_OWNER_EMAILS") or os.environ.get("CHURVOX_PLATFORM_OWNER_EMAILS") or ""
    configured = {_lower(item) for item in raw.replace(";", ",").split(",") if _lower(item)}
    return OWNER_EMAILS | configured


def _email(doc: Dict[str, Any] | None) -> str:
    return _lower((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email"))


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


def _is_public_path(path: str) -> bool:
    p = "/" + _text(path).split("?")[0].lstrip("/")
    if p == "//":
        p = "/"
    return not any(p.startswith(prefix) for prefix in INTERNAL_PATH_PREFIXES)


def _internal(doc: Dict[str, Any] | None) -> bool:
    doc = doc or {}
    path = _text(doc.get("path") or doc.get("last_path") or doc.get("first_path"))
    if not _is_public_path(path):
        return True
    if _email(doc) in owner_emails():
        return True
    hay = " ".join(str(doc.get(k) or "") for k in ["email", "user_email", "business_name", "referrer", "last_referrer", "source", "last_source", "user_agent"]).lower()
    return any(marker in hay for marker in INTERNAL_MARKERS)


def _client_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "") or ""


def _today_start(now: datetime):
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _visit_time(row: Dict[str, Any]):
    return _parse_dt((row or {}).get("created_at") or (row or {}).get("last_seen") or (row or {}).get("updated_at"))


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
        role = _lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type")).replace("-", "_").replace(" ", "_")
        allowed = _email(user) in owner_emails() or role in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool((user or {}).get("is_platform_owner") or (user or {}).get("is_platform_admin") or (user or {}).get("is_super_admin") or (user or {}).get("is_admin"))
        checker = getattr(module, "is_platform_owner", None)
        if not allowed and checker:
            try:
                allowed = bool(checker(user))
            except Exception:
                allowed = False
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox HQ unique visitors are locked to the platform owner")
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
            await db.platform_unique_visitors.create_index("internal")
            await db.platform_unique_visitors.create_index("traffic_type")
            await db.platform_visits.create_index("visitor_key")
            await db.platform_visits.create_index("created_at")
            await db.platform_visits.create_index("traffic_type")
            await db.platform_visits.create_index("internal")
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
        public_path = _is_public_path(path)
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
            "traffic_type": "public" if public_path else "app_internal",
            "user_id": (user or {}).get("id") or (user or {}).get("_id"),
            "user_email": (user or {}).get("email"),
            "user_name": (user or {}).get("name"),
            "business_id": (user or {}).get("business_id"),
            "business_name": (user or {}).get("business_name"),
        }
        is_internal = _internal(pageview)
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
            "internal": is_internal,
            "traffic_type": "public" if not is_internal else "internal",
            "updated_at": now,
        }
        try:
            await db.platform_visits.insert_one({**pageview, "internal": is_internal})
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
        return {"ok": True, "visitor_key": visitor_key, "traffic_type": "public" if not is_internal else "internal"}

    async def unique_visitors(request: Request):
        await require_owner(request)
        await ensure_indexes()
        now = _now()
        today = _today_start(now)
        tomorrow = today + timedelta(days=1)
        seven_days = now - timedelta(days=7)
        thirty_days = now - timedelta(days=30)

        rows = []
        try:
            rows = await db.platform_unique_visitors.find({}).sort("last_seen", -1).limit(5000).to_list(length=5000)
        except Exception:
            rows = []

        visits = []
        try:
            visits = await db.platform_visits.find({"created_at": {"$gte": today, "$lt": tomorrow}}).sort("created_at", -1).limit(20000).to_list(length=20000)
        except Exception:
            visits = []
        public_visits_today = [visit for visit in visits if not _internal(visit)]
        today_visitor_keys = {visit.get("visitor_key") or _visitor_key("", visit.get("ip", ""), visit.get("user_agent", "")) for visit in public_visits_today}

        if not rows:
            all_visits = []
            try:
                all_visits = await db.platform_visits.find({}).sort("last_seen", -1).limit(12000).to_list(length=12000)
            except Exception:
                all_visits = []
            seen = {}
            for visit in all_visits:
                key = visit.get("visitor_key") or _visitor_key("", visit.get("ip", ""), visit.get("user_agent", ""))
                current = seen.get(key) or {"visitor_key": key, "first_seen": visit.get("created_at"), "last_seen": visit.get("last_seen") or visit.get("created_at"), "first_path": visit.get("path"), "last_path": visit.get("path"), "user_email": visit.get("user_email"), "business_name": visit.get("business_name"), "pageview_count": 0}
                current["pageview_count"] = int(current.get("pageview_count") or 0) + 1
                d = _parse_dt(visit.get("last_seen") or visit.get("created_at"))
                cd = _parse_dt(current.get("last_seen"))
                if d and (not cd or d >= cd):
                    current.update({"last_seen": visit.get("last_seen") or visit.get("created_at"), "last_path": visit.get("path"), "last_referrer": visit.get("referrer"), "last_source": visit.get("source"), "user_email": visit.get("user_email"), "business_name": visit.get("business_name"), "internal": _internal(visit), "traffic_type": "public" if not _internal(visit) else "internal"})
                seen[key] = current
            rows = list(seen.values())

        public_rows = [r for r in rows if not _internal(r)]
        def at(row, field):
            return _parse_dt(row.get(field))
        new_unique_today = [r for r in public_rows if (at(r, "first_seen") or at(r, "created_at") or at(r, "last_seen")) and today <= (at(r, "first_seen") or at(r, "created_at") or at(r, "last_seen")) < tomorrow]
        active_7d = [r for r in public_rows if (at(r, "last_seen") or at(r, "created_at")) and (at(r, "last_seen") or at(r, "created_at")) >= seven_days]
        active_30d = [r for r in public_rows if (at(r, "last_seen") or at(r, "created_at")) and (at(r, "last_seen") or at(r, "created_at")) >= thirty_days]
        pageviews_total = sum(int(r.get("pageview_count") or r.get("visit_count") or 0) for r in public_rows)
        if not pageviews_total:
            try:
                pageviews_total = await db.platform_visits.count_documents({"internal": {"$ne": True}, "traffic_type": "public"})
            except Exception:
                pageviews_total = 0

        return {
            "success": True,
            "source": "platform_unique_visitors_real_public",
            "generated_at": now.isoformat(),
            "periods": {"today_start": today.isoformat(), "today_end": tomorrow.isoformat(), "timezone": "UTC"},
            "counts": {
                "visits_today": len(public_visits_today),
                "unique_visits_today": len(today_visitor_keys),
                "new_unique_today": len(new_unique_today),
                "unique_total": len(public_rows),
                "unique_active_7d": len(active_7d),
                "unique_active_30d": len(active_30d),
                "pageviews_total": pageviews_total,
            },
            "today_visits": [_safe_value(v) for v in public_visits_today[:500]],
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
