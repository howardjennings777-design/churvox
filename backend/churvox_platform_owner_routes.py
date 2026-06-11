# CHURVOX_PLATFORM_OWNER_REAL_DATA_20260611

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict
import hashlib

PROTECTED_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings77@outlook.com",
}

TEST_MARKERS = [
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
                if k not in {"password_hash", "password", "reset_token", "invite_token"}
            }
        return value

    def safe_doc(doc: Dict[str, Any] | None):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        out.pop("password_hash", None)
        out.pop("password", None)
        out.pop("reset_token", None)
        out.pop("invite_token", None)
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

    def text_of(doc: Dict[str, Any] | None) -> str:
        if not doc:
            return ""
        fields = [
            doc.get("email"),
            doc.get("name"),
            doc.get("full_name"),
            doc.get("business_name"),
            doc.get("company"),
            doc.get("title"),
            doc.get("customer_name"),
            doc.get("client_name"),
            doc.get("phone"),
            doc.get("address"),
        ]
        return " ".join(str(x or "") for x in fields).lower()

    def is_test_doc(doc: Dict[str, Any] | None) -> bool:
        if not doc:
            return False
        txt = text_of(doc)
        if any(email in txt for email in PROTECTED_EMAILS):
            return False
        return any(marker in txt for marker in TEST_MARKERS)

    def plan_key(user: Dict[str, Any]) -> str:
        return str(user.get("plan") or user.get("subscription_plan") or user.get("plan_type") or "").strip().lower()

    def plan_label(user: Dict[str, Any]) -> str:
        key = plan_key(user) or "unknown"
        return PLAN_LABELS.get(key, key.title())

    def is_paid_user(user: Dict[str, Any]) -> bool:
        plan = plan_key(user)
        status = str(user.get("subscription_status") or user.get("billing_status") or user.get("stripe_status") or "").lower()
        if status in {"active", "paid", "trialing"}:
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

    async def count_docs(collection_name: str, query: Dict[str, Any] | None = None) -> int:
        try:
            return await db[collection_name].count_documents(query or {})
        except Exception:
            return 0

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

    async def real_collection_names():
        try:
            names = await db.list_collection_names()
            return set(names or [])
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

        collections = await real_collection_names()

        users = await list_docs("users", {}, 1000) if "users" in collections else []
        invoices = await list_docs("invoices", {}, 500) if "invoices" in collections else []
        jobs = await list_docs("jobs", {}, 500) if "jobs" in collections else []
        clients = await list_docs("clients", {}, 500) if "clients" in collections else []
        quotes = await list_docs("quotes", {}, 500) if "quotes" in collections else []
        visits = await list_docs("platform_visits", {}, 1000) if "platform_visits" in collections else []

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
            raw = u.get("last_active") or u.get("last_login") or u.get("updated_at") or u.get("created_at")
            try:
                d = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                if d >= today:
                    active_today_users.append(u)
                if d >= thirty_days:
                    active_30d_users.append(u)
            except Exception:
                pass

        active_now_visitors = []
        visitors_today = []
        visitors_7d = []
        unique_today = set()
        unique_7d = set()
        for v in visits:
            raw = v.get("created_at") or v.get("last_seen")
            try:
                d = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                key = v.get("visitor_key") or v.get("ip") or v.get("user_email") or str(v.get("id"))
                if d >= active_cutoff:
                    active_now_visitors.append(v)
                if d >= today:
                    visitors_today.append(v)
                    unique_today.add(key)
                if d >= seven_days:
                    visitors_7d.append(v)
                    unique_7d.add(key)
            except Exception:
                pass

        plan_counts = {}
        for u in users:
            label = plan_label(u)
            plan_counts[label] = plan_counts.get(label, 0) + 1

        monthly_revenue = sum(PLAN_VALUE.get(plan_key(u), 0) for u in paid_users)

        total_invoice_value = 0
        outstanding_invoice_value = 0
        paid_invoice_value = 0
        for inv in invoices:
            amount = float(inv.get("total") or inv.get("amount_total") or inv.get("subtotal") or 0)
            total_invoice_value += amount
            status = str(inv.get("status") or "").lower()
            if status == "paid":
                paid_invoice_value += amount
            elif status in {"sent", "overdue", "draft"}:
                outstanding_invoice_value += amount

        test_preview = []
        for collection in ["users", "clients", "jobs", "quotes", "invoices", "businesses", "workers", "team_members"]:
            if collection not in collections:
                continue
            docs = await list_docs(collection, {}, 1000)
            matches = [d for d in docs if is_test_doc(d)]
            if matches:
                test_preview.append({
                    "collection": collection,
                    "count": len(matches),
                    "examples": matches[:8],
                })

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
                "test_preview": test_preview,
                "events": sorted(events, key=lambda e: str(e.get("at") or ""), reverse=True)[:100],
            },
        }

    def id_query(value: str):
        queries = [{"id": value}]
        try:
            if ObjectId.is_valid(str(value)):
                queries.insert(0, {"_id": ObjectId(str(value))})
        except Exception:
            pass
        return {"$or": queries}

    @router.delete("/admin/owner/users/{user_id}")
    async def delete_owner_user(user_id: str, request: Request):
        await require_owner(request)

        found = await db.users.find_one(id_query(user_id))
        if found and (found.get("email") or "").lower() in PROTECTED_EMAILS:
            raise HTTPException(status_code=400, detail="Protected owner account cannot be deleted")

        result = await db.users.delete_one(id_query(user_id))
        return {"ok": True, "deleted": result.deleted_count}

    @router.delete("/admin/owner/businesses/{business_id}")
    async def delete_owner_business(business_id: str, request: Request):
        await require_owner(request)

        ids = [str(business_id)]
        object_ids = []
        try:
            if ObjectId.is_valid(str(business_id)):
                object_ids.append(ObjectId(str(business_id)))
        except Exception:
            pass

        protected = await db.users.find_one({
            "$or": [
                {"_id": {"$in": object_ids}} if object_ids else {"_id": "__none__"},
                {"business_id": {"$in": ids + object_ids}},
                {"id": str(business_id)},
            ]
        })
        if protected and (protected.get("email") or "").lower() in PROTECTED_EMAILS:
            raise HTTPException(status_code=400, detail="Protected owner workspace cannot be deleted")

        collections = ["users", "clients", "jobs", "quotes", "invoices", "workers", "team_members", "sms_logs", "command_slips", "platform_visits"]
        deleted = {}
        for name in collections:
            try:
                q = {
                    "$or": [
                        {"business_id": {"$in": ids + object_ids}},
                        {"owner_id": {"$in": ids + object_ids}},
                        {"user_id": {"$in": ids + object_ids}},
                        {"id": str(business_id)},
                    ]
                }
                res = await db[name].delete_many(q)
                deleted[name] = res.deleted_count
            except Exception:
                deleted[name] = 0

        try:
            res = await db.businesses.delete_one(id_query(business_id))
            deleted["businesses"] = deleted.get("businesses", 0) + res.deleted_count
        except Exception:
            pass

        return {"ok": True, "deleted": deleted}

    @router.post("/admin/owner/cleanup-tests")
    async def cleanup_tests(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        dry_run = bool(payload.get("dry_run", True))

        collections = ["users", "clients", "jobs", "quotes", "invoices", "businesses", "workers", "team_members"]
        result = []

        for name in collections:
            docs = await list_docs(name, {}, 1000)
            matches = [d for d in docs if is_test_doc(d)]
            ids = []
            for doc in matches:
                raw_id = doc.get("_id") or doc.get("id")
                if not raw_id:
                    continue
                try:
                    ids.append(ObjectId(str(raw_id)) if ObjectId.is_valid(str(raw_id)) else str(raw_id))
                except Exception:
                    ids.append(str(raw_id))

            deleted_count = 0
            if ids and not dry_run:
                object_ids = [x for x in ids if not isinstance(x, str)]
                string_ids = [str(x) for x in ids]
                q = {"$or": []}
                if object_ids:
                    q["$or"].append({"_id": {"$in": object_ids}})
                if string_ids:
                    q["$or"].append({"id": {"$in": string_ids}})
                if q["$or"]:
                    res = await db[name].delete_many(q)
                    deleted_count = res.deleted_count

            result.append({
                "collection": name,
                "matched": len(matches),
                "deleted": deleted_count,
                "examples": matches[:10],
            })

        return {"ok": True, "dry_run": dry_run, "collections": result}

    return router
