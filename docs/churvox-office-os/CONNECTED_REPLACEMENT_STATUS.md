# Churvox Connected Replacement Status

## Purpose

The rebuild must become usable without creating a second uncontrolled write path. The connected replacement therefore follows a controlled strangler cutover:

1. Read current business-scoped records in the new Office OS.
2. Prepare work in the replacement, but keep Command as the single approval boundary.
3. Apply only deterministic draft or review records through the existing owner-only Command executor.
4. Keep every send, sync, payment, tax, bank-file, deletion and financial-truth action outside the replacement until its separate release gate passes.
5. Cut live routes only after the selected launch scope passes build, browser, role, mobile, recovery and rollback gates.

## Current stage

| Surface | Current state | Data source | Write behaviour |
| --- | --- | --- | --- |
| Owner Office OS | Connected private replacement | Authenticated same-origin reads plus existing Command APIs | Prepares and owner-approves six safe draft/review record types |
| Owner design blueprint | Private sample-only blueprint | Clearly labelled sample records | No writes |
| Public website | Private connected visual rebuild | Static product contract plus handoffs to current working routes | Signup, login, request and support hand off to existing journeys |
| Customer pages | Private visual rebuild | Sample customer states | Existing signed public pages remain live |
| Worker app | Current production worker app | Current production APIs | Current validated worker mutations |
| Churvox HQ | Private connected replacement | Authenticated owner-only platform reads | All platform mutations remain in current HQ |

## Owner replacement area status

| Area | Replacement read | Replacement write now available | Still locked behind current workflow or later gate |
| --- | --- | --- | --- |
| Today | Connected aggregate | None | Source-count and money-truth release proof |
| Command | Confirmed Command slips and audit | Explicit owner approval for prepared records | Sending, charging, syncing, paying, filing and destructive actions |
| Work | Jobs read | Create an owner-approved job draft | Edit, recurrence, scheduling, timers, completion and archive |
| Clients | Clients read | Create an owner-approved client record | Edit, CSV import, duplicate merge and deletion |
| Quotes | Quotes read | Create an owner-approved quote draft | Customer send, acceptance and conversion |
| Invoices | Invoices read | Create an owner-approved invoice draft | Send, payment status, accounting sync and tax filing |
| Messages | Current message read | Create an owner-approved message draft | Email, SMS, notification delivery and retries |
| Team | Worker/team read | Create an owner-approved staff or hours review | Invite, permissions, payroll payment, tax and bank files |
| Reports | Source record counts only | None | Verified revenue, margin and payment calculations |
| Settings | Business settings read | None | Branding, security, account and integration mutations |

## Complete Command draft desk

The connected owner replacement now prepares, edits, approves and audits these business-scoped records:

- Client records: name, phone, email, service address and notes.
- Job drafts: title, client, timing, worker, price and required scope.
- Quote drafts: title, client, amount, follow-up timing, required scope and notes.
- Invoice drafts: job/title, client, total, timing, required line items and notes.
- Message drafts: subject, recipient context, suggested timing, required message and reply notes.
- Staff reviews: worker, job/review title, hours, required issue and notes.

All six types use the existing Command approval endpoint. Required fields are checked when prepared, checked again immediately before approval and checked by the backend before insertion. Repeat approval is idempotent. The response records the created collection/id and the Command audit records `approved_applied`.

## Rules already enforced

- No sample records replace missing live records in connected production reads.
- The replacement does not introduce direct POST requests to Clients, Jobs, Quotes, Invoices, Messages or Staff APIs.
- Draft creation remains business-scoped and owner/admin-only.
- Quote and invoice approval creates drafts only.
- Message approval creates a draft only; it does not deliver anything.
- Staff approval creates a review only; it does not pay anyone or create a tax or bank file.
- The current production owner app, public routes, worker app and HQ remain unchanged.
- Pricing remains Start $39, Crew $89, Operator $149 and Command $299 per month plus GST.
- Command Growth Pack remains $99 per month plus GST.
- Nothing important sends, charges, syncs, files, pays, deletes or changes financial truth without authority.

## Remaining live-cutover gates

1. Pass the exact-head production build and browser contracts.
2. Human-test the private replacement with real owner records on desktop and mobile.
3. Prove session persistence, role isolation and business isolation.
4. Prove worker login, assignment, acknowledge, timer, messaging and offline recovery flows.
5. Prove customer quote, invoice, portal and proof links.
6. Prove billing, Xero, payment truth, retry and recovery behaviour without enabling replacement-side effects.
7. Rehearse migration, rollback and old-route recovery.
8. Obtain explicit owner approval before any live route cutover.
