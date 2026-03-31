# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Mobile-first, production-ready.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui (PWA-enabled)
- Backend: FastAPI + MongoDB
- Auth: Custom JWT (no bypasses, proper session validation)

## Completed
- Batches 1-6 + Final: Full app (branding, isolation, roles, jobs, quotes, invoices, time tracking, calendar, SMS, MYOB, plans, gating, onboarding, empty states)
- PWA install support
- Legal pages (/privacy, /terms, /account-deletion)
- Launch cleanup (31 Mar 2026): Removed admin bypass, cleaned test data, verified all empty states

## Key URLs
- Login: /login (email + password only, no bypass)
- Dashboard: /dashboard
- Privacy: /privacy (public)
- Terms: /terms (public)
- Account Deletion: /account-deletion (public)

## Production State
- Database: Clean (only admin@churvox.com user, no test data)
- Auth: No bypass, no demo mode, proper session validation
- All pages show clean empty states when no data exists

## Mocked/Placeholder
- SMS delivery, MYOB sync, billing/payments, legal page content

## Backlog
- P1: Job photos upload
- P2: Worker password change
- P3: Wire real providers (Stripe, MYOB, Twilio)
- Content: Replace legal page placeholders
