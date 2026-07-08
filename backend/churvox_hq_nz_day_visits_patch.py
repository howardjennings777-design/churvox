from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from zoneinfo import ZoneInfo

INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}
NZ_TZ = ZoneInfo("Pacific/Auckland")
INTERNAL_MARKERS = ["sample", "fake", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker", "localhost", "127.0.0.1"]
INTERNAL_PATH_PREFIXES = ("/admin", "/churvox-hq", "/owner", "/platform-dashboard", "/app-owner", "/dashboard", "/worker", "/plans", "/setup", "/setup-guide", "/guide")


def text(value: Any) -> str:
    return str(value or "").strip()


def lower(value: Any) -> str:
    return text(value).lower()


def parse_dt(value: Any):
    if not value:
        return None
    try:
        d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def safe(value: Any):
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


def email_of(doc: Dict[str, Any] | None) -> str:
    return lower((doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email"))


def public_path(path: str) -> bool:
    p = "/" + text(path).split("?")[0].lstrip("/")
    if p == "//":
        p = "/"
    return not any(p.startswith(prefix) for prefix in INTERNAL_PATH_PREFIXES)


def internal(row: Dict[str, Any] | None) -> bool:
    row = row or {}
    path = text(row.get("path") or row.get("last_path") or row.get("first_path"))
    if not public_path(path):
        return True
    if email_of(row) in OWNER_EMAILS:
        return True
    hay = " ".join(str(row.get(k) or "") for k in ["email", "user_email", "business_name", "referrer", "last_referrer", "source", "last_source", "user_agent"]).lower()
    return any(marker in hay for marker in INTERNAL_MARKERS)


def nz_day_window(now_utc: datetime):
    nz_now = now_utc.astimezone(NZ_TZ)
    nz_start = nz_now.replace(hour=0, minute=0, second=0, microsecond=0)
    nz_end = nz_start + timedelta(days=1)
    return nz_start, nz_end, nz_start.astimezone(timezone.utc), nz_end.astimezone(timezone.utc)


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or get_current_user is None or HTTPException is None:
        return

    async def require_owner(request):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type")).replace("-", "_").replace(" ", "_")
        allowed = email_of(user) in OWNER_EMAILS or role in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool((user or {}).get("is_platform_owner") or (user or {}).get("is_platform_admin") or (user or {}).get("is_super_admin") or (user or {}).get("is_admin"))
        checker = getattr(module, "is_platform_owner", None)
        if not allowed and checker:
            try:
                allowed = bool(checker(user))
            except Exception:
                allowed = False
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox HQ visits are locked to the platform owner")
        return user

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def unique_visitors_nz_day(request):
        await require_owner(request)
        now = datetime.now(timezone.utc)
        nz_start, nz_end, utc_start, utc_end = nz_day_window(now)
        seven_days = now - timedelta(days=7)
        thirty_days = now - timedelta(days=30)

        try:
            visits = await db.platform_visits.find({"created_at": {"$gte": utc_start, "$lt": utc_end}}).sort("created_at", -1).limit(20000).to_list(length=20000)
        except Exception:
            visits = []
        public_visits_today = [row for row in visits if not internal(row)]
        today_visitor_keys = {text(row.get("visitor_key") or row.get("ip") or row.get("user_agent")) for row in public_visits_today if text(row.get("visitor_key") or row.get("ip") or row.get("user_agent"))}

        try:
            rows = await db.platform_unique_visitors.find({}).sort("last_seen", -1).limit(5000).to_list(length=5000)
        except Exception:
            rows = []
        public_rows = [row for row in rows if not internal(row)]

        def at(row, field):
            return parse_dt((row or {}).get(field))

        new_unique_today = []
        for row in public_rows:
            first = at(row, "first_seen") or at(row, "created_at") or at(row, "last_seen")
            if first and utc_start <= first < utc_end:
                new_unique_today.append(row)
        active_7d = [row for row in public_rows if (at(row, "last_seen") or at(row, "created_at")) and (at(row, "last_seen") or at(row, "created_at")) >= seven_days]
        active_30d = [row for row in public_rows if (at(row, "last_seen") or at(row, "created_at")) and (at(row, "last_seen") or at(row, "created_at")) >= thirty_days]
        pageviews_total = sum(int(row.get("pageview_count") or row.get("visit_count") or 0) for row in public_rows)
        if not pageviews_total:
            try:
                pageviews_total = await db.platform_visits.count_documents({"internal": {"$ne": True}, "traffic_type": "public"})
            except Exception:
                pageviews_total = 0

        return {
            "success": True,
            "source": "platform_unique_visitors_real_public_nz_day",
            "generated_at": now.isoformat(),
            "periods": {
                "today_start": nz_start.isoformat(),
                "today_end": nz_end.isoformat(),
                "today_start_utc": utc_start.isoformat(),
                "today_end_utc": utc_end.isoformat(),
                "timezone": "Pacific/Auckland",
            },
            "counts": {
                "visits_today": len(public_visits_today),
                "unique_visits_today": len(today_visitor_keys),
                "new_unique_today": len(new_unique_today),
                "unique_total": len(public_rows),
                "unique_active_7d": len(active_7d),
                "unique_active_30d": len(active_30d),
                "pageviews_total": pageviews_total,
            },
            "today_visits": [safe(row) for row in public_visits_today[:500]],
            "visitors": [safe(row) for row in public_rows[:500]],
        }

    remove_route("/api/admin/owner/unique-visitors", "GET")
    app.add_api_route("/api/admin/owner/unique-visitors", unique_visitors_nz_day, methods=["GET"])
    INSTALLED.add(name)
