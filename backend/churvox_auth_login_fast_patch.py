from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="POST"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def with_timeout(awaitable, seconds=7):
    return await asyncio.wait_for(awaitable, timeout=seconds)


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    UserLogin = getattr(module, "UserLogin", None)
    Response = getattr(module, "Response", None)
    Request = getattr(module, "Request", None)
    bcrypt = getattr(module, "bcrypt", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    set_auth_cookies = getattr(module, "set_auth_cookies", None)
    create_access_token = getattr(module, "create_access_token", None)
    create_refresh_token = getattr(module, "create_refresh_token", None)
    auth_normal_email = getattr(module, "_auth_normal_email", None)
    auth_check_password = getattr(module, "_auth_check_password", None)
    auth_user_response = getattr(module, "_auth_user_response", None)

    required = [app, db, UserLogin, Response, Request, bcrypt, clear_auth_cookies, set_auth_cookies, create_access_token, create_refresh_token, auth_normal_email, auth_check_password, auth_user_response]
    if any(item is None for item in required):
        return

    async def fast_login(user_data: UserLogin, response: Response, request: Request):
        clear_auth_cookies(response)

        email = auth_normal_email(getattr(user_data, "email", ""))
        password = str(getattr(user_data, "password", "") or "")
        if not email or not password:
            response.status_code = 400
            return {"success": False, "detail": "Enter your email and password."}

        identifier = f"{request.client.host if request.client else 'unknown'}:{email}"

        try:
            attempt = await with_timeout(db.login_attempts.find_one({"identifier": identifier}), 3)
        except Exception:
            attempt = None

        if attempt and attempt.get("count", 0) >= 5:
            lockout_time = attempt.get("locked_until")
            if lockout_time and getattr(lockout_time, "tzinfo", None) is None:
                lockout_time = lockout_time.replace(tzinfo=timezone.utc)
            if lockout_time and datetime.now(timezone.utc) < lockout_time:
                response.status_code = 429
                return {"success": False, "detail": "Too many failed attempts. Try again later."}
            try:
                await with_timeout(db.login_attempts.delete_one({"identifier": identifier}), 2)
            except Exception:
                pass

        try:
            user_doc = await with_timeout(db.users.find_one({"email": email}), 7)
        except asyncio.TimeoutError:
            response.status_code = 503
            return {"success": False, "detail": "Login is taking too long. Please try again."}
        except Exception:
            response.status_code = 503
            return {"success": False, "detail": "Login service is unavailable. Please try again."}

        password_ok = False
        matched_field = None
        if user_doc:
            password_ok, matched_field = auth_check_password(password, user_doc)

        if not user_doc or not password_ok:
            try:
                await with_timeout(
                    db.login_attempts.update_one(
                        {"identifier": identifier},
                        {"$inc": {"count": 1}, "$set": {"locked_until": datetime.now(timezone.utc).replace(tzinfo=timezone.utc)}},
                        upsert=True,
                    ),
                    2,
                )
            except Exception:
                pass
            clear_auth_cookies(response)
            response.status_code = 401
            return {"success": False, "detail": "Invalid email or password"}

        if user_doc.get("status") == "invited":
            clear_auth_cookies(response)
            response.status_code = 403
            return {"success": False, "detail": "Please complete your account setup using the invite link sent to your email."}

        try:
            await with_timeout(db.login_attempts.delete_one({"identifier": identifier}), 2)
        except Exception:
            pass

        user_id = str(user_doc["_id"])
        access_token = create_access_token(user_id, email)
        refresh_token = create_refresh_token(user_id)
        set_auth_cookies(response, access_token, refresh_token)

        updates = {"last_login_at": datetime.now(timezone.utc)}
        if matched_field and matched_field != "password_hash":
            try:
                updates["password_hash"] = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            except Exception:
                pass
        if not user_doc.get("business_id"):
            updates["business_id"] = user_doc["_id"]

        try:
            await with_timeout(db.users.update_one({"_id": user_doc["_id"]}, {"$set": updates}), 3)
        except Exception:
            pass
        user_doc.update(updates)

        return auth_user_response(user_doc, access_token)

    remove_route(app, "/api/auth/login", "POST")
    app.add_api_route("/api/auth/login", fast_login, methods=["POST"])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
