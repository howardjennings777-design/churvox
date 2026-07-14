from __future__ import annotations

import asyncio
import inspect
from typing import Any, Dict, Optional

from starlette.requests import Request as StarletteRequest

try:
    import churvox_command_runs_office_patch as engine
except Exception:
    from . import churvox_command_runs_office_patch as engine


VERSION = "churvox-command-runs-office-finalizer-v1-20260715"
TARGETS = {"server", "backend.server"}
INSTALLED = set()


async def fast_load_context(db, ObjectId, user):
    bid = engine.business_id(user)
    query = engine.business_query(ObjectId, bid)
    job_names = ["jobs", "job_records", "appointments", "bookings"]
    worker_names = ["workers", "team", "team_members", "staff", "employees", "users"]
    batches = await asyncio.gather(
        *(engine.cursor_rows(db[name], query, 260) for name in job_names),
        *(engine.cursor_rows(db[name], query, 180) for name in worker_names),
    )
    job_batches = batches[:len(job_names)]
    worker_batches = batches[len(job_names):]
    jobs = [row for batch in job_batches for row in batch]
    workers = [row for batch in worker_batches for row in batch]
    deduped = []
    seen = set()
    for worker in workers:
        ids, name, email = engine.worker_identity(ObjectId, worker)
        key = next(iter(ids), "") or email or name
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(worker)
    return {"jobs": jobs, "workers": deduped}


_original_worker_decision = engine.enrich_worker_decision


def enhanced_worker_decision(ObjectId, slip, job, workers, jobs):
    _original_worker_decision(ObjectId, slip, job, workers, jobs)
    payload = engine.payload_of(slip)
    top = payload.get("recommended_worker") if isinstance(payload.get("recommended_worker"), dict) else None
    backups = payload.get("worker_alternatives") if isinstance(payload.get("worker_alternatives"), list) else []
    if not top or not engine.clean(top.get("name")):
        return
    ranked = [top] + [item for item in backups if isinstance(item, dict) and engine.clean(item.get("name"))]
    actions = []
    action_map = {}
    for item in ranked[:3]:
        name = engine.clean(item.get("name"), "", 180)
        action = f"Approve {name}"
        if action in actions:
            continue
        actions.append(action)
        action_map[action] = {
            "id": engine.clean(item.get("id"), "", 180),
            "name": name,
            "score": item.get("score"),
            "reasons": engine.text_list(item.get("reasons")),
        }
    actions.extend(["Ask staff", "Park"])
    payload["actions"] = actions
    payload["worker_action_map"] = action_map
    payload["owner_question"] = "Approve the recommended worker, approve a ranked backup, ask staff, or park this job?"
    slip["why"] = payload["owner_question"]


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


async def invoke(endpoint, **kwargs):
    parameters = inspect.signature(endpoint).parameters
    accepted = {key: value for key, value in kwargs.items() if key in parameters}
    result = endpoint(**accepted)
    if inspect.isawaitable(result):
        return await result
    return result


def id_values(ObjectId, raw):
    values = [str(raw)] if raw is not None else []
    oid = engine.maybe_oid(ObjectId, raw)
    if oid is not None:
        values.append(oid)
    return values


async def find_slip(db, ObjectId, user, slip_id):
    values = id_values(ObjectId, slip_id)
    bid = engine.business_id(user)
    query = {
        "$and": [
            engine.business_query(ObjectId, bid),
            {"$or": [
                {"_id": {"$in": values}},
                {"id": str(slip_id)},
                {"action_id": str(slip_id)},
                {"source_id": str(slip_id)},
            ]},
        ]
    }
    try:
        return await db.command_slips.find_one(query)
    except Exception:
        return None


def apply_worker_action(payload, slip):
    action = engine.clean(payload.get("action"))
    slip_payload = engine.payload_of(slip or {})
    action_map = slip_payload.get("worker_action_map") if isinstance(slip_payload.get("worker_action_map"), dict) else {}
    selected = action_map.get(action) if action else None
    if not isinstance(selected, dict) or not engine.clean(selected.get("name")):
        return payload
    name = engine.clean(selected.get("name"), "", 180)
    fields = payload.get("fields") if isinstance(payload.get("fields"), list) else []
    updated = []
    seen_worker = False
    for raw in fields:
        field = dict(raw or {})
        label = engine.lower(field.get("label") or field.get("name") or field.get("key"))
        if label in {"worker", "recommended worker"}:
            field["value"] = name
            seen_worker = True
        elif label == "churvox recommends":
            field["value"] = f"Assign {name} to this job"
        updated.append(field)
    if not seen_worker:
        updated.append({"label": "Recommended worker", "value": name, "long": False})
    payload["fields"] = updated
    payload["selected_worker"] = selected
    payload["worker_selected_by_owner_action"] = True
    return payload


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    module_name = getattr(module, "__name__", "")
    if not app or db is None or not get_current_user or ObjectId is None or module_name in INSTALLED:
        return

    engine.load_context = fast_load_context
    engine.enrich_worker_decision = enhanced_worker_decision

    path = "/api/command/slips/{slip_id}/approve"
    route = route_for(app, path, "POST")
    original = getattr(route, "endpoint", None) if route else None
    if original:
        async def approve_with_ranked_worker(slip_id: str, request: StarletteRequest):
            try:
                payload = await request.json()
            except Exception:
                payload = {}
            try:
                user = await get_current_user(request)
            except Exception:
                user = None
            slip = await find_slip(db, ObjectId, user or {}, slip_id) if user else None
            payload = apply_worker_action(dict(payload or {}), slip or {})
            request._json = payload
            return await invoke(original, slip_id=slip_id, request=request, payload=payload)

        approve_with_ranked_worker.__name__ = "approve_with_ranked_worker_recommendation"
        remove_route(app, path, "POST")
        app.add_api_route(path, approve_with_ranked_worker, methods=["POST"])
        promote_route(app, path, "POST")

    INSTALLED.add(module_name)
