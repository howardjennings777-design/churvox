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


def low(value):
    return text(value).lower()


def compact(value):
    return "".join(ch for ch in low(value) if ch.isalnum())


def user_id(user):
    return text((user or {}).get("id") or (user or {}).get("_id") or (user or {}).get("user_id"))


def business_id(user):
    return text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("contractor_id") or user_id(user) or (user or {}).get("email"))


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {value for value in values if value}
    final_values = list(values)
    for value in list(values):
        try:
            final_values.append(ObjectId(value))
        except Exception:
            pass
    email = low((user or {}).get("email"))
    ors = [
        {"business_id": {"$in": final_values}},
        {"businessId": {"$in": final_values}},
        {"contractor_id": {"$in": final_values}},
        {"owner_business_id": {"$in": final_values}},
        {"owner_id": {"$in": final_values}},
        {"user_id": {"$in": final_values}},
        {"created_by": {"$in": final_values}},
        {"created_by_id": {"$in": final_values}},
        {"employer_id": {"$in": final_values}},
        {"account_id": {"$in": final_values}},
    ]
    if email:
        ors.extend([{"owner_email": email}, {"created_by_email": email}, {"business_email": email}, {"email": email}])
    return {"$or": ors}


def worker_scope(user, ObjectId):
    base = scope(user, ObjectId)
    wid = text((user or {}).get("worker_id") or user_id(user))
    email = low((user or {}).get("email"))
    ors = [{"worker_id": wid}, {"to_worker_id": wid}, {"assigned_worker_id": wid}, {"worker_user_id": wid}]
    if email:
        ors.extend([{"worker_email": email}, {"to_worker_email": email}, {"assigned_worker_email": email}])
    return {"$and": [base, {"$or": ors}]}


def remove_route(app, path, method):
    try:
        app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set()))]
    except Exception:
        pass


def status(row):
    return compact((row or {}).get("status") or (row or {}).get("job_status") or (row or {}).get("workflow_status") or (row or {}).get("state") or (row or {}).get("priority") or (row or {}).get("app_status") or "")


def is_closed(row):
    return any(word in status(row) for word in ["complete", "completed", "done", "finished", "paid", "converted", "cancelled", "canceled", "archived", "declined", "parked", "closed", "sent"])


def is_attention_job(row):
    if is_closed(row):
        return False
    s = status(row)
    assigned = low((row or {}).get("assigned_worker_name") or (row or {}).get("worker_name") or (row or {}).get("worker") or (row or {}).get("assigned_to"))
    if any(word in s for word in ["late", "overdue", "issue", "problem", "blocked", "needscheck", "missing", "failed", "cannot"]):
        return True
    if assigned in {"", "unassigned", "no worker", "none", "null"}:
        return True
    return False


def is_attention_worker(row):
    hay = compact((row or {}).get("status")) + compact((row or {}).get("app_status")) + compact((row or {}).get("message_status")) + compact((row or {}).get("messages")) + compact((row or {}).get("clock_status"))
    return any(word in hay for word in ["late", "issue", "problem", "help", "offline", "blocked", "noresponse", "noupdate", "failed", "cannot"])


def is_attention_quote(row):
    if is_closed(row):
        return False
    return any(word in status(row) for word in ["needscheck", "needsapproval", "ownerreview", "overdue", "followup", "waitingcustomer", "problem", "blocked"])


def is_attention_invoice(row):
    if is_closed(row):
        return False
    return any(word in status(row) for word in ["overdue", "unpaid", "failed", "needscheck", "needsapproval", "ownerreview", "paymentissue", "blocked"])


def message_body(row):
    return text((row or {}).get("message") or (row or {}).get("body") or (row or {}).get("detail") or (row or {}).get("text") or (row or {}).get("subject") or (row or {}).get("title") or (row or {}).get("reply") or (row or {}).get("draft"))


def message_kind(row):
    return compact((row or {}).get("type") or (row or {}).get("kind") or (row or {}).get("event_type") or (row or {}).get("channel") or (row or {}).get("category") or (row or {}).get("source") or "")


def is_real_message(row):
    if not message_body(row):
        return False
    kind = message_kind(row)
    if any(word in kind for word in ["approval", "command", "invoice", "quote", "jobstarted", "jobstart", "jobpaused", "jobpause", "jobresumed", "jobresume", "jobcomplete", "jobcompleted", "payment", "system", "notification", "action", "smart"]):
        if not any(word in kind for word in ["message", "reply", "chat", "sms", "email"]):
            return False
    return any(word in kind for word in ["message", "reply", "chat", "sms", "email"]) or bool((row or {}).get("message_id") or (row or {}).get("thread_id") or (row or {}).get("conversation_id") or (row or {}).get("reply") or (row or {}).get("drafted_reply"))


def is_unread_message(row):
    if not is_real_message(row):
        return False
    if (row or {}).get("read") is True or (row or {}).get("is_read") is True or (row or {}).get("seen") is True or (row or {}).get("opened") is True or (row or {}).get("acknowledged") is True:
        return False
    if (row or {}).get("unread") is True or (row or {}).get("is_unread") is True:
        return True
    return any(word in status(row) for word in ["unread", "newmessage", "newreply", "replyneeded", "needsreply", "messagewaiting"])


def office_to_worker(row):
    direction = compact((row or {}).get("direction") or (row or {}).get("from_role") or (row or {}).get("source_role") or "")
    if "workertooffice" in direction:
        return False
    if any(word in direction for word in ["officetoworker", "ownertoworker", "admintoworker"]):
        return True
    sender = compact((row or {}).get("from") or (row or {}).get("sender") or (row or {}).get("source") or "")
    return any(word in sender for word in ["office", "owner", "admin", "command"])


def real_command_waiting(row):
    if (row or {}).get("auto_generated") is True or (row or {}).get("fake") is True:
        return False
    if message_kind(row) == "smartaction" or compact((row or {}).get("id")).startswith("smart"):
        return False
    if is_closed(row):
        return False
    return (row or {}).get("requires_owner_approval") is True or any(word in status(row) for word in ["waitingowner", "waitingownerreview", "pending", "needsapproval", "ownerreview"])


async def find_rows(db, collection, query, limit=300):
    out = []
    try:
        cursor = getattr(db, collection).find(query).sort("created_at", -1).limit(limit)
        async for row in cursor:
            out.append(row)
    except Exception:
        pass
    return out


async def count_rows(db, collection, query, predicate, limit=300):
    rows = await find_rows(db, collection, query, limit)
    return sum(1 for row in rows if predicate(row))


def build_response(owner_counts, worker_counts=None):
    return {
        "success": True,
        "counts": owner_counts,
        "owner": owner_counts,
        "worker": worker_counts or {"jobs": 0, "messages": 0},
        "source": "trusted_nav_attention_counts",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or get_current_user is None or ObjectId is None or HTTPException is None:
        return

    async def owner_nav_counts(request):
        user = await get_current_user(request)
        base = scope(user, ObjectId)
        owner_counts = {
            "command": await count_rows(db, "ai_approval_actions", base, real_command_waiting, 200) + await count_rows(db, "worker_field_slips", {"$and": [base, {"status": {"$in": ["waiting_owner", "waiting_owner_review", "pending", "new"]}}]}, lambda row: True, 200),
            "jobs": await count_rows(db, "jobs", base, is_attention_job, 300),
            "workers": await count_rows(db, "users", {"$and": [base, {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}, is_attention_worker, 200),
            "messages": await count_rows(db, "worker_messages", base, is_unread_message, 200) + await count_rows(db, "messages", base, is_unread_message, 200) + await count_rows(db, "customer_messages", base, is_unread_message, 100) + await count_rows(db, "client_messages", base, is_unread_message, 100),
            "quotes": await count_rows(db, "quotes", base, is_attention_quote, 200),
            "invoices": await count_rows(db, "invoices", base, is_attention_invoice, 200),
        }
        return build_response(owner_counts)

    async def worker_nav_counts(request):
        user = await get_current_user(request)
        query = worker_scope(user, ObjectId)
        worker_counts = {
            "jobs": await count_rows(db, "jobs", query, is_attention_job, 200),
            "messages": await count_rows(db, "worker_messages", query, lambda row: office_to_worker(row) and is_unread_message(row), 200),
        }
        return build_response({"command": 0, "jobs": 0, "workers": 0, "messages": 0, "quotes": 0, "invoices": 0}, worker_counts)

    for path, endpoint in [
        ("/api/nav/attention-counts", owner_nav_counts),
        ("/api/nav-counts", owner_nav_counts),
        ("/api/worker/nav/attention-counts", worker_nav_counts),
        ("/api/worker/nav-counts", worker_nav_counts),
    ]:
        remove_route(app, path, "GET")
        app.add_api_route(path, endpoint, methods=["GET"])
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
