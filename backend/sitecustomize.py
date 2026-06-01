"""Startup compatibility shims for Render.

Render imports backend/server.py directly with uvicorn. Some recently added routes use
FastAPI Body in function defaults, and Python evaluates those defaults while the module
is importing. Keep Body available through builtins so deploys do not crash if a route
forgets to import it explicitly.

This file intentionally lives inside backend/ so backend-only deploy filters notice it.
It also loads route auto-registration hooks without editing the huge server.py directly.
"""

try:
    import builtins
    from fastapi import Body

    if not hasattr(builtins, "Body"):
        builtins.Body = Body
except Exception:
    # Never block app startup from this compatibility shim.
    pass

try:
    try:
        from ai_command_autoregister import install as _install_ai_command_hub
    except Exception:
        from backend.ai_command_autoregister import install as _install_ai_command_hub
    _install_ai_command_hub()
except Exception:
    # Never block app startup from AI Command Hub registration shim.
    pass

try:
    try:
        from proof_pack_autoregister import install as _install_proof_pack_routes
    except Exception:
        from backend.proof_pack_autoregister import install as _install_proof_pack_routes
    _install_proof_pack_routes()
except Exception:
    # Never block app startup from Proof Pack route registration shim.
    pass

try:
    try:
        from real_operator_autoregister import install as _install_real_operator_routes
    except Exception:
        from backend.real_operator_autoregister import install as _install_real_operator_routes
    _install_real_operator_routes()
except Exception:
    # Never block app startup from real operator route registration shim.
    pass
