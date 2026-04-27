"""Churvox job-to-invoice boot layer.

Adds/repairs the draft invoice pipeline used by Job Detail and automation.
Completed jobs should never be a dead end: they can become draft invoices
without sending anything to the customer until the owner/admin reviews it.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

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


def _ids(value: str) -> List[Any]:
    out: List[Any] = []
    if value:
        out.append(value)
        if ObjectId.is_valid(value):
            out.append(ObjectId(value))
    return out


def _allowed(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    if user.get("is_admin") or user.get("is_platform_owner"):
        return True
    return _role(user) in {"owner", "employer", "admin", "manager", "office_admin"}


def _money(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except Exception:
        return 0.0


def _job_total(job: Dict[str, Any]) -> Tuple[float, Dict[str, float]]:
    pricing_type = str(job.get("pricing_type") or "fixed").lower()
    fixed = _money(job.get("price") or job.get("fixed_price") or job.get("job_price"))
    hourly_rate = _money(job.get("hourly_rate"))
    estimated_hours = _money(job.get("estimated_hours") or job.get("hours_worked"))
    extras = _money(job.get("extras_amount") or job.get("extras_total"))
    worked_seconds = _money(job.get("total_time_seconds") or job.get("worked_seconds") or job.get("net_worked_seconds"))
    worked_minutes = _money(job.get("time_spent_minutes") or job.get("worked_minutes") or job.get("net_worked_minutes"))
    actual_hours = worked_seconds / 3600 if worked_seconds else worked_minutes / 60 if worked_minutes else 0
    hours = actual_hours or estimated_hours

    if pricing_type == "hourly":
        total = hourly_rate * hours
    elif pricing_type == "hourly_extras":
        total = hourly_rate * hours + extras
    elif pricing_type == "fixed_extras":
        total = fixed + extras
    else:
        total = fixed or _money(job.get("estimated_total"))
    return round(total, 2), {"fixed": fixed, "hourly_rate": hourly_rate, "hours": round(hours, 2), "extras": extras}


def _invoice_number(job: Dict[str, Any]) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d")
    tail = _safe_id(job.get("_id"))[-6:].upper() or "JOB"
    return f"INV-{stamp}-{tail}"


def _public_token(job: Dict[str, Any]) -> str:
    tail = _safe_id(job.get("_id")) or datetime.now(timezone.utc).strftime("%f")
    return f"inv_{tail}_{datetime.now(timezone.utc).strftime('%H%M%S')}"


async def _find_job(db, job_id: str, current_user: Dict[str, Any] | None = None) -> Dict[str, Any] | None:
    queries: List[Dict[str, Any]] = []
    if ObjectId.is_valid(job_id):
        queries.append({"_id": ObjectId(job_id)})
    queries.append({"id": job_id})

    if current_user and not current_user.get("is_platform_owner") and not current_user.get("is_admin"):
        bid = _business_id_from_user(current_user)
        scope = {"$or": [{"business_id": {"$in": _ids(bid)}}, {"owner_id": {"$in": _ids(bid)}}, {"user_id": {"$in": _ids(bid)}}]}
        queries = [{"$and": [q, scope]} for q in queries]

    for query in queries:
        job = await db.jobs.find_one(query)
        if job:
            return job
    return None


async def _existing_invoice_for_job(db, job: Dict[str, Any]) -> Dict[str, Any] | None:
    job_id = _safe_id(job.get("_id"))
    existing_id = _safe_id(job.get("invoice_id"))
    queries: List[Dict[str, Any]] = []
    if existing_id:
        if ObjectId.is_valid(existing_id):
            queries.append({"_id": ObjectId(existing_id)})
        queries.append({"id": existing_id})
    queries.append({"job_id": job_id})
    for query in queries:
        invoice = await db.invoices.find_one(query)
        if invoice:
            return invoice
    return None


async def _create_draft_invoice_from_job(db, job: Dict[str, Any], actor: str = "system") -> Dict[str, Any]:
    existing = await _existing_invoice_for_job(db, job)
    if existing:
        return {"created": False, "invoice": existing, "invoice_id": _safe_id(existing.get("_id")), "message": "Draft invoice already exists"}

    total, breakdown = _job_total(job)
    gst_rate = _money(job.get("gst_rate") if job.get("gst_rate") is not None else 15)
    subtotal = total
    gst_amount = round(subtotal * gst_rate / 100, 2) if gst_rate else 0.0
    grand_total = round(subtotal + gst_amount, 2)
    business_id = _business_id_from_record(job)
    job_id = _safe_id(job.get("_id"))

    description_bits = [
        job.get("title") or "Completed job",
        job.get("address") or "",
        f"Pricing: {job.get('pricing_type') or 'fixed'}",
    ]
    if breakdown.get("hours"):
        description_bits.append(f"Hours: {breakdown['hours']}")

    invoice = {
        "business_id": business_id,
        "owner_id": business_id,
        "job_id": job_id,
        "client_id": job.get("client_id") or job.get("customer_id"),
        "customer_name": job.get("customer_name") or job.get("client_name") or job.get("name") or "Customer",
        "client_name": job.get("client_name") or job.get("customer_name") or "Customer",
        "customer_email": job.get("customer_email") or job.get("client_email") or job.get("email") or "",
        "customer_phone": job.get("customer_phone") or job.get("client_phone") or job.get("phone") or "",
        "address": job.get("address") or "",
        "invoice_number": _invoice_number(job),
        "description": "\n".join([str(bit) for bit in description_bits if bit]),
        "pricing_type": job.get("pricing_type") or "fixed",
        "price": breakdown.get("fixed", 0),
        "hourly_rate": breakdown.get("hourly_rate", 0),
        "hours_worked": breakdown.get("hours", 0),
        "extras_amount": breakdown.get("extras", 0),
        "subtotal": subtotal,
        "gst_rate": gst_rate,
        "gst_amount": gst_amount,
        "total": grand_total,
        "amount": grand_total,
        "status": "draft",
        "source": "job_completion",
        "created_from_job": True,
        "created_by": actor,
        "public_token": _public_token(job),
        "due_date": _now() + timedelta(days=14),
        "created_at": _now(),
        "updated_at": _now(),
    }
    result = await db.invoices.insert_one(invoice)
    invoice["_id"] = result.inserted_id
    await db.jobs.update_one({"_id": job["_id"]}, {"$set": {"invoice_id": _safe_id(result.inserted_id), "invoice_number": invoice["invoice_number"], "invoice_created_at": _now(), "updated_at": _now()}})
    return {"created": True, "invoice": invoice, "invoice_id": _safe_id(result.inserted_id), "message": "Draft invoice created"}


async def _sweep_once(db) -> Dict[str, Any]:
    created = 0
    checked = 0
    invoice_ids: List[str] = []
    query = {
        "$and": [
            {"$or": [{"status": "completed"}, {"completed": True}, {"completed_at": {"$exists": True, "$ne": None}}]},
            {"$or": [{"invoice_id": {"$exists": False}}, {"invoice_id": None}, {"invoice_id": ""}]},
        ]
    }
    cursor = db.jobs.find(query).sort("updated_at", -1).limit(100)
    async for job in cursor:
        checked += 1
        try:
            result = await _create_draft_invoice_from_job(db, job, actor="automation_sweep")
            if result.get("created"):
                created += 1
                invoice_ids.append(result.get("invoice_id"))
        except Exception as exc:
            print(f"JOB_INVOICE_SWEEP_ITEM_ERR {_safe_id(job.get('_id'))} {exc}")
    return {"success": True, "checked": checked, "created": created, "invoice_ids": invoice_ids[:50], "checked_at": _now().isoformat()}


async def _loop(db):
    await asyncio.sleep(12)
    while True:
        try:
            summary = await _sweep_once(db)
            if summary.get("created"):
                print(f"JOB_INVOICE_SWEEP {summary}")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"JOB_INVOICE_SWEEP_ERR {exc}")
        await asyncio.sleep(90)


def install_job_invoice_boot(server_module) -> None:
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
        if not _allowed(current_user):
            raise HTTPException(status_code=403, detail="Invoice creation access required")
        return current_user

    @app.on_event("startup")
    async def _start_job_invoice_sweep():
        global _TASK
        if _TASK is None or _TASK.done():
            _TASK = asyncio.create_task(_loop(db))

    @app.on_event("shutdown")
    async def _stop_job_invoice_sweep():
        global _TASK
        if _TASK is not None and not _TASK.done():
            _TASK.cancel()

    router = APIRouter(tags=["job-invoice"])

    @router.post("/api/jobs/{job_id}/create-draft-invoice")
    async def create_draft_invoice(job_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        job = await _find_job(db, job_id, current_user)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        result = await _create_draft_invoice_from_job(db, job, actor=_safe_id(current_user.get("_id") or current_user.get("id")) or "user")
        return {"success": True, "data": {"invoice_id": result["invoice_id"], "created": result["created"], "message": result["message"], "invoice": _json_safe(result["invoice"])}}

    @router.post("/api/job-invoices/sweep-now")
    async def job_invoice_sweep_now(_: Dict[str, Any] = Depends(require_user)):
        return await _sweep_once(db)

    @router.get("/api/job-invoices/health")
    async def job_invoice_health(_: Dict[str, Any] = Depends(require_user)):
        return {"success": True, "installed": True, "running": bool(_TASK and not _TASK.done())}

    app.include_router(router)
    print("JOB_INVOICE_BOOT_INSTALLED")
