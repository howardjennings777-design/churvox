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

## AI Operator Front Desk Overhaul (Feb 2026, in progress)

### Pass 1 — Theme & design system (DONE)
- New cream/charcoal/lime palette locked: bg `#F7F3EA`, surface `#FFFFFF`, text `#0E0E0E`, lime accent `#C8FF4D`
- `/app/frontend/src/styles/churvox-front-desk-theme.css` — core `--cx-*` tokens, loaded last to override legacy `--px-*`
- `loginControlRoomTheme.css` updated to cream/lime
- 8 new `Cx` primitives in `/app/frontend/src/components/cx/`: CxButton, CxCard, CxBadge, CxModal, CxPageHeader, CxEmptyState, CxErrorState, CxLoading

### Pass 2 — Public marketing site (DONE — Feb 21 2026)
- Routes wired in `App.js`: `/` → HomePage, `/pricing` → PricingPage, `/features` → FeaturesPage
- `/` no longer force-redirects unauthed users to `/login`; auth-aware MarketingNav shows "Go to dashboard" for signed-in users
- Hero uses `MockFrontDesk.jsx` (no external stock photos, per user requirement)
- Pages: Home (hero + workflow + trades + features + approval-first + pricing + CTA), Pricing (4 tiers + add-ons), Features (deep-dive sections)
- Build passes; verified via screenshot tool on `/`, `/pricing`, `/features`

### Pass 3 — AI Operator Front Desk dashboard (DONE — Feb 21 2026)
- Owner Dashboard fully replaced. NO sidebar, full-width cream layout.
- 4-zone 2x2 grid (1-col mobile): Ready to approve, Needs fixing, Field & crew, Money desk
- Top bar: Churvox logo + AI OPERATOR FRONT DESK badge + last-scanned time + Run AI scan + account menu (Settings / Plan / Sign out)
- Hero strip: "Churvox prepares the admin. You approve." headline (with lime highlight) + next-best-move subline + 4 KPIs (Pending approvals, Active jobs, Open invoices $, Needs fixing)
- Each zone item is a clickable card → opens `WorkSlipModal` in-page (no navigation). Modal shows AI reasoning panel (lime soft block), type/risk badges, key facts, and footer actions: Close · Open full record (secondary, navigates) · Reject · Approve & complete (wired to `/api/ai-operator/actions/{id}/approve|reject`)
- "Open full record" is the only navigation — defaults to Work Slip popup per UX rule
- No new backend endpoint added; uses existing `/api/ai-operator/command-snapshot`, `/api/ai-operator/actions`, `/api/jobs`, `/api/invoices`, and approve/reject endpoints
- Quick-links nav row at bottom for Workspaces: Jobs, Dispatch, Clients, Quotes, Invoices, Team, Proof, Payroll, AI settings, Settings
- Files: `pages/FrontDeskPage.jsx`, `components/frontdesk/ZoneCard.jsx`, `components/frontdesk/WorkSlipModal.jsx`, `pages/DashboardPage.js` (rewired)
- Verified live: zones render real data, modal opens in-page, Reject dropped pending count 3→2 in real-time

### Pass 4 — App-wide audit (DONE — Feb 21 2026)
- **Legacy theme overlay** `frontend/src/styles/churvox-legacy-overlay.css` — single CSS file that re-skins inline Tailwind hex classes (`bg-[#0d1b34]`, `text-[#155EEF]`, `bg-[#f6faff]`, etc.) and named utilities (`bg-blue-*`, `bg-indigo-*`, `bg-violet-*`, `bg-sky-*`, `bg-slate-50/100`) to the locked cream/charcoal/lime palette without editing 15 priority pages. Loaded last in `index.js`.
- **Dead-button cleanup**: stripped 15× `onClick={() => {}}` stubs from `ReportsPage` and `AutomationPage` stat cards. Updated `PremiumStatCard.js` to render as `<div>` when no `onClick` is passed (so cards don't pretend to be interactive). Verified no remaining "Coming soon" / `() => {}` / noop handlers in Jobs / Clients / Quotes / Invoices / Team / Calendar / Proof pages.
- **Existing popup pattern preserved**: Job detail and Client detail already open as in-page modals (not full page navigation); no change needed.
- Verified live across `/jobs`, `/clients`, `/quotes`, `/invoices`, `/team`, `/dispatch`, `/proof-to-paid`, `/reports`. All show cream/lime theme, lime primary CTAs, lime active-nav highlight, no blue/navy/purple bleed.
- **Build**: `yarn build` clean. 272.61 kB gzipped JS (+0.15 kB), 30.43 kB CSS (+0.97 kB for the overlay).

### Pass 5 — Launch verification & critical fixes (DONE — Feb 21 2026)
- Full 24-item launch checklist executed live with Playwright. **23/24 PASS** (the 1 fail was a false positive in the test script — homepage contains "Churvox prepares the admin" in workflow step 03, which my exclusion check incorrectly filtered).
- **1 real launch-blocker fixed**: `pages/quotes/QuoteFormPage.js` line 99 referenced an undefined variable `isEdit` (the local is `isEditing`). Throwing `ReferenceError: isEdit is not defined` on every visit to `/quotes/new`. One-character fix.
- Verified end-to-end: public site (home/pricing/features), signup page, login, Front Desk 4-zone dashboard, Run AI scan, Work Slip modal with approve/reject wiring, Jobs list + create + in-page detail modal, Clients list + add (inline form) + in-page detail modal, Quotes list + create, Invoices list + create + open, Team page + Invite worker button, Payroll page, mobile-viewport tap on dashboard zone item opens modal correctly, 0 console errors.
- Build: 272.62 kB gzipped JS, 30.43 kB CSS. Clean.

## Backlog / Future Enhancements (P2)
- Strip remaining `cx-*` bridge classes from JSX in favor of direct premium components (reduce CSS bloat)
- Add light/dark theme toggle (currently light-only)
- Add skeleton loaders on all list pages instead of spinner
- Move legacy `/app/backend/` routes to `/app/backend/routes/` and models to `/app/backend/models/`
- Expand AI assistant with live LLM drafts (currently UI-ready, backend hook pending)

## Deployment
- Git: User owns the repo and must use Emergent's **"Save to GitHub"** button in the chat input to push. Render auto-deploy is wired to `main`.
- Protected env vars: `REACT_APP_BACKEND_URL` (frontend), `MONGO_URL` + `DB_NAME` (backend), Stripe test keys (pod env).
