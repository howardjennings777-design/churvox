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

## Bugfixes (31 Mar 2026)
- Fixed admin login: LoginPage.js checked `result.success` which didn't exist on API response. Changed to try/catch + `result?.token` check.
- Fixed signup redirect: Same pattern applied to SignupPage.js.
- Fixed transparent overlays: churvox-* Tailwind colors were used across entire app but never defined in tailwind.config.js. Added all 5 color definitions.
- Improved popover contrast: Bumped --popover CSS variable lightness from 9% to 12%.
- Removed demo "Quick Admin Login" button from login page.

## Key URLs
- Login: /login
- Dashboard: /dashboard (role-based content)
- Signup: /signup

## Mocked/Placeholder Systems
- SMS delivery (no real Twilio/provider)
- MYOB sync (no real MYOB API)
- Billing/payments (no real Stripe)

## Backlog
- P1: Job photos upload
- P2: Worker password change flow
- P3: Wire real MYOB API, SMS provider, billing provider (Stripe)
