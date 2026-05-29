# Churvox Launch Duplicate Audit — 2026-05-29

This connector-safe audit was created after the Codespaces audit block crashed.

## What was checked directly

### 1. `frontend/src/index.js` imports
Status: **PASS**

- No duplicate side-effect imports were visible.
- Old Money Desk context patch import is no longer loaded.
- New Money Desk linked job filter patch remains loaded.
- Work Slip linked-actions bridge remains loaded.
- Work Slip Dispatch patch remains loaded only for the Dispatch button.

### 2. `frontend/src/App.js` routes
Status: **PASS**

Visible route section was checked for obvious duplicate paths.

Internal launch pages are guarded:

- `/offline-sync` requires login.
- `/dispatch-board` requires business app access.
- `/message-approvals` requires business app access.
- `/trade-presets` requires business app access.

Launch-locked unfinished routes still redirect:

- `/sms` redirects to dashboard.
- `/integrations` redirects to dashboard.
- `/automation` redirects to dashboard.
- `/automation/runs` redirects to dashboard.

### 3. Money Desk duplicate panels
Status: **FIXED / PASS**

Found earlier:

- `churvoxMoneyDeskJobContextPatch`
- `churvoxMoneyDeskLinkedJobFilterPatch`

Both could create linked Money Desk panels on `/invoices?job_id=...`.

Fix applied:

- Removed `churvoxMoneyDeskJobContextPatch` from `frontend/src/index.js`.
- Kept `churvoxMoneyDeskLinkedJobFilterPatch` as the single linked-job Money Desk panel.

### 4. Dispatch duplicate panels
Status: **FIXED / PASS**

Found earlier:

- `DispatchBoardPage.jsx` now natively shows linked job context.
- `churvoxWorkSlipDispatchPatch.js` was still injecting a second linked panel.

Fix applied:

- Removed duplicate linked panel injection from `churvoxWorkSlipDispatchPatch.js`.
- Kept the Work Slip `Dispatch` button.

### 5. Public invoice/quote duplication
Status: **PASS**

Public invoice and public quote share similar helper logic by design, but each renders only one document surface.

Checked markers:

- Public invoice line item/total fallback hardening exists.
- Public quote line item/total fallback hardening exists.

### 6. Invoice/quote editor markers
Status: **PASS**

Checked markers:

- Invoice editor line-item launch marker exists.
- Quote editor line-item launch marker exists.

## What could not be run through connector

The GitHub connector cannot run terminal commands, so these still need Render/Codespaces verification:

- `npm --prefix frontend run build`
- full repo grep across every source file
- ESLint warning list

## Current result

No obvious duplicate route/import/panel issue remains in the high-risk launch files checked by connector.

Next step is Render build/live check, then live smoke testing.
