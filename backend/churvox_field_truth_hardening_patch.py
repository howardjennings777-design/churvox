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

    if offline_token:
        try:
            existing = await db.worker_proof_photos.find_one({
                "business_id": business_id,
                "job_id": str(job_id),
                "offline_token": offline_token,
            })
        except Exception:
            existing = None
        if existing:
            step = "before_photo" if "before" in kind else "after_photo" if "after" in kind else "worker_note"
            await base.save_passport(db, user, ObjectId, job_id, {"steps": {step: True}, "offline_token": offline_token})
            return existing

    doc = await _ORIGINAL_SAVE_PHOTO(db, user, ObjectId, job_id, payload)
    if offline_token:
        try:
            await db.worker_proof_photos.update_one(
                {"business_id": business_id, "job_id": str(job_id), "offline_token": offline_token},
                {"$setOnInsert": {**dict(doc), "offline_token": offline_token}},
                upsert=True,
            )
        except Exception:
            try:
                doc_id = doc.get("_id")
                if doc_id:
                    await db.worker_proof_photos.update_one({"_id": doc_id}, {"$set": {"offline_token": offline_token}})
                    doc["offline_token"] = offline_token
            except Exception:
                pass
    return doc


base.normalize_steps = hardened_normalize_steps
base.save_photo = hardened_save_photo
