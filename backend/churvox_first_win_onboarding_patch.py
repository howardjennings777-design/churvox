from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

VERSION = "churvox-first-win-onboarding-20260720"
INSTALLED: set[str] = set()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def clean(value: Any, limit: int = 4000) -> str:
    return " ".join(str(value or "").strip().split())[:limit]


def lower(value: Any) -> str:
    return clean(value).lower()


def json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items() if key not in {"password_hash", "hashed_password", "password"}}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    text = clean(value, 100)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def user_id(user: dict[str, Any]) -> str:
    return clean(user.get("id") or user.get("_id") or user.get("user_id") or user.get("email"), 300)


def business_id(user: dict[str, Any]) -> str:
    return clean(user.get("business_id") or user.get("businessId") or user.get("owner_business_id") or user.get("contractor_id") or user_id(user), 300)


def id_values(raw: Any, ObjectId) -> list[Any]:
    text = clean(raw, 300)
    values: list[Any] = []
    if text:
        values.append(text)
        try:
            if ObjectId.is_valid(text):
                values.append(ObjectId(text))
        except Exception:
            pass
    return values


def business_scope(bid: str, ObjectId) -> dict[str, Any]:
    values = id_values(bid, ObjectId)
    return {"$or": [{field: {"$in": values}} for field in ("business_id", "businessId", "contractor_id", "owner_id", "user_id", "created_by")]}


def route_matches(route, path: str, method: str) -> bool:
    return getattr(route, "path", "") == path and method.upper() in set(getattr(route, "methods", set()) or set())


def add_route(app, path: str, endpoint, method: str) -> None:
    try:
        app.router.routes = [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass
    app.add_api_route(path, endpoint, methods=[method])
    try:
        matches = [route for route in app.router.routes if route_matches(route, path, method)]
        app.router.routes = matches[-1:] + [route for route in app.router.routes if not route_matches(route, path, method)]
    except Exception:
        pass


def install(module) -> None:
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app, db = getattr(module, "app", None), getattr(module, "db", None)
    get_current_user, ObjectId = getattr(module, "get_current_user", None), getattr(module, "ObjectId", None)
    Request = getattr(module, "Request", None)
    if app is None or db is None or not get_current_user or ObjectId is None or Request is None:
        return

    async def progress(request: Request):
        user = await get_current_user(request)
        bid, uid = business_id(user), user_id(user)
        scope = business_scope(bid, ObjectId)

        async def count(name: str, extra: dict[str, Any] | None = None) -> int:
            query = {"$and": [scope, extra]} if extra else scope
            try:
                return int(await db[name].count_documents(query))
            except Exception:
                return 0

        clients, jobs, invoices = await count("clients"), await count("jobs"), await count("invoices")
        if invoices == 0:
            invoices = await count("invoice_vault")
        paid_filter = {"$or": [
            {"status": {"$regex": "^(paid|settled)$", "$options": "i"}},
            {"payment_status": {"$regex": "^(paid|settled)$", "$options": "i"}},
            {"paid_status": {"$regex": "^(paid|settled)$", "$options": "i"}},
            {"paid_at": {"$exists": True, "$ne": None}},
            {"$and": [{"amount_due": {"$lte": 0}}, {"amount_paid": {"$gt": 0}}]},
        ]}
        paid = await count("invoices", paid_filter)
        if paid == 0:
            paid = await count("invoice_vault", paid_filter)
        approvals = await count("command_executions", {"status": {"$in": ["executed", "approved"]}})
        if approvals == 0:
            approvals = await count("command_slips", {"status": {"$in": ["approved", "executed", "done"]}})
        try:
            state = await db.onboarding_progress.find_one({"business_id": bid}) or {}
        except Exception:
            state = {}
        basics_values = [user.get("business_name") or user.get("company_name"), user.get("email"), user.get("gst_rate") or user.get("tax_rate"), user.get("trade_type") or user.get("industry")]
        basics = sum(1 for value in basics_values if clean(value) and lower(value) not in {"other", "none"})
        steps = [
            {"key": "business_profile", "title": "Set your business basics", "done": basics >= 3, "page": "settings", "action": "Open Settings", "why": "Quotes, invoices and customer messages need the right business details.", "proof": "Business name, contact and tax details saved", "time": "1 min"},
            {"key": "first_client", "title": "Add your first real client", "done": clients > 0, "page": "clients", "action": "Open Clients", "why": "A real customer record makes the rest of Churvox useful.", "proof": f"{clients} client record{'s' if clients != 1 else ''}", "time": "1 min"},
            {"key": "first_job", "title": "Create your first job", "done": jobs > 0, "page": "work", "action": "Open Jobs", "why": "This starts the real job-to-invoice workflow.", "proof": f"{jobs} job record{'s' if jobs != 1 else ''}", "time": "1 min"},
            {"key": "first_invoice", "title": "Prepare your first invoice", "done": invoices > 0, "page": "invoices", "action": "Open Invoices", "why": "This turns completed work into an owner-controlled money step.", "proof": f"{invoices} invoice record{'s' if invoices != 1 else ''}", "time": "2 min"},
            {"key": "command_approval", "title": "Approve one thing in Command", "done": approvals > 0, "page": "command", "action": "Open Command", "why": "This teaches the Churvox promise: the admin is prepared and the owner approves.", "proof": f"{approvals} approved Command action{'s' if approvals != 1 else ''}", "time": "30 sec"},
            {"key": "first_payment", "title": "Get your first invoice paid", "done": paid > 0, "page": "invoices", "action": "Open Payments", "why": "The full win is a completed job becoming verified money received.", "proof": f"{paid} paid invoice{'s' if paid != 1 else ''}", "time": "Customer step"},
        ]
        done, total = sum(1 for step in steps if step["done"]), len(steps)
        created_at = parse_datetime(user.get("created_at") or user.get("createdAt"))
        recent = bool(created_at and created_at >= now_utc() - timedelta(days=30))
        completed = done >= total
        show = bool(not completed and not state.get("dismissed") and (recent or clients <= 1 or jobs <= 1 or invoices == 0 or state.get("resume_requested")))
        return json_safe({"ok": True, "success": True, "version": VERSION, "percent": round(done / total * 100), "done": done, "total": total, "completed": completed, "show_guide": show, "message": "One clear step at a time: client, job, invoice, owner approval and verified payment.", "steps": steps, "next_step": next((step for step in steps if not step["done"]), None), "counts": {"clients": clients, "jobs": jobs, "invoices": invoices, "command_approvals": approvals, "paid_invoices": paid}, "state": {"dismissed": bool(state.get("dismissed")), "skipped": bool(state.get("skipped"))}, "business_id": bid, "user_id": uid})

    async def mark_done(step_key: str, request: Request):
        user = await get_current_user(request)
        await db.onboarding_progress.update_one({"business_id": business_id(user)}, {"$addToSet": {"manual_acknowledged": clean(step_key, 100)}, "$set": {"updated_at": now_utc()}}, upsert=True)
        return await progress(request)

    async def state(request: Request):
        user = await get_current_user(request)
        try:
            payload = await request.json()
            payload = payload if isinstance(payload, dict) else {}
        except Exception:
            payload = {}
        patch: dict[str, Any] = {"updated_at": now_utc()}
        for key in ("dismissed", "skipped"):
            if key in payload:
                patch[key] = bool(payload.get(key))
        if payload.get("resume"):
            patch.update({"dismissed": False, "skipped": False, "resume_requested": True})
        await db.onboarding_progress.update_one({"business_id": business_id(user)}, {"$set": patch}, upsert=True)
        return await progress(request)

    for method, path, endpoint in [
        ("GET", "/api/onboarding/progress", progress),
        ("POST", "/api/onboarding/step/{step_key}/done", mark_done),
        ("POST", "/api/onboarding/state", state),
    ]:
        add_route(app, path, endpoint, method)
    INSTALLED.add(name)
