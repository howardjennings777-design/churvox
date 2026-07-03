from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from bson import ObjectId
except Exception:  # pragma: no cover
    ObjectId = None

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse

PLAN_ALIAS = {
    "start": "solo", "solo": "solo",
    "crew": "team", "team": "team",
    "operator": "pro", "pro": "pro",
    "command": "enterprise", "enterprise": "enterprise",
}
PLAN_RANK = {"": 0, "none": 0, "solo": 1, "team": 2, "pro": 3, "enterprise": 4}
UI_PLAN = {"solo": "start", "team": "crew", "pro": "operator", "enterprise": "command"}
PLAN_LIMITS = {
    "solo": {"clients": 250, "jobsPerMonth": 50, "activeTeamMembers": 1, "aiOperatorActions": 25},
    "team": {"clients": 1000, "jobsPerMonth": 150, "activeTeamMembers": 5, "aiOperatorActions": 100},
    "pro": {"clients": 3000, "jobsPerMonth": 500, "activeTeamMembers": 15, "aiOperatorActions": 500},
    "enterprise": {"clients": 10000, "jobsPerMonth": 1500, "activeTeamMembers": 50, "aiOperatorActions": 2000},
}
TRIAL_DAYS = 14
INSTALLED = False

PUBLIC_API_PREFIXES = (
    "/api/auth",
    "/api/billing",
    "/api/admin",
    "/api/lifecycle",
    "/api/platform/visit",
    "/api/support",
    "/api/invite",
    "/api/health",
    "/api/public",
    "/api/client-portal",
)

BASE_API_PREFIXES = (
    "/api/jobs",
    "/api/clients",
    "/api/quotes",
    "/api/invoices",
    "/api/settings",
    "/api/business",
    "/api/command",
    "/api/notifications",
)

TEAM_PREFIXES = (
    "/api/team",
    "/api/workers",
    "/api/worker",
    "/api/photos",
    "/api/time",
    "/api/timesheets",
    "/api/messages",
    "/api/dispatch",
    "/api/routes",
    "/api/areas",
)

OPERATOR_PREFIXES = (
    "/api/operator",
    "/api/automation",
    "/api/ai",
    "/api/admin-recovery",
    "/api/follow-up",
    "/api/reviews",
    "/api/slips",
    "/api/payments/on-site",
    "/api/stripe/terminal",
    "/api/terminal",
)

COMMAND_PREFIXES = (
    "/api/payroll",
    "/api/reports",
    "/api/exports",
    "/api/profit",
    "/api/assets",
    "/api/inventory",
    "/api/roles",
)

ACCOUNTING_PREFIXES = (
    "/api/xero",
    "/api/myob",
    "/api/accounting",
)


def utcnow():
    return datetime.now(timezone.utc)


def safe_text(value: Any, fallback: str = "") -> str:
    try:
        text = str(value or "").strip()
        return text if text else fallback
    except Exception:
        return fallback


def normalize_plan(value: Any) -> str:
    raw = safe_text(value).lower()
    return PLAN_ALIAS.get(raw, raw if raw in PLAN_RANK else "none")


def parse_dt(value: Any):
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except Exception:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def json_safe(value: Any):
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if ObjectId is not None and isinstance(value, ObjectId):
        return str(value)
    return value


def truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return safe_text(value).lower() in {"1", "true", "yes", "active", "enabled"}


def role_of(user_doc: dict) -> str:
    return safe_text(user_doc.get("role") or user_doc.get("user_role") or user_doc.get("account_role")).lower()


def is_worker_or_payroll(user_doc: dict) -> bool:
    role = role_of(user_doc)
    return role in {"worker", "payroll", "payroll_user"} or truthy(user_doc.get("is_worker")) or bool(user_doc.get("worker_id"))


def trial_expired(user_doc: dict) -> bool:
    dt = parse_dt(user_doc.get("trial_ends_at"))
    return bool(dt and dt < utcnow())


def owner_has_access(owner_doc: dict) -> bool:
    if not owner_doc:
        return False
    if truthy(owner_doc.get("is_platform_owner")) or truthy(owner_doc.get("is_admin")):
        return True
    plan = normalize_plan(owner_doc.get("plan") or owner_doc.get("subscription_plan") or owner_doc.get("billing_plan"))
    if PLAN_RANK.get(plan, 0) <= 0:
        return False
    status = safe_text(owner_doc.get("subscription_status") or owner_doc.get("billing_status") or owner_doc.get("stripe_status")).lower()
    if status in {"active", "paid"}:
        return True
    if status == "tester_free":
        return not trial_expired(owner_doc)
    if status == "trialing":
        return not trial_expired(owner_doc)
    return False


def accounting_allowed(owner_doc: dict) -> bool:
    plan = normalize_plan(owner_doc.get("plan"))
    return plan == "enterprise" or truthy(owner_doc.get("xero_addon_active")) or truthy(owner_doc.get("accounting_sync_addon_active")) or truthy(owner_doc.get("accounting_sync_active"))


def business_id_for(user_doc: dict) -> str:
    return safe_text(user_doc.get("business_id") or user_doc.get("owner_business_id") or user_doc.get("_id") or user_doc.get("id"))


def object_id(value: Any):
    if ObjectId is None:
        return value
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def variants(value: Any):
    text = safe_text(value)
    out = [text]
    oid = object_id(text)
    if oid is not None:
        out.append(oid)
    return out


async def current_user_doc(module, request: Request):
    get_current_user = getattr(module, "get_current_user", None)
    db = getattr(module, "db", None)
    if not get_current_user or db is None:
        return None, None
    current = await get_current_user(request)
    uid = safe_text(current.get("id") or current.get("_id"))
    doc = None
    oid = object_id(uid)
    if oid is not None:
        doc = await db.users.find_one({"_id": oid})
    if not doc and current.get("email"):
        doc = await db.users.find_one({"email": safe_text(current.get("email")).lower()})
    return current, doc


async def owner_doc_for(module, user_doc: dict):
    db = getattr(module, "db", None)
    if db is None or not user_doc:
        return user_doc
    if not is_worker_or_payroll(user_doc):
        return user_doc
    bid = business_id_for(user_doc)
    if not bid:
        return user_doc
    query = {
        "$or": [
            {"_id": object_id(bid)} if object_id(bid) is not None else {"_id": bid},
            {"business_id": {"$in": variants(bid)}, "role": {"$in": ["employer", "owner", "admin"]}},
        ]
    }
    return await db.users.find_one(query) or user_doc


def required_plan_for(path: str, method: str, owner_doc: dict):
    path = path.lower()
    if path.startswith(PUBLIC_API_PREFIXES):
        return None
    if path.startswith(ACCOUNTING_PREFIXES):
        return "accounting"
    if path.startswith(COMMAND_PREFIXES):
        return "enterprise"
    if path.startswith(OPERATOR_PREFIXES) or path in {"/api/command/recovery-sweep", "/api/command/admin-sweep"}:
        return "pro"
    if path.startswith(TEAM_PREFIXES):
        return "team"
    if path.startswith(BASE_API_PREFIXES):
        return "solo"
    return "solo"


async def count_docs(db, collection_name: str, business_id: str, extra: dict | None = None) -> int:
    coll = getattr(db, collection_name)
    ors = [
        {"business_id": {"$in": variants(business_id)}},
        {"contractor_id": {"$in": variants(business_id)}},
        {"owner_business_id": {"$in": variants(business_id)}},
    ]
    query = {"$or": ors}
    if extra:
        query.update(extra)
    try:
        return int(await coll.count_documents(query))
    except Exception:
        return 0


async def quota_error(module, path: str, method: str, owner_doc: dict):
    if method.upper() not in {"POST", "PUT"}:
        return None
    db = getattr(module, "db", None)
    if db is None or not owner_doc:
        return None
    plan = normalize_plan(owner_doc.get("plan"))
    limits = PLAN_LIMITS.get(plan) or PLAN_LIMITS["solo"]
    bid = business_id_for(owner_doc)
    if not bid:
        return None
    p = path.lower()
    if p in {"/api/clients", "/api/clients/"}:
        count = await count_docs(db, "clients", bid)
        if count >= int(limits["clients"]):
            return f"{plan_label(plan)} includes up to {limits['clients']} clients. Upgrade to add more."
    if p in {"/api/jobs", "/api/jobs/"}:
        month_start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        count = await count_docs(db, "jobs", bid, {"created_at": {"$gte": month_start}})
        if count >= int(limits["jobsPerMonth"]):
            return f"{plan_label(plan)} includes up to {limits['jobsPerMonth']} jobs per month. Upgrade to add more."
    if p.startswith("/api/team") or p.startswith("/api/workers"):
        count = await count_docs(db, "users", bid, {"role": {"$in": ["worker", "staff", "subcontractor"]}, "status": {"$ne": "inactive"}})
        if count >= int(limits["activeTeamMembers"]):
            return f"{plan_label(plan)} includes up to {limits['activeTeamMembers']} active team member(s). Upgrade to add more."
    return None


def plan_label(plan: str) -> str:
    return {"solo": "Start", "team": "Crew", "pro": "Operator", "enterprise": "Command"}.get(normalize_plan(plan), "No plan")


def remove_route(app, path: str, method: str):
    try:
        app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
    except Exception:
        pass


def token_user_id(module, token: str):
    token = safe_text(token).replace("Bearer ", "")
    if not token:
        return ""
    jwt = getattr(module, "jwt", None)
    secret = getattr(module, "JWT_SECRET", None)
    algorithm = getattr(module, "JWT_ALGORITHM", "HS256")
    if not jwt or not secret:
        return ""
    payload = jwt.decode(token, secret, algorithms=[algorithm])
    return safe_text(payload.get("sub") or payload.get("id") or payload.get("user_id"))


def frontend_url(module):
    return safe_text(getattr(module, "FRONTEND_URL", ""), "https://www.churvox.com").rstrip("/")


async def start_no_card_trial(module, request: Request, token: str, plan: str, ui_plan: str, country: str, email: str):
    db = getattr(module, "db", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Billing database unavailable")
    uid = token_user_id(module, token) or ""
    oid = object_id(uid)
    if oid is None:
        raise HTTPException(status_code=401, detail="Login expired. Please sign in again.")
    user = await db.users.find_one({"_id": oid})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    key = normalize_plan(plan or ui_plan)
    if key not in PLAN_RANK or PLAN_RANK[key] <= 0:
        raise HTTPException(status_code=400, detail="Choose Start, Crew, Operator or Command")

    now = utcnow()
    current_status = safe_text(user.get("subscription_status") or user.get("billing_status") or "none").lower()
    current_trial_start = parse_dt(user.get("trial_started_at"))
    current_trial_end = parse_dt(user.get("trial_ends_at"))
    clean_country = safe_text(country or user.get("billing_country") or user.get("country"), "NZ").upper()
    clean_ui_plan = UI_PLAN.get(key, key)

    if current_status in {"active", "paid"}:
        return key, current_trial_end, "paid_active"

    if current_trial_start or current_trial_end:
        if current_status == "trialing" and current_trial_end and current_trial_end > now:
            await db.users.update_one({"_id": oid}, {"$set": {
                "plan": key,
                "ui_plan": clean_ui_plan,
                "subscription_plan": key,
                "billing_plan": key,
                "billing_country": clean_country,
                "country": clean_country,
                "billing_lock_reason": "trial_active",
                "updated_at": now,
            }})
            return key, current_trial_end, "trial_active"

        await db.users.update_one({"_id": oid}, {"$set": {
            "subscription_status": "payment_required",
            "billing_status": "payment_required",
            "billing_lock_reason": "payment_required",
            "plan": key,
            "ui_plan": clean_ui_plan,
            "subscription_plan": key,
            "billing_plan": key,
            "billing_country": clean_country,
            "country": clean_country,
            "updated_at": now,
        }})
        return key, current_trial_end, "trial_expired"

    trial_end = now + timedelta(days=TRIAL_DAYS)
    update = {
        "plan": key,
        "ui_plan": clean_ui_plan,
        "subscription_plan": key,
        "billing_plan": key,
        "subscription_status": "trialing",
        "trial_started_at": now,
        "trial_ends_at": trial_end,
        "billing_lock_reason": "trial_active",
        "billing_country": clean_country,
        "country": clean_country,
        "trial_days": TRIAL_DAYS,
        "updated_at": now,
    }
    await db.users.update_one({"_id": oid}, {"$set": update})
    return key, trial_end, "trial_started"


def install(module):
    global INSTALLED
    if INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    if app is None or db is None:
        return

    @app.middleware("http")
    async def churvox_plan_trial_guard(request: Request, call_next):
        path = request.url.path or ""
        method = request.method.upper()
        if method == "OPTIONS" or not path.startswith("/api") or path.startswith(PUBLIC_API_PREFIXES):
            return await call_next(request)
        try:
            current, user_doc = await current_user_doc(module, request)
            owner_doc = await owner_doc_for(module, user_doc)
        except Exception:
            return await call_next(request)
        if not owner_doc:
            return await call_next(request)
        if not owner_has_access(owner_doc):
            return JSONResponse(status_code=402, content={
                "success": False,
                "requires_plan": True,
                "trial_expired": trial_expired(owner_doc),
                "plan": normalize_plan(owner_doc.get("plan")),
                "subscription_status": safe_text(owner_doc.get("subscription_status")),
                "trial_ends_at": json_safe(owner_doc.get("trial_ends_at")),
                "detail": "Your 14-day trial has ended or no active plan is selected. Choose a paid plan to continue.",
            })
        required = required_plan_for(path, method, owner_doc)
        plan = normalize_plan(owner_doc.get("plan"))
        if required == "accounting":
            if not accounting_allowed(owner_doc):
                return JSONResponse(status_code=403, content={"success": False, "requires_plan": "accounting_sync", "detail": "Accounting sync requires Command or the Accounting Sync Add-on."})
        elif required and PLAN_RANK.get(plan, 0) < PLAN_RANK.get(required, 0):
            return JSONResponse(status_code=403, content={"success": False, "requires_plan": required, "current_plan": plan, "detail": f"This feature requires {plan_label(required)}."})
        msg = await quota_error(module, path, method, owner_doc)
        if msg:
            return JSONResponse(status_code=403, content={"success": False, "plan_limit_reached": True, "detail": msg})
        return await call_next(request)

    async def billing_subscription_status(request: Request):
        current, user_doc = await current_user_doc(module, request)
        owner_doc = await owner_doc_for(module, user_doc)
        if not owner_doc:
            raise HTTPException(status_code=401, detail="Not logged in")
        plan = normalize_plan(owner_doc.get("plan"))
        trial_end = parse_dt(owner_doc.get("trial_ends_at"))
        days_left = None
        if trial_end:
            days_left = max(0, int((trial_end - utcnow()).total_seconds() // 86400) + (1 if (trial_end - utcnow()).total_seconds() % 86400 > 0 else 0))
        return json_safe({
            "success": True,
            "plan": plan,
            "plan_name": plan,
            "ui_plan": owner_doc.get("ui_plan") or UI_PLAN.get(plan, plan),
            "subscription_status": owner_doc.get("subscription_status") or "none",
            "trial_started_at": owner_doc.get("trial_started_at"),
            "trial_ends_at": owner_doc.get("trial_ends_at"),
            "trial_expired": trial_expired(owner_doc),
            "trial_days_left": days_left,
            "trial_days": TRIAL_DAYS,
            "has_app_access": owner_has_access(owner_doc),
            "billing_lock_reason": owner_doc.get("billing_lock_reason") or "",
            "stripe_customer_id": owner_doc.get("stripe_customer_id") or "",
            "stripe_subscription_id": owner_doc.get("stripe_subscription_id") or "",
            "billing_country": owner_doc.get("billing_country") or owner_doc.get("country") or "NZ",
            "country": owner_doc.get("country") or owner_doc.get("billing_country") or "NZ",
            "xero_addon_active": truthy(owner_doc.get("xero_addon_active")) or truthy(owner_doc.get("accounting_sync_addon_active")),
            "limits": PLAN_LIMITS.get(plan, {}),
        })

    async def start_checkout_form(request: Request):
        form = await request.form()
        token = safe_text(form.get("token") or request.headers.get("Authorization") or request.cookies.get("access_token"))
        plan = safe_text(form.get("plan") or form.get("ui_plan"))
        ui_plan = safe_text(form.get("ui_plan") or plan)
        country = safe_text(form.get("country") or form.get("billing_country") or "NZ").upper()
        email = safe_text(form.get("email"))
        key, trial_end, state = await start_no_card_trial(module, request, token, plan, ui_plan, country, email)
        if state == "trial_expired":
            url = f"{frontend_url(module)}/plans?trial=expired&payment_required=1&plan={key}"
        elif state == "paid_active":
            url = f"{frontend_url(module)}/plans?paid_account=1&plan={key}"
        elif state == "trial_active":
            url = f"{frontend_url(module)}/setup-guide?first_setup=1&trial_active=1&plan={key}"
        else:
            url = f"{frontend_url(module)}/setup-guide?first_setup=1&trial_started=1&checkout=saved&plan={key}"
        return RedirectResponse(url=url, status_code=303)

    remove_route(app, "/api/billing/subscription-status", "GET")
    remove_route(app, "/api/billing/start-checkout-form", "POST")
    app.add_api_route("/api/billing/subscription-status", billing_subscription_status, methods=["GET"])
    app.add_api_route("/api/billing/start-checkout-form", start_checkout_form, methods=["POST"])
    INSTALLED = True
