import sys
from datetime import datetime, timezone

from fastapi import Request


PLAN_ALIAS = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}

PLAN_NAME = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}

PLAN_PRICE = {
    "solo": 39,
    "team": 89,
    "pro": 149,
    "enterprise": 299,
}

PLAN_RANK = {"none": 0, "": 0, "trial": 0, "solo": 1, "team": 2, "pro": 3, "enterprise": 4}


COUNTRY_META = {
    "NZ": {"currency": "NZD", "symbol": "NZ$", "tax": "+ GST"},
    "AU": {"currency": "AUD", "symbol": "A$", "tax": "+ GST"},
    "US": {"currency": "USD", "symbol": "US$", "tax": "plus applicable tax"},
    "UK": {"currency": "GBP", "symbol": "£", "tax": "+ VAT"},
}


def _server():
    return sys.modules.get("churvox_legacy_server") or sys.modules.get("backend.server") or sys.modules.get("server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _plan(value):
    key = _clean(value).lower().replace(" ", "_").replace("-", "_")
    return PLAN_ALIAS.get(key, "none")


def _country(value):
    code = (_clean(value) or "NZ").upper()
    aliases = {"NZL": "NZ", "NEW ZEALAND": "NZ", "AUS": "AU", "AUSTRALIA": "AU", "USA": "US", "UNITED STATES": "US", "GB": "UK", "GBR": "UK", "UNITED KINGDOM": "UK"}
    code = aliases.get(code, code)
    return code if code in COUNTRY_META else "NZ"


def _oid(value):
    app = _server()
    ObjectId = getattr(app, "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


def _json_safe(value):
    app = _server()
    helper = getattr(app, "_json_safe", None)
    if helper:
        try:
            return helper(value)
        except Exception:
            pass
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value) if value is not None else None


def _candidate_filter(user):
    clauses = []
    values = []
    for key in ["business_id", "id", "_id", "owner_id"]:
        value = (user or {}).get(key)
        if value:
            values.append(value)
            values.append(str(value))
            oid = _oid(value)
            if oid:
                values.append(oid)

    for value in values:
        clauses.extend([
            {"_id": value},
            {"id": str(value)},
            {"business_id": value},
            {"business_id": str(value)},
            {"owner_id": value},
            {"owner_id": str(value)},
        ])

    email = _clean((user or {}).get("email")).lower()
    if email:
        clauses.append({"email": email})

    return {"$or": clauses} if clauses else {"_id": "__no_plan_status_user__"}


def _doc_plan(doc):
    return _plan((doc or {}).get("plan") or (doc or {}).get("subscription_plan") or (doc or {}).get("plan_key") or (doc or {}).get("planType"))


def _score(doc):
    plan = _doc_plan(doc)
    score = PLAN_RANK.get(plan, 0) * 100
    status = _clean((doc or {}).get("subscription_status")).lower()
    if status in {"trialing", "active", "paid"}:
        score += 25
    if (doc or {}).get("has_app_access") is True:
        score += 20
    if (doc or {}).get("stripe_subscription_id"):
        score += 10
    if (doc or {}).get("stripe_customer_id"):
        score += 5
    return score


def _limits(plan, country):
    plan = _plan(plan)
    meta = COUNTRY_META[_country(country)]
    return {
        "plan": plan,
        "name": PLAN_NAME.get(plan, "No plan"),
        "price": PLAN_PRICE.get(plan, 0),
        "price_label": f"{meta['symbol']}{PLAN_PRICE.get(plan, 0)}/month {meta['tax']}" if PLAN_PRICE.get(plan, 0) else "No plan chosen",
        "country": _country(country),
        "currency": meta["currency"],
        "tax_label": meta["tax"],
        "team": plan in {"team", "pro", "enterprise"},
        "ai_operator": plan in {"pro", "enterprise"},
        "payroll": plan == "enterprise",
    }


def _remove_route(router, suffix, method):
    router.routes = [
        route for route in getattr(router, "routes", [])
        if not (str(getattr(route, "path", "")).endswith(suffix) and method in (getattr(route, "methods", set()) or set()))
    ]


def install(router):
    if getattr(router, "churvox_subscription_status_fix_installed", False):
        return

    _remove_route(router, "/billing/subscription-status", "GET")

    @router.get("/billing/subscription-status")
    async def subscription_status_fixed(request: Request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}

        try:
            user = await getattr(app, "get_current_user")(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}

        docs = await db.users.find(_candidate_filter(user)).limit(20).to_list(length=20)
        docs = docs or [user]
        chosen = sorted(docs, key=_score, reverse=True)[0]

        plan = _doc_plan(chosen)
        country = _country(chosen.get("billing_country") or chosen.get("business_country") or chosen.get("country") or user.get("country") or "NZ")
        limits = _limits(plan, country)
        status = _clean(chosen.get("subscription_status")) or ("trialing" if PLAN_RANK.get(plan, 0) > 0 else "none")
        has_access = bool(chosen.get("has_app_access") is True or status in {"trialing", "active", "paid"} or PLAN_RANK.get(plan, 0) > 0)

        return {
            "success": True,
            "data": {
                "plan": plan,
                "subscription_plan": plan,
                "plan_name": PLAN_NAME.get(plan, "No plan"),
                "plan_price": PLAN_PRICE.get(plan, 0),
                "plan_price_label": limits["price_label"],
                "country": country,
                "billing_country": country,
                "currency": limits["currency"],
                "tax_label": limits["tax_label"],
                "limits": limits,
                "has_app_access": has_access,
                "subscription_status": status,
                "stripe_customer_id": chosen.get("stripe_customer_id"),
                "stripe_subscription_id": chosen.get("stripe_subscription_id"),
                "matched_docs": len(docs),
                "status_source_id": _json_safe(chosen.get("_id") or chosen.get("id")),
            },
        }

    router.churvox_subscription_status_fix_installed = True
