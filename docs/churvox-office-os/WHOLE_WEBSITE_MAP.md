# Churvox Whole Website Rebuild Map

## One product, five connected surfaces

The replacement is not only an owner dashboard. It is one operating system expressed through five role-safe surfaces:

1. **Public website** — explains the background office, earns trust and leads the right owner to a useful first step.
2. **Owner Office OS** — Today, Command, Work, Clients, Money, Messages, Team, Reports and Settings.
3. **Worker field app** — Today, current job, instructions, start, proof, issue and finish.
4. **Customer pages** — request, quote approval, invoice, client portal and proof pack.
5. **Churvox HQ** — platform Command, businesses, billing, testers, support, incidents, releases and data controls.

## Public page map

| Page | Required outcome |
| --- | --- |
| Home | Explain Churvox as the office working in the background and make the first useful action obvious. |
| Product | Show the full request → quote → job → proof → invoice → verified-payment loop. |
| Pricing | Show the locked Start, Crew, Operator and Command plans from one trusted source. |
| Industries | Translate the same operating model into real service-business workflows. |
| Demo | Use clearly labelled sample data to prove the owner-approval flow. |
| Trust | Explain permissions, business isolation, audit, AI boundaries, recovery and data ownership. |
| Support | Provide email-first help for setup, migration, workers, billing, integrations and incidents. |
| Contact | Collect the real workflow, team size and admin pain without requiring a phone call. |
| Login and signup | Verify identity, route roles correctly and lead new owners to one real first win. |
| Legal | Privacy, terms, billing/cancellation, account deletion and data-rights pages. |

## Customer page map

- **Request work:** creates an intake item; it never silently changes the schedule.
- **Quote:** shows scope, price and terms; acceptance is recorded with evidence.
- **Invoice:** displays only an approved invoice; paid state requires verified evidence.
- **Portal:** upcoming work, history, documents and change requests.
- **Proof pack:** approved photos, checklist, notes and sign-off.

## HQ map

- **Command:** platform decisions and exceptions.
- **Businesses:** account, plan, access, setup progress and health.
- **Billing:** verified subscriptions, trials, failed payments, refunds and MRR truth.
- **Testers:** applications, invitations, access windows, feedback and outcomes.
- **Support:** issues, prepared replies and product feedback.
- **Incidents:** errors, queues, integrations, mitigation and recovery.
- **Releases:** build, browser, migration, staging and cutover evidence.
- **Data:** export, deletion, retention, privacy and audit controls.

## Non-negotiable product rules

- Churvox prepares the admin. The owner checks and approves.
- Command remains the only approval desk for the owner product.
- Nothing important sends, charges, syncs, files, pays, deletes or changes financial truth without authority.
- AI may prepare and explain. Deterministic services control identity, permissions, money and record truth.
- Pricing does not change during the rebuild.
- The current Render product remains live until the replacement passes its release gates.
- No cutover occurs from appearance alone. Data migration, role isolation, billing, mobile, offline, recovery and real-business flows require evidence.

## Current private replacement entrances

The draft branch uses the existing platform-admin-only route:

- Connected owner replacement: `/new-command-lab`
- Owner design blueprint: `/new-command-lab?surface=blueprint`
- Public rebuild: `/new-command-lab?surface=public`
- Churvox HQ: `/new-command-lab?surface=hq`

The connected owner replacement reads current business-scoped records through authenticated GET requests. It does not substitute sample records when a live endpoint is empty or unavailable. Write actions open the existing validated owner workflow until the matching replacement mutation, permission, idempotency, audit and rollback gates pass.

The public, customer and HQ rebuilds remain private previews. The live public routes, current owner app, worker app and HQ are unchanged.
