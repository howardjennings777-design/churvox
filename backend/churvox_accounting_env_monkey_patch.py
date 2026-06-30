from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import os
import sys

TARGETS = {"churvox_accounting_routes", "backend.churvox_accounting_routes"}
DONE = set()


def env_key(*parts):
    return "".join(parts)


def configured_account():
    return str(os.environ.get(env_key("STRIPE", "_ONSITE", "_ACCOUNT", "_ID")) or "").strip()


def business_id(user):
    return str(
        user.get("business_id")
        or user.get("businessId")
        or user.get("business")
        or user.get("id")
        or user.get("_id")
        or ""
    ).strip()


async def patched_payment_settings(module, db, user, owner=None):
    bid = business_id(user)
    owner = owner or await module._owner_doc(db, user)
    settings = await db.payment_settings.find_one({"business_id": bid}) or {}
    account_id = str(
        settings.get("stripe_account_id")
        or owner.get("stripe_account_id")
        or owner.get("stripe_connected_account_id")
        or configured_account()
        or ""
    ).strip()
    if account_id and not settings.get("stripe_account_id"):
        try:
            now = datetime.now(timezone.utc)
            await db.payment_settings.update_one(
                {"business_id": bid},
                {
                    "$set": {
                        "business_id": bid,
                        "provider": "stripe",
                        "stripe_account_id": account_id,
                        "setup_source": "render_config",
                        "updated_at": now,
                    },
                    "$setOnInsert": {"created_at": now},
                },
                upsert=True,
            )
            settings = await db.payment_settings.find_one({"business_id": bid}) or settings
        except Exception:
            pass
    return settings, owner, account_id


def install(module):
    name = getattr(module, "__name__", "")
    if name in DONE:
        return
    if not hasattr(module, "_owner_doc"):
        return

    async def _payment_settings(db, user, owner=None):
        return await patched_payment_settings(module, db, user, owner)

    module._payment_settings = _payment_settings
    DONE.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None

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


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
