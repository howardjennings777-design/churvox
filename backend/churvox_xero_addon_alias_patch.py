"""Keep Xero access checks aligned with the Accounting Sync add-on naming."""

from __future__ import annotations

try:
    import xero_routes
except Exception:  # pragma: no cover
    try:
        from backend import xero_routes  # type: ignore
    except Exception:  # pragma: no cover
        xero_routes = None


def _truthy(value):
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "active", "enabled", "included"}
    return bool(value)


def _first_plan(owner):
    owner = owner or {}
    business = owner.get("business") if isinstance(owner.get("business"), dict) else {}
    for key in ("plan", "ui_plan", "current_plan", "subscription_plan", "billing_plan", "tier", "plan_name"):
        value = owner.get(key) or business.get(key)
        if value:
            return str(value).lower().strip()
    return ""


def _addon_active(owner):
    owner = owner or {}
    business = owner.get("business") if isinstance(owner.get("business"), dict) else {}
    addons = owner.get("addons") if isinstance(owner.get("addons"), dict) else {}
    billing_addons = owner.get("billing_addons") if isinstance(owner.get("billing_addons"), dict) else {}
    plan = _first_plan(owner)
    flags = [
        owner.get("xero_addon_active"),
        owner.get("accounting_sync_active"),
        owner.get("accounting_sync_addon_active"),
        owner.get("accounting_addon_active"),
        owner.get("myob_addon_active"),
        owner.get("sync_addon_active"),
        business.get("accounting_sync_active"),
        business.get("accounting_sync_addon_active"),
        addons.get("accounting_sync"),
        addons.get("accounting_sync_addon"),
        addons.get("xero"),
        addons.get("myob"),
        billing_addons.get("accounting_sync"),
        billing_addons.get("xero"),
        billing_addons.get("myob"),
    ]
    return bool(any(_truthy(flag) for flag in flags) or plan in {"command", "enterprise"})


if xero_routes is not None:
    try:
        xero_routes._xero_addon_active = _addon_active
    except Exception:
        pass
