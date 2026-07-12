from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timedelta, timezone

VERSION = "churvox-registration-claim-guard-20260712"
REGISTER_PATH = "/api/auth/register"


def _text(value):
    return str(value or "").strip()


def email_claim_id(email: str) -> str:
    normalized = _text(email).lower()
    return hashlib.sha256(f"signup|{normalized}".encode("utf-8", "ignore")).hexdigest()


class RegistrationClaimGuard:
    def __init__(self, app, module):
        self.app = app
        self.module = module

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or scope.get("path") != REGISTER_PATH or scope.get("method", "GET").upper() != "POST":
            return await self.app(scope, receive, send)

        chunks = []
        more = True
        while more:
            message = await receive()
            if message.get("type") != "http.request":
                continue
            chunks.append(message.get("body", b""))
            more = bool(message.get("more_body"))
        body = b"".join(chunks)
        sent = False

        async def replay():
            nonlocal sent
            if sent:
                return {"type": "http.request", "body": b"", "more_body": False}
            sent = True
            return {"type": "http.request", "body": body, "more_body": False}

        try:
            payload = json.loads(body.decode("utf-8")) if body else {}
        except Exception:
            payload = {}
        email = _text(payload.get("email") if isinstance(payload, dict) else "").lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
            return await self.app(scope, replay, send)

        db = getattr(self.module, "db", None)
        JSONResponse = getattr(self.module, "JSONResponse", None)
        if db is None or JSONResponse is None:
            return await self.app(scope, replay, send)

        claim_id = email_claim_id(email)
        now = datetime.now(timezone.utc)
        claim = {
            "_id": claim_id,
            "expires_at": now + timedelta(minutes=2),
            "created_at": now,
            "version": VERSION,
        }

        acquired = False
        for attempt in range(2):
            try:
                await db.registration_claims.insert_one(claim)
                acquired = True
                break
            except Exception:
                try:
                    existing = await db.registration_claims.find_one({"_id": claim_id})
                    expires = (existing or {}).get("expires_at")
                    if expires and getattr(expires, "tzinfo", None) is None:
                        expires = expires.replace(tzinfo=timezone.utc)
                    if attempt == 0 and expires and expires <= now:
                        await db.registration_claims.delete_one({"_id": claim_id, "expires_at": {"$lte": now}})
                        continue
                except Exception:
                    pass
                break

        if not acquired:
            response = JSONResponse(
                {"success": False, "detail": "Account creation is already in progress for this email. Wait a moment and try signing in.", "version": VERSION},
                status_code=409,
            )
            return await response(scope, replay, send)

        try:
            return await self.app(scope, replay, send)
        finally:
            try:
                await db.registration_claims.delete_one({"_id": claim_id})
            except Exception:
                pass


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_registration_claim_guard", False):
        return
    try:
        app.add_middleware(RegistrationClaimGuard, module=module)
    except Exception:
        return
    app.state.churvox_registration_claim_guard = VERSION
