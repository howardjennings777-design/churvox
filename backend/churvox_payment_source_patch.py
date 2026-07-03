from __future__ import annotations

from datetime import datetime, timezone


def now_utc():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, dict):
        return {k: safe(v) for k, v in value.items()}
    if isinstance(value, list):
        return [safe(v) for v in value]
    return value


def user_id(user):
    return text(user.get("id") or user.get("_id") or user.get("user_id"))


def business_id(user):
    return text(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user_id(user))


def cents(value):
    raw = text(value).replace(",", "")
    try:
        return int(round(float("".join(ch for ch in raw if ch.isdigit() or ch == ".")) * 100))
    except Exception:
        return 0


def payload_amount(payload):
    for key in ["amount_cents", "payment_cents"]:
        try:
            amount = int(payload.get(key) or 0)
            if amount > 0:
                return amount
        except Exception:
            pass
    for key in ["amount", "payment_due", "amount_due", "invoice_total", "total", "price"]:
        amount = cents(payload.get(key))
        if amount > 0:
            return amount
    return 0


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def payment_source_payload(user, payload, status="pending"):
    reader = payload.get("reader") or payload.get("reader_label") or payload.get("reader_serial") or payload.get("reader_id") or ""
    return {
        "source": "worker_on_site_card_reader",
        "payment_source": "worker_on_site_card_reader",
        "payment_source_label": "Worker on-site card reader",
        "provider": "stripe_terminal",
        "method": "card_present",
        "channel": "worker_app",
        "collected_by_user_id": user_id(user),
        "collected_by_worker_id": user_id(user),
        "collected_by_email": lower(user.get("email")),
        "collected_by_name": text(user.get("name") or user.get("full_name") or user.get("email")),
        "reader": text(reader),
        "payment_status": status,
    }


def install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or not get_current_user or Request is None or HTTPException is None:
        return
    if getattr(app.state, "churvox_payment_source_patch", False):
        return

    async def reader_result(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        bid = business_id(user)
        job_id = text(payload.get("job_id"))
        if not job_id:
            raise HTTPException(status_code=400, detail="Job id is required")
        amount = payload_amount(payload)
        currency = lower(payload.get("currency") or "nzd")[:3] or "nzd"
        payment_intent_id = text(payload.get("payment_intent_id") or payload.get("intent_id"))
        status_value = lower(payload.get("status") or "processed") or "processed"
        source = payment_source_payload(user, payload, status_value)
        event = {
            "business_id": bid,
            "job_id": job_id,
            "payment_intent_id": payment_intent_id,
            "amount_cents": amount,
            "currency": currency,
            "stripe_account_id": text(payload.get("stripe_account_id")),
            "status": status_value,
            **source,
            "updated_at": now_utc(),
        }
        query = {"business_id": bid, "job_id": job_id}
        if payment_intent_id:
            query["payment_intent_id"] = payment_intent_id
        await db.on_site_payment_events.update_one(query, {"$set": event, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
        job_payment = {
            "last_payment_source": source["payment_source"],
            "last_payment_source_label": source["payment_source_label"],
            "last_payment_provider": source["provider"],
            "last_payment_method": source["method"],
            "last_payment_channel": source["channel"],
            "last_payment_intent_id": payment_intent_id,
            "last_payment_amount_cents": amount,
            "last_payment_currency": currency,
            "last_payment_status": status_value,
            "last_payment_collected_by": source["collected_by_name"],
            "last_payment_collected_by_email": source["collected_by_email"],
            "last_payment_at": now_utc(),
        }
        try:
            await db.jobs.update_one({"_id": ObjectId(job_id)}, {"$set": job_payment})
        except Exception:
            try:
                await db.jobs.update_one({"id": job_id}, {"$set": job_payment})
            except Exception:
                pass
        return safe({"success": True, "job_id": job_id, **event, "job_payment": job_payment})

    async def job_payment(request: Request):
        user = await get_current_user(request)
        job_id = text(request.path_params.get("job_id"))
        bid = business_id(user)
        latest = None
        try:
            latest = await db.on_site_payment_events.find_one({"business_id": bid, "job_id": job_id}, sort=[("updated_at", -1), ("created_at", -1)])
        except Exception:
            latest = None
        if not latest:
            return safe({"success": True, "job_id": job_id, "has_payment": False, "payment_source_label": "No payment recorded yet", "payment_status": "pending"})
        return safe({"success": True, "job_id": job_id, "has_payment": True, **latest})

    for path, endpoint, method in [
        ("/api/payments/on-site/reader-result", reader_result, "POST"),
        ("/api/payments/on-site/job/{job_id}", job_payment, "GET"),
    ]:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])

    app.state.churvox_payment_source_patch = True


_install = install
