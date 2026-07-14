from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
import re
from typing import Any, Iterable

from fastapi import APIRouter, HTTPException, Request

try:
    from churvox_feature_tier_paid_launch_guard import effective_plan, plan_meets
except Exception:
    from backend.churvox_feature_tier_paid_launch_guard import effective_plan, plan_meets


OWNER_INTELLIGENCE_BUILD = "churvox-owner-intelligence-v1-20260714"
SAFE_RESULT = "Prepared for owner review. Nothing was sent, synced, charged, filed, paid or changed automatically."
PLAN_FEATURES = {
    "money_left_behind": {"label": "Money Left Behind", "minimum_plan": "start"},
    "job_truth_receipt": {"label": "Job Truth Receipt", "minimum_plan": "start"},
    "promise_memory": {"label": "Promise Memory", "minimum_plan": "start"},
    "voice_to_business": {"label": "Voice-to-Business", "minimum_plan": "start"},
    "worker_proof_coach": {"label": "Worker Proof Coach", "minimum_plan": "crew"},
    "explain_my_week": {"label": "Explain My Week", "minimum_plan": "operator"},
    "approval_budget": {"label": "Approval Budget", "minimum_plan": "operator"},
    "what_if": {"label": "What Happens If?", "minimum_plan": "command"},
}
OWNER_ROLES = {"owner", "business_owner", "employer", "admin", "manager", "office_admin", "superadmin", "super_admin"}
WORKER_ROLES = {"worker", "employee", "staff", "contractor", "subcontractor", "field_worker"}
JOB_COLLECTIONS = ("jobs", "job_records", "appointments", "bookings")
INVOICE_COLLECTIONS = ("invoices", "invoice_records")
QUOTE_COLLECTIONS = ("quotes", "quote_records", "estimates")
TIME_COLLECTIONS = ("time_entries", "timers", "worker_time_entries", "timesheets")
CLIENT_COLLECTIONS = ("clients", "customers", "client_records")
CLOSEOUT_COLLECTIONS = ("job_closeouts",)
COMMAND_COLLECTIONS = ("command_slips", "command_decisions")
BUSINESS_COLLECTIONS = ("businesses", "business_profiles", "users")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _text(value: Any, fallback: str = "", limit: int = 2000) -> str:
    text = " ".join(str(value or "").strip().split())
    return (text[:limit] or fallback)


def _number(value: Any) -> float:
    try:
        if isinstance(value, bool):
            return 0.0
        return round(float(re.sub(r"[^0-9.\-]", "", str(value or "0")) or "0"), 2)
    except Exception:
        return 0.0


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return _text(value).lower() in {"1", "true", "yes", "active", "enabled", "on", "included", "required"}


def _first(row: dict[str, Any] | None, keys: Iterable[str], fallback: Any = None) -> Any:
    row = row or {}
    for key in keys:
        value = row.get(key)
        if value not in (None, "", [], {}):
            return value
    return fallback


def _serial(value: Any, ObjectId=None) -> Any:
    if isinstance(value, list):
        return [_serial(item, ObjectId) for item in value]
    if isinstance(value, tuple):
        return [_serial(item, ObjectId) for item in value]
    if isinstance(value, dict):
        return {key: _serial(item, ObjectId) for key, item in value.items()}
    if isinstance(value, datetime):
        return value.isoformat()
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    return value


def _record_id(row: dict[str, Any] | None) -> str:
    return _text(_first(row, ("_id", "id", "job_id", "record_id", "invoice_id", "quote_id"), ""), "")


def _status(row: dict[str, Any] | None) -> str:
    return _text(_first(row, ("status", "state", "stage", "job_status", "invoice_status", "quote_status"), ""), "").lower().replace(" ", "_")


def _title(row: dict[str, Any] | None, fallback: str = "Untitled record") -> str:
    return _text(_first(row, ("title", "job_title", "job_name", "name", "service", "description", "client_name", "customer_name"), fallback), fallback)


def _client_id(row: dict[str, Any] | None) -> str:
    return _text(_first(row, ("client_id", "customer_id", "clientId", "customerId"), ""), "")


def _date(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    raw = _text(value, "")
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _row_date(row: dict[str, Any] | None) -> datetime | None:
    return _date(_first(row, ("updated_at", "completed_at", "finished_at", "sent_at", "created_at", "date", "scheduled_date"), None))


def _hash_id(*parts: Any) -> str:
    payload = "|".join(_text(part, "") for part in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:20]


def _is_completed(row: dict[str, Any] | None) -> bool:
    state = _status(row)
    return any(word in state for word in ("complete", "completed", "done", "finished", "closed"))


def _is_open_invoice(row: dict[str, Any] | None) -> bool:
    state = _status(row)
    return state not in {"paid", "void", "cancelled", "canceled", "written_off", "refunded"}


def _is_overdue(row: dict[str, Any] | None) -> bool:
    if "overdue" in _status(row):
        return True
    due = _date(_first(row, ("due_date", "payment_due", "due_at"), None))
    return bool(due and due < _now() and _is_open_invoice(row))


def _business_id(user: dict[str, Any]) -> str:
    value = _text(user.get("business_id") or user.get("businessId") or user.get("owner_id") or user.get("id"), "")
    if not value:
        raise HTTPException(status_code=400, detail="Business id is missing")
    return value


def _role(user: dict[str, Any]) -> str:
    return _text(user.get("role") or user.get("user_role") or user.get("account_type"), "").lower().replace("-", "_").replace(" ", "_")


def _maybe_oid(value: Any, ObjectId):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _business_scope(user: dict[str, Any], ObjectId) -> dict[str, Any]:
    business_id = _business_id(user)
    choices: list[dict[str, Any]] = [
        {"business_id": business_id},
        {"businessId": business_id},
        {"owner_id": business_id},
        {"ownerId": business_id},
        {"contractor_id": business_id},
    ]
    oid = _maybe_oid(business_id, ObjectId)
    if oid is not None:
        choices.extend(({"business_id": oid}, {"owner_id": oid}, {"contractor_id": oid}))
    return {"$or": choices}


def feature_catalog(user: dict[str, Any]) -> list[dict[str, Any]]:
    plan = effective_plan(user)
    result = []
    for key, item in PLAN_FEATURES.items():
        minimum = item["minimum_plan"]
        result.append({
            "key": key,
            "label": item["label"],
            "minimum_plan": minimum,
            "available": plan_meets(plan, minimum),
            "current_plan": plan,
        })
    return result


def require_feature(user: dict[str, Any], key: str) -> str:
    item = PLAN_FEATURES[key]
    plan = effective_plan(user)
    minimum = item["minimum_plan"]
    if not plan_meets(plan, minimum):
        raise HTTPException(
            status_code=403,
            detail=f"{item['label']} requires the {minimum.title()} plan or higher.",
        )
    return plan


def proof_checklist_for(job: dict[str, Any] | None, industry: str = "") -> list[dict[str, Any]]:
    job = job or {}
    text = " ".join([
        industry,
        _title(job, ""),
        _text(_first(job, ("service_type", "job_type", "category", "trade"), ""), ""),
        _text(_first(job, ("notes", "description", "instructions"), ""), ""),
    ]).lower()

    base = [
        {"id": "finished_area", "label": "Show the finished work clearly", "required": True, "proof": "photo"},
        {"id": "worker_note", "label": "Add a short note explaining what was completed", "required": True, "proof": "note"},
    ]
    if any(word in text for word in ("lawn", "mow", "garden", "hedge", "landscap")):
        return base + [
            {"id": "edges_tidy", "label": "Show edges and tidy-up", "required": True, "proof": "photo"},
            {"id": "waste_removed", "label": "Confirm green waste was removed or left as agreed", "required": True, "proof": "confirmation"},
            {"id": "gate_secure", "label": "Confirm gates and access were left secure", "required": True, "proof": "confirmation"},
        ]
    if any(word in text for word in ("clean", "housekeeping", "commercial clean")):
        return base + [
            {"id": "key_areas", "label": "Show the key cleaned areas", "required": True, "proof": "photo"},
            {"id": "access_returned", "label": "Confirm keys, alarm or access were handled correctly", "required": True, "proof": "confirmation"},
            {"id": "damage_check", "label": "Record any damage or pre-existing issue", "required": False, "proof": "note"},
        ]
    if any(word in text for word in ("paint", "plaster", "decorat")):
        return base + [
            {"id": "finish_closeup", "label": "Show a close-up of the finish", "required": True, "proof": "photo"},
            {"id": "colour_confirmed", "label": "Confirm the agreed colour or finish", "required": True, "proof": "confirmation"},
            {"id": "site_protected", "label": "Show floors and nearby surfaces left clean", "required": True, "proof": "photo"},
        ]
    if any(word in text for word in ("plumb", "leak", "drain", "tap", "toilet")):
        return base + [
            {"id": "fitting_complete", "label": "Show the completed fitting or repair", "required": True, "proof": "photo"},
            {"id": "leak_test", "label": "Confirm the leak or pressure check passed", "required": True, "proof": "confirmation"},
            {"id": "water_restored", "label": "Confirm water and access were restored safely", "required": True, "proof": "confirmation"},
        ]
    if any(word in text for word in ("electric", "switch", "light", "power", "cable")):
        return base + [
            {"id": "installation_complete", "label": "Show the completed installation", "required": True, "proof": "photo"},
            {"id": "test_complete", "label": "Confirm the required test was completed", "required": True, "proof": "confirmation"},
            {"id": "site_safe", "label": "Confirm covers, access and work area were left safe", "required": True, "proof": "confirmation"},
        ]
    if any(word in text for word in ("hair", "barber", "beauty", "nail")):
        return base + [
            {"id": "service_confirmed", "label": "Confirm the agreed service was completed", "required": True, "proof": "confirmation"},
            {"id": "next_visit", "label": "Record any rebooking or aftercare promise", "required": False, "proof": "note"},
        ]
    return base + [
        {"id": "site_tidy", "label": "Show the work area left tidy and safe", "required": True, "proof": "photo"},
        {"id": "extras_recorded", "label": "Record any extra work, materials or customer request", "required": True, "proof": "confirmation"},
    ]


def evaluate_proof(checklist: list[dict[str, Any]], photo_names: list[str] | None, note: str, confirmations: list[str] | None) -> dict[str, Any]:
    photos = [name for name in (photo_names or []) if _text(name, "")]
    confirmed = {_text(item, "").lower() for item in (confirmations or []) if _text(item, "")}
    note_ready = bool(_text(note, ""))
    completed: list[str] = []
    missing: list[dict[str, Any]] = []
    for item in checklist:
        proof_type = item.get("proof")
        item_id = _text(item.get("id"), "")
        ready = (
            (proof_type == "photo" and bool(photos))
            or (proof_type == "note" and note_ready)
            or (proof_type == "confirmation" and item_id.lower() in confirmed)
        )
        if ready:
            completed.append(item_id)
        elif item.get("required"):
            missing.append(item)
    return {
        "ready": not missing,
        "photo_count": len(photos),
        "note_ready": note_ready,
        "completed_ids": completed,
        "missing": missing,
        "missing_count": len(missing),
    }


def parse_voice_to_business(text: str) -> dict[str, Any]:
    raw = _text(text, "", 4000)
    lower = raw.lower()
    intent = "job_draft"
    if any(word in lower for word in ("quote", "estimate", "price up")):
        intent = "quote_draft"
    elif any(word in lower for word in ("invoice", "bill")):
        intent = "invoice_review"
    elif any(word in lower for word in ("remind", "follow up", "call back", "text")):
        intent = "follow_up_draft"
    elif any(word in lower for word in ("promise", "remember", "never", "always")):
        intent = "promise_memory_draft"

    amount_match = re.search(r"(?:\$|nzd\s*|aud\s*|£|usd\s*)\s*(\d+(?:\.\d{1,2})?)", raw, re.I)
    hours_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)", lower)
    date_hint = ""
    for phrase in ("today", "tomorrow", "next monday", "next tuesday", "next wednesday", "next thursday", "next friday", "next saturday", "next sunday"):
        if phrase in lower:
            date_hint = phrase
            break
    client = ""
    client_match = re.search(r"(?:for|at|client)\s+([A-Z][A-Za-z0-9&' -]{2,50})", raw)
    if client_match:
        client = client_match.group(1).strip(" ,.")
    service = raw
    service = re.sub(r"\b(book|create|prepare|make|send|please|can you|could you)\b", "", service, flags=re.I)
    service = _text(service, "Prepared work", 240)
    return {
        "intent": intent,
        "source_text": raw,
        "client_hint": client,
        "service": service,
        "date_hint": date_hint,
        "estimated_hours": _number(hours_match.group(1)) if hours_match else 0.0,
        "amount": _number(amount_match.group(1)) if amount_match else 0.0,
        "owner_review_required": True,
        "no_auto_send": True,
        "no_auto_sync": True,
        "no_auto_charge": True,
        "no_auto_change": True,
    }


def simulate_scenario(kind: str, payload: dict[str, Any], baseline: dict[str, Any]) -> dict[str, Any]:
    scenario = _text(kind, "price_change").lower().replace("-", "_").replace(" ", "_")
    revenue = _number(baseline.get("revenue"))
    worker_cost = _number(baseline.get("worker_cost"))
    job_count = int(_number(baseline.get("job_count")))
    average_job = revenue / job_count if job_count else 0.0

    if scenario == "price_change":
        pct = _number(payload.get("percent"))
        projected = revenue * (1 + pct / 100)
        return {
            "scenario": scenario,
            "baseline": baseline,
            "projected": {**baseline, "revenue": round(projected, 2), "gross_after_worker_cost": round(projected - worker_cost, 2)},
            "impact": {"revenue_delta": round(projected - revenue, 2), "percent": pct},
            "assumptions": ["The same number and mix of jobs is completed.", "Customer demand is unchanged."],
        }
    if scenario == "wage_change":
        pct = _number(payload.get("percent"))
        projected_cost = worker_cost * (1 + pct / 100)
        return {
            "scenario": scenario,
            "baseline": baseline,
            "projected": {**baseline, "worker_cost": round(projected_cost, 2), "gross_after_worker_cost": round(revenue - projected_cost, 2)},
            "impact": {"worker_cost_delta": round(projected_cost - worker_cost, 2), "percent": pct},
            "assumptions": ["Recorded worker cost is representative.", "Scheduled hours remain unchanged."],
        }
    if scenario == "add_worker":
        weekly_hours = max(0.0, _number(payload.get("weekly_hours") or 40))
        average_hours = max(0.5, _number(baseline.get("average_job_hours") or 2))
        extra_jobs = math.floor(weekly_hours / average_hours)
        return {
            "scenario": scenario,
            "baseline": baseline,
            "projected": {**baseline, "capacity_jobs": job_count + extra_jobs, "revenue_capacity": round(revenue + extra_jobs * average_job, 2)},
            "impact": {"extra_jobs_capacity": extra_jobs, "weekly_hours": weekly_hours},
            "assumptions": ["There is enough demand to fill the extra capacity.", "Job duration and price mix remain similar."],
        }
    if scenario in {"day_off", "move_day"}:
        affected = int(_number(payload.get("affected_jobs") or baseline.get("next_week_jobs") or 0))
        target_days = max(1, int(_number(payload.get("target_days") or 4)))
        return {
            "scenario": scenario,
            "baseline": baseline,
            "projected": {**baseline, "reschedule_jobs": affected, "extra_jobs_per_remaining_day": round(affected / target_days, 1)},
            "impact": {"affected_jobs": affected, "target_days": target_days},
            "assumptions": ["Jobs can be moved without customer or worker conflicts.", "Travel time may change after rescheduling."],
        }
    raise ValueError("Unsupported scenario type")


def build_owner_intelligence_router(db, get_current_user, ObjectId):
    router = APIRouter()

    async def current_user(request: Request) -> dict[str, Any]:
        user = await get_current_user(request)
        if not isinstance(user, dict):
            raise HTTPException(status_code=401, detail="Authentication required")
        return user

    async def require_owner(request: Request, feature: str | None = None) -> dict[str, Any]:
        user = await current_user(request)
        if _role(user) not in OWNER_ROLES and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only an owner/admin can use Churvox Intelligence")
        if feature:
            require_feature(user, feature)
        return user

    async def require_worker_or_owner(request: Request) -> dict[str, Any]:
        user = await current_user(request)
        if _role(user) not in OWNER_ROLES | WORKER_ROLES and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Worker or owner access required")
        return user

    async def scoped_rows(user: dict[str, Any], collections: Iterable[str], limit: int = 300) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        query = _business_scope(user, ObjectId)
        for name in collections:
            try:
                cursor = db[name].find(query)
                try:
                    cursor = cursor.sort("updated_at", -1)
                except Exception:
                    cursor = cursor.sort("_id", -1)
                items = await cursor.limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": name} for item in items])
            except Exception:
                continue
        return rows

    async def find_job(user: dict[str, Any], job_id: str) -> dict[str, Any] | None:
        values: list[Any] = [job_id]
        maybe = _maybe_oid(job_id, ObjectId)
        if maybe is not None:
            values.append(maybe)
        for collection in JOB_COLLECTIONS:
            for value in values:
                try:
                    row = await db[collection].find_one({"$and": [_business_scope(user, ObjectId), {"$or": [{"_id": value}, {"id": value}, {"job_id": value}]}]})
                    if row:
                        return {**dict(row), "_collection": collection}
                except Exception:
                    continue
        return None

    async def linked_by_job(user: dict[str, Any], collections: Iterable[str], job_id: str, limit: int = 40) -> list[dict[str, Any]]:
        values: list[Any] = [job_id]
        maybe = _maybe_oid(job_id, ObjectId)
        if maybe is not None:
            values.append(maybe)
        conditions = []
        for value in values:
            conditions.extend(({"job_id": value}, {"jobId": value}, {"source_job_id": value}, {"linked_job_id": value}))
        query = {"$and": [_business_scope(user, ObjectId), {"$or": conditions}]}
        rows: list[dict[str, Any]] = []
        for collection in collections:
            try:
                items = await db[collection].find(query).sort("updated_at", -1).limit(limit).to_list(limit)
                rows.extend([{**dict(item), "_collection": collection} for item in items])
            except Exception:
                continue
        return rows

    async def business_industry(user: dict[str, Any]) -> str:
        direct = _text(_first(user, ("industry", "trade_industry_type", "business_type"), ""), "")
        if direct:
            return direct
        business_id = _business_id(user)
        values: list[Any] = [business_id]
        maybe = _maybe_oid(business_id, ObjectId)
        if maybe is not None:
            values.append(maybe)
        for collection in BUSINESS_COLLECTIONS:
            for value in values:
                try:
                    row = await db[collection].find_one({"$or": [{"_id": value}, {"id": value}, {"business_id": value}]})
                    if row:
                        found = _text(_first(row, ("industry", "trade_industry_type", "business_type", "category"), ""), "")
                        if found:
                            return found
                except Exception:
                    continue
        return ""

    async def money_findings(user: dict[str, Any]) -> dict[str, Any]:
        jobs, invoices, quotes, time_entries = await _gather(user)
        invoice_by_job: dict[str, list[dict[str, Any]]] = {}
        for invoice in invoices:
            jid = _text(_first(invoice, ("job_id", "jobId", "source_job_id", "linked_job_id"), ""), "")
            if jid:
                invoice_by_job.setdefault(jid, []).append(invoice)
        time_by_job: dict[str, list[dict[str, Any]]] = {}
        for entry in time_entries:
            jid = _text(_first(entry, ("job_id", "jobId", "source_job_id", "linked_job_id"), ""), "")
            if jid:
                time_by_job.setdefault(jid, []).append(entry)

        findings: list[dict[str, Any]] = []
        for job in jobs:
            job_id = _record_id(job)
            if not job_id:
                continue
            linked_invoices = invoice_by_job.get(job_id, [])
            amount = _number(_first(job, ("total", "price", "amount", "quoted_total", "job_total"), 0))
            extras = _number(_first(job, ("extras_total", "extra_amount", "materials_total", "additional_amount"), 0))
            recurring = _bool(_first(job, ("recurring", "is_recurring", "repeat"), False)) or bool(_first(job, ("frequency", "recurrence", "repeat_every"), None))
            next_date = _text(_first(job, ("next_date", "next_run_at", "next_job_date", "next_service_date"), ""), "")
            if _is_completed(job) and not linked_invoices:
                findings.append(_finding("completed_not_invoiced", job, amount, "Completed work has no linked invoice.", "Prepare invoice review"))
            if extras > 0 and (not linked_invoices or max((_number(_first(inv, ("extras_amount", "extras_total"), 0)) for inv in linked_invoices), default=0) < extras):
                findings.append(_finding("extras_not_invoiced", job, extras, "Recorded extras are not fully reflected in the linked invoice.", "Review extras"))
            if recurring and not next_date:
                findings.append(_finding("recurring_gap", job, amount, "Recurring work has no next job date.", "Prepare next visit"))
            linked_time = time_by_job.get(job_id, [])
            if _is_completed(job) and any(_first(entry, ("started_at", "start", "clock_in"), None) and not _first(entry, ("ended_at", "end", "clock_out"), None) for entry in linked_time):
                findings.append(_finding("open_timer", job, 0, "A linked timer is still open after completion.", "Review worker time"))

        for invoice in invoices:
            if not _is_open_invoice(invoice):
                continue
            amount = _number(_first(invoice, ("amount_due", "balance", "total", "amount"), 0))
            if _is_overdue(invoice):
                findings.append(_finding("overdue_invoice", invoice, amount, "An invoice is overdue and still unpaid.", "Prepare payment follow-up"))
            elif not _first(invoice, ("sent_at", "issued_at"), None) and _status(invoice) in {"draft", "ready", "approved", ""}:
                findings.append(_finding("invoice_not_sent", invoice, amount, "An invoice is prepared but has not been sent.", "Review invoice"))

        cutoff = _now() - timedelta(days=3)
        for quote in quotes:
            state = _status(quote)
            last = _row_date(quote)
            if state in {"sent", "viewed", "open", "pending"} and last and last < cutoff:
                amount = _number(_first(quote, ("total", "amount", "quoted_total"), 0))
                findings.append(_finding("quote_follow_up", quote, amount, "A sent quote has had no recorded follow-up.", "Prepare quote follow-up"))

        findings.sort(key=lambda item: (item["priority_rank"], item["amount"]), reverse=True)
        potential_total = round(sum(max(0.0, _number(item.get("amount"))) for item in findings if item["kind"] not in {"overdue_invoice"}), 2)
        overdue_total = round(sum(max(0.0, _number(item.get("amount"))) for item in findings if item["kind"] == "overdue_invoice"), 2)
        return {
            "source": "structured-records",
            "potential_total": potential_total,
            "overdue_total": overdue_total,
            "finding_count": len(findings),
            "findings": findings[:80],
            "safety": SAFE_RESULT,
        }

    def _finding(kind: str, row: dict[str, Any], amount: float, reason: str, action: str) -> dict[str, Any]:
        priority = 90 if kind in {"completed_not_invoiced", "extras_not_invoiced"} else 75 if kind in {"overdue_invoice", "open_timer"} else 55
        return {
            "id": _hash_id(kind, _record_id(row), _title(row)),
            "kind": kind,
            "record_id": _record_id(row),
            "record_collection": row.get("_collection"),
            "title": _title(row),
            "client_id": _client_id(row),
            "amount": round(amount, 2),
            "reason": reason,
            "recommended_action": action,
            "priority_rank": priority,
            "owner_review_required": True,
        }

    async def _gather(user: dict[str, Any]):
        return (
            await scoped_rows(user, JOB_COLLECTIONS, 500),
            await scoped_rows(user, INVOICE_COLLECTIONS, 500),
            await scoped_rows(user, QUOTE_COLLECTIONS, 300),
            await scoped_rows(user, TIME_COLLECTIONS, 500),
        )

    async def truth_receipts(user: dict[str, Any], limit: int = 60) -> list[dict[str, Any]]:
        jobs = [job for job in await scoped_rows(user, JOB_COLLECTIONS, 300) if _is_completed(job)]
        receipts: list[dict[str, Any]] = []
        business_id = _business_id(user)
        for job in jobs[:limit]:
            job_id = _record_id(job)
            if not job_id:
                continue
            invoices = await linked_by_job(user, INVOICE_COLLECTIONS, job_id)
            times = await linked_by_job(user, TIME_COLLECTIONS, job_id)
            closeouts = await linked_by_job(user, CLOSEOUT_COLLECTIONS, job_id)
            proof = _first(job, ("photos", "proof_photos", "completion_photos", "images", "attachments", "proof"), [])
            proof_count = len(proof) if isinstance(proof, list) else int(bool(proof))
            hours = sum(_number(_first(item, ("hours", "duration_hours", "total_hours", "duration"), 0)) for item in times)
            promises = await promise_rows(user, client_id=_client_id(job), limit=20)
            invoice = invoices[0] if invoices else {}
            closeout = closeouts[0] if closeouts else {}
            receipt = {
                "business_id": business_id,
                "job_id": job_id,
                "job_collection": job.get("_collection"),
                "job_title": _title(job, "Completed job"),
                "client_id": _client_id(job),
                "completed_at": _serial(_first(job, ("completed_at", "finished_at", "updated_at"), None), ObjectId),
                "promised": [_text(item.get("text"), "") for item in promises if item.get("active", True)][:12],
                "proof": {"count": proof_count, "ready": proof_count > 0},
                "worker_time": {"hours": round(hours, 2), "entry_ids": [_record_id(item) for item in times if _record_id(item)]},
                "extras": {
                    "amount": _number(_first(job, ("extras_total", "extra_amount", "materials_total", "additional_amount"), 0)),
                    "items": _serial(_first(job, ("extras", "extra_items", "materials", "variations"), []), ObjectId),
                },
                "invoice": {
                    "invoice_id": _record_id(invoice),
                    "status": _status(invoice) or "missing",
                    "amount": _number(_first(invoice, ("total", "amount", "balance", "amount_due"), 0)),
                },
                "closeout": {
                    "closeout_id": _record_id(closeout),
                    "status": _status(closeout) or "not_started",
                    "owner_decisions": _serial(closeout.get("owner_decisions") or [], ObjectId),
                },
                "source_revision": _hash_id(job_id, _serial(job, ObjectId), _serial(invoice, ObjectId), _serial(closeout, ObjectId)),
                "updated_at": _now(),
                "safety": SAFE_RESULT,
            }
            query = {"business_id": business_id, "job_id": job_id}
            try:
                await db.job_truth_receipts.update_one(
                    query,
                    {"$set": receipt, "$setOnInsert": {"created_at": _now()}},
                    upsert=True,
                )
                stored = await db.job_truth_receipts.find_one(query)
                receipt["id"] = str((stored or {}).get("_id") or "")
            except Exception:
                receipt["id"] = _hash_id(business_id, job_id, "truth-receipt")
            receipts.append(_serial(receipt, ObjectId))
        return receipts

    async def promise_rows(user: dict[str, Any], client_id: str = "", limit: int = 100) -> list[dict[str, Any]]:
        query: dict[str, Any] = _business_scope(user, ObjectId)
        if client_id:
            query = {"$and": [query, {"client_id": client_id}]}
        try:
            items = await db.client_promises.find(query).sort("updated_at", -1).limit(limit).to_list(limit)
            return [_doc(item) for item in items]
        except Exception:
            return []

    def _doc(row: dict[str, Any] | None):
        if not row:
            return None
        out = dict(row)
        if "_id" in out:
            out["id"] = str(out.pop("_id"))
        return _serial(out, ObjectId)

    async def baseline_metrics(user: dict[str, Any]) -> dict[str, Any]:
        jobs, invoices, _, times = await _gather(user)
        cutoff = _now() - timedelta(days=30)
        recent_jobs = [row for row in jobs if (_row_date(row) or datetime.min.replace(tzinfo=timezone.utc)) >= cutoff]
        recent_invoices = [row for row in invoices if (_row_date(row) or datetime.min.replace(tzinfo=timezone.utc)) >= cutoff]
        revenue = sum(_number(_first(row, ("total", "amount", "paid_amount", "balance"), 0)) for row in recent_invoices if _status(row) in {"paid", "sent", "viewed", "overdue", "open", ""})
        worker_cost = sum(_number(_first(row, ("worker_cost", "labour_cost", "gross_pay", "amount"), 0)) for row in times)
        total_hours = sum(_number(_first(row, ("hours", "duration_hours", "total_hours"), 0)) for row in times)
        next_week = _now() + timedelta(days=7)
        next_week_jobs = sum(1 for row in jobs if (date := _date(_first(row, ("scheduled_date", "date", "start_date"), None))) and _now() <= date <= next_week)
        return {
            "window_days": 30,
            "revenue": round(revenue, 2),
            "worker_cost": round(worker_cost, 2),
            "gross_after_worker_cost": round(revenue - worker_cost, 2),
            "job_count": len(recent_jobs),
            "average_job_hours": round(total_hours / len(recent_jobs), 2) if recent_jobs else 0.0,
            "next_week_jobs": next_week_jobs,
        }

    @router.get("/owner-intelligence/marker")
    async def marker():
        return {
            "success": True,
            "build": OWNER_INTELLIGENCE_BUILD,
            "features": list(PLAN_FEATURES),
            "owner_approval_required": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_file_tax": True,
            "no_auto_pay": True,
        }

    @router.get("/owner-intelligence/features")
    async def features(request: Request):
        user = await require_owner(request)
        return {"success": True, "plan": effective_plan(user), "features": feature_catalog(user), "build": OWNER_INTELLIGENCE_BUILD}

    @router.get("/owner-intelligence/summary")
    async def summary(request: Request):
        user = await require_owner(request)
        plan = effective_plan(user)
        money = await money_findings(user)
        receipts = await truth_receipts(user, 20)
        promises = await promise_rows(user, limit=30)
        payload: dict[str, Any] = {
            "success": True,
            "plan": plan,
            "features": feature_catalog(user),
            "money_left_behind": money,
            "job_truth_receipts": receipts,
            "promise_memory": {"items": promises},
            "safety": SAFE_RESULT,
        }
        if plan_meets(plan, "crew"):
            payload["worker_proof_coach"] = await owner_proof_queue(user)
        if plan_meets(plan, "operator"):
            payload["explain_my_week"] = await explain_week_payload(user)
            payload["approval_budget"] = await approval_budget_payload(user)
        if plan_meets(plan, "command"):
            payload["what_if"] = {"baseline": await baseline_metrics(user), "ready": True}
        return payload

    @router.get("/owner-intelligence/money-left-behind")
    async def money_left_behind(request: Request):
        user = await require_owner(request, "money_left_behind")
        return {"success": True, **(await money_findings(user))}

    @router.post("/owner-intelligence/money-left-behind/{finding_id}/prepare")
    async def prepare_money_fix(finding_id: str, request: Request):
        user = await require_owner(request, "money_left_behind")
        payload = await request.json()
        snapshot = await money_findings(user)
        finding = next((item for item in snapshot["findings"] if item["id"] == finding_id), None)
        if not finding:
            raise HTTPException(status_code=404, detail="Money finding was not found")
        business_id = _business_id(user)
        query = {"business_id": business_id, "feature": "money_left_behind", "source_id": finding_id}
        draft = {
            **query,
            "title": finding["title"],
            "finding": finding,
            "owner_note": _text(payload.get("owner_note"), "", 1200),
            "status": "prepared",
            "owner_review_required": True,
            "safety": SAFE_RESULT,
            "updated_at": _now(),
        }
        await db.owner_intelligence_drafts.update_one(query, {"$set": draft, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        stored = await db.owner_intelligence_drafts.find_one(query)
        return {"success": True, "draft": _doc(stored), "existing": bool(stored and stored.get("created_at") != stored.get("updated_at")), "safety": SAFE_RESULT}

    @router.get("/owner-intelligence/job-truth-receipts")
    async def job_truth_receipts(request: Request, limit: int = 60):
        user = await require_owner(request, "job_truth_receipt")
        receipts = await truth_receipts(user, min(max(limit, 1), 120))
        return {"success": True, "receipts": receipts, "count": len(receipts), "safety": SAFE_RESULT}

    @router.get("/owner-intelligence/job-truth-receipts/{job_id}")
    async def job_truth_receipt(job_id: str, request: Request):
        user = await require_owner(request, "job_truth_receipt")
        await truth_receipts(user, 120)
        row = await db.job_truth_receipts.find_one({"business_id": _business_id(user), "job_id": job_id})
        if not row:
            raise HTTPException(status_code=404, detail="Job Truth Receipt was not found")
        return {"success": True, "receipt": _doc(row), "safety": SAFE_RESULT}

    @router.get("/owner-intelligence/promise-memory")
    async def promise_memory(request: Request, client_id: str = "", limit: int = 100):
        user = await require_owner(request, "promise_memory")
        items = await promise_rows(user, client_id, min(max(limit, 1), 200))
        return {"success": True, "items": items, "count": len(items), "safety": SAFE_RESULT}

    @router.post("/owner-intelligence/promise-memory")
    async def save_promise_memory(request: Request):
        user = await require_owner(request, "promise_memory")
        payload = await request.json()
        text = _text(payload.get("text"), "", 1200)
        if len(text) < 3:
            raise HTTPException(status_code=400, detail="Promise text is required")
        business_id = _business_id(user)
        client_id = _text(payload.get("client_id"), "")
        normalized = hashlib.sha256(f"{business_id}|{client_id}|{text.lower()}".encode("utf-8")).hexdigest()
        query = {"business_id": business_id, "normalized_key": normalized}
        row = {
            **query,
            "client_id": client_id,
            "client_name": _text(payload.get("client_name"), "", 200),
            "text": text,
            "category": _text(payload.get("category"), "service_promise", 80),
            "source": _text(payload.get("source"), "owner", 80),
            "active": payload.get("active") is not False,
            "owner_reviewed": True,
            "updated_at": _now(),
        }
        await db.client_promises.update_one(query, {"$set": row, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        stored = await db.client_promises.find_one(query)
        return {"success": True, "promise": _doc(stored), "safety": SAFE_RESULT}

    @router.post("/owner-intelligence/voice-to-business")
    async def voice_to_business(request: Request):
        user = await require_owner(request, "voice_to_business")
        payload = await request.json()
        draft = parse_voice_to_business(_text(payload.get("text"), "", 4000))
        if not draft["source_text"]:
            raise HTTPException(status_code=400, detail="Say or type what you want Churvox to prepare")
        business_id = _business_id(user)
        source_id = _hash_id(business_id, draft["source_text"], draft["intent"])
        query = {"business_id": business_id, "feature": "voice_to_business", "source_id": source_id}
        record = {
            **query,
            **draft,
            "status": "prepared",
            "owner_review_required": True,
            "updated_at": _now(),
            "safety": SAFE_RESULT,
        }
        await db.owner_intelligence_drafts.update_one(query, {"$set": record, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        stored = await db.owner_intelligence_drafts.find_one(query)
        return {"success": True, "draft": _doc(stored), "safety": SAFE_RESULT}

    async def owner_proof_queue(user: dict[str, Any]) -> dict[str, Any]:
        industry = await business_industry(user)
        jobs = await scoped_rows(user, JOB_COLLECTIONS, 160)
        items = []
        for job in jobs:
            if _status(job) in {"cancelled", "canceled", "archived", "void"}:
                continue
            checklist = proof_checklist_for(job, industry)
            proof = _first(job, ("photos", "proof_photos", "completion_photos", "images", "attachments"), [])
            note = _text(_first(job, ("worker_notes", "completion_note", "notes"), ""), "")
            check = evaluate_proof(checklist, proof if isinstance(proof, list) else ([str(proof)] if proof else []), note, _first(job, ("proof_confirmations", "completion_confirmations"), []))
            items.append({
                "job_id": _record_id(job),
                "job_title": _title(job),
                "client_id": _client_id(job),
                "status": _status(job),
                "checklist": checklist,
                "check": check,
            })
        items.sort(key=lambda item: (item["check"]["ready"], -item["check"]["missing_count"]))
        return {"industry": industry, "items": items[:80], "needs_proof": sum(1 for item in items if not item["check"]["ready"])}

    @router.get("/owner-intelligence/worker-proof-coach")
    async def owner_worker_proof_coach(request: Request):
        user = await require_owner(request, "worker_proof_coach")
        return {"success": True, **(await owner_proof_queue(user)), "safety": SAFE_RESULT}

    async def explain_week_payload(user: dict[str, Any]) -> dict[str, Any]:
        cutoff = _now() - timedelta(days=7)
        jobs, invoices, quotes, times = await _gather(user)
        week_jobs = [row for row in jobs if (_row_date(row) or datetime.min.replace(tzinfo=timezone.utc)) >= cutoff]
        week_invoices = [row for row in invoices if (_row_date(row) or datetime.min.replace(tzinfo=timezone.utc)) >= cutoff]
        completed = [row for row in week_jobs if _is_completed(row)]
        revenue = sum(_number(_first(row, ("total", "amount", "paid_amount"), 0)) for row in week_invoices if _status(row) in {"paid", "sent", "viewed", "overdue", "open", ""})
        missing_proof = [row for row in completed if not _first(row, ("photos", "proof_photos", "completion_photos", "images", "attachments"), None)]
        overrun = []
        for row in week_jobs:
            estimated = _number(_first(row, ("estimated_hours", "quoted_hours", "duration_hours"), 0))
            actual = _number(_first(row, ("actual_hours", "hours", "time_spent"), 0))
            if estimated > 0 and actual > estimated * 1.2:
                overrun.append(row)
        open_quotes = [row for row in quotes if _status(row) in {"sent", "viewed", "open", "pending"}]
        money = await money_findings(user)
        statements = [
            {
                "title": f"{len(completed)} jobs were completed",
                "detail": f"Recorded invoice value for the week is ${revenue:,.2f}.",
                "evidence_ids": [_record_id(row) for row in completed[:20]],
                "level": "good",
            },
            {
                "title": f"${money['potential_total']:,.2f} may still need owner action",
                "detail": f"{money['finding_count']} structured money checks are waiting.",
                "evidence_ids": [row["id"] for row in money["findings"][:20]],
                "level": "attention" if money["finding_count"] else "good",
            },
            {
                "title": f"{len(missing_proof)} completed jobs are missing visible proof",
                "detail": "Worker Proof Coach can show exactly what evidence is still needed.",
                "evidence_ids": [_record_id(row) for row in missing_proof[:20]],
                "level": "attention" if missing_proof else "good",
            },
            {
                "title": f"{len(overrun)} jobs used materially more time than estimated",
                "detail": "Only records with both estimated and actual hours are included.",
                "evidence_ids": [_record_id(row) for row in overrun[:20]],
                "level": "attention" if overrun else "good",
            },
            {
                "title": f"{len(open_quotes)} quotes remain open",
                "detail": "Open, sent, viewed and pending quotes are included.",
                "evidence_ids": [_record_id(row) for row in open_quotes[:20]],
                "level": "watch" if open_quotes else "good",
            },
        ]
        return {
            "window_start": cutoff.isoformat(),
            "window_end": _now().isoformat(),
            "metrics": {
                "completed_jobs": len(completed),
                "invoice_value": round(revenue, 2),
                "money_checks": money["finding_count"],
                "missing_proof": len(missing_proof),
                "time_overruns": len(overrun),
                "open_quotes": len(open_quotes),
                "time_entries": len(times),
            },
            "statements": statements,
            "safety": SAFE_RESULT,
        }

    @router.get("/owner-intelligence/explain-my-week")
    async def explain_my_week(request: Request):
        user = await require_owner(request, "explain_my_week")
        return {"success": True, **(await explain_week_payload(user))}

    async def approval_budget_payload(user: dict[str, Any]) -> dict[str, Any]:
        business_id = _business_id(user)
        defaults = {
            "money_interrupt_amount": 1000,
            "missing_proof": "today",
            "customer_blocked": "now",
            "open_timer": "today",
            "routine_batch": "evening",
            "quiet_hours_start": "18:00",
            "quiet_hours_end": "07:00",
            "owner_approval_required": True,
        }
        try:
            stored = await db.approval_budgets.find_one({"business_id": business_id})
        except Exception:
            stored = None
        settings = {**defaults, **({key: value for key, value in dict(stored or {}).items() if key != "_id"})}
        money = await money_findings(user)
        buckets = {"now": [], "today": [], "batch": []}
        threshold = _number(settings.get("money_interrupt_amount") or 1000)
        for finding in money["findings"]:
            if finding["amount"] >= threshold or finding["kind"] in {"overdue_invoice"}:
                bucket = "now"
            elif finding["kind"] in {"open_timer", "extras_not_invoiced", "completed_not_invoiced"}:
                bucket = "today"
            else:
                bucket = "batch"
            buckets[bucket].append(finding)
        return {"settings": settings, "buckets": buckets, "counts": {key: len(value) for key, value in buckets.items()}, "safety": SAFE_RESULT}

    @router.get("/owner-intelligence/approval-budget")
    async def approval_budget(request: Request):
        user = await require_owner(request, "approval_budget")
        return {"success": True, **(await approval_budget_payload(user))}

    @router.post("/owner-intelligence/approval-budget")
    async def save_approval_budget(request: Request):
        user = await require_owner(request, "approval_budget")
        payload = await request.json()
        business_id = _business_id(user)
        allowed = {
            "money_interrupt_amount": max(0, _number(payload.get("money_interrupt_amount") or 1000)),
            "missing_proof": _text(payload.get("missing_proof"), "today", 20),
            "customer_blocked": _text(payload.get("customer_blocked"), "now", 20),
            "open_timer": _text(payload.get("open_timer"), "today", 20),
            "routine_batch": _text(payload.get("routine_batch"), "evening", 20),
            "quiet_hours_start": _text(payload.get("quiet_hours_start"), "18:00", 10),
            "quiet_hours_end": _text(payload.get("quiet_hours_end"), "07:00", 10),
            "owner_approval_required": True,
            "updated_at": _now(),
        }
        await db.approval_budgets.update_one({"business_id": business_id}, {"$set": {"business_id": business_id, **allowed}, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        return {"success": True, **(await approval_budget_payload(user))}

    @router.post("/owner-intelligence/what-if")
    async def what_if(request: Request):
        user = await require_owner(request, "what_if")
        payload = await request.json()
        baseline = await baseline_metrics(user)
        try:
            result = simulate_scenario(_text(payload.get("scenario"), "price_change"), payload, baseline)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        result.update({
            "success": True,
            "owner_review_required": True,
            "no_records_changed": True,
            "safety": "Simulation only. No jobs, prices, workers, schedules, invoices or records were changed.",
        })
        return result

    @router.get("/worker/proof-coach/{job_id}")
    async def worker_proof_coach(job_id: str, request: Request):
        user = await require_worker_or_owner(request)
        job = await find_job(user, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Assigned job was not found")
        industry = await business_industry(user)
        checklist = proof_checklist_for(job, industry)
        return {
            "success": True,
            "job_id": job_id,
            "job_title": _title(job),
            "industry": industry,
            "checklist": checklist,
            "minimum_plan": "crew",
            "safety": SAFE_RESULT,
        }

    @router.post("/worker/proof-coach/{job_id}/check")
    async def worker_proof_check(job_id: str, request: Request):
        user = await require_worker_or_owner(request)
        job = await find_job(user, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Assigned job was not found")
        payload = await request.json()
        checklist = proof_checklist_for(job, await business_industry(user))
        result = evaluate_proof(
            checklist,
            payload.get("photo_names") if isinstance(payload.get("photo_names"), list) else [],
            _text(payload.get("note"), "", 1600),
            payload.get("confirmations") if isinstance(payload.get("confirmations"), list) else [],
        )
        return {"success": True, "job_id": job_id, "check": result, "safety": SAFE_RESULT}

    return router
