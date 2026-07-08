from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

INSTALLED = set()


def now():
    return datetime.now(timezone.utc)


def text(value: Any) -> str:
    try:
        return str(value or "").replace("\n", " ").strip()
    except Exception:
        return ""


def low(value: Any) -> str:
    return text(value).lower()


def pick(row: Dict[str, Any] | None, *names: str, default=""):
    row = row or {}
    for name in names:
        try:
            value = row.get(name)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return default


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    return value


def user_id(user):
    return text(pick(user, "id", "_id", "user_id", "email"))


def business_id(user):
    return text(pick(user, "business_id", "businessId", "owner_business_id", "contractor_id", default=user_id(user)))


def normalize_decision(payload: Dict[str, Any]) -> str:
    raw = low(pick(payload, "action", "decision", "owner_decision", "status", default="approve"))
    if any(word in raw for word in ["park", "hold", "later", "dismiss", "archive"]):
        return "park"
    if any(word in raw for word in ["edit", "save", "change"]):
        return "edit"
    if any(word in raw for word in ["reject", "decline", "cancel"]):
        return "park"
    return "approve"


def status_for(decision: str) -> str:
    if decision == "approve":
        return "approved"
    if decision == "edit":
        return "owner_edited_completed"
    return "parked_dismissed"


def decision_label(decision: str) -> str:
    if decision == "approve":
        return "Approved for owner-controlled next step"
    if decision == "edit":
        return "Edited and saved for owner-controlled next step"
    return "Parked by owner"


def action_id_from(action_id: str | None, payload: Dict[str, Any]) -> str:
    item = payload.get("item") if isinstance(payload.get("item"), dict) else {}
    return text(action_id or payload.get("action_id") or payload.get("id") or payload.get("source_id") or item.get("id") or item.get("action_id")) or f"admin-brain-decision-{int(now().timestamp() * 1000)}"


async def read_payload(request):
    try:
        body = await request.json()
        return body if isinstance(body, dict) else {}
    except Exception:
        return {}


async def find_existing(db, bid: str, aid: str):
    try:
        return await db.ai_approval_actions.find_one({"business_id": bid, "id": aid})
    except Exception:
        return None


async def write_owner_decision(db, user, action_id: str, payload: Dict[str, Any]):
    bid = business_id(user)
    uid = user_id(user)
    aid = action_id_from(action_id, payload)
    decision = normalize_decision(payload)
    status = status_for(decision)
    item = payload.get("item") if isinstance(payload.get("item"), dict) else {}
    fields = item.get("fields") if isinstance(item.get("fields"), dict) else payload.get("fields") if isinstance(payload.get("fields"), dict) else {}
    existing = await find_existing(db, bid, aid)
    snapshot = {**(existing or {}), **item}
    if fields:
        snapshot["owner_fields"] = fields

    common = {
        "id": aid,
        "business_id": bid,
        "status": status,
        "owner_decision": decision,
        "owner_decision_label": decision_label(decision),
        "owner_reviewed": True,
        "owner_reviewed_by": uid,
        "owner_reviewed_at": now(),
        "requires_owner_approval": False,
        "prepared_only": True,
        "auto_prepared": True,
        "auto_sent": False,
        "accounting_synced": False,
        "money_changed": False,
        "record_changed": False,
        "guardrails": ["owner_decision_recorded_only", "no_auto_send", "no_auto_sync", "no_money_change"],
        "source": "churvox_admin_brain_owner_decision",
        "updated_at": now(),
    }
    if decision == "edit":
        common["owner_edit"] = safe(fields or payload)
    if decision == "park":
        common["parked_reason"] = text(payload.get("reason") or payload.get("note") or "Owner parked this decision.")

    try:
        await db.ai_approval_actions.update_one(
            {"business_id": bid, "id": aid},
            {"$set": safe({**snapshot, **common}), "$setOnInsert": {"created_at": now()}},
            upsert=True,
        )
    except Exception:
        pass

    decision_doc = {
        **common,
        "action_id": aid,
        "decision": decision,
        "item": safe(snapshot),
        "payload": safe(payload),
        "created_at": now(),
    }
    try:
        await db.command_decisions.insert_one(safe(decision_doc))
    except Exception:
        pass

    return {
        "success": True,
        "source": "churvox_admin_brain_owner_decision",
        "message": f"{decision_label(decision)}. Churvox recorded the decision only — nothing was sent, synced, or money-changed.",
        "action_id": aid,
        "decision": decision,
        "status": status,
        "prepared_only": True,
        "auto_sent": False,
        "accounting_synced": False,
        "money_changed": False,
        "record_changed": False,
        "guardrails": common["guardrails"],
    }


async def recent_decisions(db, user):
    bid = business_id(user)
    try:
        rows = await db.command_decisions.find({"business_id": bid, "source": "churvox_admin_brain_owner_decision"}).sort("created_at", -1).limit(80).to_list(length=80)
    except Exception:
        rows = []
    return safe({"success": True, "source": "churvox_admin_brain_owner_decision", "items": rows, "decisions": rows})


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or get_current_user is None or Request is None:
        return

    async def execute_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return safe(await write_owner_decision(db, user, None, payload))

    async def execute_by_id_endpoint(request: Request, action_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return safe(await write_owner_decision(db, user, action_id, payload))

    async def admin_brain_decide_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return safe(await write_owner_decision(db, user, None, payload))

    async def admin_brain_decide_by_id_endpoint(request: Request, action_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return safe(await write_owner_decision(db, user, action_id, payload))

    async def decisions_endpoint(request: Request):
        user = await get_current_user(request)
        return await recent_decisions(db, user)

    routes = [
        ("POST", "/api/command/execute-approved", execute_endpoint),
        ("POST", "/api/command/approvals/{action_id}/execute", execute_by_id_endpoint),
        ("POST", "/api/admin-brain/decide", admin_brain_decide_endpoint),
        ("POST", "/api/admin-brain/actions/{action_id}/decide", admin_brain_decide_by_id_endpoint),
        ("GET", "/api/command/approval-executions", decisions_endpoint),
        ("GET", "/api/admin-brain/decisions", decisions_endpoint),
    ]
    for method, path, endpoint in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)
