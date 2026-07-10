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

    def business_id(user):
        return text((user or {}).get("business_id") or (user or {}).get("id"))

    def maybe_oid(value):
        try:
            return ObjectId(str(value))
        except Exception:
            return None

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

    async def source_message(user_business_id, source_id):
        values = [text(source_id)]
        source_oid = maybe_oid(source_id)
        if source_oid is not None:
            values.append(source_oid)
        business_values = [user_business_id]
        business_oid = maybe_oid(user_business_id)
        if business_oid is not None:
            business_values.append(business_oid)
        query = {
            "$and": [
                {"$or": [{"business_id": {"$in": business_values}}, {"businessId": {"$in": business_values}}, {"contractor_id": {"$in": business_values}}]},
                {"$or": [{"_id": {"$in": values}}, {"id": {"$in": values}}, {"message_id": {"$in": values}}, {"record_id": {"$in": values}}]},
            ]
        }
        for collection_name in ["messages", "client_messages", "inbox_messages"]:
            try:
                row = await db[collection_name].find_one(query)
                if row:
                    return row
            except Exception:
                continue
        return None

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
            direction = text((source or {}).get("direction") or (source or {}).get("message_type") or (source or {}).get("source")).lower()
            if any(marker in direction for marker in ["outbound", "office_to_client", "business_to_client", "sent_by_business", "from_business"]):
                if await supersede(slip, "Message direction is outbound, so it does not need an inbound reply draft. " + SAFE_NOTE):
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
        retired_ids.update(await retire_stale_briefs(user_business_id))

        created = [item for item in (result.get("slips") or []) if str(item.get("id") or item.get("_id") or "") not in retired_ids]
        existing = [item for item in (result.get("existing") or []) if str(item.get("id") or item.get("_id") or "") not in retired_ids]
        result["slips"] = created
        result["existing"] = existing
        result["created_count"] = len(created)
        result["existing_count"] = len(existing)
        result["superseded_count"] = retired_old + len(retired_ids)
        result["guard"] = "human-mimic-scan-guard-v1"
        result["message"] = f"Human mimic v2 prepared {len(created)} new Command slip(s), kept {len(existing)} current slip(s), and retired {result['superseded_count']} stale or false slip(s)."
        return result

    return router
