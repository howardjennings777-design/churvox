from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, Optional

from ai_operator_engine import (
    answer_business_question,
    get_pending_ai_actions,
    mark_ai_action,
    persist_ai_actions,
    prepare_ai_actions,
    utc_now_iso,
)


class AskAiRequest(BaseModel):
    question: str


class AiActionApprovalRequest(BaseModel):
    action: Optional[Dict[str, Any]] = None


def create_ai_operator_router(db, get_current_user, get_user_business_id):
    router = APIRouter(prefix="/ai/operator", tags=["AI Operator"])

    async def business_context(current_user: dict):
        business_id = await get_user_business_id(current_user)
        actor_id = str(current_user.get("id") or current_user.get("_id") or current_user.get("email") or "")
        return str(business_id), actor_id

    @router.get("/queue")
    async def ai_operator_queue(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        actions = await get_pending_ai_actions(db, business_id)
        if not actions:
            prepared = await prepare_ai_actions(db, business_id)
            actions = await persist_ai_actions(db, business_id, prepared)
        return {
            "ok": True,
            "status": "ready",
            "actions": actions,
            "count": len(actions),
            "generated_at": utc_now_iso(),
        }

    @router.post("/run-daily-check")
    async def run_daily_check(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        prepared = await prepare_ai_actions(db, business_id)
        actions = await persist_ai_actions(db, business_id, prepared)
        return {
            "ok": True,
            "status": "daily_check_complete",
            "message": "AI scanned jobs, workers, quotes and invoices and prepared owner actions.",
            "actions": actions,
            "count": len(actions),
            "generated_at": utc_now_iso(),
        }

    @router.post("/prepare-today")
    async def prepare_today(current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        prepared = await prepare_ai_actions(db, business_id)
        actions = await persist_ai_actions(db, business_id, prepared)
        return {
            "ok": True,
            "status": "today_prepared",
            "message": "Today’s AI Operator plan is ready for owner approval.",
            "actions": actions,
            "count": len(actions),
            "generated_at": utc_now_iso(),
        }

    @router.post("/ask")
    async def ask_ai(request: AskAiRequest, current_user: dict = Depends(get_current_user)):
        business_id, _actor_id = await business_context(current_user)
        result = await answer_business_question(db, business_id, request.question)
        return {"ok": True, **result}

    @router.post("/actions/{action_id}/approve")
    async def approve_action(action_id: str, request: AiActionApprovalRequest = None, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await business_context(current_user)
        saved = await mark_ai_action(db, business_id, action_id, "completed", actor_id)
        if saved:
            return {
                "ok": True,
                "status": "completed",
                "message": "AI action approved and marked complete.",
                "action": saved,
            }

        # If the action came from frontend fallback before it was persisted, store it as completed.
        fallback_action = (request.action if request else None) or {}
        if fallback_action:
            fallback_action = dict(fallback_action)
            fallback_action["business_id"] = business_id
            fallback_action["status"] = "completed"
            fallback_action["approved_by"] = actor_id
            fallback_action["approved_at"] = utc_now_iso()
            fallback_action["executed_at"] = utc_now_iso()
            try:
                await db.ai_operator_actions.insert_one(fallback_action)
            except Exception:
                pass
            return {"ok": True, "status": "completed", "message": "AI fallback action approved.", "action": fallback_action}

        raise HTTPException(status_code=404, detail="AI action not found")

    @router.post("/actions/{action_id}/reject")
    async def reject_action(action_id: str, current_user: dict = Depends(get_current_user)):
        business_id, actor_id = await business_context(current_user)
        saved = await mark_ai_action(db, business_id, action_id, "rejected", actor_id)
        if not saved:
            raise HTTPException(status_code=404, detail="AI action not found")
        return {"ok": True, "status": "rejected", "action": saved}

    return router
