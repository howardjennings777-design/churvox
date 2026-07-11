from __future__ import annotations

import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    is_platform_owner = getattr(module, "is_platform_owner", None)
    ObjectId = getattr(module, "ObjectId", None)
    build_platform_owner_router = getattr(module, "build_platform_owner_router", None)
    logger = getattr(module, "logger", None)

    if app is None or db is None or get_current_user is None or is_platform_owner is None or ObjectId is None or build_platform_owner_router is None:
        return

    try:
        # FastAPI copies router routes when include_router runs. This patch executes
        # after server.py has already included api_router, so mount the HQ router
        # directly on the app with the /api prefix.
        state = getattr(app, "state", None)
        if state is not None and getattr(state, "churvox_hq_router_mounted", False):
            INSTALLED.add(name)
            return
        app.include_router(build_platform_owner_router(db, get_current_user, is_platform_owner, ObjectId), prefix="/api")
        if state is not None:
            state.churvox_hq_router_mounted = True
        if logger:
            logger.info("Churvox HQ owner router mounted on app")
    except Exception as exc:
        if logger:
            logger.warning("Churvox HQ owner router mount skipped: %s", exc)
        else:
            print(f"Churvox HQ owner router mount skipped: {exc}", file=sys.stderr)
        return

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
