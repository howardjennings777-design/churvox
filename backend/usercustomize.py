import inspect
import sys

try:
    import churvox_auth_login_fast_patch  # noqa: F401
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
                from bson import ObjectId
                self.state.churvox_real_ai_operator_routes_installed = True
                original_include_router(self, build_ai_operator_router(local_db, local_get_current_user, ObjectId), prefix="/api")
                return result
        except Exception as exc:
            print(f"Churvox real AI route install skipped: {exc}", file=sys.stderr)
        return result

    FastAPI.include_router = include_router_with_real_ai
    FastAPI._churvox_real_ai_hooked = True


_install_churvox_real_ai_hook()
