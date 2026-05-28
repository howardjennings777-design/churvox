# Churvox Launch Final Proof — 2026-05-29

## Launch-safe sweep completed

This file records the final launch-hardening sweep so the repo has a clear checkpoint.

### Core promise
Crew finishes work → Churvox prepares admin → owner opens a Work Slip → owner checks, edits and approves.

Approval-first remains locked:
- No customer message sends without owner approval.
- No invoices/quotes are sent automatically.
- No payroll/accounting/pricing/deletion/SMS action happens automatically.

### Completed in this sweep

1. Work Slip linked actions
- Draft invoice shortcut preserved.
- Money Desk shortcut preserved.
- Message Approval shortcut preserved.
- Dispatch shortcut preserved.
- Action feedback remains visible to owner.

2. Message Approval
- Editable send screen.
- Owner can edit email, subject and message.
- Approve & send action added.
- Sent/failed state shown.
- Session send history shown.
- Email field can prefill from linked client record.

3. Dispatch Board
- /dispatch-board?job_id=... shows linked job panel.
- Linked job card highlights and scrolls into view.
- Owner can assign selected worker from linked dispatch panel.
- Backend assignment endpoint added.

4. Money Desk
- /invoices?job_id=... gets linked job invoice filter panel.
- Linked invoices are highlighted/listed when found.
- Owner can create draft invoice from linked job.

5. Offline Sync
- Worker offline queue expanded to include note, start, pause, resume, complete, issue and photo-note actions.
- Backend offline sync stores queued actions and applies job updates where possible.

6. Invoice and quote editors
- Invoice create editor has line items, quantity, rate, GST, payment details, notes and total preview.
- Quote create editor has line items, quantity, rate, valid-until, notes and total preview.
- Job-linked invoice prefill preserved.

7. Public document templates
- Public invoice template renders line items, quantity, rate, subtotal, GST, total, payment notes and customer notes.
- Public quote template renders line items, quantity, rate, subtotal, quote total, notes and validity.

8. Launch locking
- Internal pages are guarded behind auth/business routes.
- Public pages remain public only where intended: invoice, quote, proof pack, client portal, marketing/legal/auth.
- SMS, integrations and advanced automation routes remain redirected/locked instead of pretending to be complete.

## Final live smoke tests to prove

1. Owner login.
2. Create client with customer email.
3. Create job for that client.
4. Complete/review job and open Work Slip.
5. Work Slip → Draft invoice.
6. Invoice editor shows linked job prefill and line items.
7. Public invoice shows line items and totals.
8. Work Slip → Message Approval.
9. Message email prefilled from linked client.
10. Edit message and approve/send to a safe test email.
11. Work Slip → Dispatch Board.
12. Assign a worker from Dispatch Board.
13. Worker offline action queue records and syncs note/start/complete.
14. Public quote shows line items and totals.
15. Mobile bottom navigation and main taps work.

## Known deliberately launch-locked areas

- Full SMS sending/billing remains locked until final SMS provider flow is stable.
- MYOB/Xero integrations remain locked until approval and production scopes are ready.
- Payroll advanced banking/compliance remains locked.
- Advanced automation remains redirected/locked until the approval-first core is fully proven.
