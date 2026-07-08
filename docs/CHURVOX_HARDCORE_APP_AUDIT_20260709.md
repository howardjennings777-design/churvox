# Churvox hardcore app logic audit — 2026-07-09

## What was fixed in this pass

### 1. Internal support, not external email

Support inside the logged-in app now creates Churvox support tickets instead of relying on the customer opening their own email app.

Real backend endpoints added:

- `POST /api/support/tickets` — logged-in user creates a support ticket.
- `GET /api/support/tickets` — logged-in user can see their own tickets.
- `GET /api/admin/owner/support-tickets` — HQ sees support tickets.
- `PATCH /api/admin/owner/support-tickets/{ticket_id}` — HQ can update ticket status/notes.

Storage:

- Mongo collection: `support_tickets`
- Ticket fields: subject, message, category, priority, page, industry mode, user email, business name, status, owner notes.

Frontend:

- Owner Help page injects an internal support form.
- Mailto support links are hidden inside the Help flow.
- HQ shows internal support tickets.

### 2. Industry system widened

The shared industry brain now includes:

- Field service
- Lawn & garden
- Landscaping
- Cleaning
- Property maintenance
- Handyman & repairs
- Painting
- Plumbing, electrical & HVAC
- Pest control
- Barber, hair & beauty

### 3. Barber / hairdresser / salon logic added

For `barber-hairdresser`, the app now treats the business differently:

- Jobs become appointments.
- Workers become staff.
- Service choices become haircut, barber cut, beard trim, colour, blow wave, treatment, beauty service, consultation.
- Field map is hidden.
- GPS/location field pressure is hidden.
- Timesheet pressure is hidden.
- Quote page is soft-hidden because most appointments go straight to payment/invoice.
- Proof/photos are treated as client notes, not field proof.

### 4. Industry choice affects real app pages

Industry mode now affects:

- Signup business type
- Public industry pages
- Public demo flow
- Local business settings
- Owner app Settings industry mode panel
- Job/client service dropdowns
- Jobs/appointments wording
- Worker/staff wording
- Empty-state copy
- Worker map visibility
- Field labels including service, address, proof/client notes, GPS/location and timesheet fields

### 5. What is still not perfect

This pass avoids breaking the app by using runtime adaptors on top of ProductAppV3. The next cleaner step is to move the same industry logic directly into `ProductAppV3.jsx` so fields/pages are rendered natively by industry from the first paint.

Still worth doing next:

1. Native ProductAppV3 industry rendering instead of runtime mutation.
2. Dedicated HQ support tab inside AppOwnerMachine, not just a HQ support card.
3. Worker app industry wording for staff/cleaners/technicians/painters.
4. Public contact page internal request form instead of any remaining direct email prompts.
5. Build/browser smoke test after deploy for:
   - `/signup?industry=barber-hairdresser`
   - `/demo?industry=barber-hairdresser`
   - `/dashboard#settings`
   - `/dashboard#jobs`
   - `/dashboard#workers`
   - `/dashboard#support`
   - `/admin`

## Important product rule

Churvox should feel like one system:

Public site → demo → signup → settings → app pages → support → HQ.

Industry mode should not be cosmetic. It should change wording, service choices, field pressure, hidden noise and what the owner sees first.
