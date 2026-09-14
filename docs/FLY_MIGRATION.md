# Churvox Render → Fly.io migration

Status: preparation only. Render remains production until the Fly preview passes the paid-launch checks.

## Deployment shape

- Backend app: `churvox-backend` (Sydney / `syd`)
- Frontend app: `churvox-web` (Sydney / `syd`)
- Database: keep the existing MongoDB Atlas database; do not copy customer data into a new database.
- Existing Render services stay online during preview testing.
- Existing Render retention cron can stay online during the first cutover because it calls `https://www.churvox.com/...`; migrate it only after Fly production is stable.

Fly app names are globally unique. If either preferred name is unavailable, create a unique Churvox name and update `fly.backend.toml`, `fly.frontend.toml`, `BACKEND_PUBLIC_URL`, and `CHURVOX_BACKEND_URL` before deploying.

## 1. Create the two Fly apps

After logging into Fly locally:

```bash
fly apps create churvox-backend
fly apps create churvox-web
```

Do not change DNS yet.

## 2. Backend secrets

Copy the current production values from the existing hosting/provider dashboards directly into Fly secrets. Never paste secret values into the repository.

Required core values:

```text
MONGO_URL
DB_NAME
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
POSTMARK_SERVER_TOKEN
POSTMARK_FROM_EMAIL
PLATFORM_OWNER_EMAIL
```

Billing price IDs used by the current plan resolver should also be carried over, including the active country-specific Start/Crew/Operator/Command and add-on IDs used in production. Keep any legacy Stripe price variables that are still configured until the Fly launch gate proves they are no longer needed.

Xero values:

```text
XERO_CLIENT_ID
XERO_CLIENT_SECRET
XERO_REDIRECT_URI
```

The preview redirect should use the final Fly backend app name, for example:

```text
https://churvox-backend.fly.dev/api/xero/callback
```

Register that preview callback in Xero before testing it. Do not remove the existing production callback until DNS/callback cutover is complete.

Email:

```text
POSTMARK_SERVER_TOKEN
POSTMARK_FROM_EMAIL=hello@churvox.com
```

SMS, when live SMS is enabled:

```text
SMS_ENABLED=true
SMS_PROVIDER=clicksend
CLICKSEND_USERNAME
CLICKSEND_API_KEY
CLICKSEND_DEFAULT_COUNTRY=NZ
```

Scheduled retention/outreach secrets such as `RETENTION_CRON_SECRET` remain required by whichever scheduler runs those jobs.

## 3. Deploy backend preview

From the repository root:

```bash
fly deploy -c fly.backend.toml
```

Verify before continuing:

```text
GET https://churvox-backend.fly.dev/api/healthz
GET https://churvox-backend.fly.dev/api/security/launch-status
GET https://churvox-backend.fly.dev/api/billing/webhook-status
GET https://churvox-backend.fly.dev/api/command/live-smoke-marker
```

Do not point the live Stripe webhook at Fly yet.

## 4. Deploy frontend preview

```bash
fly deploy -c fly.frontend.toml
```

The Fly frontend is built with `REACT_APP_SAME_ORIGIN_API=1`, so browser API calls use the frontend's own `/api` proxy. The proxy target is set by `CHURVOX_BACKEND_URL` at runtime. This lets the temporary `*.fly.dev` site be tested without widening production CORS rules.

Verify on the Fly frontend URL:

- homepage, Product, Pricing and Demo
- NZ and Australia SEO landing pages
- signup and email verification
- owner login/logout
- worker login and assigned-job workflow
- clients, jobs, quotes and invoices
- Stripe trial/checkout and billing portal
- Xero connection after the Fly callback is registered
- Postmark transactional email
- ClickSend SMS if enabled
- owner HQ access and business isolation
- mobile layout and PWA basics

## 5. Stripe webhook cutover

Keep the existing Render Stripe webhook active while Fly is still a preview.

When the Fly backend is proven, create/enable the Fly webhook endpoint:

```text
https://churvox-backend.fly.dev/api/billing/webhook
```

Use the signing secret issued for that endpoint as `STRIPE_WEBHOOK_SECRET` on Fly. Send a signed test event and verify the expected 2xx response before disabling the old Render endpoint.

## 6. Production domain cutover

Only after the preview passes:

1. Add `www.churvox.com` to the Fly frontend certificate configuration.
2. Use the exact DNS records Fly displays for the app; do not guess IPs or CNAME targets.
3. Change DNS at the current DNS provider.
4. Verify the certificate is issued and `https://www.churvox.com` serves the Fly frontend.
5. Change Fly backend `FRONTEND_URL` to `https://www.churvox.com` if it was temporarily changed for preview testing.
6. Re-run the complete paid-launch and public SEO checks.
7. Keep Render available as rollback until production has remained healthy.

## 7. GitLab after first Fly deploy

GitHub currently contains the newest Churvox code. The GitLab import must be synchronized before it becomes a deploy source.

Once GitLab is verified against current main, add manual GitLab deployment jobs first. Store Fly deploy tokens as masked/protected GitLab CI variables, export the appropriate token as `FLY_API_TOKEN`, and run `fly deploy --remote-only` using the matching config. Do not enable automatic production deployment until the manual Fly deploy path is proven.

Use separate app-scoped Fly deploy tokens for frontend and backend where practical.

## Rollback rule

Until the migration is explicitly complete, Render is the rollback target. If Fly preview or cutover fails any auth, billing, worker, owner, integration or public-site check, restore/retain the existing Render routing and investigate before trying again.
