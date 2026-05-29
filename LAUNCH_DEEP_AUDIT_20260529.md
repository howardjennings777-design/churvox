# Churvox Deep Launch Audit — 2026-05-29

This is the strict launch-grade audit checkpoint for the AI Operator / Command Floor build.

A repeatable audit script has been added at:

`frontend/scripts/churvox-deep-launch-audit.js`

Run from repo root:

```bash
node frontend/scripts/churvox-deep-launch-audit.js
```

## Audit categories covered

- Duplicate App.js routes
- Duplicate index.js side-effect imports
- Duplicate runtime patch panels
- Approval-first route locks
- Internal route guards
- Public invoice line items/totals/payment details
- Public quote line items/totals/validity
- Invoice editor line items/GST/payment details
- Quote editor line items/validity
- Public pricing SMS block prices
- In-app Plans SMS block prices
- Backend Message Approval send endpoint
- Backend Dispatch assign endpoint
- Backend Offline Sync endpoint
- DOM `innerHTML` usage review
- Rough launch wording scan
- Frontend package build/test script presence

## Connector-verified status

### Duplicate imports/routes

Status: **PASS for high-risk checked files**

- `frontend/src/index.js` no longer loads the old Money Desk context patch.
- `frontend/src/index.js` loads the newer Money Desk linked filter patch only.
- `frontend/src/App.js` visible launch route section did not show duplicate route paths during connector review.

### Duplicate Money Desk panels

Status: **FIXED / PASS**

Found and fixed:

- Old `churvoxMoneyDeskJobContextPatch` could duplicate the new Money Desk linked-job filter panel.
- Removed old patch import.
- Kept `churvoxMoneyDeskLinkedJobFilterPatch`.

### Duplicate Dispatch panels

Status: **FIXED / PASS**

Found and fixed:

- Dispatch runtime patch was still injecting a linked panel.
- `DispatchBoardPage.jsx` now owns linked job panel natively.
- Runtime patch was reduced to only keep the Work Slip Dispatch button.

### Approval-first locks

Status: **PASS**

Routes remain launch-locked:

- `/sms` redirects to dashboard.
- `/integrations` redirects to dashboard.
- `/automation` redirects to dashboard.
- `/automation/runs` redirects to dashboard.

### Internal route guards

Status: **PASS**

- `/offline-sync` requires login.
- `/dispatch-board` requires business access.
- `/message-approvals` requires business access.
- `/trade-presets` requires business access.

### Customer-facing document templates

Status: **PASS**

- Public invoice supports line items, subtotal, GST, total, payment details and notes.
- Public quote supports line items, subtotal, total, notes and validity.
- Total fallback hardening is present so line items can win when saved totals are missing/zero.

### Pricing and SMS blocks

Status: **PASS**

Public and in-app pricing now show:

- Start — $39/month + GST
- Crew — $89/month + GST
- Operator — $149/month + GST
- Command — $299/month + GST
- Command Growth Pack — $99/month + GST
- MYOB add-on for Operator — $39/month + GST
- SMS credit blocks:
  - 100 credits — $10 + GST
  - 500 credits — $45 + GST
  - 1,000 credits — $80 + GST

### Backend approval-first endpoints

Status: **PASS by connector source review**

- Message Approval send endpoint exists.
- Dispatch assignment endpoint exists.
- Offline sync endpoint exists.

## Problems found / still to address

### 1. DOM `innerHTML` hardening in Work Slip bridge

Status: **NEEDS TERMINAL PATCH**

File:

`frontend/src/concept-c/churvoxWorkSlipLinkedActionsBridge.js`

Issue:

- One action-log path writes text into `innerHTML` without escaping first.
- Text is mostly internal fixed strings, but a launch-grade audit should harden it anyway.

Attempted connector patch was blocked by safety checks, so this should be done through Codespaces terminal.

### 2. Full terminal build not yet run from this audit

Status: **NEEDS RENDER/CODESPACES CONFIRMATION**

The GitHub connector cannot run:

```bash
npm --prefix frontend run build
```

Render deploy remains the build source of truth unless Codespaces runs it.

### 3. Full repo grep not executable through connector

Status: **NEEDS CODESPACES FOR FULL DEPTH**

The audit script is now committed so Codespaces can do the full-depth grep/build pass.

## Required next action

Run this in Codespaces when possible:

```bash
cd /workspaces/churvox || exit 1
node frontend/scripts/churvox-deep-launch-audit.js
npm --prefix frontend run build
```

If it prints failures, fix those before final launch smoke testing.

## Final launch smoke test after audit/build

1. Public pricing page shows all plan prices and SMS blocks.
2. In-app Plans page shows all plan prices and SMS blocks.
3. Owner creates client with email.
4. Owner creates job.
5. Worker completes job.
6. Owner opens Work Slip.
7. Work Slip → draft invoice.
8. Public invoice shows line items and totals.
9. Work Slip → Message Approval.
10. Email is prefilled from linked client.
11. Owner edits and approves message send to a safe test email.
12. Work Slip → Dispatch Board.
13. Owner assigns worker.
14. Worker offline queue records and syncs actions.
