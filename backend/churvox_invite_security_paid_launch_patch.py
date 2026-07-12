from __future__ import annotations

import hashlib
import re
from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-invite-security-paid-launch-20260712"
WORKER_ROLES = {"worker", "staff", "field_worker", "technician", "subcontractor", "employee"}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin", "super_admin"}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def token_hash(token: str) -> str:
    return hashlib.sha256(_text(token).encode("utf-8", "ignore")).hexdigest()


def worker_invite_record(user: dict | None, token_doc: dict | None) -> bool:
    user = user or {}
    token_doc = token_doc or {}
    role = _lower(user.get("role") or user.get("user_role") or user.get("worker_role")).replace("-", "_").replace(" ", "_")
    user_business = _text(user.get("business_id") or user.get("owner_business_id"))
    token_business = _text(token_doc.get("business_id"))
    token_user = _text(token_doc.get("user_id"))
    user_id = _text(user.get("_id") or user.get("id"))
    return bool(
        role in WORKER_ROLES
        and _lower(user.get("status")) == "invited"
        and user_business
        and token_business
        and user_business == token_business
        and token_user
        and user_id == token_user
    )


def owner_business_record(owner: dict | None, business_id: Any) -> bool:
    owner = owner or {}
    role = _lower(owner.get("role") or owner.get("user_role") or owner.get("account_type")).replace("-", "_").replace(" ", "_")
    owner_id = _text(owner.get("_id") or owner.get("id"))
    owner_business = _text(owner.get("business_id") or owner_id)
    wanted = _text(business_id)
    return bool(role in OWNER_ROLES and wanted and (owner_id == wanted or owner_business == wanted))


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
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    Body = getattr(module, "Body", None)
    Request = getattr(module, "Request", None)
    Depends = getattr(module, "Depends", None)
    get_current_user = getattr(module, "get_current_user", None)
    get_user_business_id = getattr(module, "get_user_business_id", None)
    require_employer = getattr(module, "require_employer", None)
    hash_password = getattr(module, "hash_password", None)
    email_provider = getattr(module, "email_provider", None)
    build_invite_email = getattr(module, "build_invite_email", None)
    build_resend_invite_email = getattr(module, "build_resend_invite_email", None)
    secrets = getattr(module, "secrets", None)
    os = getattr(module, "os", None)
    DEFAULT_GST_RATE = getattr(module, "DEFAULT_GST_RATE", 0.15)
    FRONTEND_URL = getattr(module, "FRONTEND_URL", "https://www.churvox.com")
    if any(item is None for item in (
        app, db, ObjectId, HTTPException, Body, Request, Depends, get_current_user,
        get_user_business_id, require_employer, hash_password, email_provider,
        build_invite_email, build_resend_invite_email, secrets, os,
    )):
        return
    if getattr(app.state, "churvox_invite_security_paid_launch", False):
        return

    def _oid(value):
        try:
            return value if isinstance(value, ObjectId) else ObjectId(str(value))
        except Exception:
            return None

    async def _find_user_email(email: str):
        try:
            found = await db.users.find_one({"email": email})
            if found:
                return found
            return await db.users.find_one({"email": re.compile(f"^{re.escape(email)}$", re.IGNORECASE)})
        except Exception:
            return None

    async def _find_token(raw_token: str):
        clean = _text(raw_token)
        if not clean or len(clean) > 512:
            return None
        now = _now()
        return await db.invite_tokens.find_one({
            "$or": [{"token_hash": token_hash(clean)}, {"token": clean}],
            "used": False,
            "expires_at": {"$gt": now},
        })

    async def _owner_for_business(business_id):
        oid = _oid(business_id)
        values = [str(business_id)]
        if oid is not None:
            values.append(oid)
        owner = await db.users.find_one({"_id": {"$in": values}})
        if owner and owner_business_record(owner, business_id):
            return owner
        owner = await db.users.find_one({
            "business_id": {"$in": values},
            "role": {"$in": list(OWNER_ROLES)},
        })
        return owner if owner_business_record(owner, business_id) else None

    async def _store_invite_token(raw_token: str, user_id, business_id, email: str):
        now = _now()
        await db.invite_tokens.insert_one({
            "token_hash": token_hash(raw_token),
            "token_last4": raw_token[-4:],
            "user_id": user_id,
            "business_id": business_id,
            "email": email,
            "expires_at": now + timedelta(days=7),
            "used": False,
            "created_at": now,
            "version": VERSION,
        })

    async def secure_create_invite_for_worker(email: str, name: str, phone: str, user: dict, biz_id):
        normalized_email = _lower(email)
        if not normalized_email:
            raise HTTPException(status_code=400, detail="Worker email is required")
        existing = await _find_user_email(normalized_email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        owner = await _owner_for_business(biz_id)
        if not owner:
            raise HTTPException(status_code=403, detail="Business owner could not be verified")

        now = _now()
        worker_doc = {
            "email": normalized_email,
            "password_hash": hash_password(secrets.token_urlsafe(32)),
            "name": _text(name),
            "phone": _text(phone),
            "role": "worker",
            "user_role": "worker",
            "worker_role": "worker",
            "is_worker": True,
            "worker": True,
            "worker_login": True,
            "status": "invited",
            "active": False,
            "is_active": False,
            "email_verified": False,
            "business_id": biz_id,
            "plan": user.get("plan", "solo"),
            "gst_rate": user.get("gst_rate", DEFAULT_GST_RATE),
            "created_at": now,
            "updated_at": now,
            "version": VERSION,
        }
        result = await db.users.insert_one(worker_doc)
        worker_id = result.inserted_id
        raw_token = secrets.token_urlsafe(32)
        try:
            await _store_invite_token(raw_token, worker_id, biz_id, normalized_email)
        except Exception:
            await db.users.delete_one({"_id": worker_id, "status": "invited"})
            raise

        business_name = _text(owner.get("business_name")) or "your employer"
        frontend = _text(os.environ.get("FRONTEND_URL") or FRONTEND_URL).rstrip("/")
        invite_link = f"{frontend}/invite/setup/{raw_token}"
        content = build_invite_email(_text(name), business_name, invite_link)
        try:
            result_email = await email_provider.send(to=normalized_email, subject=content["subject"], html=content["html"])
            sent = bool(result_email.success)
            provider = result_email.provider
            email_id = result_email.email_id
            error = result_email.error
        except Exception as exc:
            sent = False
            provider = ""
            email_id = ""
            error = str(exc)

        await db.invite_emails.insert_one({
            "to": normalized_email,
            "subject": content["subject"],
            "business_id": biz_id,
            "worker_id": worker_id,
            "token_last4": raw_token[-4:],
            "status": "sent" if sent else "failed",
            "provider": provider,
            "email_id": email_id,
            "error": error,
            "created_at": now,
            "version": VERSION,
        })
        return {
            "id": str(worker_id),
            "name": _text(name),
            "email": normalized_email,
            "phone": _text(phone),
            "role": "worker",
            "status": "invited",
            "invite_sent": sent,
            "invite_link": invite_link,
            "created_at": now.isoformat(),
            "version": VERSION,
        }

    module.create_invite_for_worker = secure_create_invite_for_worker

    async def secure_verify_invite(token: str):
        token_doc = await _find_token(token)
        if not token_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")
        user_doc = await db.users.find_one({"_id": token_doc.get("user_id")})
        owner = await _owner_for_business(token_doc.get("business_id"))
        if not worker_invite_record(user_doc, token_doc) or not owner:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")
        return {
            "success": True,
            "valid": True,
            "email": user_doc.get("email"),
            "name": user_doc.get("name"),
            "role": "worker",
            "is_worker": True,
            "business_name": owner.get("business_name") or "The business",
            "expires_at": token_doc.get("expires_at"),
            "version": VERSION,
        }

    async def secure_accept_invite(payload: dict = Body(default={})):
        raw_token = _text((payload or {}).get("token"))
        password = _text((payload or {}).get("password"))
        name = _text((payload or {}).get("name"))
        if len(password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        if len(password) > 128:
            raise HTTPException(status_code=400, detail="Password must be no more than 128 characters")

        token_doc = await _find_token(raw_token)
        if not token_doc:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")
        user_doc = await db.users.find_one({"_id": token_doc.get("user_id")})
        owner = await _owner_for_business(token_doc.get("business_id"))
        if not worker_invite_record(user_doc, token_doc) or not owner:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")

        now = _now()
        claimed = await db.invite_tokens.update_one(
            {"_id": token_doc["_id"], "used": False, "expires_at": {"$gt": now}},
            {"$set": {"used": True, "used_at": now, "accepted_version": VERSION}},
        )
        if int(getattr(claimed, "modified_count", 0) or 0) != 1:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")

        user_filter = {
            "_id": token_doc["user_id"],
            "business_id": token_doc["business_id"],
            "role": {"$in": list(WORKER_ROLES)},
            "status": "invited",
        }
        user_update = {
            "$set": {
                "password_hash": hash_password(password),
                "name": name or user_doc.get("name") or "Worker",
                "role": "worker",
                "user_role": "worker",
                "worker_role": "worker",
                "is_worker": True,
                "worker": True,
                "worker_login": True,
                "status": "active",
                "active": True,
                "is_active": True,
                "email_verified": True,
                "email_verified_at": now,
                "invite_accepted_at": now,
                "updated_at": now,
                "version": VERSION,
            },
            "$unset": {
                "password": "",
                "plain_password": "",
                "temp_password": "",
                "temporary_password": "",
                "invite_password": "",
                "hashed_password": "",
                "passwordHash": "",
                "bcrypt_hash": "",
                "pass_hash": "",
            },
        }
        updated = await db.users.update_one(user_filter, user_update)
        if int(getattr(updated, "matched_count", 0) or 0) != 1:
            raise HTTPException(status_code=400, detail="Invalid or expired invite link")

        await db.invite_tokens.update_many(
            {"user_id": token_doc["user_id"], "used": False},
            {"$set": {"used": True, "invalidated_at": now}},
        )
        try:
            await db.auth_security_events.insert_one({
                "kind": "worker_invite_accepted",
                "user_id": str(token_doc["user_id"]),
                "business_id": str(token_doc["business_id"]),
                "created_at": now,
                "version": VERSION,
            })
        except Exception:
            pass
        return {
            "success": True,
            "message": "Account set up successfully. Sign in with the invited email and your new password.",
            "email": user_doc.get("email"),
            "name": name or user_doc.get("name"),
            "role": "worker",
            "is_worker": True,
            "version": VERSION,
        }

    async def secure_resend_invite(worker_id: str, request: Request, current_user: dict = Depends(get_current_user)):
        await get_user_business_id(current_user)
        owner_user = await require_employer(request)
        biz_id = _oid(owner_user.get("business_id") or owner_user.get("id") or owner_user.get("_id"))
        worker_oid = _oid(worker_id)
        if biz_id is None or worker_oid is None:
            raise HTTPException(status_code=404, detail="Worker not found")
        worker = await db.users.find_one({
            "_id": worker_oid,
            "business_id": biz_id,
            "role": {"$in": list(WORKER_ROLES)},
        })
        if not worker:
            raise HTTPException(status_code=404, detail="Worker not found")
        if _lower(worker.get("status")) != "invited":
            raise HTTPException(status_code=400, detail="Worker has already accepted the invite")
        owner = await _owner_for_business(biz_id)
        if not owner:
            raise HTTPException(status_code=403, detail="Business owner could not be verified")

        now = _now()
        await db.invite_tokens.update_many(
            {"user_id": worker_oid, "used": False},
            {"$set": {"used": True, "invalidated_at": now}},
        )
        raw_token = secrets.token_urlsafe(32)
        await _store_invite_token(raw_token, worker_oid, biz_id, _lower(worker.get("email")))
        frontend = _text(os.environ.get("FRONTEND_URL") or FRONTEND_URL).rstrip("/")
        invite_link = f"{frontend}/invite/setup/{raw_token}"
        content = build_resend_invite_email(worker.get("name") or "there", owner.get("business_name") or "your employer", invite_link)
        try:
            result_email = await email_provider.send(to=worker["email"], subject=content["subject"], html=content["html"])
            sent = bool(result_email.success)
            provider = result_email.provider
            email_id = result_email.email_id
            error = result_email.error
        except Exception as exc:
            sent = False
            provider = ""
            email_id = ""
            error = str(exc)
        await db.invite_emails.insert_one({
            "to": worker["email"],
            "subject": content["subject"],
            "business_id": biz_id,
            "worker_id": worker_oid,
            "token_last4": raw_token[-4:],
            "status": "sent" if sent else "failed",
            "provider": provider,
            "email_id": email_id,
            "error": error,
            "created_at": now,
            "version": VERSION,
        })
        return {
            "success": sent,
            "message": "Invite email sent" if sent else "Invite email could not be confirmed as sent",
            "invite_sent": sent,
            "invite_link": invite_link,
            "version": VERSION,
        }

    secure_verify_invite.__annotations__ = {"token": str}
    secure_accept_invite.__annotations__ = {"payload": dict}
    secure_resend_invite.__annotations__ = {"worker_id": str, "request": Request, "current_user": dict}

    _remove_route(app, "/api/invite/verify/{token}", "GET")
    _remove_route(app, "/api/invite/accept", "POST")
    _remove_route(app, "/api/team/resend-invite/{worker_id}", "POST")
    app.add_api_route("/api/invite/verify/{token}", secure_verify_invite, methods=["GET"])
    app.add_api_route("/api/invite/accept", secure_accept_invite, methods=["POST"])
    app.add_api_route("/api/team/resend-invite/{worker_id}", secure_resend_invite, methods=["POST"])
    app.state.churvox_invite_security_paid_launch = VERSION
