from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import inspect
import re
from typing import Any, Dict, Iterable, List, Optional

from starlette.requests import Request as StarletteRequest


VERSION = "churvox-command-runs-office-v1-20260715"
TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_ROLES = {"employer", "owner", "admin", "manager", "office_admin", "business_owner"}
ACTIVE_STATUSES = {"", "active", "enabled", "invited", "accepted", "ready", "working"}
INACTIVE_WORDS = {"inactive", "disabled", "deleted", "archived", "removed", "former", "left"}
OPEN_JOB_WORDS = {"", "open", "new", "planned", "scheduled", "assigned", "acknowledged", "in progress", "in_progress", "paused", "ready"}
STOP_WORDS = {
    "a", "an", "and", "at", "client", "customer", "for", "from", "in", "job", "of", "on", "service", "the", "to", "visit", "work",
}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value, fallback="", limit=1800):
    try:
        text = " ".join(str(value or "").strip().split())
    except Exception:
        text = ""
    return text[:limit] or fallback


def lower(value):
    return clean(value).lower()


def has_value(value):
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (list, tuple, set, dict)):
        return bool(value)
    return True


def first(row, keys, fallback=""):
    for key in keys:
        value = (row or {}).get(key)
        if has_value(value):
            return value
    return fallback


def as_list(value):
    if isinstance(value, list):
        return value
    if isinstance(value, (tuple, set)):
        return list(value)
    if isinstance(value, dict):
        return list(value.values())
    if value is None:
        return []
    return [value]


def text_list(value):
    output = []
    for item in as_list(value):
        if isinstance(item, dict):
            text = clean(first(item, ["text", "label", "name", "value", "detail", "reason"], ""))
        else:
            text = clean(item)
        if text:
            output.append(text)
    return output


def maybe_oid(ObjectId, value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def business_id(user):
    return clean(first(user or {}, ["business_id", "businessId", "owner_business_id", "id", "_id"], ""), "", 180)


def business_query(ObjectId, bid):
    values = [bid]
    oid = maybe_oid(ObjectId, bid)
    if oid is not None:
        values.append(oid)
    return {
        "$or": [
            {"business_id": {"$in": values}},
            {"businessId": {"$in": values}},
            {"contractor_id": {"$in": values}},
            {"owner_business_id": {"$in": values}},
            {"owner_id": {"$in": values}},
            {"ownerId": {"$in": values}},
        ]
    }


def row_ids(ObjectId, row):
    values = []
    for key in ["_id", "id", "record_id", "job_id", "jobId", "worker_id", "workerId", "user_id", "userId", "source_id"]:
        value = (row or {}).get(key)
        if has_value(value):
            values.append(str(value))
            oid = maybe_oid(ObjectId, value)
            if oid is not None:
                values.append(str(oid))
    return set(values)


def worker_identity(ObjectId, row):
    ids = row_ids(ObjectId, row)
    name = lower(worker_name(row))
    email = lower(first(row, ["email", "worker_email", "login_email", "user_email"], ""))
    return ids, name, email


def worker_name(row):
    return clean(first(row, ["name", "full_name", "display_name", "worker_name", "staff_name", "employee_name", "email"], "Worker"), "Worker", 180)


def worker_active(row):
    if (row or {}).get("active") is False or (row or {}).get("is_active") is False or (row or {}).get("enabled") is False:
        return False
    status = lower(first(row, ["status", "worker_status", "employment_status", "state"], ""))
    if any(word in status for word in INACTIVE_WORDS):
        return False
    role = lower(first(row, ["role", "user_role", "account_type", "type"], ""))
    if role in OWNER_ROLES or role in {"client", "customer"}:
        return False
    return status in ACTIVE_STATUSES or not status


def parse_date(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    raw = clean(value)
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    for fmt in ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%d/%m/%Y", "%d-%m-%Y", "%d %B %Y", "%d %b %Y"]:
        try:
            return datetime.strptime(raw[:19], fmt).replace(tzinfo=timezone.utc)
        except Exception:
            continue
    return None


def record_date(row):
    return parse_date(first(row, ["scheduled_at", "scheduled_date", "schedule_date", "start_at", "start_date", "start_time", "date", "appointment_at"], ""))


def status_text(row):
    return lower(first(row, ["status", "job_status", "state"], ""))


def job_open(row):
    text = status_text(row).replace("-", " ").replace("_", " ")
    return text in OPEN_JOB_WORDS or not any(word in text for word in ["complete", "closed", "done", "cancel", "delete", "archive"])


def job_complete(row):
    text = status_text(row).replace("-", " ").replace("_", " ")
    return any(word in text.split() for word in ["complete", "completed", "closed", "done", "finished"])


def client_key(row):
    return lower(first(row, ["client_id", "customer_id", "client", "customer", "client_name", "customer_name"], ""))


def service_text(row):
    return clean(" ".join(clean((row or {}).get(key)) for key in ["service_type", "service", "job_type", "title", "job_title", "description", "notes"]), "", 2400)


def tokens(value):
    return {word for word in re.findall(r"[a-z0-9]+", lower(value)) if len(word) > 2 and word not in STOP_WORDS}


def worker_skill_text(row):
    values = []
    for key in ["skills", "skill", "trade", "trades", "services", "service_types", "specialties", "specialities", "capabilities", "position", "job_title", "role", "notes"]:
        value = (row or {}).get(key)
        if isinstance(value, (list, tuple, set)):
            values.extend(clean(item) for item in value)
        elif isinstance(value, dict):
            values.extend(clean(item) for item in value.values())
        else:
            values.append(clean(value))
    return " ".join(item for item in values if item)


def assigned_to(ObjectId, job, worker):
    job_ids = set()
    for key in ["worker_id", "workerId", "assigned_worker_id", "assignedWorkerId", "staff_id", "employee_id", "assigned_to_id"]:
        value = (job or {}).get(key)
        if has_value(value):
            job_ids.add(str(value))
    job_names = {lower(first(job, ["worker_name", "assigned_worker_name", "staff_name", "employee_name", "worker", "assigned_to"], ""))}
    job_emails = {lower(first(job, ["worker_email", "assigned_worker_email", "staff_email"], ""))}
    worker_ids, name, email = worker_identity(ObjectId, worker)
    return bool(job_ids & worker_ids or (name and name in job_names) or (email and email in job_emails))


def same_day(left, right):
    return bool(left and right and left.date() == right.date())


def explicit_unavailable(worker, scheduled):
    if not scheduled:
        return False, "Exact availability can be checked after a date/time is confirmed"
    date_key = scheduled.date().isoformat()
    weekday = scheduled.strftime("%A").lower()
    unavailable = lower(first(worker, ["unavailable_dates", "blocked_dates", "leave_dates", "time_off"], ""))
    if date_key and date_key in unavailable:
        return True, f"Marked unavailable on {date_key}"
    available_days = lower(first(worker, ["available_days", "working_days", "days_available"], ""))
    if available_days and weekday not in available_days:
        return True, f"{scheduled.strftime('%A')} is not in the recorded available days"
    return False, "No recorded availability block found"


def rank_workers(ObjectId, job, workers, jobs):
    scheduled = record_date(job)
    job_client = client_key(job)
    job_tokens = tokens(service_text(job))
    ranked = []
    for worker in workers:
        if not worker_active(worker):
            continue
        name = worker_name(worker)
        skill_tokens = tokens(worker_skill_text(worker))
        overlap = sorted(job_tokens & skill_tokens)
        same_client = 0
        same_service = 0
        completed = 0
        workload = 0
        clashes = 0
        for past in jobs:
            if not assigned_to(ObjectId, past, worker):
                continue
            past_date = record_date(past)
            if job_complete(past):
                completed += 1
                if job_client and client_key(past) == job_client:
                    same_client += 1
                if job_tokens and job_tokens & tokens(service_text(past)):
                    same_service += 1
            if job_open(past) and scheduled and same_day(scheduled, past_date):
                if row_ids(ObjectId, past) & row_ids(ObjectId, job):
                    continue
                workload += 1
                if past_date and abs((past_date - scheduled).total_seconds()) < 90 * 60:
                    clashes += 1
        unavailable, availability_reason = explicit_unavailable(worker, scheduled)
        score = 20
        if assigned_to(ObjectId, job, worker):
            score += 70
        score += min(same_client, 4) * 18
        score += min(same_service, 5) * 10
        score += min(len(overlap), 5) * 7
        score += min(completed, 10)
        score -= min(workload, 6) * 5
        score -= clashes * 70
        if unavailable:
            score -= 90
        reasons = []
        if same_client:
            reasons.append(f"worked for this client {same_client} time{'s' if same_client != 1 else ''}")
        if same_service:
            reasons.append(f"completed {same_service} similar job{'s' if same_service != 1 else ''}")
        if overlap:
            reasons.append(f"skills match: {', '.join(overlap[:4])}")
        if scheduled:
            reasons.append("no same-time clash found" if not clashes and not unavailable else f"{clashes} schedule clash{'es' if clashes != 1 else ''} found" if clashes else availability_reason)
            reasons.append(f"{workload} other assigned job{'s' if workload != 1 else ''} that day")
        else:
            reasons.append("worker suitability ranked before the exact schedule is confirmed")
        if not same_client and not same_service and not overlap:
            reasons.append("ranked from active-team status and current workload because no stronger history was recorded")
        ranked.append({
            "id": clean(first(worker, ["_id", "id", "worker_id", "user_id"], ""), "", 180),
            "name": name,
            "score": score,
            "reasons": reasons,
            "same_client_jobs": same_client,
            "similar_jobs": same_service,
            "workload_that_day": workload,
            "schedule_clashes": clashes,
            "availability_blocked": unavailable,
        })
    ranked.sort(key=lambda item: (-item["score"], item["schedule_clashes"], item["workload_that_day"], item["name"].lower()))
    return ranked


def payload_of(slip):
    payload = slip.get("payload")
    if not isinstance(payload, dict):
        payload = {}
        slip["payload"] = payload
    return payload


def prepared_form(payload):
    form = payload.get("prepared_form")
    if not isinstance(form, dict):
        form = {}
        payload["prepared_form"] = form
    return form


def field_sources(payload):
    sources = payload.get("field_sources")
    if not isinstance(sources, dict):
        sources = {}
        payload["field_sources"] = sources
    return sources


def set_field(payload, label, value, source, confidence=0.8, missing_action=""):
    prepared_form(payload)[label] = value
    field_sources(payload)[label] = {
        "value": value,
        "source": clean(source, "Churvox decision engine", 300),
        "confidence": round(max(0.1, min(float(confidence), 0.99)), 2),
        "missing_action": clean(missing_action, "", 240),
    }


def confidence_summary(payload):
    confidence = payload.get("confidence") if isinstance(payload.get("confidence"), dict) else {}
    score = confidence.get("score")
    reasons = text_list(confidence.get("why"))
    score_text = ""
    try:
        number = float(score)
        score_text = f"{round(number * 100 if number <= 1 else number)}% confidence"
    except Exception:
        pass
    return score_text, reasons


def generic_recommendation(slip):
    payload = payload_of(slip)
    actions = text_list(payload.get("actions"))
    primary = next((action for action in actions if not re.search(r"\b(ask|park|ignore|snooze|later|personally)\b", action, re.I)), actions[0] if actions else "Approve the prepared decision")
    prepared = clean(slip.get("prepared") or payload.get("recommendation"), "Approve the prepared decision shown in this slip.")
    evidence = text_list(payload.get("evidence") or slip.get("evidence"))
    score_text, confidence_reasons = confidence_summary(payload)
    reason_parts = []
    if evidence:
        reason_parts.append("Evidence: " + " · ".join(evidence[:3]))
    if confidence_reasons:
        reason_parts.append("Why: " + " · ".join(confidence_reasons[:3]))
    if score_text:
        reason_parts.append(score_text)
    reason = ". ".join(reason_parts) or "Churvox matched the live record to the prepared office rule and kept every uncertain field editable."
    alternatives = [action for action in actions if action != primary][:3]
    effects = text_list(payload.get("will_do")) or ["Create or update the owner-approved internal draft", "Record the owner decision", "Keep external sends, syncs, charges, tax filing and payments locked"]
    return primary, prepared, reason, alternatives, effects


def remove_worker_block(payload):
    required = [item for item in text_list(payload.get("required_fields")) if "worker" not in item.lower() and "staff" not in item.lower()]
    missing = [item for item in text_list(payload.get("missing")) if not re.search(r"choose (?:a )?(?:worker|staff)|leave assignment|remain unassigned", item, re.I)]
    payload["required_fields"] = required
    payload["missing"] = missing
    payload["approval_blocked"] = bool(required)
    prepared_form(payload)["Owner check before approval"] = " · ".join(missing) if missing else "Churvox has prepared a complete recommendation. The owner can still edit any field."


def enrich_worker_decision(ObjectId, slip, job, workers, jobs):
    payload = payload_of(slip)
    ranked = rank_workers(ObjectId, job, workers, jobs)
    if ranked:
        top = ranked[0]
        backups = ranked[1:3]
        reason = "; ".join(top["reasons"][:5])
        backup_text = [f"{item['name']} — {'; '.join(item['reasons'][:2])}" for item in backups]
        recommendation = f"Assign {top['name']} to {clean(first(job, ['title', 'job_title', 'service', 'description'], 'this job'), 'this job', 220)}"
        effects = [
            f"Create the owner-approved internal assignment draft with {top['name']} selected",
            "Keep any worker or customer message unsent until separately approved",
            "Record the worker-ranking evidence and owner decision",
        ]
        actions = [f"Approve {top['name']}"]
        if backups:
            actions.append("Choose backup")
        actions.extend(["Ask staff", "Park"])
        set_field(payload, "Churvox recommends", recommendation, "ranked active workers using client continuity, similar work, recorded skills, schedule clashes and workload", 0.94 if top["score"] >= 60 else 0.76)
        set_field(payload, "Recommended worker", top["name"], "highest suitable-worker score", 0.94 if top["score"] >= 60 else 0.76)
        set_field(payload, "Why this worker", reason, "worker ranking evidence", 0.9)
        set_field(payload, "Backup workers", backup_text or ["No other active suitable worker found"], "next highest suitable-worker scores", 0.86 if backups else 0.5)
        set_field(payload, "Schedule / capacity check", f"{top['schedule_clashes']} clash(es); {top['workload_that_day']} other job(s) that day", "current open jobs and recorded availability", 0.9 if record_date(job) else 0.62, "Confirm date/time" if not record_date(job) else "")
        payload["recommended_worker"] = top
        payload["worker_alternatives"] = backups
        payload["recommended_decision"] = recommendation
        payload["recommendation_reason"] = reason
        payload["alternatives"] = backup_text
        payload["approval_effect"] = effects
        payload["actions"] = actions
        payload["owner_question"] = f"Approve {top['name']}, choose a backup, ask staff, or park this job?"
        payload["will_do"] = effects
        remove_worker_block(payload)
        slip["prepared"] = f"Churvox recommends {top['name']}. {reason}."
        slip["why"] = payload["owner_question"]
    else:
        recommendation = "Keep the job unassigned and prepare one team-availability check because no active suitable worker record was found"
        reason = "Churvox checked the active team records and could not safely rank a worker. It will not guess a name."
        effects = ["Create an internal team-availability request draft", "Keep the job unassigned", "Do not message staff until the owner approves the request"]
        set_field(payload, "Churvox recommends", recommendation, "active-team and worker-history check", 0.72)
        set_field(payload, "Why", reason, "no active rankable worker found", 0.98)
        set_field(payload, "Next prepared step", "Ask the active team who can take this job", "safe fallback when no suitable worker can be ranked", 0.9)
        payload["recommended_decision"] = recommendation
        payload["recommendation_reason"] = reason
        payload["alternatives"] = []
        payload["approval_effect"] = effects
        payload["will_do"] = effects
        payload["actions"] = ["Approve availability check", "Leave unassigned", "Park"]
        payload["owner_question"] = "Approve the prepared availability check, leave it unassigned, or park it?"
        slip["prepared"] = f"Churvox recommends a team-availability check instead of making up a worker. {reason}"
        slip["why"] = payload["owner_question"]


def enrich_generic_decision(slip):
    payload = payload_of(slip)
    primary, recommendation, reason, alternatives, effects = generic_recommendation(slip)
    set_field(payload, "Churvox recommends", recommendation, "prepared office-role judgement", 0.86)
    set_field(payload, "Why this is the best next step", reason, "record evidence and confidence reasons", 0.88)
    set_field(payload, "Other safe options", alternatives or ["Edit the prepared fields", "Park the decision"], "remaining owner-controlled actions", 0.9)
    set_field(payload, "What approval will do", effects, "approved internal action contract", 0.96)
    payload["recommended_decision"] = recommendation
    payload["recommendation_reason"] = reason
    payload["alternatives"] = alternatives
    payload["approval_effect"] = effects
    if not text_list(payload.get("actions")):
        payload["actions"] = [primary, "Park"]
    slip["prepared"] = f"Churvox recommends: {recommendation}"


def source_job(ObjectId, slip, jobs):
    target = clean(slip.get("source_id") or payload_of(slip).get("record_id"), "")
    if not target:
        return None
    for job in jobs:
        if target in row_ids(ObjectId, job):
            return job
    return None


def enrich_slip(ObjectId, slip, context):
    if not isinstance(slip, dict):
        return slip
    payload = payload_of(slip)
    action = clean(slip.get("action_type"))
    job = source_job(ObjectId, slip, context.get("jobs", []))
    if action in {"complete_job_setup", "prepare_recurring_next_date"} and job:
        enrich_worker_decision(ObjectId, slip, job, context.get("workers", []), context.get("jobs", []))
    else:
        enrich_generic_decision(slip)
    payload["command_runs_office"] = True
    payload["decision_contract_version"] = VERSION
    payload["owner_review_only"] = True
    payload["prepared_only"] = True
    payload["no_auto_send"] = True
    payload["no_auto_sync"] = True
    payload["no_auto_charge"] = True
    payload["no_auto_record_change"] = True
    slip["owner_review_only"] = True
    slip["prepared_only"] = True
    slip["no_auto_send"] = True
    slip["no_auto_sync"] = True
    slip["no_auto_charge"] = True
    slip["no_auto_record_change"] = True
    slip["updated_at"] = now_utc()
    return slip


async def cursor_rows(collection, query, limit):
    try:
        cursor = collection.find(query)
        try:
            cursor = cursor.sort("updated_at", -1)
        except Exception:
            pass
        return await cursor.limit(limit).to_list(length=limit)
    except TypeError:
        try:
            return await collection.find(query).limit(limit).to_list(limit)
        except Exception:
            return []
    except Exception:
        return []


async def load_context(db, ObjectId, user):
    bid = business_id(user)
    query = business_query(ObjectId, bid)
    jobs = []
    workers = []
    for name in ["jobs", "job_records", "appointments", "bookings"]:
        jobs.extend(await cursor_rows(db[name], query, 260))
    for name in ["workers", "team", "team_members", "staff", "employees", "users"]:
        workers.extend(await cursor_rows(db[name], query, 180))
    deduped = []
    seen = set()
    for worker in workers:
        ids, name, email = worker_identity(ObjectId, worker)
        key = next(iter(ids), "") or email or name
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(worker)
    return {"jobs": jobs, "workers": deduped}


async def current_user(get_current_user, request):
    user = await get_current_user(request)
    role = lower(first(user or {}, ["role", "user_role", "account_type"], ""))
    if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
        return None
    return user


async def persist_slip(db, ObjectId, user, slip):
    slip_id = clean(slip.get("id") or slip.get("_id"), "")
    query = None
    if slip_id:
        oid = maybe_oid(ObjectId, slip_id)
        query = {"_id": oid} if oid is not None else {"id": slip_id}
    if query is None:
        query = {
            "business_id": business_id(user),
            "source_type": slip.get("source_type"),
            "action_type": slip.get("action_type"),
            "source_id": slip.get("source_id"),
            "status": {"$in": ["open", "edited", "pending", "ready", "waiting", "snoozed"]},
        }
    update = {
        "payload": payload_of(slip),
        "prepared": slip.get("prepared"),
        "why": slip.get("why"),
        "owner_review_only": True,
        "prepared_only": True,
        "no_auto_send": True,
        "no_auto_sync": True,
        "no_auto_charge": True,
        "no_auto_record_change": True,
        "updated_at": now_utc(),
    }
    try:
        await db.command_slips.update_one(query, {"$set": update})
    except Exception:
        pass


def route_for(app, path, method):
    method = method.upper()
    for route in list(getattr(app.router, "routes", [])):
        if getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()):
            return route
    return None


def remove_route(app, path, method):
    method = method.upper()
    app.router.routes = [
        route for route in app.router.routes
        if not (getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()))
    ]


def promote_route(app, path, method):
    method = method.upper()
    preferred = [route for route in app.router.routes if getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set())]
    if preferred:
        app.router.routes = preferred + [route for route in app.router.routes if route not in preferred]


async def invoke(endpoint, request, payload_marker=False):
    parameters = inspect.signature(endpoint).parameters
    kwargs = {}
    if "request" in parameters:
        kwargs["request"] = request
    if payload_marker is not False and "payload" in parameters:
        kwargs["payload"] = payload_marker
    result = endpoint(**kwargs)
    if inspect.isawaitable(result):
        return await result
    return result


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    module_name = getattr(module, "__name__", "")
    if not app or db is None or not get_current_user or ObjectId is None or module_name in INSTALLED:
        return

    scan_route = route_for(app, "/api/command/scan", "POST")
    slips_route = route_for(app, "/api/command/slips", "GET")
    original_scan = getattr(scan_route, "endpoint", None) if scan_route else None
    original_slips = getattr(slips_route, "endpoint", None) if slips_route else None

    if original_scan:
        async def command_scan(request: StarletteRequest, payload: Optional[Dict[str, Any]] = None):
            result = await invoke(original_scan, request, payload)
            if not isinstance(result, dict):
                return result
            user = await current_user(get_current_user, request)
            if not user:
                return result
            context = await load_context(db, ObjectId, user)
            for key in ["slips", "existing"]:
                rows = result.get(key)
                if not isinstance(rows, list):
                    continue
                enriched = []
                for slip in rows:
                    next_slip = enrich_slip(ObjectId, slip, context)
                    enriched.append(next_slip)
                    await persist_slip(db, ObjectId, user, next_slip)
                result[key] = enriched
            result["decision_contract_version"] = VERSION
            result["command_runs_office"] = True
            result["message"] = clean(result.get("message"), "Command scan complete.") + " Every surviving slip now carries a Churvox recommendation, reasons, alternatives and approval effect."
            return result

        command_scan.__name__ = "command_scan_runs_office"
        remove_route(app, "/api/command/scan", "POST")
        app.add_api_route("/api/command/scan", command_scan, methods=["POST"])
        promote_route(app, "/api/command/scan", "POST")

    if original_slips:
        async def command_slips(request: StarletteRequest):
            result = await invoke(original_slips, request)
            if not isinstance(result, dict):
                return result
            user = await current_user(get_current_user, request)
            rows = result.get("slips")
            if not user or not isinstance(rows, list):
                return result
            context = await load_context(db, ObjectId, user)
            enriched = []
            for slip in rows:
                next_slip = enrich_slip(ObjectId, slip, context)
                enriched.append(next_slip)
                await persist_slip(db, ObjectId, user, next_slip)
            result["slips"] = enriched
            result["decision_contract_version"] = VERSION
            result["command_runs_office"] = True
            return result

        command_slips.__name__ = "command_slips_run_office"
        remove_route(app, "/api/command/slips", "GET")
        app.add_api_route("/api/command/slips", command_slips, methods=["GET"])
        promote_route(app, "/api/command/slips", "GET")

    INSTALLED.add(module_name)
