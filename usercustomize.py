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
                    from churvox_command_apply_routes import build_command_apply_router
                except Exception:
                    from backend.churvox_command_apply_routes import build_command_apply_router
                try:
                    from churvox_command_routes import build_command_router
                except Exception:
                    from backend.churvox_command_routes import build_command_router
                from bson import ObjectId
                self.state.churvox_real_ai_operator_routes_installed = True
                original_include_router(self, build_ai_operator_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Register compatibility endpoints first so live smoke and worker app routes cannot be shadowed.
                original_include_router(self, build_command_compat_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_paid_launch_readiness_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_human_mimic_marker_router(), prefix="/api")
                original_include_router(self, build_command_human_mimic_guard_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_human_mimic_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_mimic_intelligence_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Persisted closeouts and Money Radar must be registered before the approval executor.
                original_include_router(self, build_job_done_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                # Register the safe approval executor before the older record-only Command routes.
                original_include_router(self, build_command_apply_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                original_include_router(self, build_command_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                return result
        except Exception as exc:
            print(f"Churvox real AI/Command route install skipped: {exc}", file=sys.stderr)
        return result

    FastAPI.include_router = include_router_with_real_ai
    FastAPI._churvox_real_ai_hooked = True


_install_churvox_real_ai_hook()
