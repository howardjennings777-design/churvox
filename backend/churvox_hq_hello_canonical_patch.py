from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
PLATFORM_OWNER_EMAIL = "hello@churvox.com"
OWNER_EMAILS = {PLATFORM_OWNER_EMAIL}

HQ_OWNER_MODULES = [
    "churvox_hq_paid_launch_report_patch",
    "churvox_hq_paid_launch_filter_patch",
    "churvox_hq_connection_status_patch",
    "churvox_owner_cockpit_control_patch",
    "churvox_hq_account_delete_patch",
    "churvox_hq_growth_report_patch",
    "churvox_platform_owner_routes",
]


def _import_optional(name: str):
    for candidate in (name, f"backend.{name}"):
        try:
            return importlib.import_module(candidate)
        except Exception:
            continue
    return None


def _canonicalise_module(mod):
    if mod is None:
        return
    try:
        if hasattr(mod, "PLATFORM_OWNER_EMAIL"):
            mod.PLATFORM_OWNER_EMAIL = PLATFORM_OWNER_EMAIL
        if hasattr(mod, "OWNER_EMAIL"):
            mod.OWNER_EMAIL = PLATFORM_OWNER_EMAIL
        if hasattr(mod, "OWNER_EMAILS"):
            mod.OWNER_EMAILS = set(OWNER_EMAILS)
        if hasattr(mod, "OWNER_FILTER_EMAILS"):
            mod.OWNER_FILTER_EMAILS = set(OWNER_EMAILS)
    except Exception:
        pass


def canonicalise_hq_owner_email():
    for name in HQ_OWNER_MODULES:
        _canonicalise_module(_import_optional(name))


def install(module=None):
    name = getattr(module, "__name__", "runtime") if module is not None else "runtime"
    if name in INSTALLED:
        return
    canonicalise_hq_owner_email()
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
        if any(module.__name__.endswith(name) for name in HQ_OWNER_MODULES):
            _canonicalise_module(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if not any(fullname == name or fullname.endswith(f".{name}") for name in HQ_OWNER_MODULES):
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

canonicalise_hq_owner_email()

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
