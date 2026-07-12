from __future__ import annotations

from datetime import datetime, timezone, timedelta
import importlib
import importlib.abc
import importlib.machinery
import sys
from typing import Any, Dict, List

from fastapi import HTTPException
from starlette.requests import Request

TARGETS = {"server", "backend.server", "churvox_legacy_server"}
INSTALLED = set()
OWNER_EMAIL = "hello@churvox.com"


def now():
    return datetime.now(timezone.utc)


def text(value):
    try:
        return str(value or "").strip()
    except Exception:
        return ""


def low(value):
    return text(value).lower()


def key(value):
    return "".join(ch for ch in low(value) if ch.isalnum())


def read(user: Any, *names: str, default: Any = ""):
    for name in names:
        try:
            if isinstance(user, dict) and user.get(name) not in (None, ""):
                return user.get(name)
            value = getattr(user, name, None)
            if value not in (None, ""):
                return value
        except Exception:
            pass
    return default


def email_of(user):
    return low(read(user, "email", "user_email"))


def safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    try:
        from bson import ObjectId
        if isinstance(value, ObjectId):
            return str(value)
    except Exception:
        pass
    if isinstance(value, list):
        return [safe(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if any(word in str(k).lower() for word in ["password", "token", "secret", "hash"]):
                continue
            out["id" if k == "_id" else k] = safe(v)
        return out
    return value


def user_id(user):
    return text(read(user, "id", "_id", "user_id"))


def business_id(user):
    return text(read(user, "business_id", "businessId", "owner_business_id", "contractor_id", default=user_id(user)))


def scope(user, ObjectId):
    values = {user_id(user), business_id(user)}
    values = {v for v in values if v}
    expanded = list(values)
    for value in list(values):
        try:
            expanded.append(ObjectId(value))
        except Exception:
            pass
    email = email_of(user)
    ors = [
        {"business_id": {"$in": expanded}}, {"businessId": {"$in": expanded}}, {"contractor_id": {"$in": expanded}},
        {"owner_business_id": {"$in": expanded}}, {"owner_id": {"$in": expanded}}, {"user_id": {"$in": expanded}},
        {"created_by": {"$in": expanded}}, {"created_by_id": {"$in": expanded}}, {"employer_id": {"$in": expanded}}, {"account_id": {"$in": expanded}},
    ]
    if email:
        ors.extend([{"owner_email": email}, {"created_by_email": email}, {"business_email": email}, {"email": email}])
    return {"$or": ors}


async def exists(db, name: str) -> bool:
    try:
        return name in set(await db.list_collection_names())
    except Exception:
        return False


async def count(db, name: str, query=None) -> int:
    try:
        if not await exists(db, name):
            return 0
        return int(await db[name].count_documents(query or {}))
    except Exception:
        return 0


async def rows(db, name: str, query=None, limit=80, sort="created_at") -> List[Dict[str, Any]]:
    try:
        if not await exists(db, name):
            return []
        cursor = db[name].find(query or {})
        try:
            cursor = cursor.sort(sort, -1)
        except Exception:
            pass
        return [safe(row) for row in await cursor.limit(limit).to_list(length=limit)]
    except Exception:
        return []


def status(row):
    return key((row or {}).get("status") or (row or {}).get("job_status") or (row or {}).get("state") or (row or {}).get("priority"))


def is_open(row):
    return not any(word in status(row) for word in ["complete", "completed", "done", "paid", "cancelled", "canceled", "archived", "declined"])


def row_time(row):
    for name in ["created_at", "updated_at", "last_seen", "last_active", "timestamp", "date"]:
        if (row or {}).get(name):
            return safe(row.get(name))
    return now().isoformat()


def title_of(row, fallback="Record"):
    return text((row or {}).get("title") or (row or {}).get("job_title") or (row or {}).get("subject") or (row or {}).get("name") or (row or {}).get("summary") or fallback)


def proof_pack_for(industry_key="field_service", mode="field_service"):
    k = key(industry_key)
    m = key(mode)
    base = ["Before photo", "After photo", "Worker completion note", "Customer-visible summary"]
    if "lawn" in k or "landscape" in k or "garden" in k:
        return ["Before lawn/garden photo", "After lawn/garden photo", "Gate/access note", "Green waste or extra work note", "Weather issue note"]
    if "clean" in k or "visit" in m:
        return ["Before condition photo", "After clean photo", "Checklist completed", "Access/key issue note", "Extra time or supplies note"]
    if any(word in k for word in ["plumbing", "electrical", "hvac"]):
        return ["Before issue photo", "After repair/install photo", "Parts used", "Safety/compliance note", "Customer approval note"]
    if any(word in k for word in ["beauty", "nails", "lashes", "brows"]):
        return ["Before photo", "After photo", "Formula/style notes", "Allergy/preference note", "Rebooking reminder"]
    if "pet" in k:
        return ["Before pet photo", "After pet photo", "Pet behaviour note", "Coat/skin issue note", "Next groom reminder"]
    if "wellness" in k or "coaching" in k or "tutoring" in k:
        return ["Session notes", "Progress summary", "Follow-up task", "Next appointment reminder"]
    if "project" in m or "event" in k or "photo" in k:
        return ["Stage/deliverable complete", "Progress photos", "Variation/deposit note", "Client approval note", "Next stage reminder"]
    return base


def current_industry(user):
    business_profile = read(user, "business_profile", default={}) or {}
    industry_brain = read(user, "industry_brain", default={}) or {}
    profile = read(user, "industry_profile", "industry_key")
    mode = read(user, "industry_mode")
    if not profile and isinstance(business_profile, dict):
        profile = business_profile.get("industry_key") or business_profile.get("industry")
    if not mode and isinstance(industry_brain, dict):
        mode = industry_brain.get("mode")
    return text(profile or "field_service") or "field_service", text(mode or "field_service") or "field_service"


def autopilot_item(ok, title, detail, action):
    return {"ok": bool(ok), "title": title, "detail": detail, "action": action, "priority": "done" if ok else "next"}


def event(kind, title, detail, source, row):
    return {"kind": kind, "title": title, "detail": detail, "source": source, "time": row_time(row), "record_id": text((row or {}).get("id") or (row or {}).get("_id") or (row or {}).get("job_id") or (row or {}).get("client_id")), "record": safe(row)}


def reason_card(kind, title, why, source, risk, next_move, row):
    return {"kind": kind, "title": title, "why": why, "source": source, "risk_if_ignored": risk, "next_move": next_move, "created_at": row_time(row), "record": safe(row)}


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    ObjectId = getattr(module, "ObjectId", None)
    if not app or db is None or get_current_user is None or ObjectId is None:
        return

    try:
        try:
            import churvox_paid_launch_live_patch
        except Exception:
            from backend import churvox_paid_launch_live_patch
        churvox_paid_launch_live_patch.install(module)
    except Exception as exc:
        try:
            print(f"Churvox paid-launch live patch install skipped: {exc}", file=sys.stderr)
        except Exception:
            pass

    async def require_user(request: Request):
        return await get_current_user(request)

    async def require_hq(request: Request):
        user = await get_current_user(request)
        if email_of(user) != OWNER_EMAIL and not bool(read(user, "is_platform_owner") or read(user, "is_admin")):
            raise HTTPException(status_code=403, detail="HQ only")
        return user

    def remove_route(path: str, method: str):
        try:
            app.router.routes = [r for r in app.router.routes if not (getattr(r, "path", "") == path and method.upper() in set(getattr(r, "methods", set()) or set()))]
        except Exception:
            pass

    async def autopilot(request: Request):
        user = await require_user(request)
        q = scope(user, ObjectId)
        jobs = await count(db, "jobs", q)
        open_jobs = await count(db, "jobs", {"$and": [q, {"status": {"$nin": ["completed", "complete", "done", "archived", "cancelled"]}}]})
        clients = await count(db, "clients", q)
        workers = await count(db, "users", {"$and": [q, {"role": {"$in": ["worker", "staff", "employee", "subcontractor"]}}]})
        invoices = await count(db, "invoices", q)
        messages = await count(db, "worker_messages", q) + await count(db, "messages", q)
        profile_done = bool(read(user, "industry_profile") or read(user, "industry_key") or read(user, "business_profile_completed"))
        stripe = bool(read(user, "stripe_subscription_id") or read(user, "stripe_customer_id") or read(user, "free_tester_access") or read(user, "subscription_status") in ["active", "paid", "trialing", "tester_free"])
        items = [
            autopilot_item(stripe, "Plan and access", "Plan/Stripe or tester access is connected." if stripe else "Choose a plan through Stripe before normal app access.", "Open Plans"),
            autopilot_item(profile_done, "Industry profile", "Industry-specific labels and proof rules are ready." if profile_done else "Save the business profile so Churvox hides useless tools and adapts forms.", "Open setup"),
            autopilot_item(clients > 0, "Client memory", f"{clients} client records found." if clients else "Add the first client so jobs, notes and invoices have memory.", "Add client"),
            autopilot_item(jobs > 0, "Job engine", f"{jobs} jobs found, {open_jobs} open." if jobs else "Create the first job to turn Churvox into a real workspace.", "Add job"),
            autopilot_item(workers > 0, "Worker loop", f"{workers} worker/staff accounts found." if workers else "Invite at least one worker so office and field can talk.", "Add worker"),
            autopilot_item(invoices > 0, "Money flow", f"{invoices} invoices found." if invoices else "Create one invoice from a completed job to prove the money loop.", "Create invoice"),
            autopilot_item(messages > 0, "Office feed", f"{messages} messages/events found." if messages else "Send one worker/customer message so HQ can see the live loop.", "Test message"),
        ]
        score = round(sum(1 for item in items if item["ok"]) / len(items) * 100)
        return {"success": True, "source": "churvox_business_system_suite", "score": score, "items": items, "counts": {"jobs": jobs, "open_jobs": open_jobs, "clients": clients, "workers": workers, "invoices": invoices, "messages": messages}, "updated_at": now().isoformat()}

    async def live_feed(request: Request):
        user = await require_user(request)
        q = scope(user, ObjectId)
        feed = []
        for row in await rows(db, "worker_messages", q, 30):
            feed.append(event("worker_message", title_of(row, "Worker message"), text(row.get("message") or row.get("body") or row.get("detail")), "Worker app", row))
        for row in await rows(db, "worker_field_slips", q, 30):
            feed.append(event("worker_update", title_of(row, "Worker update"), text(row.get("summary") or row.get("message") or row.get("status")), "Field slip", row))
        for row in await rows(db, "jobs", q, 30, sort="updated_at"):
            feed.append(event("job", title_of(row, "Job"), f"Status: {text(row.get('status') or row.get('job_status') or 'open')}", "Jobs", row))
        for row in await rows(db, "invoices", q, 20, sort="updated_at"):
            feed.append(event("invoice", title_of(row, "Invoice"), f"Invoice status: {text(row.get('status') or 'draft')}", "Invoices", row))
        for row in await rows(db, "payments", q, 20, sort="updated_at"):
            feed.append(event("payment", title_of(row, "Payment"), f"Payment status: {text(row.get('status') or row.get('payment_status') or 'recorded')}", "Payments", row))
        feed.sort(key=lambda item: item.get("time") or "", reverse=True)
        return {"success": True, "source": "churvox_business_system_suite", "events": feed[:40], "updated_at": now().isoformat()}

    async def command_reasons(request: Request):
        user = await require_user(request)
        q = scope(user, ObjectId)
        cards = []
        for row in await rows(db, "ai_approval_actions", q, 50):
            if is_open(row):
                cards.append(reason_card("Command", title_of(row, "Owner decision"), text(row.get("summary") or row.get("filled") or "Churvox found a decision waiting for owner review."), "Command approval actions", "The wrong person, money or customer reply could keep moving without owner check.", "Approve, fix or park it.", row))
        for row in await rows(db, "worker_field_slips", q, 50):
            if is_open(row):
                cards.append(reason_card("Worker update", title_of(row, "Worker update"), text(row.get("summary") or row.get("message") or "Worker sent an update from the field."), "Worker field slip", "Office may miss a job issue, completion or proof note.", "Review the update and reply or approve next step.", row))
        for row in await rows(db, "jobs", q, 80, sort="updated_at"):
            s = status(row)
            if any(word in s for word in ["issue", "blocked", "late", "overdue", "missing"]):
                cards.append(reason_card("Job risk", title_of(row, "Job needs check"), f"Job status is {text(row.get('status') or row.get('job_status'))}.", "Jobs", "This could delay work, invoicing or worker/customer communication.", "Open the job and decide the next move.", row))
        return {"success": True, "source": "churvox_business_system_suite", "cards": cards[:50], "updated_at": now().isoformat()}

    async def proof_pack(request: Request):
        user = await require_user(request)
        try:
            profile, mode = current_industry(user)
            job_id = text(request.query_params.get("job_id") or request.query_params.get("id"))
            saved = await rows(db, "job_proof_packs", {"job_id": job_id}, 20) if job_id else []
            checklist = proof_pack_for(profile, mode)
        except Exception:
            profile, mode, job_id, saved = "field_service", "field_service", "", []
            checklist = proof_pack_for(profile, mode)
        return {"success": True, "source": "churvox_business_system_suite_safe", "industry_key": profile, "mode": mode, "job_id": job_id, "checklist": checklist, "saved_proof": saved, "updated_at": now().isoformat()}

    async def save_proof_pack(request: Request):
        user = await require_user(request)
        try:
            body = await request.json()
        except Exception:
            body = {}
        if not isinstance(body, dict):
            body = {}
        try:
            profile, mode = current_industry(user)
            row = {"business_id": business_id(user), "owner_email": email_of(user), "job_id": text(body.get("job_id")), "industry_key": profile, "mode": mode, "checklist": body.get("checklist") or proof_pack_for(profile, mode), "notes": text(body.get("notes")), "items": body.get("items") or [], "created_at": now(), "updated_at": now()}
            try:
                await db.job_proof_packs.insert_one(row)
            except Exception:
                pass
        except Exception:
            row = {"business_id": "", "owner_email": email_of(user), "job_id": text(body.get("job_id")), "industry_key": "field_service", "mode": "field_service", "checklist": proof_pack_for(), "notes": text(body.get("notes")), "items": body.get("items") or [], "created_at": now(), "updated_at": now()}
        return {"success": True, "source": "churvox_business_system_suite_safe", "proof_pack": safe(row)}

    async def client_memory(request: Request):
        user = await require_user(request)
        q = scope(user, ObjectId)
        client_id = text(request.path_params.get("client_id") or request.query_params.get("client_id") or "")
        client_query = q
        if client_id:
            ids = [client_id]
            try:
                ids.append(ObjectId(client_id))
            except Exception:
                pass
            client_query = {"$and": [q, {"$or": [{"_id": {"$in": ids}}, {"id": client_id}, {"client_id": client_id}]}]}
        clients = await rows(db, "clients", client_query, 5)
        client = clients[0] if clients else {}
        names = [text(client.get("name") or client.get("client_name") or client.get("business_name"))]
        names = [n for n in names if n]
        link_filters = []
        if client_id:
            link_filters.extend([{"client_id": client_id}, {"clientId": client_id}])
        for n in names:
            link_filters.extend([{"client_name": n}, {"client": n}, {"customer_name": n}])
        linked = {"$and": [q, {"$or": link_filters}]} if link_filters else q
        timeline = []
        for collection, kind in [("jobs", "job"), ("quotes", "quote"), ("invoices", "invoice"), ("messages", "message"), ("worker_messages", "worker_message"), ("payments", "payment")]:
            for row in await rows(db, collection, linked, 20, sort="updated_at"):
                timeline.append(event(kind, title_of(row, kind.title()), text(row.get("status") or row.get("message") or row.get("body") or row.get("detail")), collection, row))
        timeline.sort(key=lambda item: item.get("time") or "", reverse=True)
        return {"success": True, "source": "churvox_business_system_suite", "client": client, "timeline": timeline[:60], "updated_at": now().isoformat()}

    async def daily_closeout(request: Request):
        user = await require_user(request)
        q = scope(user, ObjectId)
        today = now().date().isoformat()
        jobs_today = await rows(db, "jobs", {"$and": [q, {"$or": [{"scheduled_date": today}, {"date": today}, {"created_at": {"$gte": today}}]}]}, 120)
        completed = [row for row in jobs_today if any(word in status(row) for word in ["complete", "completed", "done"])]
        open_jobs = [row for row in jobs_today if is_open(row)]
        invoices = await rows(db, "invoices", q, 80, sort="updated_at")
        unpaid = [row for row in invoices if any(word in status(row) for word in ["unpaid", "overdue", "due", "draft"])]
        slips = await rows(db, "worker_field_slips", q, 30)
        messages = await rows(db, "worker_messages", q, 30)
        lines = [
            f"{len(jobs_today)} jobs touched today.",
            f"{len(completed)} completed, {len(open_jobs)} still open.",
            f"{len(unpaid)} invoices need money follow-up.",
            f"{len(slips) + len(messages)} worker updates/messages need review." if slips or messages else "No worker updates waiting right now.",
        ]
        next_steps = []
        if open_jobs: next_steps.append("Check open jobs before tomorrow's run sheet.")
        if unpaid: next_steps.append("Review draft/unpaid invoices.")
        if slips or messages: next_steps.append("Clear worker updates in Command/Messages.")
        if not next_steps: next_steps.append("Everything looks clean. Prepare tomorrow's first job.")
        return {"success": True, "source": "churvox_business_system_suite", "date": today, "summary": lines, "next_steps": next_steps, "counts": {"jobs_today": len(jobs_today), "completed": len(completed), "open": len(open_jobs), "unpaid_invoices": len(unpaid), "worker_updates": len(slips) + len(messages)}, "updated_at": now().isoformat()}

    async def tester_friction(request: Request):
        await require_hq(request)
        logs = await rows(db, "app_owner_control_log", {}, 200, sort="created_at")
        testers = await rows(db, "app_owner_testers", {}, 200, sort="updated_at")
        users = await rows(db, "users", {"$or": [{"subscription_status": "tester_free"}, {"free_tester_access": True}, {"is_tester": True}]}, 200, sort="created_at")
        visits = await rows(db, "platform_visits", {}, 200, sort="created_at")
        stages = {"invited": len(testers), "accepted": len(users), "visited_signup": 0, "visited_login": 0, "visited_dashboard": 0, "asked_help": 0}
        for visit in visits:
            p = low(visit.get("path") or visit.get("last_path"))
            if "signup" in p: stages["visited_signup"] += 1
            if "login" in p: stages["visited_login"] += 1
            if "dashboard" in p: stages["visited_dashboard"] += 1
        for row in logs:
            if any(word in low(row.get("action") or row.get("type") or row.get("message")) for word in ["help", "bug", "stuck", "error"]):
                stages["asked_help"] += 1
        issues = []
        if stages["invited"] and stages["accepted"] < stages["invited"]:
            issues.append("Some invited testers have not accepted yet.")
        if stages["visited_signup"] and not stages["visited_dashboard"]:
            issues.append("People reached signup/login but may not be reaching the app.")
        if stages["asked_help"]:
            issues.append("HQ log contains help/bug/stuck signals from testers.")
        return {"success": True, "source": "churvox_business_system_suite", "stages": stages, "issues": issues, "testers": testers[:50], "recent_logs": logs[:30], "updated_at": now().isoformat()}

    routes = [
        ("/api/business/autopilot-score", autopilot, "GET"),
        ("/api/owner/autopilot-score", autopilot, "GET"),
        ("/api/office/live-feed", live_feed, "GET"),
        ("/api/command/reason-cards", command_reasons, "GET"),
        ("/api/jobs/proof-pack", proof_pack, "GET"),
        ("/api/jobs/proof-pack", save_proof_pack, "POST"),
        ("/api/clients/{client_id}/memory-timeline", client_memory, "GET"),
        ("/api/client-memory", client_memory, "GET"),
        ("/api/owner/daily-closeout", daily_closeout, "GET"),
        ("/api/admin/owner/tester-friction", tester_friction, "GET"),
    ]
    for path, endpoint, method in routes:
        remove_route(path, method)
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)


class Loader(importlib.abc.Loader):
    def __init__(self, original):
        self.original = original
    def create_module(self, spec):
        return self.original.create_module(spec) if hasattr(self.original, "create_module") else None
    def exec_module(self, module):
        self.original.exec_module(module)
        install(module)


class Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, Loader):
            spec.loader = Loader(spec.loader)
        return spec


if not any(isinstance(finder, Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, Finder())
for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
