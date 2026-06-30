"""Install Xero/AI routes if the large server module forgets to call xero_routes.install."""

from __future__ import annotations

import builtins
import sys

_ORIGINAL_IMPORT = builtins.__import__


def _install_on(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return
    try:
        import xero_routes
    except Exception:
        try:
            from backend import xero_routes  # type: ignore
        except Exception:
            return
    installer = getattr(xero_routes, "install", None)
    if callable(installer):
        try:
            installer(app, db, get_current_user)
        except Exception:
            pass


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        target = sys.modules.get(name) or module
        _install_on(target)
    return module


if getattr(builtins, "__churvox_xero_routes_install_patch__", False) is not True:
    builtins.__churvox_xero_routes_install_patch__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        _install_on(loaded)
