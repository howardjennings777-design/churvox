# Command Wiring Audit

Generated: 2026-06-11 00:30

## Executive summary

- Checks passed by keyword/route scan: **14/16**
- Checks missing or unclear: **2/16**
- Frontend files scanned: **794**
- Backend/API files scanned: **43**

**Audit result:** Command still looks mostly preview/localStorage based. Next step is backend Command slips + approval endpoints.

## Wiring checklist

| Area | Status | Meaning |
|---|---:|---|
| Command visible in frontend | ✅ PASS | Command files/routes exist in the frontend. |
| Command backend routes | ❌ MISSING | Backend has command/approval/operator references. |
| Command uses backend API | ❌ MISSING | Frontend Command calls backend for slips/actions. |
| Command currently uses localStorage | ⚠️ PREVIEW | Preview/local storage is present. Fine for demo, not enough for launch. |
| Command/approval data model | ✅ PASS | There is a dedicated Command/Approval/Operator action model/schema. |
| Approve/ignore/snooze endpoints | ✅ PASS | Backend has owner decision endpoints. |
| Audit/history wiring | ✅ PASS | Approvals/snoozes/owner actions are recorded. |
| Job complete trigger | ✅ PASS | Jobs can create Command slips after completion. |
| Invoice overdue trigger | ✅ PASS | Invoices have due/paid/overdue fields or logic. |
| Quote follow-up trigger | ✅ PASS | Quotes can trigger follow-up actions. |
| Worker acknowledge trigger | ✅ PASS | Worker acknowledgement/assignment exists. |
| Business isolation | ✅ PASS | Business/tenant scoping appears in code. |
| Auth wiring | ✅ PASS | Protected endpoints/session/user auth appears in code. |
| CSV import/export | ✅ PASS | CSV import/export/template wiring exists somewhere. |
| Stripe plan/payment wiring | ✅ PASS | Stripe/plan/subscription wiring exists somewhere. |
| MYOB/Xero integration references | ✅ PASS | Accounting integration references exist. |

## Command launch wiring target

For Command to be real, this chain must work:

1. Backend scans real business data.
2. Backend creates Command slips from jobs, invoices, quotes, workers, customers, messages and setup gaps.
3. Frontend Command loads slips from backend, not localStorage only.
4. Owner approves/edits/snoozes/ignores.
5. Backend performs the real action or stores the owner decision.
6. Audit/history records who did what and when.
7. Command updates counts immediately.

## Required backend slip rules

| Source | Creates slip when | Needed action type |
|---|---|---|
| Jobs | completed job has no invoice | `create_invoice_from_job` / `review_invoice` |
| Jobs | worker note/photo suggests extra work | `approve_invoice_extra` |
| Invoices | due date passed and not paid | `send_payment_reminder` |
| Quotes | sent but no reply after X days | `send_quote_followup` |
| Workers | assigned job not acknowledged | `send_worker_brief` / `worker_ack_reminder` |
| Clients | recurring customer overdue | `send_rebooking_message` |
| Messages | booking/payment/complaint detected | `send_customer_message` |
| Setup | GST/invoice/business details missing | `fix_setup_step` |

## Minimum backend endpoints needed

```txt
GET    /api/command/slips
POST   /api/command/scan
POST   /api/command/slips/:id/approve
PATCH  /api/command/slips/:id/edit
POST   /api/command/slips/:id/snooze
POST   /api/command/slips/:id/ignore
GET    /api/command/events
GET    /api/command/audit
```

## Minimum CommandSlip fields

```js
{
  businessId,
  sourceType,      // job | invoice | quote | worker | client | message | setup
  sourceId,
  actionType,
  title,
  found,
  prepared,
  why,
  urgency,
  status,          // open | edited | approved | snoozed | ignored | completed
  payload,         // invoice/message/job fields
  snoozeUntil,
  audit: [{ by, action, at, before, after }],
}
```

### Command-related files

- `.github/workflows/add-command-account-centre.yml`
- `.github/workflows/compact-command-hub-layout.yml`
- `.github/workflows/fix-command-slip-item-taps.yml`
- `.github/workflows/patch-command-access-links.yml`
- `.github/workflows/patch-command-role-access.yml`
- `.github/workflows/register-ai-command-router.yml`
- `.github/workflows/register-command-hub-routes.yml`
- `CHURVOX_BIG_AUDIT_REPORT.md`
- `CHURVOX_FULL_RECORD_SLIPS.md`
- `CHURVOX_PROPER_SLIP_ONLY_FIX.md`
- `CHURVOX_SLIP_ONLY_FULLSCREEN_FIX.md`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md`
- `FINAL_LAUNCH_SMOKE_TEST.md`
- `LAUNCH_DEEP_AUDIT_20260529.md`
- `LAUNCH_DUPLICATE_AUDIT_20260529.md`
- `README.md`
- `SAFE_CLEANUP_OLD_JUNK_REPORT.md`
- `STAGE_1_STABILITY_LOCK.md`
- `STAGE_2_NAVIGATION_CLEANUP.md`
- `STAGE_4_AI_DECISION_ENGINE.md`
- `STAGE_5_JOB_COMPLETION_FLOW.md`
- `STAGE_6_APPROVE_SEND_POLISH.md`
- `STAGE_8_CLIENT_WORKBENCH.md`
- `STAGE_9_QUOTES_LOGIC.md`
- `_churvox_archive/prelaunch_old_unused_files/backend/ai_command_autoregister.py`
- `_churvox_archive/prelaunch_old_unused_files/backend/proof_pack_autoregister.py`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/concept-c/churvoxCommandFloorControlCopyPatch.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/concept-c/churvoxCrewMapNavPatch.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/concept-c/churvoxLaunchNavRuntimePatch.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/concept-c/churvoxNoWhiteCommandCardsRuntimePatch.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/concept-c/churvoxPlansNavPatch.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/pages/DashboardPage.backup-2026-05-02.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/pages/DashboardPage.backup-smart-hub-brain-2026-05-02.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/pages/DashboardPage.backup.js`
- `_churvox_archive/prelaunch_old_unused_files/frontend/src/pages/SmartHubBrainPage.backup-2026-05-02.js`
- `_churvox_archive/proper_slip_only/CommandDeskQueuePage.jsx`
- `_churvox_archive/slip_full_record/CommandDeskQueuePage.jsx`
- `backend/app/plan_rules.py`
- `backend/billing_addon_routes.py`
- `backend/churvox_billing_addon_fix.py`
- …and 80 more

### Backend command/operator/approval matches

_No matches found._

### Command localStorage/preview matches

- `scripts/audit_command_wiring.py:88` — `localstorage_command = grep(r"localStorage.*command|COMMAND_INBOX|fresh-command-inbox", 80)`
- `scripts/audit_command_wiring.py:118` — `("Command currently uses localStorage", bool(localstorage_command), "Preview/local storage is present. Fine for demo, not enough for launch."),`
- `scripts/audit_command_wiring.py:153` — `likely_preview_only = bool(localstorage_command) and not bool(frontend_command_backend_calls)`
- `scripts/audit_command_wiring.py:172` — `lines.append("**Audit result:** Command still looks mostly preview/localStorage based. Next step is backend Command slips + approval endpoints.")`
- `scripts/audit_command_wiring.py:253` — `lines += list_block("Command localStorage/preview matches", localstorage_command, 40)`
- `frontend/src/churvox-fresh/FreshXero.jsx:4` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshXero.jsx:70` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshXero.jsx:90` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));`
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:4` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:72` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:92` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));`
- `frontend/src/churvox-fresh/FreshMissingInfo.jsx:3` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshMissingInfo.jsx:50` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshMissingInfo.jsx:70` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));`
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:3` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:60` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:80` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 60)));`
- `frontend/src/churvox-fresh/FreshImports.jsx:4` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshImports.jsx:78` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshImports.jsx:98` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));`
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:3` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:49` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:69` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));`
- `frontend/src/churvox-fresh/FreshAudit.jsx:4` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshAudit.jsx:70` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshAudit.jsx:90` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));`
- `frontend/src/churvox-fresh/FreshDataControls.jsx:9` — `"churvox:fresh-command-inbox:v1",`
- `frontend/src/churvox-fresh/FreshAvailability.jsx:4` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshAvailability.jsx:66` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshAvailability.jsx:86` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));`
- `frontend/src/churvox-fresh/FreshProfitGuard.jsx:3` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshProfitGuard.jsx:58` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshProfitGuard.jsx:78` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 100)));`
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:3` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:60` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:80` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));`
- `frontend/src/churvox-fresh/FreshGps.jsx:4` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- `frontend/src/churvox-fresh/FreshGps.jsx:70` — `const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);`
- `frontend/src/churvox-fresh/FreshGps.jsx:90` — `window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 20)));`
- `frontend/src/churvox-fresh/FreshReworkResolver.jsx:3` — `const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";`
- …and 40 more

### Frontend API calls mentioning Command/approval/operator

_No matches found._

### Possible route definitions

- `backend/churvox_recurring_routes.py:96` — `@router.post("/logic/jobs/recurring")`
- `backend/churvox_recurring_routes.py:158` — `@router.post("/logic/jobs/{job_id}/complete-recurring")`
- `backend/server.py:3817` — `@app.get("/api/health-login")`
- `backend/churvox_billing_addon_fix.py:85` — `@router.post("/billing/create-addon-checkout-session")`
- `backend/churvox_billing_addon_fix.py:128` — `@router.post("/billing/confirm-addon-checkout")`
- `backend/email_provider.py:70` — `@router.post("/support/contact")`
- `backend/churvox_plan_consistency.py:173` — `@router.get("/billing/plan-metadata")`
- `backend/churvox_plan_consistency.py:177` — `@router.get("/billing/subscription-status")`
- `backend/churvox_plan_consistency.py:190` — `@router.post("/billing/create-checkout-session")`
- `backend/churvox_plan_consistency.py:227` — `@router.post("/billing/confirm-checkout")`
- `backend/ai_operator_routes.py:337` — `@router.get("/ai/actions")`
- `backend/ai_operator_routes.py:343` — `@router.post("/ai/actions")`
- `backend/ai_operator_routes.py:358` — `@router.post("/ai/actions/{action_id}/approve")`
- `backend/ai_operator_routes.py:368` — `@router.post("/ai/actions/{action_id}/decline")`
- `backend/ai_operator_routes.py:376` — `@router.get("/field-activity")`
- `backend/ai_operator_routes.py:382` — `@router.post("/field-activity")`
- `backend/ai_operator_routes.py:388` — `@router.get("/approved-notifications")`
- `backend/churvox_isolation_routes.py:68` — `@router.get("/logic/business-isolation/status")`
- `backend/churvox_isolation_routes.py:90` — `@router.post("/logic/business-isolation/repair")`
- `backend/churvox_isolation_routes.py:112` — `@router.get("/logic/business-records/{kind}")`
- `backend/xero_routes.py:60` — `@router.get("/xero/status")`
- `backend/xero_routes.py:82` — `@router.post("/xero/connect/start")`
- `backend/xero_routes.py:95` — `@router.get("/xero/callback")`
- `backend/xero_routes.py:135` — `@router.post("/xero/disconnect")`
- `backend/xero_routes.py:141` — `@router.post("/xero/settings")`
- `backend/xero_routes.py:150` — `@router.post("/xero/prepare-payroll-handoff")`
- `backend/churvox_create_record_key_fix.py:82` — `@router.post("/clients")`
- `backend/churvox_create_record_key_fix.py:103` — `@router.post("/jobs")`
- `backend/churvox_create_record_key_fix.py:138` — `@router.post("/quotes")`
- `backend/churvox_create_record_key_fix.py:162` — `@router.post("/invoices")`
- `backend/billing_addon_routes.py:47` — `@router.get("/billing/addons")`
- `backend/billing_addon_routes.py:55` — `@router.post("/billing/create-addon-checkout-session")`
- `backend/billing_addon_routes.py:67` — `@router.post("/billing/confirm-addon-checkout")`
- `backend/sitecustomize.py:242` — `@app.get("/api/logic/team-members")`
- `backend/sitecustomize.py:253` — `@app.post("/api/logic/team-members")`
- `backend/sitecustomize.py:368` — `@app.get("/api/billing/addons")`
- `backend/sitecustomize.py:376` — `@app.post("/api/billing/create-addon-checkout-session")`
- `backend/sitecustomize.py:414` — `@app.post("/api/billing/confirm-addon-checkout")`
- `backend/sitecustomize.py:455` — `@app.get("/api/xero/status")`
- `backend/sitecustomize.py:467` — `@app.post("/api/xero/settings")`
- `backend/sitecustomize.py:480` — `@app.post("/api/xero/connect/start")`
- `backend/sitecustomize.py:495` — `@app.get("/api/xero/callback")`
- `backend/sitecustomize.py:510` — `@app.post("/api/xero/disconnect")`
- `backend/churvox_launch_routes.py:135` — `@router.get("/billing/addons")`
- `backend/churvox_launch_routes.py:156` — `@router.post("/billing/create-addon-checkout-session")`
- `backend/churvox_launch_routes.py:211` — `@router.post("/billing/confirm-addon-checkout")`
- `backend/churvox_launch_routes.py:248` — `@router.get("/logic/business-profile")`
- `backend/churvox_launch_routes.py:268` — `@router.post("/logic/business-profile")`
- `backend/churvox_launch_routes.py:310` — `@router.post("/logic/invoice-approval")`
- `backend/churvox_team_roles.py:46` — `@router.get("/logic/team-members")`
- `backend/churvox_team_roles.py:62` — `@router.post("/logic/team-members")`
- `frontend/plugins/health-check/health-endpoints.js:29` — `devServer.app.get("/health", (req, res) => {`
- `frontend/plugins/health-check/health-endpoints.js:85` — `devServer.app.get("/health/simple", (req, res) => {`
- `frontend/plugins/health-check/health-endpoints.js:102` — `devServer.app.get("/health/ready", (req, res) => {`
- `frontend/plugins/health-check/health-endpoints.js:124` — `devServer.app.get("/health/live", (req, res) => {`
- `frontend/plugins/health-check/health-endpoints.js:134` — `devServer.app.get("/health/errors", (req, res) => {`
- `frontend/plugins/health-check/health-endpoints.js:149` — `devServer.app.get("/health/stats", (req, res) => {`
- `backend/server/__init__.py:227` — `app.get(_path)(_handler)`
- `backend/server/__init__.py:230` — `@app.get('/api/smart-hub')`
- `backend/server/__init__.py:231` — `@app.get('/api/smarthub')`
- …and 9 more

### Mounted Express routes

_No matches found._

### Job completion wiring hits

- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:114` — `- Required backend route present: `POST /jobs/{job_id}/complete``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:171` — `- Job/timesheet logic present: _s7_finish_job_flow`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:206` — `9. Start/finish one job; confirm timesheet and invoice slip are prepared.`
- `LAUNCH_DEEP_AUDIT_20260529.md:171` — `5. Worker completes job.`
- `LAUNCH_FINAL_PROOF_20260529.md:66` — `4. Complete/review job and open Work Slip.`
- `STAGE_8_CLIENT_WORKBENCH.md:19` — `- completed jobs needing invoice`
- `STAGE_4_AI_DECISION_ENGINE.md:10` — `- Creates job review slips for completed jobs.`
- `STAGE_4_AI_DECISION_ENGINE.md:11` — `- Creates invoice draft slips for completed jobs without invoices.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:37` — `- [ ] Worker completes job.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:42` — `- [ ] Completed job becomes ready to bill.`
- `backend_test.py:464` — `"unassigned_jobs", "completed_no_invoice", "overdue_invoices",`
- `FINAL_LAUNCH_SMOKE_TEST.md:48` — `- Finish job`
- `FINAL_LAUNCH_SMOKE_TEST.md:49` — `- Expected: job completed`
- `FINAL_LAUNCH_SMOKE_TEST.md:56` — `- Finish active job`
- `FINAL_LAUNCH_SMOKE_TEST.md:82` — `- Worker flow can start/finish job`
- `STAGE_5_JOB_COMPLETION_FLOW.md:4` — `When a job is completed, Churvox automatically prepares the admin.`
- `STAGE_5_JOB_COMPLETION_FLOW.md:8` — `- POST /api/jobs/{job_id}/complete`
- `STAGE_5_JOB_COMPLETION_FLOW.md:9` — `- POST /api/jobs/{job_id}/finish`
- `STAGE_5_JOB_COMPLETION_FLOW.md:10` — `- POST /api/worker/jobs/{job_id}/complete`
- `STAGE_5_JOB_COMPLETION_FLOW.md:11` — `- POST /api/ai/jobs/{job_id}/complete-and-prepare`
- `STAGE_5_JOB_COMPLETION_FLOW.md:13` — `- marks the job completed`
- `STAGE_5_JOB_COMPLETION_FLOW.md:22` — `- Check completed jobs`
- `STAGE_5_JOB_COMPLETION_FLOW.md:26` — `2. Click Check completed jobs.`
- `STAGE_5_JOB_COMPLETION_FLOW.md:27` — `3. Completed jobs should create/update timesheets and owner approval slips.`
- `STAGE_5_JOB_COMPLETION_FLOW.md:28` — `4. Complete a worker job.`
- `test_result.md:62` — `comment: "New top-strip injected at top of Smart Hub (AIControlRoomCompletePage). Pulls /ai-operator/command-snapshot, shows urgent tiles (approvals, unassigned jobs, ready-to-invoice, overdue invoices, quotes, timesheet`
- `test_result.md:68` — `comment: "RE-RUN COMPLETE: Used Pro trial owner (hello@churvox.com) with full app access. Command centre strip FULLY FUNCTIONAL: (1) 'Command centre' heading visible at top of /dashboard, (2) All 8 u`
- `test_result.md:153` — `message: "COMPREHENSIVE FRONTEND VALIDATION COMPLETE (RE-RUN): Used Pro trial owner credentials (hello@churvox.com) with full app access. Previous /plans blocker was NOT a bug - it was the intended o`
- `sitecustomize.py:77` — `events.append(("job_completed", "Worker finished job", f"{worker_name} finished {job_title}."))`
- `CHURVOX_BIG_AUDIT_REPORT.md:56` — `- `frontend/src/concept-c/churvoxWorkerOfflineRuntimePatch.js`: `<button type="button" data-cv-offline-action="job_resume">Resume</button>       <button type="button" data-cv-offline-action="job_complete">Complete</butto`
- `CHURVOX_BIG_AUDIT_REPORT.md:57` — `- `frontend/src/concept-c/churvoxWorkerOfflineRuntimePatch.js`: `<button type="button" data-cv-offline-action="job_complete">Complete</button>       <button type="button" data-cv-offline-action="job_issue">Report issue</`
- `design_guidelines.json:127` — `"Implement Jobs Management with create/edit forms, start/complete flows, job type dropdowns, and recurring/one-off options.",`
- `STAGE_7_CREW_MAP_TIMESHEETS.md:10` — `- Added Finish Active Job endpoints.`
- `STAGE_7_CREW_MAP_TIMESHEETS.md:17` — `- Workers disappear after Finish Job.`
- `STAGE_7_CREW_MAP_TIMESHEETS.md:18` — `- Finish Job links into Stage 5 completion logic where available.`
- `STAGE_7_CREW_MAP_TIMESHEETS.md:28` — `6. Finish job.`
- `backend/churvox_recurring_routes.py:158` — `@router.post("/logic/jobs/{job_id}/complete-recurring")`
- `backend/churvox_recurring_routes.py:159` — `async def complete_and_generate_next(job_id: str, request):`
- `backend/churvox_recurring_routes.py:180` — `await db.jobs.update_one({"_id": job_oid}, {"$set": {"status": "completed", "completed_at": now, "updated_at": now}})`
- `backend/churvox_recurring_routes.py:201` — `completed = await db.jobs.find_one({"_id": job_oid})`
- …and 120 more

### Invoice overdue/payment hits

- `STAGE_8_CLIENT_WORKBENCH.md:18` — `- unpaid total`
- `STAGE_8_CLIENT_WORKBENCH.md:20` — `- overdue invoices`
- `STAGE_8_CLIENT_WORKBENCH.md:33` — `3. Confirm it shows jobs, quotes, invoices and unpaid amount.`
- `STAGE_4_AI_DECISION_ENGINE.md:13` — `- Creates payment reminder slips for unpaid/overdue invoices.`
- `backend_test.py:464` — `"unassigned_jobs", "completed_no_invoice", "overdue_invoices",`
- `FINAL_LAUNCH_SMOKE_TEST.md:62` — `- Expected: jobs, quotes, invoices and unpaid totals show`
- `test_result.md:62` — `comment: "New top-strip injected at top of Smart Hub (AIControlRoomCompletePage). Pulls /ai-operator/command-snapshot, shows urgent tiles (approvals, unassigned jobs, ready-to-invoice, overdue invoices, quotes, timesheet`
- `test_result.md:68` — `comment: "RE-RUN COMPLETE: Used Pro trial owner (hello@churvox.com) with full app access. Command centre strip FULLY FUNCTIONAL: (1) 'Command centre' heading visible at top of /dashboard, (2) All 8 u`
- `backend/server.py:464` — `class InvoiceStatus(str, Enum):`
- `backend/server.py:467` — `PAID = "paid"`
- `backend/server.py:468` — `OVERDUE = "overdue"`
- `backend/server.py:635` — `status: Optional[InvoiceStatus] = None`
- `backend/server.py:2045` — `"status": InvoiceStatus.DRAFT,`
- `backend/server.py:2115` — `{"$set": {"status": InvoiceStatus.SENT, "sent_at": datetime.now(timezone.utc)}}`
- `backend/server.py:2121` — `@api_router.post("/invoices/{invoice_id}/mark-paid")`
- `backend/server.py:2122` — `async def mark_invoice_paid(invoice_id: str, request: Request, current_user: dict = Depends(get_current_user)):`
- `backend/server.py:2126` — `{"$set": {"status": InvoiceStatus.PAID, "paid_at": datetime.now(timezone.utc)}}`
- `backend/server.py:2164` — `{"$match": {"contractor_id": biz_id, "status": InvoiceStatus.PAID, "paid_at": {"$gte": month_start}}},`
- `backend/server.py:2171` — `"contractor_id": biz_id, "status": {"$in": [InvoiceStatus.DRAFT, InvoiceStatus.SENT]}`
- `backend/server.py:2492` — `"""PLACEHOLDER: Receives payment notification from MYOB and marks invoice as paid.`
- `backend/server.py:2506` — `"status": InvoiceStatus.PAID,`
- `backend/server.py:2507` — `"paid_at": datetime.now(timezone.utc),`
- `backend/server.py:2522` — `logger.info(f"[MYOB MOCK] Payment received for {myob_id}, invoice marked paid")`
- `backend/server.py:2666` — `if obj.get("payment_status") == "paid" or event_type == "checkout.session.async_payment_succeeded":`
- `backend/server.py:2969` — `for field in ["completed_at", "started_at", "acknowledged_at", "invoice_id", "paid_at"]:`
- `backend/server.py:3149` — `paid_users = 0`
- `backend/server.py:3155` — `overdue_invoices = 0`
- `backend/server.py:3164` — `"paidUsers": paid_users,`
- `backend/server.py:3170` — `"overdueInvoices": overdue_invoices,`
- `backend/churvox_billing_addon_fix.py:153` — `if getattr(session, "payment_status", None) not in ["paid", "no_payment_required"]:`
- `backend/churvox_billing_addon_fix.py:154` — `return {"success": False, "error": "Stripe checkout is not paid yet"}`
- `backend/churvox_plan_consistency.py:252` — `if getattr(session, "payment_status", None) not in ["paid", "no_payment_required"]:`
- `backend/churvox_plan_consistency.py:253` — `return {"success": False, "error": "Stripe checkout is not paid yet"}`
- `backend/ai_operator_routes.py:182` — `if "paid" in money_action:`
- `backend/ai_operator_routes.py:183` — `update.update({"status": "paid", "paid_at": now})`
- `backend/ai_operator_routes.py:185` — `await _activity(db, business_id, "invoice_paid", "Invoice marked paid", form.get("invoiceRef") or "Invoice paid", "invoice", record_id)`
- `backend/ai_operator_routes.py:186` — `return {"success": True, "message": "Invoice marked paid", "invoice_delivery_method": method, "notifications": notifications}`
- `backend/automation_templates.py:32` — `"invoice_paid": ["invoice.id", "invoice.status", "invoice.total", "invoice.client_id", "actor.id"],`
- `backend/automation_templates.py:33` — `"invoice_overdue": ["invoice.id", "invoice.status", "invoice.total", "invoice.client_id",`
- `backend/automation_templates.py:34` — `"invoice.days_overdue", "invoice.due_date"],`
- …and 140 more

### Quote follow-up hits

- `STAGE_6_APPROVE_SEND_POLISH.md:8` — `- Quote follow-up route now hydrates payload from real quote records.`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:120` — `- Required backend route present: `POST /quotes/{quote_id}/follow-up``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:144` — `- AI decision logic present: quote_follow_up`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:177` — `- Client/quote logic present: CHURVOX_STAGE8_CLIENT_WORKBENCH_START`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:178` — `- Client/quote logic present: CHURVOX_STAGE9_QUOTES_LOGIC_START`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:179` — `- Client/quote logic present: stage8_client_workbench`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:180` — `- Client/quote logic present: stage8_prepare_client_actions`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:181` — `- Client/quote logic present: stage9_send_quote`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:182` — `- Client/quote logic present: stage9_convert_quote_to_job`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:183` — `- Client/quote logic present: stage9_convert_quote_to_invoice`
- `CHURVOX_LAUNCH_SMOKE_CHECK_RESULT.md:24` — `- CHURVOX_STAGE9_QUOTES_LOGIC_START present`
- `LAUNCH_FINAL_PROOF_20260529.md:12` — `- No invoices/quotes are sent automatically.`
- `STAGE_4_AI_DECISION_ENGINE.md:14` — `- Creates quote follow-up slips for open quotes.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:52` — `- [ ] Quote follow-up draft appears when relevant.`
- `backend_test.py:300` — `"quote_followup_auto_send": True,`
- `backend_test.py:316` — `if settings.get("quote_followup_auto_send") != True:`
- `backend_test.py:317` — `results.add_fail("PATCH /ai-auto-send/settings", "quote_followup_auto_send not persisted")`
- `FINAL_LAUNCH_SMOKE_TEST.md:39` — `- Send quote or prepare follow-up`
- `test_result.md:128` — `comment: "New imperative confirmDialog modal helper. Replaced 8 window.confirm calls (QuoteDetail, InvoiceDetail, ClientsPage, ClientDetail, AutomationPage, TeamPage, AppOwnerPage, AccountDeletionPage) and 5 alert() call`
- `STAGE_9_QUOTES_LOGIC.md:4` — `Make quotes flow properly from send/follow-up through accept/decline and conversion.`
- `STAGE_9_QUOTES_LOGIC.md:9` — `- Added quote follow-up:`
- `STAGE_9_QUOTES_LOGIC.md:10` — `- POST /api/quotes/{quote_id}/follow-up`
- `STAGE_9_QUOTES_LOGIC.md:12` — `- POST /api/quotes/{quote_id}/prepare-follow-up`
- `STAGE_9_QUOTES_LOGIC.md:13` — `- POST /api/ai/quotes/{quote_id}/prepare-follow-up`
- `STAGE_9_QUOTES_LOGIC.md:20` — `- Quote send/follow-up uses Settings branding and sends branded PDF.`
- `STAGE_9_QUOTES_LOGIC.md:29` — `4. Prepare quote follow-up and check Command Board.`
- `design_guidelines.json:128` — `"Implement Quotes flow allowing contractors to create quotes with customer name, address, price, notes, and status.",`
- `backend/server.py:458` — `class QuoteStatus(str, Enum):`
- `backend/server.py:614` — `status: Optional[QuoteStatus] = None`
- `backend/server.py:1905` — `"status": QuoteStatus.DRAFT,`
- `backend/server.py:1919` — `async def get_quotes(request: Request, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):`
- `backend/server.py:1959` — `{"$set": {"status": QuoteStatus.SENT, "sent_at": datetime.now(timezone.utc)}}`
- `backend/server.py:2022` — `# Mark quote as accepted and link to job`
- `backend/server.py:2024` — `{"$set": {"status": QuoteStatus.ACCEPTED, "converted_job_id": job_id}}`
- `backend/ai_operator_routes.py:286` — `job_doc = {"title": form.get("conversionJobTitle") or quote.get("job_description") or quote.get("title") or "Job from quote", "job_type": quote.get("job_type", "other"), "customer_name": quote.get("customer_name") or for`
- `backend/ai_operator_routes.py:288` — `await db.quotes.update_one({"_id": oid}, {"$set": {"status": "accepted", "converted_job_id": str(inserted.inserted_id), "updated_at": datetime.now(timezone.utc)}})`
- `backend/ai_operator_routes.py:292` — `if _low(form.get("quoteStatus")) == "sent" or _wants_customer_email(action, form):`
- `backend/ai_operator_routes.py:293` — `await db.quotes.update_one({"_id": oid, "contractor_id": biz_obj}, {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc)}})`
- `backend/ai_operator_routes.py:294` — `await _activity(db, business_id, "quote_sent", "Quote marked sent", form.get("quoteRef") or "Quote sent", "quote", record_id)`
- `backend/ai_operator_routes.py:298` — `return {"success": True, "message": "Quote marked sent", "notifications": notifications}`
- …and 120 more

### Worker acknowledge/assignment hits

- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:61` — `- `frontend/src/concept-c/churvoxAssignWorkerDropdownPatch.js``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:73` — `- `frontend/src/concept-c/churvoxWorkerOfflineRuntimePatch.js``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:86` — `- Core file exists: `frontend/src/pages/WorkerMapCommandPage.jsx``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:138` — `- Required frontend route present: `/worker/jobs``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:140` — `- AI decision logic present: assign_worker`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:174` — `- Crew Map UI includes: Workers currently on active jobs`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:201` — `4. Open an assign worker slip and confirm worker dropdown/reason exists.`
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:209` — `12. Login as worker and confirm they only see worker jobs/support.`
- `LAUNCH_DEEP_AUDIT_20260529.md:171` — `5. Worker completes job.`
- `LAUNCH_DEEP_AUDIT_20260529.md:179` — `13. Owner assigns worker.`
- `LAUNCH_DEEP_AUDIT_20260529.md:180` — `14. Worker offline queue records and syncs actions.`
- `CHURVOX_LAUNCH_SMOKE_CHECK_RESULT.md:35` — `- Frontend route exists: /worker/jobs`
- `LAUNCH_FINAL_PROOF_20260529.md:35` — `- Owner can assign selected worker from linked dispatch panel.`
- `LAUNCH_FINAL_PROOF_20260529.md:44` — `- Worker offline queue expanded to include note, start, pause, resume, complete, issue and photo-note actions.`
- `LAUNCH_FINAL_PROOF_20260529.md:74` — `12. Assign a worker from Dispatch Board.`
- `LAUNCH_FINAL_PROOF_20260529.md:75` — `13. Worker offline action queue records and syncs note/start/complete.`
- `STAGE_4_AI_DECISION_ENGINE.md:9` — `- Suggests worker based on area, active jobs, schedule conflicts and availability.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:30` — `- [ ] Assign worker.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:33` — `## Worker`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:34` — `- [ ] Worker logs in.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:35` — `- [ ] Worker sees assigned job.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:36` — `- [ ] Worker starts job.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:37` — `- [ ] Worker completes job.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:38` — `- [ ] Worker adds notes/photos.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:39` — `- [ ] Worker does not see pricing.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:56` — `- [ ] Worker list loads.`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:58` — `- [ ] Worker detail opens inside Smart Hub drawer.`
- `backend_test.py:467` — `"active_workers", "active_jobs"`
- `FINAL_LAUNCH_SMOKE_TEST.md:46` — `- Assign worker`
- `FINAL_LAUNCH_SMOKE_TEST.md:57` — `- Expected: worker disappears from active map`
- `FINAL_LAUNCH_SMOKE_TEST.md:72` — `### 10. Worker role`
- `FINAL_LAUNCH_SMOKE_TEST.md:73` — `- Login as worker`
- `FINAL_LAUNCH_SMOKE_TEST.md:74` — `- Expected: worker sees worker jobs/support only`
- `FINAL_LAUNCH_SMOKE_TEST.md:75` — `- Expected: worker cannot access invoices, quotes, clients, team, settings, plans`
- `FINAL_LAUNCH_SMOKE_TEST.md:82` — `- Worker flow can start/finish job`
- `STAGE_5_JOB_COMPLETION_FLOW.md:10` — `- POST /api/worker/jobs/{job_id}/complete`
- `STAGE_5_JOB_COMPLETION_FLOW.md:28` — `4. Complete a worker job.`
- `SAFE_CLEANUP_OLD_JUNK_REPORT.md:14` — `- `frontend/src/concept-c/churvoxAssignWorkerDropdownPatch.js``
- `SAFE_CLEANUP_OLD_JUNK_REPORT.md:26` — `- `frontend/src/concept-c/churvoxWorkerOfflineRuntimePatch.js``
- `sitecustomize.py:13` — `acknowledged = True`
- …and 140 more

### Auth/business isolation hits

- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:45` — `- `GET /business/invoice-branding``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:46` — `- `PATCH /business/invoice-branding``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:47` — `- `POST /business/logo-upload``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:48` — `- `DELETE /business/logo-upload``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:109` — `- Required backend route present: `GET /business/invoice-branding``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:110` — `- Required backend route present: `PATCH /business/invoice-branding``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:111` — `- Required backend route present: `POST /business/logo-upload``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:112` — `- Required backend route present: `GET /business/settings-health``
- `LAUNCH_DEEP_AUDIT_20260529.md:81` — `- `/dispatch-board` requires business access.`
- `LAUNCH_DEEP_AUDIT_20260529.md:82` — `- `/message-approvals` requires business access.`
- `LAUNCH_DEEP_AUDIT_20260529.md:83` — `- `/trade-presets` requires business access.`
- `LAUNCH_FINAL_PROOF_20260529.md:57` — `- Internal pages are guarded behind auth/business routes.`
- `backend_test.py:88` — `"business_name": "Test Business"`
- `backend_test.py:377` — `# Check MYOB (should be not ready for fresh business)`
- `backend_test.py:381` — `results.add_warning("GET /ai-operator/setup-status (MYOB)", "MYOB unexpectedly ready for fresh business")`
- `backend_test.py:414` — `results.add_pass("GET /ai-operator/audit-log", f"Retrieved {len(logs)} logs (empty is OK for fresh business)")`
- `test_result.md:4` — `Finish Churvox as a powerful AI command centre for trade/service businesses. AI prepares actions across the whole business, owner approves them (or auto-runs/auto-sends within explicit settings). Smart Hub is the command`
- `test_result.md:34` — `comment: "Fixed ObjectId serialization bug in both PATCH endpoints. All endpoints now working correctly: GET /ai-operator/setup-status returns proper SMS/MYOB/AI readiness (SMS ready=true with CLICKSEND_API_KEY set, MYOB`
- `test_result.md:65` — `comment: "CRITICAL BLOCKER: Registration endpoint (POST /api/auth/register) creates user but does NOT create associated business record. Without a business record, users cannot access any routes - they get stuck on /plan`
- `test_result.md:83` — `comment: "Could not test due to registration/business creation blocker. Requires working owner account with business + plan to access route."`
- `test_result.md:101` — `comment: "Could not test due to registration/business creation blocker. Requires working owner account with business + plan to access route."`
- `test_result.md:104` — `comment: "FULLY FUNCTIONAL: (1) Heading 'AI Operator' present, (2) All 4 tabs working (Operator mode, Auto-send categories, Setup status, Audit log), (3) Operator mode tab: three mode cards visible (Approval-first, Auto-`
- `test_result.md:151` — `message: "Frontend testing BLOCKED by critical registration bug. POST /api/auth/register creates user but does NOT create business record. Without business, users cannot access any routes (stuck on /plans page). Attempte`
- `sitecustomize.py:46` — `business_raw = _pick(job.get("business_id"), job.get("contractor_id"))`
- `sitecustomize.py:50` — `return {"business_id": _string_id(business_raw), "contractor_id": contractor_raw, "event_type": event_type, "title": title, "detail": detail, "record_type": "job", "record_id": _string_id(job.get("_id") or job.get("id"))`
- `STAGE_10_SUPPORT_ROLES.md:15` — `- Owners/admin can see business support requests.`
- `README.md:3` — `Churvox is an AI Operator command desk for trade and service businesses.`
- `README.md:11` — `This repo now includes the 10 requested business upgrades:`
- `README.md:33` — `- /settings — Business settings`
- `STAGE_3_SETTINGS_LOGIC.md:8` — `- GET /api/business/invoice-branding`
- `STAGE_3_SETTINGS_LOGIC.md:9` — `- PATCH /api/business/invoice-branding`
- `STAGE_3_SETTINGS_LOGIC.md:10` — `- POST /api/business/logo-upload`
- `STAGE_3_SETTINGS_LOGIC.md:11` — `- DELETE /api/business/logo-upload`
- `STAGE_3_SETTINGS_LOGIC.md:12` — `- GET /api/business/settings-health`
- `STAGE_3_SETTINGS_LOGIC.md:13` — `- Uploaded logo is stored against the business.`
- `STAGE_3_SETTINGS_LOGIC.md:14` — `- PDF/email sender reads business document settings.`
- `STAGE_3_SETTINGS_LOGIC.md:21` — `2. Add business name, logo, bank details or payment link.`
- `LAUNCH_DUPLICATE_AUDIT_20260529.md:24` — `- `/dispatch-board` requires business app access.`
- `LAUNCH_DUPLICATE_AUDIT_20260529.md:25` — `- `/message-approvals` requires business app access.`
- `LAUNCH_DUPLICATE_AUDIT_20260529.md:26` — `- `/trade-presets` requires business app access.`
- `backend/churvox_recurring_routes.py:106` — `business_id = str(user.get("business_id") or user.get("id"))`
- `backend/churvox_recurring_routes.py:107` — `biz_oid = _obj(business_id)`
- `backend/churvox_recurring_routes.py:116` — `"business_id": business_id,`
- `backend/churvox_recurring_routes.py:139` — `query = {"_id": job_oid, "$or": [{"business_id": business_id}]}`
- `backend/churvox_recurring_routes.py:168` — `business_id = str(user.get("business_id") or user.get("id"))`
- `backend/churvox_recurring_routes.py:169` — `biz_oid = _obj(business_id)`
- `backend/churvox_recurring_routes.py:173` — `query = {"_id": job_oid, "$or": [{"business_id": business_id}]}`
- `backend/server.py:153` — `# BUSINESS ISOLATION HELPERS`
- `backend/server.py:163` — `async def get_user_business_id(user: dict):`
- `backend/server.py:165` — `Always return the OWNER business id.`
- `backend/server.py:167` — `Worker/sub-user: parent business_id`
- `backend/server.py:172` — `raw_business_id = user.get("business_id")`
- `backend/server.py:175` — `if raw_business_id:`
- `backend/server.py:176` — `return str(raw_business_id)`
- `backend/server.py:180` — `raise HTTPException(status_code=401, detail="User business not found")`
- `backend/server.py:182` — `def business_filter(business_id: str, extra: dict | None = None):`
- `backend/server.py:183` — `query = {"business_id": str(business_id)}`
- `backend/server.py:188` — `def ensure_same_business_or_404(doc: dict | None, business_id: str):`
- `backend/server.py:191` — `if str(doc.get("business_id", "")) != str(business_id):`
- `backend/server.py:195` — `async def create_with_business(collection, payload: dict, business_id: str):`
- …and 20 more

### CSV/import/export hits

- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:36` — `- `GET /automation/templates``
- `LAUNCH_DEEP_AUDIT_20260529.md:18` — `- Duplicate index.js side-effect imports`
- `LAUNCH_DEEP_AUDIT_20260529.md:37` — `### Duplicate imports/routes`
- `LAUNCH_DEEP_AUDIT_20260529.md:52` — `- Removed old patch import.`
- `LAUNCH_DEEP_AUDIT_20260529.md:85` — `### Customer-facing document templates`
- `test_churvox_validation.py:7` — `import asyncio`
- `test_churvox_validation.py:8` — `from playwright.async_api import async_playwright`
- `LAUNCH_FINAL_PROOF_20260529.md:52` — `7. Public document templates`
- `LAUNCH_FINAL_PROOF_20260529.md:53` — `- Public invoice template renders line items, quantity, rate, subtotal, GST, total, payment notes and customer notes.`
- `LAUNCH_FINAL_PROOF_20260529.md:54` — `- Public quote template renders line items, quantity, rate, subtotal, quote total, notes and validity.`
- `backend_test.py:7` — `import requests`
- `backend_test.py:8` — `import json`
- `backend_test.py:9` — `import os`
- `backend_test.py:10` — `from datetime import datetime`
- `test_result.md:128` — `comment: "New imperative confirmDialog modal helper. Replaced 8 window.confirm calls (QuoteDetail, InvoiceDetail, ClientsPage, ClientDetail, AutomationPage, TeamPage, AppOwnerPage, AccountDeletionPage) and 5 alert() call`
- `sitecustomize.py:2` — `import builtins`
- `sitecustomize.py:3` — `from fastapi import Body`
- `sitecustomize.py:9` — `from datetime import datetime, timezone`
- `sitecustomize.py:10` — `from pymongo.errors import DuplicateKeyError`
- `sitecustomize.py:98` — `from motor.motor_asyncio import AsyncIOMotorCollection`
- `sitecustomize.py:126` — `import importlib`
- `sitecustomize.py:127` — `import importlib.abc`
- `sitecustomize.py:128` — `import importlib.machinery`
- `sitecustomize.py:129` — `import logging`
- `sitecustomize.py:130` — `import sys`
- `sitecustomize.py:134` — `def _import_route_module(name):`
- `sitecustomize.py:136` — `return importlib.import_module(f"backend.{name}")`
- `sitecustomize.py:138` — `return importlib.import_module(name)`
- `sitecustomize.py:151` — `_import_route_module(route_name).install(*args)`
- `sitecustomize.py:155` — `class _ChurvoxLoader(importlib.abc.Loader):`
- `sitecustomize.py:163` — `class _ChurvoxFinder(importlib.abc.MetaPathFinder):`
- `sitecustomize.py:166` — `spec = importlib.machinery.PathFinder.find_spec(fullname, path)`
- `CHURVOX_BIG_AUDIT_REPORT.md:30` — `- `GET /automation/templates``
- `force_owner_fix.py:1` — `import os`
- `force_owner_fix.py:2` — `from urllib.parse import urlparse`
- `force_owner_fix.py:3` — `from datetime import datetime, timezone`
- `force_owner_fix.py:30` — `from pymongo import MongoClient`
- `force_owner_fix.py:36` — `import bcrypt`
- `LAUNCH_DUPLICATE_AUDIT_20260529.md:7` — `### 1. `frontend/src/index.js` imports`
- `LAUNCH_DUPLICATE_AUDIT_20260529.md:10` — `- No duplicate side-effect imports were visible.`
- …and 140 more

### Stripe/plan/payment hits

- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:18` — `- `POST /stripe/create-checkout-session``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:28` — `- `POST /billing/confirm-checkout``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:29` — `- `POST /billing/webhook``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:39` — `- `POST /billing/unified-checkout``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:40` — `- `POST /billing/create-checkout``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:41` — `- `POST /billing/addons/checkout``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:42` — `- `POST /billing/sms-checkout``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:59` — `- `frontend/src/concept-c/churvoxPlansNavPatch.js``
- `CHURVOX_STAGE_11_FINAL_LAUNCH_AUDIT.md:65` — `- `frontend/src/concept-c/churvoxFourteenDayTrialPlansPatch.js``
- `LAUNCH_DEEP_AUDIT_20260529.md:27` — `- In-app Plans SMS block prices`
- `LAUNCH_DEEP_AUDIT_20260529.md:167` — `1. Public pricing page shows all plan prices and SMS blocks.`
- `LAUNCH_DEEP_AUDIT_20260529.md:168` — `2. In-app Plans page shows all plan prices and SMS blocks.`
- `test_churvox_validation.py:39` — `elif "/plans" in current_url:`
- `test_churvox_validation.py:40` — `print(f"❌ FAIL: User stuck on /plans page")`
- `test_churvox_validation.py:56` — `has_run_button = await page.query_selector('text="Run AI Plan"')`
- `test_churvox_validation.py:59` — `print(f"  Run AI Plan button: {has_run_button is not None}")`
- `test_churvox_validation.py:64` — `print(f"  ✅ Run AI Plan clicked")`
- `test_churvox_validation.py:229` — `"/plans", "/settings"]`
- `CHURVOX_LAUNCH_TEST_CHECKLIST.md:6` — `- [ ] User can start/select plan or trial.`
- `FINAL_LAUNCH_SMOKE_TEST.md:75` — `- Expected: worker cannot access invoices, quotes, clients, team, settings, plans`
- `test_result.md:62` — `comment: "New top-strip injected at top of Smart Hub (AIControlRoomCompletePage). Pulls /ai-operator/command-snapshot, shows urgent tiles (approvals, unassigned jobs, ready-to-invoice, overdue invoices, quotes, timesheet`
- `test_result.md:65` — `comment: "CRITICAL BLOCKER: Registration endpoint (POST /api/auth/register) creates user but does NOT create associated business record. Without a business record, users cannot access any routes - they get stuck on /plan`
- `test_result.md:68` — `comment: "RE-RUN COMPLETE: Used Pro trial owner (hello@churvox.com) with full app access. Command centre strip FULLY FUNCTIONAL: (1) 'Command centre' heading visible at top of /dashboard, (2) All 8 u`
- `test_result.md:83` — `comment: "Could not test due to registration/business creation blocker. Requires working owner account with business + plan to access route."`
- `test_result.md:101` — `comment: "Could not test due to registration/business creation blocker. Requires working owner account with business + plan to access route."`
- `test_result.md:136` — `## test_plan`
- `test_result.md:151` — `message: "Frontend testing BLOCKED by critical registration bug. POST /api/auth/register creates user but does NOT create business record. Without business, users cannot access any routes (stuck on /plans page). Attempte`
- `test_result.md:153` — `message: "COMPREHENSIVE FRONTEND VALIDATION COMPLETE (RE-RUN): Used Pro trial owner credentials (hello@churvox.com) with full app access. Previous /plans blocker was NOT a bug - it was the intended o`
- `SAFE_CLEANUP_OLD_JUNK_REPORT.md:12` — `- `frontend/src/concept-c/churvoxPlansNavPatch.js``
- `SAFE_CLEANUP_OLD_JUNK_REPORT.md:18` — `- `frontend/src/concept-c/churvoxFourteenDayTrialPlansPatch.js``
- `README.md:35` — `- /plans — Pricing and plan control`
- `CHURVOX_BIG_AUDIT_REPORT.md:14` — `- `POST /stripe/create-checkout-session``
- `CHURVOX_BIG_AUDIT_REPORT.md:22` — `- `POST /billing/confirm-checkout``
- `CHURVOX_BIG_AUDIT_REPORT.md:23` — `- `POST /billing/webhook``
- `CHURVOX_BIG_AUDIT_REPORT.md:33` — `- `POST /billing/unified-checkout``
- `CHURVOX_BIG_AUDIT_REPORT.md:34` — `- `POST /billing/create-checkout``
- `CHURVOX_BIG_AUDIT_REPORT.md:35` — `- `POST /billing/addons/checkout``
- `CHURVOX_BIG_AUDIT_REPORT.md:36` — `- `POST /billing/sms-checkout``
- `CHURVOX_BIG_AUDIT_REPORT.md:115` — `- Route/nav appears wired: Plans `/plans``
- `CHURVOX_BIG_AUDIT_REPORT.md:120` — `- Plans page route appears in App.js.`
- …and 140 more

### MYOB/Xero hits

- `LAUNCH_DEEP_AUDIT_20260529.md:104` — `- MYOB add-on for Operator — $39/month + GST`
- `LAUNCH_FINAL_PROOF_20260529.md:82` — `- MYOB/Xero integrations remain locked until approval and production scopes are ready.`
- `backend_test.py:347` — `myob = data.get("myob", {})`
- `backend_test.py:357` — `# Verify MYOB structure`
- `backend_test.py:358` — `required_myob_fields = ["ready", "credentials_present", "connected", "blocked_reason"]`
- `backend_test.py:359` — `missing_myob = [f for f in required_myob_fields if f not in myob]`
- `backend_test.py:360` — `if missing_myob:`
- `backend_test.py:361` — `results.add_fail("GET /ai-operator/setup-status", f"MYOB missing fields: {missing_myob}")`
- `backend_test.py:377` — `# Check MYOB (should be not ready for fresh business)`
- `backend_test.py:378` — `if myob.get("ready") == False:`
- `backend_test.py:379` — `results.add_pass("GET /ai-operator/setup-status (MYOB)", f"MYOB correctly not ready: {myob.get('blocked_reason')}")`
- `backend_test.py:381` — `results.add_warning("GET /ai-operator/setup-status (MYOB)", "MYOB unexpectedly ready for fresh business")`
- `backend_test.py:466` — `"low_sms_credits", "sms_credits", "myob_connected",`
- `test_result.md:4` — `Finish Churvox as a powerful AI command centre for trade/service businesses. AI prepares actions across the whole business, owner approves them (or auto-runs/auto-sends within explicit settings). Smart Hub is the command`
- `test_result.md:15` — `- MYOB and SMS must remain disabled (clearly) until credentials provided.`
- `test_result.md:28` — `comment: "Added GET /ai-operator/setup-status (SMS/MYOB/AI readiness), GET /ai-operator/audit-log (paginated logs), GET /ai-operator/command-snapshot (combined urgent+approvals+next_best_move). Fixed broken double-/api/ `
- `test_result.md:34` — `comment: "Fixed ObjectId serialization bug in both PATCH endpoints. All endpoints now working correctly: GET /ai-operator/setup-status returns proper SMS/MYOB/AI readiness (SMS ready=true with CLICKSEND_API_KEY set, MYOB`
- `test_result.md:62` — `comment: "New top-strip injected at top of Smart Hub (AIControlRoomCompletePage). Pulls /ai-operator/command-snapshot, shows urgent tiles (approvals, unassigned jobs, ready-to-invoice, overdue invoices, quotes, timesheet`
- `test_result.md:68` — `comment: "RE-RUN COMPLETE: Used Pro trial owner (hello@churvox.com) with full app access. Command centre strip FULLY FUNCTIONAL: (1) 'Command centre' heading visible at top of /dashboard, (2) All 8 u`
- `test_result.md:98` — `comment: "New page at /ai-operator/settings. Three modes (approval_first | auto_safe | auto_send), quiet hours, max msgs/client/day, first-message-approval, owner notify. Auto-send categories tab (master + 7 per-category`
- `test_result.md:104` — `comment: "FULLY FUNCTIONAL: (1) Heading 'AI Operator' present, (2) All 4 tabs working (Operator mode, Auto-send categories, Setup status, Audit log), (3) Operator mode tab: three mode cards visible (Approval-first, Auto-`
- `test_result.md:147` — `message: "Completed deep finish pass: (1) Section 2 blockers fixed and verified. (2) New AI Operator approvals queue + settings pages with Mode 1/2/3, quiet hours, per-category auto-send, audit log, setup-required gates `
- `test_result.md:149` — `message: "Backend testing complete. Found and fixed critical ObjectId serialization bug in PATCH /ai-operator/settings and PATCH /ai-auto-send/settings (both were returning 500 errors). Applied serialize_doc() to both en`
- `test_result.md:153` — `message: "COMPREHENSIVE FRONTEND VALIDATION COMPLETE (RE-RUN): Used Pro trial owner credentials (hello@churvox.com) with full app access. Previous /plans blocker was NOT a bug - it was the intended o`
- `QA_SMART_HUB_BUTTON_REPORT.md:32` — `- No direct production SMS/email/payment/MYOB mutations are triggered by tests.`
- `sitecustomize.py:149` — `for route_name, args in [("ai_operator_routes", (app, db, get_current_user, require_employer)), ("billing_addon_routes", (app, db, get_current_user)), ("xero_routes", (app, db, get_current_user))]:`
- `backend/server.py:352` — `"xero_addon": "XERO_ADDON",`
- `backend/server.py:353` — `"xero": "XERO_ADDON",`
- `backend/server.py:471` — `class MyobSyncStatus(str, Enum):`
- `backend/server.py:486` — `"sms": False, "myob": False, "team": False,`
- `backend/server.py:491` — `"sms": True, "myob": False, "team": True,`
- `backend/server.py:496` — `"sms": True, "myob": True, "team": True,`
- `backend/server.py:501` — `"sms": True, "myob": True, "team": True,`
- `backend/server.py:664` — `class MyobSettingsUpdate(BaseModel):`
- `backend/server.py:2047` — `"myob_sync_status": MyobSyncStatus.NOT_SYNCED,`
- `backend/server.py:2048` — `"myob_id": None,`
- `backend/server.py:2049` — `"myob_last_sync": None,`
- `backend/server.py:2050` — `"myob_error": None,`
- `backend/server.py:2398` — `# ===================== MYOB INTEGRATION =====================`
- `backend/server.py:2399` — `@api_router.get("/myob/settings")`
- …and 80 more

## Recommended build order

### Step 1 — Backend Command model
- Add `CommandSlip` model/schema.
- Include `businessId`, `sourceType`, `sourceId`, `actionType`, `payload`, `status`, `urgency`, `audit`.

### Step 2 — Backend Command routes
- Add list, scan, approve, edit, snooze, ignore and events endpoints.
- Every route must require auth and filter by business.

### Step 3 — Source scanners
- Jobs scanner: completed/no invoice, extra notes/photos.
- Invoices scanner: overdue/unpaid.
- Quotes scanner: sent/no reply.
- Workers scanner: not acknowledged.
- Setup scanner: missing invoice/business/GST/accounting settings.

### Step 4 — Frontend Command API
- Replace localStorage read/write with backend calls.
- Keep localStorage only as demo fallback.

### Step 5 — Action execution
- Approval must either perform the real action or create a safe pending action.
- Edit must update the payload before approval.
- Snooze must reappear after `snoozeUntil`.

### Step 6 — End-to-end test
- Create client → job → complete → invoice slip appears.
- Mark invoice overdue → payment reminder slip appears.
- Send quote → wait/force stale → quote follow-up slip appears.
- Assign worker → not acknowledged → worker reminder slip appears.
