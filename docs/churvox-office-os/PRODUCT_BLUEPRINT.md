# Churvox Office OS — Product Blueprint

Status: locked direction for the clean rebuild

## Product promise

**Churvox does the admin. The owner checks and approves.**

Churvox is not another collection of job-management screens. It is an office working quietly behind a field-service business. It turns day-to-day activity into prepared admin, finds what is missing, protects promises and money, and brings only genuine decisions to the owner.

The product must feel simple on the surface and strong underneath.

## Non-negotiable operating rules

1. Nothing important sends, charges, syncs, files, pays, deletes or changes financial records without an authorised owner or manager approval.
2. Command is the single approval desk. Approval work must not be scattered across unrelated pages.
3. Every approved action is idempotent: refreshing, retrying or double-clicking must not run it twice.
4. Every decision keeps an audit trail: what Churvox found, what it prepared, what the owner changed, who approved it, when it ran and what result came back.
5. Failed actions return to Command with a clear reason and a safe retry path.
6. Workers see only what they need to complete field work. They do not see owner finances, company-wide records or approval queues.
7. Each business is strictly isolated from every other business at query, service and storage levels.
8. Pricing remains unchanged unless the owner explicitly approves a pricing project.
9. Public copy must not mention competitors.
10. Render remains live until the replacement passes release gates and the owner approves cutover.

## Who Churvox serves

Primary businesses:

- Lawn care and gardening
- Landscaping
- Cleaning
- Handyman and property maintenance
- Painting
- Plumbing
- Electrical
- Pest control
- Mobile beauty, hair and appointment-based services
- Other recurring or mobile service businesses

Primary roles:

- Owner
- Manager or dispatcher
- Office administrator
- Worker or subcontractor
- Payroll reviewer
- Customer
- Platform owner

## Product structure

The owner application should have a compact top-level structure.

### Today

The owner briefing and control floor.

Must show:

- What is happening today
- Jobs at risk
- Workers needing help
- Unscheduled or clashing work
- Completed work waiting for proof or invoicing
- Money needing attention
- Customer promises due today
- The top owner decisions
- A plain-language business pulse

### Command

The only approval desk.

Every Command slip must show:

- What happened
- Why it matters
- What live records were checked
- What Churvox prepared
- Confidence level
- Missing or uncertain information
- Customer, worker, money and accounting impact
- Recommended action
- Approve, edit, ask, park or reject
- Exact result after execution

Command must support filters for priority, office desk, risk, money impact, due time and responsible person.

### Work

Jobs, scheduling, dispatch and recurring work.

Must include:

- One-off and recurring jobs
- Drag-and-drop day, week and team scheduling
- Unscheduled work tray
- Multi-day and multi-visit jobs
- Worker skills and availability
- Travel and route awareness
- Capacity warnings
- Job templates and service playbooks
- Dependencies and return visits
- Statuses from assigned through completed
- Timer and manual time controls
- Materials, extras and expenses
- Safety and compliance checklists
- Before-and-after proof
- Customer signature where required
- Completion and archive rules
- Full job timeline

### Clients

The business memory.

Must include:

- People, organisations, properties and service locations
- Multiple contacts and billing contacts
- Access instructions and hazards
- Communication preferences and consent
- Saved services, prices and recurring arrangements
- Equipment and assets at the property
- Complete job, quote, invoice, proof and message history
- Complaints, promises and service recovery notes
- Tags and segments
- Duplicate detection and merge review
- Safe CSV import with preview, validation and manifest
- Export and privacy controls

### Money

Quotes, deposits, invoices, costs and accounting handoff.

Must include:

- Quote builder with options, photos, scope and terms
- Quote approval and requested changes
- Deposits and payment schedules
- Quote-to-job conversion
- Fixed, hourly, fixed plus extras and hourly plus extras billing
- Proof-to-invoice preparation
- Partial invoices, progress invoices and credits
- Overdue follow-up preparation
- Payment status truth
- Job costing and margin
- Labour, travel, materials, subcontractor and overhead costs
- Unbilled completed work
- Revenue, margin and cash-flow views
- Owner-approved Xero and future accounting handoff
- Exports for bookkeepers

Churvox is not a full accounting ledger and does not file tax.

### Messages

Connected communication, not a loose inbox.

Must include:

- Customer and worker conversations
- Email first, with SMS marked separately until approved and available
- Every message linked to the correct client, property, job, quote or invoice
- Prepared replies
- Follow-up reminders
- Promise extraction
- Internal notes
- Templates and approved business tone
- Delivery, failure and reply status
- No blind sending

### Team

People, access, workload and payroll review.

Must include:

- Staff and subcontractors
- Roles and permissions
- Invitations and device access
- Skills, licences and expiry dates
- Availability, leave and working hours
- Workload and capacity
- Time review
- Payroll review by week, fortnight or month
- CSV export
- No government submission
- No bank payout files

### Reports

Plain-language business intelligence.

Must include:

- Revenue, collected money and overdue money
- Quote conversion
- Job margin and client profitability
- Worker utilisation and productivity
- Recurring contract profitability
- Unbilled completed work
- Schedule capacity
- Rework, complaints and missing proof
- Admin debt
- Promise risk
- Office desk performance
- Trends and exceptions
- Exportable reports

### Settings

Business rules and controls.

Must include:

- Business profile and branding
- GST or tax settings
- Services and price book
- Job templates and checklists
- Communication templates
- Approval rules
- Worker rules
- Integrations
- Data import and export
- Security and sessions
- Audit access
- Plans and billing
- Account deletion with guarded confirmation
- Help and guided setup

## The background office

The office is not a group of extra navigation pages. It is an event-driven engine underneath the product.

### Office Manager

Ranks the day, combines related issues and keeps the owner focused on the smallest useful decision set.

### Reception Desk

Turns customer requests into complete quote, booking or job drafts. Checks contact details, service area, availability, duration, worker fit, recurrence and missing information.

### Scheduling Desk

Checks clashes, capacity, travel, skills, leave, recurring rules, dependencies and customer timing. Prepares schedule changes but does not move work without approval when the change affects a customer or worker commitment.

### Job Control Desk

Watches work from assignment through completion. Finds late starts, stalled jobs, missing acknowledgement, worker help requests, scope changes and incomplete close-out.

### Quality Desk

Checks proof, checklist completion, notes, photos, signatures, extras and job completion readiness.

### Admin Desk

Prepares customer updates, worker replies, record changes, follow-ups and client memory suggestions.

### Money Desk

Prepares quotes, invoice drafts, deposit requests, payment follow-ups and costing checks. It never marks money paid without trusted payment confirmation.

### Accounting Desk

Checks GST or tax treatment, export readiness, duplicate risk and accounting sync status. It does not file tax or change external ledgers without approval.

### Payroll Desk

Prepares hours review and highlights unusual or incomplete time. It does not pay staff, submit payroll or create bank files.

### Churvox Guard

Protects the business across all desks.

It must detect:

- Forgotten customer promises
- Jobs with no next step
- Recurring clients with no future booking
- Completed work not invoiced
- Invoices with no proof or price support
- Missing customer or site details
- Duplicate clients and jobs
- Schedule clashes and overloaded workers
- Missing worker acknowledgement
- Missing photos, checklists or signatures
- Unusual timers and timesheets
- Margin leakage
- Quotes needing follow-up
- Overdue invoices
- Failed emails, syncs and webhooks
- Repeated operational problems that should become a playbook rule

## One connected operating loop

Every item should progress through a shared event and state model.

1. Request received
2. Details checked
3. Quote or booking prepared
4. Owner approval when required
5. Customer approval or response
6. Job scheduled
7. Worker assigned and acknowledged
8. Work started
9. Issue or scope change handled
10. Work completed
11. Quality and proof checked
12. Invoice prepared
13. Owner approval
14. Invoice sent
15. Accounting handoff approved
16. Payment confirmed by trusted source
17. Follow-up, review or rebooking prepared
18. Client and property memory updated

Every transition records actor, source, timestamp, idempotency key, previous state, next state and evidence.

## Churvox Field

The worker experience must be a separate, focused mobile product.

Primary flow:

**Today → Current job → Instructions → Start → Do work → Proof → Issue or extras → Finish**

Requirements:

- Large touch targets
- Fast load on low-quality mobile connections
- Offline read and write queue
- Clear sync state
- Safe retry without duplicates
- One primary job at a time
- Acknowledge assignment
- Start, pause, resume and finish
- Travel and break time where enabled
- Job checklist
- Photos and files
- Voice notes
- Materials and extras
- Customer signature
- “I need help” and “Something changed”
- Worker-to-owner messages that survive refresh
- No exposure of restricted business data
- iPhone and Android PWA support

## Customer experience

Customers should use secure links rather than needing a complicated account.

Capabilities:

- Request work
- Approve or request changes to quotes
- Pay deposits or invoices through the approved payment provider
- View appointments and assigned arrival information
- Confirm or request schedule changes
- View proof packs
- View invoices and receipts
- Update contact details
- Request more work
- Send a message

Customer requests enter the background office first. They must not silently rewrite the live schedule or business records.

## Core domain records

The clean rebuild should use clear domain boundaries:

- Business
- User
- Role
- Permission
- Worker profile
- Client
- Contact
- Property or service location
- Asset or equipment
- Request
- Quote
- Quote option
- Deposit
- Job
- Visit
- Recurrence rule
- Assignment
- Checklist
- Timer entry
- Material or expense
- Proof item
- Completion pack
- Invoice
- Payment
- Message thread
- Promise
- Command slip
- Approval
- Action execution
- Audit event
- Integration connection
- Sync operation
- Notification
- Playbook
- Report snapshot

Records must use stable IDs, business ownership, creation and update metadata, soft-delete rules where appropriate and versioning for sensitive changes.

## Technical foundation

### Backend

- API-first domain services
- Explicit command and query separation for important actions
- Event outbox for reliable background processing
- Idempotency keys on every external or financial action
- Background jobs with retry policy and dead-letter handling
- Business-scoped database access enforced centrally
- Role and permission checks enforced server-side
- Immutable audit events
- Signed public links with expiry and revocation
- Webhook signature verification
- Health, readiness and dependency endpoints
- Structured logs and trace IDs

### Frontend

- Clean route and feature modules
- Shared design system
- No runtime DOM patching as a long-term architecture
- Server truth for records and permissions
- Predictable loading, empty, error and offline states
- Accessible forms, dialogs and navigation
- Mobile-first field screens
- Desktop-first owner scheduling and reporting
- Feature flags for unfinished work
- No fake production data

### Data and security

- Strict tenant isolation
- Encryption in transit and at rest through hosting and database providers
- Secure cookies and CSRF protection where applicable
- Rate limiting and abuse controls
- Password and session security
- Optional multi-factor authentication
- Secret rotation process
- Backup and restore rehearsal
- Data retention and deletion policy
- Privacy export
- Security event audit
- Least-privilege integration scopes

## Performance and reliability targets

- Public pages usable quickly on mobile
- Owner Today screen shows meaningful content without waiting for every secondary service
- Worker current job opens quickly and works through temporary network loss
- No duplicate sends, invoices, jobs, payments or sync operations
- Background jobs expose pending, succeeded, failed and retrying states
- External failures never look like success
- Every destructive action has a clear confirmation and recovery rule

## Onboarding and migration

The first-run path must produce a useful win quickly.

1. Business profile
2. Services and pricing
3. Import or add clients
4. Add first worker if needed
5. Create first job or recurring run
6. Complete a guided worker flow
7. Prepare first invoice
8. Review first Command slip

Migration must support:

- Preview before write
- Validation and duplicate checks
- Mapping common columns
- Dry-run manifest
- Row-level results
- Retry of failed rows
- No uncontrolled overwrite
- Export before major migration

## Plans and entitlements

Pricing remains:

- Start — $39/month + GST
- Crew — $89/month + GST
- Operator — $149/month + GST
- Command — $299/month + GST
- Command Growth Pack — $99/month + GST

Entitlements must be enforced on the backend and reflected cleanly in the frontend. Locked features should not appear as broken or fake pages.

## Release gates

The replacement cannot become the live product until all gates pass.

### Product gate

- Full request-to-payment flow works
- Recurring jobs create the correct next work exactly once
- Worker and owner message loop works
- Proof-to-invoice works
- Command approvals execute once and audit correctly
- Customer links work securely
- Plan restrictions match billing

### Safety gate

- Tenant isolation tests pass
- Permission tests pass
- Destructive actions fail closed
- External actions require approval
- Webhook and sync verification passes
- Backup restore rehearsal passes

### Experience gate

- Desktop owner flow passes
- Mobile owner essentials pass
- iPhone and Android worker flows pass
- Offline worker flow passes
- Accessibility checks pass
- No black screens, dead buttons or misleading success states

### Commercial gate

- Signup, verification, trial, checkout and plan activation work
- Current plan displays correctly
- Billing return and cancellation are truthful
- Emails deliver reliably
- Public pages are accurate and searchable
- Help, legal, privacy and account deletion work

### Cutover gate

- Real migration rehearsal completed
- Rollback plan proven
- Monitoring ready
- Current Render version remains available until owner approval
- Owner explicitly approves cutover

## Deliberate exclusions from the first strong release

- Government tax filing
- Bank payout files
- Automatic payroll submission
- Full accounting ledger
- Enterprise warehouse management
- Uncontrolled autonomous sending
- Large fleet telematics platform
- Features added only to imitate a competitor

## Build phases

### Phase 0 — Contract and architecture

Lock domain model, permissions, approval rules, event model, audit model, design system, route structure, release gates and migration approach.

### Phase 1 — Core records

Business, users, clients, properties, workers, jobs, visits, recurrence, quotes, invoices and messages.

### Phase 2 — Operating workflow

Scheduling, assignment, timers, completion, proof, quote-to-job, proof-to-invoice and public customer links.

### Phase 3 — Background office

Office desks, Churvox Guard, Command slips, approval execution, retries, audit trail and owner briefing.

### Phase 4 — Field product

Mobile worker app, offline queue, proof, issues, messages, time and completion.

### Phase 5 — Money and integrations

Costing, deposits, overdue workflow, exports and guarded accounting handoff.

### Phase 6 — Reports, onboarding and migration

Business health, profitability, admin debt, guided setup, imports and migration rehearsal.

## Definition of top-tier Churvox

Churvox is ready to compete at the top when an owner can open Today, understand the business in under a minute, approve the few decisions that truly need them, and trust that the office underneath is connecting the rest of the work without losing promises, proof or money.
