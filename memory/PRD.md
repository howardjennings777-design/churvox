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
- Quote pricing types: fixed, hourly, fixed_extras, hourly_extras
- Quote-to-job conversion (auto-creates job from quote details)
- Time tracking: start/pause/resume/complete, manual time adjustment
- Time-based invoicing: fixed, hourly, fixed+extras, hourly+extras
- Invoice draft flow: job completed > draft invoice > send > paid
- Client-job-invoice linking throughout
- Logo asset updated to transparent PNG, shared ChurvoxLogo component

## Batch 4 — COMPLETED
- Calendar scheduling: month grid, job dots, daily overview with job cards
- SMS system: balance tracking, credit packs (100/$10, 500/$45, 1000/$80)
- SMS page with balance card, credit packs, send dialog, message history
- Quick SMS buttons on Job detail and Invoice detail
- SMS delivery is MOCKED

## Batch 5 — COMPLETED
- MYOB integration structure (placeholder/service-layer ready)
- Invoice sync to MYOB (mock), payment sync-back webhook
- Sync status: not_synced > syncing > synced / sync_failed
- MYOB settings management in Settings page
- Business-owned SMS credits with sent_by_name tracking
- MYOB sync is MOCKED

## Batch 6 — COMPLETED (31 Mar 2026)
- Plans & Pricing page: Solo=$30, Team=$70, Pro=$110, Enterprise=$240
- +$100 per additional 50-user block (Enterprise)
- Clean upgrade/downgrade flow with confirmation dialog
- Current plan banner with usage stats (workers, clients)
- Feature gating by plan:
  - Solo: jobs, quotes, invoices, time tracking, scheduling, 50 clients
  - Team: + team management (5 workers), SMS, unlimited clients
  - Pro: + MYOB integration, 20 workers, priority support
  - Enterprise: 50 workers base, extra blocks, dedicated support
- UpgradePrompt component for locked features
- Team page: gated on Solo (shows upgrade prompt)
- SMS page: gated on Solo (shows upgrade prompt)
- MYOB settings: gated below Pro (shows locked card)
- Team limit enforcement in worker creation (403 when limit reached)
- Client limit enforcement in client creation (403 on Solo at 50+)
- Plan management is employer-only (workers see read-only notice)
- Plan changes propagate to all workers in the business
- Billing is PLACEHOLDER (no real payment provider)

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

## Backlog
- P1: Job photos upload (job documentation/evidence)
- P2: Worker password change flow
- P3: Wire real MYOB API (replace mock)
- P3: Wire real SMS provider (replace mock)
- P3: Wire real billing provider (Stripe) for plan subscriptions
