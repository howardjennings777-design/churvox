from datetime import datetime, timezone

from bson import ObjectId

from ai_operator.policy import classify_action


def _now():
    return datetime.now(timezone.utc)


def _sid(value):
    return str(value or "")


def _to_object_id(value):
    value = _sid(value)
    if ObjectId.is_valid(value):
        return ObjectId(value)
    return None


def _record_lookup(record_id, business_id):
    record_id = _sid(record_id)
    ors = [
        {"id": record_id},
        {"job_id": record_id},
        {"invoice_id": record_id},
        {"quote_id": record_id},
    ]

    oid = _to_object_id(record_id)
    if oid:
        ors.append({"_id": oid})

    return {
        "business_id": str(business_id),
        "$or": ors,
    }


def _number(value, default=0.0):
    try:
        num = float(value)
        return num
    except (TypeError, ValueError):
        return float(default)


async def _audit(db, business_id, user, action, event, result=None):
    await db.ai_operator_audit_log.insert_one({
        "business_id": str(business_id),
        "action_id": _sid(action.get("id") or action.get("_id")),
        "action_type": action.get("action_type"),
        "event": event,
        "result": result or {},
        "actor": _sid(user.get("_id") or user.get("id")),
        "target_collection": action.get("target_collection"),
        "target_id": _sid(action.get("target_id")),
        "created_at": _now(),
    })


async def execute_approved_action(db, business_id, user, action, approved_payload=None):
    payload = {**(action.get("suggested_payload") or {}), **(approved_payload or {})}
    classification = classify_action(action.get("action_type"), {
        **action,
        "suggested_payload": payload,
    })

    if classification.get("blocked"):
        raise ValueError(classification.get("reason") or "Action blocked by AI policy.")

    t = action.get("action_type")

    if t == "assign_worker":
        job_id = payload.get("job_id") or action.get("target_id")
        worker_id = payload.get("worker_id")
        worker_name = payload.get("worker_name") or payload.get("assigned_worker_name")

        if not job_id:
            raise ValueError("Missing job_id for worker assignment.")
        if not (worker_id or worker_name):
            raise ValueError("Missing worker details. Provide worker_id or worker_name.")

        result = await db.jobs.update_one(
            _record_lookup(job_id, business_id),
            {
                "$set": {
                    "worker_id": worker_id,
                    "assigned_worker_id": worker_id,
                    "worker_name": worker_name,
                    "assigned_worker_name": worker_name,
                    "updated_at": _now(),
                    "ai_last_executed_at": _now(),
                }
            },
        )

        if result.matched_count == 0:
            raise ValueError("Job not found in this business, so AI could not assign the worker.")

        execution_result = {
            "ok": True,
            "action_type": t,
            "matched_count": result.matched_count,
            "modified_count": result.modified_count,
            "job_id": _sid(job_id),
            "worker_id": _sid(worker_id),
        }

    elif t == "create_draft_invoice":
        job_id = payload.get("job_id") or action.get("target_id")
        subtotal = _number(payload.get("subtotal"), default=0.0)
        gst_rate = _number(payload.get("gst_rate"), default=0.1)
        gst_amount = round(subtotal * gst_rate, 2)
        total = round(subtotal + gst_amount, 2)

        now = _now()
        invoice = {
            "business_id": str(business_id),
            "job_id": _sid(job_id),
            "source_job_id": _sid(job_id),
            "client_id": _sid(payload.get("client_id")),
            "client_name": payload.get("client_name"),
            "customer_name": payload.get("customer_name") or payload.get("client_name"),
            "customer_email": payload.get("customer_email"),
            "description": payload.get("description"),
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "total": total,
            "status": "draft",
            "created_by_ai": True,
            "ai_source_action_id": _sid(action.get("id") or action.get("_id")),
            "created_at": now,
            "updated_at": now,
        }
        inserted = await db.invoices.insert_one(invoice)
        invoice_id = str(inserted.inserted_id)

        job_update_result = await db.jobs.update_one(
            _record_lookup(job_id, business_id),
            {
                "$set": {
                    "invoice_id": invoice_id,
                    "draft_invoice_id": invoice_id,
                    "ai_invoice_prepared_at": _now(),
                    "updated_at": _now(),
                }
            },
        )

        execution_result = {
            "ok": True,
            "action_type": t,
            "invoice_id": invoice_id,
            "job_matched_count": job_update_result.matched_count,
        }

    elif t in {"draft_invoice_reminder", "draft_quote_followup"}:
        await db.ai_operator_drafts.insert_one({
            "business_id": str(business_id),
            "action_type": t,
            "target_id": _sid(action.get("target_id")),
            "payload": payload,
            "status": "draft",
            "created_by_ai": True,
            "created_at": _now(),
        })
        execution_result = {"ok": True, "action_type": t, "status": "draft"}

    elif t in {"data_quality_fix", "schedule_conflict_warning", "ai_setup_task"}:
        execution_result = {"ok": True, "action_type": t, "review_only": True}

    else:
        raise ValueError("Unsupported action type")

    await _audit(db, business_id, user, action, "backend_executed", execution_result)
    return execution_result
