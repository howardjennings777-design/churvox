from datetime import datetime, timezone
import secrets
import sys


def _server():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _obj(value):
    ObjectId = getattr(_server(), "ObjectId", None)
    try:
        return ObjectId(str(value)) if value and ObjectId else None
    except Exception:
        return None


async def _user(request):
    return await getattr(_server(), "get_current_user")(request)


def _business_id(user):
    return str(user.get("business_id") or user.get("id") or user.get("_id"))


def _is_owner_side(user):
    return str(user.get("role") or "").lower() in ["owner", "employer", "admin", "manager", "office_admin"] or user.get("is_admin") is True


def _dump(doc):
    if not doc:
        return doc
    out = dict(doc)
    for key, value in list(out.items()):
        if key == "_id":
            out["id"] = str(value)
            out.pop("_id", None)
        elif hasattr(value, "isoformat"):
            out[key] = value.isoformat()
        elif value.__class__.__name__ == "ObjectId":
            out[key] = str(value)
    return out


def _payload(data):
    return dict(data or {})


def _number(value, fallback=0.0):
    try:
        if value is None or value == "":
            return fallback
        return float(str(value).replace("$", "").replace(",", ""))
    except Exception:
        return fallback


def _strip_for_create(data):
    clean = dict(data or {})
    for key in ["id", "_id", "business_id", "contractor_id", "created_by", "created_at", "updated_at"]:
        clean.pop(key, None)
    return clean


def _maybe_oid_fields(doc, fields):
    for field in fields:
        if doc.get(field):
            oid = _obj(doc.get(field))
            if oid:
                doc[field] = oid
    return doc


def install(router):
    if getattr(router, "churvox_create_record_key_fix_installed", False):
        return

    @router.post("/clients")
    async def create_client_fixed(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        user = await _user(request)
        if not _is_owner_side(user):
            return {"success": False, "error": "Only owner/admin roles can create clients"}
        business_id = _business_id(user)
        biz_oid = _obj(business_id)
        doc = _strip_for_create(_payload(payload))
        doc["business_id"] = business_id
        if biz_oid:
            doc["contractor_id"] = biz_oid
        doc["created_at"] = datetime.now(timezone.utc)
        doc["updated_at"] = doc["created_at"]
        inserted = await db.clients.insert_one(doc)
        saved = await db.clients.find_one({"_id": inserted.inserted_id})
        return _dump(saved)

    @router.post("/jobs")
    async def create_job_fixed(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        user = await _user(request)
        if not _is_owner_side(user):
            return {"success": False, "error": "Only owner/admin roles can create jobs"}
        business_id = _business_id(user)
        biz_oid = _obj(business_id)
        user_oid = _obj(user.get("id") or user.get("_id"))
        doc = _strip_for_create(_payload(payload))
        doc["business_id"] = business_id
        if biz_oid:
            doc["contractor_id"] = biz_oid
        if user_oid:
            doc["created_by"] = user_oid
        doc.setdefault("status", "assigned")
        doc.setdefault("photos", [])
        doc.setdefault("time_entries", [])
        doc.setdefault("total_time_seconds", 0)
        doc.setdefault("timer_running", False)
        doc.setdefault("completed", False)
        if not doc.get("title"):
            job_type = _clean(doc.get("job_type") or doc.get("service_type") or "Job").replace("_", " ").title()
            client = _clean(doc.get("customer_name") or doc.get("client_name") or doc.get("client") or "No client")
            doc["title"] = f"{job_type} - {client}"
        _maybe_oid_fields(doc, ["client_id", "customer_id", "assigned_worker_id"])
        doc["created_at"] = datetime.now(timezone.utc)
        doc["updated_at"] = doc["created_at"]
        inserted = await db.jobs.insert_one(doc)
        saved = await db.jobs.find_one({"_id": inserted.inserted_id})
        return _dump(saved)

    @router.post("/quotes")
    async def create_quote_fixed(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        user = await _user(request)
        if not _is_owner_side(user):
            return {"success": False, "error": "Only owner/admin roles can create quotes"}
        business_id = _business_id(user)
        biz_oid = _obj(business_id)
        doc = _strip_for_create(_payload(payload))
        doc["business_id"] = business_id
        if biz_oid:
            doc["contractor_id"] = biz_oid
        doc.setdefault("status", "draft")
        doc.setdefault("quote_number", f"QT-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
        _maybe_oid_fields(doc, ["client_id", "job_id"])
        doc["created_at"] = datetime.now(timezone.utc)
        doc["updated_at"] = doc["created_at"]
        inserted = await db.quotes.insert_one(doc)
        saved = await db.quotes.find_one({"_id": inserted.inserted_id})
        return _dump(saved)

    @router.post("/invoices")
    async def create_invoice_fixed(payload: dict, request):
        app = _server()
        db = getattr(app, "db", None)
        default_gst = float(getattr(app, "DEFAULT_GST_RATE", 15))
        if db is None:
            return {"success": False, "error": "Database not ready"}
        user = await _user(request)
        if not _is_owner_side(user):
            return {"success": False, "error": "Only owner/admin roles can create invoices"}
        business_id = _business_id(user)
        biz_oid = _obj(business_id)
        doc = _strip_for_create(_payload(payload))
        subtotal = _number(doc.get("subtotal") or doc.get("amount") or doc.get("price"), 0.0)
        gst_rate = _number(doc.get("gst_rate"), default_gst)
        gst_amount = round(subtotal * gst_rate / 100, 2)
        doc["business_id"] = business_id
        if biz_oid:
            doc["contractor_id"] = biz_oid
        doc["subtotal"] = subtotal
        doc["gst_rate"] = gst_rate
        doc["gst_amount"] = gst_amount
        doc["total"] = round(subtotal + gst_amount, 2)
        doc.setdefault("status", "draft")
        doc.setdefault("invoice_number", f"INV-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}")
        doc.setdefault("myob_sync_status", "not_synced")
        doc.setdefault("xero_sync_status", "not_synced")
        _maybe_oid_fields(doc, ["client_id", "customer_id", "job_id"])
        doc["created_at"] = datetime.now(timezone.utc)
        doc["updated_at"] = doc["created_at"]
        inserted = await db.invoices.insert_one(doc)
        saved = await db.invoices.find_one({"_id": inserted.inserted_id})
        return _dump(saved)

    router.churvox_create_record_key_fix_installed = True
