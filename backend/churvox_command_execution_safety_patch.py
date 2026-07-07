from __future__ import annotations

from datetime import datetime, timezone

try:
    import churvox_approval_execution_patch as approval_execution
except Exception:  # pragma: no cover
    approval_execution = None

try:
    import ai_operator_routes
except Exception:  # pragma: no cover
    ai_operator_routes = None

FINAL_SAFE_DECISIONS = {"save", "edit", "park", "parking", "hold", "save_edit"}
UNSAFE_TRUE_VALUES = {True, "true", "yes", "1", 1}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def as_bool(value):
    return value in UNSAFE_TRUE_VALUES or lower(value) in {"true", "yes", "1"}


def missing_fields(item):
    raw = (item or {}).get("missing_fields") or (item or {}).get("missing") or []
    if isinstance(raw, list):
        return [clean(field) for field in raw if clean(field)]
    return [clean(raw)] if clean(raw) else []


def unsafe_reason(item):
    item = item or {}
    missing = missing_fields(item)
    if missing:
        return f"missing {', '.join(missing)}"
    if as_bool(item.get("needs_owner_input")) or as_bool(item.get("boss_todo")):
        return "boss input required"
    if item.get("safe_to_complete") is False or item.get("can_complete_without_more_info") is False:
        return "not safe to complete yet"
    if as_bool(item.get("possible_duplicate")) or clean(item.get("duplicate_warning")):
        return "possible duplicate"
    return ""


def can_execute(action, item):
    decision = lower(action)
    if decision in FINAL_SAFE_DECISIONS:
        return True, ""
    reason = unsafe_reason(item)
    return (not reason), reason


async def record_park_or_block(db, user_id, business_id, action_id, item, decision, reason):
    doc = {
        "business_id": clean(business_id),
        "user_id": clean(user_id),
        "action_id": clean(action_id),
        "decision": decision,
        "reason": reason,
        "park_reason": clean((item or {}).get("park_reason") or (item or {}).get("parkReason")),
        "missing_fields": missing_fields(item),
        "source": "command_execution_safety_patch",
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.command_decisions.insert_one(dict(doc))
    except Exception:
        pass
    try:
        await db.command_audit_trail.insert_one(dict(doc))
    except Exception:
        pass
    return doc


if approval_execution is not None and hasattr(approval_execution, "execute_approval"):
    _ORIGINAL_EXECUTE_APPROVAL = approval_execution.execute_approval

    async def guarded_execute_approval(db, user, ObjectId, action_id, payload=None):
        payload = payload or {}
        item = payload.get("item") if isinstance(payload.get("item"), dict) else dict(payload)
        action = lower(payload.get("action") or payload.get("decision") or "approve")
        business_id = approval_execution.business_id(user)
        user_id = approval_execution.user_id(user)
        ok, reason = can_execute(action, item)
        if not ok:
            audit = await record_park_or_block(db, user_id, business_id, action_id, item, "blocked_unsafe_approval", reason)
            return {
                "success": True,
                "blocked": True,
                "boss_todo": True,
                "safe_to_complete": False,
                "message": f"Boss must complete this Command slip first: {reason}. Churvox did not send, sync, invoice or change anything.",
                "missing_fields": missing_fields(item),
                "audit": approval_execution.json_safe(audit),
            }
        if action in {"park", "parking", "hold"}:
            audit = await record_park_or_block(db, user_id, business_id, action_id, item, "parked_with_reason", clean(item.get("park_reason") or item.get("parkReason") or "No reason selected"))
            return {
                "success": True,
                "parked": True,
                "message": "Command slip parked. Churvox kept the reason so it can come back later.",
                "audit": approval_execution.json_safe(audit),
            }
        return await _ORIGINAL_EXECUTE_APPROVAL(db, user, ObjectId, action_id, payload)

    approval_execution.execute_approval = guarded_execute_approval


if ai_operator_routes is not None and hasattr(ai_operator_routes, "_execute"):
    _ORIGINAL_AI_EXECUTE = ai_operator_routes._execute

    async def guarded_ai_execute(db, business_id, user, action):
        ok, reason = can_execute("approve", action or {})
        if not ok:
            return {
                "success": True,
                "blocked": True,
                "boss_todo": True,
                "safe_to_complete": False,
                "message": f"Boss must complete this Command slip first: {reason}. Churvox did not execute it.",
                "missing_fields": missing_fields(action or {}),
            }
        return await _ORIGINAL_AI_EXECUTE(db, business_id, user, action)

    ai_operator_routes._execute = guarded_ai_execute
