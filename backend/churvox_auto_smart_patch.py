from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

try:
    import command_hub_routes
except Exception:  # pragma: no cover
    command_hub_routes = None

try:
    import churvox_field_truth_patch as field_truth
except Exception:  # pragma: no cover
    field_truth = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()
FINAL_STATUSES = {"approved", "completed", "declined", "dismissed", "rejected", "sent", "archived"}
ACTIVE_JOB_STATUSES = {"assigned", "acknowledged", "in_progress", "paused", "scheduled", "open", "ready"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    if field_truth is not None:
        try:
            return field_truth.json_safe(value)
        except Exception:
            pass
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def business_id(user):
    if field_truth is not None:
        try:
            return field_truth.business_id_string(user)
        except Exception:
            pass
    return clean((user or {}).get("business_id") or (user or {}).get("owner_business_id") or (user or {}).get("contractor_id") or (user or {}).get("id") or (user or {}).get("_id"))


def user_id(user):
    if field_truth is not None:
        try:
            return field_truth.user_id_string(user)
        except Exception:
            pass
    return clean((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("email"))


def doc_id(doc):
    if not isinstance(doc, dict):
        return ""
    raw = doc.get("_id") or doc.get("id") or doc.get("job_id") or doc.get("invoice_id") or doc.get("quote_id") or ""
    return clean(raw)


def title_of(job):
    return clean(job.get("title") or job.get("job_name") or job.get("job_title") or job.get("service_type") or job.get("job_type") or "Job")


def client_of(record):
    return clean(record.get("client_name") or record.get("customer_name") or record.get("client") or record.get("customer") or record.get("name") or "No customer")


def amount_of(record):
    for key in ["amount", "total", "total_amount", "subtotal", "price", "quote_total", "invoice_total", "estimated_total", "fixed_price"]:
        try:
            value = float(str(record.get(key) or 0).replace("$", "").replace(",", ""))
            if value:
                return value
        except Exception:
            pass
    return 0.0


def status_of(record):
    return lower(record.get("status") or record.get("job_status") or record.get("workflow_status") or record.get("review_status"))


def is_complete(job):
    status = status_of(job)
    return status in {"complete", "completed", "done", "finished"} or bool(job.get("completed") or job.get("completed_at"))


def is_active(job):
    return status_of(job) in ACTIVE_JOB_STATUSES and not is_complete(job)


def scoped_query(user, ObjectId, extra=None):
    if field_truth is not None:
        try:
            return field_truth.scoped_query(user, ObjectId, extra)
        except Exception:
            pass
    bid = business_id(user)
    clauses = [{"business_id": bid}, {"contractor_id": bid}, {"owner_business_id": bid}]
    query = {"$or": clauses}
    if extra:
        return {"$and": [query, extra]}
    return query


async def to_list(cursor, limit):
    try:
        return await cursor.to_list(length=limit)
    except TypeError:
        return await cursor.to_list(limit)
    except Exception:
        return []


async def safe_recent(collection, query, limit=120, sort_field="updated_at"):
    try:
        return await to_list(collection.find(query).sort(sort_field, -1).limit(limit), limit)
    except Exception:
        try:
            return await to_list(collection.find(query).limit(limit), limit)
        except Exception:
            return []


async def safe_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def invoice_exists_for_job(db, user, ObjectId, job_id):
    bid = business_id(user)
    values = [str(job_id)]
    try:
        values.append(ObjectId(str(job_id)))
    except Exception:
        pass
    query = {"business_id": bid, "$or": [
        {"job_id": {"$in": values}},
        {"source_job_id": {"$in": values}},
        {"linked_job_id": {"$in": values}},
        {"job": {"$in": values}},
    ]}
    return bool(await safe_one(db.invoices, query))


def action(action_type, title, summary, priority="medium", payload=None, source="auto_smart"):
    payload = payload or {}
    seed = clean(payload.get("job_id") or payload.get("invoice_id") or payload.get("quote_id") or payload.get("slip_id") or title).lower().replace(" ", "-")[:80]
    return {
        "id": f"auto-smart:{action_type}:{seed}",
        "type": action_type,
        "category": "Command",
        "action": title,
        "title": title,
        "summary": summary,
        "reason": summary,
        "found": title,
        "prepared": "Churvox scanned live records and prepared this for owner review. Nothing is sent, synced, filed or paid automatically.",
        "check": "Approve, edit or park in Command.",
        "owner": "Approve, edit or park",
        "next": "Owner approval required before Churvox executes.",
        "priority": priority,
        "status": "pending",
        "source": source,
        "auto_prepared": True,
        "requires_owner_approval": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
        **payload,
    }


async def manual_scan(db, user, ObjectId):
    query = scoped_query(user, ObjectId)
    jobs = await safe_recent(db.jobs, query, 300, "updated_at")
    invoices = await safe_recent(db.invoices, query, 180, "updated_at")
    quotes = await safe_recent(db.quotes, query, 180, "updated_at")
    slips = await safe_recent(db.worker_field_slips, {"business_id": business_id(user), "status": {"$in": ["waiting_owner_review", "needs_owner_edit", "parked", "open", "pending"]}}, 120, "updated_at")
    actions = []

    for job in jobs:
        jid = doc_id(job)
        if not jid:
            continue
        title = title_of(job)
        client = client_of(job)
        assigned = clean(job.get("assigned_worker_id") or job.get("worker_id") or job.get("assigned_to") or job.get("worker_name") or job.get("assigned_worker_name"))
        missing = []
        if not assigned and not is_complete(job):
            actions.append(action("dispatch", f"Assign worker to {title}", f"{title} for {client} has no worker assigned.", "high", {"job_id": jid}, "auto_smart_jobs"))
        if not clean(job.get("address") or job.get("site_address") or job.get("service_address") or job.get("job_address")):
            missing.append("address")
        if not clean(job.get("scheduled_date") or job.get("date") or job.get("start_date") or job.get("scheduled_start")):
            missing.append("date")
        if not clean(job.get("scheduled_time") or job.get("time") or job.get("start_time")):
            missing.append("time")
        if amount_of(job) <= 0 and not lower(job.get("pricing_type") or job.get("billing_type")).startswith("hour"):
            missing.append("price")
        if missing and not is_complete(job):
            actions.append(action("cleanup", f"Complete job admin for {title}", f"Missing {', '.join(missing)} before the job can run smoothly.", "medium", {"job_id": jid, "missing_fields": missing}, "auto_smart_jobs"))
        if is_complete(job) and not await invoice_exists_for_job(db, user, ObjectId, jid):
            if amount_of(job) > 0:
                actions.append(action("invoice", f"Prepare invoice draft for {title}", f"Completed job for {client} is ready to become a draft invoice.", "high", {"job_id": jid, "amount": amount_of(job)}, "auto_smart_money"))
            else:
                actions.append(action("pricing", f"Add price before invoicing {title}", f"Completed job for {client} has no safe price yet.", "high", {"job_id": jid}, "auto_smart_money"))
        if is_active(job) and lower(job.get("proof_status")) in {"missing_info", "needs_review", "missing", ""}:
            actions.append(action("proof", f"Check proof for {title}", f"Proof/status needs checking before invoice or customer follow-up.", "medium", {"job_id": jid}, "auto_smart_proof"))

    for slip in slips:
        sid = clean(slip.get("id") or slip.get("_id"))
        text = clean(slip.get("summary") or slip.get("text") or slip.get("note") or "Worker sent an update.")
        kind = lower(slip.get("type") or slip.get("kind") or "worker_update")
        priority = "high" if kind in {"issue", "blocked", "problem", "more_time"} else "medium"
        actions.append(action("worker_update", "Review worker update", text, priority, {"slip_id": sid, "job_id": clean(slip.get("job_id")), "kind": kind}, "auto_smart_worker"))

    for invoice in invoices:
        status = status_of(invoice)
        if status in {"overdue", "unpaid", "open", "sent", "pending_payment"}:
            iid = doc_id(invoice)
            actions.append(action("follow", f"Prepare invoice reminder {clean(invoice.get('invoice_number')) or iid[-6:]}", f"{client_of(invoice)} has an open invoice worth ${amount_of(invoice):.2f}.", "high" if status == "overdue" else "medium", {"invoice_id": iid, "amount": amount_of(invoice)}, "auto_smart_money"))

    for quote in quotes:
        status = status_of(quote)
        if status in {"sent", "viewed", "waiting", "pending", "draft", "ready"}:
            qid = doc_id(quote)
            actions.append(action("follow", f"Prepare quote follow-up {clean(quote.get('quote_number')) or qid[-6:]}", f"{client_of(quote)} has a quote waiting for a decision.", "medium", {"quote_id": qid, "amount": amount_of(quote)}, "auto_smart_quotes"))

    return actions


async def collect_actions(db, user, ObjectId):
    bid = business_id(user)
    actions = []
    errors = []

    if command_hub_routes is not None and hasattr(command_hub_routes, "_build_ai_plan"):
        try:
            plan = await command_hub_routes._build_ai_plan(db, bid)
            actions.extend(plan.get("actions") or [])
        except Exception as exc:
            errors.append(f"today_plan: {exc}")

    if field_truth is not None and hasattr(field_truth, "enhanced_snapshot"):
        try:
            snapshot = await field_truth.enhanced_snapshot(db, user, ObjectId)
            actions.extend(snapshot.get("actions") or snapshot.get("items") or [])
        except Exception as exc:
            errors.append(f"field_truth: {exc}")

    try:
        actions.extend(await manual_scan(db, user, ObjectId))
    except Exception as exc:
        errors.append(f"manual_scan: {exc}")

    unique = {}
    for item in actions:
        if not isinstance(item, dict):
            continue
        key = clean(item.get("id") or item.get("action_id") or item.get("title") or item.get("summary"))
        if not key:
            continue
        item = dict(item)
        item.setdefault("id", key)
        item.setdefault("status", "pending")
        item.setdefault("business_id", bid)
        item.setdefault("requires_owner_approval", True)
        item.setdefault("auto_prepared", True)
        item.setdefault("updated_at", now_utc())
        unique[key] = item
    return list(unique.values()), errors


async def store_actions(db, bid, actions):
    stored = 0
    for item in actions[:300]:
        action_id = clean(item.get("id") or item.get("action_id") or item.get("title"))
        if not action_id:
            continue
        existing = await safe_one(db.ai_approval_actions, {"business_id": bid, "id": action_id})
        if existing and lower(existing.get("status")) in FINAL_STATUSES:
            continue
        doc = json_safe({**item, "id": action_id, "business_id": bid, "updated_at": now_utc()})
        doc.setdefault("created_at", now_utc())
        try:
            await db.ai_approval_actions.update_one(
                {"business_id": bid, "id": action_id},
                {"$set": doc, "$setOnInsert": {"created_at": now_utc()}},
                upsert=True,
            )
            stored += 1
        except Exception:
            pass
    return stored


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

    async def auto_smart_endpoint(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        actions, errors = await collect_actions(db, user, ObjectId)
        stored = await store_actions(db, bid, actions)
        return json_safe({
            "success": True,
            "message": "Auto-smart scan complete. Churvox prepared owner review actions only.",
            "business_id": bid,
            "action_count": len(actions),
            "stored_count": stored,
            "errors": errors,
            "actions": actions[:120],
        })

    for method, path in [
        ("GET", "/api/smart-hub/auto-scan"),
        ("POST", "/api/smart-hub/auto-scan"),
        ("GET", "/api/command/auto-smart"),
        ("POST", "/api/command/auto-smart"),
        ("GET", "/api/ai/auto-smart"),
        ("POST", "/api/ai/auto-smart"),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, auto_smart_endpoint, methods=[method])

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
