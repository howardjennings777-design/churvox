# Churvox Full Launch Audit

- Site: https://www.churvox.com
- Commit: 004dec171d2b121b190431702fcc7dac4efefaf6
- Run: 29575115882
- Status code: 0
- Passed: 86
- Skipped: 0
- Owner credential: success
- Linked worker discovery: success
- Audit fixture cleanup: success
- Authenticated audit required: yes
- Time: Fri Jul 17 11:00:23 UTC 2026

## Output
```txt

Running 86 tests using 2 workers

  ✓   1 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (1.8s)
  ✓   2 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: / (2.4s)
  ✓   3 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.4s)
  ✓   4 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /features (1.7s)
  ✓   5 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (1.5s)
  ✓   7 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (1.2s)
  ✓   6 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /pricing (2.0s)
  ✓   8 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (1.4s)
  ✓  10 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.1s)
  ✓   9 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /login (2.2s)
  ✓  11 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (1.2s)
  ✓  12 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /signup (2.2s)
  ✓  14 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /privacy (1.3s)
  ✓  15 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:277:5 › Churvox full launch public audit › public page is readable and launch-clean: /terms (959ms)
  ✓  13 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (4.1s)
  ✓  16 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:285:3 › Churvox authenticated login entry › owner login form creates the correct authenticated session (4.2s)
  ✓  17 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (4.4s)
  ✓  18 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:290:3 › Churvox authenticated login entry › worker login form creates the correct authenticated session (5.0s)
  ✓  19 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (4.5s)
  ✓  20 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: setupassistant (3.7s)
  ✓  21 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (3.7s)
  ✓  22 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: command (3.7s)
  ✓  23 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (3.8s)
  ✓  24 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: aioperator (3.6s)
  ✓  25 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (4.0s)
  ✓  26 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quickcreateai (3.6s)
  ✓  27 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (3.3s)
  ✓  28 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: planday (3.9s)
  ✓  29 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (3.7s)
  ✓  30 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: jobs (4.2s)
  ✓  31 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (4.2s)
  ✓  32 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: recurring (3.8s)
  ✓  33 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.7s)
  ✓  34 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: dispatch (3.7s)
  ✓  35 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (3.8s)
  ✓  36 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: routes (3.7s)
  ✓  37 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.8s)
  ✓  38 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: areas (3.6s)
  ✓  39 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.6s)
  ✓  40 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: clients (3.5s)
  ✓  41 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (3.6s)
  ✓  42 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quotes (4.0s)
  ✓  43 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (3.9s)
  ✓  44 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: quoteai (3.7s)
  ✓  45 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (3.7s)
  ✓  46 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoices (3.7s)
  ✓  47 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.7s)
  ✓  48 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: invoicecheck (3.9s)
  ✓  49 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.9s)
  ✓  50 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payments (3.8s)
  ✓  51 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (3.8s)
  ✓  52 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: team (3.7s)
  ✓  53 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (3.8s)
  ✓  54 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: payroll (3.8s)
  ✓  55 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (3.8s)
  ✓  56 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: time (3.8s)
  ✓  57 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (4.0s)
  ✓  58 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: xero (3.8s)
  ✓  59 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (3.7s)
  ✓  60 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: integrations (3.9s)
  ✓  61 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (3.8s)
  ✓  62 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: reports (3.9s)
  ✓  63 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (3.9s)
  ✓  64 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: profit (3.7s)
  ✓  65 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (3.7s)
  ✓  66 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: expenses (3.5s)
  ✓  67 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (3.6s)
  ✓  68 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: photos (3.6s)
  ✓  69 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (3.6s)
  ✓  70 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: documents (3.6s)
  ✓  71 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (3.7s)
  ✓  72 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: automation (3.8s)
  ✓  73 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (3.9s)
  ✓  74 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: launchcontrol (3.6s)
  ✓  75 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (3.6s)
  ✓  76 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: security (3.8s)
  ✓  77 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (3.8s)
  ✓  78 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: settings (3.6s)
  ✓  79 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (3.5s)
  ✓  80 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:303:5 › Churvox full launch owner audit › owner area opens and is launch-clean: support (3.7s)
  ✓  81 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (5.1s)
  ✓  82 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:311:3 › Churvox full launch owner audit › owner navigation keeps every current launch page (6.0s)
  ✓  83 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.0s)
  ✓  84 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:346:3 › Churvox full launch worker audit › worker jobs page is launch-clean and worker-scoped (5.9s)
  ✓  85 [desktop-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (13.0s)
  ✓  86 [mobile-chromium] › tests/e2e/churvox-big-launch-audit.spec.js:354:3 › Churvox full launch worker audit › worker job detail has real field controls for an assigned job (12.4s)

  86 passed (2.7m)
```
