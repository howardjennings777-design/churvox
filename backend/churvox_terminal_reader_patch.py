from __future__ import annotations

import importlib
import importlib.abc
import importlib.machinery
import sys

from churvox_on_site_payments_patch import (
    business_id,
    business_plan,
    is_allowed_plan,
    lower,
    now_utc,
    payment_account,
    remove_route,
    safe,
    stripe_client,
    text,
    user_id,
)

TARGETS = {"server", "backend.server"}
INSTALLED = set()


async def _ready(db, user, ObjectId, HTTPException):
    plan = await business_plan(db, user, ObjectId)
    if not is_allowed_plan(plan):
        raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")

    stripe = stripe_client()
    if stripe is None:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    settings, owner, account_id = await payment_account(db, user, ObjectId)
    if not account_id:
        raise HTTPException(status_code=409, detail="Owner must connect Stripe first")

    return stripe, account_id, plan


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)

    if not app or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def reader_key(request: Request):
        user = await get_current_user(request)
        stripe, account_id, plan = await _ready(db, user, ObjectId, HTTPException)

        try:
            token = stripe.terminal.ConnectionToken.create(stripe_account=account_id)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Could not open Stripe reader session: {exc}")

        try:
            await db.on_site_payment_events.insert_one({
                "business_id": business_id(user),
                "worker_id": user_id(user),
                "stripe_account_id": account_id,
                "event": "terminal_reader_session_opened",
                "created_at": now_utc(),
            })
        except Exception:
            pass

        return safe({
            "success": True,
            "reader_key": token.get("secret"),
            "stripe_account_id": account_id,
            "plan": plan,
        })

    async def reader_result(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}

        event = {
            "business_id": business_id(user),
            "worker_id": user_id(user),
            "job_id": text(payload.get("job_id")),
            "payment_intent_id": text(payload.get("payment_intent_id") or payload.get("id")),
            "status": text(payload.get("status") or "reader_result"),
            "amount_cents": payload.get("amount_cents"),
            "currency": lower(payload.get("currency") or "nzd"),
            "stripe_account_id": text(payload.get("stripe_account_id")),
            "event": "terminal_payment_result",
            "raw": safe(payload),
            "created_at": now_utc(),
            "updated_at": now_utc(),
        }

        try:
            await db.on_site_payment_events.insert_one(event)
        except Exception:
            pass

        return safe({"success": True, "recorded": True, "event": event})

    for path, endpoint, method in [
        ("/api/payments/on-site/reader-key", reader_key, "POST"),
        ("/api/payments/on-site/reader-result", reader_result, "POST"),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    try:
        import churvox_field_loop_patch
        churvox_field_loop_patch.install(module)
    except Exception as exc:
        print(f"Churvox field loop skipped: {exc}", file=sys.stderr)

    try:
        import churvox_record_bridge_patch
        churvox_record_bridge_patch.install(module)
    except Exception as exc:
        print(f"Churvox record bridge skipped: {exc}", file=sys.stderr)

    try:
        import churvox_owner_data_visibility_patch
        churvox_owner_data_visibility_patch.install(module)
    except Exception as exc:
        print(f"Churvox owner data visibility skipped: {exc}", file=sys.stderr)

    try:
        import churvox_wiring_health_patch
        churvox_wiring_health_patch.install(module)
    except Exception as exc:
        print(f"Churvox wiring health skipped: {exc}", file=sys.stderr)

    # Install the definitive tenant boundary after all compatibility readers.
    # This makes the security guard the outermost API layer and prevents an
    # older route or middleware from widening ownership or CORS rules again.
    try:
        import churvox_tenant_isolation_security_patch
        churvox_tenant_isolation_security_patch.install(module)
    except Exception as exc:
        print(f"Churvox tenant isolation security skipped: {exc}", file=sys.stderr)

    # Reassert the business-only Stripe Connect resolver after the broad API
    # guard. Workers inherit their business owner's account, never a global one.
    try:
        import churvox_tenant_payment_isolation_patch
        churvox_tenant_payment_isolation_patch.install(module)
        globals()["payment_account"] = churvox_tenant_payment_isolation_patch.secure_payment_account
    except Exception as exc:
        print(f"Churvox tenant payment isolation skipped: {exc}", file=sys.stderr)

    # Add the final role boundary: owner exports and Xero stay owner-only,
    # workers can mutate only assigned jobs, and public proof uses bearer tokens.
    try:
        import churvox_role_and_share_isolation_patch
        churvox_role_and_share_isolation_patch.install(module)
    except Exception as exc:
        print(f"Churvox role/share isolation skipped: {exc}", file=sys.stderr)

    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())


for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
