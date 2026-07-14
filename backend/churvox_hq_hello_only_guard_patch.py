from __future__ import annotations

from datetime import datetime, timezone
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
PLATFORM_OWNER_EMAIL = "hello@churvox.com"
OUTREACH_WRAPPER_VERSION = "churvox-outreach-live-wrapper-20260715b"
HQ_PATH_PREFIXES = (
    "/api/admin/owner",
    "/api/platform/hq",
)
HQ_EXACT_PATHS = {
    "/api/platform/hq",
}
OUTREACH_ROUTES = {
    ("GET", "/api/admin/owner/tester-outreach"),
    ("POST", "/api/admin/owner/tester-outreach/draft"),
    ("POST", "/api/admin/owner/tester-outreach/send"),
    ("POST", "/api/admin/owner/tester-outreach/status"),
    ("POST", "/api/admin/owner/tester-outreach/import-drafts"),
}


def _text(value):
    return str(value or "").strip()


def _email(user):
    return _text((user or {}).get("email") or (user or {}).get("user_email") or (user or {}).get("owner_email")).lower()


def _is_hq_path(path: str) -> bool:
    path = _text(path)
    return path in HQ_EXACT_PATHS or any(path.startswith(prefix) for prefix in HQ_PATH_PREFIXES)


def _with_cors(response, request):
    origin = request.headers.get("origin") or "https://www.churvox.com"
    if origin not in {"https://www.churvox.com", "https://churvox.com", "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"}:
        origin = "https://www.churvox.com"
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers") or "Authorization,Content-Type,Accept,X-Requested-With"
    response.headers["Vary"] = "Origin"
    return response


def _route_owners(app):
    owners = {}
    for method, path in sorted(OUTREACH_ROUTES):
        matches = []
        for route in list(getattr(getattr(app, "router", None), "routes", []) or []):
            if getattr(route, "path", "") != path:
                continue
            methods = set(getattr(route, "methods", set()) or set())
            if method not in methods:
                continue
            endpoint = getattr(route, "endpoint", None)
            matches.append(getattr(endpoint, "__name__", "unknown"))
        owners[f"{method} {path}"] = matches
    return owners


def _remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method.upper() in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def _install_outreach_routes(module):
    app = getattr(module, "app", None)
    if app is None:
        return False, ["app_missing"]

    errors = []
    target_name = getattr(module, "__name__", "")
    for patch_name in (
        "churvox_tester_outreach_desk_patch",
        "churvox_tester_outreach_import_patch",
    ):
        try:
            try:
                patch = __import__(patch_name)
            except Exception:
                patch = __import__(f"backend.{patch_name}", fromlist=[patch_name])
            installed = getattr(patch, "INSTALLED", None)
            if isinstance(installed, set):
                installed.discard(target_name)
            installer = getattr(patch, "install", None)
            if not installer:
                raise RuntimeError("install function missing")
            installer(module)
        except Exception as exc:
            errors.append(f"{patch_name}:{type(exc).__name__}:{exc}")
            print(f"Churvox Outreach live-wrapper patch failed: {patch_name}: {exc}", file=sys.stderr)

    async def outreach_boot_marker():
        route_owners = _route_owners(app)
        ready = all(bool(route_owners.get(f"{method} {path}")) for method, path in OUTREACH_ROUTES)
        return {
            "ok": ready,
            "success": ready,
            "ready": ready,
            "version": OUTREACH_WRAPPER_VERSION,
            "live_entrypoint": "backend/server/__init__.py via uvicorn server:app",
            "route_owners": route_owners,
            "errors": errors,
            "checked_at": datetime.now(timezone.utc).isoformat(),
        }

    _remove_route(app, "/api/tester-outreach/boot", "GET")
    app.add_api_route("/api/tester-outreach/boot", outreach_boot_marker, methods=["GET"])
    owners = _route_owners(app)
    ready = all(bool(owners.get(f"{method} {path}")) for method, path in OUTREACH_ROUTES)
    return ready, errors


def install(module):
    name = getattr(module, "__name__", "")

    app = getattr(module, "app", None)
    get_current_user = getattr(module, "get_current_user", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    if app is None or get_current_user is None or JSONResponse is None:
        return

    # The live Render service starts with `uvicorn server:app`, which loads
    # backend/server/__init__.py. This patch is already guaranteed in that wrapper,
    # so mount Outreach here rather than relying on Procfile/sitecustomize paths.
    _install_outreach_routes(module)

    if name in INSTALLED:
        return

    state = getattr(app, "state", None)
    if state is not None and getattr(state, "churvox_hq_hello_only_guard", False):
        INSTALLED.add(name)
        return

    @app.middleware("http")
    async def churvox_hq_hello_only_guard(request, call_next):
        path = request.url.path
        if _is_hq_path(path):
            if request.method.upper() == "OPTIONS":
                return _with_cors(JSONResponse({"ok": True, "hq_guard": "hello_only"}), request)
            try:
                user = await get_current_user(request)
            except Exception:
                return _with_cors(JSONResponse({"success": False, "detail": "HQ login required", "owner_only": PLATFORM_OWNER_EMAIL}, status_code=401), request)
            if _email(user) != PLATFORM_OWNER_EMAIL:
                return _with_cors(JSONResponse({"success": False, "detail": f"Churvox HQ is locked to {PLATFORM_OWNER_EMAIL}", "owner_only": PLATFORM_OWNER_EMAIL}, status_code=403), request)
        return await call_next(request)

    if state is not None:
        state.churvox_hq_hello_only_guard = True
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
