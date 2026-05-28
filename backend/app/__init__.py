# CHURVOX_TOP_TIER_BACKEND_ENDPOINTS_HOOK_20260528
# This package is imported by server.py via app.plan_rules.
# Register tiny top-tier API aliases after server.py finishes defining app/db.

import importlib
import threading


def _try_register_top_tier_routes(attempt=0):
    try:
        srv = importlib.import_module("server")
        patch = importlib.import_module("churvox_top_tier_routes")
        if patch.register(srv):
            return
    except Exception as exc:
        if attempt >= 12:
            print("CHURVOX_TOP_TIER_BACKEND_ENDPOINTS_HOOK_FAILED", repr(exc))
            return
    threading.Timer(0.25, _try_register_top_tier_routes, kwargs={"attempt": attempt + 1}).start()


_try_register_top_tier_routes()
