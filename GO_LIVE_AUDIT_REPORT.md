# Churvox no-bullshit go-live audit

Generated: 2026-05-17T20:27:22.534Z

## Verdict

✅ **STATIC AUDIT FOUND NO BLOCKERS** — still requires runtime/manual sign-off.

## Blockers

None.

## Warnings

1. **wording** — Potential bad user-facing/debug wording in CommandSuite: undefined
2. **source scan** — frontend/src/components/automation/ActionForm.js contains /placeholder/i
3. **source scan** — frontend/src/components/ui/command.jsx contains /placeholder/i
4. **source scan** — frontend/src/components/ui/input.jsx contains /placeholder/i
5. **source scan** — frontend/src/components/ui/select.jsx contains /placeholder/i
6. **source scan** — frontend/src/components/ui/textarea.jsx contains /placeholder/i
7. **source scan** — frontend/src/components/worker/WorkerContactOfficePanel.js contains /placeholder/i
8. **source scan** — frontend/src/index.js contains /placeholder/i
9. **source scan** — frontend/src/operator-machine/CommandSuite.jsx contains /TODO/i
10. **source scan** — frontend/src/operator-machine/CommandSuite.jsx contains /placeholder/i
11. **source scan** — frontend/src/operator-machine/CommandSuite.jsx contains /coming soon/i
12. **source scan** — frontend/src/operator-machine/OperatorMachine.css contains /placeholder/i
13. **source scan** — frontend/src/operator-machine/OperatorMachine.jsx contains /placeholder/i
14. **source scan** — frontend/src/pages/AIControlRoomActionPage.js contains /placeholder/i
15. **source scan** — frontend/src/pages/AIControlRoomCompletePage.js contains /placeholder/i
16. **source scan** — frontend/src/pages/AutomationPage.js contains /placeholder/i
17. **source scan** — frontend/src/pages/AutomationRunsPage.js contains /placeholder/i
18. **source scan** — frontend/src/pages/CommandHubRealPage.js contains /placeholder/i
19. **source scan** — frontend/src/pages/CommandHubTopPlayerPage.js contains /placeholder/i
20. **source scan** — frontend/src/pages/OnboardingPage.js contains /placeholder/i
21. **source scan** — frontend/src/pages/PayrollPage.js contains /placeholder/i
22. **source scan** — frontend/src/pages/PayrollPageClean.js contains /placeholder/i
23. **source scan** — frontend/src/pages/SMSPage.js contains /placeholder/i
24. **source scan** — frontend/src/pages/SMSPage.js contains /coming soon/i
25. **source scan** — frontend/src/pages/SettingsPage.js contains /placeholder/i
26. **source scan** — frontend/src/pages/TeamPage.js contains /placeholder/i
27. **source scan** — frontend/src/pages/admin/PlatformUnlock.jsx contains /placeholder/i
28. **source scan** — frontend/src/pages/auth/AdminLoginPage.js contains /placeholder/i
29. **source scan** — frontend/src/pages/auth/ForgotPasswordPage.js contains /placeholder/i
30. **source scan** — frontend/src/pages/auth/InviteSetupPage.js contains /placeholder/i
31. **source scan** — frontend/src/pages/auth/LoginPage.js contains /placeholder/i
32. **source scan** — frontend/src/pages/auth/ResetPasswordPage.js contains /placeholder/i
33. **source scan** — frontend/src/pages/auth/SignupPage.js contains /placeholder/i
34. **source scan** — frontend/src/pages/clients/ClientFormPage.js contains /placeholder/i
35. **source scan** — frontend/src/pages/clients/ClientsPage.js contains /placeholder/i
36. **source scan** — frontend/src/pages/invoices/InvoiceFormPage.js contains /placeholder/i
37. **source scan** — frontend/src/pages/invoices/InvoicesPage.js contains /placeholder/i
38. **source scan** — frontend/src/pages/jobs/JobDetailPage.js contains /placeholder/i
39. **source scan** — frontend/src/pages/jobs/JobsPage.js contains /placeholder/i
40. **source scan** — frontend/src/pages/public/PublicClientPortalPage.js contains /placeholder/i
41. **source scan** — frontend/src/pages/quotes/QuotesPage.js contains /placeholder/i
42. **source scan** — frontend/src/pages/worker/WorkerCockpitPage.js contains /placeholder/i
43. **source scan** — frontend/src/pages/worker/WorkerJobDetailPage.js contains /placeholder/i
44. **source scan** — frontend/src/shell/ChurvoxAIShell.css contains /placeholder/i
45. **source scan** — frontend/src/shell/ChurvoxAIShell.jsx contains /placeholder/i
46. **source scan** — frontend/src/shell/ChurvoxAIShell.jsx contains /coming soon/i
47. **source scan** — frontend/src/shell/ChurvoxOperatorOS.css contains /placeholder/i
48. **source scan** — backend/owner_bootstrap.py contains /TempPass123/i
49. **source scan** — backend/server.py contains /placeholder/i
50. **source scan** — backend/server.py contains /coming soon/i
51. **source scan** — backend/sms_report.txt contains /placeholder/i

## Passes

1. **files** — Found frontend/src/operator-machine/CommandSuite.jsx
2. **files** — Found frontend/src/operator-machine/OperatorMachine.jsx
3. **files** — Found frontend/src/operator-machine/renderDeployMarker.js
4. **files** — Found frontend/public/churvox-topwide-theme.css
5. **files** — Found frontend/package.json
6. **files** — Found backend/server.py
7. **quick actions** — QuickActionModal exists.
8. **modals** — DetailModal exists.
9. **pages** — SmartPage exists.
10. **quick actions** — QUICK_ACTIONS_BY_PAGE exists.
11. **quick actions** — QUICK_ACTION_FIELDS exists.
12. **routing** — normalRoute exists.
13. **routing** — routeForRecord exists.
14. **dead ends** — Dashboard metric popup cleanup marker found.
15. **quick actions** — Quick action routes and field configs scanned.
16. **backend** — Backend marker present: /api/operator/quick-create-safe
17. **backend** — Backend marker present: /api/operator/quick-create
18. **backend** — Backend marker present: /api/auth/login or login route
19. **backend** — Backend marker present: Mongo database handle
20. **backend** — Backend marker present: CORS handling
21. **backend** — Backend marker present: JSONResponse or response safety
22. **package** — Build script exists.
