"""Churvox notifications boot layer.

Provides the notification API used by the bell/dropdown and materialises key
workflow events into real user notifications.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

_INSTALLED = False
_TASK = None


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


def _business_id_from_user(user: Dict[str, Any]) -> str:
    return _safe_id(user.get("business_id") or user.get("owner_id") or user.get("id") or user.get("_id"))


def _business_id_from_record(record: Dict[str, Any]) -> str:
    return _safe_id(record.get("business_id") or record.get("owner_id") or record.get("user_id"))


def _user_id(user: Dict[str, Any]) -> str:
    return _safe_id(user.get("_id") or user.get("id") or user.get("user_id"))


def _ids_for(value: str) -> List[Any]:
    out: List[Any] = []
    if value:
      out.append(value)
      if ObjectId.is_valid(value):
          out.append(ObjectId(value))
    return out


def _notification_payload(n: Dict[str, Any]) -> Dict[str, Any]:
    data = _json_safe(n)
    data["id"] = _safe_id(n.get("_id") or n.get("id"))
    data["read"] = bool(n.get("read"))
    return data


async def _ensure_indexes(db) -> None:
    try:
        await db.notifications.create_index("dedupe_key", unique=True, sparse=True)
        await db.notifications.create_index([("recipient_user_id", 1), ("created_at", -1)])
        await db.notifications.create_index([("business_id", 1), ("created_at", -1)])
    except Exception as exc:
        print(f"NOTIFICATIONS_INDEX_ERR {exc}")


async def _business_users(db, business_id: str, roles: List[str] | None = None) -> List[Dict[str, Any]]:
    ids = _ids_for(business_id)
    query: Dict[str, Any] = {"$or": [{"business_id": {"$in": ids}}, {"owner_id": {"$in": ids}}, {"_id": {"$in": ids}}]}
    if roles:
        query = {"$and": [query, {"role": {"$in": roles}}]}
    try:
        cursor = db.users.find(query).limit(100)
        return await cursor.to_list(length=100)
    except Exception:
        return []


async def _find_user_by_id(db, user_id: str) -> Dict[str, Any] | None:
    if not user_id:
        return None
    queries = [{"id": user_id}, {"user_id": user_id}]
    if ObjectId.is_valid(user_id):
        queries.insert(0, {"_id": ObjectId(user_id)})
    for query in queries:
        user = await db.users.find_one(query)
        if user:
            return user
    return None


async def _insert_notification(db, *, business_id: str, recipient_user_id: str, type_: str, title: str, message: str, route: str, dedupe_key: str, related_id: str = "") -> bool:
    if not business_id or not recipient_user_id or not dedupe_key:
        return False
    doc = {
        "business_id": business_id,
        "recipient_user_id": recipient_user_id,
        "type": type_,
        "title": title,
        "message": message,
        "route": route,
        "related_id": related_id,
        "dedupe_key": dedupe_key,
        "read": False,
        "created_at": _now(),
        "updated_at": _now(),
        "source": "notifications_boot",
    }
    try:
        await db.notifications.insert_one(doc)
        return True
    except Exception as exc:
        if "duplicate" not in str(exc).lower():
            print(f"NOTIFICATION_INSERT_ERR {exc}")
        return False


async def _notify_roles(db, business_id: str, roles: List[str], *, type_: str, title: str, message: str, route: str, dedupe_prefix: str, related_id: str) -> int:
    created = 0
    for user in await _business_users(db, business_id, roles):
        uid = _user_id(user)
        if await _insert_notification(db, business_id=business_id, recipient_user_id=uid, type_=type_, title=title, message=message, route=route, dedupe_key=f"{dedupe_prefix}:{uid}", related_id=related_id):
            created += 1
    return created


async def _materialise_job_notifications(db) -> int:
    created = 0
    owner_roles = ["owner", "employer", "admin", "manager", "office_admin"]

    cursor = db.jobs.find({"automation_job_completed_at": {"$exists": True}}).sort("automation_job_completed_at", -1).limit(100)
    async for job in cursor:
        business_id = _business_id_from_record(job)
        job_id = _safe_id(job.get("_id"))
        created += await _notify_roles(db, business_id, owner_roles, type_="job_completed", title="Job completed", message=f"{job.get('title') or 'A job'} is complete and ready for invoice review.", route=f"/jobs/{job_id}", dedupe_prefix=f"job_completed:{job_id}", related_id=job_id)

    cursor = db.jobs.find({"automation_worker_note_at": {"$exists": True}}).sort("automation_worker_note_at", -1).limit(100)
    async for job in cursor:
        business_id = _business_id_from_record(job)
        job_id = _safe_id(job.get("_id"))
        created += await _notify_roles(db, business_id, owner_roles, type_="worker_note_added", title="Worker note added", message=f"A worker added a note to {job.get('title') or 'a job'}.", route=f"/jobs/{job_id}", dedupe_prefix=f"worker_note:{job_id}:{job.get('automation_worker_notes_fingerprint') or job.get('updated_at')}", related_id=job_id)

    cursor = db.jobs.find({"automation_worker_photo_at": {"$exists": True}}).sort("automation_worker_photo_at", -1).limit(100)
    async for job in cursor:
        business_id = _business_id_from_record(job)
        job_id = _safe_id(job.get("_id"))
        count = int(job.get("automation_worker_photos_count") or len(job.get("photos") or []))
        created += await _notify_roles(db, business_id, owner_roles, type_="worker_photo_uploaded", title="Worker photo uploaded", message=f"A worker uploaded job photos for {job.get('title') or 'a job'}.", route=f"/jobs/{job_id}", dedupe_prefix=f"worker_photo:{job_id}:{count}", related_id=job_id)

    cursor = db.jobs.find({"automation_checklist_completed_at": {"$exists": True}}).sort("automation_checklist_completed_at", -1).limit(100)
    async for job in cursor:
        business_id = _business_id_from_record(job)
        job_id = _safe_id(job.get("_id"))
        created += await _notify_roles(db, business_id, owner_roles, type_="job_checklist_completed", title="Checklist completed", message=f"The checklist for {job.get('title') or 'a job'} has been completed.", route=f"/jobs/{job_id}", dedupe_prefix=f"checklist_completed:{job_id}", related_id=job_id)

    cursor = db.jobs.find({"assigned_worker_id": {"$exists": True, "$nin": [None, ""]}, "automation_job_assigned_at": {"$exists": True}}).sort("automation_job_assigned_at", -1).limit(100)
    async for job in cursor:
        worker_id = _safe_id(job.get("assigned_worker_id") or job.get("worker_id"))
        worker = await _find_user_by_id(db, worker_id)
        recipient_id = _user_id(worker or {"id": worker_id})
        business_id = _business_id_from_record(job)
        job_id = _safe_id(job.get("_id"))
        if await _insert_notification(db, business_id=business_id, recipient_user_id=recipient_id, type_="job_assigned", title="New job assigned", message=f"You have been assigned {job.get('title') or 'a job'}.", route=f"/worker/jobs/{job_id}", dedupe_key=f"job_assigned:{job_id}:{recipient_id}", related_id=job_id):
            created += 1

    return created


async def _materialise_quote_invoice_notifications(db) -> int:
    created = 0
    owner_roles = ["owner", "employer", "admin", "manager", "office_admin"]

    cursor = db.quotes.find({"automation_quote_accepted_at": {"$exists": True}}).sort("automation_quote_accepted_at", -1).limit(100)
    async for quote in cursor:
        business_id = _business_id_from_record(quote)
        quote_id = _safe_id(quote.get("_id"))
        created += await _notify_roles(db, business_id, owner_roles, type_="quote_accepted", title="Quote accepted", message=f"{quote.get('customer_name') or 'A customer'} accepted a quote.", route=f"/quotes/{quote_id}", dedupe_prefix=f"quote_accepted:{quote_id}", related_id=quote_id)

    cursor = db.invoices.find({"automation_invoice_overdue_at": {"$exists": True}}).sort("automation_invoice_overdue_at", -1).limit(100)
    async for invoice in cursor:
        business_id = _business_id_from_record(invoice)
        invoice_id = _safe_id(invoice.get("_id"))
        created += await _notify_roles(db, business_id, owner_roles, type_="invoice_overdue", title="Invoice overdue", message=f"Invoice {invoice.get('invoice_number') or invoice_id[-6:]} needs follow-up.", route=f"/invoices/{invoice_id}", dedupe_prefix=f"invoice_overdue:{invoice_id}", related_id=invoice_id)

    cursor = db.follow_up_tasks.find({"status": {"$in": ["pending", "open", "todo"]}}).sort("created_at", -1).limit(100)
    async for task in cursor:
        business_id = _business_id_from_record(task)
        task_id = _safe_id(task.get("_id"))
        created += await _notify_roles(db, business_id, owner_roles, type_="follow_up_task", title=str(task.get("title") or "Follow-up task"), message=str(task.get("description") or "A follow-up needs attention."), route="/follow-ups", dedupe_prefix=f"follow_up:{task_id}", related_id=task_id)

    return created


async def _sweep_once(db) -> Dict[str, Any]:
    await _ensure_indexes(db)
    job_notifications = await _materialise_job_notifications(db)
    quote_invoice_notifications = await _materialise_quote_invoice_notifications(db)
    return {"success": True, "created": job_notifications + quote_invoice_notifications, "job_notifications": job_notifications, "quote_invoice_notifications": quote_invoice_notifications, "checked_at": _now().isoformat()}


async def _loop(db):
    await asyncio.sleep(6)
    while True:
        try:
            summary = await _sweep_once(db)
            if summary.get("created"):
                print(f"NOTIFICATIONS_SWEEP {summary}")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"NOTIFICATIONS_SWEEP_ERR {exc}")
        await asyncio.sleep(45)


def install_notifications_boot(server_module) -> None:
    global _INSTALLED, _TASK
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return

    _INSTALLED = True

    async def require_user(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required")
        return current_user

    @app.on_event("startup")
    async def _start_notifications_sweep():
        global _TASK
        if _TASK is None or _TASK.done():
            _TASK = asyncio.create_task(_loop(db))

    @app.on_event("shutdown")
    async def _stop_notifications_sweep():
        global _TASK
        if _TASK is not None and not _TASK.done():
            _TASK.cancel()

    router = APIRouter(prefix="/api/notifications", tags=["notifications"])

    def user_query(current_user: Dict[str, Any]) -> Dict[str, Any]:
        uid = _user_id(current_user)
        bid = _business_id_from_user(current_user)
        ids = _ids_for(bid)
        recipient_ids = [uid]
        if ObjectId.is_valid(uid):
            recipient_ids.append(ObjectId(uid))
        return {"$and": [
            {"business_id": {"$in": ids}},
            {"recipient_user_id": {"$in": recipient_ids}},
        ]}

    @router.get("")
    async def list_notifications(limit: int = Query(20, ge=1, le=100), current_user: Dict[str, Any] = Depends(require_user)):
        await _ensure_indexes(db)
        cursor = db.notifications.find(user_query(current_user)).sort("created_at", -1).limit(limit)
        rows = await cursor.to_list(length=limit)
        return {"success": True, "data": [_notification_payload(row) for row in rows]}

    @router.get("/unread-count")
    async def unread_count(current_user: Dict[str, Any] = Depends(require_user)):
        query = {"$and": [user_query(current_user), {"read": {"$ne": True}}]}
        count = await db.notifications.count_documents(query)
        return {"success": True, "data": {"unread": int(count)}}

    @router.patch("/{notification_id}/read")
    async def mark_read(notification_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        if not ObjectId.is_valid(notification_id):
            raise HTTPException(status_code=400, detail="Invalid notification id")
        query = {"$and": [user_query(current_user), {"_id": ObjectId(notification_id)}]}
        result = await db.notifications.update_one(query, {"$set": {"read": True, "read_at": _now(), "updated_at": _now()}})
        return {"success": True, "updated": int(result.modified_count or 0)}

    @router.post("/mark-all-read")
    async def mark_all_read(current_user: Dict[str, Any] = Depends(require_user)):
        query = {"$and": [user_query(current_user), {"read": {"$ne": True}}]}
        result = await db.notifications.update_many(query, {"$set": {"read": True, "read_at": _now(), "updated_at": _now()}})
        return {"success": True, "updated": int(result.modified_count or 0)}

    @router.post("/sweep-now")
    async def notifications_sweep_now(_: Dict[str, Any] = Depends(require_user)):
        return await _sweep_once(db)

    app.include_router(router)
    print("NOTIFICATIONS_BOOT_INSTALLED")
