# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: ccd7ef76eae6899686b80bbf77696d025d5c17b5
- Run: 30117910304
- Status code: 1
- Passed: 78
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Audit fixture cleanup: success
- Authenticated audit required: yes
- Time: Fri Jul 24 19:09:16 UTC 2026

## Output
```txt
    > 212 |   await page.waitForFunction(() => Boolean(localStorage.getItem('token')), null, { timeout: 30_000 });
          |              ^
      213 |   const token = await page.evaluate(() => localStorage.getItem('token') || '');
      214 |   expect(token, `${role} login form did not create an authenticated token`).toBeTruthy();
      215 |   await verifyIdentity(page, token, email, role);
        at uiLogin (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:212:14)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:292:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    TimeoutError: page.waitForFunction: Timeout 30000ms exceeded.

      210 |   expect(passwordFilled, `${role} login password field was not found`).toBeTruthy();
      211 |   await clickLogin(page);
    > 212 |   await page.waitForFunction(() => Boolean(localStorage.getItem('token')), null, { timeout: 30_000 });
          |              ^
      213 |   const token = await page.evaluate(() => localStorage.getItem('token') || '');
      214 |   expect(token, `${role} login form did not create an authenticated token`).toBeTruthy();
      215 |   await verifyIdentity(page, token, email, role);
        at uiLogin (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:212:14)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:292:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-6b240-rrect-authenticated-session-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  7) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page 

    Error: missing main owner navigation: Today

    [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: getByRole('button', { name: /^Today(?:\s+\d+)?$/i }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
    [2m  - missing main owner navigation: Today with timeout 10000ms[22m
    [2m  - waiting for getByRole('button', { name: /^Today(?:\s+\d+)?$/i }).first()[22m


      315 |
      316 |     for (const item of ['Today', 'Intelligence', 'Command', 'Jobs', 'Clients', 'Workers', 'Quotes', 'Invoices']) {
    > 317 |       await expect(page.getByRole('button', { name: new RegExp(`^${item}(?:\\s+\\d+)?$`, 'i') }).first(), `missing main owner navigation: ${item}`).toBeVisible();
          |                                                                                                                                                     ^
      318 |     }
      319 |
      320 |     const more = page.getByRole('button', { name: /^More$/i }).first();
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:317:149

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: missing main owner navigation: Today

    [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: getByRole('button', { name: /^Today(?:\s+\d+)?$/i }).first()
    Expected: visible
    Timeout: 10000ms
    Error: element(s) not found

    Call log:
    [2m  - missing main owner navigation: Today with timeout 10000ms[22m
    [2m  - waiting for getByRole('button', { name: /^Today(?:\s+\d+)?$/i }).first()[22m


      315 |
      316 |     for (const item of ['Today', 'Intelligence', 'Command', 'Jobs', 'Clients', 'Workers', 'Quotes', 'Invoices']) {
    > 317 |       await expect(page.getByRole('button', { name: new RegExp(`^${item}(?:\\s+\\d+)?$`, 'i') }).first(), `missing main owner navigation: ${item}`).toBeVisible();
          |                                                                                                                                                     ^
      318 |     }
      319 |
      320 |     const more = page.getByRole('button', { name: /^More$/i }).first();
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:317:149

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-3f898-s-every-current-launch-page-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  8) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job 

    Error: created assigned job did not appear in the worker queue

    [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: getByRole('button', { name: /Full launch worker detail 1784919014118-5yeh9i/i }).first()
    Expected: visible
    Timeout: 30000ms
    Error: element(s) not found

    Call log:
    [2m  - created assigned job did not appear in the worker queue with timeout 30000ms[22m
    [2m  - waiting for getByRole('button', { name: /Full launch worker detail 1784919014118-5yeh9i/i }).first()[22m


      360 |
      361 |       const assignedJob = page.getByRole('button', { name: new RegExp(fixture.marker, 'i') }).first();
    > 362 |       await expect(assignedJob, 'created assigned job did not appear in the worker queue').toBeVisible({ timeout: 30_000 });
          |                                                                                            ^
      363 |       await assignedJob.click();
      364 |       await expect(page.locator('body')).toContainText(fixture.marker, { timeout: 15_000 });
      365 |
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:362:92

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: created assigned job did not appear in the worker queue

    [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: getByRole('button', { name: /Full launch worker detail 1784919058986-hwqd24/i }).first()
    Expected: visible
    Timeout: 30000ms
    Error: element(s) not found

    Call log:
    [2m  - created assigned job did not appear in the worker queue with timeout 30000ms[22m
    [2m  - waiting for getByRole('button', { name: /Full launch worker detail 1784919058986-hwqd24/i }).first()[22m


      360 |
      361 |       const assignedJob = page.getByRole('button', { name: new RegExp(fixture.marker, 'i') }).first();
    > 362 |       await expect(assignedJob, 'created assigned job did not appear in the worker queue').toBeVisible({ timeout: 30_000 });
          |                                                                                            ^
      363 |       await assignedJob.click();
      364 |       await expect(page.locator('body')).toContainText(fixture.marker, { timeout: 15_000 });
      365 |
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:362:92

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-8e148-ontrols-for-an-assigned-job-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  8 failed
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job 
  78 passed (7.5m)
```
