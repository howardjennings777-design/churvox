from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
from fastapi import HTTPException, Request as FastAPIRequest

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
FINAL_WORKER_FIELD_BRIDGE_BUILD = "churvox-worker-field-command-bridge-v10-20260713"


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def json_safe(value):
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
    return clean(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id"))


def user_id(user):
    return clean(user.get("id") or user.get("_id") or user.get("worker_id") or user.get("email"))


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def safe_cancel_url(value):
    raw = clean(value)
    if not raw:
        return raw
    try:
        parts = urlsplit(raw)
        query = dict(parse_qsl(parts.query, keep_blank_values=True))
        checkout_state = clean(query.get("checkout") or query.get("state")).lower()
        old_cancel_path = parts.path.rstrip("/") in {"/dashboard", "/plans", "/billing/cancel"}
        if old_cancel_path and checkout_state in {"cancelled", "canceled", "cancel"}:
            query.pop("checkout", None)
            query.pop("state", None)
            return urlunsplit((parts.scheme, parts.netloc, "/billing/cancelled", urlencode(query), ""))
    except Exception:
        pass
    return raw


def patch_stripe_checkout_returns(module):
    stripe_module = getattr(module, "stripe", None)
    try:
        session_api = stripe_module.checkout.Session
        current_create = session_api.create
    except Exception:
        return
    if getattr(current_create, "__churvox_safe_cancel_return__", False):
        return

    def safe_create(*args, **kwargs):
        if kwargs.get("cancel_url"):
            kwargs["cancel_url"] = safe_cancel_url(kwargs.get("cancel_url"))
        return current_create(*args, **kwargs)

    safe_create.__churvox_safe_cancel_return__ = True
    safe_create.__churvox_wrapped_create__ = current_create
    session_api.create = safe_create


def install_patch_module(module, direct_name, backend_name, label):
    patch = None
    try:
        patch = importlib.import_module(direct_name)
    except Exception:
        try:
            patch = importlib.import_module(backend_name)
        except Exception as exc:
            print(f"Churvox {label} patch import skipped: {exc}", file=sys.stderr)
            return
    try:
        patch.install(module)
    except Exception as exc:
        print(f"Churvox {label} patch install skipped: {exc}", file=sys.stderr)


def command_item_from_slip(slip):
    summary = clean(slip.get("summary") or slip.get("text") or slip.get("note") or "Worker message needs owner review.")
    return {
        "id": clean(slip.get("id")),
        "source": "worker-general-field-slip",
        "category": "Command",
        "action": "Approve, edit or park",
        "type": "Worker message",
        "title": "Worker message needs owner review",
        "summary": summary,
        "status": "waiting_owner_review",
        "prepared": "Churvox saved the worker message as a Command slip. Nothing is sent to a customer or accounting system without owner approval.",
        "requires_owner_approval": True,
        "auto_sent": False,
        "accounting_synced": False,
        "details": json_safe({"record_type": "worker_field_slip", "slip": slip}),
    }


async def create_general_slip(db, user, payload):
    now = now_utc()
    text = clean(
        (payload or {}).get("text")
        or (payload or {}).get("note")
        or (payload or {}).get("summary")
        or (payload or {}).get("message")
        or "Worker sent a field message."
    )
    slip_id = clean((payload or {}).get("id")) or f"general-field-slip-{int(now.timestamp() * 1000)}"
    doc = {
        "id": slip_id,
        "business_id": business_id(user),
        "job_id": clean((payload or {}).get("job_id") or (payload or {}).get("jobId") or ""),
        "worker_id": user_id(user),
        "worker_name": clean(user.get("name") or user.get("full_name") or user.get("email")),
        "type": clean((payload or {}).get("type") or (payload or {}).get("kind") or "worker_message"),
        "kind": clean((payload or {}).get("kind") or (payload or {}).get("type") or "worker_message"),
        "text": text,
        "note": text,
        "summary": text,
        "status": "waiting_owner_review",
        "source": clean((payload or {}).get("source") or "worker_general_message"),
        "requires_owner_approval": True,
        "owner_approved": False,
        "auto_sent": False,
        "accounting_synced": False,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.worker_field_slips.update_one(
            {"business_id": doc["business_id"], "id": slip_id},
            {"$set": doc, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
    except Exception:
        pass
    try:
        await db.ai_operator_audit_log.insert_one({
            "business_id": doc["business_id"],
            "user_id": doc["worker_id"],
            "source": "worker_general_field_slip",
            "action": "field_slip_created",
            "summary": text,
            "slip_id": slip_id,
            "created_at": now,
        })
    except Exception:
        pass
    return doc


def install(module):
    name = getattr(module, "__name__", "")
    patch_stripe_checkout_returns(module)
    install_patch_module(
        module,
        "churvox_stripe_webhook_paid_launch_patch",
        "backend.churvox_stripe_webhook_paid_launch_patch",
        "Stripe webhook",
    )
    install_patch_module(
        module,
        "churvox_public_documents_paid_launch_guard",
        "backend.churvox_public_documents_paid_launch_guard",
        "public documents",
    )
    install_patch_module(
        module,
        "churvox_public_invoice_balance_fix",
        "backend.churvox_public_invoice_balance_fix",
        "public invoice balance",
    )
    install_patch_module(
        module,
        "churvox_public_customer_request_paid_launch",
        "backend.churvox_public_customer_request_paid_launch",
        "public customer request",
    )
    install_patch_module(
        module,
        "churvox_runtime_jwt_secret_patch",
        "backend.churvox_runtime_jwt_secret_patch",
        "runtime JWT secret",
    )
    install_patch_module(
        module,
        "churvox_production_launch_security",
        "backend.churvox_production_launch_security",
        "production launch security",
    )
    install_patch_module(
        module,
        "churvox_email_links_paid_launch_patch",
        "backend.churvox_email_links_paid_launch_patch",
        "lifecycle email links",
    )
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Request is None or ObjectId is None:
        return

    try:
        import churvox_field_truth_fix_patch as field_truth_fix
    except Exception:
        try:
            from backend import churvox_field_truth_fix_patch as field_truth_fix
        except Exception:
            field_truth_fix = None

    async def general_worker_field_slip_endpoint(request: FastAPIRequest):
        user = await get_current_user(request)
        payload = await read_payload(request)
        if field_truth_fix is None:
            raise HTTPException(status_code=503, detail="Worker Command bridge is unavailable. Nothing was sent or changed.")
        job_id = clean(
            (payload or {}).get("job_id")
            or (payload or {}).get("jobId")
            or (payload or {}).get("record_id")
            or (payload or {}).get("recordId")
            or "general-message"
        )
        slip = await field_truth_fix.fixed_create_field_slip(db, user, ObjectId, job_id, payload)
        item = field_truth_fix.base.command_item_from_slip(slip)
        return json_safe({
            "success": True,
            "slip": slip,
            "command_item": item,
            "item": item,
            "action": item,
            "bridge_version": FINAL_WORKER_FIELD_BRIDGE_BUILD,
            "definitive_route_owner": "paid_launch_guard_bridge",
        })

    async def final_worker_field_bridge_readiness():
        return {
            "success": True,
            "ready": field_truth_fix is not None,
            "version": FINAL_WORKER_FIELD_BRIDGE_BUILD,
            "definitive_route_owner": "paid_launch_guard_bridge",
            "cache_alias_strategy": "invalidate_all_loaded_aliases",
            "mirrors": ["worker_problem", "worker_issue", "blocked", "owner_check"],
            "excludes": ["job_proof", "routine_worker_message"],
            "safety": "Problems are prepared for owner review only. Nothing is sent, synced, charged or changed.",
        }

    for method, path, endpoint in [
        ("POST", "/api/worker/field-slip", general_worker_field_slip_endpoint),
        ("GET", "/api/worker/field-command-readiness", final_worker_field_bridge_readiness),
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
