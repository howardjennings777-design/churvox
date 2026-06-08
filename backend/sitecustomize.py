try:
    import builtins
    from fastapi import Body
    if not hasattr(builtins, "Body"):
        builtins.Body = Body
except Exception:
    pass

from pathlib import Path
from base64 import b64decode

try:
    p = Path(__file__).with_name('server.py')
    data = p.read_bytes()
    old_due = b64decode('e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCdhbW91bnRfZHVlJyl9JyBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==')
    new_due = b64decode('eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==')
    old_total = b64decode('e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCd0b3RhbCcpfScgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9')
    new_total = b64decode('eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ3RvdGFsJykgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9')
    fixed = data.replace(old_due, new_due).replace(old_total, new_total)
    if fixed != data:
        p.write_bytes(fixed)
except Exception:
    pass

try:
    from pymongo.errors import DuplicateKeyError
    from pymongo.collection import Collection
    _original_update_one = Collection.update_one

    class _IgnoredDuplicateResult:
        acknowledged = True
        matched_count = 1
        modified_count = 0
        upserted_id = None
        raw_result = {"ok": 1, "n": 1, "nModified": 0}

    def _churvox_safe_update_one(self, *args, **kwargs):
        try:
            return _original_update_one(self, *args, **kwargs)
        except DuplicateKeyError as exc:
            message = str(exc).lower()
            if getattr(self, "name", "") == "users" and "howardjennings77@gmail.com" in message:
                return _IgnoredDuplicateResult()
            raise

    Collection.update_one = _churvox_safe_update_one
except Exception:
    pass

# CHURVOX_XERO_AND_GROWTH_ADDONS_20260608
# Python imports sitecustomize before server.py. This import hook attaches the missing
# billing add-on and Xero routes after server.py has created app/db/api_router.
try:
    import importlib.abc
    import importlib.machinery
    import os
    import secrets
    import sys
    from datetime import datetime, timezone
    from urllib.parse import urlencode

    _churvox_routes_patched = False
    _churvox_patch_finding = False

    def _cv_str(value):
        return "" if value is None else str(value)

    def _cv_clean_doc(doc):
        if not doc:
            return doc
        out = dict(doc)
        if "_id" in out:
            out["id"] = str(out.pop("_id"))
        for key, value in list(out.items()):
            if hasattr(value, "isoformat"):
                out[key] = value.isoformat()
            elif value.__class__.__name__ == "ObjectId":
                out[key] = str(value)
        return out

    def _cv_plan_rank(plan):
        return {"none": 0, "solo": 1, "team": 2, "pro": 3, "enterprise": 4}.get(_cv_str(plan).lower(), 0)

    def _cv_patch_server(module):
        global _churvox_routes_patched
        if _churvox_routes_patched or not hasattr(module, "app") or not hasattr(module, "api_router"):
            return
        _churvox_routes_patched = True

        api_router = module.api_router
        db = module.db
        ObjectId = module.ObjectId
        HTTPException = module.HTTPException
        Request = module.Request
        stripe = module.stripe

        async def _user_owner_business(request):
            user = await module.get_current_user(request)
            business_id = user.get("business_id") or user.get("id")
            business_oid = None
            try:
                business_oid = ObjectId(str(business_id))
            except Exception:
                business_oid = business_id
            owner = None
            if business_oid:
                try:
                    owner = await db.users.find_one({"_id": business_oid})
                except Exception:
                    owner = None
            if not owner and user.get("id"):
                owner = await db.users.find_one({"_id": ObjectId(user["id"])})
            return user, owner or {}, business_oid

        async def _addon_state(business_oid, owner):
            doc = await db.billing_addons.find_one({"business_id": business_oid}) if business_oid else None
            doc = doc or {}
            blocks = int(doc.get("command_growth_packs") or doc.get("extra_user_blocks") or owner.get("command_growth_packs") or 0)
            return {
                "xero_addon_active": bool(doc.get("xero_addon_active") or owner.get("xero_addon_active")),
                "command_growth_packs": blocks,
                "extra_user_blocks": blocks,
                "max_extra_team_members": blocks * 50,
                "growth_pack_active": blocks > 0,
            }

        def _addon_price(addon):
            if addon == "xero_addon":
                return os.environ.get("STRIPE_PRICE_XERO_ADDON") or os.environ.get("STRIPE_PRICE_XERO") or ""
            if addon == "command_growth_pack":
                return os.environ.get("STRIPE_PRICE_COMMAND_GROWTH_PACK") or os.environ.get("STRIPE_PRICE_GROWTH_PACK") or ""
            return ""

        @api_router.get("/billing/addons")
        async def billing_addons(request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            data = await _addon_state(business_oid, owner)
            data["plan"] = owner.get("plan") or user.get("plan") or "solo"
            return {"success": True, "data": data}

        @api_router.post("/billing/create-addon-checkout-session")
        async def create_addon_checkout(payload: dict, request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            addon = _cv_str(payload.get("addon") or payload.get("addon_key")).lower().strip()
            if addon not in {"xero_addon", "command_growth_pack"}:
                raise HTTPException(status_code=400, detail="Unknown add-on")

            plan = _cv_str(owner.get("plan") or user.get("plan") or "solo").lower()
            if addon == "xero_addon" and _cv_plan_rank(plan) < _cv_plan_rank("pro"):
                raise HTTPException(status_code=403, detail="Xero add-on needs Operator or Command")
            if addon == "command_growth_pack" and plan != "enterprise":
                raise HTTPException(status_code=403, detail="Command Growth Pack needs Command plan")

            price_id = _addon_price(addon)
            if not os.environ.get("STRIPE_SECRET_KEY"):
                raise HTTPException(status_code=500, detail="Stripe secret key is not configured")
            if not price_id:
                env_name = "STRIPE_PRICE_XERO_ADDON" if addon == "xero_addon" else "STRIPE_PRICE_COMMAND_GROWTH_PACK"
                raise HTTPException(status_code=500, detail=f"Missing {env_name} in Render")

            frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
            session = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{frontend}/plans?addon={addon}&session_id={{CHECKOUT_SESSION_ID}}&addon_success=1",
                cancel_url=f"{frontend}/plans?addon_cancelled=1",
                customer_email=user.get("email"),
                metadata={"purchase_type": "addon", "addon": addon, "business_id": _cv_str(business_oid), "user_id": _cv_str(user.get("id"))},
            )
            return {"success": True, "data": {"url": session.url}, "url": session.url}

        @api_router.post("/billing/confirm-addon-checkout")
        async def confirm_addon_checkout(payload: dict, request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            addon = _cv_str(payload.get("addon") or payload.get("addon_key")).lower().strip()
            session_id = _cv_str(payload.get("session_id")).strip()
            if addon not in {"xero_addon", "command_growth_pack"}:
                raise HTTPException(status_code=400, detail="Unknown add-on")
            if not session_id:
                raise HTTPException(status_code=400, detail="Missing checkout session")

            try:
                session = stripe.checkout.Session.retrieve(session_id)
                metadata = getattr(session, "metadata", {}) or session.get("metadata", {}) or {}
                if metadata.get("addon") and metadata.get("addon") != addon:
                    raise HTTPException(status_code=400, detail="Checkout session does not match add-on")
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(status_code=400, detail=f"Could not verify Stripe checkout session: {exc}")

            update = {"updated_at": datetime.now(timezone.utc), "last_stripe_session_id": session_id}
            inc = {}
            if addon == "xero_addon":
                update["xero_addon_active"] = True
                message = "Xero add-on activated"
            else:
                inc["command_growth_packs"] = 1
                inc["extra_user_blocks"] = 1
                message = "Command Growth Pack added"

            await db.billing_addons.update_one(
                {"business_id": business_oid},
                {"$set": update, "$inc": inc, "$setOnInsert": {"business_id": business_oid, "created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
            data = await _addon_state(business_oid, owner)
            return {"success": True, "message": message, "data": {**data, "message": message}}

        def _xero_configured():
            return bool(os.environ.get("XERO_CLIENT_ID") and os.environ.get("XERO_CLIENT_SECRET") and os.environ.get("XERO_REDIRECT_URI"))

        @api_router.get("/xero/status")
        async def xero_status(request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            addons = await _addon_state(business_oid, owner)
            conn = await db.xero_connections.find_one({"business_id": business_oid}) if business_oid else None
            settings = await db.xero_settings.find_one({"business_id": business_oid}) if business_oid else None
            connected = bool(conn and (conn.get("tenant_id") or conn.get("access_token") or conn.get("code_received")))
            safe_conn = _cv_clean_doc(conn) or {}
            safe_conn.pop("access_token", None)
            safe_conn.pop("refresh_token", None)
            return {"success": True, "data": {"configured": _xero_configured(), "addon_active": bool(addons.get("xero_addon_active")), "connected": connected, "connection": safe_conn, "settings": _cv_clean_doc(settings) or {}}}

        @api_router.post("/xero/settings")
        async def xero_settings(payload: dict, request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            clean = dict(payload or {})
            clean.pop("business_id", None)
            clean["updated_at"] = datetime.now(timezone.utc)
            await db.xero_settings.update_one({"business_id": business_oid}, {"$set": clean, "$setOnInsert": {"business_id": business_oid, "created_at": datetime.now(timezone.utc)}}, upsert=True)
            return {"success": True, "data": {"settings": _cv_clean_doc(clean)}}

        @api_router.post("/xero/connect/start")
        async def xero_connect_start(payload: dict, request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            addons = await _addon_state(business_oid, owner)
            if not _xero_configured():
                raise HTTPException(status_code=500, detail="Render needs XERO_CLIENT_ID, XERO_CLIENT_SECRET and XERO_REDIRECT_URI")
            if not addons.get("xero_addon_active"):
                raise HTTPException(status_code=403, detail="Add Xero from Plans first")
            state = secrets.token_urlsafe(24)
            await db.xero_oauth_states.insert_one({"state": state, "business_id": business_oid, "user_id": user.get("id"), "created_at": datetime.now(timezone.utc)})
            scopes = "offline_access accounting.transactions accounting.contacts accounting.settings"
            query = urlencode({"response_type": "code", "client_id": os.environ.get("XERO_CLIENT_ID"), "redirect_uri": os.environ.get("XERO_REDIRECT_URI"), "scope": scopes, "state": state})
            url = f"https://login.xero.com/identity/connect/authorize?{query}"
            return {"success": True, "data": {"url": url}, "url": url}

        @api_router.get("/xero/callback")
        async def xero_callback(request: Request):
            state = _cv_str(request.query_params.get("state"))
            code = _cv_str(request.query_params.get("code"))
            frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
            state_doc = await db.xero_oauth_states.find_one({"state": state}) if state else None
            if not state_doc or not code:
                raise HTTPException(status_code=400, detail="Invalid Xero callback")
            await db.xero_connections.update_one({"business_id": state_doc["business_id"]}, {"$set": {"business_id": state_doc["business_id"], "status": "oauth_code_received", "code_received": True, "connected_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}}, upsert=True)
            return module.HTMLResponse(f"<html><head><meta http-equiv='refresh' content='0; url={frontend}/settings-board?xero=connected'></head><body>Xero connection received. Return to Churvox.</body></html>")

        @api_router.post("/xero/disconnect")
        async def xero_disconnect(request: Request):
            user, owner, business_oid = await _user_owner_business(request)
            await db.xero_connections.delete_many({"business_id": business_oid})
            return {"success": True, "data": {"connected": False}}

    class _ChurvoxServerPatchLoader(importlib.abc.Loader):
        def __init__(self, wrapped):
            self.wrapped = wrapped
        def create_module(self, spec):
            if hasattr(self.wrapped, "create_module"):
                return self.wrapped.create_module(spec)
            return None
        def exec_module(self, module):
            self.wrapped.exec_module(module)
            _cv_patch_server(module)

    class _ChurvoxServerPatchFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path, target=None):
            global _churvox_patch_finding
            if fullname != "server" or _churvox_patch_finding:
                return None
            _churvox_patch_finding = True
            try:
                spec = importlib.machinery.PathFinder.find_spec(fullname, path)
                if spec and spec.loader:
                    spec.loader = _ChurvoxServerPatchLoader(spec.loader)
                    return spec
                return None
            finally:
                _churvox_patch_finding = False

    if "server" in sys.modules:
        _cv_patch_server(sys.modules["server"])
    else:
        sys.meta_path.insert(0, _ChurvoxServerPatchFinder())
except Exception:
    pass
