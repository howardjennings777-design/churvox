from __future__ import annotations

from datetime import datetime, timezone, timedelta
import hashlib
import html
import hmac
import json
import os
import secrets
import urllib.error
import urllib.request
from urllib.parse import quote

from fastapi import Body, HTTPException, Request
from fastapi.responses import HTMLResponse

INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
ALLOWED_STATUSES = {
    "draft",
    "sent",
    "replied",
    "interested",
    "not_interested",
    "signed_up",
    "active",
    "feedback_received",
    "converted",
    "archived",
    "do_not_contact",
}


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ["password", "hash", "secret", "token"]):
                continue
            out["id" if key == "_id" else key] = safe(item)
        return out
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def frontend_url(path=""):
    base = clean(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
    if not path:
        return base
    return f"{base}{path if path.startswith('/') else '/' + path}"


def default_subject(_prospect):
    return "Would you test Churvox for 30 days?"


def default_body(prospect):
    name = clean((prospect or {}).get("contact_name") or (prospect or {}).get("name"))
    business = clean((prospect or {}).get("business_name"))
    greeting = f"Hi {name}," if name else "Hi there,"
    context = f" for {business}" if business else ""
    return (
        f"{greeting}\n\n"
        f"I’m inviting a small group of trade and service businesses{context} to test Churvox for 30 days. "
        "Churvox helps manage clients, jobs, quotes, invoices and admin preparation while the business owner stays in control and approves important actions.\n\n"
        "There is no card required, no phone call, and all support can be handled by email. I’m mainly looking for honest feedback about what feels useful, confusing or missing.\n\n"
        "Would you be open to trying it?\n\n"
        "Thanks,\nHoward\nChurvox"
    )


def unsubscribe_secret():
    return clean(os.environ.get("TESTER_OUTREACH_UNSUBSCRIBE_SECRET") or os.environ.get("POSTMARK_INBOUND_SECRET") or os.environ.get("JWT_SECRET") or "churvox-tester-outreach")


def unsubscribe_token(email):
    return hashlib.sha256(f"{lower(email)}|{unsubscribe_secret()}".encode("utf-8")).hexdigest()


def reply_to_for(reply_token):
    template = clean(os.environ.get("POSTMARK_TESTER_REPLY_TO") or OWNER_EMAIL)
    return template.replace("{token}", clean(reply_token))


def postmark_config():
    token = clean(os.environ.get("POSTMARK_SERVER_TOKEN"))
    sender = clean(os.environ.get("POSTMARK_FROM_EMAIL") or OWNER_EMAIL)
    stream = clean(os.environ.get("POSTMARK_TESTER_MESSAGE_STREAM") or "outbound")
    reply_template = clean(os.environ.get("POSTMARK_TESTER_REPLY_TO") or OWNER_EMAIL)
    inbound_secret = clean(os.environ.get("POSTMARK_INBOUND_SECRET"))
    return {
        "token": token,
        "sender": sender,
        "stream": stream,
        "reply_template": reply_template,
        "inbound_secret": inbound_secret,
        "send_ready": bool(token and sender),
        "reply_capture_ready": bool(inbound_secret and reply_template and reply_template != OWNER_EMAIL),
        "reply_tracking_mode": "token" if "{token}" in reply_template else "sender_email_fallback",
    }


def send_via_postmark(to_email, subject, html_body, text_body, reply_to, metadata):
    config = postmark_config()
    if not config["send_ready"]:
        raise RuntimeError("Postmark is not configured for tester outreach")
    payload = {
        "From": config["sender"],
        "To": to_email,
        "ReplyTo": reply_to,
        "Subject": subject,
        "HtmlBody": html_body,
        "TextBody": text_body,
        "MessageStream": config["stream"],
        "Tag": "tester-outreach",
        "Metadata": {key: str(value) for key, value in (metadata or {}).items() if value is not None},
    }
    request = urllib.request.Request(
        "https://api.postmarkapp.com/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": config["token"],
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            status = response.status
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
        raise RuntimeError(f"Postmark HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Postmark connection error: {exc}")
    if status < 200 or status >= 300:
        raise RuntimeError(f"Postmark send failed: HTTP {status} {raw}")
    try:
        return json.loads(raw) if raw else {"ok": True}
    except Exception:
        return {"ok": True}


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None:
        return

    def oid(value):
        try:
            return ObjectId(str(value)) if ObjectId and value else None
        except Exception:
            return None

    async def require_owner(request: Request):
        current = await get_current_user(request)
        email = lower((current or {}).get("email") or (current or {}).get("user_email"))
        if email != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return current

    async def find_prospect(identifier):
        ident = clean(identifier)
        if not ident:
            return None
        clauses = [{"email": lower(ident)}]
        object_id = oid(ident)
        if object_id:
            clauses.append({"_id": object_id})
        return await db.tester_outreach_prospects.find_one({"$or": clauses})

    def webhook_secret_ok(request: Request):
        expected = clean(os.environ.get("POSTMARK_INBOUND_SECRET"))
        supplied = clean(request.query_params.get("secret") or request.headers.get("x-churvox-inbound-secret"))
        return bool(expected and supplied and hmac.compare_digest(expected, supplied))

    def public_prospect(doc):
        if not doc:
            return None
        item = safe(dict(doc))
        item["message_count"] = int(item.get("message_count") or 0)
        item["trial_days"] = int(item.get("trial_days") or 30)
        return item

    async def list_outreach(request: Request):
        await require_owner(request)
        prospects = await db.tester_outreach_prospects.find({}).sort("updated_at", -1).limit(1000).to_list(length=1000)
        messages = await db.tester_outreach_messages.find({}).sort("created_at", -1).limit(1500).to_list(length=1500)
        counts = {status: 0 for status in ALLOWED_STATUSES}
        for prospect in prospects:
            status = lower(prospect.get("status") or "draft")
            counts[status if status in counts else "draft"] += 1
        summary = {
            "total": len(prospects),
            "drafts": counts["draft"],
            "sent": counts["sent"],
            "replied": counts["replied"],
            "interested": counts["interested"],
            "active": counts["active"],
            "converted": counts["converted"],
            "do_not_contact": counts["do_not_contact"] + counts["not_interested"],
        }
        config = postmark_config()
        return safe({
            "success": True,
            "source": "tester_outreach_desk",
            "generated_at": now_utc(),
            "counts": summary,
            "status_counts": counts,
            "prospects": [public_prospect(item) for item in prospects],
            "messages": messages,
            "config": {
                "send_ready": config["send_ready"],
                "sender": config["sender"],
                "message_stream": config["stream"],
                "reply_capture_ready": config["reply_capture_ready"],
                "reply_tracking_mode": config["reply_tracking_mode"],
                "inbound_webhook_path": "/api/postmark/inbound/tester-outreach?secret=YOUR_SECRET",
                "delivery_webhook_path": "/api/postmark/delivery/tester-outreach?secret=YOUR_SECRET",
            },
        })

    async def save_draft(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        typed_email = clean(payload.get("display_email") or payload.get("email"))
        email = lower(typed_email)
        if not email or "@" not in email or " " in email:
            raise HTTPException(status_code=400, detail="A valid business email is required")
        existing = await find_prospect(payload.get("id") or email)
        reply_token = clean((existing or {}).get("reply_token")) or secrets.token_urlsafe(12)
        prospect = {
            "email": email,
            "display_email": typed_email,
            "contact_name": clean(payload.get("contact_name") or payload.get("name")),
            "business_name": clean(payload.get("business_name")),
            "trade": clean(payload.get("trade")),
            "country": clean(payload.get("country")),
            "website": clean(payload.get("website")),
            "source": clean(payload.get("source") or "manual_hq"),
            "subject": clean(payload.get("subject")) or default_subject(payload),
            "body": clean(payload.get("body")) or default_body(payload),
            "trial_days": 30,
            "reply_token": reply_token,
            "status": lower(payload.get("status") or (existing or {}).get("status") or "draft"),
            "note": clean(payload.get("note")),
            "updated_at": now_utc(),
            "updated_by": lower((owner or {}).get("email")),
        }
        if prospect["status"] not in ALLOWED_STATUSES:
            prospect["status"] = "draft"
        await db.tester_outreach_prospects.update_one(
            {"email": email},
            {"$set": prospect, "$setOnInsert": {"created_at": now_utc(), "message_count": 0}},
            upsert=True,
        )
        saved = await db.tester_outreach_prospects.find_one({"email": email})
        await db.tester_outreach_events.insert_one({
            "created_at": now_utc(),
            "action": "draft_saved",
            "prospect_id": str((saved or {}).get("_id") or ""),
            "email": email,
            "owner_email": lower((owner or {}).get("email")),
        })
        return {"success": True, "message": "Tester outreach draft saved", "prospect": public_prospect(saved)}

    async def send_outreach(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        if payload.get("approved") is not True:
            raise HTTPException(status_code=400, detail="Owner approval is required before sending")
        prospect = await find_prospect(payload.get("id") or payload.get("email"))
        if not prospect:
            raise HTTPException(status_code=404, detail="Tester prospect not found")
        status = lower(prospect.get("status") or "draft")
        if status in {"do_not_contact", "not_interested", "archived"} or prospect.get("opted_out"):
            raise HTTPException(status_code=409, detail="This prospect cannot be contacted")
        email = lower(prospect.get("email"))
        subject = clean(payload.get("subject") or prospect.get("subject")) or default_subject(prospect)
        body = clean(payload.get("body") or prospect.get("body")) or default_body(prospect)
        reply_token = clean(prospect.get("reply_token")) or secrets.token_urlsafe(12)
        unsubscribe_url = frontend_url(f"/api/tester-outreach/unsubscribe?email={quote(email)}&token={unsubscribe_token(email)}")
        reply_to = reply_to_for(reply_token)
        safe_subject = html.escape(subject)
        safe_body = html.escape(body).replace("\n", "<br>")
        html_body = (
            "<div style='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif;line-height:1.55;color:#0f172a;background:#f8fafc;padding:24px;'>"
            "<div style='max-width:620px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:16px;padding:30px;'>"
            f"<div style='font-size:22px;font-weight:900;color:#f97316;margin-bottom:18px;'>Churvox</div><h2 style='font-size:20px;margin:0 0 16px;'>{safe_subject}</h2>"
            f"<div style='font-size:15px;color:#334155;'>{safe_body}</div>"
            "<hr style='border:none;border-top:1px solid #e2e8f0;margin:24px 0;'>"
            "<p style='font-size:12px;color:#64748b;'>This is a personal invitation to test Churvox. Reply ‘no thanks’ and we will not contact you again. "
            f"<a href='{html.escape(unsubscribe_url, quote=True)}' style='color:#475569;'>Do not contact me</a>.</p>"
            "</div></div>"
        )
        text_body = f"{body}\n\nReply ‘no thanks’ and we will not contact you again.\nDo not contact me: {unsubscribe_url}"
        message_record = {
            "created_at": now_utc(),
            "direction": "outbound",
            "prospect_id": str(prospect.get("_id") or ""),
            "email": email,
            "subject": subject,
            "text": text_body,
            "reply_to": reply_to,
            "approved_by": lower((owner or {}).get("email")),
            "provider": "postmark",
            "provider_status": "sending",
        }
        inserted = await db.tester_outreach_messages.insert_one(message_record)
        try:
            result = send_via_postmark(
                email,
                subject,
                html_body,
                text_body,
                reply_to,
                {"prospect_id": str(prospect.get("_id") or ""), "reply_token": reply_token, "purpose": "tester_outreach"},
            )
            message_id = clean(result.get("MessageID") or result.get("MessageId"))
            now = now_utc()
            await db.tester_outreach_messages.update_one(
                {"_id": inserted.inserted_id},
                {"$set": {"provider_status": "sent", "provider_message_id": message_id, "provider_response": safe(result), "sent_at": now}},
            )
            prospect_update = {"status": "sent", "subject": subject, "body": body, "reply_token": reply_token, "last_sent_at": now, "updated_at": now}
            if not prospect.get("first_sent_at"):
                prospect_update["first_sent_at"] = now
            await db.tester_outreach_prospects.update_one(
                {"_id": prospect["_id"]},
                {"$set": prospect_update, "$inc": {"send_count": 1, "message_count": 1}},
            )
            await db.tester_outreach_events.insert_one({"created_at": now, "action": "approved_and_sent", "prospect_id": str(prospect.get("_id") or ""), "email": email, "owner_email": lower((owner or {}).get("email")), "provider_message_id": message_id})
            return {"success": True, "message": "Tester invitation approved and sent", "provider_message_id": message_id}
        except Exception as exc:
            await db.tester_outreach_messages.update_one({"_id": inserted.inserted_id}, {"$set": {"provider_status": "failed", "provider_error": str(exc), "failed_at": now_utc()}})
            raise HTTPException(status_code=502, detail=f"Tester email failed: {exc}")

    async def update_status(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        prospect = await find_prospect(payload.get("id") or payload.get("email"))
        if not prospect:
            raise HTTPException(status_code=404, detail="Tester prospect not found")
        status = lower(payload.get("status"))
        if status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid tester outreach status")
        update = {"status": status, "updated_at": now_utc(), "updated_by": lower((owner or {}).get("email"))}
        if status in {"do_not_contact", "not_interested"}:
            update["opted_out"] = True
            update["opted_out_at"] = now_utc()
        if status == "interested":
            update["interested_at"] = now_utc()
        if status == "active":
            update["active_at"] = now_utc()
        await db.tester_outreach_prospects.update_one({"_id": prospect["_id"]}, {"$set": update})
        await db.tester_outreach_events.insert_one({"created_at": now_utc(), "action": "status_updated", "status": status, "prospect_id": str(prospect.get("_id") or ""), "email": prospect.get("email"), "owner_email": lower((owner or {}).get("email"))})
        saved = await db.tester_outreach_prospects.find_one({"_id": prospect["_id"]})
        return {"success": True, "message": f"Tester prospect marked {status.replace('_', ' ')}", "prospect": public_prospect(saved)}

    async def inbound_reply(request: Request, payload: dict = Body(default={})):
        if not webhook_secret_ok(request):
            raise HTTPException(status_code=403, detail="Invalid inbound webhook secret")
        mailbox_hash = clean(payload.get("MailboxHash") or payload.get("mailbox_hash"))
        from_full = payload.get("FromFull") if isinstance(payload.get("FromFull"), dict) else {}
        from_email = lower(from_full.get("Email") or payload.get("From"))
        prospect = None
        if mailbox_hash:
            prospect = await db.tester_outreach_prospects.find_one({"reply_token": mailbox_hash})
        if not prospect and from_email:
            prospect = await db.tester_outreach_prospects.find_one({"email": from_email})
        if not prospect:
            raise HTTPException(status_code=404, detail="No tester prospect matched this reply")
        text_body = clean(payload.get("TextBody") or payload.get("StrippedTextReply") or payload.get("HtmlBody"))
        subject = clean(payload.get("Subject") or "Tester reply")
        message_id = clean(payload.get("MessageID") or payload.get("MessageId"))
        now = now_utc()
        await db.tester_outreach_messages.insert_one({
            "created_at": now,
            "received_at": now,
            "direction": "inbound",
            "prospect_id": str(prospect.get("_id") or ""),
            "email": from_email or prospect.get("email"),
            "subject": subject,
            "text": text_body,
            "provider": "postmark",
            "provider_message_id": message_id,
            "provider_status": "received",
            "raw_headers": safe(payload.get("Headers") or []),
        })
        lower_text = text_body.lower()
        next_status = "not_interested" if any(phrase in lower_text for phrase in ["no thanks", "not interested", "remove me", "unsubscribe"]) else "replied"
        update = {"status": next_status, "last_reply_at": now, "last_reply_preview": text_body[:500], "updated_at": now}
        if next_status == "not_interested":
            update.update({"opted_out": True, "opted_out_at": now})
        await db.tester_outreach_prospects.update_one({"_id": prospect["_id"]}, {"$set": update, "$inc": {"message_count": 1}})
        return {"success": True, "matched": True, "status": next_status}

    async def delivery_webhook(request: Request, payload: dict = Body(default={})):
        if not webhook_secret_ok(request):
            raise HTTPException(status_code=403, detail="Invalid delivery webhook secret")
        message_id = clean(payload.get("MessageID") or payload.get("MessageId"))
        record = await db.tester_outreach_messages.find_one({"provider_message_id": message_id}) if message_id else None
        if not record:
            return {"success": True, "matched": False}
        delivered_at = now_utc()
        await db.tester_outreach_messages.update_one({"_id": record["_id"]}, {"$set": {"provider_status": "delivered", "delivered_at": delivered_at, "delivery_payload": safe(payload)}})
        prospect_id = oid(record.get("prospect_id"))
        if prospect_id:
            await db.tester_outreach_prospects.update_one({"_id": prospect_id}, {"$set": {"last_delivered_at": delivered_at, "updated_at": delivered_at}})
        return {"success": True, "matched": True}

    async def unsubscribe(email: str = "", token: str = ""):
        canonical = lower(email)
        expected = unsubscribe_token(canonical)
        if not canonical or not token or not hmac.compare_digest(expected, clean(token)):
            return HTMLResponse("<h1>Invalid link</h1><p>Please email hello@churvox.com if you need help.</p>", status_code=400)
        now = now_utc()
        await db.tester_outreach_prospects.update_one({"email": canonical}, {"$set": {"status": "do_not_contact", "opted_out": True, "opted_out_at": now, "updated_at": now}}, upsert=False)
        return HTMLResponse("<h1>You will not be contacted again</h1><p>Churvox has added this address to its do-not-contact list.</p>")

    routes = [
        ("GET", "/api/admin/owner/tester-outreach", list_outreach),
        ("POST", "/api/admin/owner/tester-outreach/draft", save_draft),
        ("POST", "/api/admin/owner/tester-outreach/send", send_outreach),
        ("POST", "/api/admin/owner/tester-outreach/status", update_status),
        ("POST", "/api/postmark/inbound/tester-outreach", inbound_reply),
        ("POST", "/api/postmark/delivery/tester-outreach", delivery_webhook),
        ("GET", "/api/tester-outreach/unsubscribe", unsubscribe),
    ]
    for method, path, endpoint in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    INSTALLED.add(module_name)
