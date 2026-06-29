from __future__ import annotations

import churvox_field_truth_patch as base

_ORIGINAL_SAVE_PHOTO = base.save_photo


def hardened_normalize_steps(payload):
    """Proof should move forward only.

    A second device or stale local cache must not accidentally clear a proof step by posting false.
    Explicit clearing can be added later with a dedicated owner/admin route, not worker sync.
    """
    steps = {}
    raw_steps = payload.get("steps") if isinstance(payload, dict) else {}
    if isinstance(raw_steps, dict):
        for key, value in raw_steps.items():
            step = base.normalize_step_key(key)
            if step in base.PROOF_STEPS and bool(value):
                steps[step] = True
    for key, value in (payload or {}).items():
        step = base.normalize_step_key(key)
        if step in base.PROOF_STEPS and bool(value):
            steps[step] = True
    return steps


async def hardened_save_photo(db, user, ObjectId, job_id, payload):
    business_id = base.business_id_string(user)
    offline_token = base.clean((payload or {}).get("offline_token"))
    kind = base.lower((payload or {}).get("kind") or (payload or {}).get("type") or "proof")

    if not offline_token:
        return await _ORIGINAL_SAVE_PHOTO(db, user, ObjectId, job_id, payload)

    existing = None
    try:
        existing = await db.worker_proof_photos.find_one({
            "business_id": business_id,
            "job_id": str(job_id),
            "offline_token": offline_token,
        })
    except Exception:
        existing = None

    step = "before_photo" if "before" in kind else "after_photo" if "after" in kind else "worker_note"

    if existing:
        await base.save_passport(db, user, ObjectId, job_id, {"steps": {step: True}, "offline_token": offline_token})
        return existing

    now = base.now_utc()
    data = base.clean((payload or {}).get("photo_data") or (payload or {}).get("data_url") or "")
    doc = {
        "business_id": business_id,
        "job_id": str(job_id),
        "worker_id": base.user_id_string(user),
        "worker_name": base.clean(user.get("name") or user.get("full_name") or user.get("email")),
        "kind": kind,
        "filename": base.clean((payload or {}).get("filename") or f"{kind}-photo.jpg"),
        "mime_type": base.clean((payload or {}).get("mime_type") or "image/jpeg"),
        "size_bytes": int((payload or {}).get("size_bytes") or len(data) or 0),
        "photo_data": data,
        "offline_token": offline_token,
        "status": "uploaded",
        "source": "worker_offline_safe_queue",
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.worker_proof_photos.update_one(
            {"business_id": business_id, "job_id": str(job_id), "offline_token": offline_token},
            {"$set": doc},
            upsert=True,
        )
    except Exception:
        try:
            result = await db.worker_proof_photos.insert_one(dict(doc))
            doc["_id"] = result.inserted_id
        except Exception:
            pass
    await base.save_passport(db, user, ObjectId, job_id, {"steps": {step: True}, "offline_token": offline_token})
    return doc


base.normalize_steps = hardened_normalize_steps
base.save_photo = hardened_save_photo
