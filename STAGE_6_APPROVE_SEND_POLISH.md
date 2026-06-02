# Stage 6 Approve + Send Polish

## Goal
Make send slips pull real invoice/quote/client/job data before emailing the customer.

## Done
- Approve/send route now hydrates payload from real invoice records.
- Quote follow-up route now hydrates payload from real quote records.
- Client name, email, address and phone are pulled before sending.
- Linked job description is pulled where possible.
- Invoice/quote numbers are generated if missing.
- Settings branding/payment details are used by the PDF/email sender.
- Missing details block approval and keep the slip open.
- Successful sends close the slip and refresh the queue.
- Sent invoices get last_sent_at / last_sent_to updated.

## Manual check after Render deploy
1. Open Command Board.
2. Open an invoice send slip.
3. Confirm customer/email/amount/description are filled.
4. Click Approve + send invoice.
5. Confirm email arrives with branded PDF.
6. Confirm popup closes after success.
7. If email is missing, confirm popup stays open and shows the missing field.
