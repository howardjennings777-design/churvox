from __future__ import annotations

import secrets
from datetime import timedelta
from urllib.parse import urlsplit

try:
    import churvox_payment_core as core
except Exception:
    from backend import churvox_payment_core as core

VERSION = "churvox-invoice-checkout-20260720"
INSTALLED: set[str] = set()


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app, db = getattr(module, "app", None), getattr(module, "db", None)
    get_current_user, ObjectId = getattr(module, "get_current_user", None), getattr(module, "ObjectId", None)
    Request, HTTPException = getattr(module, "Request", None), getattr(module, "HTTPException", None)
    if app is None or db is None or not get_current_user or ObjectId is None or Request is None or HTTPException is None:
        return

    async def create_payment_link(request: Request, invoice_id: str):
        user = await get_current_user(request)
        if not core.owner_allowed(user):
            raise HTTPException(status_code=403, detail="Owner approval is required to create a customer payment link")
        try:
            payload = await request.json()
            payload = payload if isinstance(payload, dict) else {}
        except Exception:
            payload = {}
        bid = core.business_id(user)
        collection_name, invoice = await core.find_invoice(db, bid, invoice_id, ObjectId)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if core.is_paid(invoice):
            raise HTTPException(status_code=409, detail="This invoice is already paid")
        due = core.amount_due(invoice)
        amount_cents = int(round(due * 100))
        if amount_cents < 50:
            raise HTTPException(status_code=409, detail="Invoice amount due must be at least 0.50")
        account_id, stripe = await core.payment_account_id(db, bid, user), core.stripe_client()
        if not account_id:
            raise HTTPException(status_code=409, detail="Connect the business Stripe account before creating payment links")
        if stripe is None:
            raise HTTPException(status_code=503, detail="Stripe is not configured on the backend")
        try:
            account = stripe.Account.retrieve(account_id)
            if not bool(account.get("charges_enabled")):
                raise HTTPException(status_code=409, detail="Finish Stripe setup before taking customer payments")
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe account could not be checked: {exc}")

        token = core.public_token(invoice) or secrets.token_urlsafe(24)
        ref, currency = core.invoice_ref(invoice), core.invoice_currency(invoice)
        try:
            existing = await db.invoice_payment_links.find_one({"business_id": bid, "invoice_id": ref, "status": "ready", "amount_cents": amount_cents, "currency": currency, "expires_at": {"$gt": core.now_utc() + timedelta(minutes=5)}}, sort=[("created_at", -1)])
        except Exception:
            existing = None
        public_url = f"{core.frontend_url()}/invoice/{token}"
        if existing and core.safe_https_url(existing.get("checkout_url")):
            return core.json_safe({"success": True, "reused": True, "payment_link": existing, "public_invoice_url": public_url, "message": "Approved secure payment link is ready."})

        metadata = {"invoice_id": ref, "business_id": bid, "public_token": token, "source": "churvox_invoice_checkout"}
        customer_email = core.clean(payload.get("customer_email") or invoice.get("customer_email") or invoice.get("client_email") or invoice.get("email"), 300)
        invoice_number = core.clean(invoice.get("invoice_number") or invoice.get("number") or ref, 200)
        try:
            session = stripe.checkout.Session.create(
                mode="payment", customer_email=customer_email or None, client_reference_id=ref,
                line_items=[{"price_data": {"currency": currency, "unit_amount": amount_cents, "product_data": {"name": f"Invoice {invoice_number}", "description": core.clean(invoice.get("description") or invoice.get("invoice_description") or "Approved service invoice", 500)}}, "quantity": 1}],
                metadata=metadata, payment_intent_data={"metadata": metadata},
                success_url=f"{public_url}?payment=success&session_id={{CHECKOUT_SESSION_ID}}", cancel_url=f"{public_url}?payment=cancelled",
                expires_at=int((core.now_utc() + timedelta(hours=23)).timestamp()), stripe_account=account_id,
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Stripe checkout could not be created: {exc}")
        checkout_url = core.safe_https_url(session.get("url"))
        if not checkout_url:
            raise HTTPException(status_code=502, detail="Stripe did not return a secure checkout URL")

        stamp, expires_at = core.now_utc(), core.now_utc() + timedelta(hours=23)
        link_doc = {"business_id": bid, "invoice_id": ref, "invoice_number": invoice_number, "public_token": token, "public_invoice_url": public_url, "checkout_url": checkout_url, "payment_link": checkout_url, "stripe_checkout_session_id": core.clean(session.get("id"), 300), "stripe_account_id": account_id, "amount_cents": amount_cents, "currency": currency, "status": "ready", "owner_approved": True, "approved_by": core.user_id(user), "approved_at": stamp, "expires_at": expires_at, "created_at": stamp, "updated_at": stamp}
        try:
            await db.invoice_payment_links.insert_one(dict(link_doc))
        except Exception:
            pass
        invoice_patch = {"public_token": token, "payment_link": checkout_url, "payment_url": checkout_url, "stripe_payment_url": checkout_url, "stripe_checkout_session_id": core.clean(session.get("id"), 300), "stripe_account_id": account_id, "payment_link_status": "ready", "payment_link_approved": True, "payment_link_approved_by": core.user_id(user), "payment_link_approved_at": stamp, "payment_link_expires_at": expires_at, "amount_due": due, "updated_at": stamp}
        try:
            await db[collection_name].update_one({"_id": invoice["_id"]}, {"$set": invoice_patch})
        except Exception:
            pass
        await core.mirror_invoice_update(db, bid, invoice, ObjectId, invoice_patch)
        try:
            await db.audit_logs.insert_one({"business_id": bid, "user_id": core.user_id(user), "action": "invoice_payment_link_approved", "entity_type": "invoice", "entity_id": ref, "stripe_checkout_session_id": core.clean(session.get("id"), 300), "no_auto_send": True, "no_auto_charge": True, "created_at": stamp})
        except Exception:
            pass
        return core.json_safe({"success": True, "reused": False, "payment_link": link_doc, "public_invoice_url": public_url, "message": "Secure payment link created and attached to the invoice. Nothing was sent automatically."})

    async def public_checkout(token: str, request: Request):
        collection_name, invoice = await core.find_public_invoice(db, token)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if core.is_paid(invoice):
            return {"success": True, "paid": True, "status": "paid", "invoice": core.public_invoice_summary(invoice)}
        expires_at = core.parse_datetime(invoice.get("payment_link_expires_at"))
        if expires_at and expires_at <= core.now_utc():
            raise HTTPException(status_code=409, detail="This payment link has expired. Ask the business for a new invoice link")
        url = core.safe_https_url(invoice.get("payment_link") or invoice.get("payment_url") or invoice.get("stripe_payment_url"))
        if not url:
            raise HTTPException(status_code=409, detail="The business has not approved a secure payment link for this invoice yet")
        host = core.lower(urlsplit(url).hostname)
        if not (host == "checkout.stripe.com" or host.endswith(".stripe.com")):
            raise HTTPException(status_code=409, detail="The approved payment link is not a Stripe checkout link")
        stamp = core.now_utc()
        try:
            await db[collection_name].update_one({"_id": invoice["_id"]}, {"$set": {"payment_link_last_opened_at": stamp, "updated_at": stamp}, "$inc": {"payment_link_open_count": 1}})
        except Exception:
            pass
        return {"success": True, "paid": False, "checkout_url": url, "status": "ready"}

    async def payment_status(token: str, request: Request, session_id: str = ""):
        collection_name, invoice = await core.find_public_invoice(db, token)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        if core.is_paid(invoice):
            return {"success": True, "paid": True, "invoice": core.public_invoice_summary(invoice), "version": VERSION}
        supplied = core.clean(session_id or request.query_params.get("session_id"), 300)
        expected = core.clean(invoice.get("stripe_checkout_session_id"), 300)
        if supplied and expected and supplied == expected:
            stripe = core.stripe_client()
            bid = core.clean(invoice.get("business_id") or invoice.get("businessId") or invoice.get("contractor_id"), 300)
            account_id = core.clean(invoice.get("stripe_account_id"), 300) or await core.payment_account_id(db, bid)
            if stripe and account_id:
                try:
                    session = stripe.checkout.Session.retrieve(supplied, stripe_account=account_id)
                    metadata = session.get("metadata") or {}
                    matches = core.clean(metadata.get("invoice_id"), 300) == core.invoice_ref(invoice) and core.clean(metadata.get("business_id"), 300) == bid
                    if matches and core.lower(session.get("payment_status")) == "paid":
                        invoice = await core.mark_invoice_paid(db, collection_name, invoice, ObjectId, {"id": "status-confirmation", "type": "checkout.session.confirmed"}, dict(session))
                except Exception:
                    pass
        return {"success": True, "paid": core.is_paid(invoice), "invoice": core.public_invoice_summary(invoice), "version": VERSION}

    for method, path, endpoint in [
        ("POST", "/api/invoices/{invoice_id}/payment-link", create_payment_link),
        ("POST", "/api/public/invoice/{token}/checkout", public_checkout),
        ("GET", "/api/public/invoice/{token}/payment-status", payment_status),
    ]:
        core.add_route(app, path, endpoint, method)
    INSTALLED.add(name)
