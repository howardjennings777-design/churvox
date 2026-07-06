from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()


def install(module):
    target = getattr(module, "legacy", None) or module
    name = getattr(target, "__name__", getattr(module, "__name__", ""))
    if name in INSTALLED:
        return
    try:
        patch = importlib.import_module("churvox_admin_ledger_routes_patch")
        installer = getattr(patch, "install", None)
        if installer:
            installer(target)
            INSTALLED.add(name)
    except Exception as exc:
        print(f"Churvox admin ledger autoload skipped: {exc}", file=sys.stderr)


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
