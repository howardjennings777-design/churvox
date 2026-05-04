# Churvox AI Control Room Contract

This is the launch contract for Command Hub / AI Control Room. It defines what the hub must do to behave like an AI Operator, not a static dashboard.

## Core promise

AI prepares the business. The owner approves. Churvox executes safely.

No customer message, invoice send, payment charge, payroll change, deletion, MYOB/accounting write, or legal/tax decision may happen without explicit owner approval.

## Required zones

1. **AI Today Plan**
   - Backend should scan jobs, clients, quotes, invoices, workers, proof packs, follow-ups, recurring work, plan/account status, and integrations.
   - It must return a best next move, counts, reasons, and owner-ready actions.

2. **Owner Next Moves**
   - Show the top three outcomes: dispatch, money, and work movement.
   - Each opens a drawer, not a second full page.

3. **Today Run Sheet**
   - Shows jobs moving today or active fallback jobs.
   - Job editing, worker assignment, pricing, notes, draft invoice, and proof pack preparation should happen inside the drawer first.

4. **Workspaces and Account Centre**
   - Jobs, Clients, Quotes, Invoices, Team, Dispatch, Proof-to-Paid, Plans, Settings, Contact, Notifications, Integrations, Privacy, Terms, and Account Deletion must be reachable from the hub.
   - Drawer first. Full page only as a fallback.

## Backend endpoints that must exist

- `GET /api/ai/operator/today-plan`
- `GET /api/ai/operator/business-health`
- `POST /api/ai/operator/ask`
- `POST /api/smart-hub/scan`
- `GET /api/command-hub/actions`
- `POST /api/command-hub/actions/execute`
- `PATCH /api/jobs/{job_id}`
- `GET /api/ai/receptionist/enquiries`
- `GET /api/ai/recurring`
- `GET /api/ai/customer-updates`
- `GET /api/ai/quotes/drafts`
- `GET /api/ai/client-memory`

Compatibility fallback routes may also exist under `/api/api/...` because older frontend code may accidentally include `/api` in the path before the API helper adds its own prefix.

## Approval action record

Each AI approval action should store:

- `id`
- `business_id`
- `type`
- `priority`
- `title`
- `summary`
- `reason`
- `next`
- `payload`
- `status`: pending, prepared, completed, dismissed, failed
- `source`
- `created_at`
- `updated_at`
- `approved_by`
- `executed_at`
- `failed_reason`

## Dispatch intelligence

Worker recommendation should score:

- active/inactive status
- workload
- schedule conflicts
- region/suburb match
- skills/job type experience
- availability
- owner override

## Revenue intelligence

AI may prepare but must not send automatically:

- invoice descriptions
- draft invoices
- invoice reminders
- quote follow-ups
- proof-to-paid packs

## Drawer rules

A drawer is the primary work area.

A drawer should not show only “Open full page” unless no mini-workspace exists yet. Every core workspace should provide useful controls or information inside the drawer first.

## Launch test checklist

Before launch, test:

1. Dashboard loads for owner/admin/manager/office admin.
2. Worker/payroll are blocked from owner Control Room.
3. Run AI Plan returns a backend response.
4. Ask AI Operator returns a backend answer.
5. Approval queue loads persisted backend actions.
6. Assign worker action updates a job.
7. Job drawer save updates a job.
8. Draft invoice action creates a draft invoice only.
9. Proof pack action prepares proof only.
10. Follow-up action creates a draft message only.
11. Plans drawer shows useful plan/account content.
12. Settings drawer is useful and does not pretend to save if save endpoint is not confirmed.
13. Contact drawer can open email/support.
14. Notifications drawer gives owner controls/status.
15. Integrations drawer shows MYOB/SMS status or clear next step.
16. Mobile layout stacks cleanly.
17. No owner approval action auto-sends customer communication.
18. No MYOB/accounting write happens without explicit approval.
19. No payroll or deletion action happens without explicit approval.
20. Render backend and frontend deploy latest main successfully.
