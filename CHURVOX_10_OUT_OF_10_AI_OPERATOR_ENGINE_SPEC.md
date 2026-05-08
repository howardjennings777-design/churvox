# Churvox 10/10 AI Operator Engine — Deep Wiring Spec

## Core direction

Churvox must become an AI-run command centre for trade and service business owners.

The owner should not have to hunt through pages, remember follow-ups, manually work out assignments, chase invoices, or connect job events to admin tasks. Churvox should detect what needs doing, prepare the action, explain why, and ask the owner to approve.

The product promise:

> Churvox prepares the admin. The owner approves. AI runs the daily business flow.

This is not a visual-only task. This is a full app wiring pass across frontend, backend, roles, notifications, automations, and data flows.

---

## Non-negotiable product rules

1. Keep the owner approval-first model.
2. AI can prepare actions, but must not auto-send customer messages, change pricing, alter payroll, delete records, charge customers, or sync accounting changes without explicit approval.
3. Every important card, row, or alert opens an in-page modal/sheet, not a full-page redirect, unless the user taps a separate explicit “Open page” action.
4. Every module must use the same premium light theme and AI Command Centre visual language.
5. Every action must go to the correct record and correct page context.
6. Role permissions must be respected across every AI suggestion and every page.
7. Business isolation must be preserved on every backend query and AI action.
8. Workers must not see owner-only pricing, GPS verification details, billing, MYOB, payroll, or admin-only insights.
9. Payroll only sees payroll/time/pay-period data.
10. AI must explain why it recommends an action before the owner approves it.

---

## Global AI Operator engine

Build/verify a central AI Operator layer that can read business state and create prepared actions.

### AI Operator action object

Every AI action should have:

- id
- business_id
- action_type
- module
- title
- summary
- reason
- confidence
- risk_level
- status: pending, approved, rejected, completed, failed
- target_record_type
- target_record_id
- suggested_payload
- preview_text
- created_by_ai
- approved_by
- approved_at
- executed_at
- failure_reason
- deep_link
- modal_payload
- audit_log

### Action types

Support these action types first:

- assign_worker_to_job
- create_invoice_draft
- create_quote_followup
- create_invoice_reminder
- request_job_proof_review
- flag_schedule_conflict
- flag_overdue_job
- prepare_customer_message
- prepare_owner_note
- prepare_payroll_review
- suggest_automation_rule
- create_client_followup
- convert_quote_to_job
- mark_admin_task_ready

### AI approval queue

Smart Hub must display pending AI actions first. Owner can:

- View details in modal
- Approve
- Edit then approve
- Reject
- Open related record
- Mark as done if already handled

Approval should call real backend endpoints and execute the action.

---

## Smart Hub / AI Command Centre

Smart Hub must become the owner’s daily operating cockpit.

### Must show

- AI Operator status
- Today’s prepared actions
- Owner approval queue
- Jobs needing crew
- Money waiting
- Quote follow-ups
- Invoice reminders
- Proofs pending
- Schedule conflicts
- Worker workload/availability
- Customer messages waiting
- Payroll/time review alerts
- Automation suggestions

### Must work

Every Smart Hub card must be clickable and open a modal with:

- full details
- AI reasoning
- related record data
- recommended action
- approve/edit/reject controls
- explicit Open page button

No dead cards. No placeholder-only buttons.

---

## Jobs wiring

Jobs must talk to clients, workers, invoices, photos, time tracking, dispatch, and AI.

### Job create/edit

- Client selection should pull client address, recent jobs, default notes, and service context.
- Pricing fields should exist for owners/admins only.
- Workers must not see pricing.
- Assigned worker selection should check schedule conflicts.
- Worker assignment should create a notification for the worker.
- If job is unassigned, AI should suggest best worker.

### Job completion

When a worker completes a job:

- Owner/admin gets notification.
- Office admin can be notified when invoice/admin follow-up is needed.
- Payroll is not notified unless time/payroll review is involved.
- AI generates invoice draft description.
- AI prepares invoice draft if pricing source exists.
- AI flags missing pricing if invoice cannot be drafted.
- Worker photos are attached to job.
- Owner can review photos in in-page lightbox.
- Completion data flows to invoices, payroll/time review, Smart Hub, and reports.

### Job start

- Capture worker location on Start Job.
- Save timestamp, start lat/lng, job lat/lng, distance, and location status.
- Owner/admin can see verification evidence.
- Worker must not see GPS verification details.

---

## Dispatch wiring

Dispatch must not just list jobs. It should help assign work.

AI worker matching should consider:

- availability
- schedule conflicts
- region/area proximity
- workload
- role
- skills/trade
- past job experience
- current job status
- time window

For every unassigned job, AI should prepare:

- recommended worker
- reason
- alternative workers
- conflict warnings
- Approve assignment button

Approving should assign the worker and notify them.

---

## Clients wiring

Client pages must connect to jobs, quotes, invoices, messages, notes, AI follow-ups, and CSV import.

### Client detail modal/page

Must show:

- client contact details
- related jobs
- related quotes
- related invoices
- unpaid money
- last completed job
- recent notes
- AI suggested next action

AI should suggest:

- follow up unpaid invoice
- follow up quote
- create job from repeated service pattern
- prepare customer message
- flag missing contact info

CSV import must work and validate headers clearly.

---

## Quotes wiring

Quotes must connect to clients, jobs, messages, invoices, and AI follow-ups.

### Quote flow

- Create quote
- Open quote detail in modal where practical
- Send/share quote
- Public quote view
- Accept/decline quote
- Convert accepted quote to job
- AI follow-up if no response after configured period

AI must prepare follow-up messages but not send without approval.

---

## Invoices wiring

Invoices must connect to jobs, clients, quotes, payments, MYOB, SMS/email reminders, and Smart Hub.

### Invoice create

- If job selected, auto-fill description from job, client, notes, photos, time, and pricing context.
- If client selected, AI suggests description from last completed job and recent service history.
- Invoice amount should come from job pricing, hourly rate, fixed price, extras, or manual entry.

### Invoice reminders

AI should detect:

- overdue invoices
- high-value unpaid invoices
- invoices with missing payment link
- invoices ready to chase

AI should prepare reminder messages and owner approves before sending.

### Invoice cleanup

Owner/admin can remove or clear invoices with confirmation.

---

## MYOB wiring

MYOB must be clear and controlled.

Plan rules:

- Solo: no MYOB
- Team: no MYOB
- Pro: optional MYOB add-on
- Enterprise: MYOB included

MYOB sync should support phase-one invoice/payment flow:

- internal invoice can remain source of truth or sync source depending on settings
- MYOB invoice creation/update
- MYOB payment status sync back
- prevent duplicate sync
- show sync status clearly
- show errors clearly
- owner approval required before accounting-impacting changes unless explicitly configured

---

## Team and roles wiring

Launch roles:

- Owner
- Manager
- Worker
- Office Admin
- Payroll

No Accountant role at launch.

### Team page

Must support:

- invite worker/team member
- role selection
- remove worker
- update role
- open worker profile in modal
- view assigned jobs
- assign job from worker profile
- add notes related to worker

When owner adds employee or CSV-imports team members, invitation email is sent automatically.

---

## Worker app wiring

Worker view must stay simple.

Worker can:

- view assigned jobs
- acknowledge job
- start job
- pause/resume
- complete job
- upload job photos
- add worker notes if allowed

Worker must not see:

- owner billing
- plans
- MYOB
- pricing
- payroll admin
- GPS verification evidence
- broad business reports

Worker actions must notify correct owner/admin roles and feed AI Operator.

---

## Payroll wiring

Payroll is a workspace inside Churvox, not a separate app.

Payroll role can access:

- pay periods
- approved hours
- timesheets
- worker pay summaries
- payroll exports/reports
- payroll notes/admin fields

Payroll cannot access:

- owner billing
- plan settings
- broad job edit tools
- MYOB owner settings
- customer messaging unless payroll-related

AI can prepare payroll review alerts but cannot change payroll without approval.

---

## Automation engine wiring

Automation must be real, not decorative.

Automation rules need:

- trigger
- condition
- action
- target module
- business_id
- enabled flag
- last_run
- run history
- failure handling
- notification output

Initial templates:

- when job completed, prepare invoice draft
- when quote unanswered after 48 hours, prepare follow-up
- when invoice overdue, prepare reminder
- when job has no crew, suggest assignment
- when worker uploads proof, notify owner/admin
- when schedule conflict exists, warn owner/admin

No advanced visual builder required for launch.

---

## Notifications wiring

Notifications must be reliable and routed to the correct role.

Events:

- job assigned
- job acknowledged
- job started
- job paused/resumed
- job completed
- photo uploaded
- note added
- invoice draft ready
- quote follow-up ready
- invoice reminder ready
- AI action pending approval
- schedule conflict
- payroll review needed

Each notification must deep-link to the relevant modal/record.

Fix timestamps so new notifications show correct recency.

---

## Page theme requirements

Every page must follow the same premium theme:

- light app shell
- clean sidebar
- premium card surfaces
- consistent spacing
- large readable headings
- strong empty/loading/error states
- clear action buttons
- in-page modals/sheets for details
- mobile-friendly tap targets
- no dead-looking cards
- no placeholder text
- no broken old theme pages

Pages to audit and polish:

- Smart Hub
- Jobs
- Job detail
- Job create/edit
- Clients
- Client detail
- Quotes
- Quote detail
- Invoices
- Invoice detail
- Dispatch
- Team
- Worker pages
- Payroll
- Automation
- Reports
- Settings
- Plans/Billing
- MYOB settings
- SMS/Communications
- Public quote/invoice views

---

## Deep wiring tests

Run or create tests for:

1. Owner login to dashboard.
2. Normal signup/login.
3. Client create/open.
4. Job create/open.
5. Assign worker to job.
6. Worker receives assignment.
7. Worker completes job.
8. AI creates invoice draft action.
9. Owner approves invoice draft.
10. Invoice appears in invoice module.
11. Quote create/open.
12. Quote follow-up action is prepared.
13. Owner approves message before sending.
14. Invoice reminder action is prepared.
15. Owner approves reminder.
16. Photo upload appears for owner.
17. Worker cannot see pricing/GPS owner data.
18. Payroll can access payroll only.
19. Office admin can access admin workflows but not owner billing.
20. Automation templates create real run history.
21. Notification bell opens cleanly.
22. Every card opens modal/details correctly.
23. Mobile taps work.
24. Build passes.
25. Render deploy succeeds.

---

## Final launch standard

Churvox is launch-ready only when:

- AI approval queue executes real actions
- no major page has broken theme
- no core card is dead
- worker/owner permissions are safe
- invoice/job/client/quote flows work end-to-end
- AI prepared actions land in the correct module
- notifications deep-link correctly
- mobile layout is usable
- Render build/deploy passes

The goal is a 10/10 AI operator system, not just a nice dashboard.
