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

## Batch 4 — COMPLETED (31 Mar 2026)
- Calendar scheduling: month grid view, job dots on days, daily overview with job cards
- Calendar daily overview: click day to see jobs, click job to open detail
- Month navigation and "X jobs this month" count
- SMS system: balance tracking, credit packs (100/$10, 500/$45, 1000/$80)
- SMS page with balance card, credit packs, send dialog, message history
- SMS types: customer_reminder, on_the_way, invoice_reminder
- Quick SMS buttons on Job detail (On the Way, Reminder) for employers
- SMS Reminder button on Invoice detail (for sent invoices)
- SMS navigation link in sidebar under "More"
- SMS delivery is MOCKED (no real Twilio/provider)
- Logo size polish (bigger in sidebar/header)

## Batch 5 — COMPLETED (31 Mar 2026)
- MYOB integration structure (placeholder/service-layer ready):
  - Settings management (API key, company file ID/name)
  - Invoice sync to MYOB (mock: generates MYOB-XXXXXXXX ID)
  - Sync status tracking: not_synced > syncing > synced / sync_failed
  - Payment sync-back webhook (marks invoice paid when MYOB payment received)
  - MYOB sync log for audit trail
  - Invoice migration adds MYOB fields to existing invoices
- MYOB UI:
  - Settings page: MYOB Integration card with API key, company fields, Connected badge
  - Invoice detail: MYOB sync section with status badge, Sync to MYOB button, last sync time
  - Invoice list: MYOB sync badge for synced invoices
- Business-owned SMS credits:
  - Shared balance per business (was already business_id-based, confirmed)
  - Employer/admin can buy/top-up credits
  - Workers can send SMS using business credits
  - Workers CANNOT buy credits (403)
  - sent_by_name tracking on every SMS log entry
  - SMS history shows who sent each message
- MYOB sync is MOCKED (no real MYOB API connected yet)

## Key API Endpoints
### Auth: register, login, logout, me, refresh, forgot/reset-password
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
- P3: Advanced reporting and analytics
- P3: Route optimization
