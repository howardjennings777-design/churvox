# Churvox - Product Requirements Document

## Original Problem Statement
Multi-trade job management platform. Core: jobs, quotes, invoices, team, time tracking, SMS, MYOB sync. Mobile-first.

## Architecture
- Frontend: React + Tailwind CSS + shadcn/ui (PWA-enabled)
- Backend: FastAPI + MongoDB
- Auth: Custom JWT

## Completed
- Batch 1-6: Full app (branding, isolation, roles, jobs, quotes, invoices, time tracking, calendar, SMS, MYOB, plans, gating)
- Final Batch: Onboarding, empty states, polish
- Bugfixes: Admin login, transparent overlays (churvox-* colors), legal pages
- PWA: Manifest, icons, service worker, InstallPrompt component

## PWA Support (31 Mar 2026)
- manifest.json with 4 icons (192+512, any+maskable), display:standalone
- sw.js minimal service worker (network-first)
- Service worker registration in index.js
- Apple meta tags (apple-mobile-web-app-capable, apple-touch-icon)
- InstallPrompt component: beforeinstallprompt capture, iOS fallback instructions, 7-day dismiss
- Install banner in Layout (appears on mobile devices)

## Mocked/Placeholder
- SMS delivery, MYOB sync, billing/payments, legal page content

## Backlog
- P1: Job photos upload
- P2: Worker password change
- P3: Wire real providers (Stripe, MYOB, Twilio)
- Content: Replace legal page placeholders
