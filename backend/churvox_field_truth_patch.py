from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
BUSINESS_FIELDS = ["business_id", "contractor_id", "owner_business_id", "user_id", "created_by"]
PROOF_STEPS = ["arrival", "before_photo", "after_photo", "worker_note", "extras", "finish_summary"]
SAFE_DECISIONS = {"approve", "approved", "edit", "park", "parked", "reject", "rejected", "dismiss", "dismissed"}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def is_object_id_like(value):
    return value.__class__.__name__ == "ObjectId"


def json_safe(value):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            out["id" if key == "_id" else key] = str(item) if key == "_id" else json_safe(item)
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
    raw = user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id")
    return values_from_raw(raw, ObjectId)


def business_id_string(user):
    return clean(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id"))


def user_id_string(user):
    return clean(user.get("id") or user.get("_id") or user.get("worker_id") or user.get("email"))


def scoped_query(user, ObjectId, extra=None, fields=None):
    values = business_values(user, ObjectId)
    clauses = [{field: {"$in": values}} for field in (fields or BUSINESS_FIELDS)]
    query = {"$or": clauses} if clauses else {}
    if extra:
        query = {"$and": [query, extra]} if query else dict(extra)
    return query


def job_lookup_query(user, ObjectId, job_id):
    job_values = values_from_raw(job_id, ObjectId)
    id_query = {"$or": [
        {"_id": {"$in": job_values}},
        {"id": {"$in": [str(job_id)]}},
        {"job_id": {"$in": [str(job_id)]}},
        {"uuid": {"$in": [str(job_id)]}},
    ]}
    business_query = scoped_query(user, ObjectId)
    return {"$and": [business_query, id_query]} if business_query else id_query


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


async def safe_recent(collection, query, limit=50, sort_field="created_at"):
    try:
        cursor = collection.find(query).sort(sort_field, -1).limit(limit)
        return await to_list(cursor, limit)
    except Exception:
        try:
            return await to_list(collection.find(query).limit(limit), limit)
        except Exception:
            return []


async def safe_find_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


def normalize_step_key(value):
    key = lower(value).replace("-", "_").replace(" ", "_")
    return {
        "beforephoto": "before_photo", "before_photo": "before_photo",
        "afterphoto": "after_photo", "after_photo": "after_photo",
        "worknote": "worker_note", "worker_note": "worker_note", "note": "worker_note",
        "finish": "finish_summary", "finishsummary": "finish_summary", "finish_summary": "finish_summary",
        "material": "extras", "materials": "extras", "extra": "extras", "extras": "extras",
        "clock": "arrival", "gps": "arrival", "arrival": "arrival",
    }.get(key, key)


def normalize_steps(payload):
    steps = {}
    raw_steps = payload.get("steps") if isinstance(payload, dict) else {}
    if isinstance(raw_steps, dict):
        for key, value in raw_steps.items():
            step = normalize_step_key(key)
            if step in PROOF_STEPS:
                steps[step] = bool(value)
    for key, value in (payload or {}).items():
        step = normalize_step_key(key)
        if step in PROOF_STEPS:
            steps[step] = bool(value)
    return steps


def proof_readiness(steps, photos_count=0, slips_count=0):
    normalized = {step: bool((steps or {}).get(step)) for step in PROOF_STEPS}
    if photos_count:
        normalized["before_photo"] = normalized["before_photo"] or photos_count > 0
        normalized["after_photo"] = normalized["after_photo"] or photos_count > 1
    done = [step for step in PROOF_STEPS if normalized.get(step)]
    missing = [step for step in PROOF_STEPS if not normalized.get(step)]
    return {
        "steps": normalized,
        "done": done,
        "missing": missing,
        "done_count": len(done),
        "total": len(PROOF_STEPS),
        "ready_for_invoice": not missing and slips_count == 0,
        "needs_owner_review": bool(slips_count),
        "status": "ready" if not missing and not slips_count else "needs_review" if slips_count else "missing_info",
    }


def slip_title(kind):
    kind = lower(kind)
    if kind in {"issue", "blocked", "problem"}:
        return "Worker issue needs owner decision"
    if kind in {"customer_request", "request"}:
        return "Customer request from worker"
    if kind in {"extra", "material", "materials"}:
        return "Worker extra needs review"
    if kind in {"proof", "missing_proof"}:
        return "Worker proof needs review"
    return "Worker field note needs review"


def command_item_from_slip(slip):
    sid = clean(slip.get("id") or slip.get("_id"))
    summary = clean(slip.get("text") or slip.get("note") or slip.get("summary") or "Worker sent a field note for owner approval.")
    return {
        "id": sid,
        "source": "worker-field-truth",
        "category": "Command",
        "action": "Approve, edit or park",
        "title": slip_title(slip.get("type") or slip.get("kind")),
        "summary": summary,
        "found": f"Job {clean(slip.get('job_id'))}",
        "prepared": "Churvox converted worker field truth into a Command slip. Nothing is sent to the customer without owner approval.",
        "why": "Workers should keep moving; owner decisions belong in Command.",
        "priority": "high" if lower(slip.get("type")) in {"issue", "blocked", "problem"} else "medium",
        "source_id": sid,
        "status": slip.get("status") or "waiting_owner_review",
        "created_at": json_safe(slip.get("created_at") or now_utc()),
        "details": json_safe({"record_type": "worker_field_slip", "slip": slip}),
        "requires_owner_approval": True,
        "real_review_layer": True,
    }


async def get_passport(db, user, ObjectId, job_id):
    business_id = business_id_string(user)
    passport = await safe_find_one(db.worker_proof_passports, {"business_id": business_id, "job_id": str(job_id)})
    if not passport:
        passport = {"business_id": business_id, "job_id": str(job_id), "steps": {}, "gps_events": [], "worker_notes": [], "created_at": now_utc(), "updated_at": now_utc()}
    try:
        photos_count = int(await db.worker_proof_photos.count_documents({"business_id": business_id, "job_id": str(job_id), "status": {"$ne": "deleted"}}))
    except Exception:
        photos_count = 0
    try:
        slips_count = int(await db.worker_field_slips.count_documents({"business_id": business_id, "job_id": str(job_id), "status": {"$in": ["waiting_owner_review", "needs_owner_edit", "parked"]}}))
    except Exception:
        slips_count = 0
    passport["photos_count"] = photos_count
    passport["open_slips_count"] = slips_count
    passport["readiness"] = proof_readiness(passport.get("steps") or {}, photos_count, slips_count)
    return passport


async def save_passport(db, user, ObjectId, job_id, payload):
    business_id = business_id_string(user)
    now = now_utc()
    existing = await get_passport(db, user, ObjectId, job_id)
    steps = dict(existing.get("steps") or {})
    steps.update(normalize_steps(payload or {}))
    set_doc = {
        "business_id": business_id,
        "job_id": str(job_id),
        "worker_id": user_id_string(user),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "steps": steps,
        "updated_at": now,
    }
    push_doc = {}
    if isinstance(payload, dict):
        gps = payload.get("gps") or payload.get("gps_event")
        if isinstance(gps, dict):
            push_doc["gps_events"] = {**gps, "at": gps.get("at") or now}
            set_doc["latest_gps"] = {**gps, "at": gps.get("at") or now}
        note_text = clean(payload.get("note") or payload.get("worker_note"))
        if note_text:
            push_doc["worker_notes"] = {"text": note_text, "at": now, "worker_id": user_id_string(user)}
            set_doc["latest_worker_note"] = note_text
        if payload.get("finish_summary"):
            set_doc["finish_summary"] = clean(payload.get("finish_summary"))
        if payload.get("offline_token"):
            set_doc["last_offline_token"] = clean(payload.get("offline_token"))
    update = {"$set": set_doc, "$setOnInsert": {"created_at": now}}
    if push_doc:
        update["$push"] = push_doc
    try:
        await db.worker_proof_passports.update_one({"business_id": business_id, "job_id": str(job_id)}, update, upsert=True)
    except Exception:
        pass
    passport = await get_passport(db, user, ObjectId, job_id)
    try:
        await db.jobs.update_one(job_lookup_query(user, ObjectId, job_id), {"$set": {
            "proof_passport": json_safe(passport.get("readiness") or {}),
            "proof_status": (passport.get("readiness") or {}).get("status"),
            "invoice_ready": bool((passport.get("readiness") or {}).get("ready_for_invoice")),
            "updated_at": now,
        }})
    except Exception:
        pass
    return passport


async def save_photo(db, user, ObjectId, job_id, payload):
    business_id = business_id_string(user)
    now = now_utc()
    kind = lower((payload or {}).get("kind") or (payload or {}).get("type") or "proof")
    data = clean((payload or {}).get("photo_data") or (payload or {}).get("data_url") or "")
    doc = {
        "business_id": business_id,
        "job_id": str(job_id),
        "worker_id": user_id_string(user),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "kind": kind,
        "filename": clean((payload or {}).get("filename") or f"{kind}-photo.jpg"),
        "mime_type": clean((payload or {}).get("mime_type") or "image/jpeg"),
        "size_bytes": int((payload or {}).get("size_bytes") or len(data) or 0),
        "photo_data": data,
        "status": "uploaded",
        "source": "worker_offline_safe_queue",
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = await db.worker_proof_photos.insert_one(dict(doc))
        doc["_id"] = result.inserted_id
    except Exception:
        pass
    step = "before_photo" if "before" in kind else "after_photo" if "after" in kind else "worker_note"
    await save_passport(db, user, ObjectId, job_id, {"steps": {step: True}, "offline_token": (payload or {}).get("offline_token")})
    return doc


async def create_field_slip(db, user, ObjectId, job_id, payload):
    business_id = business_id_string(user)
    now = now_utc()
    kind = lower((payload or {}).get("type") or (payload or {}).get("kind") or "field_note")
    text = clean((payload or {}).get("text") or (payload or {}).get("note") or (payload or {}).get("summary") or "Worker sent a field note.")
    slip_id = clean((payload or {}).get("id")) or f"field-slip-{int(now.timestamp() * 1000)}"
    doc = {
        "id": slip_id,
        "business_id": business_id,
        "job_id": str(job_id),
        "worker_id": user_id_string(user),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "type": kind,
        "text": text,
        "summary": text,
        "status": "waiting_owner_review",
        "source": "worker_field_truth",
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.worker_field_slips.update_one({"business_id": business_id, "id": slip_id}, {"$set": doc, "$setOnInsert": {"created_at": now}}, upsert=True)
    except Exception:
        pass
    try:
        await db.ai_operator_audit_log.insert_one({"business_id": business_id, "user_id": user_id_string(user), "source": "worker_field_truth", "action": "field_slip_created", "summary": text, "job_id": str(job_id), "slip_id": slip_id, "created_at": now})
    except Exception:
        pass
    await save_passport(db, user, ObjectId, job_id, {"steps": {"worker_note": True}, "note": text})
    return doc


async def list_field_slips(db, user, ObjectId, status=None, limit=80):
    query = {"business_id": business_id_string(user)}
    query["status"] = status if status else {"$in": ["waiting_owner_review", "needs_owner_edit", "parked"]}
    rows = await safe_recent(db.worker_field_slips, query, limit, "updated_at")
    return rows, [command_item_from_slip(row) for row in rows]


async def decide_slip(db, user, slip_id, decision, payload=None):
    normalized = lower(decision)
    if normalized not in SAFE_DECISIONS:
        normalized = "parked"
    mapped = {"approve": "approved", "edit": "needs_owner_edit", "park": "parked", "reject": "rejected", "dismiss": "dismissed"}.get(normalized, normalized)
    business_id = business_id_string(user)
    now = now_utc()
    update = {"status": mapped, "owner_decision": mapped, "decision_note": clean((payload or {}).get("note") or (payload or {}).get("decision_note")), "decided_by": user_id_string(user), "decided_at": now, "updated_at": now, "auto_sent": False, "accounting_synced": False}
    try:
        await db.worker_field_slips.update_one({"business_id": business_id, "id": str(slip_id)}, {"$set": update})
    except Exception:
        pass
    try:
        await db.command_decisions.insert_one({"business_id": business_id, "user_id": user_id_string(user), "action_id": str(slip_id), "decision": mapped, "status": mapped, "payload": payload or {}, "source": "worker_field_truth", "note": "Owner decision recorded. Churvox did not auto-send, file tax, sync accounting, or create payout files.", "created_at": now, "updated_at": now})
    except Exception:
        pass
    slip = await safe_find_one(db.worker_field_slips, {"business_id": business_id, "id": str(slip_id)})
    return {"success": True, "slip": json_safe(slip or {"id": slip_id, **update}), "decision": mapped, "auto_sent": False, "accounting_synced": False}


async def offline_sync(db, user, ObjectId, payload):
    operations = (payload or {}).get("operations") or (payload or {}).get("items") or []
    if not isinstance(operations, list):
        operations = []
    results = []
    for op in operations[:50]:
        if not isinstance(op, dict):
            continue
        job_id = clean(op.get("job_id") or op.get("jobId") or op.get("record_id") or "")
        op_type = lower(op.get("type") or op.get("operation") or "passport")
        try:
            if op_type in {"passport", "proof", "proof_passport"} and job_id:
                data = await save_passport(db, user, ObjectId, job_id, op.get("payload") or op)
            elif op_type in {"photo", "proof_photo"} and job_id:
                data = await save_photo(db, user, ObjectId, job_id, op.get("payload") or op)
            elif op_type in {"slip", "field_slip", "field_note"} and job_id:
                data = await create_field_slip(db, user, ObjectId, job_id, op.get("payload") or op)
            else:
                data = {"skipped": True}
            results.append({"ok": True, "type": op_type, "job_id": job_id, "data": json_safe(data)})
        except Exception as exc:
            results.append({"ok": False, "type": op_type, "job_id": job_id, "error": str(exc)})
    return {"success": True, "synced": len([item for item in results if item.get("ok")]), "results": results, "data": results}


async def enhanced_snapshot(db, user, ObjectId):
    try:
        import churvox_old_backend_bridge_patch as old_bridge
        snapshot = await old_bridge.build_command_snapshot(db, user, ObjectId)
    except Exception:
        snapshot = {"success": True, "actions": [], "items": [], "command_items": [], "counts": {}, "briefing": {}}
    rows, field_items = await list_field_slips(db, user, ObjectId, None, 40)
    existing = snapshot.get("actions") or snapshot.get("items") or []
    by_id = {}
    for item in field_items + existing:
        by_id[clean(item.get("id") or item.get("title"))] = item
    combined = list(by_id.values())[:60]
    counts = dict(snapshot.get("counts") or {})
    counts["worker_field_slips"] = len(field_items)
    counts["total"] = len(combined)
    briefing = dict(snapshot.get("briefing") or {})
    if field_items:
        briefing["summary"] = f"Churvox found {len(field_items)} worker field slip(s) plus {max(0, len(combined) - len(field_items))} other Command item(s)."
    snapshot.update({"success": True, "actions": combined, "items": combined, "command_items": combined, "worker_field_slips": json_safe(rows), "counts": counts, "briefing": briefing or {"summary": "Churvox is checking worker proof, jobs, invoices, quotes and timesheets."}})
    snapshot["data"] = dict(snapshot)
    return json_safe(snapshot)


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

    async def worker_status_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe({"success": True, "mode": "field_truth", "worker_flow": ["Today", "Jobs", "Proof", "Help", "Me"], "fair_gps": {"enabled": True, "rule": "GPS is job proof only while the worker is clocked into work.", "after_hours_tracking": False}, "proof_passport": PROOF_STEPS, "owner_approval_required": True, "business_id": business_id_string(user)})

    async def get_passport_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        return json_safe({"success": True, "passport": await get_passport(db, user, ObjectId, job_id)})

    async def save_passport_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return json_safe({"success": True, "passport": await save_passport(db, user, ObjectId, job_id, payload)})

    async def photo_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        return json_safe({"success": True, "photo": await save_photo(db, user, ObjectId, job_id, payload)})

    async def field_slip_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        slip = await create_field_slip(db, user, ObjectId, job_id, payload)
        return json_safe({"success": True, "slip": slip, "command_item": command_item_from_slip(slip)})

    async def offline_sync_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await offline_sync(db, user, ObjectId, await read_payload(request)))

    async def owner_job_passport_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        business_id = business_id_string(user)
        return json_safe({"success": True, "passport": await get_passport(db, user, ObjectId, job_id), "photos": await safe_recent(db.worker_proof_photos, {"business_id": business_id, "job_id": str(job_id), "status": {"$ne": "deleted"}}, 20, "created_at"), "slips": await safe_recent(db.worker_field_slips, {"business_id": business_id, "job_id": str(job_id)}, 20, "created_at")})

    async def field_slips_endpoint(request: Request):
        user = await get_current_user(request)
        rows, items = await list_field_slips(db, user, ObjectId, None, 80)
        return json_safe({"success": True, "slips": rows, "items": items, "actions": items, "data": items})

    async def decide_slip_endpoint(request: Request, slip_id: str, decision: str):
        user = await get_current_user(request)
        return json_safe(await decide_slip(db, user, slip_id, decision, await read_payload(request)))

    async def command_snapshot_endpoint(request: Request):
        user = await get_current_user(request)
        return await enhanced_snapshot(db, user, ObjectId)

    async def actions_endpoint(request: Request):
        user = await get_current_user(request)
        snapshot = await enhanced_snapshot(db, user, ObjectId)
        actions = snapshot.get("actions") or []
        return json_safe({"success": True, "actions": actions, "items": actions, "data": actions})

    routes = [
        ("GET", "/api/worker/field-truth/status", worker_status_endpoint),
        ("GET", "/api/worker/jobs/{job_id}/proof-passport", get_passport_endpoint),
        ("POST", "/api/worker/jobs/{job_id}/proof-passport", save_passport_endpoint),
        ("PUT", "/api/worker/jobs/{job_id}/proof-passport", save_passport_endpoint),
        ("POST", "/api/worker/jobs/{job_id}/proof-photos", photo_endpoint),
        ("POST", "/api/worker/jobs/{job_id}/field-slip", field_slip_endpoint),
        ("POST", "/api/worker/offline-sync", offline_sync_endpoint),
        ("GET", "/api/jobs/{job_id}/proof-passport", owner_job_passport_endpoint),
        ("GET", "/api/command/field-slips", field_slips_endpoint),
        ("POST", "/api/command/field-slips/{slip_id}/{decision}", decide_slip_endpoint),
        ("GET", "/api/ai-operator/command-snapshot", command_snapshot_endpoint),
        ("GET", "/api/ai-operator/actions", actions_endpoint),
        ("GET", "/api/ai/actions", actions_endpoint),
        ("GET", "/api/ai/operator/slips", actions_endpoint),
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
