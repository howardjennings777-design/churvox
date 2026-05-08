"""Churvox backend app package.

This package also installs a small AI Operator route autowire hook.

Why this exists:
- The current backend/server.py file is very large and is the production entrypoint.
- The AI Operator engine is built as a separate safe module.
- This hook mounts the AI Operator router when server.py includes the main /api router, without needing to rewrite the huge server.py file.

The hook is defensive. If required server globals are not ready, it does nothing.
"""


def _install_ai_operator_autowire():
    try:
        from fastapi import FastAPI
    except Exception:
        return

    if getattr(FastAPI, "_churvox_ai_operator_autowire_installed", False):
        return

    original_include_router = FastAPI.include_router

    def include_router_with_ai_operator(self, router, *args, **kwargs):
        try:
            import sys

            server_module = (
                sys.modules.get("server")
                or sys.modules.get("backend.server")
                or sys.modules.get("main")
            )

            db = getattr(server_module, "db", None) if server_module else None
            get_current_user = getattr(server_module, "get_current_user", None) if server_module else None
            get_user_business_id = getattr(server_module, "get_user_business_id", None) if server_module else None

            prefix = getattr(router, "prefix", "")
            already_mounted = getattr(router, "_churvox_ai_operator_mounted", False)

            if (
                prefix == "/api"
                and not already_mounted
                and db is not None
                and get_current_user is not None
                and get_user_business_id is not None
            ):
                from ai_operator_routes import create_ai_operator_router

                router.include_router(
                    create_ai_operator_router(db, get_current_user, get_user_business_id)
                )
                setattr(router, "_churvox_ai_operator_mounted", True)
                print("Churvox AI Operator routes mounted at /api/ai/operator")
        except Exception as exc:
            # Never break production startup because of AI Operator autowiring.
            print(f"Churvox AI Operator autowire skipped: {exc}")

        return original_include_router(self, router, *args, **kwargs)

    FastAPI.include_router = include_router_with_ai_operator
    setattr(FastAPI, "_churvox_ai_operator_autowire_installed", True)


_install_ai_operator_autowire()
