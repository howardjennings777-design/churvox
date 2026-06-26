"""Root startup hook for Churvox.

Keep this valid and small. Backend runtime patches live in backend modules.
"""

try:
    import backend.sitecustomize  # noqa: F401
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
