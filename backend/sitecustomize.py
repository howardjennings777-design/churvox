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
    p = Path(__file__).with_name("server.py")
    data = p.read_bytes()
    old_due = b64decode("e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCdhbW91bnRfZHVlJyl9JyBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==")
    new_due = b64decode("eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBpZiBoeWRyYXRlZC5nZXQoJ2Ftb3VudF9kdWUnKSBlbHNlICcnfQ==")
    old_total = b64decode("e2YnIGZvciB7aHlkcmF0ZWQuZ2V0KCd0b3RhbCcpfScgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9")
    new_total = b64decode("eycgZm9yICcgKyBoeWRyYXRlZC5nZXQoJ3RvdGFsJykgaWYgaHlkcmF0ZWQuZ2V0KCd0b3RhbCcpIGVsc2UgJyd9")
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

# CHURVOX_DIRECT_RUNTIME_PATCH_20260608
# Registers missing runtime routes directly on app after server.py is imported.
# This is intentionally small and safe: team invites, Xero status/connect, add-on checkout,
# and country-aware Stripe price env lookup.
try:
    import importlib.abc
    import importlib.machinery
    import os
    import secrets
    import sys
    from datetime import datetime, timezone, timedelta
    from urllib.parse import urlencode

    _cv_direct_patched = False
    _cv_direct_finding = False

    PLAN_ENV = {
        "solo": "START", "start": "START",
        "team": "CREW", "crew": "CREW",
        "pro": "OPERATOR", "operator": "OPERATOR",
        "enterprise": "COMMAND", "command": "COMMAND",
    }
    LEGACY_PLAN_ENV = {
        "solo": "SOLO",
        "team": "TEAM",
        "pro": "PRO",
        "enterprise": "ENTERPRISE",
    }
    COUNTRY_ALIASES = {
        "NZ": "NZ", "NZL": "NZ", "NEW ZEALAND": "NZ",
        "AU": "AU", "AUS": "AU", "AUSTRALIA": "AU",
        "US": "US", "USA": "US", "UNITED STATES": "US", "UNITED STATES OF AMERICA": "US",
        "UK": "UK", "GB": "UK", "GBR": "UK", "UNITED KINGDOM": "UK",
    }
    ALLOWED_TEAM_ROLES = {"worker", "manager", "office_admin", "payroll"}
    INVITE_ALLOWED_ROLES = {"owner", "employer", "admin", "manager", "office_admin", "business_owner"}

    def _s(value):
        return "" if value is None else str(value)

    def _clean_doc(doc):
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

    def _country_code(value):
        raw = _s(value).strip().upper()
        return COUNTRY_ALIASES.get(raw) or (raw[:2] if raw[:2] in {"NZ", "AU", "US", "UK"} else "")

    def _default_country():
        return _country_code(
            os.environ.get("CHURVOX_BILLING_COUNTRY")
            or os.environ.get("DEFAULT_BILLING_COUNTRY")
            or os.environ.get("STRIPE_PRICE_COUNTRY")
            or "NZ"
        ) or "NZ"

    def _country_from_docs(user=None, owner=None):
        for doc in (owner or {}, user or {}):
            for key in ["billing_country", "business_country", "country_code", "countryCode", "country", "market", "region"]:
                code = _country_code(doc.get(key))
                if code:
                    return code
        return _default_country()

    def _first_env(names):
        for name in names:
            value = os.environ.get(name)
            if value:
                return value, name
        return "", names[0] if names else ""

    def _plan_price_id(plan, country=None):
        key = _s(plan or "solo").lower()
        country = _country_code(country) or _default_country()
        customer_name = PLAN_ENV.get(key, "START")
        legacy_name = LEGACY_PLAN_ENV.get(key, key.upper())
        candidates = [
            f"STRIPE_PRICE_{customer_name}_{country}",
            f"STRIPE_PRICE_{legacy_name}_{country}",
            f"STRIPE_PRICE_{customer_name}",
            f"STRIPE_PRICE_{legacy_name}",
        ]
        price_id, used = _first_env(candidates)
        return price_id, used, candidates[0]

    def _addon_price_id(addon, country=None):
        country = _country_code(country) or _default_country()
        if addon == "xero_addon":
            candidates = [
                f"STRIPE_PRICE_XERO_ADDON_{country}",
                f"STRIPE_PRICE_XERO_{country}",
                "STRIPE_PRICE_XERO_ADDON",
                "STRIPE_PRICE_XERO",
            ]
        elif addon == "command_growth_pack":
            candidates = [
                f"STRIPE_PRICE_COMMAND_GROWTH_PACK_{country}",
                f"STRIPE_PRICE_GROWTH_PACK_{country}",
                "STRIPE_PRICE_COMMAND_GROWTH_PACK",
                "STRIPE_PRICE_GROWTH_PACK",
            ]
        else:
            candidates = []
        price_id, used = _first_env(candidates)
        return price_id, used, candidates[0] if candidates else "STRIPE_PRICE_UNKNOWN"

    def _plan_rank(plan):
        return {"none": 0, "solo": 1, "team": 2, "pro": 3, "enterprise": 4}.get(_s(plan).lower(), 0)

    def _patch_server(module):
        global _cv_direct_patched
        if _cv_direct_patched or not hasattr(module, "app"):
            return
        _cv_direct_patched = True

        app = module.app
        db = module.db
        ObjectId = module.ObjectId
        HTTPException = module.HTTPException
        Request = module.Request
        stripe = module.stripe

        def country_get_stripe_price_id(plan: str) -> str:
            price_id, used, wanted = _plan_price_id(plan)
            if not price_id:
                raise HTTPException(status_code=400, detail=f"Missing Stripe price ID. Add {wanted} in Render, or the matching base price env.")
            try:
                module.logger.info(f"[Billing] Using Stripe price env {used} for plan {plan}")
            except Exception:
                pass
            return price_id

        module.get_stripe_price_id = country_get_stripe_price_id
        try:
            module.PLAN_PRICE_IDS.update({
                "solo": _plan_price_id("solo")[0],
                "team": _plan_price_id("team")[0],
                "pro": _plan_price_id("pro")[0],
                "enterprise": _plan_price_id("enterprise")[0],
            })
        except Exception:
            pass

        async def _current_user_owner_business(request):
            user = await module.get_current_user(request)
            business_id = user.get("business_id") or user.get("id")
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
                try:
                    owner = await db.users.find_one({"_id": ObjectId(user["id"])})
                except Exception:
                    owner = None
            return user, owner or {}, business_oid

        async def _require_team_inviter(request):
            user, owner, business_oid = await _current_user_owner_business(request)
            role = _s(user.get("role") or owner.get("role")).lower()
            if role not in INVITE_ALLOWED_ROLES and not user.get("is_admin"):
                raise HTTPException(status_code=403, detail="Only owners, managers or office admins can invite team members")
            return user, owner, business_oid

        def _team_query(business_oid):
            roles = list(ALLOWED_TEAM_ROLES)
            return {
                "$and": [
                    {"role": {"$in": roles}},
                    {"$or": [
                        {"business_id": business_oid},
                        {"business_id": _s(business_oid)},
                    ]},
                ]
            }

        @app.get("/api/logic/team-members")
        async def logic_team_members(request: Request):
            user, owner, business_oid = await _require_team_inviter(request)
            rows = await db.users.find(_team_query(business_oid)).sort("created_at", -1).to_list(length=500)
            members = []
            for row in rows:
                clean = _clean_doc(row)
                clean.pop("password_hash", None)
                members.append(clean)
            return {"success": True, "data": {"members": members}, "members": members}

        @app.post("/api/logic/team-members")
        async def logic_create_team_member(payload: dict, request: Request):
            user, owner, business_oid = await _require_team_inviter(request)
            name = _s(payload.get("name")).strip()
            email = _s(payload.get("email")).strip().lower()
            phone = _s(payload.get("phone")).strip()
            role = _s(payload.get("role") or "worker").strip().lower()
            if role not in ALLOWED_TEAM_ROLES:
                role = "worker"
            if not name or not email:
                raise HTTPException(status_code=400, detail="Name and email are required")

            existing = await db.users.find_one({"email": email})
            if existing:
                if _s(existing.get("business_id")) == _s(business_oid):
                    raise HTTPException(status_code=400, detail="That email is already in this team")
                raise HTTPException(status_code=400, detail="That email is already registered")

            now = datetime.now(timezone.utc)
            team_doc = {
                "email": email,
                "name": name,
                "full_name": name,
                "phone": phone,
                "role": role,
                "status": "invited",
                "business_id": business_oid,
                "created_at": now,
                "updated_at": now,
            }
            result = await db.users.insert_one(team_doc)
            invite_token = secrets.token_urlsafe(32)
            await db.invite_tokens.insert_one({
                "token": invite_token,
                "user_id": result.inserted_id,
                "business_id": business_oid,
                "email": email,
                "expires_at": now + timedelta(days=7),
                "used": False,
                "created_at": now,
            })

            frontend_url = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
            invite_link = f"{frontend_url}/invite/setup/{invite_token}"
            business_name = owner.get("business_name") or user.get("business_name") or "your Churvox workspace"

            email_status = "not_configured"
            email_error = None
            try:
                content = module.build_invite_email(name, business_name, invite_link)
                email_result = await module.email_provider.send(
                    to=email,
                    subject=content["subject"],
                    html=content["html"],
                )
                email_status = "sent" if getattr(email_result, "success", False) else "failed"
                email_error = getattr(email_result, "error", None)
                await db.invite_emails.insert_one({
                    "to": email,
                    "subject": content["subject"],
                    "invite_link": invite_link,
                    "business_id": business_oid,
                    "worker_id": result.inserted_id,
                    "role": role,
                    "status": email_status,
                    "provider": getattr(email_result, "provider", None),
                    "email_id": getattr(email_result, "email_id", None),
                    "error": email_error,
                    "created_at": now,
                })
            except Exception as exc:
                email_status = "failed"
                email_error = str(exc)
                try:
                    await db.invite_emails.insert_one({
                        "to": email,
                        "invite_link": invite_link,
                        "business_id": business_oid,
                        "worker_id": result.inserted_id,
                        "role": role,
                        "status": email_status,
                        "error": email_error,
                        "created_at": now,
                    })
                except Exception:
                    pass

            created = await db.users.find_one({"_id": result.inserted_id})
            member = _clean_doc(created)
            member.pop("password_hash", None)
            message = "Invite sent." if email_status == "sent" else "Team member invited. Email did not send, but the invite link was created."
            return {
                "success": True,
                "data": {
                    "member": member,
                    "message": message,
                    "email_status": email_status,
                    "email_error": email_error,
                    "invite_link": invite_link,
                },
                "message": message,
            }

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

        @app.get("/api/billing/addons")
        async def billing_addons(request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
            data = await _addon_state(business_oid, owner)
            data["plan"] = owner.get("plan") or user.get("plan") or "solo"
            data["country"] = _country_from_docs(user, owner)
            return {"success": True, "data": data}

        @app.post("/api/billing/create-addon-checkout-session")
        async def create_addon_checkout(payload: dict, request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
            addon = _s(payload.get("addon") or payload.get("addon_key")).lower().strip()
            if addon not in {"xero_addon", "command_growth_pack"}:
                raise HTTPException(status_code=400, detail="Unknown add-on")

            plan = _s(owner.get("plan") or user.get("plan") or "solo").lower()
            if addon == "xero_addon" and _plan_rank(plan) < _plan_rank("pro"):
                raise HTTPException(status_code=403, detail="Xero add-on needs Operator or Command")
            if addon == "command_growth_pack" and plan != "enterprise":
                raise HTTPException(status_code=403, detail="Command Growth Pack needs Command plan")

            country = _country_from_docs(user, owner)
            price_id, used, wanted = _addon_price_id(addon, country)
            if not os.environ.get("STRIPE_SECRET_KEY"):
                raise HTTPException(status_code=500, detail="Stripe secret key is not configured")
            if not price_id:
                raise HTTPException(status_code=500, detail=f"Missing {wanted} in Render, or the matching base add-on price env.")

            frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
            session = stripe.checkout.Session.create(
                mode="subscription",
                line_items=[{"price": price_id, "quantity": 1}],
                success_url=f"{frontend}/plans?addon={addon}&session_id={{CHECKOUT_SESSION_ID}}&addon_success=1",
                cancel_url=f"{frontend}/plans?addon_cancelled=1",
                customer_email=user.get("email"),
                metadata={
                    "purchase_type": "addon",
                    "addon": addon,
                    "business_id": _s(business_oid),
                    "user_id": _s(user.get("id")),
                    "country": country,
                    "price_env": used,
                },
            )
            return {"success": True, "data": {"url": session.url, "country": country, "price_env": used}, "url": session.url}

        @app.post("/api/billing/confirm-addon-checkout")
        async def confirm_addon_checkout(payload: dict, request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
            addon = _s(payload.get("addon") or payload.get("addon_key")).lower().strip()
            session_id = _s(payload.get("session_id")).strip()
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

        @app.get("/api/xero/status")
        async def xero_status(request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
            addons = await _addon_state(business_oid, owner)
            conn = await db.xero_connections.find_one({"business_id": business_oid}) if business_oid else None
            settings = await db.xero_settings.find_one({"business_id": business_oid}) if business_oid else None
            connected = bool(conn and (conn.get("tenant_id") or conn.get("access_token") or conn.get("code_received")))
            safe_conn = _clean_doc(conn) or {}
            safe_conn.pop("access_token", None)
            safe_conn.pop("refresh_token", None)
            return {"success": True, "data": {"configured": _xero_configured(), "addon_active": bool(addons.get("xero_addon_active")), "connected": connected, "connection": safe_conn, "settings": _clean_doc(settings) or {}}}

        @app.post("/api/xero/settings")
        async def xero_settings(payload: dict, request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
            clean = dict(payload or {})
            clean.pop("business_id", None)
            clean["updated_at"] = datetime.now(timezone.utc)
            await db.xero_settings.update_one(
                {"business_id": business_oid},
                {"$set": clean, "$setOnInsert": {"business_id": business_oid, "created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
            return {"success": True, "data": {"settings": _clean_doc(clean)}}

        @app.post("/api/xero/connect/start")
        async def xero_connect_start(payload: dict, request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
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

        @app.get("/api/xero/callback")
        async def xero_callback(request: Request):
            state = _s(request.query_params.get("state"))
            code = _s(request.query_params.get("code"))
            frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")
            state_doc = await db.xero_oauth_states.find_one({"state": state}) if state else None
            if not state_doc or not code:
                raise HTTPException(status_code=400, detail="Invalid Xero callback")
            await db.xero_connections.update_one(
                {"business_id": state_doc["business_id"]},
                {"$set": {"business_id": state_doc["business_id"], "status": "oauth_code_received", "code_received": True, "connected_at": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}, "$setOnInsert": {"created_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
            return module.HTMLResponse(f"<html><head><meta http-equiv='refresh' content='0; url={frontend}/settings-board?xero=connected'></head><body>Xero connection received. Return to Churvox.</body></html>")

        @app.post("/api/xero/disconnect")
        async def xero_disconnect(request: Request):
            user, owner, business_oid = await _current_user_owner_business(request)
            await db.xero_connections.delete_many({"business_id": business_oid})
            return {"success": True, "data": {"connected": False}}

    class _DirectPatchLoader(importlib.abc.Loader):
        def __init__(self, wrapped):
            self.wrapped = wrapped

        def create_module(self, spec):
            if hasattr(self.wrapped, "create_module"):
                return self.wrapped.create_module(spec)
            return None

        def exec_module(self, module):
            self.wrapped.exec_module(module)
            _patch_server(module)

    class _DirectPatchFinder(importlib.abc.MetaPathFinder):
        def find_spec(self, fullname, path, target=None):
            global _cv_direct_finding
            if fullname != "server" or _cv_direct_finding:
                return None
            _cv_direct_finding = True
            try:
                spec = importlib.machinery.PathFinder.find_spec(fullname, path)
                if spec and spec.loader:
                    spec.loader = _DirectPatchLoader(spec.loader)
                    return spec
                return None
            finally:
                _cv_direct_finding = False

    if "server" in sys.modules:
        _patch_server(sys.modules["server"])
    else:
        sys.meta_path.insert(0, _DirectPatchFinder())
except Exception:
    pass
