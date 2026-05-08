from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def serialise_record(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not record:
        return {}
    output = dict(record)
    if "_id" in output:
        output["id"] = str(output.pop("_id"))
    for key, value in list(output.items()):
        if hasattr(value, "isoformat"):
            output[key] = value.isoformat()
    return output


def build_ai_action(
    *,
    business_id: str,
    action_type: str,
    module: str,
    title: str,
    summary: str,
    reason: str,
    target_record_type: str,
    target_record_id: str,
    suggested_payload: Optional[Dict[str, Any]] = None,
    preview_text: str = "",
    confidence: int = 82,
    risk_level: str = "low",
    deep_link: str = "",
) -> Dict[str, Any]:
    return {
        "id": str(uuid4()),
        "business_id": str(business_id),
        "action_type": action_type,
        "module": module,
        "title": title,
        "summary": summary,
        "reason": reason,
        "confidence": confidence,
        "risk_level": risk_level,
        "status": "pending",
        "target_record_type": target_record_type,
        "target_record_id": str(target_record_id or ""),
        "suggested_payload": suggested_payload or {},
        "preview_text": preview_text,
        "created_by_ai": True,
        "created_at": utc_now_iso(),
        "approved_by": None,
        "approved_at": None,
        "executed_at": None,
        "failure_reason": "",
        "deep_link": deep_link,
        "modal_payload": {},
        "audit_log": [
            {
                "at": utc_now_iso(),
                "event": "ai_action_prepared",
                "message": "AI prepared this action for owner approval.",
            }
        ],
    }


async def load_business_state(db: Any, business_id: str) -> Dict[str, List[Dict[str, Any]]]:
    """Load the core business state used by the AI Operator.

    The queries are intentionally defensive because the current Churvox schema has evolved over time.
    Every query is business-scoped.
    """
    limit = 120
    state: Dict[str, List[Dict[str, Any]]] = {
        "jobs": [],
        "clients": [],
        "quotes": [],
        "invoices": [],
        "workers": [],
    }

    async def safe_list(collection_name: str, query: Dict[str, Any], sort_key: str = "created_at"):
        try:
            collection = getattr(db, collection_name)
            cursor = collection.find(query).sort(sort_key, -1).limit(limit)
            return [serialise_record(item) for item in await cursor.to_list(length=limit)]
        except Exception:
            return []

    scoped = {"business_id": str(business_id)}
    state["jobs"] = await safe_list("jobs", scoped, "scheduled_date")
    state["clients"] = await safe_list("clients", scoped, "created_at")
    state["quotes"] = await safe_list("quotes", scoped, "created_at")
    state["invoices"] = await safe_list("invoices", scoped, "created_at")
    state["workers"] = await safe_list("workers", scoped, "name")

    # Some team members are stored in users/team collections on older builds.
    if not state["workers"]:
        state["workers"] = await safe_list("users", {"business_id": str(business_id), "role": {"$in": ["worker", "manager", "office_admin"]}}, "name")

    return state


def job_is_unassigned(job: Dict[str, Any]) -> bool:
    worker_id = job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to")
    status = safe_text(job.get("status") or job.get("job_status") or job.get("workflow_status")).lower()
    return not worker_id and status not in {"completed", "cancelled", "paid"}


def job_is_completed(job: Dict[str, Any]) -> bool:
    status = safe_text(job.get("status") or job.get("job_status") or job.get("workflow_status")).lower()
    return status in {"completed", "done"} or bool(job.get("completed") or job.get("completed_at"))


def invoice_is_overdue(invoice: Dict[str, Any]) -> bool:
    status = safe_text(invoice.get("status")).lower()
    if status == "overdue":
        return True
    if status in {"paid", "cancelled", "void"}:
        return False
    due_at = invoice.get("due_date") or invoice.get("due_at")
    if not due_at:
        return False
    try:
        if isinstance(due_at, str):
            due_at = datetime.fromisoformat(due_at.replace("Z", "+00:00"))
        return due_at < datetime.now(timezone.utc)
    except Exception:
        return False


def quote_needs_followup(quote: Dict[str, Any]) -> bool:
    status = safe_text(quote.get("status")).lower()
    return status in {"sent", "pending", "viewed"} and not quote.get("accepted_at") and not quote.get("declined_at")


def _record_id(record: Dict[str, Any]) -> str:
    return safe_text(record.get("id") or record.get("_id") or record.get("user_id") or record.get("email") or record.get("name"))


def _normalise_day(value: Any) -> str:
    text = safe_text(value)
    return text[:10] if text else ""


def _worker_name(worker: Optional[Dict[str, Any]]) -> str:
    if not worker:
        return "best available worker"
    return safe_text(worker.get("name") or worker.get("full_name") or worker.get("display_name") or worker.get("email"), "best available worker")


def _worker_skills(worker: Dict[str, Any]) -> str:
    raw = worker.get("skills") or worker.get("trades") or worker.get("job_types") or worker.get("experience") or []
    if isinstance(raw, list):
        return " ".join(str(x).lower() for x in raw)
    return str(raw or "").lower()


def _assigned_worker_id(job: Dict[str, Any]) -> str:
    return safe_text(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to"))


def _is_active_job(job: Dict[str, Any]) -> bool:
    status = safe_text(job.get("status") or job.get("job_status") or job.get("workflow_status")).lower()
    return status not in {"completed", "done", "cancelled", "paid", "archived"}


def score_worker_for_job(worker: Dict[str, Any], job: Dict[str, Any], jobs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Return a practical dispatch score with explainable factors.

    This is deterministic and approval-first. It prepares the best recommendation, but does not assign until the owner approves.
    """
    worker_id = _record_id(worker)
    job_region = safe_text(job.get("region") or job.get("area") or job.get("suburb") or job.get("city")).lower()
    job_address = safe_text(job.get("address") or job.get("job_address") or job.get("service_address")).lower()
    job_type = safe_text(job.get("job_type") or job.get("service_type") or job.get("trade") or job.get("title") or job.get("name")).lower()
    job_day = _normalise_day(job.get("scheduled_date") or job.get("start_time") or job.get("date"))

    worker_region = safe_text(worker.get("region") or worker.get("area") or worker.get("suburb") or worker.get("city")).lower()
    worker_status = safe_text(worker.get("status") or worker.get("availability") or worker.get("work_status")).lower()
    skills = _worker_skills(worker)

    assigned_jobs = [j for j in jobs if _assigned_worker_id(j) == worker_id and _is_active_job(j)]
    same_day_jobs = [j for j in assigned_jobs if job_day and _normalise_day(j.get("scheduled_date") or j.get("start_time") or j.get("date")) == job_day]

    score = 50
    reasons: List[str] = []
    warnings: List[str] = []

    if worker_status in {"active", "available", "online", "ready"}:
        score += 18
        reasons.append("worker appears active/available")
    elif worker_status in {"inactive", "offline", "unavailable", "away"}:
        score -= 35
        warnings.append("worker may be unavailable")

    if job_region and worker_region and job_region == worker_region:
        score += 24
        reasons.append("same region")
    elif job_region and worker_region and job_region != worker_region:
        score -= 7
        warnings.append("different region")
    elif job_address and worker_region and worker_region in job_address:
        score += 16
        reasons.append("address appears near worker area")

    if job_type and skills and any(part in skills for part in job_type.split() if len(part) >= 4):
        score += 22
        reasons.append("job type matches worker skills/history")

    if not assigned_jobs:
        score += 18
        reasons.append("no active workload found")
    elif len(assigned_jobs) <= 2:
        score += 8
        reasons.append("light workload")
    else:
        score -= min(28, len(assigned_jobs) * 5)
        warnings.append(f"already has {len(assigned_jobs)} active jobs")

    if same_day_jobs:
        score -= min(35, len(same_day_jobs) * 15)
        warnings.append(f"{len(same_day_jobs)} same-day job(s) may conflict")
    else:
        reasons.append("no same-day clash found")

    score = max(0, min(100, score))
    return {
        "worker": worker,
        "score": score,
        "reasons": reasons or ["best available option from current data"],
        "warnings": warnings,
        "workload": len(assigned_jobs),
        "same_day_jobs": len(same_day_jobs),
    }


def choose_worker_for_job(workers: List[Dict[str, Any]], job: Dict[str, Any], jobs: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    if not workers:
        return None
    scored = [score_worker_for_job(worker, job, jobs or []) for worker in workers]
    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored[0]


async def prepare_ai_actions(db: Any, business_id: str) -> List[Dict[str, Any]]:
    state = await load_business_state(db, business_id)
    actions: List[Dict[str, Any]] = []

    for job in state["jobs"]:
        job_id = job.get("id") or job.get("job_number") or job.get("title") or "job"
        title = safe_text(job.get("title") or job.get("name") or job.get("job_type"), "Job")
        client = safe_text(job.get("client_name") or job.get("customer_name") or job.get("customer") or job.get("client"), "client")

        if job_is_unassigned(job):
            match = choose_worker_for_job(state["workers"], job, state["jobs"])
            worker = match.get("worker") if match else None
            worker_name = _worker_name(worker)
            worker_id = _record_id(worker or {})
            match_score = int(match.get("score", 68)) if match else 68
            reasons = match.get("reasons", []) if match else []
            warnings = match.get("warnings", []) if match else []
            reason_text = "; ".join(reasons + warnings) if (reasons or warnings) else "AI checked availability, workload, region and job context before preparing this assignment."
            actions.append(build_ai_action(
                business_id=business_id,
                action_type="assign_worker_to_job",
                module="dispatch",
                title=f"Assign {worker_name} to {client}",
                summary=f"{title} is unassigned. AI found {worker_name} as the strongest match.",
                reason=reason_text,
                target_record_type="job",
                target_record_id=str(job_id),
                suggested_payload={
                    "job_id": str(job.get("id") or job.get("_id") or job_id),
                    "worker_id": worker_id,
                    "worker_name": worker_name,
                    "match_score": match_score,
                    "match_reasons": reasons,
                    "match_warnings": warnings,
                    "workload": match.get("workload", 0) if match else 0,
                    "same_day_jobs": match.get("same_day_jobs", 0) if match else 0,
                },
                preview_text=f"Assign {worker_name} to {title} and notify the worker.",
                confidence=match_score,
                risk_level="low" if match_score >= 75 and not warnings else "medium",
                deep_link=f"/dispatch?job={job_id}",
            ))

        if job_is_completed(job) and not job.get("invoice_id") and not job.get("invoice_created"):
            actions.append(build_ai_action(
                business_id=business_id,
                action_type="create_invoice_draft",
                module="invoices",
                title=f"Create invoice draft for {client}",
                summary=f"{title} is complete and appears ready for billing.",
                reason="AI found a completed job without an attached invoice. It can prefill the invoice description from job notes, completion data, photos and pricing context.",
                target_record_type="job",
                target_record_id=str(job_id),
                suggested_payload={"source_job_id": str(job.get("id") or job.get("_id") or job_id), "customer_name": client},
                preview_text=f"Create a draft invoice for {client} from completed job {title}.",
                confidence=86,
                risk_level="medium",
                deep_link=f"/invoices?source_job={job_id}",
            ))

    for quote in state["quotes"]:
        if quote_needs_followup(quote):
            quote_id = quote.get("id") or quote.get("quote_number") or "quote"
            client = safe_text(quote.get("customer_name") or quote.get("client_name"), "customer")
            actions.append(build_ai_action(
                business_id=business_id,
                action_type="create_quote_followup",
                module="quotes",
                title=f"Follow up quote for {client}",
                summary="Quote has been sent but has not been accepted or declined.",
                reason="AI prioritises quote follow-ups so the owner does not need to manually check quote age and customer response status.",
                target_record_type="quote",
                target_record_id=str(quote_id),
                suggested_payload={"quote_id": str(quote.get("id") or quote_id), "customer_name": client},
                preview_text=f"Hi {client}, just checking whether you had any questions about the quote. Happy to help.",
                confidence=82,
                risk_level="low",
                deep_link=f"/quotes?quote={quote_id}",
            ))

    for invoice in state["invoices"]:
        if invoice_is_overdue(invoice):
            invoice_id = invoice.get("id") or invoice.get("invoice_number") or "invoice"
            client = safe_text(invoice.get("customer_name") or invoice.get("client_name"), "customer")
            total = invoice.get("total") or invoice.get("amount") or invoice.get("subtotal") or ""
            actions.append(build_ai_action(
                business_id=business_id,
                action_type="create_invoice_reminder",
                module="invoices",
                title=f"Chase overdue invoice for {client}",
                summary=f"Invoice {invoice_id} appears overdue{f' with ${total} waiting' if total else ''}.",
                reason="AI found an unpaid/overdue invoice and prepared a reminder so the owner does not have to manually chase it.",
                target_record_type="invoice",
                target_record_id=str(invoice_id),
                suggested_payload={"invoice_id": str(invoice.get("id") or invoice_id), "customer_name": client},
                preview_text=f"Hi {client}, just a friendly reminder that invoice {invoice_id} is now due. Please let us know if you need anything.",
                confidence=88,
                risk_level="low",
                deep_link=f"/invoices?invoice={invoice_id}",
            ))

    return actions[:24]


async def persist_ai_actions(db: Any, business_id: str, actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not actions:
        return []
    saved: List[Dict[str, Any]] = []
    for action in actions:
        # Avoid simple duplicate spam for same pending action target/type.
        existing = None
        try:
            existing = await db.ai_operator_actions.find_one({
                "business_id": str(business_id),
                "action_type": action.get("action_type"),
                "target_record_id": action.get("target_record_id"),
                "status": "pending",
            })
        except Exception:
            existing = None
        if existing:
            saved.append(serialise_record(existing))
            continue
        try:
            await db.ai_operator_actions.insert_one(action)
            saved.append(serialise_record(action))
        except Exception:
            saved.append(action)
    return saved


async def get_pending_ai_actions(db: Any, business_id: str) -> List[Dict[str, Any]]:
    try:
        cursor = db.ai_operator_actions.find({"business_id": str(business_id), "status": "pending"}).sort("created_at", -1).limit(50)
        items = await cursor.to_list(length=50)
        return [serialise_record(item) for item in items]
    except Exception:
        return []


async def mark_ai_action(db: Any, business_id: str, action_id: str, status: str, actor_id: str = "") -> Optional[Dict[str, Any]]:
    now = utc_now_iso()
    update = {
        "status": status,
        "updated_at": now,
    }
    if status in {"approved", "completed"}:
        update["approved_at"] = now
        update["approved_by"] = actor_id
        update["executed_at"] = now
    try:
        await db.ai_operator_actions.update_one({"business_id": str(business_id), "id": action_id}, {"$set": update})
        item = await db.ai_operator_actions.find_one({"business_id": str(business_id), "id": action_id})
        return serialise_record(item)
    except Exception:
        return None


async def answer_business_question(db: Any, business_id: str, question: str) -> Dict[str, Any]:
    question_clean = safe_text(question, "What needs my attention?")
    actions = await get_pending_ai_actions(db, business_id)
    if not actions:
        actions = await persist_ai_actions(db, business_id, await prepare_ai_actions(db, business_id))
    top = actions[0] if actions else None
    if top:
        answer = f"Best next move: {top.get('title')}. {top.get('reason')} I can prepare this for owner approval."
    else:
        answer = "I scanned the business and did not find urgent owner approvals right now. I can still prepare a job, invoice, quote follow-up or customer message if you ask."
    return {"question": question_clean, "answer": answer, "actions": actions[:5], "created_at": utc_now_iso()}
