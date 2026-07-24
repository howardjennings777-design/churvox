from __future__ import annotations

import secrets

try:
    import churvox_payment_core as core
except Exception:
    from backend import churvox_payment_core as core

VERSION = "churvox-stripe-payment-webhook-20260720"
INSTALLED: set[str] = set()


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app, db = getattr(module, "app", None), getattr(module, "db", None)
    ObjectId, Request, HTTPException = getattr(module, "ObjectId", None), getattr(module, "Request", None), getattr(module, "HTTPException", None)
    if app is None or db is None or ObjectId is None or Request is None or HTTPException is None:
        return

    async def stripe_webhook(request: Request):
        stripe, secret = core.stripe_client(), core.webhook_secret()
        if stripe is None or not secret:
            raise HTTPException(status_code=503, detail="Stripe webhook verification is not configured")
        raw, signature = await request.body(), core.clean(request.headers.get("stripe-signature"), 4000)
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        try:
            event = dict(stripe.Webhook.construct_event(raw, signature, secret))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")
        event_id = core.clean(event.get("id"), 300)
        if event_id:
            try:
                if await db.stripe_events.find_one({"event_id": event_id}):
                    return {"success": True, "duplicate": True}
            except Exception:
                pass
        event_type = core.lower(event.get("type"))
        data = event.get("data") or {}
        obj = dict(data.get("object") or {}) if isinstance(data, dict) else {}
        handled = False
        if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"} and core.lower(obj.get("payment_status")) == "paid":
            metadata = obj.get("metadata") or {}
            bid, invoice_id = core.clean(metadata.get("business_id"), 300), core.clean(metadata.get("invoice_id"), 300)
            if bid and invoice_id:
                collection_name, invoice = await core.find_invoice(db, bid, invoice_id, ObjectId)
                if invoice:
                    await core.mark_invoice_paid(db, collection_name, invoice, ObjectId, event, obj)
                    handled = True
        try:
            await db.stripe_events.insert_one({"event_id": event_id or secrets.token_hex(12), "event_type": event_type, "handled": handled, "stripe_account": core.clean(event.get("account"), 300), "created_at": core.now_utc()})
        except Exception:
            pass
        return {"success": True, "handled": handled, "version": VERSION}

    core.add_route(app, "/api/payments/stripe/webhook", stripe_webhook, "POST")
    INSTALLED.add(name)
