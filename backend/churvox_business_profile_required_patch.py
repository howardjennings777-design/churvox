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
SOURCE = "churvox_business_profile_required"


def _truthy(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return str(value or "").strip().lower() in {"1", "true", "yes", "done", "complete", "completed", "active", "paid", "trialing", "tester_free"}


def _first(row, *keys):
    for key in keys:
        value = (row or {}).get(key)
        if base.text(value):
            return base.text(value)
    return ""


def _business_filters(user, ObjectId):
    filters = []
    bid = base.text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("contractor_id"))
    email = base.text((user or {}).get("email")).lower()
    if bid:
        for field in ["_id", "id", "business_id", "businessId", "owner_business_id", "contractor_id"]:
            filters.append({field: bid})
            try:
                filters.append({field: ObjectId(bid)})
            except Exception:
                pass
    if email:
        filters.extend([{"owner_email": email}, {"created_by_email": email}, {"business_email": email}, {"email": email}])
    return filters or [{"_id": "__never__"}]


async def _read_business(db, user, ObjectId):
    try:
        return await db.businesses.find_one({"$or": _business_filters(user, ObjectId)}) or {}
    except Exception:
        return {}


def _profile_fields(user, business):
    user = user or {}
    business = business or {}
    business_name = _first(user, "business_name", "company", "company_name", "business") or _first(business, "business_name", "name", "company", "company_name")
    business_phone = _first(user, "business_phone", "phone", "mobile") or _first(business, "business_phone", "phone", "mobile")
    service_area = _first(user, "service_area", "region", "city", "area") or _first(business, "service_area", "region", "city", "area")
    main_services = _first(user, "main_services", "services", "service_types") or _first(business, "main_services", "services", "service_types")
    team_size = _first(user, "team_size", "staff_count", "crew_size") or _first(business, "team_size", "staff_count", "crew_size")
    work_style = _first(user, "work_style", "service_location") or _first(business, "work_style", "service_location") or "auto"
    industry_key = _first(user, "industry_profile", "industry_key", "business_type", "profession") or _first(business, "industry_profile", "industry_key", "business_type", "profession") or "field_service"
    completed = _truthy(user.get("business_profile_completed")) or _truthy(business.get("business_profile_completed"))
    required_complete = bool(business_name and base.choose_profile(industry_key) and work_style and work_style != "auto")
    completed = bool(completed or required_complete)
    return {
        "business_name": business_name,
        "business_phone": business_phone,
        "service_area": service_area,
        "main_services": main_services,
        "team_size": team_size,
        "work_style": work_style,
        "industry_key": base.choose_profile(industry_key),
        "completed": completed,
        "required_complete": required_complete,
        "missing": [name for name, value in [("business_name", business_name), ("industry_key", industry_key), ("work_style", None if work_style == "auto" else work_style)] if not value],
    }


def _is_tester(user):
    status = base.text((user or {}).get("subscription_status") or (user or {}).get("plan_status")).lower()
    return bool(
        (user or {}).get("free_tester_access") is True
        or (user or {}).get("tester") is True
        or (user or {}).get("is_tester") is True
        or status == "tester_free"
        or base.text((user or {}).get("tester_status"))
    )


def _has_plan_or_access(user):
    status = base.text((user or {}).get("subscription_status") or (user or {}).get("plan_status") or (user or {}).get("billing_status")).lower()
    plan = base.text((user or {}).get("plan") or (user or {}).get("current_plan") or (user or {}).get("subscription_plan") or (user or {}).get("tier")).lower()
    return bool(
        _is_tester(user)
        or (user or {}).get("has_app_access") is True
        or status in {"active", "paid", "trialing", "trial", "tester_free"}
        or plan in {"start", "solo", "crew", "team", "operator", "pro", "command", "enterprise"}
    )


def _access_next(user):
    # Normal signup flow is plan first, then business profile, then app.
    # If someone somehow reaches the profile before plan/access, send them back to Plans.
    return "dashboard" if _has_plan_or_access(user) else "plans"


def _safe_update(payload, selected, work_style):
    business_name = base.text(payload.get("business_name") or payload.get("businessName"))
    business_phone = base.text(payload.get("business_phone") or payload.get("phone") or payload.get("mobile"))
    service_area = base.text(payload.get("service_area") or payload.get("region") or payload.get("city") or payload.get("area"))
    main_services = base.text(payload.get("main_services") or payload.get("services") or payload.get("service_types"))
    team_size = base.text(payload.get("team_size") or payload.get("staff_count") or payload.get("crew_size"))
    completed = bool(business_name and selected.get("key") and work_style and work_style != "auto")
    return {
        "industry_profile": selected["key"],
        "industry_key": selected["key"],
        "industry_mode": selected["mode"],
        "work_style": work_style,
        "industry_brain": base.build_brain(selected, work_style),
        "business_profile_completed": completed,
        "business_profile_completed_at": datetime.now(timezone.utc) if completed else None,
        "business_profile_required": True,
        "business_name": business_name,
        "business_phone": business_phone,
        "service_area": service_area,
        "main_services": main_services,
        "team_size": team_size,
        "updated_at": datetime.now(timezone.utc),
    }


def _clean_update(update):
    return {key: value for key, value in update.items() if value not in (None, "")}


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

    async def get_context(request: Request):
        user = await get_current_user(request)
        business = await _read_business(db, user, ObjectId)
        fields = _profile_fields(user, business)
        chosen = base.PROFILE_BY_KEY.get(fields["industry_key"], base.PROFILE_BY_KEY["field_service"])
        response = base.context_payload(chosen["key"], fields["work_style"], saved=fields["completed"])
        response["source"] = base.SOURCE
        response["business_profile"] = fields
        response["business_profile_required"] = True
        response["business_profile_completed"] = fields["completed"]
        response["next_after_profile"] = _access_next(user)
        response["tester_access"] = _is_tester(user)
        response["plan_first"] = not _is_tester(user)
        return response

    async def profile_status(request: Request):
        user = await get_current_user(request)
        business = await _read_business(db, user, ObjectId)
        fields = _profile_fields(user, business)
        return {
            "success": True,
            "source": SOURCE,
            "business_profile_required": True,
            "business_profile_completed": fields["completed"],
            "business_profile": fields,
            "next_after_profile": _access_next(user),
            "tester_access": _is_tester(user),
            "plan_first": not _is_tester(user),
            "updated_at": base.now(),
        }

    async def save_context(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        profile_key = base.choose_profile(payload.get("industry_key") or payload.get("industry_profile") or payload.get("profile") or payload.get("profession") or payload.get("business_type"))
        work_style = base.text(payload.get("work_style") or payload.get("service_location") or payload.get("location_mode") or "auto") or "auto"
        selected = base.PROFILE_BY_KEY.get(profile_key, base.PROFILE_BY_KEY["field_service"])
        update_doc = _clean_update(_safe_update(payload, selected, work_style))
        try:
            await db.users.update_many({"$or": base.user_filters(user, ObjectId)}, {"$set": update_doc})
        except Exception:
            pass
        try:
            await db.businesses.update_many({"$or": _business_filters(user, ObjectId)}, {"$set": update_doc}, upsert=False)
        except Exception:
            pass
        completed = bool(update_doc.get("business_profile_completed"))
        response = base.context_payload(selected["key"], work_style, saved=completed)
        response["business_profile_required"] = True
        response["business_profile_completed"] = completed
        response["business_profile"] = {
            "business_name": update_doc.get("business_name", ""),
            "business_phone": update_doc.get("business_phone", ""),
            "service_area": update_doc.get("service_area", ""),
            "main_services": update_doc.get("main_services", ""),
            "team_size": update_doc.get("team_size", ""),
            "work_style": work_style,
            "industry_key": selected["key"],
            "completed": completed,
            "missing": [] if completed else ["business_name", "work_style"],
        }
        response["next_after_profile"] = _access_next(user)
        response["tester_access"] = _is_tester(user)
        response["plan_first"] = not _is_tester(user)
        response["saved_payload"] = base.safe_doc(update_doc)
        return response

    for path, endpoint, method in [
        ("/api/industry/context", get_context, "GET"),
        ("/api/industry/profile", get_context, "GET"),
        ("/api/business/industry", get_context, "GET"),
        ("/api/business/profile-status", profile_status, "GET"),
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
