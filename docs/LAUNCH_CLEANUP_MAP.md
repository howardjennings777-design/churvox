# Churvox Launch Cleanup Map

This file is the working rulebook for getting Churvox launch-ready.

## Product rule

Churvox is one app with one owner experience: the Command Desk.

The app must feel like a serious trade/service business command centre, not a collection of old test pages.

## Live navigation to keep

- `/dashboard` — Command Board. Owner sees urgent work, AI-prepared slips, jobs, invoices, quotes and crew actions.
- `/jobs` — job command list.
- `/jobs/new`, `/jobs/:id`, `/jobs/:id/edit` — full job record pages.
- `/clients` — client command list.
- `/clients/new`, `/clients/:id`, `/clients/:id/edit` — full client record pages.
- `/quotes` — quote command list.
- `/quotes/new`, `/quotes/:id`, `/quotes/:id/edit` — full quote record pages.
- `/invoices` — invoice command list.
- `/invoices/new`, `/invoices/:id` — full invoice record pages.
- `/team` — team command list.
- `/crew-map` — simple crew/dispatch view.
- `/payroll` — payroll workspace.
- `/reports` — owner reports.
- `/settings` — business settings.
- `/plans` — plan and billing.
- `/support` — setup/help/legal support.
- `/worker/jobs` and `/worker/jobs/:id` — worker app flow.
- `/admin` — platform owner admin.

## Redirect / hide from launch

These routes should not appear as standalone launch pages unless rebuilt with the same Command Desk style:

- `/operator-tools`
- `/launch-control`
- `/sales-polish`
- `/integration-proof`
- `/launch-ops`
- `/backup-recovery`
- `/polish-checklist`
- `/demo-mode`
- `/sample-mode`
- `/message-approvals`
- `/automation`
- `/automation/runs`
- `/pipeline`
- `/calendar`
- `/sms`
- `/notifications`
- `/trade-presets`
- `/billing-confidence`

## UI rule

List/dashboard pages are overview and decision pages.

Create/edit/detail pages are full record pages.

When the owner taps a job, invoice, quote, worker or AI-prepared item from a Command card:

1. Open a full-screen slip over the current page.
2. Show exact item details.
3. Allow approve/edit inside the slip.
4. Provide a clear Open full page button only for deeper record editing.
5. Closing the slip returns to the same Command page.

## Visual rule

Use the Churvox Command Desk theme everywhere:

- dark graphite command panels
- off-white workspace background
- orange/cyan/green industrial accents
- clear cards with a purpose
- no pale old prepared-actions page
- no old marketplace/demo/placeholder theme in live owner app

## AI Operator rule

AI must not feel fake. It should prepare useful owner actions from real app data where possible:

- unassigned jobs
- completed jobs ready to invoice
- overdue invoices
- draft invoices ready for review
- quote follow-ups
- crew capacity and active job checks
- setup gaps when there is no live data

AI must stay approval-first. It should prepare, explain and let the owner approve.

## Launch cleanup passes

1. Route cleanup and old-page redirects.
2. One Command layout across all owner pages.
3. Full-screen slip behaviour on all command list items.
4. Page-by-page button wiring check.
5. Remove old duplicate/placeholder content from sidebar and live routes.
6. Mobile layout polish.
7. Launch test pass.
