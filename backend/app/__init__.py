"""Churvox backend app package.

Safe autowire hooks for modular backend routes.

This avoids risky rewrites of the large production `server.py` file while still mounting
new modular routers when the main `/api` router is included by FastAPI.
"""


def _install_churvox_route_autowire():
    try:
        from fastapi import FastAPI
    except Exception:
        return

    if getattr(FastAPI, "_churvox_route_autowire_installed", False):
        return

    original_include_router = FastAPI.include_router

    def include_router_with_churvox_modules(self, router, *args, **kwargs):
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

            if prefix == "/api" and db is not None and get_current_user is not None and get_user_business_id is not None:
                if not getattr(router, "_churvox_ai_operator_mounted", False):
                    try:
                        from ai_operator_routes import create_ai_operator_router
                        router.include_router(create_ai_operator_router(db, get_current_user, get_user_business_id))
                        setattr(router, "_churvox_ai_operator_mounted", True)
                        print("Churvox AI Operator routes mounted at /api/ai/operator")
                    except Exception as exc:
                        print(f"Churvox AI Operator autowire skipped: {exc}")

                if not getattr(router, "_churvox_invoice_automation_mounted", False):
                    try:
                        from invoice_automation_routes import create_invoice_automation_router
                        router.include_router(create_invoice_automation_router(db, get_current_user, get_user_business_id))
                        setattr(router, "_churvox_invoice_automation_mounted", True)
                        print("Churvox invoice automation routes mounted at /api/invoices/automation")
                    except Exception as exc:
                        print(f"Churvox invoice automation autowire skipped: {exc}")

        except Exception as exc:
            print(f"Churvox route autowire skipped: {exc}")

        return original_include_router(self, router, *args, **kwargs)

    FastAPI.include_router = include_router_with_churvox_modules
    setattr(FastAPI, "_churvox_route_autowire_installed", True)


_install_churvox_route_autowire()
