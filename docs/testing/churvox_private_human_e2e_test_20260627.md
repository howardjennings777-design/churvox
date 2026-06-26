# Churvox private human end-to-end test

This is a private founder/tester checklist.  
Do not put this in `frontend/public`.

Core promise being tested:

**Job done. Admin prepared. Owner approves.**

---

## Test rule

Use fake E2E names only.

Suggested names:

- Client: E2E Test Client
- Worker: E2E Test Worker
- Job: E2E Test Lawn Tidy
- Quote: E2E Hedge Trim Quote
- Invoice: E2E Draft Invoice

Write down:
- page
- button/action
- expected result
- actual issue
- screenshot if needed

---

# 1. Login/session

- [ ] Open `https://www.churvox.com`
- [ ] Open login page
- [ ] Log in as owner
- [ ] Refresh page
- [ ] Confirm session stays active
- [ ] Log out
- [ ] Log back in
- [ ] Check no blank screen

Expected: owner lands inside app cleanly.

---

# 2. Smart Hub

- [ ] Open Smart Hub
- [ ] Check today/this week area
- [ ] Check Needs Attention/Admin Debt/Approvals
- [ ] Tap a card
- [ ] Confirm detail opens cleanly
- [ ] Use mobile quick action: New job
- [ ] Use mobile quick action: Add client
- [ ] Use mobile quick action: Approve

Expected: Smart Hub feels like the starting point, not a confusing dashboard.

---

# 3. Clients

- [ ] Open Clients
- [ ] Create E2E Test Client
- [ ] Add phone
- [ ] Add email
- [ ] Add address
- [ ] Add note
- [ ] Save
- [ ] Refresh
- [ ] Open client detail
- [ ] Edit client
- [ ] Confirm changes persist
- [ ] Try client search/filter if available

Expected: client creation/editing is simple and details open in a modal/sheet.

---

# 4. Team / worker

- [ ] Open Team
- [ ] Create E2E Test Worker
- [ ] Add email/phone
- [ ] Assign worker role
- [ ] Save
- [ ] Refresh
- [ ] Open worker detail
- [ ] Confirm worker does not see owner-only tools if worker view is available

Expected: worker setup is clean and not overloaded.

---

# 5. Jobs

- [ ] Open Jobs
- [ ] Create E2E Test Lawn Tidy
- [ ] Select E2E Test Client
- [ ] Add address
- [ ] Add date/time
- [ ] Add price
- [ ] Assign E2E Test Worker
- [ ] Add notes
- [ ] Save
- [ ] Refresh
- [ ] Open job detail
- [ ] Edit notes/price/date
- [ ] Confirm changes persist

Expected: job can be created, assigned, opened, edited, and saved without confusion.

---

# 6. Worker proof/time

- [ ] Open worker view / Worker Proof
- [ ] Find assigned E2E job
- [ ] Acknowledge job
- [ ] Start job
- [ ] Pause job
- [ ] Resume job
- [ ] Add worker note
- [ ] Add/upload photo if available
- [ ] Complete job
- [ ] Refresh
- [ ] Confirm job stays completed
- [ ] Confirm owner can see worker proof/time/note

Expected: worker can complete the job without network errors or owner-only clutter.

---

# 7. Completed job → invoice-ready

- [ ] Return to owner view
- [ ] Open completed E2E job
- [ ] Check if invoice-ready status appears
- [ ] Check if Command/Business Health sees money waiting
- [ ] Create draft invoice from completed job if available
- [ ] Confirm draft invoice uses correct client/job/price
- [ ] Confirm nothing sends automatically

Expected: completed paid work naturally becomes invoice-ready.

---

# 8. Quotes

- [ ] Open Quotes
- [ ] Create E2E Hedge Trim Quote
- [ ] Select E2E Test Client
- [ ] Add description
- [ ] Add amount
- [ ] Save
- [ ] Open quote detail
- [ ] Edit quote
- [ ] Mark accepted if available
- [ ] Convert/continue to job if available

Expected: quote flow is simple and can lead into work.

---

# 9. Invoices / Money

- [ ] Open Invoices/Money
- [ ] Create E2E Draft Invoice
- [ ] Select E2E Test Client
- [ ] Link job if available
- [ ] Add amount
- [ ] Save draft
- [ ] Open invoice detail
- [ ] Mark unpaid/overdue if available
- [ ] Confirm admin debt/money waiting is visible
- [ ] Confirm no dangerous auto-send language

Expected: money flow feels safe and owner-controlled.

---

# 10. Command

- [ ] Open Command
- [ ] Check Business Health appears, not Top 9/test wording
- [ ] Run Check for work
- [ ] Open a Command item
- [ ] Confirm it shows what Churvox found
- [ ] Confirm it shows what Churvox prepared
- [ ] Confirm it explains why
- [ ] Confirm proof/context is visible
- [ ] Approve safe item
- [ ] Try Needs edit / edit path
- [ ] Park item
- [ ] Refresh Command

Expected: Command only shows decisions and never feels like another messy dashboard.

---

# 11. Business Health

- [ ] Confirm heading says Business Health
- [ ] Confirm cards are customer-safe
- [ ] Check Today’s work
- [ ] Check Worker proof
- [ ] Check Ready to invoice
- [ ] Check Command approvals
- [ ] Check Admin debt
- [ ] Check Missing information
- [ ] Check Setup help
- [ ] Check Plan clarity

Expected: no Top 9, launch, test, build, or report wording appears in customer UI.

---

# 12. Accounting Sync / Xero

- [ ] Open Accounting Sync
- [ ] Confirm wording says owner-approved/draft sync
- [ ] Check connect button
- [ ] Check disconnect button if connected
- [ ] Check status area
- [ ] Confirm no automatic invoice sending
- [ ] Confirm no tax filing/bank payout language

Expected: accounting sync feels safe and controlled.

---

# 13. Plans/pricing

- [ ] Open Plans
- [ ] Confirm Start is $39/month + GST
- [ ] Confirm Crew is $89/month + GST
- [ ] Confirm Operator is $149/month + GST and Most Popular
- [ ] Confirm Command is $299/month + GST
- [ ] Confirm Growth Pack is $99/month + GST
- [ ] Confirm Accounting Sync Add-on is $39/month + GST for non-Command tiers
- [ ] Confirm no confusing public MYOB wording

Expected: pricing is clear and not scary.

---

# 14. Imports/exports

- [ ] Open Imports
- [ ] Download client template
- [ ] Download team template
- [ ] Download jobs template
- [ ] Download quotes template
- [ ] Download invoices template
- [ ] Try importing safe fake CSV records if ready
- [ ] Confirm import errors are clear
- [ ] Open Exports if available
- [ ] Confirm export downloads work if available

Expected: moving from spreadsheet feels possible.

---

# 15. Help/support

- [ ] Open Help/Support
- [ ] Read copy
- [ ] Confirm it feels human
- [ ] Create support note/request if available
- [ ] Confirm owner knows what happens next
- [ ] Check no cold/corporate wording

Expected: support reduces fear and setup confusion.

---

# 16. Mobile/tablet

- [ ] Open app on phone/tablet
- [ ] Check bottom nav
- [ ] Check More menu
- [ ] Open Smart Hub
- [ ] Create client
- [ ] Create job
- [ ] Open modal/sheet
- [ ] Scroll modal
- [ ] Tap approve buttons
- [ ] Check worker timer buttons
- [ ] Confirm bottom nav does not block actions
- [ ] Confirm no hidden/whitewashed text

Expected: phone/tablet use feels clean.

---

# 17. Public/customer views

- [ ] Open public quote/client portal if available
- [ ] Confirm no owner sidebar/nav
- [ ] Confirm customer sees only customer-safe content
- [ ] Confirm no admin/Command/pricing controls leak

Expected: customer links are safe.

---

# 18. Final trust check

- [ ] No public test/build wording
- [ ] No fake demo stats pretending to be real
- [ ] No worker owner-only tools
- [ ] No scary automatic AI language
- [ ] No automatic accounting send/tax/payout language
- [ ] No hidden text
- [ ] No broken mobile actions
- [ ] No confusing pricing
- [ ] Core promise feels true: Job done. Admin prepared. Owner approves.

Expected: Churvox feels like a real product, not a project.

---

# Result

## Pass enough for controlled outreach?

- [ ] Yes
- [ ] Not yet

## Biggest issue found

Write here:

## First fix needed

Write here:
