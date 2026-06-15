# Churvox Site Audit — 2026-06-16

## Priority 0 — Access blocker

### Login currently fails for the owner account
Observed user-facing error: `Invalid email or password.`

Static code finding:
- `POST /api/auth/login` only finds the user by exact lower-case email and only checks `password_hash`.
- The route returns `401` with `Invalid email or password` when the user is missing or the password hash does not verify.
- Failed attempts are stored for 15 minutes and can keep causing problems while testing.

Impact:
- Owner can be locked out of Churvox.
- Stripe checkout, plans, dashboard and admin testing cannot continue.

Needed fix:
- Inspect the production user record for `howardjennings77@gmail.com` in MongoDB Atlas.
- Confirm the stored email casing and password field name.
- Confirm whether the password reset route updated the same record.
- Clear login attempts for that email/IP after a successful reset.
- Add a safe server-side debug log for login lookup only: whether the email was found and whether a password hash exists. Do not log passwords.

## Priority 1 — Password reset is misleading

Observed:
- The forgot password UI says a reset was sent, but Gmail search did not show a recent password reset email.

Static code finding:
- Backend intentionally returns a generic message from `/auth/forgot-password` even if the user is not found or email sending fails.

Impact:
- The owner cannot tell whether the reset email failed, the email was wrong, or the account was not found.

Needed fix:
- In production/admin mode, expose a safe reset status such as `email_sent: true/false` without exposing account details publicly.
- Log Postmark provider error if send fails.

## Priority 2 — Checkout route / auth restore

Fixed recently:
- Plans page no longer uses the broken hidden form checkout route.
- Plans page now calls the backend checkout API and redirects only after Stripe returns a checkout URL.
- Plans page no longer defaults the current plan badge to Operator when no real backend plan exists.
- Auth context now attempts cookie-session auth when no local token exists.

Needs verification:
- Frontend deploy must show trace `checkout-js-trace-plan-status-fix-v18` on `/plans`.
- Login restoration must be retested after owner access is restored.

## Priority 3 — Login page styling

Fixed recently:
- Login page was using class names that did not match its CSS.
- Updated login page now uses the `cvPublicAuth...` styled shell.

Needs verification:
- Hard refresh `/login` after frontend deploy.

## Priority 4 — Backend route conflicts

Finding:
- Older checkout routes still exist in `backend/server.py`.
- Route override logic in `backend/sms_provider.py` attempts to remove and replace checkout routes.

Risk:
- Route ordering and monkeypatching can hide the real active route.

Needed fix:
- After owner access is restored, run a live route smoke test against Render for:
  - `/api/auth/me`
  - `/api/billing/subscription-status`
  - `/api/billing/create-checkout-session`
  - `/api/billing/confirm-checkout`

## Priority 5 — Full website smoke test after login works

Run through:
1. Public home page
2. Login
3. Plans page
4. Stripe checkout return
5. Dashboard / Business Pulse
6. Jobs
7. Clients
8. Quotes
9. Invoices
10. Settings
11. Team Access
12. Worker routes
13. Admin routes
14. Password reset
15. Email verification

## Current conclusion

The immediate blocker is not Stripe now. It is account access: login/password reset must be repaired or verified in production data before the rest of the app can be tested properly.
