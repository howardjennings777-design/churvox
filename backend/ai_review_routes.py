import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Body, Depends, HTTPException, Query

try:
    from backend.ai_operator_routes import _execute, _object_id, _safe_doc
except Exception:
    from ai_operator_routes import _execute, _object_id, _safe_doc

logger = logging.getLogger(__name__)


def _business_id(current_user: dict) -> str:
    return str(current_user.get("business_id") or current_user.get("id") or "")


def _review_query(current_user: dict, action_id: str | None = None) -> dict:
    query = {"business_id": _business_id(current_user)}
    if action_id:
        query["_id"] = _object_id(action_id, "review item ID")
    return query


def _normalise_review_item(doc: dict) -> dict:
    item = _safe_doc(doc) or {}
    form = item.get("form") if isinstance(item.get("form"), dict) else {}

    # Fresh Command reads mixed sources. Keep these top-level aliases stable.
    item.setdefault("action", item.get("actionKey") or item.get("action_key") or "Ready to approve")
    item.setdefault("category", item.get("recordType") or item.get("record_type") or item.get("slipKey") or "Command")
    item.setdefault("title", item.get("title") or form.get("jobName") or form.get("jobTitle") or form.get("client") or "Ready to approve")
    item.setdefault("summary", item.get("summary") or form.get("summary") or form.get("customerMessage") or form.get("missingChecklist") or "Prepared for owner approval.")
    item.setdefault("details", item.get("details") or form)
    item.setdefault("payload", item.get("payload") or form)
    item.setdefault("prepared", item.get("prepared") or item.get("afterApproval") or item.get("after_approval") or item.get("summary") or "Prepared action waiting for approval.")
    item.setdefault("preparedForApproval", True)
    return item


async def _get_review_item_or_404(db, current_user: dict, item_id: str) -> dict:
    item = await db.ai_approval_actions.find_one(_review_query(current_user, item_id))
    if not item:
        raise HTTPException(status_code=404, detail="Command review item not found")
    return item


def install(app, db, get_current_user):
    if getattr(app.state, "ai_review_routes_installed", False):
        return

    router = APIRouter(prefix="/api")

    @router.get("/ai-review-items")
    async def list_ai_review_items(
        status: str | None = Query(None),
        limit: int = Query(100),
        current_user: dict = Depends(get_current_user),
    ):
        query = _review_query(current_user)
        if status:
            query["status"] = status

        rows = await db.ai_approval_actions.find(query).sort("created_at", -1).limit(max(1, min(int(limit or 100), 200))).to_list(200)
        items = [_normalise_review_item(row) for row in rows]
        return {"success": True, "items": items, "review_items": items, "data": items}

    @router.patch("/ai-review-items/{item_id}")
    async def update_ai_review_item(
        item_id: str,
        payload: dict = Body(default_factory=dict),
        current_user: dict = Depends(get_current_user),
    ):
        item = await _get_review_item_or_404(db, current_user, item_id)
        now = datetime.now(timezone.utc)
        updates = {"updated_at": now}

        if "note" in payload:
            updates["owner_note"] = payload.get("note") or ""
        if "owner_note" in payload:
            updates["owner_note"] = payload.get("owner_note") or ""
        if isinstance(payload.get("form"), dict):
            updates["form"] = payload["form"]

        await db.ai_approval_actions.update_one({"_id": item["_id"]}, {"$set": updates})
        updated = await db.ai_approval_actions.find_one({"_id": item["_id"]})
        safe = _normalise_review_item(updated)
        return {"success": True, "item": safe, "data": safe}

    @router.post("/ai-review-items/{item_id}/approve")
    async def approve_ai_review_item(
        item_id: str,
        payload: dict = Body(default_factory=dict),
        current_user: dict = Depends(get_current_user),
    ):
        item = await _get_review_item_or_404(db, current_user, item_id)
        now = datetime.now(timezone.utc)

        if payload.get("note"):
            item["owner_note"] = payload.get("note")
            await db.ai_approval_actions.update_one(
                {"_id": item["_id"]},
                {"$set": {"owner_note": payload.get("note"), "updated_at": now}},
            )

        result = await _execute(db, _business_id(current_user), current_user, item)
        if result.get("stored_only"):
            await db.ai_approval_actions.update_one(
                {"_id": item["_id"]},
                {"$set": {"status": "needs_executor", "result": result, "updated_at": now}},
            )
            raise HTTPException(status_code=400, detail="This Command item is not linked to a real approval action yet.")

        await db.ai_approval_actions.update_one(
            {"_id": item["_id"]},
            {"$set": {"status": "approved", "approved_at": now, "approved_by": str(current_user.get("id")), "result": result, "updated_at": now}},
        )
        updated = await db.ai_approval_actions.find_one({"_id": item["_id"]})
        safe = _normalise_review_item(updated)
        return {"success": True, "result": result, "item": safe, "data": safe}

    @router.post("/ai-review-items/{item_id}/ignore")
    async def ignore_ai_review_item(
        item_id: str,
        payload: dict = Body(default_factory=dict),
        current_user: dict = Depends(get_current_user),
    ):
        item = await _get_review_item_or_404(db, current_user, item_id)
        now = datetime.now(timezone.utc)
        await db.ai_approval_actions.update_one(
            {"_id": item["_id"]},
            {"$set": {"status": "ignored", "ignored_at": now, "ignored_by": str(current_user.get("id")), "ignore_note": payload.get("note") or "", "updated_at": now}},
        )
        return {"success": True, "message": "Command item ignored"}

    @router.post("/ai-review-items/{item_id}/decline")
    async def decline_ai_review_item(
        item_id: str,
        payload: dict = Body(default_factory=dict),
        current_user: dict = Depends(get_current_user),
    ):
        item = await _get_review_item_or_404(db, current_user, item_id)
        now = datetime.now(timezone.utc)
        await db.ai_approval_actions.update_one(
            {"_id": item["_id"]},
            {"$set": {"status": "declined", "declined_at": now, "declined_by": str(current_user.get("id")), "decline_note": payload.get("note") or "", "updated_at": now}},
        )
        return {"success": True, "message": "Command item declined"}

    app.include_router(router)
    app.state.ai_review_routes_installed = True
    logger.info("Command AI review routes installed")
