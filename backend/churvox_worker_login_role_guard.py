from __future__ import annotations

import json
import re

VERSION = "churvox-worker-login-role-guard-20260712"
WORKER_LOGIN_PATHS = {"/api/worker/auth/login", "/api/auth/worker-login"}
WORKER_ROLES = {"worker", "staff", "field_worker", "technician", "subcontractor", "employee"}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin", "super_admin"}
PAYROLL_ROLES = {"payroll", "payroll_user", "payroll_admin"}


def _text(value):
    return str(value or "").strip()


def _truthy(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _text(value).lower() in {"1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker"}


def worker_account(document: dict | None) -> bool:
    document = document or {}
    role = _text(document.get("role") or document.get("user_role") or document.get("worker_role") or document.get("account_type")).lower().replace("-", "_").replace(" ", "_")
    if role in OWNER_ROLES or role in PAYROLL_ROLES:
        return False
    return bool(
        role in WORKER_ROLES
        or _truthy(document.get("is_worker"))
        or _truthy(document.get("worker"))
        or _truthy(document.get("worker_account"))
        or _truthy(document.get("worker_login"))
        or document.get("worker_id")
        or document.get("team_member_id")
        or document.get("staff_id")
    )


class WorkerLoginRoleGuard:
    def __init__(self, app, module):
        self.app = app
        self.module = module

    async def __call__(self, scope, receive, send):
        if scope.get("type") != "http" or scope.get("path") not in WORKER_LOGIN_PATHS or scope.get("method", "GET").upper() != "POST":
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
        if not email:
            return await self.app(scope, replay, send)

        db = getattr(self.module, "db", None)
        JSONResponse = getattr(self.module, "JSONResponse", None)
        clear_auth_cookies = getattr(self.module, "clear_auth_cookies", None)
        if db is None or JSONResponse is None:
            return await self.app(scope, replay, send)

        try:
            document = await db.users.find_one({"email": email})
            if not document:
                document = await db.users.find_one({"email": re.compile(f"^{re.escape(email)}$", re.IGNORECASE)})
        except Exception:
            document = None

        if document and not worker_account(document):
            response = JSONResponse(
                {"success": False, "detail": "Invalid email or password.", "version": VERSION},
                status_code=401,
            )
            if callable(clear_auth_cookies):
                try:
                    clear_auth_cookies(response)
                except Exception:
                    pass
            return await response(scope, replay, send)

        return await self.app(scope, replay, send)


def install(module) -> None:
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_worker_login_role_guard", False):
        return
    try:
        app.add_middleware(WorkerLoginRoleGuard, module=module)
    except Exception:
        return
    app.state.churvox_worker_login_role_guard = VERSION
