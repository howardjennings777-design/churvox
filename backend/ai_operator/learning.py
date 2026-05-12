from datetime import datetime, timezone


def _now(): return datetime.now(timezone.utc)

def _sid(v): return str(v or "")

async def update_learning_preferences(db, business_id, action, decision, edited_payload=None):
    profile = {
        "business_id": str(business_id),
        "action_type": action.get("action_type"),
        "target_collection": action.get("target_collection"),
        "target_id": _sid(action.get("target_id")),
        "decision": decision,
        "updated_at": _now(),
    }
    if edited_payload: profile["last_edited_payload"] = edited_payload
    await db.ai_operator_learning.update_one(
        {"business_id": str(business_id), "action_type": action.get("action_type"), "target_id": _sid(action.get("target_id"))},
        {"$set": profile, "$inc": {f"decision_counts.{decision}": 1}},
        upsert=True,
    )

async def record_owner_decision(db, business_id, user, action, decision, edited_payload=None, reason=None):
    audit = {
        "business_id": str(business_id), "action_id": _sid(action.get("id") or action.get("_id")), "action_type": action.get("action_type"),
        "event": f"owner_{decision}", "decision": decision, "edited_payload": edited_payload, "reason": reason,
        "actor": _sid(user.get("_id") or user.get("id")), "target_collection": action.get("target_collection"), "target_id": _sid(action.get("target_id")), "created_at": _now()
    }
    await db.ai_operator_audit_log.insert_one(audit)
    await update_learning_preferences(db, business_id, action, decision, edited_payload=edited_payload)
    await db.ai_operator_memory.update_one(
        {"business_id": str(business_id), "memory_type": "owner_learning"},
        {"$set": {"updated_at": _now()}, "$inc": {f"decision_totals.{decision}": 1}},
        upsert=True,
    )
    return audit
