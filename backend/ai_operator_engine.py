from datetime import datetime, timezone
from fastapi import HTTPException, Request
from bson import ObjectId
import jwt


OWNER_ROLES = {"owner", "admin", "employer", "manager", "office_admin", "platform_owner"}


def now_utc():
    return datetime.now(timezone.utc)


def safe_id(value):
    if not value:
        return ""
    if isinstance(value, ObjectId):
        return str(value)
    return str(value)


def oid(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def slug(value, default=""):
    return str(value or default).strip().lower().replace(" ", "_")


def money_number(item):
    if not isinstance(item, dict):
        return 0.0
    for key in ["total", "amount", "balance", "price", "job_price", "fixed_price", "invoice_total", "subtotal"]:
        try:
            value = item.get(key)
            if value not in [None, ""]:
                return float(value)
        except Exception:
            pass
    return 0.0


def title_of(item, fallback="Record"):
    if not isinstance(item, dict):
        return fallback
    return (
        item.get("title")
        or item.get("job_title")
        or item.get("name")
        or item.get("client_name")
        or item.get("customer_name")
        or item.get("invoice_number")
        or item.get("quote_number")
        or item.get("email")
        or fallback
    )


def client_of(item):
    if not isinstance(item, dict):
        return "Client"
    client = item.get("client")
    customer = item.get("customer")
    if isinstance(client, dict):
        return client.get("name") or client.get("client_name") or client.get("customer_name") or "Client"
    if isinstance(customer, dict):
        return customer.get("name") or customer.get("client_name") or customer.get("customer_name") or "Client"
    return item.get("client_name") or item.get("customer_name") or item.get("customer") or item.get("client") or "Client"


def status_of(item, default="active"):
    if not isinstance(item, dict):
        return default
    return slug(
        item.get("status")
        or item.get("job_status")
        or item.get("workflow_status")
        or item.get("payment_status")
        or item.get("quote_status")
        or item.get("state")
        or default,
        default,
    )


def region_of(item):
    if not isinstance(item, dict):
        return ""
    return slug(
        item.get("region")
        or item.get("area")
        or item.get("suburb")
        or item.get("city")
        or item.get("location_region")
        or item.get("base_region")
        or "",
        "",
    )


def text_blob(item):
    if not isinstance(item, dict):
        return ""
    fields = [
        "title", "job_title", "service_type", "job_type", "trade", "category",
        "description", "notes", "address", "site_address", "skills", "experience",
    ]
    return " ".join(str(item.get(field) or "") for field in fields).lower()


def word_hits(source, target):
    words = {
        w for w in "".join(ch if ch.isalnum() else " " for ch in str(source).lower()).split()
        if len(w) >= 4
    }
    target = str(target or "").lower()
    return [w for w in words if w in target][:5]


def job_date(job):
    for key in ["scheduled_date", "schedule_date", "start_date", "date", "due_date"]:
        value = job.get(key) if isinstance(job, dict) else None
        if not value:
            continue
        if hasattr(value, "date"):
            try:
                return value.date().isoformat()
            except Exception:
                pass
        return str(value)[:10]
    return ""


def assigned_worker_id(job):
    if not isinstance(job, dict):
        return ""
    worker = job.get("worker") if isinstance(job.get("worker"), dict) else {}
    return safe_id(
        job.get("assigned_worker_id")
        or job.get("worker_id")
        or job.get("assigned_to")
        or job.get("assigned_user_id")
        or worker.get("_id")
        or worker.get("id")
    )


def assigned_worker_name(job):
    if not isinstance(job, dict):
        return ""
    worker = job.get("worker") if isinstance(job.get("worker"), dict) else {}
    return slug(
        job.get("assigned_worker_name")
        or job.get("worker_name")
        or job.get("assigned_to_name")
        or worker.get("name")
        or ""
    )


def is_active_job(job):
    return status_of(job) not in {"completed", "done", "closed", "cancelled", "canceled"}


def is_completed_job(job):
    return status_of(job) in {"completed", "done", "closed"} or job.get("completed") is True or bool(job.get("completed_at"))


def is_unassigned_job(job):
    if not is_active_job(job):
        return False
    return not (
        job.get("assigned_worker_id")
        or job.get("worker_id")
        or job.get("assigned_to")
        or job.get("assigned_worker_name")
        or job.get("worker_name")
    )


def is_unpaid_invoice(invoice):
    return status_of(invoice, "draft") in {"draft", "sent", "unpaid", "pending", "overdue", "open"}


def is_open_quote(quote):
    return status_of(quote, "open") in {"open", "sent", "pending", "waiting", "draft"}


def worker_job_count(worker, jobs):
    worker_id = safe_id(worker.get("_id") or worker.get("id"))
    worker_name = slug(title_of(worker, ""))
    count = 0
    for job in jobs:
        if not is_active_job(job):
            continue
        if (worker_id and assigned_worker_id(job) == worker_id) or (worker_name and assigned_worker_name(job) == worker_name):
            count += 1
    return count


def has_schedule_conflict(worker, job, jobs):
    worker_id = safe_id(worker.get("_id") or worker.get("id"))
    worker_name = slug(title_of(worker, ""))
    target = job_date(job)
    if not target:
        return False

    for other in jobs:
        if safe_id(other.get("_id") or other.get("id")) == safe_id(job.get("_id") or job.get("id")):
            continue
        if not is_active_job(other):
            continue
        if job_date(other) != target:
            continue
        if (worker_id and assigned_worker_id(other) == worker_id) or (worker_name and assigned_worker_name(other) == worker_name):
            return True

    return False


def score_worker(worker, job, jobs):
    score = 0
    reasons = []

    worker_region = region_of(worker)
    job_region = region_of(job)

    if worker_region and job_region and worker_region == job_region:
        score += 35
        reasons.append("same region")
    elif worker_region and job_region and (worker_region in job_region or job_region in worker_region):
        score += 22
        reasons.append("near region match")
    elif not job_region:
        score += 5
        reasons.append("job region missing")

    hits = word_hits(text_blob(job), text_blob(worker))
    if hits:
        score += min(30, len(hits) * 8)
        reasons.append("skill match: " + ", ".join(hits))

    workload = worker_job_count(worker, jobs)
    if workload == 0:
        score += 20
        reasons.append("no active assigned jobs")
    elif workload <= 2:
        score += 10
        reasons.append(f"{workload} active job{'s' if workload != 1 else ''}")
    else:
        score -= min(20, workload * 4)
        reasons.append(f"{workload} active jobs already")

    worker_status = status_of(worker, "active")
    if worker_status in {"active", "available", "ready", "worker", ""}:
        score += 10
        reasons.append("active/available")
    else:
        score -= 20
        reasons.append(f"worker status: {worker_status}")

    conflict = has_schedule_conflict(worker, job, jobs)
    if conflict:
        score -= 35
        reasons.append("possible schedule conflict")

    return {
        "worker": worker,
        "score": max(0, round(score)),
        "reasons": reasons,
        "conflict": conflict,
        "workload": workload,
    }


def best_worker(job, workers, jobs):
    available = [
        worker for worker in workers
        if status_of(worker, "active") in {"active", "available", "ready", "worker", ""}
    ]
    scored = [score_worker(worker, job, jobs) for worker in available]
    scored.sort(key=lambda row: row["score"], reverse=True)
    return scored[0] if scored else None


def priority_score(action_type, risk="low", money=0):
    score = 30

    if action_type == "create_draft_invoice":
        score += 35
    elif action_type == "assign_worker":
        score += 32
    elif action_type == "draft_invoice_reminder":
        score += 30
    elif action_type == "draft_quote_followup":
        score += 22
    elif action_type in {"setup_review", "myob_review", "sms_review"}:
        score += 12

    risk = slug(risk, "low")
    if risk == "high":
        score += 35
    elif risk == "medium":
        score += 22
    elif risk == "needs_info":
        score += 12

    try:
        score += min(25, float(money or 0) / 100)
    except Exception:
        pass

    return round(score)


def confidence(score):
    if score >= 80:
        return "high"
    if score >= 55:
        return "medium"
    return "needs_data"


def action_key(action_type, source_type, source_id, secondary_id=""):
    return f"{action_type}:{source_type}:{source_id}:{secondary_id}"


def public_doc(doc):
    if not doc:
        return doc
    row = dict(doc)
    if "_id" in row:
        row["id"] = str(row["_id"])
        del row["_id"]
    for key, value in list(row.items()):
        if isinstance(value, ObjectId):
            row[key] = str(value)
        elif hasattr(value, "isoformat"):
            row[key] = value.isoformat()
    row["backend_action"] = True
    row["execute"] = row.get("action_type")
    row["type"] = row.get("category") or row.get("action_type", "AI").replace("_", " ").upper()
    row["fields"] = row.get("suggested_payload") or {}
    return row


def invoice_description(job):
    service = job.get("service_type") or job.get("job_type") or job.get("title") or "Completed service"
    client = client_of(job)
    address = job.get("address") or job.get("site_address") or ""
    notes = job.get("completion_notes") or job.get("worker_notes") or job.get("notes") or job.get("description") or ""

    line = f"{service} completed for {client}"
    if address:
        line += f" at {address}"
    if notes:
        line += f". Work notes: {notes}"
    return line


async def auth_user(request, db, jwt_secret, jwt_algorithm):
    token = None

    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()

    if not token:
        token = request.cookies.get("access_token") or request.cookies.get("token") or request.cookies.get("auth_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[jwt_algorithm])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

    candidates = []
    for key in ["sub", "user_id", "id", "_id"]:
        if payload.get(key):
            candidates.append(str(payload.get(key)))

    queries = []
    for candidate in candidates:
        object_id = oid(candidate)
        if object_id:
            queries.append({"_id": object_id})
        queries.append({"id": candidate})

    if payload.get("email"):
        queries.append({"email": str(payload.get("email")).lower()})
        queries.append({"email": str(payload.get("email"))})

    for query in queries:
        user = await db.users.find_one(query)
        if user:
            return user

    raise HTTPException(status_code=401, detail="User not found")


async def require_owner(request, db, jwt_secret, jwt_algorithm):
    user = await auth_user(request, db, jwt_secret, jwt_algorithm)
    role = slug(user.get("role") or user.get("user_role") or user.get("account_type") or "owner")
    email = str(user.get("email") or "").lower()
    platform_owner = email in {"hello@churvox.com"} or user.get("is_platform_owner") is True

    if role not in OWNER_ROLES and not platform_owner:
        raise HTTPException(status_code=403, detail="Owner, manager or office admin access required")

    business_id = str(user.get("business_id") or user.get("id") or user.get("_id") or user.get("user_id") or "")
    if not business_id:
        raise HTTPException(status_code=401, detail="Business id not found")

    return user, business_id


async def business_records(db, business_id, user):
    owner_id = str(user.get("_id") or user.get("id") or "")
    query = {"$or": [{"business_id": business_id}, {"business_id": str(business_id)}, {"owner_id": owner_id}]}

    jobs = await db.jobs.find(query).sort("created_at", -1).to_list(length=500)
    clients = await db.clients.find(query).sort("created_at", -1).to_list(length=500)
    workers = await db.workers.find(query).sort("created_at", -1).to_list(length=500)
    quotes = await db.quotes.find(query).sort("created_at", -1).to_list(length=500)
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(length=500)

    return jobs, clients, workers, quotes, invoices


async def existing_invoice_for_job(db, business_id, job_id):
    if not job_id:
        return None
    return await db.invoices.find_one({
        "business_id": str(business_id),
        "$or": [
            {"job_id": job_id},
            {"source_job_id": job_id},
            {"linked_job_id": job_id},
        ],
    })


async def upsert_action(db, action):
    timestamp = now_utc()
    action = dict(action)
    action["updated_at"] = timestamp
    action.setdefault("created_at", timestamp)
    action.setdefault("status", "pending")
    action.setdefault("execution_status", "waiting_owner")
    action.setdefault("approval_required", True)

    existing = await db.ai_operator_actions.find_one({
        "business_id": action["business_id"],
        "action_key": action["action_key"],
        "status": {"$in": ["pending", "ready", "needs_info"]},
    })

    if existing:
        await db.ai_operator_actions.update_one(
            {"_id": existing["_id"]},
            {"$set": {k: v for k, v in action.items() if k not in {"_id", "created_at"}}},
        )
        action["_id"] = existing["_id"]
        action["created_at"] = existing.get("created_at", timestamp)
        return action, False

    await db.ai_operator_actions.insert_one(action)
    return action, True


async def audit(db, business_id, user, event, action, detail=None):
    row = {
        "business_id": str(business_id),
        "event": event,
        "action_id": safe_id(action.get("_id") or action.get("id")),
        "action_key": action.get("action_key"),
        "action_type": action.get("action_type"),
        "title": action.get("title"),
        "detail": detail or {},
        "user_id": safe_id(user.get("_id") or user.get("id")),
        "user_email": user.get("email"),
        "created_at": now_utc(),
    }
    await db.ai_operator_audit_log.insert_one(row)
    return row


async def generate_actions(db, business_id, user):
    jobs, clients, workers, quotes, invoices = await business_records(db, business_id, user)

    created = 0
    updated = 0
    prepared = []

    for job in [j for j in jobs if is_unassigned_job(j)][:30]:
        job_id = safe_id(job.get("_id") or job.get("id"))
        best = best_worker(job, workers, jobs)

        if best and best.get("worker"):
            worker = best["worker"]
            worker_id = safe_id(worker.get("_id") or worker.get("id"))
            worker_name = title_of(worker, "Worker")
            risk = "medium" if best.get("conflict") else "low"
            score = priority_score("assign_worker", risk=risk)

            action = {
                "business_id": str(business_id),
                "action_key": action_key("assign_worker", "job", job_id, worker_id),
                "action_type": "assign_worker",
                "category": "DISPATCH",
                "icon": "♧",
                "title": f"Assign {worker_name} to {title_of(job, 'unassigned job')}",
                "summary": f"{worker_name} scored {best['score']}/100 for this job.",
                "why": [
                    "Job has no assigned worker",
                    *[f"Match reason: {reason}" for reason in best.get("reasons", [])],
                    "Owner approval required before worker assignment",
                ],
                "guardrail": "Owner approves before assignment is changed.",
                "risk": risk,
                "priority_score": score,
                "confidence": confidence(score),
                "source_type": "job",
                "source_id": job_id,
                "suggested_payload": {
                    "job_id": job_id,
                    "job_title": title_of(job, "Job"),
                    "client_name": client_of(job),
                    "worker_id": worker_id,
                    "worker_name": worker_name,
                    "worker_score": best["score"],
                    "match_reasons": ", ".join(best.get("reasons", [])),
                    "possible_conflict": "yes" if best.get("conflict") else "no",
                },
                "status": "pending",
            }
        else:
            score = priority_score("setup_review", risk="needs_info")
            action = {
                "business_id": str(business_id),
                "action_key": action_key("setup_review", "job", job_id, "crew_missing"),
                "action_type": "setup_review",
                "category": "SETUP",
                "icon": "♧",
                "title": f"Add crew data for {title_of(job, 'unassigned job')}",
                "summary": "AI found an unassigned job but needs worker records with region and skills.",
                "why": ["Job has no assigned worker", "No suitable active worker record was found"],
                "guardrail": "Owner controls worker invites and role setup.",
                "risk": "needs_info",
                "priority_score": score,
                "confidence": confidence(score),
                "source_type": "job",
                "source_id": job_id,
                "suggested_payload": {"job_id": job_id, "recommended_next_step": "Add workers with region and skills"},
                "status": "needs_info",
            }

        _, is_new = await upsert_action(db, action)
        created += 1 if is_new else 0
        updated += 0 if is_new else 1
        prepared.append(action)

    for job in [j for j in jobs if is_completed_job(j)][:30]:
        job_id = safe_id(job.get("_id") or job.get("id"))
        if await existing_invoice_for_job(db, business_id, job_id):
            continue

        amount = money_number(job)
        risk = "medium" if amount else "needs_info"
        score = priority_score("create_draft_invoice", risk=risk, money=amount)

        action = {
            "business_id": str(business_id),
            "action_key": action_key("create_draft_invoice", "job", job_id),
            "action_type": "create_draft_invoice",
            "category": "PROOF TO PAID",
            "icon": "✓",
            "title": f"Create draft invoice for {title_of(job, 'completed job')}",
            "summary": f"{client_of(job)} has completed work ready to invoice.",
            "why": [
                "Job is completed",
                "No existing invoice was found for this job",
                "AI prepared invoice wording from job details and notes",
                "Draft only until owner approves sending",
            ],
            "guardrail": "Creates draft invoice only. Nothing is sent or charged without owner approval.",
            "risk": risk,
            "priority_score": score,
            "confidence": confidence(score),
            "source_type": "job",
            "source_id": job_id,
            "suggested_payload": {
                "job_id": job_id,
                "source_job_id": job_id,
                "customer_name": client_of(job),
                "client_name": client_of(job),
                "customer_email": job.get("customer_email") or job.get("client_email") or "",
                "address": job.get("address") or job.get("site_address") or "",
                "description": invoice_description(job),
                "subtotal": amount,
                "amount": amount,
                "total": amount,
                "status": "draft",
                "created_by_ai": True,
                "source": "ai_operator",
            },
            "status": "pending",
        }

        _, is_new = await upsert_action(db, action)
        created += 1 if is_new else 0
        updated += 0 if is_new else 1
        prepared.append(action)

    for invoice in [i for i in invoices if is_unpaid_invoice(i)][:30]:
        invoice_id = safe_id(invoice.get("_id") or invoice.get("id"))
        amount = money_number(invoice)
        overdue = "overdue" in status_of(invoice, "")
        risk = "medium" if overdue else "low"
        score = priority_score("draft_invoice_reminder", risk=risk, money=amount)
        invoice_number = invoice.get("invoice_number") or f"invoice {invoice_id[-6:]}"
        message = f"Hi {client_of(invoice)}, just a friendly reminder that {invoice_number} for ${amount:.0f} is still waiting. Please let us know if you need anything from us. Thanks."

        action = {
            "business_id": str(business_id),
            "action_key": action_key("draft_invoice_reminder", "invoice", invoice_id),
            "action_type": "draft_invoice_reminder",
            "category": "MONEY WATCH",
            "icon": "▥",
            "title": f"Prepare payment reminder for {invoice_number}",
            "summary": f"{client_of(invoice)} has an unpaid invoice waiting.",
            "why": ["Invoice is not marked paid", "AI prepared a friendly reminder draft", "Owner edits/approves before sending"],
            "guardrail": "Draft only. Nothing is sent without owner approval.",
            "risk": risk,
            "priority_score": score,
            "confidence": confidence(score),
            "source_type": "invoice",
            "source_id": invoice_id,
            "suggested_payload": {
                "invoice_id": invoice_id,
                "client_name": client_of(invoice),
                "amount": amount,
                "message": message,
                "channel": "sms_or_email",
                "status": "draft",
            },
            "status": "pending",
        }

        _, is_new = await upsert_action(db, action)
        created += 1 if is_new else 0
        updated += 0 if is_new else 1
        prepared.append(action)

    for quote in [q for q in quotes if is_open_quote(q)][:30]:
        quote_id = safe_id(quote.get("_id") or quote.get("id"))
        amount = money_number(quote)
        score = priority_score("draft_quote_followup", risk="low", money=amount)
        quote_number = quote.get("quote_number") or quote.get("number") or f"quote {quote_id[-6:]}"
        amount_text = f" for ${amount:.0f}" if amount else ""
        message = f"Hi {client_of(quote)}, just checking in on {quote_number}{amount_text}. Happy to answer any questions or get this booked in for you."

        action = {
            "business_id": str(business_id),
            "action_key": action_key("draft_quote_followup", "quote", quote_id),
            "action_type": "draft_quote_followup",
            "category": "QUOTE FOLLOW-UP",
            "icon": "▤",
            "title": f"Follow up quote for {client_of(quote)}",
            "summary": "Open quote waiting for customer response.",
            "why": ["Quote is still open", "Follow-up can recover work", "Draft remains editable"],
            "guardrail": "Owner edits and approves before sending.",
            "risk": "low",
            "priority_score": score,
            "confidence": confidence(score),
            "source_type": "quote",
            "source_id": quote_id,
            "suggested_payload": {
                "quote_id": quote_id,
                "client_name": client_of(quote),
                "amount": amount,
                "message": message,
                "channel": "sms_or_email",
                "status": "draft",
            },
            "status": "pending",
        }

        _, is_new = await upsert_action(db, action)
        created += 1 if is_new else 0
        updated += 0 if is_new else 1
        prepared.append(action)

    if not clients:
        score = priority_score("setup_review", risk="needs_info")
        action = {
            "business_id": str(business_id),
            "action_key": action_key("setup_review", "setup", "clients"),
            "action_type": "setup_review",
            "category": "SETUP",
            "icon": "⇪",
            "title": "Import or add clients",
            "summary": "Client history improves invoices, reminders and quote follow-up.",
            "why": ["No clients found", "AI needs client history to prepare stronger admin"],
            "guardrail": "Owner controls imports and client edits.",
            "risk": "needs_info",
            "priority_score": score,
            "confidence": confidence(score),
            "source_type": "setup",
            "source_id": "clients",
            "suggested_payload": {"recommended_next_step": "Import MYOB/customer CSV or add first client"},
            "status": "needs_info",
        }
        _, is_new = await upsert_action(db, action)
        created += 1 if is_new else 0
        updated += 0 if is_new else 1
        prepared.append(action)

    if not workers:
        score = priority_score("setup_review", risk="needs_info")
        action = {
            "business_id": str(business_id),
            "action_key": action_key("setup_review", "setup", "workers"),
            "action_type": "setup_review",
            "category": "SETUP",
            "icon": "♧",
            "title": "Add crew for AI dispatch",
            "summary": "Worker matching needs region, workload and skills.",
            "why": ["No crew records found", "AI dispatch needs worker data"],
            "guardrail": "Owner controls worker invites and roles.",
            "risk": "needs_info",
            "priority_score": score,
            "confidence": confidence(score),
            "source_type": "setup",
            "source_id": "workers",
            "suggested_payload": {"recommended_next_step": "Add workers with region and skills"},
            "status": "needs_info",
        }
        _, is_new = await upsert_action(db, action)
        created += 1 if is_new else 0
        updated += 0 if is_new else 1
        prepared.append(action)

    await audit(db, business_id, user, "operator_run", {"action_type": "run"}, {
        "created": created,
        "updated": updated,
        "prepared": len(prepared),
    })

    return {"created": created, "updated": updated, "prepared": len(prepared)}


async def execute_action(db, business_id, user, action):
    action_type = action.get("action_type")
    payload = action.get("suggested_payload") or {}

    if action_type == "assign_worker":
        job_id = payload.get("job_id") or action.get("source_id")
        worker_id = payload.get("worker_id")
        worker_name = payload.get("worker_name")

        query_options = []
        object_id = oid(job_id)
        if object_id:
            query_options.append({"_id": object_id})
        query_options.append({"id": job_id})

        matched = 0
        for query in query_options:
            result = await db.jobs.update_one(
                {"business_id": str(business_id), **query},
                {"$set": {
                    "assigned_worker_id": worker_id,
                    "worker_id": worker_id,
                    "assigned_worker_name": worker_name,
                    "status": "assigned",
                    "ai_assigned": True,
                    "ai_assignment_reason": payload.get("match_reasons", ""),
                    "updated_at": now_utc(),
                }}
            )
            matched += result.matched_count

        if not matched:
            raise HTTPException(status_code=404, detail="Job not found for assignment")

        return {"executed": True, "message": "Worker assigned", "payload": payload}

    if action_type == "create_draft_invoice":
        invoice = {
            "business_id": str(business_id),
            "job_id": payload.get("job_id"),
            "source_job_id": payload.get("source_job_id") or payload.get("job_id"),
            "customer_name": payload.get("customer_name") or payload.get("client_name") or "Client",
            "client_name": payload.get("client_name") or payload.get("customer_name") or "Client",
            "customer_email": payload.get("customer_email") or "",
            "address": payload.get("address") or "",
            "description": payload.get("description") or "Completed work ready for billing.",
            "subtotal": float(payload.get("subtotal") or payload.get("amount") or payload.get("total") or 0),
            "total": float(payload.get("total") or payload.get("amount") or payload.get("subtotal") or 0),
            "status": "draft",
            "created_by_ai": True,
            "source": "ai_operator",
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.invoices.insert_one(invoice)
        return {"executed": True, "message": "Draft invoice created", "invoice_id": safe_id(invoice.get("_id"))}

    if action_type in {"draft_invoice_reminder", "draft_quote_followup"}:
        draft = {
            "business_id": str(business_id),
            "action_id": safe_id(action.get("_id")),
            "draft_type": action_type,
            "source_type": action.get("source_type"),
            "source_id": action.get("source_id"),
            "title": action.get("title"),
            "message": payload.get("message") or "",
            "client_name": payload.get("client_name") or "",
            "amount": payload.get("amount"),
            "channel": payload.get("channel") or "sms_or_email",
            "status": "draft_waiting_owner_send",
            "created_by_ai": True,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.ai_operator_drafts.insert_one(draft)
        return {"executed": True, "message": "Draft message saved", "draft_id": safe_id(draft.get("_id"))}

    if action_type in {"setup_review", "myob_review", "sms_review"}:
        draft = {
            "business_id": str(business_id),
            "action_id": safe_id(action.get("_id")),
            "draft_type": action_type,
            "title": action.get("title"),
            "payload": payload,
            "status": "owner_review_needed",
            "created_by_ai": True,
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }
        await db.ai_operator_drafts.insert_one(draft)
        return {"executed": True, "message": "Owner review item saved", "draft_id": safe_id(draft.get("_id"))}

    raise HTTPException(status_code=400, detail=f"Unsupported AI action type: {action_type}")


def setup_ai_operator_routes(api_router, db, jwt_secret, jwt_algorithm):
    @api_router.post("/ai/operator/run")
    async def run_ai_operator(request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)
        result = await generate_actions(db, business_id, user)
        return {"success": True, **result}

    @api_router.get("/ai/operator/actions")
    async def list_ai_operator_actions(request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)

        cursor = db.ai_operator_actions.find({
            "business_id": str(business_id),
            "status": {"$in": ["pending", "ready", "needs_info", "approved", "failed"]},
        }).sort([("priority_score", -1), ("updated_at", -1)]).limit(100)

        actions = await cursor.to_list(length=100)
        return {"success": True, "actions": [public_doc(action) for action in actions]}

    @api_router.post("/ai/operator/actions/{action_id}/approve")
    async def approve_ai_operator_action(action_id: str, request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)

        query_options = []
        object_id = oid(action_id)
        if object_id:
            query_options.append({"_id": object_id})
        query_options.append({"id": action_id})

        action = None
        for query in query_options:
            action = await db.ai_operator_actions.find_one({"business_id": str(business_id), **query})
            if action:
                break

        if not action:
            raise HTTPException(status_code=404, detail="AI action not found")

        if action.get("status") in {"executed", "rejected"}:
            return {"success": True, "message": f"Action already {action.get('status')}", "action": public_doc(action)}

        await db.ai_operator_actions.update_one(
            {"_id": action["_id"]},
            {"$set": {
                "status": "approved",
                "approved_at": now_utc(),
                "approved_by": safe_id(user.get("_id") or user.get("id")),
                "execution_status": "executing",
                "updated_at": now_utc(),
            }}
        )

        try:
            result = await execute_action(db, business_id, user, action)
            await db.ai_operator_actions.update_one(
                {"_id": action["_id"]},
                {"$set": {
                    "status": "executed",
                    "execution_status": "executed",
                    "executed_at": now_utc(),
                    "execution_result": result,
                    "updated_at": now_utc(),
                }}
            )
            await audit(db, business_id, user, "approved_and_executed", action, result)
            updated = await db.ai_operator_actions.find_one({"_id": action["_id"]})
            return {"success": True, "message": result.get("message", "Action executed"), "action": public_doc(updated), "result": result}
        except Exception as error:
            await db.ai_operator_actions.update_one(
                {"_id": action["_id"]},
                {"$set": {
                    "status": "failed",
                    "execution_status": "failed",
                    "execution_error": str(error),
                    "updated_at": now_utc(),
                }}
            )
            await audit(db, business_id, user, "approval_failed", action, {"error": str(error)})
            raise

    @api_router.post("/ai/operator/actions/{action_id}/reject")
    async def reject_ai_operator_action(action_id: str, request: Request):
        user, business_id = await require_owner(request, db, jwt_secret, jwt_algorithm)

        query_options = []
        object_id = oid(action_id)
        if object_id:
            query_options.append({"_id": object_id})
        query_options.append({"id": action_id})

        action = None
        for query in query_options:
            action = await db.ai_operator_actions.find_one({"business_id": str(business_id), **query})
            if action:
                break

        if not action:
            raise HTTPException(status_code=404, detail="AI action not found")

        await db.ai_operator_actions.update_one(
            {"_id": action["_id"]},
            {"$set": {
                "status": "rejected",
                "execution_status": "rejected",
                "rejected_at": now_utc(),
                "rejected_by": safe_id(user.get("_id") or user.get("id")),
                "updated_at": now_utc(),
            }}
        )

        await audit(db, business_id, user, "rejected", action)
        updated = await db.ai_operator_actions.find_one({"_id": action["_id"]})
        return {"success": True, "message": "AI action rejected", "action": public_doc(updated)}
