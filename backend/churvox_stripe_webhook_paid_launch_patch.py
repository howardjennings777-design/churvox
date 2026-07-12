from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

from fastapi import BackgroundTasks, HTTPException, Request
from fastapi.responses import JSONResponse

VERSION = "churvox-stripe-webhook-paid-launch-20260712"
TARGET_PATHS = {"/api/billing/webhook", "/billing/webhook"}
ACTIVE_STATUSES = {"active", "trialing", "past_due"}
LOCKED_STATUSES = {"canceled", "cancelled", "unpaid", "incomplete_expired", "paused"}
PLAN_ALIASES = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normal_plan(value: Any) -> str:
    raw = _text(value).lower()
    return PLAN_ALIASES.get(raw, raw if raw in PLAN_ALIASES.values() else "")


def _to_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    try:
        return value.to_dict_recursive()
    except Exception:
        try:
            return dict(value)
        except Exception:
            return {}


def _datetime_from_unix(value: Any):
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except Exception:
        return None


def _webhook_secrets() -> list[str]:
    values = []
    for key in (
        "STRIPE_WEBHOOK_SECRET",
        "STRIPE_BILLING_WEBHOOK_SECRET",
        "STRIPE_SIGNING_SECRET",
        "STRIPE_ENDPOINT_SECRET",
    ):
        raw = _text(os.environ.get(key))
        if raw and raw not in values:
            values.append(raw)
    return values


def _remove_existing_routes(app) -> None:
    kept = []
    for route in list(getattr(app.router, "routes", []) or []):
        path = getattr(route, "path", "")
        methods = set(getattr(route, "methods", set()) or set())
        if path in TARGET_PATHS and "POST" in methods:
            continue
        if path == "/api/billing/webhook-status" and "GET" in methods:
            continue
        kept.append(route)
    app.router.routes = kept


def _user_queries(module, metadata: dict[str, Any], customer_id: str, subscription_id: str) -> list[dict[str, Any]]:
    queries: list[dict[str, Any]] = []
    user_id = _text(metadata.get("user_id"))
    business_id = _text(metadata.get("business_id"))

    if customer_id:
        queries.append({"stripe_customer_id": customer_id})
    if subscription_id:
        queries.append({"stripe_subscription_id": subscription_id})

    if user_id:
        try:
            queries.append({"_id": module.ObjectId(user_id)})
        except Exception:
            queries.append({"_id": user_id})

    if business_id:
        try:
            business_oid = module.ObjectId(business_id)
            queries.extend([{"business_id": business_oid}, {"_id": business_oid}])
        except Exception:
            queries.extend([{"business_id": business_id}, {"_id": business_id}])

    unique = []
    seen = set()
    for query in queries:
        marker = repr(query)
        if marker not in seen:
            seen.add(marker)
            unique.append(query)
    return unique


async def _find_user(module, metadata: dict[str, Any], customer_id: str, subscription_id: str):
    for query in _user_queries(module, metadata, customer_id, subscription_id):
        try:
            found = await module.db.users.find_one(query)
            if found:
                return found
        except Exception:
            continue
    return None


async def _update_business(module, user: dict[str, Any], updates: dict[str, Any]) -> None:
    business_id = user.get("business_id") or user.get("_id")
    if not business_id:
        return
    queries = [{"_id": business_id}, {"business_id": business_id}]
    for query in queries:
        try:
            result = await module.db.businesses.update_one(query, {"$set": updates})
            if getattr(result, "matched_count", 0):
                return
        except Exception:
            continue


async def _process_event(module, event: dict[str, Any]) -> None:
    event_id = _text(event.get("id"))
    event_type = _text(event.get("type"))
    data_object = _to_dict((event.get("data") or {}).get("object"))
    metadata = _to_dict(data_object.get("metadata"))
    customer_id = _text(data_object.get("customer"))
    subscription_id = _text(data_object.get("subscription"))
    if event_type.startswith("customer.subscription"):
        subscription_id = _text(data_object.get("id")) or subscription_id

    now = _now()
    result_summary: dict[str, Any] = {
        "event_type": event_type,
        "customer_id": customer_id,
        "subscription_id": subscription_id,
        "processed_at": now,
    }

    try:
        user = await _find_user(module, metadata, customer_id, subscription_id)
        if not user:
            result_summary["user_match"] = "not_found"
        else:
            updates: dict[str, Any] = {"updated_at": now, "last_stripe_event": event_type, "last_stripe_event_at": now}
            plan = _normal_plan(metadata.get("plan") or metadata.get("selected_plan") or data_object.get("plan"))
            if plan:
                updates["plan"] = plan
                updates["subscription_plan"] = plan
            if customer_id:
                updates["stripe_customer_id"] = customer_id
            if subscription_id:
                updates["stripe_subscription_id"] = subscription_id

            if event_type == "checkout.session.completed":
                session_id = _text(data_object.get("id"))
                if session_id:
                    updates["stripe_checkout_session_id"] = session_id
                updates.update({
                    "subscription_status": "trialing" if _text(data_object.get("mode")) == "subscription" else "active",
                    "has_app_access": True,
                    "billing_lock_reason": None,
                    "checkout_completed_at": now,
                })

            elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
                status = _text(data_object.get("status") or ("canceled" if event_type.endswith("deleted") else "")).lower()
                if status:
                    updates["subscription_status"] = status
                    updates["has_app_access"] = status in ACTIVE_STATUSES
                    updates["billing_lock_reason"] = "subscription_inactive" if status in LOCKED_STATUSES else None
                trial_end = _datetime_from_unix(data_object.get("trial_end"))
                current_period_end = _datetime_from_unix(data_object.get("current_period_end"))
                if trial_end:
                    updates["trial_ends_at"] = trial_end
                if current_period_end:
                    updates["current_period_end"] = current_period_end
                updates["cancel_at_period_end"] = bool(data_object.get("cancel_at_period_end"))

            elif event_type in {"invoice.paid", "invoice.payment_succeeded"}:
                updates.update({
                    "subscription_status": "active",
                    "has_app_access": True,
                    "billing_lock_reason": None,
                    "last_payment_at": now,
                    "billing_attention_required": False,
                })

            elif event_type in {"invoice.payment_failed", "invoice.payment_action_required"}:
                updates.update({
                    "subscription_status": "past_due",
                    "has_app_access": True,
                    "billing_attention_required": True,
                    "last_payment_failure_at": now,
                })

            await module.db.users.update_one({"_id": user["_id"]}, {"$set": updates})
            await _update_business(module, user, updates)
            result_summary["user_match"] = str(user.get("_id"))
            result_summary["updates"] = sorted(updates.keys())

        await module.db.stripe_webhook_events.update_one(
            {"event_id": event_id},
            {"$set": {"processed": True, "processing_error": "", **result_summary}},
            upsert=True,
        )
    except Exception as exc:
        try:
            await module.db.stripe_webhook_events.update_one(
                {"event_id": event_id},
                {"$set": {"processed": False, "processing_error": str(exc)[:1200], "processed_at": now, "event_type": event_type}},
                upsert=True,
            )
        except Exception:
            pass


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    stripe_module = getattr(module, "stripe", None)
    if app is None or db is None or stripe_module is None:
        return
    if getattr(app.state, "churvox_stripe_webhook_paid_launch", False):
        return

    _remove_existing_routes(app)

    async def webhook_status():
        return {
            "success": True,
            "version": VERSION,
            "configured": bool(_webhook_secrets()),
            "paths": sorted(TARGET_PATHS),
        }

    async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
        secrets = _webhook_secrets()
        if not secrets:
            raise HTTPException(status_code=503, detail="Stripe webhook signing secret is not configured")

        payload = await request.body()
        signature = _text(request.headers.get("stripe-signature"))
        if not signature:
            raise HTTPException(status_code=400, detail="Stripe-Signature header is missing")

        event = None
        last_error = None
        for secret in secrets:
            try:
                event = stripe_module.Webhook.construct_event(payload, signature, secret)
                break
            except Exception as exc:
                last_error = exc
        if event is None:
            raise HTTPException(status_code=400, detail=f"Invalid Stripe webhook signature: {str(last_error)[:300]}")

        event_dict = _to_dict(event)
        event_id = _text(event_dict.get("id"))
        event_type = _text(event_dict.get("type"))
        if not event_id or not event_type:
            raise HTTPException(status_code=400, detail="Stripe webhook event is missing id or type")

        try:
            await db.stripe_webhook_events.update_one(
                {"event_id": event_id},
                {
                    "$setOnInsert": {
                        "event_id": event_id,
                        "event_type": event_type,
                        "received_at": _now(),
                        "processed": False,
                        "livemode": bool(event_dict.get("livemode")),
                        "api_version": event_dict.get("api_version"),
                    },
                    "$set": {"last_delivery_at": _now(), "version": VERSION},
                },
                upsert=True,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Could not record Stripe event: {str(exc)[:300]}")

        background_tasks.add_task(_process_event, module, event_dict)
        return JSONResponse({"received": True, "event_id": event_id, "event_type": event_type, "version": VERSION}, status_code=200)

    app.add_api_route("/api/billing/webhook-status", webhook_status, methods=["GET"])
    app.add_api_route("/api/billing/webhook", stripe_webhook, methods=["POST"])
    app.add_api_route("/billing/webhook", stripe_webhook, methods=["POST"])
    app.state.churvox_stripe_webhook_paid_launch = True
