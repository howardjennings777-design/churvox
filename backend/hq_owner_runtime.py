from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict
from fastapi import Body, HTTPException, Request
from fastapi.responses import JSONResponse

OWNER_EMAIL = "hello@churvox.com"
PLAN_LABELS = {"solo": "Start", "start": "Start", "team": "Crew", "crew": "Crew", "pro": "Operator", "operator": "Operator", "enterprise": "Command", "command": "Command", "none": "No plan", "": "No plan"}
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_VALUE = {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}


def install_hq_owner_runtime(app, legacy, ObjectId):
    db = legacy.db

    def now_utc():
        return datetime.now(timezone.utc)

    def safe_text(value, fallback=""):
        text = str(value or "").strip()
        return text or fallback

    def parse_dt(value):
        if not value:
            return None
        try:
            d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    def obj_id(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def email_of(doc):
        return str((doc or {}).get("email") or (doc or {}).get("user_email") or "").strip().lower()

    def user_id_of(user):
        return str((user or {}).get("id") or (user or {}).get("_id") or "")

    def clean_plan(value):
        return PLAN_ALIAS.get(str(value or "operator").lower().strip(), "pro")

    def plan_label(value):
        return PLAN_LABELS.get(str(value or "").lower().strip(), "Other")

    def is_free_tester(user):
        if not (user or {}).get("free_tester_access"):
            return False
        until = parse_dt(user.get("free_tester_until"))
        return not until or until >= now_utc()

    def is_trial(user):
        end = parse_dt((user or {}).get("trial_ends_at") or (user or {}).get("trial_end"))
        return str((user or {}).get("subscription_status") or "").lower() == "trialing" and bool(end and end >= now_utc())

    def is_paid(user):
        return str((user or {}).get("subscription_status") or "").lower() in {"active", "paid"} and not is_free_tester(user)

    def safe_doc(doc):
        out = dict(doc or {})
        if "_id" in out:
            out["id"] = str(out["_id"])
            out["_id"] = str(out["_id"])
        for key, value in list(out.items()):
            if isinstance(value, datetime):
                out[key] = value.isoformat()
            elif isinstance(value, ObjectId):
                out[key] = str(value)
        out["plan_name"] = plan_label(out.get("plan") or out.get("subscription_plan"))
        out["is_free_tester"] = is_free_tester(out)
        out["is_paid_plan"] = is_paid(out)
        out["is_trialing"] = is_trial(out)
        return out

    async def current_user(request: Request):
        return await legacy.get_current_user(request)

    async def require_owner(request: Request):
        user = await current_user(request)
        if email_of(user) != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ owner controls are locked to hello@churvox.com")
        return user

    async def find_user(identifier: str):
        ident = safe_text(identifier).lower()
        if not ident:
            raise HTTPException(status_code=400, detail="Enter an email or user ID")
        clauses = [{"email": ident}]
        oid = obj_id(ident)
        if oid:
            clauses.append({"_id": oid})
        user = await db.users.find_one({"$or": clauses})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    def app_link(path="/dashboard"):
        base = safe_text(getattr(legacy, "FRONTEND_URL", ""), "https://www.churvox.com").rstrip("/")
        return f"{base}{path if str(path).startswith('/') else '/' + str(path)}"

    def email_template(kind: str, user: Dict[str, Any]):
        name = safe_text(user.get("name") or user.get("full_name"), "there")
        business = safe_text(user.get("business_name") or user.get("company"), "your business")
        plan = plan_label(user.get("plan"))
        setup = app_link("/dashboard#setupassistant")
        plans = app_link("/plans")
        command = app_link("/dashboard#command")
        templates = {
            "welcome": ("Welcome to Churvox", f"Hi {name}, welcome to Churvox. Set up {business}, choose your plan, and Churvox will guide you through the first job-to-invoice flow.", setup, "Open setup guide"),
            "trial_started": ("Your Churvox trial is active", f"Hi {name}, your Churvox {plan} trial is active. Finish setup now so Churvox can start preparing admin work for owner approval.", setup, "Finish setup"),
            "setup_nudge": ("Finish setting up Churvox", f"Hi {name}, your account is ready but setup still needs attention. Add your business details, first client, first job and first invoice path.", setup, "Continue setup"),
            "trial_ending": ("Your Churvox trial is ending soon", f"Hi {name}, your Churvox trial is nearly finished. Keep access open by confirming your plan before the trial ends.", plans, "Keep Churvox active"),
            "payment_required": ("Keep using Churvox", f"Hi {name}, your trial has ended or billing needs attention. Choose or confirm a plan to keep Churvox running for {business}.", plans, "Open plans"),
            "tester_welcome": ("Your Churvox tester access is ready", f"Hi {name}, tester access has been opened for you. Please use Churvox like a real business and send feedback on anything confusing or broken.", command, "Open Churvox"),
        }
        subject, intro, link, cta = templates.get(kind, templates["welcome"])
        html = f"""
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
          <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:28px;">
            <div style="font-size:22px;font-weight:900;color:#f97316;margin-bottom:14px;">Churvox</div>
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;">{subject}</h1>
            <p style="font-size:15px;line-height:1.6;color:#334155;">{intro}</p>
            <p style="margin:24px 0;"><a href="{link}" style="background:#0f172a;color:white;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:800;display:inline-block;">{cta}</a></p>
            <p style="font-size:13px;color:#64748b;">Churvox does the admin. You approve.</p>
          </div>
        </div>
        """
        text = f"{subject}\n\n{intro}\n\n{cta}: {link}\n\nChurvox does the admin. You approve."
        return {"kind": kind, "subject": subject, "html": html, "text": text}

    async def send_lifecycle_email(user: Dict[str, Any], kind: str, actor: str = "system"):
        to = email_of(user)
        if not to:
            return {"success": False, "email_sent": False, "error": "No user email"}
        tpl = email_template(kind, user)
        provider = getattr(legacy, "email_provider", None)
        result = None
        try:
            if provider and hasattr(provider, "send"):
                result = await provider.send(to, tpl["subject"], tpl["html"], tpl["text"])
                sent = bool(getattr(result, "success", False))
                error = safe_text(getattr(result, "error", ""))
                provider_name = safe_text(getattr(result, "provider", "postmark"), "postmark")
            else:
                sent = False
                error = "Email provider not configured"
                provider_name = "none"
        except Exception as exc:
            sent = False
            error = str(exc)
            provider_name = "postmark"
        event = {"created_at": now_utc(), "template": kind, "to": to, "user_id": str(user.get("_id") or user.get("id") or ""), "business_name": user.get("business_name"), "subject": tpl["subject"], "sent": sent, "provider": provider_name, "error": error, "actor": actor}
        try:
            await db.lifecycle_emails.insert_one(event)
            if kind == "welcome" and sent:
                await db.users.update_one({"_id": user.get("_id")}, {"$set": {"welcome_email_sent_at": now_utc()}})
        except Exception:
            pass
        return {"success": True, "email_sent": sent, "provider": provider_name, "error": error, "template": kind, "subject": tpl["subject"]}

    @app.middleware("http")
    async def hq_free_tester_access_middleware(request: Request, call_next):
        path = request.url.path.rstrip("/")
        if path in {"/api/auth/me", "/api/billing/subscription-status"}:
            try:
                user = await current_user(request)
                if is_free_tester(user):
                    plan = clean_plan(user.get("plan") or "pro")
                    payload = {"id": user_id_of(user), "email": user.get("email"), "name": user.get("name"), "business_name": user.get("business_name"), "role": user.get("role", "employer"), "plan": plan, "plan_name": plan_label(plan), "subscription_status": "tester_free", "free_tester_access": True, "free_tester_until": safe_doc(user).get("free_tester_until"), "has_app_access": True, "billing_lock_reason": None, "email_verified": user.get("email_verified"), "business_id": str(user.get("business_id") or user.get("_id") or user.get("id"))}
                    return JSONResponse(payload)
            except Exception:
                pass
        return await call_next(request)

    @app.get("/api/admin/owner/plan-report")
    async def hq_plan_report(request: Request):
        await require_owner(request)
        raw = await db.users.find({}).sort("created_at", -1).limit(3000).to_list(length=3000)
        users = [safe_doc(u) for u in raw]
        counts = {"Start": 0, "Crew": 0, "Operator": 0, "Command": 0, "No plan": 0, "Other": 0}
        for u in users:
            label = plan_label(u.get("plan"))
            counts[label if label in counts else "Other"] += 1
        paid = [u for u in users if u.get("is_paid_plan")]
        testers = [u for u in users if u.get("is_free_tester")]
        trials = [u for u in users if u.get("is_trialing")]
        no_plan = [u for u in users if plan_label(u.get("plan")) == "No plan"]
        return {"success": True, "counts": counts, "paid_count": len(paid), "trial_count": len(trials), "free_tester_count": len(testers), "no_plan_count": len(no_plan), "monthly_revenue_estimate": sum(PLAN_VALUE.get(clean_plan(u.get("plan")), 0) for u in paid), "paid_users": paid[:500], "trial_users": trials[:500], "free_testers": testers[:500], "no_plan_users": no_plan[:500]}

    @app.post("/api/admin/owner/grant-free-tester")
    async def grant_free_tester(request: Request, payload: Dict[str, Any] = Body(default={})):
        owner = await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        days = int(payload.get("days") or 30)
        days = max(1, min(days, 365))
        plan = clean_plan(payload.get("plan") or "operator")
        until = now_utc() + timedelta(days=days)
        update = {"free_tester_access": True, "free_tester_until": until, "free_tester_note": safe_text(payload.get("note")), "free_tester_granted_at": now_utc(), "free_tester_granted_by": owner.get("email"), "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None}
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        user.update(update)
        email_result = None
        if payload.get("send_email", True):
            email_result = await send_lifecycle_email(user, "tester_welcome", actor=owner.get("email"))
        return {"success": True, "message": "Free tester access granted", "user": safe_doc(user), "email": email_result}

    @app.post("/api/admin/owner/revoke-free-tester")
    async def revoke_free_tester(request: Request, payload: Dict[str, Any] = Body(default={})):
        await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        update = {"free_tester_access": False, "free_tester_revoked_at": now_utc()}
        if not user.get("stripe_subscription_id"):
            update.update({"subscription_status": "payment_required", "checkout_verified_by_stripe": False, "billing_lock_reason": "payment_required"})
        await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        return {"success": True, "message": "Free tester access revoked", "user_id": str(user["_id"])}

    @app.get("/api/admin/owner/lifecycle-email-templates")
    async def lifecycle_templates(request: Request):
        await require_owner(request)
        return {"success": True, "templates": ["welcome", "trial_started", "setup_nudge", "trial_ending", "payment_required", "tester_welcome"]}

    @app.post("/api/admin/owner/send-lifecycle-email")
    async def owner_send_lifecycle_email(request: Request, payload: Dict[str, Any] = Body(default={})):
        owner = await require_owner(request)
        user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
        kind = safe_text(payload.get("template"), "welcome")
        return await send_lifecycle_email(user, kind, actor=owner.get("email"))

    @app.post("/api/lifecycle/welcome")
    async def send_signup_welcome(request: Request):
        user = await current_user(request)
        if user.get("welcome_email_sent_at"):
            return {"success": True, "email_sent": False, "message": "Welcome email already sent"}
        return await send_lifecycle_email(user, "welcome", actor="signup")
