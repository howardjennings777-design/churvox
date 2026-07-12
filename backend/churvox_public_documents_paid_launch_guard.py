from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

VERSION = "churvox-public-documents-paid-launch-20260712"
PUBLIC_ROUTE_SPECS = {
    ("/api/public/quote/{token}", "GET"),
    ("/api/public/quote/{token}/accept", "POST"),
    ("/api/public/quote/{token}/decline", "POST"),
    ("/api/public/invoice/{token}", "GET"),
    ("/api/public/invoice/{token}/mark-paid", "POST"),
    ("/api/public/client-portal/{token}", "GET"),
    ("/api/public/client-portal/{token}/approve-work", "POST"),
    ("/api/public/proof/{token}", "GET"),
}
TOKEN_FIELDS = ("public_token", "portal_token", "client_portal_token", "proof_token", "share_token")
TERMINAL_QUOTE_STATUSES = {"accepted", "approved", "declined", "rejected", "expired", "cancelled", "canceled"}
COMPLETED_STATUSES = {"completed", "complete", "ready_for_approval", "awaiting_customer_approval", "approved", "accepted"}
SENSITIVE_KEY_PARTS = (
    "password", "token", "secret", "hash", "stripe_", "contractor_id", "business_id", "user_id",
    "worker_id", "created_by", "updated_by", "internal", "private", "audit", "ip_address",
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _text(value: Any, limit: int = 5000) -> str:
    return " ".join(str(value or "").strip().split())[:limit]


def _number(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _has(value: Any) -> bool:
    return value is not None and _text(value) != ""


def _iso(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _valid_token(token: str) -> str:
    clean = _text(token, 300)
    if len(clean) < 16 or any(char.isspace() for char in clean):
        raise HTTPException(status_code=404, detail="Public link not found")
    return clean


def _safe_url(value: Any) -> str:
    raw = _text(value, 3000)
    if not raw:
        return ""
    try:
        parsed = urlsplit(raw)
        return raw if parsed.scheme in {"https", "http"} and parsed.netloc else ""
    except Exception:
        return ""


def _safe_image(value: Any) -> str:
    raw = _text(value, 5_000_000)
    if raw.startswith("data:image/"):
        return raw
    return _safe_url(raw)


def _business_public(record: dict[str, Any]) -> dict[str, Any]:
    source = record.get("business_snapshot") if isinstance(record.get("business_snapshot"), dict) else record.get("business") if isinstance(record.get("business"), dict) else {}
    return {
        "business_name": _text(source.get("business_name") or record.get("business_name"), 300),
        "business_address": _text(source.get("business_address") or record.get("business_address"), 1000),
        "phone": _text(source.get("phone") or source.get("phone_number"), 100),
        "support_email": _text(source.get("support_email") or source.get("email"), 300),
        "gst_number": _text(source.get("gst_number"), 100),
        "nzbn": _text(source.get("nzbn"), 100),
        "bank_account_name": _text(source.get("bank_account_name"), 300),
        "bank_account_number": _text(source.get("bank_account_number"), 200),
        "logo_base64": _safe_image(source.get("logo_base64") or source.get("logo_url")),
        "currency": _text(source.get("currency") or source.get("currency_code") or record.get("currency") or "NZD", 10).upper(),
    }


def _line_items(value: Any) -> list[dict[str, Any]]:
    rows = value if isinstance(value, list) else []
    output = []
    for row in rows[:200]:
        if not isinstance(row, dict):
            continue
        output.append({
            "description": _text(row.get("description") or row.get("name") or row.get("item") or row.get("title"), 1500),
            "quantity": _number(row.get("quantity") if row.get("quantity") is not None else row.get("qty"), 1),
            "unit_price": _number(row.get("unit_price") if row.get("unit_price") is not None else row.get("rate") if row.get("rate") is not None else row.get("price")),
            "amount": _number(row.get("amount") if row.get("amount") is not None else row.get("total") if row.get("total") is not None else row.get("line_total")),
        })
    return output


def _public_photos(record: dict[str, Any]) -> list[dict[str, str]]:
    raw = (
        record.get("customer_visible_photos")
        or record.get("public_photos")
        or record.get("proof_photos")
        or record.get("photos")
        or []
    )
    output = []
    for item in raw if isinstance(raw, list) else []:
        if isinstance(item, dict) and item.get("customer_visible") is False:
            continue
        value = item if isinstance(item, str) else item.get("url") or item.get("photo_url") or item.get("src") or item.get("data_url")
        url = _safe_image(value)
        if url:
            output.append({"url": url})
        if len(output) >= 40:
            break
    return output


def _quote_public(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "quote_number": _text(record.get("quote_number") or record.get("number"), 200),
        "customer_name": _text(record.get("customer_name") or record.get("client_name"), 300),
        "customer_email": _text(record.get("customer_email") or record.get("email"), 300),
        "address": _text(record.get("address") or record.get("service_address") or record.get("site_address"), 1500),
        "job_description": _text(record.get("job_description") or record.get("description"), 5000),
        "public_notes": _text(record.get("public_notes") or record.get("customer_notes"), 5000),
        "line_items": _line_items(record.get("line_items") or record.get("items") or record.get("lines")),
        "subtotal": _number(record.get("subtotal")),
        "gst_rate": _number(record.get("gst_rate") if record.get("gst_rate") is not None else record.get("tax_rate")),
        "gst_amount": _number(record.get("gst_amount") if record.get("gst_amount") is not None else record.get("tax_amount")),
        "total": _number(record.get("total") if record.get("total") is not None else record.get("amount") if record.get("amount") is not None else record.get("price")),
        "currency": _text(record.get("currency") or record.get("currency_code") or "NZD", 10).upper(),
        "status": _text(record.get("status") or "sent", 80).lower(),
        "valid_until": _iso(record.get("valid_until") or record.get("expiry_date") or record.get("expires_at")),
        "created_at": _iso(record.get("created_at")),
        "sent_at": _iso(record.get("sent_at")),
        "accepted_at": _iso(record.get("accepted_at")),
        "declined_at": _iso(record.get("declined_at")),
        "business_snapshot": _business_public(record),
    }


def _invoice_public(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "invoice_number": _text(record.get("invoice_number") or record.get("number"), 200),
        "customer_name": _text(record.get("customer_name") or record.get("client_name"), 300),
        "customer_email": _text(record.get("customer_email") or record.get("email"), 300),
        "customer_phone": _text(record.get("customer_phone"), 100),
        "billing_address": _text(record.get("billing_address") or record.get("address"), 1500),
        "site_address": _text(record.get("site_address") or record.get("service_address"), 1500),
        "description": _text(record.get("description") or record.get("invoice_description"), 5000),
        "public_notes": _text(record.get("public_notes") or record.get("customer_notes"), 5000),
        "line_items": _line_items(record.get("line_items") or record.get("items") or record.get("lines")),
        "subtotal": _number(record.get("subtotal")),
        "discount_amount": _number(record.get("discount_amount")),
        "gst_rate": _number(record.get("gst_rate") if record.get("gst_rate") is not None else record.get("tax_rate")),
        "gst_amount": _number(record.get("gst_amount") if record.get("gst_amount") is not None else record.get("tax_amount")),
        "total": _number(record.get("total") if record.get("total") is not None else record.get("amount")),
        "amount_paid": _number(record.get("amount_paid")),
        "amount_due": _number(record.get("amount_due") if record.get("amount_due") is not None else record.get("balance_due") if record.get("balance_due") is not None else record.get("total")),
        "currency": _text(record.get("currency") or record.get("currency_code") or "NZD", 10).upper(),
        "status": _text(record.get("status") or record.get("payment_status") or "sent", 80).lower(),
        "payment_terms": _text(record.get("payment_terms"), 1000),
        "payment_instructions": _text(record.get("payment_instructions") or record.get("payment_details"), 3000),
        "payment_link": _safe_url(record.get("payment_link") or record.get("payment_url") or record.get("stripe_payment_url")),
        "issued_at": _iso(record.get("issued_at") or record.get("created_at")),
        "due_date": _iso(record.get("due_date")),
        "paid_at": _iso(record.get("paid_at")),
        "business_snapshot": _business_public(record),
    }


def _approved_summary(record: dict[str, Any]) -> str:
    summary = (
        record.get("customer_summary")
        or record.get("public_summary")
        or record.get("owner_summary")
        or record.get("work_summary")
        or record.get("summary")
        or record.get("description")
    )
    if not summary and record.get("summary_approved") is True:
        summary = record.get("ai_summary")
    return _text(summary, 7000)


def _portal_public(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "customer_name": _text(record.get("customer_name") or record.get("client_name") or record.get("name"), 300),
        "job_title": _text(record.get("job_title") or record.get("title") or record.get("service_title"), 500),
        "address": _text(record.get("address") or record.get("service_address") or record.get("site_address"), 1500),
        "work_status": _text(record.get("work_status") or record.get("job_status") or record.get("status"), 100).lower(),
        "approval_status": _text(record.get("approval_status") or record.get("customer_approval_status"), 100).lower(),
        "customer_summary": _approved_summary(record),
        "photos": _public_photos(record),
        "completed_at": _iso(record.get("completed_at") or record.get("completed_date")),
        "updated_at": _iso(record.get("updated_at")),
        "business_snapshot": _business_public(record),
    }


def _proof_public(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "job_title": _text(record.get("job_title") or record.get("title"), 500),
        "customer_name": _text(record.get("customer_name") or record.get("client_name"), 300),
        "customer_summary": _approved_summary(record),
        "customer_message": _text(record.get("customer_message") or record.get("public_message") or record.get("owner_message"), 7000),
        "photos": _public_photos(record),
        "invoice_number": _text(record.get("invoice_number"), 200),
        "quote_number": _text(record.get("quote_number"), 200),
        "total": _number(record.get("total")),
        "currency": _text(record.get("currency") or record.get("currency_code") or "NZD", 10).upper(),
        "completed_at": _iso(record.get("completed_at")),
        "business_snapshot": _business_public(record),
    }


def _remove_routes(app) -> None:
    kept = []
    for route in list(getattr(app.router, "routes", []) or []):
        path = getattr(route, "path", "")
        methods = set(getattr(route, "methods", set()) or set())
        if any(path == target and method in methods for target, method in PUBLIC_ROUTE_SPECS):
            continue
        kept.append(route)
    app.router.routes = kept


async def _find_record(db, collection_names: tuple[str, ...], token: str):
    token = _valid_token(token)
    query = {"$or": [{field: token} for field in TOKEN_FIELDS]}
    for name in collection_names:
        try:
            record = await db[name].find_one(query)
            if record:
                return name, record
        except Exception:
            continue
    return "", None


async def _command_slip(db, record: dict[str, Any], title: str, detail: str, source_type: str) -> None:
    business_id = record.get("business_id") or record.get("contractor_id")
    if not business_id:
        return
    now = _now()
    try:
        await db.command_slips.insert_one({
            "business_id": business_id,
            "contractor_id": record.get("contractor_id") or business_id,
            "source_type": source_type,
            "source_id": _text(record.get("_id")),
            "action_type": "owner_review",
            "title": title,
            "found": detail,
            "prepared": "Customer response recorded. Review the original record before creating or sending anything else.",
            "why": "The customer acted through a public link. Follow-up remains owner controlled.",
            "urgency": "Owner review",
            "status": "open",
            "owner_review_only": True,
            "prepared_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            "created_at": now,
            "updated_at": now,
        })
    except Exception:
        pass


def install(module) -> None:
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    if app is None or db is None:
        return
    if getattr(app.state, "churvox_public_documents_paid_launch", False):
        return

    _remove_routes(app)

    async def get_quote(token: str):
        _, record = await _find_record(db, ("quotes",), token)
        if not record:
            raise HTTPException(status_code=404, detail="Quote not found")
        try:
            await db.quotes.update_one({"_id": record["_id"]}, {"$set": {"viewed_at": _now(), "updated_at": _now()}})
        except Exception:
            pass
        return {"success": True, "quote": _quote_public(record), "version": VERSION}

    async def quote_response(token: str, response: str):
        _, record = await _find_record(db, ("quotes",), token)
        if not record:
            raise HTTPException(status_code=404, detail="Quote not found")
        current = _text(record.get("status") or "sent").lower()
        if current in TERMINAL_QUOTE_STATUSES:
            return {"success": True, "status": current, "message": f"Quote response is already recorded as {current}.", "quote": _quote_public(record), "version": VERSION}
        now = _now()
        status = "accepted" if response == "accept" else "declined"
        update = {
            "status": status,
            f"{status}_at": now,
            "customer_response": status,
            "customer_response_at": now,
            "updated_at": now,
        }
        await db.quotes.update_one({"_id": record["_id"]}, {"$set": update})
        await _command_slip(db, record, f"Quote {status}", f"The customer {status} quote {_text(record.get('quote_number')) or 'through the public link' }.", "public_quote_response")
        updated = await db.quotes.find_one({"_id": record["_id"]}) or {**record, **update}
        return {"success": True, "status": status, "message": f"Quote {status}. The business has been notified.", "quote": _quote_public(updated), "version": VERSION}

    async def accept_quote(token: str, request: Request):
        return await quote_response(token, "accept")

    async def decline_quote(token: str, request: Request):
        return await quote_response(token, "decline")

    async def get_invoice(token: str):
        _, record = await _find_record(db, ("invoices",), token)
        if not record:
            raise HTTPException(status_code=404, detail="Invoice not found")
        now = _now()
        update = {"viewed_at": now, "updated_at": now}
        if _text(record.get("status")).lower() == "sent":
            update["status"] = "viewed"
            record = {**record, **update}
        try:
            await db.invoices.update_one({"_id": record["_id"]}, {"$set": update})
        except Exception:
            pass
        return {"success": True, "invoice": _invoice_public(record), "version": VERSION}

    async def block_public_mark_paid(token: str, request: Request):
        _valid_token(token)
        raise HTTPException(status_code=403, detail="Customers cannot mark an invoice paid. Payment status must come from the business owner or verified payment provider.")

    async def get_client_portal(token: str):
        _, record = await _find_record(db, ("client_portals", "public_client_portals", "job_proof_packs", "jobs"), token)
        if not record:
            raise HTTPException(status_code=404, detail="Client portal not found")
        return {"success": True, "portal": _portal_public(record), "version": VERSION}

    async def approve_work(token: str, request: Request):
        collection_name, record = await _find_record(db, ("client_portals", "public_client_portals", "job_proof_packs", "jobs"), token)
        if not record:
            raise HTTPException(status_code=404, detail="Client portal not found")
        approval = _text(record.get("approval_status") or record.get("customer_approval_status")).lower()
        if approval in {"approved", "accepted"}:
            return {"success": True, "status": "approved", "message": "Completed work is already approved.", "portal": _portal_public(record), "version": VERSION}
        work_status = _text(record.get("work_status") or record.get("job_status") or record.get("status")).lower()
        if work_status not in COMPLETED_STATUSES and not record.get("completed_at"):
            raise HTTPException(status_code=409, detail="The business has not marked this work ready for customer approval")
        now = _now()
        update = {
            "approval_status": "approved",
            "customer_approval_status": "approved",
            "customer_approved": True,
            "customer_approved_at": now,
            "updated_at": now,
        }
        await db[collection_name].update_one({"_id": record["_id"]}, {"$set": update})
        await _command_slip(db, record, "Customer approved completed work", "The customer approved the completed work through the public portal.", "public_work_approval")
        updated = await db[collection_name].find_one({"_id": record["_id"]}) or {**record, **update}
        return {"success": True, "status": "approved", "message": "Completed work approved. The business has been notified.", "portal": _portal_public(updated), "version": VERSION}

    async def get_proof(token: str):
        _, record = await _find_record(db, ("public_proof_packs", "proof_packs", "job_proof_packs", "client_portals", "jobs"), token)
        if not record:
            raise HTTPException(status_code=404, detail="Proof pack not found")
        return {"success": True, "proof_pack": _proof_public(record), "version": VERSION}

    app.add_api_route("/api/public/quote/{token}", get_quote, methods=["GET"])
    app.add_api_route("/api/public/quote/{token}/accept", accept_quote, methods=["POST"])
    app.add_api_route("/api/public/quote/{token}/decline", decline_quote, methods=["POST"])
    app.add_api_route("/api/public/invoice/{token}", get_invoice, methods=["GET"])
    app.add_api_route("/api/public/invoice/{token}/mark-paid", block_public_mark_paid, methods=["POST"])
    app.add_api_route("/api/public/client-portal/{token}", get_client_portal, methods=["GET"])
    app.add_api_route("/api/public/client-portal/{token}/approve-work", approve_work, methods=["POST"])
    app.add_api_route("/api/public/proof/{token}", get_proof, methods=["GET"])
    app.state.churvox_public_documents_paid_launch = True
