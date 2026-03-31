# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Mobile-first, production-ready. Single codebase and database, maintaining business isolation.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui (PWA-enabled)
- Backend: FastAPI + MongoDB
- Auth: Custom JWT
- SMS: ClickSend REST API v3 (abstracted provider)
- Email: Resend API (abstracted provider)

## Completed Features
- **Core**: Branding, business isolation, role-based routing (Employer/Worker)
- **Batches 1-6**: Jobs, quotes, invoices, time tracking, calendar, SMS credits, MYOB structure, plans/gating, onboarding, empty states
- **Auth Flow**: Normal signup (creates employer), normal signin, admin signin link (/admin/login), no public admin signup
- **Employee Invite Flow**: Owner invites workers by name+email, CSV bulk import, REAL invite email via Resend, employees set password at /invite/setup/:token, tied to business
- **PWA**: manifest.json, service worker, install prompt with beforeinstallprompt handling, dismiss logic, iOS/Android fallback
- **ClickSend SMS**: Real ClickSend API for AU/NZ SMS (note: AU country needs enabling in ClickSend dashboard)
- **Resend Email**: Real transactional email via Resend for invites, reminders. Branded HTML templates with Churvox styling, setup buttons, fallback links, expiry notes. Domain fallback to onboarding@resend.dev until churvox.com is verified.
- **Legal Pages**: Privacy, Terms, Account Deletion (placeholder content)

## Email Provider Architecture
- Abstracted in `/app/backend/email_provider.py`
- ResendProvider: Real Resend API with async sending (asyncio.to_thread)
- MockEmailProvider: For development/testing (when no RESEND_API_KEY)
- Templates: build_invite_email(), build_resend_invite_email(), build_password_reset_email()
- Domain fallback: If churvox.com not verified, auto-retries with onboarding@resend.dev
- Env vars: RESEND_API_KEY, EMAIL_FROM

## SMS Provider Architecture
- Abstracted in `/app/backend/sms_provider.py`
- ClickSendProvider: Real ClickSend REST API v3
- MockSMSProvider: For dev (set SMS_TEST_MODE=true)
- Env vars: CLICKSEND_USERNAME, CLICKSEND_API_KEY, CLICKSEND_DEFAULT_COUNTRY, SMS_TEST_MODE

## Key API Endpoints
### Email
- POST /api/email/test (test email delivery, employer-only)

### SMS (ClickSend-powered)
- POST /api/sms/send, /api/sms/test, GET /api/sms/provider-balance, /api/sms/balance, /api/sms/history, /api/sms/packs, POST /api/sms/buy-credits

### Team & Invites (triggers real email)
- POST /api/team/workers, GET /api/team/workers, DELETE /api/team/workers/{id}
- POST /api/team/resend-invite/{worker_id}, POST /api/team/import-csv
- GET /api/invite/verify/{token}, POST /api/invite/accept

### Auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me

## Mocked/Placeholder
- SMS Credit Purchases: No real payment
- MYOB Sync: Mock
- Billing/Plans: Placeholder plan upgrades

## Live Integrations
- ClickSend SMS: LIVE (AU country needs enabling in dashboard)
- Resend Email: LIVE (churvox.com domain needs verifying in Resend dashboard)

## Backlog
- P1: Job photos upload
- P1: Replace legal page placeholder text
- P1: Verify churvox.com domain in Resend for production email
- P1: Enable Australia in ClickSend for production SMS
- P2: Worker password change flow
- P3: Wire real Stripe billing
- P3: Wire real MYOB API
- Refactoring: Split server.py into routes/models structure
