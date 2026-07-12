# Churvox paid-launch status

Date: 12 July 2026

## Current decision

**BLOCK PAID LAUNCH until the live infrastructure actions and release gate below pass.**

The repository has received a deep paid-launch hardening pass, but code changes alone cannot prove that Render billing is clear, the latest deploy is serving, Stripe is using the new signed webhook, Postmark is delivering, or the live no-card checkout still matches the public promise.

## Fixed in repository

### Build and deployment

- Frontend Render build explicitly installs development build tools.
- Root build delegates to the frontend Render build.
- CRACO is a production build dependency.
- GitHub build/syntax/browser workflows added.
- Paid-launch Python guards are syntax-gated.

### Authentication and access

- Minimum password: 8 characters; maximum: 128.
- Signup requires Terms and Privacy consent and records policy versions/timestamps.
- Revoked, locked and disabled accounts cannot log in.
- Unverified paid owners cannot open private business records.
- Normal owner access requires real Stripe proof or a current tester grant.
- Worker accounts are blocked from owner API routes.
- Safe post-login return paths only.
- Internal lab, HQ and platform routes remain protected.

### Billing

- Selected plan is preserved Pricing → Signup → Plans → Stripe.
- Billing return separates Stripe confirmation from email verification.
- Stripe Billing Portal endpoint and Plans action added.
- Account deletion cancels live Stripe subscription before deleting data.
- Signed Stripe webhook route and status endpoint added.
- Webhook events are stored idempotently and handled after a quick response.
- Paid public invoices show zero due and no payment action.
- Public invoice links cannot mark themselves paid.
- Live test added to prove 14-day trial does not request a card.

### Customer documents and public requests

- Public quote, invoice, client-portal and proof APIs use strict allowlists.
- Internal IDs, private notes, tokens, audit fields and Stripe identifiers are not returned.
- Quote accept/decline is idempotent and creates owner review only.
- Work approval is unavailable until the business marks work complete.
- Public request form requires a verified business destination.
- Public requests validate contact details/photos, rate-limit submissions and create owner review without auto-booking or auto-quoting.

### HQ and testers

- HQ owner is `hello@churvox.com` only.
- Tester invite, original email casing, roster cleanup, grant and revoke have been rebuilt.
- Revoked/locked testers are terminal and cannot be revived by old control-log rows.
- Control-access endpoint is mounted in the live backend startup path.

### Trust, legal and indexing

- About, Security, Support and Billing/Cancellations pages added.
- Privacy Policy and Terms replaced with July 2026 paid-launch drafts.
- Security contact published at `/.well-known/security.txt`.
- Robots policy and sitemap added.
- Authenticated, billing, HQ, worker and tokenised customer routes are `noindex`.
- Tokenised customer links have no canonical URL.
- Public browser-security header policy added.

## Required live actions before launch

1. Clear the Render unpaid balance and confirm all services remain active.
2. Redeploy backend and frontend from the latest `main` commit.
3. Set a strong random `JWT_SECRET` with at least 32 characters.
4. Confirm Mongo, Stripe live secret and Postmark production credentials.
5. Re-enable/create Stripe endpoint:
   `https://grassley-backend.onrender.com/api/billing/webhook`
6. Set the live Stripe endpoint signing secret as `STRIPE_WEBHOOK_SECRET` in Render.
7. Send a signed Stripe test event and confirm HTTP 200.
8. Verify `/api/security/launch-status` returns `ready_for_paid_launch: true`.
9. Configure GitHub Actions owner, worker and signup test secrets.
10. Run **Churvox Paid Launch Release** with safe options first.
11. Run it again with real signup enabled and prove no card fields are shown during the trial.
12. Deliberately run mutation proof and then clean up test records.
13. Complete one manual owner → worker → customer → invoice → billing portal journey.
14. Have the legal/privacy wording reviewed for the launch markets.

## Automatic release gates

Workflow:

```text
Actions → Churvox Paid Launch Release
```

Required safe result:

```text
all desktop tests pass
all mobile tests pass
backend syntax passes
frontend production build passes
live security status is ready
signed webhook route is configured
HQ and control-access are mounted and protected
```

Required deliberate proof result:

```text
verification email delivered through Postmark
Operator plan reaches Stripe
14-day Stripe trial asks for no card
owner/worker flow passes
customer links expose only safe fields
billing portal opens
```

## Manual infrastructure warnings already received

- Render warned of an unpaid balance and possible service suspension.
- Render reported a frontend deployment failure with exit status 127.
- Stripe warned the live webhook endpoint had repeatedly failed and could be disabled.

These warnings must be resolved and re-tested. A successful code commit does not clear them.
