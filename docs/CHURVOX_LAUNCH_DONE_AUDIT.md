# Churvox Launch Done Audit

Generated: 2026-06-11T04:08:29Z

**Score:** 96%
**Pass:** 22/23

| Area | Check | Status | Evidence | Fix |
|---|---|---:|---|---|
| Invoice PDF | Backend PDF generator exists | **PASS** | PDF bytes route exists. | Add backend PDF generator. |
| Invoice PDF | Send-with-PDF endpoint exists | **PASS** | Invoice PDF email endpoint exists. | Add POST /api/invoices/:id/send-with-pdf. |
| Invoice PDF | PDF route mounted | **PASS** | Invoice PDF router mounted in backend app. | Mount invoice PDF router. |
| Invoice PDF | Owner invoice send uses PDF endpoint | **PASS** | Invoice detail sends through backend PDF endpoint. | Replace mailto-only send with backend send-with-PDF. |
| Invoice PDF | Email provider support exists | **PASS** | Postmark and Resend providers supported. | Set provider env vars on Render. |
| Worker | Worker app routes exist | **PASS** | Worker route table exists. | Add worker routes. |
| Worker | Worker app has timer actions | **PASS** | Worker timer endpoints used. | Wire worker timers. |
| Worker | Worker evidence capture exists | **PASS** | Worker notes/photos exist. | Wire worker evidence. |
| Worker | Worker help reaches owner Command | **PASS** | Worker help creates Command slip. | Wire worker help to Command. |
| Owner Command | Command reads backend slips | **WARN** | Command backend slip API referenced. | Load backend Command slips. |
| Owner Command | Owner notification centre covers worker issues | **PASS** | Worker messages category exists. | Show worker messages in Command. |
| Owner Review | Send-back flow exists | **PASS** | Worker sees sent-back jobs. | Wire owner send-back action. |
| Customer | Public quote accept/decline exists | **PASS** | Public quote actions exist. | Wire public quote. |
| Customer | Public invoice pay link exists | **PASS** | Public invoice has payment path. | Wire public invoice. |
| Customer | Public client approval exists | **PASS** | Public client portal approval exists. | Wire client portal. |
| Roles | Worker blocked from owner/business shell | **PASS** | Worker redirected away from business shell. | Add worker route guard. |
| Roles | Payroll default route clean | **PASS** | Payroll default route is payroll board. | Fix payroll route. |
| Roles | Reports excludes payroll | **PASS** | Reports route/matrix excludes payroll. | Block payroll from reports. |
| Tradie basics | Onboarding steps exist | **PASS** | Launch onboarding checklist exists. | Add onboarding checklist. |
| Tradie basics | Customer message templates exist | **PASS** | Common tradie templates exist. | Add templates. |
| Tradie basics | Client memory exists | **PASS** | Client memory fields exist. | Add client memory. |
| Tradie basics | Price memory exists | **PASS** | Price memory fields exist. | Add price memory. |
| Tradie basics | Offline queue helper exists | **PASS** | Offline queue helper exists. | Add offline queue helper. |

## Real testing still required

- Send invoice and confirm the customer email has a PDF attachment.
- Open PDF on phone and desktop.
- Complete a worker job with notes/photos.
- Confirm owner sees the proof/worker issue in Command.
- Approve work, send invoice PDF, confirm status becomes sent.
- Test owner, manager, office_admin, worker, payroll and public customer links.