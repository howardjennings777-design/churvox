
import csv
import io
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse


def _id(value):
    return str(value) if value is not None else ""


def _safe(value, default=""):
    if value is None:
        return default
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


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
    router = APIRouter()

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
