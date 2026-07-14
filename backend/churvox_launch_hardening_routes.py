from __future__ import annotations

from datetime import datetime, timezone
import csv
import hashlib
import io
import json
import secrets
import zipfile
from typing import Any, Iterable

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

try:
    from churvox_feature_tier_paid_launch_guard import effective_plan, plan_meets
except Exception:
    from backend.churvox_feature_tier_paid_launch_guard import effective_plan, plan_meets

try:
    from churvox_owner_intelligence_routes import (
        BUSINESS_COLLECTIONS,
        CLIENT_COLLECTIONS,
        CLOSEOUT_COLLECTIONS,
        INVOICE_COLLECTIONS,
        JOB_COLLECTIONS,
        OWNER_ROLES,
        QUOTE_COLLECTIONS,
        TIME_COLLECTIONS,
        WORKER_ROLES,
        _business_id,
        _business_scope,
        _client_id,
        _date,
        _first,
        _maybe_oid,
        _number,
        _record_id,
        _role,
        _serial,
        _status,
        _text,
        _title,
        evaluate_proof,
        proof_checklist_for,
    )
except Exception:
    from backend.churvox_owner_intelligence_routes import (
        BUSINESS_COLLECTIONS,
        CLIENT_COLLECTIONS,
        CLOSEOUT_COLLECTIONS,
        INVOICE_COLLECTIONS,
        JOB_COLLECTIONS,
        OWNER_ROLES,
        QUOTE_COLLECTIONS,
        TIME_COLLECTIONS,
        WORKER_ROLES,
        _business_id,
        _business_scope,
        _client_id,
        _date,
        _first,
        _maybe_oid,
        _number,
        _record_id,
        _role,
        _serial,
        _status,
        _text,
        _title,
        evaluate_proof,
        proof_checklist_for,
    )


LAUNCH_HARDENING_BUILD = "churvox-go-live-trust-v1-20260714"
SAFE_RESULT = "Owner-controlled. Nothing was sent, charged, paid, filed or synced to an external service automatically."
TRUST_FEATURES = {
    "offline_worker_sync": {"label": "Offline Worker Sync", "minimum_plan": "crew"},
    "onboarding_imports": {"label": "Ten-minute onboarding and imports", "minimum_plan": "start"},
    "golden_journey": {"label": "Golden Journey reliability", "minimum_plan": "start"},
    "permissions_security": {"label": "Permissions and security", "minimum_plan": "start"},
    "customer_portal": {"label": "Customer portal", "minimum_plan": "start"},
    "recovery_undo": {"label": "Recovery and undo", "minimum_plan": "start"},
    "portability_pack": {"label": "Business Portability Pack", "minimum_plan": "start"},
    "evidence_outcomes": {"label": "Evidence Drawer and measured outcomes", "minimum_plan": "start"},
}

ROLE_PRESETS = {
    "owner": {
        "label": "Owner",
        "actions": ["business.read", "business.manage", "jobs.manage", "clients.manage", "quotes.manage", "invoices.manage", "workers.manage", "payroll.review", "exports.download", "permissions.manage", "portal.manage", "recovery.undo", "intelligence.view"],
    },
    "manager": {
        "label": "Manager",
        "actions": ["business.read", "jobs.manage", "clients.manage", "quotes.manage", "invoices.prepare", "workers.manage", "portal.manage", "intelligence.view"],
    },
    "office_admin": {
        "label": "Office administrator",
        "actions": ["business.read", "jobs.manage", "clients.manage", "quotes.manage", "invoices.prepare", "portal.manage"],
    },
    "scheduler": {
        "label": "Scheduler",
        "actions": ["business.read", "jobs.schedule", "clients.read", "workers.read"],
    },
    "bookkeeper": {
        "label": "Bookkeeper",
        "actions": ["business.read", "jobs.read", "clients.read", "quotes.read", "invoices.manage", "exports.download", "payroll.read"],
    },
    "accountant": {
        "label": "Accountant",
        "actions": ["business.read", "invoices.read", "payroll.read", "exports.download"],
    },
    "worker": {
        "label": "Worker",
        "actions": ["assigned_jobs.read", "assigned_jobs.update", "proof.add", "messages.send"],
    },
    "subcontractor": {
        "label": "Subcontractor",
        "actions": ["assigned_jobs.read", "assigned_jobs.update", "proof.add", "messages.send"],
    },
    "read_only": {
        "label": "Read-only adviser",
        "actions": ["business.read", "jobs.read", "clients.read", "quotes.read", "invoices.read", "intelligence.view"],
    },
}

IMPORT_TYPES = {
    "clients": {"collection": "clients", "required": ("name",), "aliases": {"name": ("name", "client", "client_name", "customer", "customer_name", "contact"), "email": ("email", "email_address"), "phone": ("phone", "mobile", "phone_number"), "address": ("address", "service_address", "site_address"), "notes": ("notes", "note", "details")}},
    "workers": {"collection": "workers", "required": ("name",), "aliases": {"name": ("name", "worker", "worker_name", "staff", "employee"), "email": ("email", "email_address"), "phone": ("phone", "mobile", "phone_number"), "role": ("role", "worker_role", "employment_type"), "notes": ("notes", "note")}},
    "jobs": {"collection": "jobs", "required": ("title",), "aliases": {"title": ("title", "job", "job_title", "service", "description"), "client_name": ("client", "client_name", "customer", "customer_name"), "client_id": ("client_id", "customer_id"), "address": ("address", "service_address", "site_address"), "scheduled_date": ("date", "scheduled_date", "start_date"), "price": ("price", "amount", "total"), "notes": ("notes", "instructions")}},
    "recurring_jobs": {"collection": "jobs", "required": ("title", "frequency"), "aliases": {"title": ("title", "job", "job_title", "service", "description"), "client_name": ("client", "client_name", "customer", "customer_name"), "address": ("address", "service_address", "site_address"), "frequency": ("frequency", "repeat", "recurrence", "cycle"), "next_date": ("next_date", "next_service_date", "date"), "price": ("price", "amount", "total"), "notes": ("notes", "instructions")}},
    "quotes": {"collection": "quotes", "required": ("customer_name",), "aliases": {"customer_name": ("customer", "customer_name", "client", "client_name"), "quote_number": ("quote", "quote_number", "number"), "description": ("description", "service", "job"), "total": ("total", "amount", "price"), "status": ("status", "stage"), "email": ("email", "customer_email")}},
    "invoices": {"collection": "invoices", "required": ("customer_name",), "aliases": {"customer_name": ("customer", "customer_name", "client", "client_name"), "invoice_number": ("invoice", "invoice_number", "number"), "description": ("description", "service", "job"), "total": ("total", "amount", "price"), "amount_due": ("amount_due", "balance", "balance_due"), "status": ("status", "payment_status"), "email": ("email", "customer_email")}},
}

PORTABILITY_COLLECTIONS = (
    "businesses", "business_profiles", "clients", "customers", "jobs", "job_records", "appointments", "bookings",
    "quotes", "quote_records", "invoices", "invoice_records", "workers", "team", "time_entries", "timers",
    "worker_time_entries", "timesheets", "client_promises", "job_closeouts", "job_truth_receipts", "command_slips",
    "command_decisions", "owner_intelligence_drafts", "launch_import_batches", "launch_journey_events",
    "launch_permission_policies", "launch_recovery_receipts", "client_portals", "public_client_portals", "job_proof_packs",
    "worker_sync_events", "customer_portal_requests",
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash(*parts: Any, size: int = 24) -> str:
    raw = "|".join(_text(part, "", 10000) for part in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:size]


def _slug(value: Any) -> str:
    return "_".join(_text(value, "", 200).lower().replace("-", " ").split())


def _doc(row: dict[str, Any] | None, ObjectId=None) -> dict[str, Any] | None:
    if not row:
        return None
    output = dict(row)
    if "_id" in output:
        output["id"] = str(output.pop("_id"))
    return _serial(output, ObjectId)


def _parse_csv(text: str) -> list[dict[str, Any]]:
    raw = str(text or "").strip()
    if not raw:
        return []
    sample = raw[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except Exception:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(raw), dialect=dialect)
    return [dict(row) for row in reader if isinstance(row, dict)]


def _normalise_headers(row: dict[str, Any]) -> dict[str, Any]:
    return {_slug(key): value for key, value in (row or {}).items() if _slug(key)}


def normalise_import_row(kind: str, row: dict[str, Any], row_number: int) -> dict[str, Any]:
    spec = IMPORT_TYPES[kind]
    source = _normalise_headers(row)
    clean: dict[str, Any] = {}
    used: dict[str, str] = {}
    for target, aliases in spec["aliases"].items():
        for alias in aliases:
            key = _slug(alias)
            if key in source and _text(source.get(key), ""):
                clean[target] = _text(source.get(key), "", 4000)
                used[target] = key
                break
    if kind in {"jobs", "recurring_jobs", "quotes", "invoices"}:
        for money_key in ("price", "total", "amount_due"):
            if money_key in clean:
                clean[money_key] = _number(clean[money_key])
    if kind == "recurring_jobs":
        clean["recurring"] = True
    errors = [f"{field.replace('_', ' ').title()} is required" for field in spec["required"] if not _text(clean.get(field), "")]
    primary = _text(clean.get("name") or clean.get("title") or clean.get("customer_name"), "")
    identity = _hash(kind, primary.lower(), _text(clean.get("email"), "").lower(), _text(clean.get("address"), "").lower())
    return {
        "row_number": row_number,
        "source": row,
        "mapped": clean,
        "mapping": used,
        "identity": identity,
        "errors": errors,
        "ready": not errors,
    }


def feature_catalog(plan: str) -> list[dict[str, Any]]:
    return [
        {"key": key, "label": item["label"], "minimum_plan": item["minimum_plan"], "available": plan_meets(plan, item["minimum_plan"])}
        for key, item in TRUST_FEATURES.items()
    ]


def default_permissions() -> list[dict[str, Any]]:
    return [{"role": role, **value, "custom": False} for role, value in ROLE_PRESETS.items()]


def action_allowed(role: str, action: str, policy: dict[str, Any] | None = None) -> bool:
    clean_role = _slug(role)
    if clean_role in {"superadmin", "super_admin", "owner", "business_owner", "employer", "admin"}:
        return True
    actions = set((policy or {}).get("actions") or ROLE_PRESETS.get(clean_role, {}).get("actions") or [])
    if action in actions:
        return True
    family = action.split(".", 1)[0] + ".manage"
    return family in actions


def build_journey_steps(counts: dict[str, int], plan: str) -> list[dict[str, Any]]:
    worker_needed = plan_meets(plan, "crew")
    rows = [
        ("business_ready", "Business settings", counts.get("business", 0) > 0, "settings"),
        ("first_client", "First real client", counts.get("clients", 0) > 0, "clients"),
        ("first_job", "First real job", counts.get("jobs", 0) > 0, "work"),
        ("worker_ready", "Worker ready", not worker_needed or counts.get("workers", 0) > 0, "worker"),
        ("job_completed", "Job completed", counts.get("completed_jobs", 0) > 0, "work"),
        ("truth_receipt", "Job Truth Receipt", counts.get("truth_receipts", 0) > 0, "intelligence"),
        ("invoice_prepared", "Invoice prepared", counts.get("invoices", 0) > 0, "invoices"),
        ("returned", "Returned on another day", counts.get("active_days", 0) >= 2, "today"),
    ]
    return [{"key": key, "label": label, "complete": complete, "screen": screen, "required": key != "worker_ready" or worker_needed} for key, label, complete, screen in rows]


def build_evidence_outcomes(findings: list[dict[str, Any]], drafts: list[dict[str, Any]], invoices: list[dict[str, Any]], receipts: list[dict[str, Any]], promises: list[dict[str, Any]]) -> dict[str, Any]:
    found_total = round(sum(max(0.0, _number(item.get("amount"))) for item in findings), 2)
    prepared_findings = [item.get("finding") or {} for item in drafts if item.get("feature") == "money_left_behind"]
    prepared_total = round(sum(max(0.0, _number(item.get("amount"))) for item in prepared_findings), 2)
    finding_record_ids = {str(item.get("record_id") or "") for item in findings if item.get("record_id")}
    prepared_record_ids = {str(item.get("record_id") or "") for item in prepared_findings if item.get("record_id")}
    outcome_record_ids = finding_record_ids | prepared_record_ids
    linked_invoices = []
    for invoice in invoices:
        job_id = _text(_first(invoice, ("job_id", "jobId", "source_job_id", "linked_job_id"), ""), "")
        invoice_id = _record_id(invoice)
        if job_id in outcome_record_ids or invoice_id in outcome_record_ids:
            linked_invoices.append(invoice)
    invoiced_total = round(sum(max(0.0, _number(_first(item, ("total", "amount", "amount_due", "balance"), 0))) for item in linked_invoices), 2)
    paid_total = round(sum(max(0.0, _number(_first(item, ("amount_paid", "paid_amount", "total", "amount"), 0))) for item in linked_invoices if _status(item) == "paid"), 2)
    carried = 0
    for receipt in receipts:
        if receipt.get("promised"):
            carried += 1
    return {
        "money_recovered": {
            "found": found_total,
            "prepared": prepared_total,
            "invoiced": invoiced_total,
            "paid": paid_total,
            "definition": "Found is current structured money checks. Prepared is owner-reviewed Money Left Behind drafts. Invoiced and paid include only invoices linked to those source records.",
        },
        "promise_performance": {
            "active_promises": sum(1 for item in promises if item.get("active", True)),
            "receipts_with_promises": carried,
            "truth_receipts": len(receipts),
            "definition": "A promise is counted as carried when it appears on a persisted Job Truth Receipt.",
        },
        "evidence_rules": [
            "Every number names its source collection and record ids.",
            "Missing values are shown as missing rather than guessed.",
            "No score is treated as proof of money received.",
        ],
    }


def _public_token(value: Any) -> str:
    token = _text(value, "", 300)
    if len(token) < 16 or any(char.isspace() for char in token):
        raise HTTPException(status_code=404, detail="Client portal not found")
    return token


def _offline_photos(value: Any) -> list[dict[str, str]]:
    rows = value if isinstance(value, list) else []
    output: list[dict[str, str]] = []
    for row in rows[:8]:
        if not isinstance(row, dict):
            continue
        name = _text(row.get("name"), "proof-photo", 200)
        media_type = _text(row.get("type"), "image/jpeg", 100)
        data_url = str(row.get("data_url") or "").strip()
        if not data_url.startswith("data:image/") or len(data_url) > 3_000_000:
            continue
        output.append({"name": name, "type": media_type, "data_url": data_url, "customer_visible": False})
    return output


def build_launch_hardening_router(db, get_current_user, ObjectId):
    router = APIRouter()

    async def current_user(request: Request) -> dict[str, Any]:
        user = await get_current_user(request)
        if not isinstance(user, dict):
            raise HTTPException(status_code=401, detail="Authentication required")
        return user

    async def require_owner(request: Request) -> dict[str, Any]:
        user = await current_user(request)
        if _role(user) not in OWNER_ROLES and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Only an owner/admin can use Go-Live & Trust")
        return user

    async def require_worker_or_owner(request: Request) -> dict[str, Any]:
        user = await current_user(request)
        if _role(user) not in OWNER_ROLES | WORKER_ROLES and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Worker or owner access required")
        return user

    async def rows(user: dict[str, Any], collections: Iterable[str], limit: int = 500) -> list[dict[str, Any]]:
        output: list[dict[str, Any]] = []
        scope = _business_scope(user, ObjectId)
        for name in collections:
            try:
                found = await db[name].find(scope).sort("updated_at", -1).limit(limit).to_list(limit)
                output.extend([{**dict(item), "_collection": name} for item in found])
            except Exception:
                continue
        return output

    async def business_plan(user: dict[str, Any]) -> str:
        direct = effective_plan(user)
        if direct and direct != "start":
            return direct
        business_id = _business_id(user)
        candidates: list[Any] = [business_id]
        oid = _maybe_oid(business_id, ObjectId)
        if oid is not None:
            candidates.append(oid)
        for collection in BUSINESS_COLLECTIONS:
            for value in candidates:
                try:
                    found = await db[collection].find_one({"$or": [{"_id": value}, {"id": value}, {"business_id": value}, {"owner_id": value}]})
                    if found:
                        return effective_plan({**dict(found), **user})
                except Exception:
                    continue
        return direct or "start"

    async def count_rows(user: dict[str, Any], collections: Iterable[str]) -> int:
        total = 0
        scope = _business_scope(user, ObjectId)
        for name in collections:
            try:
                total += int(await db[name].count_documents(scope))
            except Exception:
                continue
        return total

    async def recovery_receipt(user: dict[str, Any], kind: str, title: str, before: Any, after: Any, undo: dict[str, Any] | None, reversible: bool = True) -> dict[str, Any]:
        now = _now()
        row = {
            "business_id": _business_id(user),
            "kind": kind,
            "title": title,
            "before": _serial(before, ObjectId),
            "after": _serial(after, ObjectId),
            "undo": undo or {},
            "reversible": bool(reversible and undo),
            "status": "available" if reversible and undo else "manual_correction",
            "created_at": now,
            "updated_at": now,
        }
        result = await db.launch_recovery_receipts.insert_one(row)
        row["id"] = str(result.inserted_id)
        return _doc(row, ObjectId)

    async def policy_for(user: dict[str, Any], role: str) -> dict[str, Any] | None:
        try:
            return await db.launch_permission_policies.find_one({"business_id": _business_id(user), "role": _slug(role)})
        except Exception:
            return None

    async def find_job(user: dict[str, Any], job_id: str) -> tuple[str, dict[str, Any] | None]:
        values: list[Any] = [job_id]
        oid = _maybe_oid(job_id, ObjectId)
        if oid is not None:
            values.append(oid)
        scope = _business_scope(user, ObjectId)
        conditions = []
        for value in values:
            conditions.extend(({"_id": value}, {"id": value}, {"job_id": value}))
        for collection in JOB_COLLECTIONS:
            try:
                found = await db[collection].find_one({"$and": [scope, {"$or": conditions}]})
                if found:
                    return collection, dict(found)
            except Exception:
                continue
        return "", None

    def worker_matches(user: dict[str, Any], job: dict[str, Any]) -> bool:
        if _role(user) in OWNER_ROLES or user.get("is_admin"):
            return True
        assigned = [_first(job, ("worker_id", "assigned_worker_id", "assigned_to", "workerId"), ""), _first(job, ("worker_email", "assigned_worker_email"), "")]
        explicit = [str(value).strip().lower() for value in assigned if str(value or "").strip()]
        if not explicit:
            return False
        identities = {
            str(_first(user, ("_id", "id", "worker_id", "user_id"), "")).strip().lower(),
            str(user.get("email") or "").strip().lower(),
        }
        return any(value in identities for value in explicit)

    async def import_preview_payload(user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        kind = _slug(payload.get("kind"))
        if kind not in IMPORT_TYPES:
            raise HTTPException(status_code=400, detail="Choose clients, workers, jobs, recurring jobs, quotes or invoices")
        source_rows = payload.get("rows") if isinstance(payload.get("rows"), list) else _parse_csv(_text(payload.get("csv_text"), "", 2_000_000))
        if not source_rows:
            raise HTTPException(status_code=400, detail="Paste CSV rows or provide a row list")
        if len(source_rows) > 5000:
            raise HTTPException(status_code=400, detail="Import batches are limited to 5,000 rows")
        normalised = [normalise_import_row(kind, row if isinstance(row, dict) else {}, index + 2) for index, row in enumerate(source_rows)]
        seen: set[str] = set()
        for row in normalised:
            if row["identity"] in seen:
                row["duplicate"] = True
                row["ready"] = False
                row["errors"].append("Possible duplicate inside this file")
            else:
                row["duplicate"] = False
                seen.add(row["identity"])
        existing = set()
        target = IMPORT_TYPES[kind]["collection"]
        try:
            cursor = db[target].find(_business_scope(user, ObjectId), {"launch_import_identity": 1})
            existing = {str(item.get("launch_import_identity")) for item in await cursor.limit(10000).to_list(10000) if item.get("launch_import_identity")}
        except Exception:
            pass
        for row in normalised:
            if row["identity"] in existing:
                row["duplicate"] = True
                row["ready"] = False
                row["errors"].append("This row appears to have been imported before")
        preview_id = _hash(_business_id(user), kind, json.dumps(source_rows, sort_keys=True, default=str), _now().isoformat())
        ready_count = sum(1 for row in normalised if row["ready"])
        batch = {
            "business_id": _business_id(user),
            "preview_id": preview_id,
            "kind": kind,
            "target_collection": target,
            "status": "preview",
            "rows": normalised,
            "row_count": len(normalised),
            "ready_count": ready_count,
            "needs_review_count": len(normalised) - ready_count,
            "owner_approval_required": True,
            "reversible": True,
            "created_at": _now(),
            "updated_at": _now(),
        }
        await db.launch_import_batches.update_one({"business_id": batch["business_id"], "preview_id": preview_id}, {"$set": batch}, upsert=True)
        return _doc(batch, ObjectId)

    async def undo_import(user: dict[str, Any], preview_id: str, receipt: bool = True) -> dict[str, Any]:
        business_id = _business_id(user)
        batch = await db.launch_import_batches.find_one({"business_id": business_id, "preview_id": preview_id})
        if not batch:
            raise HTTPException(status_code=404, detail="Import batch was not found")
        target = _text(batch.get("target_collection"), "")
        committed_at = _date(batch.get("committed_at"))
        if not target or not committed_at:
            raise HTTPException(status_code=409, detail="Only committed import batches can be undone")
        query = {"business_id": business_id, "launch_import_batch_id": preview_id, "launch_import_owned": True}
        records = await db[target].find(query).limit(6000).to_list(6000)
        protected = [item for item in records if (_date(item.get("updated_at")) or committed_at) > committed_at]
        removable = [item for item in records if item not in protected]
        ids = [item.get("_id") for item in removable]
        if ids:
            await db[target].delete_many({"_id": {"$in": ids}})
        await db.launch_import_batches.update_one({"_id": batch["_id"]}, {"$set": {"status": "undone", "undone_at": _now(), "removed_count": len(ids), "protected_count": len(protected), "updated_at": _now()}})
        result = {"preview_id": preview_id, "removed_count": len(ids), "protected_count": len(protected), "status": "undone"}
        if receipt:
            await recovery_receipt(user, "import_undo", f"Undo {batch.get('kind')} import", _doc(batch, ObjectId), result, None, False)
        return result

    async def journey_summary(user: dict[str, Any], plan: str) -> dict[str, Any]:
        jobs = await rows(user, JOB_COLLECTIONS, 500)
        counts = {
            "business": await count_rows(user, BUSINESS_COLLECTIONS),
            "clients": await count_rows(user, CLIENT_COLLECTIONS),
            "jobs": len(jobs),
            "workers": await count_rows(user, ("workers", "team", "employees", "staff")),
            "completed_jobs": sum(1 for item in jobs if any(word in _status(item) for word in ("complete", "done", "finished", "closed"))),
            "truth_receipts": await count_rows(user, ("job_truth_receipts",)),
            "invoices": await count_rows(user, INVOICE_COLLECTIONS),
            "active_days": 0,
        }
        try:
            activity = await db.launch_journey_events.find({"business_id": _business_id(user)}).sort("created_at", -1).limit(500).to_list(500)
            counts["active_days"] = len({(_date(item.get("created_at")) or _now()).date().isoformat() for item in activity})
        except Exception:
            pass
        steps = build_journey_steps(counts, plan)
        complete = sum(1 for step in steps if step["complete"])
        required = sum(1 for step in steps if step["required"])
        return {"counts": counts, "steps": steps, "complete_count": complete, "required_count": required, "ready": all(step["complete"] for step in steps if step["required"])}

    async def permissions_payload(user: dict[str, Any], plan: str) -> dict[str, Any]:
        stored = []
        try:
            stored = await db.launch_permission_policies.find({"business_id": _business_id(user)}).sort("role", 1).limit(100).to_list(100)
        except Exception:
            pass
        by_role = {_slug(item.get("role")): _doc(item, ObjectId) for item in stored}
        policies = []
        for preset in default_permissions():
            role = preset["role"]
            policies.append({**preset, **(by_role.get(role) or {}), "custom": bool(by_role.get(role))})
        return {"plan": plan, "policies": policies, "custom_overrides_available": plan_meets(plan, "operator"), "team_role_management_available": plan_meets(plan, "crew")}

    async def evidence_payload(user: dict[str, Any]) -> dict[str, Any]:
        jobs = await rows(user, JOB_COLLECTIONS, 500)
        invoices = await rows(user, INVOICE_COLLECTIONS, 500)
        quotes = await rows(user, QUOTE_COLLECTIONS, 300)
        receipts = await rows(user, ("job_truth_receipts",), 300)
        promises = await rows(user, ("client_promises",), 500)
        drafts = await rows(user, ("owner_intelligence_drafts",), 500)
        findings: list[dict[str, Any]] = []
        invoice_by_job = {}
        for invoice in invoices:
            jid = _text(_first(invoice, ("job_id", "jobId", "source_job_id", "linked_job_id"), ""), "")
            if jid:
                invoice_by_job.setdefault(jid, []).append(invoice)
        for job in jobs:
            job_id = _record_id(job)
            if not job_id:
                continue
            amount = _number(_first(job, ("total", "price", "amount", "job_total"), 0))
            completed = any(word in _status(job) for word in ("complete", "done", "finished", "closed"))
            if completed and not invoice_by_job.get(job_id):
                findings.append({"id": _hash("completed_not_invoiced", job_id), "kind": "completed_not_invoiced", "record_id": job_id, "record_collection": job.get("_collection"), "title": _title(job), "amount": amount, "reason": "Completed work has no linked invoice.", "calculation": "Job total with no invoice sharing the job id.", "assumptions": ["The job status accurately represents completed work."], "missing": ["invoice"]})
        for quote in quotes:
            if _status(quote) in {"sent", "viewed", "open", "pending"}:
                findings.append({"id": _hash("open_quote", _record_id(quote)), "kind": "open_quote", "record_id": _record_id(quote), "record_collection": quote.get("_collection"), "title": _title(quote, "Open quote"), "amount": _number(_first(quote, ("total", "amount"), 0)), "reason": "Quote remains open.", "calculation": "Status is sent, viewed, open or pending.", "assumptions": ["No acceptance or decline was recorded elsewhere."], "missing": []})
        return {"outcomes": build_evidence_outcomes(findings, drafts, invoices, receipts, promises), "findings": findings[:100]}

    @router.get("/launch-hardening/marker")
    async def marker():
        return {"success": True, "build": LAUNCH_HARDENING_BUILD, "features": list(TRUST_FEATURES), "trust_not_paywalled": True, "owner_approval_required": True}

    @router.get("/launch-hardening/summary")
    async def summary(request: Request):
        user = await require_owner(request)
        plan = await business_plan(user)
        imports = []
        recovery = []
        portals = []
        try:
            imports = [_doc(item, ObjectId) for item in await db.launch_import_batches.find({"business_id": _business_id(user)}, {"rows": 0}).sort("updated_at", -1).limit(20).to_list(20)]
        except Exception:
            pass
        try:
            recovery = [_doc(item, ObjectId) for item in await db.launch_recovery_receipts.find({"business_id": _business_id(user)}).sort("created_at", -1).limit(30).to_list(30)]
        except Exception:
            pass
        try:
            portals = [_doc(item, ObjectId) for item in await db.client_portals.find({"business_id": _business_id(user)}).sort("updated_at", -1).limit(30).to_list(30)]
        except Exception:
            pass
        portability_counts = {}
        for name in PORTABILITY_COLLECTIONS:
            try:
                count = await db[name].count_documents(_business_scope(user, ObjectId))
                if count:
                    portability_counts[name] = count
            except Exception:
                continue
        return {
            "success": True,
            "build": LAUNCH_HARDENING_BUILD,
            "plan": plan,
            "features": feature_catalog(plan),
            "journey": await journey_summary(user, plan),
            "permissions": await permissions_payload(user, plan),
            "security": {
                "role": _role(user),
                "server_enforced_permissions": True,
                "business_scoped_requests": True,
                "deny_sensitive_actions_by_default": True,
                "backup_status": "not_confirmed",
                "backup_message": "Churvox does not claim a successful backup until the hosting backup can be verified.",
                "data_export_available": True,
            },
            "imports": imports,
            "recovery": recovery,
            "portals": portals,
            "portability": {"collection_counts": portability_counts, "record_count": sum(portability_counts.values()), "download_ready": True},
            "evidence": await evidence_payload(user),
            "safety": SAFE_RESULT,
        }

    @router.post("/launch-hardening/imports/preview")
    async def import_preview(request: Request):
        user = await require_owner(request)
        return {"success": True, "preview": await import_preview_payload(user, await request.json()), "safety": SAFE_RESULT}

    @router.post("/launch-hardening/imports/commit")
    async def import_commit(request: Request):
        user = await require_owner(request)
        payload = await request.json()
        preview_id = _text(payload.get("preview_id"), "")
        if not preview_id or payload.get("approved") is not True:
            raise HTTPException(status_code=400, detail="Owner approval is required to commit an import")
        business_id = _business_id(user)
        batch = await db.launch_import_batches.find_one({"business_id": business_id, "preview_id": preview_id})
        if not batch:
            raise HTTPException(status_code=404, detail="Import preview was not found")
        if batch.get("status") == "committed":
            return {"success": True, "batch": _doc(batch, ObjectId), "existing": True, "safety": SAFE_RESULT}
        target = batch.get("target_collection")
        ready = [row for row in batch.get("rows", []) if row.get("ready")]
        now = _now()
        inserted = 0
        for row in ready:
            identity = row.get("identity")
            query = {"business_id": business_id, "launch_import_identity": identity}
            record = {
                **(row.get("mapped") or {}),
                "business_id": business_id,
                "contractor_id": business_id,
                "launch_import_identity": identity,
                "launch_import_batch_id": preview_id,
                "launch_import_owned": True,
                "source": "churvox_go_live_import",
                "created_at": now,
                "updated_at": now,
            }
            if target == "jobs":
                record.setdefault("status", "scheduled")
            if target in {"quotes", "invoices"}:
                record.setdefault("status", "draft")
            result = await db[target].update_one(query, {"$setOnInsert": record}, upsert=True)
            if getattr(result, "upserted_id", None) is not None:
                inserted += 1
        update = {"status": "committed", "inserted_count": inserted, "committed_at": now, "updated_at": now}
        await db.launch_import_batches.update_one({"_id": batch["_id"]}, {"$set": update})
        receipt = await recovery_receipt(user, "import_batch", f"Import {batch.get('kind')}", {"record_count": 0}, {"record_count": inserted, "preview_id": preview_id}, {"action": "undo_import", "preview_id": preview_id})
        stored = await db.launch_import_batches.find_one({"_id": batch["_id"]})
        return {"success": True, "batch": _doc(stored, ObjectId), "receipt": receipt, "safety": SAFE_RESULT}

    @router.post("/launch-hardening/imports/{preview_id}/undo")
    async def import_undo(preview_id: str, request: Request):
        user = await require_owner(request)
        return {"success": True, "result": await undo_import(user, preview_id), "safety": SAFE_RESULT}

    @router.post("/launch-hardening/journey/checkpoint")
    async def journey_checkpoint(request: Request):
        user = await require_owner(request)
        payload = await request.json()
        key = _slug(payload.get("key") or "visit")
        idempotency = _text(payload.get("idempotency_key"), "") or _hash(_business_id(user), key, _now().date().isoformat())
        row = {"business_id": _business_id(user), "key": key, "screen": _slug(payload.get("screen")), "idempotency_key": idempotency, "metadata": payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {}, "created_at": _now(), "updated_at": _now()}
        await db.launch_journey_events.update_one({"business_id": row["business_id"], "idempotency_key": idempotency}, {"$setOnInsert": row}, upsert=True)
        plan = await business_plan(user)
        return {"success": True, "journey": await journey_summary(user, plan), "safety": SAFE_RESULT}

    @router.get("/launch-hardening/permissions")
    async def permissions(request: Request):
        user = await require_owner(request)
        return {"success": True, **(await permissions_payload(user, await business_plan(user))), "safety": SAFE_RESULT}

    @router.post("/launch-hardening/permissions")
    async def save_permissions(request: Request):
        user = await require_owner(request)
        plan = await business_plan(user)
        if not plan_meets(plan, "crew"):
            raise HTTPException(status_code=403, detail="Team permission presets require Crew or higher")
        payload = await request.json()
        role = _slug(payload.get("role"))
        if role not in ROLE_PRESETS:
            raise HTTPException(status_code=400, detail="Choose a supported role")
        requested = sorted({_text(item, "", 120) for item in payload.get("actions", []) if _text(item, "")})
        preset = ROLE_PRESETS[role]["actions"]
        if requested != sorted(preset) and not plan_meets(plan, "operator"):
            raise HTTPException(status_code=403, detail="Custom permission overrides require Operator or higher")
        query = {"business_id": _business_id(user), "role": role}
        before = await db.launch_permission_policies.find_one(query)
        record = {**query, "label": ROLE_PRESETS[role]["label"], "actions": requested, "owner_reviewed": True, "updated_at": _now()}
        await db.launch_permission_policies.update_one(query, {"$set": record, "$setOnInsert": {"created_at": _now()}}, upsert=True)
        receipt = await recovery_receipt(user, "permission_policy", f"Update {record['label']} permissions", _doc(before, ObjectId), record, {"action": "restore_permission", "role": role, "before": _serial(before, ObjectId)})
        return {"success": True, "permissions": await permissions_payload(user, plan), "receipt": receipt, "safety": SAFE_RESULT}

    @router.get("/launch-hardening/portal-links")
    async def portal_links(request: Request):
        user = await require_owner(request)
        items = await db.client_portals.find({"business_id": _business_id(user)}).sort("updated_at", -1).limit(100).to_list(100)
        return {"success": True, "items": [_doc(item, ObjectId) for item in items], "safety": SAFE_RESULT}

    @router.post("/launch-hardening/portal-links")
    async def create_portal_link(request: Request):
        user = await require_owner(request)
        payload = await request.json()
        job_id = _text(payload.get("job_id"), "")
        client_id = _text(payload.get("client_id"), "")
        if not job_id and not client_id:
            raise HTTPException(status_code=400, detail="Choose a job or client")
        token = secrets.token_urlsafe(32)
        now = _now()
        job = None
        if job_id:
            _, job = await find_job(user, job_id)
        record = {
            "business_id": _business_id(user),
            "contractor_id": _business_id(user),
            "public_token": token,
            "portal_token": token,
            "client_portal_token": token,
            "job_id": job_id,
            "client_id": client_id or _client_id(job),
            "customer_name": _text(payload.get("customer_name") or _first(job, ("customer_name", "client_name"), "Customer"), "Customer", 300),
            "job_title": _text(payload.get("job_title") or _title(job, "Customer portal"), "Customer portal", 500),
            "address": _text(payload.get("address") or _first(job, ("address", "service_address", "site_address"), ""), "", 1500),
            "work_status": _text(payload.get("work_status") or _status(job) or "waiting", "waiting", 100),
            "approval_status": "waiting",
            "customer_summary": _text(payload.get("customer_summary") or _first(job, ("customer_summary", "public_summary", "completion_note", "description"), ""), "", 7000),
            "photos": payload.get("photos") if isinstance(payload.get("photos"), list) else _first(job, ("customer_visible_photos", "proof_photos", "photos"), []),
            "business_snapshot": payload.get("business_snapshot") if isinstance(payload.get("business_snapshot"), dict) else {},
            "status": "active",
            "expires_at": payload.get("expires_at"),
            "created_at": now,
            "updated_at": now,
        }
        result = await db.client_portals.insert_one(record)
        record["id"] = str(result.inserted_id)
        receipt = await recovery_receipt(user, "portal_link", f"Create portal for {record['customer_name']}", None, record, {"action": "revoke_portal", "portal_id": record["id"]})
        return {"success": True, "portal": _doc(record, ObjectId), "url": f"/client/{token}", "receipt": receipt, "safety": SAFE_RESULT}

    @router.post("/launch-hardening/portal-links/{portal_id}/revoke")
    async def revoke_portal_link(portal_id: str, request: Request):
        user = await require_owner(request)
        oid = _maybe_oid(portal_id, ObjectId)
        query = {"$and": [_business_scope(user, ObjectId), {"_id": oid if oid is not None else portal_id}]}
        before = await db.client_portals.find_one(query)
        if not before:
            raise HTTPException(status_code=404, detail="Portal link was not found")
        await db.client_portals.update_one({"_id": before["_id"]}, {"$set": {"status": "revoked", "revoked_at": _now(), "updated_at": _now()}})
        receipt = await recovery_receipt(user, "portal_revoke", f"Revoke portal for {_text(before.get('customer_name'), 'customer')}", _doc(before, ObjectId), {"status": "revoked"}, None, False)
        return {"success": True, "status": "revoked", "receipt": receipt, "safety": SAFE_RESULT}

    @router.post("/public/client-portal/{token}/request-change")
    async def public_request_change(token: str, request: Request):
        payload = await request.json()
        token = _public_token(token)
        portal = await db.client_portals.find_one({"$or": [{"public_token": token}, {"portal_token": token}, {"client_portal_token": token}], "status": {"$ne": "revoked"}})
        if not portal:
            raise HTTPException(status_code=404, detail="Client portal not found")
        text = _text(payload.get("message"), "", 3000)
        if len(text) < 3:
            raise HTTPException(status_code=400, detail="Tell the business what needs changing")
        row = {"business_id": portal.get("business_id"), "portal_id": str(portal.get("_id")), "job_id": portal.get("job_id"), "client_id": portal.get("client_id"), "kind": "change_request", "message": text, "status": "owner_review", "created_at": _now(), "updated_at": _now()}
        await db.customer_portal_requests.insert_one(row)
        await db.command_slips.insert_one({"business_id": portal.get("business_id"), "contractor_id": portal.get("contractor_id") or portal.get("business_id"), "source_type": "customer_portal_change_request", "source_id": str(portal.get("_id")), "action_type": "owner_review", "title": "Customer requested a change", "found": text, "prepared": "Customer request recorded for owner review.", "why": "Nothing was changed automatically.", "status": "open", "owner_review_only": True, "prepared_only": True, "created_at": _now(), "updated_at": _now()})
        return {"success": True, "message": "Your request was sent to the business for review."}

    @router.post("/public/client-portal/{token}/feedback")
    async def public_feedback(token: str, request: Request):
        payload = await request.json()
        token = _public_token(token)
        portal = await db.client_portals.find_one({"$or": [{"public_token": token}, {"portal_token": token}, {"client_portal_token": token}], "status": {"$ne": "revoked"}})
        if not portal:
            raise HTTPException(status_code=404, detail="Client portal not found")
        rating = max(1, min(5, int(_number(payload.get("rating") or 5))))
        comment = _text(payload.get("comment"), "", 3000)
        row = {"business_id": portal.get("business_id"), "portal_id": str(portal.get("_id")), "job_id": portal.get("job_id"), "client_id": portal.get("client_id"), "kind": "feedback", "rating": rating, "message": comment, "status": "recorded", "created_at": _now(), "updated_at": _now()}
        await db.customer_portal_requests.insert_one(row)
        return {"success": True, "message": "Thank you. Your feedback was recorded for the business."}

    @router.post("/public/client-portal/{token}/request-work")
    async def public_request_work(token: str, request: Request):
        payload = await request.json()
        token = _public_token(token)
        portal = await db.client_portals.find_one({"$or": [{"public_token": token}, {"portal_token": token}, {"client_portal_token": token}], "status": {"$ne": "revoked"}})
        if not portal:
            raise HTTPException(status_code=404, detail="Client portal not found")
        text = _text(payload.get("message"), "", 3000)
        if len(text) < 3:
            raise HTTPException(status_code=400, detail="Describe the work you need")
        row = {"business_id": portal.get("business_id"), "portal_id": str(portal.get("_id")), "job_id": portal.get("job_id"), "client_id": portal.get("client_id"), "kind": "new_work_request", "message": text, "status": "owner_review", "created_at": _now(), "updated_at": _now()}
        await db.customer_portal_requests.insert_one(row)
        await db.command_slips.insert_one({"business_id": portal.get("business_id"), "contractor_id": portal.get("contractor_id") or portal.get("business_id"), "source_type": "customer_portal_work_request", "source_id": str(portal.get("_id")), "action_type": "owner_review", "title": "Customer requested more work", "found": text, "prepared": "New work request recorded for owner review.", "why": "No job or quote was created automatically.", "status": "open", "owner_review_only": True, "prepared_only": True, "created_at": _now(), "updated_at": _now()})
        return {"success": True, "message": "Your request was sent to the business."}

    @router.get("/launch-hardening/recovery")
    async def recovery(request: Request):
        user = await require_owner(request)
        items = await db.launch_recovery_receipts.find({"business_id": _business_id(user)}).sort("created_at", -1).limit(100).to_list(100)
        return {"success": True, "items": [_doc(item, ObjectId) for item in items], "safety": SAFE_RESULT}

    @router.post("/launch-hardening/recovery/{receipt_id}/undo")
    async def recovery_undo(receipt_id: str, request: Request):
        user = await require_owner(request)
        oid = _maybe_oid(receipt_id, ObjectId)
        receipt = await db.launch_recovery_receipts.find_one({"business_id": _business_id(user), "_id": oid if oid is not None else receipt_id})
        if not receipt:
            raise HTTPException(status_code=404, detail="Recovery receipt was not found")
        if receipt.get("status") == "undone":
            return {"success": True, "receipt": _doc(receipt, ObjectId), "existing": True}
        undo = receipt.get("undo") or {}
        action = undo.get("action")
        result: Any = None
        if action == "undo_import":
            result = await undo_import(user, _text(undo.get("preview_id"), ""), receipt=False)
        elif action == "revoke_portal":
            portal_id = _text(undo.get("portal_id"), "")
            portal_oid = _maybe_oid(portal_id, ObjectId)
            await db.client_portals.update_one({"business_id": _business_id(user), "_id": portal_oid if portal_oid is not None else portal_id}, {"$set": {"status": "revoked", "revoked_at": _now(), "updated_at": _now()}})
            result = {"portal_id": portal_id, "status": "revoked"}
        elif action == "restore_permission":
            role = _slug(undo.get("role"))
            before = undo.get("before")
            query = {"business_id": _business_id(user), "role": role}
            if before:
                restore = {key: value for key, value in before.items() if key not in {"id", "_id"}}
                await db.launch_permission_policies.update_one(query, {"$set": restore}, upsert=True)
            else:
                await db.launch_permission_policies.delete_one(query)
            result = {"role": role, "restored": True}
        else:
            raise HTTPException(status_code=409, detail="This action requires a manual correction and cannot be automatically undone")
        await db.launch_recovery_receipts.update_one({"_id": receipt["_id"]}, {"$set": {"status": "undone", "undone_at": _now(), "undo_result": _serial(result, ObjectId), "updated_at": _now()}})
        stored = await db.launch_recovery_receipts.find_one({"_id": receipt["_id"]})
        return {"success": True, "receipt": _doc(stored, ObjectId), "result": result, "safety": SAFE_RESULT}

    @router.get("/launch-hardening/portability/manifest")
    async def portability_manifest(request: Request):
        user = await require_owner(request)
        counts = {}
        for name in PORTABILITY_COLLECTIONS:
            try:
                count = await db[name].count_documents(_business_scope(user, ObjectId))
                if count:
                    counts[name] = count
            except Exception:
                continue
        return {"success": True, "collections": counts, "record_count": sum(counts.values()), "owner_data": True, "safety": SAFE_RESULT}

    @router.get("/launch-hardening/portability/download")
    async def portability_download(request: Request):
        user = await require_owner(request)
        business_id = _business_id(user)
        buffer = io.BytesIO()
        index = {"build": LAUNCH_HARDENING_BUILD, "business_id": business_id, "exported_at": _now().isoformat(), "collections": {}, "owner_data": True}
        with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for name in PORTABILITY_COLLECTIONS:
                try:
                    found = await db[name].find(_business_scope(user, ObjectId)).limit(10000).to_list(10000)
                except Exception:
                    continue
                if not found:
                    continue
                serial = [_serial(dict(item), ObjectId) for item in found]
                index["collections"][name] = len(serial)
                archive.writestr(f"data/{name}.json", json.dumps(serial, indent=2, default=str))
                keys = sorted({key for item in serial for key in item.keys() if not key.startswith("_")})
                stream = io.StringIO()
                writer = csv.DictWriter(stream, fieldnames=keys, extrasaction="ignore")
                writer.writeheader()
                for item in serial:
                    writer.writerow({key: json.dumps(item.get(key), default=str) if isinstance(item.get(key), (dict, list)) else item.get(key) for key in keys})
                archive.writestr(f"csv/{name}.csv", stream.getvalue())
            archive.writestr("README.txt", "This is a complete Churvox business portability pack. JSON preserves nested data; CSV files are included for spreadsheets. Your business data belongs to you.\n")
            archive.writestr("index.json", json.dumps(index, indent=2, default=str))
        buffer.seek(0)
        filename = f"churvox-business-portability-{_now().date().isoformat()}.zip"
        return StreamingResponse(buffer, media_type="application/zip", headers={"Content-Disposition": f'attachment; filename="{filename}"', "X-Churvox-Export-Build": LAUNCH_HARDENING_BUILD})

    @router.get("/launch-hardening/evidence/outcomes")
    async def evidence_outcomes(request: Request):
        user = await require_owner(request)
        return {"success": True, **(await evidence_payload(user)), "safety": SAFE_RESULT}

    @router.get("/launch-hardening/evidence/{evidence_id}")
    async def evidence_detail(evidence_id: str, request: Request):
        user = await require_owner(request)
        payload = await evidence_payload(user)
        item = next((row for row in payload["findings"] if row.get("id") == evidence_id), None)
        if not item:
            raise HTTPException(status_code=404, detail="Evidence item was not found")
        return {"success": True, "evidence": {**item, "owner_review_required": True, "source_ids": [item.get("record_id")], "confidence": "record-backed", "what_will_change": "Nothing until the owner approves a separate action.", "what_will_not_change": ["No message sent", "No invoice sent", "No payment collected", "No accounting sync"]}, "safety": SAFE_RESULT}

    @router.post("/launch-hardening/worker-sync/batch")
    async def worker_sync_batch(request: Request):
        user = await require_worker_or_owner(request)
        plan = await business_plan(user)
        if not plan_meets(plan, "crew"):
            raise HTTPException(status_code=403, detail="Offline Worker Sync requires Crew or higher")
        payload = await request.json()
        events = payload.get("events") if isinstance(payload.get("events"), list) else []
        if not events:
            raise HTTPException(status_code=400, detail="No queued worker events were provided")
        if len(events) > 100:
            raise HTTPException(status_code=400, detail="Sync batches are limited to 100 events")
        results = []
        for raw in events:
            event = raw if isinstance(raw, dict) else {}
            idempotency_key = _text(event.get("idempotency_key"), "") or _hash(_business_id(user), event.get("job_id"), event.get("action"), event.get("captured_at"))
            existing = await db.worker_sync_events.find_one({"business_id": _business_id(user), "idempotency_key": idempotency_key})
            if existing and existing.get("status") == "applied":
                results.append({"idempotency_key": idempotency_key, "status": "applied", "existing": True})
                continue
            job_id = _text(event.get("job_id"), "")
            action = _slug(event.get("action"))
            collection, job = await find_job(user, job_id)
            if not job or not collection:
                results.append({"idempotency_key": idempotency_key, "status": "needs_attention", "detail": "Assigned job was not found"})
                await db.worker_sync_events.update_one({"business_id": _business_id(user), "idempotency_key": idempotency_key}, {"$set": {"business_id": _business_id(user), "idempotency_key": idempotency_key, "job_id": job_id, "action": action, "status": "needs_attention", "detail": "Assigned job was not found", "updated_at": _now()}, "$setOnInsert": {"created_at": _now()}}, upsert=True)
                continue
            if not worker_matches(user, job):
                results.append({"idempotency_key": idempotency_key, "status": "denied", "detail": "This job is assigned to another worker"})
                continue
            data = event.get("payload") if isinstance(event.get("payload"), dict) else {}
            offline_photos = _offline_photos(data.get("photos"))
            if action == "complete":
                checklist = proof_checklist_for(job, _text(data.get("industry"), ""))
                check = evaluate_proof(checklist, data.get("photo_names") if isinstance(data.get("photo_names"), list) else [], _text(data.get("note"), "", 1600), data.get("confirmations") if isinstance(data.get("confirmations"), list) else [])
                if not check["ready"]:
                    results.append({"idempotency_key": idempotency_key, "status": "needs_attention", "detail": "Required proof is missing", "check": check})
                    await db.worker_sync_events.update_one({"business_id": _business_id(user), "idempotency_key": idempotency_key}, {"$set": {"business_id": _business_id(user), "idempotency_key": idempotency_key, "job_id": job_id, "action": action, "payload": data, "status": "needs_attention", "check": check, "updated_at": _now()}, "$setOnInsert": {"created_at": _now()}}, upsert=True)
                    continue
            status_map = {"acknowledge": "acknowledged", "start": "in_progress", "pause": "paused", "resume": "in_progress", "complete": "completed"}
            now = _now()
            if action in status_map:
                update = {"status": status_map[action], "worker_notes": _text(data.get("note"), "", 1600), "proof_photo_names": data.get("photo_names") if isinstance(data.get("photo_names"), list) else [], "proof_photos": offline_photos, "proof_confirmations": data.get("confirmations") if isinstance(data.get("confirmations"), list) else [], "worker_last_action": action, "worker_last_action_at": now, "updated_at": now}
                if action == "complete":
                    update["completed_at"] = now
                await db[collection].update_one({"_id": job["_id"]}, {"$set": update, "$push": {"worker_status_history": {"action": action, "captured_at": event.get("captured_at"), "synced_at": now, "idempotency_key": idempotency_key}}})
            elif action in {"job_proof", "worker_message", "worker_problem", "timer_note"}:
                await db.worker_field_slips.insert_one({"business_id": _business_id(user), "job_id": job_id, "worker_id": _text(_first(user, ("_id", "id", "worker_id"), ""), ""), "type": action, "text": _text(data.get("text") or data.get("note"), "", 3000), "photo_names": data.get("photo_names") if isinstance(data.get("photo_names"), list) else [], "photos": offline_photos, "source": "offline_worker_sync", "idempotency_key": idempotency_key, "created_at": now, "updated_at": now})
            else:
                results.append({"idempotency_key": idempotency_key, "status": "needs_attention", "detail": "Unsupported worker action"})
                continue
            await db.worker_sync_events.update_one({"business_id": _business_id(user), "idempotency_key": idempotency_key}, {"$set": {"business_id": _business_id(user), "idempotency_key": idempotency_key, "job_id": job_id, "action": action, "payload": data, "status": "applied", "applied_at": now, "updated_at": now}, "$setOnInsert": {"created_at": now}}, upsert=True)
            results.append({"idempotency_key": idempotency_key, "status": "applied", "job_id": job_id, "action": action})
        return {"success": True, "results": results, "applied_count": sum(1 for item in results if item.get("status") == "applied"), "needs_attention_count": sum(1 for item in results if item.get("status") not in {"applied"}), "safety": SAFE_RESULT}

    return router


def install_permission_middleware(app, db, get_current_user) -> None:
    """Install a narrow server-side permission guard for sensitive route families.

    Existing routes still own their detailed record validation. This middleware adds a deny-by-default role check
    for high-risk areas without changing public, authentication, worker login, billing return or health routes.
    """
    if getattr(app.state, "churvox_permission_middleware_installed", False):
        return

    route_actions = (
        ("/api/launch-hardening/permissions", "permissions.manage"),
        ("/api/launch-hardening/portability", "exports.download"),
        ("/api/launch-hardening/recovery", "recovery.undo"),
        ("/api/launch-hardening/portal-links", "portal.manage"),
        ("/api/payroll", "payroll.review"),
        ("/api/accounting/export", "exports.download"),
    )

    @app.middleware("http")
    async def churvox_permission_guard(request: Request, call_next):
        path = str(request.url.path or "")
        if request.method == "OPTIONS" or path.startswith(("/api/public/", "/api/auth/", "/api/billing/", "/api/health", "/api/worker/")):
            return await call_next(request)
        action = next((required for prefix, required in route_actions if path.startswith(prefix)), "")
        if not action:
            return await call_next(request)
        try:
            user = await get_current_user(request)
        except Exception:
            return await call_next(request)
        if not isinstance(user, dict):
            return await call_next(request)
        role = _role(user)
        if role in {"owner", "business_owner", "employer", "admin", "superadmin", "super_admin"} or user.get("is_admin"):
            return await call_next(request)
        policy = None
        try:
            policy = await db.launch_permission_policies.find_one({"business_id": _business_id(user), "role": role})
        except Exception:
            pass
        if not action_allowed(role, action, policy):
            from fastapi.responses import JSONResponse
            return JSONResponse(status_code=403, content={"detail": f"{ROLE_PRESETS.get(role, {}).get('label', role.title())} cannot perform {action}.", "permission": action})
        return await call_next(request)

    app.state.churvox_permission_middleware_installed = True
