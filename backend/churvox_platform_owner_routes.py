from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Body
from typing import Any, Dict
import hashlib
import os
import stripe

PLATFORM_OWNER_EMAIL = "hello@churvox.com"
OWNER_FILTER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings77@outlook.com"}
INTERNAL_MARKERS = ["test", "demo", "sample", "fake", "mock", "preview", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker"]
PLAN_VALUE = {"start": 39, "solo": 39, "crew": 89, "team": 89, "operator": 149, "pro": 149, "command": 299, "enterprise": 299}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command", "start": "Start", "crew": "Crew", "operator": "Operator", "command": "Command", "none": "Choose plan", "": "Choose plan"}
PLAN_ENV_BY_KEY = {"solo": "START", "team": "CREW", "pro": "OPERATOR", "enterprise": "COMMAND"}
SUPPORTED_BILLING_COUNTRIES = {"NZ", "AU", "US", "UK"}


def build_platform_owner_router(db, get_current_user, is_platform_owner, ObjectId):
    router = APIRouter(tags=["platform-owner"])

    def parse_dt(value):
        if not value:
            return None
        try:
            d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    def object_id_or_none(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def normalize_country(country: str | None) -> str:
        code = (country or "NZ").strip().upper()
        aliases = {"NZL": "NZ", "NEW ZEALAND": "NZ", "AUS": "AU", "AUSTRALIA": "AU", "USA": "US", "UNITED STATES": "US", "GB": "UK", "GBR": "UK", "UNITED KINGDOM": "UK"}
        code = aliases.get(code, code)
        return code if code in SUPPORTED_BILLING_COUNTRIES else "NZ"

    def stripe_price_id(plan: str, country: str | None = "NZ") -> str:
        plan_key = (plan or "").lower().strip()
        country_code = normalize_country(country)
        env_plan = PLAN_ENV_BY_KEY.get(plan_key)
        candidates = []
        if env_plan:
            candidates.append(f"STRIPE_PRICE_{env_plan}_{country_code}")
        candidates.extend([f"STRIPE_PRICE_{plan_key.upper()}_{country_code}", f"STRIPE_PRICE_{env_plan}" if env_plan else "", f"STRIPE_PRICE_{plan_key.upper()}"])
        legacy = {"solo": "STRIPE_PRICE_SOLO", "team": "STRIPE_PRICE_TEAM", "pro": "STRIPE_PRICE_PRO", "enterprise": "STRIPE_PRICE_ENTERPRISE"}
        if plan_key in legacy:
            candidates.append(legacy[plan_key])
        for env_name in candidates:
            if env_name and os.environ.get(env_name, "").strip():
                return os.environ[env_name].strip()
        raise HTTPException(status_code=400, detail=f"Missing Stripe price ID for {plan_key} in {country_code}")

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
            return {k: safe_value(v) for k, v in value.items() if "secret" not in k.lower() and "hash" not in k.lower() and "token" not in k.lower() and "password" not in k.lower()}
        return value

    def safe_doc(doc: Dict[str, Any] | None):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        return safe_value(out)

    def email_of(doc: Dict[str, Any] | None) -> str:
        return str((doc or {}).get("email") or (doc or {}).get("user_email") or "").strip().lower()

    def text_of(doc: Dict[str, Any] | None) -> str:
        if not doc:
            return ""
        fields = [doc.get("email"), doc.get("user_email"), doc.get("name"), doc.get("business_name"), doc.get("company"), doc.get("title"), doc.get("customer_name"), doc.get("client_name"), doc.get("phone"), doc.get("address"), doc.get("path"), doc.get("referrer"), doc.get("source")]
        return " ".join(str(x or "") for x in fields).lower()

    def is_internal_record(doc: Dict[str, Any] | None) -> bool:
        text = text_of(doc)
        return email_of(doc) in OWNER_FILTER_EMAILS or any(marker in text for marker in INTERNAL_MARKERS)

    def mark_user(doc: Dict[str, Any]) -> Dict[str, Any]:
        item = safe_doc(doc) or {}
        item["hq_record_type"] = "internal" if is_internal_record(doc) else "customer"
        item["hq_can_remove"] = email_of(doc) not in OWNER_FILTER_EMAILS
        item["billing_health"] = user_access_status(item)
        return item

    async def optional_user(request: Request):
        try:
            return await get_current_user(request)
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        email = str(user.get("email") or "").strip().lower()
        if email != PLATFORM_OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    def doc_refs(doc: Dict[str, Any] | None) -> set[str]:
        refs = set()
        for key in ["id", "_id", "business_id", "owner_id", "user_id", "client_business_id", "contractor_id", "worker_id", "assigned_worker_id"]:
            value = (doc or {}).get(key)
            if value:
                refs.add(str(value))
        return refs

    def plan_key(user: Dict[str, Any]) -> str:
        return str(user.get("plan") or user.get("subscription_plan") or user.get("plan_type") or "").strip().lower()

    def trial_expired(user: Dict[str, Any]) -> bool:
        d = parse_dt(user.get("trial_end") or user.get("trial_ends_at") or user.get("trial_end_date"))
        return bool(d and d < datetime.now(timezone.utc))

    def checkout_verified(user: Dict[str, Any]) -> bool:
        return bool(user.get("checkout_verified_by_stripe") or user.get("stripe_subscription_id") or user.get("stripe_customer_id"))

    def user_access_status(user: Dict[str, Any]) -> Dict[str, Any]:
        status = str(user.get("subscription_status") or "").lower()
        plan = plan_key(user)
        if email_of(user) == PLATFORM_OWNER_EMAIL:
            return {"plan": plan or "command", "subscription_status": status or "active", "has_app_access": True, "billing_lock_reason": None}
        if not checkout_verified(user):
            return {"plan": "none", "subscription_status": "plan_required", "has_app_access": False, "billing_lock_reason": "choose_plan_in_stripe"}
        if status in {"active", "paid"}:
            return {"plan": plan, "subscription_status": status, "has_app_access": True, "billing_lock_reason": None}
        if status == "trialing" and not trial_expired(user):
            return {"plan": plan, "subscription_status": status, "has_app_access": True, "billing_lock_reason": None}
        return {"plan": plan or "none", "subscription_status": status or "payment_required", "has_app_access": False, "billing_lock_reason": "payment_required"}

    def is_paid_user(user: Dict[str, Any]) -> bool:
        return str(user.get("subscription_status") or "").lower() in {"active", "paid"}

    def is_trial_user(user: Dict[str, Any]) -> bool:
        d = parse_dt(user.get("trial_end") or user.get("trial_ends_at") or user.get("trial_end_date"))
        return str(user.get("subscription_status") or "").lower() == "trialing" and bool(d and d >= datetime.now(timezone.utc))

    async def collection_names():
        try:
            return set(await db.list_collection_names() or [])
        except Exception:
            return set()

    async def list_raw(collection_name: str, limit: int = 1500):
        try:
            cursor = db[collection_name].find({})
            try:
                cursor = cursor.sort("created_at", -1)
            except Exception:
                cursor = cursor.sort("_id", -1)
            return await cursor.limit(limit).to_list(length=limit)
        except Exception:
            return []

    async def list_safe(collection_name: str, limit: int = 1500):
        return [safe_doc(x) for x in await list_raw(collection_name, limit)]

    def make_visit_key(ip: str, user_agent: str) -> str:
        return hashlib.sha256(f"{ip}|{user_agent}".encode("utf-8", errors="ignore")).hexdigest()[:24]

    async def set_plan_after_stripe(user: Dict[str, Any], plan: str, country: str, session_id: str, stripe_customer_id: str | None, stripe_subscription_id: str | None):
        now = datetime.now(timezone.utc)
        subscription_status = "trialing"
        trial_end_dt = now + timedelta(days=14)
        if stripe_subscription_id and os.environ.get("STRIPE_SECRET_KEY"):
            try:
                sub = stripe.Subscription.retrieve(stripe_subscription_id)
                subscription_status = str(sub.get("status") or "trialing")
                if sub.get("trial_end"):
                    trial_end_dt = datetime.fromtimestamp(int(sub.get("trial_end")), tz=timezone.utc)
            except Exception:
                pass
        update = {"plan": plan, "subscription_status": subscription_status, "trial_started_at": now, "trial_ends_at": trial_end_dt, "billing_country": country, "stripe_customer_id": stripe_customer_id, "stripe_subscription_id": stripe_subscription_id, "last_checkout_session_id": session_id, "last_checkout_confirmed_at": now, "checkout_verified_by_stripe": True}
        business_id = object_id_or_none(user.get("business_id") or user.get("id"))
        user_id = object_id_or_none(user.get("id"))
        if business_id:
            await db.users.update_one({"_id": business_id}, {"$set": update})
            await db.users.update_many({"business_id": business_id, "role": "worker"}, {"$set": {"plan": plan}})
        if user_id and user_id != business_id:
            await db.users.update_one({"_id": user_id}, {"$set": update})
        return update

    @router.get("/auth/me")
    async def hq_safe_auth_me(request: Request):
        user = await get_current_user(request)
        access = user_access_status(user)
        return {"id": user.get("id"), "email": user.get("email"), "name": user.get("name"), "business_name": user.get("business_name"), "role": user.get("role", "employer"), "plan": access["plan"], "subscription_status": access["subscription_status"], "trial_ends_at": safe_value(user.get("trial_ends_at")), "stripe_customer_id": user.get("stripe_customer_id"), "stripe_subscription_id": user.get("stripe_subscription_id"), "checkout_verified_by_stripe": checkout_verified(user), "has_app_access": access["has_app_access"], "billing_lock_reason": access["billing_lock_reason"], "email_verified": user.get("email_verified"), "gst_rate": user.get("gst_rate"), "trade_type": user.get("trade_type", "other"), "business_id": str(user.get("business_id") or user.get("id"))}

    @router.get("/billing/subscription-status")
    async def subscription_status(request: Request):
        user = await get_current_user(request)
        owner_id = object_id_or_none(user.get("business_id") or user.get("id"))
        owner = await db.users.find_one({"_id": owner_id}) if owner_id else None
        owner = owner or user
        access = user_access_status({**owner, "id": str(owner.get("_id", user.get("id")))})
        return {"plan": access["plan"], "plan_name": PLAN_LABELS.get(access["plan"], access["plan"].title() if access["plan"] else "Choose plan"), "subscription_status": access["subscription_status"], "trial_ends_at": safe_value(owner.get("trial_ends_at")), "stripe_customer_id": owner.get("stripe_customer_id"), "stripe_subscription_id": owner.get("stripe_subscription_id"), "has_app_access": access["has_app_access"], "billing_lock_reason": access["billing_lock_reason"], "billing_country": owner.get("billing_country", "NZ")}

    @router.post("/billing/create-checkout-session")
    async def trial_checkout_session(payload: Dict[str, Any], request: Request):
        user = await get_current_user(request)
        if user.get("role") not in ("employer", "admin"):
            raise HTTPException(status_code=403, detail="Only business owners can choose a plan")
        secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not secret:
            raise HTTPException(status_code=500, detail="Stripe secret key not configured")
        stripe.api_key = secret
        aliases = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
        plan = aliases.get(str(payload.get("plan") or "").lower().strip())
        if plan not in PLAN_VALUE:
            raise HTTPException(status_code=400, detail="Choose a valid plan")
        country = normalize_country(payload.get("country"))
        frontend_url = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
        session = stripe.checkout.Session.create(mode="subscription", line_items=[{"price": stripe_price_id(plan, country), "quantity": 1}], subscription_data={"trial_period_days": 14, "metadata": {"user_id": user["id"], "business_id": str(user.get("business_id") or user["id"]), "plan": plan, "country": country}}, payment_method_collection="if_required", success_url=f"{frontend_url}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}", cancel_url=f"{frontend_url}/billing/cancel?plan={plan}&country={country}", customer_email=user["email"], metadata={"user_id": user["id"], "business_id": str(user.get("business_id") or user["id"]), "plan": plan, "country": country, "trial_days": "14"})
        return {"url": session.url, "trial_days": 14, "plan": plan, "country": country}

    @router.post("/billing/confirm-checkout")
    async def confirm_trial_checkout(payload: Dict[str, Any], request: Request):
        user = await get_current_user(request)
        session_id = str(payload.get("session_id") or "").strip()
        if not session_id.startswith("cs_"):
            raise HTTPException(status_code=400, detail="Missing Stripe checkout session")
        secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not secret:
            raise HTTPException(status_code=500, detail="Stripe secret key not configured")
        stripe.api_key = secret
        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Could not verify Stripe checkout session: {str(exc)}")
        metadata = session.get("metadata", {}) or {}
        if metadata.get("user_id") and metadata.get("user_id") != str(user.get("id")):
            raise HTTPException(status_code=403, detail="Checkout session does not belong to this user")
        plan = str(metadata.get("plan") or payload.get("plan") or "").lower().strip()
        if plan not in PLAN_VALUE:
            raise HTTPException(status_code=400, detail="Invalid checkout plan")
        if str(session.get("status") or "").lower() not in ("", "complete"):
            raise HTTPException(status_code=400, detail="Stripe checkout session is not complete")
        country = normalize_country(metadata.get("country") or payload.get("country"))
        update = await set_plan_after_stripe(user, plan, country, session_id, session.get("customer"), session.get("subscription"))
        return {"success": True, "message": "Plan trial started", "plan": plan, "country": country, "trial_ends_at": safe_value(update.get("trial_ends_at")), "subscription_status": update.get("subscription_status"), "stripe_customer_id": session.get("customer"), "stripe_subscription_id": session.get("subscription")}

    @router.post("/platform/visit")
    async def track_visit(request: Request, payload: Dict[str, Any] = Body(default={})):
        now = datetime.now(timezone.utc)
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "")
        user_agent = request.headers.get("user-agent", "")
        user = await optional_user(request)
        doc = {"created_at": now, "last_seen": now, "path": str(payload.get("path") or "")[:500], "title": str(payload.get("title") or "")[:200], "referrer": (request.headers.get("referer") or payload.get("referrer") or "")[:500], "source": str(payload.get("source") or "")[:200], "ip": ip, "visitor_key": make_visit_key(ip, user_agent), "user_agent": user_agent[:500], "kind": "pageview", "user_id": user.get("id") if user else None, "user_email": user.get("email") if user else None, "user_name": user.get("name") if user else None, "business_id": user.get("business_id") if user else None, "business_name": user.get("business_name") if user else None}
        try:
            await db.platform_visits.insert_one(doc)
            if user:
                await db.users.update_one({"_id": object_id_or_none(user.get("id"))}, {"$set": {"last_active": now, "last_seen_path": doc["path"]}})
        except Exception:
            pass
        return {"ok": True}

    async def remove_user_and_workspace(identifier: str, confirm: str):
        ident = str(identifier or "").strip().lower()
        if not ident:
            raise HTTPException(status_code=400, detail="Enter an email or user ID")
        if confirm != "DELETE":
            raise HTTPException(status_code=400, detail="Type DELETE to confirm")
        query = {"$or": [{"email": ident}]}
        oid = object_id_or_none(ident)
        if oid:
            query["$or"].append({"_id": oid})
        matched_users = await db.users.find(query).to_list(length=100)
        if not matched_users:
            return {"ok": True, "identifier": ident, "deleted": {}, "message": "No matching user found"}
        if any(email_of(u) in OWNER_FILTER_EMAILS for u in matched_users):
            raise HTTPException(status_code=403, detail="Owner/internal protected emails cannot be removed")
        id_values = set()
        email_values = set()
        for user in matched_users:
            if email_of(user):
                email_values.add(email_of(user))
            for key in ["_id", "business_id", "owner_id", "user_id"]:
                value = user.get(key)
                if value:
                    id_values.add(str(value))
                    maybe_oid = object_id_or_none(value)
                    if maybe_oid:
                        id_values.add(maybe_oid)
        collections = await collection_names()
        target_collections = ["users", "clients", "jobs", "quotes", "invoices", "time_logs", "payments", "platform_visits", "email_verification_tokens", "password_reset_tokens", "invite_tokens", "invite_emails", "password_reset_emails", "invoice_emails", "quote_emails", "sms_credits", "sms_credit_purchases", "xero_connections", "xero_sync_log", "myob_sync_log"]
        deleted = {}
        for collection_name in target_collections:
            if collection_name not in collections:
                continue
            clauses = [{"email": {"$in": list(email_values)}}, {"user_email": {"$in": list(email_values)}}, {"to": {"$in": list(email_values)}}]
            for field in ["_id", "business_id", "owner_id", "user_id", "client_business_id", "contractor_id", "worker_id", "assigned_worker_id"]:
                clauses.append({field: {"$in": list(id_values)}})
            try:
                result = await db[collection_name].delete_many({"$or": clauses})
                if result.deleted_count:
                    deleted[collection_name] = result.deleted_count
            except Exception:
                pass
        return {"ok": True, "identifier": ident, "deleted": deleted, "message": "User and connected Churvox data removed"}

    @router.post("/admin/owner/delete-by-email")
    async def owner_delete_by_email(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        return await remove_user_and_workspace(payload.get("email") or payload.get("identifier") or payload.get("user_id"), str(payload.get("confirm") or ""))

    @router.post("/admin/owner/delete-user")
    async def owner_delete_user(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        return await remove_user_and_workspace(payload.get("user_id") or payload.get("email") or payload.get("identifier"), str(payload.get("confirm") or ""))

    @router.get("/admin/owner-overview")
    async def owner_overview(request: Request):
        await require_owner(request)
        now = datetime.now(timezone.utc)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        active_cutoff = now - timedelta(minutes=15)
        seven_days = now - timedelta(days=7)
        thirty_days = now - timedelta(days=30)
        collections = await collection_names()
        raw_users = await list_raw("users", 3000) if "users" in collections else []
        all_users = [mark_user(u) for u in raw_users]
        customer_users = [u for u in all_users if u.get("hq_record_type") == "customer"]
        internal_users = [u for u in all_users if u.get("hq_record_type") == "internal"]
        invoices = await list_safe("invoices", 2000) if "invoices" in collections else []
        jobs = await list_safe("jobs", 2000) if "jobs" in collections else []
        clients = await list_safe("clients", 2000) if "clients" in collections else []
        quotes = await list_safe("quotes", 2000) if "quotes" in collections else []
        visits = await list_safe("platform_visits", 3000) if "platform_visits" in collections else []
        paid_users = [u for u in all_users if is_paid_user(u)]
        trial_users = [u for u in all_users if is_trial_user(u)]
        business_users = [u for u in all_users if u.get("business_name") or str(u.get("role", "")).lower() in {"owner", "employer", "admin"}]
        active_today_users, active_30d_users = [], []
        for user in all_users:
            d = parse_dt(user.get("last_active") or user.get("last_login") or user.get("updated_at") or user.get("created_at"))
            if d and d >= today:
                active_today_users.append(user)
            if d and d >= thirty_days:
                active_30d_users.append(user)
        active_now_visitors, visitors_today, visitors_7d, unique_today, unique_7d = [], [], [], set(), set()
        for visit in visits:
            d = parse_dt(visit.get("last_seen") or visit.get("created_at"))
            if not d:
                continue
            key = visit.get("visitor_key") or visit.get("ip") or visit.get("user_email") or str(visit.get("id"))
            if d >= active_cutoff:
                active_now_visitors.append(visit)
            if d >= today:
                visitors_today.append(visit); unique_today.add(key)
            if d >= seven_days:
                visitors_7d.append(visit); unique_7d.add(key)
        plan_counts = {}
        for user in all_users:
            label = PLAN_LABELS.get(plan_key(user), plan_key(user).title() if plan_key(user) else "Choose plan")
            plan_counts[label] = plan_counts.get(label, 0) + 1
        total_invoice_value = outstanding_invoice_value = paid_invoice_value = 0.0
        for inv in invoices:
            try:
                amount = float(inv.get("total") or inv.get("amount_total") or inv.get("subtotal") or 0)
            except Exception:
                amount = 0.0
            total_invoice_value += amount
            status = str(inv.get("status") or "").lower()
            if status == "paid":
                paid_invoice_value += amount
            elif status in {"sent", "overdue", "draft"}:
                outstanding_invoice_value += amount
        events = []
        for user in all_users[:80]:
            events.append({"kind": "user", "label": "User", "title": user.get("name") or user.get("email") or "User", "meta": f"{user.get('hq_record_type')} · {user.get('business_name') or PLAN_LABELS.get(plan_key(user), plan_key(user))}", "at": user.get("created_at") or user.get("updated_at") or user.get("last_active") or ""})
        for visit in visits[:80]:
            events.append({"kind": "visit", "label": "Visitor/pageview", "title": visit.get("path") or "Page visit", "meta": visit.get("user_email") or visit.get("referrer") or visit.get("ip") or "", "at": visit.get("last_seen") or visit.get("created_at") or ""})
        return {"ok": True, "generated_at": now.isoformat(), "hq_mode": "all_users_visible", "owner_locked_to": PLATFORM_OWNER_EMAIL, "collections_seen": sorted(list(collections)), "metrics": {"total_users": len(all_users), "customer_users": len(customer_users), "internal_users": len(internal_users), "total_businesses": len(business_users), "paid_users": len(paid_users), "trial_users": len(trial_users), "active_today": len(active_today_users), "active_30d": len(active_30d_users), "active_now": len(active_now_visitors), "visitors_today": len(visitors_today), "unique_visitors_today": len(unique_today), "visitors_7d": len(visitors_7d), "unique_visitors_7d": len(unique_7d), "total_invoices": len(invoices), "total_jobs": len(jobs), "total_clients": len(clients), "total_quotes": len(quotes), "monthly_revenue_estimate": sum(PLAN_VALUE.get(plan_key(u), 0) for u in paid_users), "invoice_value_total": total_invoice_value, "invoice_value_paid": paid_invoice_value, "invoice_value_outstanding": outstanding_invoice_value, "plan_counts": plan_counts}, "lists": {"users": all_users[:1000], "all_users": all_users[:1000], "customer_users": customer_users[:1000], "internal_users": internal_users[:1000], "businesses": business_users[:1000], "paid_users": paid_users[:1000], "trial_users": trial_users[:1000], "active_today": active_today_users[:1000], "active_30d": active_30d_users[:1000], "active_now": active_now_visitors[:1000], "visitors": visits[:1000], "invoices": invoices[:500], "jobs": jobs[:500], "clients": clients[:500], "quotes": quotes[:500], "events": sorted(events, key=lambda e: str(e.get("at") or ""), reverse=True)[:150]}}

    @router.post("/admin/owner/cleanup-tests")
    async def cleanup_tests(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        return {"ok": True, "dry_run": True, "collections": [], "hq_mode": "all_users_visible"}

    return router
