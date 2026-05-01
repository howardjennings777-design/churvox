# Launch Verification Report

- **Date/time generated (UTC):** 2026-05-01 10:08:30 UTC
- **Branch:** `work`
- **Latest git commit at verification:** `9a7351c958572ac8953fe2518936c6b2689d409f`

## Build / Compile / Smoke Results

- **Frontend dependency install (`npm --prefix frontend install`):** ❌ Failed (`403 Forbidden` from `https://registry.npmjs.org/eslint`).
- **Frontend build (`npm --prefix frontend run build`):** ❌ Failed (`craco: not found`, because dependency install did not complete).
- **Backend compile (`python3 -m py_compile backend/server.py`):** ✅ Passed.
- **Backend compile-all (`python3 -m compileall -q backend`):** ✅ Passed.
- **Seed script compile (`python3 -m py_compile scripts/churvox_seed_launch_test_data.py`):** ✅ Passed.
- **Smoke script (`bash scripts/churvox_launch_smoke.sh`):** ❌ Failed at frontend dependency install with same npm 403 blocker.

## E2E Status

- **Status:** Failed to execute in this pass.
- **Reason:** Smoke path did not reach E2E phase because frontend dependency install failed first.
- **E2E_BASE_URL handling:** Not reached in this run; no skip branch executed.

## Routes Verified by Static Review

Static route review completed in `frontend/src/App.js`, including:
- Public/auth routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/privacy`, `/terms`, `/privacy-policy`, `/terms-of-service`, `/public/quote/:token`, `/public/invoice/:token`.
- Business routes: `/jobs`, `/jobs/new`, `/jobs/:id`, `/clients`, `/clients/new`, `/quotes`, `/quotes/new`, `/invoices`, `/invoices/new`, `/team`, `/settings`, `/plans`, `/smart-hub`, `/reports`, `/sms`, `/integrations`, `/automation`, `/automation/runs`, `/launch-check`, `/timesheets`.
- Worker routes: `/worker/jobs`, `/worker/jobs/:id`, `/worker/settings`.
- Redirects: `/dashboard -> /jobs`, `/overview -> /jobs`, business default `/jobs`, worker default `/worker/jobs`, payroll default `/timesheets`.

## Backend Endpoints Verified by Static Review

Verified in backend code (`backend/server.py` and fallback boot wiring in `backend/launch_complete_backend_boot.py`):
- Billing: `/billing/status`, `/billing/start-trial`, `/stripe/create-checkout-session`, `/billing/confirm-checkout`, billing webhook.
- Reports: `/reports/summary`, `/reports/invoices.csv`, `/reports/jobs.csv`, `/reports/quotes.csv`, `/reports/payroll.csv`.
- SMS: `/sms/balance`, `/sms/history`, `/sms/send`, `/sms/buy-credits`.
- MYOB: `/myob/status`, `/myob/settings`, `/myob/test-connection`, `/myob/oauth/start`, `/myob/oauth/callback`, `/myob/invoices/{invoice_id}/sync`, `/myob/invoices/{invoice_id}/pull-payment-status`.
- Automation: `/automation/templates`, `/automation/rules`, `/automation/runs`, `/automation/runs/{run_id}/retry`.
- Payroll: `/timesheets`, `/timesheets/summary`, `/timesheets/{id}/approve`, `/timesheets/{id}/reject`, `/payroll/summary`, `/payroll/export.csv`.
- CSV imports: `/clients/import-csv`, `/team/import-csv`.
- Notifications: `/notifications`, `/notifications/{id}/read`, `/notifications/read-all`.

No new fallback routes were added in this pass.

## Known Not-Configured Systems (Env-dependent)

- SMS provider may be unavailable if SMS env/provider setup is missing.
- SMS credit checkout may be unavailable if Stripe SMS prices are not configured.
- MYOB OAuth unavailable unless `MYOB_CLIENT_ID`, `MYOB_CLIENT_SECRET`, `MYOB_REDIRECT_URI` are set.
- AI provider may run in fallback mode if provider key/service is missing.
- Stripe checkout unavailable if required Stripe env vars are missing.

## Manual Testing Still Required

Manual browser/device tests are still required per `docs/MANUAL_LAUNCH_TEST_CHECKLIST.md`.

## Do Not Launch Until

- [ ] Owner login tested live.
- [ ] Job create/open/assign tested live.
- [ ] Worker login/job action tested live.
- [ ] Public quote link tested live.
- [ ] Public invoice link tested live.
- [ ] Plans/trial/Stripe return tested live.
- [ ] Mobile taps tested live.
- [ ] Render deploy verified.


## 2026-05-01 Build blocker follow-up

- Updated `frontend/.npmrc` to remove `omit=dev` so build tooling like `craco` is no longer excluded from install.
- Retried `npm --prefix frontend install --legacy-peer-deps`; still blocked by upstream `403 Forbidden` on fetching `eslint` from the registry in this environment.
- Because install is blocked upstream, `npm --prefix frontend run build` still cannot complete (`craco: not found` until dependencies can be installed).
