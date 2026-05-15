# Churvox AI Operator Blueprint

## Core promise

Churvox is the AI Operator for trade and service businesses.

It watches the business, finds what needs doing, prepares the admin, and gives the owner simple approval decisions.

The owner should feel:

> AI runs the admin. I approve what matters.

Smart Hub is the control room.

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

AI finds work -> AI explains why -> AI prepares action -> owner approves -> Churvox executes.

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

3 jobs need decisions, 2 completed jobs can be invoiced, 1 quote needs follow-up, and $1,250 is overdue.

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

## Main box details

### To approve

Shows AI-prepared dispatch, invoice, quote follow-up, and payment reminder actions.

### Needs attention

Shows blockers: unassigned jobs, worker conflicts, failed actions, missing client/amount, missing phone/email, overdue jobs, later MYOB/sync issues.

### Ready to invoice

Shows completed jobs with no invoice, completed jobs with proof/photos/notes/time/pricing, and AI-created draft invoices.

### Messages ready

Shows quote follow-ups, payment reminders, customer updates, and worker/admin messages.

### Today's work

Shows today's jobs, assigned worker, status, late/not-started work, and completed jobs needing review.

### Money to collect

Shows unpaid/overdue invoices, draft reminders, and payment follow-ups.

### Quotes waiting

Shows sent/stale quotes and quote follow-up drafts.

### Crew active

Shows worker availability, workload, overloaded workers, and assignment capacity.

### Setup health later

Checks business details, clients imported, workers added, worker regions/skills, pricing, invoice settings, MYOB, SMS/email.

---

## AI reason requirement

Every AI-prepared action must explain why.

Examples:

- Jay is best because he is nearby, available, and has lawn-care experience.
- This job is ready to invoice because it is completed, has photos, notes, and pricing.
- This quote needs follow-up because it has been waiting 5 days.
- This invoice needs a reminder because it is overdue and still has a balance.

---

## Risk and urgency labels

Every modal item should have one simple label:

- Low risk
- Needs owner check
- Urgent
- Missing info
- Failed action
- Ready

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

Smart Hub should show what was approved, when, by who, what changed, linked record, and result.

Examples:

- Jay assigned to lawn job
- Invoice draft created
- Quote follow-up saved
- Payment reminder marked ready

---

## Pages to keep

- Smart Hub
- Jobs
- Clients
- Team
- Quotes
- Invoices
- Proof-to-Paid
- Settings

Smart Hub is the daily command centre. The other pages are deeper workspaces.

---

## Remove or hide

- separate AI Work Queue page
- duplicate horizontal Smart Hub tabs
- duplicate topbar Smart Hub/AI buttons
- fake New Job buttons unless they open a create form
- Fast Actions panel
- old Smart Hub CSS experiments
- circles/target/koru leftovers

Approvals live inside Smart Hub only.

---

## Worker flow

Worker sees:

- today's assigned jobs
- start job
- pause/resume
- add note
- upload photo
- complete job

Worker should not see pricing, invoices, owner settings, billing, AI owner approvals, MYOB, or admin controls.

---

## Build order

1. Stabilise repo.
2. Clean Smart Hub logic and CSS.
3. Keep 8 Smart Hub boxes.
4. Build SmartHubBoxModal.
5. Make every box open a full pop-up.
6. Add AI Daily Brief.
7. Add AI reason, risk labels, snooze, dismiss, and approval history.
8. Keep approvals inside Smart Hub only.
9. Remove visible AI Work Queue navigation once stable.
10. Clean Jobs, Clients, Team, Quotes, Invoices, Proof-to-Paid, and Worker app.

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
