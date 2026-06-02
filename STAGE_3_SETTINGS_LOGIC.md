# Stage 3 Settings Logic

## Goal
Settings now feed customer-facing documents and AI approval flows.

## Done
- Backend settings routes:
  - GET /api/business/invoice-branding
  - PATCH /api/business/invoice-branding
  - POST /api/business/logo-upload
  - DELETE /api/business/logo-upload
  - GET /api/business/settings-health
- Uploaded logo is stored against the business.
- PDF/email sender reads business document settings.
- Invoice/reminder/quote emails include branded PDF attachment.
- Payment URL and bank details are pulled from Settings.
- Duplicate backend routes are deduped so newest logic wins.

## Manual check after Render deploy
1. Go to Settings.
2. Add business name, logo, bank details or payment link.
3. Save settings.
4. Create/rebuild an invoice slip.
5. Approve + send invoice.
6. Email should include branded PDF using Settings.
