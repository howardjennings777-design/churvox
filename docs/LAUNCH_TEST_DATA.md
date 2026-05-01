# Launch Test Data Seeding

Run launch seed:

```bash
bash scripts/churvox_seed_launch_test_data.sh
```

## Environment Variables
- `MONGO_URL` (**required**)
- `DB_NAME` (**required**)
- `TEST_OWNER_EMAIL` (default: `hello@churvox.com`)
- `TEST_OWNER_PASSWORD` (default: `TempPass123!`)
- `TEST_BUSINESS_NAME` (default: `Churvox Launch Test Business`)

If `MONGO_URL` or `DB_NAME` is missing, the script exits safely with a clear error.

## Test Accounts
- Owner: `TEST_OWNER_EMAIL`
- Manager: `manager.test@churvox.local`
- Office Admin: `office.test@churvox.local`
- Payroll: `payroll.test@churvox.local`
- Worker: `worker.test@churvox.local`
- Worker 2: `worker2.test@churvox.local`

All users are connected to one launch test business by `business_id`.

## Seeded Data
- Business-scoped users/roles
- 7 launch test clients
- 11 launch jobs (assigned/in progress/paused/completed/overdue/unassigned/recurring/hourly/fixed+extras/photos/note)
- 6 quotes (draft/sent/accepted/declined/expiring/public token)
- 8 invoices (draft/sent unpaid/paid/overdue/MYOB sample statuses/public token/payment URL placeholder)
- 8 automation rules + 4 automation runs
- 6 timesheet/payroll samples
- 6 notifications

## Safety
- Upsert-only by stable `seed_key + business_id`
- No delete operations
- No SMS sending
- No email sending
- No MYOB API calls
- No Stripe API calls

## Record Identification
- `launch_test_data: true`
- `seeded_by: "churvox_launch_seed"`
