from datetime import datetime, timezone
from ai_operator.policy import classify_action


def _now(): return datetime.now(timezone.utc)
def _sid(v): return str(v or "")

async def _audit(db, business_id, user, action, event, result=None):
    await db.ai_operator_audit_log.insert_one({
        "business_id": str(business_id), "action_id": _sid(action.get("id") or action.get("_id")), "action_type": action.get("action_type"),
        "event": event, "result": result or {}, "actor": _sid(user.get("_id") or user.get("id")), "target_collection": action.get("target_collection"), "target_id": _sid(action.get("target_id")), "created_at": _now()
    })

async def execute_approved_action(db, business_id, user, action, approved_payload=None):
    payload = {**(action.get("suggested_payload") or {}), **(approved_payload or {})}
    classification = classify_action(action.get("action_type"), payload)
    if str(classification.get("risk","")).lower() == "forbidden":
        raise ValueError("Action blocked by policy")

    t = action.get("action_type")
    if t == "assign_worker":
        await db.jobs.update_one({"_id": action.get("target_id")}, {"$set": {"worker_id": payload.get("worker_id"), "worker_name": payload.get("worker_name"), "updated_at": _now()}})
    elif t == "create_draft_invoice":
        inv = {"business_id": str(business_id), "job_id": payload.get("job_id"), "client_name": payload.get("client_name"), "description": payload.get("description"), "subtotal": payload.get("subtotal"), "gst_rate": payload.get("gst_rate"), "status":"draft", "created_by_ai":True, "created_at": _now()}
        await db.invoices.insert_one(inv)
    elif t in {"draft_invoice_reminder", "draft_quote_followup"}:
        await db.ai_operator_drafts.insert_one({"business_id": str(business_id), "action_type": t, "target_id": _sid(action.get("target_id")), "payload": payload, "status":"draft", "created_at": _now()})
    elif t in {"data_quality_fix", "schedule_conflict_warning", "ai_setup_task"}:
        pass
    else:
        raise ValueError("Unsupported action type")
    await _audit(db, business_id, user, action, "backend_executed", {"ok": True})
    return {"ok": True, "action_type": t}
