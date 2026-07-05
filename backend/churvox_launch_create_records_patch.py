from __future__ import annotations

from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends


def _text(value, fallback=""):
    try:
        text = str(value or "").strip()
        return text if text else fallback
    except Exception:
        return fallback


def _now():
    return datetime.now(timezone.utc)


def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for key, value in list(out.items()):
        if hasattr(value, "isoformat"):
            out[key] = value.isoformat()
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


def _number(value, fallback=0.0):
    try:
        if value is None or value == "":
            return fallback
        return float(str(value).replace("$", "").replace(",", ""))
    except Exception:
        return fallback


def _business_id(user):
    return _text((user or {}).get("business_id") or (user or {}).get("businessId") or (user or {}).get("owner_business_id") or (user or {}).get("id") or (user or {}).get("_id"))


def _is_owner(user):
    role = _text((user or {}).get("role")).lower()
    return role in {"owner", "employer", "admin", "manager", "office_admin"} or (user or {}).get("is_admin") is True


def _base_doc(payload, user):
    now = _now()
    doc = dict(payload or {})
    for key in ["id", "_id", "created_at", "updated_at"]:
        doc.pop(key, None)
    doc["business_id"] = _business_id(user)
    doc["created_at"] = now
    doc["updated_at"] = now
    doc.setdefault("source", "churvox_launch_create_bridge")
    return doc


def _prioritize(app):
    names = {"create_client_launch", "create_job_launch", "create_quote_launch", "create_invoice_launch"}
    try:
        mine = [r for r in app.router.routes if getattr(getattr(r, "endpoint", None), "__name__", "") in names]
        rest = [r for r in app.router.routes if getattr(getattr(r, "endpoint", None), "__name__", "") not in names]
        app.router.routes[:] = mine + rest
    except Exception:
        pass


def _install(module):
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    if app is None or db is None or get_current_user is None or getattr(app.state, "launch_create_records_patch", False):
        return

    router = APIRouter(prefix="/api")

    async def owner_user(current_user):
        if not _is_owner(current_user):
            return None
        return current_user

    @router.post("/clients")
    async def create_client_launch(payload: dict, current_user: dict = Depends(get_current_user)):
        user = await owner_user(current_user)
        if user is None:
            return {"success": False, "error": "Only owner/admin roles can create clients"}
        doc = _base_doc(payload, user)
        doc.setdefault("name", _text(doc.get("name") or doc.get("client_name") or doc.get("customer_name"), "New client"))
        doc.setdefault("email", _text(doc.get("email")))
        doc.setdefault("phone", _text(doc.get("phone") or doc.get("mobile")))
        doc.setdefault("address", _text(doc.get("address") or doc.get("site_address") or doc.get("service_address")))
        result = await db.clients.insert_one(doc)
        saved = await db.clients.find_one({"_id": result.inserted_id})
        safe = _safe(saved)
        return {"success": True, "record": safe, "client": safe, **safe}

    @router.post("/jobs")
    async def create_job_launch(payload: dict, current_user: dict = Depends(get_current_user)):
        user = await owner_user(current_user)
        if user is None:
            return {"success": False, "error": "Only owner/admin roles can create jobs"}
        doc = _base_doc(payload, user)
        client = _text(doc.get("client_name") or doc.get("customer_name") or doc.get("client"), "No client")
        doc.setdefault("title", _text(doc.get("title") or doc.get("job_title") or doc.get("name"), "New job"))
        doc.setdefault("customer_name", client)
        doc.setdefault("client_name", client)
        doc.setdefault("job_type", _text(doc.get("job_type") or doc.get("service_type"), "General service"))
        doc.setdefault("address", _text(doc.get("address") or doc.get("site_address") or doc.get("service_address"), "Address to confirm"))
        doc.setdefault("scheduled_date", _text(doc.get("scheduled_date") or doc.get("date"), datetime.now().strftime("%Y-%m-%d")))
        doc.setdefault("description", _text(doc.get("description") or doc.get("notes") or doc.get("scope"), "Created from Churvox launch audit."))
        doc.setdefault("price", _number(doc.get("price") or doc.get("amount") or doc.get("total"), 0))
        doc.setdefault("status", "assigned")
        doc.setdefault("photos", [])
        doc.setdefault("time_entries", [])
        doc.setdefault("timer_running", False)
        result = await db.jobs.insert_one(doc)
        saved = await db.jobs.find_one({"_id": result.inserted_id})
        safe = _safe(saved)
        return {"success": True, "record": safe, "job": safe, **safe}

    @router.post("/quotes")
    async def create_quote_launch(payload: dict, current_user: dict = Depends(get_current_user)):
        user = await owner_user(current_user)
        if user is None:
            return {"success": False, "error": "Only owner/admin roles can create quotes"}
        doc = _base_doc(payload, user)
        client = _text(doc.get("customer_name") or doc.get("client_name") or doc.get("client"), "New lead")
        price = _number(doc.get("price") or doc.get("total") or doc.get("amount"), 0)
        doc.setdefault("title", _text(doc.get("title") or doc.get("name") or doc.get("job_description"), "New quote"))
        doc.setdefault("customer_name", client)
        doc.setdefault("client_name", client)
        doc.setdefault("address", _text(doc.get("address") or doc.get("site_address"), "Address to confirm"))
        doc.setdefault("job_description", _text(doc.get("job_description") or doc.get("scope") or doc.get("description"), "Quote created from Churvox launch audit."))
        doc.setdefault("price", price)
        doc.setdefault("total", price)
        doc.setdefault("status", "draft")
        doc.setdefault("quote_number", f"QT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
        result = await db.quotes.insert_one(doc)
        saved = await db.quotes.find_one({"_id": result.inserted_id})
        safe = _safe(saved)
        return {"success": True, "record": safe, "quote": safe, **safe}

    @router.post("/invoices")
    async def create_invoice_launch(payload: dict, current_user: dict = Depends(get_current_user)):
        user = await owner_user(current_user)
        if user is None:
            return {"success": False, "error": "Only owner/admin roles can create invoices"}
        doc = _base_doc(payload, user)
        subtotal = _number(doc.get("subtotal") or doc.get("amount") or doc.get("price") or doc.get("total"), 0)
        gst_rate = _number(doc.get("gst_rate"), 15)
        client = _text(doc.get("customer_name") or doc.get("client_name") or doc.get("client"), "Customer to confirm")
        doc.setdefault("customer_name", client)
        doc.setdefault("client_name", client)
        doc.setdefault("description", _text(doc.get("description") or doc.get("line_items") or doc.get("notes"), "Invoice created from Churvox launch audit."))
        doc.setdefault("status", "draft")
        doc.setdefault("invoice_number", f"INV-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
        doc["subtotal"] = subtotal
        doc["gst_rate"] = gst_rate
        doc["gst_amount"] = round(subtotal * gst_rate / 100, 2)
        doc["total"] = round(subtotal + doc["gst_amount"], 2)
        doc.setdefault("xero_sync_status", "not_synced")
        doc.setdefault("myob_sync_status", "not_synced")
        result = await db.invoices.insert_one(doc)
        saved = await db.invoices.find_one({"_id": result.inserted_id})
        safe = _safe(saved)
        return {"success": True, "record": safe, "invoice": safe, **safe}

    app.include_router(router)
    _prioritize(app)
    app.state.launch_create_records_patch = True


def install(module):
    _install(module)
