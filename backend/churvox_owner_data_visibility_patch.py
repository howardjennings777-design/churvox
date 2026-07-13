from __future__ import annotations

from datetime import datetime, timezone
import importlib, importlib.abc, importlib.machinery, sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
DATA = {"jobs": "jobs", "clients": "clients", "quotes": "quotes", "invoices": "invoices"}
OWNER_MESSAGE_DEDUPE_BUILD = "churvox-owner-message-completion-dedupe-v13-20260713"


def now(): return datetime.now(timezone.utc)
def txt(v): return str(v or "").strip()
def low(v): return txt(v).lower()
def uid(user): return txt(user.get("id") or user.get("_id") or user.get("user_id"))
def bid(user): return txt(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or uid(user))
def email(user): return low(user.get("email"))
def owner(user): return low(user.get("role")) in {"employer", "owner", "admin", "manager", "office_admin"} or user.get("is_admin") is True


def safe(v):
    if isinstance(v, datetime): return v.isoformat()
    try:
        from bson import ObjectId
        if isinstance(v, ObjectId): return str(v)
    except Exception: pass
    if isinstance(v, list): return [safe(x) for x in v]
    if isinstance(v, dict):
        out = {}
        for k, x in v.items():
            if k == "_id": out["id"] = safe(x)
            elif k != "password_hash": out[k] = safe(x)
        return out
    return v


def ids(user, ObjectId):
    values = {uid(user), bid(user)}
    values = {v for v in values if v}
    out = list(values)
    for value in list(values):
        try: out.append(ObjectId(value))
        except Exception: pass
    return out


def scope(user, ObjectId):
    values = ids(user, ObjectId)
    mail = email(user)
    ors = [
        {"business_id": {"$in": values}}, {"businessId": {"$in": values}}, {"contractor_id": {"$in": values}},
        {"owner_business_id": {"$in": values}}, {"owner_id": {"$in": values}}, {"user_id": {"$in": values}},
        {"created_by": {"$in": values}}, {"created_by_id": {"$in": values}}, {"employer_id": {"$in": values}},
    ]
    if mail:
        ors += [{"owner_email": mail}, {"email": mail}, {"created_by_email": mail}]
    return {"$or": ors}


def remove(app, path, method):
    try: app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method in set(getattr(r, "methods", set()) or set()))]
    except Exception: pass


def record_id_query(value, ObjectId):
    raw = txt(value)
    ors = [{"id": raw}, {"job_id": raw}, {"client_id": raw}, {"quote_id": raw}, {"invoice_id": raw}]
    try: ors.append({"_id": ObjectId(raw)})
    except Exception: pass
    return {"$or": ors}


def message_event_key(row):
    kind = lower((row or {}).get("type") or (row or {}).get("kind") or (row or {}).get("event_type") or (row or {}).get("action_type"))
    job_id = text((row or {}).get("job_id") or (row or {}).get("source_id") or (row or {}).get("record_id"))
    title = lower((row or {}).get("title") or (row or {}).get("subject"))
    if kind in {"job_complete", "job_completed"} or "finished the job" in title:
        return f"job_completion:{job_id or title}"
    body = lower((row or {}).get("message") or (row or {}).get("body") or (row or {}).get("detail") or (row or {}).get("summary"))
    if job_id and kind and body:
        return f"{job_id}:{kind}:{body}"
    return text((row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("message_id") or (row or {}).get("notification_id") or f"{kind}:{title}:{body}")


def dedupe_owner_messages(rows):
    seen = set()
    deduped = []
    for row in rows:
        key = message_event_key(row)
        if key and key in seen:
            continue
        if key:
            seen.add(key)
        deduped.append(row)
    return deduped


def number(v):
    try: return float(str(v or 0).replace("$", "").replace(",", ""))
    except Exception: return 0


def normalize(kind, payload):
    doc = dict(payload or {})
    doc.pop("id", None); doc.pop("_id", None)
    if kind == "jobs":
        doc.setdefault("title", txt(doc.get("title") or doc.get("job_title") or doc.get("name") or "New job"))
        doc.setdefault("client_name", txt(doc.get("client_name") or doc.get("customer_name") or doc.get("client") or "No client"))
        doc.setdefault("customer_name", doc.get("client_name"))
        doc.setdefault("status", txt(doc.get("status") or "assigned"))
        doc.setdefault("scheduled_date", txt(doc.get("scheduled_date") or doc.get("date") or now().strftime("%Y-%m-%d")))
        doc["price"] = number(doc.get("price") or doc.get("amount") or doc.get("total"))
    if kind == "clients": doc.setdefault("name", txt(doc.get("name") or doc.get("client_name") or doc.get("customer_name") or "New client"))
    if kind == "quotes":
        doc.setdefault("title", txt(doc.get("title") or doc.get("quote_title") or "New quote")); doc.setdefault("status", txt(doc.get("status") or "draft")); doc["amount"] = number(doc.get("amount") or doc.get("price") or doc.get("total"))
    if kind == "invoices":
        doc.setdefault("invoice_number", txt(doc.get("invoice_number") or doc.get("number") or "Draft invoice")); doc.setdefault("status", txt(doc.get("status") or "draft")); doc.setdefault("accounting_status", txt(doc.get("accounting_status") or "not_synced")); doc["amount"] = number(doc.get("amount") or doc.get("subtotal") or doc.get("total"))
    return doc


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED: return
    app = getattr(module, "app", None); db = getattr(module, "db", None); get_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None); Request = getattr(module, "Request", None); HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_user or ObjectId is None or Request is None or HTTPException is None: return

    async def list_kind(kind: str, request: Request):
        user = await get_user(request)
        rows = []
        try:
            cursor = getattr(db, DATA[kind]).find(scope(user, ObjectId)).sort("created_at", -1).limit(500)
            async for row in cursor: rows.append(safe(row))
        except Exception: rows = []
        return {"success": True, kind: rows, "items": rows, "data": rows}

    async def create_kind(kind: str, request: Request):
        user = await get_user(request)
        if not owner(user): raise HTTPException(status_code=403, detail="Owner access required")
        doc = normalize(kind, await request.json())
        doc.update({"business_id": bid(user), "owner_id": uid(user), "owner_email": email(user), "created_at": now(), "updated_at": now(), "source": doc.get("source") or "owner_data_visibility"})
        result = await getattr(db, DATA[kind]).insert_one(doc)
        row = await getattr(db, DATA[kind]).find_one({"_id": result.inserted_id})
        return {"success": True, kind[:-1] if kind.endswith("s") else kind: safe(row), "record": safe(row), "data": safe(row)}

    async def update_kind(kind: str, record_id: str, request: Request):
        user = await get_user(request)
        if not owner(user): raise HTTPException(status_code=403, detail="Owner access required")
        doc = normalize(kind, await request.json()); doc["updated_at"] = now()
        query = {"$and": [scope(user, ObjectId), record_id_query(record_id, ObjectId)]}
        result = await getattr(db, DATA[kind]).update_one(query, {"$set": doc})
        if result.matched_count == 0: raise HTTPException(status_code=404, detail="Record not found")
        row = await getattr(db, DATA[kind]).find_one(query)
        return {"success": True, "record": safe(row), "data": safe(row)}

    async def list_team(request: Request):
        user = await get_user(request)
        rows = []
        try:
            query = {"$and": [scope(user, ObjectId), {"role": {"$in": ["worker", "staff", "employee", "subcontractor", "contractor", "payroll"]}}]}
            cursor = db.users.find(query).sort("created_at", -1).limit(500)
            async for row in cursor: rows.append(safe(row))
        except Exception: rows = []
        return {"success": True, "workers": rows, "team": rows, "items": rows, "data": rows}

    async def list_messages(request: Request):
        user = await get_user(request)
        rows = []
        for name in ["notifications", "approved_notifications", "worker_messages", "worker_field_slips"]:
            try:
                cursor = getattr(db, name).find(scope(user, ObjectId)).sort("created_at", -1).limit(120)
                async for row in cursor: rows.append(safe(row))
            except Exception: pass
        rows = sorted(rows, key=lambda r: txt(r.get("created_at")), reverse=True)
        rows = dedupe_owner_messages(rows)[:200]
        return {
            "success": True,
            "messages": rows,
            "items": rows,
            "data": rows,
            "dedupe_version": OWNER_MESSAGE_DEDUPE_BUILD,
            "dedupe_strategy": "logical_job_event",
        }

    async def command_actions(request: Request):
        data = await list_messages(request)
        actions = []
        for row in data.get("items", [])[:80]:
            actions.append({"id": row.get("id") or row.get("source_id") or row.get("title"), "type": row.get("type") or row.get("kind") or "Owner check", "title": row.get("title") or row.get("summary") or row.get("message") or "Owner check", "summary": row.get("summary") or row.get("message") or "Review this update.", "status": row.get("status") or "waiting", "record": row})
        return {"success": True, "actions": actions, "items": actions, "data": actions}

    for kind in DATA:
        async def l(request: Request, kind=kind): return await list_kind(kind, request)
        async def c(request: Request, kind=kind): return await create_kind(kind, request)
        async def p(record_id: str, request: Request, kind=kind): return await update_kind(kind, record_id, request)
        remove(app, f"/api/{kind}", "GET"); app.add_api_route(f"/api/{kind}", l, methods=["GET"])
        remove(app, f"/api/{kind}", "POST"); app.add_api_route(f"/api/{kind}", c, methods=["POST"])
        for path in [f"/api/{kind}/{{record_id}}", f"/api/{kind}/{{record_id}}/field-update"]:
            remove(app, path, "PATCH"); app.add_api_route(path, p, methods=["PATCH"])
            remove(app, path, "PUT"); app.add_api_route(path, p, methods=["PUT"])
    for path in ["/api/team", "/api/team/workers", "/api/workers"]:
        remove(app, path, "GET"); app.add_api_route(path, list_team, methods=["GET"])
    async def messages_readiness():
        return {
            "success": True,
            "ready": True,
            "version": OWNER_MESSAGE_DEDUPE_BUILD,
            "route_owner": "owner_data_visibility",
            "strategy": "logical_job_event",
            "completion_key": "job_completion:job_id",
        }

    for route_path in ["/api/messages"]:
        remove(app, route_path, "GET"); app.add_api_route(route_path, list_messages, methods=["GET"])
    remove(app, "/api/messages/readiness", "GET"); app.add_api_route("/api/messages/readiness", messages_readiness, methods=["GET"])
    for path in ["/api/ai/actions", "/api/command/actions", "/api/command/approvals"]:
        remove(app, path, "GET"); app.add_api_route(path, command_actions, methods=["GET"])
    INSTALLED.add(name)

class Loader(importlib.abc.Loader):
    def __init__(self, original): self.original = original
    def create_module(self, spec): return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
    def exec_module(self, module): self.original.exec_module(module); install(module)
class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS: return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader): spec.loader = Loader(spec.loader)
        return spec
if not any(isinstance(f, Finder) for f in sys.meta_path): sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded: install(loaded)
