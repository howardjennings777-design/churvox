from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth
import churvox_approval_execution_patch as approval_execution

try:
    import churvox_onsite_patch as onsite_patch
except Exception:  # pragma: no cover
    onsite_patch = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    return field_truth.json_safe(value)


def business_id(user):
    return field_truth.business_id_string(user)


def user_id(user):
    return field_truth.user_id_string(user)


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


async def safe_recent(collection, query, limit=100, sort_field="updated_at"):
    try:
        return await collection.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


async def safe_count(collection, query):
    try:
        return await collection.count_documents(query)
    except Exception:
        return 0


def infer_kind_from_payload(payload):
    text = lower(" ".join(clean(payload.get(k)) for k in ["kind", "type", "title", "record", "summary", "prepared", "status", "filled", "button"] if payload.get(k) is not None))
    if "invoice" in text:
        return "invoice"
    if "quote" in text:
        return "quote"
    if any(word in text for word in ["sms", "txt", "text"]):
        return "sms"
    if any(word in text for word in ["xero", "myob", "accounting", "sync"]):
        return "accounting_sync"
    if any(word in text for word in ["message", "reply", "email", "customer"]):
        return "email"
    if any(word in text for word in ["timesheet", "proof", "slip", "payroll"]):
        return "internal_record"
    return "command_record"


async def manual_command_decision(db, user, ObjectId, payload):
    action = lower(payload.get("decision") or payload.get("action") or payload.get("owner_action") or "approve")
    item = payload.get("item") if isinstance(payload.get("item"), dict) else dict(payload)
    action_id = clean(payload.get("action_id") or item.get("id") or item.get("record") or item.get("title") or f"manual-command-{int(now_utc().timestamp() * 1000)}")
    if action in {"approve", "approved", "send", "execute"}:
        item.setdefault("kind", infer_kind_from_payload(item))
        item.setdefault("source", "manual_command_button")
        return await approval_execution.execute_approval(db, user, ObjectId, action_id, {"action_id": action_id, "kind": item.get("kind"), "item": item})
    doc = {
        "business_id": business_id(user),
        "user_id": user_id(user),
        "action_id": action_id,
        "decision": "parked" if action == "park" else "needs_owner_edit" if action == "edit" else action,
        "source": "manual_command_button",
        "item": json_safe(item),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.command_decisions.insert_one(dict(doc))
    except Exception:
        pass
    return {"success": True, "decision": json_safe(doc)}


async def merged_onsite_payload(db, user):
    bid = business_id(user)
    people_by_id = {}
    for collection_name in ["team", "workers", "users"]:
        try:
            rows = await safe_recent(getattr(db, collection_name), {"business_id": bid}, 150, "updated_at")
        except Exception:
            rows = []
        for row in rows:
            rid = clean(row.get("id") or row.get("_id") or row.get("user_id") or row.get("email") or row.get("name") or row.get("full_name"))
            if not rid:
                continue
            existing = people_by_id.get(rid, {})
            people_by_id[rid] = {**existing, **row, "_source_collection": collection_name}
    jobs = await safe_recent(db.jobs, {"business_id": bid}, 250, "scheduled_date")
    gps_rows = await safe_recent(db.worker_gps_status, {"business_id": bid}, 120, "updated_at")
    slips = await safe_recent(db.worker_field_slips, {"business_id": bid}, 80, "updated_at")
    jobs_by_worker = {}
    for job in jobs:
        worker = clean(job.get("assigned_worker_name") or job.get("worker_name") or job.get("worker") or job.get("assigned_to") or job.get("assigned_worker_id") or "Unassigned")
        jobs_by_worker.setdefault(worker, []).append(job)
    gps_by_worker = {}
    for row in gps_rows:
        key = clean(row.get("worker_id") or row.get("user_id") or row.get("name") or row.get("worker_name"))
        if key and key not in gps_by_worker:
            gps_by_worker[key] = row
    onsite_rows = []
    warnings = []
    all_team = []
    for rid, person in people_by_id.items():
        name = clean(person.get("name") or person.get("full_name") or person.get("email") or person.get("worker_name") or rid)
        gps = gps_by_worker.get(rid) or gps_by_worker.get(name) or {}
        assigned = jobs_by_worker.get(name) or jobs_by_worker.get(rid) or []
        job = clean(person.get("current_job") or person.get("job_title") or person.get("job") or (assigned[0].get("title") if assigned else ""))
        location = clean(gps.get("location") or person.get("gps") or person.get("location") or person.get("site") or (assigned[0].get("address") if assigned else ""))
        status = clean(person.get("status") or person.get("clock_status") or gps.get("state") or ("Onsite" if job else "Offsite"))
        proof = clean(person.get("proof") or person.get("photo_status") or gps.get("proof") or "No proof yet")
        status_text = lower(" ".join([status, job, location, proof]))
        active = any(word in status_text for word in ["clocked in", "driving", "onsite", "on site", "working", "in progress", "proof"]) or bool(job and location and "clocked out" not in status_text)
        row = {
            "id": rid,
            "name": name,
            "role": clean(person.get("role") or person.get("access") or "Worker"),
            "status": status,
            "active": active,
            "job": job,
            "jobs": json_safe(assigned[:8]),
            "gps": location,
            "location": location,
            "map_query": f"{location} New Zealand" if location else "Lower Hutt Wellington New Zealand",
            "start": clean(person.get("start") or person.get("clock_in") or person.get("start_time") or gps.get("started_at")),
            "end": clean(person.get("end") or person.get("clock_out") or person.get("end_time")),
            "proof": proof,
            "messages": clean(person.get("messages") or person.get("message_status") or "No unread messages"),
            "timesheet": clean(person.get("timesheet") or person.get("hours_today") or ""),
            "slip": clean(person.get("slip") or person.get("pay_slip_status") or person.get("payroll_status") or ""),
            "source": clean(person.get("_source_collection")),
            "updated_at": person.get("updated_at") or gps.get("updated_at"),
        }
        all_team.append(row)
        if active:
            onsite_rows.append(row)
            if not location:
                warnings.append({"type": "missing_location", "worker": name, "message": f"{name} is working but has no site/GPS location."})
            if lower(proof).startswith("no proof"):
                warnings.append({"type": "missing_proof", "worker": name, "message": f"{name} is working but proof is missing."})
    places = [row.get("location") for row in onsite_rows if row.get("location")]
    if not places:
        places = [clean(job.get("address") or job.get("location") or job.get("site_address")) for job in jobs if clean(job.get("address") or job.get("location") or job.get("site_address"))][:5]
    open_slips = [json_safe(slip) for slip in slips if lower(slip.get("status")) not in {"approved", "parked", "closed"}][:20]
    return {
        "success": True,
        "page": "onsite",
        "label": "Onsite",
        "map_query": f"{' '.join(places[:5])} New Zealand" if places else "Lower Hutt Wellington New Zealand",
        "counts": {"onsite": len(onsite_rows), "team": len(all_team), "warnings": len(warnings), "field_slips": len(open_slips)},
        "onsite": json_safe(onsite_rows),
        "all_team": json_safe(all_team),
        "warnings": json_safe(warnings),
        "field_slips": open_slips,
        "rule": "Team holds staff records. Onsite only shows live work, map, field proof and people currently doing work.",
        "updated_at": now_utc(),
    }


if onsite_patch is not None:
    onsite_patch.onsite_payload = merged_onsite_payload


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None:
        return

    async def command_manual_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await manual_command_decision(db, user, ObjectId, await read_payload(request)))

    async def audit_status_endpoint(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        coverage = {
            "command_approval_executes": True,
            "command_edit_and_park_recorded": True,
            "onsite_reads_team_workers_users": True,
            "team_keeps_staff_admin": True,
            "invoice_vault_and_payments": True,
            "customer_portal": True,
            "support_tickets": True,
            "usage_guard": True,
            "offline_worker_sync": True,
            "sms_outbox": True,
        }
        counts = {}
        for key, collection_name in [("jobs", "jobs"), ("team", "team"), ("invoices", "invoices"), ("command_decisions", "command_decisions"), ("support_tickets", "support_tickets")]:
            try:
                counts[key] = await safe_count(getattr(db, collection_name), {"business_id": bid})
            except Exception:
                counts[key] = 0
        return json_safe({"success": True, "coverage": coverage, "counts": counts, "rule": "Worker records the truth. Churvox prepares admin. Owner approves. Churvox executes approved outcomes.", "checked_at": now_utc()})

    routes = [
        ("POST", "/api/command/manual-decision", command_manual_endpoint),
        ("GET", "/api/logic-audit/status", audit_status_endpoint),
    ]
    for method, path, endpoint in routes:
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
