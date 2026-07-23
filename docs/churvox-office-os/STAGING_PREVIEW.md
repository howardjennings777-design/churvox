# Churvox Office OS private staging preview

## Release candidate

- Source commit: `6203e33790dc0c4d30e0236c0fbba2211aa8c980`
- Staging branch: `staging/churvox-office-os-preview`
- Render Blueprint file: `render-staging.yaml`
- Production services are not named, adopted, modified or redeployed by this Blueprint.

## Safety model

The staging frontend requires HTTP Basic Auth before it serves pages or proxies API traffic. Every response includes `X-Robots-Tag: noindex, nofollow, noarchive`.

The staging backend is a Render private service. `CHURVOX_STAGING_READ_ONLY=true` blocks every non-read API request before the business route runs, except sign-in, token refresh and sign-out. The blocked response confirms that nothing was sent, charged, synced, filed, paid, deleted or changed.

Render auto-deploy is disabled for both services. A new deployment must be started deliberately.

## Create the Render Blueprint

1. In Render, create a new Blueprint from `howardjennings777-design/churvox`.
2. Set the Blueprint file path to `render-staging.yaml`.
3. Keep the linked branch as `staging/churvox-office-os-preview`.
4. Supply these secret values when Render prompts:
   - `MONGO_URL`
   - `DB_NAME`
   - `FRONTEND_URL` — normally `https://churvox-office-os-staging.onrender.com`
   - `CHURVOX_STAGING_USER`
   - `CHURVOX_STAGING_PASSWORD`
5. Confirm that Render is creating two new services only:
   - `churvox-office-os-staging-backend`
   - `churvox-office-os-staging`
6. Do not approve any screen that proposes modifying `grassley-backend`, `www.churvox.com`, or another existing Churvox service.

For the cleanest isolation, use a staging Atlas database containing sanitized test data. For a read-only visual walkthrough using existing accounts, the normal database can be used because the staging HTTP guard blocks business mutations; do not disable `CHURVOX_STAGING_READ_ONLY`.

## Human walkthrough

Open the protected staging URL on desktop and mobile and verify:

1. Public website: Home, Product, Pricing, Industries, Demo, Trust, Support and Contact.
2. Authentication: owner login reaches the private Office OS; worker login reaches the field app.
3. Owner Office OS: Today, Command, Work, Clients, Money, Messages, Team, Reports and Settings load without fake fallback records.
4. Command: all six prepared record types render and remain editable; attempting approval returns the staging read-only safety response.
5. Worker: assigned-job queue, field card, notes, proof and timer controls render correctly; mutating controls are safely rejected by staging.
6. HQ: overview, businesses, billing, testers, support, incidents, releases and data controls load as read-only views.
7. Mobile: navigation, dialogs, forms, overflow and sticky headers remain usable without horizontal clipping.
8. Safety: no email, SMS, charge, payment, accounting sync, payroll action, delete or record change occurs.

## Acceptance record

Record the following before any merge or live cutover:

- Staging frontend URL
- Backend deploy ID
- Frontend deploy ID
- Source SHA
- Desktop walkthrough result
- Mobile walkthrough result
- Owner login result
- Worker login result
- Command safety result
- Any screenshots or issues

## Rollback and shutdown

Because staging uses separate Render services, rollback is immediate: suspend or delete `churvox-office-os-staging` and `churvox-office-os-staging-backend`. Production remains on its existing branch and services throughout.

Do not merge PR #746 or point production Render services at the staging branch until the walkthrough is accepted separately.
