from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

VERSION = "churvox-experience-feedback-20260720"
INSTALLED: set[str] = set()
PLATFORM_OWNER_EMAIL = "hello@churvox.com"
CHOICES = {"easy", "confusing", "stuck"}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clean(value: Any, limit: int = 4000) -> str:
    return " ".join(str(value or "").strip().split())[:limit]


def lower(value: Any) -> str:
    return clean(value).lower()


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items() if key not in {"password_hash", "hashed_password", "password"}}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def user_id(user: dict[str, Any]) -> str:
    return clean(user.get("id") or user.get("_id") or user.get("user_id") or user.get("email"), 300)


def business_id(user: dict[str, Any]) -> str:
    return clean(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user_id(user), 300)


def platform_allowed(user: dict[str, Any]) -> bool:
    return bool(user.get("is_platform_owner") or lower(user.get("email")) == PLATFORM_OWNER_EMAIL or (user.get("is_admin") and lower(user.get("role")) in {"superadmin", "platform_owner"}))


def route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def add_route(app, path: str, endpoint, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass
    app.add_api_route(path, endpoint, methods=[method])
    try:
        matches = [route for route in app.router.routes if route_matches(route, path, method)]
        app.router.routes = matches[-1:] + [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app, db = getattr(module, "app", None), getattr(module, "db", None)
    get_current_user, ObjectId = getattr(module, "get_current_user", None), getattr(module, "ObjectId", None)
    Request, HTTPException = getattr(module, "Request", None), getattr(module, "HTTPException", None)
    if app is None or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def submit(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
            payload = payload if isinstance(payload, dict) else {}
        except Exception:
            payload = {}
        choice = lower(payload.get("choice") or payload.get("rating"))
        if choice not in CHOICES:
            raise HTTPException(status_code=422, detail="Feedback choice must be easy, confusing or stuck")
        stamp, bid = now_utc(), business_id(user)
        doc = {"business_id": bid, "user_id": user_id(user), "user_email": lower(user.get("email")), "business_name": clean(user.get("business_name") or user.get("company_name"), 300), "choice": choice, "title": {"easy": "Flow felt easy", "confusing": "Flow felt confusing", "stuck": "User got stuck"}[choice], "area": clean(payload.get("area") or payload.get("page") or "app", 120), "action": clean(payload.get("action") or payload.get("milestone") or "general_feedback", 200), "onboarding_step": clean(payload.get("onboarding_step") or payload.get("step"), 120), "note": clean(payload.get("note") or payload.get("message"), 4000), "route": clean(payload.get("route") or request.headers.get("referer"), 1000), "device": clean(payload.get("device") or request.headers.get("user-agent"), 800), "source": clean(payload.get("source") or "in_app_first_win", 120), "status": "needs_review" if choice != "easy" else "received", "priority": "high" if choice == "stuck" else "medium" if choice == "confusing" else "low", "created_at": stamp, "updated_at": stamp}
        result = await db.user_experience_feedback.insert_one(dict(doc))
        doc["_id"] = result.inserted_id
        if choice in {"confusing", "stuck"}:
            try:
                await db.command_slips.insert_one({"business_id": bid, "source_type": "first_win_feedback", "source_id": str(result.inserted_id), "action_type": "owner_review", "title": f"User feedback: {doc['title']}", "found": f"{doc['area']} · {doc['action']} · {doc['note'] or 'No note added'}", "prepared": "Review the reported step and decide whether to fix, follow up by email, or park it.", "why": "A new user reported friction during a real workflow.", "urgency": "High" if choice == "stuck" else "Owner review", "status": "open", "owner_review_only": True, "prepared_only": True, "no_auto_send": True, "created_at": stamp, "updated_at": stamp})
            except Exception:
                pass
        return json_safe({"success": True, "feedback": doc, "message": "Thanks — your feedback was saved."})

    async def business_items(request: Request):
        user = await get_current_user(request)
        try:
            items = await db.user_experience_feedback.find({"business_id": business_id(user)}).sort("created_at", -1).limit(100).to_list(100)
        except Exception:
            items = []
        return json_safe({"success": True, "items": items})

    async def platform_items(request: Request):
        user = await get_current_user(request)
        if not platform_allowed(user):
            raise HTTPException(status_code=403, detail="Platform owner access required")
        status = lower(request.query_params.get("status"))
        query = {} if not status or status == "all" else {"status": status}
        try:
            items = await db.user_experience_feedback.find(query).sort("created_at", -1).limit(300).to_list(300)
        except Exception:
            items = []
        summary = {"total": len(items), "easy": sum(1 for item in items if item.get("choice") == "easy"), "confusing": sum(1 for item in items if item.get("choice") == "confusing"), "stuck": sum(1 for item in items if item.get("choice") == "stuck"), "needs_review": sum(1 for item in items if item.get("status") == "needs_review")}
        return json_safe({"success": True, "items": items, "summary": summary, "version": VERSION})

    async def update(feedback_id: str, request: Request):
        user = await get_current_user(request)
        if not platform_allowed(user):
            raise HTTPException(status_code=403, detail="Platform owner access required")
        try:
            payload = await request.json()
            payload = payload if isinstance(payload, dict) else {}
        except Exception:
            payload = {}
        patch: dict[str, Any] = {"updated_at": now_utc(), "updated_by": user_id(user)}
        for key in ("status", "priority"):
            if key in payload:
                patch[key] = lower(payload.get(key))[:80]
        if "owner_note" in payload:
            patch["owner_note"] = clean(payload.get("owner_note"), 4000)
        query: dict[str, Any] = {"id": feedback_id}
        try:
            if ObjectId.is_valid(feedback_id):
                query = {"_id": ObjectId(feedback_id)}
        except Exception:
            pass
        result = await db.user_experience_feedback.update_one(query, {"$set": patch})
        if not result.matched_count:
            raise HTTPException(status_code=404, detail="Feedback item not found")
        return json_safe({"success": True, "feedback": await db.user_experience_feedback.find_one(query)})

    for method, path, endpoint in [
        ("POST", "/api/feedback/experience", submit),
        ("GET", "/api/feedback/experience", business_items),
        ("GET", "/api/platform/feedback", platform_items),
        ("PATCH", "/api/platform/feedback/{feedback_id}", update),
    ]:
        add_route(app, path, endpoint, method)
    INSTALLED.add(name)
