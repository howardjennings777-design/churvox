"""Churvox OS v2 saved record queue.

Stores owner drawer edits when a page is not yet wired to a specific CRUD endpoint.
This keeps the UI honest: save clicks become auditable queued admin records.
"""

from __future__ import annotations

import builtins
import sys
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

_ORIGINAL_IMPORT = builtins.__import__


def _utc():
    return datetime.now(timezone.utc)


def _text(value):
    if value is None:
        return ""
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return str(value or "").strip()


def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if isinstance(value, datetime):
            out[key] = value.isoformat()
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


def _business_id(user):
    return _text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("id") or (user or {}).get("_id"))


def _user_id(user):
    return _text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("email"))


def _install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None or getattr(app.state, "os_v2_saved_records_patch", False):
        return

    router = APIRouter(prefix="/api")

    @router.post("/os-v2/saved-records")
    async def save_os_v2_record(payload: dict, current_user: dict = Depends(get_current_user)):
        now = _utc()
        record = {
            "business_id": _business_id(current_user),
            "user_id": _user_id(current_user),
            "user_email": _text((current_user or {}).get("email")),
            "kind": _text(payload.get("kind") or "record"),
            "action": _text(payload.get("action") or "save"),
            "fields": payload.get("fields") if isinstance(payload.get("fields"), dict) else {},
            "source": "churvox_os_v2_drawer",
            "status": "queued_for_sync",
            "requires_owner_approval": False,
            "created_at": now,
            "updated_at": now,
        }
        result = await db.os_v2_saved_records.insert_one(record)
        record["_id"] = result.inserted_id
        return {"success": True, "queued": True, "record": _safe(record)}

    @router.get("/os-v2/saved-records")
    async def list_os_v2_records(current_user: dict = Depends(get_current_user)):
        bid = _business_id(current_user)
        rows = []
        try:
            cursor = db.os_v2_saved_records.find({"business_id": bid}).sort("created_at", -1).limit(80)
            async for row in cursor:
                rows.append(_safe(row))
        except Exception:
            rows = []
        return {"success": True, "records": rows, "items": rows, "data": rows}

    app.include_router(router)
    app.state.os_v2_saved_records_patch = True


def _patched_import(name, globals=None, locals=None, fromlist=(), level=0):  # noqa: A002
    module = _ORIGINAL_IMPORT(name, globals, locals, fromlist, level)
    if name == "server" or name.endswith(".server"):
        _install(sys.modules.get(name) or module)
    return module


if getattr(builtins, "__churvox_os_v2_saved_records_patch__", False) is not True:
    builtins.__churvox_os_v2_saved_records_patch__ = True
    builtins.__import__ = _patched_import

for module_name in ("server", "backend.server"):
    loaded = sys.modules.get(module_name)
    if loaded is not None:
        _install(loaded)
