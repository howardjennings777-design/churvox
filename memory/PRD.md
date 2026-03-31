# Churvox - Product Requirements Document

## Original Problem Statement
Build a multi-trade job management platform called Churvox. Core promise: jobs, quotes, invoices, team assignment, time tracking, customer reminders, MYOB sync. Mobile-first, fast, clean, uncluttered.

## Phase 1 Scope (Locked)
- Multi-trade job management platform
- Navigation: Dashboard, Jobs, Calendar, Clients, More
- Design: premium dark-slate and electric blue
- Mobile-first, fast, clean

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Custom JWT (cookie + Bearer token)
- Deployment: Kubernetes container

## Key DB Schema
- `users`: email, password_hash, name, business_name, role (employer/worker), plan, gst_rate, trade_type, business_id
- `clients`: name, email, phone, address, notes, contractor_id (= business_id)
- `jobs`: title, job_type, client_id, customer_name, address, scheduled_date, scheduled_time, price, status (assigned/acknowledged/in_progress/completed), assigned_worker_id, assigned_worker_name, photos[], notes
- `quotes`: customer_name, customer_email, address, job_description, price, status (draft/sent/accepted/declined), quote_number
- `invoices`: customer_name, description, subtotal, gst_rate, gst_amount, total, status (draft/sent/paid/overdue/cancelled), invoice_number

## API Endpoints
### Auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout
- GET /api/auth/me
- POST /api/auth/forgot-password, /api/auth/reset-password, /api/auth/refresh

### User Settings
- PATCH /api/user/plan, /api/user/gst, /api/user/trade

### Team (Employer only)
- POST /api/team/workers (create worker account)
- GET /api/team/workers (list workers)
- DELETE /api/team/workers/{id} (remove worker)

### Clients
- CRUD on /api/clients
- GET /api/clients/{id}/jobs (job history)

### Jobs
- CRUD on /api/jobs
- GET /api/jobs/today, /api/jobs/week
- POST /api/jobs/{id}/assign (assign worker)
- POST /api/jobs/{id}/acknowledge (worker acknowledges)
- POST /api/jobs/{id}/start, /api/jobs/{id}/complete

### Quotes & Invoices
- CRUD + status transitions on /api/quotes, /api/invoices
- GET /api/dashboard/stats

## Batch 1 — COMPLETED (March 2026)
- Full Churvox branding across all pages
- Dark-slate + electric blue theme
- 5-tab navigation: Dashboard, Jobs, Calendar, Clients, More
- Multi-trade job types (19 types across 4 categories)
- Trade type selection in Settings
- Full CRUD for Clients, Jobs, Quotes, Invoices
- Admin seed account

## Batch 2 — COMPLETED (March 2026)
- Business isolation (all data filtered by business_id, no cross-company visibility)
- Employer/Worker roles with role-based UI
- Team management (employer creates worker accounts with temp password)
- Job assignment workflow: assigned → acknowledged → in_progress → completed
- Worker dashboard shows only assigned jobs (no quick actions, limited nav)
- Client detail page with job history
- Logo cleanup (mix-blend-mode: screen for transparent logo on dark backgrounds)
- Removed old statuses (scheduled, cancelled) — migrated to "assigned"

## Logo Branding Fix — COMPLETED (March 2026)
- Created shared `ChurvoxLogo` component at `/app/frontend/src/components/ChurvoxLogo.js`
- Single `LOGO_URL` constant — one change swaps logo everywhere
- Removed all "Churvox" text wordmarks beside the logo
- Logo-only display: clean, centered, transparent, no background box
- Applied across: login, signup, forgot-password, reset-password, sidebar header, mobile header, invoice detail

## Backlog (Future Batches)
- P1: Time tracking per job
- P1: Job photos upload support
- P2: Customer reminders (SMS/email notifications)
- P2: MYOB accounting sync
- P2: Worker password change flow
- P3: Advanced reporting and analytics
- P3: Route optimization
