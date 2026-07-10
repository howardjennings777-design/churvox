from __future__ import annotations

from datetime import datetime, timezone


OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
ROLE_SCHEMA_GUARD = "role-required-evidence-v1"
SAFE_NOTE = "Required evidence was tightened inside Command only. No business record, message, payment or accounting record changed."
UNRESOLVED_MARKERS = (
    "owner to",
    "owner must",
    "not found",
    "missing",
    "confirm",
    "choose",
    "to enter",
    "unresolved",
    "client from source record",
    "client not named",
    "worker not named",
    "[redacted",
)


def _now():
    return datetime.now(timezone.utc)


def _text(value):
    try:
        return " ".join(str(value or "").strip().split())
    except Exception:
        return ""


def _oid(ObjectId, value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _meaningful(value):
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, (list, tuple, dict)):
        return bool(value)
    text = _text(value).lower()
    return bool(text) and not any(marker in text for marker in UNRESOLVED_MARKERS)


def _field(form, label):
    target = _text(label).lower().replace("_", " ")
    normalized = {_text(key).lower().replace("_", " "): value for key, value in (form or {}).items()}
    if target in normalized:
        return normalized[target]
    for key, value in normalized.items():
        if target in key or key in target:
            return value
    return None


def _requirements(action, form):
    requirements = []

    def require(label, reason):
        if not _meaningful(_field(form, label)):
            requirements.append((label, reason))

    if action == "prepare_invoice":
        require("Client", "Confirm the client.")
        require("Base service amount", "Enter the real base service amount.")
        require("GST / tax rate", "Confirm the GST/tax rate.")
        require("Tax treatment", "Confirm inclusive or exclusive tax treatment.")
        extra = _field(form, "Extra work amount")
        if extra is not None and not _meaningful(extra):
            requirements.append(("Extra work amount", "Enter the real extra amount or remove the extra line."))
    elif action == "prepare_recurring_next_date":
        require("Client", "Confirm the client.")
        require("Suggested booking date/time", "Confirm a real date and time.")
    elif action == "complete_job_setup":
        require("Client", "Confirm the client.")
        require("Date / time", "Choose a real date and time.")
        require("Worker", "Choose a worker or explicitly edit the draft to remain unassigned.")
    elif action == "prepare_overdue_followup":
        require("Client", "Confirm the client.")
        require("Outstanding amount", "Confirm the outstanding balance.")
        require("Due date", "Confirm the due date.")
        require("Prepared reminder", "Review the reminder wording.")
    elif action == "prepare_customer_reply":
        require("Client", "Confirm which client sent the message.")
        require("Original message", "The inbound message body is required.")
        require("Prepared reply", "Review or write the reply draft.")
    elif action == "review_odd_hours":
        require("Worker", "Confirm the worker.")
        require("Recorded hours", "Confirm the recorded hours.")
        issue = _text(_field(form, "Issue")).lower()
        if "open timer" in issue:
            require("End", "Enter or confirm the clock-off time.")
    elif action == "request_completion_proof":
        require("Job", "Confirm the job.")
        require("Missing evidence", "Identify the exact missing proof.")
        require("Staff request", "Review the proof request wording.")
    elif action == "prepare_client_memory":
        require("Client", "Confirm the client record.")
        require("Memory note", "Write a factual useful memory note.")
        memory_type = _text(_field(form, "Memory type")).lower()
        if "restricted" in memory_type or "access" in memory_type or "safety" in memory_type:
            require("Restricted visibility", "Confirm who may see this sensitive detail.")
    elif action == "review_accounting_export":
        require("GST / tax rate", "Confirm the GST/tax rate.")
        require("Tax treatment", "Confirm inclusive or exclusive tax treatment.")
        require("Recommendation", "Review the accounting recommendation.")

    return requirements


async def enforce_role_schema(db, result, ObjectId):
    created = list(result.get("slips") or [])
    existing = list(result.get("existing") or [])
    changed = 0

    for item in created + existing:
        action = _text(item.get("action_type"))
        if action in {"review_repeated_admin_gap", "daily_owner_brief"}:
            continue
        payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
        form = payload.get("prepared_form") if isinstance(payload.get("prepared_form"), dict) else {}
        requirements = _requirements(action, form)
        existing_required = payload.get("required_fields") if isinstance(payload.get("required_fields"), list) else []
        existing_missing = payload.get("missing") if isinstance(payload.get("missing"), list) else []
        required = list(dict.fromkeys([_text(value) for value in existing_required if _text(value)] + [label for label, _ in requirements]))
        missing = list(dict.fromkeys([_text(value) for value in existing_missing if _text(value)] + [reason for _, reason in requirements]))
        blocked = bool(required)
        unchanged = (
            payload.get("role_schema_guard") == ROLE_SCHEMA_GUARD
            and existing_required == required
            and existing_missing == missing
            and bool(payload.get("approval_blocked")) == blocked
        )
        if unchanged:
            continue

        payload["required_fields"] = required
        payload["missing"] = missing
        payload["approval_blocked"] = blocked
        payload["role_schema_guard"] = ROLE_SCHEMA_GUARD
        form["Owner check before approval"] = " · ".join(missing) if missing else "Required evidence is complete; the owner can still edit every field."
        payload["prepared_form"] = form
        item["payload"] = payload

        item_oid = _oid(ObjectId, item.get("id") or item.get("_id"))
        if item_oid is not None:
            await db.command_slips.update_one(
                {"_id": item_oid, "status": {"$in": OPEN_STATUSES}},
                {"$set": {
                    "payload.required_fields": required,
                    "payload.missing": missing,
                    "payload.approval_blocked": blocked,
                    "payload.role_schema_guard": ROLE_SCHEMA_GUARD,
                    "payload.prepared_form": form,
                    "updated_at": _now(),
                }, "$push": {"audit": {
                    "by": "human-mimic-role-schema-guard",
                    "role": payload.get("office_role") or "Office Manager",
                    "action": "required_evidence_checked",
                    "note": "Role-specific required evidence was checked before owner approval.",
                    "at": _now(),
                    "safety": SAFE_NOTE,
                }}},
            )
        changed += 1

    result["role_schema_guard"] = ROLE_SCHEMA_GUARD
    result["role_schema_updated_count"] = changed
    return result
