"""Startup compatibility shims for Render.

Render imports backend/server.py directly with uvicorn. Some recently added routes use
FastAPI Body in function defaults, and Python evaluates those defaults while the module
is importing. Keep Body available through builtins so deploys do not crash if a route
forgets to import it explicitly.

This file intentionally lives inside backend/ so backend-only deploy filters notice it.
"""

try:
    import builtins
    from fastapi import Body

    if not hasattr(builtins, "Body"):
        builtins.Body = Body
except Exception:
    # Never block app startup from this compatibility shim.
    pass
