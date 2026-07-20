from __future__ import annotations

from datetime import datetime, timezone, timedelta
import hashlib
import importlib
import secrets


VERSION = "churvox-account-deletion-final-20260720b"
PROTECTED_OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings777@gmail.com",
}
ROUTES = {
    ("/api/account/self-delete", "DELETE"),
    ("/api/account/self-delete", "POST"),
    ("/api/account/delete", "DELETE"),
    ("/api/account/delete", "POST"),
    ("/api/auth/delete-account", "DELETE"),
    ("/api/auth/delete-account", "POST"),
    ("/api/auth/account-delete", "DELETE"),
    ("/api/auth/account-delete", "POST"),
}
BUSINESS_COLLECTIONS = (
    "clients",
    "jobs",
    "quotes",
    "invoices",
    "workers",
    "team_members",
    "messages",
    "worker_messages",
    "worker_field_slips",
    "worker_proof_files",
    "job_proof_packs",
    "public_proof_packs",
    "client_portals",
    "public_client_portals",
    "customer_requests",
    "command_slips",
    "command_events",
    "ai_review_items",
    "ai_approval_actions",
    "notifications",
    "support_tickets",
    "job_closeouts",
    "timesheets",
    "payroll_runs",
    "business_profiles",
    "business_settings",
    "accounting_exports",
    "xero_connections",
    "xero_settings",
    "recurring_jobs",
    "schedule_events",
    "attachments",
)
IDENTITY_COLLECTIONS = (
    "password_reset_tokens",
    "email_verification_tokens",
    "refresh_tokens",
    "sessions",
    "token_revocations",
    "worker_invites",
    "team_invites",
)


def text(value, limit=500):
    return str(value or "").strip()[:limit]


def object_id(ObjectId, value):
    try:
        return value if value.__class__.__name__ == "ObjectId" else ObjectId(str(value))
    except Exception:
        return None


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_routes(app):
    app.router.routes = [
        route
        for route in app.router.routes
        if not any(route_matches(route, path, method) for path, method in ROUTES)
    ]


def promote_routes(app):
    selected = [
        route
        for route in app.router.routes
        if any(route_matches(route, path, method) for path, method in ROUTES)
    ]
    if selected:
        app.router.routes = selected + [route for route in app.router.routes if route not in selected]


def identity_values(ObjectId, user):
    raw_values = [
        (user or {}).get("_id"),
        (user or {}).get("id"),
        (user or {}).get("business_id"),
        (user or {}).get("businessId"),
    ]
    values = []
    for value in raw_values:
        if value in (None, ""):
            continue
        for candidate in (value, text(value), object_id(ObjectId, value)):
            if candidate not in (None, "") and candidate not in values:
                values.append(candidate)
    return values


def business_filter(values):
    return {"$or": [
        {"business_id": {"$in": values}},
        {"contractor_id": {"$in": values}},
        {"owner_business_id": {"$in": values}},
        {"owner_id": {"$in": values}},
    ]}


def identity_filter(values, email):
    options = [
        {"user_id": {"$in": values}},
        {"owner_id": {"$in": values}},
        {"business_id": {"$in": values}},
        {"contractor_id": {"$in": values}},
    ]
    if email:
        options.extend([{"email": email}, {"worker_email": email}])
    return {"$or": options}


async def payload(request):
    try:
        value = await request.json()
        return value if isinstance(value, dict) else {}
    except Exception:
        return {}


async def cancel_stripe(module, user):
    for name in ("churvox_account_deletion_paid_launch", "backend.churvox_account_deletion_paid_launch"):
        try:
            old_patch = importlib.import_module(name)
            cancel = getattr(old_patch, "_cancel_stripe", None)
            if callable(cancel):
                return await cancel(module, user)
        except Exception as exc:
            if exc.__class__.__name__ == "HTTPException":
                raise
    return {"required": False, "cancelled": False, "customer_id": text((user or {}).get("stripe_customer_id"))}


async def mark_failed(db, user_oid, message, **extra):
    values = {
        "account_deletion_state": "failed",
        "account_deletion_error": text(message, 500),
        "account_deletion_failed_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        **extra,
    }
    await db.users.update_one({"_id": user_oid}, {"$set": values})


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    Request = getattr(module, "Request", None)
    Response = getattr(module, "Response", None)
    clear_auth_cookies = getattr(module, "clear_auth_cookies", None)
    if any(value is None for value in (app, db, get_current_user, ObjectId, HTTPException, Request, Response)):
        return
    if getattr(app.state, "churvox_account_deletion_final", "") == VERSION:
        return

    async def delete_account(request, response):
        user = await get_current_user(request)
        if not isinstance(user, dict):
            raise HTTPException(status_code=401, detail="Not authenticated")
        email = text(user.get("email")).lower()
        if email in PROTECTED_OWNER_EMAILS:
            raise HTTPException(status_code=403, detail="The Churvox platform owner account cannot be deleted from the customer deletion flow")

        body = await payload(request)
        confirmation = text(body.get("confirmation") or body.get("confirm") or body.get("confirm_email") or body.get("email")).lower()
        if confirmation not in {email, "delete my account", "delete"}:
            raise HTTPException(status_code=400, detail="Confirm deletion using the account email or the words DELETE MY ACCOUNT")

        values = identity_values(ObjectId, user)
        user_oid = object_id(ObjectId, user.get("_id") or user.get("id"))
        if not values or not user_oid:
            raise HTTPException(status_code=400, detail="The authenticated account id is missing")

        now = datetime.now(timezone.utc)
        stale_before = now - timedelta(minutes=10)
        deletion_id = f"delete-{now.strftime('%Y%m%d%H%M%S')}-{secrets.token_hex(4)}"
        claim = await db.users.update_one(
            {
                "_id": user_oid,
                "$or": [
                    {"account_deletion_state": {"$nin": ["processing", "complete"]}},
                    {"account_deletion_state": {"$exists": False}},
                    {"account_deletion_state": "processing", "account_deletion_started_at": {"$lt": stale_before}},
                ],
            },
            {"$set": {
                "account_deletion_state": "processing",
                "account_deletion_id": deletion_id,
                "account_deletion_started_at": now,
                "account_deletion_error": None,
                "updated_at": now,
            }},
        )
        if not getattr(claim, "matched_count", 0):
            raise HTTPException(status_code=409, detail="Account deletion is already being processed. Do not submit it again yet.")

        current_user = await db.users.find_one({"_id": user_oid}) or dict(user)
        try:
            stripe_result = await cancel_stripe(module, current_user)
            if stripe_result.get("cancelled"):
                await db.users.update_one({"_id": user_oid}, {"$set": {
                    "stripe_subscription_id": None,
                    "subscription_status": "canceled",
                    "stripe_subscription_status": "canceled",
                    "subscription_cancelled_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }})
        except HTTPException as exc:
            await mark_failed(db, user_oid, getattr(exc, "detail", exc))
            raise
        except Exception as exc:
            await mark_failed(db, user_oid, exc)
            raise HTTPException(status_code=502, detail="Stripe cancellation could not be confirmed. The account identity was not deleted.")

        counts = {}
        failures = {}
        workspace_filter = business_filter(values)
        for collection_name in BUSINESS_COLLECTIONS:
            try:
                result = await db[collection_name].delete_many(workspace_filter)
                counts[collection_name] = int(getattr(result, "deleted_count", 0))
            except Exception as exc:
                failures[collection_name] = text(exc, 300)

        if failures:
            await mark_failed(
                db,
                user_oid,
                "Workspace cleanup was incomplete",
                account_deletion_failures=failures,
                account_deletion_counts=counts,
            )
            raise HTTPException(status_code=500, detail="Account data deletion was incomplete. The account login was kept so deletion can be retried safely.")

        audit = {
            "deletion_id": deletion_id,
            "status": "prepared",
            "email_hash": hashlib.sha256(email.encode("utf-8")).hexdigest(),
            "stripe_subscription_cancelled": bool(stripe_result.get("cancelled")),
            "stripe_subscription_status": stripe_result.get("status"),
            "collection_counts": counts,
            "prepared_at": datetime.now(timezone.utc),
            "version": VERSION,
        }
        try:
            await db.account_deletion_audit.insert_one(audit)
        except Exception as exc:
            await mark_failed(db, user_oid, "Deletion audit could not be retained")
            raise HTTPException(status_code=500, detail=f"Deletion audit could not be retained. The account identity was not deleted: {text(exc, 220)}")

        id_failures = {}
        id_filter = identity_filter(values, email)
        for collection_name in IDENTITY_COLLECTIONS:
            try:
                result = await db[collection_name].delete_many(id_filter)
                counts[collection_name] = int(getattr(result, "deleted_count", 0))
            except Exception as exc:
                id_failures[collection_name] = text(exc, 300)

        if id_failures:
            await db.account_deletion_audit.update_one({"deletion_id": deletion_id}, {"$set": {
                "status": "failed",
                "failure": "identity token cleanup",
                "identity_failures": id_failures,
            }})
            await mark_failed(db, user_oid, "Identity token cleanup was incomplete", account_deletion_failures=id_failures)
            raise HTTPException(status_code=500, detail="Account security-token cleanup was incomplete. The owner login was kept and deletion can be retried after signing in again.")

        user_filter = {"$or": [
            {"_id": {"$in": values}},
            {"business_id": {"$in": values}},
        ]}
        try:
            users_result = await db.users.delete_many(user_filter)
            if int(getattr(users_result, "deleted_count", 0)) < 1:
                raise RuntimeError("No account users were removed")
        except Exception as exc:
            disabled_at = datetime.now(timezone.utc)
            try:
                await db.users.update_many(user_filter, {"$set": {
                    "is_active": False,
                    "disabled": True,
                    "deleted": True,
                    "account_deletion_state": "failed_finalization",
                    "session_invalid_before": disabled_at,
                    "deleted_at": disabled_at,
                    "updated_at": disabled_at,
                }})
            finally:
                if callable(clear_auth_cookies):
                    clear_auth_cookies(response)
            await db.account_deletion_audit.update_one({"deletion_id": deletion_id}, {"$set": {
                "status": "failed_finalization",
                "failure": "user identity deletion",
            }})
            raise HTTPException(status_code=500, detail=f"Account identity deletion could not be fully finalised. Remaining access was disabled: {text(exc, 220)}")

        cleanup_pending = False
        business_deleted = 0
        try:
            business_result = await db.businesses.delete_many({"$or": [
                {"_id": {"$in": values}},
                {"business_id": {"$in": values}},
                {"owner_id": {"$in": values}},
            ]})
            business_deleted = int(getattr(business_result, "deleted_count", 0))
        except Exception as exc:
            cleanup_pending = True
            await db.account_deletion_audit.update_one({"deletion_id": deletion_id}, {"$set": {
                "status": "cleanup_pending",
                "failure": "business shell deletion",
                "cleanup_error": text(exc, 300),
            }})

        if not cleanup_pending:
            await db.account_deletion_audit.update_one({"deletion_id": deletion_id}, {"$set": {
                "status": "complete",
                "business_records_deleted": business_deleted,
                "completed_at": datetime.now(timezone.utc),
            }})
        if callable(clear_auth_cookies):
            clear_auth_cookies(response)

        return {
            "success": True,
            "message": "The Stripe subscription was cancelled where required, the workspace was deleted, and the account was signed out.",
            "deletion_id": deletion_id,
            "stripe_cancelled": bool(stripe_result.get("cancelled")),
            "signed_out": True,
            "cleanup_pending": cleanup_pending,
            "version": VERSION,
        }

    delete_account.__annotations__ = {"request": Request, "response": Response}
    remove_routes(app)
    for path, method in sorted(ROUTES):
        app.add_api_route(path, delete_account, methods=[method])
    promote_routes(app)
    app.state.churvox_account_deletion_final = VERSION
