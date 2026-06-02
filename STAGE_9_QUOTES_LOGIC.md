# Stage 9 Quotes Logic

## Goal
Make quotes flow properly from send/follow-up through accept/decline and conversion.

## Done
- Added quote send:
  - POST /api/quotes/{quote_id}/send
- Added quote follow-up:
  - POST /api/quotes/{quote_id}/follow-up
- Added prepare follow-up slip:
  - POST /api/quotes/{quote_id}/prepare-follow-up
  - POST /api/ai/quotes/{quote_id}/prepare-follow-up
- Added accept/decline:
  - POST /api/quotes/{quote_id}/accept
  - POST /api/quotes/{quote_id}/decline
- Added conversions:
  - POST /api/quotes/{quote_id}/convert-to-job
  - POST /api/quotes/{quote_id}/convert-to-invoice
- Quote send/follow-up uses Settings branding and sends branded PDF.
- Accepted quotes can become jobs.
- Quotes can become draft invoices.
- Follow-up actions can be prepared into Command Board slips.

## Manual check after Render deploy
1. Open a quote.
2. Send quote.
3. Confirm branded PDF email sends.
4. Prepare quote follow-up and check Command Board.
5. Accept quote.
6. Convert accepted quote to job.
7. Convert quote to draft invoice.
