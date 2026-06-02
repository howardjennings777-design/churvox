# Stage 8 Client Workbench

## Goal
Make each client a real workbench, not just a contact.

## Done
- Added backend client workbench endpoint:
  - GET /api/clients/{client_id}/workbench
  - GET /api/client-workbench/{client_id}
- Added client action preparation endpoint:
  - POST /api/clients/{client_id}/prepare-actions
  - POST /api/client-workbench/{client_id}/prepare-actions
- Workbench pulls:
  - client details
  - jobs
  - quotes
  - invoices
  - unpaid total
  - completed jobs needing invoice
  - overdue invoices
  - open quotes
  - proof photo count
  - AI client summary
  - suggested actions
- Added frontend page:
  - /clients/:clientId/workbench
- Added quick actions for job, quote, invoice and Command Board.
- Prepare client actions can create Command Board slips.

## Manual check after Render deploy
1. Open /clients.
2. Open a client workbench URL: /clients/CLIENT_ID/workbench.
3. Confirm it shows jobs, quotes, invoices and unpaid amount.
4. Click Prepare client actions.
5. Open Command Board and confirm related slips appear.
