# Churvox Launch Readiness Proof

Last proof run: June 2026  
Product: Churvox  
Core promise: Job → Invoice → Paid → Synced  
Positioning: Churvox does the admin. You approve.

## Launch proof status

### Public website
- Home page loads: PASSED
- Login page loads: PASSED
- Privacy page loads: PASSED
- Terms page loads: PASSED
- Mobile login page loads: PASSED

### Auth and onboarding
- New owner signup: PASSED
- Signup verification email sent by Postmark: PASSED
- Resend verification email: PASSED
- Login: PASSED
- Auth/me: PASSED
- Forgot password email: PASSED
- Logout: PASSED

### Plan and billing safety
- Real Stripe Checkout URL creates: PASSED
- Creating Stripe Checkout does not change plan: PASSED
- Fake checkout confirmation blocked: PASSED
- Direct fake plan routes blocked or unavailable: PASSED
- Current paid owner plan reads correctly: PASSED

### Proof/test route safety
- Public proof helper route blocked in production: PASSED
- SMS test/proof route blocked in production: PASSED

### Core app APIs
- Dashboard stats load: PASSED
- Clients API: PASSED
- Jobs API: PASSED
- Quotes API: PASSED
- Invoices API: PASSED
- Team API: PASSED
- Settings real business data: PASSED
- Plans page/pricing data: PASSED
- Payroll worker data: PASSED

### Clients and imports
- Create client: PASSED
- Client CSV import: PASSED
- Team CSV import: PASSED

### Jobs and workers
- Create job: PASSED
- Assign worker: PASSED
- Worker invite created: PASSED
- Worker invite email sent: PASSED
- Worker resend invite: PASSED
- Worker accepts invite: PASSED
- Worker login: PASSED
- Worker sees assigned job: PASSED
- Worker acknowledges job: PASSED
- Worker timer start: PASSED
- Worker timer pause/resume/complete: PASSED
- Owner sees completed worker job: PASSED
- Worker time appears in payroll: PASSED

### Quotes
- Create quote: PASSED
- Send quote: PASSED
- Quote email sent by Postmark: PASSED
- Public quote page loads: PASSED
- Customer accepts public quote: PASSED
- Accepted public quote creates linked job: PASSED
- Owner can open linked accepted-quote job: PASSED

### Invoices
- Create invoice: PASSED
- Send invoice: PASSED
- Invoice email sent by Postmark: PASSED
- Public invoice page loads: PASSED
- Customer marks public invoice paid: PASSED
- Owner sees invoice paid: PASSED
- Paid timestamp saved: PASSED

### Full launch chain
The full quote-to-paid chain passed:

Quote → Customer accepts → Job created → Worker assigned → Worker completes with timer → Invoice created → Invoice emailed → Public invoice opened → Customer marks paid → Owner sees paid

Status: PASSED

## Known launch notes

- Start/Solo accounts correctly cannot add workers.
- Team/paid owner accounts can add workers.
- Proof helpers are hidden in production unless explicitly enabled.
- Proof tests create real test data in the production database when run against production.
- Before a public launch, avoid rerunning destructive/proof tests unless needed.

## Soft-launch recommendation

Churvox is ready for a controlled soft launch with a small number of real users.

Recommended first launch group:
- 3 to 5 friendly service businesses.
- Start with one trade type, such as lawn care, cleaning, handyman, or landscaping.
- Watch signup, quote, worker invite, job completion, invoice send, and paid flows.
- Manually support the first few users so feedback is fast and fixes stay focused.

## Do not forget before public ads

- Confirm Stripe products/prices are correct.
- Confirm Postmark sender/domain reputation is healthy.
- Confirm support email hello@churvox.com is monitored.
- Confirm terms/privacy/account deletion pages are visible.
- Confirm Render backend/frontend are on main and healthy.
- Confirm MongoDB backups are enabled.
- Confirm no proof helper env flag is enabled in production.
