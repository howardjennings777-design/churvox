from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request

try:
    from churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router
    from churvox_command_human_mimic_source_normalizer import normalize_mimic_source_db
    from churvox_command_human_mimic_queue_finalizer import finalize_strict_queue
except Exception:
    from .churvox_command_human_mimic_v3_routes import build_command_human_mimic_v3_router
    from .churvox_command_human_mimic_source_normalizer import normalize_mimic_source_db
    from .churvox_command_human_mimic_queue_finalizer import finalize_strict_queue


OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
POST_GUARD = "linked-invoice-source-recheck-v1"
SAFE_NOTE = "Post-guard superseded this Command slip only. No business record, message, payment or accounting record changed."


class _CommandSlipCollectionView:
    """Hide strict-v3 slips only from the legacy candidate builder.

    Strict v3 must rebuild the candidate on every scan so it can compare the
    current source fingerprint with the existing v3 decision. V3's own queries
    explicitly include the v3 flag and still see the real collection.
    """

    def __init__(self, real_collection):
        self.real_collection = real_collection

    async def find_one(self, query=None, *args, **kwargs):
        query = dict(query or {})
        if query.get("payload.human_mimic_intelligence_v3") is None:
            query["payload.human_mimic_intelligence_v3"] = {"$ne": True}
        return await self.real_collection.find_one(query, *args, **kwargs)

    def __getattr__(self, name):
        return getattr(self.real_collection, name)


class _StrictLiveDBView:
    def __init__(self, real_db):
        self.real_db = real_db
        self.command_slips_view = _CommandSlipCollectionView(real_db["command_slips"])

    def __getitem__(self, name):
        if name == "command_slips":
            return self.command_slips_view
        return self.real_db[name]

    def __getattr__(self, name):
        return self[name]


def build_command_human_mimic_live_router(db, get_current_user, ObjectId):
    normalized_db = normalize_mimic_source_db(db)
    strict_router = build_command_human_mimic_v3_router(_StrictLiveDBView(normalized_db), get_current_user, ObjectId)
    strict_scan = None
    for route in getattr(strict_router, "routes", []):
        if getattr(route, "path", "") == "/command/scan":
            strict_scan = getattr(route, "endpoint", None)
            break
    router = APIRouter()
    if strict_scan is None:
        return router

    def now():
        return datetime.now(timezone.utc)

    def text(value):
        try:
            return str(value or "").strip()
        except Exception:
            return ""

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

    def business_values(user):
        raw = text((user or {}).get("business_id") or (user or {}).get("id"))
        return id_values(raw)

    def business_clause(user):
        values = business_values(user)
        return {"$or": [
            {"business_id": {"$in": values}},
            {"businessId": {"$in": values}},
            {"contractor_id": {"$in": values}},
            {"owner_id": {"$in": values}},
            {"ownerId": {"$in": values}},
        ]}

    async def source_job(user, source_id):
        values = id_values(source_id)
        query = {"$and": [business_clause(user), {"$or": [
            {"_id": {"$in": values}},
            {"id": {"$in": values}},
            {"job_id": {"$in": values}},
        ]}]}
        for name in ["jobs", "job_records", "appointments", "bookings"]:
            try:
                row = await db[name].find_one(query)
                if row:
                    return row
            except Exception:
                continue
        return None

    async def linked_invoice(user, job, source_id):
        refs = []
        for value in [source_id, (job or {}).get("_id"), (job or {}).get("id"), (job or {}).get("job_id")]:
            for candidate in id_values(value):
                if candidate not in refs:
                    refs.append(candidate)
        if not refs:
            return None
        query = {"$and": [
            business_clause(user),
            {"$or": [
                {"job_id": {"$in": refs}},
                {"jobId": {"$in": refs}},
                {"source_job_id": {"$in": refs}},
                {"related_job_id": {"$in": refs}},
            ]},
            {"status": {"$nin": ["deleted", "void", "cancelled", "canceled", "archived"]}},
        ]}
        for name in ["invoices", "invoice_records"]:
            try:
                row = await db[name].find_one(query)
                if row:
                    return row
            except Exception:
                continue
        return None

    async def supersede(slip, reason):
        raw_id = slip.get("id") or slip.get("_id")
        slip_oid = maybe_oid(raw_id)
        if slip_oid is None:
            return False
        result = await db.command_slips.update_one(
            {"_id": slip_oid, "status": {"$in": OPEN_STATUSES}},
            {"$set": {"status": "superseded", "superseded_at": now(), "superseded_reason": reason, "updated_at": now()}, "$push": {"audit": {
                "by": "human-mimic-live-postguard",
                "role": "Office Manager",
                "action": "superseded",
                "note": reason,
                "at": now(),
                "safety": SAFE_NOTE,
            }}},
        )
        return bool(getattr(result, "modified_count", 0))

    @router.post("/command/scan")
    async def live_strict_scan(request: Request, payload: Optional[Dict[str, Any]] = None):
        result = await strict_scan(request=request, payload=payload)
        user = await get_current_user(request)
        retired_ids = set()
        for slip in list(result.get("slips") or []) + list(result.get("existing") or []):
            if text(slip.get("action_type")) != "prepare_invoice":
                continue
            job = await source_job(user, slip.get("source_id"))
            if job and await linked_invoice(user, job, slip.get("source_id")):
                reason = "A live invoice already links to this job, so the duplicate invoice decision was removed. " + SAFE_NOTE
                if await supersede(slip, reason):
                    retired_ids.add(text(slip.get("id") or slip.get("_id")))

        result["slips"] = [item for item in (result.get("slips") or []) if text(item.get("id") or item.get("_id")) not in retired_ids]
        result["existing"] = [item for item in (result.get("existing") or []) if text(item.get("id") or item.get("_id")) not in retired_ids]
        result["created_count"] = len(result["slips"])
        result["existing_count"] = len(result["existing"])
        result["superseded_count"] = int(result.get("superseded_count") or 0) + len(retired_ids)
        result["post_guard"] = POST_GUARD
        result["source_normalization"] = "legacy-job-status-and-timer-units-v1"
        result = await finalize_strict_queue(db, user, result, ObjectId)
        result["message"] = f"Strict human mimic v3 kept {result['created_count']} new and {result['existing_count']} current decision(s); {result['superseded_count']} weak, stale or duplicate candidate(s) were rejected."
        return result

    return router
