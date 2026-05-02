# Churvox — Premium AI Tradie Platform PRD

## Original Problem Statement
Churvox is an all-in-one field-service SaaS for NZ/AU tradies covering jobs, clients, quotes, invoices, dispatch, payroll, automation, SMS, reports, and MYOB integration. User required a complete frontend rebuild into a premium, modern, uncluttered tradie business platform with a recurring ice-blue theme, deep navy text, electric blue actions, glass premium cards, and clearly visible AI Business Assistant sections across every major page. The rebuild MUST NOT break backend APIs, auth, roles, plan gates, worker restrictions, Stripe, public invoice/quote links, MYOB, SMS, or automation wiring.

## Architecture
- **Frontend**: React (CRA + craco), Tailwind CSS, custom `premium.css` design system, Shadcn UI
- **Backend**: FastAPI, MongoDB (unchanged)
- **Shared premium library**: `/app/frontend/src/components/premium/` (PremiumPage, PremiumHero, PremiumCard, PremiumAIBox, PremiumButton, PremiumStatCard, PremiumActionCard, PremiumBadge, PremiumStatusBadge, PremiumListRow, PremiumFormSection, PremiumTable, PremiumStates, PremiumSection)
- **Theme tokens**: `/app/frontend/src/styles/premium.css` — ice-blue bg `#eef4fc`, deep navy `#0d1b34`, electric blue `#2563eb`, teal success `#0d9488`, amber warning `#d97706`, red danger `#dc2626`

## What's Implemented (Premium Rebuild Complete — Feb 2026)

### Design system
- `premium.css` with full token set + `.cx-*` bridge classes mapping legacy class names to the new premium theme
- 15 reusable premium components in `/components/premium/`
- `Layout.js` wraps everything in `.px-app` shell with premium sidebar, grouped nav (Workspace / Sales / Operations / Settings), NotificationsBell, user card, and mobile bottom nav with More menu

### Pages upgraded to premium theme
**Auth**: LoginPage, SignupPage, ForgotPasswordPage, ResetPasswordPage
**Smart Hub**: DashboardPage (AI Business Assistant panel with APPROVAL-FIRST chip, stat grid, today's run sheet, active work)
**Jobs**: JobsPage, JobFormPage, JobDetailPage (AI Job Assistant with approval-first chip)
**Clients**: ClientsPage, ClientFormPage, ClientDetailPage (AI Client Assistant)
**Quotes**: QuotesPage, QuoteFormPage, QuoteDetailPage (AI Quote Follow-up)
**Invoices**: InvoicesPage, InvoiceFormPage, InvoiceDetailPage (AI Invoice Chaser)
**Operations**: AutomationPage, AutomationRunsPage, PayrollPage, ReportsPage, TeamPage
**Settings & Platform**: SettingsPage, PlansPage, IntegrationsPage, SMSPage, NotificationsPage
**Worker**: WorkerJobsPage, WorkerSettingsPage
**Dispatch**: CalendarPage (uses `.cx-*` bridge styles, auto-inherits premium theme)

### AI Business Assistant surfaces (approval-first, never auto-sends)
- Smart Hub: full "Ask your business" panel with draft generation
- Jobs, Clients, Quotes, Invoices, Automation: `PremiumAIBox` with title, subtitle, suggestions, actions, and explicit "Always review and approve before sending" notice

## Testing
- Build: `yarn build` passes (214.44 kB gzipped JS, 20.61 kB gzipped CSS)
- Testing agent v3 fork iteration 27: **100% (25/25 tests passed, 0 action items, 0 regressions)**
- Credentials verified: `/app/memory/test_credentials.md`

## Backlog / Future Enhancements (P2)
- Strip remaining `cx-*` bridge classes from JSX in favor of direct premium components (reduce CSS bloat)
- Add light/dark theme toggle (currently light-only)
- Add skeleton loaders on all list pages instead of spinner
- Move legacy `/app/backend/` routes to `/app/backend/routes/` and models to `/app/backend/models/`
- Expand AI assistant with live LLM drafts (currently UI-ready, backend hook pending)

## Deployment
- Git: User owns the repo and must use Emergent's **"Save to GitHub"** button in the chat input to push. Render auto-deploy is wired to `main`.
- Protected env vars: `REACT_APP_BACKEND_URL` (frontend), `MONGO_URL` + `DB_NAME` (backend), Stripe test keys (pod env).
