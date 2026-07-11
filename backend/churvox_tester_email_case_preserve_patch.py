from __future__ import annotations

from datetime import datetime, timezone, timedelta
import html
import os
from urllib.parse import urlencode

from fastapi import Body, HTTPException, Request

INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
PLAN_ALIAS = {"start": "solo", "solo": "solo", "crew": "team", "team": "team", "operator": "pro", "pro": "pro", "command": "enterprise", "enterprise": "enterprise"}
PACK_LABELS = {"full_access": "Full tester access", "command_growth_pack": "Command Growth Pack", "accounting_sync": "Accounting Sync Add-on", "operator_pack": "Operator free pack", "command_pack": "Command free pack"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def email_of(doc):
    return lower((doc or {}).get("email") or (doc or {}).get("canonical_email") or (doc or {}).get("user_email") or (doc or {}).get("owner_email") or (doc or {}).get("tester_email"))


def display_email_of(doc):
    return clean((doc or {}).get("display_email") or (doc or {}).get("original_email") or (doc or {}).get("typed_email") or (doc or {}).get("email") or (doc or {}).get("user_email") or (doc or {}).get("tester_email"))


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
            if any(word in str(key).lower() for word in ["password", "hash", "token", "secret"]):
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
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    try:
        from email_provider import get_email_provider
    except Exception:
        try:
            from backend.email_provider import get_email_provider
        except Exception:
            get_email_provider = None
    mailer = get_email_provider() if get_email_provider else None

    def oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def current_user_doc(request: Request):
        current = await get_current_user(request)
        uid = oid(current.get("id") or current.get("_id") or current.get("user_id"))
        user_doc = await db.users.find_one({"_id": uid}) if uid else None
        if not user_doc and current.get("email"):
            user_doc = await db.users.find_one({"email": lower(current.get("email"))})
        return user_doc or dict(current)

    async def require_owner(request: Request):
        user = await current_user_doc(request)
        if email_of(user) != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    async def grant_if_existing_tester(user_doc, tester_doc):
        if not user_doc or "_id" not in user_doc:
            return user_doc
        pack = lower(tester_doc.get("pack") or "full_access") or "full_access"
        until = tester_doc.get("free_until") or (now_utc() + timedelta(days=int(tester_doc.get("days") or 90)))
        update = {
            "free_tester_access": True,
            "free_tester_until": until,
            "free_tester_note": clean(tester_doc.get("note")),
            "plan": plan_key(tester_doc.get("plan") or "operator"),
            "subscription_status": "tester_free",
            "checkout_verified_by_stripe": True,
            "billing_lock_reason": None,
            "has_app_access": True,
            "app_owner_free_pack": pack,
            "app_owner_free_pack_label": PACK_LABELS.get(pack, pack),
            "display_email": tester_doc.get("display_email"),
            "original_email": tester_doc.get("original_email"),
            "canonical_email": tester_doc.get("email"),
            "updated_at": now_utc(),
        }
        await db.users.update_one({"_id": user_doc["_id"]}, {"$set": update})
        user_doc.update(update)
        return user_doc

    async def send_tester_email(email, display_email, payload, existing, access_link):
        if not mailer:
            return {"email_sent": False, "error": "Email provider unavailable"}
        safe_name = html.escape(clean(payload.get("name")) or clean((existing or {}).get("name")) or "there")
        safe_email = html.escape(display_email or email)
        link = html.escape(access_link, quote=True)
        subject = "Your Churvox tester access"
        action_text = "Sign in to Churvox" if existing else "Open Churvox signup"
        body_line = "Your Churvox tester access is now active. Sign in with this email." if existing else f"You have been added as a Churvox tester. Use the button below and sign up with <strong>{safe_email}</strong>."
        next_line = "No Stripe checkout is needed for this tester access." if existing else "After signup, Churvox will unlock your tester access automatically. No Stripe checkout is needed."
        html_body = f"""
        <div style='font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;background:#f8fafc;padding:24px;'>
          <div style='max-width:560px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:14px;padding:28px;'>
            <h2 style='margin:0 0 12px;'>Your Churvox tester access is ready</h2>
            <p>Hi {safe_name},</p>
            <p>{body_line}</p>
            <p>{next_line}</p>
            <p><a href='{link}' style='display:inline-block;background:#0f172a;color:white;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:800;'>{action_text}</a></p>
            <p style='font-size:13px;color:#64748b;'>If the button does not work, copy this link:<br><a href='{link}'>{link}</a></p>
            <p style='font-size:13px;color:#64748b;'>Thanks,<br>Churvox</p>
          </div>
        </div>
        """
        text_body = f"Your Churvox tester access is ready. {'Sign in' if existing else 'Sign up'} with {display_email or email}: {access_link}"
        try:
            sent = await mailer.send(email, subject, html_body, text_body)
            return {"email_sent": bool(getattr(sent, "success", False)), "provider": getattr(sent, "provider", None), "error": getattr(sent, "error", None)}
        except Exception as exc:
            return {"email_sent": False, "error": str(exc)}

    async def tester_intake(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        typed_email = clean(payload.get("display_email") or payload.get("original_email") or payload.get("email"))
        email = lower(typed_email)
        if not email or "@" not in email:
            raise HTTPException(status_code=400, detail="Tester email is required")
        plan = plan_key(payload.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 90), 1095))
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        until = now_utc() + timedelta(days=days)
        existing = await db.users.find_one({"email": email})
        tester_doc = {
            "email": email,
            "canonical_email": email,
            "display_email": typed_email,
            "original_email": typed_email,
            "name": clean(payload.get("name")),
            "business_name": clean(payload.get("business_name")),
            "plan": plan,
            "pack": pack,
            "pack_label": PACK_LABELS.get(pack, pack),
            "days": days,
            "free_until": until,
            "note": clean(payload.get("note")),
            "status": "access_granted" if existing else "pending_signup",
            "created_by": email_of(owner),
            "updated_at": now_utc(),
        }
        if existing:
            tester_doc["user_id"] = str(existing.get("_id"))
        await db.app_owner_testers.update_one({"email": email}, {"$set": tester_doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        if existing:
            existing = await grant_if_existing_tester(existing, tester_doc)
        link_path = "/login" if existing else "/signup"
        query = {"email": email}
        if not existing:
            query["tester"] = "1"
        access_link = f"{front_url()}{link_path}?{urlencode(query)}"
        email_status = {"email_sent": False, "skipped": True}
        if payload.get("send_email", True):
            email_status = await send_tester_email(email, typed_email, payload, existing, access_link)
        result = {"tester": tester_doc, "access_link": access_link, "email": email_status}
        await db.app_owner_control_log.insert_one({"created_at": now_utc(), "owner_email": email_of(owner), "action": "tester_intake", "target_email": email, "display_email": typed_email, "payload": safe({**payload, "email": email, "display_email": typed_email, "original_email": typed_email}), "result": safe(result)})
        return safe({
            "success": True,
            "message": "Tester email sent" if email_status.get("email_sent") else "Tester saved; send them the signup link",
            "tester": tester_doc,
            "user": existing,
            "signup_link": None if existing else access_link,
            "login_link": access_link if existing else None,
            "email": email_status,
        })

    remove_route(app, "/api/admin/owner/tester-intake", "POST")
    app.add_api_route("/api/admin/owner/tester-intake", tester_intake, methods=["POST"])
    INSTALLED.add(module_name)
