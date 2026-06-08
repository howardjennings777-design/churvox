from datetime import datetime, timezone
import secrets
import sys


def _server_module():
    return sys.modules.get("server") or sys.modules.get("backend.server") or sys.modules.get("main")


def _clean(value):
    return str(value or "").strip()


def _money(value, fallback=0.0):
    try:
        if value is None or value == "":
            return fallback
        return float(str(value).replace("$", "").replace(",", "").strip())
    except Exception:
        return fallback


def _delivery_method(value):
    text = _clean(value).lower()
    if "xero" in text:
        return "xero"
    if "myob" in text:
        return "myob_staged"
    if "manual" in text or "external" in text:
        return "manual_external"
    if "draft" in text:
        return "draft_only"
    if "churvox" in text or "internal" in text or "send" in text:
        return "churvox_internal"
    return "draft_only"


def _obj_or_none(value):
    server = _server_module()
    ObjectId = getattr(server, "ObjectId", None)
    try:
        if not value or ObjectId is None:
            return None
        return ObjectId(str(value))
    except Exception:
        return None


def _safe_doc(doc):
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


async def _current_user(request):
    server = _server_module()
    get_current_user = getattr(server, "get_current_user", None)
    if get_current_user is None:
        raise Exception("Auth not ready")
    return await get_current_user(request)


def _business_id(user):
    return str(user.get("business_id") or user.get("id") or user.get("_id"))


def _business_profile_payload(payload):
    allowed = [
        "businessName", "tradingName", "ownerEmail", "phone", "website",
        "businessAddress", "gstNumber", "nzbn", "bankName", "bankNumber",
        "invoicePrefix", "quotePrefix", "workingHours", "customerMessage",
        "documentFooter", "brandTone", "logoStatus"
    ]
    return {key: _clean(payload.get(key)) for key in allowed if key in payload}


def install(router):
    if getattr(router, "churvox_launch_logic_routes_installed", False):
        return

    @router.get("/logic/business-profile")
    async def churvox_get_business_profile(request):
        server = _server_module()
        db = getattr(server, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        try:
            user = await _current_user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}

        business_id = _business_id(user)
        profile = await db.business_profiles.find_one({"business_id": business_id}) or {}
        data = _safe_doc(profile) or {}
        if not data.get("businessName"):
            data["businessName"] = user.get("business_name") or user.get("company_name") or ""
        if not data.get("ownerEmail"):
            data["ownerEmail"] = user.get("email") or ""
        return {"success": True, "profile": data}

    @router.post("/logic/business-profile")
    async def churvox_save_business_profile(payload: dict, request):
        server = _server_module()
        db = getattr(server, "db", None)
        if db is None:
            return {"success": False, "error": "Database not ready"}
        try:
            user = await _current_user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}

        business_id = _business_id(user)
        now = datetime.now(timezone.utc)
        clean = _business_profile_payload(payload)
        clean["business_id"] = business_id
        clean["updated_at"] = now
        clean["updated_by"] = str(user.get("id"))
        existing = await db.business_profiles.find_one({"business_id": business_id})
        if existing:
            await db.business_profiles.update_one({"business_id": business_id}, {"$set": clean})
        else:
            clean["created_at"] = now
            await db.business_profiles.insert_one(clean)

        user_updates = {}
        if clean.get("businessName"):
            user_updates["business_name"] = clean["businessName"]
        if clean.get("ownerEmail"):
            user_updates["support_email"] = clean["ownerEmail"]
        if clean.get("gstNumber"):
            user_updates["gst_number"] = clean["gstNumber"]
        if clean.get("businessAddress"):
            user_updates["business_address"] = clean["businessAddress"]
        if user_updates:
            biz_oid = _obj_or_none(business_id)
            if biz_oid:
                await db.users.update_one({"_id": biz_oid}, {"$set": user_updates})
            await db.users.update_many({"business_id": business_id}, {"$set": user_updates})

        profile = await db.business_profiles.find_one({"business_id": business_id})
        return {"success": True, "message": "Business profile saved", "profile": _safe_doc(profile)}

    @router.post("/logic/invoice-approval")
    async def churvox_invoice_delivery_approval(payload: dict, request):
        server = _server_module()
        db = getattr(server, "db", None)
        if db is None:
            return {"success": False, "error": "Invoice approval route not ready"}
        try:
            user = await _current_user(request)
        except Exception:
            return {"success": False, "error": "Not authenticated"}

        now = datetime.now(timezone.utc)
        business_id = _business_id(user)
        biz_oid = _obj_or_none(business_id)
        invoice_id = _clean(payload.get("invoice_id") or payload.get("id"))
        method = _delivery_method(payload.get("deliveryMethod") or payload.get("invoice_delivery_method") or payload.get("send_mode"))
        subtotal = _money(payload.get("subtotal") or payload.get("amount"), 0.0)
        gst_rate = _money(payload.get("gst_rate"), 15.0)
        gst_amount = round(subtotal * (gst_rate / 100), 2)
        total = round(subtotal + gst_amount, 2)

        update = {
            "business_id": business_id,
            "customer_name": _clean(payload.get("customer_name") or payload.get("client")),
            "customer_email": _clean(payload.get("customer_email") or payload.get("client_email")),
            "job_reference": _clean(payload.get("job_reference") or payload.get("invoice_reference")),
            "invoice_type": _clean(payload.get("invoice_type") or "Job invoice"),
            "invoice_delivery_method": method,
            "delivery_source": method,
            "gst_status": _clean(payload.get("gst_status") or "GST included"),
            "payment_link_status": _clean(payload.get("payment_link_status") or "Not included"),
            "due_date": _clean(payload.get("due_date")),
            "description": _clean(payload.get("description") or payload.get("invoice_wording") or "Invoice for completed work"),
            "notes": _clean(payload.get("notes") or payload.get("internal_note")),
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "gst_amount": gst_amount,
            "total": total,
            "owner_approval_required": True,
            "approved_at": now,
            "approved_by": str(user.get("id")),
            "updated_at": now,
        }
        if biz_oid:
            update["contractor_id"] = biz_oid

        invoice = None
        oid = _obj_or_none(invoice_id)
        if oid:
            query = {"_id": oid, "$or": [{"business_id": business_id}]}
            if biz_oid:
                query["$or"].append({"contractor_id": biz_oid})
            await db.invoices.update_one(query, {"$set": update})
            invoice = await db.invoices.find_one({"_id": oid})

        if not invoice:
            doc = dict(update)
            doc["invoice_number"] = f"INV-{now.strftime('%Y%m%d')}-{secrets.token_hex(3).upper()}"
            doc["created_at"] = now
            inserted = await db.invoices.insert_one(doc)
            oid = inserted.inserted_id
            invoice_id = str(oid)
            invoice = await db.invoices.find_one({"_id": oid})

        message = "Invoice approved. Nothing sent or synced."
        response_extra = {"invoice_delivery_method": method}

        if method == "xero":
            conn = await db.xero_connections.find_one({"business_id": business_id, "status": "connected"})
            queue_status = "prepared" if conn else "waiting_for_xero_connection"
            await db.invoices.update_one({"_id": oid}, {"$set": {"status": "approved_for_xero", "xero_sync_status": queue_status, "xero_tenant_id": (conn or {}).get("tenant_id"), "updated_at": now}})
            await db.xero_sync_queue.insert_one({"business_id": business_id, "record_type": "invoice", "record_id": invoice_id, "status": queue_status, "approval_required": True, "created_at": now, "payload": {"invoice_id": invoice_id, "delivery_method": method}})
            message = "Invoice staged for Xero. It waits if Xero is not connected."
            response_extra["xero_sync_status"] = queue_status
        elif method == "myob_staged":
            await db.invoices.update_one({"_id": oid}, {"$set": {"status": "approved_for_myob_later", "myob_sync_status": "staged_not_active", "updated_at": now}})
            message = "Invoice staged for MYOB later. Nothing sent or synced."
        elif method == "manual_external":
            await db.invoices.update_one({"_id": oid}, {"$set": {"status": "externally_handled", "external_handled_at": now, "updated_at": now}})
            message = "Invoice marked as handled outside Churvox."
        elif method == "draft_only":
            await db.invoices.update_one({"_id": oid}, {"$set": {"status": "draft_approved", "updated_at": now}})
            message = "Invoice draft approved. Nothing sent or synced."
        else:
            await db.invoices.update_one({"_id": oid}, {"$set": {"status": "approved_internal", "churvox_internal_delivery_status": "approved_not_emailed", "updated_at": now}})
            message = "Invoice approved for Churvox internal handling. No customer email was sent."

        final_doc = await db.invoices.find_one({"_id": oid})
        return {"success": True, "message": message, "invoice": _safe_doc(final_doc), **response_extra}

    router.churvox_launch_logic_routes_installed = True
