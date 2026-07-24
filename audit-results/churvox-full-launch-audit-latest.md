# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: 647ccf2a82617b5994a06d1cb2b04050e2da3f95
- Run: 30063179688
- Status code: 1
- Passed: 76
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Audit fixture cleanup: success
- Authenticated audit required: yes
- Time: Fri Jul 24 03:27:08 UTC 2026

## Output
```txt
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

  9) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped 

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed

    Locator: locator('body')
    Expected pattern: [32m/Today|Work|Job|Waiting|Assigned|Refresh/i[39m
    Received string:  [31m"Not Found"[39m
    Timeout: 10000ms

    Call log:
    [2m  - Expect "toContainText" with timeout 10000ms[22m
    [2m  - waiting for locator('body')[22m
    [2m    24 × locator resolved to <body>…</body>[22m
    [2m       - unexpected value "Not Found"[22m


      347 |     await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
      348 |     expect(page.url(), 'worker jobs audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);
    > 349 |     await expect(page.locator('body')).toContainText(/Today|Work|Job|Waiting|Assigned|Refresh/i);
          |                                        ^
      350 |     await expectBasics(page, 'worker jobs');
      351 |     await expect(page.locator('body')).not.toContainText(/Owner workspace|Platform Admin|Billing|Reports/i);
      352 |   });
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:349:40

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: [2mexpect([22m[31mlocator[39m[2m).[22mtoContainText[2m([22m[32mexpected[39m[2m)[22m failed

    Locator: locator('body')
    Expected pattern: [32m/Today|Work|Job|Waiting|Assigned|Refresh/i[39m
    Received string:  [31m"Not Found"[39m
    Timeout: 10000ms

    Call log:
    [2m  - Expect "toContainText" with timeout 10000ms[22m
    [2m  - waiting for locator('body')[22m
    [2m    24 × locator resolved to <body>…</body>[22m
    [2m       - unexpected value "Not Found"[22m


      347 |     await page.goto('/worker/jobs', { waitUntil: 'domcontentloaded' });
      348 |     expect(page.url(), 'worker jobs audit redirected out of worker area').toMatch(/\/worker(?:[/?#]|$)/i);
    > 349 |     await expect(page.locator('body')).toContainText(/Today|Work|Job|Waiting|Assigned|Refresh/i);
          |                                        ^
      350 |     await expectBasics(page, 'worker jobs');
      351 |     await expect(page.locator('body')).not.toContainText(/Owner workspace|Platform Admin|Billing|Reports/i);
      352 |   });
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:349:40

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-950e6-nch-clean-and-worker-scoped-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  10) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job 

    Error: created assigned job did not appear in the worker queue

    [2mexpect([22m[31mlocator[39m[2m).[22mtoBeVisible[2m([22m[2m)[22m failed

    Locator: getByRole('button', { name: /Full launch worker detail 1784862586967-xqrb3a/i }).first()
    Expected: visible
    Timeout: 30000ms
    Error: element(s) not found

    Call log:
    [2m  - created assigned job did not appear in the worker queue with timeout 30000ms[22m
    [2m  - waiting for getByRole('button', { name: /Full launch worker detail 1784862586967-xqrb3a/i }).first()[22m


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

    Locator: getByRole('button', { name: /Full launch worker detail 1784862630520-jjhraj/i }).first()
    Expected: visible
    Timeout: 30000ms
    Error: element(s) not found

    Call log:
    [2m  - created assigned job did not appear in the worker queue with timeout 30000ms[22m
    [2m  - waiting for getByRole('button', { name: /Full launch worker detail 1784862630520-jjhraj/i }).first()[22m


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

  10 failed
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job 
  76 passed (7.4m)
```
