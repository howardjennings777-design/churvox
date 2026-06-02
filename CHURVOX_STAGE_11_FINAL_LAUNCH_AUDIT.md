# CHURVOX STAGE 11 FINAL LAUNCH AUDIT

This is a static launch-readiness audit. It checks code, routes, build, core logic and launch flow wiring.

## Result

- HIGH launch blockers: 0
- Warnings / review items: 2
- Passed checks: 114

## HIGH launch blockers

None found by this audit.

## Warnings / review items

1. Duplicate backend routes exist in code, but runtime route de-dupe is present. Review later:
- `POST /stripe/create-checkout-session`
- `POST /ai-operator/actions/{action_id}/approve`
- `POST /ai-operator/actions/{action_id}/reject`
- `PATCH /ai-operator/actions/{action_id}`
- `GET /ai-operator/actions`
- `POST /quotes/{quote_id}/send`
- `POST /quotes/{quote_id}/accept`
- `POST /quotes/{quote_id}/decline`
- `POST /jobs/{job_id}/create-draft-invoice`
- `POST /jobs/{job_id}/pause`
- `POST /billing/confirm-checkout`
- `POST /billing/webhook`
- `GET /automation/rules`
- `POST /automation/rules`
- `PUT /automation/rules/{rule_id}`
- `DELETE /automation/rules/{rule_id}`
- `POST /automation/rules/{rule_id}/toggle`
- `GET /automation/runs`
- `GET /automation/templates`
- `PATCH /automation/rules/{rule_id}`
- `GET /proof-packs`
- `POST /billing/unified-checkout`
- `POST /billing/create-checkout`
- `POST /billing/addons/checkout`
- `POST /billing/sms-checkout`
- `GET /ai/operator/slips`
- `POST /ai/operator/rebuild-slips`
- `GET /business/invoice-branding`
- `PATCH /business/invoice-branding`
- `POST /business/logo-upload`
- `DELETE /business/logo-upload`
- `POST /ai/operator/actions/{action_id}/approve-send-final`
- `POST /quotes/{quote_id}/convert-to-job`

2. Old backup/runtime patch files still exist. They may not be routed, but should be cleaned after launch:
- `frontend/src/pages/DashboardPage.backup-2026-05-02.js`
- `frontend/src/pages/DashboardPage.backup.js`
- `frontend/src/pages/DashboardPage.backup-smart-hub-brain-2026-05-02.js`
- `frontend/src/pages/SmartHubBrainPage.backup-2026-05-02.js`
- `frontend/src/concept-c/churvoxCommandFloorControlCopyPatch.js`
- `frontend/src/concept-c/churvoxNoWhiteCommandCardsRuntimePatch.js`
- `frontend/src/concept-c/churvoxPlansNavPatch.js`
- `frontend/src/concept-c/churvoxTopTierRuntimePatch.js`
- `frontend/src/concept-c/churvoxAssignWorkerDropdownPatch.js`
- `frontend/src/concept-c/churvoxWorkSlipMoneyDeskPatch.js`
- `frontend/src/concept-c/churvoxMoneyDeskLinkedJobFilterPatch.js`
- `frontend/src/concept-c/churvoxInvoiceJobContextPatch.js`
- `frontend/src/concept-c/churvoxFourteenDayTrialPlansPatch.js`
- `frontend/src/concept-c/churvoxLaunchNavRuntimePatch.js`
- `frontend/src/concept-c/churvoxWorkSlipDispatchPatch.js`
- `frontend/src/concept-c/churvoxWorkSlipDraftInvoicePatch.js`
- `frontend/src/concept-c/churvoxCrewMapNavPatch.js`
- `frontend/src/concept-c/churvoxActivePresetJobRuntimePatch.js`
- `frontend/src/concept-c/churvoxWorkSlipMessageApprovalPatch.js`
- `frontend/src/concept-c/churvoxMoneyDeskJobContextPatch.js`
- `frontend/src/concept-c/churvoxWorkerOfflineRuntimePatch.js`
- `backend/proof_pack_autoregister.py`
- `backend/ai_command_autoregister.py`

## Passed checks

- Backend Python syntax passes.
- Frontend production build passes.
- Core file exists: `backend/server.py`
- Core file exists: `frontend/src/App.js`
- Core file exists: `frontend/src/pages/CommandDeskQueuePage.jsx`
- Core file exists: `frontend/src/pages/SettingsCommandPage.jsx`
- Core file exists: `frontend/src/pages/SupportCommandPage.jsx`
- Core file exists: `frontend/src/pages/WorkerMapCommandPage.jsx`
- Core file exists: `frontend/src/pages/ClientWorkbenchCommandPage.jsx`
- Launch nav label present: Command Board
- Launch nav label present: Jobs
- Launch nav label present: Crew Map
- Launch nav label present: Clients
- Launch nav label present: Quotes
- Launch nav label present: Invoices
- Launch nav label present: Team
- Launch nav label present: Settings
- Launch nav label present: Support
- Confusing nav hidden from normal nav: AI Operator
- Confusing nav hidden from normal nav: Launch Ops
- Confusing nav hidden from normal nav: Proof Demo
- Confusing nav hidden from normal nav: Money Desk
- Confusing nav hidden from normal nav: Automation
- Confusing nav hidden from normal nav: Reports
- Confusing nav hidden from normal nav: Backup
- Confusing nav hidden from normal nav: Demo Mode
- Confusing nav hidden from normal nav: Polish Checklist
- Required backend route present: `GET /ai/operator/slips`
- Required backend route present: `POST /ai/operator/rebuild-slips`
- Required backend route present: `POST /ai/operator/actions/{action_id}/approve-send-final`
- Required backend route present: `GET /business/invoice-branding`
- Required backend route present: `PATCH /business/invoice-branding`
- Required backend route present: `POST /business/logo-upload`
- Required backend route present: `GET /business/settings-health`
- Required backend route present: `POST /jobs/{job_id}/start`
- Required backend route present: `POST /jobs/{job_id}/complete`
- Required backend route present: `GET /crew-map/active`
- Required backend route present: `GET /timesheets/summary`
- Required backend route present: `GET /clients/{client_id}/workbench`
- Required backend route present: `POST /clients/{client_id}/prepare-actions`
- Required backend route present: `POST /quotes/{quote_id}/send`
- Required backend route present: `POST /quotes/{quote_id}/follow-up`
- Required backend route present: `POST /quotes/{quote_id}/accept`
- Required backend route present: `POST /quotes/{quote_id}/decline`
- Required backend route present: `POST /quotes/{quote_id}/convert-to-job`
- Required backend route present: `POST /quotes/{quote_id}/convert-to-invoice`
- Required backend route present: `POST /support/messages`
- Required backend route present: `GET /support/messages`
- Required backend route present: `GET /roles/access-matrix`
- Required frontend route present: `/dashboard`
- Required frontend route present: `/jobs`
- Required frontend route present: `/crew-map`
- Required frontend route present: `/clients`
- Required frontend route present: `/clients/:clientId/workbench`
- Required frontend route present: `/quotes`
- Required frontend route present: `/invoices`
- Required frontend route present: `/team`
- Required frontend route present: `/settings`
- Required frontend route present: `/support`
- Required frontend route present: `/worker/jobs`
- AI decision logic present: CHURVOX_STAGE4_AI_DECISION_ENGINE_START
- AI decision logic present: assign_worker
- AI decision logic present: create_invoice_draft
- AI decision logic present: send_invoice
- AI decision logic present: invoice_reminder
- AI decision logic present: quote_follow_up
- AI decision logic present: job_review
- Command Board UI includes: Why Churvox suggests this
- Command Board UI includes: what_will_happen
- Command Board UI includes: source_records
- Command Board UI includes: approve-send-final
- Command Board UI includes: Today Churvox found
- Approval slip closes and refreshes after success.
- Frontend checks backend app-level success before closing.
- Document/settings backend logic present: CHURVOX_STAGE3_SETTINGS_LOGIC_START
- Document/settings backend logic present: _stage3_send_customer_email
- Document/settings backend logic present: _stage3_pdf_bytes
- Document/settings backend logic present: application/pdf
- Document/settings backend logic present: Attachments
- Document/settings backend logic present: payment_url
- Document/settings backend logic present: bank_account_number
- Document/settings backend logic present: logo_base64
- Settings UI includes: Upload logo
- Settings UI includes: payment_url
- Settings UI includes: bank_account_number
- Settings UI includes: PDF preview
- Settings UI includes: Setup health
- Pillow dependency exists for PDF rendering.
- Job/timesheet logic present: CHURVOX_STAGE5_JOB_COMPLETION_FLOW_START
- Job/timesheet logic present: CHURVOX_STAGE7_CREW_MAP_TIMESHEETS_START
- Job/timesheet logic present: _s5_upsert_timesheet
- Job/timesheet logic present: _s7_start_job_flow
- Job/timesheet logic present: _s7_finish_job_flow
- Job/timesheet logic present: stage7_active_crew_map
- Crew Map UI includes: Active jobs only
- Crew Map UI includes: Workers currently on active jobs
- Crew Map UI includes: /crew-map/active
- Crew Map UI includes: /timesheets/summary
- Client/quote logic present: CHURVOX_STAGE8_CLIENT_WORKBENCH_START
- Client/quote logic present: CHURVOX_STAGE9_QUOTES_LOGIC_START
- Client/quote logic present: stage8_client_workbench
- Client/quote logic present: stage8_prepare_client_actions
- Client/quote logic present: stage9_send_quote
- Client/quote logic present: stage9_convert_quote_to_job
- Client/quote logic present: stage9_convert_quote_to_invoice
- Support/role backend logic present: CHURVOX_STAGE10_SUPPORT_ROLES_START
- Support/role backend logic present: stage10_create_support_message
- Support/role backend logic present: stage10_list_support_messages
- Support/role backend logic present: stage10_role_access_matrix
- Support/role backend logic present: stage10_role_audit
- Support UI includes: Send support request
- Support UI includes: Ticket history
- Support UI includes: /support/messages
- Support UI includes: /roles/access-matrix

## Manual launch smoke test

Do this after Render deploy:

1. Login as owner.
2. Open Command Board.
3. Click Clear old slips + rebuild.
4. Open an assign worker slip and confirm worker dropdown/reason exists.
5. Open invoice slip and confirm job/client/description/email/total are filled.
6. Approve + send invoice and confirm PDF email arrives.
7. Open Settings, upload logo, save payment details.
8. Open Crew Map; confirm it only shows active jobs.
9. Start/finish one job; confirm timesheet and invoice slip are prepared.
10. Open client workbench URL and prepare client actions.
11. Send a Support request and refresh ticket history.
12. Login as worker and confirm they only see worker jobs/support.
