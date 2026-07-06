# Churvox paid launch audit

This is the test gate to run before letting paid users or serious beta testers into Churvox.

## 1. Public smoke test

Run:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://www.churvox.com npx playwright test tests/e2e/churvox-paid-launch-full-audit.spec.js
```

This checks public pages, tester signup, billing cancel/help, worker public shell, and backend launch routes where credentials are supplied.

## 2. Owner-level product audit

Run:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://www.churvox.com npx playwright test tests/e2e/churvox-paid-launch-own-it-audit.spec.js
```

This checks:

- public routes render cleanly
- mobile routes do not overflow
- owner pages have different page contracts
- setup coach duplicates do not appear
- approval controls only appear in Command
- Workers page has one clean GPS map panel
- forms open for Jobs, Clients, Workers, Quotes, and Invoices
- worker app keeps a simple field flow
- accounting, invoice, payroll and Command guardrails stay visible

## 3. Logged-in owner audit

Set credentials first:

```bash
export CHURVOX_OWNER_EMAIL="owner@example.com"
export CHURVOX_OWNER_PASSWORD="your-password"
```

Then run:

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://www.churvox.com npx playwright test tests/e2e/churvox-paid-launch-own-it-audit.spec.js --project=desktop-chromium
```

## 4. Logged-in worker audit

Set worker credentials too:

```bash
export CHURVOX_WORKER_EMAIL="worker@example.com"
export CHURVOX_WORKER_PASSWORD="worker-password"
```

Then run the same audit. Worker login checks will only run when worker credentials exist.

## 5. Mutation audit

Only run this when you are happy for the test to create real test records.

```bash
cd frontend
CHURVOX_E2E_MUTATE=1 PLAYWRIGHT_BASE_URL=https://www.churvox.com npx playwright test tests/e2e/churvox-paid-launch-own-it-audit.spec.js --project=desktop-chromium
```

This creates a test client, worker and job, then confirms they show in the owner app.

## Paid launch pass rule

Do not invite paid users until these are green:

1. Public smoke test passes.
2. Owner-level product audit passes with owner credentials.
3. Worker audit passes with worker credentials.
4. Mutation audit passes at least once on a clean tester account.
5. Manual iPhone worker test passes.

## Manual iPhone worker check

On a real phone:

1. Log in as worker.
2. Open Today.
3. Open Jobs.
4. Open one job.
5. Tap Directions.
6. Tap Acknowledge.
7. Tap Start job.
8. Send one problem to Command.
9. Add proof note/photo.
10. Finish job.
11. Log in as owner and confirm it appears in Command.

## Manual owner check

As owner:

1. Add client.
2. Add worker.
3. Add job.
4. Assign worker.
5. Edit job.
6. Add recurring job.
7. Create quote.
8. Create invoice draft.
9. Open Command.
10. Approve, edit and park a Command slip.
11. Check Workers map has one GPS map only.
12. Check no setup coach duplicate appears.

## Launch decision

If anything fails, fix it before sending real testers. Churvox should feel boringly reliable before people are asked to pay.
