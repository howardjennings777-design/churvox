from __future__ import annotations

from datetime import datetime, timezone

import churvox_onsite_patch as onsite_patch
import churvox_field_truth_patch as field_truth

_ORIGINAL_ONSITE = onsite_patch.onsite_payload


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    return field_truth.json_safe(value)


def bid(user):
    return field_truth.business_id_string(user)


async def recent(collection, query, limit=80):
    try:
        return await collection.find(query).sort("updated_at", -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


async def onsite_payload(db, user):
    payload = await _ORIGINAL_ONSITE(db, user)
    rows = payload.get("onsite") if isinstance(payload.get("onsite"), list) else []
    all_team = payload.get("all_team") if isinstance(payload.get("all_team"), list) else []
    seen = {clean(row.get("id") or row.get("worker_id") or row.get("worker_email") or row.get("name")) for row in rows + all_team}
    signals = await recent(db.worker_gps_status, {"business_id": bid(user)}, 120)
    for sig in signals:
        state = lower(sig.get("state"))
        if state in {"off", "inactive", "stopped"}:
            continue
        key = clean(sig.get("worker_id") or sig.get("user_id") or sig.get("worker_email") or sig.get("worker_name"))
        if key and key in seen:
            continue
        location = clean(sig.get("location") or sig.get("map_query"))
        row = {
            "id": key,
            "name": clean(sig.get("worker_name") or sig.get("worker_email") or "Worker"),
            "role": "Worker",
            "status": "Clocked in",
            "active": True,
            "job": clean(sig.get("job_title") or sig.get("job_id") or "Current job"),
            "jobs": [],
            "gps": location,
            "location": location,
            "map_query": clean(sig.get("map_query") or location),
            "start": clean(sig.get("started_at") or sig.get("updated_at")),
            "proof": "Clock-in signal received",
            "messages": "No unread messages",
            "timesheet": "Clocked in",
            "updated_at": sig.get("updated_at") or now_utc(),
            "source": "worker_signal",
        }
        rows.append(row)
        all_team.append(row)
        seen.add(key)
    payload["onsite"] = json_safe(rows)
    payload["all_team"] = json_safe(all_team)
    counts = dict(payload.get("counts") or {})
    counts["onsite"] = len(rows)
    counts["team"] = len(all_team)
    payload["counts"] = counts
    return json_safe(payload)


onsite_patch.onsite_payload = onsite_payload
