# Churvox PRD

## Original Problem Statement
Prepare Churvox for launch as a mobile-friendly web app deployed on Render. Keep Render compatibility, current frontend/backend structure, and preserve existing auth/cookie/CORS setups. Do not hardcode backend URLs. Focus on launch-critical items only.

Latest scope additions (2026-04-22): Strongest practical V1 Automation Engine — wire remaining triggers (quote_accepted, recurring_job_generated, timesheet_updated, payroll_status_updated, job_resumed), add templates, trigger schemas, run retry, and per-rule stats. Keep existing working features intact.

## Architecture
- **Frontend**: React (CRA via craco) + Tailwind + Radix/Shadcn — served as a production build via `serve -s build` (PORT=3000). Hot reload NOT active in production mode; run `yarn build && sudo supervisorctl restart frontend` after any .js edit.
- **Backend**: FastAPI + MongoDB (motor) on port 8001 (uvicorn `--reload`)
- **Auth**: JWT + bcrypt (passlib)
- **Email**: Postmark (migrated from Resend)
- **SMS**: ClickSend
- **Billing**: Stripe
- **Automation core**: `/app/backend/automation.py`

## What's Been Implemented (Major Waves)

### Pre-session (Prior forks)
- Full CRUD for clients, jobs, quotes, invoices; auth/login/signup/reset flows; Stripe plans; team portal; CSV imports; PWA; mobile fixes.

### Session 2026-04-21 (V1 Automation + Notifications launch)
- Built V1 Automation Engine with 19 triggers, 9 actions, 18 operators
- In-app notifications system (bell, unread count, per-user scope)
- Postmark migration + branded email templates
- Team invite select styling, PWA icons, geolocation retry
- Worker photo auto-compression via client-side Canvas

### Session 2026-04-22 (Automation Strongest-Practical Release) — THIS SESSION
Backend:
- Wired missing triggers: `quote_accepted` (new `POST /api/quotes/{id}/accept`), `recurring_job_generated` (new `POST /api/jobs/generate-recurring`), `timesheet_updated` (new `POST /api/payroll/timesheets`), `payroll_status_updated` (new `POST /api/payroll/status`)
- Fixed `job_resumed` emit — previously conflated with `job_started` on paused→in_progress transition
- Added engine helpers: `GET /api/automation/templates` (6 starter rules), `GET /api/automation/triggers/{name}/schema` (payload paths), `POST /api/automation/runs/{id}/retry` (re-run a past run)
- `GET /api/automation/rules` now returns `last_run_at`, `last_run_status`, `runs_count` per rule

Frontend:
- Rule builder: trigger path hints (click-to-copy chips), template picker panel, rule list with search + trigger + enabled filters, per-rule last-run badge and stats
- Run history: search by rule/trigger, retry button on failed runs, extra result IDs surfaced (task/activity)

Tests:
- New pytest-style smoke suite: `/app/backend/tests/test_automation_new_triggers.py` — covers templates, trigger schemas, recurring generator, timesheet/payroll stubs, rule creation + trigger fire + run retry + stats regression.

## Backlog (Prioritised)

### P2 — Polish
- Inline action-config form builder (replace raw JSON textarea) for top-3 actions
- Scheduler cron (call `/api/jobs/generate-recurring` once daily; currently on-demand)

### Future
- Migrate job photos from base64-in-Mongo to Emergent Object Storage with signed URLs + thumbnails
- Refactor `server.py` (~5.7k lines) into `/app/backend/routes` and `/app/backend/models`

## Render Environment Variables Required
```
MONGO_URL=<MongoDB connection string>
DB_NAME=<database name>
JWT_SECRET=<64+ char secret>
CORS_ORIGINS=<frontend URL>
FRONTEND_URL=<frontend URL>
POSTMARK_SERVER_TOKEN=<Postmark server token>
POSTMARK_FROM_EMAIL=hello@churvox.com
CLICKSEND_USERNAME=hello@churvox.com
CLICKSEND_API_KEY=<ClickSend key>
PLATFORM_OWNER_EMAILS=hello@churvox.com
```

## Changelog
- 2026-04-22: Strongest-practical V1 Automation release — wired quote_accepted, recurring_job_generated, timesheet_updated, payroll_status_updated, job_resumed triggers; added templates/trigger-schema/retry/stats; frontend rule builder + run history UX lift. E2E smoke suite green.
- 2026-04-21: Automation Engine V1 + Notifications shipped; Postmark migration; team select styling; worker photo compression; PWA icons & splash.

## Operational Note
- Frontend serves from `/app/frontend/build`. After any .js/.jsx edit: `cd /app/frontend && yarn build && sudo supervisorctl restart frontend`.
- Backend hot-reloads via uvicorn `--reload` — no restart needed for .py edits (only for .env/deps).
