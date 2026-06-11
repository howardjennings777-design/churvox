# Churvox App Health Audit

Generated: 2026-06-11T04:26:36Z

**Verdict:** HEARTY ENOUGH FOR REAL TESTING
**Score:** 100%
**Pass:** 45/45
**Warnings:** 0
**Fails:** 0

| Area | Check | Status | Evidence | Fix |
|---|---|---:|---|---|
| Core | Frontend package exists | **PASS** | frontend/package.json found. | Restore frontend package. |
| Core | Backend exists | **PASS** | Backend files found. | Restore backend app. |
| Core | Error boundary exists | **PASS** | Frontend has ErrorBoundary usage. | Wrap major routes in ErrorBoundary. |
| Core | Loading states exist | **PASS** | Loading states detected. | Add loading states. |
| Core | Empty states exist | **PASS** | Empty state text detected. | Add empty states. |
| Brand | Old name mostly removed | **PASS** | Old refs found: none. | Remove old Grassly/Grassley references. |
| Brand | Churvox name present | **PASS** | Churvox name detected. | Add Churvox brand. |
| Auth/API | API base helper exists | **PASS** | Frontend API base detected. | Use central API base helper. |
| Auth/API | Credentials/cookies enabled | **PASS** | Credentialed requests detected. | Enable credentials/cookies. |
| Auth/API | Login wired | **PASS** | Login route reference detected. | Wire login. |
| Auth/API | Signup/register wired | **PASS** | Register route reference detected. | Wire signup. |
| Auth/API | Forgot/reset password wired | **PASS** | Password recovery detected. | Wire forgot/reset password. |
| Auth/API | Email provider referenced | **PASS** | Email provider references detected. | Set email provider env vars on Render. |
| Roles | Role source exists | **PASS** | Role source of truth detected. | Create role source. |
| Roles | Worker route guard exists | **PASS** | Worker route guard detected. | Block non-worker access. |
| Roles | Business route blocks worker | **PASS** | Workers redirected away from business shell. | Block worker from owner app. |
| Roles | Payroll route separated | **PASS** | Payroll board detected. | Separate payroll workspace. |
| Roles | Reports protected | **PASS** | ReportsRoute detected. | Protect reports. |
| Command | Command route/page exists | **PASS** | Command owner desk detected. | Add Command desk. |
| Command | Command backend slips referenced | **PASS** | Command API referenced. | Wire Command backend. |
| Command | Command approve/edit/snooze exists | **PASS** | Command owner controls detected. | Add owner controls. |
| Command | Worker help lands in Command | **PASS** | Worker help Command slip detected. | Send worker help to Command. |
| Worker | Worker app routes exist | **PASS** | Worker routes detected. | Add worker routes. |
| Worker | Worker job assignment filtering exists | **PASS** | Worker assignment filtering detected. | Filter jobs assigned to worker. |
| Worker | Worker timers exist | **PASS** | Worker timer endpoints detected. | Wire timers. |
| Worker | Worker notes/photos exist | **PASS** | Worker evidence detected. | Add notes/photos. |
| Worker | Worker contact office exists | **PASS** | Worker contact office detected. | Add worker help panel. |
| Money | Public quote exists | **PASS** | Public quote detected. | Add public quote. |
| Money | Public invoice exists | **PASS** | Public invoice detected. | Add public invoice. |
| Money | Invoice PDF sending exists | **PASS** | Invoice PDF sending detected. | Wire invoice PDF sending. |
| Money | GST/totals visible | **PASS** | GST/total references detected. | Show GST/totals. |
| Money | Stripe/plan flow exists | **PASS** | Checkout/Stripe references detected. | Wire Stripe checkout. |
| Tradie Flow | Recurring concepts exist | **PASS** | Recurring/repeat references detected. | Add recurring jobs. |
| Tradie Flow | CSV import concepts exist | **PASS** | CSV/import references detected. | Add CSV import. |
| Tradie Flow | Client memory fields exist | **PASS** | Client memory references detected. | Add client memory. |
| Tradie Flow | Price memory fields exist | **PASS** | Price memory references detected. | Add price memory. |
| Tradie Flow | Offline queue helper exists | **PASS** | Offline queue helper detected. | Add offline queue. |
| UI | Mobile worker nav exists | **PASS** | Worker bottom nav detected. | Add mobile worker nav. |
| UI | Premium components used | **PASS** | Premium components detected. | Use consistent UI components. |
| UI | Light/off-white styling exists | **PASS** | Light/polish styling detected. | Polish theme. |
| UI | Text visibility safeguards exist | **PASS** | Text visibility styles detected. | Fix hidden text. |
| UI | Public pages share document template | **PASS** | Public document template detected. | Use shared public template. |
| Launch | Launch audit exists | **PASS** | Launch done audit exists. | Create launch audit. |
| Launch | Full wiring audit exists | **PASS** | Full wiring audit exists. | Create wiring audit. |
| Launch | Real testing reminders exist | **PASS** | Real testing reminders detected. | Add test plan. |

## Real testing order

1. Signup / login / forgot password.
2. Owner creates client, job and worker invite.
3. Worker acknowledges, starts, completes, adds note/photo.
4. Worker sends contact office message; owner sees Command slip.
5. Owner approves work and sends invoice PDF.
6. Customer receives email with PDF attached and public invoice link works.