from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()


def text(value):
    return str(value or "").strip()


def lower(value):
    return text(value).lower()


def safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [safe(item) for item in value]
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): safe(item) for key, item in value.items() if key not in {"password_hash", "hashed_password"}}
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def business_id(user):
    return text(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id") or user.get("email"))


def cents(value):
    if value is None:
        return 0
    if isinstance(value, bool):
        return 0
    try:
        if isinstance(value, int):
            return max(0, value)
        if isinstance(value, float):
            return max(0, int(round(value * 100)))
    except Exception:
        pass
    raw = text(value).replace(",", "")
    try:
        number = float("".join(ch for ch in raw if ch.isdigit() or ch == "."))
        if "cents" in raw.lower():
            return max(0, int(number))
        return max(0, int(round(number * 100)))
    except Exception:
        return 0


def cents_from_keys(row, keys):
    for key in keys:
        if key in row and row.get(key) not in (None, ""):
            value = row.get(key)
            if key.endswith("_cents") or key.endswith("Cents"):
                try:
                    return max(0, int(value or 0))
                except Exception:
                    return cents(value)
            amount = cents(value)
            if amount > 0:
                return amount
    return 0


def money(cents_value, currency="nzd"):
    try:
        value = int(cents_value or 0)
    except Exception:
        value = 0
    prefix = "$" if lower(currency) in {"nzd", "aud", "usd"} else f"{upper(currency)} "
    dollars = value / 100
    if value % 100 == 0:
        return f"{prefix}{dollars:.0f}"
    return f"{prefix}{dollars:.2f}"


def upper(value):
    return text(value).upper()


async def find_job(db, user, job_id, ObjectId):
    bid = business_id(user)
    queries = [{"id": job_id}, {"job_id": job_id}]
    try:
        queries.append({"_id": ObjectId(job_id)})
    except Exception:
        pass
    for query in queries:
        for scoped in [dict(query, business_id=bid), dict(query, businessId=bid), query]:
            try:
                row = await db.jobs.find_one(scoped)
                if row:
                    return row
            except Exception:
                pass
    return {}


def route_matches(route, path, method):
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def remove_route(app, path, method):
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
    HTTPException = getattr(module, "HTTPException", None)

    if not app or db is None or not get_current_user or ObjectId is None or HTTPException is None:
        return

    async def payment_summary(job_id: str, request=None):
        user = await get_current_user(request)
        bid = business_id(user)
        jid = text(job_id)
        if not jid:
            raise HTTPException(status_code=400, detail="Job id required")

        job = await find_job(db, user, jid, ObjectId)
        currency = lower(job.get("currency") or job.get("job_currency") or "nzd") or "nzd"
        due_cents = cents_from_keys(job, [
            "payment_due_cents", "amount_due_cents", "invoice_total_cents", "total_cents", "price_cents", "quote_total_cents", "job_price_cents",
            "payment_due", "amount_due", "invoice_total", "total", "price", "quote_total", "job_price",
        ])
        paid_from_job_cents = cents_from_keys(job, [
            "paid_cents", "amount_paid_cents", "payment_paid_cents", "paid_amount_cents",
            "paid", "amount_paid", "payment_paid", "paid_amount",
        ])

        events = []
        paid_from_events_cents = 0
        last_status = ""
        last_method = ""
        try:
            cursor = db.on_site_payment_events.find({"business_id": bid, "job_id": jid}).sort("created_at", -1).limit(20)
            async for event in cursor:
                events.append(event)
                status = lower(event.get("status") or event.get("event"))
                if not last_status:
                    last_status = status
                if not last_method:
                    last_method = lower(event.get("method") or event.get("payment_method") or event.get("event"))
                if status in {"succeeded", "paid", "processed", "requires_capture", "terminal_payment_result"} or "succeed" in status or "process" in status:
                    try:
                        paid_from_events_cents += int(event.get("amount_cents") or 0)
                    except Exception:
                        pass
        except Exception:
            events = []

        paid_cents = max(paid_from_job_cents, paid_from_events_cents)
        balance_cents = max(0, due_cents - paid_cents)
        payment_status = "amount_missing"
        if due_cents > 0 and paid_cents <= 0:
            payment_status = "unpaid"
        if due_cents > 0 and paid_cents > 0 and balance_cents > 0:
            payment_status = "part_paid"
        if due_cents > 0 and paid_cents >= due_cents:
            payment_status = "paid"
        if due_cents <= 0 and paid_cents > 0:
            payment_status = "paid_no_amount"

        return safe({
            "success": True,
            "job_id": jid,
            "client_name": job.get("client_name") or job.get("customer_name") or job.get("client") or "Customer",
            "job_title": job.get("title") or job.get("job_name") or job.get("service_type") or job.get("service") or "Job",
            "currency": currency,
            "due_cents": due_cents,
            "paid_cents": paid_cents,
            "balance_cents": balance_cents,
            "due_label": money(due_cents, currency) if due_cents else "Office sets amount",
            "paid_label": money(paid_cents, currency) if paid_cents else "$0",
            "balance_label": money(balance_cents, currency) if balance_cents else "$0",
            "payment_status": payment_status,
            "last_status": last_status,
            "last_method": last_method or "card reader" if events else "",
            "events": events,
        })

    path = "/api/payments/on-site/job-summary/{job_id}"
    remove_route(app, path, "GET")
    app.add_api_route(path, payment_summary, methods=["GET"])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original

    def create_module(self, spec):
        if hasattr(self.original, "create_module"):
            return self.original.create_module(spec)
        return None

    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
