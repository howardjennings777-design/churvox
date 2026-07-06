from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()

PLAN_RANK = {
    "": 0,
    "none": 0,
    "trial": 1,
    "start": 1,
    "solo": 1,
    "crew": 2,
    "team": 2,
    "operator": 3,
    "pro": 3,
    "command": 4,
    "enterprise": 4,
}

FEATURE_MIN = {
    "today": "start",
    "jobs": "start",
    "clients": "start",
    "quotes": "start",
    "invoices": "start",
    "settings": "start",
    "workers": "crew",
    "team": "crew",
    "messages": "crew",
    "command": "operator",
    "payroll": "command",
    "xero": "accounting",
    "payments": "operator",
}


def now():
    return datetime.now(timezone.utc)


def text(value, fallback=""):
    try:
        value = str(value or "").strip()
        return value if value else fallback
    except Exception:
        return fallback


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
        clean = {}
        for key, item in value.items():
            if key == "password_hash":
                continue
            if key == "_id":
                clean["id"] = safe(item)
            else:
                clean[key] = safe(item)
        return clean
    if isinstance(value, list):
        return [safe(item) for item in value]
    return value


def user_id(user):
    return text(user.get("id") or user.get("_id") or user.get("user_id"))


def business_id(user):
    return text(user.get("business_id") or user.get("owner_business_id") or user_id(user))


def normalize_plan(value):
    plan = lower(value)
    if "command" in plan or "enterprise" in plan:
        return "command"
    if "operator" in plan or plan in {"pro", "professional"}:
        return "operator"
    if "crew" in plan or "team" in plan:
        return "crew"
    if "start" in plan or "solo" in plan or "trial" in plan or "basic" in plan:
        return "start"
    return "none"


async def owner_doc(db, user, ObjectId):
    bid = business_id(user)
    checks = []
    if bid:
        checks.append({"id": bid})
        checks.append({"business_id": bid, "role": {"$in": ["employer", "admin", "owner"]}})
        try:
            checks.append({"_id": ObjectId(bid)})
        except Exception:
            pass
    email = lower(user.get("email"))
    if email:
        checks.append({"email": email})
    for query in checks:
        try:
            row = await db.users.find_one(query)
            if row:
                return row
        except Exception:
            pass
    return user


async def plan_for(db, user, ObjectId):
    direct = normalize_plan(user.get("plan") or user.get("plan_key") or user.get("selected_plan") or user.get("tier") or user.get("subscription_plan"))
    if direct != "none":
        return direct
    owner = await owner_doc(db, user, ObjectId)
    owner_plan = normalize_plan((owner or {}).get("plan") or (owner or {}).get("plan_key") or (owner or {}).get("selected_plan") or (owner or {}).get("subscription_plan"))
    if owner_plan != "none":
        return owner_plan
    if user.get("hasAppAccess") or user.get("has_app_access") or user.get("trial_active"):
        return "start"
    return "none"


def addon_enabled(user, owner, name):
    blob = " ".join([
        lower(user.get("addons")), lower(user.get("features")), lower(user.get("enabled_features")), lower(user.get("accounting_sync")), lower(user.get("xero_addon")),
        lower((owner or {}).get("addons")), lower((owner or {}).get("features")), lower((owner or {}).get("enabled_features")), lower((owner or {}).get("accounting_sync")), lower((owner or {}).get("xero_addon")),
    ])
    if name == "accounting":
        return any(word in blob for word in ["accounting", "xero", "myob", "sync", "true", "enabled"])
    return False


def allowed(plan, feature, accounting=False):
    need = FEATURE_MIN.get(feature, "start")
    if need == "accounting":
        return accounting or PLAN_RANK.get(plan, 0) >= PLAN_RANK["command"]
    return PLAN_RANK.get(plan, 0) >= PLAN_RANK.get(need, 1)


def remove_route(app, path, method):
    try:
        app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method.upper() in set(getattr(r, "methods", set()) or set()))]
    except Exception:
        pass


def oid_query(value, ObjectId):
    clauses = [{"id": text(value)}]
    try:
        clauses.append({"_id": ObjectId(text(value))})
    except Exception:
        pass
    return clauses


async def docs(collection, query, limit=100):
    rows = []
    try:
        cursor = collection.find(query).sort("created_at", -1).limit(limit)
        async for row in cursor:
            rows.append(safe(row))
    except Exception:
        rows = []
    return rows


def record_title(row):
    return text(row.get("title") or row.get("name") or row.get("job_title") or row.get("invoice_number") or row.get("number") or row.get("subject") or row.get("summary") or "Record")


def record_amount(row):
    for key in ["amount", "total", "price", "subtotal", "invoice_total"]:
        try:
            amount = float(row.get(key) or 0)
            if amount > 0:
                return amount
        except Exception:
            pass
    return 0


def approval_from(row, kind, detail):
    rid = text(row.get("id") or row.get("_id") or row.get("job_id") or row.get("invoice_id") or row.get("quote_id") or record_title(row))
    return safe({
        "id": f"{kind}:{rid}",
        "source_id": rid,
        "kind": kind,
        "type": detail.get("type", "Owner check"),
        "title": record_title(row),
        "summary": detail.get("summary", "Owner review required."),
        "status": "waiting",
        "client_name": row.get("client_name") or row.get("customer_name") or row.get("client") or "",
        "amount": record_amount(row),
        "record": row,
        "created_at": row.get("created_at") or now(),
    })


async def build_actions(db, user):
    bid = business_id(user)
    actions = []
    try:
        existing = await docs(db.approved_notifications, {"business_id": bid}, 20)
        for row in existing:
            actions.append(approval_from(row, "notification", {"type": row.get("type") or "Owner check", "summary": row.get("message") or row.get("summary") or "Owner review required."}))
    except Exception:
        pass
    try:
        invoices = await docs(db.invoices, {"business_id": bid}, 50)
        for row in invoices:
            st = lower(row.get("status"))
            if st in {"draft", "ready", "due", "overdue"}:
                actions.append(approval_from(row, "invoice", {"type": "Invoice review", "summary": "Draft invoice needs owner approval before sending or sync."}))
    except Exception:
        pass
    try:
        quotes = await docs(db.quotes, {"business_id": bid}, 50)
        for row in quotes:
            st = lower(row.get("status"))
            if st in {"draft", "ready", "sent"}:
                actions.append(approval_from(row, "quote", {"type": "Quote review", "summary": "Quote needs owner check or follow-up."}))
    except Exception:
        pass
    try:
        jobs = await docs(db.jobs, {"business_id": bid}, 60)
        for row in jobs:
            st = lower(row.get("status") or row.get("job_status"))
            if st in {"needs_check", "issue", "blocked"} or row.get("needs_attention"):
                actions.append(approval_from(row, "job", {"type": "Job issue", "summary": "Worker or job record needs owner decision."}))
    except Exception:
        pass
    return actions[:50]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    Body = getattr(module, "Body", None)
    HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_current_user or ObjectId is None or Request is None or Body is None or HTTPException is None:
        return

    async def feature_access(request: Request):
        user = await get_current_user(request)
        owner = await owner_doc(db, user, ObjectId)
        plan = await plan_for(db, user, ObjectId)
        accounting = addon_enabled(user, owner, "accounting") or plan == "command"
        features = {key: allowed(plan, key, accounting) for key in FEATURE_MIN}
        return safe({"success": True, "plan": plan, "accounting": accounting, "features": features})

    async def team_list(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        items = await docs(db.users, {"business_id": bid, "role": {"$in": ["worker", "staff", "employee", "subcontractor", "payroll"]}}, 250)
        return {"success": True, "workers": items, "team": items, "items": items, "data": items}

    async def team_save(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        payload = await request.json()
        now_at = now()
        email = lower(payload.get("email"))
        doc = {
            "business_id": bid,
            "name": text(payload.get("name") or payload.get("full_name") or email or "Worker"),
            "email": email,
            "phone": text(payload.get("phone") or payload.get("mobile")),
            "role": lower(payload.get("role") or "worker") or "worker",
            "access": text(payload.get("access") or payload.get("access_level") or "Worker app"),
            "status": text(payload.get("status") or "Not invited"),
            "app_status": text(payload.get("app_status") or "Not invited"),
            "notes": text(payload.get("notes")),
            "updated_at": now_at,
        }
        if email:
            await db.users.update_one({"business_id": bid, "email": email}, {"$set": doc, "$setOnInsert": {"created_at": now_at}}, upsert=True)
            saved = await db.users.find_one({"business_id": bid, "email": email})
        else:
            doc["created_at"] = now_at
            result = await db.users.insert_one(doc)
            saved = await db.users.find_one({"_id": result.inserted_id})
        return {"success": True, "worker": safe(saved), "data": safe(saved)}

    async def update_team(member_id: str, request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        payload = await request.json()
        payload["updated_at"] = now()
        result = await db.users.update_one({"business_id": bid, "$or": oid_query(member_id, ObjectId)}, {"$set": payload})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Team member not found")
        row = await db.users.find_one({"business_id": bid, "$or": oid_query(member_id, ObjectId)})
        return {"success": True, "worker": safe(row), "data": safe(row)}

    async def messages_list(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        items = []
        try:
            items.extend(await docs(db.notifications, {"business_id": bid}, 80))
        except Exception:
            pass
        try:
            items.extend(await docs(db.worker_messages, {"business_id": bid}, 80))
        except Exception:
            pass
        try:
            items.extend(await docs(db.worker_field_slips, {"business_id": bid}, 80))
        except Exception:
            pass
        items = sorted(items, key=lambda r: text(r.get("created_at")), reverse=True)[:100]
        return {"success": True, "messages": items, "items": items, "data": items}

    async def message_save(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        payload = await request.json()
        doc = dict(payload or {})
        doc.update({"business_id": bid, "source": doc.get("source") or "owner_app", "created_at": now(), "updated_at": now()})
        result = await db.worker_messages.insert_one(doc)
        saved = await db.worker_messages.find_one({"_id": result.inserted_id})
        return {"success": True, "message": safe(saved), "data": safe(saved)}

    async def actions(request: Request):
        user = await get_current_user(request)
        plan = await plan_for(db, user, ObjectId)
        if not allowed(plan, "command"):
            return {"success": True, "actions": [], "items": [], "data": [], "locked": True, "required_plan": "operator"}
        items = await build_actions(db, user)
        return {"success": True, "actions": items, "items": items, "data": items}

    async def execute(request: Request):
        user = await get_current_user(request)
        plan = await plan_for(db, user, ObjectId)
        if not allowed(plan, "command"):
            raise HTTPException(status_code=403, detail="Command approvals require Operator or Command")
        payload = await request.json()
        doc = {
            "business_id": business_id(user),
            "owner_id": user_id(user),
            "action": text(payload.get("action") or "approve"),
            "kind": text(payload.get("kind") or payload.get("type") or "command_record"),
            "item": safe(payload.get("item") or payload),
            "created_at": now(),
            "updated_at": now(),
        }
        await db.command_activity.insert_one(doc)
        return {"success": True, "saved": True, "activity": safe(doc)}

    async def execute_id(action_id: str, request: Request):
        payload = await request.json()
        payload["action_id"] = action_id
        request._json = payload
        return await execute(request)

    routes = [
        ("/api/logic/feature-access", feature_access, "GET"),
        ("/api/team", team_list, "GET"), ("/api/team/workers", team_list, "GET"), ("/api/workers", team_list, "GET"),
        ("/api/team", team_save, "POST"), ("/api/team/workers", team_save, "POST"), ("/api/workers", team_save, "POST"),
        ("/api/messages", messages_list, "GET"), ("/api/messages", message_save, "POST"),
        ("/api/ai/actions", actions, "GET"), ("/api/command/actions", actions, "GET"), ("/api/command/approvals", actions, "GET"),
        ("/api/command/execute-approved", execute, "POST"),
    ]
    for path, endpoint, method in routes:
        remove_route(app, path, method)
        app.add_api_route(path, endpoint, methods=[method])
    for path in ["/api/team/{member_id}", "/api/team/workers/{member_id}", "/api/workers/{member_id}"]:
        remove_route(app, path, "PATCH")
        app.add_api_route(path, update_team, methods=["PATCH"])
    remove_route(app, "/api/command/approvals/{action_id}/execute", "POST")
    app.add_api_route("/api/command/approvals/{action_id}/execute", execute_id, methods=["POST"])
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


if not any(isinstance(f, Finder) for f in sys.meta_path):
    sys.meta_path.insert(0, Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
