# Churvox Final Launch Smoke Test

## Result from Stage 11
- HIGH launch blockers: 0
- Warnings: duplicate routes protected by runtime de-dupe, old files cleanup/archiving.
- Build and backend syntax passed.

## Live smoke test order

### 1. Owner login
- Go to https://www.churvox.com/login
- Login as owner
- Expected: lands on Command Board

### 2. Command Board
- Click Clear old slips + rebuild
- Expected: AI summary appears
- Expected: slips show why Churvox suggests action
- Expected: slips say what happens when approved

### 3. Settings
- Open Settings
- Upload logo
- Add bank details or payment link
- Save
- Expected: setup health updates
- Expected: no blank page

### 4. Invoice slip
- Open an invoice slip
- Check customer name, email, description, amount
- Click Approve + send invoice
- Expected: popup closes only after success
- Expected: email arrives with branded PDF

### 5. Quote flow
- Open Quotes
- Create/open quote
- Send quote or prepare follow-up
- Expected: branded PDF sends
- Expected: accept/decline/convert backend routes exist

### 6. Jobs
- Open Jobs
- Create/open job
- Assign worker
- Start job
- Finish job
- Expected: job completed
- Expected: timesheet created
- Expected: Command Board creates review/invoice slips

### 7. Crew Map
- Open Crew Map
- Expected: only active started jobs show
- Finish active job
- Expected: worker disappears from active map

### 8. Client Workbench
- Open a client workbench:
  /clients/CLIENT_ID/workbench
- Expected: jobs, quotes, invoices and unpaid totals show
- Click Prepare client actions
- Expected: Command Board slips are prepared

### 9. Support
- Open Support
- Send support request
- Refresh page
- Expected: ticket appears in history

### 10. Worker role
- Login as worker
- Expected: worker sees worker jobs/support only
- Expected: worker cannot access invoices, quotes, clients, team, settings, plans

## Launch decision
Launch-ready means:
- No blank screens
- No Render crash
- Owner can approve/send
- Worker flow can start/finish job
- Settings save
- Support sends
- Main sidebar feels simple
