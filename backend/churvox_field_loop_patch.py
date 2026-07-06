from __future__ import annotations

from datetime import datetime, timezone
import importlib, importlib.abc, importlib.machinery, sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()

def now(): return datetime.now(timezone.utc)
def txt(v): return str(v or "").strip()
def low(v): return txt(v).lower()
def uid(u): return txt(u.get("id") or u.get("_id") or u.get("user_id") or u.get("email"))
def bid(u): return txt(u.get("business_id") or u.get("owner_business_id") or u.get("contractor_id") or uid(u))
def wname(u): return txt(u.get("name") or u.get("full_name") or u.get("email") or "Worker")
def is_field(u): return low(u.get("role") or u.get("user_role")) in {"worker","staff","employee","subcontractor","contractor","technician"} or u.get("is_worker") is True

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
            elif k != "password_hash": out[k] = safe(x)
        return out
    return v

def remove(app, path, method):
    try: app.router.routes = [r for r in app.router.routes if not (getattr(r,"path","") == path and method in set(getattr(r,"methods",set()) or set()))]
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
    return {"$or": [{"business_id": {"$in": vals}}, {"businessId": {"$in": vals}}, {"contractor_id": {"$in": vals}}]}

async def find_job(db, user, ObjectId, job_id):
    return await db.jobs.find_one({"$and": [business_filter(user, ObjectId), id_query(job_id, ObjectId)]})

async def owner_email(db, user, ObjectId):
    owner = None
    try: owner = await db.users.find_one({"_id": ObjectId(bid(user))})
    except Exception: owner = None
    if not owner: owner = await db.users.find_one({"business_id": bid(user), "role": {"$in": ["employer", "owner", "admin"]}})
    return txt((owner or {}).get("email"))

async def save_note(db, user, payload):
    payload = dict(payload or {})
    note = txt(payload.get("note") or payload.get("text") or payload.get("message") or payload.get("summary") or "Field update")
    kind = txt(payload.get("kind") or payload.get("type") or "field_update")
    doc = {**payload, "business_id": bid(user), "worker_id": uid(user), "worker_name": wname(user), "worker_email": txt(user.get("email")), "kind": kind, "type": kind, "summary": note, "message": note, "status": "waiting_owner", "created_at": now(), "updated_at": now()}
    try:
        res = await db.worker_field_slips.insert_one(doc); doc["_id"] = res.inserted_id
    except Exception: pass
    event = {"business_id": bid(user), "owner_email": await owner_email(db, user, None), "title": f"{wname(user)} update", "message": note, "summary": note, "type": kind, "route": "/dashboard#command", "source_id": txt(payload.get("job_id")), "read": False, "is_read": False, "created_at": now(), "updated_at": now()}
    try: await db.notifications.insert_one(dict(event))
    except Exception: pass
    try: await db.approved_notifications.insert_one(dict(event))
    except Exception: pass
    return safe(doc)

def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED: return
    app = getattr(module, "app", None); db = getattr(module, "db", None); get_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None); Request = getattr(module, "Request", None); HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_user or ObjectId is None or Request is None or HTTPException is None: return

    async def field_slip(request: Request):
        user = await get_user(request)
        if not is_field(user): raise HTTPException(status_code=403, detail="Worker access required")
        payload = await request.json()
        row = await save_note(db, user, payload)
        return {"success": True, "slip": row, "data": row}

    async def action(job_id: str, request: Request, name: str):
        user = await get_user(request)
        if not is_field(user): raise HTTPException(status_code=403, detail="Worker access required")
        try: payload = await request.json()
        except Exception: payload = {}
        job = await find_job(db, user, ObjectId, job_id)
        if not job: raise HTTPException(status_code=404, detail="Job not found")
        status = {"acknowledge":"acknowledged", "start":"in_progress", "pause":"paused", "resume":"in_progress", "complete":"completed"}.get(name, name)
        update = {"status": status, "job_status": status, "workflow_status": status, "worker_last_action": name, "worker_last_action_at": now(), "updated_at": now()}
        if name == "start": update["started_at"] = now()
        if name == "complete": update.update({"completed": True, "completed_at": now(), "needs_owner_review": True, "proof_photo_names": payload.get("proof_photo_names") or payload.get("photo_names") or [], "proof_photo_count": payload.get("proof_photo_count") or payload.get("photo_count") or 0})
        if txt(payload.get("worker_notes") or payload.get("note")): update["worker_notes"] = txt(payload.get("worker_notes") or payload.get("note"))
        await db.jobs.update_one({"_id": job.get("_id")}, {"$set": update})
        await save_note(db, user, {**payload, "type": f"job_{name}", "kind": f"job_{name}", "job_id": txt(job.get("_id")), "job_title": txt(job.get("title") or job.get("job_title") or "Job"), "note": txt(payload.get("worker_notes") or payload.get("note") or f"Job {name}")})
        saved = await db.jobs.find_one({"_id": job.get("_id")})
        return {"success": True, "job": safe(saved), "data": safe(saved)}

    async def ack(job_id: str, request: Request): return await action(job_id, request, "acknowledge")
    async def start(job_id: str, request: Request): return await action(job_id, request, "start")
    async def pause(job_id: str, request: Request): return await action(job_id, request, "pause")
    async def resume(job_id: str, request: Request): return await action(job_id, request, "resume")
    async def complete(job_id: str, request: Request): return await action(job_id, request, "complete")

    for path, endpoint in [("/api/worker/field-slip", field_slip), ("/api/jobs/{job_id}/acknowledge", ack), ("/api/jobs/{job_id}/start", start), ("/api/jobs/{job_id}/pause", pause), ("/api/jobs/{job_id}/resume", resume), ("/api/jobs/{job_id}/complete", complete)]:
        remove(app, path, "POST"); app.add_api_route(path, endpoint, methods=["POST"])
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
