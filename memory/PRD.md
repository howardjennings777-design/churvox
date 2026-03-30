# Churvox Phase 1 - Product Requirements Document

## Original Problem Statement
Build Churvox Phase 1 as a clean, usable contractor app with:
1. Auth (signup, login, forgot/reset password)
2. Dashboard (jobs today/this week, quick actions)
3. Clients (CRUD)
4. Jobs (create, edit, recurring/one-off, start/complete)
5. Quotes (CRUD with status)
6. Invoices (auto-create on job completion, GST)
7. Plans (Solo/Solo+ active, Team/Pro coming soon)

## User Personas
- **Contractor (Primary)**: Independent service providers who need to manage jobs, clients, quotes, and invoices
- **Admin**: Test/owner account with full access to all features

## Core Requirements (Implemented)
- [x] JWT-based authentication (signup, login, logout)
- [x] Forgot password flow (tokens logged for testing)
- [x] Reset password flow
- [x] Admin account bypass for plan restrictions
- [x] Contractor dashboard with stats
- [x] Jobs today/this week sections
- [x] Quick actions (new job, quote, client, invoice)
- [x] Client CRUD operations
- [x] Job management (create, edit, start, complete)
- [x] Recurring and one-off jobs
- [x] Manual customer name entry for one-off jobs
- [x] Quote creation and management
- [x] Quote status workflow (draft → sent → accepted/declined)
- [x] Invoice auto-creation on job completion
- [x] 15% GST calculation (NZ default)
- [x] Custom GST rate setting
- [x] Invoice status management
- [x] Plans page with Solo/Solo+ active, Team/Pro greyed

## What's Been Implemented
**Date: March 30, 2026**

### Backend (FastAPI + MongoDB)
- Full auth system with JWT tokens and brute force protection
- CRUD endpoints for clients, jobs, quotes, invoices
- Job workflow (scheduled → in_progress → completed)
- Auto-invoice generation on job completion
- Dashboard stats aggregation
- GST/tax calculation

### Frontend (React + Tailwind + Shadcn)
- Complete auth flow (login, signup, forgot/reset password)
- Responsive dashboard with stats cards
- Client management pages
- Job management with start/complete flows
- Quote management with status updates
- Invoice management with GST display
- Plans page with coming soon badges
- Settings page for GST rate

## Prioritized Backlog

### P0 (Critical - Not Yet Done)
- None - MVP complete

### P1 (High Priority - Future)
- Email integration for password reset
- Email notifications for quotes/invoices
- PDF invoice generation
- Recurring job automation

### P2 (Medium Priority - Future)
- Team plan features (multi-user)
- Photo attachments for jobs
- Customer portal for quotes
- Payment integration (Stripe)

### P3 (Nice to Have)
- Mobile app (React Native)
- Calendar view for jobs
- Route optimization
- Time tracking

## Technical Architecture
- **Backend**: FastAPI, MongoDB, JWT auth, bcrypt
- **Frontend**: React 19, Tailwind CSS, Shadcn UI
- **Deployment**: Emergent Cloud (Kubernetes)

## Test Credentials
- **Admin**: admin@churvox.com / Admin123!
- **Role**: admin (bypasses plan restrictions)

## Next Tasks
1. Add email service for password reset (Resend/SendGrid)
2. Implement PDF invoice generation
3. Add recurring job automation
4. Build Team plan features
