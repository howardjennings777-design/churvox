# Churvox AI Operator Blueprint

## Core promise

Churvox is the AI Operator for trade and service businesses.

It watches the business, finds what needs doing, prepares the admin, and gives the owner simple approval decisions.

The owner should feel:

> AI runs the admin. I approve what matters.

Churvox is not just job software with AI added. Smart Hub is the control room.

---

## Final owner flow

1. Owner logs in.
2. Owner lands on Smart Hub.
3. Smart Hub shows a short AI Daily Brief and action boxes.
4. Owner taps a box.
5. A large full pop-up opens.
6. Owner reviews, edits, approves, snoozes, dismisses, or opens the full record.
7. Churvox performs the approved action.
8. Churvox logs what happened.

Flow:

AI finds work → AI explains why → AI prepares action → owner approves → Churvox executes.

---

## Smart Hub layout

Smart Hub should show:

### Hero

AI Operator badge.

Headline:
AI has lined up today's decisions.

Support text:
Approve work, fix blockers, review messages, and keep the day moving from one simple board.

### AI Daily Brief

A short plain-English summary, for example:

"3 jobs need decisions, 2 completed jobs can be invoiced, 1 quote needs follow-up, and $1,250 is overdue."

The daily brief should make the owner feel Churvox has already checked the business.

### Main boxes

Top row:

1. To approve
2. Needs attention
3. Ready to invoice
4. Messages ready

Second row:

5. Today's work
6. Money to collect
7. Quotes waiting
8. Crew active

Optional later/new-user box:

9. Setup health

---

## Box behavior

The boxes are summaries only.

Nothing should be fully open by default.

When an owner taps a box, open a large full pop-up over Smart Hub.

No full page jump.

Rule:

Box = summary  
Pop-up = review/edit/approve  
Full page = only when owner taps "Open full record"

---

## Smart Hub full pop-up

Create one reusable pop-up:

SmartHubBoxModal

It receives:

- box type
- title
- count
- records
- empty message
- actions

Each modal row should include:

- action type
- title
- reason AI found it
- risk/urgency label
- status
- linked record info
- Details
- Edit
- Approve
- Snooze
- Dismiss
- Open full record

---

## Box details

### 1. To approve

Shows AI-prepared actions.

Includes:

- dispatch approvals
- invoice draft approvals
- quote follow-up approvals
- payment reminder approvals

Actions:

- Details
- Edit
- Approve
- Snooze
- Dismiss
- Open full record

### 2. Needs attention

Shows blockers and problems.

Includes:

- unassigned jobs
- worker conflicts
- failed approval actions
- invoices missing client or amount
- missing client phone/email
- overdue jobs
- sync issues later, including MYOB

Actions:

- Fix now
- Snooze
- Mark resolved
- Open full record

### 3. Ready to invoice

Shows money-ready work.

Includes:

- completed jobs with no invoice
- completed jobs with photos, notes, time, and price
- draft invoices created by AI
- jobs with pricing ready

Actions:

- View proof
- Edit invoice description
- Create invoice draft
- Approve invoice draft
- Open job/invoice

### 4. Messages ready

Shows communication prepared by AI.

Includes:

- quote follow-ups
- payment reminders
- customer updates
- worker/admin messages

Actions:

- Copy message
- Edit message
- Mark ready
- Mark sent
- Later: send email/SMS only after approval

### 5. Today's work

Shows work happening now/today.

Includes:

- jobs today
- assigned worker
- job status
- late or not-started jobs
- completed jobs needing owner review

Actions:

- Open job
- Assign/reassign
- View worker update
- Review completion

### 6. Money to collect

Shows cashflow actions.

Includes:

- overdue invoices
- unpaid invoices
- draft reminders
- payment follow-ups

Actions:

- Prepare reminder
- Copy/send reminder
- Mark paid/manual
- Open invoice

### 7. Quotes waiting

Shows sales follow-up.

Includes:

- sent quotes
- stale quotes
- quote follow-up drafts

Actions:

- Edit follow-up
- Mark follow-up ready
- Open quote
- Convert to job later

### 8. Crew active

Shows team context.

Includes:

- workers available
- workers assigned today
- overloaded workers
- unassigned worker capacity

Actions:

- View worker
- Assign job
- Check workload

### 9. Setup health later

Only show for new or incomplete businesses.

Checks:

- business details complete
- clients imported
- workers added
- worker regions/skills set
- pricing set
- invoice settings complete
- MYOB connected
- SMS/email ready

Example:

"Your setup is 72% complete. Add worker regions to improve AI assignment."

---

## AI reason requirement

Every AI-prepared action must explain why.

Examples:

- "Jay is best because he is nearby, available, and has lawn-care experience."
- "This job is ready to invoice because it is completed, has photos, notes, and pricing."
- "This quote needs follow-up because it has been waiting 5 days."
- "This invoice needs a reminder because it is overdue and still has a balance."

AI must not feel decorative. It must explain its reasoning in plain business language.

---

## Risk and urgency labels

Every modal item should have a simple label:

- Low risk
- Needs owner check
- Urgent
- Missing info
- Failed action
- Ready

Examples:

Ready to invoice:
Low risk — job completed, price found, client exists.

Needs attention:
Urgent — job has no worker assigned.

Messages ready:
Needs owner check — message drafted but not sent.

---

## Owner action options

Every AI item should support:

- Approve
- Edit
- Snooze
- Dismiss
- Open full record

No important action should happen without owner approval.

---

## Approval history

Smart Hub should show a simple decision history.

Track:

- what was approved
- when it happened
- who approved it
- what changed
- linked job/invoice/quote/client
- status/result

Examples:

- Jay assigned to lawn job
- Invoice draft created
- Quote follow-up saved
- Payment reminder marked ready

---

## Pages to keep

Keep these main pages:

- Smart Hub
- Jobs
- Clients
- Team
- Quotes
- Invoices
- Proof-to-Paid
- Settings

Smart Hub is the daily command centre.

The other pages are deeper workspaces.

---

## Remove or hide

Remove/hide:

- separate AI Work Queue page
- duplicate horizontal Smart Hub tabs
- duplicate topbar Smart Hub/AI buttons
- fake "New job" buttons unless they open a create form
- Fast Actions panel
- old Smart Hub CSS experiments
- circles/target/koru leftovers

Approvals live inside Smart Hub only.

---

## Worker flow

Worker app should stay simple.

Worker sees:

- today's assigned jobs
- start job
- pause/resume
- add note
- upload photo
- complete job

Worker should not see:

- pricing
- invoices
- owner settings
- billing
- AI owner approvals
- MYOB/admin controls

---

## Build order

### Phase 1 — Stabilise

- clean Codespace after crashes
- confirm backend syntax
- confirm frontend build
- do not push unless build passes

### Phase 2 — Clean Smart Hub

- keep 8 boxes
- remove visible separate AI Work Queue navigation
- remove duplicate buttons/topbar clutter
- clean old CSS into one final Smart Hub system

### Phase 3 — Build full pop-up system

- create SmartHubBoxModal
- tap box opens full pop-up
- no full page jump
- modal has rows, reasons, labels, and actions

### Phase 4 — Make modal rows useful

Each row gets:

- title
- reason
- risk/urgency label
- status
- Details
- Edit
- Approve
- Snooze
- Dismiss
- Open full record

### Phase 5 — Wire real actions

- dispatch approval assigns worker
- invoice approval creates draft invoice
- quote approval saves follow-up draft
- cashflow approval saves payment reminder
- message mark-ready / mark-sent
- approval history

### Phase 6 — Clean deep workspaces

Clean:

- Jobs
- Clients
- Team
- Quotes
- Invoices
- Proof-to-Paid
- Worker app

Each should be simple and only for deeper work.

### Phase 7 — Final testing

Test only after the logic is clean:

- owner login
- Smart Hub boxes
- pop-ups
- approve actions
- worker job flow
- invoice flow
- quote flow
- mobile taps
- Render deploy

---

## 10/10 final experience

Owner opens Churvox.

They see:

AI has lined up today's decisions.

Then:

- 4 to approve
- 3 need attention
- 2 ready to invoice
- 5 messages ready
- 6 jobs today
- $1,250 to collect
- 3 quotes waiting
- 4 crew active

Owner taps To approve.

Full pop-up opens.

Owner reviews.

Owner approves.

Churvox does the admin.

That is the site.
