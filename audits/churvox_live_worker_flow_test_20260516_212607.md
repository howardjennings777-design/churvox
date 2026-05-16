# Churvox Live Worker Flow Test

Generated: 2026-05-16 21:26:07 UTC

## Summary

- HIGH: 0
- MED: 0
- LOW: 0
- Backend: https://grassley-backend.onrender.com
- Worker login supplied: no

## Checks

- ✅ **Owner login** — status `200` — {"id": "69d5c63456d9106e0dcfd2c8", "email": "hello@churvox.com", "name": "Howard", "business_name": "Churvox Platform", "role": "owner", "plan": "enterprise", "plan_status": "active", "subscription_status": "active", "trial_ends_at": null, "stripe_subscription_id": null, "gst_rate": 15.0, "trade_type": "other", "business_id": "69d5c63456d9106e0dcfd2c8", "onboarding_completed": false, "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OWQ1YzYzNDU2ZDkxMDZlMGRjZmQyYzgiLCJlbWFpbCI6ImhlbGxvQGNodXJ2b3guY29tIiwiZXhwIjoxNzc5MDUzMTYwLCJ0eXBlIjoiYWNjZXNzIn0.thfDvedaxgWrWkYuoC0stBV8PnC05g2QTQxaMEEG8yA"}
- ✅ **Owner can load workers** — status `200` — Workers found: 3 [{"id": "6a00db4f8ea90bb453146abe", "name": "PW Worker 1778441029645", "email": "pw-worker-1778441029645@example.com", "phone": "0210000001", "country": "", "region": "", "city": "", "notes": "", "role": "worker", "status": "invited", "assigned_jobs": [], "business_id": "69d5c63456d9106e0dcfd2c8", "created_at": "2026-05-10T19:23:59.389000", "updated_at": "2026-05-10T19:23:59.389000"}, {"id": "6a00d64e8ea90bb453146aae", "name": "PW Worker 1778439745800", "email": "pw-worker-1778439745800@example.com", "phone": "0210000001", "country": "", "region": "", "city": "", "notes": "", "role": "worker", "status": "invited", "assigned_jobs": [], "business_id": "69d5c63456d9106e0dcfd2c8", "created_at": 
- ✅ **Create test client for worker flow** — status `200` — id=6a08e0ea6ceadd6806c28b19 {"success": true, "id": "6a08e0ea6ceadd6806c28b19", "message": "Client created"}
- ✅ **Create test job** — status `200` — id=6a08e0ea6ceadd6806c28b1a worker_id=6a00db4f8ea90bb453146abe {"success": true, "id": "6a08e0ea6ceadd6806c28b1a", "message": "Job created"}
- ✅ **Assign worker to test job** — status `200` — PATCH 200 {"success": true, "message": "Job updated"} 
- ✅ **Open/read test job** — status `200` — {"id": "6a08e0ea6ceadd6806c28b1a", "title": "Worker Flow Test Job 20260516212601", "job_type": "other", "client_id": null, "client_name": "Worker Flow Test Client 20260516212601", "customer_name": "Worker Flow Test Client 20260516212601", "address": "1 Worker Flow Test Street, Wellington", "country": "New Zealand", "region": "", "city": "", "scheduled_date": null, "scheduled_time": "", "estimated_duration": 60, "price": 0, "pricing_type": "fixed", "hourly_rate": 0, "extras": [], "notes": "", "worker_notes": "", "assigned_worker_id": "6a00db4f8ea90bb453146abe", "assigned_worker_name": "", "status": "assigned", "accepted_at": null, "started_at": null, "completed_at": null, "time_spent_minutes"
- ✅ **Worker login** — status `0` — Skipped: set CHURVOX_WORKER_EMAIL and CHURVOX_WORKER_PASSWORD to run real worker login.
- ✅ **Delete test job cleanup** — status `200` — {"success": true, "message": "Job deleted"}
- ✅ **Delete test client cleanup** — status `200` — {"success": true, "message": "Client deleted"}

## Findings

No live worker flow blockers found in this API smoke test.

## Notes

- This test creates then deletes one client and one job.
- Real worker login is optional and only runs if worker env vars are supplied.
- It does not send SMS, customer email, Stripe charges, or MYOB updates.
