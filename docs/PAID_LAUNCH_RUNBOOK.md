# Churvox paid-launch runbook

Last updated: 12 July 2026

This is the release checklist for `www.churvox.com` and `grassley-backend.onrender.com`.

## Hard release rule

Do not advertise or accept paid customers until every required item below is complete and the **Churvox Paid Launch Release** GitHub Actions workflow passes against the deployed production services.

## Product rules that must not change

- Start: NZD $39/month + GST
- Crew: NZD $89/month + GST
- Operator: NZD $149/month + GST
- Command: NZD $299/month + GST
- Command Growth Pack: NZD $99/month + GST
- 14-day trial, no card upfront
- Churvox prepares admin. The owner checks and approves.
- Nothing important auto-sends, auto-syncs, charges, changes records, files tax or pays anyone without the authorised owner action.
- Platform HQ owner: `hello@churvox.com` only.

## 1. Clear hosting billing before deploy

Render must have a valid payment method and no overdue balance. An unpaid Render account can suspend the frontend, backend and scheduled jobs even if the code is correct.

Check all production services:

- `grassley-frontend`
- `grassley-backend`
- `churvox-frontend-new`
- `churvox-platform-owner-cron`

## 2. Required backend environment variables

Set these in the production backend. Never commit the values.

```text
FRONTEND_URL=https://www.churvox.com
MONGO_URL=<production Mongo URL>
DB_NAME=<production database name>
JWT_SECRET=<random secret of at least 32 characters>
STRIPE_SECRET_KEY=<live sk_ key>
STRIPE_WEBHOOK_SECRET=<live whsec_ endpoint signing secret>
POSTMARK_SERVER_TOKEN=<production Postmark token>
POSTMARK_FROM_EMAIL=hello@churvox.com
PLATFORM_OWNER_EMAIL=hello@churvox.com
```

Remove or correct environment variables that add extra platform-owner/admin emails. The security gate expects `hello@churvox.com` only.

## 3. Stripe webhook

Create or re-enable this live endpoint in Stripe:

```text
https://grassley-backend.onrender.com/api/billing/webhook
```

At minimum subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`

Copy the endpoint signing secret to Render as `STRIPE_WEBHOOK_SECRET`, redeploy the backend, then send a Stripe test event. The backend must reject an unsigned event with HTTP 400 and accept a properly signed event with HTTP 200.

## 4. Deploy order

1. Deploy `grassley-backend` from the latest `main` commit.
2. Wait for backend health and security endpoints to pass.
3. Deploy the production frontend from the same latest `main` commit.
4. Hard-refresh the browser before manual checks.

Required backend checks:

```text
GET /api/healthz
GET /api/security/launch-status
GET /api/billing/webhook-status
GET /api/command/live-smoke-marker
```

`/api/security/launch-status` must return `ready_for_paid_launch: true`.

## 5. GitHub release workflow

Open **Actions → Churvox Paid Launch Release → Run workflow**.

First run:

- `run_real_signup`: off
- `run_real_mutation`: off

This checks the build, Python syntax, live infrastructure, auth, billing, HQ, public documents, public request form, role boundaries, desktop and mobile.

Second deliberate proof run:

- `run_real_signup`: on
- `run_real_mutation`: on only when production test records are acceptable

Required repository secrets:

```text
CHURVOX_OWNER_EMAIL
CHURVOX_OWNER_PASSWORD
CHURVOX_WORKER_EMAIL
CHURVOX_WORKER_PASSWORD
CHURVOX_E2E_EMAIL
CHURVOX_E2E_PASSWORD
CHURVOX_E2E_SIGNUP_BASE_EMAIL
```

The real signup proof must reach Stripe and confirm there are no card-entry fields during the advertised trial.

## 6. Manual customer journey

Use a fresh owner email and complete:

1. Pricing → Operator → Start free trial.
2. Signup with Terms and Privacy consent.
3. Confirm the verification email arrived.
4. Complete Stripe trial checkout.
5. Confirm the billing return does not open private records until the email is verified.
6. Verify the email and open setup.
7. Complete business profile.
8. Create a client.
9. Create a job and assign a real test worker.
10. Worker acknowledges, starts, pauses, resumes and completes the job.
11. Worker uploads proof and a note.
12. Owner receives the update in context.
13. Prepare a quote; customer accepts the public quote.
14. Confirm acceptance creates owner review and does not take payment.
15. Prepare an invoice; verify the public invoice contains no internal IDs or private notes.
16. Confirm the customer cannot mark the invoice paid.
17. Verify actual payment status updates only through the owner or signed provider event.
18. Open Plans → Manage billing and verify Stripe Billing Portal opens.
19. Return without cancelling, then verify the subscription remains active.

## 7. HQ check

Log in as `hello@churvox.com` and check:

- Command metrics use live data.
- Testers show one clean row per email.
- Invite tester sends the welcome email.
- Revoke moves the tester into Revoked/locked and blocks login/access.
- `/api/admin/owner/control-access` is mounted and protected.
- System endpoints show no failures.
- No other email can open HQ routes.

## 8. Customer-document privacy

For quote, invoice, client portal and proof links verify:

- the page has `noindex, nofollow`;
- no Mongo IDs, business IDs, worker IDs, Stripe IDs, private notes, tokens or audit fields are returned;
- quote acceptance/decline is final and idempotent;
- work approval is unavailable until work is complete;
- paid invoices show zero due and no payment button;
- public token holders cannot change payment status.

## 9. Support and legal

Verify these pages load on desktop and mobile:

- `/about`
- `/security`
- `/support`
- `/contact`
- `/legal/privacy`
- `/legal/terms`
- `/refunds-cancellations`
- `/delete-account`

Have New Zealand legal/privacy wording reviewed before broad public promotion. The repository wording is an operational launch draft, not legal advice.

## 10. Cancellation and deletion

- Customer subscription changes and cancellation happen through Stripe Billing Portal.
- Access changes only after the signed webhook updates the account.
- Account deletion must cancel any live Stripe subscription first.
- If Stripe cancellation fails, account deletion must stop and show an error.
- The platform-owner account cannot be deleted through the customer flow.

## 11. Rollback

If a release causes authentication, billing or record-isolation problems:

1. Pause new marketing immediately.
2. Put the owner app into maintenance mode if required; keep public support available.
3. Roll back frontend and backend to the last known-good matching commits.
4. Do not manually mark subscriptions paid or active to bypass a webhook problem.
5. Preserve Stripe event IDs and backend logs for investigation.
6. Run the release workflow again after the correction.

## 12. Launch decision

Paid launch is approved only when:

- Render billing is clear;
- both services deploy successfully;
- production security status is ready;
- Stripe webhook is signed and tested;
- Postmark delivery is configured;
- GitHub release workflow passes;
- fresh owner and worker journeys pass;
- no-card trial is proven on the live Stripe checkout;
- legal/privacy review is accepted by the business owner.
