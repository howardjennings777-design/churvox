# Churvox Feature Status Matrix

| Area | Route/page | Backend endpoints | Status | Launch risk | Manual test required | Notes |
|---|---|---|---|---|---|---|
| Auth | `/login`, `/signup`, `/forgot-password`, `/reset-password` | `/auth/*` + protected API auth checks | Built, needs live test | High | Yes | Must verify owner/worker/payroll login routing in browser. |
| Plans / trial / Stripe | `/plans` | `/billing/status`, `/billing/start-trial`, `/stripe/create-checkout-session`, `/billing/confirm-checkout`, billing webhook | Built, needs live test | High | Yes | Stripe behavior depends on env and product/price setup. |
| Jobs | `/jobs`, `/jobs/new`, `/jobs/:id` | `/jobs*`, assignment/status endpoints | Built, needs live test | High | Yes | Business landing remains `/jobs`. |
| Worker jobs | `/worker/jobs`, `/worker/jobs/:id` | worker job action endpoints | Built, needs live test | High | Yes | Worker privacy and action flow require live validation. |
| Clients | `/clients`, `/clients/new`, `/clients/:id` | `/clients*`, `/clients/import-csv` | Built, needs live test | Medium | Yes | CSV import depends on data quality. |
| Quotes | `/quotes`, `/quotes/new`, `/quotes/:id` | `/quotes*` | Built, needs live test | Medium | Yes | Acceptance and conversion need browser test. |
| Public quote | `/public/quote/:token` | public quote token endpoints | Built, needs live test | Medium | Yes | Validate fake token = not found state. |
| Invoices | `/invoices`, `/invoices/new`, `/invoices/:id` | `/invoices*` | Built, needs live test | High | Yes | Pay Now visibility must follow payment link presence only. |
| Public invoice | `/public/invoice/:token` | public invoice token endpoints | Built, needs live test | Medium | Yes | Validate fake token = not found state. |
| Team | `/team` | `/team*`, `/team/import-csv` | Built, needs live test | Medium | Yes | Role changes and invite flow are launch-critical. |
| Payroll / Timesheets | `/timesheets` | `/timesheets`, `/timesheets/summary`, `/timesheets/{id}/approve`, `/timesheets/{id}/reject`, `/payroll/summary`, `/payroll/export.csv` | Manual only | High | Yes | Manual review/export model only; no tax/bank/government submission. |
| Smart Hub | `/smart-hub` | summary/assistant endpoints | Built, needs live test | Medium | Yes | AI fallback expected when provider not configured. |
| Reports | `/reports` | `/reports/summary`, CSV exports | Built, needs live test | Medium | Yes | CSV download behavior depends on auth/env/data. |
| SMS | `/sms` | `/sms/balance`, `/sms/history`, `/sms/send`, `/sms/buy-credits` | Built, needs live test | High | Yes | Sending must remain confirmation/manual; provider may be not configured. |
| MYOB / Integrations | `/integrations` | `/myob/status`, `/myob/settings`, `/myob/test-connection`, `/myob/oauth/start`, `/myob/oauth/callback`, invoice sync/pull endpoints | Not configured until env set | High | Yes | MYOB requires OAuth env vars; sync remains manual only. |
| Automation | `/automation`, `/automation/runs` | `/automation/templates`, `/automation/rules`, `/automation/runs`, `/automation/runs/{run_id}/retry` | Built, needs live test | Medium | Yes | Approval-first and safe retry behavior should be validated live. |
| Notifications | `/notifications` | `/notifications`, `/notifications/{id}/read`, `/notifications/read-all` | Built, needs live test | Low | Yes | Read / read-all API exists; verify UI marks state correctly. |
| Mobile / PWA | mobile layouts, install prompt | manifest/service worker/browser APIs | Built, needs live test | Medium | Yes | Requires real device/viewport checks for tap safety and overlays. |
| Seed data | n/a | `scripts/churvox_seed_launch_test_data.py` | Built | Low | No | Script compiles in this pass. |
| Smoke tests | `scripts/churvox_launch_smoke.sh` | mixed API + frontend checks | Built, needs live test | Medium | Yes | Blocked in this environment by npm registry 403. |
| Render deploy | Render services | deploy pipeline + env config | Built, needs live test | High | Yes | Must be verified after GitHub push in Render dashboard. |
