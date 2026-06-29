from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_command_readiness_patch as readiness

TARGETS = {"server", "backend.server"}
INSTALLED = set()


_ORIGINAL_PREPARE_INVOICE = readiness.prepare_invoice_draft
_ORIGINAL_PREPARE_QUOTE = readiness.prepare_quote_draft
_ORIGINAL_PREPARE_MESSAGE = readiness.prepare_message_draft


def safe_parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        text = value.strip()
        try:
            parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            pass
        try:
            parsed = datetime.fromisoformat(text[:10])
            return parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None
    return None


async def safe_find_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def update_existing(collection, query, update):
    try:
        await collection.update_one(query, {"$set": update})
    except Exception:
        pass


async def hardened_prepare_invoice_draft(db, user, ObjectId, job_id, payload=None):
    business_id = readiness.business_id(user)
    existing = await safe_find_one(db.invoices, {
        "business_id": business_id,
        "job_id": str(job_id),
        "source": "command_readiness_engine",
        "status": "draft",
        "review_status": {"$in": ["waiting_owner_review", "needs_owner_edit", "draft"]},
    })
    if existing:
        await update_existing(db.invoices, {"_id": existing.get("_id")}, {"updated_at": readiness.now_utc(), "prepared_only": True, "auto_sent": False, "accounting_synced": False})
        return {"success": True, "invoice": readiness.json_safe(existing), "message": "Invoice draft is already waiting for owner review. Nothing was sent."}
    return await _ORIGINAL_PREPARE_INVOICE(db, user, ObjectId, job_id, payload)


async def hardened_prepare_quote_draft(db, user, ObjectId, job_id, payload=None):
    business_id = readiness.business_id(user)
    existing = await safe_find_one(db.quotes, {
        "business_id": business_id,
        "source_job_id": str(job_id),
        "source": "command_readiness_engine",
        "status": "draft",
        "review_status": {"$in": ["waiting_owner_review", "needs_owner_edit", "draft"]},
    })
    if existing:
        await update_existing(db.quotes, {"_id": existing.get("_id")}, {"updated_at": readiness.now_utc(), "prepared_only": True, "auto_sent": False})
        return {"success": True, "quote": readiness.json_safe(existing), "message": "Quote draft is already waiting for owner review. Nothing was sent."}
    return await _ORIGINAL_PREPARE_QUOTE(db, user, ObjectId, job_id, payload)


async def hardened_prepare_message_draft(db, user, ObjectId, job_id, payload=None):
    kind = readiness.lower((payload or {}).get("kind") or "follow_up")
    business_id = readiness.business_id(user)
    existing = await safe_find_one(db.customer_message_drafts, {
        "business_id": business_id,
        "job_id": str(job_id),
        "type": kind,
        "source": "command_readiness_engine",
        "status": "draft",
        "review_status": {"$in": ["waiting_owner_review", "needs_owner_edit", "draft"]},
    })
    if existing:
        await update_existing(db.customer_message_drafts, {"_id": existing.get("_id")}, {"updated_at": readiness.now_utc(), "prepared_only": True, "auto_sent": False})
        return {"success": True, "message_draft": readiness.json_safe(existing), "message": "Customer update draft is already waiting for owner review. Nothing was sent."}
    return await _ORIGINAL_PREPARE_MESSAGE(db, user, ObjectId, job_id, payload)


readiness.parse_dt = safe_parse_dt
readiness.prepare_invoice_draft = hardened_prepare_invoice_draft
readiness.prepare_quote_draft = hardened_prepare_quote_draft
readiness.prepare_message_draft = hardened_prepare_message_draft


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    # Importing this module patches churvox_command_readiness_patch globals used by its already-registered routes.
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
