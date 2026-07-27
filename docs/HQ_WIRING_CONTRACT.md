# Churvox HQ wiring contract

The active `/admin` page is one React console. It is not considered wired unless the automated HQ Wiring Gate proves the complete chain below.

## Protected route

`/admin` must render `ChurvoxHQPage` through `PlatformAdminRoute`. Only verified platform-owner identities may enter.

## Live reads

The console must request all eight owner-only sources through the frontend's same-origin `/api` proxy:

- `/api/admin/owner-overview`
- `/api/admin/owner/paid-launch-report`
- `/api/admin/owner/growth-report`
- `/api/admin/owner/testers`
- `/api/admin/owner/plan-report`
- `/api/admin/owner/control-log`
- `/api/admin/owner/connection`
- `/api/admin/owner/retention-email-status`

Each request must include the authenticated owner session. Results must not be cached. Failed or locked sources must remain visible in the HQ rather than being replaced with sample figures.

## Protected writes

Tester invitations use `/api/admin/owner/tester-intake`. Tester grant and revoke controls use `/api/admin/owner/control-access`. Both routes must remain platform-owner protected and must write to the real user, tester and control-log collections before the HQ refreshes its live reads.

## Automatic release proof

`.github/workflows/churvox-hq-wiring-gate.yml` runs on every relevant pull request and push to `main`. It builds the production frontend, starts the exact production API proxy, and runs a Playwright contract that fails unless all eight reads and both protected tester write paths are observed with owner authentication.
