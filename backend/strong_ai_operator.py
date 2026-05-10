import os
import json
import secrets
import asyncio
import urllib.request
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import Depends, HTTPException, Body
from pydantic import BaseModel


class StrongAiAskRequest(BaseModel):
    question: str


class StrongAiActionPatch(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    reason: Optional[str] = None
    proposed_payload: Optional[dict] = None


ALLOWED_ACTIONS = {
    "assign_worker_to_job",
    "create_draft_invoice",
    "prepare_invoice_reminder",
    "prepare_quote_follow_up",
    "convert_accepted_quote_to_job",
    "flag_missing_client_data",
    "flag_missing_job_proof",
    "flag_payroll_review",
    "suggest_schedule_conflict_fix",
    "suggest_myob_sync_ready",
    "suggest_sms_follow_up",
}

APPROVAL_ROLES = {"owner", "admin", "employer", "manager", "office_admin"}


def now():
    return datetime.now(timezone.utc)


def s(value):
    return str(value or "").strip()


def safe_doc(doc):
    if not doc:
        return doc
    out = {}
    for k, v in dict(doc).items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, list):
            out[k] = [safe_doc(x) if isinstance(x, dict) else str(x) if isinstance(x, ObjectId) else x for x in v]
        elif isinstance(v, dict):
            out[k] = safe_doc(v)
        else:
            out[k] = v
    return out


def safe_docs(items):
    return [safe_doc(x) for x in items or []]


def role_allowed(user, platform_owner_emails):
    role = s(user.get("role")).lower().replace(" ", "_")
    email = s(user.get("email")).lower()
    return (
        role in APPROVAL_ROLES
        or email in set(platform_owner_emails or [])
        or user.get("is_admin") is True
        or user.get("is_platform_owner") is True
    )


def action_id():
    return "aia_" + secrets.token_urlsafe(18).replace("-", "").replace("_", "")[:24]


def extract_ai_text(payload):
    if not isinstance(payload, dict):
        return ""
    if payload.get("choices"):
        msg = payload["choices"][0].get("message", {})
        content = msg.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(part.get("text", "") for part in content if isinstance(part, dict))
    if payload.get("output_text"):
        return payload["output_text"]
    return ""


async def call_openai_json(prompt, system):
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI Operator is not configured yet. Add OPENAI_API_KEY in Render.")

    models = [
        os.environ.get("AI_MODEL_PRIMARY"),
        os.environ.get("OPENAI_MODEL"),
        os.environ.get("AI_MODEL_REASONING"),
        os.environ.get("AI_MODEL_FAST"),
    ]
    models = [m for m in models if s(m)]
    if not models:
        raise HTTPException(status_code=503, detail="AI model is not configured yet. Add AI_MODEL_PRIMARY in Render.")

    temperature = float(os.environ.get("AI_TEMPERATURE", "0.2"))
    max_tokens = int(os.environ.get("AI_MAX_OUTPUT_TOKENS", "4000"))

    def do_call(model_name, token_key):
        body = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"},
            token_key: max_tokens,
        }

        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=65) as resp:
            return json.loads(resp.read().decode("utf-8"))

    last_error = None
    for model in models:
        for token_key in ["max_completion_tokens", "max_tokens"]:
            try:
                raw = await asyncio.to_thread(do_call, model, token_key)
                text = extract_ai_text(raw)
                if not text:
                    raise ValueError("AI returned empty output.")
                return json.loads(text)
            except Exception as exc:
                last_error = exc

    raise HTTPException(status_code=503, detail=f"AI model call failed. Check OPENAI_API_KEY and AI_MODEL_PRIMARY. Last error: {last_error}")


async def find_record(db, collection_name, business_id, record_id):
    if not record_id:
        return None
    q = {"business_id": str(business_id), "$or": [{"id": str(record_id)}]}
    try:
        q["$or"].append({"_id": ObjectId(str(record_id))})
    except Exception:
        pass
    return await db[collection_name].find_one(q)


async def business_snapshot(db, get_user_business_id, current_user):
    business_id = await get_user_business_id(current_user)

    async def grab(collection, extra=None, limit=80):
        q = {"business_id": str(business_id)}
        if extra:
            q.update(extra)
        try:
            return await db[collection].find(q).sort("created_at", -1).limit(limit).to_list(length=limit)
        except Exception:
            return []

    jobs = await grab("jobs", limit=140)
    quotes = await grab("quotes", limit=90)
    invoices = await grab("invoices", limit=90)
    clients = await grab("clients", limit=140)

    workers = []
    for collection in ["workers", "users", "team"]:
        try:
            workers.extend(await db[collection].find({
                "business_id": str(business_id),
                "$or": [{"role": "worker"}, {"role": "manager"}, {"role": "office_admin"}],
            }).limit(100).to_list(length=100))
        except Exception:
            pass

    def st(item):
        return s(item.get("status") or item.get("job_status") or item.get("invoice_status") or item.get("quote_status")).lower()

    unassigned_jobs = [j for j in jobs if not (j.get("assigned_worker_id") or j.get("worker_id") or j.get("assigned_to") or j.get("assigned_worker_name")) and st(j) not in {"completed", "done", "cancelled"}]
    completed_no_invoice = [j for j in jobs if (st(j) == "completed" or j.get("completed") is True or j.get("completed_at")) and not (j.get("invoice_id") or j.get("invoice_created"))]
    completed_no_proof = [j for j in jobs if (st(j) == "completed" or j.get("completed") is True or j.get("completed_at")) and not (j.get("photos") or j.get("photo_urls") or j.get("proof_photos") or j.get("worker_photos"))]
    open_quotes = [q for q in quotes if st(q) in {"draft", "sent", "pending", "open", ""}]
    accepted_quotes = [q for q in quotes if st(q) in {"accepted", "approved"} and not q.get("converted_to_job_id")]
    money_items = [i for i in invoices if st(i) in {"draft", "sent", "overdue", "unpaid", "pending", ""}]
    missing_clients = [c for c in clients if not c.get("email") or not c.get("phone") or not c.get("address")]

    return {
        "business_id": str(business_id),
        "counts": {
            "jobs": len(jobs),
            "unassigned_jobs": len(unassigned_jobs),
            "completed_jobs_without_invoice": len(completed_no_invoice),
            "completed_jobs_without_proof": len(completed_no_proof),
            "open_quotes": len(open_quotes),
            "accepted_quotes_not_converted": len(accepted_quotes),
            "money_items": len(money_items),
            "clients_missing_data": len(missing_clients),
            "workers": len(workers),
        },
        "unassigned_jobs": safe_docs(unassigned_jobs[:35]),
        "completed_jobs_without_invoice": safe_docs(completed_no_invoice[:35]),
        "completed_jobs_without_proof": safe_docs(completed_no_proof[:35]),
        "open_quotes": safe_docs(open_quotes[:30]),
        "accepted_quotes_not_converted": safe_docs(accepted_quotes[:30]),
        "money_items": safe_docs(money_items[:30]),
        "clients_missing_data": safe_docs(missing_clients[:35]),
        "workers": safe_docs(workers[:60]),
    }


def normalize_actions(ai_payload, business_id, source):
    raw_actions = ai_payload.get("actions") if isinstance(ai_payload, dict) else []
    if not isinstance(raw_actions, list):
        raw_actions = []

    actions = []
    for raw in raw_actions[:20]:
        if not isinstance(raw, dict):
            continue

        action_type = s(raw.get("action_type")).lower()
        if action_type not in ALLOWED_ACTIONS:
            continue

        risk = s(raw.get("risk_level") or "medium").lower()
        if risk not in {"low", "medium", "high"}:
            risk = "medium"

        actions.append({
            "id": action_id(),
            "business_id": str(business_id),
            "module": s(raw.get("module") or "ai_operator"),
            "action_type": action_type,
            "title": s(raw.get("title") or "AI prepared action"),
            "summary": s(raw.get("summary") or raw.get("reason") or "AI prepared this for owner review."),
            "reason": s(raw.get("reason") or raw.get("summary") or ""),
            "confidence": raw.get("confidence") if isinstance(raw.get("confidence"), (int, float)) else 0.75,
            "risk_level": risk,
            "approval_required": True,
            "target_record_type": s(raw.get("target_record_type")),
            "target_record_id": s(raw.get("target_record_id")),
            "proposed_payload": raw.get("proposed_payload") if isinstance(raw.get("proposed_payload"), dict) else {},
            "status": "pending",
            "queue_status": "pending",
            "source": source,
            "created_at": now(),
            "updated_at": now(),
        })
    return actions


async def execute_action(db, get_user_business_id, current_user, action, default_gst_rate):
    business_id = await get_user_business_id(current_user)
    action_type = s(action.get("action_type")).lower()
    payload = action.get("proposed_payload") or {}
    target_id = s(action.get("target_record_id") or payload.get("target_record_id") or payload.get("job_id") or payload.get("invoice_id") or payload.get("quote_id") or payload.get("client_id"))

    if action_type not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=400, detail="AI action type is not allowed.")

    if action_type == "assign_worker_to_job":
        job_id = s(payload.get("job_id") or target_id)
        worker_id = s(payload.get("worker_id") or payload.get("assigned_worker_id"))
        worker_name = s(payload.get("worker_name") or payload.get("assigned_worker_name"))

        if not job_id or not worker_id:
            raise HTTPException(status_code=400, detail="Missing job_id or worker_id.")

        worker = await find_record(db, "workers", business_id, worker_id) or await find_record(db, "users", business_id, worker_id)
        if worker and not worker_name:
            worker_name = worker.get("name") or worker.get("full_name") or worker.get("email") or ""

        q = {"business_id": str(business_id), "$or": [{"id": job_id}]}
        try:
            q["$or"].append({"_id": ObjectId(job_id)})
        except Exception:
            pass

        result = await db.jobs.update_one(q, {"$set": {
            "assigned_worker_id": worker_id,
            "worker_id": worker_id,
            "assigned_worker_name": worker_name,
            "status": "assigned",
            "updated_at": now(),
        }})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found.")
        return "Worker assigned to job."

    if action_type == "create_draft_invoice":
        job_id = s(payload.get("job_id") or target_id)
        job = await find_record(db, "jobs", business_id, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found.")

        subtotal = float(payload.get("subtotal") or payload.get("amount") or job.get("price") or job.get("total") or 0)
        client_name = job.get("customer_name") or job.get("client_name") or "Client"
        description = s(payload.get("description") or job.get("ai_invoice_description") or job.get("invoice_description_draft") or f"{job.get('title') or 'Service work'} completed for {client_name}.")

        invoice = {
            "business_id": str(business_id),
            "job_id": str(job.get("_id") or job.get("id") or job_id),
            "source_job_id": str(job.get("_id") or job.get("id") or job_id),
            "customer_name": payload.get("customer_name") or client_name,
            "customer_email": payload.get("customer_email") or job.get("customer_email") or job.get("client_email") or "",
            "address": payload.get("address") or job.get("address") or job.get("job_address") or "",
            "description": description,
            "subtotal": subtotal,
            "gst_rate": float(payload.get("gst_rate") or default_gst_rate or 15),
            "status": "draft",
            "source": "ai_operator",
            "created_at": now(),
            "updated_at": now(),
        }
        await db.invoices.insert_one(invoice)
        await db.jobs.update_one({"_id": job.get("_id")}, {"$set": {"invoice_created": True, "updated_at": now()}})
        return "Draft invoice created."

    if action_type == "flag_missing_client_data":
        client = await find_record(db, "clients", business_id, s(payload.get("client_id") or target_id))
        if client:
            await db.clients.update_one({"_id": client.get("_id")}, {"$set": {"ai_review_needed": True, "ai_review_reason": action.get("reason"), "updated_at": now()}})
        return "Client data flagged."

    if action_type == "flag_missing_job_proof":
        job = await find_record(db, "jobs", business_id, s(payload.get("job_id") or target_id))
        if job:
            await db.jobs.update_one({"_id": job.get("_id")}, {"$set": {"ai_proof_review_needed": True, "ai_review_reason": action.get("reason"), "updated_at": now()}})
        return "Job proof issue flagged."

    if action_type == "flag_payroll_review":
        job = await find_record(db, "jobs", business_id, s(payload.get("job_id") or target_id))
        if job:
            await db.jobs.update_one({"_id": job.get("_id")}, {"$set": {"payroll_review_needed": True, "payroll_review_reason": action.get("reason"), "updated_at": now()}})
        return "Payroll review flagged."

    return "AI action saved for owner review. No risky action was auto-executed."


def register_strong_ai_operator(api_router, db, get_current_user, get_user_business_id, default_gst_rate=15, platform_owner_emails=None):
    platform_owner_emails = platform_owner_emails or []

    @api_router.get("/ai/operator/v3/strong/status")
    async def strong_ai_status(current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        return {
            "configured": bool((os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_API_KEY")) and os.environ.get("AI_MODEL_PRIMARY")),
            "primary_model": os.environ.get("AI_MODEL_PRIMARY") or "",
            "enabled": os.environ.get("AI_OPERATOR_ENABLED", "true").lower() != "false",
            "approval_required": True,
        }

    @api_router.get("/ai/operator/v3/strong/queue")
    async def strong_ai_queue(current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        business_id = await get_user_business_id(current_user)
        actions = await db.ai_operator_actions.find({
            "business_id": str(business_id),
            "status": {"$in": ["pending", "edited", "needs_review", ""]},
        }).sort("created_at", -1).limit(80).to_list(length=80)
        return {"actions": safe_docs(actions)}

    @api_router.post("/ai/operator/v3/strong/prepare-today")
    async def strong_ai_prepare_today(current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        if os.environ.get("AI_OPERATOR_ENABLED", "true").lower() == "false":
            raise HTTPException(status_code=503, detail="AI Operator is disabled.")

        snapshot = await business_snapshot(db, get_user_business_id, current_user)
        business_id = snapshot["business_id"]

        system = """You are Churvox AI Operator, a powerful approval-first AI brain for trade/service businesses.
Return JSON only.
Do not send messages, delete records, change payroll, charge customers, change pricing, change billing, or do destructive accounting writes.
Prepare real owner-approved actions only.

Return:
{"actions":[{"module":"dispatch|jobs|quotes|invoices|clients|payroll|proof|messages|integrations","action_type":"assign_worker_to_job|create_draft_invoice|prepare_invoice_reminder|prepare_quote_follow_up|convert_accepted_quote_to_job|flag_missing_client_data|flag_missing_job_proof|flag_payroll_review|suggest_schedule_conflict_fix|suggest_myob_sync_ready|suggest_sms_follow_up","title":"short title","summary":"what should be done","reason":"why this is best","confidence":0.8,"risk_level":"low|medium|high","target_record_type":"job|invoice|quote|client|worker|business","target_record_id":"id from snapshot","proposed_payload":{}}]}

Prioritise unassigned jobs, draft invoices from completed jobs, invoice reminders, accepted quote conversion, missing proof, missing client data, and payroll flags.
For worker matching, use availability, region/area, workload, skills/job type if present.
"""
        prompt = "Create the strongest owner approval queue from this live Churvox snapshot:\n" + json.dumps(snapshot, default=str)[:70000]
        ai_payload = await call_openai_json(prompt, system)
        actions = normalize_actions(ai_payload, business_id, "strong_prepare_today")

        if actions:
            await db.ai_operator_actions.insert_many(actions)

        return {"actions": safe_docs(actions), "message": f"AI prepared {len(actions)} owner actions."}

    @api_router.post("/ai/operator/v3/strong/run-daily-check")
    async def strong_ai_run_daily_check(current_user: dict = Depends(get_current_user)):
        return await strong_ai_prepare_today(current_user)

    @api_router.post("/ai/operator/v3/strong/scheduled-run")
    async def strong_ai_scheduled_run(current_user: dict = Depends(get_current_user)):
        return await strong_ai_prepare_today(current_user)

    @api_router.post("/ai/operator/v3/strong/pages/{page}/prepare")
    async def strong_ai_prepare_page(page: str, current_user: dict = Depends(get_current_user)):
        return await strong_ai_prepare_today(current_user)

    @api_router.post("/ai/operator/v3/strong/ask")
    async def strong_ai_ask(payload: StrongAiAskRequest, current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        snapshot = await business_snapshot(db, get_user_business_id, current_user)
        system = """You are Churvox AI Operator. Answer from the business snapshot only.
Return JSON only: {"answer":"clear answer","recommended_next_steps":["step"],"actions":[]}
Never claim you sent, deleted, charged, synced, or changed payroll/pricing without owner approval.
"""
        result = await call_openai_json(f"Question: {payload.question}\n\nSnapshot:\n{json.dumps(snapshot, default=str)[:70000]}", system)
        return {
            "answer": result.get("answer") or "AI reviewed the business.",
            "recommended_next_steps": result.get("recommended_next_steps") or [],
            "actions": result.get("actions") or [],
        }

    @api_router.patch("/ai/operator/v3/strong/actions/{aid}")
    async def strong_ai_patch_action(aid: str, payload: StrongAiActionPatch, current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        business_id = await get_user_business_id(current_user)
        update = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}
        update.update({"status": "edited", "queue_status": "edited", "edited_by_owner": True, "updated_at": now()})
        result = await db.ai_operator_actions.update_one({"business_id": str(business_id), "id": aid}, {"$set": update})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="AI action not found.")
        action = await db.ai_operator_actions.find_one({"business_id": str(business_id), "id": aid})
        return {"action": safe_doc(action)}

    @api_router.delete("/ai/operator/v3/strong/actions/{aid}")
    async def strong_ai_delete_action(aid: str, current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        business_id = await get_user_business_id(current_user)
        result = await db.ai_operator_actions.update_one({"business_id": str(business_id), "id": aid}, {"$set": {"status": "deleted", "queue_status": "deleted", "updated_at": now()}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="AI action not found.")
        return {"message": "AI action deleted."}

    @api_router.post("/ai/operator/v3/strong/actions/{aid}/approve")
    async def strong_ai_approve_action(aid: str, payload: dict = Body(default={}), current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        business_id = await get_user_business_id(current_user)
        action = await db.ai_operator_actions.find_one({"business_id": str(business_id), "id": aid})

        if not action:
            incoming = (payload or {}).get("action") or {}
            if incoming and aid in {incoming.get("id"), incoming.get("action_id")}:
                action = dict(incoming)
                action["business_id"] = str(business_id)
            else:
                raise HTTPException(status_code=404, detail="AI action not found.")

        if s(action.get("risk_level")).lower() == "high":
            raise HTTPException(status_code=403, detail="High-risk AI action requires manual handling.")

        message = await execute_action(db, get_user_business_id, current_user, action, default_gst_rate)
        await db.ai_operator_actions.update_one({"business_id": str(business_id), "id": aid}, {"$set": {
            "status": "completed",
            "queue_status": "completed",
            "approved_by": str(current_user.get("_id") or current_user.get("id") or current_user.get("email")),
            "approved_at": now(),
            "completed_message": message,
            "updated_at": now(),
        }})
        return {"message": message, "action_id": aid}

    @api_router.post("/ai/operator/v3/strong/actions/{aid}/reject")
    async def strong_ai_reject_action(aid: str, current_user: dict = Depends(get_current_user)):
        if not role_allowed(current_user, platform_owner_emails):
            raise HTTPException(status_code=403, detail="AI Operator is owner/manager/admin only.")
        business_id = await get_user_business_id(current_user)
        await db.ai_operator_actions.update_one({"business_id": str(business_id), "id": aid}, {"$set": {"status": "rejected", "queue_status": "rejected", "updated_at": now()}})
        return {"message": "AI action rejected."}
