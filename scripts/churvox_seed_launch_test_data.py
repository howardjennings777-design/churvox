#!/usr/bin/env python3
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from pymongo import MongoClient

SEED_SOURCE = "churvox_launch_seed"
SEED_TAG = {"launch_test_data": True, "seeded_by": SEED_SOURCE}


def now_utc():
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def upsert_seed(coll, seed_key: str, business_id: str, payload: dict, counters: dict, bucket: str):
    query = {"business_id": business_id, "seed_key": seed_key}
    data = dict(payload)
    data.update(SEED_TAG)
    data["business_id"] = business_id
    data["seed_key"] = seed_key
    data["updated_at"] = now_utc()
    res = coll.update_one(query, {"$set": data, "$setOnInsert": {"created_at": now_utc()}}, upsert=True)
    if res.upserted_id:
        counters[bucket]["created"] += 1
    else:
        counters[bucket]["updated"] += 1


def safe_main() -> int:
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME")
    if not mongo_url or not db_name:
        print("ERROR: MONGO_URL and DB_NAME are required. Example: MONGO_URL='mongodb://...' DB_NAME='churvox'")
        return 2

    owner_email = os.getenv("TEST_OWNER_EMAIL", "hello@churvox.com").strip().lower()
    owner_password = os.getenv("TEST_OWNER_PASSWORD", "TempPass123!")
    business_name = os.getenv("TEST_BUSINESS_NAME", "Churvox Launch Test Business").strip()

    client = MongoClient(mongo_url)
    db = client[db_name]

    counters = {k: {"created": 0, "updated": 0} for k in [
        "users", "clients", "jobs", "quotes", "invoices", "automation_rules",
        "automation_runs", "timesheets", "notifications"
    ]}

    business_id = f"launch-test-{owner_email}"
    owner_role = "owner"

    owner_existing = db.users.find_one({"email": owner_email})
    if owner_existing:
        owner_role = owner_existing.get("role") or "owner"

    upsert_seed(db.users, "user:owner", business_id, {
        "email": owner_email,
        "name": "Launch Test Owner",
        "role": owner_role if owner_role in {"owner", "employer"} else "owner",
        "business_name": business_name,
        "password_hash": hash_password(owner_password),
        "status": "active",
        "plan": "enterprise",
        "plan_status": "trialing",
        "subscription_status": "trialing",
        "trial_ends_at": now_utc() + timedelta(days=14),
    }, counters, "users")

    test_users = [
        ("manager.test@churvox.local", "Launch Test Manager", "manager"),
        ("office.test@churvox.local", "Launch Test Office Admin", "office_admin"),
        ("payroll.test@churvox.local", "Launch Test Payroll", "payroll"),
        ("worker.test@churvox.local", "Launch Test Worker", "worker"),
        ("worker2.test@churvox.local", "Launch Test Worker Two", "worker"),
    ]
    for email, name, role in test_users:
        upsert_seed(db.users, f"user:{email}", business_id, {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": name,
            "role": role,
            "business_name": business_name,
            "password_hash": hash_password(owner_password),
            "status": "active",
        }, counters, "users")

    worker = db.users.find_one({"business_id": business_id, "email": "worker.test@churvox.local"}) or {}
    worker2 = db.users.find_one({"business_id": business_id, "email": "worker2.test@churvox.local"}) or {}
    owner = db.users.find_one({"business_id": business_id, "email": owner_email}) or {}

    worker_id = str(worker.get("_id") or worker.get("id") or "")
    worker2_id = str(worker2.get("_id") or worker2.get("id") or "")
    owner_id = str(owner.get("_id") or owner.get("id") or "")

    clients = [
        ("green-acres", "Green Acres Property", "green.acres@test.local", "+64 21 555 0101", "15 Rimu Road, Lower Hutt 5010", "Quarterly maintenance contract."),
        ("naenae-medical", "Naenae Medical Centre Test", "ops@naenaemedical.test", "+64 27 555 0102", "9 Hillary Court, Naenae, Lower Hutt 5011", "After-hours cleaning access instructions."),
        ("willow-rentals", "Willow Rentals", "pm@willowrentals.test", "+64 22 555 0103", "77 Cuba Street, Te Aro, Wellington 6011", "Portfolio of small rental touch-ups."),
        ("stuart-ecb", "Stuart ECB Test Customer", "stuart@test.local", "+64 20 555 0104", "108 Eastbourne Crescent, Karori, Wellington 6012", "ECB campaign test account."),
        ("harbour-view", "Harbour View Apartments", "facilities@harbourview.test", "+64 21 555 0105", "42 Marine Parade, Petone, Lower Hutt 5012", "Body corporate recurring services."),
        ("sample-lawn", "Sample Residential Lawn Client", "lawn@test.local", "+64 28 555 0106", "3 Kowhai Street, Taita, Lower Hutt 5011", "Residential lawn and edging."),
        ("sample-cleaning", "Sample Commercial Cleaning Client", "cleaning@test.local", "+64 29 555 0107", "81 Jackson Street, Petone, Lower Hutt 5012", "Commercial weekly clean."),
    ]

    client_map = {}
    for key, name, email, phone, address, notes in clients:
        upsert_seed(db.clients, f"client:{key}", business_id, {
            "id": f"launch-client-{key}",
            "name": name,
            "email": email,
            "phone": phone,
            "address": address,
            "notes": notes,
        }, counters, "clients")
        client_map[key] = f"launch-client-{key}"

    today = now_utc()
    jobs = [
        ("job-today-assigned", "Today assigned job", "assigned", today, "fixed", worker_id, {"price": 320}),
        ("job-today-progress", "Today in progress job", "in_progress", today, "hourly", worker_id, {"hourly_rate": 95, "started_at": today - timedelta(hours=2), "tracked_minutes": 120}),
        ("job-paused", "Paused job", "paused", today, "hourly", worker_id, {"pause_events": [{"paused_at": today - timedelta(hours=1), "reason": "Customer unavailable"}]}),
        ("job-completed", "Completed job", "completed", today - timedelta(days=1), "fixed", worker2_id or worker_id, {"completed_at": today - timedelta(hours=4), "price": 420}),
        ("job-overdue", "Overdue job", "assigned", today - timedelta(days=4), "fixed", worker_id, {"price": 290}),
        ("job-unassigned", "Unassigned job", "assigned", today + timedelta(days=2), "fixed", "", {"price": 270}),
        ("job-recurring", "Recurring fortnightly job", "assigned", today + timedelta(days=1), "fixed", worker_id, {"is_recurring": True, "recurrence_pattern": "fortnightly", "price": 210}),
        ("job-hourly", "Hourly job", "assigned", today + timedelta(days=3), "hourly", worker_id, {"hourly_rate": 110, "estimated_duration_hours": 3.5}),
        ("job-fixed-extras", "Fixed + extras job", "assigned", today + timedelta(days=1), "fixed_extras", worker2_id or worker_id, {"price": 360, "extras": [{"name": "Rubbish removal", "amount": 45.0}]}),
        ("job-photos", "Job with worker photos placeholder", "in_progress", today, "hourly", worker_id, {"worker_photos": [{"file_name": "placeholder-before.jpg", "caption": "Before", "uploaded_by": "worker.test@churvox.local"}]}),
        ("job-worker-note", "Job with worker note", "assigned", today + timedelta(days=1), "fixed", worker_id, {"worker_notes": [{"author": "worker.test@churvox.local", "note": "Gate code in service notes."}], "price": 180}),
    ]

    client_ids = list(client_map.values())
    for i, (key, title, status, sched, pricing_type, assigned, extra) in enumerate(jobs):
        payload = {
            "id": f"launch-{key}",
            "title": title,
            "status": status,
            "scheduled_date": sched.date().isoformat(),
            "pricing_type": pricing_type,
            "client_id": client_ids[i % len(client_ids)],
            "assigned_worker_ids": [assigned] if assigned else [],
        }
        payload.update(extra)
        upsert_seed(db.jobs, f"job:{key}", business_id, payload, counters, "jobs")

    quote_items = [
        ("draft", "draft", 14, None),
        ("sent", "sent", 10, None),
        ("accepted", "accepted", 21, None),
        ("declined", "declined", 7, None),
        ("expiring-soon", "sent", 1, None),
        ("public-token", "sent", 30, "quote-public-launch-token"),
    ]
    for i, (key, status, days_valid, public_token) in enumerate(quote_items):
        upsert_seed(db.quotes, f"quote:{key}", business_id, {
            "id": f"launch-quote-{key}",
            "client_id": client_ids[i % len(client_ids)],
            "address": clients[i % len(clients)][4],
            "job_description": f"{clients[i % len(clients)][1]} service proposal",
            "price": float(250 + (i * 75)),
            "status": status,
            "valid_until": (today + timedelta(days=days_valid)).date().isoformat(),
            "public_token": public_token,
        }, counters, "quotes")

    inv_items = [
        ("draft", "draft", 14, None, "not_synced", None),
        ("sent-unpaid", "sent", 10, None, "not_synced", None),
        ("paid", "paid", -2, None, "synced", None),
        ("overdue", "sent", -5, None, "not_synced", None),
        ("myob-not-synced", "sent", 5, None, "not_synced", None),
        ("myob-sync-failed", "sent", 3, None, "sync_failed", "Sample MYOB timeout from test run."),
        ("public-token", "sent", 7, "invoice-public-launch-token", "not_synced", None),
        ("payment-url", "sent", 7, None, "not_synced", None),
    ]
    for i, (key, status, due_delta, public_token, myob_status, myob_error) in enumerate(inv_items):
        subtotal = float(300 + i * 80)
        gst_rate = 0.15
        upsert_seed(db.invoices, f"invoice:{key}", business_id, {
            "id": f"launch-invoice-{key}",
            "invoice_number": f"LTEST-{1000 + i}",
            "client_id": client_ids[i % len(client_ids)],
            "description": f"Launch test invoice {key}",
            "subtotal": subtotal,
            "gst_rate": gst_rate,
            "total": round(subtotal * (1 + gst_rate), 2),
            "status": status,
            "due_date": (today + timedelta(days=due_delta)).date().isoformat(),
            "public_token": public_token,
            "payment_url": "https://example.test/pay/launch-invoice" if key == "payment-url" else None,
            "myob_sync_status": myob_status,
            "myob_error": myob_error,
        }, counters, "invoices")

    rules = [
        "completed_job_draft_invoice", "quote_sent_followup_draft", "overdue_invoice_reminder_draft",
        "worker_job_complete_owner_notification", "job_assigned_worker_notification", "invoice_paid_owner_notification",
        "quote_accepted_owner_notification", "worker_note_added_owner_notification",
    ]
    for key in rules:
        upsert_seed(db.automation_rules, f"automation-rule:{key}", business_id, {
            "id": f"launch-automation-rule-{key}", "template_key": key, "enabled": True, "action_mode": "draft_only"
        }, counters, "automation_rules")

    runs = [
        ("success", "success", "completed_job_draft_invoice", "Created draft invoice safely."),
        ("failed", "failed", "overdue_invoice_reminder_draft", "Template variable missing in test payload."),
        ("queued", "queued", "job_assigned_worker_notification", "Queued for safe retry sample."),
        ("skipped", "skipped", "worker_note_added_owner_notification", "Skipped due to duplicate event."),
    ]
    for key, status, rule_key, message in runs:
        upsert_seed(db.automation_runs, f"automation-run:{key}", business_id, {
            "id": f"launch-automation-run-{key}", "status": status, "rule_key": rule_key, "message": message
        }, counters, "automation_runs")

    timesheets = [
        ("pending", "pending", 38.5, 0), ("submitted", "submitted", 40.0, 0),
        ("approved", "approved", 41.0, 41.0), ("rejected", "rejected", 35.0, 0),
        ("current-week", "submitted", 32.0, 0), ("last-week", "approved", 39.5, 39.5),
    ]
    monday = today - timedelta(days=today.weekday())
    for i, (key, status, total, approved) in enumerate(timesheets):
        week_offset = 0 if "current" in key else (7 if "last" in key else i)
        upsert_seed(db.timesheets, f"timesheet:{key}", business_id, {
            "id": f"launch-timesheet-{key}",
            "worker_name": "Launch Test Worker",
            "worker_email": "worker.test@churvox.local",
            "worker_id": worker_id,
            "pay_period": (monday - timedelta(days=week_offset)).date().isoformat(),
            "status": status,
            "total_hours": total,
            "approved_hours": approved,
            "gross_pay": round(total * 35, 2),
            "entries": [{"date": (today - timedelta(days=1)).date().isoformat(), "hours": min(total, 8), "job_id": "launch-job-job-today-progress"}],
            "notes": f"Seeded {key} timesheet sample",
        }, counters, "timesheets")

    notifications = [
        ("worker-completed", "Worker completed job", "Worker marked job complete.", "job", "launch-job-job-completed", "/jobs/launch-job-job-completed"),
        ("worker-photo", "Worker uploaded photo", "A worker uploaded site photos.", "job", "launch-job-job-photos", "/jobs/launch-job-job-photos"),
        ("worker-note", "Worker added note", "A worker added an on-site note.", "job", "launch-job-job-worker-note", "/jobs/launch-job-job-worker-note"),
        ("invoice-overdue", "Invoice overdue", "A launch test invoice is overdue.", "invoice", "launch-invoice-overdue", "/invoices"),
        ("quote-accepted", "Quote accepted", "A launch test quote was accepted.", "quote", "launch-quote-accepted", "/quotes"),
        ("automation-failed", "Automation failed", "Automation run failed in sample data.", "automation", "launch-automation-run-failed", "/automation/runs"),
    ]
    for key, title, message, entity_type, entity_id, deep_link in notifications:
        upsert_seed(db.notifications, f"notification:{key}", business_id, {
            "id": f"launch-notification-{key}",
            "title": title,
            "message": message,
            "type": entity_type,
            "read": False,
            "deep_link": deep_link,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "created_at": now_utc(),
            "owner_id": owner_id,
        }, counters, "notifications")

    print("Launch test data seeding complete.")
    print(f"Business: {business_name} ({business_id})")
    for bucket, values in counters.items():
        print(f"- {bucket}: created={values['created']} updated={values['updated']}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(safe_main())
    except Exception as exc:
        print(f"FATAL: launch seed failed safely: {exc}")
        raise SystemExit(1)
