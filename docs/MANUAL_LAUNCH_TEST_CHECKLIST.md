# Churvox Manual Launch Test Checklist

> **Status policy:** This is a manual checklist template. Do not mark any item "Pass" unless it was executed in a real browser session.

Use checkbox notation per item:
- [ ] Pass
- [ ] Fail
- [ ] Not run

For every failure capture:
- Screenshot(s)
- Browser console errors
- Network request/response details for failing API call
- User role + route URL + timestamp

---

## 1) Owner login
- **Test steps:** Open `/login` -> sign in as owner.
- **Expected result:** Login succeeds and lands on `/jobs`.
- **Capture if fail:** Login error screenshot, browser console, Network tab auth response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 2) Owner logout
- **Test steps:** From authenticated owner session, click logout.
- **Expected result:** Session clears and returns to login.
- **Capture if fail:** Post-logout route screenshot, console, auth storage state.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 3) Signup
- **Test steps:** Open `/signup`, create new account.
- **Expected result:** Account can be created, no fake default paid plan, plan/trial selection is available.
- **Capture if fail:** Signup form screenshot, API response payload, validation errors.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 4) Forgot/reset password
- **Test steps:** Run forgot-password flow then reset-password flow.
- **Expected result:** Clear success/error states; no blank screen.
- **Capture if fail:** Screen capture at failure step, token/reset endpoint response, console.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 5) Plans / trial
- **Test steps:** Open `/plans`; review tiers and start trial/checkout paths.
- **Expected result:** Solo/Team/Pro/Enterprise visible; Pro includes 40 clients; trial works when backend configured; missing Stripe shows clear message.
- **Capture if fail:** Plans page screenshot, billing endpoint response, Stripe config errors.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 6) Jobs list
- **Test steps:** Open `/jobs` as owner/manager.
- **Expected result:** Page loads, sidebar visible, cards/buttons tappable.
- **Capture if fail:** UI screenshot, failed route/API request, console logs.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 7) Create job
- **Test steps:** Open `/jobs/new`, fill required fields, save.
- **Expected result:** Required validation works; pricing fields owner/admin-only; job persists.
- **Capture if fail:** Form state screenshot, create API response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 8) Job detail
- **Test steps:** Open a job detail route `/jobs/:id`.
- **Expected result:** Assigned worker, status badge, time/photos/notes/pricing panels render.
- **Capture if fail:** Missing panel screenshot, API response for job detail.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 9) Assign worker
- **Test steps:** In job detail, open assign flow and save.
- **Expected result:** Worker dropdown loads; conflict warning appears when applicable; assignment saves.
- **Capture if fail:** Assignment modal screenshot, save API response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 10) Worker login
- **Test steps:** Login with worker account.
- **Expected result:** Lands on worker jobs route; owner-only nav hidden.
- **Capture if fail:** Landing-route screenshot, sidebar screenshot.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 11) Worker job flow
- **Test steps:** Open worker job, acknowledge, start, pause/resume, complete, upload photo (if enabled), add note (if enabled).
- **Expected result:** Flow actions succeed; worker cannot view pricing/MYOB/payroll/plans.
- **Capture if fail:** Action-specific screenshot, endpoint response, permissions evidence.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 12) Clients
- **Test steps:** Open `/clients`, create client, open detail, test CSV import if enabled.
- **Expected result:** All core flows operate without blank/error screens.
- **Capture if fail:** Clients page screenshot, import errors/logs.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 13) Quotes
- **Test steps:** Open `/quotes`, create quote, open quote, open public link, test accept/decline if enabled.
- **Expected result:** Quote lifecycle works; public link renders.
- **Capture if fail:** Quote detail/public page screenshot, API error response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 14) Invoices
- **Test steps:** Open `/invoices`, create/open invoice, open public invoice, clear/delete, inspect Pay Now conditions.
- **Expected result:** Pay Now only shown with `payment_url`; MYOB sync remains manual-only.
- **Capture if fail:** Invoice actions screenshot, payment link state, MYOB control state.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 15) Team
- **Test steps:** Invite worker/manager/office admin/payroll, update role, remove worker, test team CSV import if enabled.
- **Expected result:** Role management and import paths work.
- **Capture if fail:** Invite dialog screenshot, role update response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 16) Payroll / Timesheets
- **Test steps:** Open `/timesheets`, switch pay periods, approve/reject manually, export CSV.
- **Expected result:** Payroll role restrictions enforced; no tax/bank/government submission.
- **Capture if fail:** Role-permission screenshot, export failure logs.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 17) Smart Hub
- **Test steps:** Open `/smart-hub`, review metrics and AI section.
- **Expected result:** Live metrics visible; AI card readable; fallback when provider missing.
- **Capture if fail:** Smart Hub screenshot, AI response payload/error.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 18) Reports
- **Test steps:** Open `/reports`, inspect sections and CSV exports.
- **Expected result:** Revenue/jobs/quotes/invoices/team sections visible; export works or returns clear auth/config error.
- **Capture if fail:** Reports section screenshot, CSV response errors.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 19) SMS
- **Test steps:** Open `/sms`, inspect balance/templates, initiate send confirmation.
- **Expected result:** Clear provider not_configured path when missing; no automatic sends.
- **Capture if fail:** SMS UI screenshot, send/balance API payload.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 20) MYOB / Integrations
- **Test steps:** Open `/integrations`, check MYOB status/settings/test-connection/connect path.
- **Expected result:** Settings save; test connection clear; no broken connect URL; no auto-sync.
- **Capture if fail:** Integrations screenshot, MYOB endpoint response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 21) Automation
- **Test steps:** Open `/automation`, verify templates/rules CRUD, open `/automation/runs`, test retry behavior.
- **Expected result:** Pause/resume/delete available; retries are safe/manual.
- **Capture if fail:** Rule/run screenshot, retry endpoint response.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 22) Launch Check
- **Test steps:** Open `/launch-check`, toggle checklist items, reset, copy summary.
- **Expected result:** Checklist persists in localStorage; reset and copy work.
- **Capture if fail:** localStorage keys screenshot, action errors.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 23) Mobile
- **Test steps:** Test common flows in mobile viewport.
- **Expected result:** Bottom nav/header usable; cards/forms/modals usable; no overlay blocks taps.
- **Capture if fail:** Mobile screenshot + viewport size + console.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 24) PWA
- **Test steps:** Validate manifest/install prompt behavior.
- **Expected result:** Manifest valid; prompt is safe/dismissible; no permanent overlay.
- **Capture if fail:** DevTools Application tab screenshot, prompt UI.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 25) Public pages
- **Test steps:** Open fake public quote/invoice tokens.
- **Expected result:** Not found message appears (no blank screen).
- **Capture if fail:** Public page screenshot + route token used.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 26) Render deploy
- **Test steps:** Push to GitHub, confirm Render frontend+backend deploy pipeline.
- **Expected result:** Both services deploy and live site opens after hard refresh.
- **Capture if fail:** Render build/deploy logs, service status screenshot.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 27) Final hard refresh
- **Test steps:** Hard refresh while authenticated on protected route.
- **Expected result:** Session recovers; no blank page after login.
- **Capture if fail:** Route recovery screenshot, console and auth API requests.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 28) Dispatch board
- **Test steps:** Open `/dispatch`, filter by worker/status/date, assign and reschedule.
- **Expected result:** Board columns render and actions are manual only.
- **Result:** [ ] Pass [ ] Fail [ ] Not run

## 29) Route planner
- **Test steps:** Open `/route-planner`, select date/worker, reorder, save sequence.
- **Expected result:** Manual order persists; optimisation fallback notice visible.
- **Result:** [ ] Pass [ ] Fail [ ] Not run
