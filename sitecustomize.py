"""Root-level startup compatibility shim for Render.

Some generated FastAPI routes in backend/server.py use Body(...) in function
defaults. Python evaluates those defaults while importing the module, so Body
must exist before server.py is imported.
"""

try:
    import builtins
    from fastapi import Body

    builtins.Body = Body
except Exception:
    pass
