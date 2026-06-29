from __future__ import annotations

import base64
import html
import importlib
import importlib.abc
import importlib.machinery
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

import churvox_field_truth_patch as field_truth
import churvox_approval_execution_patch as approval_execution

TARGETS = {"server", "backend.server"}
INSTALLED = set()
_ORIGINAL_SEND_OR_QUEUE_EMAIL = approval_execution.send_or_queue_email


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    return field_truth.json_safe(value)


def business_id(user):
    return field_truth.business_id_string(user)


def user_id(user):
    return field_truth.user_id_string(user)


def money(value):
    try:
        return float(str(value or 0).replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def pdf_escape(value):
    return clean(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")[:110]


def build_simple_pdf(lines):
    safe_lines = [pdf_escape(line) for line in lines if clean(line)]
    if not safe_lines:
        safe_lines = ["Invoice"]
    content_lines = ["BT", "/F1 11 Tf", "50 790 Td", "14 TL"]
    for index, line in enumerate(safe_lines[:48]):
        if index:
            content_lines.append("T*")
        content_lines.append(f"({line}) Tj")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", errors="ignore")
    objects = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n")
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(b"5 0 obj << /Length " + str(len(stream)).encode("ascii") + b" >> stream\n" + stream + b"\nendstream endobj\n")
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)
    xref_at = len(pdf)
    pdf.extend(f"xref\n0 {len(objects)+1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(f"trailer << /Root 1 0 R /Size {len(objects)+1} >>\nstartxref\n{xref_at}\n%%EOF".encode("ascii"))
    return bytes(pdf)


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


async def safe_one(collection, query):
    try:
        return await collection.find_one(query)
    except Exception:
        return None


async def safe_recent(collection, query, limit=80, sort_field="updated_at"):
    try:
        return await collection.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def invoice_id_values(raw, ObjectId):
    vals = [clean(raw)] if clean(raw) else []
    try:
        if clean(raw):
            vals.append(ObjectId(clean(raw)))
    except Exception:
        pass
    return vals


async def brand_for(db, user):
    bid = business_id(user)
    doc = None
    for collection_name in ["business_settings", "businesses", "settings"]:
        try:
            collection = getattr(db, collection_name)
            doc = await collection.find_one({"business_id": bid})
            if doc:
                break
        except Exception:
            pass
    source = {**(doc or {}), **(user or {})}
    return {
        "business_id": bid,
        "business_name": clean(source.get("business_name") or source.get("company") or source.get("name") or "Your business"),
        "trading_name": clean(source.get("trading_name") or source.get("business_name") or source.get("company") or source.get("name") or "Your business"),
        "logo_url": clean(source.get("logo_url") or source.get("business_logo_url") or source.get("logo") or source.get("brand_logo")),
        "email": clean(source.get("business_email") or source.get("email") or ""),
        "phone": clean(source.get("business_phone") or source.get("phone") or ""),
        "address": clean(source.get("business_address") or source.get("address") or ""),
        "gst_number": clean(source.get("gst_number") or source.get("tax_number") or ""),
        "gst_rate": source.get("gst_rate") or 15,
    }


def lines_from_invoice(invoice, brand):
    number = clean(invoice.get("number") or invoice.get("invoice_number") or invoice.get("id") or invoice.get("_id") or f"INV-{int(now_utc().timestamp())}")
    client = clean(invoice.get("client_name") or invoice.get("customer_name") or invoice.get("client") or invoice.get("customer") or "Customer")
    total = money(invoice.get("total") or invoice.get("amount") or invoice.get("invoice_total"))
    due = clean(invoice.get("due") or invoice.get("due_date") or invoice.get("date_due") or "")
    status = clean(invoice.get("status") or "draft")
    line_items = invoice.get("line_items") if isinstance(invoice.get("line_items"), list) else []
    lines = [
        brand.get("trading_name") or brand.get("business_name"),
        f"Invoice {number}",
        f"Client: {client}",
        f"Status: {status}",
        f"Due: {due}" if due else "",
        f"GST No: {brand.get('gst_number')}" if brand.get("gst_number") else "",
        "",
        "Line items:",
    ]
    if line_items:
        for item in line_items[:20]:
            desc = clean(item.get("description") or item.get("line") or item.get("name") or "Service")
            amount = money(item.get("amount") or item.get("total"))
            lines.append(f"- {desc}: ${amount:.2f}" if amount else f"- {desc}")
    else:
        desc = clean(invoice.get("line") or invoice.get("description") or invoice.get("job") or invoice.get("title") or "Service")
        lines.append(f"- {desc}: ${total:.2f}" if total else f"- {desc}")
    lines.extend(["", f"Total: ${total:.2f}" if total else "Total: pending", clean(invoice.get("evidence") or invoice.get("proof") or "")])
    return lines


def invoice_html(invoice, brand, pdf_url=""):
    number = html.escape(clean(invoice.get("number") or invoice.get("invoice_number") or invoice.get("id") or f"INV-{int(now_utc().timestamp())}"))
    client = html.escape(clean(invoice.get("client_name") or invoice.get("customer_name") or invoice.get("client") or "Customer"))
    total = money(invoice.get("total") or invoice.get("amount") or invoice.get("invoice_total"))
    logo = clean(brand.get("logo_url"))
    logo_html = f'<img src="{html.escape(logo, quote=True)}" alt="{html.escape(brand.get("business_name") or "Business logo")}" style="max-height:64px;max-width:180px;object-fit:contain;margin-bottom:12px;" />' if logo else ""
    line_items = invoice.get("line_items") if isinstance(invoice.get("line_items"), list) else []
    rows = ""
    if line_items:
        for item in line_items[:30]:
            desc = html.escape(clean(item.get("description") or item.get("line") or item.get("name") or "Service"))
            amount = money(item.get("amount") or item.get("total"))
            rows += f"<tr><td>{desc}</td><td style='text-align:right;'>${amount:.2f}</td></tr>"
    else:
        desc = html.escape(clean(invoice.get("line") or invoice.get("description") or invoice.get("job") or invoice.get("title") or "Service"))
        rows = f"<tr><td>{desc}</td><td style='text-align:right;'>${total:.2f}</td></tr>"
    pdf_link = f"<p><a href='{html.escape(pdf_url, quote=True)}'>View invoice PDF</a></p>" if pdf_url else ""
    return f"""
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;background:#f8fafc;padding:24px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:28px;">
        {logo_html}
        <h1 style="margin:0 0 4px;font-size:26px;">Invoice {number}</h1>
        <p style="margin:0 0 18px;color:#6b7280;">From {html.escape(brand.get('trading_name') or brand.get('business_name') or 'Your business')}</p>
        <p><strong>Bill to:</strong> {client}</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0;">
          <tbody>{rows}</tbody>
          <tfoot><tr><td style="border-top:1px solid #e5e7eb;padding-top:12px;"><strong>Total</strong></td><td style="border-top:1px solid #e5e7eb;padding-top:12px;text-align:right;"><strong>${total:.2f}</strong></td></tr></tfoot>
        </table>
        {pdf_link}
        <p style="font-size:12px;color:#6b7280;">Sent after owner approval from Churvox.</p>
      </div>
    </div>
    """


async def find_invoice(db, user, ObjectId, invoice_id, item=None):
    bid = business_id(user)
    vals = invoice_id_values(invoice_id, ObjectId)
    clauses = []
    for val in vals:
        clauses.extend([{ "_id": val }, { "id": val }, { "invoice_id": val }, { "number": val }, { "invoice_number": val }, { "job_id": val }])
    if item:
        for key in ["invoice_id", "number", "invoice_number", "id", "source_id", "job_id"]:
            for val in invoice_id_values(item.get(key), ObjectId):
                clauses.extend([{ "_id": val }, { "id": val }, { "invoice_id": val }, { "number": val }, { "invoice_number": val }, { "job_id": val }])
    if clauses:
        found = await safe_one(db.invoices, {"business_id": bid, "$or": clauses})
        if found:
            return found
    return dict(item or {"id": clean(invoice_id), "number": clean(invoice_id), "status": "draft"})


async def upsert_invoice_vault(db, user, ObjectId, invoice_id, item=None, send_status="draft", outbound=None):
    brand = await brand_for(db, user)
    invoice = await find_invoice(db, user, ObjectId, invoice_id, item)
    number = clean(invoice.get("number") or invoice.get("invoice_number") or invoice.get("id") or invoice_id or f"INV-{int(now_utc().timestamp())}")
    invoice["number"] = number
    invoice.setdefault("business_id", business_id(user))
    pdf_bytes = build_simple_pdf(lines_from_invoice(invoice, brand))
    pdf_base64 = base64.b64encode(pdf_bytes).decode("ascii")
    vault_id = clean(invoice.get("_id") or invoice.get("id") or invoice.get("invoice_id") or number)
    doc = {
        "id": vault_id,
        "business_id": business_id(user),
        "invoice_id": vault_id,
        "number": number,
        "client_name": clean(invoice.get("client_name") or invoice.get("customer_name") or invoice.get("client") or invoice.get("customer")),
        "amount": money(invoice.get("total") or invoice.get("amount") or invoice.get("invoice_total")),
        "status": clean(invoice.get("status") or send_status or "draft"),
        "paid_status": "paid" if re.search("paid", clean(invoice.get("status")), re.I) else "unpaid",
        "send_status": send_status,
        "accounting_status": clean(invoice.get("sync") or invoice.get("accounting_status") or "not_synced"),
        "brand": brand,
        "invoice_snapshot": json_safe(invoice),
        "pdf_filename": f"{number}.pdf",
        "pdf_content_type": "application/pdf",
        "pdf_base64": pdf_base64,
        "html": invoice_html(invoice, brand, f"/api/invoices/{vault_id}/pdf"),
        "outbound": json_safe(outbound or {}),
        "important": True,
        "created_at": invoice.get("created_at") or now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.invoice_vault.update_one({"business_id": business_id(user), "invoice_id": vault_id}, {"$set": doc, "$setOnInsert": {"first_archived_at": now_utc()}}, upsert=True)
    except Exception:
        pass
    return doc


async def send_postmark_with_pdf(to_email, subject, html_body, text_body, pdf_base64, filename):
    token = os.getenv("POSTMARK_SERVER_TOKEN", "").strip()
    from_email = os.getenv("POSTMARK_FROM_EMAIL", "").strip()
    if not token or not from_email:
        raise RuntimeError("Postmark is not configured. Set POSTMARK_SERVER_TOKEN and POSTMARK_FROM_EMAIL.")
    payload = {
        "From": from_email,
        "To": to_email,
        "Subject": subject,
        "HtmlBody": html_body,
        "TextBody": text_body,
        "Attachments": [{"Name": filename, "Content": pdf_base64, "ContentType": "application/pdf"}],
    }
    req = urllib.request.Request(
        "https://api.postmarkapp.com/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Accept": "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            return json.loads(body) if body else {"ok": True}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
        raise RuntimeError(f"Postmark HTTPError {exc.code}: {detail}")


async def branded_invoice_send_or_queue(db, user, item, kind):
    if kind != "invoice":
        return await _ORIGINAL_SEND_OR_QUEUE_EMAIL(db, user, item, kind)
    ObjectId = getattr(field_truth, "ObjectId", None)
    invoice_id = clean(item.get("invoice_id") or item.get("id") or item.get("source_id") or item.get("number") or item.get("job_id") or f"INV-{int(now_utc().timestamp())}")
    vault = await upsert_invoice_vault(db, user, ObjectId, invoice_id, item=item, send_status="queued")
    to_email = approval_execution.email_of(item)
    subject = clean(item.get("subject")) or f"Invoice {vault.get('number')} from {vault.get('brand', {}).get('trading_name') or 'your service provider'}"
    body_text = approval_execution.text_of(item, f"Invoice {vault.get('number')} is attached as a PDF.")
    doc = {
        "id": f"invoice-send-{int(now_utc().timestamp() * 1000)}",
        "business_id": business_id(user),
        "approved_by": user_id(user),
        "kind": "invoice",
        "channel": "email",
        "to": to_email,
        "subject": subject,
        "body": body_text,
        "invoice_vault_id": vault.get("invoice_id"),
        "pdf_filename": vault.get("pdf_filename"),
        "status": "queued_no_recipient" if not to_email else "queued",
        "source": "invoice_vault_pdf_sender",
        "owner_approved": True,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    if to_email:
        try:
            result = await send_postmark_with_pdf(to_email, subject, vault.get("html") or "", body_text, vault.get("pdf_base64") or "", vault.get("pdf_filename") or "invoice.pdf")
            doc.update({"status": "sent", "provider": "postmark", "provider_result": result, "sent_at": now_utc()})
        except Exception as exc:
            doc.update({"status": "queued_send_failed", "error": str(exc)})
    try:
        await db.outbound_messages.insert_one(dict(doc))
    except Exception:
        pass
    await upsert_invoice_vault(db, user, ObjectId, invoice_id, item=item, send_status=doc.get("status"), outbound=doc)
    if doc.get("status") == "sent":
        await approval_execution.mark_invoice_sent(db, user, item, doc)
    return doc


approval_execution.send_or_queue_email = branded_invoice_send_or_queue


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method="GET"):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None:
        return
    from fastapi import Response

    async def vault_endpoint(request: Request):
        user = await get_current_user(request)
        rows = await safe_recent(db.invoice_vault, {"business_id": business_id(user)}, 120, "updated_at")
        return json_safe({"success": True, "invoices": rows, "items": rows, "counts": {"total": len(rows), "paid": len([r for r in rows if lower(r.get("paid_status")) == "paid"]), "sent": len([r for r in rows if lower(r.get("send_status")) == "sent"])}})

    async def one_vault_endpoint(request: Request, invoice_id: str):
        user = await get_current_user(request)
        vals = invoice_id_values(invoice_id, ObjectId)
        clauses = []
        for val in vals:
            clauses.extend([{ "invoice_id": val }, { "id": val }, { "number": val }])
        doc = await safe_one(db.invoice_vault, {"business_id": business_id(user), "$or": clauses}) if clauses else None
        if not doc:
            doc = await upsert_invoice_vault(db, user, ObjectId, invoice_id)
        return json_safe({"success": True, "invoice": doc})

    async def archive_endpoint(request: Request, invoice_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        doc = await upsert_invoice_vault(db, user, ObjectId, invoice_id, item=payload.get("invoice") if isinstance(payload.get("invoice"), dict) else payload, send_status=clean(payload.get("send_status") or "archived"))
        return json_safe({"success": True, "invoice": doc})

    async def mark_paid_endpoint(request: Request, invoice_id: str):
        user = await get_current_user(request)
        vals = invoice_id_values(invoice_id, ObjectId)
        clauses = []
        for val in vals:
            clauses.extend([{ "invoice_id": val }, { "id": val }, { "number": val }])
        query = {"business_id": business_id(user), "$or": clauses} if clauses else {"business_id": business_id(user), "invoice_id": invoice_id}
        try:
            await db.invoice_vault.update_one(query, {"$set": {"paid_status": "paid", "status": "Paid", "paid_at": now_utc(), "updated_at": now_utc()}})
        except Exception:
            pass
        return json_safe({"success": True, "status": "paid"})

    async def pdf_endpoint(request: Request, invoice_id: str):
        user = await get_current_user(request)
        vals = invoice_id_values(invoice_id, ObjectId)
        clauses = []
        for val in vals:
            clauses.extend([{ "invoice_id": val }, { "id": val }, { "number": val }])
        doc = await safe_one(db.invoice_vault, {"business_id": business_id(user), "$or": clauses}) if clauses else None
        if not doc:
            doc = await upsert_invoice_vault(db, user, ObjectId, invoice_id)
        raw = base64.b64decode(clean(doc.get("pdf_base64")) or base64.b64encode(build_simple_pdf(["Invoice"])).decode("ascii"))
        headers = {"Content-Disposition": f"inline; filename={clean(doc.get('pdf_filename') or 'invoice.pdf')}"}
        return Response(content=raw, media_type="application/pdf", headers=headers)

    routes = [
        ("GET", "/api/invoices/vault", vault_endpoint),
        ("GET", "/api/invoices/{invoice_id}/vault", one_vault_endpoint),
        ("POST", "/api/invoices/{invoice_id}/archive", archive_endpoint),
        ("POST", "/api/invoices/{invoice_id}/mark-paid", mark_paid_endpoint),
        ("GET", "/api/invoices/{invoice_id}/pdf", pdf_endpoint),
    ]
    for method, path, endpoint in routes:
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
