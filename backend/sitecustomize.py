"""Churvox backend startup hook."""

from __future__ import annotations

XERO_SCOPES_DEFAULT = "openid profile email offline_access accounting.invoices"
BACKEND_PUBLIC_URL_DEFAULT = "https://churvox-backend.onrender.com"
FRONTEND_URL_DEFAULT = "https://www.churvox.com"

try:
    import churvox_monthly_job_limit  # noqa: F401
except Exception:
    pass

try:
    import churvox_ai_action_limit  # noqa: F401
except Exception:
    pass

try:
    import churvox_job_timer_routes_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_old_backend_bridge_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_field_truth_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_field_truth_fix_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_field_truth_hardening_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_command_readiness_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_command_readiness_fix_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_command_readiness_hardening_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_approval_execution_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_invoice_vault_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_top_player_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_top_player_fix_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_onsite_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_logic_audit_hardening_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_logic_audit_idempotency_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_command_execution_lock_patch  # noqa: F401
except Exception:
    pass

try:
    import churvox_worker_onsite_signal_patch  # noqa: F401
except Exception:
    pass
