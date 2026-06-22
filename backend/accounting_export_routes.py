import csv
import io
import zipfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse


def _safe(value, default=""):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return value
    return str(value)


def _pick(doc, *keys, default=""):
    for key in keys:
        if isinstance(doc, dict) and doc.get(key) not in (None, ""):
            return doc.get(key)
    return default


def _money(value):
    try:
        return f"{float(value or 0):.2f}"
    except Exception:
        return "0.00"


def _business_id(current_user):
    return str(
        current_user.get("business_id")
        or current_user.get("businessId")
        or current_user.get("business")
        or current_user.get("id")
        or current_user.get("_id")
        or ""
    )


async def _find_business_docs(db, collection_name, business_id, limit=5000):
    if not hasattr(db, collection_name):
        return []
    collection = getattr(db, collection_name)
    query = {
        "$or": [
            {"business_id": business_id},
            {"businessId": business_id},
            {"business": business_id},
            {"owner_business_id": business_id},
        ]
    }
    return await collection.find(query).sort("_id", -1).to_list(length=limit)


def _write_csv(rows, headers):
    out = io.StringIO()
    writer = csv.DictWriter(out, fieldnames=headers, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({key: _safe(row.get(key, "")) for key in headers})
    return out.getvalue().encode("utf-8-sig")


def _invoice_amount(invoice):
    return (
        _pick(invoice, "total", "amount", "total_amount", "grand_total", "balance", default=0)
        or 0
    )


def _invoice_rows(invoices, system="xero"):
    rows = []
    for inv in invoices:
        client = _pick(inv, "client_name", "customer_name", "contact_name", "name", default="Customer")
        email = _pick(inv, "client_email", "customer_email", "email")
        number = _pick(inv, "invoice_number", "number", "invoiceNo", "id", "_id")
        date = _pick(inv, "date", "invoice_date", "created_at")
        due = _pick(inv, "due_date", "dueDate")
        description = _pick(inv, "description", "title", "notes", default="Churvox invoice")
        amount = _money(_invoice_amount(inv))
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
                "Description": description,
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
                "Description": description,
                "Quantity": "1",
                "UnitAmount": amount,
                "AccountCode": account,
                "TaxType": tax,
                "Status": status,
            })
    return rows


def _client_rows(clients):
    rows = []
    for c in clients:
        rows.append({
            "Name": _pick(c, "name", "client_name", "customer_name", "business_name"),
            "Email": _pick(c, "email", "client_email"),
            "Phone": _pick(c, "phone", "mobile"),
            "Address": _pick(c, "address", "street_address"),
            "City": _pick(c, "city", "suburb"),
            "Notes": _pick(c, "notes"),
        })
    return rows


def _job_rows(jobs):
    rows = []
    for j in jobs:
        rows.append({
            "JobNumber": _pick(j, "job_number", "number", "id", "_id"),
            "Client": _pick(j, "client_name", "customer_name"),
            "Title": _pick(j, "title", "name"),
            "Status": _pick(j, "status"),
            "ScheduledDate": _pick(j, "scheduled_date", "date"),
            "CompletedDate": _pick(j, "completed_at", "completedDate"),
            "Total": _money(_pick(j, "total", "amount", "price", default=0)),
            "Notes": _pick(j, "notes", "description"),
        })
    return rows


def install(app, db, get_current_user):
    router = APIRouter()

    @router.get("/accounting/export/pack")
    async def accounting_export_pack(
        system: str = Query("xero", pattern="^(xero|myob|both)$"),
        current_user=Depends(get_current_user),
    ):
        bid = _business_id(current_user)
        invoices = await _find_business_docs(db, "invoices", bid)
        clients = await _find_business_docs(db, "clients", bid)
        if not clients:
            clients = await _find_business_docs(db, "customers", bid)
        jobs = await _find_business_docs(db, "jobs", bid)

        wanted = ["xero", "myob"] if system == "both" else [system]
        buffer = io.BytesIO()

        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as z:
            if "xero" in wanted:
                rows = _invoice_rows(invoices, "xero")
                z.writestr(
                    "xero-invoices.csv",
                    _write_csv(rows, [
                        "ContactName", "EmailAddress", "InvoiceNumber", "Reference",
                        "InvoiceDate", "DueDate", "Description", "Quantity",
                        "UnitAmount", "AccountCode", "TaxType", "Status",
                    ]),
                )

            if "myob" in wanted:
                rows = _invoice_rows(invoices, "myob")
                z.writestr(
                    "myob-invoices.csv",
                    _write_csv(rows, [
                        "Customer", "Email", "InvoiceNumber", "Date", "DueDate",
                        "Description", "Amount", "TaxCode", "Account", "Status",
                    ]),
                )

            z.writestr(
                "clients.csv",
                _write_csv(_client_rows(clients), ["Name", "Email", "Phone", "Address", "City", "Notes"]),
            )
            z.writestr(
                "jobs.csv",
                _write_csv(_job_rows(jobs), ["JobNumber", "Client", "Title", "Status", "ScheduledDate", "CompletedDate", "Total", "Notes"]),
            )
            z.writestr(
                "bookkeeper-notes.txt",
                (
                    "Churvox Accounting Export Pack\n"
                    f"Generated: {datetime.now(timezone.utc).isoformat()}\n\n"
                    "This pack is for Xero/MYOB handoff. Churvox exports invoice, client, and job totals.\n"
                    "Live sync remains owner-approved draft invoice sync only. Nothing is auto-sent, filed, reconciled, or paid automatically.\n"
                ),
            )

        buffer.seek(0)
        filename = f"churvox-accounting-{system}-{datetime.now(timezone.utc).strftime('%Y%m%d')}.zip"
        return StreamingResponse(
            buffer,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    app.include_router(router, prefix="/api")
