# Churvox Manual Launch Test Checklist

Use this checklist for manual launch verification. Do **not** mark as passed unless tested in your environment.

For every failed item, capture:
- Screenshot of the failing screen state.
- Route URL and user role used.
- Browser + device.
- Console/API error text.

## Expected result baseline
Expected result for every item: flow works without blank screens, fatal errors, or unauthorized data exposure.

## AUTH
- Owner login
- Owner logout
- Signup
- Forgot password
- Reset password
- Bad token/session recovery

## JOBS
- Jobs page loads
- Create job
- Open job detail
- Edit job
- Assign worker
- Worker conflict warning if scheduled overlap exists
- Start job
- Pause/resume job
- Complete job
- Job status colors visible
- Job pricing visible to owner/admin only
- Invoice generation path visible

## CLIENTS
- Clients page loads
- Create client
- Open client detail
- Edit client
- Import client CSV
- Client phone/email/address display correctly

## QUOTES
- Quotes page loads
- Create quote
- Open quote detail
- Edit quote
- Public quote link opens
- Public quote accept works if enabled
- Public quote decline works if enabled
- Quote follow-up path visible

## INVOICES
- Invoices page loads
- Create invoice
- Open invoice detail
- Edit invoice if enabled
- Clear/delete invoice
- Public invoice link opens
- Pay Now link works if configured
- MYOB sync status visible if enabled
- Payment status clear

## TEAM
- Team page loads
- Invite worker
- Invite manager
- Invite office admin
- Invite payroll user
- Update role
- Remove worker
- Import team CSV
- Worker profile opens
- Assign job from worker profile if built

## WORKER
- Worker login
- Worker jobs page loads
- Worker opens job detail
- Worker acknowledges job
- Worker starts job
- Worker pauses/resumes job
- Worker completes job
- Worker uploads photo
- Worker adds note if built
- Worker cannot see pricing
- Worker cannot see owner-only settings
- Worker cannot see MYOB/payroll/plans

## PAYROLL / TIMESHEETS
- Timesheets page loads
- Pay period selector works
- Worker hours visible
- Approve timesheet
- Reject timesheet
- Payroll summary visible
- Payroll CSV export works
- Payroll role access restricted
- No bank/tax/government submission shown

## SMART HUB
- Smart Hub page loads
- Sidebar visible
- Live metrics visible
- AI assistant visible
- AI response readable
- AI fallback works if provider missing
- Command shortcuts work
- Approval-first notice visible

## REPORTS
- Reports page loads
- Revenue cards visible
- Jobs snapshot visible
- Quotes snapshot visible
- Invoice snapshot visible
- Team/payroll snapshot visible
- Top clients visible
- Export invoices CSV
- Export jobs CSV
- Export quotes CSV
- Export payroll CSV
- Empty/error states work

## SMS
- SMS page loads
- Credit balance visible
- Credit packs visible
- Not configured state clear
- Template selector works
- Recipient input works
- Message editor works
- Confirmation before send appears
- Send blocked/clear if provider missing
- SMS history visible

## MYOB / INTEGRATIONS
- Integrations page loads
- MYOB status visible
- Plan rules visible
- Company file settings save
- Test connection gives clear result
- Connect button does not open broken URL if not configured
- Internal invoice note visible
- Manual sync only notice visible
- Invoice detail MYOB panel visible if enabled

## AUTOMATION
- Automation page loads
- Templates visible
- Create rule from template
- Rule builder validates fields
- Rules list visible
- Edit rule
- Pause/resume rule
- Delete rule
- Automation runs page loads
- Failed run retry queues safe retry
- No auto-send SMS/email
- No auto MYOB sync
- No payroll auto-change

## MOBILE / PWA
- Mobile bottom nav visible
- Sidebar/header not blocking taps
- Cards tappable
- Forms usable on mobile
- Modals fit screen
- PWA install prompt appears if supported
- Refresh/login does not blank

## DEPLOY / RENDER
- Frontend build passes
- Backend compile passes
- GitHub check passes
- Render deploy starts after push
- Render deploy succeeds
- Live site opens
- Hard refresh works
- No blank screen after login
