# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Core promise: jobs, quotes, invoices, team assignment, time tracking, customer reminders, MYOB sync. Mobile-first, fast, clean.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui
- Backend: FastAPI + MongoDB
- Auth: Custom JWT (cookie + Bearer token)

## Completed Batches
- Batch 1: Branding, theme, nav, multi-trade types, CRUD
- Batch 2: Business isolation, employer/worker roles, team management
- Batch 3: Quotes, invoices, time tracking, time-based invoicing
- Batch 4: Calendar scheduling, SMS system (mocked), SMS triggers
- Batch 5: MYOB integration structure (mocked), business-owned SMS credits
- Batch 6: Plans ($30/$70/$110/$240), feature gating, upgrade/downgrade, team limits
- Final Batch: Onboarding, empty states, helper text, launch polish

## Bugfixes & Legal Pages (31 Mar 2026)
- Fixed admin login: LoginPage/SignupPage checked result.success (undefined). Changed to try/catch + result?.token
- Restored Admin Dashboard button on login page
- Fixed transparent overlays: Added 5 churvox-* color definitions to tailwind.config.js
- Bumped --popover CSS lightness from 9% to 12% for better overlay contrast
- Created 3 public legal pages: /privacy, /terms, /account-deletion (placeholder content)
- Added legal links to: login page, signup page, sidebar footer, settings page
- Added Help & Legal card in Settings with Privacy/Terms/Account Deletion links
- Added Danger Zone / Delete Account card in Settings linking to /account-deletion

## Key URLs
- Login: /login (with Admin Dashboard button)
- Dashboard: /dashboard
- Privacy: /privacy (public)
- Terms: /terms (public)
- Account Deletion: /account-deletion (public)

## Mocked/Placeholder Systems
- SMS delivery (no real Twilio/provider)
- MYOB sync (no real MYOB API)
- Billing/payments (no real Stripe)
- Legal page content (placeholder text — user will provide final content)

## Backlog
- P1: Job photos upload
- P2: Worker password change flow
- P3: Wire real MYOB API, SMS provider, billing provider (Stripe)
- Content: Replace legal page placeholder text with final content
