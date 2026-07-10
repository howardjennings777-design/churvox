from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone


OPEN_STATUSES = ["open", "edited", "pending", "ready", "waiting", "snoozed"]
SUMMARY_GUARD = "strict-surviving-queue-summary-v1"
SAFE_NOTE = "Summary was corrected inside Command only. No business record, message, payment or accounting record changed."


def _now():
    return datetime.now(timezone.utc)


def _text(value):
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def _oid(ObjectId, value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _action(item):
    return _text((item or {}).get("action_type"))


def _role(item):
    payload = (item or {}).get("payload") if isinstance((item or {}).get("payload"), dict) else {}
    return _text((item or {}).get("office_role") or payload.get("office_role") or "Unknown")


def _item_id(item):
    return _text((item or {}).get("id") or (item or {}).get("_id"))


def _issue_counts(items):
    map_actions = {
        "complete_job_setup": "incomplete_jobs",
        "prepare_invoice": "missing_invoices",
        "request_completion_proof": "missing_proof",
        "review_odd_hours": "odd_hours",
    }
    counts = {value: 0 for value in map_actions.values()}
    for item in items:
        key = map_actions.get(_action(item))
        if key:
            counts[key] += 1
    return counts


def _strong_pattern(counts):
    values = list(counts.values())
    return max(values or [0]) >= 3 or sum(1 for value in values if value >= 2) >= 2


def _pattern_text(counts):
    labels = {
        "incomplete_jobs": "open jobs missing setup",
        "missing_invoices": "completed jobs needing invoice review",
        "missing_proof": "completed jobs missing proof",
        "odd_hours": "unusual or incomplete timers",
    }
    parts = [f"{count} {labels[key]}" for key, count in counts.items() if count]
    return "; ".join(parts) or "No repeated strict issue remains"


def _top_area(counts):
    if not counts or not any(counts.values()):
        return "No repeated pressure area"
    key, count = max(counts.items(), key=lambda item: item[1])
    return f"{key.replace('_', ' ').title()} ({count})"


async def _supersede(db, ObjectId, item, reason):
    item_oid = _oid(ObjectId, _item_id(item))
    if item_oid is None:
        return False
    result = await db.command_slips.update_one(
        {"_id": item_oid, "status": {"$in": OPEN_STATUSES}},
        {"$set": {
            "status": "superseded",
            "superseded_at": _now(),
            "superseded_reason": reason,
            "updated_at": _now(),
        }, "$push": {"audit": {
            "by": "human-mimic-summary-finalizer",
            "role": "Office Manager",
            "action": "superseded",
            "note": reason,
            "at": _now(),
            "safety": SAFE_NOTE,
        }}},
    )
    return bool(getattr(result, "modified_count", 0))


async def _update_summary(db, ObjectId, item, prepared_fields, evidence, confidence_reasons):
    item_oid = _oid(ObjectId, _item_id(item))
    if item_oid is None:
        return
    payload = item.get("payload") if isinstance(item.get("payload"), dict) else {}
    prepared = payload.get("prepared_form") if isinstance(payload.get("prepared_form"), dict) else {}
    prepared.update(prepared_fields)
    payload["prepared_form"] = prepared
    payload["evidence"] = list(evidence)
    payload["confidence"] = {"score": 0.96, "why": list(confidence_reasons)}
    payload["summary_guard"] = SUMMARY_GUARD
    item["payload"] = payload
    item["updated_at"] = _now().isoformat()
    await db.command_slips.update_one(
        {"_id": item_oid, "status": {"$in": OPEN_STATUSES}},
        {"$set": {
            "payload.prepared_form": prepared,
            "payload.evidence": list(evidence),
            "payload.confidence": payload["confidence"],
            "payload.summary_guard": SUMMARY_GUARD,
            "updated_at": _now(),
        }, "$push": {"audit": {
            "by": "human-mimic-summary-finalizer",
            "role": _role(item),
            "action": "summary_grounded_in_strict_queue",
            "note": "Manager summary was recalculated from decisions that survived strict validation.",
            "at": _now(),
            "safety": SAFE_NOTE,
        }}},
    )


async def finalize_strict_queue(db, user, result, ObjectId):
    created = list(result.get("slips") or [])
    existing = list(result.get("existing") or [])
    all_items = created + existing
    core = [item for item in all_items if _action(item) not in {"review_repeated_admin_gap", "daily_owner_brief"}]
    counts = _issue_counts(core)
    pattern = _pattern_text(counts)
    core_count = len(core)
    remove_ids = set()

    for item in all_items:
        action = _action(item)
        if action == "review_repeated_admin_gap":
            if not _strong_pattern(counts):
                if await _supersede(db, ObjectId, item, "The strict surviving queue no longer shows a repeated-enough pattern. " + SAFE_NOTE):
                    remove_ids.add(_item_id(item))
            else:
                await _update_summary(
                    db,
                    ObjectId,
                    item,
                    {
                        "Pattern found": pattern,
                        "Evidence threshold": "At least three repeats in one category, or two categories repeated twice",
                        "Scope": "Draft process suggestion only; no rule or automation changed",
                    },
                    [f"{key.replace('_', ' ')}: {value}" for key, value in counts.items() if value],
                    ["Only strict surviving decisions counted", "One-off false candidates excluded", "No automation changed"],
                )
        elif action == "daily_owner_brief":
            if core_count < 2:
                if await _supersede(db, ObjectId, item, "Fewer than two strict decisions remain, so a daily owner briefing would add noise. " + SAFE_NOTE):
                    remove_ids.add(_item_id(item))
            else:
                await _update_summary(
                    db,
                    ObjectId,
                    item,
                    {
                        "Prepared decisions": str(core_count),
                        "Top pressure area": _top_area(counts),
                        "Owner focus": "Review high-risk money and blocked-work decisions first; approve only complete evidence",
                    },
                    [f"Strict surviving decisions: {core_count}"] + [f"{key.replace('_', ' ')}: {value}" for key, value in counts.items() if value],
                    ["Only strict surviving decisions counted", "Filtered duplicates and weak candidates excluded", "No action taken automatically"],
                )

    result["slips"] = [item for item in created if _item_id(item) not in remove_ids]
    result["existing"] = [item for item in existing if _item_id(item) not in remove_ids]
    result["created_count"] = len(result["slips"])
    result["existing_count"] = len(result["existing"])
    result["superseded_count"] = int(result.get("superseded_count") or 0) + len(remove_ids)
    final_items = result["slips"] + result["existing"]
    result["role_counts"] = dict(Counter(_role(item) for item in final_items))
    result["summary_guard"] = SUMMARY_GUARD
    return result
