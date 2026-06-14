# CHURVOX_HQ_REAL_CUSTOMER_DATA_ONLY_20260614

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict, Iterable
import hashlib

OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings77@outlook.com",
}

INTERNAL_MARKERS = [
    "test",
    "demo",
    "sample",
    "fake",
    "mock",
    "preview",
    "seed",
    "example.com",
    "mailinator",
    "tempmail",
    "john@churvox",
    "johnworker",
]

PLAN_VALUE = {
    "start": 39,
    "solo": 39,
    "crew": 89,
    "team": 89,
    "operator": 149,
    "pro": 149,
    "command": 299,
    "enterprise": 299,
}

PLAN_LABELS = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
    "start": "Start",
    "crew": "Crew",
    "operator": "Operator",
    "command": "Command",
}


def build_platform_owner_router(db, get_current_user, is_platform_owner, ObjectId):
    router = APIRouter(tags=["platform-owner"])

    def safe_value(value: Any):
        if isinstance(value, datetime):
            return value.isoformat()
        try:
            if isinstance(value, ObjectId):
                return str(value)
        except Exception:
            pass
        if isinstance(value, list):
            return [safe_value(v) for v in value]
        if isinstance(value, dict):
            return {
                k: safe_value(v)
                for k, v in value.items()
                if k not in {"password_hash", "password", "reset_token", "invite_token", "verification_token"}
            }
        return value

    def safe_doc(doc: Dict[str, Any] | None):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        for key in ["password_hash", "password", "reset_token", "invite_token", "verification_token"]:
            out.pop(key, None)
        return safe_value(out)

    async def optional_user(request: Request):
        try:
            return await get_current_user(request)
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if not is_platform_owner(user):
            raise HTTPException(status_code=403, detail="Platform owner access required")
        return user

    def doc_text(doc: Dict[str, Any] | None) -> str:
        if not doc:
            return ""
        fields = [
            doc.get("email"),
            doc.get("user_email"),
            doc.get("name"),
            doc.get("full_name"),
            doc.get("business_name"),
            doc.get("company"),
            doc.get("title"),
            doc.get("customer_name"),
            doc.get("client_name"),
            doc.get("phone"),
            doc.get("address"),
            doc.get("path"),
            doc.get("title"),
            doc.get("referrer"),
            doc.get("source"),
        ]
        return " ".join(str(x or "") for x in fields).lower()

    def email_of(doc: Dict[str, Any] | None) -> str:
        if not doc:
            return ""
        return str(doc.get("email") or doc.get("user_email") or "").strip().lower()

    def has_internal_marker(doc: Dict[str, Any] | None) -> bool:
        text = doc_text(doc)
        return any(marker in text for marker in INTERNAL_MARKERS)

    def is_owner_record(doc: Dict[str, Any] | None) -> bool:
        return email_of(doc) in OWNER_EMAILS

    def doc_refs(doc: Dict[str, Any] | None) -> set[str]:
        if not doc:
            return set()
        refs = set()
        for key in ["id", "_id", "business_id", "owner_id", "user_id", "client_business_id"]:
            value = doc.get(key)
            if value:
                refs.add(str(value))
        return refs

    def is_real_user(doc: Dict[str, Any] | None) -> bool:
        if not doc:
            return False
        if is_owner_record(doc):
            return False
        if has_internal_marker(doc):
            return False
        return True

    def is_real_doc(doc: Dict[str, Any] | None, blocked_refs: set[str] | None = None) -> bool:
        if not doc:
            return False
        if is_owner_record(doc):
            return False
        if has_internal_marker(doc):
            return False
        if blocked_refs and doc_refs(doc).intersection(blocked_refs):
            return False
        return True

    def plan_key(user: Dict[str, Any]) -> str:
        return str(user.get("plan") or user.get("subscription_plan") or user.get("plan_type") or "").strip().lower()

    def plan_label(user: Dict[str, Any]) -> str:
        key = plan_key(user) or "unknown"
        return PLAN_LABELS.get(key, key.title())

    def is_paid_user(user: Dict[str, Any]) -> bool:
        plan = plan_key(user)
        status = str(user.get("subscription_status") or user.get("billing_status") or user.get("stripe_status") or "").lower()
        if status in {"active", "paid"}:
            return True
        if user.get("stripe_customer_id") or user.get("stripe_subscription_id"):
            return True
        return plan in PLAN_VALUE and plan not in {"", "free", "trial", "none"}

    def is_trial_user(user: Dict[str, Any]) -> bool:
        status = str(user.get("subscription_status") or user.get("billing_status") or "").lower()
        if bool(user.get("trial_active")) or status == "trialing":
            return True
        raw_end = user.get("trial_end") or user.get("trial_ends_at") or user.get("trial_end_date")
        try:
            if raw_end:
                d = datetime.fromisoformat(str(raw_end).replace("Z", "+00:00"))
                return d >= datetime.now(timezone.utc)
        except Exception:
            pass
        return False

    def parse_dt(value):
        if not value:
            return None
        try:
            if isinstance(value, datetime):
                return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except Exception:
            return None

    async def list_docs(collection_name: str, query: Dict[str, Any] | None = None, limit: int = 100, sort_field: str = "created_at"):
        try:
            cursor = db[collection_name].find(query or {})
            try:
                cursor = cursor.sort(sort_field, -1)
            except Exception:
                cursor = cursor.sort("_id", -1)
            docs = await cursor.limit(limit).to_list(length=limit)
            return [safe_doc(d) for d in docs]
        except Exception:
            return []

    async def collection_names():
        try:
            return set(await db.list_collection_names() or [])
        except Exception:
            return set()

    def make_visit_key(ip: str, user_agent: str) -> str:
        raw = f"{ip}|{user_agent}".encode("utf-8", errors="ignore")
        return hashlib.sha256(raw).hexdigest()[:24]

    @router.post("/platform/visit")
    async def track_visit(request: Request, payload: Dict[str, Any] = Body(default={})):
        now = datetime.now(timezone.utc)
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
        user_agent = request.headers.get("user-agent", "")
        referrer = request.headers.get("referer") or payload.get("referrer") or ""
        path = str(payload.get("path") or "")[:500]
        title = str(payload.get("title") or "")[:200]
        source = str(payload.get("source") or "")[:200]

        user = await optional_user(request)
        user_id = user.get("id") if user else None
        business_id = user.get("business_id") if user else None

        doc = {
            "created_at": now,
            "last_seen": now,
            "path": path,
            "title": title,
            "referrer": referrer[:500],
            "source": source,
            "ip": ip,
            "visitor_key": make_visit_key(ip, user_agent),
            "user_agent": user_agent[:500],
            "kind": "pageview",
            "user_id": user_id,
            "user_email": user.get("email") if user else None,
            "user_name": user.get("name") if user else None,
            "business_id": business_id,
            "business_name": user.get("business_name") if user else None,
        }

        try:
            await db.platform_visits.insert_one(doc)
        except Exception:
            pass

        if user_id:
            try:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$set": {"last_active": now, "last_seen_path": path}},
                )
            except Exception:
                try:
                    await db.users.update_one(
                        {"id": str(user_id)},
                        {"$set": {"last_active": now, "last_seen_path": path}},
                    )
                except Exception:
                    pass

        return {"ok": True}

    @router.get("/admin/owner-overview")
    async def owner_overview(request: Request):
        await require_owner(request)

        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        active_cutoff = now - timedelta(minutes=15)
        seven_days = now - timedelta(days=7)
        thirty_days = now - timedelta(days=30)

        collections = await collection_names()

        raw_users = await list_docs("users", {}, 1500) if "users" in collections else []
        internal_users = [u for u in raw_users if not is_real_user(u)]
        blocked_refs = set()
        for user in internal_users:
            blocked_refs.update(doc_refs(user))
            business_id = user.get("business_id")
            if business_id:
                blocked_refs.add(str(business_id))

        users = [u for u in raw_users if is_real_user(u)]
        invoices = [d for d in (await list_docs("invoices", {}, 1000) if "invoices" in collections else []) if is_real_doc(d, blocked_refs)]
        jobs = [d for d in (await list_docs("jobs", {}, 1000) if "jobs" in collections else []) if is_real_doc(d, blocked_refs)]
        clients = [d for d in (await list_docs("clients", {}, 1000) if "clients" in collections else []) if is_real_doc(d, blocked_refs)]
        quotes = [d for d in (await list_docs("quotes", {}, 1000) if "quotes" in collections else []) if is_real_doc(d, blocked_refs)]
        visits = [d for d in (await list_docs("platform_visits", {}, 1500) if "platform_visits" in collections else []) if is_real_doc(d, blocked_refs)]

        paid_users = [u for u in users if is_paid_user(u)]
        trial_users = [u for u in users if is_trial_user(u)]
        business_users = [
            u for u in users
            if u.get("business_name")
            or str(u.get("role", "")).lower() in {"owner", "employer", "admin", "platform_owner"}
        ]

        active_today_users = []
        active_30d_users = []
        for u in users:
            d = parse_dt(u.get("last_active") or u.get("last_login") or u.get("updated_at") or u.get("created_at"))
            if not d:
                continue
            if d >= today:
                active_today_users.append(u)
            if d >= thirty_days:
                active_30d_users.append(u)

        active_now_visitors = []
        visitors_today = []
        visitors_7d = []
        unique_today = set()
        unique_7d = set()
        for v in visits:
            d = parse_dt(v.get("created_at") or v.get("last_seen"))
            if not d:
                continue
            key = v.get("visitor_key") or v.get("ip") or v.get("user_email") or str(v.get("id"))
            if d >= active_cutoff:
                active_now_visitors.append(v)
            if d >= today:
                visitors_today.append(v)
                unique_today.add(key)
            if d >= seven_days:
                visitors_7d.append(v)
                unique_7d.add(key)

        plan_counts = {}
        for u in users:
            label = plan_label(u)
            plan_counts[label] = plan_counts.get(label, 0) + 1

        monthly_revenue = sum(PLAN_VALUE.get(plan_key(u), 0) for u in paid_users)

        total_invoice_value = 0
        outstanding_invoice_value = 0
        paid_invoice_value = 0
        for inv in invoices:
            try:
                amount = float(inv.get("total") or inv.get("amount_total") or inv.get("subtotal") or 0)
            except Exception:
                amount = 0
            total_invoice_value += amount
            status = str(inv.get("status") or "").lower()
            if status == "paid":
                paid_invoice_value += amount
            elif status in {"sent", "overdue", "draft"}:
                outstanding_invoice_value += amount

        events = []
        for u in users[:50]:
            events.append({
                "kind": "user",
                "label": "User/signup",
                "title": u.get("name") or u.get("email") or "User",
                "meta": u.get("business_name") or plan_label(u) or "",
                "at": u.get("created_at") or u.get("updated_at") or u.get("last_active") or "",
            })
        for v in visits[:80]:
            events.append({
                "kind": "visit",
                "label": "Visitor/pageview",
                "title": v.get("path") or "Page visit",
                "meta": v.get("user_email") or v.get("referrer") or v.get("ip") or "",
                "at": v.get("created_at") or "",
            })
        for inv in invoices[:40]:
            events.append({
                "kind": "invoice",
                "label": "Invoice",
                "title": inv.get("invoice_number") or inv.get("customer_name") or "Invoice",
                "meta": f"{inv.get('status', '')} · {inv.get('total', inv.get('subtotal', ''))}",
                "at": inv.get("created_at") or inv.get("updated_at") or "",
            })

        return {
            "ok": True,
            "generated_at": now.isoformat(),
            "real_data_only": True,
            "collections_seen": sorted(list(collections)),
            "metrics": {
                "total_users": len(users),
                "total_businesses": len(business_users),
                "paid_users": len(paid_users),
                "trial_users": len(trial_users),
                "active_today": len(active_today_users),
                "active_30d": len(active_30d_users),
                "active_now": len(active_now_visitors),
                "visitors_today": len(visitors_today),
                "unique_visitors_today": len(unique_today),
                "visitors_7d": len(visitors_7d),
                "unique_visitors_7d": len(unique_7d),
                "total_invoices": len(invoices),
                "total_jobs": len(jobs),
                "total_clients": len(clients),
                "total_quotes": len(quotes),
                "monthly_revenue_estimate": monthly_revenue,
                "invoice_value_total": total_invoice_value,
                "invoice_value_paid": paid_invoice_value,
                "invoice_value_outstanding": outstanding_invoice_value,
                "plan_counts": plan_counts,
            },
            "lists": {
                "users": users[:300],
                "businesses": business_users[:300],
                "paid_users": paid_users[:300],
                "trial_users": trial_users[:300],
                "active_today": active_today_users[:300],
                "active_30d": active_30d_users[:300],
                "active_now": active_now_visitors[:300],
                "visitors": visits[:300],
                "invoices": invoices[:200],
                "jobs": jobs[:200],
                "clients": clients[:200],
                "quotes": quotes[:200],
                "test_preview": [],
                "events": sorted(events, key=lambda e: str(e.get("at") or ""), reverse=True)[:100],
            },
        }

    @router.post("/admin/owner/cleanup-tests")
    async def cleanup_tests(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        return {"ok": True, "dry_run": True, "collections": [], "real_data_only": True}

    return router
