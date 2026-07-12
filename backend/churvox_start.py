"""
Clean Churvox production entrypoint.

This imports the existing server app, then installs a reliable Stripe checkout
route on top of it before Uvicorn serves the app.

Why this exists:
- The old checkout route was brittle around plan aliases, roles and Stripe price envs.
- Browser fetch handling made it hard to tell if checkout failed or just never redirected.
- This adds checkout redirect routes that send the browser straight to Stripe.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any
from urllib.parse import parse_qs

from fastapi import Body, HTTPException, Request
from starlette.responses import RedirectResponse

import server

app = server.app

try:
    import churvox_business_system_suite_patch
    churvox_business_system_suite_patch.install(server)
except Exception as exc:
    try:
        server.logger.warning("[Churvox] Business system suite entrypoint install skipped: %s", exc)
    except Exception:
        pass

try:
    try:
        import churvox_paid_launch_live_patch
    except Exception:
        from backend import churvox_paid_launch_live_patch
    # server.py has now finished registering legacy routes, so this final forced
    # install owns Command scan/slips/Admin Brain precedence in production.
    churvox_paid_launch_live_patch.install(server, force=True)
except Exception as exc:
    try:
        server.logger.warning("[Churvox] Final Command fast-load install skipped: %s", exc)
    except Exception:
        pass

PLAN_ALIASES = {
    "start": "solo",
    "solo": "solo",
    "crew": "team",
    "team": "team",
    "operator": "pro",
    "pro": "pro",
    "command": "enterprise",
    "enterprise": "enterprise",
}
PLAN_LABELS = {
    "solo": "Start",
    "team": "Crew",
    "pro": "Operator",
    "enterprise": "Command",
}
PLAN_ENV_NAMES = {
    "solo": "START",
    "team": "CREW",
    "pro": "OPERATOR",
    "enterprise": "COMMAND",
}
LEGACY_ENV_NAMES = {
    "solo": "SOLO",
    "team": "TEAM",
    "pro": "PRO",
    "enterprise": "ENTERPRISE",
}
COUNTRY_ALIASES = {
    "NZ": "NZ",
    "NZL": "NZ",
    "NEW ZEALAND": "NZ",
    "AU": "AU",
    "AUS": "AU",
    "AUSTRALIA": "AU",
    "US": "US",
    "USA": "US",
    "UNITED STATES": "US",
    "UNITED STATES OF AMERICA": "US",
    "UK": "UK",
    "GB": "UK",
    "GBR": "UK",
    "UNITED KINGDOM": "UK",
}
PLAN_PRICES = {
    "solo": {"NZ": 39, "AU": 39, "US": 29, "UK": 25},
    "team": {"NZ": 89, "AU": 89, "US": 69, "UK": 59},
    "pro": {"NZ": 149, "AU": 149, "US": 119, "UK": 99},
    "enterprise": {"NZ": 299, "AU": 299, "US": 239, "UK": 199},
}
CURRENCIES = {
    "NZ": "nzd",
    "AU": "aud",
    "US": "usd",
    "UK": "gbp",
}
OWNER_BILLING_ROLES = {
    "employer",
    "admin",
    "owner",
    "business_owner",
    "superadmin",
    "manager",
    "office_admin",
}
COMMAND_SAFETY = "Owner approval recorded. Nothing was sent, synced, charged or changed."
COMMAND_SMOKE_MARKER = "command-live-smoke-guard-20260710d"


def _s(value: Any) -> str:
    return "" if value is None else str(value)


def _normal_plan(value: Any = None) -> str:
    raw = _s(value or "pro").strip().lower()
    return PLAN_ALIASES.get(raw, "pro")


def _normal_country(value: Any = None) -> str:
    raw = _s(value or os.environ.get("CHURVOX_BILLING_COUNTRY") or os.environ.get("DEFAULT_BILLING_COUNTRY") or "NZ").strip().upper()
    return COUNTRY_ALIASES.get(raw, "NZ")


def _price_env(plan: str, country: str) -> tuple[str, str]:
    candidates = [
        f"STRIPE_PRICE_{PLAN_ENV_NAMES.get(plan, 'OPERATOR')}_{country}",
        f"STRIPE_PRICE_{LEGACY_ENV_NAMES.get(plan, 'PRO')}_{country}",
        f"STRIPE_PRICE_{PLAN_ENV_NAMES.get(plan, 'OPERATOR')}",
        f"STRIPE_PRICE_{LEGACY_ENV_NAMES.get(plan, 'PRO')}",
    ]
    for key in candidates:
        value = os.environ.get(key, "").strip()
        if value:
            return value, key
    return "", "dynamic_price_data"


def _amount_cents(plan: str, country: str) -> int:
    amount = PLAN_PRICES.get(plan, PLAN_PRICES["pro"]).get(country, PLAN_PRICES.get(plan, PLAN_PRICES["pro"])["NZ"])
    return int(round(float(amount) * 100))


def _checkout_line_item(plan: str, country: str) -> tuple[dict[str, Any], str]:
    price_id, source = _price_env(plan, country)
    if price_id:
        return {"price": price_id, "quantity": 1}, source

    return {
        "price_data": {
            "currency": CURRENCIES.get(country, "nzd"),
            "unit_amount": _amount_cents(plan, country),
            "recurring": {"interval": "month"},
            "product_data": {
                "name": f"Churvox {PLAN_LABELS.get(plan, 'Operator')}",
                "description": "Churvox monthly subscription plan",
            },
        },
        "quantity": 1,
    }, source


def _remove_checkout_routes() -> None:
    remove_paths = {
        "/api/billing/create-checkout-session",
        "/api/billing/start-checkout",
        "/api/billing/start-checkout-form",
    }
    kept = []
    for route in list(app.router.routes):
        if getattr(route, "path", "") in remove_paths:
            continue
        kept.append(route)
    app.router.routes = kept


def _json_safe(value: Any) -> Any:
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, dict):
        return {key: _json_safe(item) for key, item in value.items()}
    try:
        if isinstance(value, server.ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _doc_out(doc: Any) -> Any:
    if not isinstance(doc, dict):
        return doc
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    return _json_safe(out)


def _business_ids(user: dict[str, Any]) -> tuple[str, Any]:
    business_id = _s((user or {}).get("business_id") or (user or {}).get("id") or (user or {}).get("_id"))
    try:
        return business_id, server.ObjectId(business_id)
    except Exception:
        return business_id, business_id


def _safe_text(value: Any, fallback: str = "") -> str:
    text = " ".join(_s(value).strip().split())
    return text[:900] or fallback


async def _command_user(request: Request) -> dict[str, Any]:
    return await server.get_current_user(request)


async def _request_json(request: Request) -> dict[str, Any]:
    try:
        body = await request.json()
        return body if isinstance(body, dict) else {}
    except Exception:
        return {}


async def _insert_command_slip(user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    business_id, business_oid = _business_ids(user)
    now_value = datetime.now(timezone.utc)
    doc = {
        "business_id": business_id,
        "contractor_id": business_oid,
        "source_type": _safe_text(payload.get("source_type"), "command_smoke_safe"),
        "source_id": _safe_text(payload.get("source_id") or payload.get("title"), "command-smoke-safe"),
        "action_type": _safe_text(payload.get("action_type"), "owner_review"),
        "title": _safe_text(payload.get("title"), "Command request"),
        "found": _safe_text(payload.get("found"), "Command request needs owner review."),
        "prepared": _safe_text(payload.get("prepared"), "Prepared for owner approval."),
        "why": _safe_text(payload.get("why"), "Owner approval is required before anything changes."),
        "urgency": _safe_text(payload.get("urgency"), "Owner review"),
        "status": "open",
        "payload": {
            "prepared_only": True,
            "owner_review_only": True,
            "no_auto_send": True,
            "no_auto_sync": True,
            "no_auto_charge": True,
            "no_auto_record_change": True,
            **(payload.get("payload") if isinstance(payload.get("payload"), dict) else {}),
        },
        "owner_review_only": True,
        "prepared_only": True,
        "no_auto_send": True,
        "no_auto_sync": True,
        "no_auto_charge": True,
        "no_auto_record_change": True,
        "created_by": _s(user.get("id") or user.get("_id")),
        "created_at": now_value,
        "updated_at": now_value,
        "audit": [{
            "by": _s(user.get("id") or user.get("_id")),
            "role": _s(user.get("role") or "owner"),
            "action": "created",
            "note": "Command request created safely from production entrypoint",
            "at": now_value,
            "safety": COMMAND_SAFETY,
        }],
    }
    result = await server.db.command_slips.insert_one(doc)
    doc["_id"] = result.inserted_id
    try:
        await server.db.command_events.insert_one({
            "business_id": business_id,
            "contractor_id": business_oid,
            "event_type": _safe_text(payload.get("event_type"), "command_request_created"),
            "title": doc["title"],
            "detail": doc["prepared"],
            "slip_id": str(result.inserted_id),
            "safety": COMMAND_SAFETY,
            "created_by": doc["created_by"],
            "created_at": now_value,
        })
    except Exception:
        pass
    return doc


def _billing_allowed(user: dict[str, Any]) -> bool:
    role = _s((user or {}).get("role") or "employer").strip().lower()
    return bool(
        role in OWNER_BILLING_ROLES
        or (user or {}).get("is_admin")
        or (user or {}).get("is_platform_owner")
    )


async def _user_from_token(token: str) -> dict[str, Any]:
    token = _s(token).strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing checkout token")
    try:
        payload = server.jwt.decode(token, server.JWT_SECRET, algorithms=[server.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await server.db.users.find_one({"_id": server.ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        if "business_id" in user and isinstance(user["business_id"], server.ObjectId):
            user["business_id"] = str(user["business_id"])
        elif "business_id" not in user:
            user["business_id"] = user["id"]
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid checkout token")


async def _make_checkout(request: Request, payload: dict[str, Any]) -> tuple[Any, str, str, str]:
    payload = dict(payload or {})
    token = payload.get("token") or payload.get("access_token")
    user = await _user_from_token(token) if token else await server.get_current_user(request)
    if not _billing_allowed(user):
        raise HTTPException(status_code=403, detail="Only business owners and admins can start billing checkout")

    secret = os.environ.get("STRIPE_SECRET_KEY", "").strip()
    if not secret:
        raise HTTPException(status_code=500, detail="Stripe secret key not configured in Render")
    server.stripe.api_key = secret

    plan = _normal_plan(
        payload.get("plan")
        or payload.get("plan_type")
        or payload.get("ui_plan")
        or payload.get("backend_plan")
        or payload.get("legacy_plan")
    )
    country = _normal_country(payload.get("country") or payload.get("region") or payload.get("billing_country"))
    line_item, price_source = _checkout_line_item(plan, country)
    frontend = (os.environ.get("FRONTEND_URL") or "https://www.churvox.com").rstrip("/")

    metadata = {
        "user_id": _s(user.get("id") or user.get("_id")),
        "business_id": _s(user.get("business_id") or user.get("id")),
        "plan": plan,
        "country": country,
        "source": "churvox_start_checkout",
    }

    try:
        session = server.stripe.checkout.Session.create(
            mode="subscription",
            customer_email=user.get("email"),
            line_items=[line_item],
            subscription_data={"trial_period_days": 14, "metadata": metadata},
            metadata=metadata,
            success_url=f"{frontend}/billing/success?session_id={{CHECKOUT_SESSION_ID}}&plan={plan}&country={country}",
            cancel_url=f"{frontend}/dashboard?checkout=cancelled&plan={plan}&country={country}#plans",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Stripe checkout error: {str(exc)}")

    try:
        await server.db.checkout_debug.insert_one({
            "business_id": metadata["business_id"],
            "user_id": metadata["user_id"],
            "plan": plan,
            "country": country,
            "session_id": session.id,
            "price_source": price_source,
            "created_at": datetime.now(timezone.utc),
        })
    except Exception:
        pass

    return session, plan, country, price_source


_remove_checkout_routes()


@app.get("/api/command/live-smoke-marker")
async def command_live_smoke_marker():
    return {"success": True, "marker": COMMAND_SMOKE_MARKER, "safety": COMMAND_SAFETY}


@app.api_route("/api/command/events", methods=["GET", "POST"])
async def command_events_entrypoint(request: Request):
    user = await _command_user(request)
    business_id, _ = _business_ids(user)
    items = await server.db.command_events.find({"business_id": business_id}).sort("created_at", -1).limit(100).to_list(100)
    return {"success": True, "events": [_doc_out(item) for item in items], "marker": COMMAND_SMOKE_MARKER, "safety": COMMAND_SAFETY}


@app.api_route("/api/command/audit", methods=["GET", "POST"])
async def command_audit_entrypoint(request: Request):
    user = await _command_user(request)
    business_id, _ = _business_ids(user)
    slips = await server.db.command_slips.find({"business_id": business_id}).sort("updated_at", -1).limit(100).to_list(100)
    audit = []
    for slip in slips:
        for entry in slip.get("audit") or []:
            row = _json_safe(dict(entry))
            row["slip_id"] = str(slip.get("_id") or "")
            row["title"] = _safe_text(slip.get("title"), "Command slip")
            audit.append(row)
    return {"success": True, "audit": audit[:120], "marker": COMMAND_SMOKE_MARKER, "safety": COMMAND_SAFETY}


@app.api_route("/api/command/worker-payment-request", methods=["GET", "POST"])
async def worker_payment_request_entrypoint(request: Request):
    user = await _command_user(request)
    payload = await _request_json(request)
    job_title = _safe_text(payload.get("job_title") or payload.get("title"), "Worker payment request")
    amount = _safe_text(payload.get("amount") or payload.get("amount_due"), "Amount needs owner check")
    invoice_number = _safe_text(payload.get("invoice") or payload.get("invoice_number"), "No invoice linked")
    customer = _safe_text(payload.get("customer") or payload.get("customer_name"), "Customer")
    slip = await _insert_command_slip(user, {
        "source_type": "worker_payment",
        "action_type": "prepare_payment_link",
        "event_type": "worker_payment_requested",
        "title": f"Worker payment link request: {job_title}",
        "found": f"Worker asked to take card payment for {customer}. Amount: {amount}. Invoice: {invoice_number}.",
        "prepared": "Prepare or attach an approved invoice payment link for the worker. No card was charged.",
        "why": "Owner approval is required before a worker can show a payment link or collect card payment.",
        "payload": {
            "worker_payment_request": True,
            "job_title": job_title,
            "amount": amount,
            "invoice": invoice_number,
            "customer": customer,
            "payment_link": _safe_text(payload.get("payment_link"), ""),
            "office_role": "Bookkeeper",
            "actions": ["Approve payment link", "Edit invoice", "Ask worker", "Park"],
            "will_do": ["Prepare payment-link draft only", "Keep card charge locked", "Record owner approval"],
            "prepared_form": {
                "Client": customer,
                "Job": job_title,
                "Amount": amount,
                "Invoice": invoice_number,
                "Payment link": "Hold until owner approval",
            },
        },
    })
    return {"success": True, "slip": _doc_out(slip), "marker": COMMAND_SMOKE_MARKER, "safety": COMMAND_SAFETY, "message": "Payment link request sent to Command. No card was charged."}


@app.api_route("/api/command/worker-update-request", methods=["GET", "POST"])
async def worker_update_request_entrypoint(request: Request):
    user = await _command_user(request)
    payload = await _request_json(request)
    job_title = _safe_text(payload.get("job_title") or payload.get("title"), "Worker update")
    update = _safe_text(payload.get("update") or payload.get("note") or payload.get("message"), "Worker update needs owner review")
    update_type = _safe_text(payload.get("update_type") or payload.get("type"), "Worker update")
    slip = await _insert_command_slip(user, {
        "source_type": "worker_update",
        "action_type": "worker_update_review",
        "event_type": "worker_update_requested",
        "title": f"Worker update sent to Command: {job_title}",
        "found": f"{update_type}: {update}",
        "prepared": "Office team prepared this worker update for owner review.",
        "why": "Owner approval is required before any job, client, invoice or message record changes.",
        "payload": {
            "worker_update_request": True,
            "job_title": job_title,
            "update": update,
            "update_type": update_type,
            "office_role": "Office Manager",
            "actions": ["Approve update", "Edit note", "Ask worker", "Park"],
            "will_do": ["Save update draft only", "Keep record changes locked", "Record owner approval"],
            "prepared_form": {
                "Job": job_title,
                "Update type": update_type,
                "Worker note": update,
                "Prepared action": "Review before changing any record",
            },
        },
    })
    return {"success": True, "slip": _doc_out(slip), "marker": COMMAND_SMOKE_MARKER, "safety": COMMAND_SAFETY, "message": "Worker update sent to Command. Nothing was sent, synced, charged or changed."}


@app.get("/api/billing/start-checkout")
async def start_checkout(request: Request, plan: str = "pro", country: str = "NZ"):
    session, _plan, _country, _source = await _make_checkout(request, {"plan": plan, "country": country})
    return RedirectResponse(session.url, status_code=303)


@app.post("/api/billing/start-checkout-form")
async def start_checkout_form(request: Request):
    raw = (await request.body()).decode("utf-8", errors="ignore")
    payload = {key: values[0] for key, values in parse_qs(raw).items() if values}
    session, _plan, _country, _source = await _make_checkout(request, payload)
    return RedirectResponse(session.url, status_code=303)


@app.post("/api/billing/create-checkout-session")
async def create_checkout_session(request: Request, payload: dict = Body(default_factory=dict)):
    session, plan, country, price_source = await _make_checkout(request, payload)
    return {
        "success": True,
        "url": session.url,
        "checkout_url": session.url,
        "session_id": session.id,
        "plan": plan,
        "country": country,
        "price_source": price_source,
    }

try:
    server.logger.info("[Churvox] Clean production checkout entrypoint loaded with Command smoke routes")
except Exception:
    pass
