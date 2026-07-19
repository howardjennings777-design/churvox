from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
PLATFORM_OWNER_EMAIL = "hello@churvox.com"
OWNER_EMAILS = {
    PLATFORM_OWNER_EMAIL,
    "howardjennings77@gmail.com",
    "howardjennings777@gmail.com",
}

# These modules all own or protect one or more live HQ endpoints. They were
# written at different times and some use a single owner string while others
# use an owner set. Canonicalising them here keeps one verified allow-list
# without weakening HQ access to generic business admins.
HQ_OWNER_MODULES = [
    "churvox_hq_paid_launch_report_patch",
    "churvox_hq_paid_launch_filter_patch",
    "churvox_hq_paid_launch_postguard_patch",
    "churvox_hq_connection_status_patch",
    "churvox_hq_owner_access_fix_patch",
    "churvox_hq_tester_status_patch",
    "churvox_hq_tester_system_patch",
    "churvox_hq_control_access_final_patch",
    "churvox_hq_unique_visitors_patch",
    "churvox_hq_nz_day_visits_patch",
    "churvox_hq_growth_report_patch",
    "churvox_hq_account_delete_patch",
    "churvox_hq_hello_only_guard_patch",
    "churvox_owner_cockpit_control_patch",
    "churvox_platform_owner_routes",
    "churvox_tester_outreach_desk_patch",
    "churvox_tester_outreach_import_patch",
    "churvox_email_provider_status_patch",
]


def _low(value):
    return str(value or "").strip().lower()


def _is_verified_owner(value):
    return _low(value) in OWNER_EMAILS


def _canonical_owner_email(value):
    clean = _low(value)
    return PLATFORM_OWNER_EMAIL if clean in OWNER_EMAILS else clean


def _owner_email_predicate(value):
    return _is_verified_owner(value)


def _owner_emails():
    return set(OWNER_EMAILS)


def _import_optional(name: str):
    for candidate in (name, f"backend.{name}"):
        try:
            return importlib.import_module(candidate)
        except Exception:
            continue
    return None


def _wrap_email_reader(mod, attr_name):
    original = getattr(mod, attr_name, None)
    if not callable(original) or getattr(original, "__churvox_owner_alias_reader__", False):
        return

    def reader(value, *args, _original=original, **kwargs):
        result = _original(value, *args, **kwargs)
        return _canonical_owner_email(result)

    reader.__name__ = getattr(original, "__name__", attr_name)
    reader.__churvox_owner_alias_reader__ = True
    setattr(mod, attr_name, reader)


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
        if hasattr(mod, "PLATFORM_OWNER_EMAILS"):
            current = getattr(mod, "PLATFORM_OWNER_EMAILS", None)
            mod.PLATFORM_OWNER_EMAILS = list(OWNER_EMAILS) if isinstance(current, list) else set(OWNER_EMAILS)
        if hasattr(mod, "OWNER_FILTER_EMAILS"):
            mod.OWNER_FILTER_EMAILS = set(OWNER_EMAILS)

        # Endpoint closures look these helpers up from module globals at request
        # time, so replacing them also repairs routes that were already mounted.
        for attr_name in ("is_owner_email", "_is_owner_email"):
            if hasattr(mod, attr_name):
                setattr(mod, attr_name, _owner_email_predicate)
        if hasattr(mod, "owner_emails"):
            mod.owner_emails = _owner_emails

        # Older HQ modules compare their extracted email to the canonical hello
        # address. Return hello for either verified Gmail owner alias so those
        # exact checks continue to work without opening HQ to ordinary admins.
        for attr_name in ("_email", "email_of", "_email_of"):
            _wrap_email_reader(mod, attr_name)
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
