# Launch Verification Report

- **Timestamp (UTC):** 2026-05-01 07:26:11 UTC
- **Latest commit at verification start:** `a57c8ad`

## Build and Compile Results

- **Frontend dependency install (`npm --prefix frontend install`):** ❌ Failed with `403 Forbidden` fetching package metadata from `https://registry.npmjs.org/eslint`.
- **Frontend production build (`npm --prefix frontend run build`):** ⚠️ Not run because dependency install failed.
- **Backend syntax compile (`python3 -m py_compile backend/server.py`):** ✅ Passed.
- **Backend full compile (`python3 -m compileall -q backend`):** ✅ Passed.
- **Launch seed script compile (`python3 -m py_compile scripts/churvox_seed_launch_test_data.py`):** ✅ Passed.

## Smoke Script Result

- **Smoke script (`bash scripts/churvox_launch_smoke.sh`):** ❌ Failed early during frontend dependency installation with the same npm `403 Forbidden` error, so route/browser checks inside the script did not execute.

## Browser E2E Status

- **Status:** Failed to execute due to dependency installation blocker in smoke script.
- **E2E base URL:** No explicit `E2E_BASE_URL` evidence captured in this pass because execution stopped before the script reached E2E branching.

## Routes Verified (Static Route Wiring Check)

Verified in `frontend/src/App.js`:
- `/jobs` route exists and remains explicitly wired.
- `/smart-hub` -> `SmartHubPage`
- `/reports` -> `ReportsPage`
- `/sms` -> `SMSPage`
- `/integrations` -> `IntegrationsPage`
- `/automation` -> `AutomationPage`
- `/automation/runs` -> `AutomationRunsPage`
- `/launch-check` -> `LaunchCheckPage`

## Backend Endpoints Verified (Presence in `backend/server.py`)

Confirmed present:
- `/smart-hub/summary`
- `/ai/business-assistant`
- `/reports/summary`
- `/reports/invoices.csv`
- `/reports/jobs.csv`
- `/reports/quotes.csv`
- `/sms/balance`
- `/sms/history`
- `/sms/send`
- `/sms/buy-credits`
- `/myob/status`
- `/myob/settings`
- `/myob/test-connection`
- `/myob/invoices/{invoice_id}/sync`
- `/myob/invoices/{invoice_id}/pull-payment-status`
- `/automation/templates`
- `/automation/rules`
- `/automation/runs`

No missing endpoint fallbacks were required in this pass.

## Known Not-Configured Systems (Environment Dependent)

- SMS credit checkout may be not configured depending on provider credentials/env.
- MYOB OAuth/invoice sync paths may be not configured depending on tenant and secrets.
- AI provider may run in fallback mode if upstream provider keys/services are unavailable.

## Manual Test List Still Required

Manual launch validation remains required; see:
- `docs/MANUAL_LAUNCH_TEST_CHECKLIST.md`

## Do Not Launch Until These Pass

1. Frontend dependency installation succeeds in the target environment.
2. Frontend production build succeeds.
3. Smoke script runs end-to-end without install/build blockers.
4. Browser E2E pass (or documented acceptable skips with rationale) is completed against deployed/staging URL.
5. Manual checklist critical path (owner + worker auth, jobs, quote/invoice public links, payroll protections, Smart Hub/Reports/SMS/MYOB/Automation/Launch Check pages) is executed and signed off.
