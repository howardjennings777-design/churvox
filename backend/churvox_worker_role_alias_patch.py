"""Accept Churvox worker role aliases wherever worker-only helper routes call xero_routes._is_worker_role."""

from __future__ import annotations

try:
    import xero_routes
except Exception:  # pragma: no cover
    try:
        from backend import xero_routes  # type: ignore
    except Exception:  # pragma: no cover
        xero_routes = None

_WORKER_ALIASES = {
    "worker",
    "staff",
    "crew",
    "employee",
    "team_member",
    "teammember",
    "subcontractor",
    "contractor",
    "field",
    "field_staff",
    "fieldstaff",
    "field_worker",
    "fieldworker",
    "technician",
    "tech",
}


def _clean(value):
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def _truthy(value):
    if isinstance(value, str):
        return _clean(value) in {"1", "true", "yes", "active", "enabled", "worker", "staff", "field_worker"}
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return False


def _role(user):
    user = user or {}
    business = user.get("business") if isinstance(user.get("business"), dict) else {}
    keys = (
        "role",
        "user_role",
        "account_role",
        "member_role",
        "team_role",
        "staff_role",
        "worker_role",
        "type",
        "user_type",
        "account_type",
        "member_type",
        "staff_type",
        "worker_type",
    )
    for key in keys:
        if user.get(key):
            return _clean(user.get(key))
    for key in ("role", "user_role", "member_role"):
        if business.get(key):
            return _clean(business.get(key))
    return ""


def _is_worker_role(user):
    user = user or {}
    role = _role(user)
    return bool(
        role in _WORKER_ALIASES
        or _truthy(user.get("is_worker"))
        or _truthy(user.get("is_field_worker"))
        or _truthy(user.get("field_worker"))
        or _truthy(user.get("worker_account"))
        or _truthy(user.get("worker_portal"))
        or _truthy(user.get("worker_login"))
        or bool(user.get("worker_id"))
        or bool(user.get("staff_id"))
        or bool(user.get("team_member_id"))
        or _clean(user.get("invite_role")) == "worker"
    )


if xero_routes is not None:
    try:
        xero_routes._is_worker_role = _is_worker_role
    except Exception:
        pass
