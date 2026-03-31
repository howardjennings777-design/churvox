# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Mobile-first, production-ready. Single codebase and database, maintaining business isolation.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui (PWA-enabled)
- Backend: FastAPI + MongoDB
- Auth: Custom JWT
- SMS: ClickSend REST API v3 (abstracted provider)

## Completed Features
- **Core**: Branding, business isolation, role-based routing (Employer/Worker)
- **Batches 1-6**: Jobs, quotes, invoices, time tracking, calendar, SMS credits, MYOB structure, plans/gating, onboarding, empty states
- **Auth Flow**: Normal signup (creates employer), normal signin, admin signin link (/admin/login), no public admin signup
- **Employee Invite Flow**: Owner invites workers by name+email, CSV bulk import, mock email with invite link, employees set password at /invite/setup/:token, tied to business
- **PWA**: manifest.json, service worker, install prompt with beforeinstallprompt handling, dismiss logic, iOS/Android fallback instructions
- **ClickSend SMS Integration**: Real ClickSend API for AU/NZ SMS sending, abstracted provider (swap via env), test SMS endpoint, credit tracking, templates (customer_reminder, on_the_way, invoice_reminder, custom)
- **Legal Pages**: Privacy, Terms, Account Deletion (placeholder content)

## SMS Provider Architecture
- Abstracted in `/app/backend/sms_provider.py`
- ClickSendProvider: Real ClickSend REST API v3 with httpx async
- MockSMSProvider: For development/testing (set SMS_TEST_MODE=true)
- Factory pattern: `get_sms_provider()` returns the right provider based on env
- Phone formatting: Auto-converts AU (0→+61) and NZ (0→+64) numbers to E.164
- Env vars: CLICKSEND_USERNAME, CLICKSEND_API_KEY, CLICKSEND_DEFAULT_COUNTRY, SMS_TEST_MODE

## Key API Endpoints
### SMS (ClickSend-powered)
- POST /api/sms/send (sends via ClickSend, deducts 1 credit)
- POST /api/sms/test (dev test, no credits deducted)
- GET /api/sms/provider-balance (ClickSend account balance)
- GET /api/sms/balance (business SMS credits)
- POST /api/sms/buy-credits (placeholder payment)
- GET /api/sms/history (SMS logs with provider, message_id, status)
- GET /api/sms/packs (available credit packs)

### Auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me

### Team & Invites
- POST /api/team/workers, GET /api/team/workers, DELETE /api/team/workers/{id}
- POST /api/team/resend-invite/{worker_id}, POST /api/team/import-csv
- GET /api/invite/verify/{token}, POST /api/invite/accept

## Mocked/Placeholder
- **Email Invites**: Stored in invite_emails collection (not sent via real provider)
- **SMS Credit Purchases**: No real payment (placeholder)
- **MYOB Sync**: Mock sync
- **Billing/Plans**: Placeholder plan upgrades

## Live Integrations
- **ClickSend SMS**: LIVE (note: AU country must be enabled in ClickSend dashboard)

## Backlog
- P1: Job photos upload
- P1: Replace legal page placeholder text
- P2: Worker password change flow
- P3: Wire real Stripe billing
- P3: Wire real MYOB API
- P3: Wire real email provider (Resend) for invite emails
- Refactoring: Split server.py into routes/models structure
