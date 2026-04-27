"""Churvox follow-up task boot layer.

Adds practical follow-up task endpoints so automation-created follow-ups are
visible and actionable instead of hidden in the database.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

_INSTALLED = False


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_id(value: Any) -> str:
    if not value:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return str(value.get("$oid") or value.get("id") or value.get("_id") or "")
    return str(value)


def _json_safe(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def _role(user: Dict[str, Any]) -> str:
    return str(user.get("role") or "").lower().strip()


def _business_id(user: Dict[str, Any]) -> str:
    return _safe_id(user.get("business_id") or user.get("owner_id") or user.get("id") or user.get("_id"))


def _business_scope(user: Dict[str, Any]) -> Dict[str, Any]:
    bid = _business_id(user)
    ids: List[Any] = [bid]
    if ObjectId.is_valid(bid):
        ids.append(ObjectId(bid))
    return {"$or": [
        {"business_id": {"$in": ids}},
        {"owner_id": {"$in": ids}},
        {"user_id": {"$in": ids}},
    ]}


def _allowed(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    if user.get("is_admin") or user.get("is_platform_owner"):
        return True
    return _role(user) in {"owner", "employer", "admin", "manager", "office_admin", "payroll"}


def _parse_due(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            pass
    return _now() + timedelta(days=2)


def _oid_or_404(task_id: str) -> ObjectId:
    if not ObjectId.is_valid(task_id):
        raise HTTPException(status_code=400, detail="Invalid follow-up task id")
    return ObjectId(task_id)


def install_followups_boot(server_module) -> None:
    global _INSTALLED
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return

    _INSTALLED = True

    async def require_user(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not _allowed(current_user):
            raise HTTPException(status_code=403, detail="Follow-up access required")
        return current_user

    router = APIRouter(prefix="/api/follow-up-tasks", tags=["follow-up-tasks"])

    @router.get("")
    async def list_follow_up_tasks(status: str = "open", current_user: Dict[str, Any] = Depends(require_user)):
        scope = _business_scope(current_user)
        query: Dict[str, Any] = scope
        if status and status != "all":
            if status == "open":
                query = {"$and": [scope, {"status": {"$in": ["pending", "open", "todo"]}}]}
            else:
                query = {"$and": [scope, {"status": status}]}
        cursor = db.follow_up_tasks.find(query).sort("due_at", 1).limit(100)
        rows = await cursor.to_list(length=100)
        return {"success": True, "data": [_json_safe(row) for row in rows]}

    @router.post("")
    async def create_follow_up_task(payload: Dict[str, Any], current_user: Dict[str, Any] = Depends(require_user)):
        business_id = _business_id(current_user)
        title = str(payload.get("title") or "Follow-up").strip()[:200]
        description = str(payload.get("description") or payload.get("notes") or "").strip()[:800]
        doc = {
            "business_id": business_id,
            "owner_id": business_id,
            "title": title,
            "description": description,
            "related_type": str(payload.get("related_type") or "manual")[:48],
            "related_id": _safe_id(payload.get("related_id"))[:64],
            "assigned_user_id": _safe_id(payload.get("assigned_user_id") or current_user.get("_id") or current_user.get("id")),
            "status": "pending",
            "priority": str(payload.get("priority") or "normal")[:24],
            "source": str(payload.get("source") or "manual")[:48],
            "due_at": _parse_due(payload.get("due_at")),
            "created_at": _now(),
            "updated_at": _now(),
        }
        result = await db.follow_up_tasks.insert_one(doc)
        doc["_id"] = result.inserted_id
        return {"success": True, "data": _json_safe(doc)}

    @router.patch("/{task_id}")
    async def update_follow_up_task(task_id: str, payload: Dict[str, Any], current_user: Dict[str, Any] = Depends(require_user)):
        oid = _oid_or_404(task_id)
        scope = _business_scope(current_user)
        allowed_fields = {"title", "description", "priority", "status", "due_at", "assigned_user_id"}
        update: Dict[str, Any] = {"updated_at": _now()}
        for key in allowed_fields:
            if key in payload:
                if key == "due_at":
                    update[key] = _parse_due(payload.get(key))
                else:
                    update[key] = payload.get(key)
        query = {"$and": [scope, {"_id": oid}]}
        result = await db.follow_up_tasks.update_one(query, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Follow-up task not found")
        row = await db.follow_up_tasks.find_one({"_id": oid})
        return {"success": True, "data": _json_safe(row)}

    @router.post("/{task_id}/complete")
    async def complete_follow_up_task(task_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        oid = _oid_or_404(task_id)
        scope = _business_scope(current_user)
        query = {"$and": [scope, {"_id": oid}]}
        result = await db.follow_up_tasks.update_one(query, {"$set": {"status": "completed", "completed_at": _now(), "updated_at": _now()}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Follow-up task not found")
        row = await db.follow_up_tasks.find_one({"_id": oid})
        return {"success": True, "data": _json_safe(row)}

    @router.delete("/{task_id}")
    async def delete_follow_up_task(task_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        oid = _oid_or_404(task_id)
        scope = _business_scope(current_user)
        result = await db.follow_up_tasks.delete_one({"$and": [scope, {"_id": oid}]})
        return {"success": True, "deleted": int(result.deleted_count or 0)}

    app.include_router(router)
    print("FOLLOWUPS_BOOT_INSTALLED")
