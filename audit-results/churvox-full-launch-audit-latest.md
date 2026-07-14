# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: b19c1708944cde02ead4371471783beab37eb3aa
- Run: 29344528283
- Status code: 0
- Passed: 86
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Audit fixture cleanup: success
- Authenticated audit required: yes
- Time: Tue Jul 14 15:22:37 UTC 2026

## Output
```txt

Running 86 tests using 2 workers

  ✓   1 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (1.6s)
  ✓   2 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (1.9s)
  ✓   3 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.5s)
  ✓   4 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.8s)
  ✓   5 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (1.4s)
  ✓   6 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (2.1s)
  ✓   7 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (1.4s)
  ✓   9 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (1.5s)
  ✓   8 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (2.2s)
  ✓  10 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.3s)
  ✓  12 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (1.0s)
  ✓  11 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (2.2s)
  ✓  14 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.3s)
  ✓  15 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (903ms)
  ✓  13 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (3.5s)
  ✓  16 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (4.3s)
  ✓  17 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (4.1s)
  ✓  18 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (4.7s)
  ✓  19 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (4.2s)
  ✓  20 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (4.2s)
  ✓  21 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (4.3s)
  ✓  22 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (3.8s)
  ✓  23 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (3.9s)
  ✓  24 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (4.1s)
  ✓  25 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (4.0s)
  ✓  26 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (4.3s)
  ✓  27 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (4.9s)
  ✓  28 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (4.3s)
  ✓  29 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (4.1s)
  ✓  30 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (4.2s)
  ✓  31 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (3.9s)
  ✓  33 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.8s)
  ✓  32 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (4.2s)
  ✓  34 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (3.6s)
  ✓  35 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.8s)
  ✓  36 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.6s)
  ✓  37 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (3.6s)
  ✓  38 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.7s)
  ✓  39 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.7s)
  ✓  40 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (3.7s)
  ✓  41 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.9s)
  ✓  42 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (4.0s)
  ✓  43 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (4.0s)
  ✓  44 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (3.8s)
  ✓  45 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (3.7s)
  ✓  46 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.7s)
  ✓  47 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (3.6s)
  ✓  48 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.7s)
  ✓  49 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.7s)
  ✓  50 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (3.8s)
  ✓  51 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.9s)
  ✓  52 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (3.7s)
  ✓  53 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (3.7s)
  ✓  54 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (3.9s)
  ✓  55 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (4.0s)
  ✓  56 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (3.7s)
  ✓  57 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (3.6s)
  ✓  58 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (3.9s)
  ✓  59 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (3.8s)
  ✓  60 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (4.4s)
  ✓  61 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (4.2s)
  ✓  63 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (4.0s)
  ✓  62 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (4.2s)
  ✓  64 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (3.9s)
  ✓  65 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (4.0s)
  ✓  66 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (3.9s)
  ✓  67 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (4.0s)
  ✓  68 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (48.5s)
  ✓  69 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (50.0s)
  ✓  70 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (27.5s)
  ✓  71 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (45.9s)
  ✓  72 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (23.9s)
  ✓  73 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (5.1s)
  ✓  74 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (4.3s)
  ✓  75 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (3.5s)
  ✓  76 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (3.8s)
  ✓  77 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (3.7s)
  ✓  78 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (3.9s)
  ✓  79 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (3.8s)
  ✓  80 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (3.7s)
  ✓  81 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (5.6s)
  ✓  82 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (5.9s)
  ✓  83 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.3s)
  ✓  84 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.7s)
  ✓  85 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (13.3s)
  ✓  86 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (12.1s)

  86 passed (4.3m)
```
