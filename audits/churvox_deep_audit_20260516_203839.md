# Churvox Deep Bug + Wiring Audit

Generated: 2026-05-16 20:38:39 UTC

## Summary

- HIGH: 2
- MED: 18
- LOW: 16
- Frontend API calls found: 49
- Backend routes found: 375

## Findings

### 1. [HIGH] Backend routes — Duplicate backend route POST /ai-operator/run-daily-plan

**Where:** `backend/server.py:19185`

**Detail:** Also defined at line 19046. Last registration may shadow earlier handler.

### 2. [HIGH] Backend routes — Duplicate backend route POST /billing/webhook

**Where:** `backend/server.py:10115`

**Detail:** Also defined at line 10053. Last registration may shadow earlier handler.

### 3. [MED] Brand — Old Grassley brand text

**Where:** `backend/server.py:472`

**Detail:** Found `Grassley`

### 4. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/index.js:1386`

**Detail:** Found `Grassley`

### 5. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/operator-machine/TopPlayerFeatureStack.jsx:9`

**Detail:** Found `Grassley`

### 6. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/operator-machine/OperatorMachine.jsx:63`

**Detail:** Found `Grassley`

### 7. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/customer-command/PublicCustomerCommandPage.jsx:9`

**Detail:** Found `Grassley`

### 8. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/pages/AutomationPage.js:10`

**Detail:** Found `Grassley`

### 9. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/shell/ChurvoxAIShell.jsx:128`

**Detail:** Found `Grassley`

### 10. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/lib/api.js:7`

**Detail:** Found `Grassley`

### 11. [MED] Brand — Old Grassley brand text

**Where:** `frontend/src/pages/worker/WorkerCockpitPage.js:6`

**Detail:** Found `Grassley`

### 12. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/reset_owner_account.py:12`

**Detail:** Found `Grassley`

### 13. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/fix_owner_upsert.py:12`

**Detail:** Found `Grassley`

### 14. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/hard_fix_owner.py:25`

**Detail:** Found `Grassley`

### 15. [MED] Brand — Old Grassley brand text

**Where:** `backend/scripts/hard_reset_owner_login.py:29`

**Detail:** Found `Grassley`

### 16. [MED] Brand — Old Grassley brand text

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `Grassley`

### 17. [MED] Brand/Deploy — Old Grassley frontend reference

**Where:** `backend/server.py:472`

**Detail:** Found `grassley-frontend`

### 18. [MED] UX — Browser alert still used instead of in-page modal

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `alert(`

### 19. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `frontend/src/lib/confirmDialog.js:2`

**Detail:** Found `window.confirm`

### 20. [MED] UX — Browser confirm still used instead of in-page modal

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `window.confirm`

### 21. [LOW] Launch polish — Coming Soon text still visible

**Where:** `backend/server.py:2148`

**Detail:** Found `Coming Soon`

### 22. [LOW] Launch polish — Coming Soon text still visible

**Where:** `frontend/src/pages/SMSPage.js:8`

**Detail:** Found `Coming Soon`

### 23. [LOW] Launch polish — Coming Soon text still visible

**Where:** `frontend/src/shell/ChurvoxAIShell.jsx:6194`

**Detail:** Found `Coming Soon`

### 24. [LOW] Launch polish — Coming Soon text still visible

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found `Coming Soon`

### 25. [LOW] Launch polish — Lorem/sample text remains

**Where:** `backend/scripts/cleanup_test_data.py:32`

**Detail:** Found `lorem`

### 26. [LOW] Launch polish — Placeholder wording remains

**Where:** `CHURVOX_LAUNCH_TEST_CHECKLIST.md:27`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 27. [LOW] Launch polish — Placeholder wording remains

**Where:** `CHURVOX_10_OUT_OF_10_AI_OPERATOR_ENGINE_SPEC.md:128`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 28. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/server.py:11182`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 29. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/operator-machine/OperatorMachine.css:7847`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 30. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/SMSPage.js:25`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 31. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/pages/PayrollPage.js:468`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 32. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/shell/ChurvoxOperatorOS.css:151`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 33. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/shell/ChurvoxAIShell.css:8842`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 34. [LOW] Launch polish — Placeholder wording remains

**Where:** `frontend/src/components/ui/select.jsx:17`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 35. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/frontend_dist/static/css/main.22e43127.css:5`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

### 36. [LOW] Launch polish — Placeholder wording remains

**Where:** `backend/frontend_dist/static/js/main.ac3852af.js:2`

**Detail:** Found visible `placeholder` wording outside normal form placeholder attributes.

## Next sensible fix order

1. Fix HIGH API wiring / missing backend routes first.
2. Fix deploy/MIME/CORS issues next because they make good code look broken live.
3. Fix invoice/runtime force patches by moving them into real components after launch-critical flows are stable.
4. Replace browser alert/confirm with in-page modal flows.
5. Remove placeholder/Coming Soon text from launch-critical areas.
