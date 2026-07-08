from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from starlette.requests import Request

import churvox_industry_mode_patch as base

TARGETS = {"server", "backend.server"}
INSTALLED = set()


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

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def profiles_route(request: Request):
        groups = []
        seen = set()
        for item in base.PROFILES:
            group = item["group"]
            if group not in seen:
                seen.add(group)
                groups.append(group)
        return {
            "success": True,
            "source": base.SOURCE,
            "profiles": base.PROFILES,
            "groups": groups,
            "modes": [
                {"key": "field_service", "name": "Field service", "use_for": "Tradies, maintenance, crews, on-site jobs", "keeps": ["GPS optional", "site address", "proof", "quotes", "invoices"]},
                {"key": "visit_service", "name": "Recurring visits", "use_for": "Cleaning, repeat service runs", "keeps": ["checklists", "access notes", "recurring visits", "proof"]},
                {"key": "appointment_service", "name": "Appointments", "use_for": "Hair, nails, wellness, tutoring", "keeps": ["calendar", "services", "duration", "deposits", "reminders"], "hides": ["GPS", "route view"]},
                {"key": "mobile_appointment_service", "name": "Mobile appointments", "use_for": "Mobile beauty, mobile grooming, home visits", "keeps": ["calendar", "address", "travel buffer", "reminders", "payments"]},
                {"key": "project_service", "name": "Projects", "use_for": "Painting, building, photography, events", "keeps": ["quotes", "deposits", "stages", "deliverables", "invoices"]},
            ],
            "updated_at": base.now(),
        }

    async def get_context(request: Request):
        user = await get_current_user(request)
        profile_key, work_style = base.selected_from_user(user)
        saved = bool((user or {}).get("industry_profile") or (user or {}).get("industry_key"))
        return base.context_payload(profile_key, work_style, saved=saved)

    async def save_context(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        profile_key = base.choose_profile(payload.get("industry_key") or payload.get("industry_profile") or payload.get("profile") or payload.get("profession") or payload.get("business_type"))
        work_style = base.text(payload.get("work_style") or payload.get("service_location") or payload.get("location_mode") or "auto") or "auto"
        selected = base.PROFILE_BY_KEY.get(profile_key, base.PROFILE_BY_KEY["field_service"])
        update = {
            "$set": {
                "industry_profile": selected["key"],
                "industry_key": selected["key"],
                "industry_mode": selected["mode"],
                "work_style": work_style,
                "industry_brain": base.build_brain(selected, work_style),
                "updated_at": datetime.now(timezone.utc),
            }
        }
        try:
            await db.users.update_many({"$or": base.user_filters(user, ObjectId)}, update)
        except Exception:
            pass
        try:
            bid = base.text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id"))
            email = base.text((user or {}).get("email")).lower()
            business_filters = []
            if bid:
                business_filters.append({"_id": bid})
                business_filters.append({"business_id": bid})
                try:
                    business_filters.append({"_id": ObjectId(bid)})
                except Exception:
                    pass
            if email:
                business_filters.extend([{"owner_email": email}, {"email": email}])
            if business_filters:
                await db.businesses.update_many({"$or": business_filters}, update)
        except Exception:
            pass
        response = base.context_payload(selected["key"], work_style, saved=True)
        response["saved_payload"] = base.safe_doc({"industry_key": selected["key"], "work_style": work_style})
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
