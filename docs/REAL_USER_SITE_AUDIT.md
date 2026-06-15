# Churvox Real User Site Audit

Created after live testing showed the user could not sign in and checkout redirects could trap the browser on `/login?cacheReset=restored-checkout`.

## Priority 0 — sign in must work first

### Current findings
- `/login?cacheReset=restored-checkout` was being treated as a checkout restore page rather than a normal login page.
- The previous behavior could send an unsigned-out user back toward `/plans` instead of letting them sign in.
- Login page styling needs to survive CSS/cache failures, because a broken plain login screen makes real testing impossible.

### Fixes pushed
- `67ac18f` — keep checkout restore on login until signed in.
- `6c0fb42` — stabilize login page with inline fallback styling.

### Test
1. Open `/login` directly.
2. Enter owner email and password.
3. Confirm the orange Sign in button changes to `Signing in...`.
4. Confirm the app lands on the correct route:
   - Platform owner: `/admin`
   - Business owner/manager: `/dashboard`
   - Worker: `/worker/jobs`
   - Payroll user: `/payroll-board`
5. Confirm failed password shows a visible error and does not blank the page.

## Priority 1 — auth/session logic audit

- Login must not use stale cookies from another user.
- Login must accept token-based auth and secure cookie auth.
- `/api/auth/me` must return a real user object with `id`, `email`, `role`, `business_id`, `plan`, and access fields.
- Logout must clear cookies and local storage.
- Auth refresh must not clear a good user on temporary network failure.
- Signup must set trial/plan state consistently.
- Forgot password and reset password must show user-safe messages.

## Priority 2 — plan and Stripe audit

- Plans page must not show a Current badge unless backend returns a real plan.
- New accounts with no chosen plan should show `No plan chosen`, not default Operator.
- Plan cards must select visually and update checkout payload.
- Stripe checkout must use the clean billing API route.
- Stripe trial checkout must not require a card upfront.
- Success must return to `/plans?checkout=success...` and confirm backend plan.
- Cancel must return to `/plans?checkout=cancelled...` with no plan change.
- Missing Stripe price env vars should not hard-break test checkout while dynamic price fallback exists.

## Priority 3 — navigation/buttons audit

Check every visible button as a real user:

- Public nav: How it works, Pricing, Log in, Start free.
- Login: Sign in, Show/Hide password, Forgot password, Create account.
- Signup: Create account, sign in link, plan redirect after account creation.
- Plans: plan cards, Start Stripe checkout, Recommend Operator, Reload backend plan, Command Growth Pack +/-.
- Dashboard/FreshApp: AI Guide, Command, New job, New quote, Add client, Log out.
- Sidebar/bottom nav: Dashboard, Jobs, Clients, Quotes, Invoices, Team, Payroll, Settings, Support.
- Detail cards must open modals/sheets, not dead routes or full broken pages unless intentionally routed.

## Priority 4 — real-user workflow audit

- Register new owner.
- Verify or skip email depending current launch rule.
- Choose plan/trial.
- Add client.
- Add job.
- Assign worker.
- Worker acknowledges job.
- Complete job.
- Create invoice from job.
- Mark/send/review invoice without auto-sending unexpectedly.
- Sync draft accounting only when owner approves.

## Priority 5 — mobile and layout audit

- No hidden text on off-white pages.
- No overlays blocking taps.
- Bottom nav must not sit over buttons.
- Forms must be usable on phone/tablet.
- Worker app must not show owner-only nav.

## Known current risks to keep checking

- Duplicate backend billing routes may still exist in `backend/server.py`; route override must ensure the clean route is used.
- Some older route names still redirect through board/hash URLs; check for dead anchors.
- Route guards can send users to `/login`, `/plans`, or `/dashboard` depending `has_app_access`; these need live testing with each role.
- Frontend server serves cached static assets immutably, so index/no-store and hard refresh are important after deploy.
