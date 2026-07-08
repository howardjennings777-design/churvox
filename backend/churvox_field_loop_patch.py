from __future__ import annotations

from datetime import datetime, timezone
import importlib, importlib.abc, importlib.machinery, sys
from fastapi import Request as FastAPIRequest

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def now(): return datetime.now(timezone.utc)
def txt(v): return str(v or "").strip()
def low(v): return txt(v).lower()
def uid(u): return txt(u.get("id") or u.get("_id") or u.get("user_id") or u.get("worker_id") or u.get("email"))
def bid(u): return txt(u.get("business_id") or u.get("businessId") or u.get("owner_business_id") or u.get("contractor_id") or uid(u))
def wname(u): return txt(u.get("name") or u.get("full_name") or u.get("display_name") or u.get("email") or "Worker")
def is_field(u): return low(u.get("role") or u.get("user_role") or u.get("account_type")) in {"worker", "staff", "employee", "subcontractor", "contractor", "technician", "field_worker"} or u.get("is_worker") is True


def safe(v):
    if isinstance(v, datetime): return v.isoformat()
    try:
        from bson import ObjectId
        if isinstance(v, ObjectId): return str(v)
    except Exception: pass
    if isinstance(v, list): return [safe(x) for x in v]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if k == "_id": out["id"] = safe(x)
            elif k not in {"password", "password_hash", "hashed_password", "token", "access_token", "refresh_token"}: out[k] = safe(x)
        return out
    return v


def remove(app, path, method):
    try: app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method.upper() in set(getattr(r, "methods", set()) or set()))]
    except Exception: pass


def id_query(raw, ObjectId):
    raw = txt(raw)
    arr = [{"id": raw}, {"job_id": raw}]
    try: arr.append({"_id": ObjectId(raw)})
    except Exception: pass
    return {"$or": arr}


def business_filter(user, ObjectId):
    raw = bid(user)
    vals = [raw]
    try: vals.append(ObjectId(raw))
    except Exception: pass
    return {"$or": [{"business_id": {"$in": vals}}, {"businessId": {"$in": vals}}, {"contractor_id": {"$in": vals}}, {"owner_business_id": {"$in": vals}}]}


async def find_job(db, user, ObjectId, job_id):
    return await db.jobs.find_one({"$and": [business_filter(user, ObjectId), id_query(job_id, ObjectId)]})


async def owner_email(db, user, ObjectId=None):
    owner = None
    if ObjectId is not None:
        try: owner = await db.users.find_one({"_id": ObjectId(bid(user))})
        except Exception: owner = None
    if not owner: owner = await db.users.find_one({"business_id": bid(user), "role": {"$in": ["employer", "owner", "admin"]}})
    if not owner: owner = await db.users.find_one({"businessId": bid(user), "role": {"$in": ["employer", "owner", "admin"]}})
    return txt((owner or {}).get("email"))


def kind_title(kind):
    labels = {
        "job_acknowledge": "acknowledged the job",
        "job_acknowledged": "acknowledged the job",
        "job_start": "started the job",
        "job_started": "started the job",
        "job_pause": "paused the job",
        "job_paused": "paused the job",
        "job_resume": "resumed the job",
        "job_resumed": "resumed the job",
        "job_complete": "finished the job",
        "job_completed": "finished the job",
        "job_proof": "sent proof",
        "worker_problem": "reported an issue",
        "worker_message": "sent a message",
        "payment_check_needed": "needs a payment check",
        "payment_amount_needed": "needs the amount set",
        "payment_completed": "completed payment",
    }
    return labels.get(kind, kind.replace("_", " ") or "sent an update")


def needs_owner_review(kind):
    return kind in {"worker_problem", "job_completed", "job_complete", "job_proof", "payment_check_needed", "payment_amount_needed"} or "problem" in kind or "issue" in kind or "cannot" in kind


def office_route(kind):
    if kind == "worker_message": return "/dashboard#messages"
    if needs_owner_review(kind): return "/dashboard#command"
    return "/dashboard#jobs"


def job_label(payload):
    return txt(payload.get("job_title") or payload.get("job") or payload.get("title") or "Job")


def client_label(payload):
    return txt(payload.get("client_name") or payload.get("customer_name") or payload.get("client") or "Customer")


def clean_note(payload, kind, user):
    explicit = txt(payload.get("note") or payload.get("text") or payload.get("message") or payload.get("summary"))
    if explicit: return explicit
    return f"{wname(user)} {kind_title(kind)} for {job_label(payload)}."


async def create_worker_message(db, user, payload, kind, note, direction="worker_to_office"):
    doc = {
        "business_id": bid(user),
        "worker_id": uid(user),
        "worker_name": wname(user),
        "worker_email": txt(user.get("email")),
        "direction": direction,
        "from": wname(user) if direction == "worker_to_office" else "Office",
        "to": "Office" if direction == "worker_to_office" else wname(user),
        "kind": kind,
        "type": kind,
        "job_id": txt(payload.get("job_id")),
        "job_title": job_label(payload),
        "client_name": client_label(payload),
        "subject": payload.get("subject") or kind_title(kind).title(),
        "message": note,
        "detail": note,
        "body": note,
        "read": False,
        "is_read": False,
        "created_at": now(),
        "updated_at": now(),
        "source": payload.get("source") or "churvox-field",
    }
    try:
        res = await db.worker_messages.insert_one(dict(doc)); doc["_id"] = res.inserted_id
    except Exception: pass
    return doc


async def create_activity(db, user, payload, kind, note):
    doc = {
        "business_id": bid(user),
        "worker_id": uid(user),
        "worker_name": wname(user),
        "worker_email": txt(user.get("email")),
        "event_type": kind,
        "type": kind,
        "title": f"{wname(user)} {kind_title(kind)}",
        "detail": note,
        "message": note,
        "record_type": "job" if txt(payload.get("job_id")) else "message",
        "record_id": txt(payload.get("job_id")),
        "job_id": txt(payload.get("job_id")),
        "job_title": job_label(payload),
        "client_name": client_label(payload),
        "status": "new",
        "source": payload.get("source") or "churvox-field",
        "created_at": now(),
        "updated_at": now(),
    }
    try: await db.field_activity_events.insert_one(dict(doc))
    except Exception: pass
    return doc


async def create_owner_notification(db, user, payload, kind, note):
    event = {
        "business_id": bid(user),
        "owner_email": await owner_email(db, user),
        "title": f"{wname(user)} {kind_title(kind)}",
        "subject": f"{wname(user)} {kind_title(kind)}",
        "message": note,
        "body": note,
        "detail": note,
        "summary": note,
        "type": kind,
        "kind": kind,
        "route": office_route(kind),
        "source_id": txt(payload.get("job_id")),
        "job_id": txt(payload.get("job_id")),
        "job_title": job_label(payload),
        "client_name": client_label(payload),
        "worker_id": uid(user),
        "worker_name": wname(user),
        "channel": "Worker app",
        "read": False,
        "is_read": False,
        "created_at": now(),
        "updated_at": now(),
    }
    try: await db.notifications.insert_one(dict(event))
    except Exception: pass
    try: await db.approved_notifications.insert_one(dict(event))
    except Exception: pass
    return event


async def create_command_slip(db, user, payload, kind, note):
    if not needs_owner_review(kind): return None
    doc = {
        "business_id": bid(user),
        "contractor_id": bid(user),
        "created_by": uid(user),
        "worker_id": uid(user),
        "worker_name": wname(user),
        "worker_email": txt(user.get("email")),
        "type": kind,
        "kind": kind,
        "action_type": "worker_update_review",
        "title": f"{wname(user)} {kind_title(kind)}",
        "summary": note,
        "status": "pending",
        "owner": "Review worker update",
        "client": client_label(payload),
        "amount": payload.get("amount") or payload.get("amount_cents") or 0,
        "filled": note,
        "evidence": "Created from the worker app and linked to the job.",
        "check": "Review the worker update, then approve, reply, or follow up.",
        "record_type": "job",
        "record_id": txt(payload.get("job_id")),
        "job_id": txt(payload.get("job_id")),
        "job_title": job_label(payload),
        "payload": safe(payload),
        "requires_owner_approval": True,
        "created_at": now(),
        "updated_at": now(),
    }
    try:
        res = await db.ai_approval_actions.insert_one(dict(doc)); doc["_id"] = res.inserted_id
    except Exception: pass
    return doc


async def save_note(db, user, payload):
    payload = dict(payload or {})
    kind = txt(payload.get("kind") or payload.get("type") or "field_update")
    note = clean_note(payload, kind, user)
    doc = {
        **payload,
        "business_id": bid(user),
        "worker_id": uid(user),
        "worker_name": wname(user),
        "worker_email": txt(user.get("email")),
        "kind": kind,
        "type": kind,
        "summary": note,
        "message": note,
        "detail": note,
        "status": "waiting_owner" if needs_owner_review(kind) else "office_notified",
        "office_route": office_route(kind),
        "created_at": now(),
        "updated_at": now(),
    }
    try:
        res = await db.worker_field_slips.insert_one(doc); doc["_id"] = res.inserted_id
    except Exception: pass
    await create_activity(db, user, payload, kind, note)
    await create_owner_notification(db, user, payload, kind, note)
    await create_worker_message(db, user, payload, kind, note, direction="worker_to_office")
    await create_command_slip(db, user, payload, kind, note)
    return safe(doc)


async def list_worker_messages(db, user):
    worker = uid(user)
    email = txt(user.get("email"))
    ors = [
        {"worker_id": worker},
        {"to_worker_id": worker},
        {"worker_email": email},
        {"to_worker_email": email},
        {"to": "all_workers"},
    ]
    items = []
    try:
        items = await db.worker_messages.find({"business_id": bid(user), "$or": ors}).sort("created_at", -1).to_list(80)
    except Exception:
        items = []
    return [safe(item) for item in items]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED: return
    app = getattr(module, "app", None); db = getattr(module, "db", None); get_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None); Request = getattr(module, "Request", None); HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_user or ObjectId is None or Request is None or HTTPException is None: return

    async def field_slip(request: FastAPIRequest):
        user = await get_user(request)
        if not is_field(user): raise HTTPException(status_code=403, detail="Worker access required")
        payload = await request.json()
        row = await save_note(db, user, payload)
        return {"success": True, "slip": row, "data": row}

    async def worker_messages_get(request: FastAPIRequest):
        user = await get_user(request)
        if not is_field(user): raise HTTPException(status_code=403, detail="Worker access required")
        items = await list_worker_messages(db, user)
        return {"success": True, "messages": items, "data": items}

    async def worker_messages_post(request: FastAPIRequest):
        user = await get_user(request)
        if not is_field(user): raise HTTPException(status_code=403, detail="Worker access required")
        payload = await request.json()
        row = await save_note(db, user, {**dict(payload or {}), "type": "worker_message", "kind": "worker_message", "source": "churvox-field-messages"})
        return {"success": True, "message": row, "data": row}

    async def action(job_id: str, request: FastAPIRequest, name: str):
        user = await get_user(request)
        if not is_field(user): raise HTTPException(status_code=403, detail="Worker access required")
        try: payload = await request.json()
        except Exception: payload = {}
        job = await find_job(db, user, ObjectId, job_id)
        if not job: raise HTTPException(status_code=404, detail="Job not found")
        status = {"acknowledge": "acknowledged", "start": "in_progress", "pause": "paused", "resume": "in_progress", "complete": "completed"}.get(name, name)
        update = {"status": status, "job_status": status, "workflow_status": status, "worker_last_action": name, "worker_last_action_at": now(), "updated_at": now()}
        if name == "start": update["started_at"] = now()
        if name == "complete": update.update({"completed": True, "completed_at": now(), "needs_owner_review": True, "proof_photo_names": payload.get("proof_photo_names") or payload.get("photo_names") or [], "proof_photo_count": payload.get("proof_photo_count") or payload.get("photo_count") or 0})
        if txt(payload.get("worker_notes") or payload.get("note")): update["worker_notes"] = txt(payload.get("worker_notes") or payload.get("note"))
        await db.jobs.update_one({"_id": job.get("_id")}, {"$set": update})
        note = txt(payload.get("worker_notes") or payload.get("note") or f"{wname(user)} {kind_title('job_' + name)}.")
        await save_note(db, user, {**payload, "type": f"job_{name}", "kind": f"job_{name}", "job_id": txt(job.get("_id")), "job_title": txt(job.get("title") or job.get("job_title") or job.get("job_name") or "Job"), "client_name": txt(job.get("client_name") or job.get("customer_name") or job.get("client") or "Customer"), "note": note})
        saved = await db.jobs.find_one({"_id": job.get("_id")})
        return {"success": True, "job": safe(saved), "data": safe(saved)}

    async def ack(job_id: str, request: FastAPIRequest): return await action(job_id, request, "acknowledge")
    async def start(job_id: str, request: FastAPIRequest): return await action(job_id, request, "start")
    async def pause(job_id: str, request: FastAPIRequest): return await action(job_id, request, "pause")
    async def resume(job_id: str, request: FastAPIRequest): return await action(job_id, request, "resume")
    async def complete(job_id: str, request: FastAPIRequest): return await action(job_id, request, "complete")

    for path, method, endpoint in [
        ("/api/worker/field-slip", "POST", field_slip),
        ("/api/worker/messages", "GET", worker_messages_get),
        ("/api/worker/messages", "POST", worker_messages_post),
        ("/api/jobs/{job_id}/acknowledge", "POST", ack),
        ("/api/jobs/{job_id}/start", "POST", start),
        ("/api/jobs/{job_id}/pause", "POST", pause),
        ("/api/jobs/{job_id}/resume", "POST", resume),
        ("/api/jobs/{job_id}/complete", "POST", complete),
    ]:
        remove(app, path, method); app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original): self.original = original
    def create_module(self, spec): return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
    def exec_module(self, module): self.original.exec_module(module); install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS: return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader): spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(f, Finder) for f in sys.meta_path): sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded: install(loaded)
