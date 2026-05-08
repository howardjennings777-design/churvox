from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional
from uuid import uuid4

from bson import ObjectId

from ai_operator_engine import (
    answer_business_question,
    get_pending_ai_actions,
    persist_ai_actions,
    prepare_ai_actions,
    serialise_record,
    utc_now_iso,
)


class AskAiRequest(BaseModel):
    question: str


class AiActionApprovalRequest(BaseModel):
    action: Optional[Dict[str, Any]] = None


class AiActionUpdateRequest(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    reason: Optional[str] = None
    preview_text: Optional[str] = None
    suggested_payload: Optional[Dict[str, Any]] = None
    action: Optional[Dict[str, Any]] = None


class AiActionScheduleRequest(BaseModel):
    scheduled_for: str
    action: Optional[Dict[str, Any]] = None
    deploy_window_label: Optional[str] = "7:00pm weeknight deploy"
    deploy_warning_minutes: Optional[int] = 60


def _safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _model_dump(model: Any) -> Dict[str, Any]:
    if not model:
        return {}
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_none=True)
    if hasattr(model, "dict"):
        return model.dict(exclude_none=True)
    return dict(model or {})


def _business_query(business_id: str, extra: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    query = {"business_id": str(business_id)}
    if extra:
        query.update(extra)
    return query


def _action_lookup_query(business_id: str, action_id: str) -> Dict[str, Any]:
    options = [{"id": str(action_id)}]
    try:
        options.append({"_id": ObjectId(str(action_id))})
    except Exception:
        pass
    return {"business_id": str(business_id), "$or": options}


async def _find_action(db, business_id: str, action_id: str) -> Optional[Dict[str, Any]]:
    if not action_id:
        return None
    return await db.ai_operator_actions.find_one(_action_lookup_query(business_id, action_id))


async def _find_action_or_404(db, business_id: str, action_id: str) -> Dict[str, Any]:
    action = await _find_action(db, business_id, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="AI action not found")
    return action


async def _find_record(db, collection_name: str, business_id: str, record_id: str):
    if not record_id:
        return None
    collection = getattr(db, collection_name)
    candidates = [
        {"id": str(record_id)},
        {"job_number": str(record_id)},
        {"invoice_number": str(record_id)},
        {"quote_number": str(record_id)},
    ]
    try:
        candidates.append({"_id": ObjectId(str(record_id))})
    except Exception:
        pass
    for extra in candidates:
        try:
            found = await collection.find_one(_business_query(business_id, extra))
            if found:
                return found
        except Exception:
            continue
    return None


async def _write_operator_event(db, business_id: str, actor_id: str, action: Dict[str, Any], message: str, payload: Optional[Dict[str, Any]] = None):
    event = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "actor_id": actor_id,
        "source": "ai_operator",
        "action_id": action.get("id") or action.get("_id"),
        "action_type": action.get("action_type"),
        "module": action.get("module"),
        "title": action.get("title"),
        "message": message,
        "payload": payload or {},
        "created_at": utc_now_iso(),
        "read": False,
    }
    for collection_name in ["ai_operator_events", "notifications"]:
        try:
            await getattr(db, collection_name).insert_one(dict(event))
        except Exception:
            pass
    return event


async def _execute_assign_worker(db, business_id: str, actor_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    payload = action.get("suggested_payload") or {}
    job_id = _safe_text(payload.get("job_id") or action.get("target_record_id"))
    worker_id = _safe_text(payload.get("worker_id"))
    worker_name = _safe_text(payload.get("worker_name"), "assigned worker")

    job = await _find_record(db, "jobs", business_id, job_id)
    if not job:
        return {"executed": False, "message": "Job not found for assignment.", "target": job_id}

    update = {
        "assigned_worker_id": worker_id or payload.get("worker_id") or "",
        "assigned_worker_name": worker_name,
        "worker_id": worker_id or payload.get("worker_id") or "",
        "status": "assigned",
        "job_status": "assigned",
        "workflow_status": "assigned",
        "ai_assigned": True,
        "ai_assignment_reason": action.get("reason") or "AI recommended this assignment.",
        "updated_at": datetime.now(timezone.utc),
    }
    try:
        await db.jobs.update_one({"_id": job.get("_id"), "business_id": str(business_id)}, {"$set": update})
    except Exception:
        await db.jobs.update_one(_business_query(business_id, {"id": str(job_id)}), {"$set": update})

    event = await _write_operator_event(
        db,
        business_id,
        actor_id,
        action,
        f"AI assigned {worker_name} to {_safe_text(job.get('title') or job.get('name'), 'job')}.",
        {"job_id": job_id, "worker_id": worker_id, "worker_name": worker_name},
    )
    return {"executed": True, "message": "Worker assignment completed.", "event": event, "job_id": job_id, "worker_id": worker_id}


async def _execute_invoice_draft(db, business_id: str, actor_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    payload = action.get("suggested_payload") or {}
    job_id = _safe_text(payload.get("source_job_id") or payload.get("job_id") or action.get("target_record_id"))
    job = await _find_record(db, "jobs", business_id, job_id)
    if not job:
        return {"executed": False, "message": "Completed job not found for invoice draft.", "target": job_id}

    existing = await db.invoices.find_one({
        "business_id": str(business_id),
        "$or": [
            {"source_job_id": str(job.get("id") or job.get("_id") or job_id)},
            {"job_id": str(job.get("id") or job.get("_id") or job_id)},
            {"linked_job_id": str(job.get("id") or job.get("_id") or job_id)},
        ],
    })
    if existing:
        return {"executed": True, "message": "Invoice draft already exists.", "invoice": serialise_record(existing)}

    customer_name = _safe_text(job.get("customer_name") or job.get("client_name") or payload.get("customer_name"), "Customer")
    customer_email = _safe_text(job.get("customer_email") or job.get("client_email"))
    subtotal = float(job.get("price") or job.get("subtotal") or job.get("job_price") or job.get("fixed_price") or 0)
    hourly_rate = float(job.get("hourly_rate") or 0)
    hours_worked = float(job.get("hours_worked") or job.get("total_hours") or 0)
    if subtotal <= 0 and hourly_rate > 0 and hours_worked > 0:
        subtotal = round(hourly_rate * hours_worked, 2)
    gst_rate = float(job.get("gst_rate") or 15)
    gst_amount = round(subtotal * gst_rate / 100, 2)
    total = round(subtotal + gst_amount, 2)
    invoice = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "source": "ai_operator",
        "source_job_id": str(job.get("id") or job.get("_id") or job_id),
        "job_id": str(job.get("id") or job.get("_id") or job_id),
        "linked_job_id": str(job.get("id") or job.get("_id") or job_id),
        "customer_name": customer_name,
        "customer_email": customer_email,
        "client_id": job.get("client_id") or job.get("customer_id") or "",
        "address": job.get("address") or job.get("job_address") or "",
        "description": _safe_text(job.get("ai_invoice_description") or job.get("invoice_description_draft") or action.get("preview_text"), f"Service work completed for {customer_name}."),
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": total,
        "status": "draft",
        "pricing_type": job.get("pricing_type") or job.get("price_type") or "fixed",
        "hourly_rate": hourly_rate,
        "hours_worked": hours_worked,
        "notes": "Draft created by Churvox AI Operator. Review before sending.",
        "ai_generated": True,
        "created_by": actor_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.invoices.insert_one(invoice)
    try:
        await db.jobs.update_one({"_id": job.get("_id"), "business_id": str(business_id)}, {"$set": {"invoice_created": True, "invoice_id": invoice["id"], "updated_at": datetime.now(timezone.utc)}})
    except Exception:
        pass
    event = await _write_operator_event(db, business_id, actor_id, action, f"AI created draft invoice for {customer_name}.", {"invoice_id": invoice["id"], "job_id": job_id})
    return {"executed": True, "message": "Invoice draft created.", "invoice": serialise_record(invoice), "event": event}


async def _execute_prepare_message(db, business_id: str, actor_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    message = {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "source": "ai_operator",
        "status": "draft",
        "module": action.get("module"),
        "action_type": action.get("action_type"),
        "target_record_type": action.get("target_record_type"),
        "target_record_id": action.get("target_record_id"),
        "title": action.get("title"),
        "message": action.get("preview_text") or action.get("summary") or "AI prepared message.",
        "reason": action.get("reason"),
        "created_by": actor_id,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    for collection_name in ["ai_prepared_messages", "communications"]:
        try:
            await getattr(db, collection_name).insert_one(dict(message))
            break
        except Exception:
            continue
    event = await _write_operator_event(db, business_id, actor_id, action, "AI prepared a draft message for owner review.", {"message_id": message["id"]})
    return {"executed": True, "message": "Draft message prepared.", "prepared_message": serialise_record(message), "event": event}


async def _execute_ai_action(db, business_id: str, actor_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    action_type = _safe_text(action.get("action_type"))
    if action_type == "assign_worker_to_job":
        return await _execute_assign_worker(db, business_id, actor_id, action)
    if action_type == "create_invoice_draft":
        return await _execute_invoice_draft(db, business_id, actor_id, action)
    if action_type in {"create_quote_followup", "create_invoice_reminder", "prepare_customer_message", "create_client_followup"}:
        return await _execute_prepare_message(db, business_id, actor_id, action)
    event = await _write_operator_event(db, business_id, actor_id, action, "AI action approved for manual owner workflow.", {})
    return {"executed": True, "message": "AI action approved for manual workflow.", "event": event}


def create_ai_operator_router(db, get_current_user, get_user_business_id):
    router = APIRouter(prefix="/ai/operator", tags=["AI Operator"])

    async def business_context(current_user: dict):
        business_id = await get_user_business_id(current_user)
        actor_id = str(current_user.get("id") or current_user.get("_id") or current_user.get("email") or "")
        return str(business_id), actor_id

    @router.get("/board")
    async def ai_operator_board(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        rows = await db.ai_operator_actions.find({"business_id": str(business_id)}).sort("created_at", -1).limit(200).to_list(length=200)
        if not rows:
            prepared = await prepare_ai_actions(db, business_id)
            rows = await persist_ai_actions(db, business_id, prepared)
        else:
            rows = [serialise_record(r) for r in rows]
        return {"ok": True, "actions": rows, "count": len(rows), "generated_at": utc_now_iso()}

    @router.get("/queue")
    async def ai_operator_queue(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        actions = await get_pending_ai_actions(db, business_id)
        if not actions:
            prepared = await prepare_ai_actions(db, business_id)
            actions = await persist_ai_actions(db, business_id, prepared)
        return {"ok": True, "status": "ready", "actions": actions, "count": len(actions), "generated_at": utc_now_iso()}

    @router.post("/run-daily-check")
    async def run_daily_check(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        prepared = await prepare_ai_actions(db, business_id)
        actions = await persist_ai_actions(db, business_id, prepared)
        return {"ok": True, "status": "daily_check_complete", "message": "AI scanned jobs, workers, quotes and invoices and prepared owner actions.", "actions": actions, "count": len(actions), "generated_at": utc_now_iso()}

    @router.post("/prepare-today")
    async def prepare_today(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        prepared = await prepare_ai_actions(db, business_id)
        actions = await persist_ai_actions(db, business_id, prepared)
        return {"ok": True, "status": "today_prepared", "message": "Today’s AI Operator plan is ready for owner approval.", "actions": actions, "count": len(actions), "generated_at": utc_now_iso()}

    @router.post("/ask")
    async def ask_ai(request: AskAiRequest, current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        result = await answer_business_question(db, business_id, request.question)
        return {"ok": True, **result}

    @router.post("/actions/{action_id}/update")
    async def update_action(action_id: str, request: AiActionUpdateRequest, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await business_context(current_user)
        existing = await _find_action_or_404(db, business_id, action_id)
        incoming = request.action or _model_dump(request)
        allowed = {k: incoming.get(k) for k in ["title", "summary", "reason", "preview_text", "suggested_payload"] if k in incoming}
        allowed.update({
            "id": existing.get("id") or action_id,
            "status": "edited",
            "edited_by": actor_id,
            "edited_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
        })
        await db.ai_operator_actions.update_one(_action_lookup_query(business_id, action_id), {"$set": allowed})
        updated = await _find_action_or_404(db, business_id, action_id)
        return {"ok": True, "status": "edited", "action": serialise_record(updated)}

    @router.post("/actions/{action_id}/schedule")
    async def schedule_action(action_id: str, request: AiActionScheduleRequest, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await business_context(current_user)
        existing = await _find_action_or_404(db, business_id, action_id)
        incoming = request.action or {}
        update = {k: incoming.get(k) for k in ["title", "summary", "reason", "preview_text", "suggested_payload"] if k in incoming}
        update.update({
            "id": existing.get("id") or action_id,
            "status": "scheduled",
            "scheduled_for": request.scheduled_for,
            "deploy_window_label": request.deploy_window_label or "7:00pm weeknight deploy",
            "deploy_warning_minutes": request.deploy_warning_minutes or 60,
            "deploy_warning_sent_at": None,
            "scheduled_by": actor_id,
            "scheduled_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
        })
        await db.ai_operator_actions.update_one(_action_lookup_query(business_id, action_id), {"$set": update})
        updated = await _find_action_or_404(db, business_id, action_id)
        await _write_operator_event(db, business_id, actor_id, serialise_record(updated), "AI action scheduled for the 7:00pm weeknight deploy queue.", {"scheduled_for": request.scheduled_for})
        return {"ok": True, "status": "scheduled", "action": serialise_record(updated)}

    @router.post("/actions/{action_id}/approve")
    async def approve_action(action_id: str, request: AiActionApprovalRequest = None, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await business_context(current_user)
        existing = await _find_action(db, business_id, action_id)
        action = serialise_record(existing) if existing else ((request.action if request else None) or {})
        if request and request.action:
            action.update(request.action)
        if not action:
            raise HTTPException(status_code=404, detail="AI action not found")
        action["id"] = action.get("id") or action_id
        action["business_id"] = business_id
        execution = await _execute_ai_action(db, business_id, actor_id, action)
        final_update = {
            "id": action["id"],
            "status": "completed",
            "approved_by": actor_id,
            "approved_at": utc_now_iso(),
            "executed_at": utc_now_iso(),
            "execution_result": execution,
            "updated_at": utc_now_iso(),
        }
        if existing:
            await db.ai_operator_actions.update_one(_action_lookup_query(business_id, action_id), {"$set": final_update})
            saved = await _find_action_or_404(db, business_id, action_id)
        else:
            action.update(final_update)
            await db.ai_operator_actions.insert_one(action)
            saved = action
        return {"ok": True, "status": "completed", "message": execution.get("message") or "AI action approved and executed.", "action": serialise_record(saved), "execution": execution}

    @router.post("/actions/{action_id}/reject")
    async def reject_action(action_id: str, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await business_context(current_user)
        await _find_action_or_404(db, business_id, action_id)
        update = {
            "id": action_id,
            "status": "rejected",
            "rejected_by": actor_id,
            "rejected_at": utc_now_iso(),
            "updated_at": utc_now_iso(),
        }
        await db.ai_operator_actions.update_one(_action_lookup_query(business_id, action_id), {"$set": update})
        saved = await _find_action_or_404(db, business_id, action_id)
        return {"ok": True, "status": "rejected", "action": serialise_record(saved)}

    return router
