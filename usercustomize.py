import inspect
import sys

try:
    import churvox_command_live_smoke_guard  # noqa: F401
except Exception:
    try:
        from backend import churvox_command_live_smoke_guard  # noqa: F401
    except Exception:
        pass

try:
    import churvox_admin_ledger_autoload  # noqa: F401
except Exception:
    try:
        from backend import churvox_admin_ledger_autoload  # noqa: F401
    except Exception:
        pass

try:
    import churvox_auth_login_fast_patch  # noqa: F401
except Exception:
    try:
        from backend import churvox_auth_login_fast_patch  # noqa: F401
    except Exception:
        pass

try:
    import churvox_worker_login_bridge_patch  # noqa: F401
except Exception:
    try:
        from backend import churvox_worker_login_bridge_patch  # noqa: F401
    except Exception:
        pass

try:
    import churvox_owner_cockpit_control_patch  # noqa: F401
except Exception:
    try:
        from backend import churvox_owner_cockpit_control_patch  # noqa: F401
    except Exception:
        pass


def _install_churvox_real_ai_hook():
    try:
        from fastapi import FastAPI
    except Exception:
        return

    if getattr(FastAPI, "_churvox_real_ai_hooked", False):
        return

    original_include_router = FastAPI.include_router

    def include_router_with_real_ai(self, router, *args, **kwargs):
        result = original_include_router(self, router, *args, **kwargs)
        try:
            if getattr(self.state, "churvox_real_ai_operator_routes_installed", False):
                return result
            for frame_info in inspect.stack():
                path = str(frame_info.filename or "").replace("\\", "/")
                if frame_info.function != "install" or not path.endswith("xero_routes.py"):
                    continue
                local_db = frame_info.frame.f_locals.get("db")
                local_get_current_user = frame_info.frame.f_locals.get("get_current_user")
                if local_db is None or local_get_current_user is None:
                    return result
                try:
                    from churvox_ai_operator_routes import build_ai_operator_router
                except Exception:
                    from backend.churvox_ai_operator_routes import build_ai_operator_router
                try:
                    from churvox_command_compat_routes import build_command_compat_router
                except Exception:
                    from backend.churvox_command_compat_routes import build_command_compat_router
                try:
                    from churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
                except Exception:
                    from backend.churvox_paid_launch_readiness_routes import build_paid_launch_readiness_router
                try:
                    from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
                except Exception:
                    from backend.churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router
                try:
                    from churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router
                except Exception:
                    from backend.churvox_command_human_mimic_guard_routes import build_command_human_mimic_guard_router
                try:
                    from churvox_command_human_mimic_routes import build_command_human_mimic_router
                except Exception:
                    from backend.churvox_command_human_mimic_routes import build_command_human_mimic_router
                try:
                    from churvox_command_mimic_intelligence_routes import build_command_mimic_intelligence_router
                except Exception:
                    from backend.churvox_command_mimic_intelligence_routes import build_command_mimic_intelligence_router
                try:
                    from churvox_job_done_routes import build_job_done_router
                except Exception:
                    from backend.churvox_job_done_routes import build_job_done_router
                try:
                    from churvox_owner_intelligence_routes import build_owner_intelligence_router
                except Exception:
                    from backend.churvox_owner_intelligence_routes import build_owner_intelligence_router
                try:
                    from churvox_launch_hardening_routes import build_launch_hardening_router, install_permission_middleware
                except Exception:
                    from backend.churvox_launch_hardening_routes import build_launch_hardening_router, install_permission_middleware
                try:
                    from churvox_command_apply_routes import build_command_apply_router
                except Exception:
                    from backend.churvox_command_apply_routes import build_command_apply_router
                try:
                    from churvox_command_routes import build_command_router
                except Exception:
                    from backend.churvox_command_routes import build_command_router
                from bson import ObjectId
                self.state.churvox_real_ai_operator_routes_installing = True
                original_include_router(self, build_ai_operator_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Register compatibility endpoints first so live smoke and worker app routes cannot be shadowed.
                original_include_router(self, build_command_compat_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_paid_launch_readiness_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_human_mimic_marker_router(), prefix="/api")
                # Mount Job Done immediately after the public build marker so later optional routers cannot block it.
                job_done_get_mounted = any(
                    getattr(route, "path", "") == "/api/job-done/closeouts"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                if not job_done_get_mounted:
                    original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Churvox Intelligence reads the same business records and remains owner-controlled.
                intelligence_summary_mounted = any(
                    getattr(route, "path", "") == "/api/owner-intelligence/summary"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                if not intelligence_summary_mounted:
                    original_include_router(self, build_owner_intelligence_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                launch_summary_mounted = any(
                    getattr(route, "path", "") == "/api/launch-hardening/summary"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                if not launch_summary_mounted:
                    original_include_router(self, build_launch_hardening_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                install_permission_middleware(self, local_db, local_get_current_user)
                original_include_router(self, build_command_human_mimic_guard_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_human_mimic_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_mimic_intelligence_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Register the safe approval executor before the older record-only Command routes.
                original_include_router(self, build_command_apply_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                job_done_get_mounted = any(
                    getattr(route, "path", "") == "/api/job-done/closeouts"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                job_done_marker_mounted = any(
                    getattr(route, "path", "") == "/api/job-done/marker"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                intelligence_summary_mounted = any(
                    getattr(route, "path", "") == "/api/owner-intelligence/summary"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                intelligence_marker_mounted = any(
                    getattr(route, "path", "") == "/api/owner-intelligence/marker"
                    and "GET" in set(getattr(route, "methods", set()) or set())
                    for route in self.router.routes
                )
                if not job_done_get_mounted or not job_done_marker_mounted:
                    raise RuntimeError("Job Done routes did not mount during Churvox startup")
                launch_summary_mounted = any(getattr(route, "path", "") == "/api/launch-hardening/summary" and "GET" in set(getattr(route, "methods", set()) or set()) for route in self.router.routes)
                launch_marker_mounted = any(getattr(route, "path", "") == "/api/launch-hardening/marker" and "GET" in set(getattr(route, "methods", set()) or set()) for route in self.router.routes)
                if not intelligence_summary_mounted or not intelligence_marker_mounted:
                    raise RuntimeError("Churvox Intelligence routes did not mount during startup")
                if not launch_summary_mounted or not launch_marker_mounted:
                    raise RuntimeError("Churvox Go Live & Trust routes did not mount during startup")
                self.state.churvox_job_done_routes_installed = True
                self.state.churvox_owner_intelligence_routes_installed = True
                self.state.churvox_launch_hardening_routes_installed = True
                self.state.churvox_real_ai_operator_routes_installed = True
                self.state.churvox_real_ai_operator_routes_installing = False
                return result
        except Exception as exc:
            self.state.churvox_real_ai_operator_routes_installed = False
            self.state.churvox_real_ai_operator_routes_installing = False
            print(f"Churvox real AI/Command route install skipped: {exc}", file=sys.stderr)
        return result

    FastAPI.include_router = include_router_with_real_ai
    FastAPI._churvox_real_ai_hooked = True


_install_churvox_real_ai_hook()
