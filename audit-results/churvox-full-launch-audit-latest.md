# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: 8d103137a34f641f5d2abaa4d11b9e53efc2f68e
- Run: 29342070108
- Status code: 1
- Passed: 82
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Authenticated audit required: yes
- Time: Tue Jul 14 14:47:20 UTC 2026

## Output
```txt
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:251:49

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-desktop-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-desktop-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-desktop-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-desktop-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-desktop-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  2) [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:269:3 › Churvox full launch worker audit › worker job detail has real field controls when a job is assigned 

    Error: No assigned worker job available for the required detail audit.

      144 | function requireOrSkip(condition, message) {
      145 |   if (condition) return;
    > 146 |   if (REQUIRE_AUTH_AUDIT) throw new Error(message);
          |                                 ^
      147 |   test.skip(true, message);
      148 | }
      149 |
        at requireOrSkip (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:146:33)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:275:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: No assigned worker job available for the required detail audit.

      144 | function requireOrSkip(condition, message) {
      145 |   if (condition) return;
    > 146 |   if (REQUIRE_AUTH_AUDIT) throw new Error(message);
          |                                 ^
      147 |   test.skip(true, message);
      148 | }
      149 |
        at requireOrSkip (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:146:33)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:275:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-desktop-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  3) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:237:3 › Churvox full launch owner audit › sidebar keeps full launch feature navigation 

    Error: missing launch nav items

    [2mexpect([22m[31mreceived[39m[2m).[22mtoEqual[2m([22m[32mexpected[39m[2m) // deep equality[22m

    [32m- Expected  - 1[39m
    [31m+ Received  + 5[39m

    [32m- Array [][39m
    [31m+ Array [[39m
    [31m+   "AI Guide",[39m
    [31m+   "Team",[39m
    [31m+   "Support",[39m
    [31m+ ][39m

      249 |       if (!found) missing.push(item);
      250 |     }
    > 251 |     expect(missing, 'missing launch nav items').toEqual([]);
          |                                                 ^
      252 |   });
      253 | });
      254 |
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:251:49

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: missing launch nav items

    [2mexpect([22m[31mreceived[39m[2m).[22mtoEqual[2m([22m[32mexpected[39m[2m) // deep equality[22m

    [32m- Expected  - 1[39m
    [31m+ Received  + 5[39m

    [32m- Array [][39m
    [31m+ Array [[39m
    [31m+   "AI Guide",[39m
    [31m+   "Team",[39m
    [31m+   "Support",[39m
    [31m+ ][39m

      249 |       if (!found) missing.push(item);
      250 |     }
    > 251 |     expect(missing, 'missing launch nav items').toEqual([]);
          |                                                 ^
      252 |   });
      253 | });
      254 |
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:251:49

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-ac6f4-l-launch-feature-navigation-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  4) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:269:3 › Churvox full launch worker audit › worker job detail has real field controls when a job is assigned 

    Error: No assigned worker job available for the required detail audit.

      144 | function requireOrSkip(condition, message) {
      145 |   if (condition) return;
    > 146 |   if (REQUIRE_AUTH_AUDIT) throw new Error(message);
          |                                 ^
      147 |   test.skip(true, message);
      148 | }
      149 |
        at requireOrSkip (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:146:33)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:275:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

    Retry #1 ───────────────────────────────────────────────────────────────────────────────────────

    Error: No assigned worker job available for the required detail audit.

      144 | function requireOrSkip(condition, message) {
      145 |   if (condition) return;
    > 146 |   if (REQUIRE_AUTH_AUDIT) throw new Error(message);
          |                                 ^
      147 |   test.skip(true, message);
      148 | }
      149 |
        at requireOrSkip (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:146:33)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:275:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium-retry1/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium-retry1/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium-retry1/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium-retry1/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  4 failed
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:237:3 › Churvox full launch owner audit › sidebar keeps full launch feature navigation 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:269:3 › Churvox full launch worker audit › worker job detail has real field controls when a job is assigned 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:237:3 › Churvox full launch owner audit › sidebar keeps full launch feature navigation 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:269:3 › Churvox full launch worker audit › worker job detail has real field controls when a job is assigned 
  82 passed (3.6m)
```
