from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List
from zoneinfo import ZoneInfo

INSTALLED = set()
OWNER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}
NZ_TZ = ZoneInfo("Pacific/Auckland")
HQ_PATHS = {
    "/api/admin/owner/connection",
    "/api/admin/owner/support-tickets",
    "/api/admin/owner/growth-report",
    "/api/admin/owner/unique-visitors",
}
INTERNAL_PATH_PREFIXES = ("/admin", "/churvox-hq", "/owner", "/platform-dashboard", "/app-owner", "/dashboard", "/worker", "/plans", "/setup", "/setup-guide", "/guide")
INTERNAL_MARKERS = ["sample", "fake", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker", "localhost", "127.0.0.1"]


def text(value: Any) -> str:
    try:
        return str(value or "").strip()
    except Exception:
        return ""


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


def role_of(doc: Dict[str, Any] | None) -> str:
    return lower((doc or {}).get("role") or (doc or {}).get("user_role") or (doc or {}).get("account_type")).replace("-", "_").replace(" ", "_")


def owner_allowed(user: Dict[str, Any] | None, checker=None) -> bool:
    user = user or {}
    allowed = email_of(user) in OWNER_EMAILS or role_of(user) in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool(user.get("is_platform_owner") or user.get("is_platform_admin") or user.get("is_super_admin") or user.get("is_admin"))
    if not allowed and checker:
        try:
            allowed = bool(checker(user))
        except Exception:
            allowed = False
    return allowed


def is_public_path(path: str) -> bool:
    p = "/" + text(path).split("?")[0].lstrip("/")
    if p == "//":
        p = "/"
    return not any(p.startswith(prefix) for prefix in INTERNAL_PATH_PREFIXES)


def internal_visit(row: Dict[str, Any] | None) -> bool:
    row = row or {}
    path = text(row.get("path") or row.get("last_path") or row.get("first_path"))
    if not is_public_path(path):
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


def status(row: Dict[str, Any] | None) -> str:
    return lower((row or {}).get("subscription_status") or (row or {}).get("billing_status") or (row or {}).get("stripe_status") or (row or {}).get("status"))


def is_tester(row: Dict[str, Any] | None) -> bool:
    row = row or {}
    return bool(row.get("is_free_tester") or row.get("free_tester_access") or row.get("app_owner_free_pack") or "tester" in status(row))


def is_paid(row: Dict[str, Any] | None) -> bool:
    s = status(row)
    return not is_tester(row) and ("active" in s or "paid" in s)


def is_open_ticket(row: Dict[str, Any] | None) -> bool:
    s = lower((row or {}).get("status") or "open")
    return s not in {"closed", "done", "resolved", "archived", "deleted"}


async def find_rows(db, collection_name: str, query=None, limit=500, sort_field="created_at") -> List[Dict[str, Any]]:
    try:
        cursor = db[collection_name].find(query or {}).sort(sort_field, -1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception:
        return []


async def count_docs(db, collection_name: str, query=None) -> int:
    try:
        return int(await db[collection_name].count_documents(query or {}))
    except Exception:
        return 0


async def public_visitor_report(db):
    now = datetime.now(timezone.utc)
    nz_start, nz_end, utc_start, utc_end = nz_day_window(now)
    seven_days = now - timedelta(days=7)
    thirty_days = now - timedelta(days=30)

    visits_today = await find_rows(db, "platform_visits", {"created_at": {"$gte": utc_start, "$lt": utc_end}}, 20000)
    public_visits_today = [row for row in visits_today if not internal_visit(row)]
    today_keys = {text(row.get("visitor_key") or row.get("ip") or row.get("user_agent")) for row in public_visits_today if text(row.get("visitor_key") or row.get("ip") or row.get("user_agent"))}

    unique_rows = await find_rows(db, "platform_unique_visitors", {}, 5000, "last_seen")
    public_rows = [row for row in unique_rows if not internal_visit(row)]

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
        pageviews_total = await count_docs(db, "platform_visits", {"internal": {"$ne": True}, "traffic_type": "public"})

    counts = {
        "visits_today": len(public_visits_today),
        "unique_visits_today": len(today_keys),
        "new_unique_today": len(new_unique_today),
        "unique_total": len(public_rows),
        "unique_active_7d": len(active_7d),
        "unique_active_30d": len(active_30d),
        "pageviews_total": pageviews_total,
        "visits_total": pageviews_total,
    }
    return {
        "source": "hq_exact_bypass_real_public_nz_day",
        "generated_at": now.isoformat(),
        "periods": {
            "today_start": nz_start.isoformat(),
            "today_end": nz_end.isoformat(),
            "today_start_utc": utc_start.isoformat(),
            "today_end_utc": utc_end.isoformat(),
            "timezone": "Pacific/Auckland",
        },
        "counts": counts,
        "today_visits": [safe(row) for row in public_visits_today[:500]],
        "visitors": [safe(row) for row in public_rows[:500]],
        "public_rows": public_rows,
    }


def pct(numerator: int, denominator: int) -> int:
    try:
        if not denominator:
            return 0
        return int(round((float(numerator) / float(denominator)) * 100))
    except Exception:
        return 0


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    if not app or db is None or get_current_user is None or JSONResponse is None:
        return

    async def require_owner_response(request):
        try:
            user = await get_current_user(request)
        except Exception as exc:
            return None, JSONResponse({"success": False, "connected": False, "message": "HQ auth required", "detail": str(exc)[:180]}, status_code=401)
        if not owner_allowed(user, getattr(module, "is_platform_owner", None)):
            return None, JSONResponse({"success": False, "connected": False, "message": "HQ owner access required"}, status_code=403)
        return user, None

    async def connection(request, user):
        users_count = await count_docs(db, "users")
        businesses_count = await count_docs(db, "businesses")
        tickets_count = await count_docs(db, "support_tickets", {"status": {"$nin": ["closed", "resolved", "done", "archived"]}})
        return JSONResponse({
            "success": True,
            "connected": True,
            "source": "hq_exact_endpoint_bypass",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "owner_email": email_of(user),
            "counts": {"users": users_count, "businesses": businesses_count, "open_support_tickets": tickets_count},
            "checks": {"auth": "ok", "database": "ok", "hq_routes": "bypassed_legacy_422"},
        })

    async def support_tickets(request, user):
        rows = await find_rows(db, "support_tickets", {}, 300, "created_at")
        open_count = sum(1 for row in rows if is_open_ticket(row))
        return JSONResponse({"success": True, "source": "hq_exact_endpoint_bypass", "open_count": open_count, "tickets": [safe(row) for row in rows], "items": [safe(row) for row in rows]})

    async def unique_visitors(request, user):
        report = await public_visitor_report(db)
        body = {k: v for k, v in report.items() if k != "public_rows"}
        body["success"] = True
        return JSONResponse(body)

    async def growth_report(request, user):
        report = await public_visitor_report(db)
        users = await find_rows(db, "users", {}, 1500, "created_at")
        businesses = await find_rows(db, "businesses", {}, 800, "created_at")
        testers = [row for row in users if is_tester(row)]
        paid = [row for row in users if is_paid(row)]
        pending = [row for row in testers if "pending" in status(row) or "invited" in status(row)]
        accepted = [row for row in testers if row not in pending]
        active_testers_30d = [row for row in testers if parse_dt(row.get("last_active") or row.get("last_seen") or row.get("updated_at") or row.get("created_at")) and parse_dt(row.get("last_active") or row.get("last_seen") or row.get("updated_at") or row.get("created_at")) >= datetime.now(timezone.utc) - timedelta(days=30)]
        counts = dict(report["counts"])
        counts.update({
            "accepted_testers": len(accepted),
            "pending_testers": len(pending),
            "active_testers_30d": len(active_testers_30d),
            "tester_invites_total": len(testers),
            "signups_total": len(users),
            "paid_users": len(paid),
            "businesses_total": len(businesses),
        })
        conversion = {
            "visitor_to_signup_percent": pct(len(users), counts.get("unique_total", 0)),
            "visitor_to_accepted_tester_percent": pct(len(accepted), counts.get("unique_total", 0)),
            "tester_acceptance_percent": pct(len(accepted), len(testers)),
            "accepted_to_paid_percent": pct(len(paid), len(accepted)),
        }
        return JSONResponse({
            "success": True,
            "source": "hq_exact_endpoint_bypass_growth",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "periods": report["periods"],
            "counts": counts,
            "conversion": conversion,
            "visitors": report["visitors"],
            "today_visits": report["today_visits"],
            "tester_pipeline": {"accepted": [safe(row) for row in accepted[:300]], "pending": [safe(row) for row in pending[:300]]},
        })

    handlers = {
        "/api/admin/owner/connection": connection,
        "/api/admin/owner/support-tickets": support_tickets,
        "/api/admin/owner/growth-report": growth_report,
        "/api/admin/owner/unique-visitors": unique_visitors,
    }

    @app.middleware("http")
    async def hq_exact_endpoint_bypass(request, call_next):
        path = request.url.path
        if request.method.upper() == "GET" and path in HQ_PATHS:
            user, error = await require_owner_response(request)
            if error:
                return error
            try:
                return await handlers[path](request, user)
            except Exception as exc:
                return JSONResponse({"success": False, "connected": False, "source": "hq_exact_endpoint_bypass", "message": "HQ endpoint failed", "detail": str(exc)[:220]}, status_code=500)
        return await call_next(request)

    INSTALLED.add(name)
