from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

OWNER_ROLES = {"owner", "admin", "employer", "business_owner", "superadmin"}
PAID_STATUSES = {"paid", "settled", "complete", "completed"}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clean(value: Any, limit: int = 4000) -> str:
    return " ".join(str(value or "").strip().split())[:limit]


def lower(value: Any) -> str:
    return clean(value).lower()


def number(value: Any, default: float = 0.0) -> float:
    try:
        return float(str(value or 0).replace("$", "").replace(",", ""))
    except Exception:
        return default


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items() if key not in {"password_hash", "hashed_password", "password", "stripe_secret"}}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = clean(value, 100)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def safe_https_url(value: Any) -> str:
    raw = clean(value, 3000)
    if not raw:
        return ""
    try:
        parsed = urlsplit(raw)
        return raw if parsed.scheme == "https" and parsed.netloc else ""
    except Exception:
        return ""


def frontend_url() -> str:
    return clean(os.environ.get("FRONTEND_URL") or os.environ.get("CHURVOX_FRONTEND_URL") or "https://www.churvox.com").rstrip("/")


def stripe_key() -> str:
    return clean(os.environ.get("STRIPE_CONNECT_SECRET_KEY") or os.environ.get("STRIPE_SECRET_KEY") or os.environ.get("CHURVOX_STRIPE_SECRET_KEY"))


def webhook_secret() -> str:
    return clean(os.environ.get("STRIPE_CONNECT_WEBHOOK_SECRET") or os.environ.get("STRIPE_WEBHOOK_SECRET") or os.environ.get("CHURVOX_STRIPE_WEBHOOK_SECRET"))


def stripe_client():
    key = stripe_key()
    if not key:
        return None
    try:
        import stripe
        stripe.api_key = key
        return stripe
    except Exception:
        return None


def user_id(user: dict[str, Any]) -> str:
    return clean(user.get("id") or user.get("_id") or user.get("user_id") or user.get("email"), 300)


def business_id(user: dict[str, Any]) -> str:
    return clean(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user_id(user), 300)


def owner_allowed(user: dict[str, Any]) -> bool:
    role = lower(user.get("role") or user.get("user_role") or user.get("account_role"))
    return bool(user.get("is_platform_owner") or user.get("is_admin") or role in OWNER_ROLES)


def id_values(raw: Any, ObjectId) -> list[Any]:
    text = clean(raw, 300)
    values: list[Any] = []
    if text:
        values.append(text)
        try:
            if ObjectId.is_valid(text):
                values.append(ObjectId(text))
        except Exception:
            pass
    return values


def business_scope(bid: str, ObjectId) -> dict[str, Any]:
    values = id_values(bid, ObjectId)
    return {"$or": [{field: {"$in": values}} for field in ("business_id", "businessId", "contractor_id", "owner_id", "user_id", "created_by")]}


def invoice_identity(invoice_id: Any, ObjectId) -> dict[str, Any]:
    clauses: list[dict[str, Any]] = []
    for value in id_values(invoice_id, ObjectId):
        clauses.extend([{field: value} for field in ("_id", "id", "invoice_id", "number", "invoice_number")])
    return {"$or": clauses or [{"id": "__missing__"}]}


def invoice_lookup(bid: str, invoice_id: Any, ObjectId) -> dict[str, Any]:
    return {"$and": [business_scope(bid, ObjectId), invoice_identity(invoice_id, ObjectId)]}


async def find_invoice(db, bid: str, invoice_id: Any, ObjectId):
    query = invoice_lookup(bid, invoice_id, ObjectId)
    for collection_name in ("invoices", "invoice_vault"):
        try:
            record = await db[collection_name].find_one(query)
            if record:
                return collection_name, record
        except Exception:
            pass
    return "", None


async def find_public_invoice(db, token: str):
    token = clean(token, 400)
    if len(token) < 16:
        return "", None
    query = {"$or": [{field: token} for field in ("public_token", "portal_token", "share_token", "invoice_token")]}
    for collection_name in ("invoices", "invoice_vault"):
        try:
            record = await db[collection_name].find_one(query)
            if record:
                return collection_name, record
        except Exception:
            pass
    return "", None


def invoice_ref(record: dict[str, Any]) -> str:
    return clean(record.get("invoice_id") or record.get("id") or record.get("invoice_number") or record.get("number") or record.get("_id"), 300)


def amount_due(record: dict[str, Any]) -> float:
    if record.get("amount_due") is not None:
        return max(0.0, number(record.get("amount_due")))
    if record.get("balance_due") is not None:
        return max(0.0, number(record.get("balance_due")))
    return max(0.0, number(record.get("total") if record.get("total") is not None else record.get("amount")) - number(record.get("amount_paid")))


def invoice_currency(record: dict[str, Any]) -> str:
    raw = lower(record.get("currency") or record.get("currency_code") or "nzd")
    return raw if len(raw) == 3 and raw.isalpha() else "nzd"


def public_token(record: dict[str, Any]) -> str:
    return clean(record.get("public_token") or record.get("portal_token") or record.get("share_token") or record.get("invoice_token"), 400)


def is_paid(record: dict[str, Any]) -> bool:
    status = lower(record.get("status") or record.get("payment_status") or record.get("paid_status"))
    return status in PAID_STATUSES or bool(record.get("paid_at")) or (amount_due(record) <= 0 and number(record.get("amount_paid")) > 0)


async def payment_account_id(db, bid: str, user: dict[str, Any] | None = None) -> str:
    try:
        settings = await db.payment_settings.find_one({"business_id": bid}) or {}
    except Exception:
        settings = {}
    account_id = clean(settings.get("stripe_account_id") or settings.get("stripe_connected_account_id"), 300)
    if not account_id and user:
        account_id = clean(user.get("stripe_account_id") or user.get("stripe_connected_account_id"), 300)
    if account_id:
        return account_id
    try:
        owner = await db.users.find_one({"$or": [{"business_id": bid}, {"businessId": bid}, {"id": bid}]}) or {}
    except Exception:
        owner = {}
    return clean(owner.get("stripe_account_id") or owner.get("stripe_connected_account_id"), 300)


async def mirror_invoice_update(db, bid: str, record: dict[str, Any], ObjectId, patch: dict[str, Any]) -> None:
    ref = invoice_ref(record)
    if not ref:
        return
    query = invoice_lookup(bid, ref, ObjectId)
    for collection_name in ("invoices", "invoice_vault"):
        try:
            await db[collection_name].update_many(query, {"$set": patch})
        except Exception:
            pass


async def mark_invoice_paid(db, collection_name: str, record: dict[str, Any], ObjectId, event: dict[str, Any], session: dict[str, Any]) -> dict[str, Any]:
    metadata = session.get("metadata") or {}
    bid = clean(record.get("business_id") or record.get("businessId") or record.get("contractor_id") or metadata.get("business_id"), 300)
    total = number(session.get("amount_total")) / 100 if session.get("amount_total") is not None else number(record.get("total") or record.get("amount"))
    stamp = now_utc()
    patch = {"status": "paid", "payment_status": "paid", "paid_status": "paid", "amount_paid": max(total, number(record.get("amount_paid"))), "amount_due": 0, "balance_due": 0, "paid_at": stamp, "payment_provider": "stripe", "stripe_checkout_session_id": clean(session.get("id"), 300), "stripe_payment_intent_id": clean(session.get("payment_intent"), 300), "stripe_event_id": clean(event.get("id"), 300), "updated_at": stamp}
    if collection_name and record.get("_id") is not None:
        try:
            await db[collection_name].update_one({"_id": record["_id"]}, {"$set": patch})
        except Exception:
            pass
    if bid:
        await mirror_invoice_update(db, bid, record, ObjectId, patch)
        try:
            await db.invoice_payment_links.update_many({"business_id": bid, "invoice_id": invoice_ref(record)}, {"$set": {"status": "paid", "paid_at": stamp, "stripe_event_id": patch["stripe_event_id"], "updated_at": stamp}})
        except Exception:
            pass
        ref = invoice_ref(record)
        dedupe_key = f"stripe_invoice_paid:{bid}:{ref}"
        notice = {"business_id": bid, "source_type": "stripe_invoice_paid", "source_id": ref, "dedupe_key": dedupe_key, "action_type": "owner_review", "title": "Invoice payment verified", "found": f"Stripe confirmed payment for invoice {clean(record.get('invoice_number') or record.get('number') or ref)}.", "prepared": "Churvox recorded the verified payment and prepared the next useful review.", "why": "The owner can see what happened without Churvox sending or charging anything else.", "urgency": "Owner review", "status": "open", "owner_review_only": True, "prepared_only": True, "no_auto_send": True, "no_auto_sync": True, "no_auto_charge": True, "created_at": stamp, "updated_at": stamp}
        try:
            await db.command_slips.update_one({"dedupe_key": dedupe_key, "status": {"$in": ["open", "edited"]}}, {"$set": notice, "$setOnInsert": {"created_at": stamp}}, upsert=True)
        except Exception:
            pass
    return {**record, **patch}


def public_invoice_summary(record: dict[str, Any]) -> dict[str, Any]:
    return {"invoice_number": clean(record.get("invoice_number") or record.get("number"), 200), "status": lower(record.get("status") or record.get("payment_status") or "sent"), "payment_status": lower(record.get("payment_status") or record.get("status") or "sent"), "amount_due": amount_due(record), "amount_paid": number(record.get("amount_paid")), "paid_at": json_safe(record.get("paid_at")), "payment_link": safe_https_url(record.get("payment_link") or record.get("payment_url") or record.get("stripe_payment_url"))}


def route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def add_route(app, path: str, endpoint, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass
    app.add_api_route(path, endpoint, methods=[method])
    try:
        matches = [route for route in app.router.routes if route_matches(route, path, method)]
        app.router.routes = matches[-1:] + [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass
