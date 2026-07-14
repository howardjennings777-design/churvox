# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: 739393ca1cb161876ecc726602372fa91ffe5353
- Run: 29352173094
- Status code: 0
- Passed: 86
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Audit fixture cleanup: success
- Authenticated audit required: yes
- Time: Tue Jul 14 17:08:12 UTC 2026

## Output
```txt

Running 86 tests using 2 workers

  ✓   1 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (2.0s)
  ✓   2 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (2.3s)
  ✓   3 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.5s)
  ✓   4 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.7s)
  ✓   5 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (1.6s)
  ✓   6 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (2.0s)
  ✓   7 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (1.5s)
  ✓   9 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (1.4s)
  ✓   8 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (2.4s)
  ✓  10 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.2s)
  ✓  12 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (1.1s)
  ✓  11 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (2.3s)
  ✓  14 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.4s)
  ✓  15 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (949ms)
  ✓  13 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (3.9s)
  ✓  16 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (4.3s)
  ✓  17 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (4.4s)
  ✓  18 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (5.5s)
  ✓  19 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (4.6s)
  ✓  20 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (4.1s)
  ✓  21 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (4.2s)
  ✓  22 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (4.1s)
  ✓  23 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (4.1s)
  ✓  24 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (4.1s)
  ✓  25 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (4.0s)
  ✓  26 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (3.8s)
  ✓  27 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (3.9s)
  ✓  28 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (3.8s)
  ✓  29 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (3.9s)
  ✓  30 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (4.1s)
  ✓  31 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (4.3s)
  ✓  32 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (4.1s)
  ✓  33 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.9s)
  ✓  34 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (4.0s)
  ✓  35 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (4.1s)
  ✓  36 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (4.0s)
  ✓  37 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.9s)
  ✓  38 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (4.0s)
  ✓  39 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (4.0s)
  ✓  40 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.9s)
  ✓  41 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (3.9s)
  ✓  42 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (3.8s)
  ✓  43 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (3.9s)
  ✓  44 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (4.0s)
  ✓  45 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (4.0s)
  ✓  46 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (4.0s)
  ✓  47 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (4.0s)
  ✓  48 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.9s)
  ✓  49 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.9s)
  ✓  50 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.9s)
  ✓  51 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (4.0s)
  ✓  52 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (4.0s)
  ✓  53 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (4.0s)
  ✓  54 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (4.1s)
  ✓  55 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (4.1s)
  ✓  56 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (4.2s)
  ✓  57 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (4.2s)
  ✓  58 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (4.0s)
  ✓  59 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (4.0s)
  ✓  60 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (4.1s)
  ✓  61 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (4.0s)
  ✓  62 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (4.3s)
  ✓  63 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (4.2s)
  ✓  64 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (3.8s)
  ✓  65 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (3.8s)
  ✓  66 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (4.0s)
  ✓  67 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (4.0s)
  ✓  68 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (3.9s)
  ✓  69 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (4.0s)
  ✓  70 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (3.8s)
  ✓  71 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (3.9s)
  ✓  72 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (3.9s)
  ✓  73 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (4.0s)
  ✓  74 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (4.0s)
  ✓  75 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (4.0s)
  ✓  76 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (4.1s)
  ✓  77 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (4.0s)
  ✓  78 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (4.2s)
  ✓  79 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (4.1s)
  ✓  80 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (3.9s)
  ✓  81 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (5.9s)
  ✓  82 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (6.7s)
  ✓  83 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.4s)
  ✓  84 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (6.1s)
  ✓  85 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (14.3s)
  ✓  86 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (13.0s)

  86 passed (2.9m)
```
