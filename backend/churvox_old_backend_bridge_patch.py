from __future__ import annotations

from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()

PLAN_ALIASES = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
    "none": "none",
    "free": "none",
}

PLAN_NAMES = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
    "none": "No plan",
}

PLAN_LIMITS = {
    "solo": {
        "plan_name": "Start",
        "clients": 250,
        "jobs_per_month": 50,
        "active_team_members": 1,
        "workers": 1,
        "ai_operator_actions": 25,
        "admin_recovery_batch": 1,
        "accounting_sync": "add_on",
        "proof_pack": "basic",
    },
    "team": {
        "plan_name": "Crew",
        "clients": 1000,
        "jobs_per_month": 150,
        "active_team_members": 5,
        "workers": 5,
        "ai_operator_actions": 100,
        "admin_recovery_batch": 5,
        "accounting_sync": "add_on",
        "proof_pack": "standard",
    },
    "pro": {
        "plan_name": "Operator",
        "clients": 3000,
        "jobs_per_month": 500,
        "active_team_members": 15,
        "workers": 15,
        "ai_operator_actions": 500,
        "admin_recovery_batch": 25,
        "accounting_sync": "add_on",
        "proof_pack": "advanced",
    },
    "enterprise": {
        "plan_name": "Command",
        "clients": 10000,
        "jobs_per_month": 1500,
        "active_team_members": 50,
        "workers": 50,
        "ai_operator_actions": 2000,
        "admin_recovery_batch": "bulk",
        "accounting_sync": "included",
        "proof_pack": "advanced",
    },
}

BUSINESS_FIELDS = ["business_id", "contractor_id", "owner_business_id", "user_id", "created_by"]


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def normalize_plan(value):
    return PLAN_ALIASES.get(lower(value), lower(value) or "none")


def is_object_id_like(value):
    return value.__class__.__name__ == "ObjectId"


def json_safe(value):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if key == "_id":
                out["id"] = str(item)
            else:
                out[key] = json_safe(item)
        return out
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [json_safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if is_object_id_like(value):
        return str(value)
    return value


def id_of(doc):
    if not isinstance(doc, dict):
        return ""
    return str(doc.get("_id") or doc.get("id") or doc.get("uuid") or doc.get("job_id") or "")


def values_from_raw(raw, ObjectId):
    values = []
    if raw is not None and clean(raw):
        values.append(str(raw))
        try:
            values.append(ObjectId(str(raw)))
        except Exception:
            pass
    out = []
    for value in values:
        if value not in out:
            out.append(value)
    return out


def business_values(user, ObjectId):
    raw = user.get("business_id") or user.get("owner_business_id") or user.get("id") or user.get("_id")
    return values_from_raw(raw, ObjectId)


def user_values(user, ObjectId):
    values = []
    for key in ["id", "_id", "worker_id", "team_member_id", "email", "name", "full_name"]:
        for value in values_from_raw(user.get(key), ObjectId):
            if value not in values:
                values.append(value)
    return values


def object_values(raw, ObjectId):
    return values_from_raw(raw, ObjectId)


def scoped_query(user, ObjectId, extra=None, fields=None):
    values = business_values(user, ObjectId)
    clauses = []
    for field in (fields or BUSINESS_FIELDS):
        clauses.append({field: {"$in": values}})
    query = {"$or": clauses} if clauses else {}
    if extra:
        query = {"$and": [query, extra]} if query else dict(extra)
    return query


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


async def to_list(cursor, limit):
    try:
        return await cursor.to_list(length=limit)
    except TypeError:
        return await cursor.to_list(limit)
    except Exception:
        return []


async def safe_find_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def safe_count(collection, query):
    try:
        return int(await collection.count_documents(query))
    except Exception:
        return 0


async def safe_recent(collection, query, limit=20, sort_field="created_at"):
    try:
        cursor = collection.find(query).sort(sort_field, -1).limit(limit)
        return await to_list(cursor, limit)
    except Exception:
        try:
            cursor = collection.find(query).limit(limit)
            return await to_list(cursor, limit)
        except Exception:
            return []


async def owner_doc(db, user, ObjectId):
    for value in business_values(user, ObjectId):
        if is_object_id_like(value):
            doc = await safe_find_one(db.users, {"_id": value})
            if doc:
                return doc
    for value in user_values(user, ObjectId):
        if is_object_id_like(value):
            doc = await safe_find_one(db.users, {"_id": value})
            if doc:
                return doc
    email = clean(user.get("email")).lower()
    if email:
        doc = await safe_find_one(db.users, {"email": email})
        if doc:
            return doc
    return dict(user or {})


def owner_plan(owner):
    return normalize_plan((owner or {}).get("plan") or (owner or {}).get("subscription_plan") or (owner or {}).get("tier") or "none")


def parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            try:
                return datetime.fromisoformat(value[:10]).replace(tzinfo=timezone.utc)
            except Exception:
                return None
    return None


def is_trial_active(owner):
    expires = parse_dt((owner or {}).get("trial_ends_at") or (owner or {}).get("trial_end") or (owner or {}).get("trial_expires_at"))
    return bool(expires and expires > now_utc())


def billing_status_from_owner(owner):
    plan = owner_plan(owner)
    raw_status = lower((owner or {}).get("subscription_status") or (owner or {}).get("billing_status") or "")
    if raw_status:
        return raw_status
    if plan != "none":
        return "active"
    if is_trial_active(owner):
        return "trialing"
    return "none"


def has_app_access(owner):
    if (owner or {}).get("has_app_access") is True:
        return True
    plan = owner_plan(owner)
    status = billing_status_from_owner(owner)
    if plan in PLAN_LIMITS and status not in {"cancelled", "canceled", "unpaid", "incomplete_expired", "locked", "disabled"}:
        return True
    return is_trial_active(owner)


def with_growth_limits(base_limits, owner):
    limits = dict(base_limits)
    growth_packs = int((owner or {}).get("extra_user_blocks") or (owner or {}).get("growth_packs") or (owner or {}).get("command_growth_packs") or 0)
    if growth_packs and limits.get("plan_name") == "Command":
        limits["active_team_members"] = int(limits.get("active_team_members") or 50) + growth_packs * 50
        limits["workers"] = int(limits.get("workers") or 50) + growth_packs * 50
        limits["jobs_per_month"] = int(limits.get("jobs_per_month") or 1500) + growth_packs * 1500
        limits["ai_operator_actions"] = int(limits.get("ai_operator_actions") or 2000) + growth_packs * 1000
    return limits


async def accounting_status(db, user, owner, ObjectId):
    values = business_values(user, ObjectId)
    xero = None
    myob = None
    try:
        xero = await db.xero_settings.find_one({"business_id": {"$in": values}})
    except Exception:
        xero = None
    try:
        myob = await db.myob_settings.find_one({"business_id": {"$in": values}})
    except Exception:
        myob = None

    xero_connected = bool(xero and (xero.get("access_token") or xero.get("tenant_id") or xero.get("connected")))
    myob_connected = bool(myob and (myob.get("api_key") or myob.get("company_file_id") or myob.get("connected")))
    included = owner_plan(owner) == "enterprise"
    addon = bool((owner or {}).get("xero_addon_active") or (owner or {}).get("accounting_sync_addon_active") or (owner or {}).get("myob_addon_active"))
    return {
        "included": included,
        "addon_active": addon,
        "xero_connected": xero_connected,
        "myob_connected": myob_connected,
        "connected": xero_connected or myob_connected,
        "mode": "draft_sync_only",
        "guardrails": [
            "Draft sync only",
            "No automatic invoice sending",
            "No tax filing",
            "No bank payout files",
            "Owner approval required",
        ],
    }


def job_title(job):
    return clean(job.get("title") or job.get("job_name") or job.get("job_title") or job.get("service_type") or job.get("job_type") or "Job")


def client_name(record):
    return clean(record.get("client_name") or record.get("customer_name") or record.get("client") or record.get("customer") or record.get("name") or "No customer")


def address_of(record):
    return clean(record.get("address") or record.get("site_address") or record.get("service_address") or record.get("job_address"))


def date_of(record):
    value = record.get("scheduled_date") or record.get("date") or record.get("due_date") or record.get("start")
    if isinstance(value, datetime):
        return value.date().isoformat()
    return clean(value)[:10]


def time_of(record):
    return clean(record.get("scheduled_time") or record.get("time") or record.get("start_time"))


def status_of(record):
    return lower(record.get("status") or record.get("job_status") or record.get("workflow_status") or record.get("review_status"))


def is_complete(record):
    return status_of(record) in {"completed", "complete", "done", "finished"} or record.get("completed") is True or bool(record.get("completed_at"))


def amount_of(record):
    for key in ["amount", "total", "total_amount", "subtotal", "price", "quote_total", "invoice_total"]:
        try:
            value = float(record.get(key) or 0)
            if value:
                return value
        except Exception:
            pass
    return 0.0


def missing_job_fields(job):
    missing = []
    if not job_title(job) or job_title(job).lower() in {"job", "untitled job"}:
        missing.append("job title")
    if not client_name(job) or client_name(job).lower() in {"no customer", "none"}:
        missing.append("customer")
    if not address_of(job):
        missing.append("address")
    if not date_of(job):
        missing.append("date")
    if not time_of(job):
        missing.append("time")
    if amount_of(job) <= 0 and not lower(job.get("pricing_type") or job.get("billing_type")).startswith("hour"):
        missing.append("price")
    if not clean(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to") or job.get("assigned_worker_name") or job.get("worker_name")):
        missing.append("assigned worker")
    return missing


def make_item(source, category, action, title, summary, source_id="", priority="medium", details=None):
    key = f"{source}:{source_id or title}:{category}:{action}"
    return {
        "id": key.replace(" ", "-").lower()[:180],
        "source": source,
        "category": category,
        "action": action,
        "title": title,
        "summary": summary,
        "found": summary,
        "prepared": "Churvox prepared this for owner review. Approve, edit, or park it in Command.",
        "why": "This keeps workers moving while the owner controls money, messages and admin decisions.",
        "priority": priority,
        "source_id": str(source_id or ""),
        "created_at": now_utc().isoformat(),
        "details": details or {},
        "requires_owner_approval": True,
    }


async def build_plan_usage(db, user, ObjectId):
    owner = await owner_doc(db, user, ObjectId)
    plan = owner_plan(owner)
    base = PLAN_LIMITS.get(plan, PLAN_LIMITS["solo"])
    limits = with_growth_limits(base, owner)
    values = business_values(user, ObjectId)
    business_query = scoped_query(user, ObjectId)

    month_start = now_utc().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    clients_used = await safe_count(db.clients, business_query)
    jobs_used = await safe_count(db.jobs, {"$and": [business_query, {"created_at": {"$gte": month_start}}]} if business_query else {})
    team_query = {"$and": [
        {"business_id": {"$in": values}},
        {"role": {"$in": ["worker", "staff", "employee"]}},
        {"status": {"$nin": ["inactive", "archived", "deleted"]}},
    ]}
    team_used = await safe_count(db.users, team_query)

    ai_query = {"$and": [
        {"business_id": {"$in": values}},
        {"created_at": {"$gte": month_start}},
    ]}
    ai_used = 0
    for collection_name in ["ai_operator_actions", "ai_operator_audit_log", "command_decisions"]:
        try:
            ai_used += await safe_count(getattr(db, collection_name), ai_query)
        except Exception:
            pass

    accounting = await accounting_status(db, user, owner, ObjectId)
    usage = {
        "clients": clients_used,
        "jobs": jobs_used,
        "jobs_this_month": jobs_used,
        "workers": team_used,
        "team": team_used,
        "active_team_members": team_used,
        "ai_actions": ai_used,
        "ai_operator_actions": ai_used,
    }

    return {
        "success": True,
        "plan": plan,
        "plan_name": PLAN_NAMES.get(plan, "Start"),
        "limits": limits,
        "used": usage,
        "usage": usage,
        "current": usage,
        "addons": {
            "growth_pack": int(owner.get("extra_user_blocks") or owner.get("growth_packs") or 0),
            "command_growth_pack": int(owner.get("extra_user_blocks") or owner.get("growth_packs") or 0),
            "accounting_sync": accounting["included"] or accounting["addon_active"] or accounting["connected"],
            "xero": accounting["xero_connected"],
            "myob": accounting["myob_connected"],
        },
        "accounting": accounting,
        "data": {
            "plan": plan,
            "limits": limits,
            "used": usage,
            "usage": usage,
        },
    }


async def build_billing_status(db, user, ObjectId):
    owner = await owner_doc(db, user, ObjectId)
    plan = owner_plan(owner)
    accounting = await accounting_status(db, user, owner, ObjectId)
    trial_end = owner.get("trial_ends_at") or owner.get("trial_end") or owner.get("trial_expires_at")
    status = billing_status_from_owner(owner)
    access = has_app_access(owner)
    payload = {
        "success": True,
        "plan": plan if plan != "none" else "none",
        "plan_name": PLAN_NAMES.get(plan, "No plan"),
        "subscription_status": status,
        "status": status,
        "trial_ends_at": json_safe(trial_end),
        "trial_active": is_trial_active(owner),
        "has_app_access": access,
        "billing_lock_reason": "" if access else "payment_required",
        "stripe_customer_id": owner.get("stripe_customer_id"),
        "stripe_subscription_id": owner.get("stripe_subscription_id"),
        "billing_country": owner.get("billing_country") or owner.get("country") or "NZ",
        "country": owner.get("billing_country") or owner.get("country") or "NZ",
        "email": owner.get("email") or user.get("email") or "",
        "addons": {
            "xero_addon_active": bool(owner.get("xero_addon_active") or owner.get("accounting_sync_addon_active")),
            "extra_user_blocks": int(owner.get("extra_user_blocks") or 0),
            "accounting_sync_active": accounting["included"] or accounting["addon_active"] or accounting["connected"],
        },
        "accounting": accounting,
    }
    payload["data"] = dict(payload)
    return json_safe(payload)


async def build_setup_status(db, user, ObjectId):
    owner = await owner_doc(db, user, ObjectId)
    accounting = await accounting_status(db, user, owner, ObjectId)
    plan = owner_plan(owner)
    access = has_app_access(owner)
    sms_ready = False
    try:
        import os
        sms_ready = bool(os.environ.get("CLICKSEND_USERNAME") and os.environ.get("CLICKSEND_API_KEY"))
    except Exception:
        sms_ready = False

    payload = {
        "success": True,
        "ready": True,
        "operator_mode": "approval_first",
        "accounting_changes_locked": True,
        "plan": plan,
        "plan_name": PLAN_NAMES.get(plan, "Start"),
        "has_app_access": access,
        "blocked_reason": "" if access else "payment_required",
        "checks": {
            "business_profile": True,
            "jobs": True,
            "clients": True,
            "workers": True,
            "sms_configured": sms_ready,
            "xero_connected": accounting["xero_connected"],
            "myob_connected": accounting["myob_connected"],
            "accounting_sync_ready": accounting["connected"] or accounting["included"] or accounting["addon_active"],
            "ai_operator": True,
            "command_approval_desk": True,
        },
        "guardrails": [
            "Churvox prepares admin; owner approves.",
            "Command is the approval desk.",
            "No automatic invoice sending.",
            "No tax filing.",
            "No bank payout files.",
            "Draft accounting sync only.",
        ],
    }
    payload["data"] = dict(payload)
    return payload


async def invoice_exists_for_job(db, user, ObjectId, job):
    job_values = object_values(job.get("_id") or job.get("id"), ObjectId)
    business_query = scoped_query(user, ObjectId)
    query = {"$and": [
        business_query,
        {"$or": [
            {"job_id": {"$in": job_values}},
            {"source_job_id": {"$in": job_values}},
            {"job": {"$in": job_values}},
        ]},
    ]}
    return (await safe_count(db.invoices, query)) > 0


async def build_command_snapshot(db, user, ObjectId):
    business_query = scoped_query(user, ObjectId)
    urgent = []
    approvals = []
    actions = []
    now = now_utc()
    today = now.date().isoformat()

    jobs = await safe_recent(db.jobs, business_query, 80, "updated_at")
    for job in jobs:
        jid = id_of(job)
        missing = missing_job_fields(job)
        if missing and not is_complete(job):
            urgent.append(make_item(
                "job-data-quality",
                "Data quality",
                "Fix missing job details",
                f"{job_title(job)} is missing {', '.join(missing[:3])}",
                f"{client_name(job)} needs {', '.join(missing)} before it should be worker-ready.",
                jid,
                "high",
                {"record_type": "job", "job_id": jid, "missing": missing, "job": json_safe(job)},
            ))
            continue

        review = lower(job.get("work_review_status") or job.get("review_status") or job.get("owner_review_status"))
        worker_finished = job.get("completed_by_worker") is True or review in {"ready_for_review", "needs_owner_review"}
        if worker_finished:
            approvals.append(make_item(
                "worker-proof",
                "Worker proof",
                "Review completed work",
                f"{job_title(job)} is ready for owner review",
                f"{client_name(job)} has worker proof/time/checklist waiting for owner approval.",
                jid,
                "high" if review == "needs_owner_review" else "medium",
                {"record_type": "job", "job_id": jid, "review_status": review, "job": json_safe(job)},
            ))

        if is_complete(job) and not await invoice_exists_for_job(db, user, ObjectId, job):
            approvals.append(make_item(
                "job-to-invoice",
                "Invoice",
                "Prepare invoice draft",
                f"{job_title(job)} has no invoice yet",
                f"Work is complete for {client_name(job)}. Churvox can prepare an invoice draft for Command approval.",
                jid,
                "high",
                {"record_type": "job", "job_id": jid, "job": json_safe(job)},
            ))

    invoices = await safe_recent(db.invoices, business_query, 80, "updated_at")
    for invoice in invoices:
        iid = id_of(invoice)
        status = status_of(invoice)
        due = parse_dt(invoice.get("due_date") or invoice.get("invoice_due_date"))
        if status not in {"paid", "cancelled", "canceled"} and due and due.date() < now.date():
            urgent.append(make_item(
                "invoice-overdue",
                "Invoice",
                "Prepare overdue follow-up",
                f"{client_name(invoice)} invoice is overdue",
                f"Invoice {invoice.get('invoice_number') or iid} is overdue and needs owner-approved follow-up.",
                iid,
                "high",
                {"record_type": "invoice", "invoice_id": iid, "invoice": json_safe(invoice)},
            ))
        sync_status = lower(invoice.get("xero_sync_status") or invoice.get("myob_sync_status") or invoice.get("accounting_sync_status"))
        if status in {"draft", "approved", "ready"} and sync_status in {"", "not_synced", "sync_ready", "ready"}:
            approvals.append(make_item(
                "accounting-sync",
                "Accounting",
                "Approve draft sync",
                f"{client_name(invoice)} invoice is ready for draft sync",
                "Draft accounting sync is available. Owner approval is required before Churvox syncs anything.",
                iid,
                "medium",
                {"record_type": "invoice", "invoice_id": iid, "invoice": json_safe(invoice)},
            ))

    quotes = await safe_recent(db.quotes, business_query, 60, "updated_at")
    for quote in quotes:
        qid = id_of(quote)
        qstatus = status_of(quote)
        updated = parse_dt(quote.get("updated_at") or quote.get("sent_at") or quote.get("created_at"))
        if qstatus == "accepted":
            approvals.append(make_item(
                "accepted-quote",
                "Job",
                "Create job from accepted quote",
                f"{client_name(quote)} accepted a quote",
                "Churvox can prepare the job form from the accepted quote for owner approval.",
                qid,
                "high",
                {"record_type": "quote", "quote_id": qid, "quote": json_safe(quote)},
            ))
        elif qstatus in {"sent", "viewed"} and updated and updated < now - timedelta(days=3):
            actions.append(make_item(
                "quote-follow-up",
                "Follow-up",
                "Prepare quote follow-up",
                f"{client_name(quote)} quote needs follow-up",
                "The quote has been out for a few days. Churvox can draft a follow-up for Command approval.",
                qid,
                "medium",
                {"record_type": "quote", "quote_id": qid, "quote": json_safe(quote)},
            ))

    requests = await safe_recent(db.customer_requests, business_query, 30, "created_at")
    for req in requests:
        if lower(req.get("status") or "new") in {"new", "open", "pending"}:
            urgent.append(make_item(
                "customer-request",
                "New request",
                "Prepare owner decision",
                f"New request from {client_name(req)}",
                clean(req.get("service_needed") or req.get("message") or "Customer request needs review."),
                id_of(req),
                "high",
                {"record_type": "customer_request", "request": json_safe(req)},
            ))

    shifts = await safe_recent(db.worker_shift_records, business_query, 40, "updated_at")
    for shift in shifts:
        review = lower(shift.get("review_status") or shift.get("status"))
        if review in {"needs review", "needs_review", "pending", "clocked out"} or shift.get("clock_out_at"):
            approvals.append(make_item(
                "timesheet-review",
                "Timesheet",
                "Review worker time",
                f"{clean(shift.get('worker_name') or 'Worker')} time needs review",
                "Worker clock-out/time record is waiting for owner review before payroll.",
                id_of(shift),
                "medium",
                {"record_type": "worker_shift", "shift": json_safe(shift)},
            ))

    combined = urgent + approvals + actions
    next_item = combined[0] if combined else None
    snapshot = {
        "success": True,
        "date": today,
        "operator_mode": "approval_first",
        "urgent": urgent[:12],
        "approvals": approvals[:12],
        "actions": combined[:30],
        "items": combined[:30],
        "command_items": combined[:30],
        "next_best_move": next_item or {
            "title": "No urgent Command item",
            "summary": "Today looks under control. Keep an eye on worker proof, invoices and quote follow-ups.",
            "action": "Keep watching",
        },
        "briefing": {
            "title": "Today’s Command Brief",
            "summary": f"Churvox found {len(urgent)} urgent item(s), {len(approvals)} approval item(s), and {len(actions)} follow-up/admin item(s).",
            "urgent_count": len(urgent),
            "approval_count": len(approvals),
            "action_count": len(actions),
        },
        "counts": {
            "urgent": len(urgent),
            "approvals": len(approvals),
            "actions": len(actions),
            "total": len(combined),
        },
        "guardrails": [
            "Prepared only",
            "Owner approval required",
            "No automatic sends",
            "No automatic tax filing",
            "No payout files",
        ],
    }
    snapshot["data"] = dict(snapshot)
    return snapshot


async def build_audit_log(db, user, ObjectId, limit=80):
    business_query = scoped_query(user, ObjectId)
    logs = []
    for collection_name in ["ai_operator_audit_log", "command_decisions", "approved_notifications", "notifications"]:
        try:
            rows = await safe_recent(getattr(db, collection_name), business_query, limit, "created_at")
            for row in rows:
                row = json_safe(row)
                row["collection"] = collection_name
                logs.append(row)
        except Exception:
            pass
    logs.sort(key=lambda item: str(item.get("created_at") or item.get("updated_at") or ""), reverse=True)
    logs = logs[:limit]
    return {"success": True, "items": logs, "audit_log": logs, "data": logs}


async def record_decision(db, user, ObjectId, action_id, decision, payload):
    business_id = clean(user.get("business_id") or user.get("id"))
    now = now_utc()
    doc = {
        "business_id": business_id,
        "user_id": clean(user.get("id") or user.get("_id")),
        "email": clean(user.get("email")),
        "action_id": action_id,
        "decision": decision,
        "status": decision,
        "payload": payload or {},
        "source": "old_backend_bridge",
        "note": "Owner decision recorded. Churvox does not auto-send, file tax, or create payout files from this bridge.",
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.command_decisions.insert_one(dict(doc))
    except Exception:
        pass
    try:
        await db.ai_operator_audit_log.insert_one(dict(doc))
    except Exception:
        pass
    try:
        await db.ai_operator_actions.update_one(
            {"id": action_id, "business_id": business_id},
            {"$set": {"status": decision, "decision": decision, "decided_at": now, "updated_at": now}},
        )
    except Exception:
        pass
    return {"success": True, "action_id": action_id, "decision": decision, "status": decision, "message": "Decision recorded for Command review.", "auto_sent": False, "data": json_safe(doc)}


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def plan_usage_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await build_plan_usage(db, user, ObjectId))

    async def billing_status_endpoint(request: Request):
        user = await get_current_user(request)
        return await build_billing_status(db, user, ObjectId)

    async def setup_status_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await build_setup_status(db, user, ObjectId))

    async def command_snapshot_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await build_command_snapshot(db, user, ObjectId))

    async def actions_endpoint(request: Request):
        user = await get_current_user(request)
        snapshot = await build_command_snapshot(db, user, ObjectId)
        return json_safe({"success": True, "actions": snapshot.get("actions", []), "items": snapshot.get("actions", []), "data": snapshot.get("actions", [])})

    async def audit_log_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await build_audit_log(db, user, ObjectId))

    async def settings_get_endpoint(request: Request):
        user = await get_current_user(request)
        setup = await build_setup_status(db, user, ObjectId)
        return json_safe({
            "success": True,
            "operator_mode": "approval_first",
            "accounting_changes_locked": True,
            "settings": {
                "operator_mode": "approval_first",
                "prepare_admin": True,
                "owner_approval_required": True,
                "auto_send": False,
                "auto_sync": False,
                "accounting_changes_locked": True,
            },
            "setup_status": setup,
        })

    async def settings_patch_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await read_payload(request)
        safe_settings = {
            "operator_mode": "approval_first",
            "prepare_admin": bool(payload.get("prepare_admin", True)),
            "owner_approval_required": True,
            "auto_send": False,
            "auto_sync": False,
            "accounting_changes_locked": True,
            "updated_at": now_utc(),
        }
        try:
            await db.ai_operator_settings.update_one(
                {"business_id": clean(user.get("business_id") or user.get("id"))},
                {"$set": safe_settings},
                upsert=True,
            )
        except Exception:
            pass
        return json_safe({"success": True, "settings": safe_settings})

    async def run_daily_check_endpoint(request: Request):
        user = await get_current_user(request)
        snapshot = await build_command_snapshot(db, user, ObjectId)
        try:
            await db.ai_operator_audit_log.insert_one({
                "business_id": clean(user.get("business_id") or user.get("id")),
                "user_id": clean(user.get("id")),
                "source": "daily_check",
                "summary": snapshot.get("briefing", {}).get("summary", ""),
                "counts": snapshot.get("counts", {}),
                "created_at": now_utc(),
            })
        except Exception:
            pass
        return json_safe({"success": True, "snapshot": snapshot, "briefing": snapshot.get("briefing"), "actions": snapshot.get("actions", [])})

    async def business_memory_endpoint(request: Request):
        user = await get_current_user(request)
        usage = await build_plan_usage(db, user, ObjectId)
        snapshot = await build_command_snapshot(db, user, ObjectId)
        memory = {
            "business_id": clean(user.get("business_id") or user.get("id")),
            "plan": usage.get("plan"),
            "usage": usage.get("usage"),
            "command_counts": snapshot.get("counts"),
            "known_focus": [
                "jobs",
                "clients",
                "workers",
                "quotes",
                "invoices",
                "messages",
                "proof",
                "accounting draft sync",
            ],
            "promise": "Churvox prepares the admin. Owner approves in Command.",
        }
        return json_safe({"success": True, "memory": memory, "data": memory})

    async def ask_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await read_payload(request)
        question = clean(payload.get("question") or payload.get("q") or payload.get("message"))
        usage = await build_plan_usage(db, user, ObjectId)
        snapshot = await build_command_snapshot(db, user, ObjectId)
        answer = (
            f"Churvox found {snapshot.get('counts', {}).get('total', 0)} Command item(s). "
            f"Current plan is {PLAN_NAMES.get(usage.get('plan'), usage.get('plan'))}. "
            "I can prepare admin and surface decisions, but owner approval stays required."
        )
        return json_safe({"success": True, "question": question, "answer": answer, "snapshot": snapshot, "usage": usage})

    async def decision_endpoint(request: Request, action_id: str, decision: str = "approved"):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return json_safe(await record_decision(db, user, ObjectId, action_id, decision, payload))

    async def approve_endpoint(request: Request, action_id: str):
        return await decision_endpoint(request, action_id, "approved")

    async def reject_endpoint(request: Request, action_id: str):
        return await decision_endpoint(request, action_id, "rejected")

    async def dismiss_endpoint(request: Request, action_id: str):
        return await decision_endpoint(request, action_id, "dismissed")

    async def park_endpoint(request: Request, action_id: str):
        return await decision_endpoint(request, action_id, "parked")

    routes = [
        ("GET", "/api/plan/usage", plan_usage_endpoint),
        ("GET", "/api/billing/status", billing_status_endpoint),
        ("GET", "/api/billing/subscription-status", billing_status_endpoint),
        ("GET", "/api/ai-operator/setup-status", setup_status_endpoint),
        ("GET", "/api/ai-operator/command-snapshot", command_snapshot_endpoint),
        ("GET", "/api/ai-operator/actions", actions_endpoint),
        ("GET", "/api/ai/actions", actions_endpoint),
        ("GET", "/api/ai-operator/audit-log", audit_log_endpoint),
        ("GET", "/api/ai-operator/settings", settings_get_endpoint),
        ("PATCH", "/api/ai-operator/settings", settings_patch_endpoint),
        ("POST", "/api/ai-operator/settings", settings_patch_endpoint),
        ("GET", "/api/ai-operator/business-memory", business_memory_endpoint),
        ("GET", "/api/ai-operator/daily-briefing", command_snapshot_endpoint),
        ("POST", "/api/ai-operator/ask", ask_endpoint),
        ("POST", "/api/ai/operator/run-daily-check", run_daily_check_endpoint),
        ("POST", "/api/ai/operator/rebuild-slips", run_daily_check_endpoint),
        ("GET", "/api/ai/operator/slips", actions_endpoint),
    ]

    for method, path, endpoint in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    decision_routes = [
        ("POST", "/api/ai-operator/actions/{action_id}/approve", approve_endpoint),
        ("POST", "/api/ai-operator/actions/{action_id}/reject", reject_endpoint),
        ("POST", "/api/ai-operator/actions/{action_id}/dismiss", dismiss_endpoint),
        ("POST", "/api/ai-operator/actions/{action_id}/park", park_endpoint),
        ("POST", "/api/ai/operator/actions/{action_id}/approve", approve_endpoint),
        ("POST", "/api/ai/operator/actions/{action_id}/reject", reject_endpoint),
        ("POST", "/api/ai/operator/actions/{action_id}/dismiss", dismiss_endpoint),
        ("POST", "/api/ai/operator/actions/{action_id}/park", park_endpoint),
        ("POST", "/api/ai/operator/actions/{action_id}/approve-send-final", approve_endpoint),
    ]
    for method, path, endpoint in decision_routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
