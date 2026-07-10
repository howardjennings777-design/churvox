from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request

try:
    from churvox_command_human_mimic_routes import build_command_human_mimic_router
except Exception:
    from .churvox_command_human_mimic_routes import build_command_human_mimic_router


OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
SAFE_NOTE = "Superseded inside Command only. No business record, message, payment or accounting record changed."


def build_command_human_mimic_guard_router(db, get_current_user, ObjectId):
    router = APIRouter()
    base_router = build_command_human_mimic_router(db, get_current_user, ObjectId)
    base_scan = None
    for route in getattr(base_router, "routes", []):
        if getattr(route, "path", "") == "/command/scan":
            base_scan = getattr(route, "endpoint", None)
            break
    if base_scan is None:
        return router

    def now():
        return datetime.now(timezone.utc)

    def text(value):
        try:
            return str(value or "").strip()
        except Exception:
            return ""

    def lower(value):
        return text(value).lower()

    def business_id(user):
        return text((user or {}).get("business_id") or (user or {}).get("id"))

    def maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

    def id_values(value):
        values = []
        raw = text(value)
        if raw:
            values.append(raw)
        oid = maybe_oid(raw)
        if oid is not None:
            values.append(oid)
        return values

    def business_values(user_business_id):
        values = [user_business_id]
        oid = maybe_oid(user_business_id)
        if oid is not None:
            values.append(oid)
        return values

    def business_clause(user_business_id):
        values = business_values(user_business_id)
        return {"$or": [
            {"business_id": {"$in": values}},
            {"businessId": {"$in": values}},
            {"contractor_id": {"$in": values}},
            {"owner_id": {"$in": values}},
            {"ownerId": {"$in": values}},
        ]}

    def parse_date(value):
        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
        raw = text(value)
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except Exception:
            return None

    def status_of(row):
        return lower((row or {}).get("status") or (row or {}).get("job_status") or (row or {}).get("invoice_status") or (row or {}).get("payment_status") or (row or {}).get("state"))

    def status_words(row):
        normalized = status_of(row).replace("_", " ").replace("-", " ").replace("/", " ")
        return {word for word in normalized.split() if word}

    def amount_of(row):
        for key in ["balance_due", "amount_due", "balance", "outstanding", "total", "amount"]:
            value = (row or {}).get(key)
            if value in (None, ""):
                continue
            try:
                return float(str(value).replace("$", "").replace(",", ""))
            except Exception:
                continue
        return 0.0

    async def supersede(slip, reason):
        if not slip or not slip.get("_id"):
            return False
        audit = {
            "by": "human-mimic-guard",
            "role": "Office Manager",
            "action": "superseded",
            "note": reason,
            "at": now(),
            "safety": SAFE_NOTE,
        }
        result = await db.command_slips.update_one(
            {"_id": slip["_id"], "status": {"$in": OPEN_STATUSES}},
            {"$set": {"status": "superseded", "superseded_at": now(), "superseded_reason": reason, "updated_at": now()}, "$push": {"audit": audit}},
        )
        return bool(getattr(result, "modified_count", 0))

    async def source_record(user_business_id, source_id, collection_names, extra_id_keys=None):
        values = id_values(source_id)
        if not values:
            return None
        id_keys = ["_id", "id", "record_id"] + list(extra_id_keys or [])
        query = {
            "$and": [
                business_clause(user_business_id),
                {"$or": [{key: {"$in": values}} for key in id_keys]},
            ]
        }
        for collection_name in collection_names:
            try:
                row = await db[collection_name].find_one(query)
                if row:
                    return row
            except Exception:
                continue
        return None

    async def source_message(user_business_id, source_id):
        return await source_record(
            user_business_id,
            source_id,
            ["messages", "client_messages", "inbox_messages"],
            ["message_id"],
        )

    async def source_job(user_business_id, source_id):
        return await source_record(
            user_business_id,
            source_id,
            ["jobs", "job_records", "appointments", "bookings"],
            ["job_id"],
        )

    async def source_invoice(user_business_id, source_id):
        return await source_record(
            user_business_id,
            source_id,
            ["invoices", "invoice_records"],
            ["invoice_id", "invoice_number", "number"],
        )

    async def linked_invoice_exists(user_business_id, job, source_id):
        refs = []
        for value in [source_id, (job or {}).get("_id"), (job or {}).get("id"), (job or {}).get("job_id")]:
            for candidate in id_values(value):
                if candidate not in refs:
                    refs.append(candidate)
        if not refs:
            return False
        query = {
            "$and": [
                business_clause(user_business_id),
                {"$or": [
                    {"job_id": {"$in": refs}},
                    {"jobId": {"$in": refs}},
                    {"source_job_id": {"$in": refs}},
                    {"related_job_id": {"$in": refs}},
                ]},
                {"status": {"$nin": ["deleted", "void", "cancelled", "archived"]}},
            ]
        }
        for collection_name in ["invoices", "invoice_records"]:
            try:
                if await db[collection_name].find_one(query):
                    return True
            except Exception:
                continue
        return False

    async def retire_old_engine_slips(user_business_id):
        query = {
            "business_id": user_business_id,
            "status": {"$in": OPEN_STATUSES},
            "office_engine": True,
            "payload.human_mimic_intelligence_v2": {"$ne": True},
        }
        try:
            rows = await db.command_slips.find(query).limit(300).to_list(300)
        except Exception:
            rows = []
        count = 0
        for row in rows:
            if await supersede(row, "Human mimic v2 replaced an older office-engine judgement. " + SAFE_NOTE):
                count += 1
        return count

    async def retire_outbound_reply_false_positives(user_business_id):
        query = {
            "business_id": user_business_id,
            "status": {"$in": OPEN_STATUSES},
            "action_type": "prepare_customer_reply",
            "payload.human_mimic_intelligence_v2": True,
        }
        try:
            rows = await db.command_slips.find(query).limit(150).to_list(150)
        except Exception:
            rows = []
        retired_ids = set()
        for slip in rows:
            source = await source_message(user_business_id, slip.get("source_id"))
            direction = lower((source or {}).get("direction") or (source or {}).get("message_type") or (source or {}).get("source"))
            if any(marker in direction for marker in ["outbound", "office_to_client", "business_to_client", "sent_by_business", "from_business"]):
                if await supersede(slip, "Message direction is outbound, so it does not need an inbound reply draft. " + SAFE_NOTE):
                    retired_ids.add(str(slip.get("_id")))
        return retired_ids

    async def retire_false_completion_slips(user_business_id):
        query = {
            "business_id": user_business_id,
            "status": {"$in": OPEN_STATUSES},
            "action_type": {"$in": ["prepare_invoice", "request_completion_proof"]},
            "payload.human_mimic_intelligence_v2": True,
        }
        try:
            rows = await db.command_slips.find(query).limit(200).to_list(200)
        except Exception:
            rows = []
        retired_ids = set()
        complete_words = {"complete", "completed", "done", "finished", "closed"}
        for slip in rows:
            job = await source_job(user_business_id, slip.get("source_id"))
            if not job:
                continue
            status = status_of(job)
            words = status_words(job)
            false_complete = "incomplete" in words or ("not" in words and ("complete" in words or "completed" in words)) or status in {"pending completion", "awaiting completion"}
            explicitly_complete = bool((job or {}).get("completed") is True or (job or {}).get("completed_at")) or bool(words & complete_words)
            reason = ""
            if false_complete or not explicitly_complete:
                reason = "The source job is not actually complete, so completion-based invoice or proof work is not ready."
            elif slip.get("action_type") == "prepare_invoice" and await linked_invoice_exists(user_business_id, job, slip.get("source_id")):
                reason = "A separate invoice already links to this job, so Churvox must not prepare a duplicate invoice draft."
            if reason and await supersede(slip, reason + " " + SAFE_NOTE):
                retired_ids.add(str(slip.get("_id")))
        return retired_ids

    async def retire_early_or_invalid_payment_followups(user_business_id):
        query = {
            "business_id": user_business_id,
            "status": {"$in": OPEN_STATUSES},
            "action_type": "prepare_overdue_followup",
            "payload.human_mimic_intelligence_v2": True,
        }
        try:
            rows = await db.command_slips.find(query).limit(180).to_list(180)
        except Exception:
            rows = []
        retired_ids = set()
        for slip in rows:
            invoice = await source_invoice(user_business_id, slip.get("source_id"))
            if not invoice:
                continue
            status = status_of(invoice)
            words = status_words(invoice)
            due = parse_date((invoice or {}).get("due_date") or (invoice or {}).get("payment_due_date") or (invoice or {}).get("date_due"))
            balance = amount_of(invoice)
            premature = bool(words & {"draft", "unsent", "void", "cancelled", "canceled", "deleted", "archived"})
            paid_or_closed = bool(words & {"paid", "settled"}) or status in {"closed", "payment received", "fully paid"}
            reason = ""
            if premature:
                reason = "The invoice is not a sent collectible invoice, so a payment reminder would be premature."
            elif paid_or_closed or balance <= 0:
                reason = "The invoice has no collectible balance, so no payment reminder is needed."
            elif due is not None and due > now():
                reason = "The invoice due date is still in the future, so Churvox should not prepare an overdue reminder."
            if reason and await supersede(slip, reason + " " + SAFE_NOTE):
                retired_ids.add(str(slip.get("_id")))
        return retired_ids

    async def retire_stale_briefs(user_business_id):
        retired_ids = set()
        current_day = now().date().isoformat()
        for action_type in ["daily_owner_brief", "review_repeated_admin_gap"]:
            query = {
                "business_id": user_business_id,
                "status": {"$in": OPEN_STATUSES},
                "action_type": action_type,
                "payload.human_mimic_intelligence_v2": True,
            }
            try:
                rows = await db.command_slips.find(query).sort("updated_at", -1).limit(30).to_list(30)
            except Exception:
                rows = []
            keep_latest = bool(rows and current_day in text(rows[0].get("source_id")))
            stale_rows = rows[1:] if keep_latest else rows
            for stale in stale_rows:
                reason = "A newer human-mimic briefing replaced this older one." if keep_latest else "This daily human-mimic briefing is from an earlier day and no longer represents today’s queue."
                if await supersede(stale, reason + " " + SAFE_NOTE):
                    retired_ids.add(str(stale.get("_id")))
        return retired_ids

    @router.post("/command/scan")
    async def guarded_human_mimic_scan(request: Request, payload: Optional[Dict[str, Any]] = None):
        result = await base_scan(payload=payload, request=request)
        user = await get_current_user(request)
        user_business_id = business_id(user)
        retired_old = await retire_old_engine_slips(user_business_id)
        retired_ids = await retire_outbound_reply_false_positives(user_business_id)
        retired_ids.update(await retire_false_completion_slips(user_business_id))
        retired_ids.update(await retire_early_or_invalid_payment_followups(user_business_id))
        retired_ids.update(await retire_stale_briefs(user_business_id))

        created = [item for item in (result.get("slips") or []) if str(item.get("id") or item.get("_id") or "") not in retired_ids]
        existing = [item for item in (result.get("existing") or []) if str(item.get("id") or item.get("_id") or "") not in retired_ids]
        result["slips"] = created
        result["existing"] = existing
        result["created_count"] = len(created)
        result["existing_count"] = len(existing)
        result["superseded_count"] = retired_old + len(retired_ids)
        result["guard"] = "human-mimic-scan-guard-v2"
        result["message"] = f"Human mimic v2 prepared {len(created)} new Command slip(s), kept {len(existing)} current slip(s), and retired {result['superseded_count']} stale or false slip(s)."
        return result

    return router
