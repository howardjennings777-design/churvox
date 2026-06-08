import base64
import os
import secrets
from datetime import datetime, timezone
from urllib.parse import urlencode

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://www.churvox.com").rstrip("/")
XERO_CLIENT_ID = os.environ.get("XERO_CLIENT_ID", "")
XERO_CLIENT_SECRET = os.environ.get("XERO_CLIENT_SECRET", "")
XERO_REDIRECT_URI = os.environ.get("XERO_REDIRECT_URI", f"{FRONTEND_URL}/api/xero/callback")
XERO_AUTHORIZE_URL = "https://login.xero.com/identity/connect/authorize"
XERO_TOKEN_URL = "https://identity.xero.com/connect/token"
XERO_CONNECTIONS_URL = "https://api.xero.com/connections"
XERO_DEFAULT_SCOPES = "offline_access accounting.transactions accounting.contacts accounting.settings payroll.timesheets payroll.employees"


def _bid(user):
    return str(user.get("business_id") or user.get("id"))


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


async def _get_connection(db, bid):
    return await db.xero_connections.find_one({"business_id": str(bid)})


def install(app, db, get_current_user):
    if getattr(app.state, "xero_routes_installed", False):
        return
    router = APIRouter(prefix="/api")

    @router.get("/xero/status")
    async def xero_status(current_user: dict = Depends(get_current_user)):
        bid = _bid(current_user)
        owner = await db.users.find_one({"_id": ObjectId(bid)})
        conn = await _get_connection(db, bid)
        settings = await db.xero_sync_settings.find_one({"business_id": bid})
        return {
            "success": True,
            "configured": _configured(),
            "addon_active": bool((owner or {}).get("xero_addon_active")),
            "connected": bool(conn and conn.get("status") == "connected"),
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
        if not (owner or {}).get("xero_addon_active"):
            raise HTTPException(status_code=403, detail="Xero add-on must be active before connecting Xero")
        state = secrets.token_urlsafe(32)
        await db.xero_oauth_states.insert_one({"state": state, "business_id": bid, "user_id": str(current_user.get("id")), "created_at": datetime.now(timezone.utc), "used": False})
        params = {"response_type": "code", "client_id": XERO_CLIENT_ID, "redirect_uri": XERO_REDIRECT_URI, "scope": XERO_DEFAULT_SCOPES, "state": state}
        return {"success": True, "url": f"{XERO_AUTHORIZE_URL}?{urlencode(params)}"}

    @router.get("/xero/callback")
    async def xero_callback(code: str | None = Query(None), state: str | None = Query(None), error: str | None = Query(None)):
        if error:
            return RedirectResponse(f"{FRONTEND_URL}/settings-board?xero_error={urlencode({'e': error})}")
        if not code or not state:
            return RedirectResponse(f"{FRONTEND_URL}/settings-board?xero_error=missing_code")
        saved = await db.xero_oauth_states.find_one({"state": state, "used": False})
        if not saved:
            return RedirectResponse(f"{FRONTEND_URL}/settings-board?xero_error=bad_state")
        bid = saved["business_id"]
        async with httpx.AsyncClient(timeout=25) as client:
            token_res = await client.post(XERO_TOKEN_URL, headers=_basic_auth(), data={"grant_type": "authorization_code", "code": code, "redirect_uri": XERO_REDIRECT_URI})
            if token_res.status_code >= 400:
                await db.xero_oauth_states.update_one({"_id": saved["_id"]}, {"$set": {"used": True, "error": token_res.text, "updated_at": datetime.now(timezone.utc)}})
                return RedirectResponse(f"{FRONTEND_URL}/settings-board?xero_error=token_failed")
            tokens = token_res.json()
            access_token = tokens.get("access_token")
            connections_res = await client.get(XERO_CONNECTIONS_URL, headers={"Authorization": f"Bearer {access_token}"})
            tenants = connections_res.json() if connections_res.status_code < 400 else []
        tenant = tenants[0] if tenants else {}
        now = datetime.now(timezone.utc)
        doc = {
            "business_id": bid,
            "status": "connected",
            "tenant_id": tenant.get("tenantId"),
            "tenant_name": tenant.get("tenantName"),
            "tenant_type": tenant.get("tenantType"),
            "scopes": XERO_DEFAULT_SCOPES.split(),
            "access_token": tokens.get("access_token"),
            "refresh_token": tokens.get("refresh_token"),
            "expires_in": tokens.get("expires_in"),
            "connected_at": now,
            "updated_at": now,
            "available_tenants": tenants,
        }
        await db.xero_connections.update_one({"business_id": bid}, {"$set": doc}, upsert=True)
        await db.xero_oauth_states.update_one({"_id": saved["_id"]}, {"$set": {"used": True, "updated_at": now}})
        await db.xero_sync_settings.update_one({"business_id": bid}, {"$setOnInsert": {"business_id": bid, "invoice_sync_enabled": False, "contact_sync_enabled": False, "payment_sync_enabled": False, "payroll_handoff_enabled": False, "approval_required": True, "created_at": now}, "$set": {"updated_at": now}}, upsert=True)
        return RedirectResponse(f"{FRONTEND_URL}/settings-board?xero_connected=1")

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
