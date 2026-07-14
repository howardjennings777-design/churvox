from __future__ import annotations

from datetime import datetime, timezone
import secrets

from fastapi import Body, HTTPException, Request

INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"
MAX_BATCH_SIZE = 25
BLOCKED_STATUSES = {
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


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def default_subject(_item):
    return "Would you test Churvox for 30 days?"


def default_body(item):
    name = clean(item.get("contact_name") or item.get("name"))
    business = clean(item.get("business_name"))
    greeting = f"Hi {name}," if name else "Hi there,"
    context = f" for {business}" if business else ""
    return (
        f"{greeting}\n\n"
        f"I’m inviting a small group of trade and service businesses{context} to test Churvox for 30 days. "
        "Churvox helps manage clients, jobs, quotes, invoices and admin preparation while the business owner stays in control and approves important actions.\n\n"
        "There is no card required, no phone call, and all support can be handled by email. "
        "I’m mainly looking for honest feedback about what feels useful, confusing or missing.\n\n"
        "Would you be open to trying it?\n\n"
        "Thanks,\nHoward\nChurvox"
    )


def public_result(doc):
    if not doc:
        return None
    return {
        "id": str(doc.get("_id") or ""),
        "email": clean(doc.get("display_email") or doc.get("email")),
        "business_name": clean(doc.get("business_name")),
        "contact_name": clean(doc.get("contact_name")),
        "status": lower(doc.get("status") or "draft"),
        "source": clean(doc.get("source")),
        "assistant_batch_id": clean(doc.get("assistant_batch_id")),
    }


def install(module):
    module_name = getattr(module, "__name__", "")
    if module_name in INSTALLED:
        return

    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    async def require_owner(request: Request):
        current = await get_current_user(request)
        email = lower((current or {}).get("email") or (current or {}).get("user_email"))
        if email != OWNER_EMAIL:
            raise HTTPException(status_code=403, detail="Churvox HQ is locked to hello@churvox.com")
        return current

    async def import_drafts(request: Request, payload: dict = Body(default={})):
        owner = await require_owner(request)
        items = payload.get("drafts")
        if items is None:
            items = payload.get("prospects")
        if items is None:
            items = payload.get("items")
        if not isinstance(items, list):
            raise HTTPException(status_code=400, detail="Prepared batch must contain a drafts array")
        if not items:
            raise HTTPException(status_code=400, detail="Prepared batch is empty")
        if len(items) > MAX_BATCH_SIZE:
            raise HTTPException(status_code=400, detail=f"A prepared batch can contain at most {MAX_BATCH_SIZE} drafts")

        batch_id = clean(payload.get("batch_id")) or f"assistant-{now_utc().strftime('%Y%m%d-%H%M%S')}"
        imported = []
        updated = []
        skipped = []
        errors = []
        seen = set()
        owner_email = lower((owner or {}).get("email"))

        for position, raw in enumerate(items, start=1):
            if not isinstance(raw, dict):
                errors.append({"position": position, "reason": "Draft must be an object"})
                continue

            typed_email = clean(raw.get("display_email") or raw.get("email"))
            email = lower(typed_email)
            if not email or "@" not in email or " " in email:
                errors.append({"position": position, "email": typed_email, "reason": "Valid business email required"})
                continue
            if email in seen:
                skipped.append({"position": position, "email": typed_email, "reason": "Duplicate in prepared batch"})
                continue
            seen.add(email)

            existing = await db.tester_outreach_prospects.find_one({"email": email})
            existing_status = lower((existing or {}).get("status") or "draft")
            if (existing or {}).get("opted_out") or existing_status in BLOCKED_STATUSES:
                skipped.append({
                    "position": position,
                    "email": typed_email,
                    "reason": f"Existing prospect is {existing_status.replace('_', ' ')} and was not changed",
                })
                continue

            subject = clean(raw.get("subject")) or default_subject(raw)
            body = clean(raw.get("body")) or default_body(raw)
            if not subject or not body:
                errors.append({"position": position, "email": typed_email, "reason": "Subject and body are required"})
                continue

            now = now_utc()
            prospect = {
                "email": email,
                "display_email": typed_email,
                "contact_name": clean(raw.get("contact_name") or raw.get("name")),
                "business_name": clean(raw.get("business_name")),
                "trade": clean(raw.get("trade")),
                "country": clean(raw.get("country") or "New Zealand"),
                "website": clean(raw.get("website")),
                "source_url": clean(raw.get("source_url")),
                "source": "assistant_prepared_import",
                "subject": subject,
                "body": body,
                "trial_days": 30,
                "reply_token": clean((existing or {}).get("reply_token")) or secrets.token_urlsafe(12),
                "status": "draft",
                "note": clean(raw.get("note")),
                "assistant_batch_id": batch_id,
                "prepared_by": clean(raw.get("prepared_by") or "ChatGPT"),
                "owner_approval_required": True,
                "updated_at": now,
                "updated_by": owner_email,
            }

            await db.tester_outreach_prospects.update_one(
                {"email": email},
                {"$set": prospect, "$setOnInsert": {"created_at": now, "message_count": 0, "send_count": 0}},
                upsert=True,
            )
            saved = await db.tester_outreach_prospects.find_one({"email": email})
            event_action = "assistant_draft_updated" if existing else "assistant_draft_imported"
            await db.tester_outreach_events.insert_one({
                "created_at": now,
                "action": event_action,
                "prospect_id": str((saved or {}).get("_id") or ""),
                "email": email,
                "owner_email": owner_email,
                "assistant_batch_id": batch_id,
                "send_permitted": False,
            })
            (updated if existing else imported).append(public_result(saved))

        return {
            "success": True,
            "message": f"Prepared batch added as drafts: {len(imported)} new, {len(updated)} updated",
            "batch_id": batch_id,
            "limits": {
                "draft_only": True,
                "send_permitted": False,
                "grant_access_permitted": False,
                "status_changes_permitted": False,
                "max_batch_size": MAX_BATCH_SIZE,
            },
            "imported": imported,
            "updated": updated,
            "skipped": skipped,
            "errors": errors,
        }

    path = "/api/admin/owner/tester-outreach/import-drafts"
    remove_route(app, path, "POST")
    app.add_api_route(path, import_drafts, methods=["POST"])

    INSTALLED.add(module_name)
