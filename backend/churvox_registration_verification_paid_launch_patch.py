from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-registration-verification-paid-launch-20260712"
TERMS_VERSION = "2026-07-12"
PRIVACY_VERSION = "2026-07-12"
PLAN_ALIASES = {
    "start": "start", "solo": "start",
    "crew": "crew", "team": "crew",
    "operator": "operator", "pro": "operator",
    "command": "command", "enterprise": "command",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _lower(value) in {"1", "true", "yes", "on", "accepted", "agree", "agreed"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def verification_token_hash(token: str) -> str:
    return hashlib.sha256(_text(token).encode("utf-8", "ignore")).hexdigest()


def selected_plan(value: Any) -> str:
    return PLAN_ALIASES.get(_lower(value), "operator")


def industry_key(value: Any) -> str:
    clean = re.sub(r"[^a-z0-9_-]+", "_", _lower(value)).strip("_")
    return clean[:64] or "other"


def _route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path: str, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route, path, method)]
    except Exception:
        pass


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    Body = getattr(module, "Body", None)
    Response = getattr(module, "Response", None)
    HTTPException = getattr(module, "HTTPException", None)
    ObjectId = getattr(module, "ObjectId", None)
    hash_password = getattr(module, "hash_password", None)
    create_access_token = getattr(module, "create_access_token", None)
    create_refresh_token = getattr(module, "create_refresh_token", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    auth_user_response = getattr(module, "_auth_user_response", None)
    normalize_country = getattr(module, "normalize_billing_country", None)
    email_provider = getattr(module, "email_provider", None)
    build_verification_email = getattr(module, "build_verification_email", None)
    secrets = getattr(module, "secrets", None)
    os = getattr(module, "os", None)
    FRONTEND_URL = getattr(module, "FRONTEND_URL", "https://www.churvox.com")
    DEFAULT_GST_RATE = getattr(module, "DEFAULT_GST_RATE", 0.15)
    if any(item is None for item in (
        app, db, Body, Response, HTTPException, ObjectId, hash_password,
        create_access_token, create_refresh_token, set_auth_cookies,
        auth_user_response, normalize_country, email_provider,
        build_verification_email, secrets, os,
    )):
        return
    if getattr(app.state, "churvox_registration_verification_paid_launch", False):
        return

    async def _find_email(email: str):
        found = await db.users.find_one({"email": email})
        if found:
            return found
        return await db.users.find_one({"email": re.compile(f"^{re.escape(email)}$", re.IGNORECASE)})

    async def secure_send_verification_email(user_doc: dict, user_id: str):
        email = _lower(user_doc.get("email"))
        if not email:
            return {"sent": False, "error": "Missing email", "provider": "", "email_id": ""}
        user_oid = ObjectId(str(user_id))
        now = _now()
        await db.email_verification_tokens.update_many(
            {"user_id": user_oid, "used": False},
            {"$set": {"used": True, "replaced_at": now}},
        )
        raw_token = secrets.token_urlsafe(32)
        await db.email_verification_tokens.insert_one({
            "token_hash": verification_token_hash(raw_token),
            "token_last4": raw_token[-4:],
            "user_id": user_oid,
            "email": email,
            "expires_at": now + timedelta(hours=24),
            "used": False,
            "created_at": now,
            "version": VERSION,
        })
        frontend = _text(os.environ.get("FRONTEND_URL") or FRONTEND_URL).rstrip("/")
        verify_link = f"{frontend}/verify-email?token={raw_token}"
        content = build_verification_email(user_doc.get("name", "there"), verify_link)
        try:
            result = await email_provider.send(to=email, subject=content["subject"], html=content["html"])
            sent = bool(result.success)
            provider = result.provider
            email_id = result.email_id
            error = result.error
        except Exception as exc:
            sent = False
            provider = ""
            email_id = ""
            error = str(exc)
        await db.email_verification_emails.insert_one({
            "to": email,
            "user_id": user_oid,
            "token_last4": raw_token[-4:],
            "status": "sent" if sent else "failed",
            "provider": provider,
            "email_id": email_id,
            "error": error,
            "created_at": now,
            "version": VERSION,
        })
        return {"sent": sent, "provider": provider, "email_id": email_id, "error": error}

    module.send_verification_email_for_user = secure_send_verification_email

    async def secure_register(payload: dict = Body(default={}), response: Response = None):
        payload = payload or {}
        email = _lower(payload.get("email"))
        password = _text(payload.get("password"))
        name = _text(payload.get("name"))
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            raise HTTPException(status_code=400, detail="Enter a valid email address")
        if not name:
            raise HTTPException(status_code=400, detail="Name is required")
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if len(password) > 128:
            raise HTTPException(status_code=400, detail="Password must be no more than 128 characters")
        if not _truthy(payload.get("terms_accepted")) or not _truthy(payload.get("privacy_accepted")):
            raise HTTPException(status_code=400, detail="Accept the Terms of Service and Privacy Policy to create an account")
        if await _find_email(email):
            raise HTTPException(status_code=400, detail="Email already registered")

        now = _now()
        country = normalize_country(payload.get("billing_country") or payload.get("country") or "NZ")
        plan_intent = selected_plan(payload.get("selected_plan") or payload.get("plan_choice"))
        industry = industry_key(payload.get("trade_industry_type") or payload.get("industry_mode") or payload.get("business_type"))
        business_type = _text(payload.get("business_type"))[:120]
        consent = {
            "terms_accepted": True,
            "terms_version": TERMS_VERSION,
            "privacy_accepted": True,
            "privacy_version": PRIVACY_VERSION,
            "consent_recorded_at": now,
            "consent_source": "signup_form",
        }
        user_doc = {
            "email": email,
            "password_hash": hash_password(password),
            "name": name[:160],
            "business_name": _text(payload.get("business_name"))[:180] or None,
            "role": "employer",
            "user_role": "employer",
            "status": "pending_verification",
            "email_verified": False,
            "email_verified_at": None,
            "plan": "none",
            "ui_plan": "none",
            "selected_plan": plan_intent,
            "plan_choice": plan_intent,
            "subscription_status": "none",
            "trial_ends_at": None,
            "has_app_access": False,
            "billing_lock_reason": "verify_email_and_choose_plan",
            "gst_rate": DEFAULT_GST_RATE,
            "trade_type": industry,
            "trade_industry_type": industry,
            "industry_mode": industry,
            "business_type": business_type or industry,
            "billing_country": country,
            "country": country,
            **consent,
            "created_at": now,
            "updated_at": now,
            "version": VERSION,
        }
        try:
            result = await db.users.insert_one(user_doc)
        except Exception as exc:
            if "duplicate" in _lower(exc):
                raise HTTPException(status_code=400, detail="Email already registered")
            raise
        user_doc["_id"] = result.inserted_id
        user_doc["business_id"] = result.inserted_id
        await db.users.update_one({"_id": result.inserted_id}, {"$set": {"business_id": result.inserted_id}})
        try:
            await db.legal_consents.insert_one({
                "user_id": result.inserted_id,
                "business_id": result.inserted_id,
                "email": email,
                **consent,
                "created_at": now,
                "version": VERSION,
            })
        except Exception:
            pass

        try:
            verification = await secure_send_verification_email(user_doc, str(result.inserted_id))
        except Exception as exc:
            verification = {"sent": False, "provider": "", "email_id": "", "error": str(exc)}
        access = create_access_token(str(result.inserted_id), email)
        refresh = create_refresh_token(str(result.inserted_id))
        set_auth_cookies(response, access, refresh)
        data = auth_user_response(user_doc, access)
        data.update({
            "email_verified": False,
            "email_verification_sent": bool(verification.get("sent")),
            "email_verification_provider": verification.get("provider", ""),
            "email_verification_email_id": verification.get("email_id", ""),
            "email_verification_error": verification.get("error", ""),
            "consent_recorded": True,
            "terms_version": TERMS_VERSION,
            "privacy_version": PRIVACY_VERSION,
            "selected_plan": plan_intent,
            "version": VERSION,
        })
        if isinstance(data.get("user"), dict):
            data["user"].update({
                "email_verified": False,
                "has_app_access": False,
                "billing_lock_reason": "verify_email_and_choose_plan",
                "selected_plan": plan_intent,
            })
        return data

    async def secure_verify_email(token: str):
        clean = _text(token)
        if not clean or len(clean) > 512:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")
        now = _now()
        token_doc = await db.email_verification_tokens.find_one({
            "$or": [{"token_hash": verification_token_hash(clean)}, {"token": clean}],
            "used": False,
            "expires_at": {"$gt": now},
        })
        if not token_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")
        user_doc = await db.users.find_one({"_id": token_doc.get("user_id")})
        if not user_doc or _lower(user_doc.get("email")) != _lower(token_doc.get("email")):
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")

        claimed = await db.email_verification_tokens.update_one(
            {"_id": token_doc["_id"], "used": False, "expires_at": {"$gt": now}},
            {"$set": {"used": True, "used_at": now, "verified_version": VERSION}},
        )
        if int(getattr(claimed, "modified_count", 0) or 0) != 1:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")
        updated = await db.users.update_one(
            {"_id": token_doc["user_id"], "email": user_doc.get("email")},
            {"$set": {
                "email_verified": True,
                "email_verified_at": now,
                "status": "active",
                "billing_lock_reason": "choose_plan",
                "updated_at": now,
                "version": VERSION,
            }},
        )
        if int(getattr(updated, "matched_count", 0) or 0) != 1:
            raise HTTPException(status_code=400, detail="Invalid or expired verification link")
        await db.email_verification_tokens.update_many(
            {"user_id": token_doc["user_id"], "used": False},
            {"$set": {"used": True, "invalidated_at": now}},
        )
        current = await db.users.find_one({"_id": token_doc["user_id"]})
        safe_user = auth_user_response(current) if current else {"success": True}
        safe_user.update({"message": "Email verified", "email_verified": True, "version": VERSION})
        return safe_user

    secure_register.__annotations__ = {"payload": dict, "response": Response}
    secure_verify_email.__annotations__ = {"token": str}
    _remove_route(app, "/api/auth/register", "POST")
    _remove_route(app, "/api/auth/verify-email/{token}", "GET")
    app.add_api_route("/api/auth/register", secure_register, methods=["POST"])
    app.add_api_route("/api/auth/verify-email/{token}", secure_verify_email, methods=["GET"])
    app.state.churvox_registration_verification_paid_launch = VERSION
