# Churvox Deep Bug + Wiring Audit

Generated: 2026-05-16 20:32:42 UTC

## Summary

- HIGH: 13
- MED: 41
- LOW: 111
- Frontend API calls found: 49
- Backend routes found: 375

## Findings

### 1. [HIGH] Backend routes — Duplicate backend route DELETE /automation/rules/{rule_id}

**Where:** `backend/server.py:12093`

**Detail:** Also defined at line 10566. Last registration may shadow earlier handler.

### 2. [HIGH] Backend routes — Duplicate backend route GET /automation/rules

**Where:** `backend/server.py:11996`

**Detail:** Also defined at line 10486. Last registration may shadow earlier handler.

### 3. [HIGH] Backend routes — Duplicate backend route GET /automation/runs

**Where:** `backend/server.py:12116`

**Detail:** Also defined at line 10610. Last registration may shadow earlier handler.

### 4. [HIGH] Backend routes — Duplicate backend route GET /automation/templates

**Where:** `backend/server.py:11991`

**Detail:** Also defined at line 10660. Last registration may shadow earlier handler.

### 5. [HIGH] Backend routes — Duplicate backend route GET /public/client-portal/{token}

**Where:** `backend/server.py:19281`

**Detail:** Also defined at line 16275. Last registration may shadow earlier handler.

### 6. [HIGH] Backend routes — Duplicate backend route GET /worker/office-contact

**Where:** `backend/server.py:14557`

**Detail:** Also defined at line 10259. Last registration may shadow earlier handler.

### 7. [HIGH] Backend routes — Duplicate backend route POST /ai-operator/run-daily-plan

**Where:** `backend/server.py:19174`

**Detail:** Also defined at line 19035. Last registration may shadow earlier handler.

### 8. [HIGH] Backend routes — Duplicate backend route POST /automation/rules

**Where:** `backend/server.py:12004`

**Detail:** Also defined at line 10504. Last registration may shadow earlier handler.

### 9. [HIGH] Backend routes — Duplicate backend route POST /billing/webhook

**Where:** `backend/server.py:10109`

**Detail:** Also defined at line 10047. Last registration may shadow earlier handler.

### 10. [HIGH] Backend routes — Duplicate backend route POST /clients/import-csv

**Where:** `backend/server.py:14666`

**Detail:** Also defined at line 9647. Last registration may shadow earlier handler.

### 11. [HIGH] Backend routes — Duplicate backend route POST /team/import-csv

**Where:** `backend/server.py:14737`

**Detail:** Also defined at line 9425. Last registration may shadow earlier handler.

### 12. [HIGH] Backend routes — Duplicate backend route POST /worker/contact-office

**Where:** `backend/server.py:14601`

**Detail:** Also defined at line 10352. Last registration may shadow earlier handler.

### 13. [HIGH] Backend routes — Duplicate backend route PUT /automation/rules/{rule_id}

**Where:** `backend/server.py:12041`

**Detail:** Also defined at line 10541. Last registration may shadow earlier handler.

### 14. [MED] Brand — Old Grassley brand text

**Where:** `test_result.md:153`

**Detail:** Found `Grassley`

### 15. [MED] Brand — Old Grassley brand text

**Where:** `login_debug.txt:105`

**Detail:** Found `Grassley`

### 16. [MED] Brand — Old Grassley brand text

**Where:** `package-lock.json:2`

**Detail:** Found `Grassley`

### 17. [MED] Brand — Old Grassley brand text

**Where:** `CHURVOX_PLAN_PAYMENT_AUDIT.txt:5`

**Detail:** Found `Grassley`

### 18. [MED] Brand — Old Grassley brand text

**Where:** `backend/server.py:472`

**Detail:** Found `Grassley`

### 19. [MED] Brand — Old Grassley brand text

**Where:** `audits/churvox_deep_audit_latest.md:111`

**Detail:** Found `Grassley`

### 20. [MED] Brand — Old Grassley brand text

**Where:** `audits/churvox_deep_audit_20260516_203036.md:111`

**Detail:** Found `Grassley`

### 21. [MED] Brand — Old Grassley brand text

**Where:** `scripts/churvox_deep_audit.py:229`

**Detail:** Found `Grassley`

### 22. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/index.js:1386`

**Detail:** Found `Grassley`

### 23. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/operator-machine/TopPlayerFeatureStack.jsx:9`

**Detail:** Found `Grassley`

### 24. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/operator-machine/OperatorMachine.jsx:63`

**Detail:** Found `Grassley`

### 25. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/customer-command/PublicCustomerCommandPage.jsx:9`

**Detail:** Found `Grassley`

### 26. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/pages/AutomationPage.js:10`

**Detail:** Found `Grassley`

### 27. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/shell/ChurvoxAIShell.jsx:128`

**Detail:** Found `Grassley`

### 28. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/lib/api.js:7`

**Detail:** Found `Grassley`

### 29. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/pages/worker/WorkerCockpitPage.js:6`

**Detail:** Found `Grassley`

### 30. [MED] Brand — Old Grassley brand text

**Where:** `frontend/tests/e2e/churvox-team-worker-route.spec.js:4`

**Detail:** Found `Grassley`

### 31. [MED] Brand — Old Grassley brand text

**Where:** `frontend/tests/e2e/churvox-public-quote-final.spec.js:4`

**Detail:** Found `Grassley`

### 32. [MED] Brand — Old Grassley brand text

**Where:** `frontend/tests/e2e/churvox-ai-backend-safe.spec.js:4`

**Detail:** Found `Grassley`

### 33. [MED] Brand — Old Grassley brand text

**Where:** `frontend/tests/e2e/churvox-billing-public-links.spec.js:4`

**Detail:** Found `Grassley`

### 34. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/reset_owner_account.py:12`

**Detail:** Found `Grassley`

### 35. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/fix_owner_upsert.py:12`

**Detail:** Found `Grassley`

### 36. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/hard_fix_owner.py:25`

**Detail:** Found `Grassley`

### 37. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/hard_reset_owner_login.py:29`

**Detail:** Found `Grassley`

### 38. [MED] Brand — Old Grassley brand text

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `Grassley`

### 39. [MED] Brand — Old Grassley brand text

**Where:** `shell-backup-20260514-024105/frontend/src/fresh/FreshAIPublicShell.jsx:9`

**Detail:** Found `Grassley`

### 40. [MED] Brand/Deploy — Old Grassley frontend reference

**Where:** `backend/server.py:472`

**Detail:** Found `grassley-frontend`

### 41. [MED] Brand/Deploy — Old Grassley frontend reference

**Where:** `audits/churvox_deep_audit_latest.md:259`

**Detail:** Found `grassley-frontend`

### 42. [MED] Brand/Deploy — Old Grassley frontend reference

**Where:** `audits/churvox_deep_audit_20260516_203036.md:259`

**Detail:** Found `grassley-frontend`

### 43. [MED] Brand/Deploy — Old Grassley frontend reference

**Where:** `scripts/churvox_deep_audit.py:229`

**Detail:** Found `grassley-frontend`

### 44. [MED] UX — Browser alert still used instead of in-page modal

**Where:** `test_result.md:128`

**Detail:** Found `alert(`

### 45. [MED] UX — Browser alert still used instead of in-page modal

**Where:** `audits/churvox_deep_audit_latest.md:271`

**Detail:** Found `alert(`

### 46. [MED] UX — Browser alert still used instead of in-page modal

**Where:** `audits/churvox_deep_audit_20260516_203036.md:271`

**Detail:** Found `alert(`

### 47. [MED] UX — Browser alert still used instead of in-page modal

**Where:** `scripts/churvox_deep_audit.py:238`

**Detail:** Found `alert(`

### 48. [MED] UX — Browser alert still used instead of in-page modal

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `alert(`

### 49. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `test_result.md:118`

**Detail:** Found `window.confirm`

### 50. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `audits/churvox_deep_audit_latest.md:289`

**Detail:** Found `window.confirm`

### 51. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `audits/churvox_deep_audit_20260516_203036.md:289`

**Detail:** Found `window.confirm`

### 52. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `scripts/churvox_deep_audit.py:237`

**Detail:** Found `window.confirm`

### 53. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `frontend/src/lib/confirmDialog.js:2`

**Detail:** Found `window.confirm`

### 54. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `window.confirm`

### 55. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `test_result.md:153`

**Detail:** Found `grassley-backend`

### 56. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `login_debug.txt:105`

**Detail:** Found `grassley-backend`

### 57. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `backend/server.py:527`

**Detail:** Found `grassley-backend`

### 58. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `audits/churvox_deep_audit_latest.md:309`

**Detail:** Found `grassley-backend`

### 59. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `audits/churvox_deep_audit_20260516_203036.md:309`

**Detail:** Found `grassley-backend`

### 60. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `scripts/churvox_deep_audit.py:230`

**Detail:** Found `grassley-backend`

### 61. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/index.js:1386`

**Detail:** Found `grassley-backend`

### 62. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/operator-machine/TopPlayerFeatureStack.jsx:9`

**Detail:** Found `grassley-backend`

### 63. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/operator-machine/OperatorMachine.jsx:63`

**Detail:** Found `grassley-backend`

### 64. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/customer-command/PublicCustomerCommandPage.jsx:9`

**Detail:** Found `grassley-backend`

### 65. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/pages/AutomationPage.js:10`

**Detail:** Found `grassley-backend`

### 66. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/shell/ChurvoxAIShell.jsx:128`

**Detail:** Found `grassley-backend`

### 67. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/lib/api.js:7`

**Detail:** Found `grassley-backend`

### 68. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/src/pages/worker/WorkerCockpitPage.js:6`

**Detail:** Found `grassley-backend`

### 69. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/tests/e2e/churvox-team-worker-route.spec.js:4`

**Detail:** Found `grassley-backend`

### 70. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/tests/e2e/churvox-public-quote-final.spec.js:4`

**Detail:** Found `grassley-backend`

### 71. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/tests/e2e/churvox-ai-backend-safe.spec.js:4`

**Detail:** Found `grassley-backend`

### 72. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `frontend/tests/e2e/churvox-billing-public-links.spec.js:4`

**Detail:** Found `grassley-backend`

### 73. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `grassley-backend`

### 74. [LOW] Brand/Deploy — Backend URL still uses grassley-backend

**Where:** `shell-backup-20260514-024105/frontend/src/fresh/FreshAIPublicShell.jsx:9`

**Detail:** Found `grassley-backend`

### 75. [LOW] Code cleanup — FIXME marker remains

**Where:** `audits/churvox_deep_audit_latest.md:417`

**Detail:** Found `FIXME`

### 76. [LOW] Code cleanup — FIXME marker remains

**Where:** `audits/churvox_deep_audit_20260516_203036.md:417`

**Detail:** Found `FIXME`

### 77. [LOW] Code cleanup — FIXME marker remains

**Where:** `scripts/churvox_deep_audit.py:234`

**Detail:** Found `FIXME`

### 78. [LOW] Code cleanup — TODO marker remains

**Where:** `audits/churvox_deep_audit_latest.md:423`

**Detail:** Found `TODO`

### 79. [LOW] Code cleanup — TODO marker remains

**Where:** `audits/churvox_deep_audit_20260516_203036.md:423`

**Detail:** Found `TODO`

### 80. [LOW] Code cleanup — TODO marker remains

**Where:** `scripts/churvox_deep_audit.py:233`

**Detail:** Found `TODO`

### 81. [LOW] Launch polish — Coming Soon text still visible

**Where:** `test_churvox_validation.py:145`

**Detail:** Found `Coming Soon`

### 82. [LOW] Launch polish — Coming Soon text still visible

**Where:** `test_result.md:147`

**Detail:** Found `Coming Soon`

### 83. [LOW] Launch polish — Coming Soon text still visible

**Where:** `design_guidelines.json:130`

**Detail:** Found `Coming Soon`

### 84. [LOW] Launch polish — Coming Soon text still visible

**Where:** `backend/server.py:2142`

**Detail:** Found `Coming Soon`

### 85. [LOW] Launch polish — Coming Soon text still visible

**Where:** `audits/churvox_deep_audit_latest.md:429`

**Detail:** Found `Coming Soon`

### 86. [LOW] Launch polish — Coming Soon text still visible

**Where:** `audits/churvox_deep_audit_20260516_203036.md:429`

**Detail:** Found `Coming Soon`

### 87. [LOW] Launch polish — Coming Soon text still visible

**Where:** `test_reports/iteration_2.json:28`

**Detail:** Found `Coming Soon`

### 88. [LOW] Launch polish — Coming Soon text still visible

**Where:** `test_reports/iteration_1.json:24`

**Detail:** Found `Coming Soon`

### 89. [LOW] Launch polish — Coming Soon text still visible

**Where:** `scripts/churvox_deep_audit.py:232`

**Detail:** Found `Coming Soon`

### 90. [LOW] Launch polish — Coming Soon text still visible

**Where:** `frontend/src/pages/SMSPage.js:8`

**Detail:** Found `Coming Soon`

### 91. [LOW] Launch polish — Coming Soon text still visible

**Where:** `frontend/src/shell/ChurvoxAIShell.jsx:6194`

**Detail:** Found `Coming Soon`

### 92. [LOW] Launch polish — Coming Soon text still visible

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `Coming Soon`

### 93. [LOW] Launch polish — Lorem/sample text remains

**Where:** `audits/churvox_deep_audit_latest.md:489`

**Detail:** Found `lorem`

### 94. [LOW] Launch polish — Lorem/sample text remains

**Where:** `audits/churvox_deep_audit_20260516_203036.md:489`

**Detail:** Found `lorem`

### 95. [LOW] Launch polish — Lorem/sample text remains

**Where:** `churvox-visual-audit-route-check/audit.js:40`

**Detail:** Found `lorem`

### 96. [LOW] Launch polish — Lorem/sample text remains

**Where:** `scripts/churvox_deep_audit.py:236`

**Detail:** Found `lorem`

### 97. [LOW] Launch polish — Lorem/sample text remains

**Where:** `backend/scripts/cleanup_test_data.py:32`

**Detail:** Found `lorem`

### 98. [LOW] Launch polish — Placeholder wording remains

**Where:** `CHURVOX_LAUNCH_TEST_CHECKLIST.md:27`

**Detail:** Found `placeholder`

### 99. [LOW] Launch polish — Placeholder wording remains

**Where:** `CHURVOX_10_OUT_OF_10_AI_OPERATOR_ENGINE_SPEC.md:128`

**Detail:** Found `placeholder`

### 100. [LOW] Launch polish — Placeholder wording remains

**Where:** `design_guidelines.json:79`

**Detail:** Found `placeholder`

### 101. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/package-lock.json:1967`

**Detail:** Found `placeholder`

### 102. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/sms_report.txt:2320`

**Detail:** Found `placeholder`

### 103. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/server.py:11176`

**Detail:** Found `placeholder`

### 104. [LOW] Launch polish — Placeholder wording remains

**Where:** `audits/churvox_deep_audit_latest.md:507`

**Detail:** Found `placeholder`

### 105. [LOW] Launch polish — Placeholder wording remains

**Where:** `audits/churvox_deep_audit_20260516_203036.md:507`

**Detail:** Found `placeholder`

### 106. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_8.json:21`

**Detail:** Found `placeholder`

### 107. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_15.json:76`

**Detail:** Found `placeholder`

### 108. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_14.json:101`

**Detail:** Found `placeholder`

### 109. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_13.json:85`

**Detail:** Found `placeholder`

### 110. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_11.json:105`

**Detail:** Found `placeholder`

### 111. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_12.json:74`

**Detail:** Found `placeholder`

### 112. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_9.json:81`

**Detail:** Found `placeholder`

### 113. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_10.json:56`

**Detail:** Found `placeholder`

### 114. [LOW] Launch polish — Placeholder wording remains

**Where:** `test_reports/iteration_7.json:89`

**Detail:** Found `placeholder`

### 115. [LOW] Launch polish — Placeholder wording remains

**Where:** `churvox-backend-save-audit-phase35/backend-save-test.js:36`

**Detail:** Found `placeholder`

### 116. [LOW] Launch polish — Placeholder wording remains

**Where:** `scripts/churvox_deep_audit.py:235`

**Detail:** Found `placeholder`

### 117. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/e2e/churvox-deep-audit.spec.js:135`

**Detail:** Found `placeholder`

### 118. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/operator-machine/OperatorMachine.css:2141`

**Detail:** Found `placeholder`

### 119. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/operator-machine/OperatorMachine.jsx:1547`

**Detail:** Found `placeholder`

### 120. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/AIControlRoomActionPage.js:126`

**Detail:** Found `placeholder`

### 121. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/SettingsPage.js:306`

**Detail:** Found `placeholder`

### 122. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/AutomationRunsPage.js:112`

**Detail:** Found `placeholder`

### 123. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/SMSPage.js:25`

**Detail:** Found `placeholder`

### 124. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/PayrollPage.js:406`

**Detail:** Found `placeholder`

### 125. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/OnboardingPage.js:37`

**Detail:** Found `placeholder`

### 126. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/AutomationPage.js:297`

**Detail:** Found `placeholder`

### 127. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/CommandHubRealPage.js:159`

**Detail:** Found `placeholder`

### 128. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/TeamPage.js:602`

**Detail:** Found `placeholder`

### 129. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/CommandHubTopPlayerPage.js:102`

**Detail:** Found `placeholder`

### 130. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/AIControlRoomCompletePage.js:542`

**Detail:** Found `placeholder`

### 131. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/PayrollPageClean.js:230`

**Detail:** Found `placeholder`

### 132. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/shell/ChurvoxOperatorOS.css:151`

**Detail:** Found `placeholder`

### 133. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/shell/ChurvoxAIShell.jsx:1524`

**Detail:** Found `placeholder`

### 134. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/shell/ChurvoxAIShell.css:8842`

**Detail:** Found `placeholder`

### 135. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/public/PublicClientPortalPage.js:458`

**Detail:** Found `placeholder`

### 136. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/invoices/InvoicesPage.js:227`

**Detail:** Found `placeholder`

### 137. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/invoices/InvoiceFormPage.js:183`

**Detail:** Found `placeholder`

### 138. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/admin/PlatformUnlock.jsx:44`

**Detail:** Found `placeholder`

### 139. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/quotes/QuotesPage.js:128`

**Detail:** Found `placeholder`

### 140. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/jobs/JobDetailPage.js:425`

**Detail:** Found `placeholder`

### 141. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/jobs/JobsPage.js:200`

**Detail:** Found `placeholder`

### 142. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/worker/WorkerCockpitPage.js:1058`

**Detail:** Found `placeholder`

### 143. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/worker/WorkerJobDetailPage.js:389`

**Detail:** Found `placeholder`

### 144. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/clients/ClientsPage.js:263`

**Detail:** Found `placeholder`

### 145. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/clients/ClientFormPage.js:138`

**Detail:** Found `placeholder`

### 146. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/auth/InviteSetupPage.js:169`

**Detail:** Found `placeholder`

### 147. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/auth/ResetPasswordPage.js:67`

**Detail:** Found `placeholder`

### 148. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/auth/AdminLoginPage.js:89`

**Detail:** Found `placeholder`

### 149. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/auth/LoginPage.js:76`

**Detail:** Found `placeholder`

### 150. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/auth/ForgotPasswordPage.js:57`

**Detail:** Found `placeholder`

### 151. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/auth/SignupPage.js:87`

**Detail:** Found `placeholder`

### 152. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/worker/WorkerContactOfficePanel.js:74`

**Detail:** Found `placeholder`

### 153. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/automation/ActionForm.js:35`

**Detail:** Found `placeholder`

### 154. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/ui/select.jsx:17`

**Detail:** Found `placeholder`

### 155. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/ui/input.jsx:10`

**Detail:** Found `placeholder`

### 156. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/ui/textarea.jsx:9`

**Detail:** Found `placeholder`

### 157. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/ui/command.jsx:41`

**Detail:** Found `placeholder`

### 158. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/tests/e2e/churvox-owner-worker-deep-v2.spec.js:49`

**Detail:** Found `placeholder`

### 159. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/tests/e2e/churvox-full-launch.spec.js:91`

**Detail:** Found `placeholder`

### 160. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/tests/e2e/churvox-owner-worker-deep.legacy.js:50`

**Detail:** Found `placeholder`

### 161. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/frontend_dist/static/css/main.22e43127.css:5`

**Detail:** Found `placeholder`

### 162. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `placeholder`

### 163. [LOW] Launch polish — Placeholder wording remains

**Where:** `shell-backup-20260514-024105/frontend/src/operatoros/OperatorShell.jsx:228`

**Detail:** Found `placeholder`

### 164. [LOW] Launch polish — Placeholder wording remains

**Where:** `shell-backup-20260514-024105/frontend/src/newos/ChurvoxNewShell.jsx:408`

**Detail:** Found `placeholder`

### 165. [LOW] Launch polish — Placeholder wording remains

**Where:** `shell-backup-20260514-024105/frontend/src/newos/ChurvoxSalesApp.jsx:256`

**Detail:** Found `placeholder`

## Next sensible fix order

1. Fix HIGH API wiring / missing backend routes first.
2. Fix deploy/MIME/CORS issues next because they make good code look broken live.
3. Fix invoice/runtime force patches by moving them into real components after launch-critical flows are stable.
4. Replace browser alert/confirm with in-page modal flows.
5. Remove placeholder/Coming Soon text from launch-critical areas.
