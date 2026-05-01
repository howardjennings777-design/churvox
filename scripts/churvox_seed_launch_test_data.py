#!/usr/bin/env python3
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient
import bcrypt

SEED_TAG = {
    "launch_test_data": True,
    "seeded_by": "churvox_launch_seed",
}


def _now():
    return datetime.now(timezone.utc)


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _upsert(coll, query, doc):
    payload = dict(doc)
    payload.update(SEED_TAG)
    payload["updated_at"] = _now()
    coll.update_one(query, {"$set": payload, "$setOnInsert": {"created_at": _now()}}, upsert=True)


def _has_collection(db, name: str) -> bool:
    return name in db.list_collection_names()


def main():
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    owner_email = os.getenv("TEST_OWNER_EMAIL", "hello@churvox.com").strip().lower()
    owner_password = os.getenv("TEST_OWNER_PASSWORD", "TempPass123!")
    business_name = os.getenv("TEST_BUSINESS_NAME", "Churvox Test Business").strip()

    if not mongo_url or not db_name:
        print("ERROR: Missing required env vars. Set both MONGO_URL and DB_NAME.")
        return 0

    client = MongoClient(mongo_url)
    db = client[db_name]
    now = _now()

    business_id = f"launch-test-{owner_email}"

    owner_hash = _hash_password(owner_password)
    owner_doc = {
        "email": owner_email,
        "name": "Launch Test Owner",
        "role": "owner",
        "business_name": business_name,
        "business_id": business_id,
        "password_hash": owner_hash,
        "is_platform_owner": owner_email == "hello@churvox.com",
        "status": "active",
        **SEED_TAG,
    }
    _upsert(db.users, {"email": owner_email}, owner_doc)

    users = [
        ("manager.test@churvox.local", "Launch Test Manager", "manager"),
        ("office.test@churvox.local", "Launch Test Office", "office_admin"),
        ("payroll.test@churvox.local", "Launch Test Payroll", "payroll"),
        ("worker.test@churvox.local", "Launch Test Worker", "worker"),
    ]
    for email, name, role in users:
        _upsert(db.users, {"email": email, "business_id": business_id}, {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "role": role,
            "business_id": business_id,
            "business_name": business_name,
            "password_hash": _hash_password(owner_password),
            "status": "active",
            **SEED_TAG,
        })

    client_names = [
        "Green Acres Property",
        "Naenae Medical Centre Test",
        "Willow Rentals",
        "Stuart ECB Test Customer",
        "Harbour View Apartments",
    ]
    client_ids = {}
    for cname in client_names:
        cid = f"launch-client-{cname.lower().replace(' ', '-')[:24]}"
        client_ids[cname] = cid
        _upsert(db.clients, {"business_id": business_id, "id": cid}, {
            "id": cid,
            "name": cname,
            "email": f"{cid}@example.test",
            "phone": "+64000000000",
            "business_id": business_id,
            **SEED_TAG,
        })

    today = now.date().isoformat()
    jobs = [
        ("today_assigned", "Today assigned job", "assigned", today, "fixed"),
        ("today_in_progress", "Today in progress job", "in_progress", today, "hourly"),
        ("completed", "Completed job", "completed", (now - timedelta(days=2)).date().isoformat(), "fixed"),
        ("overdue", "Overdue job", "overdue", (now - timedelta(days=3)).date().isoformat(), "hourly"),
        ("unassigned", "Unassigned job", "scheduled", (now + timedelta(days=1)).date().isoformat(), "fixed"),
        ("recurring", "Recurring fortnightly job", "scheduled", (now + timedelta(days=14)).date().isoformat(), "fixed"),
        ("fixed_pricing", "Job with pricing fixed", "assigned", today, "fixed"),
        ("hourly_pricing", "Job with pricing hourly", "assigned", today, "hourly"),
        ("worker_photo", "Job with worker photo placeholder", "in_progress", today, "hourly"),
    ]
    worker = db.users.find_one({"business_id": business_id, "email": "worker.test@churvox.local"}) or {}
    worker_id = str(worker.get("id") or worker.get("_id") or "")
    for idx, (jid, title, status, sched, pricing) in enumerate(jobs):
        payload = {
            "id": f"launch-job-{jid}",
            "title": title,
            "status": status,
            "scheduled_date": sched,
            "client_id": list(client_ids.values())[idx % len(client_ids)],
            "business_id": business_id,
            "pricing_type": pricing,
            "price": 180.0 + idx * 25,
            "assigned_worker_ids": [] if jid == "unassigned" else ([worker_id] if worker_id else []),
            "recurring": jid == "recurring",
            "recurring_frequency": "fortnightly" if jid == "recurring" else None,
            "photos": [{"url": "https://example.test/worker-photo-placeholder.jpg", "label": "placeholder"}] if jid == "worker_photo" else [],
            **SEED_TAG,
        }
        _upsert(db.jobs, {"business_id": business_id, "id": payload["id"]}, payload)

    quotes = [("draft", "draft"), ("sent", "sent"), ("accepted", "accepted"), ("declined", "declined")]
    for idx, (suffix, status) in enumerate(quotes):
        _upsert(db.quotes, {"business_id": business_id, "id": f"launch-quote-{suffix}"}, {
            "id": f"launch-quote-{suffix}",
            "business_id": business_id,
            "client_id": list(client_ids.values())[idx % len(client_ids)],
            "job_id": f"launch-job-{jobs[idx][0]}",
            "status": status,
            "total": 350.0 + idx * 100,
            **SEED_TAG,
        })

    invoices = [
        ("draft", "draft", "not_synced"),
        ("sent-unpaid", "sent", "not_synced"),
        ("paid", "paid", "synced"),
        ("overdue", "overdue", "not_synced"),
        ("myob-not-synced", "sent", "not_synced"),
        ("myob-sync-failed", "sent", "sync_failed"),
    ]
    for idx, (suffix, status, myob_status) in enumerate(invoices):
        _upsert(db.invoices, {"business_id": business_id, "id": f"launch-invoice-{suffix}"}, {
            "id": f"launch-invoice-{suffix}",
            "business_id": business_id,
            "client_id": list(client_ids.values())[idx % len(client_ids)],
            "job_id": f"launch-job-{jobs[idx % len(jobs)][0]}",
            "status": status,
            "total": 480.0 + idx * 90,
            "due_date": (now + timedelta(days=(7 - idx))).date().isoformat(),
            "myob_sync_status": myob_status,
            **SEED_TAG,
        })

    if _has_collection(db, "automation_rules"):
        rule_keys = [
            "completed_job_draft_invoice",
            "quote_sent_followup_draft",
            "overdue_invoice_reminder_draft",
            "worker_job_complete_owner_notification",
            "job_assigned_worker_notification",
        ]
        for key in rule_keys:
            _upsert(db.automation_rules, {"business_id": business_id, "template_key": key}, {
                "id": f"launch-rule-{key}", "business_id": business_id, "template_key": key, "enabled": True, **SEED_TAG
            })

    if _has_collection(db, "automation_runs"):
        _upsert(db.automation_runs, {"business_id": business_id, "id": "launch-run-success"}, {
            "id": "launch-run-success", "business_id": business_id, "status": "success", "rule_key": "completed_job_draft_invoice", "message": "Seeded successful run", **SEED_TAG
        })
        _upsert(db.automation_runs, {"business_id": business_id, "id": "launch-run-failed"}, {
            "id": "launch-run-failed", "business_id": business_id, "status": "failed", "rule_key": "overdue_invoice_reminder_draft", "error": "Seeded failure example", **SEED_TAG
        })

    if _has_collection(db, "sms_log"):
        _upsert(db.sms_log, {"business_id": business_id, "id": "launch-sms-sample-1"}, {
            "id": "launch-sms-sample-1", "business_id": business_id, "to": "+64000000000", "message": "Sample only: launch test", "status": "draft_sample", "provider": "none", **SEED_TAG
        })

    if _has_collection(db, "timesheets"):
        _upsert(db.timesheets, {"business_id": business_id, "id": "launch-timesheet-approved"}, {
            "id": "launch-timesheet-approved", "business_id": business_id, "worker_id": worker_id, "hours": 32.5, "status": "approved", "week_start": (now - timedelta(days=now.weekday())).date().isoformat(), **SEED_TAG
        })
        _upsert(db.timesheets, {"business_id": business_id, "id": "launch-timesheet-pending"}, {
            "id": "launch-timesheet-pending", "business_id": business_id, "worker_id": worker_id, "hours": 8.0, "status": "pending", "week_start": (now - timedelta(days=now.weekday())).date().isoformat(), **SEED_TAG
        })

    if _has_collection(db, "payroll_summaries"):
        _upsert(db.payroll_summaries, {"business_id": business_id, "id": "launch-payroll-summary"}, {
            "id": "launch-payroll-summary", "business_id": business_id, "period": now.strftime("%Y-%m"), "total_hours": 40.5, "total_workers": 1, "status": "draft", **SEED_TAG
        })

    print("Launch test data seeding completed safely (upsert-only, no destructive actions).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
