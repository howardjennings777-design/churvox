from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List

from fastapi import APIRouter, HTTPException, Request


OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}
TIME_COLLECTIONS = ["time_entries", "timers", "worker_time_entries", "timesheets", "payroll_entries"]
WORKER_COLLECTIONS = ["users", "workers", "team", "team_members", "staff", "employees"]
FINAL_STATUSES = {"approved", "closed", "complete", "completed", "done", "paid", "processed"}


def build_paid_launch_readiness_router(db, get_current_user, ObjectId):
    router = APIRouter()

    def now():
        return datetime.now(timezone.utc)

    def clean(value: Any, fallback: str = "") -> str:
        try:
            text = " ".join(str(value or "").strip().split())
        except Exception:
            text = ""
        return text or fallback

    def lower(value: Any) -> str:
        return clean(value).lower()

    def safe(value: Any):
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, ObjectId):
            return str(value)
        if isinstance(value, list):
            return [safe(item) for item in value]
        if isinstance(value, dict):
            out = {}
            for key, item in value.items():
                if any(word in str(key).lower() for word in ["password", "token", "secret", "hash"]):
                    continue
                out["id" if key == "_id" else key] = safe(item)
            return out
        return value

    def first(row: Dict[str, Any], keys: Iterable[str], fallback: Any = ""):
        for key in keys:
            value = (row or {}).get(key)
            if value not in (None, ""):
                return value
        return fallback

    def number(value: Any) -> float:
        try:
            return float(str(value or "0").replace("$", "").replace(",", "").replace("%", ""))
        except Exception:
            return 0.0

    def maybe_oid(value: Any):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    async def require_owner(request: Request):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role"))
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can review payroll.")
        return user

    def business_values(user: Dict[str, Any]):
        raw = clean((user or {}).get("business_id") or (user or {}).get("id") or (user or {}).get("_id"))
        if not raw:
            raise HTTPException(status_code=400, detail="Business id is missing.")
        values: List[Any] = [raw]
        oid = maybe_oid(raw)
        if oid is not None:
            values.append(oid)
        return raw, values

    def scope_query(user: Dict[str, Any]):
        _, values = business_values(user)
        return {"$or": [
            {"business_id": {"$in": values}},
            {"businessId": {"$in": values}},
            {"owner_business_id": {"$in": values}},
            {"contractor_id": {"$in": values}},
            {"owner_id": {"$in": values}},
            {"employer_id": {"$in": values}},
            {"company_id": {"$in": values}},
        ]}

    async def read_rows(user: Dict[str, Any], names: Iterable[str], limit: int, errors: List[str]):
        query = scope_query(user)
        rows: List[Dict[str, Any]] = []
        for name in names:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    try:
                        cursor = cursor.sort("_id", -1)
                    except Exception:
                        pass
                found = await cursor.limit(limit).to_list(length=limit)
                rows.extend([{**dict(item), "_collection": name} for item in found])
            except Exception as exc:
                errors.append(f"{name}: {exc.__class__.__name__}")
        return rows[:limit]

    def record_id(row: Dict[str, Any]) -> str:
        return clean(first(row, ["_id", "id", "timer_id", "entry_id", "worker_id", "user_id"], ""))

    def worker_id(row: Dict[str, Any]) -> str:
        return clean(first(row, ["worker_id", "assigned_worker_id", "staff_id", "employee_id", "user_id", "worker", "assigned_to"], ""))

    def worker_name(row: Dict[str, Any], fallback: str = "Worker") -> str:
        return clean(first(row, ["worker_name", "assigned_worker_name", "staff_name", "employee_name", "full_name", "name", "email"], fallback), fallback)

    def duration_hours(row: Dict[str, Any]) -> float:
        direct = number(first(row, ["hours", "duration_hours", "total_hours", "regular_hours", "worked_hours"], 0))
        if direct > 0:
            return direct
        minutes = number(first(row, ["duration_minutes", "minutes", "worked_minutes"], 0))
        if minutes > 0:
            return minutes / 60.0
        seconds = number(first(row, ["duration_seconds", "seconds", "worked_seconds"], 0))
        if seconds > 0:
            return seconds / 3600.0
        raw = number(first(row, ["duration"], 0))
        if raw <= 0:
            return 0.0
        if raw > 24 * 60:
            return raw / 3600.0
        if raw > 24:
            return raw / 60.0
        return raw

    def hourly_rate(row: Dict[str, Any], worker: Dict[str, Any] | None = None) -> float:
        rate = number(first(row, ["hourly_rate", "pay_rate", "rate", "worker_rate"], 0))
        if rate > 0:
            return rate
        return number(first(worker or {}, ["hourly_rate", "pay_rate", "rate", "worker_rate"], 0))

    def index_workers(workers: List[Dict[str, Any]]):
        index: Dict[str, Dict[str, Any]] = {}
        for row in workers:
            for value in [
                record_id(row),
                clean(first(row, ["worker_id", "staff_id", "employee_id", "user_id"], "")),
                lower(first(row, ["email", "worker_email", "staff_email"], "")),
                lower(worker_name(row, "")),
            ]:
                if value:
                    index[value] = row
        return index

    def find_worker(row: Dict[str, Any], index: Dict[str, Dict[str, Any]]):
        for value in [
            worker_id(row),
            lower(first(row, ["worker_email", "staff_email", "email"], "")),
            lower(worker_name(row, "")),
        ]:
            if value and value in index:
                return index[value]
        return None

    def review_item(row: Dict[str, Any], worker: Dict[str, Any] | None):
        hours = round(max(0.0, duration_hours(row)), 2)
        rate = round(max(0.0, hourly_rate(row, worker)), 2)
        gross = round(hours * rate, 2) if hours > 0 and rate > 0 else 0.0
        status = lower(first(row, ["status", "state", "approval_status", "payroll_status"], "review")) or "review"
        ended = first(row, ["ended_at", "end", "clock_out", "end_time"], "")
        note = clean(first(row, ["note", "notes", "worker_note", "reason", "description"], ""))
        review_required = not ended or hours <= 0 or hours > 16 or status not in FINAL_STATUSES
        return {
            "id": record_id(row),
            "worker_id": worker_id(row) or record_id(worker or {}),
            "worker_name": worker_name(row, worker_name(worker or {})),
            "date": clean(first(row, ["date", "work_date", "started_at", "start", "clock_in", "created_at"], "")),
            "start": safe(first(row, ["started_at", "start", "clock_in", "start_time"], "")),
            "end": safe(ended),
            "hours": hours,
            "hourly_rate": rate,
            "gross_pay": gross,
            "status": status,
            "note": note,
            "review_required": review_required,
            "source_collection": clean(row.get("_collection")),
            "read_only": True,
            "owner_approval_required": True,
            "no_tax_filing": True,
            "no_bank_file": True,
            "no_payment": True,
        }

    async def payroll_payload(request: Request):
        user = await require_owner(request)
        business_id, _ = business_values(user)
        errors: List[str] = []
        workers = await read_rows(user, WORKER_COLLECTIONS, 240, errors)
        entries = await read_rows(user, TIME_COLLECTIONS, 500, errors)
        index = index_workers(workers)
        items = [review_item(row, find_worker(row, index)) for row in entries]
        items = [item for item in items if item["hours"] > 0 or item["start"] or item["end"] or item["note"]]
        items.sort(key=lambda item: clean(item.get("date")), reverse=True)

        if not items:
            active_workers = []
            for row in workers[:120]:
                status = lower(first(row, ["status", "worker_status", "state"], "active"))
                role = lower(first(row, ["role", "user_role", "worker_role", "type"], ""))
                if "inactive" in status or "archived" in status or role in {"owner", "employer", "admin"}:
                    continue
                active_workers.append({
                    "id": record_id(row),
                    "worker_name": worker_name(row),
                    "hours": 0,
                    "hourly_rate": round(hourly_rate(row), 2),
                    "gross_pay": 0,
                    "status": "Setup check",
                    "note": "No live time entries found for this worker.",
                    "review_required": hourly_rate(row) <= 0,
                    "read_only": True,
                    "owner_approval_required": True,
                    "no_tax_filing": True,
                    "no_bank_file": True,
                    "no_payment": True,
                })
            items = active_workers

        total_hours = round(sum(number(item.get("hours")) for item in items), 2)
        gross_total = round(sum(number(item.get("gross_pay")) for item in items), 2)
        review_count = sum(1 for item in items if item.get("review_required"))
        return {
            "success": True,
            "source": "paid-launch-payroll-readiness",
            "business_id": business_id,
            "payroll": safe(items[:250]),
            "items": safe(items[:250]),
            "summary": {
                "total_hours": total_hours,
                "gross_total": gross_total,
                "review_count": review_count,
                "entry_count": len(items),
                "worker_count": len({clean(item.get("worker_id") or item.get("worker_name")) for item in items if clean(item.get("worker_id") or item.get("worker_name"))}),
            },
            "scan_complete": not errors,
            "scan_errors": errors,
            "read_only": True,
            "owner_approval_required": True,
            "no_tax_filing": True,
            "no_government_submission": True,
            "no_bank_file": True,
            "no_payment": True,
            "message": "Payroll hours and gross pay are ready for owner review. Nothing was paid, filed or submitted." if not errors else "Payroll loaded with partial data. Some payroll sources could not be read; review the scan warning before relying on totals.",
            "updated_at": now(),
        }

    @router.get("/payroll")
    async def payroll_read(request: Request):
        return safe(await payroll_payload(request))

    @router.get("/payroll/summary")
    async def payroll_summary(request: Request):
        payload = await payroll_payload(request)
        return safe({**payload, "periods": payload.get("items", [])})

    return router
