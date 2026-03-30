# Churvox - Product Requirements Document

## Original Problem Statement
Build a multi-trade job management platform called Churvox. Core promise: jobs, quotes, invoices, team assignment, time tracking, customer reminders, MYOB sync. Phase 1 focuses on the foundation: rebranding, navigation, dark-slate/electric blue theme, and multi-trade wording.

## Phase 1 - Batch 1 Goals (COMPLETED)
1. Rebrand fully to Churvox (remove all Grassly/Mowtix/lawn-only wording)
2. Fix logo display everywhere (sharp, properly sized, aligned)
3. Update theme to premium dark-slate and electric blue
4. Remove lawn-only wording and make wording multi-trade
5. Update navigation to Dashboard, Jobs, Calendar, Clients, More
6. Keep changes credit-friendly and reuse existing working parts

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Custom JWT (cookie + Bearer token)
- Deployment: Kubernetes container

## Key DB Schema
- `users`: email, password_hash, name, business_name, role, plan, gst_rate, trade_type
- `clients`: name, email, phone, address, notes, contractor_id
- `jobs`: title, job_type, client_id, customer_name, address, scheduled_date, scheduled_time, price, status, is_recurring, recurrence_pattern
- `quotes`: customer_name, customer_email, address, job_description, price, status, quote_number
- `invoices`: customer_name, description, subtotal, gst_rate, gst_amount, total, status, invoice_number

## API Endpoints
- Auth: POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me, POST /api/auth/forgot-password, /api/auth/reset-password, /api/auth/refresh
- User: PATCH /api/user/plan, /api/user/gst, /api/user/trade
- Clients: CRUD on /api/clients
- Jobs: CRUD on /api/jobs, POST /api/jobs/{id}/start, /api/jobs/{id}/complete, GET /api/jobs/today, /api/jobs/week
- Quotes: CRUD on /api/quotes, POST /api/quotes/{id}/send
- Invoices: CRUD on /api/invoices, POST /api/invoices/{id}/send, /api/invoices/{id}/mark-paid
- Dashboard: GET /api/dashboard/stats

## What's Been Implemented (Batch 1 - March 2026)
- Full Churvox branding (logo, text, colors) across all pages
- Dark-slate + electric blue theme via CSS variables
- 5-tab navigation: Dashboard, Jobs, Calendar, Clients, More
- More dropdown: Quotes, Invoices, Plans, Settings
- Mobile bottom nav with same structure
- Multi-trade job types (19 types across 4 categories)
- Trade type selection in Settings
- Calendar page with job dots
- Full CRUD for Clients, Jobs, Quotes, Invoices
- Job workflow: create > start > complete (auto-creates invoice)
- GST calculation on invoices
- Plans page (Solo, Solo+, Team, Pro)
- Auth: login, signup, forgot/reset password
- Admin seed account

## Backlog (Future Phases)
- P1: Team assignment and worker management
- P1: Time tracking per job
- P2: Customer reminders (SMS/email)
- P2: MYOB accounting sync
- P2: Advanced reporting and analytics
- P3: Route optimization
- P3: Fleet tracking
