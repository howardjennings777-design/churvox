# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: b21db2d34284673f5742b734ecb1e49deaf188d0
- Run: 29341331513
- Status code: 1
- Passed: 72
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Authenticated audit required: yes
- Time: Tue Jul 14 14:41:46 UTC 2026

## Output
```txt

        npx playwright show-trace test-results/churvox-big-launch-audit-C-66d04-rols-when-a-job-is-assigned-mobile-chromium-retry1/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  5) [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday 

    Error: owner login did not leave the login page

    [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoMatch[2m([22m[32mexpected[39m[2m)[22m

    Expected pattern: not [32m/\/login(?:[?#]|$)/i[39m
    Received string:      [31m"https://www.churvox.com[7m/login[27m"[39m

      145 |
      146 |   const finalUrl = page.url();
    > 147 |   expect(finalUrl, `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
          |                                                                      ^
      148 |   if (role === 'worker') {
      149 |     expect(finalUrl, 'worker login did not reach a worker route').toMatch(/\/worker(?:[/?#]|$)/i);
      150 |   } else {
        at login (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:147:70)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:167:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-desktop-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-desktop-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-desktop-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-desktop-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-desktop-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  6) [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs 

    Error: owner login did not leave the login page

    [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoMatch[2m([22m[32mexpected[39m[2m)[22m

    Expected pattern: not [32m/\/login(?:[?#]|$)/i[39m
    Received string:      [31m"https://www.churvox.com[7m/login[27m"[39m

      145 |
      146 |   const finalUrl = page.url();
    > 147 |   expect(finalUrl, `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
          |                                                                      ^
      148 |   if (role === 'worker') {
      149 |     expect(finalUrl, 'worker login did not reach a worker route').toMatch(/\/worker(?:[/?#]|$)/i);
      150 |   } else {
        at login (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:147:70)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:167:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-desktop-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-desktop-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-desktop-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-desktop-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-desktop-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  7) [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes 

    Error: owner login did not leave the login page

    [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoMatch[2m([22m[32mexpected[39m[2m)[22m

    Expected pattern: not [32m/\/login(?:[?#]|$)/i[39m
    Received string:      [31m"https://www.churvox.com[7m/login[27m"[39m

      145 |
      146 |   const finalUrl = page.url();
    > 147 |   expect(finalUrl, `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
          |                                                                      ^
      148 |   if (role === 'worker') {
      149 |     expect(finalUrl, 'worker login did not reach a worker route').toMatch(/\/worker(?:[/?#]|$)/i);
      150 |   } else {
        at login (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:147:70)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:167:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-desktop-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-desktop-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-desktop-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-desktop-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-desktop-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  8) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday 

    Error: owner login did not leave the login page

    [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoMatch[2m([22m[32mexpected[39m[2m)[22m

    Expected pattern: not [32m/\/login(?:[?#]|$)/i[39m
    Received string:      [31m"https://www.churvox.com[7m/login[27m"[39m

      145 |
      146 |   const finalUrl = page.url();
    > 147 |   expect(finalUrl, `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
          |                                                                      ^
      148 |   if (role === 'worker') {
      149 |     expect(finalUrl, 'worker login did not reach a worker route').toMatch(/\/worker(?:[/?#]|$)/i);
      150 |   } else {
        at login (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:147:70)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:167:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-fcca6-and-is-launch-clean-planday-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  9) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs 

    Error: owner login did not leave the login page

    [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoMatch[2m([22m[32mexpected[39m[2m)[22m

    Expected pattern: not [32m/\/login(?:[?#]|$)/i[39m
    Received string:      [31m"https://www.churvox.com[7m/login[27m"[39m

      145 |
      146 |   const finalUrl = page.url();
    > 147 |   expect(finalUrl, `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
          |                                                                      ^
      148 |   if (role === 'worker') {
      149 |     expect(finalUrl, 'worker login did not reach a worker route').toMatch(/\/worker(?:[/?#]|$)/i);
      150 |   } else {
        at login (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:147:70)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:167:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-0faf2-ns-and-is-launch-clean-jobs-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  10) [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes 

    Error: owner login did not leave the login page

    [2mexpect([22m[31mreceived[39m[2m).[22mnot[2m.[22mtoMatch[2m([22m[32mexpected[39m[2m)[22m

    Expected pattern: not [32m/\/login(?:[?#]|$)/i[39m
    Received string:      [31m"https://www.churvox.com[7m/login[27m"[39m

      145 |
      146 |   const finalUrl = page.url();
    > 147 |   expect(finalUrl, `${role} login did not leave the login page`).not.toMatch(/\/login(?:[?#]|$)/i);
          |                                                                      ^
      148 |   if (role === 'worker') {
      149 |     expect(finalUrl, 'worker login did not reach a worker route').toMatch(/\/worker(?:[/?#]|$)/i);
      150 |   } else {
        at login (/home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:147:70)
        at /home/runner/work/churvox/churvox/frontend/tests/e2e/churvox-big-launch-audit.spec.js:167:5

    attachment #1: screenshot (image/png) ──────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-mobile-chromium/test-failed-1.png
    ────────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ──────────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-mobile-chromium/video.webm
    ────────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-mobile-chromium/error-context.md

    attachment #4: trace (application/zip) ─────────────────────────────────────────────────────────
    test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-mobile-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/churvox-big-launch-audit-C-ec4d1--and-is-launch-clean-quotes-mobile-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  4 failed
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:179:3 › Churvox full launch owner audit › sidebar keeps full launch feature navigation 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:211:3 › Churvox full launch worker audit › worker job detail has real field controls when a job is assigned 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:179:3 › Churvox full launch owner audit › sidebar keeps full launch feature navigation 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:211:3 › Churvox full launch worker audit › worker job detail has real field controls when a job is assigned 
  6 flaky
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs 
    [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs 
    [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:171:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes 
  72 passed (7.8m)
```
