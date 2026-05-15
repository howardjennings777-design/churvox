# Churvox Final Launch Check

## Built now

- Smart Hub is the main owner command centre.
- Smart Hub uses box-based AI summaries instead of busy open panels.
- Smart Hub boxes open in-page pop-ups.
- Items can be approved, snoozed, dismissed, resolved, or reset.
- Approval flow waits for backend success before hiding approved items.
- Fake logged-in demo fallback records have been removed.
- Empty states show when there is no real data.
- Deep workspaces are calmer and record-first.
- Worker mode has a locked-down My Work / My Jobs layout.
- Worker mode hides owner pricing, invoices, quotes, clients, team management, MYOB and owner approvals.
- Settings has a business setup guide.
- Setup profile syncs with backend at /api/business/setup-profile.
- Expired sessions clear and return to login instead of endlessly looping 401 calls.
- Mobile Smart Hub and modal polish has been added.

## Final manual test order

### 1. Fresh load
- Open https://www.churvox.com
- Hard refresh.
- If logged out, public/front page should show.
- No React crash should show.
- Expired sessions should clear instead of looping 401s forever.

### 2. Owner login
- Log in as owner.
- Dashboard should open Smart Hub.
- Confirm boxes show logical counts:
  - To approve
  - Needs attention
  - Ready to invoice
  - Messages ready
  - Today’s work
  - Money to collect
  - Quotes waiting
  - Crew active
  - Setup health only when incomplete

### 3. Smart Hub pop-ups
- Tap each Smart Hub box.
- Pop-up should open in-page.
- It should not jump away unless pressing an explicit Open workspace action.
- Test close button.
- Test Esc close on desktop.
- Test Snooze, Dismiss, Resolve, Reset this box.
- Counts should update.

### 4. Approval actions
- Approve an AI action where available.
- It should not disappear unless backend approval succeeds.
- Notice should show after approval.
- Open workspace shortcut should work.

### 5. Settings setup guide
- Open Settings.
- Fill business name, industry, region, service area, invoice email, invoice prefix and quote prefix.
- Press Save setup.
- Refresh and confirm setup remains.
- Setup health should improve.

### 6. Deep workspaces
- Open Jobs, Clients, Team, Quotes, Invoices, Proof-to-Paid.
- Rows should open in pop-ups.
- Pages should feel less busy.
- Empty states should show when no data exists.

### 7. Worker login
- Log in as worker.
- Sidebar should show only My Work and My Jobs.
- Worker should not see owner-only pages.
- Worker should not see pricing, invoices, quotes, MYOB, clients, team management or owner approvals.

### 8. Mobile
- Test on phone width.
- Smart Hub boxes should not overflow.
- Pop-ups should scroll properly.
- Buttons should be easy to tap.
- Header/sidebar should not block taps.

## Pass condition

Churvox is launch-test ready when:

- Owner can log in.
- Worker can log in.
- Smart Hub loads.
- Settings setup guide saves.
- Core workspaces load.
- Pop-ups work.
- Expired sessions do not crash or loop forever.
- Mobile layout is usable.
