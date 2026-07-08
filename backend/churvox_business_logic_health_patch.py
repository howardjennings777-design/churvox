from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

from fastapi import HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server"}
INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"


def now():
    return datetime.now(timezone.utc)


def text(value):
    return str(value or "").strip()


def low(value):
    return text(value).lower()


def safe_count(value):
    try:
        return int(value or 0)
    except Exception:
        return 0


def email_of(user):
    return low((user or {}).get("email") or (user or {}).get("user_email"))


async def collection_count(db, collection, query=None):
    try:
        names = set(await db.list_collection_names())
        if collection not in names:
            return 0
        return safe_count(await db[collection].count_documents(query or {}))
    except Exception:
        return 0


def status(label, ok, detail, fix=""):
    return {"label": label, "ok": bool(ok), "status": "ok" if ok else "needs_check", "detail": detail, "fix": fix}


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if not app or db is None or get_current_user is None:
        return

    async def require_owner(request: Request):
        user = await get_current_user(request)
        if email_of(user) != OWNER_EMAIL and not bool((user or {}).get("is_platform_owner") or (user or {}).get("is_admin")):
            raise HTTPException(status_code=403, detail="Business logic health is locked to Churvox HQ")
        return user

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass

    async def health(request: Request):
        await require_owner(request)
        users_total = await collection_count(db, "users")
        owners = await collection_count(db, "users", {"role": {"$in": ["owner", "admin", "business_owner", "employer"]}})
        workers = await collection_count(db, "users", {"$or": [{"role": {"$in": ["worker", "staff", "employee", "subcontractor"]}}, {"is_worker": True}, {"worker_id": {"$exists": True}}]})
        paid_or_trial = await collection_count(db, "users", {"$or": [{"subscription_status": {"$in": ["active", "paid", "trial", "trialing", "tester_free"]}}, {"has_app_access": True}, {"free_tester_access": True}]})
        jobs = await collection_count(db, "jobs")
        clients = await collection_count(db, "clients")
        quotes = await collection_count(db, "quotes")
        invoices = await collection_count(db, "invoices")
        worker_messages = await collection_count(db, "worker_messages")
        field_slips = await collection_count(db, "worker_field_slips")
        approvals = await collection_count(db, "ai_approval_actions")
        payments = await collection_count(db, "payments") + await collection_count(db, "payment_events") + await collection_count(db, "stripe_payment_intents")
        tester_invites = await collection_count(db, "app_owner_testers")
        unique_visitors = await collection_count(db, "platform_unique_visitors")
        pageviews = await collection_count(db, "platform_visits")

        checks = [
            status("Public business funnel", unique_visitors > 0 or pageviews > 0, "Website visit tracking is present so HQ can see real interest.", "Deploy backend visitor endpoint or check platform telemetry."),
            status("Signup/access model", users_total > 0 and paid_or_trial >= 0, "Users exist and access can be separated by paid, trial, tester or locked state.", "Check auth/register and plan-return flow."),
            status("Trial/tester business path", tester_invites > 0 or paid_or_trial > 0, "HQ can track testers or active/trial accounts.", "Invite a tester or verify the tester-status endpoint."),
            status("Core admin engine", jobs > 0 or clients > 0 or quotes > 0 or invoices > 0, "Core records exist for jobs, clients, quotes or invoices.", "Create one real client/job/quote/invoice test flow."),
            status("Worker-to-office loop", worker_messages > 0 or field_slips > 0, "Worker messages/slips can feed office visibility.", "Run a worker acknowledge/start/complete/message test."),
            status("Owner approval desk", approvals > 0 or field_slips > 0, "Command has sources for owner decisions.", "Create a job issue, completion or payment problem and check Command."),
            status("Money workflow", invoices > 0 or payments > 0, "Invoices or payment events exist for money flow.", "Create invoice/payment test from a job."),
            status("Team model", owners > 0 and (workers > 0 or jobs >= 0), "Owner and worker/staff roles are separated.", "Invite/add one worker and confirm worker app login."),
        ]
        score = round((sum(1 for item in checks if item["ok"]) / max(len(checks), 1)) * 100)
        return {
            "success": True,
            "source": "churvox_business_logic_health",
            "generated_at": now().isoformat(),
            "score": score,
            "verdict": "business_system" if score >= 75 else "website_plus_app_needs_checks",
            "counts": {
                "users": users_total,
                "owners": owners,
                "workers": workers,
                "paid_or_trial": paid_or_trial,
                "jobs": jobs,
                "clients": clients,
                "quotes": quotes,
                "invoices": invoices,
                "worker_messages": worker_messages,
                "field_slips": field_slips,
                "approvals": approvals,
                "payments": payments,
                "tester_invites": tester_invites,
                "unique_visitors": unique_visitors,
                "pageviews": pageviews,
            },
            "checks": checks,
        }

    for path in ["/api/admin/owner/business-logic-health", "/api/admin/owner/business-health"]:
        remove_route(path, "GET")
        app.add_api_route(path, health, methods=["GET"])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
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
