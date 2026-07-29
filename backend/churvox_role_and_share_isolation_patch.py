from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

import churvox_tenant_isolation_security_patch as tenant

VERSION = "churvox-role-share-isolation-20260729-v1"

OWNER_ONLY_EXACT = {
    "/api/plan/usage",
    "/api/accounting/health",
    "/api/accounting/bookkeeper",
    "/api/accounting/payment-status",
    "/api/accounting/export/pack",
    "/api/payments/on-site/debug",
    "/api/payments/on-site/setup-link",
    "/api/payments/on-site/setup-start",
    "/api/proof-packs",
    "/api/ai/audit-log",
    "/api/message-approvals/send",
    "/api/dispatch/assign",
}


def owner_only_path(path: str, method: str) -> bool:
    path = tenant.text(path).rstrip("/") or "/"
    method = tenant.text(method).upper()
    if path in OWNER_ONLY_EXACT:
        return True
    if path.startswith("/api/proof-packs/from-job/"):
        return True
    if path.startswith("/api/clients/") and path.endswith("/memory"):
        return True
    if path.startswith("/api/xero/") and path != "/api/xero/callback":
        return True
    return False


def xero_state_recent(saved: Dict[str, Any] | None, now: datetime | None = None, max_age_seconds: int = 600) -> bool:
    saved = saved or {}
    created = saved.get("created_at")
    if not isinstance(created, datetime):
        return False
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    age = (now - created).total_seconds()
    return 0 <= age <= max_age_seconds


def valid_public_token(token: str) -> bool:
    token = tenant.text(token, 300)
    if len(token) < 20 or len(token) > 200:
        return False
    return all(ch.isalnum() or ch in "-_" for ch in token)


def worker_role(user: Dict[str, Any] | None) -> bool:
    return tenant.role_of(user) in {
        "worker", "staff", "employee", "team_member", "subcontractor",
        "contractor", "field_worker", "field_staff", "technician", "tech",
    }


async def find_job(module, user, job_id: str):
    query = tenant.strict_record_query(user, module.ObjectId, job_id, tenant.RECORD_TARGETS["job"][1])
    _collection, job = await tenant.find_first(module.db, tenant.RECORD_TARGETS["job"][0], query)
    return job


async def worker_job_allowed(module, user, job_id: str) -> bool:
    job = await find_job(module, user, job_id)
    if not job:
        return False
    if tenant.is_owner(user):
        return True
    return worker_role(user) and tenant.assigned_to_user(job, user)


async def secure_public_proof(module, request, token_value: str):
    JSONResponse = module.JSONResponse
    token_value = tenant.text(token_value, 300)
    if not valid_public_token(token_value):
        return JSONResponse({"success": False, "detail": "Proof pack not found"}, status_code=404)
    try:
        pack = await module.db.job_proof_packs.find_one({
            "$or": [
                {"public_token": token_value},
                {"token": token_value},
            ]
        })
    except Exception:
        pack = None
    if not pack:
        return JSONResponse({"success": False, "detail": "Proof pack not found"}, status_code=404)
    # A public share returns only the customer-facing proof fields. Tenant ids,
    # internal audit data, private record ids and bearer tokens stay server-side.
    item = {
        "job_title": tenant.text(pack.get("job_title") or pack.get("title") or "Completed work"),
        "customer_name": tenant.text(pack.get("customer_name") or pack.get("client_name")),
        "status": tenant.text(pack.get("status") or "ready"),
        "ai_summary": tenant.text(pack.get("ai_summary") or pack.get("summary"), 6000),
        "owner_message": tenant.text(pack.get("owner_message"), 6000),
        "photos": tenant.safe(pack.get("photos") or []),
        "completed_at": tenant.safe(pack.get("completed_at")),
        "updated_at": tenant.safe(pack.get("updated_at")),
    }
    return JSONResponse({"success": True, "proof_pack": item, "pack": item, "item": item})


async def validate_offline_sync(module, request, user):
    JSONResponse = module.JSONResponse
    if tenant.is_owner(user):
        return None
    if not worker_role(user):
        return JSONResponse({"success": False, "detail": "Worker access required"}, status_code=403)
    body = await tenant.request_json(request)
    actions = body.get("actions") if isinstance(body.get("actions"), list) else []
    for action in actions[:100]:
        if not isinstance(action, dict):
            continue
        job_id = tenant.text(action.get("job_id") or action.get("target_id"))
        if job_id and not await worker_job_allowed(module, user, job_id):
            return JSONResponse({"success": False, "detail": "Assigned job not found"}, status_code=404)
    # Starlette request bodies can be consumed only once. Restore the parsed body
    # for the older route after validation.
    raw = __import__("json").dumps(body).encode("utf-8")
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": raw, "more_body": False}

    request._receive = receive
    return None


async def validate_voice_note(module, request, user):
    JSONResponse = module.JSONResponse
    if tenant.is_owner(user):
        return None
    if not worker_role(user):
        return JSONResponse({"success": False, "detail": "Worker access required"}, status_code=403)
    body = await tenant.request_json(request)
    job_id = tenant.text(body.get("job_id") or body.get("target_id"))
    if job_id and not await worker_job_allowed(module, user, job_id):
        return JSONResponse({"success": False, "detail": "Assigned job not found"}, status_code=404)
    raw = __import__("json").dumps(body).encode("utf-8")
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": raw, "more_body": False}

    request._receive = receive
    return None


async def validate_payment_intent(module, request, user):
    JSONResponse = module.JSONResponse
    if tenant.is_owner(user):
        return None
    if not worker_role(user):
        return JSONResponse({"success": False, "detail": "Worker access required"}, status_code=403)
    body = await tenant.request_json(request)
    job_id = tenant.text(body.get("job_id") or body.get("jobId"))
    if not job_id or not await worker_job_allowed(module, user, job_id):
        return JSONResponse({"success": False, "detail": "Assigned job is required for worker payment"}, status_code=404)
    raw = __import__("json").dumps(body).encode("utf-8")
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": raw, "more_body": False}

    request._receive = receive
    return None


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    JSONResponse = getattr(module, "JSONResponse", None)
    if any(value is None for value in (app, db, get_current_user, JSONResponse)):
        return False
    if getattr(app.state, "churvox_role_share_isolation", "") == VERSION:
        return True

    @app.middleware("http")
    async def churvox_role_share_isolation_guard(request, call_next):
        path = request.url.path.rstrip("/") or "/"
        method = request.method.upper()

        if path.startswith("/api/public/proof/") and method == "GET":
            token_value = path.split("/api/public/proof/", 1)[-1]
            return tenant.apply_cors(await secure_public_proof(module, request, token_value), request)

        if path == "/api/xero/callback" and method == "GET":
            state = tenant.text(request.query_params.get("state"), 300)
            if state:
                try:
                    saved = await module.db.xero_oauth_states.find_one({"state": state, "used": False})
                except Exception:
                    saved = None
                if saved and not xero_state_recent(saved):
                    try:
                        await module.db.xero_oauth_states.update_one(
                            {"_id": saved.get("_id")},
                            {"$set": {"used": True, "expired": True, "updated_at": datetime.now(timezone.utc)}},
                        )
                    except Exception:
                        pass
                    frontend = tenant.text(getattr(module, "FRONTEND_URL", "https://www.churvox.com")).rstrip("/")
                    RedirectResponse = getattr(module, "RedirectResponse", None)
                    if RedirectResponse is not None:
                        return RedirectResponse(f"{frontend}/dashboard?xero_error=expired_state#xero", status_code=307)
                    return tenant.apply_cors(JSONResponse({"success": False, "detail": "Xero connection state expired"}, status_code=400), request)

        needs_user = (
            owner_only_path(path, method)
            or (path == "/api/offline-sync" and method == "POST")
            or (path == "/api/worker/voice-notes/draft" and method == "POST")
            or (path == "/api/payments/on-site/payment-intent" and method == "POST")
        )
        if needs_user:
            user, error = await tenant.current_user_or_response(module, request)
            if error:
                return tenant.apply_cors(error, request)

            if owner_only_path(path, method) and not tenant.is_owner(user) and not tenant.is_platform_owner(user, getattr(module, "is_platform_owner", None)):
                return tenant.apply_cors(JSONResponse({"success": False, "detail": "Owner access required"}, status_code=403), request)

            validation = None
            if path == "/api/offline-sync" and method == "POST":
                validation = await validate_offline_sync(module, request, user)
            elif path == "/api/worker/voice-notes/draft" and method == "POST":
                validation = await validate_voice_note(module, request, user)
            elif path == "/api/payments/on-site/payment-intent" and method == "POST":
                validation = await validate_payment_intent(module, request, user)
            if validation is not None:
                return tenant.apply_cors(validation, request)

        response = await call_next(request)
        return tenant.apply_cors(response, request) if path.startswith("/api") else response

    app.state.churvox_role_share_isolation = VERSION
    return True


__all__ = [
    "VERSION", "install", "owner_only_path", "valid_public_token",
    "worker_role", "worker_job_allowed", "secure_public_proof", "xero_state_recent",
]
