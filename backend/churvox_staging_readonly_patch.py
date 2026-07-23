"""Read-only HTTP guard for the private Churvox staging environment.

Enabled only when CHURVOX_STAGING_READ_ONLY is truthy. The guard allows reads
and authentication, but blocks business mutations, sends, charges, syncs,
files, payments and record changes before route handlers run.
"""

from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import os
import sys
from typing import Any

from starlette.responses import JSONResponse

TARGETS = {"server", "backend.server"}
INSTALLED: set[str] = set()
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
AUTH_MUTATION_PATHS = {
    "/api/auth/login",
    "/api/worker/auth/login",
    "/api/admin/login",
    "/api/auth/refresh",
    "/api/auth/logout",
}


def _truthy(value: Any) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _enabled() -> bool:
    return _truthy(os.environ.get("CHURVOX_STAGING_READ_ONLY"))


def _auth_path(path: str) -> bool:
    clean = str(path or "").rstrip("/") or "/"
    if clean in AUTH_MUTATION_PATHS:
        return True
    return clean.endswith("/login") and clean.startswith(("/api/auth/", "/api/worker/", "/api/admin/"))


def install(module: Any) -> None:
    if not _enabled():
        return

    name = str(getattr(module, "__name__", ""))
    app = getattr(module, "app", None)
    if app is None or getattr(app.state, "churvox_staging_readonly_installed", False):
        return

    @app.middleware("http")
    async def churvox_staging_readonly(request, call_next):
        method = str(request.method or "GET").upper()
        path = str(request.url.path or "/")

        if method not in SAFE_METHODS and not _auth_path(path):
            response = JSONResponse(
                status_code=423,
                content={
                    "success": False,
                    "staging_read_only": True,
                    "detail": "Private Churvox staging is read-only. Nothing was sent, charged, synced, filed, paid, deleted or changed.",
                },
            )
        else:
            response = await call_next(request)

        response.headers["X-Churvox-Environment"] = "staging-read-only"
        response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
        return response

    app.state.churvox_staging_readonly_installed = True
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
    if loaded is not None:
        install(loaded)
