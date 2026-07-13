from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as base

TARGETS = {"server", "backend.server"}
INSTALLED = set()
FIELD_COMMAND_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v10-20260713"


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def _needs_command(kind):
    text = base.lower(kind)
    return any(token in text for token in ["problem", "issue", "blocked", "decision", "extra_work", "owner_check"])


def _invalidate_command_cache(business_id):
    # Startup can load the paid-launch module under both direct and package
    # names. Clear every distinct module cache; stopping after the first alias
    # can leave the live Command route serving its old 20-second queue.
    seen = set()
    invalidated = 0
    for module_name in ["churvox_paid_launch_live_patch", "backend.churvox_paid_launch_live_patch"]:
        try:
            module = importlib.import_module(module_name)
            marker = id(module)
            if marker in seen:
                continue
            seen.add(marker)
            invalidate = getattr(module, "invalidate_command_queue", None)
            if callable(invalidate):
                invalidate(business_id)
                invalidated += 1
        except Exception:
            continue
    return invalidated


async def _mirror_problem_to_command(db, user, ObjectId, slip):
    kind = base.lower((slip or {}).get("type") or (slip or {}).get("kind"))
    if not _needs_command(kind):
        return None
    business_id = base.clean((slip or {}).get("business_id") or base.business_id_string(user))
    slip_id = base.clean((slip or {}).get("id") or (slip or {}).get("_id"))
    if not business_id or not slip_id:
        return None
    now = (slip or {}).get("updated_at") or base.now_utc()
    text = base.clean((slip or {}).get("text") or (slip or {}).get("summary") or "Worker needs an owner decision.")
    try:
        contractor_id = ObjectId(business_id)
    except Exception:
        contractor_id = business_id
    command_doc = {
        "business_id": business_id,
        "contractor_id": contractor_id,
        "source_type": "worker_field_problem",
        "source_id": slip_id,
        "action_type": "review_worker_problem",
        "title": "Worker issue needs owner decision",
        "found": text,
        "prepared": "Churvox kept the worker moving and prepared the field issue for owner review. Nothing was sent, synced, charged or changed.",
        "why": "The owner must approve, edit, park or dismiss the field issue before business records or customer communication change.",
        "urgency": "Top priority",
        "status": "open",
        "payload": {
            "worker_field_problem": True,
            "worker_field_slip_id": slip_id,
            "job_id": base.clean((slip or {}).get("job_id")),
            "worker_id": base.clean((slip or {}).get("worker_id")),
            "worker_name": base.clean((slip or {}).get("worker_name")),
            "text": text,
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
        },
        "owner_review_only": True,
        "prepared_only": True,
        "no_auto_send": True,
        "no_auto_sync": True,
        "no_auto_charge": True,
        "no_auto_record_change": True,
        "created_by": base.user_id_string(user),
        "created_at": (slip or {}).get("created_at") or now,
        "updated_at": now,
        "audit": [{
            "by": base.user_id_string(user),
            "role": base.clean((user or {}).get("role") or "worker"),
            "action": "worker_problem_created",
            "note": "Worker problem mirrored to Command for owner review only.",
            "at": now,
            "safety": "Nothing was sent, synced, charged or changed.",
        }],
    }
    try:
        result = await db.command_slips.update_one(
            {"business_id": business_id, "source_type": "worker_field_problem", "source_id": slip_id},
            {"$setOnInsert": command_doc},
            upsert=True,
        )
        created = bool(getattr(result, "upserted_id", None))
    except Exception as exc:
        raise RuntimeError("Worker problem could not be prepared in Command. Nothing was sent or changed.") from exc
    if created:
        try:
            await db.command_events.insert_one({
                "business_id": business_id,
                "contractor_id": contractor_id,
                "event_type": "worker_problem_created",
                "title": command_doc["title"],
                "detail": text,
                "slip_id": slip_id,
                "safety": "Nothing was sent, synced, charged or changed.",
                "created_by": base.user_id_string(user),
                "created_at": now,
            })
        except Exception:
            pass
    _invalidate_command_cache(business_id)
    return command_doc


async def fixed_create_field_slip(db, user, ObjectId, job_id, payload):
    business_id = base.business_id_string(user)
    now = base.now_utc()
    kind = base.lower((payload or {}).get("type") or (payload or {}).get("kind") or "field_note")
    text = base.clean((payload or {}).get("text") or (payload or {}).get("note") or (payload or {}).get("summary") or "Worker sent a field note.")
    slip_id = base.clean((payload or {}).get("id")) or f"field-slip-{int(now.timestamp() * 1000)}"
    doc = {
        "id": slip_id,
        "business_id": business_id,
        "job_id": str(job_id),
        "worker_id": base.user_id_string(user),
        "worker_name": base.clean(user.get("name") or user.get("full_name") or user.get("email")),
        "type": kind,
        "text": text,
        "summary": text,
        "status": "waiting_owner_review",
        "source": "worker_field_truth",
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "updated_at": now,
    }
    try:
        existing = await db.worker_field_slips.find_one({"business_id": business_id, "id": slip_id})
    except Exception:
        existing = None
    if existing and existing.get("created_at"):
        set_doc = dict(doc)
    else:
        set_doc = {**doc, "created_at": now}
    try:
        await db.worker_field_slips.update_one(
            {"business_id": business_id, "id": slip_id},
            {"$set": set_doc},
            upsert=True,
        )
    except Exception:
        try:
            await db.worker_field_slips.insert_one(dict(set_doc))
        except Exception:
            pass
    try:
        await db.ai_operator_audit_log.insert_one({
            "business_id": business_id,
            "user_id": base.user_id_string(user),
            "source": "worker_field_truth",
            "action": "field_slip_created",
            "summary": text,
            "job_id": str(job_id),
            "slip_id": slip_id,
            "created_at": now,
        })
    except Exception:
        pass
    await base.save_passport(db, user, ObjectId, job_id, {"steps": {"worker_note": True}, "note": text})
    await _mirror_problem_to_command(db, user, ObjectId, set_doc)
    return set_doc


async def fixed_offline_sync(db, user, ObjectId, payload):
    operations = (payload or {}).get("operations") or (payload or {}).get("items") or []
    if not isinstance(operations, list):
        operations = []
    results = []
    for op in operations[:50]:
        if not isinstance(op, dict):
            continue
        job_id = base.clean(op.get("job_id") or op.get("jobId") or op.get("record_id") or "")
        op_type = base.lower(op.get("type") or op.get("operation") or "passport")
        try:
            if op_type in {"slip", "field_slip", "field_note"} and job_id:
                data = await fixed_create_field_slip(db, user, ObjectId, job_id, op.get("payload") or op)
            elif op_type in {"photo", "proof_photo"} and job_id:
                data = await base.save_photo(db, user, ObjectId, job_id, op.get("payload") or op)
            elif op_type in {"passport", "proof", "proof_passport"} and job_id:
                data = await base.save_passport(db, user, ObjectId, job_id, op.get("payload") or op)
            else:
                data = {"skipped": True}
            results.append({"ok": True, "type": op_type, "job_id": job_id, "data": base.json_safe(data)})
        except Exception as exc:
            results.append({"ok": False, "type": op_type, "job_id": job_id, "error": str(exc)})
    return {"success": True, "synced": len([item for item in results if item.get("ok")]), "results": results, "data": results}


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

    async def field_slip_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        payload = await base.read_payload(request)
        slip = await fixed_create_field_slip(db, user, ObjectId, job_id, payload)
        return base.json_safe({"success": True, "slip": slip, "command_item": base.command_item_from_slip(slip)})

    async def loose_field_slip_endpoint(request: Request):
        user = await get_current_user(request)
        payload = await base.read_payload(request)
        job_id = base.clean(
            (payload or {}).get("job_id")
            or (payload or {}).get("jobId")
            or (payload or {}).get("record_id")
            or (payload or {}).get("recordId")
            or "general-message"
        )
        slip = await fixed_create_field_slip(db, user, ObjectId, job_id, payload)
        return base.json_safe({"success": True, "slip": slip, "command_item": base.command_item_from_slip(slip)})

    async def offline_sync_endpoint(request: Request):
        user = await get_current_user(request)
        return base.json_safe(await fixed_offline_sync(db, user, ObjectId, await base.read_payload(request)))

    async def field_command_readiness():
        return {
            "success": True,
            "ready": True,
            "version": FIELD_COMMAND_BRIDGE_BUILD,
            "definitive_route_owner": "field_truth_fix",
            "cache_alias_strategy": "invalidate_all_loaded_aliases",
            "mirrors": ["worker_problem", "worker_issue", "blocked", "owner_check"],
            "excludes": ["job_proof", "routine_worker_message"],
            "safety": "Problems are prepared for owner review only. Nothing is sent, synced, charged or changed.",
        }

    for method, path, endpoint in [
        ("POST", "/api/worker/jobs/{job_id}/field-slip", field_slip_endpoint),
        ("POST", "/api/worker/field-slip", loose_field_slip_endpoint),
        ("POST", "/api/worker/offline-sync", offline_sync_endpoint),
        ("GET", "/api/worker/field-command-readiness", field_command_readiness),
    ]:
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
