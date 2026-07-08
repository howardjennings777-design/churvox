from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()


def _text(value):
    return str(value or "").strip()


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    try:
        from churvox_industry_mode_patch import (
            PROFILES,
            context_payload,
            selected_from_user,
            choose_profile,
            PROFILE_BY_KEY,
            build_brain,
            safe_doc,
            user_filters,
            now,
        )
    except Exception:
        return

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [
                route for route in app.router.routes
                if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))
            ]
        except Exception:
            pass

    async def profiles_route(request: Request):
        groups = []
        seen = set()
        for item in PROFILES:
            group = item.get("group") or "Other"
            if group not in seen:
                seen.add(group)
                groups.append(group)
        return {
            "success": True,
            "source": "churvox_industry_request_signature_fix",
            "profiles": PROFILES,
            "groups": groups,
            "updated_at": now(),
        }

    async def get_context(request: Request):
        user = await get_current_user(request)
        profile_key, work_style = selected_from_user(user)
        saved = bool((user or {}).get("industry_profile") or (user or {}).get("industry_key"))
        payload = context_payload(profile_key, work_style, saved=saved)
        payload["source"] = "churvox_industry_request_signature_fix"
        return payload

    async def save_context(request: Request):
        user = await get_current_user(request)
        try:
            body = await request.json()
        except Exception:
            body = {}

        profile_key = choose_profile(
            body.get("industry_key")
            or body.get("industry_profile")
            or body.get("profile")
            or body.get("profession")
            or body.get("business_type")
        )
        work_style = _text(body.get("work_style") or body.get("service_location") or body.get("location_mode") or "auto") or "auto"
        selected = PROFILE_BY_KEY.get(profile_key, PROFILE_BY_KEY["field_service"])
        update = {
            "$set": {
                "industry_profile": selected["key"],
                "industry_key": selected["key"],
                "industry_mode": selected["mode"],
                "work_style": work_style,
                "industry_brain": build_brain(selected, work_style),
                "updated_at": datetime.now(timezone.utc),
            }
        }

        try:
            await db.users.update_many({"$or": user_filters(user, ObjectId)}, update)
        except Exception:
            pass

        try:
            bid = _text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id"))
            email = _text((user or {}).get("email")).lower()
            filters = []
            if bid:
                filters.extend([{"_id": bid}, {"business_id": bid}])
                try:
                    filters.append({"_id": ObjectId(bid)})
                except Exception:
                    pass
            if email:
                filters.extend([{"owner_email": email}, {"email": email}])
            if filters:
                await db.businesses.update_many({"$or": filters}, update)
        except Exception:
            pass

        response = context_payload(selected["key"], work_style, saved=True)
        response["source"] = "churvox_industry_request_signature_fix"
        response["saved_payload"] = safe_doc({"industry_key": selected["key"], "work_style": work_style})
        return response

    for path, endpoint, method in [
        ("/api/industry/profiles", profiles_route, "GET"),
        ("/api/industry/context", get_context, "GET"),
        ("/api/industry/profile", get_context, "GET"),
        ("/api/business/industry", get_context, "GET"),
        ("/api/industry/context", save_context, "POST"),
        ("/api/industry/profile", save_context, "POST"),
        ("/api/business/industry", save_context, "POST"),
    ]:
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

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
