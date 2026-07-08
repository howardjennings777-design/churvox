"""Allow Churvox field-app browser permissions that the worker UI needs.

The main server sets a locked-down Permissions-Policy header. That is good as a
safe default, but `camera=()` and `geolocation=()` block field-worker proof/GPS
features on supported mobile browsers. This patch keeps microphone/payment
locked while allowing same-origin camera/geolocation use for Churvox.
"""

from __future__ import annotations

import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
FIELD_APP_PERMISSIONS_POLICY = "camera=(self), geolocation=(self), microphone=(), payment=()"


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    if app is None:
        return

    state = getattr(app, "state", None)
    if state is not None and getattr(state, "churvox_permissions_policy_patch_installed", False):
        return

    @app.middleware("http")
    async def churvox_allow_field_app_device_permissions(request, call_next):
        response = await call_next(request)
        response.headers["Permissions-Policy"] = FIELD_APP_PERMISSIONS_POLICY
        return response

    if state is not None:
        state.churvox_permissions_policy_patch_installed = True
    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
