# Job Done and Money Radar

## Job Done

Job Done is Churvox's completed-work closeout workflow. It checks the returned job, invoice and payroll records for:

- completion status
- customer and assigned worker
- customer-visible proof
- checklist completion
- actual and estimated time
- extras and invoice value
- estimated job profit where costs are available
- recurring work and the next service date
- invoice and accounting readiness

The owner can correct the prepared fields and choose which internal drafts Churvox should prepare. The workflow then creates one Command slip for owner review.

After approval, Churvox stores the edited fields as an owner-approved internal closeout draft. This is a separate prepared record; it does not overwrite the job or create an external action.

Job Done does not send the customer update, send an invoice, sync accounting, change the live job, pay a worker, create a bank file or file tax.

## Money Radar

Money Radar reads the existing job, invoice, quote and gross payroll-review sources to show:

- completed work not yet linked to an invoice
- draft invoices waiting for approval
- overdue balances
- expected money over seven and thirty days
- gross worker costs returned by the available payroll source
- jobs with time, extras or closeout risk
- quotes that may need a prepared follow-up

The thirty-day position is directional. It uses only records Churvox could load and does not replace the owner's accounting or cash-flow judgement.

After approval, Churvox stores the edited Money Radar fields as an owner-approved internal review draft. The draft remains separate from invoice, payment, accounting and payroll records.

A Money Radar action does not send invoices or reminders, collect payment, mark an invoice paid, sync accounting, pay workers, create bank files or file tax.

## Owner-control contract

Both workflows follow the same product rule:

1. Churvox checks the live records it can access.
2. Missing or uncertain facts stay visible and editable.
3. Churvox prepares one internal Command decision.
4. The owner checks and approves the internal draft.
5. Churvox stores the approved draft and its safety locks without mutating the source records.
6. External sends, syncs, charges, payments, tax actions and live-record changes remain separate owner-approved actions.

## Release safeguards

- Job Done approvals are routed to the existing operations-review draft collection.
- Money Radar approvals are routed to the existing accounting-review draft collection.
- Active Stripe-backed owners see secure billing management instead of being offered a second checkout.
- A newly submitted login must be confirmed by the server; an offline browser snapshot cannot confirm a fresh login.
- Explicit logout calls the server, clears cached account state, records the signed-out lock and returns to `/login?logged_out=1`.

## Validation

The feature branch includes a Playwright contract that verifies both workflows create backend Command slips with prepared-only and no-auto-action safety flags. Job Done is also included in the full route, mobile layout and button gauntlets. Backend route-isolation tests verify that signature drafts enter the internal review collections while ordinary Command slips keep their existing routing.