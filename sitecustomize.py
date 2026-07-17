"""Root startup hook for Churvox.

Keep this valid and small. Backend runtime patches live in backend modules.
"""

try:
    import backend.sitecustomize  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_plan_consistency_price_resolution_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_monthly_job_limit  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_ai_action_limit  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_job_timer_routes_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_permissions_policy_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_hq_router_mount_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_owner_cockpit_control_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_hq_growth_report_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_hq_connection_status_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_plan_usage_routes  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_billing_plan_confirm_patch  # noqa: F401
except Exception:
    pass

try:
    import backend.churvox_plan_checkout_form_patch  # noqa: F401
except Exception:
    pass

try:
    import builtins
    from fastapi import Body
    builtins.Body = Body
except Exception:
    pass

try:
    import backend.churvox_startup_patch_loader  # noqa: F401
except Exception:
    pass
