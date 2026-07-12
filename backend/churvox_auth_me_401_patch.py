from __future__ import annotations

import importlib.abc
import importlib.machinery
import sys

from fastapi.responses import JSONResponse
from starlette.requests import Request

TARGETS = {"server", "backend.server"}
INSTALLED = set()
VERSION = "churvox-auth-me-401-20260712"


def _matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set())


def install(module) -> None:
    name = getattr(module, "__name__", "")
    app = getattr(module, "app", None)
    if app is None or name in INSTALLED or getattr(app.state, "churvox_auth_me_401", False):
        return

    routes = list(getattr(app.router, "routes", []) or [])
    original = next(
        (route.endpoint for route in reversed(routes) if _matches(route, "/api/auth/me", "GET")),
        None,
    )
    if original is None:
        return

    async def strict_auth_me(request: Request):
        result = await original(request)
        if isinstance(result, dict) and result.get("authenticated") is False:
            return JSONResponse(
                result,
                status_code=401,
                headers={
                    "Cache-Control": "no-store",
                    "X-Churvox-Auth-Gate": "signed-out",
                },
            )
        return result

    app.router.routes = [
        route for route in routes if not _matches(route, "/api/auth/me", "GET")
    ]
    app.add_api_route("/api/auth/me", strict_auth_me, methods=["GET"])
    app.state.churvox_auth_me_401 = VERSION
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None

    def exec_module(self, module):
        self.original.exec_module(module)
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
