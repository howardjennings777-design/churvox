"""Churvox business-owner reporting boot layer.

Adds a real /api/reports/summary endpoint for the Reports page.
This keeps Reports useful even before deeper analytics infrastructure exists.
All data is scoped to the current user's business.
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Tuple

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

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


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except Exception:
        return 0.0


def _date(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


def _business_id(user: Dict[str, Any]) -> str:
    return _safe_id(user.get("business_id") or user.get("owner_id") or user.get("id") or user.get("_id"))


def _role(user: Dict[str, Any]) -> str:
    return str(user.get("role") or "").lower().strip()


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


def _range(range_name: str) -> Tuple[datetime, datetime]:
    now = _now()
    if range_name == "last_month":
        end = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
        month = end.month - 1 or 12
        year = end.year - 1 if end.month == 1 else end.year
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        return start, end
    if range_name == "last_90_days":
        return now - timedelta(days=90), now + timedelta(days=1)
    if range_name == "year_to_date":
        return datetime(now.year, 1, 1, tzinfo=timezone.utc), now + timedelta(days=1)
    return datetime(now.year, now.month, 1, tzinfo=timezone.utc), now + timedelta(days=1)


def _record_date(record: Dict[str, Any], fields: List[str]) -> datetime | None:
    for field in fields:
        dt = _date(record.get(field))
        if dt:
            return dt
    return None


def _within(record: Dict[str, Any], start: datetime, end: datetime, fields: List[str]) -> bool:
    dt = _record_date(record, fields)
    if not dt:
        return True
    return start <= dt < end


def _count_by(records: List[Dict[str, Any]], key: str) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for item in records:
        value = str(item.get(key) or "unknown").lower().replace(" ", "_")
        out[value] = out.get(value, 0) + 1
    return out


def _amount(record: Dict[str, Any]) -> float:
    return _num(record.get("total") or record.get("amount") or record.get("price") or record.get("subtotal"))


def _client_key(record: Dict[str, Any]) -> str:
    return str(record.get("client_id") or record.get("customer_id") or record.get("client_name") or record.get("customer_name") or record.get("address") or "unknown")


def _client_name(record: Dict[str, Any]) -> str:
    return str(record.get("client_name") or record.get("customer_name") or record.get("name") or "Unknown client")


def _worker_hours(job: Dict[str, Any]) -> float:
    seconds = _num(job.get("total_time_seconds") or job.get("worked_seconds") or job.get("net_worked_seconds"))
    if seconds > 0:
        return seconds / 3600
    minutes = _num(job.get("time_spent_minutes") or job.get("worked_minutes") or job.get("net_worked_minutes"))
    if minutes > 0:
        return minutes / 60
    return _num(job.get("hours_worked"))


async def _list(db, name: str, query: Dict[str, Any], limit: int = 1000) -> List[Dict[str, Any]]:
    try:
        cursor = db[name].find(query).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception:
        return []


async def _summary(db, user: Dict[str, Any], range_name: str) -> Dict[str, Any]:
    scope = _business_scope(user)
    start, end = _range(range_name)

    jobs_all = await _list(db, "jobs", scope)
    invoices_all = await _list(db, "invoices", scope)
    quotes_all = await _list(db, "quotes", scope)
    clients_all = await _list(db, "clients", scope)
    workers_all = await _list(db, "users", {"$and": [scope, {"role": {"$in": ["worker", "manager", "office_admin", "payroll"]}}]})
    automation_rules_all = await _list(db, "automation_rules", scope)
    automation_runs_all = await _list(db, "automation_runs", scope)

    jobs = [j for j in jobs_all if _within(j, start, end, ["completed_at", "updated_at", "created_at", "scheduled_date"])]
    invoices = [i for i in invoices_all if _within(i, start, end, ["paid_at", "updated_at", "created_at", "due_date"])]
    quotes = [q for q in quotes_all if _within(q, start, end, ["updated_at", "created_at", "valid_until"])]
    automation_runs = [r for r in automation_runs_all if _within(r, start, end, ["started_at", "created_at"])]

    paid_invoices = [i for i in invoices if str(i.get("status") or "").lower() == "paid"]
    outstanding_invoices = [i for i in invoices_all if str(i.get("status") or "").lower() not in {"paid", "cancelled", "void"}]
    overdue_invoices = [i for i in invoices_all if str(i.get("status") or "").lower() == "overdue"]
    completed_jobs = [j for j in jobs if str(j.get("status") or "").lower() == "completed" or bool(j.get("completed"))]
    active_jobs = [j for j in jobs_all if str(j.get("status") or "").lower() in {"assigned", "acknowledged", "in_progress", "paused"}]
    accepted_quotes = [q for q in quotes if str(q.get("status") or "").lower() == "accepted"]
    decided_quotes = [q for q in quotes if str(q.get("status") or "").lower() in {"accepted", "declined", "sent"}]

    client_map: Dict[str, Dict[str, Any]] = {}
    for invoice in invoices:
        key = _client_key(invoice)
        existing = client_map.setdefault(key, {"client_id": key, "client_name": _client_name(invoice), "revenue": 0.0, "jobs": 0})
        existing["revenue"] += _amount(invoice)
    for job in jobs:
        key = _client_key(job)
        existing = client_map.setdefault(key, {"client_id": key, "client_name": _client_name(job), "revenue": 0.0, "jobs": 0})
        existing["jobs"] += 1

    automation_failed = [r for r in automation_runs if str(r.get("status") or "").lower() == "failed"]
    automation_completed = [r for r in automation_runs if str(r.get("status") or "").lower() == "completed"]

    myob_sync_issues = len([i for i in invoices_all if str(i.get("myob_sync_status") or "").lower() in {"failed", "sync_failed", "error"}])
    recurring_jobs_due = len([j for j in jobs_all if j.get("is_recurring") or j.get("recurring") or j.get("recurrence")])
    worker_hours = round(sum(_worker_hours(job) for job in jobs), 2)
    revenue = sum(_amount(i) for i in paid_invoices)
    outstanding = sum(_amount(i) for i in outstanding_invoices)

    top_clients = sorted(client_map.values(), key=lambda c: (_num(c.get("revenue")), _num(c.get("jobs"))), reverse=True)[:10]

    data = {
        "range": range_name,
        "range_start": start.isoformat(),
        "range_end": end.isoformat(),
        "revenue_this_month": revenue,
        "outstanding_invoices": outstanding,
        "overdue_invoices": len(overdue_invoices),
        "paid_invoices": len(paid_invoices),
        "completed_jobs": len(completed_jobs),
        "active_jobs": len(active_jobs),
        "worker_hours": worker_hours,
        "payroll_hours_summary": worker_hours,
        "quote_win_rate": (len(accepted_quotes) / len(decided_quotes)) if decided_quotes else 0,
        "recurring_jobs_due": recurring_jobs_due,
        "myob_sync_issues": myob_sync_issues,
        "automation_rules": len(automation_rules_all),
        "automation_runs": len(automation_runs),
        "automation_failed": len(automation_failed),
        "automation_completed": len(automation_completed),
        "jobs_by_status": _count_by(jobs_all, "status"),
        "invoice_status_breakdown": _count_by(invoices_all, "status"),
        "quote_status_breakdown": _count_by(quotes_all, "status"),
        "top_clients": top_clients,
        "total_clients": len(clients_all),
        "total_workers": len(workers_all),
        "jobs_list": [_json_safe(j) for j in jobs[:100]],
        "invoices_list": [_json_safe(i) for i in invoices[:100]],
        "quotes_list": [_json_safe(q) for q in quotes[:100]],
        "clients_list": [_json_safe(c) for c in clients_all[:100]],
        "workers_list": [_json_safe(w) for w in workers_all[:100]],
        "generated_at": _now().isoformat(),
    }
    return data


def _allowed_reports_user(user: Dict[str, Any] | None) -> bool:
    if not user:
        return False
    if user.get("is_admin") or user.get("is_platform_owner"):
        return True
    return _role(user) in {"owner", "employer", "admin", "manager", "office_admin"}


def install_business_reports_boot(server_module) -> None:
    global _INSTALLED
    if _INSTALLED:
        return

    app = getattr(server_module, "app", None)
    db = getattr(server_module, "db", None)
    get_current_user = getattr(server_module, "get_current_user", None)
    if app is None or db is None or get_current_user is None:
        return

    _INSTALLED = True

    async def require_reports_user(current_user: Dict[str, Any] = Depends(get_current_user)):
        if not _allowed_reports_user(current_user):
            raise HTTPException(status_code=403, detail="Reports access required")
        return current_user

    router = APIRouter(prefix="/api/reports", tags=["reports"])

    @router.get("/summary")
    async def reports_summary(range: str = Query("this_month"), current_user: Dict[str, Any] = Depends(require_reports_user)):
        return {"success": True, "data": await _summary(db, current_user, range)}

    app.include_router(router)
    print("BUSINESS_REPORTS_BOOT_INSTALLED")
