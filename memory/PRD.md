# Churvox PRD

## Original Problem Statement
Prepare Churvox for launch as a mobile-friendly web app deployed on Render. Keep Render compatibility, current frontend/backend structure, and preserve existing auth/cookie/CORS setups. Do not hardcode backend URLs. Focus on launch-critical items only: clean login/signup, clients, jobs, quotes, invoices, team features, Stripe plan persistence, mobile tap/click fixes, and adding loading/empty/error states.

## Architecture
- **Frontend**: React (CRA) + Tailwind CSS + Radix UI + Shadcn, served as production build
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Auth**: JWT tokens + HTTP-only cookies, passlib/bcrypt
- **Email**: Resend API
- **SMS**: ClickSend API
- **Billing**: Stripe
- **Deployment**: Render (auto-deploy from GitHub main branch)

## What's Been Implemented

### Session 1-15 (Previous Forks)
- Full CRUD for clients, jobs, quotes, invoices
- Auth flows (login, signup, forgot/reset password)
- Stripe billing integration with plan persistence
- Team portal with worker management
- CSV import for clients and team
- PWA "website-first" configuration
- Mobile tap/click fixes (hard-tap-fix.css)
- Radix UI dialog/modal click bug fixes (replaced AlertDialogAction with native buttons)
- Backend role-based access for "employer" users across 16 routes
- Install Prompt layout fix
- Hardcoded backend URLs removed globally

### Session 16 (Current Fork - April 14-15, 2026)
- **P0: App Owner Platform Refactor** — COMPLETE
  - Removed redundant 4-endpoint waterfall fetch in AppOwnerPage.jsx
  - Now uses single `/api/admin/platform-stats` endpoint only
  - Fixed backend routing: endpoint was registered after catch-all route, causing 404s
  - Simplified normalizeStats to match known backend response shape
  - Fixed plan_counts leak (0 values falling through to unfiltered backend counts)
  - Fixed "Jobs Today" label to "Total Jobs" (data accuracy)
  - filterFake correctly removes test/demo/seed data
- **P1: Forgot Password Flow** — VERIFIED & CLEANED
  - Fixed missing `send_email` import in server.py
  - Removed testing fallback UI: no more visible token, blue reset link, or "Email delivery issue" warning
  - Success state now shows clean generic message: "If an account exists for that email, you'll receive a password reset link shortly."
  - Backend still logs debug info (token, email errors) for developer troubleshooting
  - Full reset flow works: forgot → token → email (or fail gracefully) → reset-password → success
- **P2: Final Regression** — ALL TESTS PASS
  - Admin login (real mouse click): PASS
  - Employer login (real mouse click): PASS
  - Owner dashboard real data: PASS
  - Forgot password fallback: PASS
  - Jobs delete modal (real mouse click): PASS
  - Clients add modal (real mouse click): PASS
  - Mobile viewport (375x812): PASS
- **Build fix**: Rebuilt frontend with correct REACT_APP_BACKEND_URL

## Render Environment Variables Required
```
MONGO_URL=<MongoDB connection string>
DB_NAME=<database name>
JWT_SECRET=<64+ char secret>
CORS_ORIGINS=<frontend URL>
FRONTEND_URL=<frontend URL>
RESEND_API_KEY=<Resend API key>
EMAIL_FROM=hello@churvox.com
CLICKSEND_USERNAME=hello@churvox.com
CLICKSEND_API_KEY=<ClickSend key>
PLATFORM_OWNER_EMAILS=hello@churvox.com
```

## For Forgot Password to work on Render
1. `RESEND_API_KEY` must be a valid Resend key
2. `EMAIL_FROM` must be from a verified domain in Resend (e.g., hello@churvox.com requires churvox.com domain verified)
3. `FRONTEND_URL` must match the Render frontend URL (used to build reset links)

## Backlog
- No new features requested by user
- User explicitly prohibited: advanced AI, marketplace, fleet, big redesigns
