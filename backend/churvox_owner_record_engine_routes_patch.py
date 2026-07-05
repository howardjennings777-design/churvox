"""Owner record engine backend routes.

Persists Churvox owner records, admin debt, timelines, and Command-linked decisions.
Safe patch module installed by backend/server/__init__.py.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends


def _now():
    return datetime.now(timezone.utc)


def _text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback
    try:
        text = str(value).strip()
        return text if text else fallback
    except Exception:
        return fallback


def _safe(value: Any):
    if isinstance(value, list):
        return [_safe(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for key, val in value.items():
            if key == "_id":
                out["id"] = _text(val)
            else:
                out[key] = _safe(val)
        return out
    if isinstance(value, datetime):
        return value.isoformat()
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def _business_id(user: dict) -> str:
    return _text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("id") or (user or {}).get("_id"))


def _user_id(user: dict) -> str:
    return _text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("email"))


def _collection(db, name: str):
    return getattr(db, name)


async def _replace_one(col, query: dict, doc: dict):
    try:
        await col.replace_one(query, doc, upsert=True)
    except TypeError:
        await col.update_one(query, {"$set": doc}, upsert=True)


def _record_key(payload: dict, fallback: str) -> str:
    return _text(payload.get("id") or payload.get("recordId") or payload.get("key") or fallback)


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None or getattr(app.state, "owner_record_engine_routes", False):
        return

    router = APIRouter(prefix="/api/owner-record-engine")

    @router.get("/state")
    async def owner_record_engine_state(current_user: dict = Depends(get_current_user)):
        bid = _business_id(current_user)
        records = []
        timeline = []
        admin_debt = []
        command = []
        try:
            async for row in _collection(db, "owner_record_engine_records").find({"business_id": bid}).sort("updated_at", -1).limit(200):
                records.append(_safe(row))
        except Exception:
            records = []
        try:
            async for row in _collection(db, "owner_record_engine_timeline").find({"business_id": bid}).sort("created_at", -1).limit(120):
                timeline.append(_safe(row))
        except Exception:
            timeline = []
        try:
            async for row in _collection(db, "owner_record_engine_admin_debt").find({"business_id": bid}).sort("updated_at", -1).limit(120):
                admin_debt.append(_safe(row))
        except Exception:
            admin_debt = []
        try:
            async for row in _collection(db, "owner_record_engine_command").find({"business_id": bid}).sort("created_at", -1).limit(80):
                command.append(_safe(row))
        except Exception:
            command = []
        return {"success": True, "records": records, "timeline": timeline, "admin_debt": admin_debt, "command": command}

    @router.post("/bulk-sync")
    async def owner_record_engine_bulk_sync(payload: dict, current_user: dict = Depends(get_current_user)):
        bid = _business_id(current_user)
        uid = _user_id(current_user)
        email = _text((current_user or {}).get("email"))
        now = _now()
        saved = {"records": 0, "timeline": 0, "admin_debt": 0, "command": 0}

        records = payload.get("records") or []
        if isinstance(records, dict):
            records = list(records.values())
        if isinstance(records, list):
            col = _collection(db, "owner_record_engine_records")
            for item in records[:250]:
                if not isinstance(item, dict):
                    continue
                rid = _record_key(item, f"record-{saved['records']}")
                doc = {**item, "record_id": rid, "business_id": bid, "user_id": uid, "user_email": email, "updated_at": now}
                await _replace_one(col, {"business_id": bid, "record_id": rid}, doc)
                saved["records"] += 1

        timeline_items = payload.get("timeline") or []
        if isinstance(timeline_items, list):
            col = _collection(db, "owner_record_engine_timeline")
            for item in timeline_items[:120]:
                if not isinstance(item, dict):
                    continue
                key = _record_key(item, f"timeline-{saved['timeline']}")
                doc = {**item, "timeline_key": key, "business_id": bid, "user_id": uid, "user_email": email, "created_at": now}
                await _replace_one(col, {"business_id": bid, "timeline_key": key}, doc)
                saved["timeline"] += 1

        debt_items = payload.get("admin_debt") or payload.get("adminDebt") or []
        if isinstance(debt_items, list):
            col = _collection(db, "owner_record_engine_admin_debt")
            for item in debt_items[:120]:
                if not isinstance(item, dict):
                    continue
                key = _record_key(item, f"debt-{saved['admin_debt']}")
                doc = {**item, "debt_key": key, "business_id": bid, "user_id": uid, "user_email": email, "updated_at": now}
                await _replace_one(col, {"business_id": bid, "debt_key": key}, doc)
                saved["admin_debt"] += 1

        command_items = payload.get("command") or []
        if isinstance(command_items, list):
            col = _collection(db, "owner_record_engine_command")
            for item in command_items[:80]:
                if not isinstance(item, dict):
                    continue
                key = _record_key(item, f"command-{saved['command']}")
                doc = {**item, "command_key": key, "business_id": bid, "user_id": uid, "user_email": email, "created_at": now, "updated_at": now}
                await _replace_one(col, {"business_id": bid, "command_key": key}, doc)
                saved["command"] += 1

        return {"success": True, "saved": saved}

    @router.post("/command/decision")
    async def owner_record_engine_command_decision(payload: dict, current_user: dict = Depends(get_current_user)):
        bid = _business_id(current_user)
        uid = _user_id(current_user)
        now = _now()
        linked_record_id = _text(payload.get("linkedRecordId") or payload.get("linked_record_id"))
        status = _text(payload.get("status") or payload.get("decision") or "Editing in Command")
        command_id = _text(payload.get("id") or payload.get("commandId") or payload.get("command_key"))
        note = _text(payload.get("note") or payload.get("ownerNote"))

        if linked_record_id:
            try:
                await _collection(db, "owner_record_engine_records").update_one(
                    {"business_id": bid, "record_id": linked_record_id},
                    {"$set": {"ownerDecision": status, "decisionAt": now, "updated_at": now}},
                    upsert=False,
                )
            except Exception:
                pass

        if command_id:
            try:
                await _collection(db, "owner_record_engine_command").update_one(
                    {"business_id": bid, "command_key": command_id},
                    {"$set": {"status": status, "note": note, "updated_at": now}},
                    upsert=False,
                )
            except Exception:
                pass

        try:
            await _collection(db, "owner_record_engine_timeline").insert_one({
                "business_id": bid,
                "user_id": uid,
                "type": "owner-decision",
                "record_id": linked_record_id,
                "command_id": command_id,
                "status": status,
                "note": note,
                "created_at": now,
            })
        except Exception:
            pass

        return {"success": True, "linked_record_id": linked_record_id, "status": status}

    app.include_router(router)
    app.state.owner_record_engine_routes = True
