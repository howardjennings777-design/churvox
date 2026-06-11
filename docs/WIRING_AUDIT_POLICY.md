# Churvox Wiring Audit Policy

This file explains how the full wiring audit should treat preview/fallback code.

## Intentional fallback allowed

The fresh Command rebuild keeps localStorage as a safe fallback only. This is allowed when:

- the backend Command API exists
- `/api/command/slips` exists
- the frontend Command page reads backend slips
- the shared `commandBridge.js` posts slips to backend
- the bridge also syncs old localStorage inbox slips to backend
- the bridge is installed from `FreshApp.jsx`

This means old preview Send to Command code is not automatically a launch blocker, as long as it is covered by the backend bridge.

## Button audit rule

A button is a blocker only when it has no obvious `onClick`, no submit behaviour, and no form submit path.

Navigation-only buttons are not launch blockers when their label is clearly an open/create/navigation action.

## Preview/demo/localStorage rule

Preview/demo/localStorage references are not automatically launch blockers. They remain visible in the audit report, but they only block launch when found in critical backend-owned flows without a backend API path or without an intentional fallback explanation.

Critical flows still require live testing:
- signup email
- email verification
- forgot password
- worker invite email
- Stripe checkout and plan persistence
- Command approve/edit/snooze/ignore persistence
- Send to Command backend persistence
