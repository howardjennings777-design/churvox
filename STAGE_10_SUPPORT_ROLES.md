# Stage 10 Support + Role Safety

## Goal
Make Support real and expose role safety logic.

## Done
- Added real support ticket endpoints:
  - POST /api/support/messages
  - GET /api/support/messages
  - PATCH /api/support/messages/{ticket_id}
- Support messages are saved to MongoDB.
- Support messages email hello@churvox.com when Postmark is configured.
- Support page now loads ticket history.
- Workers/payroll can send support requests.
- Owners/admin can see business support requests.
- Added role access endpoints:
  - GET /api/roles/access-matrix
  - GET /api/roles/audit
- Support page displays current role navigation permissions.

## Manual check after Render deploy
1. Open Support.
2. Send a support message.
3. Confirm success.
4. Refresh Support and confirm ticket history shows.
5. Check worker can still access Support.
6. Check owner can load role access info.
