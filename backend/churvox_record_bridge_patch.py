from __future__ import annotations

from datetime import datetime, timezone
import importlib, importlib.abc, importlib.machinery, secrets, sys

TARGETS = {"server", "backend.server"}
INSTALLED = set()
COLLECTIONS = {"jobs": "jobs", "clients": "clients", "quotes": "quotes", "invoices": "invoices"}


def now(): return datetime.now(timezone.utc)
def txt(v, fallback=""): 
    s = str(v or "").strip()
    return s if s else fallback

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

def bid(user): return txt(user.get("business_id") or user.get("owner_business_id") or user.get("id") or user.get("_id"))
def owner(user): return txt(user.get("role")).lower() in {"employer", "owner", "admin", "manager", "office_admin"} or user.get("is_admin") is True

def remove(app, path, method):
    try: app.router.routes = [r for r in app.router.routes if not (getattr(r,"path","") == path and method in set(getattr(r,"methods",set()) or set()))]
    except Exception: pass

def idq(raw, ObjectId):
    raw = txt(raw)
    arr = [{"id": raw}, {"job_id": raw}, {"client_id": raw}, {"quote_id": raw}, {"invoice_id": raw}]
    try: arr.append({"_id": ObjectId(raw)})
    except Exception: pass
    return {"$or": arr}

def number(v):
    try: return float(str(v or 0).replace("$", "").replace(",", ""))
    except Exception: return 0

def normalize(kind, doc):
    doc = dict(doc or {})
    doc.pop("_id", None); doc.pop("id", None)
    if kind == "jobs":
        doc.setdefault("title", txt(doc.get("title") or doc.get("job_title") or doc.get("name"), "New job"))
        doc.setdefault("client_name", txt(doc.get("client_name") or doc.get("customer_name") or doc.get("client"), "No client"))
        doc.setdefault("customer_name", doc.get("client_name"))
        doc.setdefault("address", txt(doc.get("address") or doc.get("site_address"), "Address to confirm"))
        doc.setdefault("scheduled_date", txt(doc.get("scheduled_date") or doc.get("date"), now().strftime("%Y-%m-%d")))
        doc.setdefault("status", "assigned")
        doc["price"] = number(doc.get("price") or doc.get("amount") or doc.get("total"))
    if kind == "clients":
        doc.setdefault("name", txt(doc.get("name") or doc.get("client_name") or doc.get("customer_name"), "New client"))
    if kind == "quotes":
        doc.setdefault("title", txt(doc.get("title") or doc.get("quote") or doc.get("job_description"), "New quote"))
        doc.setdefault("client_name", txt(doc.get("client_name") or doc.get("customer_name") or doc.get("client"), "New lead"))
        doc.setdefault("status", "draft")
        doc.setdefault("quote_number", f"QT-{now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
        doc["amount"] = number(doc.get("amount") or doc.get("price") or doc.get("total"))
    if kind == "invoices":
        doc.setdefault("client_name", txt(doc.get("client_name") or doc.get("customer_name") or doc.get("client"), "Customer"))
        doc.setdefault("status", "draft")
        doc.setdefault("invoice_number", f"INV-{now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
        amount = number(doc.get("amount") or doc.get("subtotal") or doc.get("total"))
        doc["amount"] = amount; doc.setdefault("subtotal", amount); doc.setdefault("accounting_status", "not_synced")
    return doc


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED: return
    app = getattr(module, "app", None); db = getattr(module, "db", None); get_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None); Request = getattr(module, "Request", None); HTTPException = getattr(module, "HTTPException", None)
    if not app or db is None or not get_user or ObjectId is None or Request is None or HTTPException is None: return

    def collection(kind): return getattr(db, COLLECTIONS[kind])

    async def list_records(kind: str, request: Request):
        user = await get_user(request)
        items = []
        try:
            cursor = collection(kind).find({"business_id": bid(user)}).sort("created_at", -1).limit(300)
            async for row in cursor: items.append(safe(row))
        except Exception: items = []
        return {"success": True, kind: items, "items": items, "data": items}

    async def create_record(kind: str, request: Request):
        user = await get_user(request)
        if not owner(user): raise HTTPException(status_code=403, detail="Owner access required")
        payload = normalize(kind, await request.json())
        payload.update({"business_id": bid(user), "created_at": now(), "updated_at": now(), "source": payload.get("source") or "record_bridge"})
        result = await collection(kind).insert_one(payload)
        row = await collection(kind).find_one({"_id": result.inserted_id})
        return {"success": True, "record": safe(row), kind[:-1] if kind.endswith('s') else kind: safe(row), "data": safe(row)}

    async def update_record(kind: str, record_id: str, request: Request):
        user = await get_user(request)
        if not owner(user): raise HTTPException(status_code=403, detail="Owner access required")
        payload = normalize(kind, await request.json())
        payload.update({"updated_at": now()})
        result = await collection(kind).update_one({"business_id": bid(user), **idq(record_id, ObjectId)}, {"$set": payload})
        if result.matched_count == 0: raise HTTPException(status_code=404, detail="Record not found")
        row = await collection(kind).find_one({"business_id": bid(user), **idq(record_id, ObjectId)})
        return {"success": True, "record": safe(row), "data": safe(row)}

    for kind in COLLECTIONS:
        async def l(request: Request, kind=kind): return await list_records(kind, request)
        async def c(request: Request, kind=kind): return await create_record(kind, request)
        async def p(record_id: str, request: Request, kind=kind): return await update_record(kind, record_id, request)
        for path in [f"/api/{kind}"]:
            remove(app, path, "GET"); app.add_api_route(path, l, methods=["GET"])
            remove(app, path, "POST"); app.add_api_route(path, c, methods=["POST"])
        for path in [f"/api/{kind}/{{record_id}}", f"/api/{kind}/{{record_id}}/field-update"]:
            remove(app, path, "PATCH"); app.add_api_route(path, p, methods=["PATCH"])
            remove(app, path, "PUT"); app.add_api_route(path, p, methods=["PUT"])
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
