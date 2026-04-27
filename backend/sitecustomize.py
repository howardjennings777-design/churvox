"""Auto-install Churvox launch/top-player boot layer when backend server loads.

Python imports sitecustomize automatically on startup when this directory is on
sys.path. Render/uvicorn commonly starts from backend with `server:app`, so this
small import hook safely installs the sweep without editing the huge server.py.
"""
from __future__ import annotations

import importlib.abc
import importlib.machinery
import sys


class _ServerBootLoader(importlib.abc.Loader):
    def __init__(self, wrapped):
        self.wrapped = wrapped

    def create_module(self, spec):
        if hasattr(self.wrapped, "create_module"):
            return self.wrapped.create_module(spec)
        return None

    def exec_module(self, module):
        self.wrapped.exec_module(module)
        try:
            from top_player_boot import install_top_player_boot
            install_top_player_boot(module)
        except Exception as exc:
            print(f"TOP_PLAYER_BOOT_INSTALL_ERR {exc}")


class _ServerBootFinder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname != "server":
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if not spec or not spec.loader:
            return spec
        if isinstance(spec.loader, _ServerBootLoader):
            return spec
        spec.loader = _ServerBootLoader(spec.loader)
        return spec


if not any(isinstance(finder, _ServerBootFinder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _ServerBootFinder())
