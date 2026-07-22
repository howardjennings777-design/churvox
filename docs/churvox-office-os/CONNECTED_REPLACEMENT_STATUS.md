# Churvox Connected Replacement Status

## Purpose

The rebuild must become usable without creating a second uncontrolled write path. The connected replacement therefore follows a strangler cutover:

1. Read current business-scoped records in the new Office OS.
2. Keep all writes in the proven live workflow.
3. Replace one mutation at a time only after permission, validation, idempotency, audit, retry and rollback tests pass.
4. Cut the live route only after the complete selected launch scope passes its release gates.

## Current stage

| Surface | Current state | Data source | Write behaviour |
| --- | --- | --- | --- |
| Owner Office OS | Connected private replacement | Authenticated same-origin GET requests | Opens the current validated owner workflow |
| Owner design blueprint | Private sample-only blueprint | Clearly labelled sample records | No writes |
| Public website | Private complete visual rebuild | Static product contract | No production forms yet |
| Customer pages | Private visual rebuild | Sample customer states | Existing signed public pages remain live |
| Worker app | Current production worker app | Current production APIs | Current validated worker mutations |
| Churvox HQ | Private visual rebuild | Sample platform states | Current HQ remains live |

## Owner replacement area status

| Area | Replacement read | Current write target | Mutation cutover requirement |
| --- | --- | --- | --- |
| Today | Connected aggregate | Relevant working screen | All source counts and money truth verified |
| Command | Confirmed Command slips | `/dashboard#command` | Approval executes exactly once and audits result |
| Work | Jobs read | `/dashboard#work` | Create, edit, recurrence, schedule and completion contracts pass |
| Clients | Clients read | `/dashboard#clients` | Save, CSV import, duplicate handling and tenant isolation pass |
| Money | Quotes and invoices read | `/dashboard#money` | Quote, invoice, payment truth and accounting handoff pass |
| Messages | Message read | `/dashboard#messages` | Delivery, failure, approval and retry contracts pass |
| Team | Worker/team read | `/dashboard#staff` | Invite, roles, permissions, time and payroll review pass |
| Reports | Source record counts only | `/dashboard#invoices` | Revenue, margin and payment calculations have verified sources |
| Settings | Business settings read | `/dashboard#settings` | Save, branding, security and rollback contracts pass |

## Rules already enforced

- No sample records replace missing live records in the connected owner replacement.
- The connected data layer performs authenticated GET requests only.
- The current production owner app, public routes, worker app and HQ remain unchanged.
- Pricing remains Start $39, Crew $89, Operator $149 and Command $299 per month plus GST.
- Command Growth Pack remains $99 per month plus GST.
- Nothing important sends, charges, syncs, files, pays, deletes or changes financial truth without authority.

## Next cutover sequence

1. Pass production build and browser contracts for the connected owner replacement.
2. Review the connected replacement with real owner records.
3. Move the public marketing pages to the new visual system while preserving working signup, login, legal and request routes.
4. Migrate owner mutations area by area, beginning with low-risk client and job drafts.
5. Prove worker offline, messaging and timer flows.
6. Prove customer quote, invoice, portal and proof links.
7. Prove HQ billing, support, incident and data controls.
8. Complete migration and rollback rehearsals.
9. Obtain explicit owner approval before live route cutover.
