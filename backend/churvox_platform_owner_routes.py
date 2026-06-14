from __future__ import annotations

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, HTTPException, Body
from fastapi.responses import HTMLResponse
from typing import Any, Dict
from urllib.parse import quote
import hashlib
import json
import os
import stripe

PLATFORM_OWNER_EMAIL = "hello@churvox.com"
OWNER_FILTER_EMAILS = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings77@outlook.com"}
INTERNAL_MARKERS = ["test", "demo", "sample", "fake", "mock", "preview", "seed", "example.com", "mailinator", "tempmail", "john@churvox", "johnworker"]
PLAN_VALUE = {"start": 39, "solo": 39, "crew": 89, "team": 89, "operator": 149, "pro": 149, "command": 299, "enterprise": 299}
PLAN_LABELS = {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command", "start": "Start", "crew": "Crew", "operator": "Operator", "command": "Command", "none": "Choose plan", "": "Choose plan"}
PLAN_ENV_BY_KEY = {"solo": "START", "team": "CREW", "pro": "OPERATOR", "enterprise": "COMMAND"}
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
SUPPORTED_BILLING_COUNTRIES = {"NZ", "AU", "US", "UK"}
RETENTION_EMAIL_TEMPLATES = [("welcome", "Welcome"), ("verify_email", "Verify email"), ("trial_started", "Trial started"), ("need_help_setup", "Need help setting up"), ("setup_nudge", "Finish setup"), ("first_client_nudge", "Add first client"), ("first_job_nudge", "Create first job"), ("first_invoice_nudge", "Create first invoice"), ("trial_checkin", "Trial check-in"), ("trial_ending_7", "Trial ending 7 days"), ("trial_ending_3", "Trial ending 3 days"), ("trial_ending_1", "Trial ending tomorrow"), ("trial_ending", "Trial ending soon"), ("payment_required", "Payment required"), ("payment_failed", "Payment failed"), ("paid_welcome", "Paid welcome"), ("upgrade_operator", "Upgrade to Operator"), ("dormant_7", "Dormant 7 days"), ("dormant_14", "Dormant 14 days"), ("dormant_30", "Dormant 30 days"), ("winback", "Win-back"), ("tester_welcome", "Tester welcome"), ("tester_feedback", "Tester feedback")]
AUTO_RETENTION_INTERVAL_SECONDS = int(os.environ.get("RETENTION_EMAIL_INTERVAL_SECONDS", "21600"))
AUTO_RETENTION_BATCH_LIMIT = int(os.environ.get("RETENTION_EMAIL_BATCH_LIMIT", "25"))


def build_platform_owner_router(db, get_current_user, is_platform_owner, ObjectId):
    router = APIRouter(tags=["platform-owner"])
    retention_state = {"running": False, "last_run": None, "last_result": None}

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

    def plan_key(user: Dict[str, Any]) -> str:
        raw = str(user.get("plan") or user.get("subscription_plan") or user.get("plan_type") or "").strip().lower()
        return PLAN_ALIAS.get(raw, raw)

    def plan_label(user_or_plan: Any) -> str:
        key = plan_key(user_or_plan) if isinstance(user_or_plan, dict) else PLAN_ALIAS.get(str(user_or_plan or "").strip().lower(), str(user_or_plan or "").strip().lower())
        return PLAN_LABELS.get(key, key.title() if key else "Choose plan")

    def trial_expired(user: Dict[str, Any]) -> bool:
        d = parse_dt(user.get("trial_end") or user.get("trial_ends_at") or user.get("trial_end_date"))
        return bool(d and d < datetime.now(timezone.utc))

    def checkout_verified(user: Dict[str, Any]) -> bool:
        return bool(user.get("checkout_verified_by_stripe") or user.get("stripe_subscription_id") or user.get("stripe_customer_id"))

    def is_free_tester(user: Dict[str, Any]) -> bool:
        if not user.get("free_tester_access"):
            return False
        until = parse_dt(user.get("free_tester_until"))
        return not until or until >= datetime.now(timezone.utc)

    def is_paid_user(user: Dict[str, Any]) -> bool:
        return (not is_free_tester(user)) and str(user.get("subscription_status") or "").lower() in {"active", "paid"}

    def is_trial_user(user: Dict[str, Any]) -> bool:
        d = parse_dt(user.get("trial_end") or user.get("trial_ends_at") or user.get("trial_end_date"))
        return str(user.get("subscription_status") or "").lower() == "trialing" and bool(d and d >= datetime.now(timezone.utc))

    def user_access_status(user: Dict[str, Any]) -> Dict[str, Any]:
        status = str(user.get("subscription_status") or "").lower()
        plan = plan_key(user)
        if email_of(user) == PLATFORM_OWNER_EMAIL:
            return {"plan": plan or "command", "subscription_status": status or "active", "has_app_access": True, "billing_lock_reason": None}
        if is_free_tester(user):
            return {"plan": plan or "pro", "subscription_status": "tester_free", "has_app_access": True, "billing_lock_reason": None}
        if not checkout_verified(user):
            return {"plan": "none", "subscription_status": "plan_required", "has_app_access": False, "billing_lock_reason": "choose_plan_in_stripe"}
        if status in {"active", "paid"}:
            return {"plan": plan, "subscription_status": status, "has_app_access": True, "billing_lock_reason": None}
        if status == "trialing" and not trial_expired(user):
            return {"plan": plan, "subscription_status": status, "has_app_access": True, "billing_lock_reason": None}
        return {"plan": plan or "none", "subscription_status": status or "payment_required", "has_app_access": False, "billing_lock_reason": "payment_required"}

    def safe_doc(doc: Dict[str, Any] | None):
        if not doc:
            return None
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        out = safe_value(out)
        out["plan_name"] = plan_label(out)
        out["is_free_tester"] = is_free_tester(out)
        out["is_paid_plan"] = is_paid_user(out)
        out["is_trialing"] = is_trial_user(out)
        return out

    def mark_user(doc: Dict[str, Any]) -> Dict[str, Any]:
        item = safe_doc(doc) or {}
        item["hq_record_type"] = "internal" if is_internal_record(doc) else "customer"
        item["hq_can_remove"] = email_of(doc) not in OWNER_FILTER_EMAILS
        item["billing_health"] = user_access_status(item)
        return item

    def unsubscribe_secret() -> str:
        return os.environ.get("RETENTION_UNSUBSCRIBE_SECRET") or os.environ.get("JWT_SECRET") or "churvox-retention"

    def unsubscribe_token(email: str) -> str:
        return hashlib.sha256(f"{email.lower()}|{unsubscribe_secret()}".encode("utf-8")).hexdigest()

    def unsubscribe_link(email: str) -> str:
        return f"{frontend_url('/api/lifecycle/unsubscribe')}?email={quote(email)}&token={unsubscribe_token(email)}"

    async def optional_user(request: Request):
        try:
            return await get_current_user(request)
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if email_of(user) != PLATFORM_OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    async def find_user(identifier: str):
        ident = str(identifier or "").strip().lower()
        if not ident:
            raise HTTPException(status_code=400, detail="Enter an email or user ID")
        clauses = [{"email": ident}]
        oid = object_id_or_none(ident)
        if oid:
            clauses.append({"_id": oid})
        user = await db.users.find_one({"$or": clauses})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

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

    def frontend_url(path: str = "/dashboard") -> str:
        base = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
        return f"{base}{path if path.startswith('/') else '/' + path}"

    def lifecycle_template(kind: str, user: Dict[str, Any]) -> Dict[str, str]:
        try:
            from email_provider import build_lifecycle_email
            return build_lifecycle_email(kind, user, os.environ.get("FRONTEND_URL", "https://www.churvox.com"))
        except Exception:
            subject = "Welcome to Churvox"
            link = frontend_url("/dashboard#setupassistant")
            html = f"<div style='font-family:system-ui'><h1>{subject}</h1><p>Open Churvox and continue setup.</p><p><a href='{link}'>Open Churvox</a></p></div>"
            return {"kind": kind or "welcome", "subject": subject, "html": html, "text": f"{subject}\n\nOpen Churvox: {link}"}

    def with_unsubscribe(tpl: Dict[str, str], email: str) -> Dict[str, str]:
        if not email:
            return tpl
        link = unsubscribe_link(email)
        html = (tpl.get("html") or "") + f"<p style='font-size:12px;color:#64748b;margin-top:22px;'>No longer want Churvox setup and retention emails? <a href='{link}' style='color:#475569;'>Unsubscribe</a>.</p>"
        text = (tpl.get("text") or "") + f"\n\nUnsubscribe from Churvox retention emails: {link}"
        return {**tpl, "html": html, "text": text}

    async def send_lifecycle_email(user: Dict[str, Any], kind: str, actor: str = "system"):
        to = email_of(user)
        if not to:
            return {"success": False, "email_sent": False, "error": "No user email"}
        tpl = with_unsubscribe(lifecycle_template(kind, user), to)
        try:
            from email_provider import get_email_provider
            provider = get_email_provider()
            result = await provider.send(to, tpl["subject"], tpl["html"], tpl["text"])
            sent = bool(getattr(result, "success", False))
            error = str(getattr(result, "error", "") or "")
            provider_name = str(getattr(result, "provider", "postmark") or "postmark")
        except Exception as exc:
            sent = False
            error = str(exc)
            provider_name = "postmark"
        template_key = tpl.get("kind") or kind or "welcome"
        event = {"created_at": datetime.now(timezone.utc), "template": template_key, "to": to, "user_id": str(user.get("_id") or user.get("id") or ""), "business_name": user.get("business_name"), "subject": tpl["subject"], "sent": sent, "provider": provider_name, "error": error, "actor": actor}
        try:
            await db.lifecycle_emails.insert_one(event)
            if template_key == "welcome" and sent and user.get("_id"):
                await db.users.update_one({"_id": user.get("_id")}, {"$set": {"welcome_email_sent_at": datetime.now(timezone.utc)}})
        except Exception:
            pass
        return {"success": True, "email_sent": sent, "provider": provider_name, "error": error, "template": template_key, "subject": tpl["subject"]}

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
        update = {"plan": plan, "subscription_status": subscription_status, "trial_started_at": now, "trial_ends_at": trial_end_dt, "billing_country": country, "stripe_customer_id": stripe_customer_id, "stripe_subscription_id": stripe_subscription_id, "last_checkout_session_id": session_id, "last_checkout_confirmed_at": now, "checkout_verified_by_stripe": True, "free_tester_access": False}
        business_id = object_id_or_none(user.get("business_id") or user.get("id"))
        user_id = object_id_or_none(user.get("id"))
        if business_id:
            await db.users.update_one({"_id": business_id}, {"$set": update})
            await db.users.update_many({"business_id": business_id, "role": "worker"}, {"$set": {"plan": plan}})
        if user_id and user_id != business_id:
            await db.users.update_one({"_id": user_id}, {"$set": update})
        return update

    async def collection_count(collection_name: str, business_id: str):
        try:
            return await db[collection_name].count_documents({"business_id": {"$in": [business_id, object_id_or_none(business_id)]}})
        except Exception:
            try:
                return await db[collection_name].count_documents({"business_id": business_id})
            except Exception:
                return 0

    async def already_sent(to: str, template: str):
        try:
            return bool(await db.lifecycle_emails.find_one({"to": to, "template": template, "actor": {"$in": ["auto_retention", "retention_worker"]}}))
        except Exception:
            return True

    async def choose_auto_template(user: Dict[str, Any]):
        if is_internal_record(user) or user.get("email_opt_out") or user.get("retention_email_opt_out"):
            return None
        to = email_of(user)
        if not to:
            return None
        now = datetime.now(timezone.utc)
        created = parse_dt(user.get("created_at") or user.get("registered_at")) or now
        last = parse_dt(user.get("last_active") or user.get("last_seen") or user.get("last_login") or user.get("updated_at") or user.get("created_at")) or created
        age_days = max(0, (now - created).days)
        inactive_days = max(0, (now - last).days)
        status = str(user.get("subscription_status") or "").lower()
        business_id = str(user.get("business_id") or user.get("_id") or user.get("id") or "")
        clients = await collection_count("clients", business_id) if business_id else 0
        jobs = await collection_count("jobs", business_id) if business_id else 0
        invoices = await collection_count("invoices", business_id) if business_id else 0
        if is_free_tester(user) and age_days >= 7 and not await already_sent(to, "tester_feedback"):
            return "tester_feedback"
        if status in {"past_due", "unpaid", "incomplete", "incomplete_expired"} and not await already_sent(to, "payment_failed"):
            return "payment_failed"
        if status in {"payment_required", "canceled", "cancelled"} and not await already_sent(to, "payment_required"):
            return "payment_required"
        trial_end = parse_dt(user.get("trial_ends_at") or user.get("trial_end"))
        if status == "trialing" and trial_end:
            hours_left = (trial_end - now).total_seconds() / 3600
            if 0 < hours_left <= 36 and not await already_sent(to, "trial_ending_1"):
                return "trial_ending_1"
            if 36 < hours_left <= 96 and not await already_sent(to, "trial_ending_3"):
                return "trial_ending_3"
            if 96 < hours_left <= 192 and not await already_sent(to, "trial_ending_7"):
                return "trial_ending_7"
            if age_days >= 3 and not await already_sent(to, "trial_checkin"):
                return "trial_checkin"
        if not checkout_verified(user) and age_days >= 1 and not await already_sent(to, "need_help_setup"):
            return "need_help_setup"
        if clients == 0 and age_days >= 1 and not await already_sent(to, "first_client_nudge"):
            return "first_client_nudge"
        if clients > 0 and jobs == 0 and age_days >= 2 and not await already_sent(to, "first_job_nudge"):
            return "first_job_nudge"
        if jobs > 0 and invoices == 0 and age_days >= 3 and not await already_sent(to, "first_invoice_nudge"):
            return "first_invoice_nudge"
        if inactive_days >= 45 and not await already_sent(to, "winback"):
            return "winback"
        if inactive_days >= 30 and not await already_sent(to, "dormant_30"):
            return "dormant_30"
        if inactive_days >= 14 and not await already_sent(to, "dormant_14"):
            return "dormant_14"
        if inactive_days >= 7 and not await already_sent(to, "dormant_7"):
            return "dormant_7"
        if is_paid_user(user) and not await already_sent(to, "paid_welcome"):
            return "paid_welcome"
        return None

    async def run_auto_retention(force: bool = False, limit: int = AUTO_RETENTION_BATCH_LIMIT):
        if os.environ.get("RETENTION_EMAILS_ENABLED", "true").lower() in {"0", "false", "no", "off"}:
            return {"success": True, "enabled": False, "sent": 0, "checked": 0, "message": "Retention emails disabled"}
        try:
            from email_provider import get_email_provider
            provider = get_email_provider()
            if hasattr(provider, "is_configured") and not provider.is_configured():
                return {"success": True, "enabled": False, "sent": 0, "checked": 0, "message": "Postmark not configured"}
        except Exception as exc:
            return {"success": True, "enabled": False, "sent": 0, "checked": 0, "message": str(exc)}
        now = datetime.now(timezone.utc)
        if retention_state["running"]:
            return {"success": True, "enabled": True, "sent": 0, "checked": 0, "message": "Retention already running"}
        if not force and retention_state["last_run"] and (now - retention_state["last_run"]).total_seconds() < AUTO_RETENTION_INTERVAL_SECONDS:
            return retention_state["last_result"] or {"success": True, "enabled": True, "sent": 0, "checked": 0, "message": "Not due yet"}
        retention_state["running"] = True
        sent, checked, failures = [], 0, []
        try:
            cursor = db.users.find({"email": {"$exists": True, "$ne": ""}}).sort("updated_at", -1).limit(500)
            async for raw_user in cursor:
                if len(sent) >= limit:
                    break
                checked += 1
                user = dict(raw_user)
                template = await choose_auto_template(user)
                if not template:
                    continue
                result = await send_lifecycle_email(user, template, actor="auto_retention")
                if result.get("email_sent"):
                    sent.append({"email": email_of(user), "template": template})
                else:
                    failures.append({"email": email_of(user), "template": template, "error": result.get("error")})
            retention_state["last_run"] = now
            retention_state["last_result"] = {"success": True, "enabled": True, "sent": len(sent), "checked": checked, "items": sent, "failures": failures[:10], "next_run_after_seconds": AUTO_RETENTION_INTERVAL_SECONDS}
            return retention_state["last_result"]
        finally:
            retention_state["running"] = False

    async def maybe_run_auto_retention():
        try:
            return await run_auto_retention(force=False)
        except Exception as exc:
            return {"success": False, "error": str(exc)}

    async def users_for_stripe(customer_id=None, subscription_id=None):
        clauses = []
        if customer_id:
            clauses.append({"stripe_customer_id": str(customer_id)})
        if subscription_id:
            clauses.append({"stripe_subscription_id": str(subscription_id)})
        if not clauses:
            return []
        return await db.users.find({"$or": clauses}).to_list(length=100)

    async def update_users_for_stripe(customer_id=None, subscription_id=None, update=None):
        users = await users_for_stripe(customer_id, subscription_id)
        if not users:
            return []
        ids = [u.get("_id") for u in users if u.get("_id")]
        if ids:
            await db.users.update_many({"_id": {"$in": ids}}, {"$set": {**(update or {}), "updated_at": datetime.now(timezone.utc)}})
        return users

    @router.get("/auth/me")
    async def hq_safe_auth_me(request: Request):
        user = await get_current_user(request)
        access = user_access_status(user)
        return {"id": user.get("id"), "email": user.get("email"), "name": user.get("name"), "business_name": user.get("business_name"), "role": user.get("role", "employer"), "plan": access["plan"], "plan_name": plan_label(access["plan"]), "subscription_status": access["subscription_status"], "trial_ends_at": safe_value(user.get("trial_ends_at")), "stripe_customer_id": user.get("stripe_customer_id"), "stripe_subscription_id": user.get("stripe_subscription_id"), "free_tester_access": is_free_tester(user), "free_tester_until": safe_value(user.get("free_tester_until")), "checkout_verified_by_stripe": checkout_verified(user), "has_app_access": access["has_app_access"], "billing_lock_reason": access["billing_lock_reason"], "email_verified": user.get("email_verified"), "gst_rate": user.get("gst_rate"), "trade_type": user.get("trade_type", "other"), "business_id": str(user.get("business_id") or user.get("id"))}

    @router.get("/billing/subscription-status")
    async def subscription_status(request: Request):
        user = await get_current_user(request)
        owner_id = object_id_or_none(user.get("business_id") or user.get("id"))
        owner = await db.users.find_one({"_id": owner_id}) if owner_id else None
        owner = owner or user
        access = user_access_status({**owner, "id": str(owner.get("_id", user.get("id")))})
        return {"plan": access["plan"], "plan_name": plan_label(access["plan"]), "subscription_status": access["subscription_status"], "trial_ends_at": safe_value(owner.get("trial_ends_at")), "stripe_customer_id": owner.get("stripe_customer_id"), "stripe_subscription_id": owner.get("stripe_subscription_id"), "free_tester_access": is_free_tester(owner), "free_tester_until": safe_value(owner.get("free_tester_until")), "has_app_access": access["has_app_access"], "billing_lock_reason": access["billing_lock_reason"], "billing_country": owner.get("billing_country", "NZ")}

    @router.post("/billing/create-checkout-session")
    async def trial_checkout_session(payload: Dict[str, Any], request: Request):
        user = await get_current_user(request)
        if user.get("role") not in ("employer", "admin"):
            raise HTTPException(status_code=403, detail="Only business owners can choose a plan")
        secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
        if not secret:
            raise HTTPException(status_code=500, detail="Stripe secret key not configured")
        stripe.api_key = secret
        plan = PLAN_ALIAS.get(str(payload.get("plan") or "").lower().strip())
        if plan not in PLAN_VALUE:
            raise HTTPException(status_code=400, detail="Choose a valid plan")
        country = normalize_country(payload.get("country"))
        frontend = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
        session = stripe.checkout.Session.create(mode="subscription", line_items=[{"price": stripe_price_id(plan, country), "quantity": 1}], subscription_data={"trial_period_days": 14, "metadata": {"user_id": user["id"], "business_id": str(user.get("business_id") or user["id"]), "plan": plan, "country": country}}, payment_method_collection="always", success_url=f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}", cancel_url=f"{frontend}/billing/cancel?plan={plan}&country={country}", customer_email=user["email"], metadata={"user_id": user["id"], "business_id": str(user.get("business_id") or user["id"]), "plan": plan, "country": country, "trial_days": "14", "card_required": "true"})
        return {"success": True, "url": session.url, "trial_days": 14, "plan": plan, "country": country, "card_required": True}

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
        try:
            await send_lifecycle_email({**user, **update}, "trial_started", actor="stripe_checkout")
        except Exception:
            pass
        return {"success": True, "message": "Plan trial started", "plan": plan, "country": country, "trial_ends_at": safe_value(update.get("trial_ends_at")), "subscription_status": update.get("subscription_status"), "stripe_customer_id": session.get("customer"), "stripe_subscription_id": session.get("subscription")}

    @router.post("/billing/stripe-webhook")
    @router.post("/stripe/webhook")
    async def stripe_webhook(request: Request):
        secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
        raw = await request.body()
        try:
            if secret:
                event = stripe.Webhook.construct_event(raw, request.headers.get("stripe-signature"), secret)
            else:
                event = json.loads(raw.decode("utf-8") or "{}")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook: {exc}")
        event_id = str(event.get("id") or "")
        event_type = str(event.get("type") or "")
        if event_id and await db.stripe_webhook_events.find_one({"event_id": event_id}):
            return {"success": True, "duplicate": True, "event": event_type}
        obj = (event.get("data") or {}).get("object") or {}
        now = datetime.now(timezone.utc)
        processed = {"event_id": event_id, "type": event_type, "created_at": now, "object_id": obj.get("id"), "customer": obj.get("customer"), "subscription": obj.get("subscription")}
        try:
            if event_type == "checkout.session.completed":
                metadata = obj.get("metadata") or {}
                user_id = object_id_or_none(metadata.get("user_id"))
                plan = PLAN_ALIAS.get(str(metadata.get("plan") or "").lower().strip(), str(metadata.get("plan") or "").lower().strip())
                update = {"stripe_customer_id": obj.get("customer"), "stripe_subscription_id": obj.get("subscription"), "checkout_verified_by_stripe": True, "subscription_status": "trialing", "billing_country": normalize_country(metadata.get("country")), "last_checkout_confirmed_at": now, "updated_at": now}
                if plan in PLAN_VALUE:
                    update["plan"] = plan
                if user_id:
                    await db.users.update_one({"_id": user_id}, {"$set": update})
                else:
                    await update_users_for_stripe(obj.get("customer"), obj.get("subscription"), update)
            elif event_type.startswith("customer.subscription."):
                status = str(obj.get("status") or "").lower()
                update = {"subscription_status": status, "stripe_subscription_id": obj.get("id"), "stripe_customer_id": obj.get("customer"), "checkout_verified_by_stripe": True, "updated_at": now}
                if obj.get("trial_end"):
                    update["trial_ends_at"] = datetime.fromtimestamp(int(obj.get("trial_end")), tz=timezone.utc)
                if obj.get("current_period_end"):
                    update["current_period_end"] = datetime.fromtimestamp(int(obj.get("current_period_end")), tz=timezone.utc)
                if event_type == "customer.subscription.deleted" or status in {"canceled", "cancelled", "unpaid", "incomplete_expired"}:
                    update["billing_lock_reason"] = "payment_required"
                elif status in {"active", "trialing"}:
                    update["billing_lock_reason"] = None
                await update_users_for_stripe(obj.get("customer"), obj.get("id"), update)
            elif event_type == "invoice.paid":
                await update_users_for_stripe(obj.get("customer"), obj.get("subscription"), {"subscription_status": "active", "billing_lock_reason": None, "checkout_verified_by_stripe": True, "last_invoice_paid_at": now})
            elif event_type == "invoice.payment_failed":
                users = await update_users_for_stripe(obj.get("customer"), obj.get("subscription"), {"subscription_status": "past_due", "billing_lock_reason": "payment_failed", "last_payment_failed_at": now})
                for user in users[:5]:
                    await send_lifecycle_email(user, "payment_failed", actor="stripe_webhook")
            processed["processed"] = True
        except Exception as exc:
            processed["processed"] = False
            processed["error"] = str(exc)
        if event_id:
            try:
                await db.stripe_webhook_events.insert_one(processed)
            except Exception:
                pass
        return {"success": True, "event": event_type, "processed": processed.get("processed", False)}

    @router.get("/lifecycle/unsubscribe")
    async def lifecycle_unsubscribe(email: str = "", token: str = ""):
        clean = str(email or "").strip().lower()
        if not clean or token != unsubscribe_token(clean):
            return HTMLResponse("<h1>Invalid unsubscribe link</h1><p>Please contact hello@churvox.com if you need help.</p>", status_code=400)
        await db.users.update_many({"email": clean}, {"$set": {"retention_email_opt_out": True, "retention_unsubscribed_at": datetime.now(timezone.utc)}})
        return HTMLResponse("<h1>You are unsubscribed</h1><p>You will no longer receive Churvox setup, dormant or win-back emails.</p>")

    @router.post("/support/contact")
    async def support_contact(request: Request, payload: Dict[str, Any] = Body(default={})):
        user = await optional_user(request)
        message = str(payload.get("message") or "").strip()
        if not message:
            return {"success": False, "error": "Message is required"}
        subject = f"Churvox support: {str(payload.get('help_type') or 'Support request')[:80]}"
        from_line = f"{(user or {}).get('name') or payload.get('user_name') or 'Unknown'} <{(user or {}).get('email') or payload.get('user_email') or 'no email'}>"
        text = f"From: {from_line}\nBusiness: {(user or {}).get('business_name') or payload.get('business_name') or 'Not supplied'}\nPage: {payload.get('page_url') or ''}\n\n{message}"
        html = f"<div style='font-family:system-ui'><h2>Churvox support request</h2><pre style='white-space:pre-wrap'>{text}</pre></div>"
        sent = False; error = ""
        try:
            from email_provider import get_email_provider
            result = await get_email_provider().send(PLATFORM_OWNER_EMAIL, subject, html, text)
            sent = bool(getattr(result, "success", False)); error = getattr(result, "error", "") or ""
        except Exception as exc:
            error = str(exc)
        try:
            await db.support_messages.insert_one({"created_at": datetime.now(timezone.utc), "from": from_line, "business_name": (user or {}).get("business_name") or payload.get("business_name"), "message": message, "sent": sent, "error": error})
        except Exception:
            pass
        return {"success": sent, "message": "Support message sent" if sent else "Support request saved but email failed", "error": error}

    @router.post("/lifecycle/welcome")
    async def signup_welcome_email(request: Request):
        user = await get_current_user(request)
        if user.get("welcome_email_sent_at"):
            return {"success": True, "email_sent": False, "message": "Welcome email already sent"}
        return await send_lifecycle_email(user, "welcome", actor="signup")

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
        await maybe_run_auto_retention()
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
        id_values, email_values = set(), set()
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
        target_collections = ["users", "clients", "jobs", "quotes", "invoices", "time_logs", "payments", "platform_visits", "email_verification_tokens", "password_reset_tokens", "invite_tokens", "invite_emails", "password_reset_emails", "invoice_emails", "quote_emails", "sms_credits", "sms_credit_purchases", "xero_connections", "xero_sync_log", "lifecycle_emails", "support_messages"]
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

    @router.get("/admin/owner/plan-report")
    async def owner_plan_report(request: Request):
        await require_owner(request)
        raw_users = await list_raw("users", 3000)
        all_users = [mark_user(u) for u in raw_users]
        counts = {"Start": 0, "Crew": 0, "Operator": 0, "Command": 0, "No plan": 0, "Other": 0}
        for user in all_users:
            label = plan_label(user)
            if label == "Choose plan":
                label = "No plan"
            counts[label if label in counts else "Other"] += 1
        paid = [u for u in all_users if is_paid_user(u)]
        trials = [u for u in all_users if is_trial_user(u)]
        testers = [u for u in all_users if is_free_tester(u)]
        no_plan = [u for u in all_users if plan_label(u) in {"Choose plan", "No plan"}]
        return {"success": True, "counts": counts, "paid_count": len(paid), "trial_count": len(trials), "free_tester_count": len(testers), "no_plan_count": len(no_plan), "monthly_revenue_estimate": sum(PLAN_VALUE.get(plan_key(u), 0) for u in paid), "paid_users": paid[:500], "trial_users": trials[:500], "free_testers": testers[:500], "no_plan_users": no_plan[:500]}

    @router.post("/admin/owner/grant-free-tester")
    async def grant_free_tester(request: Request, payload: Dict[str, Any] = Body(default={})):
        owner = await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        days = max(1, min(int(payload.get("days") or 30), 365))
        plan = PLAN_ALIAS.get(str(payload.get("plan") or "operator").lower().strip(), "pro")
        until = datetime.now(timezone.utc) + timedelta(days=days)
        update = {"free_tester_access": True, "free_tester_until": until, "free_tester_note": str(payload.get("note") or ""), "free_tester_granted_at": datetime.now(timezone.utc), "free_tester_granted_by": owner.get("email"), "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None}
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        user.update(update)
        email_result = await send_lifecycle_email(user, "tester_welcome", actor=owner.get("email")) if payload.get("send_email", True) else None
        return {"success": True, "message": "Free tester access granted", "user": safe_doc(user), "email": email_result}

    @router.post("/admin/owner/revoke-free-tester")
    async def revoke_free_tester(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        update = {"free_tester_access": False, "free_tester_revoked_at": datetime.now(timezone.utc)}
        if not user.get("stripe_subscription_id"):
            update.update({"subscription_status": "payment_required", "checkout_verified_by_stripe": False, "billing_lock_reason": "payment_required"})
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        return {"success": True, "message": "Free tester access revoked", "user_id": str(user["_id"])}

    @router.get("/admin/owner/lifecycle-email-templates")
    async def lifecycle_templates(request: Request):
        await require_owner(request)
        return {"success": True, "templates": [key for key, _ in RETENTION_EMAIL_TEMPLATES], "template_options": [{"value": key, "label": label} for key, label in RETENTION_EMAIL_TEMPLATES]}

    @router.post("/admin/owner/send-lifecycle-email")
    async def owner_send_lifecycle_email(request: Request, payload: Dict[str, Any] = Body(default={})):
        owner = await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        return await send_lifecycle_email(user, str(payload.get("template") or "welcome"), actor=owner.get("email"))

    @router.post("/admin/owner/run-retention-emails")
    async def owner_run_retention_emails(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        return await run_auto_retention(force=True, limit=max(1, min(int(payload.get("limit") or AUTO_RETENTION_BATCH_LIMIT), 100)))

    @router.post("/cron/run-retention-emails")
    async def cron_run_retention_emails(request: Request, payload: Dict[str, Any] = Body(default={})):
        expected = os.environ.get("RETENTION_CRON_SECRET", "").strip()
        supplied = request.headers.get("x-cron-secret", "").strip() or str(request.query_params.get("secret") or "").strip()
        if not expected or supplied != expected:
            raise HTTPException(status_code=403, detail="Invalid retention cron secret")
        return await run_auto_retention(force=True, limit=max(1, min(int(payload.get("limit") or AUTO_RETENTION_BATCH_LIMIT), 100)))

    @router.get("/admin/owner/retention-email-status")
    async def owner_retention_email_status(request: Request):
        await require_owner(request)
        return {"success": True, "state": safe_value(retention_state), "interval_seconds": AUTO_RETENTION_INTERVAL_SECONDS, "batch_limit": AUTO_RETENTION_BATCH_LIMIT, "templates": [key for key, _ in RETENTION_EMAIL_TEMPLATES]}

    @router.get("/admin/owner-overview")
    async def owner_overview(request: Request):
        await require_owner(request)
        await maybe_run_auto_retention()
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
        free_testers = [u for u in all_users if is_free_tester(u)]
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
            label = plan_label(user)
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
            events.append({"kind": "user", "label": "User", "title": user.get("name") or user.get("email") or "User", "meta": f"{user.get('hq_record_type')} · {user.get('business_name') or plan_label(user)}", "at": user.get("created_at") or user.get("updated_at") or user.get("last_active") or ""})
        for visit in visits[:80]:
            events.append({"kind": "visit", "label": "Visitor/pageview", "title": visit.get("path") or "Page visit", "meta": visit.get("user_email") or visit.get("referrer") or visit.get("ip") or "", "at": visit.get("last_seen") or visit.get("created_at") or ""})
        return {"ok": True, "generated_at": now.isoformat(), "hq_mode": "all_users_visible", "owner_locked_to": PLATFORM_OWNER_EMAIL, "retention_email_state": safe_value(retention_state), "collections_seen": sorted(list(collections)), "metrics": {"total_users": len(all_users), "customer_users": len(customer_users), "internal_users": len(internal_users), "total_businesses": len(business_users), "paid_users": len(paid_users), "trial_users": len(trial_users), "free_tester_users": len(free_testers), "active_today": len(active_today_users), "active_30d": len(active_30d_users), "active_now": len(active_now_visitors), "visitors_today": len(visitors_today), "unique_visitors_today": len(unique_today), "visitors_7d": len(visitors_7d), "unique_visitors_7d": len(unique_7d), "total_invoices": len(invoices), "total_jobs": len(jobs), "total_clients": len(clients), "total_quotes": len(quotes), "monthly_revenue_estimate": sum(PLAN_VALUE.get(plan_key(u), 0) for u in paid_users), "invoice_value_total": total_invoice_value, "invoice_value_paid": paid_invoice_value, "invoice_value_outstanding": outstanding_invoice_value, "plan_counts": plan_counts}, "lists": {"users": all_users[:1000], "all_users": all_users[:1000], "customer_users": customer_users[:1000], "internal_users": internal_users[:1000], "businesses": business_users[:1000], "paid_users": paid_users[:1000], "trial_users": trial_users[:1000], "free_testers": free_testers[:1000], "active_today": active_today_users[:1000], "active_30d": active_30d_users[:1000], "active_now": active_now_visitors[:1000], "visitors": visits[:1000], "invoices": invoices[:500], "jobs": jobs[:500], "clients": clients[:500], "quotes": quotes[:500], "events": sorted(events, key=lambda e: str(e.get("at") or ""), reverse=True)[:150]}}

    @router.post("/admin/owner/cleanup-tests")
    async def cleanup_tests(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        return {"ok": True, "dry_run": True, "collections": [], "hq_mode": "all_users_visible"}

    return router
