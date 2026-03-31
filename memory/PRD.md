# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Core promise: jobs, quotes, invoices, team assignment, time tracking, customer reminders, MYOB sync. Mobile-first, fast, clean.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Custom JWT (cookie + Bearer token)

## Batch 1 — COMPLETED
- Full Churvox branding, dark-slate/electric-blue theme
- 5-tab nav: Dashboard, Jobs, Calendar, Clients, More
- Multi-trade job types (19 types), CRUD for Clients/Jobs/Quotes/Invoices
- Admin seed account

## Batch 2 — COMPLETED
- Business isolation (all data filtered by business_id)
- Employer/Worker roles with role-based UI
- Team management (employer creates worker accounts)
- Job assignment workflow: assigned > acknowledged > in_progress > completed
- Client detail with job history

## Batch 3 — COMPLETED
- Quotes module: create, edit, send, view status, convert to job
- Quote-to-job conversion, time tracking, time-based invoicing
- Invoice draft flow: job completed > draft invoice > send > paid
- Logo asset transparent PNG, centralized ChurvoxLogo component

## Batch 4 — COMPLETED
- Calendar scheduling: month grid, daily overview, job cards
- SMS system: balance, credit packs (100/$10, 500/$45, 1000/$80)
- SMS triggers on Job/Invoice detail pages
- SMS delivery is MOCKED

## Batch 5 — COMPLETED
- MYOB integration structure (placeholder/service-layer ready)
- Invoice sync, payment sync-back webhook, sync status tracking
- Business-owned SMS credits with sent_by_name tracking
- MYOB sync is MOCKED

## Batch 6 — COMPLETED
- Plans: Solo=$30, Team=$70, Pro=$110, Enterprise=$240
- +$100 per additional 50-user block (Enterprise)
- Upgrade/downgrade flow with confirmation dialog
- Feature gating by plan (team, SMS, MYOB)
- Team/client limit enforcement
- Plan management employer-only
- Billing is PLACEHOLDER

## Final Batch — COMPLETED (31 Mar 2026)
- Dashboard: "Getting Started" checklist for new businesses, improved empty states
- Login: Removed demo "Quick Admin Login" button, polished right-side copy with feature tags
- Signup: Improved business name field with helper text, updated feature list
- Empty states improved across all pages (jobs, clients, quotes, invoices, team, SMS, calendar)
- Helper text: contextual guidance on jobs, clients, quotes, invoices, team, SMS
- Team page shows worker count with plan max (e.g. "1 / 20 max")
- SMS empty state guides users to send from job/invoice detail pages
- Launch cleanup: removed demo clutter, consistent wording, placeholder notices retained

## Key API Endpoints
### Auth: register, login, logout, me, refresh, forgot/reset-password
### Plan: GET /plan/limits, GET /plan/all, PATCH /user/plan
### User: PATCH plan, gst, trade
### Team: POST/GET/DELETE /api/team/workers
### Clients: CRUD + GET /api/clients/{id}/jobs
### Jobs: CRUD + today/week + assign/acknowledge/start/complete
### Timer: POST start/pause/resume, PATCH adjust, GET timer
### Quotes: CRUD + send + convert
### Invoices: CRUD + send + mark-paid
### SMS: GET balance, POST buy-credits, POST send, GET history, GET packs
### MYOB: GET/POST settings, POST sync/{id}, GET status/{id}, POST webhook
### Dashboard: GET stats

## Mocked/Placeholder Systems
- SMS delivery (no real Twilio/provider)
- MYOB sync (no real MYOB API)
- Billing/payments (no real Stripe)

## Backlog
- P1: Job photos upload (job documentation/evidence)
- P2: Worker password change flow
- P3: Wire real MYOB API
- P3: Wire real SMS provider
- P3: Wire real billing provider (Stripe)
