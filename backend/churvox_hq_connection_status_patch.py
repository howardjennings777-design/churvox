from __future__ import annotations

from datetime import datetime, timezone

INSTALLED = set()


def _text(value):
    return str(value or "").strip()


def _email(user):
    return _text((user or {}).get("email") or (user or {}).get("user_email") or (user or {}).get("owner_email")).lower()


def _safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "hash", "token", "secret"]):
                continue
            out["id" if key == "_id" else key] = _safe(item)
        return out
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def _route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def _remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not _route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or get_current_user is None or Request is None or HTTPException is None:
        return

    async def require_hq_owner(request: Request):
        user = await get_current_user(request)
        email = _email(user)
        allowed_emails = {"hello@churvox.com", "howardjennings77@gmail.com", "howardjennings777@gmail.com"}
        try:
            import churvox_hq_owner_access_fix_patch as owner_access
            allowed_emails |= set(owner_access.owner_emails())
        except Exception:
            pass
        role = _text((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type")).lower().replace("-", "_").replace(" ", "_")
        allowed = email in allowed_emails or role in {"platform_owner", "platform_admin", "super_admin", "superadmin", "admin"} or bool((user or {}).get("is_platform_owner") or (user or {}).get("is_platform_admin") or (user or {}).get("is_super_admin") or (user or {}).get("is_admin"))
        checker = getattr(module, "is_platform_owner", None)
        if not allowed and checker:
            try:
                allowed = bool(checker(user))
            except Exception:
                allowed = False
        if not allowed:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to the platform owner account")
        return user

    async def count_collection(name):
        try:
            return await db[name].count_documents({})
        except Exception:
            return None

    async def collection_names():
        try:
            names = await db.list_collection_names()
            return sorted([name for name in names if not str(name).startswith("system.")])
        except Exception:
            return []

    async def connection_status(request: Request):
        user = await require_hq_owner(request)
        names = await collection_names()
        counts = {
            "users": await count_collection("users"),
            "businesses": await count_collection("businesses"),
            "jobs": await count_collection("jobs"),
            "clients": await count_collection("clients"),
            "control_log": await count_collection("app_owner_control_log"),
            "testers": await count_collection("app_owner_testers"),
        }
        endpoints = {
            "owner_overview": "/api/admin/owner-overview",
            "plan_report": "/api/admin/owner/plan-report",
            "control_log": "/api/admin/owner/control-log",
            "retention_status": "/api/admin/owner/retention-email-status",
            "growth_report": "/api/admin/owner/growth-report",
            "paid_launch_report": "/api/admin/owner/paid-launch-report",
            "tester_intake": "/api/admin/owner/tester-intake",
            "control_access": "/api/admin/owner/control-access",
        }
        return _safe({
            "success": True,
            "connected": True,
            "service": "churvox-hq",
            "generated_at": datetime.now(timezone.utc),
            "owner_email": _email(user),
            "api_base": "backend",
            "database_connected": bool(names or any(value is not None for value in counts.values())),
            "collections_seen": names[:80],
            "counts": counts,
            "endpoints": endpoints,
            "message": "HQ is connected to the owner backend and database.",
        })

    async def platform_hq_summary(request: Request):
        status = await connection_status(request)
        return {"success": True, "hq": status, "connection": status}

    for path, endpoint in [
        ("/api/admin/owner/connection", connection_status),
        ("/api/platform/hq/connection", connection_status),
        ("/api/platform/hq", platform_hq_summary),
    ]:
        _remove_route(app, path, "GET")
        app.add_api_route(path, endpoint, methods=["GET"])

    try:
        from churvox_hq_paid_launch_filter_patch import install as install_paid_launch_filter
        install_paid_launch_filter(module)
        from churvox_hq_paid_launch_report_patch import install as install_paid_launch_report
        install_paid_launch_report(module)
        from churvox_hq_paid_launch_postguard_patch import install as install_paid_launch_postguard
        install_paid_launch_postguard(module)
    except Exception as exc:
        print(f"Churvox paid launch HQ report skipped: {exc}")

    INSTALLED.add(name)
