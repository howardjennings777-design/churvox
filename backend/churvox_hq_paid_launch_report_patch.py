from __future__ import annotations

from datetime import datetime, timezone, timedelta
import os

INSTALLED = set()
CACHE = {"at": None, "signature": "", "value": None}
CACHE_SECONDS = 300
OWNER_EMAILS = {
    "hello@churvox.com",
    "howardjennings77@gmail.com",
    "howardjennings777@gmail.com",
}
INTERNAL_MARKERS = (
    "test", "demo", "sample", "fake", "mock", "preview", "seed",
    "example.com", "mailinator", "tempmail", "john@churvox", "johnworker",
)
PLAN_MONTHLY_NZD = {
    "start": 39, "solo": 39,
    "crew": 89, "team": 89,
    "operator": 149, "pro": 149,
    "command": 299, "enterprise": 299,
}


def _now():
    return datetime.now(timezone.utc)


def _text(value):
    return str(value or "").strip()


def _low(value):
    return _text(value).lower()


def _read(doc, *keys):
    doc = doc or {}
    for key in keys:
        if isinstance(doc, dict) and doc.get(key) not in (None, ""):
            return doc.get(key)
        try:
            value = getattr(doc, key, None)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return None


def _safe(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_safe(item) for item in value]
    if isinstance(value, dict):
        output = {}
        for key, item in value.items():
            if any(word in str(key).lower() for word in ("password", "token", "secret", "hash")):
                continue
            output["id" if key == "_id" else key] = _safe(item)
        return output
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def _parse_dt(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _email(doc):
    return _low(_read(doc, "email", "user_email", "owner_email"))


def _status(doc):
    return _low(_read(doc, "subscription_status", "billing_status", "stripe_status", "status"))


def _plan(doc):
    return _low(_read(doc, "plan", "subscription_plan", "plan_type", "tier", "selected_plan"))


def _subscription_id(doc):
    return _text(_read(doc, "stripe_subscription_id", "subscription_id"))


def _customer_id(doc):
    return _text(_read(doc, "stripe_customer_id", "customer_id"))


def _is_internal(doc):
    email = _email(doc)
    if email in OWNER_EMAILS:
        return True
    hay = " ".join(_text(_read(doc, key)) for key in (
        "email", "user_email", "business_name", "company", "name", "source", "note"
    )).lower()
    return any(marker in hay for marker in INTERNAL_MARKERS)


def _is_tester(doc):
    if bool(_read(doc, "free_tester_access", "is_free_tester", "is_tester", "app_owner_free_pack")):
        until = _parse_dt(_read(doc, "free_tester_until", "free_until"))
        return not until or until >= _now()
    return "tester" in _status(doc)


def _verified_paid(doc):
    return not _is_tester(doc) and _status(doc) in {"active", "paid"} and bool(_subscription_id(doc))


def _verified_trial(doc):
    return not _is_tester(doc) and _status(doc) in {"trial", "trialing"} and bool(_subscription_id(doc))


def _billing_needs_verification(doc):
    return not _is_tester(doc) and _status(doc) in {"active", "paid", "trial", "trialing"} and not _subscription_id(doc)


def _billing_row(doc):
    return {
        "id": _text(_read(doc, "_id", "id")),
        "email": _email(doc),
        "business_name": _text(_read(doc, "business_name", "company_name", "company", "name")),
        "plan": _plan(doc),
        "subscription_status": _status(doc),
        "stripe_customer_id": _customer_id(doc),
        "stripe_subscription_id": _subscription_id(doc),
        "last_active": _safe(_read(doc, "last_active", "last_login_at", "last_login", "updated_at", "created_at")),
    }


def _obj_get(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    try:
        return getattr(obj, key, default)
    except Exception:
        return default


def _monthly_amount(unit_amount, interval, interval_count, quantity):
    try:
        amount = float(unit_amount or 0) * max(1, int(quantity or 1))
        count = max(1, int(interval_count or 1))
    except Exception:
        return 0.0
    interval = _low(interval)
    if interval == "month":
        return amount / count
    if interval == "year":
        return amount / (12 * count)
    if interval == "week":
        return amount * (52 / 12) / count
    if interval == "day":
        return amount * (365 / 12) / count
    return 0.0


def _stripe_snapshot(subscription_ids):
    ids = sorted(set(_text(value) for value in subscription_ids if _text(value)))[:200]
    signature = "|".join(ids)
    now = _now()
    if CACHE.get("value") is not None and CACHE.get("signature") == signature:
        cached_at = CACHE.get("at")
        if cached_at and (now - cached_at).total_seconds() < CACHE_SECONDS:
            return CACHE["value"]

    secret = _text(os.environ.get("STRIPE_SECRET_KEY"))
    if not secret:
        value = {
            "configured": False,
            "available": False,
            "source": "stripe_not_configured",
            "generated_at": now,
            "subscriptions_checked": 0,
            "mrr_by_currency": {},
            "active_subscriptions": [],
            "errors": ["STRIPE_SECRET_KEY is not configured"],
        }
        CACHE.update({"at": now, "signature": signature, "value": value})
        return value

    try:
        import stripe
        stripe.api_key = secret
    except Exception as exc:
        value = {
            "configured": True,
            "available": False,
            "source": "stripe_import_failed",
            "generated_at": now,
            "subscriptions_checked": 0,
            "mrr_by_currency": {},
            "active_subscriptions": [],
            "errors": [str(exc)],
        }
        CACHE.update({"at": now, "signature": signature, "value": value})
        return value

    totals = {}
    active = []
    errors = []
    checked = 0
    for subscription_id in ids:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            checked += 1
            status = _low(_obj_get(subscription, "status"))
            if status not in {"active", "trialing"}:
                continue
            items_obj = _obj_get(subscription, "items", {}) or {}
            items = _obj_get(items_obj, "data", []) or []
            subscription_totals = {}
            for item in items:
                price = _obj_get(item, "price", {}) or {}
                recurring = _obj_get(price, "recurring", {}) or {}
                currency = _low(_obj_get(price, "currency", "nzd")) or "nzd"
                monthly_minor = _monthly_amount(
                    _obj_get(price, "unit_amount", 0),
                    _obj_get(recurring, "interval", ""),
                    _obj_get(recurring, "interval_count", 1),
                    _obj_get(item, "quantity", 1),
                )
                totals[currency] = totals.get(currency, 0.0) + monthly_minor
                subscription_totals[currency] = subscription_totals.get(currency, 0.0) + monthly_minor
            active.append({
                "subscription_id": subscription_id,
                "customer_id": _text(_obj_get(subscription, "customer")),
                "status": status,
                "current_period_end": _safe(datetime.fromtimestamp(int(_obj_get(subscription, "current_period_end", 0)), tz=timezone.utc)) if _obj_get(subscription, "current_period_end", 0) else None,
                "mrr_by_currency": {key: round(value / 100, 2) for key, value in subscription_totals.items()},
            })
        except Exception as exc:
            errors.append(f"{subscription_id}: {exc}")

    value = {
        "configured": True,
        "available": not errors or checked > 0,
        "source": "stripe_subscription_api",
        "generated_at": now,
        "subscriptions_checked": checked,
        "mrr_by_currency": {key: round(value / 100, 2) for key, value in totals.items()},
        "active_subscriptions": active,
        "errors": errors[:20],
    }
    CACHE.update({"at": now, "signature": signature, "value": value})
    return value


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or Request is None or HTTPException is None:
        return

    async def require_owner(request: Request):
        user = await get_current_user(request)
        email = _email(user)
        role = _low(_read(user, "role", "user_role", "account_type")).replace("-", "_").replace(" ", "_")
        flags = bool(_read(user, "is_platform_owner", "is_platform_admin", "is_super_admin", "is_admin"))
        if email not in OWNER_EMAILS and role not in {"platform_owner", "platform_admin", "super_admin", "superadmin"} and not flags:
            raise HTTPException(status_code=403, detail="Churvox paid launch HQ is locked to the platform owner")
        return user

    async def collection_names():
        try:
            return set(await db.list_collection_names() or [])
        except Exception:
            return set()

    async def count(name):
        try:
            return await db[name].count_documents({})
        except Exception:
            return None

    async def list_users(limit=4000):
        try:
            return await db.users.find({}).sort("created_at", -1).limit(limit).to_list(length=limit)
        except Exception:
            return []

    async def latest(name):
        try:
            row = await db[name].find_one({}, sort=[("created_at", -1)])
            return _safe(row)
        except Exception:
            return None

    def remove_route(path, method):
        try:
            app.router.routes = [route for route in app.router.routes if not (
                getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())
            )]
        except Exception:
            pass

    async def paid_launch_report(request: Request):
        owner = await require_owner(request)
        generated_at = _now()
        names = await collection_names()
        raw_users = await list_users()
        users = [row for row in raw_users if not _is_internal(row)]
        internal_users = [row for row in raw_users if _is_internal(row)]
        verified_paid = [row for row in users if _verified_paid(row)]
        verified_trials = [row for row in users if _verified_trial(row)]
        testers = [row for row in users if _is_tester(row)]
        unverified = [row for row in users if _billing_needs_verification(row)]

        now = _now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        thirty_days = now - timedelta(days=30)
        active_today = 0
        active_30d = 0
        for row in users:
            seen = _parse_dt(_read(row, "last_active", "last_login_at", "last_login", "updated_at", "created_at"))
            if seen and seen >= today:
                active_today += 1
            if seen and seen >= thirty_days:
                active_30d += 1

        count_names = [
            "users", "businesses", "jobs", "clients", "quotes", "invoices",
            "team_members", "workers", "platform_visits", "platform_unique_visitors",
            "support_messages", "stripe_webhook_events", "lifecycle_emails",
            "command_slips", "command_audit",
        ]
        collection_counts = {key: await count(key) if key in names else None for key in count_names}

        business_ids = set()
        for row in users:
            value = _text(_read(row, "business_id", "owner_id"))
            if value:
                business_ids.add(value)
            elif _low(_read(row, "role")) in {"owner", "employer", "business_owner", "admin"}:
                fallback = _text(_read(row, "_id", "id"))
                if fallback:
                    business_ids.add(fallback)
        if collection_counts.get("businesses") not in (None, 0):
            businesses_total = collection_counts["businesses"]
            businesses_source = "businesses_collection"
        else:
            businesses_total = len(business_ids)
            businesses_source = "distinct_user_business_ids"

        stripe = _stripe_snapshot([_subscription_id(row) for row in verified_paid + verified_trials])
        estimated_mrr_nzd = round(sum(PLAN_MONTHLY_NZD.get(_plan(row), 0) for row in verified_paid), 2)
        actual_mrr_nzd = (stripe.get("mrr_by_currency") or {}).get("nzd") if stripe.get("available") else None

        database_connected = bool(names) or any(value is not None for value in collection_counts.values())
        checks = [
            {"key": "database", "label": "Database", "status": "pass" if database_connected else "fail", "detail": f"{len(names)} collections visible" if database_connected else "Database collections could not be confirmed"},
            {"key": "owner_lock", "label": "HQ access", "status": "pass", "detail": f"Owner-only data for {_email(owner)}"},
            {"key": "stripe", "label": "Stripe", "status": "pass" if stripe.get("available") else "fail", "detail": f"{stripe.get('subscriptions_checked', 0)} subscriptions checked" if stripe.get("available") else "; ".join(stripe.get("errors") or ["Stripe could not be confirmed"])},
            {"key": "billing_truth", "label": "Billing truth", "status": "warn" if unverified else "pass", "detail": f"{len(unverified)} active/trial records need Stripe verification" if unverified else "No active/trial records are being counted without a Stripe subscription ID"},
            {"key": "webhooks", "label": "Stripe webhooks", "status": "pass" if "stripe_webhook_events" in names else "warn", "detail": "Webhook event collection is present" if "stripe_webhook_events" in names else "No webhook event collection is visible yet"},
            {"key": "email", "label": "Lifecycle email", "status": "pass" if _text(os.environ.get("POSTMARK_SERVER_TOKEN")) else "warn", "detail": "Postmark configuration is present" if _text(os.environ.get("POSTMARK_SERVER_TOKEN")) else "Postmark configuration could not be confirmed"},
        ]
        ready = all(item["status"] != "fail" for item in checks)

        return _safe({
            "success": True,
            "source": "live_database_and_stripe_v1",
            "generated_at": generated_at,
            "owner_only": _email(owner),
            "ready_to_take_payments": ready,
            "truth": {
                "sample_records_included": False,
                "paid_definition": "active_or_paid_with_stripe_subscription_id",
                "trial_definition": "trialing_with_stripe_subscription_id",
                "mrr_source": "stripe_subscription_api" if actual_mrr_nzd is not None else "unavailable",
                "estimate_is_separate": True,
            },
            "counts": {
                "users_total": len(users),
                "internal_users_excluded": len(internal_users),
                "businesses_total": businesses_total,
                "businesses_source": businesses_source,
                "verified_paid_users": len(verified_paid),
                "verified_trial_users": len(verified_trials),
                "tester_users": len(testers),
                "billing_needs_verification": len(unverified),
                "active_today": active_today,
                "active_30d": active_30d,
            },
            "billing": {
                "actual_mrr_nzd": actual_mrr_nzd,
                "estimated_mrr_nzd": estimated_mrr_nzd,
                "verified_paid_users": [_billing_row(row) for row in verified_paid[:500]],
                "verified_trial_users": [_billing_row(row) for row in verified_trials[:500]],
                "tester_users": [_billing_row(row) for row in testers[:500]],
                "needs_verification": [_billing_row(row) for row in unverified[:500]],
                "stripe": stripe,
            },
            "collections": {
                "connected": database_connected,
                "names": sorted(names)[:120],
                "counts": collection_counts,
                "latest": {
                    "stripe_webhook": await latest("stripe_webhook_events") if "stripe_webhook_events" in names else None,
                    "support_message": await latest("support_messages") if "support_messages" in names else None,
                    "lifecycle_email": await latest("lifecycle_emails") if "lifecycle_emails" in names else None,
                },
            },
            "launch_checks": checks,
        })

    path = "/api/admin/owner/paid-launch-report"
    remove_route(path, "GET")
    app.add_api_route(path, paid_launch_report, methods=["GET"])
    INSTALLED.add(name)
