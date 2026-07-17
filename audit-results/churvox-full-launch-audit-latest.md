# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: 6bbb8a1801a58aa2b6916760415a794c00a01a94
- Run: 29606378237
- Status code: 0
- Passed: 86
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Audit fixture cleanup: success
- Authenticated audit required: yes
- Time: Fri Jul 17 19:12:18 UTC 2026

## Output
```txt

Running 86 tests using 2 workers

  ✓   1 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (1.9s)
  ✓   2 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (2.6s)
  ✓   3 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.4s)
  ✓   4 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.7s)
  ✓   5 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (1.5s)
  ✓   7 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (1.3s)
  ✓   6 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (2.1s)
  ✓   8 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (1.4s)
  ✓  10 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.1s)
  ✓   9 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (2.3s)
  ✓  11 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (959ms)
  ✓  12 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (2.3s)
  ✓  14 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.3s)
  ✓  13 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (3.4s)
  ✓  15 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (945ms)
  ✓  16 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (4.2s)
  ✓  17 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (4.8s)
  ✓  18 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (3.9s)
  ✓  19 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (4.0s)
  ✓  20 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (4.0s)
  ✓  21 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (3.6s)
  ✓  22 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (4.0s)
  ✓  23 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (3.9s)
  ✓  24 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (3.9s)
  ✓  25 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (3.9s)
  ✓  26 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (3.8s)
  ✓  27 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (3.9s)
  ✓  28 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (3.8s)
  ✓  29 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (3.7s)
  ✓  30 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (3.8s)
  ✓  31 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (3.9s)
  ✓  32 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.7s)
  ✓  33 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (3.8s)
  ✓  34 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (3.9s)
  ✓  35 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.8s)
  ✓  36 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.7s)
  ✓  37 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (3.7s)
  ✓  38 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.6s)
  ✓  39 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.8s)
  ✓  40 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (3.8s)
  ✓  41 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.9s)
  ✓  42 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (3.8s)
  ✓  43 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (3.8s)
  ✓  44 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (4.0s)
  ✓  45 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (3.9s)
  ✓  46 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.7s)
  ✓  47 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (3.8s)
  ✓  48 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.8s)
  ✓  49 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.7s)
  ✓  50 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (3.9s)
  ✓  51 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (4.0s)
  ✓  52 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (3.8s)
  ✓  53 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (3.7s)
  ✓  54 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (3.8s)
  ✓  55 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (3.8s)
  ✓  56 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (3.8s)
  ✓  57 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (3.8s)
  ✓  58 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (3.7s)
  ✓  59 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (3.8s)
  ✓  60 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (3.8s)
  ✓  61 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (3.7s)
  ✓  62 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (3.9s)
  ✓  63 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (3.9s)
  ✓  64 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (3.6s)
  ✓  65 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (3.5s)
  ✓  66 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (3.8s)
  ✓  67 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (3.9s)
  ✓  68 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (3.9s)
  ✓  69 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (3.8s)
  ✓  70 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (3.7s)
  ✓  71 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (3.7s)
  ✓  72 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (3.7s)
  ✓  73 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (3.7s)
  ✓  74 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (3.8s)
  ✓  75 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (4.1s)
  ✓  76 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (3.9s)
  ✓  77 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (3.5s)
  ✓  78 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (3.6s)
  ✓  79 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (3.7s)
  ✓  81 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (4.1s)
  ✓  80 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (5.3s)
  ✓  82 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (5.8s)
  ✓  83 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.3s)
  ✓  84 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.5s)
  ✓  85 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (13.3s)
  ✓  86 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (12.3s)

  86 passed (2.8m)
```
