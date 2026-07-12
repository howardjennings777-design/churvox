from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OPEN_STATUSES = {
    "", "open", "pending", "ready", "waiting", "waiting_owner", "waiting_owner_review",
    "needs_owner_review", "needs_owner_edit", "parked", "owner_review",
}
OWNER_ROLES = {"employer", "owner", "admin", "manager", "office_admin", "business_owner"}


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            if key in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}:
                continue
            output["id" if key == "_id" else key] = safe(item)
        return output
    return value


def promote_route(app, path, method):
    try:
        method = method.upper()
        preferred = [
            route for route in app.router.routes
            if getattr(route, "path", "") == path
            and method in set(getattr(route, "methods", set()) or set())
        ]
        if not preferred:
            return
        remaining = [route for route in app.router.routes if route not in preferred]
        app.router.routes = preferred + remaining
    except Exception:
        pass


def remove_route(app, path, method):
    try:
        app.router.routes = [
            route for route in app.router.routes
            if not (
                getattr(route, "path", "") == path
                and method.upper() in set(getattr(route, "methods", set()) or set())
            )
        ]
    except Exception:
        pass


def identifier(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("id") or (user or {}).get("_id"))


def id_values(raw, ObjectId):
    values = []
    value = text(raw)
    if value:
        values.append(value)
        try:
            values.append(ObjectId(value))
        except Exception:
            pass
    return values


def business_query(user, ObjectId):
    values = id_values(identifier(user), ObjectId)
    return {"$or": [
        {"business_id": {"$in": values}},
        {"businessId": {"$in": values}},
        {"contractor_id": {"$in": values}},
        {"owner_business_id": {"$in": values}},
        {"owner_id": {"$in": values}},
    ]}


async def recent(collection, query, limit=180):
    try:
        cursor = collection.find(query)
        try:
            cursor = cursor.sort("updated_at", -1)
        except Exception:
            cursor = cursor.sort("created_at", -1)
        try:
            cursor = cursor.limit(limit)
        except Exception:
            pass
        return await cursor.to_list(length=limit)
    except TypeError:
        try:
            return await collection.find(query).to_list(limit)
        except Exception:
            return []
    except Exception:
        return []


def is_open(row):
    return lower((row or {}).get("status")) in OPEN_STATUSES


def row_id(row):
    return text((row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("action_id") or (row or {}).get("source_id"))


def kind_label(kind):
    labels = {
        "worker_problem": "reported an issue",
        "job_proof": "sent proof",
        "job_complete": "finished a job",
        "job_completed": "finished a job",
        "worker_message": "sent a message",
        "payment_check_needed": "needs a payment check",
        "payment_amount_needed": "needs an amount confirmed",
    }
    return labels.get(lower(kind), lower(kind).replace("_", " ") or "sent an update")


def worker_slip_to_command(row):
    item = dict(row or {})
    slip_id = row_id(item)
    kind = text(item.get("kind") or item.get("type") or "worker_update")
    worker = text(item.get("worker_name") or item.get("worker_email") or "Worker")
    job = text(item.get("job_title") or item.get("job") or item.get("job_id") or "Job")
    note = text(item.get("summary") or item.get("message") or item.get("detail") or item.get("text") or item.get("note") or "Worker update needs owner review.")
    proof_count = item.get("proof_photo_count") or item.get("photo_count") or len(item.get("proof_files") or [])
    try:
        proof_count = int(proof_count or 0)
    except Exception:
        proof_count = 0
    problem = "problem" in lower(kind) or "issue" in lower(kind)
    return {
        "id": slip_id,
        "business_id": text(item.get("business_id") or item.get("businessId") or item.get("owner_business_id")),
        "source_type": "worker",
        "action_type": "worker_update_review",
        "source_id": text(item.get("job_id") or slip_id),
        "type": kind,
        "kind": kind,
        "title": f"{worker} {kind_label(kind)}",
        "found": f"{worker} sent an update for {job}: {note}",
        "summary": note,
        "prepared": "Churvox prepared the worker update for owner review. Nothing was sent, charged, synced or changed.",
        "why": "The worker can report field truth, but the owner decides what happens next.",
        "urgency": "Top priority" if problem else "Owner review",
        "status": item.get("status") or "waiting_owner_review",
        "worker_id": text(item.get("worker_id")),
        "worker_name": worker,
        "worker_email": text(item.get("worker_email")),
        "job_id": text(item.get("job_id")),
        "job_title": job,
        "created_at": item.get("created_at") or datetime.now(timezone.utc),
        "updated_at": item.get("updated_at") or item.get("created_at") or datetime.now(timezone.utc),
        "payload": {
            "office_role": "Quality Checker" if proof_count else "Office Manager",
            "prepared_form": {
                "Worker": worker,
                "Job": job,
                "Update": note,
                "Proof photos": str(proof_count),
            },
            "evidence": [
                f"Worker: {worker}",
                f"Job: {job}",
                f"Update type: {kind}",
                f"Worker note: {note}",
                f"Proof photos: {proof_count}",
            ],
            "missing": [],
            "owner_question": "Approve the next step, ask the worker, snooze it, or ignore it?",
            "actions": ["Approve record", "Snooze", "Ignore"],
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "worker_field_slip": safe(item),
        },
        "prepared_only": True,
        "owner_review_only": True,
        "no_auto_send": True,
        "no_auto_sync": True,
        "no_auto_charge": True,
        "no_auto_record_change": True,
    }


async def linked_worker_identity(db, user, ObjectId):
    workers = await recent(db.users, business_query(user, ObjectId), 240)
    ids = []
    emails = []
    for worker in workers:
        role = lower(worker.get("role") or worker.get("user_role") or worker.get("account_type"))
        if role not in {"worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"} and worker.get("is_worker") is not True:
            continue
        raw_id = text(worker.get("id") or worker.get("_id") or worker.get("worker_id") or worker.get("user_id"))
        if raw_id:
            ids.extend(id_values(raw_id, ObjectId))
        email = lower(worker.get("email") or worker.get("worker_email"))
        if email:
            emails.append(email)
    return ids, list(dict.fromkeys(emails))


def install(module):
    name = getattr(module, "__name__", "")
    # These paths can be overwritten by legacy routers later in startup.
    # Re-running install is intentional: remove the competing route and reassert
    # the final business-scoped handler every time the final wrapper calls us.
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def command_slips_get(request: Request):
        user = await get_current_user(request)
        role = lower((user or {}).get("role") or (user or {}).get("user_role") or (user or {}).get("account_type"))
        if role not in OWNER_ROLES and not (user or {}).get("is_admin"):
            raise HTTPException(status_code=403, detail="Owner access required")

        scoped = business_query(user, ObjectId)
        worker_ids, worker_emails = await linked_worker_identity(db, user, ObjectId)
        worker_clauses = [scoped]
        if worker_ids:
            worker_clauses.append({"worker_id": {"$in": worker_ids}})
        if worker_emails:
            worker_clauses.append({"worker_email": {"$in": worker_emails}})
        worker_query = {"$or": worker_clauses}

        normal_rows = []
        for collection_name in ("command_slips", "ai_approval_actions"):
            normal_rows.extend(await recent(db[collection_name], scoped, 180))
        field_rows = await recent(db.worker_field_slips, worker_query, 180)

        merged = []
        seen = set()
        for row in normal_rows:
            if not is_open(row):
                continue
            output = safe(row)
            key = f"normal:{row_id(output) or text(output.get('title'))}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(output)
        for row in field_rows:
            if not is_open(row):
                continue
            output = safe(worker_slip_to_command(row))
            key = f"worker:{row_id(output) or text(output.get('title'))}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(output)

        def sort_key(item):
            return text(item.get("updated_at") or item.get("created_at"))

        merged.sort(key=sort_key, reverse=True)
        return {
            "success": True,
            "slips": merged[:240],
            "items": merged[:240],
            "data": merged[:240],
            "worker_field_slip_count": len([item for item in merged if lower(item.get("source_type")) == "worker"]),
            "safety": "Owner approval required. Nothing was sent, synced, charged or changed.",
        }

    remove_route(app, "/api/command/slips", "GET")
    app.add_api_route("/api/command/slips", command_slips_get, methods=["GET"])
    promote_route(app, "/api/command/slips", "GET")
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
