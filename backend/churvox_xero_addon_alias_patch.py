"""Keep Xero access checks aligned with the Accounting Sync add-on naming."""

from __future__ import annotations

try:
    import xero_routes
except Exception:  # pragma: no cover
    try:
        from backend import xero_routes  # type: ignore
    except Exception:  # pragma: no cover
        xero_routes = None


def _addon_active(owner):
    owner = owner or {}
    plan = str(owner.get("plan") or "").lower().strip()
    return bool(
        owner.get("xero_addon_active")
        or owner.get("accounting_sync_active")
        or owner.get("accounting_sync_addon_active")
        or owner.get("accounting_addon_active")
        or owner.get("myob_addon_active")
        or owner.get("sync_addon_active")
        or plan in {"command", "enterprise"}
    )


if xero_routes is not None:
    try:
        xero_routes._xero_addon_active = _addon_active
    except Exception:
        pass
