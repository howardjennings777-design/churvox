# Churvox Launch Known Limits

- SMS provider may be not configured until provider credentials and env are live.
- SMS credit checkout may require Stripe SMS price configuration.
- MYOB OAuth requires `MYOB_CLIENT_ID`, `MYOB_CLIENT_SECRET`, `MYOB_REDIRECT_URI`.
- MYOB sync is manual only.
- AI assistant falls back if AI provider is missing.
- Payroll is export/review only.
- No tax filing.
- No bank payouts.
- No government submission.
- Automation is approval-first.
- No automatic SMS/email.
- No automatic MYOB sync.
- Public Pay Now requires `payment_url`/`payment_link` on invoice.
- Smoke tests do not mutate production data.
