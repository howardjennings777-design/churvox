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
- Job assignment workflow: assigned → acknowledged → in_progress → completed
- Client detail with job history
- Logo cleanup (mix-blend-mode: screen)

## Batch 3 — COMPLETED
- Quotes module: create, edit, send, view status, convert to job
- Quote pricing types: fixed, hourly, fixed_extras, hourly_extras
- Quote-to-job conversion (auto-creates job from quote details)
- Time tracking: start/pause/resume/complete, manual time adjustment
- Timer auto-transitions job to in_progress on start
- Time-based invoicing: fixed, hourly, fixed+extras, hourly+extras
- Invoice draft flow: job completed → draft invoice auto-created → user reviews → sends
- Invoice detail: line items, hours worked, extras breakdown, GST, total
- Invoice status flow: draft → sent → paid
- Client-job-invoice linking throughout
- Logo asset updated to new uploaded PNG, shared ChurvoxLogo component

## Key API Endpoints
### Auth: register, login, logout, me, refresh, forgot/reset-password
### User: PATCH plan, gst, trade
### Team: POST/GET/DELETE /api/team/workers
### Clients: CRUD + GET /api/clients/{id}/jobs
### Jobs: CRUD + today/week + assign/acknowledge/start/complete
### Timer: POST start/pause/resume, PATCH adjust, GET timer
### Quotes: CRUD + send + convert
### Invoices: CRUD + send + mark-paid
### Dashboard: GET stats

## Backlog
- P1: Job photos upload
- P2: Customer reminders (SMS/email)
- P2: MYOB accounting sync
- P2: Worker password change flow
- P3: Advanced reporting
