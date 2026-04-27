"""Churvox quote-to-job boot layer.

Accepted quotes should not be a dead end. This adds a reliable conversion
pipeline used by the Quote detail page and by automation sweeps.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Dict, List

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


def _quote_total(quote: Dict[str, Any]) -> float:
    total = _money(quote.get("total") or quote.get("price") or quote.get("amount") or quote.get("subtotal"))
    extras = quote.get("extras") if isinstance(quote.get("extras"), list) else []
    if total:
        return total
    return round(sum(_money(item.get("amount") or item.get("price") or item.get("total")) for item in extras), 2)


def _title_from_quote(quote: Dict[str, Any]) -> str:
    return str(
        quote.get("job_title") or
        quote.get("title") or
        quote.get("job_description") or
        quote.get("description") or
        f"Job from {quote.get('quote_number') or 'quote'}"
    )[:160]


async def _find_quote(db, quote_id: str, current_user: Dict[str, Any] | None = None) -> Dict[str, Any] | None:
    queries: List[Dict[str, Any]] = []
    if ObjectId.is_valid(quote_id):
        queries.append({"_id": ObjectId(quote_id)})
    queries.append({"id": quote_id})

    if current_user and not current_user.get("is_platform_owner") and not current_user.get("is_admin"):
        bid = _business_id_from_user(current_user)
        scope = {"$or": [{"business_id": {"$in": _ids(bid)}}, {"owner_id": {"$in": _ids(bid)}}, {"user_id": {"$in": _ids(bid)}}]}
        queries = [{"$and": [q, scope]} for q in queries]

    for query in queries:
        quote = await db.quotes.find_one(query)
        if quote:
            return quote
    return None


async def _existing_job_for_quote(db, quote: Dict[str, Any]) -> Dict[str, Any] | None:
    quote_id = _safe_id(quote.get("_id"))
    linked_job_id = _safe_id(quote.get("converted_job_id") or quote.get("job_id"))
    queries: List[Dict[str, Any]] = []
    if linked_job_id:
        if ObjectId.is_valid(linked_job_id):
            queries.append({"_id": ObjectId(linked_job_id)})
        queries.append({"id": linked_job_id})
    queries.append({"quote_id": quote_id})
    queries.append({"source_quote_id": quote_id})
    for query in queries:
        job = await db.jobs.find_one(query)
        if job:
            return job
    return None


async def _convert_quote_to_job(db, quote: Dict[str, Any], actor: str = "system") -> Dict[str, Any]:
    status = str(quote.get("status") or "").lower().strip()
    if status in {"declined", "cancelled", "expired"}:
        raise HTTPException(status_code=400, detail="Declined or expired quotes cannot be converted")

    existing = await _existing_job_for_quote(db, quote)
    if existing:
        job_id = _safe_id(existing.get("_id"))
        await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"converted_job_id": job_id, "job_id": job_id, "converted_at": quote.get("converted_at") or _now(), "updated_at": _now()}})
        return {"created": False, "job": existing, "job_id": job_id, "message": "Job already exists for this quote"}

    quote_id = _safe_id(quote.get("_id"))
    business_id = _business_id_from_record(quote)
    total = _quote_total(quote)
    extras = quote.get("extras") if isinstance(quote.get("extras"), list) else []
    extras_total = round(sum(_money(item.get("amount") or item.get("price") or item.get("total")) for item in extras), 2)

    job = {
        "business_id": business_id,
        "owner_id": business_id,
        "quote_id": quote_id,
        "source_quote_id": quote_id,
        "quote_number": quote.get("quote_number"),
        "title": _title_from_quote(quote),
        "description": quote.get("job_description") or quote.get("description") or "",
        "client_id": quote.get("client_id") or quote.get("customer_id"),
        "client_name": quote.get("client_name") or quote.get("customer_name") or "Customer",
        "customer_name": quote.get("customer_name") or quote.get("client_name") or "Customer",
        "customer_email": quote.get("customer_email") or quote.get("client_email") or quote.get("email") or "",
        "customer_phone": quote.get("customer_phone") or quote.get("client_phone") or quote.get("phone") or "",
        "address": quote.get("address") or quote.get("site_address") or "",
        "country": quote.get("country") or "",
        "region": quote.get("region") or "",
        "scheduled_date": quote.get("scheduled_date") or quote.get("preferred_date") or None,
        "status": "assigned",
        "pricing_type": quote.get("pricing_type") or "fixed",
        "price": total,
        "fixed_price": total,
        "hourly_rate": _money(quote.get("hourly_rate")),
        "estimated_hours": _money(quote.get("estimated_hours") or quote.get("hours")),
        "extras_amount": extras_total,
        "estimated_total": total,
        "notes": quote.get("notes") or "",
        "checklist_items": quote.get("checklist_items") or quote.get("checklist") or [],
        "photos": [],
        "worker_notes": "",
        "time_spent_minutes": 0,
        "created_from_quote": True,
        "created_by": actor,
        "created_at": _now(),
        "updated_at": _now(),
    }
    result = await db.jobs.insert_one(job)
    job["_id"] = result.inserted_id
    job_id = _safe_id(result.inserted_id)
    await db.quotes.update_one({"_id": quote["_id"]}, {"$set": {"status": "accepted" if status != "draft" else "accepted", "converted_job_id": job_id, "job_id": job_id, "converted_at": _now(), "updated_at": _now()}})
    return {"created": True, "job": job, "job_id": job_id, "message": "Quote converted to job"}


async def _sweep_once(db) -> Dict[str, Any]:
    checked = 0
    created = 0
    job_ids: List[str] = []
    query = {
        "status": "accepted",
        "$and": [
            {"$or": [{"converted_job_id": {"$exists": False}}, {"converted_job_id": None}, {"converted_job_id": ""}]},
            {"$or": [{"job_id": {"$exists": False}}, {"job_id": None}, {"job_id": ""}]},
        ],
    }
    cursor = db.quotes.find(query).sort("updated_at", -1).limit(100)
    async for quote in cursor:
        checked += 1
        try:
            result = await _convert_quote_to_job(db, quote, actor="automation_sweep")
            if result.get("created"):
                created += 1
                job_ids.append(result.get("job_id"))
        except Exception as exc:
            print(f"QUOTE_JOB_SWEEP_ITEM_ERR {_safe_id(quote.get('_id'))} {exc}")
    return {"success": True, "checked": checked, "created": created, "job_ids": job_ids[:50], "checked_at": _now().isoformat()}


async def _loop(db):
    await asyncio.sleep(14)
    while True:
        try:
            summary = await _sweep_once(db)
            if summary.get("created"):
                print(f"QUOTE_JOB_SWEEP {summary}")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"QUOTE_JOB_SWEEP_ERR {exc}")
        await asyncio.sleep(90)


def install_quote_job_boot(server_module) -> None:
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
            raise HTTPException(status_code=403, detail="Quote conversion access required")
        return current_user

    @app.on_event("startup")
    async def _start_quote_job_sweep():
        global _TASK
        if _TASK is None or _TASK.done():
            _TASK = asyncio.create_task(_loop(db))

    @app.on_event("shutdown")
    async def _stop_quote_job_sweep():
        global _TASK
        if _TASK is not None and not _TASK.done():
            _TASK.cancel()

    router = APIRouter(tags=["quote-job"])

    @router.post("/api/quotes/{quote_id}/convert")
    async def convert_quote(quote_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        quote = await _find_quote(db, quote_id, current_user)
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        result = await _convert_quote_to_job(db, quote, actor=_safe_id(current_user.get("_id") or current_user.get("id")) or "user")
        return {"success": True, "job_id": result["job_id"], "created": result["created"], "message": result["message"], "job": _json_safe(result["job"])}

    @router.post("/api/quote-jobs/sweep-now")
    async def quote_job_sweep_now(_: Dict[str, Any] = Depends(require_user)):
        return await _sweep_once(db)

    @router.get("/api/quote-jobs/health")
    async def quote_job_health(_: Dict[str, Any] = Depends(require_user)):
        return {"success": True, "installed": True, "running": bool(_TASK and not _TASK.done())}

    app.include_router(router)
    print("QUOTE_JOB_BOOT_INSTALLED")
