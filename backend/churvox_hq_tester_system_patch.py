from __future__ import annotations

from datetime import datetime, timezone, timedelta
import html
import os
from urllib.parse import urlencode

from fastapi import Body, HTTPException, Request

INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
PLAN_ALIAS = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}
PACK_LABELS = {
    "full_access": "Full tester access",
    "command_growth_pack": "Command Growth Pack",
    "accounting_sync": "Accounting Sync Add-on",
    "operator_pack": "Operator free pack",
    "command_pack": "Command free pack",
}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def display_email_of(doc):
    return clean(
        (doc or {}).get("display_email")
        or (doc or {}).get("original_email")
        or (doc or {}).get("typed_email")
        or (doc or {}).get("email")
        or (doc or {}).get("user_email")
        or (doc or {}).get("tester_email")
        or (doc or {}).get("target_email")
        or (doc or {}).get("to")
    )


def email_of(doc):
    return lower(
        (doc or {}).get("email")
        or (doc or {}).get("canonical_email")
        or (doc or {}).get("user_email")
        or (doc or {}).get("owner_email")
        or (doc or {}).get("tester_email")
        or (doc or {}).get("target_email")
        or (doc or {}).get("to")
        or display_email_of(doc)
    )


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


def is_internal(doc):
    hay = " ".join(str((doc or {}).get(key) or "") for key in ["email", "display_email", "business_name", "name", "company"]).lower()
    return email_of(doc) == OWNER_EMAIL or "example.com" in hay or "sample" in hay or "fake" in hay or "demo" in hay


def normalise_tester(row, source="tester"):
    raw = dict(row or {})
    payload = raw.get("payload") if isinstance(raw.get("payload"), dict) else {}
    result = raw.get("result") if isinstance(raw.get("result"), dict) else {}
    nested = result.get("tester") if isinstance(result.get("tester"), dict) else {}
    base = {**payload, **raw, **nested}
    email = email_of(base)
    display_email = display_email_of(base) or email
    if not email or is_internal(base):
        return None
    status = lower(base.get("status") or base.get("subscription_status") or base.get("tester_status"))
    if not status:
        status = "accepted" if base.get("accepted") else "invited"
    accepted = bool(base.get("accepted")) or status in {"accepted", "access_granted", "active", "signed_up", "signup_complete", "tester_free"}
    active = bool(base.get("active")) or status == "active" or bool(base.get("last_active") or base.get("last_login") or base.get("last_seen"))
    return safe({
        **base,
        "email": email,
        "canonical_email": email,
        "display_email": display_email,
        "original_email": clean(base.get("original_email") or display_email),
        "name": clean(base.get("name") or base.get("full_name") or base.get("business_name") or base.get("company") or display_email),
        "business_name": clean(base.get("business_name") or base.get("company") or base.get("business")),
        "plan": base.get("plan") or base.get("plan_name") or base.get("tier") or "pro",
        "status": status,
        "subscription_status": base.get("subscription_status") or status,
        "accepted": accepted,
        "active": active,
        "source": base.get("source") or source,
        "invited_at": base.get("invited_at") or base.get("created_at") or base.get("updated_at"),
        "accepted_at": base.get("accepted_at") or base.get("free_tester_granted_at"),
        "last_active": base.get("last_active") or base.get("last_login") or base.get("last_seen"),
        "free_tester_until": base.get("free_tester_until") or base.get("free_until") or base.get("until"),
    })


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None:
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
            if ObjectId:
                return ObjectId(str(value))
        except Exception:
            return None
        return None

    async def current_user_doc(request: Request):
        current = await get_current_user(request)
        uid = oid(current.get("id") or current.get("_id") or current.get("user_id")) if isinstance(current, dict) else None
        user_doc = await db.users.find_one({"_id": uid}) if uid else None
        if not user_doc and isinstance(current, dict) and current.get("email"):
            user_doc = await db.users.find_one({"email": lower(current.get("email"))})
        return user_doc or dict(current or {})

    async def require_owner(request: Request):
        user = await current_user_doc(request)
        if email_of(user) != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return user

    async def find_user(email):
        canonical = lower(email)
        if not canonical:
            return None
        return await db.users.find_one({"$or": [{"email": canonical}, {"canonical_email": canonical}]})

    async def read_collection(name, query, limit=1000):
        try:
            names = set(await db.list_collection_names())
            if name not in names:
                return []
            cursor = db[name].find(query)
            try:
                cursor = cursor.sort("updated_at", -1)
            except Exception:
                try:
                    cursor = cursor.sort("created_at", -1)
                except Exception:
                    pass
            return await cursor.limit(limit).to_list(length=limit)
        except Exception:
            return []

    async def send_tester_email(canonical_email, display_email, payload, existing, access_link):
        if not mailer:
            return {"email_sent": False, "skipped": True, "error": "Email provider unavailable"}
        safe_name = html.escape(clean(payload.get("name")) or clean((existing or {}).get("name")) or "there")
        safe_email = html.escape(display_email or canonical_email)
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
        text_body = f"Your Churvox tester access is ready. {'Sign in' if existing else 'Sign up'} with {display_email or canonical_email}: {access_link}"
        try:
            sent = await mailer.send(canonical_email, subject, html_body, text_body)
            return {"email_sent": bool(getattr(sent, "success", False)), "provider": getattr(sent, "provider", None), "error": getattr(sent, "error", None)}
        except Exception as exc:
            return {"email_sent": False, "error": str(exc)}

    async def grant_existing_user(user_doc, tester_doc):
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
            "canonical_email": tester_doc.get("email"),
            "display_email": tester_doc.get("display_email"),
            "original_email": tester_doc.get("original_email"),
            "updated_at": now_utc(),
        }
        await db.users.update_one({"_id": user_doc["_id"]}, {"$set": update})
        user_doc.update(update)
        return user_doc

    async def tester_intake(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        typed_email = clean(payload.get("display_email") or payload.get("original_email") or payload.get("email"))
        canonical_email = lower(typed_email)
        if not canonical_email or "@" not in canonical_email:
            raise HTTPException(status_code=400, detail="Tester email is required")
        plan = plan_key(payload.get("plan") or "operator")
        days = max(1, min(int(payload.get("days") or 90), 1095))
        pack = lower(payload.get("pack") or "full_access") or "full_access"
        until = now_utc() + timedelta(days=days)
        existing = await find_user(canonical_email)
        tester_doc = {
            "email": canonical_email,
            "canonical_email": canonical_email,
            "display_email": typed_email,
            "original_email": typed_email,
            "name": clean(payload.get("name")),
            "business_name": clean(payload.get("business_name")),
            "plan": plan,
            "pack": pack,
            "pack_label": PACK_LABELS.get(pack, pack),
            "days": days,
            "free_until": until,
            "free_tester_until": until,
            "note": clean(payload.get("note")),
            "status": "access_granted" if existing else "pending_signup",
            "created_by": email_of(owner),
            "updated_at": now_utc(),
        }
        if existing:
            tester_doc["user_id"] = str(existing.get("_id"))
        await db.app_owner_testers.update_one({"email": canonical_email}, {"$set": tester_doc, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        if existing:
            existing = await grant_existing_user(existing, tester_doc)
        link_path = "/login" if existing else "/signup"
        query = {"email": canonical_email}
        if not existing:
            query["tester"] = "1"
        access_link = f"{front_url()}{link_path}?{urlencode(query)}"
        email_status = {"email_sent": False, "skipped": True}
        if payload.get("send_email", True):
            email_status = await send_tester_email(canonical_email, typed_email, payload, existing, access_link)
        result = {"tester": tester_doc, "access_link": access_link, "email": email_status}
        await db.app_owner_control_log.insert_one({
            "created_at": now_utc(),
            "owner_email": email_of(owner),
            "action": "tester_intake",
            "target_email": canonical_email,
            "display_email": typed_email,
            "payload": safe({**payload, "email": canonical_email, "canonical_email": canonical_email, "display_email": typed_email, "original_email": typed_email}),
            "result": safe(result),
        })
        return safe({
            "success": True,
            "message": "Tester email sent" if email_status.get("email_sent") else "Tester saved; send them the signup link",
            "tester": tester_doc,
            "user": existing,
            "signup_link": None if existing else access_link,
            "login_link": access_link if existing else None,
            "email": email_status,
        })

    async def testers_endpoint(request: Request):
        await require_owner(request)
        users = await read_collection("users", {"$or": [
            {"free_tester_access": True},
            {"subscription_status": "tester_free"},
            {"is_tester": True},
            {"tester_access": True},
            {"tester_invited": True},
            {"free_tester_until": {"$exists": True}},
            {"free_tester_granted_at": {"$exists": True}},
        ]}, 1000)
        invites = await read_collection("app_owner_testers", {}, 1000)
        control_log = await read_collection("app_owner_control_log", {"action": "tester_intake"}, 1000)

        merged = {}
        for row, source in [(row, "user") for row in users] + [(row, "invite") for row in invites] + [(row, "control log") for row in control_log]:
            tester = normalise_tester(row, source)
            if not tester:
                continue
            key = tester.get("email")
            current = merged.get(key, {})
            merged[key] = {**current, **tester, "source": source if not current.get("source") else f"{current.get('source')}, {source}"}

        testers = sorted(merged.values(), key=lambda item: str(item.get("invited_at") or item.get("updated_at") or ""), reverse=True)
        accepted = [item for item in testers if item.get("accepted")]
        active = [item for item in testers if item.get("active")]
        invited = [item for item in testers if not item.get("accepted")]
        return safe({
            "success": True,
            "source": "churvox_hq_tester_system",
            "generated_at": now_utc(),
            "counts": {
                "total": len(testers),
                "accepted": len(accepted),
                "active": len(active),
                "invited_not_accepted": len(invited),
            },
            "testers": testers,
            "accepted_testers": accepted,
            "active_testers": active,
            "invited_testers": invited,
        })

    for method, path, endpoint in [
        ("POST", "/api/admin/owner/tester-intake", tester_intake),
        ("GET", "/api/admin/owner/testers", testers_endpoint),
        ("GET", "/api/admin/owner/tester-status", testers_endpoint),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(module_name)
