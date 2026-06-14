"""Churvox shared email helper and lifecycle/HQ email routes."""

import json
import os
import urllib.request
import urllib.error
import html as _html
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta

POSTMARK_SERVER_TOKEN = os.getenv("POSTMARK_SERVER_TOKEN", "").strip()
POSTMARK_FROM_EMAIL = os.getenv("POSTMARK_FROM_EMAIL", "").strip()
_SUPPORT_ROUTE_REGISTERED = False
_BRAND = "Churvox"
OWNER_EMAIL = "hello@churvox.com"
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PLAN_LABELS = {"solo": "Start", "start": "Start", "team": "Crew", "crew": "Crew", "pro": "Operator", "operator": "Operator", "enterprise": "Command", "command": "Command", "none": "No plan", "": "No plan"}
PLAN_VALUE = {"solo": 39, "team": 89, "pro": 149, "enterprise": 299}


@dataclass
class EmailSendResult:
    success: bool
    provider: str = "postmark"
    email_id: str = ""
    error: str = ""


class EmailTemplate(dict):
    def __iter__(self):
        yield self.get("subject", "")
        yield self.get("html", "")


class PostmarkEmailProvider:
    provider = "postmark"

    def __eq__(self, other):
        return other == "postmark" if self.is_configured() else other == "none"

    def is_configured(self):
        return bool(POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL)

    async def send(self, to: str, subject: str, html: str, text: str = ""):
        try:
            result = await send_email(to, subject, html, text)
            return EmailSendResult(success=True, provider="postmark", email_id=str(result.get("MessageID", "")), error="")
        except Exception as exc:
            return EmailSendResult(success=False, provider="postmark", email_id="", error=str(exc))


_PROVIDER = PostmarkEmailProvider()


def _wrap(html_inner: str) -> str:
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:32px;">
        <div style="font-size:22px;font-weight:900;color:#f97316;margin-bottom:16px;">{_BRAND}</div>
        {html_inner}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <div style="font-size:12px;color:#64748b;">Churvox — Churvox does the admin. You approve.</div>
      </div>
    </div>
    """


def _button(label: str, link: str) -> str:
    safe_link = _html.escape(link or "", quote=True)
    safe_label = _html.escape(label or "")
    return f'<p style="margin:24px 0;"><a href="{safe_link}" style="display:inline-block;padding:12px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:999px;font-weight:800;">{safe_label}</a></p><p style="font-size:13px;color:#475569;">Or copy this link:<br/><a href="{safe_link}" style="color:#2563eb;word-break:break-all;">{safe_link}</a></p>'


def _looks_like_url(value: str) -> bool:
    text = str(value or "")
    return text.startswith("http://") or text.startswith("https://") or "/invite/setup/" in text


def _pretty_role(role: str) -> str:
    r = (role or "worker").strip().lower()
    return {"worker": "Worker", "manager": "Manager", "office_admin": "Office Admin", "payroll": "Payroll"}.get(r, r.replace("_", " ").title())


def build_invite_email(name: str, invite_link: str, business_name: str = "", role: str = "worker"):
    if not _looks_like_url(invite_link) and _looks_like_url(business_name):
        invite_link, business_name = business_name, invite_link
    safe_name = _html.escape((name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip()) or _BRAND
    role_label = _html.escape(_pretty_role(role))
    subject = f"You're invited to join {biz.replace('&#x27;', '’')} on {_BRAND}"
    html = _wrap(f"<h2 style='margin:0 0 12px;'>You've been invited</h2><p>Hi {safe_name},</p><p><strong>{biz}</strong> has invited you to join their team on {_BRAND} as <strong>{role_label}</strong>.</p><p>Click below to finish setting up your account.</p>{_button('Accept invite', invite_link)}<p style='font-size:13px;color:#475569;'>If you were not expecting this invite, you can ignore this email.</p>")
    return EmailTemplate(subject=subject, html=html)


def build_resend_invite_email(name: str, invite_link: str, business_name: str = "", role: str = "worker"):
    if not _looks_like_url(invite_link) and _looks_like_url(business_name):
        invite_link, business_name = business_name, invite_link
    safe_name = _html.escape((name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip()) or _BRAND
    role_label = _html.escape(_pretty_role(role))
    return EmailTemplate(subject=f"Your {_BRAND} invite link", html=_wrap(f"<h2>Here's your invite link again</h2><p>Hi {safe_name},</p><p><strong>{biz}</strong> invited you to join {_BRAND} as <strong>{role_label}</strong>.</p>{_button('Accept invite', invite_link)}"))


def build_password_reset_email(name: str, reset_link: str):
    safe_name = _html.escape((name or "").strip() or "there")
    return EmailTemplate(subject=f"Reset your {_BRAND} password", html=_wrap(f"<h2>Reset your password</h2><p>Hi {safe_name},</p><p>We received a request to reset your {_BRAND} password.</p>{_button('Reset password', reset_link)}<p style='font-size:13px;color:#475569;'>If you did not request this, you can ignore this email.</p>"))


def build_quote_email(customer_name: str, business_name: str, quote_number: str, amount: str, quote_link: str):
    safe_name = _html.escape((customer_name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip() or _BRAND)
    subject = f"Quote from {biz.replace('&#x27;', '’')}"
    html = _wrap(f"<h2>Your quote is ready</h2><p>Hi {safe_name},</p><p><strong>{biz}</strong> has sent you quote <strong>{_html.escape(str(quote_number or 'your quote'))}</strong>.</p><p><strong>Total:</strong> {_html.escape(str(amount or ''))}</p>{_button('View quote', quote_link)}")
    return EmailTemplate(subject=subject, html=html)


def build_invoice_email(customer_name: str, business_name: str, invoice_number: str, amount: str, invoice_link: str):
    safe_name = _html.escape((customer_name or "").strip() or "there")
    biz = _html.escape((business_name or "").strip() or _BRAND)
    subject = f"Invoice from {biz.replace('&#x27;', '’')}"
    html = _wrap(f"<h2>Your invoice is ready</h2><p>Hi {safe_name},</p><p><strong>{biz}</strong> has sent you invoice <strong>{_html.escape(str(invoice_number or 'your invoice'))}</strong>.</p><p><strong>Total:</strong> {_html.escape(str(amount or ''))}</p>{_button('View invoice', invoice_link)}")
    return EmailTemplate(subject=subject, html=html)


def build_verification_email(name: str, verify_link: str):
    safe_name = _html.escape((name or "").strip() or "there")
    return EmailTemplate(subject=f"Verify your email for {_BRAND}", html=_wrap(f"<h2>Confirm your email</h2><p>Hi {safe_name},</p><p>Welcome to {_BRAND}. Confirm your email so your account is secure.</p>{_button('Verify email', verify_link)}"))


def _send_via_postmark(to_email: str, subject: str, html_content: str, text_content: str = ""):
    if not POSTMARK_SERVER_TOKEN:
        raise RuntimeError("POSTMARK_SERVER_TOKEN is missing")
    if not POSTMARK_FROM_EMAIL:
        raise RuntimeError("POSTMARK_FROM_EMAIL is missing")
    payload = {"From": POSTMARK_FROM_EMAIL, "To": to_email, "Subject": subject, "HtmlBody": html_content, "MessageStream": "outbound"}
    if text_content:
        payload["TextBody"] = text_content
    req = urllib.request.Request("https://api.postmarkapp.com/email", data=json.dumps(payload).encode("utf-8"), headers={"Accept": "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": POSTMARK_SERVER_TOKEN}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else str(e)
        raise RuntimeError(f"Postmark HTTPError {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Postmark URLError: {e}")
    if status < 200 or status >= 300:
        raise RuntimeError(f"Postmark send failed: HTTP {status} {body}")
    try:
        return json.loads(body) if body else {"ok": True}
    except Exception:
        return {"ok": True}


async def send_email(to_email: str, subject: str, html_content: str, text_content: str = ""):
    to_email = str(to_email or "").strip()
    subject = str(subject or "").strip()
    if not to_email:
        raise ValueError("Missing to_email")
    if not subject:
        raise ValueError("Missing subject")
    if not _PROVIDER.is_configured():
        raise RuntimeError("Postmark is not configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL.")
    return _send_via_postmark(to_email, subject, html_content, text_content)


def _maybe_register_support_route():
    global _SUPPORT_ROUTE_REGISTERED
    if _SUPPORT_ROUTE_REGISTERED:
        return
    try:
        import inspect
        from fastapi import Body, HTTPException, Request
        frame = inspect.currentframe()
        caller_globals = (frame.f_back.f_back.f_globals if frame and frame.f_back and frame.f_back.f_back else {})
        router = caller_globals.get("api_router")
        db = caller_globals.get("db")
        get_current_user = caller_globals.get("get_current_user")
        ObjectId = caller_globals.get("ObjectId")
        FRONTEND_URL = str(caller_globals.get("FRONTEND_URL") or os.getenv("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
        if router is None or db is None or get_current_user is None:
            return

        def safe_text(value, fallback=""):
            text = str(value or "").strip()
            return text or fallback

        def email_of(doc):
            return str((doc or {}).get("email") or (doc or {}).get("user_email") or "").strip().lower()

        def obj_id(value):
            try:
                return ObjectId(str(value))
            except Exception:
                return None

        def parse_dt(value):
            if not value:
                return None
            try:
                d = value if isinstance(value, datetime) else datetime.fromisoformat(str(value).replace("Z", "+00:00"))
                return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
            except Exception:
                return None

        def clean_plan(value):
            return PLAN_ALIAS.get(str(value or "").lower().strip(), str(value or "none").lower().strip() or "none")

        def plan_label(value):
            return PLAN_LABELS.get(clean_plan(value), "Other")

        def is_free_tester(user):
            if not (user or {}).get("free_tester_access"):
                return False
            until = parse_dt(user.get("free_tester_until"))
            return not until or until >= datetime.now(timezone.utc)

        def is_trial(user):
            end = parse_dt((user or {}).get("trial_ends_at") or (user or {}).get("trial_end"))
            return str((user or {}).get("subscription_status") or "").lower() == "trialing" and bool(end and end >= datetime.now(timezone.utc))

        def is_paid(user):
            return str((user or {}).get("subscription_status") or "").lower() in {"active", "paid"} and not is_free_tester(user)

        def access_for(user):
            status = str((user or {}).get("subscription_status") or "").lower()
            plan = clean_plan((user or {}).get("plan"))
            if email_of(user) == OWNER_EMAIL:
                return plan or "enterprise", status or "active", True, None
            if is_free_tester(user):
                return plan if plan != "none" else "pro", "tester_free", True, None
            verified = bool((user or {}).get("checkout_verified_by_stripe") or (user or {}).get("stripe_subscription_id") or (user or {}).get("stripe_customer_id"))
            if not verified:
                return "none", "plan_required", False, "choose_plan_in_stripe"
            if status in {"active", "paid"} or is_trial(user):
                return plan, status, True, None
            return plan or "none", status or "payment_required", False, "payment_required"

        def safe_doc(doc):
            out = dict(doc or {})
            if "_id" in out:
                out["id"] = str(out["_id"])
                out["_id"] = str(out["_id"])
            for key, value in list(out.items()):
                if isinstance(value, datetime):
                    out[key] = value.isoformat()
                elif ObjectId is not None and isinstance(value, ObjectId):
                    out[key] = str(value)
            out["plan_name"] = plan_label(out.get("plan"))
            out["is_free_tester"] = is_free_tester(out)
            out["is_paid_plan"] = is_paid(out)
            out["is_trialing"] = is_trial(out)
            return out

        async def require_owner(request: Request):
            user = await get_current_user(request)
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

        def lifecycle_template(kind: str, user: dict):
            name = safe_text(user.get("name") or user.get("full_name"), "there")
            business = safe_text(user.get("business_name") or user.get("company"), "your business")
            plan = plan_label(user.get("plan"))
            links = {"setup": f"{FRONTEND_URL}/dashboard#setupassistant", "plans": f"{FRONTEND_URL}/plans", "command": f"{FRONTEND_URL}/dashboard#command"}
            templates = {
                "welcome": ("Welcome to Churvox", f"Hi {name}, welcome to Churvox. Set up {business}, choose your plan, and Churvox will guide you through the first job-to-invoice flow.", links["setup"], "Open setup guide"),
                "trial_started": ("Your Churvox trial is active", f"Hi {name}, your Churvox {plan} trial is active. Finish setup now so Churvox can start preparing admin work for owner approval.", links["setup"], "Finish setup"),
                "setup_nudge": ("Finish setting up Churvox", f"Hi {name}, your account is ready but setup still needs attention. Add your business details, first client, first job and first invoice path.", links["setup"], "Continue setup"),
                "trial_ending": ("Your Churvox trial is ending soon", f"Hi {name}, your Churvox trial is nearly finished. Keep access open by confirming your plan before the trial ends.", links["plans"], "Keep Churvox active"),
                "payment_required": ("Keep using Churvox", f"Hi {name}, your trial has ended or billing needs attention. Choose or confirm a plan to keep Churvox running for {business}.", links["plans"], "Open plans"),
                "tester_welcome": ("Your Churvox tester access is ready", f"Hi {name}, tester access has been opened for you. Please use Churvox like a real business and send feedback on anything confusing or broken.", links["command"], "Open Churvox"),
            }
            subject, intro, link, cta = templates.get(kind, templates["welcome"])
            html = _wrap(f"<h1 style='margin:0 0 12px;font-size:24px;'>{_html.escape(subject)}</h1><p style='font-size:15px;color:#334155;'>{_html.escape(intro)}</p>{_button(cta, link)}<p style='font-size:13px;color:#64748b;'>Churvox does the admin. You approve.</p>")
            return {"subject": subject, "html": html, "text": f"{subject}\n\n{intro}\n\n{cta}: {link}"}

        async def send_lifecycle_email(user: dict, kind: str, actor: str = "system"):
            tpl = lifecycle_template(kind, user)
            to = email_of(user)
            if not to:
                return {"success": False, "email_sent": False, "error": "No user email"}
            result = await _PROVIDER.send(to, tpl["subject"], tpl["html"], tpl["text"])
            event = {"created_at": datetime.now(timezone.utc), "template": kind, "to": to, "user_id": str(user.get("_id") or user.get("id") or ""), "business_name": user.get("business_name"), "subject": tpl["subject"], "sent": bool(result.success), "provider": result.provider, "error": result.error, "actor": actor}
            try:
                await db.lifecycle_emails.insert_one(event)
                if kind == "welcome" and result.success:
                    await db.users.update_one({"_id": user.get("_id")}, {"$set": {"welcome_email_sent_at": datetime.now(timezone.utc)}})
            except Exception:
                pass
            return {"success": True, "email_sent": bool(result.success), "provider": result.provider, "error": result.error, "template": kind, "subject": tpl["subject"]}

        @router.post("/support/contact")
        async def churvox_support_contact(payload: dict):
            message = str(payload.get("message") or "").strip()
            if not message:
                return {"success": False, "error": "Message is required"}
            subject = f"Churvox support: {payload.get('help_type') or 'Support request'}"
            text = f"From: {payload.get('user_name') or 'Unknown'} <{payload.get('user_email') or 'no email'}>\nBusiness: {payload.get('business_name') or 'Not supplied'}\nPage: {payload.get('page_url') or 'Not supplied'}\n\n{message}"
            html = _wrap(f"<h2>Churvox support request</h2><pre style='white-space:pre-wrap;font-family:system-ui'>{_html.escape(text)}</pre>")
            result = await _PROVIDER.send("hello@churvox.com", subject, html, text)
            return {"success": result.success, "message": "Support message sent" if result.success else "Support email failed", "error": result.error}

        @router.get("/auth/me")
        async def hq_auth_me(request: Request):
            user = await get_current_user(request)
            plan, status, has_access, lock_reason = access_for(user)
            return {"id": str(user.get("id") or user.get("_id") or ""), "email": user.get("email"), "name": user.get("name"), "business_name": user.get("business_name"), "role": user.get("role", "employer"), "plan": plan, "plan_name": plan_label(plan), "subscription_status": status, "trial_ends_at": safe_doc(user).get("trial_ends_at"), "free_tester_access": is_free_tester(user), "free_tester_until": safe_doc(user).get("free_tester_until"), "has_app_access": has_access, "billing_lock_reason": lock_reason, "email_verified": user.get("email_verified"), "gst_rate": user.get("gst_rate"), "trade_type": user.get("trade_type", "other"), "business_id": str(user.get("business_id") or user.get("id") or user.get("_id") or "")}

        @router.get("/billing/subscription-status")
        async def hq_billing_status(request: Request):
            user = await get_current_user(request)
            owner_id = obj_id(user.get("business_id") or user.get("id") or user.get("_id"))
            owner = await db.users.find_one({"_id": owner_id}) if owner_id else None
            owner = owner or user
            plan, status, has_access, lock_reason = access_for(owner)
            return {"plan": plan, "plan_name": plan_label(plan), "subscription_status": status, "trial_ends_at": safe_doc(owner).get("trial_ends_at"), "stripe_customer_id": owner.get("stripe_customer_id"), "stripe_subscription_id": owner.get("stripe_subscription_id"), "free_tester_access": is_free_tester(owner), "free_tester_until": safe_doc(owner).get("free_tester_until"), "has_app_access": has_access, "billing_lock_reason": lock_reason, "billing_country": owner.get("billing_country", "NZ")}

        @router.get("/admin/owner/plan-report")
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

        @router.post("/admin/owner/grant-free-tester")
        async def grant_free_tester(request: Request, payload: dict = Body(default={})):
            owner = await require_owner(request)
            user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
            days = max(1, min(int(payload.get("days") or 30), 365))
            plan = clean_plan(payload.get("plan") or "operator")
            until = datetime.now(timezone.utc) + timedelta(days=days)
            update = {"free_tester_access": True, "free_tester_until": until, "free_tester_note": safe_text(payload.get("note")), "free_tester_granted_at": datetime.now(timezone.utc), "free_tester_granted_by": owner.get("email"), "plan": plan, "subscription_status": "tester_free", "checkout_verified_by_stripe": True, "billing_lock_reason": None}
            await db.users.update_one({"_id": user["_id"]}, {"$set": update})
            user.update(update)
            email_result = await send_lifecycle_email(user, "tester_welcome", actor=owner.get("email")) if payload.get("send_email", True) else None
            return {"success": True, "message": "Free tester access granted", "user": safe_doc(user), "email": email_result}

        @router.post("/admin/owner/revoke-free-tester")
        async def revoke_free_tester(request: Request, payload: dict = Body(default={})):
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
            return {"success": True, "templates": ["welcome", "trial_started", "setup_nudge", "trial_ending", "payment_required", "tester_welcome"]}

        @router.post("/admin/owner/send-lifecycle-email")
        async def owner_send_lifecycle_email(request: Request, payload: dict = Body(default={})):
            owner = await require_owner(request)
            user = await find_user(payload.get("identifier") or payload.get("email") or payload.get("user_id"))
            return await send_lifecycle_email(user, safe_text(payload.get("template"), "welcome"), actor=owner.get("email"))

        @router.post("/lifecycle/welcome")
        async def send_signup_welcome(request: Request):
            user = await get_current_user(request)
            if user.get("welcome_email_sent_at"):
                return {"success": True, "email_sent": False, "message": "Welcome email already sent"}
            return await send_lifecycle_email(user, "welcome", actor="signup")

        _SUPPORT_ROUTE_REGISTERED = True
    except Exception:
        return


def get_email_provider():
    _maybe_register_support_route()
    return _PROVIDER
