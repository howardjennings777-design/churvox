# Manual Launch Test Checklist

Run in this exact order. For every failed step, capture:
- full-page screenshot,
- browser console screenshot/log,
- network request/response payload (if applicable),
- relevant backend log lines with timestamp.

1. **Login owner**
   - Expected: Owner can log in and lands on authenticated app without error loop.
   - Capture on fail: Login form state, auth API response, cookies/local storage.
2. **Check /jobs**
   - Expected: `/jobs` loads as default operational landing area with job list UI visible.
   - Capture on fail: URL bar, blank/error region, jobs API response.
3. **Create job**
   - Expected: Job creation succeeds and new job appears in list/detail.
   - Capture on fail: Form payload, response error, validation message.
4. **Open job detail**
   - Expected: Job detail renders with core fields and actions.
   - Capture on fail: Detail pane and failing request trace.
5. **Assign worker**
   - Expected: Worker assignment persists and is visible after refresh.
   - Capture on fail: Assignment request/response and post-refresh state.
6. **Complete job**
   - Expected: Status transition to completed works and audit/timestamp updates.
   - Capture on fail: Status control state and API response.
7. **Create client**
   - Expected: Client record saves and appears in client list/search.
   - Capture on fail: Create client request and validation errors.
8. **Open client**
   - Expected: Client profile renders with linked jobs/quotes/invoices where applicable.
   - Capture on fail: Client detail blank/error screen.
9. **Create quote**
   - Expected: Quote saves with totals and links to client/job correctly.
   - Capture on fail: Quote payload, totals calc, backend response.
10. **Open quote**
   - Expected: Quote detail page loads and displays line items/totals.
   - Capture on fail: Quote detail view and failed request.
11. **Public quote link**
   - Expected: Public quote URL opens correctly with expected public-safe data.
   - Capture on fail: Public page screenshot, HTTP status, token/link value.
12. **Create invoice**
   - Expected: Invoice creates successfully from workflow.
   - Capture on fail: Invoice create payload and error response.
13. **Open invoice**
   - Expected: Invoice detail renders and actions are available as expected.
   - Capture on fail: Invoice detail page and network errors.
14. **Public invoice link**
   - Expected: Public invoice URL renders without auth leaks or blank screen.
   - Capture on fail: Public page screenshot + response status.
15. **Clear/delete invoice**
   - Expected: Clear/delete flow works per role rules and updates list.
   - Capture on fail: Confirmation modal, API response, stale list state.
16. **Invite worker**
   - Expected: Worker invite flow completes and invite state is trackable.
   - Capture on fail: Invite form + outbound request/response.
17. **Worker login**
   - Expected: Worker can log in with role-appropriate access only.
   - Capture on fail: Login result and role claims payload.
18. **Worker job detail**
   - Expected: Worker can open assigned job details within permissions.
   - Capture on fail: Unauthorized or blank detail state.
19. **Worker acknowledge/start/complete**
   - Expected: Worker lifecycle actions function and are permission-safe.
   - Capture on fail: Action button state, API response, role checks.
20. **Timesheets/payroll page**
   - Expected: Payroll/timesheet access respects role protections; no unintended auto-changes.
   - Capture on fail: Role-based UI mismatch, unauthorized responses.
21. **Smart Hub**
   - Expected: Smart Hub page renders in Layout with readable fallback if API partial/fails.
   - Capture on fail: Blank state, smart-hub API payload.
22. **Reports**
   - Expected: Reports page renders and summary/export controls behave safely.
   - Capture on fail: CSV endpoint response/error and page UI.
23. **SMS page**
   - Expected: SMS page loads; send action is explicit/manual only (no auto-send).
   - Capture on fail: Auto-trigger evidence, send request trace.
24. **Integrations/MYOB page**
   - Expected: Integrations page renders; MYOB actions are explicit/manual only (no auto-sync).
   - Capture on fail: Sync trigger evidence and API request logs.
25. **Automation rules**
   - Expected: Automation rules list/manage UI renders without dead critical actions.
   - Capture on fail: Rules API response + broken action controls.
26. **Automation runs**
   - Expected: Automation runs page renders history/fallback states cleanly.
   - Capture on fail: Runs API response and blank/error region.
27. **Launch Check**
   - Expected: Launch Check page renders readable checks and statuses.
   - Capture on fail: Launch Check UI + backing request errors.
28. **Mobile bottom nav/taps**
   - Expected: Bottom nav visible and tap targets route correctly on mobile viewport.
   - Capture on fail: Mobile screenshot/video and route mismatch.
29. **PWA install prompt**
   - Expected: Installability conditions and prompt behavior are correct where supported.
   - Capture on fail: Browser installability diagnostics.
30. **Logout/login again**
   - Expected: Session clears and re-login works cleanly with correct role context.
   - Capture on fail: Token/session residue evidence.
31. **Render deploy check**
   - Expected: Deployed environment health check passes and key pages load.
   - Capture on fail: Deployment logs, failing endpoint URL/status.
