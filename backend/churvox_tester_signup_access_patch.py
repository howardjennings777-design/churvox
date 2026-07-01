from __future__ import annotations

from datetime import datetime, timezone, timedelta
import html
import os
from urllib.parse import urlencode

OWNER_EMAIL = "hello@churvox.com"
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PACK_LABELS = {"full_access": "Full tester access", "command_growth_pack": "Command Growth Pack", "accounting_sync": "Accounting Sync Add-on", "operator_pack": "Operator free pack", "command_pack": "Command free pack"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def plan_key(value, default="pro"):
    return PLAN_ALIAS.get(lower(value), default)


def front_url():
    return clean(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com").rstrip("/")


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["secret", "hash"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not route_matches(r, path, method)]
    except Exception:
        pass


def parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def user_payload(user_doc):
    bid = str(user_doc.get("business_id") or user_doc.get("_id") or user_doc.get("id") or "")
    uid = str(user_doc.get("_id") or user_doc.get("id") or "")
    return safe({
        "success": True,
        "id": uid,
        "email": user_doc.get("email"),
        "name": user_doc.get("name") or user_doc.get("business_name") or "Churvox user",
        "business_name": user_doc.get("business_name"),
        "role": user_doc.get("role") or "employer",
        "plan": user_doc.get("plan") or "none",
        "subscription_status": user_doc.get("subscription_status") or "none",
        "trial_ends_at": user_doc.get("trial_ends_at"),
        "free_tester_access": bool(user_doc.get("free_tester_access")),
        "free_tester_until": user_doc.get("free_tester_until"),
        "has_app_access": bool(user_doc.get("has_app_access")),
        "billing_lock_reason": user_doc.get("billing_lock_reason"),
        "email_verified": user_doc.get("email_verified"),
        "gst_rate": user_doc.get("gst_rate"),
        "trade_type": user_doc.get("trade_type", "other"),
        "business_id": bid,
        "user": {
            "id": uid,
            "email": user_doc.get("email"),
            "name": user_doc.get("name") or user_doc.get("business_name") or "Churvox user",
            "business_name": user_doc.get("business_name"),
            "role": user_doc.get("role") or "employer",
            "plan": user_doc.get("plan") or "none",
            "subscription_status": user_doc.get("subscription_status") or "none",
            "free_tester_access": bool(user_doc.get("free_tester_access")),
            "has_app_access": bool(user_doc.get("has_app_access")),
            "business_id": bid,
        },
    })


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    Body = getattr(module, "Body", None)
    HTTPException = getattr(module, "HTTPException", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Request is None or Body is None or HTTPException is None or ObjectId is None:
        return

    try:
        from email_provider import get_email_provider
    except Exception:
        from backend.email_provider import get_email_provider
    mailer = get_email_provider()

    def obj_id(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if lower(user.get("email")) != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="App owner controls are locked")
        return user

    async def grant_if_tester(user_doc):
        email = lower(user_doc.get("email"))
        if not email:
            return user_doc, None
        tester = await db.app_owner_testers.find_one({"email": email})
        if not tester:
            return user_doc, None
        until = parse_dt(tester.get("free_until")) or parse_dt(tester.get("free_tester_until")) or (now_utc() + timedelta(days=int(tester.get("days") or 60)))
        if until and until < now_utc():
            return user_doc, tester
        plan = plan_key(tester.get("plan") or "operator")
        pack = lower(tester.get("pack") or "full_access") or "full_access"
        update = {
            "free_tester_access": True,
            "free_tester_until": until,
            "free_tester_note": clean(tester.get("note")),
            "plan": plan,
            "subscription_status": "tester_free",
            "checkout_verified_by_stripe": True,
            "billing_lock_reason": None,
            "has_app_access": True,
            "app_owner_free_pack": pack,
            "app_owner_free_pack_label": tester.get("pack_label") or PACK_LABELS.get(pack, pack),
            "app_owner_last_controlled_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.users.update_one({"_id": user_doc["_id"]}, {"$set": update})
        await db.app_owner_testers.update_one({"email": email}, {"$set": {"status": "access_granted", "user_id": str(user_doc["_id"]), "updated_at": now_utc()}})
        user_doc.update(update)
        return user_doc, tester

    async def tester_intake(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        email = lower(payload.get("email"))
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Tester email is required")
        plan = plan_key(payload.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 60), 1095))
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        until = now_utc() + timedelta(days=days)
        pack_label = PACK_LABELS.get(pack, pack)
        existing = await db.users.find_one({"email": email})
        tester_doc = {
            "email": email,
            "name": clean(payload.get("name")),
            "business_name": clean(payload.get("business_name")),
            "plan": plan,
            "pack": pack,
            "pack_label": pack_label,
            "days": days,
            "free_until": until,
            "note": clean(payload.get("note")),
            "status": "pending_signup",
            "created_by": owner.get("email"),
            "updated_at": now_utc(),
        }
        if existing:
            existing, _ = await grant_if_tester(existing)
            tester_doc["status"] = "access_granted"
            tester_doc["user_id"] = str(existing["_id"])
        await db.app_owner_testers.update_one({"email": email}, {"$set": tester_doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        signup_link = f"{front_url()}/signup?{urlencode({'tester': '1', 'email': email})}"
        email_status = {"email_sent": False}
        if payload.get("send_email", True):
            subject = "Your Churvox tester access"
            safe_name = html.escape(clean(payload.get("name")) or "there")
            link = html.escape(signup_link, quote=True)
            html_body = f"""
            <div style='font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;'>
              <div style='max-width:560px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:28px;'>
                <h2 style='margin:0 0 12px;'>Your Churvox tester access is ready</h2>
                <p>Hi {safe_name},</p>
                <p>You have been added as a Churvox tester. Use the button below and sign up with <strong>{html.escape(email)}</strong>.</p>
                <p>After signup, Churvox will unlock your tester access automatically.</p>
                <p><a href='{link}' style='display:inline-block;background:#0f172a;color:white;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:800;'>Open Churvox signup</a></p>
                <p style='font-size:13px;color:#64748b;'>If the button does not work, copy this link:<br><a href='{link}'>{link}</a></p>
              </div>
            </div>
            """
            text_body = f"Your Churvox tester access is ready. Sign up with {email}: {signup_link}"
            try:
                sent = await mailer.send(email, subject, html_body, text_body)
                email_status = {"email_sent": bool(sent.success), "provider": sent.provider, "error": sent.error}
            except Exception as exc:
                email_status = {"email_sent": False, "error": str(exc)}
        await db.app_owner_control_log.insert_one({"created_at": now_utc(), "owner_email": owner.get("email"), "action": "tester_intake", "target_email": email, "payload": safe(payload), "result": safe({"tester": tester_doc, "signup_link": signup_link, "email": email_status})})
        return {"success": True, "message": "Tester access granted" if existing else "Tester email sent" if email_status.get("email_sent") else "Tester saved; send them the signup link", "tester": safe(tester_doc), "user": safe(existing), "signup_link": signup_link, "email": safe(email_status)}

    async def patched_me(request: Request):
        current = await get_current_user(request)
        uid = obj_id(current.get("id") or current.get("_id") or current.get("user_id"))
        user_doc = await db.users.find_one({"_id": uid}) if uid else await db.users.find_one({"email": lower(current.get("email"))})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        user_doc, _ = await grant_if_tester(user_doc)
        return user_payload(user_doc)

    async def patched_billing_status(request: Request):
        current = await get_current_user(request)
        uid = obj_id(current.get("id") or current.get("_id") or current.get("user_id"))
        user_doc = await db.users.find_one({"_id": uid}) if uid else await db.users.find_one({"email": lower(current.get("email"))})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        user_doc, _ = await grant_if_tester(user_doc)
        plan = user_doc.get("plan") or "none"
        return safe({
            "success": True,
            "plan": plan,
            "plan_name": {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}.get(plan, plan),
            "subscription_status": user_doc.get("subscription_status") or "none",
            "trial_ends_at": user_doc.get("trial_ends_at"),
            "stripe_customer_id": user_doc.get("stripe_customer_id"),
            "stripe_subscription_id": user_doc.get("stripe_subscription_id"),
            "free_tester_access": bool(user_doc.get("free_tester_access")),
            "free_tester_until": user_doc.get("free_tester_until"),
            "has_app_access": bool(user_doc.get("has_app_access")),
            "billing_lock_reason": user_doc.get("billing_lock_reason"),
            "billing_country": user_doc.get("billing_country", "NZ"),
        })

    for path, method, endpoint in [
        ("/api/admin/owner/tester-intake", "POST", tester_intake),
        ("/api/auth/me", "GET", patched_me),
        ("/api/billing/subscription-status", "GET", patched_billing_status),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)
