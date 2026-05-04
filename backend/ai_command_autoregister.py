"""Safe auto-registration helper for the AI Command Hub routes.

This exists because backend/server.py is very large and risky to patch directly.
When sitecustomize is loaded by Python, it installs a tiny import hook. After the
main FastAPI server module finishes importing, this helper registers the Command
Hub router onto the live app without touching the existing routes.
"""

import importlib
import logging

logger = logging.getLogger(__name__)
_PATCHED = False
_ORIGINAL_IMPORT_MODULE = importlib.import_module


def _register_on_server_module(module):
    if getattr(module, "_AI_COMMAND_HUB_AUTOREGISTERED", False):
        return module

    required = ["app", "db", "get_current_user", "get_user_business_id", "APIRouter"]
    missing = [name for name in required if not hasattr(module, name)]
    if missing:
        return module

    try:
        try:
            from command_hub_routes import register_command_hub_routes
        except Exception:
            from backend.command_hub_routes import register_command_hub_routes

        router = module.APIRouter(prefix="/api")
        register_command_hub_routes(
            router,
            module.db,
            module.get_current_user,
            module.get_user_business_id,
        )
        module.app.include_router(router)
        setattr(module, "_AI_COMMAND_HUB_AUTOREGISTERED", True)
        logger.info("AI Command Hub routes auto-registered")
    except Exception as exc:
        logger.exception("AI Command Hub auto-registration failed: %s", exc)

    return module


def install():
    global _PATCHED
    if _PATCHED:
        return
    _PATCHED = True

    def patched_import_module(name, package=None):
        module = _ORIGINAL_IMPORT_MODULE(name, package)
        if name in {"server", "backend.server"}:
            return _register_on_server_module(module)
        return module

    importlib.import_module = patched_import_module
