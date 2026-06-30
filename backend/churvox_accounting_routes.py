
import csv
import io
import os
import zipfile
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, StreamingResponse


ON_SITE_PAYMENT_PLANS = {"operator", "pro", "command", "enterprise"}


def _id(value):
    return str(value) if value is not None else ""


def _safe(value, default=""):
    if value is None:
        return default
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _json_safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    try:
        if hasattr(value, "binary"):
            return str(value)
    except Exception:
        pass
    return value


def _money(value):
    try:
        return f"{float(value or 0):.2f}"
    except Exception:
        return "0.00"


def _pick(doc, *keys, default=""):
    for key in keys:
        if isinstance(doc, dict) and doc.get(key) not in (None, ""):
            return doc.get(key)
    return default


def _business_id(user):
    return _id(
        user.get("business_id")
        or user.get("businessId")
        or user.get("business")
        or user.get("id")
        or user.get("_id")
    )


def _user_id(user):
    return _id(user.get("id") or user.get("_id") or user.get("user_id"))


def _role(user):
    return str(user.get("role") or user.get("user_role") or "").lower().strip()


def _plan(user, owner=None):
    owner = owner or {}
    return str(
        user.get("plan")
        or user.get("business_plan")
        or user.get("subscription_plan")
        or owner.get("plan")
        or owner.get("business_plan")
        or owner.get("subscription_plan")
        or "solo"
    ).lower().strip()


def _on_site_payment_allowed(plan):
    return str(plan or "").lower().strip() in ON_SITE_PAYMENT_PLANS


def _owner_role(user):
    return _role(user) in {"owner", "employer", "admin", "business_owner", "superadmin", "manager", "office_admin"} or bool(user.get("is_admin") or user.get("is_platform_owner"))


def _stripe_key():
    return os.environ.get("STRIPE_SECRET_KEY", "").strip()


def _frontend_url():
    return os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")


def _amount_cents(value):
    if isinstance(value, int) and value > 0:
        return value
    text = str(value or "").replace(",", "")
    try:
        return int(round(float("".join(ch for ch in text if ch.isdigit() or ch == ".")) * 100))
    except Exception:
        return 0


def _payload_amount_cents(payload):
    payload = payload or {}
    for key in ["amount_cents", "payment_cents"]:
        amount = _amount_cents(payload.get(key))
        if amount > 0:
            return amount
    for key in ["amount", "payment_due", "amount_due", "invoice_total", "total", "price", "job_price", "quote_total"]:
        amount = _amount_cents(payload.get(key))
        if amount > 0:
            return amount
    return 0


async def _owner_doc(db, user):
    bid = _business_id(user)
    owner = None
    try:
        if bid and ObjectIdShim.available:
            owner = await db.users.find_one({"_id": ObjectIdShim.make(bid)})
    except Exception:
        owner = None
    if not owner and bid:
        owner = await db.users.find_one({"business_id": bid})
    if not owner:
        owner = user
    return owner or {}


class ObjectIdShim:
    available = False
    make = staticmethod(lambda value: value)


async def _docs(db, name, bid, limit=2000):
    query = {"$or": [
        {"business_id": bid},
        {"businessId": bid},
        {"business": bid},
        {"owner_business_id": bid},
    ]}
    try:
        return await db[name].find(query).sort("_id", -1).to_list(length=limit)
    except Exception:
        return []


async def _payment_settings(db, user, owner=None):
    bid = _business_id(user)
    owner = owner or await _owner_doc(db, user)
    settings = await db.payment_settings.find_one({"business_id": bid}) or {}
    account_id = str(
        settings.get("stripe_account_id")
        or owner.get("stripe_account_id")
        or owner.get("stripe_connected_account_id")
        or ""
    ).strip()
    return settings, owner, account_id


async def _payment_debug_payload(db, user):
    bid = _business_id(user)
    owner = await _owner_doc(db, user)
    plan = _plan(user, owner)
    settings, owner, account_id = await _payment_settings(db, user, owner)
    return _json_safe({
        "success": True,
        "business_id": bid,
        "role": _role(user),
        "owner_role": _owner_role(user),
        "plan": plan,
        "enabled_for_plan": _on_site_payment_allowed(plan),
        "stripe_configured": bool(_stripe_key()),
        "stripe_key_mode": "live" if _stripe_key().startswith("sk_live_") else "test" if _stripe_key().startswith("sk_test_") else "unknown",
        "connected": bool(account_id),
        "stripe_account_id": account_id,
        "frontend_url": _frontend_url(),
        "payment_settings": settings,
        "next_step": "Connect Stripe" if _on_site_payment_allowed(plan) and _stripe_key() and not account_id else "Check owner role, plan, Stripe key, and Stripe Connect setup",
    })


async def _build_on_site_setup_link(db, user):
    if not _owner_role(user):
        raise HTTPException(status_code=403, detail="Owner access required")
    bid = _business_id(user)
    owner = await _owner_doc(db, user)
    plan = _plan(user, owner)
    if not _on_site_payment_allowed(plan):
        raise HTTPException(status_code=403, detail=f"On-site payments require Operator or Command. Current plan: {plan}")
    secret = _stripe_key()
    if not secret:
        raise HTTPException(status_code=503, detail="Stripe secret key is not configured in Render")
    stripe.api_key = secret
    settings, owner, account_id = await _payment_settings(db, user, owner)
    try:
        if not account_id:
            country = str(owner.get("country") or owner.get("billing_country") or user.get("country") or "NZ").upper().strip()[:2] or "NZ"
            account = stripe.Account.create(
                type="express",
                country=country,
                email=owner.get("email") or user.get("email"),
                capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
                metadata={"business_id": bid, "source": "churvox_on_site_payments"},
            )
            account_id = account.get("id")
            await db.payment_settings.update_one(
                {"business_id": bid},
                {"$set": {"business_id": bid, "provider": "stripe", "stripe_account_id": account_id, "updated_at": datetime.now(timezone.utc)}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=f"{_frontend_url()}/dashboard#xero",
            return_url=f"{_frontend_url()}/dashboard#xero",
            type="account_onboarding",
        )
    except Exception as exc:
        detail = str(exc)
        await db.on_site_payment_events.insert_one({
            "business_id": bid,
            "event": "setup_link_failed",
            "detail": detail,
            "stripe_account_id": account_id,
            "plan": plan,
            "created_at": datetime.now(timezone.utc),
        })
        raise HTTPException(status_code=400, detail=f"Stripe onboarding error: {detail}")
    return {"success": True, "url": link.get("url"), "stripe_account_id": account_id}


def _csv_bytes(rows, headers):
    s = io.StringIO()
    writer = csv.DictWriter(s, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({h: _safe(row.get(h, "")) for h in headers})
    return s.getvalue().encode("utf-8-sig")


def _invoice_total(inv):
    return _pick(inv, "total", "amount", "grand_total", "total_amount", "balance", default=0)


def _invoice_rows(invoices, system):
    rows = []
    for inv in invoices:
        client = _pick(inv, "client_name", "customer_name", "contact_name", "name", default="Customer")
        email = _pick(inv, "client_email", "customer_email", "email")
        number = _pick(inv, "invoice_number", "number", "invoiceNo", "id", "_id")
        date = _pick(inv, "date", "invoice_date", "created_at")
        due = _pick(inv, "due_date", "dueDate")
        desc = _pick(inv, "description", "title", "notes", default="Churvox invoice")
        amount = _money(_invoice_total(inv))
        status = _pick(inv, "status", default="DRAFT")
        tax = _pick(inv, "tax_type", "taxType", default="OUTPUT2")
        account = _pick(inv, "account_code", "accountCode", default="200")

        if system == "myob":
            rows.append({
                "Customer": client,
                "Email": email,
                "InvoiceNumber": number,
                "Date": date,
                "DueDate": due,
                "Description": desc,
                "Amount": amount,
                "TaxCode": tax,
                "Account": account,
                "Status": status,
            })
        else:
            rows.append({
                "ContactName": client,
                "EmailAddress": email,
                "InvoiceNumber": number,
                "Reference": _pick(inv, "job_number", "job_id", "reference"),
                "InvoiceDate": date,
                "DueDate": due,
                "Description": desc,
                "Quantity": "1",
                "UnitAmount": amount,
                "AccountCode": account,
                "TaxType": tax,
                "Status": status,
            })
    return rows


def _client_rows(clients):
    return [{
        "Name": _pick(c, "name", "client_name", "customer_name", "business_name"),
        "Email": _pick(c, "email", "client_email"),
        "Phone": _pick(c, "phone", "mobile"),
        "Address": _pick(c, "address", "street_address"),
        "City": _pick(c, "city", "suburb"),
        "Notes": _pick(c, "notes"),
    } for c in clients]


def _job_rows(jobs):
    return [{
        "JobNumber": _pick(j, "job_number", "number", "id", "_id"),
        "Client": _pick(j, "client_name", "customer_name"),
        "Title": _pick(j, "title", "name"),
        "Status": _pick(j, "status"),
        "ScheduledDate": _pick(j, "scheduled_date", "date"),
        "CompletedDate": _pick(j, "completed_at", "completedDate"),
        "Total": _money(_pick(j, "total", "amount", "price", default=0)),
        "Notes": _pick(j, "notes", "description"),
    } for j in jobs]


def build_accounting_router(db, get_current_user, ObjectId=None):
    if ObjectId is not None:
        ObjectIdShim.available = True
        ObjectIdShim.make = staticmethod(ObjectId)

    router = APIRouter()

    @router.get("/plan/usage")
    async def plan_usage_fallback(current_user=Depends(get_current_user)):
        bid = _business_id(current_user)
        owner = await _owner_doc(db, current_user)
        plan = _plan(current_user, owner)
        jobs = await _docs(db, "jobs", bid, limit=500)
        clients = await _docs(db, "clients", bid, limit=500)
        invoices = await _docs(db, "invoices", bid, limit=500)
        return {
            "success": True,
            "plan": plan,
            "usage": {"jobs": len(jobs), "clients": len(clients), "invoices": len(invoices)},
            "limits": {"onSitePayments": _on_site_payment_allowed(plan)},
        }

    @router.get("/accounting/health")
    async def accounting_health(current_user=Depends(get_current_user)):
        bid = _business_id(current_user)
        connection = await db.xero_connections.find_one({"business_id": bid}) or {}
        invoices = await _docs(db, "invoices", bid, limit=500)

        connected = connection.get("status") == "connected" and bool(connection.get("access_token") or connection.get("refresh_token"))
        last_invoice = invoices[0] if invoices else {}

        return {
            "success": True,
            "live_sync": {
                "xero_connected": connected,
                "tenant_name": connection.get("tenant_name"),
                "scopes": connection.get("scopes") or [],
                "expires_at": connection.get("expires_at"),
                "last_sync_at": connection.get("updated_at"),
                "draft_invoice_sync_ready": connected,
            },
            "exports": {
                "xero_csv_ready": True,
                "myob_csv_ready": True,
                "bookkeeper_pack_ready": True,
            },
            "payment_status": {
                "mode": "manual_refresh",
                "rule": "Only mark paid after Xero/MYOB refresh confirms paid.",
            },
            "guardrails": [
                "Draft invoice sync only",
                "No automatic invoice sending",
                "No tax filing",
                "No bank payout files",
                "Owner approval stays required",
            ],
            "counts": {
                "invoices": len(invoices),
                "latest_invoice": _id(last_invoice.get("_id")) if last_invoice else None,
            },
        }

    @router.get("/payments/on-site/status")
    async def on_site_payment_status(current_user=Depends(get_current_user)):
        return await _payment_debug_payload(db, current_user)

    @router.get("/payments/on-site/debug")
    async def on_site_payment_debug(current_user=Depends(get_current_user)):
        return await _payment_debug_payload(db, current_user)

    @router.post("/payments/on-site/setup-link")
    async def on_site_payment_setup_link(current_user=Depends(get_current_user)):
        return await _build_on_site_setup_link(db, current_user)

    @router.get("/payments/on-site/setup-start")
    async def on_site_payment_setup_start(current_user=Depends(get_current_user)):
        result = await _build_on_site_setup_link(db, current_user)
        return RedirectResponse(result["url"], status_code=303)

    @router.post("/payments/on-site/payment-intent")
    async def on_site_payment_intent(payload: dict = Body(default_factory=dict), current_user=Depends(get_current_user)):
        bid = _business_id(current_user)
        owner = await _owner_doc(db, current_user)
        plan = _plan(current_user, owner)
        if not _on_site_payment_allowed(plan):
            raise HTTPException(status_code=403, detail="On-site payments require Operator or Command")
        secret = _stripe_key()
        if not secret:
            raise HTTPException(status_code=503, detail="Stripe secret key is not configured in Render")
        settings, owner, account_id = await _payment_settings(db, current_user, owner)
        if not account_id:
            raise HTTPException(status_code=409, detail="Owner must connect Stripe before workers can take payment")
        amount = _payload_amount_cents(payload or {})
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Payment amount is required")
        currency = str((settings or {}).get("currency") or (payload or {}).get("currency") or "nzd").lower().strip()[:3] or "nzd"
        stripe.api_key = _stripe_key()
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                payment_method_types=["card_present"],
                capture_method="automatic",
                description=str((payload or {}).get("description") or "Churvox on-site payment")[:400],
                metadata={
                    "business_id": bid,
                    "job_id": str((payload or {}).get("job_id") or (payload or {}).get("jobId") or ""),
                    "worker_id": _user_id(current_user),
                    "source": "churvox_on_site_payment",
                },
                stripe_account=account_id,
            )
            await db.on_site_payment_events.insert_one({
                "business_id": bid,
                "job_id": str((payload or {}).get("job_id") or (payload or {}).get("jobId") or ""),
                "payment_intent_id": intent.get("id"),
                "amount_cents": amount,
                "currency": currency,
                "stripe_account_id": account_id,
                "status": intent.get("status"),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Stripe payment intent error: {str(exc)}")
        return {"success": True, "payment_intent_id": intent.get("id"), "client_secret": intent.get("client_secret"), "amount_cents": amount, "currency": currency, "stripe_account_id": account_id}

    @router.get("/accounting/bookkeeper")
    async def bookkeeper_mode(current_user=Depends(get_current_user)):
        bid = _business_id(current_user)
        invoices = await _docs(db, "invoices", bid, limit=500)
        clients = await _docs(db, "clients", bid, limit=500)
        if not clients:
            clients = await _docs(db, "customers", bid, limit=500)
        jobs = await _docs(db, "jobs", bid, limit=500)
        connection = await db.xero_connections.find_one({"business_id": bid}) or {}

        unpaid = [i for i in invoices if str(_pick(i, "status")).lower() not in ("paid", "void", "cancelled")]
        paid = [i for i in invoices if str(_pick(i, "status")).lower() == "paid"]

        return {
            "success": True,
            "summary": {
                "xero_connected": connection.get("status") == "connected",
                "tenant_name": connection.get("tenant_name"),
                "invoice_count": len(invoices),
                "unpaid_count": len(unpaid),
                "paid_count": len(paid),
                "client_count": len(clients),
                "job_count": len(jobs),
            },
            "downloads": {
                "both": "/api/accounting/export/pack?system=both",
                "xero": "/api/accounting/export/pack?system=xero",
                "myob": "/api/accounting/export/pack?system=myob",
            },
            "guardrails": [
                "Drafts only until owner approves",
                "Payment status should be refreshed from accounting before close-out",
            ],
        }

    @router.get("/accounting/payment-status")
    async def accounting_payment_status(current_user=Depends(get_current_user)):
        bid = _business_id(current_user)
        invoices = await _docs(db, "invoices", bid, limit=500)
        rows = []
        for inv in invoices:
            rows.append({
                "invoice_id": _id(inv.get("_id")),
                "invoice_number": _pick(inv, "invoice_number", "number", "invoiceNo"),
                "client": _pick(inv, "client_name", "customer_name", "contact_name"),
                "status": _pick(inv, "status", default="draft"),
                "total": _money(_invoice_total(inv)),
                "xero_invoice_id": _pick(inv, "xero_invoice_id", "xeroInvoiceId"),
                "last_checked": _pick(inv, "xero_checked_at", "payment_checked_at", "updated_at"),
            })
        return {"success": True, "mode": "manual_refresh", "invoices": rows}

    @router.get("/accounting/export/pack")
    async def accounting_export_pack(
        system: str = Query("both", pattern="^(xero|myob|both)$"),
        current_user=Depends(get_current_user),
    ):
        bid = _business_id(current_user)
        invoices = await _docs(db, "invoices", bid)
        clients = await _docs(db, "clients", bid)
        if not clients:
            clients = await _docs(db, "customers", bid)
        jobs = await _docs(db, "jobs", bid)

        wanted = ["xero", "myob"] if system == "both" else [system]
        buf = io.BytesIO()

        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            if "xero" in wanted:
                z.writestr("xero-invoices.csv", _csv_bytes(_invoice_rows(invoices, "xero"), [
                    "ContactName", "EmailAddress", "InvoiceNumber", "Reference",
                    "InvoiceDate", "DueDate", "Description", "Quantity",
                    "UnitAmount", "AccountCode", "TaxType", "Status",
                ]))
            if "myob" in wanted:
                z.writestr("myob-invoices.csv", _csv_bytes(_invoice_rows(invoices, "myob"), [
                    "Customer", "Email", "InvoiceNumber", "Date", "DueDate",
                    "Description", "Amount", "TaxCode", "Account", "Status",
                ]))

            z.writestr("clients.csv", _csv_bytes(_client_rows(clients), ["Name", "Email", "Phone", "Address", "City", "Notes"]))
            z.writestr("jobs.csv", _csv_bytes(_job_rows(jobs), ["JobNumber", "Client", "Title", "Status", "ScheduledDate", "CompletedDate", "Total", "Notes"]))
            z.writestr("bookkeeper-notes.txt", (
                "Churvox Accounting Export Pack\n"
                f"Generated: {datetime.now(timezone.utc).isoformat()}\n\n"
                "Use these files for Xero/MYOB handoff. Live sync remains owner-approved draft invoice sync only.\n"
                "Churvox does not auto-send invoices, file tax, create bank payout files, or mark paid without refresh confirmation.\n"
            ))

        buf.seek(0)
        filename = f"churvox-accounting-{system}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.zip"
        return StreamingResponse(
            buf,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    return router
