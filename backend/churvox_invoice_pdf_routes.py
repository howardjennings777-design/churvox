# CHURVOX_INVOICE_PDF_SEND_20260611

from __future__ import annotations

import base64
import json
import os
import re
import urllib.request
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response, JSONResponse

router = APIRouter(tags=["invoice-pdf"])


def _money(value: Any) -> float:
    try:
        return float(str(value or "0").replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def _currency(value: Any) -> str:
    return f"${_money(value):,.2f}"


def _safe(value: Any) -> str:
    text = str(value or "")
    text = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", text)
    return text[:230]


def _first(*values: Any) -> str:
    for value in values:
        if str(value or "").strip():
            return str(value)
    return ""


def invoice_number(invoice: Dict[str, Any]) -> str:
    return _first(invoice.get("invoice_number"), invoice.get("number"), invoice.get("id"), invoice.get("_id"), "Invoice")


def build_invoice_pdf_bytes(invoice: Dict[str, Any]) -> bytes:
    biz = invoice.get("business_snapshot") or invoice.get("business") or {}
    customer = _first(invoice.get("customer_name"), invoice.get("client_name"), "Customer")
    inv_no = invoice_number(invoice)

    subtotal = _money(invoice.get("subtotal") or invoice.get("amount") or invoice.get("price") or invoice.get("total"))
    gst_rate = _money(invoice.get("gst_rate") or invoice.get("tax_rate") or 15)
    gst_amount = _money(invoice.get("gst_amount") or invoice.get("tax_amount") or subtotal * gst_rate / 100)
    total = _money(invoice.get("total") or subtotal + gst_amount)
    paid = _money(invoice.get("amount_paid"))
    amount_due = _money(invoice.get("amount_due") or max(0, total - paid))

    business_name = _first(biz.get("business_name"), invoice.get("business_name"), "Churvox")
    business_email = _first(biz.get("email"), biz.get("business_email"), invoice.get("business_email"), "")
    business_phone = _first(biz.get("phone"), biz.get("business_phone"), "")
    description = _first(invoice.get("description"), invoice.get("invoice_description"), invoice.get("notes"), "Service work completed.")
    payment = _first(invoice.get("payment_details"), invoice.get("payment_instructions"), invoice.get("bank_details"), "")

    lines = [
        (72, 760, 20, f"Invoice {inv_no}"),
        (72, 732, 12, business_name),
        (72, 714, 10, " ".join(x for x in [business_email, business_phone] if x)),
        (72, 684, 12, f"Bill to: {customer}"),
        (72, 666, 10, _first(invoice.get("customer_email"), invoice.get("client_email"), invoice.get("email"), "")),
        (72, 638, 11, f"Description: {description}"),
        (72, 596, 11, f"Subtotal: {_currency(subtotal)}"),
        (72, 578, 11, f"GST ({gst_rate:g}%): {_currency(gst_amount)}"),
        (72, 560, 12, f"Total: {_currency(total)}"),
        (72, 542, 12, f"Amount due: {_currency(amount_due)}"),
        (72, 504, 10, f"Issued: {datetime.utcnow().strftime('%Y-%m-%d')}"),
        (72, 486, 10, f"Status: {_first(invoice.get('status'), 'sent')}"),
        (72, 448, 10, f"Payment: {payment or 'Payment details provided by the business.'}"),
        (72, 92, 9, "Prepared and sent by Churvox."),
    ]

    stream = ["BT"]
    for x, y, size, text in lines:
        stream.append(f"/F1 {size} Tf {x} {y} Td ({_safe(text)}) Tj")
        stream.append(f"{-x} {-y} Td")
    stream.append("ET")
    stream_bytes = "\n".join(stream).encode("latin-1", errors="replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream_bytes)).encode() + b" >>\nstream\n" + stream_bytes + b"\nendstream",
    ]

    pdf = [b"%PDF-1.4\n"]
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(sum(len(x) for x in pdf))
        pdf.append(f"{i} 0 obj\n".encode())
        pdf.append(obj)
        pdf.append(b"\nendobj\n")

    xref = sum(len(x) for x in pdf)
    pdf.append(f"xref\n0 {len(objects)+1}\n".encode())
    pdf.append(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.append(f"{off:010d} 00000 n \n".encode())
    pdf.append(f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return b"".join(pdf)


async def _maybe_await(value: Any) -> Any:
    if hasattr(value, "__await__"):
        return await value
    return value


async def _collection(request: Request, name: str):
    for holder in [getattr(request.app, "state", None), request.app]:
        if not holder:
            continue
        db = getattr(holder, "db", None) or getattr(holder, "database", None) or getattr(holder, "mongodb", None)
        if db is not None:
            try:
                return db[name]
            except Exception:
                pass
    return None


async def find_invoice(request: Request, invoice_id: str, body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if body and isinstance(body.get("invoice"), dict):
        return body["invoice"]

    coll = await _collection(request, "invoices")
    if coll is None:
        return body if isinstance(body, dict) and body else {"id": invoice_id, "invoice_number": invoice_id}

    queries = [{"id": invoice_id}, {"invoice_id": invoice_id}, {"invoice_number": invoice_id}]
    try:
        from bson import ObjectId
        if ObjectId.is_valid(invoice_id):
            queries.append({"_id": ObjectId(invoice_id)})
    except Exception:
        pass

    for query in queries:
        try:
            found = await _maybe_await(coll.find_one(query))
            if found:
                found["_id"] = str(found.get("_id", ""))
                return found
        except Exception:
            pass

    return body if isinstance(body, dict) and body else {"id": invoice_id, "invoice_number": invoice_id}


def send_email_with_pdf(to_email: str, subject: str, html: str, pdf_name: str, pdf_bytes: bytes) -> Dict[str, Any]:
    encoded = base64.b64encode(pdf_bytes).decode("ascii")
    from_email = os.getenv("CHURVOX_FROM_EMAIL") or os.getenv("POSTMARK_FROM_EMAIL") or "hello@churvox.com"

    postmark_token = os.getenv("POSTMARK_SERVER_TOKEN") or os.getenv("POSTMARK_API_TOKEN")
    if postmark_token:
        payload = {
            "From": from_email,
            "To": to_email,
            "Subject": subject,
            "HtmlBody": html,
            "TextBody": re.sub("<[^<]+?>", "", html),
            "Attachments": [{"Name": pdf_name, "Content": encoded, "ContentType": "application/pdf"}],
        }
        req = urllib.request.Request(
            "https://api.postmarkapp.com/email",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Accept": "application/json", "X-Postmark-Server-Token": postmark_token},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            return {"provider": "postmark", "status": res.status, "body": res.read().decode("utf-8", errors="ignore")}

    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        payload = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": html,
            "attachments": [{"filename": pdf_name, "content": encoded}],
        }
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {resend_key}"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as res:
            return {"provider": "resend", "status": res.status, "body": res.read().decode("utf-8", errors="ignore")}

    return {"provider": "mock", "status": 200, "body": "PDF generated. Email provider not configured."}


@router.get("/invoices/{invoice_id}/pdf")
async def invoice_pdf(invoice_id: str, request: Request):
    invoice = await find_invoice(request, invoice_id)
    pdf = build_invoice_pdf_bytes(invoice)
    filename = f"invoice-{re.sub(r'[^A-Za-z0-9_-]+', '-', invoice_number(invoice))}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.post("/invoices/{invoice_id}/send-with-pdf")
async def send_invoice_with_pdf(invoice_id: str, request: Request):
    body = await request.json() if request.headers.get("content-type", "").startswith("application/json") else {}
    invoice = await find_invoice(request, invoice_id, body if isinstance(body, dict) else {})

    to_email = _first(
        body.get("to") if isinstance(body, dict) else "",
        invoice.get("customer_email"),
        invoice.get("client_email"),
        invoice.get("email"),
        invoice.get("billing_email"),
    )
    if not to_email:
        raise HTTPException(status_code=400, detail="Customer email is required to send invoice PDF.")

    pdf = build_invoice_pdf_bytes(invoice)
    inv_no = invoice_number(invoice)
    filename = f"invoice-{re.sub(r'[^A-Za-z0-9_-]+', '-', inv_no)}.pdf"

    subject = _first(body.get("subject") if isinstance(body, dict) else "", f"Invoice {inv_no}")
    html = _first(
        body.get("html") if isinstance(body, dict) else "",
        f"<p>Hi,</p><p>Please find invoice <strong>{inv_no}</strong> attached as a PDF.</p><p>Thanks,<br/>Churvox</p>",
    )

    result = send_email_with_pdf(to_email, subject, html, filename, pdf)
    return JSONResponse({
        "success": True,
        "email_sent": result.get("provider") != "mock",
        "provider": result.get("provider"),
        "pdf_attached": True,
        "filename": filename,
    })
