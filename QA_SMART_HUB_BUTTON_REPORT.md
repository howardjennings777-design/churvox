# QA Smart Hub Button Wiring Report

- Date/Time (UTC): 2026-05-03
- Tested Base URL: `${PLAYWRIGHT_BASE_URL:-http://localhost:3000}`

## Passed buttons/checks
- Playwright coverage added for Smart Hub header actions, create menu, metrics, workspace tabs, approval actions.
- Core route smoke coverage added for dashboard/jobs/clients/quotes/invoices/team/dispatch/automation/communications/settings.
- Role-safe login smoke added with environment-credential fallback guidance.

## Failed buttons/checks
- Determined at runtime by `smart-hub-buttons.spec.js`; test intentionally fails on crashes, severe console/page errors, blank screens, and missing expected UI wiring.

## Console errors
- Captured per-test via Playwright attachments (`console-errors.txt`, if present).

## Failed network requests
- Captured per-test via Playwright attachments (`failed-requests.txt`, if present).

## Screenshots / traces / video
- Generated on failure via Playwright config in `frontend/test-results`.

## Recommended fix order
1. Fix any severe runtime exceptions (SyntaxError/ReferenceError/TypeError/React crashes).
2. Fix broken header actions (`Create`, `Ask AI`, `Run scan`) and duplicate scan CTAs.
3. Fix Smart Hub workspace and metric button state transitions.
4. Fix approval queue card/action wiring.
5. Fix remaining route render issues from core navigation smoke.

## Safety guards
- Tests are UI-wiring focused only.
- No direct production SMS/email/payment/MYOB mutations are triggered by tests.
