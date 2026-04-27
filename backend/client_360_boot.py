"""Churvox Client 360 backend boot layer.

Repairs and strengthens client detail wiring so client records can reliably show
related jobs, quotes, invoices, follow-ups, and timeline data.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

_INSTALLED = False


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
    return _role(user) in {"owner", "employer", "admin", "manager", "office_admin", "payroll"}


def _business_scope(user: Dict[str, Any]) -> Dict[str, Any]:
    bid = _business_id_from_user(user)
    ids = _ids(bid)
    return {"$or": [
        {"business_id": {"$in": ids}},
        {"owner_id": {"$in": ids}},
        {"user_id": {"$in": ids}},
    ]}


def _client_match(client: Dict[str, Any]) -> Dict[str, Any]:
    cid = _safe_id(client.get("_id") or client.get("id"))
    name = str(client.get("name") or client.get("client_name") or "").strip()
    email = str(client.get("email") or client.get("client_email") or "").strip().lower()
    phone = str(client.get("phone") or client.get("client_phone") or "").strip()
    ids = _ids(cid)
    clauses: List[Dict[str, Any]] = [
        {"client_id": {"$in": ids}},
        {"customer_id": {"$in": ids}},
        {"related_id": {"$in": ids}},
    ]
    if name:
        clauses.extend([
            {"client_name": {"$regex": f"^{name}$", "$options": "i"}},
            {"customer_name": {"$regex": f"^{name}$", "$options": "i"}},
            {"name": {"$regex": f"^{name}$", "$options": "i"}},
        ])
    if email:
        clauses.extend([
            {"client_email": {"$regex": f"^{email}$", "$options": "i"}},
            {"customer_email": {"$regex": f"^{email}$", "$options": "i"}},
            {"email": {"$regex": f"^{email}$", "$options": "i"}},
        ])
    if phone:
        clauses.extend([
            {"client_phone": phone},
            {"customer_phone": phone},
            {"phone": phone},
        ])
    return {"$or": clauses}


async def _find_client(db, client_id: str, user: Dict[str, Any]) -> Dict[str, Any] | None:
    queries: List[Dict[str, Any]] = []
    if ObjectId.is_valid(client_id):
        queries.append({"_id": ObjectId(client_id)})
    queries.extend([{ "id": client_id }, { "client_id": client_id }])
    scope = _business_scope(user)
    for query in queries:
        row = await db.clients.find_one({"$and": [scope, query]})
        if row:
            return row
    return None


async def _related(db, collection: str, client: Dict[str, Any], user: Dict[str, Any], limit: int = 150) -> List[Dict[str, Any]]:
    query = {"$and": [_business_scope(user), _client_match(client)]}
    cursor = db[collection].find(query).sort("created_at", -1).limit(limit)
    rows = await cursor.to_list(length=limit)
    return [_json_safe(row) for row in rows]


def _amount(row: Dict[str, Any]) -> float:
    try:
        return float(row.get("total") or row.get("amount") or row.get("subtotal") or row.get("price") or 0)
    except Exception:
        return 0.0


def _timeline(jobs: List[Dict[str, Any]], quotes: List[Dict[str, Any]], invoices: List[Dict[str, Any]], followups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for job in jobs:
        rows.append({"type": "job", "id": _safe_id(job.get("_id") or job.get("id")), "title": job.get("title") or "Job", "status": job.get("status"), "date": job.get("scheduled_date") or job.get("completed_at") or job.get("updated_at") or job.get("created_at"), "route": f"/jobs/{_safe_id(job.get('_id') or job.get('id'))}"})
    for quote in quotes:
        rows.append({"type": "quote", "id": _safe_id(quote.get("_id") or quote.get("id")), "title": quote.get("quote_number") or quote.get("job_description") or "Quote", "status": quote.get("status"), "date": quote.get("updated_at") or quote.get("created_at") or quote.get("valid_until"), "route": f"/quotes/{_safe_id(quote.get('_id') or quote.get('id'))}"})
    for invoice in invoices:
        rows.append({"type": "invoice", "id": _safe_id(invoice.get("_id") or invoice.get("id")), "title": invoice.get("invoice_number") or "Invoice", "status": invoice.get("status"), "date": invoice.get("paid_at") or invoice.get("updated_at") or invoice.get("created_at") or invoice.get("due_date"), "route": f"/invoices/{_safe_id(invoice.get('_id') or invoice.get('id'))}", "amount": _amount(invoice)})
    for task in followups:
        rows.append({"type": "follow_up", "id": _safe_id(task.get("_id") or task.get("id")), "title": task.get("title") or "Follow-up", "status": task.get("status"), "date": task.get("due_at") or task.get("updated_at") or task.get("created_at"), "route": "/follow-ups"})
    return sorted(rows, key=lambda r: str(r.get("date") or ""), reverse=True)[:50]


def install_client_360_boot(server_module) -> None:
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
            raise HTTPException(status_code=403, detail="Client access required")
        return current_user

    router = APIRouter(prefix="/api/clients", tags=["client-360"])

    @router.get("/{client_id}/jobs")
    async def client_jobs(client_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        client = await _find_client(db, client_id, current_user)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        return {"success": True, "data": await _related(db, "jobs", client, current_user)}

    @router.get("/{client_id}/quotes")
    async def client_quotes(client_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        client = await _find_client(db, client_id, current_user)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        return {"success": True, "data": await _related(db, "quotes", client, current_user)}

    @router.get("/{client_id}/invoices")
    async def client_invoices(client_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        client = await _find_client(db, client_id, current_user)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        return {"success": True, "data": await _related(db, "invoices", client, current_user)}

    @router.get("/{client_id}/activity")
    async def client_activity(client_id: str, current_user: Dict[str, Any] = Depends(require_user)):
        client = await _find_client(db, client_id, current_user)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        jobs = await _related(db, "jobs", client, current_user)
        quotes = await _related(db, "quotes", client, current_user)
        invoices = await _related(db, "invoices", client, current_user)
        followups = await _related(db, "follow_up_tasks", client, current_user)
        paid_revenue = sum(_amount(i) for i in invoices if str(i.get("status") or "").lower() == "paid")
        outstanding = sum(_amount(i) for i in invoices if str(i.get("status") or "").lower() not in {"paid", "cancelled", "void"})
        return {"success": True, "data": {
            "client": _json_safe(client),
            "jobs": jobs,
            "quotes": quotes,
            "invoices": invoices,
            "follow_ups": followups,
            "timeline": _timeline(jobs, quotes, invoices, followups),
            "summary": {
                "jobs": len(jobs),
                "quotes": len(quotes),
                "invoices": len(invoices),
                "follow_ups": len([f for f in followups if str(f.get("status") or "").lower() not in {"completed", "done", "closed"}]),
                "paid_revenue": paid_revenue,
                "outstanding": outstanding,
            },
        }}

    app.include_router(router)
    print("CLIENT_360_BOOT_INSTALLED")
