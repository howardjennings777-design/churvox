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
- Route planner advanced optimisation is not configured; manual sequence only.
- Push notifications require VAPID env and remain optional/manual test only.
- Customer account login foundation not configured; secure token links are primary.
- Recurring jobs next generation is manual confirmation-first.

- Route Planner is manual ordering only (no live GPS tracking).
- Push notifications require explicit backend env config.
- Customer login is foundation-only; secure token portal is primary flow.
