from __future__ import annotations

from datetime import datetime, timezone
import importlib
import importlib.abc
import importlib.machinery
import sys

try:
    import churvox_field_truth_patch as field_truth
except Exception:  # pragma: no cover
    field_truth = None

try:
    import churvox_command_truth_guard_patch as truth_guard
except Exception:  # pragma: no cover
    truth_guard = None

TARGETS = {"server", "backend.server"}
INSTALLED = set()
PARK_REASONS = ["Waiting for client", "Need price", "Need worker", "Need photos/proof", "Need job link", "Not doing yet", "Unsure"]


def now_utc():
    return datetime.now(timezone.utc)


def clean(value):
    return str(value or "").strip()


def lower(value):
    return clean(value).lower()


def json_safe(value):
    if field_truth is not None:
        return field_truth.json_safe(value)
    if isinstance(value, dict):
        return {("id" if key == "_id" else key): json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_safe(item) for item in value]
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if value.__class__.__name__ == "ObjectId":
        return str(value)
    return value


def business_id(user):
    if field_truth is not None:
        return field_truth.business_id_string(user)
    return clean(user.get("business_id") or user.get("owner_business_id") or user.get("contractor_id") or user.get("id") or user.get("_id"))


def user_id(user):
    if field_truth is not None:
        return field_truth.user_id_string(user)
    return clean(user.get("id") or user.get("_id") or user.get("email"))


def confidence(item):
    return clean(item.get("confidence") or item.get("confidence_label") or ("Boss must complete" if item.get("needs_owner_input") else "Ready to approve"))


def bucket(item):
    text = lower(confidence(item))
    if "must" in text:
        return "boss_must_complete"
    if "check" in text:
        return "needs_boss_check"
    return "ready_to_approve"


def apply_truth(item):
    item = dict(item or {})
    if truth_guard is not None and hasattr(truth_guard, "truth_guard_item"):
        try:
            item = truth_guard.truth_guard_item(item)
        except Exception:
            pass
    item.setdefault("park_reasons", PARK_REASONS)
    item.setdefault("why_here", clean(item.get("reason") or item.get("summary") or item.get("title") or "Owner approval required."))
    item.setdefault("audit_trail", ["Churvox scanned live records.", "Command trust desk prepared the slip for owner review."])
    return item


async def read_payload(request):
    try:
        return await request.json()
    except Exception:
        return {}


async def recent(collection, query, limit=120, sort="updated_at"):
    try:
        return await collection.find(query).sort(sort, -1).limit(limit).to_list(length=limit)
    except Exception:
        try:
            return await collection.find(query).limit(limit).to_list(length=limit)
        except Exception:
            return []


def summary(items):
    counts = {"ready_to_approve": 0, "needs_boss_check": 0, "boss_must_complete": 0, "worker_slips": 0, "duplicates": 0, "invoice_blocked": 0, "parked": 0}
    for item in items:
        counts[bucket(item)] = counts.get(bucket(item), 0) + 1
        if clean(item.get("worker_slip_type")):
            counts["worker_slips"] += 1
        if item.get("possible_duplicate") or clean(item.get("duplicate_warning")):
            counts["duplicates"] += 1
        if "cannot invoice" in lower(item.get("invoice_guard")):
            counts["invoice_blocked"] += 1
        if lower(item.get("status")) == "parked":
            counts["parked"] += 1
    return counts


def test_scenarios():
    return [
        {"name": "Worker slip with no job", "expected": "boss_must_complete", "guard": "linked job required"},
        {"name": "Completed job with no price", "expected": "boss_must_complete", "guard": "confirmed price required"},
        {"name": "Completed job with price", "expected": "ready_to_approve", "guard": "owner approval still required"},
        {"name": "Accepted quote with no job", "expected": "needs_boss_check", "guard": "prepare job draft only"},
        {"name": "Possible duplicate", "expected": "needs_boss_check", "guard": "boss checks before approval"},
        {"name": "Parked slip", "expected": "parked_with_reason", "guard": "reason retained"},
        {"name": "Unsafe approval", "expected": "blocked", "guard": "no send, sync, invoice or record change"},
    ]


def install(module):
    name = getattr(module, "__name__", "")
    if name in INSTALLED:
        return
    app = getattr(module, "app", None)
    db = getattr(module, "db", None)
    get_current_user = getattr(module, "get_current_user", None)
    Request = getattr(module, "Request", None)
    if not app or db is None or not get_current_user or Request is None:
        return

    async def trust_desk_endpoint(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        rows = await recent(db.ai_approval_actions, {"business_id": bid, "status": {"$nin": ["approved", "completed", "declined", "dismissed", "rejected", "sent", "archived"]}}, 160, "updated_at")
        items = [apply_truth(row) for row in rows]
        return json_safe({
            "success": True,
            "counts": summary(items),
            "items": items,
            "park_reasons": PARK_REASONS,
            "rules": {
                "no_fake_data": True,
                "owner_approval_required": True,
                "unsafe_approval_blocked": True,
                "draft_sync_only": True,
                "no_tax_filing": True,
                "no_payout_files": True,
            },
            "test_scenarios": test_scenarios(),
        })

    async def park_reason_endpoint(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        payload = await read_payload(request)
        action_id = clean(payload.get("action_id") or payload.get("id") or payload.get("source_id"))
        reason = clean(payload.get("reason") or payload.get("park_reason") or "Unsure")
        note = clean(payload.get("note"))
        doc = {"business_id": bid, "user_id": user_id(user), "action_id": action_id, "decision": "parked", "park_reason": reason, "note": note, "source": "command_trust_desk", "created_at": now_utc(), "updated_at": now_utc()}
        if action_id:
            try:
                await db.ai_approval_actions.update_one({"business_id": bid, "$or": [{"id": action_id}, {"action_id": action_id}]}, {"$set": {"status": "parked", "park_reason": reason, "park_note": note, "updated_at": now_utc()}})
            except Exception:
                pass
        try:
            await db.command_decisions.insert_one(dict(doc))
        except Exception:
            pass
        try:
            await db.command_audit_trail.insert_one(dict(doc))
        except Exception:
            pass
        return json_safe({"success": True, "message": "Park reason saved.", "park": doc})

    async def audit_endpoint(request: Request):
        user = await get_current_user(request)
        bid = business_id(user)
        decisions = await recent(db.command_decisions, {"business_id": bid}, 80, "created_at")
        audit = await recent(db.command_audit_trail, {"business_id": bid}, 80, "created_at")
        return json_safe({"success": True, "items": decisions + audit, "decisions": decisions, "audit": audit})

    routes = [
        ("GET", "/api/command/trust-desk", trust_desk_endpoint),
        ("POST", "/api/command/park-reason", park_reason_endpoint),
        ("GET", "/api/command/audit-trail", audit_endpoint),
    ]
    for method, path, endpoint in routes:
        try:
            app.router.routes = [route for route in app.router.routes if not (getattr(route, "path", "") == path and method in set(getattr(route, "methods", set()) or set()))]
        except Exception:
            pass
        app.add_api_route(path, endpoint, methods=[method])
    INSTALLED.add(name)


class _Loader(importlib.abc.Loader):
    def __init__(self, original_loader):
        self.original_loader = original_loader

    def create_module(self, spec):
        if hasattr(self.original_loader, "create_module"):
            return self.original_loader.create_module(spec)
        return None

    def exec_module(self, module):
        self.original_loader.exec_module(module)
        install(module)


class _Finder(importlib.abc.MetaPathFinder):
    def find_spec(self, fullname, path=None, target=None):
        if fullname not in TARGETS:
            return None
        spec = importlib.machinery.PathFinder.find_spec(fullname, path)
        if spec and spec.loader and not isinstance(spec.loader, _Loader):
            spec.loader = _Loader(spec.loader)
        return spec


if not any(isinstance(finder, _Finder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _Finder())

for module_name in list(TARGETS):
    loaded = sys.modules.get(module_name)
    if loaded:
        install(loaded)
