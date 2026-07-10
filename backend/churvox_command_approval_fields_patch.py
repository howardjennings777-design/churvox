from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import HTTPException, Request


SAFE_RESULT = "Owner approval recorded. Nothing was sent, synced, charged or changed."
ALLOWED_OWNER_ROLES = {"employer", "admin", "owner", "business_owner", "manager", "office_admin"}


def install(legacy):
    app = getattr(legacy, "app", None)
    db = getattr(legacy, "db", None)
    get_current_user = getattr(legacy, "get_current_user", None)
    ObjectId = getattr(legacy, "ObjectId", None)
    if app is None or db is None or get_current_user is None or ObjectId is None:
        return

    def now():
        return datetime.now(timezone.utc)

    def safe_text(value: Any, fallback: str = "", limit: int = 1200) -> str:
        try:
            text = " ".join(str(value or "").strip().split())
        except Exception:
            text = ""
        return text[:limit] or fallback

    def normalize_fields(raw: Any) -> List[Dict[str, Any]]:
        if isinstance(raw, dict):
            source = [{"label": key, "value": value} for key, value in raw.items()]
        elif isinstance(raw, list):
            source = raw
        else:
            source = []

        fields = []
        seen = set()
        for index, item in enumerate(source[:24]):
            if isinstance(item, dict):
                label = safe_text(item.get("label") or item.get("name") or item.get("key"), f"Field {index + 1}", 120)
                value = safe_text(item.get("value"), "", 2400)
                long_value = bool(item.get("long"))
            else:
                label = f"Field {index + 1}"
                value = safe_text(item, "", 2400)
                long_value = len(value) > 80
            base = label
            suffix = 2
            while label.lower() in seen:
                label = safe_text(f"{base} {suffix}", base, 120)
                suffix += 1
            seen.add(label.lower())
            fields.append({"label": label, "value": value, "long": long_value})
        return fields

    async def require_owner(request: Request):
        try:
            user = await get_current_user(request)
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=401, detail="Not authenticated")
        role = safe_text((user or {}).get("role"), "").lower()
        if role not in ALLOWED_OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Only owners/admins can approve Command slips")
        return user

    async def approve_command_fields(slip_id: str, request: Request):
        user = await require_owner(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        if not isinstance(payload, dict):
            payload = {}

        try:
            slip_oid = ObjectId(str(slip_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid slip id")

        business_id = str((user or {}).get("business_id") or (user or {}).get("id") or "")
        slip = await db.command_slips.find_one({"_id": slip_oid, "business_id": business_id})
        if not slip:
            raise HTTPException(status_code=404, detail="Command slip not found")

        action = safe_text(payload.get("action"), "Approve record", 180)
        note = safe_text(payload.get("note") or payload.get("owner_note"), "Owner approved the prepared direction.", 1200)
        form_title = safe_text(payload.get("form_title") or payload.get("formTitle"), "Owner approval form", 180)
        fields = normalize_fields(payload.get("fields") or payload.get("approved_fields"))
        field_values = {item["label"]: item["value"] for item in fields}
        approved_at = now()

        approval_snapshot = {
            "version": 1,
            "form_title": form_title,
            "fields": fields,
            "field_values": field_values,
            "source_type": safe_text(slip.get("source_type"), "office", 120),
            "source_id": safe_text(slip.get("source_id"), "", 180),
            "action_type": safe_text(slip.get("action_type"), "owner_review", 180),
            "record_id": safe_text((slip.get("payload") or {}).get("record_id") if isinstance(slip.get("payload"), dict) else "", "", 180),
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "approved_at": approved_at,
        }
        owner_decision = {
            "action": action,
            "note": note,
            "form_title": form_title,
            "approved_fields": fields,
            "approved_field_count": len(fields),
            "safety": SAFE_RESULT,
        }
        result_doc = {
            "stored_only": True,
            "approved_field_count": len(fields),
            "message": SAFE_RESULT,
        }
        audit_entry = {
            "by": str((user or {}).get("id") or ""),
            "role": safe_text((user or {}).get("role"), "owner", 80),
            "action": "approved_fields_recorded",
            "note": safe_text(f"{note} Approved form snapshot stored with {len(fields)} field(s).", note, 1200),
            "at": approved_at,
            "safety": SAFE_RESULT,
        }
        update = {
            "status": "approved_recorded",
            "approved_at": approved_at,
            "approved_by": str((user or {}).get("id") or ""),
            "owner_decision": owner_decision,
            "approval_snapshot": approval_snapshot,
            "result": result_doc,
            "updated_at": approved_at,
        }
        await db.command_slips.update_one(
            {"_id": slip_oid, "business_id": business_id},
            {"$set": update, "$push": {"audit": audit_entry}},
        )
        slip.update(update)

        try:
            await db.command_events.insert_one({
                "business_id": business_id,
                "contractor_id": slip.get("contractor_id"),
                "event_type": "approved_fields_recorded",
                "title": safe_text(slip.get("title"), "Command slip", 300),
                "detail": safe_text(f"Owner approved {len(fields)} edited field(s). Record-only approval stored.", SAFE_RESULT, 600),
                "slip_id": str(slip_oid),
                "approved_field_count": len(fields),
                "safety": SAFE_RESULT,
                "created_by": str((user or {}).get("id") or ""),
                "created_at": approved_at,
            })
        except Exception:
            pass

        def serial(value):
            if isinstance(value, datetime):
                return value.isoformat()
            if isinstance(value, ObjectId):
                return str(value)
            if isinstance(value, list):
                return [serial(item) for item in value]
            if isinstance(value, dict):
                return {("id" if key == "_id" else key): serial(item) for key, item in value.items()}
            return value

        return {
            "success": True,
            "slip": serial(slip),
            "result": result_doc,
            "approval_snapshot": serial(approval_snapshot),
            "safety": SAFE_RESULT,
        }

    app.add_api_route(
        "/api/command/slips/{slip_id}/approve-fields",
        approve_command_fields,
        methods=["POST"],
    )
