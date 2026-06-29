from __future__ import annotations

import base64
import json
import os
import secrets
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import sys

import churvox_field_truth_patch as field_truth

try:
    import churvox_invoice_vault_patch as invoice_vault
except Exception:  # pragma: no cover
    invoice_vault = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()


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


def frontend_url():
    return clean(os.getenv("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")


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


async def safe_recent(collection, query, limit=100, sort_field="updated_at"):
    try:
        return await collection.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def money(value):
    try:
        return float(str(value or 0).replace("$", "").replace(",", ""))
    except Exception:
        return 0.0


def parse_dt(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not value:
        return None
    text = clean(value)
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        try:
            return datetime.fromisoformat(text[:10]).replace(tzinfo=timezone.utc)
        except Exception:
            return None


def id_values(raw, ObjectId):
    vals = [clean(raw)] if clean(raw) else []
    try:
        if clean(raw) and ObjectId is not None:
            vals.append(ObjectId(clean(raw)))
    except Exception:
        pass
    return vals


async def find_invoice(db, user, ObjectId, invoice_id):
    bid = business_id(user)
    clauses = []
    for val in id_values(invoice_id, ObjectId):
        clauses.extend([{ "_id": val }, { "id": val }, { "invoice_id": val }, { "number": val }, { "invoice_number": val }, { "job_id": val }])
    if clauses:
        doc = await safe_one(db.invoice_vault, {"business_id": bid, "$or": clauses})
        if doc:
            return doc
        doc = await safe_one(db.invoices, {"business_id": bid, "$or": clauses})
        if doc:
            return doc
    return {"id": clean(invoice_id), "invoice_id": clean(invoice_id), "number": clean(invoice_id), "amount": 0, "status": "draft"}


async def find_quote(db, user, ObjectId, quote_id):
    bid = business_id(user)
    clauses = []
    for val in id_values(quote_id, ObjectId):
        clauses.extend([{ "_id": val }, { "id": val }, { "quote_id": val }, { "number": val }, { "title": clean(quote_id) }])
    if clauses:
        doc = await safe_one(db.quotes, {"business_id": bid, "$or": clauses})
        if doc:
            return doc
    return {"id": clean(quote_id), "quote_id": clean(quote_id), "title": clean(quote_id), "status": "draft"}


async def brand_for(db, user):
    if invoice_vault is not None:
        try:
            return await invoice_vault.brand_for(db, user)
        except Exception:
            pass
    return {"business_name": clean((user or {}).get("business_name") or (user or {}).get("company") or "Your business"), "trading_name": clean((user or {}).get("trading_name") or (user or {}).get("business_name") or "Your business"), "logo_url": clean((user or {}).get("logo_url") or (user or {}).get("business_logo_url")), "email": clean((user or {}).get("email")), "gst_rate": 15}


async def create_portal_link(db, user, ObjectId, payload):
    target_type = lower(payload.get("target_type") or payload.get("kind") or "invoice")
    target_id = clean(payload.get("target_id") or payload.get("invoice_id") or payload.get("quote_id") or payload.get("id"))
    token = secrets.token_urlsafe(24)
    bid = business_id(user)
    record = None
    if target_type == "quote":
        record = await find_quote(db, user, ObjectId, target_id)
    else:
        target_type = "invoice"
        record = await find_invoice(db, user, ObjectId, target_id)
    doc = {
        "token": token,
        "business_id": bid,
        "created_by": user_id(user),
        "target_type": target_type,
        "target_id": target_id,
        "customer_email": clean(payload.get("customer_email") or record.get("client_email") or record.get("customer_email") or record.get("email")),
        "customer_phone": clean(payload.get("customer_phone") or record.get("client_phone") or record.get("customer_phone") or record.get("phone")),
        "status": "active",
        "public_url": f"{frontend_url()}/customer/{token}",
        "expires_at": now_utc() + timedelta(days=int(payload.get("expires_days") or 60)),
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    try:
        await db.customer_portal_links.insert_one(dict(doc))
    except Exception:
        pass
    return {"success": True, "link": json_safe(doc), "record": json_safe(record)}


async def get_portal_payload(db, token, ObjectId=None):
    link = await safe_one(db.customer_portal_links, {"token": clean(token), "status": "active"})
    if not link:
        return {"success": False, "error": "portal_link_not_found"}
    expired = parse_dt(link.get("expires_at"))
    if expired and expired < now_utc():
        return {"success": False, "error": "portal_link_expired"}
    bid = clean(link.get("business_id"))
    target_id = clean(link.get("target_id"))
    record = None
    if link.get("target_type") == "quote":
        record = await safe_one(db.quotes, {"business_id": bid, "$or": [{"id": target_id}, {"quote_id": target_id}, {"title": target_id}]})
    else:
        record = await safe_one(db.invoice_vault, {"business_id": bid, "$or": [{"invoice_id": target_id}, {"id": target_id}, {"number": target_id}]})
        if not record:
            record = await safe_one(db.invoices, {"business_id": bid, "$or": [{"id": target_id}, {"invoice_id": target_id}, {"number": target_id}]})
    business = await safe_one(db.businesses, {"business_id": bid}) or await safe_one(db.business_settings, {"business_id": bid}) or {}
    return {"success": True, "link": json_safe(link), "business": json_safe(business), "record": json_safe(record or {})}


async def create_payment_link(db, user, ObjectId, invoice_id, payload=None):
    payload = payload or {}
    invoice = await find_invoice(db, user, ObjectId, invoice_id)
    bid = business_id(user)
    amount = int(round(max(0.5, money(invoice.get("amount") or invoice.get("total") or payload.get("amount") or 0)) * 100))
    currency = lower(payload.get("currency") or invoice.get("currency") or "nzd")
    portal = await create_portal_link(db, user, ObjectId, {"target_type": "invoice", "target_id": invoice_id, "customer_email": payload.get("customer_email")})
    public_url = portal.get("link", {}).get("public_url")
    stripe_secret = clean(os.getenv("STRIPE_SECRET_KEY"))
    status = "created"
    pay_url = public_url
    provider_result = {}
    if stripe_secret:
        form = urllib.parse.urlencode({
            "mode": "payment",
            "success_url": f"{public_url}?paid=1",
            "cancel_url": f"{public_url}?payment_cancelled=1",
            "line_items[0][price_data][currency]": currency,
            "line_items[0][price_data][product_data][name]": f"Invoice {clean(invoice.get('number') or invoice_id)}",
            "line_items[0][price_data][unit_amount]": str(amount),
            "line_items[0][quantity]": "1",
            "metadata[invoice_id]": clean(invoice.get("invoice_id") or invoice.get("id") or invoice_id),
            "metadata[business_id]": bid,
        }).encode("utf-8")
        req = urllib.request.Request("https://api.stripe.com/v1/checkout/sessions", data=form, method="POST", headers={"Authorization": f"Bearer {stripe_secret}", "Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                provider_result = json.loads(resp.read().decode("utf-8", errors="ignore") or "{}")
                pay_url = clean(provider_result.get("url")) or pay_url
                status = "stripe_ready"
        except urllib.error.HTTPError as exc:
            status = "stripe_failed"
            provider_result = {"error": exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)}
        except Exception as exc:
            status = "stripe_failed"
            provider_result = {"error": str(exc)}
    else:
        status = "stripe_config_required"
    doc = {"business_id": bid, "invoice_id": clean(invoice_id), "amount_cents": amount, "currency": currency, "pay_url": pay_url, "portal_url": public_url, "status": status, "provider": "stripe", "provider_result": provider_result, "created_by": user_id(user), "created_at": now_utc(), "updated_at": now_utc()}
    try:
        await db.invoice_payment_links.insert_one(dict(doc))
    except Exception:
        pass
    return {"success": True, "payment_link": json_safe(doc), "invoice": json_safe(invoice)}


async def mark_invoice_paid(db, business_id_value, invoice_id, provider_event=None):
    vals = [clean(invoice_id)]
    query = {"business_id": business_id_value, "$or": [{"invoice_id": v} for v in vals] + [{"id": v} for v in vals] + [{"number": v} for v in vals]}
    for collection_name in ["invoice_vault", "invoices"]:
        try:
            await getattr(db, collection_name).update_many(query, {"$set": {"status": "Paid", "paid_status": "paid", "paid_at": now_utc(), "payment_provider": "stripe", "payment_event": provider_event or {}, "updated_at": now_utc()}})
        except Exception:
            pass


def schedule_job_time(job):
    dt = parse_dt(job.get("scheduled_start") or job.get("start") or job.get("scheduled_date") or job.get("date"))
    if dt:
        return dt
    return None


async def schedule_board(db, user, ObjectId, payload=None):
    bid = business_id(user)
    date = clean((payload or {}).get("date") or now_utc().date().isoformat())[:10]
    jobs = await safe_recent(db.jobs, {"business_id": bid}, 250, "scheduled_date")
    workers = await safe_recent(db.team, {"business_id": bid}, 100, "name")
    worker_names = [clean(w.get("name") or w.get("full_name") or w.get("email") or w.get("id")) for w in workers]
    columns = {}
    warnings = []
    for job in jobs:
        job_date = clean(job.get("scheduled_date") or job.get("date") or job.get("start") or job.get("scheduled_start"))[:10]
        if date and job_date and job_date != date:
            continue
        worker = clean(job.get("assigned_worker_name") or job.get("worker_name") or job.get("worker") or job.get("assigned_to") or "Unassigned") or "Unassigned"
        columns.setdefault(worker, []).append(json_safe(job))
        if worker == "Unassigned":
            warnings.append({"type": "missing_worker", "job_id": clean(job.get("_id") or job.get("id")), "title": clean(job.get("title") or job.get("job_name")), "message": "Job has no worker assigned."})
        start = schedule_job_time(job)
        if start and start < now_utc() - timedelta(hours=1) and lower(job.get("status")) not in {"complete", "completed", "paid", "done"}:
            warnings.append({"type": "late_job", "job_id": clean(job.get("_id") or job.get("id")), "title": clean(job.get("title") or job.get("job_name")), "message": "Scheduled time has passed and job is not complete."})
    for worker, rows in columns.items():
        if len(rows) > 7:
            warnings.append({"type": "overbooked", "worker": worker, "count": len(rows), "message": f"{worker} has {len(rows)} jobs on the board."})
    return {"success": True, "date": date, "workers": worker_names, "columns": columns, "warnings": warnings, "route_hint": "Use Workers map for GPS and route order; Jobs stays clean."}


async def send_sms(db, user, payload):
    to_phone = clean(payload.get("to") or payload.get("phone") or payload.get("mobile"))
    body = clean(payload.get("body") or payload.get("message") or "Churvox update")
    username = clean(os.getenv("CLICKSEND_USERNAME"))
    api_key = clean(os.getenv("CLICKSEND_API_KEY"))
    status = "queued_no_recipient" if not to_phone else "queued_no_sms_provider"
    provider_result = {}
    if to_phone and username and api_key:
        auth = base64.b64encode(f"{username}:{api_key}".encode()).decode()
        req = urllib.request.Request("https://rest.clicksend.com/v3/sms/send", data=json.dumps({"messages": [{"source": "churvox", "body": body, "to": to_phone}]}).encode("utf-8"), method="POST", headers={"Authorization": f"Basic {auth}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                provider_result = json.loads(resp.read().decode("utf-8", errors="ignore") or "{}")
                status = "sent"
        except Exception as exc:
            status = "queued_send_failed"
            provider_result = {"error": str(exc)}
    doc = {"business_id": business_id(user), "to": to_phone, "body": body, "status": status, "provider": "clicksend", "provider_result": provider_result, "owner_approved": bool(payload.get("owner_approved", True)), "created_at": now_utc(), "updated_at": now_utc()}
    try:
        await db.sms_outbox.insert_one(dict(doc))
    except Exception:
        pass
    return {"success": True, "sms": json_safe(doc)}


async def setup_wizard(db, user, ObjectId):
    bid = business_id(user)
    counts = {}
    for name in ["clients", "jobs", "team", "invoices", "quotes"]:
        try:
            counts[name] = await getattr(db, name).count_documents({"business_id": bid})
        except Exception:
            counts[name] = 0
    settings = await safe_one(db.business_settings, {"business_id": bid}) or {}
    steps = [
        {"key": "business", "label": "Business profile, logo, GST and terms", "done": bool(settings or (user or {}).get("business_name"))},
        {"key": "client", "label": "Add first real client", "done": counts.get("clients", 0) > 0},
        {"key": "job", "label": "Create first job", "done": counts.get("jobs", 0) > 0},
        {"key": "worker", "label": "Invite first worker", "done": counts.get("team", 0) > 0},
        {"key": "invoice", "label": "Prepare/send first invoice", "done": counts.get("invoices", 0) > 0},
        {"key": "payment", "label": "Enable Pay Now invoice payments", "done": bool(os.getenv("STRIPE_SECRET_KEY"))},
        {"key": "sms", "label": "Enable SMS sending", "done": bool(os.getenv("CLICKSEND_USERNAME") and os.getenv("CLICKSEND_API_KEY"))},
        {"key": "accounting", "label": "Connect Xero/MYOB if needed", "done": False},
    ]
    return {"success": True, "steps": steps, "counts": counts, "complete": all(step["done"] for step in steps[:5])}


async def report_dashboard(db, user):
    bid = business_id(user)
    invoices = await safe_recent(db.invoice_vault, {"business_id": bid}, 500, "updated_at")
    if not invoices:
        invoices = await safe_recent(db.invoices, {"business_id": bid}, 500, "updated_at")
    jobs = await safe_recent(db.jobs, {"business_id": bid}, 500, "updated_at")
    quotes = await safe_recent(db.quotes, {"business_id": bid}, 500, "updated_at")
    paid = [i for i in invoices if "paid" in lower(i.get("status") or i.get("paid_status"))]
    overdue = [i for i in invoices if "overdue" in lower(i.get("status"))]
    draft = [i for i in invoices if "draft" in lower(i.get("status"))]
    quote_accepted = [q for q in quotes if "accepted" in lower(q.get("status"))]
    total_invoiced = sum(money(i.get("amount") or i.get("total")) for i in invoices)
    total_paid = sum(money(i.get("amount") or i.get("total")) for i in paid)
    labour_cost = 0.0
    for job in jobs:
        hours = money(job.get("actual_hours") or job.get("hours") or 0)
        if not hours:
            try:
                minutes = float(job.get("actual_minutes") or job.get("worked_minutes") or 0)
                hours = minutes / 60
            except Exception:
                hours = 0
        labour_cost += hours * 45
    margin = total_invoiced - labour_cost
    return {"success": True, "summary": {"jobs": len(jobs), "quotes": len(quotes), "invoices": len(invoices), "paid_invoices": len(paid), "overdue_invoices": len(overdue), "draft_invoices": len(draft), "quote_win_count": len(quote_accepted), "total_invoiced": round(total_invoiced, 2), "total_paid": round(total_paid, 2), "estimated_labour_cost": round(labour_cost, 2), "estimated_margin": round(margin, 2)}, "top_gaps": ["Add exact worker cost rates for stronger margin", "Connect payment webhooks for live paid status", "Use recurring service memory for customer value reporting"]}


async def usage_dashboard(db, user):
    bid = business_id(user)
    plan = lower((user or {}).get("plan") or "start")
    limits = {"start": {"jobs": 50, "workers": 1, "ai_actions": 50}, "crew": {"jobs": 200, "workers": 5, "ai_actions": 150}, "operator": {"jobs": 600, "workers": 15, "ai_actions": 600}, "command": {"jobs": 2000, "workers": 50, "ai_actions": 2500}}
    selected = limits.get(plan, limits["start"])
    counts = {}
    for key, collection in [("jobs", "jobs"), ("workers", "team"), ("invoices", "invoices"), ("quotes", "quotes")]:
        try:
            counts[key] = await getattr(db, collection).count_documents({"business_id": bid})
        except Exception:
            counts[key] = 0
    try:
        counts["ai_actions"] = await db.command_decisions.count_documents({"business_id": bid})
    except Exception:
        counts["ai_actions"] = 0
    warnings = []
    for key in ["jobs", "workers", "ai_actions"]:
        used = counts.get(key, 0)
        limit = selected.get(key, 0)
        if limit and used >= limit * 0.8:
            warnings.append({"key": key, "used": used, "limit": limit, "message": f"{key} is near plan limit."})
    return {"success": True, "plan": plan, "counts": counts, "limits": selected, "warnings": warnings, "manage_billing": "/plans"}


async def support_ticket(db, user, payload):
    doc = {"business_id": business_id(user), "user_id": user_id(user), "email": clean((user or {}).get("email")), "subject": clean(payload.get("subject") or payload.get("title") or "Support request"), "message": clean(payload.get("message") or payload.get("body") or payload.get("description")), "route": clean(payload.get("route")), "screenshot_note": clean(payload.get("screenshot_note")), "status": "open", "priority": clean(payload.get("priority") or "normal"), "source": "churvox_help", "created_at": now_utc(), "updated_at": now_utc()}
    try:
        result = await db.support_tickets.insert_one(dict(doc))
        doc["_id"] = result.inserted_id
    except Exception:
        pass
    return {"success": True, "ticket": json_safe(doc)}


async def worker_full_sync(db, user, payload):
    operations = payload.get("operations") if isinstance(payload.get("operations"), list) else []
    bid = business_id(user)
    results = []
    for op in operations[:200]:
        kind = lower(op.get("kind") or op.get("type"))
        doc = {"business_id": bid, "worker_id": user_id(user), "kind": kind, "payload": op, "status": "synced", "created_at": now_utc(), "updated_at": now_utc()}
        try:
            await db.worker_offline_events.update_one({"business_id": bid, "worker_id": user_id(user), "offline_id": clean(op.get("offline_id") or op.get("id"))}, {"$set": doc, "$setOnInsert": {"offline_id": clean(op.get("offline_id") or op.get("id") or secrets.token_hex(8))}}, upsert=True)
        except Exception:
            pass
        results.append({"kind": kind, "status": "synced"})
    return {"success": True, "synced": len(results), "results": results}


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

    async def portal_link_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await create_portal_link(db, user, ObjectId, await read_payload(request)))

    async def public_portal_endpoint(token: str):
        return json_safe(await get_portal_payload(db, token, ObjectId))

    async def public_accept_quote_endpoint(token: str, request: Request):
        payload = await read_payload(request)
        portal = await get_portal_payload(db, token, ObjectId)
        if not portal.get("success"):
            return portal
        link = portal.get("link") or {}
        if link.get("target_type") != "quote":
            return {"success": False, "error": "not_a_quote_link"}
        try:
            await db.quotes.update_many({"business_id": link.get("business_id"), "$or": [{"id": link.get("target_id")}, {"quote_id": link.get("target_id")}, {"title": link.get("target_id")}]}, {"$set": {"status": "Accepted", "accepted_at": now_utc(), "accepted_by_customer": True, "customer_acceptance": payload}})
        except Exception:
            pass
        return {"success": True, "status": "accepted"}

    async def public_message_endpoint(token: str, request: Request):
        payload = await read_payload(request)
        portal = await get_portal_payload(db, token, ObjectId)
        if not portal.get("success"):
            return portal
        link = portal.get("link") or {}
        doc = {"business_id": link.get("business_id"), "portal_token": token, "target_type": link.get("target_type"), "target_id": link.get("target_id"), "name": clean(payload.get("name")), "email": clean(payload.get("email")), "message": clean(payload.get("message")), "status": "new", "created_at": now_utc(), "updated_at": now_utc()}
        try:
            await db.customer_portal_messages.insert_one(dict(doc))
        except Exception:
            pass
        return {"success": True, "message": json_safe(doc)}

    async def payment_link_endpoint(request: Request, invoice_id: str):
        user = await get_current_user(request)
        return json_safe(await create_payment_link(db, user, ObjectId, invoice_id, await read_payload(request)))

    async def stripe_webhook_endpoint(request: Request):
        payload = await read_payload(request)
        data = payload.get("data", {}).get("object", {}) if isinstance(payload.get("data"), dict) else payload
        invoice_id = clean((data.get("metadata") or {}).get("invoice_id") or payload.get("invoice_id"))
        bid = clean((data.get("metadata") or {}).get("business_id") or payload.get("business_id"))
        if invoice_id and bid and lower(payload.get("type")) in {"checkout.session.completed", "invoice.paid", "payment_intent.succeeded", ""}:
            await mark_invoice_paid(db, bid, invoice_id, payload)
        return {"success": True}

    async def schedule_board_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await schedule_board(db, user, ObjectId, await read_payload(request)))

    async def move_job_endpoint(request: Request, job_id: str):
        user = await get_current_user(request)
        payload = await read_payload(request)
        update = {"updated_at": now_utc()}
        for src, dst in [("worker", "assigned_worker_name"), ("worker_id", "assigned_worker_id"), ("date", "scheduled_date"), ("time", "scheduled_time"), ("start", "scheduled_start")]:
            if clean(payload.get(src)):
                update[dst] = clean(payload.get(src))
        try:
            await db.jobs.update_one(field_truth.job_lookup_query(user, ObjectId, job_id), {"$set": update})
            await db.schedule_events.insert_one({"business_id": business_id(user), "job_id": job_id, "action": "move_job", "update": update, "created_by": user_id(user), "created_at": now_utc()})
        except Exception:
            pass
        return {"success": True, "job_id": job_id, "update": json_safe(update)}

    async def sms_send_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await send_sms(db, user, await read_payload(request)))

    async def sms_outbox_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe({"success": True, "items": await safe_recent(db.sms_outbox, {"business_id": business_id(user)}, 100, "updated_at")})

    async def setup_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await setup_wizard(db, user, ObjectId))

    async def report_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await report_dashboard(db, user))

    async def usage_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await usage_dashboard(db, user))

    async def support_post_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await support_ticket(db, user, await read_payload(request)))

    async def support_get_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe({"success": True, "tickets": await safe_recent(db.support_tickets, {"business_id": business_id(user)}, 100, "updated_at")})

    async def offline_sync_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe(await worker_full_sync(db, user, await read_payload(request)))

    async def top_player_status_endpoint(request: Request):
        user = await get_current_user(request)
        return json_safe({"success": True, "coverage": ["customer_portal", "pay_now", "schedule_board", "offline_worker_sync", "sms_outbox", "setup_wizard", "reporting", "premium_invoice_vault", "support_tickets", "usage_billing_controls"], "business_id": business_id(user)})

    routes = [
        ("POST", "/api/customer-portal/links", portal_link_endpoint),
        ("GET", "/api/customer-portal/{token}", public_portal_endpoint),
        ("POST", "/api/customer-portal/{token}/accept-quote", public_accept_quote_endpoint),
        ("POST", "/api/customer-portal/{token}/message", public_message_endpoint),
        ("POST", "/api/invoices/{invoice_id}/payment-link", payment_link_endpoint),
        ("POST", "/api/payments/stripe/webhook", stripe_webhook_endpoint),
        ("GET", "/api/schedule/board", schedule_board_endpoint),
        ("POST", "/api/schedule/jobs/{job_id}/move", move_job_endpoint),
        ("POST", "/api/sms/send-approved", sms_send_endpoint),
        ("GET", "/api/sms/outbox", sms_outbox_endpoint),
        ("GET", "/api/setup/wizard", setup_endpoint),
        ("GET", "/api/reports/dashboard", report_endpoint),
        ("GET", "/api/billing/usage-guard", usage_endpoint),
        ("POST", "/api/support/tickets", support_post_endpoint),
        ("GET", "/api/support/tickets", support_get_endpoint),
        ("POST", "/api/worker/offline/full-sync", offline_sync_endpoint),
        ("GET", "/api/top-player/status", top_player_status_endpoint),
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
