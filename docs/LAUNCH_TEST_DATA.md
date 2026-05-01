# Churvox Launch Test Data

This repo includes a safe, idempotent launch test-data seeding script for creating/updating sample records in one business context.

## Run

```bash
bash scripts/churvox_seed_launch_test_data.sh
```

The wrapper loads `backend/.env` (if present) and runs the Python seed tool.

## Test Accounts Created

- Owner: `TEST_OWNER_EMAIL` (default `hello@churvox.com`)
- Manager: `manager.test@churvox.local`
- Office admin: `office.test@churvox.local`
- Payroll: `payroll.test@churvox.local`
- Worker: `worker.test@churvox.local`

Default password for seeded users is `TEST_OWNER_PASSWORD` (default `TempPass123!`) hashed via bcrypt.

## What gets seeded

- Users, clients, jobs, quotes, invoices.
- Automation rules/runs only if collections exist.
- SMS history sample entries only if `sms_log` exists.
- Timesheet/payroll sample records only if corresponding collections exist.

## Safety markers

All seeded records are tagged with:

- `launch_test_data: true`
- `seeded_by: churvox_launch_seed`

These markers allow easy filtering and cleanup of test data.

## Warnings

- This is **test data** only.
- The script is upsert-only and does not delete production data.
- Do **not** run against real customer production unless intentionally testing.
- The script does not send real emails/SMS and does not call Stripe/MYOB.
