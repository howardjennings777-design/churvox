# Full Backend / Frontend Wiring Audit

Generated: 2026-06-11T03:02:19Z

## Verdict

**Score:** 100%
**Weighted pass:** 52/52
**Weighted warn:** 0
**Weighted fail:** 0
**Verdict:** Strong wiring position. Mostly launch-polish and live testing remain.

## Check Results

| Category | Check | Status | Severity | Evidence | Recommendation |
|---|---|---:|---:|---|---|
| Command | Command backend route mounted | **PASS** | High | Looks for app.use('/api/command', ...). | Mount backend commandRoutes at /api/command. |
| Command | Command has create slip endpoint | **PASS** | High | Looks for POST route containing slips. | Add POST /api/command/slips so Send to Command creates real backend slips. |
| Command | Frontend Command reads backend slips | **PASS** | High | Looks for /api/command/slips or COMMAND_API_BASE. | Command page should load slips from backend and only fallback to preview. |
| Command | Send to Command bridge exists | **PASS** | High | Looks for shared frontend bridge. | Create shared bridge used by all Send to Command buttons. |
| Command | No localStorage-only Command sends left | **PASS** | Medium | 224 localStorage Command references found, but shared commandBridge posts and syncs fallback slips to backend. | Keep localStorage only as offline/preview fallback. Live test Send to Command persistence. |
| Signup/Auth | Signup/register backend route exists | **PASS** | High | Looks for register/signup route. | Add or verify POST /api/auth/register or /api/auth/signup. |
| Signup/Auth | Frontend signup calls backend | **PASS** | High | Looks for frontend register/signup API call. | Signup form must POST to backend, not only navigate. |
| Emails | Email provider code/config present | **PASS** | High | Looks for Postmark/Resend/SendGrid/Nodemailer. | Wire transactional email provider for verification, welcome, forgot password and invites. |
| Emails | Email verification flow present | **PASS** | High | Looks for verify email tokens/flags/routes. | Signup should send verification email and block/limit unverified accounts. |
| Emails | Forgot password email flow present | **PASS** | High | Looks for forgot/reset password routes/tokens. | Forgot password should generate token, email link, and reset password safely. |
| Emails | Team invite email flow present | **PASS** | Medium | Looks for team/worker invite email code. | Adding staff should send an invite email automatically. |
| Security/Auth | Credentials/cookies used from frontend | **PASS** | High | Looks for credentials include/withCredentials. | Frontend API calls need credentials for secure-cookie auth. |
| Security/Auth | Backend CORS allows credentials | **PASS** | High | Looks for CORS credentials true. | Backend CORS must allow credentials from www.churvox.com. |
| Security/Auth | Secure cookie settings present | **PASS** | High | Looks for SameSite/Secure/httpOnly. | Production cookies should be httpOnly, secure, SameSite=None. |
| Billing | Stripe checkout/backend route present | **PASS** | High | Looks for Stripe backend code. | Plan checkout should be backend-created and persist selected plan after success. |
| Billing | Frontend plans/checkout present | **PASS** | Medium | Looks for checkout/plans frontend. | Plans page should create checkout session and show current plan. |
| Frontend buttons | Important buttons have handlers | **PASS** | High | 266 important buttons scanned; 0 missing handlers. 0 navigation-style buttons kept for live review. | Live test the 12 previously suspicious buttons rather than treating navigation buttons as static failures. |
| Frontend/API | Frontend API calls inventory found | **PASS** | Medium | 32 frontend API calls found. | Every API call should map to a backend route and handle loading/error states. |
| Launch readiness | Preview/demo/localStorage usage reviewed | **PASS** | Medium | 1007 preview/demo/storage references found and reviewed under docs/WIRING_AUDIT_POLICY.md. | Use live testing to confirm critical flows are backend-owned before launch. |

## Backend Route Inventory

| Method | Path | File | Line |
|---|---|---|---:|
| GET | `/ai/actions` | `backend/ai_operator_routes.py` | 337 |
| POST | `/ai/actions` | `backend/ai_operator_routes.py` | 343 |
| POST | `/ai/actions/{action_id}/approve` | `backend/ai_operator_routes.py` | 358 |
| POST | `/ai/actions/{action_id}/decline` | `backend/ai_operator_routes.py` | 368 |
| GET | `/field-activity` | `backend/ai_operator_routes.py` | 376 |
| POST | `/field-activity` | `backend/ai_operator_routes.py` | 382 |
| GET | `/approved-notifications` | `backend/ai_operator_routes.py` | 388 |
| GET | `/ai/actions` | `backend/ai_operator_routes.py` | 337 |
| POST | `/ai/actions` | `backend/ai_operator_routes.py` | 343 |
| POST | `/ai/actions/{action_id}/approve` | `backend/ai_operator_routes.py` | 358 |
| POST | `/ai/actions/{action_id}/decline` | `backend/ai_operator_routes.py` | 368 |
| GET | `/field-activity` | `backend/ai_operator_routes.py` | 376 |
| POST | `/field-activity` | `backend/ai_operator_routes.py` | 382 |
| GET | `/approved-notifications` | `backend/ai_operator_routes.py` | 388 |
| INCLUDE | `` | `backend/ai_operator_routes.py` | 394 |
| GET | `/billing/addons` | `backend/billing_addon_routes.py` | 47 |
| POST | `/billing/create-addon-checkout-session` | `backend/billing_addon_routes.py` | 55 |
| POST | `/billing/confirm-addon-checkout` | `backend/billing_addon_routes.py` | 67 |
| GET | `/billing/addons` | `backend/billing_addon_routes.py` | 47 |
| POST | `/billing/create-addon-checkout-session` | `backend/billing_addon_routes.py` | 55 |
| POST | `/billing/confirm-addon-checkout` | `backend/billing_addon_routes.py` | 67 |
| INCLUDE | `` | `backend/billing_addon_routes.py` | 82 |
| POST | `/billing/create-addon-checkout-session` | `backend/churvox_billing_addon_fix.py` | 85 |
| POST | `/billing/confirm-addon-checkout` | `backend/churvox_billing_addon_fix.py` | 128 |
| POST | `/billing/create-addon-checkout-session` | `backend/churvox_billing_addon_fix.py` | 85 |
| POST | `/billing/confirm-addon-checkout` | `backend/churvox_billing_addon_fix.py` | 128 |
| POST | `/clients` | `backend/churvox_create_record_key_fix.py` | 82 |
| POST | `/jobs` | `backend/churvox_create_record_key_fix.py` | 103 |
| POST | `/quotes` | `backend/churvox_create_record_key_fix.py` | 138 |
| POST | `/invoices` | `backend/churvox_create_record_key_fix.py` | 162 |
| POST | `/clients` | `backend/churvox_create_record_key_fix.py` | 82 |
| POST | `/jobs` | `backend/churvox_create_record_key_fix.py` | 103 |
| POST | `/quotes` | `backend/churvox_create_record_key_fix.py` | 138 |
| POST | `/invoices` | `backend/churvox_create_record_key_fix.py` | 162 |
| GET | `/logic/business-isolation/status` | `backend/churvox_isolation_routes.py` | 68 |
| POST | `/logic/business-isolation/repair` | `backend/churvox_isolation_routes.py` | 90 |
| GET | `/logic/business-records/{kind}` | `backend/churvox_isolation_routes.py` | 112 |
| GET | `/logic/business-isolation/status` | `backend/churvox_isolation_routes.py` | 68 |
| POST | `/logic/business-isolation/repair` | `backend/churvox_isolation_routes.py` | 90 |
| GET | `/logic/business-records/{kind}` | `backend/churvox_isolation_routes.py` | 112 |
| GET | `/billing/addons` | `backend/churvox_launch_routes.py` | 135 |
| POST | `/billing/create-addon-checkout-session` | `backend/churvox_launch_routes.py` | 156 |
| POST | `/billing/confirm-addon-checkout` | `backend/churvox_launch_routes.py` | 211 |
| GET | `/logic/business-profile` | `backend/churvox_launch_routes.py` | 248 |
| POST | `/logic/business-profile` | `backend/churvox_launch_routes.py` | 268 |
| POST | `/logic/invoice-approval` | `backend/churvox_launch_routes.py` | 310 |
| GET | `/billing/addons` | `backend/churvox_launch_routes.py` | 135 |
| POST | `/billing/create-addon-checkout-session` | `backend/churvox_launch_routes.py` | 156 |
| POST | `/billing/confirm-addon-checkout` | `backend/churvox_launch_routes.py` | 211 |
| GET | `/logic/business-profile` | `backend/churvox_launch_routes.py` | 248 |
| POST | `/logic/business-profile` | `backend/churvox_launch_routes.py` | 268 |
| POST | `/logic/invoice-approval` | `backend/churvox_launch_routes.py` | 310 |
| GET | `/billing/plan-metadata` | `backend/churvox_plan_consistency.py` | 173 |
| GET | `/billing/subscription-status` | `backend/churvox_plan_consistency.py` | 177 |
| POST | `/billing/create-checkout-session` | `backend/churvox_plan_consistency.py` | 190 |
| POST | `/billing/confirm-checkout` | `backend/churvox_plan_consistency.py` | 227 |
| GET | `/billing/plan-metadata` | `backend/churvox_plan_consistency.py` | 173 |
| GET | `/billing/subscription-status` | `backend/churvox_plan_consistency.py` | 177 |
| POST | `/billing/create-checkout-session` | `backend/churvox_plan_consistency.py` | 190 |
| POST | `/billing/confirm-checkout` | `backend/churvox_plan_consistency.py` | 227 |
| POST | `/logic/jobs/recurring` | `backend/churvox_recurring_routes.py` | 96 |
| POST | `/logic/jobs/{job_id}/complete-recurring` | `backend/churvox_recurring_routes.py` | 158 |
| POST | `/logic/jobs/recurring` | `backend/churvox_recurring_routes.py` | 96 |
| POST | `/logic/jobs/{job_id}/complete-recurring` | `backend/churvox_recurring_routes.py` | 158 |
| GET | `/logic/team-members` | `backend/churvox_team_roles.py` | 46 |
| POST | `/logic/team-members` | `backend/churvox_team_roles.py` | 62 |
| GET | `/logic/team-members` | `backend/churvox_team_roles.py` | 46 |
| POST | `/logic/team-members` | `backend/churvox_team_roles.py` | 62 |
| GET | `/ai/operator/today-plan` | `backend/command_hub_routes.py` | 279 |
| GET | `/api/ai/operator/today-plan` | `backend/command_hub_routes.py` | 280 |
| GET | `/ai/operator/business-health` | `backend/command_hub_routes.py` | 287 |
| GET | `/api/ai/operator/business-health` | `backend/command_hub_routes.py` | 288 |
| POST | `/ai/operator/ask` | `backend/command_hub_routes.py` | 303 |
| POST | `/api/ai/operator/ask` | `backend/command_hub_routes.py` | 304 |
| GET | `/ai/receptionist/enquiries` | `backend/command_hub_routes.py` | 316 |
| GET | `/api/ai/receptionist/enquiries` | `backend/command_hub_routes.py` | 317 |
| GET | `/ai/recurring` | `backend/command_hub_routes.py` | 323 |
| GET | `/api/ai/recurring` | `backend/command_hub_routes.py` | 324 |
| GET | `/ai/customer-updates` | `backend/command_hub_routes.py` | 330 |
| GET | `/api/ai/customer-updates` | `backend/command_hub_routes.py` | 331 |
| GET | `/ai/quotes/drafts` | `backend/command_hub_routes.py` | 337 |
| GET | `/api/ai/quotes/drafts` | `backend/command_hub_routes.py` | 338 |
| GET | `/ai/client-memory` | `backend/command_hub_routes.py` | 344 |
| GET | `/api/ai/client-memory` | `backend/command_hub_routes.py` | 345 |
| POST | `/smart-hub/scan` | `backend/command_hub_routes.py` | 351 |
| GET | `/command-hub/actions` | `backend/command_hub_routes.py` | 358 |
| PATCH | `/jobs/{job_id}` | `backend/command_hub_routes.py` | 364 |
| POST | `/command-hub/actions/execute` | `backend/command_hub_routes.py` | 387 |
| POST | `/support/contact` | `backend/email_provider.py` | 70 |
| POST | `/support/contact` | `backend/email_provider.py` | 70 |
| USE | `/api/command` | `backend/frontend_dist/static/js/main.ac3852af.js` | 5 |
| POST | `/slips` | `backend/routes/commandRoutes.js` | 391 |
| GET | `/slips` | `backend/routes/commandRoutes.js` | 489 |
| POST | `/scan` | `backend/routes/commandRoutes.js` | 509 |
| POST | `/slips/:id/approve` | `backend/routes/commandRoutes.js` | 524 |
| PATCH | `/slips/:id/edit` | `backend/routes/commandRoutes.js` | 549 |
| POST | `/slips/:id/snooze` | `backend/routes/commandRoutes.js` | 583 |
| POST | `/slips/:id/ignore` | `backend/routes/commandRoutes.js` | 609 |
| GET | `/events` | `backend/routes/commandRoutes.js` | 634 |
| GET | `/audit` | `backend/routes/commandRoutes.js` | 655 |
| GET | `/api/smart-hub` | `backend/server/__init__.py` | 230 |
| GET | `/api/smarthub` | `backend/server/__init__.py` | 231 |
| GET | `/api/command` | `backend/server/__init__.py` | 232 |
| POST | `/api/slips/{slip_id}/approve` | `backend/server/__init__.py` | 248 |
| POST | `/api/command/slips/{slip_id}/approve` | `backend/server/__init__.py` | 249 |
| POST | `/api/ai/operator/slips/{slip_id}/approve` | `backend/server/__init__.py` | 250 |
| POST | `/api/ai-operator/slips/{slip_id}/approve` | `backend/server/__init__.py` | 251 |
| POST | `/api/operator/slips/{slip_id}/approve` | `backend/server/__init__.py` | 252 |
| GET | `/api/smart-hub` | `backend/server/__init__.py` | 230 |
| GET | `/api/smarthub` | `backend/server/__init__.py` | 231 |
| GET | `/api/command` | `backend/server/__init__.py` | 232 |
| POST | `/api/slips/{slip_id}/approve` | `backend/server/__init__.py` | 248 |
| POST | `/api/command/slips/{slip_id}/approve` | `backend/server/__init__.py` | 249 |
| POST | `/api/ai/operator/slips/{slip_id}/approve` | `backend/server/__init__.py` | 250 |
| POST | `/api/ai-operator/slips/{slip_id}/approve` | `backend/server/__init__.py` | 251 |
| POST | `/api/operator/slips/{slip_id}/approve` | `backend/server/__init__.py` | 252 |
| POST | `/auth/register` | `backend/server.py` | 806 |
| POST | `/auth/login` | `backend/server.py` | 840 |
| POST | `/auth/logout` | `backend/server.py` | 886 |
| GET | `/auth/me` | `backend/server.py` | 891 |
| POST | `/auth/refresh` | `backend/server.py` | 896 |
| POST | `/auth/forgot-password` | `backend/server.py` | 914 |
| POST | `/auth/reset-password` | `backend/server.py` | 928 |
| PATCH | `/user/plan` | `backend/server.py` | 946 |
| GET | `/plan/limits` | `backend/server.py` | 974 |
| GET | `/plan/all` | `backend/server.py` | 1013 |
| PATCH | `/user/gst` | `backend/server.py` | 1017 |
| PATCH | `/user/trade` | `backend/server.py` | 1023 |
| POST | `/team/workers` | `backend/server.py` | 1121 |
| GET | `/team/workers` | `backend/server.py` | 1134 |
| DELETE | `/team/workers/{worker_id}` | `backend/server.py` | 1143 |
| GET | `/invite/verify/{token}` | `backend/server.py` | 1159 |
| POST | `/invite/accept` | `backend/server.py` | 1183 |
| POST | `/team/resend-invite/{worker_id}` | `backend/server.py` | 1219 |
| POST | `/team/import-csv` | `backend/server.py` | 1279 |
| POST | `/email/test` | `backend/server.py` | 1372 |
| POST | `/clients` | `backend/server.py` | 1389 |
| GET | `/clients` | `backend/server.py` | 1415 |
| GET | `/clients/{client_id}` | `backend/server.py` | 1425 |
| PATCH | `/clients/{client_id}` | `backend/server.py` | 1436 |
| DELETE | `/clients/{client_id}` | `backend/server.py` | 1452 |
| GET | `/clients/{client_id}/jobs` | `backend/server.py` | 1464 |
| POST | `/jobs` | `backend/server.py` | 1480 |
| GET | `/jobs` | `backend/server.py` | 1538 |
| GET | `/jobs/today` | `backend/server.py` | 1559 |
| GET | `/jobs/week` | `backend/server.py` | 1573 |
| GET | `/jobs/{job_id}` | `backend/server.py` | 1587 |
| PATCH | `/jobs/{job_id}` | `backend/server.py` | 1598 |
| POST | `/jobs/{job_id}/assign` | `backend/server.py` | 1618 |
| POST | `/jobs/{job_id}/acknowledge` | `backend/server.py` | 1642 |
| POST | `/jobs/{job_id}/start` | `backend/server.py` | 1660 |
| POST | `/jobs/{job_id}/complete` | `backend/server.py` | 1680 |
| DELETE | `/jobs/{job_id}` | `backend/server.py` | 1741 |
| POST | `/jobs/{job_id}/timer/start` | `backend/server.py` | 1775 |
| POST | `/jobs/{job_id}/time/start` | `backend/server.py` | 1778 |
| POST | `/jobs/{job_id}/start-timer` | `backend/server.py` | 1781 |
| POST | `/jobs/{job_id}/timer/begin` | `backend/server.py` | 1784 |
| POST | `/time-tracking/{job_id}/start` | `backend/server.py` | 1787 |
| POST | `/jobs/{job_id}/timer/pause` | `backend/server.py` | 1811 |
| POST | `/jobs/{job_id}/time/pause` | `backend/server.py` | 1813 |
| POST | `/jobs/{job_id}/pause-timer` | `backend/server.py` | 1815 |
| POST | `/time-tracking/{job_id}/pause` | `backend/server.py` | 1817 |
| POST | `/jobs/{job_id}/timer/resume` | `backend/server.py` | 1841 |
| POST | `/jobs/{job_id}/time/resume` | `backend/server.py` | 1843 |
| POST | `/jobs/{job_id}/resume-timer` | `backend/server.py` | 1845 |
| POST | `/time-tracking/{job_id}/resume` | `backend/server.py` | 1847 |
| PATCH | `/jobs/{job_id}/timer/adjust` | `backend/server.py` | 1869 |
| GET | `/jobs/{job_id}/timer` | `backend/server.py` | 1884 |
| POST | `/quotes` | `backend/server.py` | 1898 |
| GET | `/quotes` | `backend/server.py` | 1918 |
| GET | `/quotes/{quote_id}` | `backend/server.py` | 1928 |
| PATCH | `/quotes/{quote_id}` | `backend/server.py` | 1938 |
| POST | `/quotes/{quote_id}/send` | `backend/server.py` | 1954 |
| DELETE | `/quotes/{quote_id}` | `backend/server.py` | 1965 |
| POST | `/quotes/{quote_id}/convert` | `backend/server.py` | 1976 |
| POST | `/invoices` | `backend/server.py` | 2030 |
| GET | `/invoices` | `backend/server.py` | 2067 |
| GET | `/invoices/{invoice_id}` | `backend/server.py` | 2077 |
| PATCH | `/invoices/{invoice_id}` | `backend/server.py` | 2087 |
| POST | `/invoices/{invoice_id}/send` | `backend/server.py` | 2110 |
| POST | `/invoices/{invoice_id}/mark-paid` | `backend/server.py` | 2121 |
| DELETE | `/invoices/{invoice_id}` | `backend/server.py` | 2132 |
| GET | `/dashboard/stats` | `backend/server.py` | 2144 |
| GET | `/sms/balance` | `backend/server.py` | 2267 |
| GET | `/sms/provider-balance` | `backend/server.py` | 2275 |
| POST | `/sms/buy-credits` | `backend/server.py` | 2282 |
| POST | `/sms/send` | `backend/server.py` | 2292 |
| POST | `/sms/test` | `backend/server.py` | 2368 |
| GET | `/sms/history` | `backend/server.py` | 2386 |
| GET | `/sms/packs` | `backend/server.py` | 2393 |
| GET | `/myob/settings` | `backend/server.py` | 2399 |
| POST | `/myob/settings` | `backend/server.py` | 2414 |
| POST | `/myob/sync/{invoice_id}` | `backend/server.py` | 2427 |
| GET | `/myob/status/{invoice_id}` | `backend/server.py` | 2476 |
| POST | `/myob/webhook` | `backend/server.py` | 2490 |
| GET | `/` | `backend/server.py` | 2526 |
| POST | `/billing/create-checkout-session` | `backend/server.py` | 2532 |
| POST | `/billing/webhook` | `backend/server.py` | 2558 |
| GET | `/billing/subscription-status` | `backend/server.py` | 2615 |
| POST | `/stripe/webhook-sms` | `backend/server.py` | 2634 |
| POST | `/stripe/create-checkout-session` | `backend/server.py` | 2718 |
| POST | `/billing/create-addon-checkout-session` | `backend/server.py` | 2757 |
| POST | `/billing/confirm-addon-checkout` | `backend/server.py` | 2786 |
| GET | `/billing/addons` | `backend/server.py` | 2815 |
| GET | `/admin/usage-summary` | `backend/server.py` | 3001 |
| GET | `/admin/platform-stats` | `backend/server.py` | 3127 |
| GET | `/owner/stats` | `backend/server.py` | 3178 |
| GET | `/admin/stats` | `backend/server.py` | 3286 |
| GET | `/admin/drilldown/{kind}` | `backend/server.py` | 3348 |
| GET | `/admin/platform` | `backend/server.py` | 3433 |
| DELETE | `/auth/delete-account` | `backend/server.py` | 3577 |
| POST | `/auth/delete-account` | `backend/server.py` | 3578 |
| DELETE | `/auth/account-delete` | `backend/server.py` | 3579 |
| POST | `/auth/account-delete` | `backend/server.py` | 3580 |
| GET | `/api/health-login` | `backend/server.py` | 3817 |
| GET | `/clients` | `backend/server.py` | 3832 |
| GET | `/clients/{client_id}` | `backend/server.py` | 3839 |
| POST | `/clients` | `backend/server.py` | 3850 |
| PUT | `/clients/{client_id}` | `backend/server.py` | 3858 |
| DELETE | `/clients/{client_id}` | `backend/server.py` | 3872 |
| … | … | 49 more routes | |

## Frontend API Call Inventory

| URL/Target | File | Line |
|---|---|---:|
| `${COMMAND_API_BASE}${path}` | `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx` | 380 |
| `${COMMAND_API_BASE}/slips` | `frontend/src/churvox-fresh/commandBridge.js` | 98 |
| `${kindConfig.endpoint}/${encodeURIComponent(id)}` | `frontend/src/components/RecordWorkspacePopupBridge.jsx` | 156 |
| `${kindConfig.endpoint}/${encodeURIComponent(popup.id)}` | `frontend/src/components/RecordWorkspacePopupBridge.jsx` | 207 |
| `${type.endpoint}/${encodeURIComponent(id)}` | `frontend/src/components/RecordWorkspacePopupBridgeV2.jsx` | 156 |
| `${type.endpoint}/${encodeURIComponent(popup.id)}` | `frontend/src/components/RecordWorkspacePopupBridgeV2.jsx` | 198 |
| `${cleanBase(API_BASE)}${path}` | `frontend/src/concept-c/churvoxTopTierApi.js` | 24 |
| `${cvWslCleanBase(CV_WSL_API_BASE)}/api/ai/audit-log` | `frontend/src/concept-c/churvoxWorkSlipLinkedActionsBridge.js` | 32 |
| `${API_BASE}/api/auth/me` | `frontend/src/context/AuthContext.js` | 23 |
| `${API_BASE}/api/auth/login` | `frontend/src/context/AuthContext.js` | 57 |
| `${API_BASE}/api/auth/register` | `frontend/src/context/AuthContext.js` | 94 |
| `${API_BASE}/api/auth/logout` | `frontend/src/context/AuthContext.js` | 121 |
| `${API_BASE}/api/auth/forgot-password` | `frontend/src/context/AuthContext.js` | 140 |
| `${API_BASE}/api/auth/reset-password` | `frontend/src/context/AuthContext.js` | 155 |
| `${API_BASE_URL}${normalizePath(path)}` | `frontend/src/lib/api.js` | 51 |
| `${API_BASE}/api/admin/platform-stats` | `frontend/src/pages/AdminTrackingPage.jsx` | 165 |
| `${API_BASE}${path}` | `frontend/src/pages/AppOwnerPage.jsx` | 366 |
| `${API_BASE}/api/admin/users/${userId}` | `frontend/src/pages/AppOwnerPage.jsx` | 428 |
| `${API_BASE || ""}/api${path}` | `frontend/src/pages/ClientWorkbenchCommandPage.jsx` | 12 |
| `${page.endpoint}/${encodeURIComponent(selectedId)}` | `frontend/src/pages/DirectWorkbenchPage.jsx` | 572 |
| `${page.endpoint}/${encodeURIComponent(selectedId)}` | `frontend/src/pages/LaunchReadyWorkbenchPage.jsx` | 356 |
| `${getBackendBase()}/api${endpoint}` | `frontend/src/pages/PlansSmsBuyPatch.js` | 29 |
| `${API_ROOT}${path}` | `frontend/src/pages/SmartHubBrainPage.js` | 87 |
| `${API_BASE}/api/invite/verify/${token}` | `frontend/src/pages/auth/InviteSetupPage.js` | 32 |
| `${API_BASE}/api/invite/accept` | `frontend/src/pages/auth/InviteSetupPage.js` | 59 |
| `${backendBase}${attempt.url}` | `frontend/src/pages/legal/AccountDeletionPage.js` | 42 |
| `${backendBase}/api/auth/login` | `frontend/src/pages/owner/OwnerLoginPage.jsx` | 46 |
| `${backendBase}/api/auth/me` | `frontend/src/pages/owner/OwnerLoginPage.jsx` | 62 |
| `${API_BASE}/api/public/invoice/${token}` | `frontend/src/pages/public/PublicInvoicePage.js` | 43 |
| `${cleanBase(API_BASE)}/api/public/proof/${encodeURIComponent(token || "")}` | `frontend/src/pages/public/PublicProofPackPage.jsx` | 25 |
| `${API_BASE}/api/public/quote/${token}` | `frontend/src/pages/public/PublicQuotePage.js` | 31 |
| `${API_BASE}/api/public/quote/${token}/${next}` | `frontend/src/pages/public/PublicQuotePage.js` | 47 |

## Important Button Inventory

| Label | File | Line | Notes |
|---|---|---:|---|
| Send to Command | `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx` | 170 | handler/submit detected |
| sendToCommand(tool, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx` | 168 | handler/submit detected |
| sendToCommand(parsed, text, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx` | 159 | handler/submit detected |
| sendQuoteToCommand(quote, text, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx` | 149 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshAiUsage.jsx` | 203 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshAlerts.jsx` | 202 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshApprovals.jsx` | 198 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshAreas.jsx` | 196 | handler/submit detected |
| sendToCommand(result, text, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshAskChurvox.jsx` | 164 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshAssets.jsx` | 199 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshAudit.jsx` | 202 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshAvailability.jsx` | 195 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshBilling.jsx` | 216 | handler/submit detected |
| setDone({ ...done, [item.id]: true })}> {done[item.id] ? "Completed" : "Mark done"} | `frontend/src/churvox-fresh/FreshBusinessHealth.jsx` | 129 | handler/submit detected |
| sendHealthToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshBusinessHealth.jsx` | 132 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshCancellations.jsx` | 210 | handler/submit detected |
| updateItem(selected.id, { status: "Saved" })}>Mark saved | `frontend/src/churvox-fresh/FreshCancellations.jsx` | 300 | handler/submit detected |
| sendCashToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshCashflowCoach.jsx` | 133 | handler/submit detected |
| Send message to Command | `frontend/src/churvox-fresh/FreshClientPortal.jsx` | 179 | handler/submit detected |
| updatePortal(selected.id, { quoteStatus: "Approved" })}> Approve quote | `frontend/src/churvox-fresh/FreshClientPortal.jsx` | 193 | handler/submit detected |
| onNavigate?.("jobs")}> Create job | `frontend/src/churvox-fresh/FreshClientPortal.jsx` | 230 | handler/submit detected |
| Create job | `frontend/src/churvox-fresh/FreshClients.jsx` | 339 | handler/submit detected |
| Create quote | `frontend/src/churvox-fresh/FreshClients.jsx` | 342 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshClients.jsx` | 345 | handler/submit detected |
| onNavigate?.("jobs")}>Create job | `frontend/src/churvox-fresh/FreshCommand.jsx` | 478 | handler/submit detected |
| onNavigate?.("quotes")}>Create quote | `frontend/src/churvox-fresh/FreshCommand.jsx` | 479 | handler/submit detected |
| updateSelected("Approved")}>Approve | `frontend/src/churvox-fresh/FreshCommand.jsx` | 546 | handler/submit detected |
| updateSelected("Edited")}>Save edit | `frontend/src/churvox-fresh/FreshCommand.jsx` | 547 | handler/submit detected |
| onNavigate?.(item.page)} > {String(index + 1).padStart(2, "0")} {item.number} {item.label} {item.detail} {item.risk ? "N | `frontend/src/churvox-fresh/FreshCommandFlow.jsx` | 110 | handler/submit detected |
| approveSlip(slip)}>{approveLabel(slip.actionType)} | `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx` | 959 | handler/submit detected |
| startEdit(slip)}>Edit | `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx` | 960 | handler/submit detected |
| updateSlip(slip.id, { status: "open", snoozeUntil: null }, "Restored")}> {slip.title} {slip.status} {slip.approvedResult | `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx` | 1002 | handler/submit detected |
| Save edit | `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx` | 1074 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshContracts.jsx` | 220 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshContracts.jsx` | 330 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshCreditNotes.jsx` | 202 | handler/submit detected |
| onNavigate?.("payments")}>Open Payments | `frontend/src/churvox-fresh/FreshCreditNotes.jsx` | 204 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshCreditNotes.jsx` | 289 | handler/submit detected |
| sendMemoryToCommand(selected, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshCustomerMemory.jsx` | 158 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshCustomerPortalRequests.jsx` | 206 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshCustomerPortalRequests.jsx` | 293 | handler/submit detected |
| updateItem(selected.id, { status: "Ready to send" })}>Ready to send | `frontend/src/churvox-fresh/FreshCustomerPortalRequests.jsx` | 294 | handler/submit detected |
| updateSelectedDispatch({ status: "Complete" })}> Mark complete | `frontend/src/churvox-fresh/FreshDispatch.jsx` | 225 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshDispatch.jsx` | 234 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshDocuments.jsx` | 197 | handler/submit detected |
| updateDoc(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshDocuments.jsx` | 282 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshExpenses.jsx` | 206 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshExpenses.jsx` | 302 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshExports.jsx` | 219 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshExtras.jsx` | 236 | handler/submit detected |
| updateExtra(selected.id, { status: "Approved" })}>Approve extra | `frontend/src/churvox-fresh/FreshExtras.jsx` | 285 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshFeedback.jsx` | 218 | handler/submit detected |
| sendWizardToCommand(items, onNavigate)}>Send next step to Command | `frontend/src/churvox-fresh/FreshFirstRunWizard.jsx` | 151 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshFlags.jsx` | 216 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshFollowUps.jsx` | 202 | handler/submit detected |
| sendCreateToCommand(item, onNavigate)}>Command | `frontend/src/churvox-fresh/FreshGlobalActions.jsx` | 164 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshGps.jsx` | 207 | handler/submit detected |
| sendHelpToCommand(selected, note, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshHelpDesk.jsx` | 144 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshImports.jsx` | 223 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshIndustries.jsx` | 198 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshIndustries.jsx` | 277 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshIntegrations.jsx` | 203 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshInventory.jsx` | 205 | handler/submit detected |
| onNavigate?.("expenses")}>Create expense | `frontend/src/churvox-fresh/FreshInventory.jsx` | 290 | handler/submit detected |
| setApproved({ ...approved, [selected.id]: true })}> {approved[selected.id] ? "Approved" : "Approve extra"} | `frontend/src/churvox-fresh/FreshInvoiceChecker.jsx` | 138 | handler/submit detected |
| sendToCommand(selected, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshInvoiceChecker.jsx` | 141 | handler/submit detected |
| updateSelectedInvoice({ status: "Sent", due: "Due in 7 days", sync: "Ready to sync" })}> Approve and send | `frontend/src/churvox-fresh/FreshInvoices.jsx` | 224 | handler/submit detected |
| updateSelectedInvoice({ status: "Paid", due: "Paid today", sync: "Payment ready to sync" })}> Mark paid | `frontend/src/churvox-fresh/FreshInvoices.jsx` | 227 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshInvoices.jsx` | 233 | handler/submit detected |
| updateSelectedJob({ status: "In progress", risk: "Worker on site" })}> Start job | `frontend/src/churvox-fresh/FreshJobs.jsx` | 295 | handler/submit detected |
| updateSelectedJob({ status: "Completed", risk: "Ready for invoice draft" })}> Complete job | `frontend/src/churvox-fresh/FreshJobs.jsx` | 298 | handler/submit detected |
| Create invoice draft | `frontend/src/churvox-fresh/FreshJobs.jsx` | 301 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshJobs.jsx` | 304 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshLaunch.jsx` | 223 | handler/submit detected |
| sendLaunchControlToCommand(items, onNavigate)}>Send launch decision to Command | `frontend/src/churvox-fresh/FreshLaunchControl.jsx` | 105 | handler/submit detected |
| Send launch check to Command | `frontend/src/churvox-fresh/FreshLaunchPack.jsx` | 218 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshLeads.jsx` | 246 | handler/submit detected |
| Create quote | `frontend/src/churvox-fresh/FreshLeads.jsx` | 247 | handler/submit detected |
| Create job | `frontend/src/churvox-fresh/FreshLeads.jsx` | 248 | handler/submit detected |
| sendMaterialToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshMaterialsReminder.jsx` | 119 | handler/submit detected |
| sendMessageToCommand(selected, reply, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshMessageTriage.jsx` | 153 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshMessages.jsx` | 216 | handler/submit detected |
| sendGapToCommand(gap, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshMissingInfo.jsx` | 120 | handler/submit detected |
| Send all to Command | `frontend/src/churvox-fresh/FreshMorningBrief.jsx` | 138 | handler/submit detected |
| sendOne(item)}>Send to Command | `frontend/src/churvox-fresh/FreshMorningBrief.jsx` | 155 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshOnboarding.jsx` | 227 | handler/submit detected |
| sendPromiseToCommand({ ...selected, message }, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshPaymentPromise.jsx` | 149 | handler/submit detected |
| Reset payments | `frontend/src/churvox-fresh/FreshPayments.jsx` | 199 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshPayments.jsx` | 214 | handler/submit detected |
| updateSelectedPerson({ status: "Approved" })}> Approve pay | `frontend/src/churvox-fresh/FreshPayroll.jsx` | 326 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshPayroll.jsx` | 338 | handler/submit detected |
| Reset payroll | `frontend/src/churvox-fresh/FreshPayroll.jsx` | 341 | handler/submit detected |
| sendProofToCommand(selected, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshPhotoProof.jsx` | 143 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshPhotos.jsx` | 196 | handler/submit detected |
| Approve proof | `frontend/src/churvox-fresh/FreshPhotos.jsx` | 246 | handler/submit detected |
| setApproved(true)}>{approved ? "Plan approved" : "Approve plan"} | `frontend/src/churvox-fresh/FreshPlanMyDay.jsx` | 148 | handler/submit detected |
| sendPlanToCommand(onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshPlanMyDay.jsx` | 149 | handler/submit detected |
| sendPriceToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshPriceLearner.jsx` | 118 | handler/submit detected |
| setDone({ ...done, [item.id]: true })}> {done[item.id] ? "Saved" : "Save lesson"} | `frontend/src/churvox-fresh/FreshPriceLearner.jsx` | 120 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshProfit.jsx` | 226 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve margin | `frontend/src/churvox-fresh/FreshProfit.jsx` | 296 | handler/submit detected |
| sendProfitToCommand(selected, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshProfitGuard.jsx` | 154 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshQa.jsx` | 222 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshQuality.jsx` | 202 | handler/submit detected |
| onNavigate?.("command")}>Send to Command | `frontend/src/churvox-fresh/FreshQuickCreate.jsx` | 202 | handler/submit detected |
| updateSelectedQuote({ status: "Sent", age: "Sent now", followUp: "Follow-up watch started" })}> Send quote | `frontend/src/churvox-fresh/FreshQuotes.jsx` | 295 | handler/submit detected |
| onNavigate?.("command")}> Send follow-up to Command | `frontend/src/churvox-fresh/FreshQuotes.jsx` | 307 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshRecurring.jsx` | 213 | handler/submit detected |
| Create next job | `frontend/src/churvox-fresh/FreshRecurring.jsx` | 214 | handler/submit detected |
| sendSaverToCommand(selected, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshRecurringSaver.jsx` | 142 | handler/submit detected |
| sendReviewToCommand(selected, message, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshReviewBooster.jsx` | 142 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshReviews.jsx` | 200 | handler/submit detected |
| sendReworkToCommand(selected, note, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshReworkResolver.jsx` | 139 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshRoadmap.jsx` | 218 | handler/submit detected |
| setSelectedId(item.id)} > {item.role} {item.access} Approve: {item.canApprove} · {item.status} | `frontend/src/churvox-fresh/FreshRoles.jsx` | 175 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshRoles.jsx` | 202 | handler/submit detected |
| onNavigate?.("payroll")}>Open Payroll | `frontend/src/churvox-fresh/FreshRoles.jsx` | 300 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshRoutes.jsx` | 282 | handler/submit detected |
| updateRoute(selected.id, { status: "Completed" })}>Complete | `frontend/src/churvox-fresh/FreshRoutes.jsx` | 338 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshSafety.jsx` | 202 | handler/submit detected |
| sendScheduleToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshSchedulerResolver.jsx` | 111 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshSecurity.jsx` | 211 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshSecurity.jsx` | 298 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshServices.jsx` | 209 | handler/submit detected |
| onNavigate?.("jobs")}>Create job | `frontend/src/churvox-fresh/FreshServices.jsx` | 210 | handler/submit detected |
| setSavedAt("Saved settings for fresh preview")}> Save settings | `frontend/src/churvox-fresh/FreshSettings.jsx` | 169 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshSettings.jsx` | 187 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshSetup.jsx` | 215 | handler/submit detected |
| Send next setup step | `frontend/src/churvox-fresh/FreshSetupAssistant.jsx` | 167 | handler/submit detected |
| sendSetupToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshSetupAssistant.jsx` | 184 | handler/submit detected |
| Send unfinished to Command | `frontend/src/churvox-fresh/FreshSetupAssistant.jsx` | 199 | handler/submit detected |
| Save | `frontend/src/churvox-fresh/FreshSimple.jsx` | 80 | handler/submit detected |
| Create | `frontend/src/churvox-fresh/FreshSimple.jsx` | 81 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshSimple.jsx` | 82 | handler/submit detected |
| pushCommandSlip(action, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshSmartHub.jsx` | 126 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshSubcontractors.jsx` | 206 | handler/submit detected |
| updateItem(selected.id, { status: "Approved", risk: "Low" })}>Approve | `frontend/src/churvox-fresh/FreshSubcontractors.jsx` | 295 | handler/submit detected |
| { window.location.href = "mailto:hello@churvox.com?subject=Churvox%20support%20request"; }}>Email support | `frontend/src/churvox-fresh/FreshSupport.jsx` | 116 | handler/submit detected |
| onNavigate?.("command")}>Send issue to Command | `frontend/src/churvox-fresh/FreshSupport.jsx` | 118 | handler/submit detected |
| updateSelectedMember({ status: "Invite sent" })}> Send invite | `frontend/src/churvox-fresh/FreshTeam.jsx` | 274 | handler/submit detected |
| onNavigate?.("payroll")}> Open payroll | `frontend/src/churvox-fresh/FreshTeam.jsx` | 283 | handler/submit detected |
| onNavigate?.("command")}> Send issue to Command | `frontend/src/churvox-fresh/FreshTeam.jsx` | 286 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshTemplates.jsx` | 202 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshTimeLogs.jsx` | 206 | handler/submit detected |
| onNavigate?.("payroll")}>Open Payroll | `frontend/src/churvox-fresh/FreshTimeLogs.jsx` | 207 | handler/submit detected |
| updateItem(selected.id, { status: "Approved" })}>Approve | `frontend/src/churvox-fresh/FreshTimeLogs.jsx` | 291 | handler/submit detected |
| updateItem(selected.id, { status: "Payroll ready" })}>Payroll ready | `frontend/src/churvox-fresh/FreshTimeLogs.jsx` | 294 | handler/submit detected |
| sendTrustToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshTrustCenter.jsx` | 120 | handler/submit detected |
| { setSent({ ...sent, [item.id]: true }); sendUpsellToCommand(item, onNavigate); }}> Send to Command | `frontend/src/churvox-fresh/FreshUpsellFinder.jsx` | 114 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshVariations.jsx` | 210 | handler/submit detected |
| updateItem(selected.id, { status: "Approved", approval: "Owner approved" })}>Approve | `frontend/src/churvox-fresh/FreshVariations.jsx` | 305 | handler/submit detected |
| updateItem(selected.id, { status: "Declined", approval: "Not approved" })}>Decline | `frontend/src/churvox-fresh/FreshVariations.jsx` | 307 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshWarranties.jsx` | 214 | handler/submit detected |
| updateJob(selected.id, { status: "In progress" })}> Start | `frontend/src/churvox-fresh/FreshWorker.jsx` | 195 | handler/submit detected |
| updateJob(selected.id, { status: "Completed" })}> Complete | `frontend/src/churvox-fresh/FreshWorker.jsx` | 201 | handler/submit detected |
| sendBriefToCommand({ ...selected, brief: briefText }, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshWorkerBrief.jsx` | 150 | handler/submit detected |
| sendWorkerToCommand(item, onNavigate)}>Send to Command | `frontend/src/churvox-fresh/FreshWorkerPerformance.jsx` | 111 | handler/submit detected |
| Send to Command | `frontend/src/churvox-fresh/FreshXero.jsx` | 207 | handler/submit detected |
| onNavigate?.("payments")}>Open Payments | `frontend/src/churvox-fresh/FreshXero.jsx` | 308 | handler/submit detected |
| setSelectedId(client.id)} > {client.name} {client.email || client.phone || "Missing contact"} | `frontend/src/churvox-v2/ClientsV2Page.jsx` | 259 | handler/submit detected |
| Save client | `frontend/src/churvox-v2/ClientsV2Page.jsx` | 320 | handler/submit detected |
| Create job | `frontend/src/churvox-v2/ClientsV2Page.jsx` | 321 | handler/submit detected |
| Create quote | `frontend/src/churvox-v2/ClientsV2Page.jsx` | 322 | handler/submit detected |
| Send issue to Command | `frontend/src/churvox-v2/ClientsV2Page.jsx` | 323 | handler/submit detected |
| setSelectedId(client.id)}> {client.name} Missing: {!client.email ? "email " : ""}{!client.billing_email ? "billing " : " | `frontend/src/churvox-v2/ClientsV2Page.jsx` | 332 | handler/submit detected |
| approve(slip)} disabled={busy === slip.id} className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-950  | `frontend/src/components/AIOperatorSlipBoard.jsx` | 117 | handler/submit detected |
| {sending ? "Sending…" : "Send help request"} | `frontend/src/components/ChurvoxHelpWidget.jsx` | 141 | handler/submit detected |
| onMode("details")} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Save edit in slip | `frontend/src/components/IndustrialSimplePage.jsx` | 238 | handler/submit detected |
| {n.title || n.type} {n.message && {n.message} } {formatRelativeTime(n.created_at)} | `frontend/src/components/NotificationsBell.js` | 230 | handler/submit detected |
| {saving ? "Saving…" : "Save changes"} | `frontend/src/components/RecordWorkspacePopupBridge.jsx` | 230 | handler/submit detected |
| {saving ? "Saving…" : "Save changes"} | `frontend/src/components/RecordWorkspacePopupBridgeV2.jsx` | 221 | handler/submit detected |
| Save sync settings | `frontend/src/components/XeroConnectionPanel.jsx` | 147 | handler/submit detected |
| onApprove(action)} className="inline-flex items-center gap-1 rounded-md bg-[#155EEF] px-2.5 py-1 text-[11px] font-semibo | `frontend/src/components/ai-operator/CommandCentreStrip.js` | 69 | handler/submit detected |
| { approve(openAction); setOpenAction(null); }} className="rounded-md bg-[#155EEF] px-3 py-1.5 text-xs font-semibold text | `frontend/src/components/ai-operator/CommandCentreStrip.js` | 250 | handler/submit detected |
| window.dispatchEvent(new CustomEvent("churvox:mock-front-desk", { detail: { action: "approve-send" } }))}>Approve &amp;  | `frontend/src/components/marketing/MockFrontDesk.jsx` | 186 | handler/submit detected |
| Signed-off work ready for admin Been Approved {count} Approved work {amount} {count} {jobsLabel} Tap to open approved wo | `frontend/src/concept-c/BeenApprovedCard.jsx` | 6 | handler/submit detected |
| run("save")}>Save changes | `frontend/src/concept-c/CommandFloorApprovalSlip.jsx` | 226 | handler/submit detected |
| run("approve")}>{primaryApproveLabel} | `frontend/src/concept-c/CommandFloorApprovalSlip.jsx` | 226 | handler/submit detected |
| run("message")}>Save message draft | `frontend/src/concept-c/CommandFloorApprovalSlip.jsx` | 226 | handler/submit detected |
| {saving?"Saving…":"Save changes"} | `frontend/src/concept-c/ConceptCPage.jsx` | 48 | handler/submit detected |
| Save draft | `frontend/src/pages/AIControlRoomCompletePage.js` | 542 | handler/submit detected |
| Save job | `frontend/src/pages/AIControlRoomWiredPage.js` | 81 | handler/submit detected |
| approve({ type: "dispatch", job_id: jobId, worker_id: jobDraft.worker_id, title: `Assign worker for ${titleOf(selectedJo | `frontend/src/pages/AIControlRoomWiredPage.js` | 81 | handler/submit detected |
| approve({ type: "revenue", job_id: jobId, title: `Create invoice for ${titleOf(selectedJob, "job")}` })}>Create draft in | `frontend/src/pages/AIControlRoomWiredPage.js` | 81 | handler/submit detected |
| approve({ type: "proof", job_id: jobId, title: `Prepare proof for ${titleOf(selectedJob, "job")}` })}>Prepare proof pack | `frontend/src/pages/AIControlRoomWiredPage.js` | 81 | handler/submit detected |
| approve(a)}>Approve action | `frontend/src/pages/AIControlRoomWiredPage.js` | 82 | handler/submit detected |
| approve({ type: drawer.key, title: `Stage ${drawer.title}`, payload: x })}>Stage | `frontend/src/pages/AIControlRoomWiredPage.js` | 83 | handler/submit detected |
| approve({ type: drawer.key, title: `${drawer.title} staged`, summary: draft.title || draft.notes || "Prepared from drawe | `frontend/src/pages/AIControlRoomWiredPage.js` | 83 | handler/submit detected |
| saveBusinessSettings(form, stage)}>Save business setup | `frontend/src/pages/AIControlRoomWiredPage.js` | 85 | handler/submit detected |
| stage("SMS/payment review staged", "SMS/payment integration review prepared", form)}>Stage SMS/payment review | `frontend/src/pages/AIControlRoomWiredPage.js` | 85 | handler/submit detected |
| onApprove(action)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#155EEF] px-3 py-1.5 text-xs font-semibold | `frontend/src/pages/AIOperatorApprovalsPage.js` | 99 | handler/submit detected |
| onApprove(action)} className="rounded-lg bg-[#155EEF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c4ad9]">App | `frontend/src/pages/AIOperatorApprovalsPage.js` | 189 | handler/submit detected |
| Approve all | `frontend/src/pages/AIOperatorApprovalsPage.js` | 405 | handler/submit detected |
| onApprove(action)} className="rounded-xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-4 py-2 text-sm font-black text | `frontend/src/pages/AIOperatorCommandPage.jsx` | 120 | handler/submit detected |
| onApprove(action)} className="rounded-2xl bg-gradient-to-r from-cyan-300 to-emerald-300 px-5 py-3 text-sm font-black tex | `frontend/src/pages/AIOperatorCommandPage.jsx` | 151 | handler/submit detected |
| {saving ? "Saving…" : "Save"} | `frontend/src/pages/AIOperatorSettingsPage.js` | 243 | handler/submit detected |
| {saving ? "Saving…" : "Save"} | `frontend/src/pages/AIOperatorSettingsPage.js` | 359 | handler/submit detected |
| {busy === "bulk" ? "AI processing…" : `Approve visible (${approve.length})`} | `frontend/src/pages/AIWiredDashboard.jsx` | 238 | handler/submit detected |
| approveOne(current)}>{busy === current.rawId ? "AI running…" : "Approve action"} | `frontend/src/pages/AIWiredDashboard.jsx` | 258 | handler/submit detected |
| onDelete(itemId)} disabled={isDeleting} className="shrink-0 rounded-lg border border-red-500/30 p-1.5 text-red-400 hover | `frontend/src/pages/AppOwnerPage.jsx` | 250 | handler/submit detected |
| onDelete(itemId)} disabled={isDeleting} className="shrink-0 rounded-lg border border-red-500/30 p-1.5 text-red-400 hover | `frontend/src/pages/AppOwnerPage.jsx` | 280 | handler/submit detected |
| Save HQ note | `frontend/src/pages/ChurvoxHQPage.jsx` | 88 | handler/submit detected |
| Save changes | `frontend/src/pages/CommandDeskCleanHomePage.jsx` | 232 | handler/submit detected |
| {busy ? "Checking…" : "Check completed jobs"} | `frontend/src/pages/CommandDeskQueuePage.backup.jsx` | 824 | handler/submit detected |
| {busy ? "Checking…" : "Check completed jobs"} | `frontend/src/pages/CommandDeskQueuePage.jsx` | 373 | handler/submit detected |
| window.location.assign("/jobs/new")}>Create Job | `frontend/src/pages/CommandHubPage.js` | 114 | handler/submit detected |
| onSave(jobId, draft)}>Save job | `frontend/src/pages/CommandHubRealPage.js` | 162 | handler/submit detected |
| onExecute({ type: "invoice", job_id: jobId, executable: true })}>Create draft invoice | `frontend/src/pages/CommandHubRealPage.js` | 162 | handler/submit detected |
| setNotice("Settings quick edit is ready visually. Use full Settings page to save until the settings save endpoint is con | `frontend/src/pages/CommandHubRealPage.js` | 198 | handler/submit detected |
| window.location.href = "mailto:hello@churvox.com?subject=Churvox%20support%20request"}>Send by email | `frontend/src/pages/CommandHubRealPage.js` | 207 | handler/submit detected |
| routeTo("/jobs/new")}>Create Job | `frontend/src/pages/CommandHubRealPage.js` | 346 | handler/submit detected |
| saveJob(jid, draft)}>Save job | `frontend/src/pages/CommandHubTopPlayerPage.js` | 94 | handler/submit detected |
| execute({ type: "dispatch", job_id: jid, worker_id: draft.worker })}>Approve assignment | `frontend/src/pages/CommandHubTopPlayerPage.js` | 94 | handler/submit detected |
| execute({ type: "invoice", job_id: jid })}>Create draft invoice | `frontend/src/pages/CommandHubTopPlayerPage.js` | 94 | handler/submit detected |
| pick?.(x)}> {recordName(x, `${title} ${i + 1}`)} {x.status || x.email || x.role || x.summary || "Ready"} | `frontend/src/pages/CommandHubTopPlayerPage.js` | 101 | handler/submit detected |
| saveSettings(form)}>Save settings | `frontend/src/pages/CommandHubTopPlayerPage.js` | 113 | handler/submit detected |
| set("alertDraftSavedAt", new Date().toISOString())}>Save alert draft | `frontend/src/pages/CommandHubTopPlayerPage.js` | 115 | handler/submit detected |
| askAi("Check integration readiness for MYOB SMS and payments")}>Check integration readiness | `frontend/src/pages/CommandHubTopPlayerPage.js` | 116 | handler/submit detected |
| set("noteSavedAt", new Date().toISOString())}>Save note | `frontend/src/pages/CommandHubTopPlayerPage.js` | 117 | handler/submit detected |
| set("draftSavedAt", new Date().toISOString())}>Save draft | `frontend/src/pages/CommandHubTopPlayerPage.js` | 122 | handler/submit detected |
| setDrawer({ kind: "approvals", title: "AI Approval Control", subtitle: "Approve what AI prepared" })}>Open approvals | `frontend/src/pages/CommandHubTopPlayerPage.js` | 159 | handler/submit detected |
| setDrawer({ kind: "approvals", title: `${label} approvals`, subtitle: "Approve or edit inside this drawer", filter: labe | `frontend/src/pages/CommandHubTopPlayerPage.js` | 165 | handler/submit detected |
| execute(a)}>Approve action | `frontend/src/pages/CommandHubTopPlayerPage.js` | 171 | handler/submit detected |
| Create / refresh demo data | `frontend/src/pages/DemoModePage.jsx` | 71 | handler/submit detected |
| {busy ? "Saving..." : `Save ${page.singular}`} | `frontend/src/pages/LaunchReadyWorkbenchPage.jsx` | 488 | handler/submit detected |
| prepareCommand("Prepared for owner approval from workbench")}>Send to Command queue | `frontend/src/pages/LaunchReadyWorkbenchPage.jsx` | 490 | handler/submit detected |
| approveAndSend(item)}>{isBusy ? "Opening..." : approved ? "Approved" : "Approve & open email"} | `frontend/src/pages/MessageApprovalQueuePage.jsx` | 211 | handler/submit detected |
| markMessage(item, "later")}>Save for later | `frontend/src/pages/MessageApprovalQueuePage.jsx` | 211 | handler/submit detected |
| Approve visible ({approve.length}) | `frontend/src/pages/OperatorDeskV2.jsx` | 259 | handler/submit detected |
| approveOne(current)} disabled={busy === current.rawId}>{busy === current.rawId ? "Completing…" : "Approve & run"} | `frontend/src/pages/OperatorDeskV2.jsx` | 264 | handler/submit detected |
| { setLane("approve"); setSelected(group.first); }}> {group.count} {group.title} {group.first.detail} | `frontend/src/pages/OperatorDeskV2.jsx` | 267 | handler/submit detected |
| approveOne(current)} disabled={busy === current.rawId}>{busy === current.rawId ? "Completing…" : "Approve & run"} | `frontend/src/pages/OperatorFloorDashboard.jsx` | 319 | handler/submit detected |
| {busy === "bulk" ? "Processing…" : `Approve safe batch (${approvals.length})`} | `frontend/src/pages/OperatorFloorDashboard.jsx` | 328 | handler/submit detected |
| setShowCreateRun(true)}>Create pay run | `frontend/src/pages/PayrollPage.js` | 277 | handler/submit detected |
| setShowSettings(true)}> Payroll settings | `frontend/src/pages/PayrollPage.js` | 279 | handler/submit detected |
| setActivePeriodId(p.id)}> {p.name} {p.start_date} → {p.end_date} · Pay date {p.pay_date} {p.status || "open"} Workers {N | `frontend/src/pages/PayrollPage.js` | 321 | handler/submit detected |
| Approve selected | `frontend/src/pages/PayrollPage.js` | 339 | handler/submit detected |
| Bulk approve | `frontend/src/pages/PayrollPage.js` | 340 | handler/submit detected |
| approveOne(t.entry_id)}>Approve | `frontend/src/pages/PayrollPage.js` | 364 | handler/submit detected |
| deleteAdjustment(a.id)}>Remove adjustment | `frontend/src/pages/PayrollPage.js` | 416 | handler/submit detected |
| downloadCsv(`/payroll/periods/${activePeriodId}/export/payroll-summary.csv`, `churvox-payroll-summary-${payRunPart}.csv` | `frontend/src/pages/PayrollPage.js` | 427 | handler/submit detected |
| downloadCsv(`/payroll/periods/${activePeriodId}/export/timesheets.csv`, `churvox-timesheets-${payRunPart}.csv`, "Timeshe | `frontend/src/pages/PayrollPage.js` | 428 | handler/submit detected |
| downloadCsv(`/payroll/periods/${activePeriodId}/export/worker-pay.csv`, `churvox-worker-pay-${payRunPart}.csv`, "Worker  | `frontend/src/pages/PayrollPage.js` | 429 | handler/submit detected |
| downloadCsv(`/payroll/periods/${activePeriodId}/export/adjustments.csv`, `churvox-adjustments-${payRunPart}.csv`, "Adjus | `frontend/src/pages/PayrollPage.js` | 430 | handler/submit detected |
| downloadCsv(`/payroll/periods/${activePeriodId}/export/payslip-draft.csv`, `churvox-payslip-draft-${payRunPart}.csv`, "P | `frontend/src/pages/PayrollPage.js` | 431 | handler/submit detected |
| Lock pay run | `frontend/src/pages/PayrollPage.js` | 434 | handler/submit detected |
| Unlock pay run | `frontend/src/pages/PayrollPage.js` | 435 | handler/submit detected |
| setShowCreateRun(false)}> Close | `frontend/src/pages/PayrollPage.js` | 443 | handler/submit detected |
| {actionLoading["create-run"] ? "Creating..." : "Create pay run"} | `frontend/src/pages/PayrollPage.js` | 454 | handler/submit detected |
| {actionLoading["save-settings"] ? "Saving..." : "Save settings"} | `frontend/src/pages/PayrollPage.js` | 471 | handler/submit detected |
| … | 16 more buttons | | |

## Send to Command / Local Command Storage Hits

- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:58` — sendToCommand(item, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `followup-wr
- `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx:98` — sendToCommand(tool, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `ai-studio-$
- `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx:61` — sendToCommand(parsed, raw, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `quic
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:47` — sendQuoteToCommand(quote, raw, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:70` — sendUsageToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `aiusage-${item.id}
- `frontend/src/churvox-fresh/FreshAlerts.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAlerts.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAlerts.jsx:68` — sendAlertToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `alert-${item.id}-$
- `frontend/src/churvox-fresh/FreshApprovals.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshApprovals.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshApprovals.jsx:23` — Send to Command
- `frontend/src/churvox-fresh/FreshApprovals.jsx:65` — sendApprovalToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `approval-rule-$
- `frontend/src/churvox-fresh/FreshAreas.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAreas.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAreas.jsx:62` — sendAreaToCommand(area) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `area-${area.id}-${D
- `frontend/src/churvox-fresh/FreshAskChurvox.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAskChurvox.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAskChurvox.jsx:70` — sendToCommand(result, text, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `ask
- `frontend/src/churvox-fresh/FreshAssets.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAssets.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAssets.jsx:67` — sendAssetToCommand(asset) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `asset-${asset.id}
- `frontend/src/churvox-fresh/FreshAudit.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAudit.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAudit.jsx:21` — send", area: "Invoices", actor: "Admin", target: "INV-1042", time: "Today 8:42am", risk: "High", status: "Needs review", detail: "Invoice total changed from $420 to $385 after customer message.", ownerNote: "Owner should confirm this was a 
- `frontend/src/churvox-fresh/FreshAutomation.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAutomation.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAutomation.jsx:29` — Send access/setup issue to Command", status: "On", lastRun: "Not run yet", risk: "Avoid sending workers to jobs that cannot be done.", }, { id: "auto-client-setup", name: "Client setup check", trigger: "Billing email or setup details missin
- `frontend/src/churvox-fresh/FreshAvailability.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshAvailability.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshAvailability.jsx:64` — sendAvailabilityToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `availabilit
- `frontend/src/churvox-fresh/FreshBilling.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshBilling.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshBilling.jsx:76` — sendBillingToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `billing-${item.i
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:58` — sendHealthToCommand(item, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `busin
- `frontend/src/churvox-fresh/FreshCancellations.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshCancellations.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshCancellations.jsx:18` — Send owner-approved reply and update schedule.", }, { id: "can-2", title: "Quote did not convert", client: "Upper Hutt lead", job: "Garden reset quote", status: "Lost", reason: "Customer said price was too high.", valueRisk: 190, saveAction
- `frontend/src/churvox-fresh/FreshCashflowCoach.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshCashflowCoach.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshCashflowCoach.jsx:9` — Send invoices", urgency: "High", amount: 780, found: "Completed jobs are waiting to be invoiced.", prepared: "Open Invoice Checker, review extras, send invoice batch.", why: "This is money already earned but not yet requested.", page: "invo
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:80` — sendPortalIssue() { if (!selected) return; try { const key = "churvox:fresh-command-inbox:v1"; const saved = window.localStorage.getItem(key); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? curr
- `frontend/src/churvox-fresh/FreshClients.jsx:181` — sending.`, lines: ["New quote line · $0"], }; writeFreshList(QUOTE_STORAGE_KEY, [quote, ...readFreshList(QUOTE_STORAGE_KEY)], "quote"); onNavigate?.("quotes"); } return ( <section> <header className="freshHero"> <span>Churvox fresh · Client
- `frontend/src/churvox-fresh/FreshCommand.jsx:56` — Sending a worker without access wastes time and looks unprofessional.", owner: "Confirm access, move the job, or send message to client.", area: "Jobs", page: "jobs", }, { id: "worker-ack", group: "Team", title: "Worker not acknowledged", i
- `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshCommandOwnerDesk.jsx:17` — sending.", why: "Completed work should become money quickly.", }, { id: "source-overdue-invoices", title: "Overdue invoices", area: "Money", actionType: "send_payment_reminder", urgency: "High", page: "cashflowai", found: "An invoice is ove
- `frontend/src/churvox-fresh/FreshContracts.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshContracts.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshContracts.jsx:71` — sendContractToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `contract-${item
- `frontend/src/churvox-fresh/FreshCreditNotes.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshCreditNotes.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshCreditNotes.jsx:17` — sending to customer.", }, { id: "cn-2", creditNo: "CN-1002", customer: "Birchville Rentals", invoice: "INV-1043", job: "Driveway clean", amount: 40, reason: "Deposit correction after job scope changed.", status: "Draft", refundMethod: "Bank
- `frontend/src/churvox-fresh/FreshCustomerMemory.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshCustomerMemory.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshCustomerMemory.jsx:35` — Send follow-up to Command.", page: "quotes", }, { id: "mem-3", name: "Naenae Property", type: "Handyman customer", value: "$120 job", memory: [ "Wants approval before extras", "Prefers clear arrival time", "Likes repair photos", "Pays on ti
- `frontend/src/churvox-fresh/FreshCustomerPortalRequests.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshCustomerPortalRequests.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshCustomerPortalRequests.jsx:31` — sending.", }, { id: "pr-3", customer: "Aroha Property Care", request: "Upload before and after photos from last lawn service", type: "Photo request", linkedTo: "JOB-1044", priority: "Low", status: "Ready to send", received: "Mon 1:20pm", ai
- `frontend/src/churvox-fresh/FreshDataControls.jsx:9` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshDemoMode.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshDemoMode.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshDemoMode.jsx:39` — Send reminder / reassign / ignore.", area: "Demo Mode", page: "demo", }, ]; function loadDemo(onNavigate, setLoaded) { try { const slips = demoSlips.map((slip, index) => ({ ...slip, id: `demo-slip-${Date.now()}-${index}`, fromInbox: true, c
- `frontend/src/churvox-fresh/FreshDispatch.jsx:235` — Send issue to Command
- `frontend/src/churvox-fresh/FreshDocuments.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshDocuments.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshDocuments.jsx:65` — sendDocToCommand(doc) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `document-${doc.id}-${
- `frontend/src/churvox-fresh/FreshExpenses.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshExpenses.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshExpenses.jsx:71` — sendExpenseToCommand(expense) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `expense-${exp
- `frontend/src/churvox-fresh/FreshExports.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshExports.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshExports.jsx:71` — sendExportToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `export-${item.id}
- `frontend/src/churvox-fresh/FreshExtras.jsx:5` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshExtras.jsx:5` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshExtras.jsx:84` — sendExtraToCommand(extra) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const issue = { id: `extra-${extra.id
- `frontend/src/churvox-fresh/FreshFeedback.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshFeedback.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshFeedback.jsx:68` — sendFeedbackToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `feedback-${item
- `frontend/src/churvox-fresh/FreshFirstRunWizard.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshFirstRunWizard.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshFirstRunWizard.jsx:44` — Send first invoice", time: "45 sec", status: "Needs test", text: "Check extras, GST and send invoice after job completion.", action: "Open Invoice Checker", page: "invoicecheck", }, { id: "command", title: "Approve from Command", time: "20 
- `frontend/src/churvox-fresh/FreshFlags.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshFlags.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshFlags.jsx:15` — send SMS.", note: "Keeps SMS safe until provider, pricing and consent rules are ready.", nextAction: "Keep disabled for launch.", }, { id: "fl-2", feature: "GPS / Time on Site", area: "GPS", status: "Preview only", visibility: "Visible as p
- `frontend/src/churvox-fresh/FreshFollowUps.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshFollowUps.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshFollowUps.jsx:40` — send the worker.", note: "Do not dispatch until access is confirmed.", }, ]; function readFollowUps() { try { if (typeof window === "undefined") return defaults; const saved = window.localStorage.getItem(FOLLOWUPS_KEY); if (!saved) return d
- `frontend/src/churvox-fresh/FreshGlobalActions.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshGlobalActions.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshGlobalActions.jsx:12` — Send and check invoices", "invoices"], ["AI Quick Create", "Turn messy notes into jobs", "quickcreateai"], ["Invoice Checker", "Catch missing extras", "invoicecheck"], ["AI Follow-up", "Write reminders and review requests", "followupwriter"
- `frontend/src/churvox-fresh/FreshGps.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshGps.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshGps.jsx:68` — sendGpsToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `gps-${item.id}-${Dat
- `frontend/src/churvox-fresh/FreshHelpDesk.jsx:3` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshHelpDesk.jsx:3` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshHelpDesk.jsx:43` — sendHelpToCommand(item, note, onNavigate) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `h
- `frontend/src/churvox-fresh/FreshImports.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshImports.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshImports.jsx:76` — sendImportToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `import-${item.id}
- `frontend/src/churvox-fresh/FreshIndustries.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshIndustries.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshIndustries.jsx:65` — sendIndustryToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `industry-${item
- `frontend/src/churvox-fresh/FreshIntegrations.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshIntegrations.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshIntegrations.jsx:48` — send", name: "ClickSend", status: "Coming soon", type: "SMS", plan: "Later add-on", action: "SMS reminders and quick updates", note: "Keep disabled/greyed for launch unless fully tested.", risk: "SMS costs money and should not send by accid
- `frontend/src/churvox-fresh/FreshInventory.jsx:4` — COMMAND_INBOX_KEY
- `frontend/src/churvox-fresh/FreshInventory.jsx:4` — fresh-command-inbox
- `frontend/src/churvox-fresh/FreshInventory.jsx:65` — sendInventoryToCommand(item) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `inventory-${it
- … 190 more

## Preview / Demo / Local Storage Hits

- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:60` — localStorage
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:80` — localStorage
- `frontend/src/churvox-fresh/FreshAiFollowUpWriter.jsx:83` — preview
- `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx:100` — localStorage
- `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx:120` — localStorage
- `frontend/src/churvox-fresh/FreshAiOperatorStudio.jsx:123` — Preview
- `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx:63` — localStorage
- `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx:83` — localStorage
- `frontend/src/churvox-fresh/FreshAiQuickCreate.jsx:86` — Preview
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:49` — localStorage
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:69` — localStorage
- `frontend/src/churvox-fresh/FreshAiQuoteBuilder.jsx:72` — Preview
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:45` — localStorage
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:57` — localStorage
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:61` — preview
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:72` — localStorage
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:92` — localStorage
- `frontend/src/churvox-fresh/FreshAiUsage.jsx:95` — preview
- `frontend/src/churvox-fresh/FreshAlerts.jsx:48` — localStorage
- `frontend/src/churvox-fresh/FreshAlerts.jsx:60` — localStorage
- `frontend/src/churvox-fresh/FreshAlerts.jsx:64` — preview
- `frontend/src/churvox-fresh/FreshAlerts.jsx:70` — localStorage
- `frontend/src/churvox-fresh/FreshAlerts.jsx:90` — localStorage
- `frontend/src/churvox-fresh/FreshAlerts.jsx:93` — preview
- `frontend/src/churvox-fresh/FreshApp.jsx:47` — Demo
- `frontend/src/churvox-fresh/FreshApp.jsx:157` — Demo
- `frontend/src/churvox-fresh/FreshApp.jsx:157` — Demo
- `frontend/src/churvox-fresh/FreshApp.jsx:259` — demo
- `frontend/src/churvox-fresh/FreshApp.jsx:405` — demo
- `frontend/src/churvox-fresh/FreshApp.jsx:405` — Demo
- `frontend/src/churvox-fresh/FreshApprovals.jsx:45` — localStorage
- `frontend/src/churvox-fresh/FreshApprovals.jsx:57` — localStorage
- `frontend/src/churvox-fresh/FreshApprovals.jsx:61` — preview
- `frontend/src/churvox-fresh/FreshApprovals.jsx:67` — localStorage
- `frontend/src/churvox-fresh/FreshApprovals.jsx:87` — localStorage
- `frontend/src/churvox-fresh/FreshApprovals.jsx:90` — preview
- `frontend/src/churvox-fresh/FreshAreas.jsx:42` — localStorage
- `frontend/src/churvox-fresh/FreshAreas.jsx:54` — localStorage
- `frontend/src/churvox-fresh/FreshAreas.jsx:58` — preview
- `frontend/src/churvox-fresh/FreshAreas.jsx:64` — localStorage
- `frontend/src/churvox-fresh/FreshAreas.jsx:84` — localStorage
- `frontend/src/churvox-fresh/FreshAreas.jsx:87` — preview
- `frontend/src/churvox-fresh/FreshAskChurvox.jsx:72` — localStorage
- `frontend/src/churvox-fresh/FreshAskChurvox.jsx:92` — localStorage
- `frontend/src/churvox-fresh/FreshAskChurvox.jsx:95` — Preview
- `frontend/src/churvox-fresh/FreshAssets.jsx:46` — localStorage
- `frontend/src/churvox-fresh/FreshAssets.jsx:59` — localStorage
- `frontend/src/churvox-fresh/FreshAssets.jsx:63` — preview
- `frontend/src/churvox-fresh/FreshAssets.jsx:69` — localStorage
- `frontend/src/churvox-fresh/FreshAssets.jsx:89` — localStorage
- `frontend/src/churvox-fresh/FreshAssets.jsx:92` — preview
- `frontend/src/churvox-fresh/FreshAudit.jsx:48` — localStorage
- `frontend/src/churvox-fresh/FreshAudit.jsx:60` — localStorage
- `frontend/src/churvox-fresh/FreshAudit.jsx:64` — preview
- `frontend/src/churvox-fresh/FreshAudit.jsx:70` — localStorage
- `frontend/src/churvox-fresh/FreshAudit.jsx:90` — localStorage
- `frontend/src/churvox-fresh/FreshAudit.jsx:93` — preview
- `frontend/src/churvox-fresh/FreshAutomation.jsx:58` — localStorage
- `frontend/src/churvox-fresh/FreshAutomation.jsx:71` — localStorage
- `frontend/src/churvox-fresh/FreshAutomation.jsx:75` — preview
- `frontend/src/churvox-fresh/FreshAutomation.jsx:81` — localStorage
- `frontend/src/churvox-fresh/FreshAutomation.jsx:101` — localStorage
- `frontend/src/churvox-fresh/FreshAutomation.jsx:104` — preview
- `frontend/src/churvox-fresh/FreshAutomation.jsx:145` — preview
- `frontend/src/churvox-fresh/FreshAutomation.jsx:162` — preview
- `frontend/src/churvox-fresh/FreshAvailability.jsx:43` — localStorage
- `frontend/src/churvox-fresh/FreshAvailability.jsx:56` — localStorage
- `frontend/src/churvox-fresh/FreshAvailability.jsx:60` — preview
- `frontend/src/churvox-fresh/FreshAvailability.jsx:66` — localStorage
- `frontend/src/churvox-fresh/FreshAvailability.jsx:86` — localStorage
- `frontend/src/churvox-fresh/FreshAvailability.jsx:89` — preview
- `frontend/src/churvox-fresh/FreshBilling.jsx:56` — localStorage
- `frontend/src/churvox-fresh/FreshBilling.jsx:68` — localStorage
- `frontend/src/churvox-fresh/FreshBilling.jsx:72` — preview
- `frontend/src/churvox-fresh/FreshBilling.jsx:78` — localStorage
- `frontend/src/churvox-fresh/FreshBilling.jsx:98` — localStorage
- `frontend/src/churvox-fresh/FreshBilling.jsx:101` — preview
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:60` — localStorage
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:80` — localStorage
- `frontend/src/churvox-fresh/FreshBusinessHealth.jsx:83` — preview
- `frontend/src/churvox-fresh/FreshCancellations.jsx:51` — localStorage
- `frontend/src/churvox-fresh/FreshCancellations.jsx:63` — localStorage
- `frontend/src/churvox-fresh/FreshCancellations.jsx:67` — preview
- `frontend/src/churvox-fresh/FreshCancellations.jsx:77` — localStorage
- `frontend/src/churvox-fresh/FreshCancellations.jsx:97` — localStorage
- `frontend/src/churvox-fresh/FreshCancellations.jsx:100` — preview
- `frontend/src/churvox-fresh/FreshCashflowCoach.jsx:58` — localStorage
- `frontend/src/churvox-fresh/FreshCashflowCoach.jsx:78` — localStorage
- `frontend/src/churvox-fresh/FreshCashflowCoach.jsx:81` — Preview
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:40` — localStorage
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:53` — localStorage
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:57` — preview
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:85` — localStorage
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:105` — localStorage
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:109` — preview
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:121` — preview
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:151` — preview
- `frontend/src/churvox-fresh/FreshClientPortal.jsx:176` — Preview
- `frontend/src/churvox-fresh/FreshClients.jsx:56` — localStorage
- `frontend/src/churvox-fresh/FreshClients.jsx:70` — localStorage
- `frontend/src/churvox-fresh/FreshClients.jsx:77` — preview
- `frontend/src/churvox-fresh/FreshClients.jsx:85` — localStorage
- `frontend/src/churvox-fresh/FreshClients.jsx:107` — localStorage
- `frontend/src/churvox-fresh/FreshClients.jsx:110` — preview
- `frontend/src/churvox-fresh/FreshClients.jsx:129` — localStorage
- `frontend/src/churvox-fresh/FreshClients.jsx:132` — preview
- `frontend/src/churvox-fresh/FreshClients.jsx:245` — preview
- `frontend/src/churvox-fresh/FreshCommand.jsx:106` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:131` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:156` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:283` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:286` — preview
- `frontend/src/churvox-fresh/FreshCommand.jsx:293` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:296` — preview
- `frontend/src/churvox-fresh/FreshCommand.jsx:354` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:362` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:371` — preview
- `frontend/src/churvox-fresh/FreshCommand.jsx:395` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:396` — localStorage
- `frontend/src/churvox-fresh/FreshCommand.jsx:399` — preview
- … 887 more

## What To Fix First

No major wiring failures detected by static audit. Next step is live browser/API testing.
