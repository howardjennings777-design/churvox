# Churvox Playwright checks

These tests are for quick owner-flow checks before launch.

## 1. Save a logged-in owner session

Run this first. It opens the browser, lets you log in manually, then saves your session cookies locally.

```bash
cd frontend
PLAYWRIGHT_BASE_URL=https://www.churvox.com \
PLAYWRIGHT_STORAGE_STATE=tests/e2e/.auth/churvox-owner.json \
npx playwright test tests/e2e/save-login-state.spec.js --headed --project=desktop-chromium
```

The saved auth file is ignored by git.

## 2. Test Tell Churvox action pills

```bash
PLAYWRIGHT_BASE_URL=https://www.churvox.com \
PLAYWRIGHT_STORAGE_STATE=tests/e2e/.auth/churvox-owner.json \
npx playwright test tests/e2e/tell-churvox-actions.spec.js --project=desktop-chromium
```

This checks:

- Add job
- Move job
- Complete job
- Invoice jobs
- Chase invoices

The test opens each approval pop-up and checks that Churvox understood the right action.

## 3. Mobile check

```bash
PLAYWRIGHT_BASE_URL=https://www.churvox.com \
PLAYWRIGHT_STORAGE_STATE=tests/e2e/.auth/churvox-owner.json \
npx playwright test tests/e2e/tell-churvox-actions.spec.js --project=mobile-chromium
```
