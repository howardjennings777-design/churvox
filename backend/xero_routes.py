import base64
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query
from fastapi.responses import JSONResponse, RedirectResponse

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
BACKEND_PUBLIC_URL = os.environ.get("BACKEND_PUBLIC_URL", os.environ.get("RENDER_EXTERNAL_URL", "https://grassley-backend.onrender.com")).rstrip("/")
XERO_CLIENT_ID = os.environ.get("XERO_CLIENT_ID", "")
XERO_CLIENT_SECRET = os.environ.get("XERO_CLIENT_SECRET", "")
XERO_REDIRECT_URI = os.environ.get("XERO_REDIRECT_URI", f"{BACKEND_PUBLIC_URL}/api/xero/callback")
XERO_AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize"
XERO_TOKEN_URL = "https://identity.xero.com/connect/token"
XERO_CONNECTIONS_URL = "https://api.xero.com/connections"
XERO_INVOICES_URL = "https://api.xero.com/api.xro/2.0/Invoices"
XERO_DEFAULT_SCOPES = "openid profile email offline_access accounting.transactions accounting.contacts accounting.settings"
XERO_SALES_ACCOUNT_CODE = os.environ.get("XERO_SALES_ACCOUNT_CODE", "200").strip()
XERO_SALES_TAX_TYPE = os.environ.get("XERO_SALES_TAX_TYPE", "OUTPUT2").strip()


def _bid(user):
    return str(user.get("business_id") or user.get("id"))


def _uid(user):
    return str(user.get("id") or user.get("_id") or "")


def _safe(doc):
    out = dict(doc or {})
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for k, v in list(out.items()):
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
    if out.get("access_token"):
        out["access_token"] = "stored"
    if out.get("refresh_token"):
        out["refresh_token"] = "stored"
    return out


def _basic_auth():
    token = base64.b64encode(f"{XERO_CLIENT_ID}:{XERO_CLIENT_SECRET}".encode()).decode()
    return {"Authorization": f"Basic {token}", "Content-Type": "application/x-www-form-urlencoded"}


def _configured():
    return bool(XERO_CLIENT_ID and XERO_CLIENT_SECRET and XERO_REDIRECT_URI)


def _xero_addon_active(owner):
    owner = owner or {}
    plan = str(owner.get("plan") or "").lower().strip()
    return bool(owner.get("xero_addon_active")) or plan in {"command", "enterprise"}


def _round_money(value):
    try:
        return round(float(value or 0), 2)
    except Exception:
        return 0.0


def _date_only(value=None):
    if isinstance(value, datetime):
        return value.date().isoformat()
    return datetime.now(timezone.utc).date().isoformat()


def _as_object_id(value):
    try:
        return ObjectId(str(value))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid id")


def _maybe_object_id(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _same_id(left, right):
    return str(left or "") == str(right or "")


def _role(user):
    return str((user or {}).get("role") or "").lower().strip()


def _is_owner_role(user):
    return _role(user) in {"owner", "employer", "admin", "business_owner", "superadmin"}


def _is_worker_role(user):
    return _role(user) == "worker"


def _job_business_matches(job, user):
    bid = _bid(user)
    if _same_id(job.get("business_id"), bid):
        return True
    contractor_id = job.get("contractor_id")
    return _same_id(contractor_id, bid)


def _job_assigned_to_worker(job, user):
    user_id = _uid(user)
    candidates = [
        job.get("assigned_worker_id"),
        job.get("worker_id"),
        job.get("assigned_to"),
        job.get("assignedWorkerId"),
    ]
    return any(_same_id(candidate, user_id) for candidate in candidates if candidate)


async def _find_job_by_id(db, job_id):
    oid = _maybe_object_id(job_id)
    if oid:
        job = await db.jobs.find_one({"_id": oid})
        if job:
            return job
    return await db.jobs.find_one({"id": str(job_id)})


async def _find_accessible_job(db, job_id, user):
    job = await _find_job_by_id(db, job_id)
    if not job or not _job_business_matches(job, user):
        return None
    if _is_worker_role(user) and not _job_assigned_to_worker(job, user):
        return None
    if _is_owner_role(user) or _is_worker_role(user):
        return job
    return None


def _compute_elapsed(time_entries):
    total = 0
    last_start = None
    for entry in time_entries or []:
        ts = entry.get("timestamp") if isinstance(entry, dict) else None
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            except Exception:
                ts = None
        if ts and ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        action = entry.get("action") if isinstance(entry, dict) else ""
        if action in ("start", "resume"):
            last_start = ts
        elif action == "pause" and last_start and ts:
            total += (ts - last_start).total_seconds()
            last_start = None
    if last_start:
        total += (datetime.now(timezone.utc) - last_start).total_seconds()
    return int(max(0, total))


async def _get_connection(db, bid):
    return await db.xero_connections.find_one({"business_id": str(bid)})


def _xero_headers(conn, access_token=None):
    tenant_id = conn.get("tenant_id")
    token = access_token or conn.get("access_token")
    if not tenant_id or not token:
        raise HTTPException(status_code=400, detail="Xero connection is missing tenant or access token")
    return {
        "Authorization": f"Bearer {token}",
        "xero-tenant-id": tenant_id,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


async def _refresh_connection(db, conn):
    if not conn or conn.get("status") != "connected":
        raise HTTPException(status_code=400, detail="Connect Xero before syncing")
    refresh_token = conn.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Xero refresh token is missing. Reconnect Xero.")

    async with httpx.AsyncClient(timeout=25) as client:
        token_res = await client.post(
            XERO_TOKEN_URL,
            headers=_basic_auth(),
            data={"grant_type": "refresh_token", "refresh_token": refresh_token},
        )
    if token_res.status_code >= 400:
        await db.xero_connections.update_one(
            {"_id": conn["_id"]},
            {"$set": {"last_refresh_error": token_res.text, "updated_at": datetime.now(timezone.utc)}},
        )
        raise HTTPException(status_code=400, detail="Xero token refresh failed. Reconnect Xero.")

    tokens = token_res.json()
    now = datetime.now(timezone.utc)
    expires_in = int(tokens.get("expires_in") or 1800)
    update = {
        "access_token": tokens.get("access_token"),
        "refresh_token": tokens.get("refresh_token") or refresh_token,
        "expires_in": expires_in,
        "expires_at": now + timedelta(seconds=max(60, expires_in - 60)),
        "last_refresh_error": None,
        "refreshed_at": now,
        "updated_at": now,
    }
    await db.xero_connections.update_one({"_id": conn["_id"]}, {"$set": update})
    conn.update(update)
    return conn


async def _live_connection(db, bid):
    conn = await _get_connection(db, bid)
    if not conn or conn.get("status") != "connected":
        raise HTTPException(status_code=400, detail="Connect Xero before syncing")
    return await _refresh_connection(db, conn)


async def _find_invoice(db, bid, invoice_id):
    invoice = await db.invoices.find_one({"_id": _as_object_id(invoice_id), "business_id": str(bid)})
    if not invoice:
        invoice = await db.invoices.find_one({"_id": _as_object_id(invoice_id), "contractor_id": _as_object_id(bid)})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


def _build_xero_invoice_payload(invoice):
    subtotal = _round_money(invoice.get("subtotal") or invoice.get("amount") or 0)
    gst_rate = _round_money(invoice.get("gst_rate") or 0)
    customer_name = (invoice.get("customer_name") or invoice.get("client_name") or "Churvox Customer").strip() or "Churvox Customer"
    customer_email = (invoice.get("customer_email") or invoice.get("email") or "").strip()
    description = (invoice.get("description") or invoice.get("notes") or invoice.get("invoice_number") or "Churvox invoice").strip()
    created_at = invoice.get("created_at") if isinstance(invoice.get("created_at"), datetime) else datetime.now(timezone.utc)

    contact = {"Name": customer_name}
    if customer_email:
        contact["EmailAddress"] = customer_email

    line_item = {
        "Description": description[:4000] or "Churvox invoice",
        "Quantity": 1,
        "UnitAmount": subtotal,
        "TaxType": XERO_SALES_TAX_TYPE if gst_rate > 0 else "NONE",
    }
    if XERO_SALES_ACCOUNT_CODE:
        line_item["AccountCode"] = XERO_SALES_ACCOUNT_CODE

    return {
        "Invoices": [
            {
                "Type": "ACCREC",
                "Contact": contact,
                "Date": _date_only(created_at),
                "DueDate": _date_only(created_at + timedelta(days=14)),
                "InvoiceNumber": invoice.get("invoice_number") or f"CHURVOX-{str(invoice.get('_id'))[-6:]}",
                "Reference": f"Churvox invoice {str(invoice.get('_id'))}",
                "Status": "DRAFT",
                "LineAmountTypes": "Exclusive",
                "LineItems": [line_item],
            }
        ]
    }


async def _sync_invoice_to_xero(db, bid, invoice, force=False):
    if invoice.get("xero_invoice_id") and not force:
        return {
            "success": True,
            "already_synced": True,
            "invoice_id": str(invoice.get("_id")),
            "xero_invoice_id": invoice.get("xero_invoice_id"),
            "xero_invoice_number": invoice.get("xero_invoice_number"),
            "xero_status": invoice.get("xero_status"),
            "message": "Invoice already has a Xero invoice id. Pass force=true to recreate/update later.",
        }

    conn = await _live_connection(db, bid)
    payload = _build_xero_invoice_payload(invoice)
    now = datetime.now(timezone.utc)

    await db.invoices.update_one(
        {"_id": invoice["_id"]},
        {"$set": {"xero_sync_status": "syncing", "xero_last_sync": now, "xero_error": None}},
    )

    async with httpx.AsyncClient(timeout=30) as client:
        res = await client.post(XERO_INVOICES_URL, headers=_xero_headers(conn), json=payload)

    if res.status_code >= 400:
        error_text = res.text[:2000]
        await db.invoices.update_one(
            {"_id": invoice["_id"]},
            {"$set": {"xero_sync_status": "failed", "xero_error": error_text, "xero_last_sync": now}},
        )
        await db.xero_sync_events.insert_one({
            "business_id": str(bid),
            "invoice_id": invoice["_id"],
            "status": "failed",
            "error": error_text,
            "created_at": now,
        })
        raise HTTPException(status_code=502, detail=f"Xero draft invoice sync failed: {error_text}")

    data = res.json()
    xero_invoice = (data.get("Invoices") or [{}])[0]
    update = {
        "xero_sync_status": "synced",
        "xero_invoice_id": xero_invoice.get("InvoiceID"),
        "xero_invoice_number": xero_invoice.get("InvoiceNumber"),
        "xero_status": xero_invoice.get("Status"),
        "xero_last_sync": now,
        "xero_synced_at": now,
        "xero_error": None,
    }
    await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": update})
    await db.xero_sync_events.insert_one({
        "business_id": str(bid),
        "invoice_id": invoice["_id"],
        "status": "synced",
        "xero_invoice_id": update["xero_invoice_id"],
        "xero_status": update["xero_status"],
        "payload_preview": {"InvoiceNumber": payload["Invoices"][0].get("InvoiceNumber"), "Status": "DRAFT"},
        "created_at": now,
    })
    return {"success": True, "invoice_id": str(invoice["_id"]), "xero_invoice": xero_invoice, "local_update": _safe(update)}


async def _refresh_xero_invoice_status(db, bid, invoice):
    xero_invoice_id = invoice.get("xero_invoice_id")
    if not xero_invoice_id:
        raise HTTPException(status_code=400, detail="Invoice has not been synced to Xero yet")
    conn = await _live_connection(db, bid)
    async with httpx.AsyncClient(timeout=25) as client:
        res = await client.get(f"{XERO_INVOICES_URL}/{xero_invoice_id}", headers=_xero_headers(conn))
    if res.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Xero invoice status read failed: {res.text[:1000]}")
    data = res.json()
    xero_invoice = (data.get("Invoices") or [{}])[0]
    xero_status = xero_invoice.get("Status")
    update = {"xero_status": xero_status, "xero_status_checked_at": datetime.now(timezone.utc)}
    if str(xero_status).upper() == "PAID":
        update["status"] = "paid"
        update["paid_at"] = datetime.now(timezone.utc)
    await db.invoices.update_one({"_id": invoice["_id"]}, {"$set": update})
    return {"success": True, "invoice_id": str(invoice["_id"]), "xero_invoice": xero_invoice, "local_update": _safe(update)}


def install(app, db, get_current_user):
    if getattr(app.state, "xero_routes_installed", False):
        return
    router = APIRouter(prefix="/api")

    @app.middleware("http")
    async def protect_job_completion_routes(request, call_next):
        path = request.url.path.rstrip("/")
        method = request.method.upper()
        is_legacy_job_write = method == "POST" and path.startswith("/api/jobs/") and (path.endswith("/complete") or path.endswith("/pause"))
        if not is_legacy_job_write:
            return await call_next(request)

        try:
            current_user = await get_current_user(request)
        except Exception:
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        parts = path.split("/")
        job_id = parts[3] if len(parts) >= 5 else ""
        job = await _find_accessible_job(db, job_id, current_user)
        if not job:
            return JSONResponse({"detail": "Job not found"}, status_code=404)
        return await call_next(request)

    @router.patch("/worker/jobs/{job_id}/field-update")
    async def worker_field_update(job_id: str, payload: dict = Body(default_factory=dict), current_user: dict = Depends(get_current_user)):
        if not _is_worker_role(current_user):
            raise HTTPException(status_code=403, detail="Only assigned workers can update field notes")
        job = await _find_accessible_job(db, job_id, current_user)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        payload = dict(payload or {})
        allowed = {}
        if "worker_notes" in payload:
            allowed["worker_notes"] = str(payload.get("worker_notes") or "")
        if "photos" in payload and isinstance(payload.get("photos"), list):
            allowed["photos"] = payload.get("photos")
        if "worker_action_required" in payload:
            allowed["worker_action_required"] = bool(payload.get("worker_action_required"))
        for key in ["work_review_status", "review_status", "owner_review_status"]:
            if key in payload:
                allowed[key] = str(payload.get(key) or "")[:80]
        if payload.get("resubmitted_at"):
            allowed["resubmitted_at"] = datetime.now(timezone.utc)
        if not allowed:
            raise HTTPException(status_code=400, detail="Nothing to save")

        allowed["updated_at"] = datetime.now(timezone.utc)
        await db.jobs.update_one({"_id": job["_id"]}, {"$set": allowed})
        updated = await db.jobs.find_one({"_id": job["_id"]})
        return {"success": True, "job": _safe(updated), "data": _safe(updated)}

    @router.post("/worker/jobs/{job_id}/complete")
    async def worker_complete_job(job_id: str, payload: dict = Body(default_factory=dict), current_user: dict = Depends(get_current_user)):
        if not _is_worker_role(current_user):
            raise HTTPException(status_code=403, detail="Only assigned workers can complete field jobs")
        job = await _find_accessible_job(db, job_id, current_user)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        now = datetime.now(timezone.utc)
        time_entries = list(job.get("time_entries") or [])
        if job.get("timer_running"):
            time_entries.append({"action": "pause", "timestamp": now})
        total_seconds = _compute_elapsed(time_entries) if time_entries else int(job.get("total_time_seconds", 0) or 0)

        update = {
            "status": "completed",
            "completed": True,
            "completed_at": now,
            "timer_running": False,
            "timer_started_at": None,
            "time_entries": time_entries,
            "total_time_seconds": total_seconds,
            "updated_at": now,
        }

        payload = dict(payload or {})
        if "worker_notes" in payload:
            update["worker_notes"] = str(payload.get("worker_notes") or "")
        if payload.get("worker_action_required") is False:
            update["worker_action_required"] = False
        for key in ["work_review_status", "review_status", "owner_review_status"]:
            if key in payload:
                update[key] = str(payload.get(key) or "")[:80]
        if payload.get("resubmitted_at"):
            update["resubmitted_at"] = now
        if payload.get("location"):
            update["completion_location"] = payload.get("location")

        await db.jobs.update_one({"_id": job["_id"]}, {"$set": update})
        updated = await db.jobs.find_one({"_id": job["_id"]})
        return {
            "success": True,
            "message": "Job completed successfully",
            "job_id": str(job["_id"]),
            "status": "completed",
            "completed": True,
            "timer_running": False,
            "total_time_seconds": total_seconds,
            "completed_at": now.isoformat(),
            "job": _safe(updated),
        }

    @router.get("/xero/status")
    async def xero_status(current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        owner = await db.users.find_one({"_id": ObjectId(bid)})
        conn = await _get_connection(db, bid)
        settings = await db.xero_sync_settings.find_one({"business_id": bid})
        connected = bool(conn and conn.get("status") == "connected")
        return {
            "success": True,
            "configured": _configured(),
            "addon_active": _xero_addon_active(owner),
            "connected": connected,
            "draft_invoice_sync_ready": bool(_configured() and connected),
            "sales_account_code": XERO_SALES_ACCOUNT_CODE,
            "sales_tax_type": XERO_SALES_TAX_TYPE,
            "connection": _safe(conn),
            "settings": _safe(settings) or {
                "invoice_sync_enabled": False,
                "contact_sync_enabled": False,
                "payment_sync_enabled": False,
                "payroll_handoff_enabled": False,
                "approval_required": True,
            },
            "required_env": ["XERO_CLIENT_ID", "XERO_CLIENT_SECRET", "XERO_REDIRECT_URI"],
        }

    @router.post("/xero/connect/start")
    async def xero_connect_start(current_user: dict = Depends(get_current_user)):
        if not _configured():
            raise HTTPException(status_code=400, detail="Xero credentials are not configured in Render yet")
        bid = _bid(current_user)
        owner = await db.users.find_one({"_id": ObjectId(bid)})
        if not _xero_addon_active(owner):
            raise HTTPException(status_code=403, detail="Xero add-on must be active before connecting Xero, or the business must be on Command")
        state = secrets.token_urlsafe(32)
        await db.xero_oauth_states.insert_one({"state": state, "business_id": bid, "user_id": str(current_user.get("id")), "created_at": datetime.now(timezone.utc), "used": False})
        params = {"response_type": "code", "client_id": XERO_CLIENT_ID, "redirect_uri": XERO_REDIRECT_URI, "scope": XERO_DEFAULT_SCOPES, "state": state}
        return {"success": True, "url": f"{XERO_AUTHORIZE_URL}?{urlencode(params)}"}

    @router.get("/xero/callback")
    async def xero_callback(code: str | None = Query(None), state: str | None = Query(None), error: str | None = Query(None)):
        if error:
            return RedirectResponse(f"{FRONTEND_URL}/dashboard?xero_error={urlencode({'e': error})}#xero")
        if not code or not state:
            return RedirectResponse(f"{FRONTEND_URL}/dashboard?xero_error=missing_code#xero")
        saved = await db.xero_oauth_states.find_one({"state": state, "used": False})
        if not saved:
            return RedirectResponse(f"{FRONTEND_URL}/dashboard?xero_error=bad_state#xero")
        bid = saved["business_id"]
        async with httpx.AsyncClient(timeout=25) as client:
            token_res = await client.post(XERO_TOKEN_URL, headers=_basic_auth(), data={"grant_type": "authorization_code", "code": code, "redirect_uri": XERO_REDIRECT_URI})
            if token_res.status_code >= 400:
                await db.xero_oauth_states.update_one({"_id": saved["_id"]}, {"$set": {"used": True, "error": token_res.text, "updated_at": datetime.now(timezone.utc)}})
                return RedirectResponse(f"{FRONTEND_URL}/dashboard?xero_error=token_failed#xero")
            tokens = token_res.json()
            access_token = tokens.get("access_token")
            connections_res = await client.get(XERO_CONNECTIONS_URL, headers={"Authorization": f"Bearer {access_token}"})
            tenants = connections_res.json() if connections_res.status_code < 400 else []
        tenant = tenants[0] if tenants else {}
        now = datetime.now(timezone.utc)
        expires_in = int(tokens.get("expires_in") or 1800)
        doc = {
            "business_id": bid,
            "status": "connected",
            "tenant_id": tenant.get("tenantId"),
            "tenant_name": tenant.get("tenantName"),
            "tenant_type": tenant.get("tenantType"),
            "scopes": XERO_DEFAULT_SCOPES.split(),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": expires_in,
            "expires_at": now + timedelta(seconds=max(60, expires_in - 60)),
            "connected_at": now,
            "updated_at": now,
            "available_tenants": tenants,
        }
        await db.xero_connections.update_one({"business_id": bid}, {"$set": doc}, upsert=True)
        await db.xero_oauth_states.update_one({"_id": saved["_id"]}, {"$set": {"used": True, "updated_at": now}})
        await db.xero_sync_settings.update_one({"business_id": bid}, {"$setOnInsert": {"business_id": bid, "invoice_sync_enabled": False, "contact_sync_enabled": False, "payment_sync_enabled": False, "payroll_handoff_enabled": False, "approval_required": True, "created_at": now}, "$set": {"updated_at": now}}, upsert=True)
        return RedirectResponse(f"{FRONTEND_URL}/dashboard?xero_connected=1#xero")

    @router.post("/xero/disconnect")
    async def xero_disconnect(current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        await db.xero_connections.update_one({"business_id": bid}, {"$set": {"status": "disconnected", "access_token": None, "refresh_token": None, "disconnected_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}})
        return {"success": True, "message": "Xero disconnected"}

    @router.post("/xero/settings")
    async def save_xero_settings(payload: dict, current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        allowed = {"invoice_sync_enabled", "contact_sync_enabled", "payment_sync_enabled", "payroll_handoff_enabled", "approval_required", "invoice_sync_rule", "contact_sync_rule", "payment_sync_rule", "payroll_handoff_rule"}
        update = {k: payload.get(k) for k in allowed if k in payload}
        update["updated_at"] = datetime.now(timezone.utc)
        await db.xero_sync_settings.update_one({"business_id": bid}, {"$set": update, "$setOnInsert": {"business_id": bid, "created_at": datetime.now(timezone.utc)}}, upsert=True)
        return {"success": True, "message": "Xero sync settings saved"}

    @router.post("/xero/invoices/{invoice_id}/sync-draft")
    async def sync_xero_draft_invoice(invoice_id: str, payload: dict | None = None, current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        invoice = await _find_invoice(db, bid, invoice_id)
        force = bool((payload or {}).get("force"))
        return await _sync_invoice_to_xero(db, bid, invoice, force=force)

    @router.post("/xero/sync-latest-invoice")
    async def sync_latest_xero_invoice(payload: dict | None = None, current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        invoice = await db.invoices.find_one({"business_id": str(bid)}, sort=[("created_at", -1)])
        if not invoice:
            invoice = await db.invoices.find_one({"contractor_id": _as_object_id(bid)}, sort=[("created_at", -1)])
        if not invoice:
            raise HTTPException(status_code=404, detail="No invoice found to sync")
        force = bool((payload or {}).get("force"))
        return await _sync_invoice_to_xero(db, bid, invoice, force=force)

    @router.post("/xero/invoices/{invoice_id}/refresh-status")
    async def refresh_xero_invoice_status(invoice_id: str, current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        invoice = await _find_invoice(db, bid, invoice_id)
        return await _refresh_xero_invoice_status(db, bid, invoice)

    @router.post("/xero/prepare-payroll-handoff")
    async def prepare_payroll_handoff(payload: dict, current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        conn = await _get_connection(db, bid)
        if not conn or conn.get("status") != "connected":
            raise HTTPException(status_code=400, detail="Connect Xero before preparing payroll handoff")
        doc = {"business_id": bid, "status": "prepared", "handoff_type": "payroll_timesheet", "payload": payload or {}, "approval_required": True, "created_at": datetime.now(timezone.utc), "note": "Payroll handoff only. No bank payout, tax decision, or government submission."}
        result = await db.xero_handoffs.insert_one(doc)
        return {"success": True, "handoff_id": str(result.inserted_id), "message": "Payroll handoff prepared for owner approval"}

    app.include_router(router)
    app.state.xero_routes_installed = True
