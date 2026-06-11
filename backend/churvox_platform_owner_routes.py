# CHURVOX_PLATFORM_OWNER_COCKPIT_20260611

from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict, List
import re

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
            return {k: safe_value(v) for k, v in value.items() if k not in {"password_hash", "password"}}
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
        return safe_value(out)

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

    async def count_docs(collection_name: str, query: Dict[str, Any] | None = None) -> int:
        try:
            return await db[collection_name].count_documents(query or {})
        except Exception:
            return 0

    def plan_key(user: Dict[str, Any]) -> str:
        return str(user.get("plan") or user.get("subscription_plan") or "").strip().lower()

    def is_paid_user(user: Dict[str, Any]) -> bool:
        plan = plan_key(user)
        status = str(user.get("subscription_status") or user.get("billing_status") or "").lower()
        if user.get("stripe_customer_id") or user.get("stripe_subscription_id"):
            return True
        if status in {"active", "paid", "trialing"}:
            return True
        return plan in PLAN_VALUE and plan not in {"", "free", "trial"}

    def is_trial_user(user: Dict[str, Any]) -> bool:
        status = str(user.get("subscription_status") or user.get("billing_status") or "").lower()
        return bool(user.get("trial_active")) or status == "trialing"

    def active_since_query(field: str, since: datetime):
        return {field: {"$gte": since}}

    @router.post("/platform/visit")
    async def track_visit(request: Request, payload: Dict[str, Any] = Body(default={})):
        now = datetime.now(timezone.utc)
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
        user_agent = request.headers.get("user-agent", "")
        referrer = request.headers.get("referer") or payload.get("referrer") or ""

        path = str(payload.get("path") or "")[:500]
        title = str(payload.get("title") or "")[:200]
        source = str(payload.get("source") or "")[:200]

        doc = {
            "created_at": now,
            "path": path,
            "title": title,
            "referrer": referrer[:500],
            "source": source,
            "ip": ip,
            "user_agent": user_agent[:500],
            "kind": "pageview",
        }

        try:
            await db.platform_visits.insert_one(doc)
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

        users = await list_docs("users", {}, 500)
        invoices = await list_docs("invoices", {}, 250)
        jobs = await list_docs("jobs", {}, 250)
        clients = await list_docs("clients", {}, 250)
        quotes = await list_docs("quotes", {}, 250)
        visits = await list_docs("platform_visits", {}, 300)

        paid_users = [u for u in users if is_paid_user(u)]
        trial_users = [u for u in users if is_trial_user(u)]
        business_users = [u for u in users if u.get("business_name") or str(u.get("role", "")).lower() in {"owner", "employer", "admin"}]

        active_today_users = []
        for u in users:
            raw = u.get("last_active") or u.get("last_login") or u.get("updated_at") or u.get("created_at")
            try:
                d = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                if d >= today:
                    active_today_users.append(u)
            except Exception:
                pass

        active_now_visitors = []
        visitors_today = []
        visitors_7d = []
        for v in visits:
            raw = v.get("created_at")
            try:
                d = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                if d >= active_cutoff:
                    active_now_visitors.append(v)
                if d >= today:
                    visitors_today.append(v)
                if d >= seven_days:
                    visitors_7d.append(v)
            except Exception:
                pass

        plan_counts = {}
        for u in users:
            key = plan_key(u) or "unknown"
            label = PLAN_LABELS.get(key, key.title())
            plan_counts[label] = plan_counts.get(label, 0) + 1

        monthly_revenue = sum(PLAN_VALUE.get(plan_key(u), 0) for u in paid_users)

        test_preview = []
        for collection in ["users", "clients", "jobs", "quotes", "invoices", "businesses", "workers", "team_members"]:
            docs = await list_docs(collection, {}, 500)
            matches = [d for d in docs if is_test_doc(d)]
            if matches:
                test_preview.append({
                    "collection": collection,
                    "count": len(matches),
                    "examples": matches[:8],
                })

        events = []
        for u in users[:20]:
            events.append({
                "kind": "user",
                "label": "User signup/account",
                "title": u.get("name") or u.get("email") or "User",
                "meta": u.get("business_name") or u.get("plan") or "",
                "at": u.get("created_at") or u.get("updated_at") or "",
            })
        for v in visits[:20]:
            events.append({
                "kind": "visit",
                "label": "Visitor",
                "title": v.get("path") or "Page visit",
                "meta": v.get("referrer") or v.get("ip") or "",
                "at": v.get("created_at") or "",
            })

        return {
            "ok": True,
            "generated_at": now.isoformat(),
            "metrics": {
                "total_users": len(users),
                "total_businesses": len(business_users),
                "paid_users": len(paid_users),
                "trial_users": len(trial_users),
                "active_today": len(active_today_users),
                "active_now": len(active_now_visitors),
                "visitors_today": len(visitors_today),
                "visitors_7d": len(visitors_7d),
                "total_invoices": len(invoices),
                "total_jobs": len(jobs),
                "total_clients": len(clients),
                "total_quotes": len(quotes),
                "monthly_revenue_estimate": monthly_revenue,
                "plan_counts": plan_counts,
            },
            "lists": {
                "users": users[:200],
                "businesses": business_users[:200],
                "paid_users": paid_users[:200],
                "trial_users": trial_users[:200],
                "active_today": active_today_users[:200],
                "active_now": active_now_visitors[:200],
                "visitors": visits[:200],
                "invoices": invoices[:150],
                "jobs": jobs[:150],
                "clients": clients[:150],
                "quotes": quotes[:150],
                "test_preview": test_preview,
                "events": sorted(events, key=lambda e: str(e.get("at") or ""), reverse=True)[:40],
            },
        }

    def id_query(value: str):
        queries = [{"id": value}]
        try:
            if ObjectId.is_valid(value):
                queries.insert(0, {"_id": ObjectId(value)})
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

        ids = [business_id]
        try:
            if ObjectId.is_valid(business_id):
                ids.append(ObjectId(business_id))
        except Exception:
            pass

        protected = await db.users.find_one({"$or": [{"_id": ids[-1]} if len(ids) > 1 else {}, {"business_id": {"$in": ids}}, {"id": business_id}]})
        if protected and (protected.get("email") or "").lower() in PROTECTED_EMAILS:
            raise HTTPException(status_code=400, detail="Protected owner workspace cannot be deleted")

        collections = ["users", "clients", "jobs", "quotes", "invoices", "workers", "team_members", "sms_logs", "command_slips"]
        deleted = {}
        for name in collections:
            try:
                q = {"$or": [{"business_id": {"$in": ids}}, {"owner_id": {"$in": ids}}, {"user_id": {"$in": ids}}, {"id": business_id}]}
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
                    ids.append(ObjectId(raw_id) if ObjectId.is_valid(str(raw_id)) else raw_id)
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
