#!/usr/bin/env python3
from __future__ import annotations

import asyncio
from copy import deepcopy
from datetime import datetime, timezone, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from bson import ObjectId
from fastapi import HTTPException

from churvox_command_apply_routes import build_command_apply_router
from churvox_command_human_mimic_live_routes import build_command_human_mimic_live_router
from churvox_command_human_mimic_marker_routes import build_command_human_mimic_marker_router


MISSING = object()


def get_path(doc, path):
    value = doc
    for part in str(path).split("."):
        if not isinstance(value, dict) or part not in value:
            return MISSING
        value = value[part]
    return value


def set_path(doc, path, value):
    parts = str(path).split(".")
    target = doc
    for part in parts[:-1]:
        target = target.setdefault(part, {})
    target[parts[-1]] = deepcopy(value)


def equivalent(left, right):
    if left is MISSING:
        return False
    return left == right or str(left) == str(right)


def match_condition(value, condition):
    if not isinstance(condition, dict) or not any(str(key).startswith("$") for key in condition):
        return equivalent(value, condition)
    for operator, expected in condition.items():
        if operator == "$in":
            if isinstance(value, list):
                if not any(any(equivalent(item, candidate) for candidate in expected) for item in value):
                    return False
            elif not any(equivalent(value, candidate) for candidate in expected):
                return False
        elif operator == "$nin":
            if value is not MISSING and any(equivalent(value, candidate) for candidate in expected):
                return False
        elif operator == "$ne":
            if value is not MISSING and equivalent(value, expected):
                return False
        elif operator == "$exists":
            if bool(value is not MISSING) != bool(expected):
                return False
        else:
            raise AssertionError(f"Fake DB does not support query operator {operator}")
    return True


def matches(doc, query):
    for key, condition in (query or {}).items():
        if key == "$or":
            if not any(matches(doc, branch) for branch in condition):
                return False
        elif key == "$and":
            if not all(matches(doc, branch) for branch in condition):
                return False
        else:
            if not match_condition(get_path(doc, key), condition):
                return False
    return True


class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class InsertManyResult:
    def __init__(self, inserted_ids):
        self.inserted_ids = inserted_ids


class UpdateResult:
    def __init__(self, modified_count=0):
        self.modified_count = modified_count


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)
        self.limit_value = None

    def sort(self, key, direction=-1):
        reverse = direction == -1
        self.rows.sort(key=lambda row: str(get_path(row, key) if get_path(row, key) is not MISSING else ""), reverse=reverse)
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    async def to_list(self, length=None):
        limit = self.limit_value if self.limit_value is not None else length
        rows = self.rows[:limit] if limit else self.rows
        return deepcopy(rows)


class FakeCollection:
    def __init__(self, name, rows=None):
        self.name = name
        self.rows = [deepcopy(row) for row in (rows or [])]

    def find(self, query=None):
        return FakeCursor([row for row in self.rows if matches(row, query or {})])

    async def find_one(self, query=None, *args, **kwargs):
        for row in self.rows:
            if matches(row, query or {}):
                return deepcopy(row)
        return None

    async def insert_one(self, doc):
        row = deepcopy(doc)
        row.setdefault("_id", ObjectId())
        self.rows.append(row)
        return InsertOneResult(row["_id"])

    async def insert_many(self, docs):
        ids = []
        for doc in docs:
            result = await self.insert_one(doc)
            ids.append(result.inserted_id)
        return InsertManyResult(ids)

    async def update_one(self, query, update, *args, **kwargs):
        for row in self.rows:
            if not matches(row, query or {}):
                continue
            for path, value in (update.get("$set") or {}).items():
                set_path(row, path, value)
            for path, value in (update.get("$push") or {}).items():
                existing = get_path(row, path)
                if existing is MISSING or not isinstance(existing, list):
                    set_path(row, path, [])
                    existing = get_path(row, path)
                existing.append(deepcopy(value))
            return UpdateResult(1)
        return UpdateResult(0)


class FakeDB:
    def __init__(self, seed=None):
        self.collections = {}
        for name, rows in (seed or {}).items():
            self.collections[name] = FakeCollection(name, rows)

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = FakeCollection(name)
        return self.collections[name]

    def __getattr__(self, name):
        return self[name]


def endpoint(router, path, method):
    for route in getattr(router, "routes", []):
        methods = set(getattr(route, "methods", set()) or set())
        if getattr(route, "path", "") == path and method.upper() in methods:
            return route.endpoint
    raise AssertionError(f"Route not found: {method} {path}")


def check(name, condition, detail=""):
    if not condition:
        raise AssertionError(f"{name}: {detail or 'condition failed'}")
    print(f"✓ {name}")


def iso(days=0, hours=0):
    return (datetime.now(timezone.utc) + timedelta(days=days, hours=hours)).isoformat()


def build_seed(business_a, business_b):
    ids = {name: ObjectId() for name in [
        "invoice_job", "history_extra", "linked_job", "incomplete_job", "quality_job", "memory_job",
        "repeat_current", "repeat_h1", "repeat_h2", "repeat_h3", "weak_repeat", "weak_h1", "weak_h2",
        "open1", "open2", "open3", "foreign_job", "linked_invoice", "overdue", "future", "paid", "draft",
        "tax_normal", "export_failed", "message_in", "message_out", "message_ack", "message_replied",
        "message_duplicate_memory", "timer_h1", "timer_h2", "timer_h3", "timer_long", "timer_normal_seconds", "timer_open",
    ]}

    common_job = {"business_id": business_a, "worker_name": "Cam", "proof_url": "proof.jpg", "invoiced": True}
    jobs = [
        {"_id": ids["history_extra"], **common_job, "status": "completed", "title": "Lawn service", "service_type": "lawn", "client_name": "Smith Property", "scheduled_date": iso(-60), "completion_note": "Completed", "extra_amount": 40},
        {"_id": ids["invoice_job"], "business_id": business_a, "status": "completed", "title": "Lawn service", "service_type": "lawn", "client_name": "Smith Property", "scheduled_date": iso(-2), "worker_name": "Cam", "price": 100, "completion_note": "Extra green waste completed", "proof_url": "proof.jpg"},
        {"_id": ids["linked_job"], "business_id": business_a, "status": "completed", "title": "Linked clean", "service_type": "cleaning", "client_name": "Linked Client", "scheduled_date": iso(-5), "worker_name": "Mia", "price": 200, "completion_note": "Done", "proof_url": "proof.jpg"},
        {"_id": ids["incomplete_job"], "business_id": business_a, "status": "incomplete", "title": "Not actually complete", "client_name": "False Positive", "price": 999},
        {"_id": ids["quality_job"], "business_id": business_a, "status": "completed", "title": "Proof missing", "client_name": "Quality Client", "worker_name": "Cam", "scheduled_date": iso(-1), "invoiced": True},
        {"_id": ids["memory_job"], **common_job, "status": "completed", "title": "Access note source", "client_name": "Safe Client", "scheduled_date": iso(-3), "completion_note": "Gate code is 1234 and text before arrival"},
        {"_id": ids["repeat_h1"], **common_job, "status": "completed", "title": "Garden visit", "service_type": "garden", "client_name": "Repeat Client", "scheduled_date": iso(-56), "completion_note": "Done"},
        {"_id": ids["repeat_h2"], **common_job, "status": "completed", "title": "Garden visit", "service_type": "garden", "client_name": "Repeat Client", "scheduled_date": iso(-42), "completion_note": "Done"},
        {"_id": ids["repeat_h3"], **common_job, "status": "completed", "title": "Garden visit", "service_type": "garden", "client_name": "Repeat Client", "scheduled_date": iso(-28), "completion_note": "Done"},
        {"_id": ids["repeat_current"], "business_id": business_a, "status": "open", "title": "Garden visit", "service_type": "garden", "client_name": "Repeat Client", "scheduled_date": iso(-14), "worker_name": "Cam", "recurring": True},
        {"_id": ids["weak_h1"], **common_job, "status": "completed", "title": "Window clean", "service_type": "windows", "client_name": "Weak Repeat", "scheduled_date": iso(-35), "completion_note": "Done"},
        {"_id": ids["weak_h2"], **common_job, "status": "completed", "title": "Window clean", "service_type": "windows", "client_name": "Weak Repeat", "scheduled_date": iso(-21), "completion_note": "Done"},
        {"_id": ids["weak_repeat"], "business_id": business_a, "status": "open", "title": "Window clean", "service_type": "windows", "client_name": "Weak Repeat", "scheduled_date": iso(-7), "worker_name": "Cam", "recurring": True},
        {"_id": ids["open1"], "business_id": business_a, "status": "open", "title": "Missing setup 1", "client_name": "Setup One"},
        {"_id": ids["open2"], "business_id": business_a, "status": "open", "title": "Missing setup 2", "client_name": "Setup Two"},
        {"_id": ids["open3"], "business_id": business_a, "status": "open", "title": "Missing setup 3", "client_name": "Setup Three"},
        {"_id": ids["foreign_job"], "business_id": business_b, "status": "completed", "title": "Foreign completed job", "client_name": "Other Business", "price": 500},
    ]

    invoices = [
        {"_id": ids["linked_invoice"], "business_id": business_a, "status": "draft", "job_id": ids["linked_job"], "invoice_number": "INV-LINK", "total": 200},
        {"_id": ids["overdue"], "business_id": business_a, "status": "sent overdue", "invoice_number": "INV-OVER", "client_name": "Overdue Client", "balance_due": 200, "due_date": iso(-20), "total": 230, "gst_rate": 15, "prices_include_gst": False},
        {"_id": ids["future"], "business_id": business_a, "status": "sent", "invoice_number": "INV-FUTURE", "client_name": "Future Client", "balance_due": 100, "due_date": iso(10), "total": 115},
        {"_id": ids["paid"], "business_id": business_a, "status": "paid", "invoice_number": "INV-PAID", "client_name": "Paid Client", "balance_due": 0, "due_date": iso(-10), "total": 80},
        {"_id": ids["draft"], "business_id": business_a, "status": "draft", "invoice_number": "INV-DRAFT", "client_name": "Draft Client", "balance_due": 90, "due_date": iso(-10), "total": 90},
        {"_id": ids["tax_normal"], "business_id": business_a, "status": "sent", "invoice_number": "INV-TAX", "client_name": "Tax Client", "balance_due": 0, "due_date": iso(-2), "total": 115, "gst": 15},
        {"_id": ids["export_failed"], "business_id": business_a, "status": "sent", "invoice_number": "INV-ERROR", "client_name": "Export Client", "balance_due": 0, "due_date": iso(-2), "total": 115, "export_status": "failed"},
    ]

    clients = [
        {"_id": ObjectId(), "business_id": business_a, "name": "Duplicate Client", "notes": "Prefers text before arrival"},
        {"_id": ObjectId(), "business_id": business_a, "name": "Safe Client", "notes": ""},
    ]

    messages = [
        {"_id": ids["message_in"], "business_id": business_a, "direction": "inbound", "status": "needs_reply", "client_name": "Question Client", "body": "Can you come next Friday?"},
        {"_id": ids["message_out"], "business_id": business_a, "direction": "outbound", "status": "sent", "client_name": "Outbound Client", "body": "Your booking is confirmed"},
        {"_id": ids["message_ack"], "business_id": business_a, "direction": "inbound", "status": "unread", "client_name": "Ack Client", "body": "Thanks"},
        {"_id": ids["message_replied"], "business_id": business_a, "direction": "inbound", "status": "replied", "client_name": "Replied Client", "body": "Can you change the time?"},
        {"_id": ids["message_duplicate_memory"], "business_id": business_a, "direction": "inbound", "status": "open", "client_name": "Duplicate Client", "body": "Prefers text before arrival"},
    ]

    timers = [
        {"_id": ids["timer_h1"], "business_id": business_a, "worker_name": "Cam", "title": "Normal 1", "duration_hours": 4, "ended_at": iso(-4)},
        {"_id": ids["timer_h2"], "business_id": business_a, "worker_name": "Cam", "title": "Normal 2", "duration_hours": 5, "ended_at": iso(-3)},
        {"_id": ids["timer_h3"], "business_id": business_a, "worker_name": "Cam", "title": "Normal 3", "duration_hours": 4.5, "ended_at": iso(-2)},
        {"_id": ids["timer_long"], "business_id": business_a, "worker_name": "Cam", "title": "Long seconds timer", "duration_seconds": 43200, "ended_at": iso(-1)},
        {"_id": ids["timer_normal_seconds"], "business_id": business_a, "worker_name": "Cam", "title": "Normal seconds timer", "duration_seconds": 3600, "ended_at": iso(-1)},
        {"_id": ids["timer_open"], "business_id": business_a, "worker_name": "Mia", "title": "Open timer", "duration_minutes": 90, "started_at": iso(0, -2)},
    ]

    settings = [{"_id": ObjectId(), "business_id": business_a, "title": "Business settings", "gst_rate": 15, "prices_include_gst": False}]

    return {
        "jobs": jobs,
        "invoices": invoices,
        "clients": clients,
        "messages": messages,
        "time_entries": timers,
        "business_settings": settings,
        "command_slips": [],
        "command_events": [],
    }, ids


def slip_action(slip):
    return slip.get("action_type") or (slip.get("payload") or {}).get("action_type")


def source_id(slip):
    return str(slip.get("source_id") or "")


async def main():
    business_a = str(ObjectId())
    business_b = str(ObjectId())
    owner_id = str(ObjectId())
    seed, ids = build_seed(business_a, business_b)
    db = FakeDB(seed)
    current_user = {"id": owner_id, "business_id": business_a, "role": "owner", "email": "owner@example.com"}

    async def get_current_user(_request):
        return deepcopy(current_user)

    live_router = build_command_human_mimic_live_router(db, get_current_user, ObjectId)
    scan = endpoint(live_router, "/command/scan", "POST")

    first = await scan(request=object(), payload={"source": "full_test"})
    check("strict v3 source returned", first.get("source") == "human-mimic-intelligence-v3")
    check("strict preflight guard returned", first.get("guard") == "human-mimic-strict-preflight-v3")
    check("all eight roles declared", len(first.get("roles_checked") or []) == 8)
    check("real decisions created", first.get("created_count", 0) > 0)

    slips = list(first.get("slips") or [])
    by_source = {source_id(item): item for item in slips}
    actions = [slip_action(item) for item in slips]

    invoice_slip = by_source.get(str(ids["invoice_job"]))
    check("Bookkeeper created completed-job invoice decision", invoice_slip and slip_action(invoice_slip) == "prepare_invoice")
    invoice_form = (invoice_slip.get("payload") or {}).get("prepared_form") or {}
    check("historical extra never became a charge", invoice_form.get("Extra work amount") == "Owner to enter")
    check("historical extra remains reference only", invoice_form.get("Historical extra reference") == "$40.00")
    check("draft total excludes guessed extra", invoice_form.get("Draft total") == "$115.00")
    check("missing extra blocks approval", "Extra work amount" in ((invoice_slip.get("payload") or {}).get("required_fields") or []))

    check("linked invoice prevents duplicate draft", str(ids["linked_job"]) not in by_source)
    check("incomplete status is not treated as complete", str(ids["incomplete_job"]) not in by_source)
    check("foreign business records stay isolated", str(ids["foreign_job"]) not in by_source)

    stable_repeat = by_source.get(str(ids["repeat_current"]))
    weak_repeat = by_source.get(str(ids["weak_repeat"]))
    check("Receptionist uses stable same-service history", stable_repeat and "stable median" in str((((stable_repeat.get("payload") or {}).get("field_sources") or {}).get("Usual cycle") or {}).get("source")))
    check("Receptionist does not infer from one gap", weak_repeat and ((weak_repeat.get("payload") or {}).get("prepared_form") or {}).get("Usual cycle") == "No reliable cycle")
    check("Receptionist never invents exact time", "Suggested booking date/time" in ((stable_repeat.get("payload") or {}).get("required_fields") or []))

    reply_sources = {source_id(item) for item in slips if slip_action(item) == "prepare_customer_reply"}
    check("inbound client question creates reply draft", str(ids["message_in"]) in reply_sources)
    check("outbound message never creates reply", str(ids["message_out"]) not in reply_sources)
    check("acknowledgement-only message is suppressed", str(ids["message_ack"]) not in reply_sources)
    check("already replied message is suppressed", str(ids["message_replied"]) not in reply_sources)

    followup_sources = {source_id(item) for item in slips if slip_action(item) == "prepare_overdue_followup"}
    check("genuinely overdue collectible invoice creates follow-up", str(ids["overdue"]) in followup_sources)
    check("future-due invoice does not create follow-up", str(ids["future"]) not in followup_sources)
    check("paid invoice does not create follow-up", str(ids["paid"]) not in followup_sources)
    check("draft invoice does not create follow-up", str(ids["draft"]) not in followup_sources)

    accounting_sources = {source_id(item) for item in slips if slip_action(item) == "review_accounting_export"}
    check("generic GST amount is not misread as tax rate", str(ids["tax_normal"]) not in accounting_sources)
    check("real export failure reaches Accountant", str(ids["export_failed"]) in accounting_sources)

    hours_sources = {source_id(item) for item in slips if slip_action(item) == "review_odd_hours"}
    check("12-hour seconds timer is normalized and reviewed", str(ids["timer_long"]) in hours_sources)
    check("one-hour seconds timer is not a false anomaly", str(ids["timer_normal_seconds"]) not in hours_sources)
    check("open timer reaches Payroll Clerk", str(ids["timer_open"]) in hours_sources)

    memory_slip = by_source.get(str(ids["memory_job"]))
    check("useful client memory reaches Client Memory", memory_slip and slip_action(memory_slip) == "prepare_client_memory")
    memory_form = (memory_slip.get("payload") or {}).get("prepared_form") or {}
    check("likely access code is redacted", "1234" not in str(memory_form.get("Memory note")) and "REDACTED" in str(memory_form.get("Memory note")))
    check("sensitive memory requires visibility confirmation", "Restricted visibility" in ((memory_slip.get("payload") or {}).get("required_fields") or []))
    check("duplicate client memory is suppressed", str(ids["message_duplicate_memory"]) not in by_source)

    check("Quality Checker catches missing proof", str(ids["quality_job"]) in by_source and slip_action(by_source[str(ids["quality_job"])]) == "request_completion_proof")
    check("Operations Manager requires repeated evidence", "review_repeated_admin_gap" in actions)
    check("Office Manager brief only follows real queue", "daily_owner_brief" in actions)

    second = await scan(request=object(), payload={"source": "full_test_repeat"})
    check("second scan is idempotent", second.get("created_count") == 0 and second.get("existing_count") == first.get("created_count"))

    for row in db.jobs.rows:
        if str(row.get("_id")) == str(ids["invoice_job"]):
            row["price"] = 120
            break
    third = await scan(request=object(), payload={"source": "full_test_changed_evidence"})
    changed = [item for item in third.get("slips") or [] if source_id(item) == str(ids["invoice_job"])]
    check("changed source evidence replaces stale decision", len(changed) == 1)
    changed_form = ((changed[0].get("payload") or {}).get("prepared_form") or {})
    check("replacement uses fresh amount", changed_form.get("Draft total") == "$138.00")
    old_invoice_rows = [row for row in db.command_slips.rows if source_id(row) == str(ids["invoice_job"])]
    check("old evidence is superseded", any(row.get("status") == "superseded" for row in old_invoice_rows))

    apply_router = build_command_apply_router(db, get_current_user, ObjectId)
    approve = endpoint(apply_router, "/command/slips/{slip_id}/approve", "POST")
    latest_invoice = next(row for row in db.command_slips.rows if source_id(row) == str(ids["invoice_job"]) and row.get("status") in {"open", "edited", "pending", "ready", "waiting", "snoozed"})
    try:
        await approve(str(latest_invoice["_id"]), request=object(), payload={"action": "Approve invoice draft"})
        raise AssertionError("approval unexpectedly accepted unresolved fields")
    except HTTPException as exc:
        check("unresolved required fields block approval", exc.status_code == 409 and "Extra work amount" in str(exc.detail))

    edited_fields = [
        {"label": "Client", "value": "Smith Property"},
        {"label": "Base service amount", "value": "$120.00"},
        {"label": "Extra work amount", "value": "$30.00"},
        {"label": "GST / tax rate", "value": "15%"},
        {"label": "Tax treatment", "value": "Exclusive"},
        {"label": "Draft total", "value": "$172.50"},
        {"label": "Line items", "value": "Base 120; extra 30"},
    ]
    approved = await approve(str(latest_invoice["_id"]), request=object(), payload={"action": "Approve invoice draft", "fields": edited_fields, "note": "Amounts confirmed in full test"})
    check("completed fields allow one internal draft", approved.get("result", {}).get("execution", {}).get("applied") is True)
    check("approved draft remains unsent", approved.get("safety") == "Owner approval applied safely. Nothing was sent, synced, charged or filed.")
    approved_again = await approve(str(latest_invoice["_id"]), request=object(), payload={"action": "Approve invoice draft", "fields": edited_fields})
    check("approval execution is idempotent", approved_again.get("idempotent") is True)

    superseded_invoice = next(row for row in db.command_slips.rows if source_id(row) == str(ids["invoice_job"]) and row.get("status") == "superseded")
    try:
        await approve(str(superseded_invoice["_id"]), request=object(), payload={"action": "Approve invoice draft", "fields": edited_fields})
        raise AssertionError("superseded slip unexpectedly applied")
    except HTTPException as exc:
        check("superseded decisions cannot be applied", exc.status_code == 409)

    forbidden_collections = {"sent_messages", "payments", "charges", "xero_sync_queue", "myob_sync_queue", "tax_filings", "bank_files"}
    check("full run triggered no external-action collection", not (forbidden_collections & set(db.collections)))
    inserted_invoice_drafts = [row for row in db.invoices.rows if row.get("source") == "command_owner_approval"]
    check("exactly one internal invoice draft was created", len(inserted_invoice_drafts) == 1)
    check("internal draft carries no-auto safety flags", all(inserted_invoice_drafts[0].get(key) is True for key in ["no_auto_send", "no_auto_sync", "no_auto_charge", "no_auto_file_tax"]))

    marker_router = build_command_human_mimic_marker_router()
    marker = endpoint(marker_router, "/command/human-mimic-marker", "GET")
    marker_result = await marker()
    check("deployment marker proves strict v3", marker_result.get("version") == "human-mimic-intelligence-v3" and marker_result.get("guard") == "human-mimic-strict-preflight-v3")
    check("marker exposes all eight mimics", len(marker_result.get("roles") or []) == 8)

    current_user["role"] = "worker"
    try:
        await scan(request=object(), payload={})
        raise AssertionError("worker unexpectedly ran owner mimic scan")
    except HTTPException as exc:
        check("worker cannot run owner intelligence", exc.status_code == 403)

    print("\nFull human mimic behavioural test passed.")


if __name__ == "__main__":
    asyncio.run(main())
