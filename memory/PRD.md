# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Mobile-first, production-ready. Single codebase and database, maintaining business isolation.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui (PWA-enabled)
- Backend: FastAPI + MongoDB
- Auth: Custom JWT (no bypasses, proper session validation)

## Completed Features
- **Core**: Branding, business isolation, role-based routing (Employer/Worker)
- **Batches 1-6**: Jobs, quotes, invoices, time tracking, calendar, SMS, MYOB, plans, gating, onboarding, empty states
- **Auth Flow**: Normal signup (creates employer), normal signin, admin signin link (/admin/login), no public admin signup
- **Employee Invite Flow**: Owner manually invites workers (name+email), CSV bulk import, mock email with invite link, employees set password from secure link (/invite/setup/:token), employees then sign in normally, tied to employer's business
- **PWA**: manifest.json, service worker, install prompt with beforeinstallprompt handling, dismiss logic (7-day localStorage cooldown), iOS/Android fallback instructions
- **Legal Pages**: Privacy, Terms, Account Deletion (placeholder content)
- **Launch Cleanup**: All demo/test data removed, no admin bypass

## Key URLs
- Login: /login (email + password, admin link at bottom)
- Admin Login: /admin/login (separate page, same backend endpoint)
- Signup: /signup (creates employer account)
- Invite Setup: /invite/setup/:token (public, employee sets password)
- Dashboard: /dashboard
- Team: /team (invite workers, CSV import, status badges)
- Privacy: /privacy, Terms: /terms, Account Deletion: /account-deletion (public)

## Production State
- Database: Clean (only admin@churvox.com user)
- Auth: No bypass, no demo mode
- All pages show clean empty states when no data

## Mocked/Placeholder
- **Email Invites**: Stored in invite_emails collection, logged to console (not sent via real email provider)
- **SMS Delivery**: Mock POST /api/sms/send
- **MYOB Sync**: Mock POST /api/myob/sync/{id}
- **Billing/Plans**: Placeholder PATCH /api/user/plan (no real payment)

## Key API Endpoints
### Auth
- POST /api/auth/register (creates employer)
- POST /api/auth/login (all roles)
- POST /api/auth/logout
- GET /api/auth/me
- POST /api/auth/forgot-password
- POST /api/auth/reset-password

### Team & Invites
- POST /api/team/workers (creates invited worker, sends mock email)
- GET /api/team/workers (lists workers with status field)
- DELETE /api/team/workers/{id}
- POST /api/team/resend-invite/{worker_id}
- POST /api/team/import-csv (multipart CSV upload)
- GET /api/invite/verify/{token} (public)
- POST /api/invite/accept (public, sets password)

### Jobs, Quotes, Invoices, SMS, MYOB, Plans
- Full CRUD on /api/jobs, /api/quotes, /api/invoices, /api/clients
- /api/sms/send, /api/sms/balance, /api/sms/history
- /api/myob/settings, /api/myob/sync/{id}
- /api/user/plan, /api/plan/limits, /api/plan/all

## DB Schema
- `users`: {email, password_hash, name, role, status (active/invited), business_id, plan, ...}
- `invite_tokens`: {token, user_id, business_id, email, expires_at, used}
- `invite_emails`: {to, subject, body, invite_link, business_id, worker_id, status}
- `jobs`, `quotes`, `invoices`, `clients`, `sms_credits`, `sms_log`, `myob_settings`

## Backlog
- P1: Job photos upload
- P1: Replace legal page placeholder text with real content
- P2: Worker password change flow
- P3: Wire real Stripe billing
- P3: Wire real MYOB API
- P3: Wire real SMS/email provider (Twilio/Resend)
- Refactoring: Split server.py into routes/models structure
