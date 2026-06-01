import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

const navGroups = [
  {
    title: "Command",
    items: [
      ["Command Board", "/dashboard", "CB"],
      ["AI Operator", "/ai-operator", "AI"],
      ["Notifications", "/notifications", "NT"],
    ],
  },
  {
    title: "Work",
    items: [
      ["Jobs", "/jobs", "JB"],
      ["Dispatch", "/dispatch", "DP"],
      ["Clients", "/clients", "CL"],
      ["Quotes", "/quotes", "QT"],
      ["Invoices", "/invoices", "IV"],
      ["Money Desk", "/money-desk", "$"],
    ],
  },
  {
    title: "Crew & Admin",
    items: [
      ["Team", "/team", "TM"],
      ["Crew Ops", "/crew-ops", "CO"],
      ["Payroll", "/payroll", "PR"],
      ["Reports", "/reports", "RP"],
    ],
  },
  {
    title: "System",
    items: [
      ["Setup", "/onboarding", "SU"],
      ["Trade Presets", "/trade-presets", "TP"],
      ["Automation", "/automation", "AU"],
      ["Integrations", "/integrations", "IN"],
      ["Operator Tools", "/operator-tools", "OT"],
      ["Plans", "/plans", "PL"],
      ["Billing", "/billing-confidence", "BI"],
      ["Settings", "/settings", "ST"],
      ["Support", "/support", "?"],
    ],
  },
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/onboarding") return pathname === "/onboarding";
  if (href === "/plans") return pathname === "/plans";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="hidden w-[292px] shrink-0 overflow-y-auto border-r border-slate-800 bg-[#0f1722] p-4 text-white lg:block">
      <div className="mb-6 flex items-center gap-3 px-1">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
        <div>
          <div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Command Desk</div>
        </div>
      </div>

      <div className="space-y-5">
        {navGroups.map((group) => (
          <section key={group.title}>
            <div className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
            <nav className="space-y-1">
              {group.items.map(([label, href, icon]) => {
                const active = isActivePath(pathname, href);
                return (
                  <Link
                    key={href}
                    to={href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${
                      active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>
                      {icon}
                    </span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>
    </aside>
  );
}

function Badge({ tone = "blue", children }) {
  const cls =
    tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
    tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-800" :
    tone === "red" ? "border-red-200 bg-red-50 text-red-800" :
    "border-blue-200 bg-blue-50 text-blue-800";

  return <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${cls}`}>{children}</span>;
}

function WorkSlip({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[720px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                Command Work Slip
              </div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{item.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">
              Close
            </button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{item.summary}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">What needs attention</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">{item.detail}</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">
              Keep the user in context. Open the related page only when they choose the action button.
            </div>
          </section>

          <section className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Churvox rule</div>
            <p className="mt-2 text-sm font-bold leading-6 text-amber-950">
              Churvox prepares the admin. Owners approve important actions before anything sends, changes, charges, deletes, syncs or affects payroll.
            </p>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to={item.href || "/dashboard"} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
            Open place
          </Link>
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
            Back
          </button>
        </footer>
      </div>
    </div>
  );
}

function CommandPage({ config }) {
  const [active, setActive] = React.useState(null);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1 p-4 pb-28 md:p-6 md:pb-28 xl:p-8 xl:pb-28">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{config.kicker}</div>
              <div className="text-sm font-bold text-slate-500">{config.subhead}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              {config.headerActions?.map((a) => (
                <Link key={a.href} to={a.href} className={a.primary ? "rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400" : "rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50"}>
                  {a.label}
                </Link>
              ))}
            </div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">{config.kicker}</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">{config.title}</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">{config.description}</p>
                </div>
              </div>
            </div>

            <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">{config.healthTitle}</div>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">What needs attention</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {config.health.map((h) => (
                  <div key={h.label} className={`rounded-2xl border p-4 ${h.tone === "green" ? "border-emerald-200 bg-emerald-50" : h.tone === "amber" ? "border-amber-200 bg-amber-50" : h.tone === "red" ? "border-red-200 bg-red-50" : "border-blue-200 bg-blue-50"}`}>
                    <div className={`text-2xl font-black ${h.tone === "green" ? "text-emerald-800" : h.tone === "amber" ? "text-amber-800" : h.tone === "red" ? "text-red-800" : "text-blue-800"}`}>{h.value}</div>
                    <div className={`text-xs font-black uppercase tracking-[0.14em] ${h.tone === "green" ? "text-emerald-700" : h.tone === "amber" ? "text-amber-700" : h.tone === "red" ? "text-red-700" : "text-blue-700"}`}>{h.label}</div>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            {config.stats.map((s) => (
              <div key={s.label} className={`rounded-[22px] border p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] ${s.tone === "green" ? "border-emerald-200 bg-emerald-50" : s.tone === "amber" ? "border-amber-200 bg-amber-50" : s.tone === "blue" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                <div className={`text-[10px] font-black uppercase tracking-[0.16em] ${s.tone === "green" ? "text-emerald-700" : s.tone === "amber" ? "text-amber-700" : s.tone === "blue" ? "text-blue-700" : "text-slate-500"}`}>{s.label}</div>
                <div className={`mt-3 text-3xl font-black tracking-[-0.06em] ${s.tone === "green" ? "text-emerald-900" : s.tone === "amber" ? "text-amber-900" : s.tone === "blue" ? "text-blue-900" : "text-slate-950"}`}>{s.value}</div>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">{config.listKicker}</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">{config.listTitle}</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-600">Command style</span>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {config.cards.map((item) => (
                <article key={item.title} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item.type}</span>
                      <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item.title}</h3>
                    </div>
                    <Badge tone={item.tone}>{item.badge}</Badge>
                  </div>
                  <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{item.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setActive(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Open slip</button>
                    <Link to={item.href || "/dashboard"} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open place</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </div>

      <WorkSlip item={active} onClose={() => setActive(null)} />
    </main>
  );
}

function PortalPage({ config }) {
  if (typeof document === "undefined") return <CommandPage config={config} />;
  return createPortal(<CommandPage config={config} />, document.body);
}

const configs = {
  onboarding: {
    kicker: "Setup Command",
    subhead: "Finish the launch basics without confusion.",
    title: "Get Churvox ready for real work.",
    description: "Set the business, add the first client, create the first job, invite the team and prepare the first invoice.",
    healthTitle: "Setup health",
    health: [{ value: "5", label: "Core steps", tone: "blue" }, { value: "1st", label: "Client/job/invoice", tone: "amber" }, { value: "Owner", label: "Controlled", tone: "green" }],
    stats: [{ label: "Profile", value: "1", tone: "blue" }, { label: "Client", value: "1", tone: "amber" }, { label: "Job", value: "1", tone: "blue" }, { label: "Invoice", value: "1", tone: "green" }],
    listKicker: "Setup list",
    listTitle: "Launch steps",
    headerActions: [{ label: "Settings", href: "/settings" }, { label: "Add client", href: "/clients/new", primary: true }],
    cards: [
      { type: "Step 1", title: "Business profile", badge: "Core", tone: "blue", href: "/settings", summary: "Add business name, trade type, GST, address and invoice details.", detail: "This powers documents, messages, invoices and quote wording." },
      { type: "Step 2", title: "First client", badge: "Next", tone: "amber", href: "/clients/new", summary: "Create the first customer record and site details.", detail: "Client data should be clean before jobs, quotes and invoices rely on it." },
      { type: "Step 3", title: "First job", badge: "Work", tone: "blue", href: "/jobs/new", summary: "Create a real job and assign the correct worker.", detail: "Jobs drive dispatch, time, photos, invoices and owner notifications." },
      { type: "Step 4", title: "Invite team", badge: "Crew", tone: "green", href: "/team", summary: "Add workers, managers, office admins or payroll access.", detail: "Roles should stay locked down and clear." },
    ],
  },
  tradePresets: {
    kicker: "Trade Presets",
    subhead: "Choose the trade setup Churvox should prepare around.",
    title: "Make Churvox feel built for the business.",
    description: "Presets help default job types, customer messages, invoice wording and workflow language.",
    healthTitle: "Preset health",
    health: [{ value: "Trade", label: "Industry", tone: "blue" }, { value: "Jobs", label: "Defaults", tone: "amber" }, { value: "AI", label: "Better wording", tone: "green" }],
    stats: [{ label: "Industries", value: "8+", tone: "blue" }, { label: "Job types", value: "Custom", tone: "amber" }, { label: "Messages", value: "Prepared", tone: "green" }, { label: "Invoices", value: "Cleaner", tone: "blue" }],
    listKicker: "Preset list",
    listTitle: "Trade setup cards",
    headerActions: [{ label: "Settings", href: "/settings" }, { label: "Jobs", href: "/jobs", primary: true }],
    cards: [
      { type: "Preset", title: "Lawn care", badge: "Ready", tone: "green", href: "/settings", summary: "Recurring lawns, photos, customer reminders and simple invoices.", detail: "Good for mowing, maintenance, cleanup and scheduled property work." },
      { type: "Preset", title: "Cleaning", badge: "Ready", tone: "green", href: "/settings", summary: "Site notes, completion photos, recurring visits and customer confirmations.", detail: "Good for cleaners and property service teams." },
      { type: "Preset", title: "Handyman", badge: "Flexible", tone: "blue", href: "/settings", summary: "Mixed job types, quote-first workflow and simple invoice prep.", detail: "Good for varied work where every job can be different." },
      { type: "Preset", title: "Other trade", badge: "Custom", tone: "amber", href: "/settings", summary: "Keep the Command Desk style but use custom defaults.", detail: "Use this when the business does not fit one preset." },
    ],
  },
  operatorTools: {
    kicker: "Operator Tools",
    subhead: "Launch-grade tools for the owner command centre.",
    title: "Tools that make the app feel powerful but simple.",
    description: "Operator tools support approval queues, launch checks, demo mode, integration proof and owner confidence.",
    healthTitle: "Tool health",
    health: [{ value: "AI", label: "Approval-first", tone: "blue" }, { value: "Launch", label: "Checks", tone: "amber" }, { value: "Safe", label: "Guardrails", tone: "green" }],
    stats: [{ label: "Approval", value: "On", tone: "green" }, { label: "Demo", value: "Ready", tone: "blue" }, { label: "Launch", value: "Checklist", tone: "amber" }, { label: "Proof", value: "Clear", tone: "green" }],
    listKicker: "Tool list",
    listTitle: "Owner tools",
    headerActions: [{ label: "AI Operator", href: "/ai-operator" }, { label: "Launch Control", href: "/launch-control", primary: true }],
    cards: [
      { type: "AI", title: "Approval queue", badge: "Core", tone: "green", href: "/ai-operator", summary: "Review AI-prepared admin before approving actions.", detail: "Nothing risky should happen without explicit owner approval." },
      { type: "Launch", title: "Launch readiness", badge: "Check", tone: "amber", href: "/launch-control", summary: "Keep launch tasks and confidence checks visible.", detail: "Use this before pushing customers into the app." },
      { type: "Demo", title: "Demo mode", badge: "Sales", tone: "blue", href: "/demo-mode", summary: "Show the app clearly without messy real records.", detail: "Demo mode should help explain the product fast." },
      { type: "Trust", title: "Integration proof", badge: "Proof", tone: "green", href: "/integration-proof", summary: "Show how MYOB, CSV, email and staged SMS fit into the system.", detail: "Integrations stay visible and controlled." },
    ],
  },
  billing: {
    kicker: "Billing Command",
    subhead: "Plan confidence, billing safety and owner-only controls.",
    title: "Make billing clear before customers pay.",
    description: "Keep pricing, plan access, trial state, billing safety and owner-only controls easy to understand.",
    healthTitle: "Billing health",
    health: [{ value: "Owner", label: "Only", tone: "green" }, { value: "Plan", label: "Required", tone: "blue" }, { value: "Trial", label: "Clear", tone: "amber" }],
    stats: [{ label: "Plans", value: "4", tone: "blue" }, { label: "Owner only", value: "Yes", tone: "green" }, { label: "MYOB", value: "Add-on", tone: "amber" }, { label: "SMS", value: "Credits", tone: "blue" }],
    listKicker: "Billing list",
    listTitle: "Billing controls",
    headerActions: [{ label: "Plans", href: "/plans" }, { label: "Settings", href: "/settings", primary: true }],
    cards: [
      { type: "Plan", title: "Choose plan", badge: "Owner", tone: "green", href: "/plans", summary: "Start, Crew, Operator and Command plan controls.", detail: "Plan selection must stay clear and owner-only." },
      { type: "Trust", title: "Billing confidence", badge: "Clear", tone: "blue", href: "/billing-confidence", summary: "Explain billing state, plan access and trial confidence.", detail: "Customers should not feel lost about what is active." },
      { type: "Add-on", title: "MYOB add-on", badge: "Operator", tone: "amber", href: "/integrations", summary: "MYOB stays optional on Operator and included on Command.", detail: "Accounting sync must stay controlled and approved." },
      { type: "Credits", title: "SMS credits", badge: "Staged", tone: "amber", href: "/integrations", summary: "SMS credits stay separate and staged until stable.", detail: "SMS should not look active if the flow is not ready." },
    ],
  },
  crewOps: {
    kicker: "Crew Ops",
    subhead: "Worker activity, workload, photos, jobs and payroll signals.",
    title: "See what the crew needs next.",
    description: "Crew Ops keeps team workload, worker details and job activity easy for owners and managers to understand.",
    healthTitle: "Crew health",
    health: [{ value: "Jobs", label: "Assigned", tone: "blue" }, { value: "Photos", label: "Proof", tone: "green" }, { value: "Hours", label: "Review", tone: "amber" }],
    stats: [{ label: "Team", value: "Active", tone: "green" }, { label: "Jobs", value: "Open", tone: "blue" }, { label: "Photos", value: "Proof", tone: "green" }, { label: "Payroll", value: "Review", tone: "amber" }],
    listKicker: "Crew list",
    listTitle: "Crew operations",
    headerActions: [{ label: "Team", href: "/team" }, { label: "Dispatch", href: "/dispatch", primary: true }],
    cards: [
      { type: "Crew", title: "Team workload", badge: "View", tone: "blue", href: "/team", summary: "Open each worker and see role, workload and availability.", detail: "Worker details should open in-context where possible." },
      { type: "Dispatch", title: "Assign work", badge: "Action", tone: "amber", href: "/dispatch", summary: "Use region and workload to place jobs with the right worker.", detail: "Assignment decisions should be obvious before approval." },
      { type: "Proof", title: "Job photos", badge: "Proof", tone: "green", href: "/jobs", summary: "Worker-uploaded photos support proof, invoices and customer trust.", detail: "Photos should open inside the app instead of throwing users away." },
      { type: "Payroll", title: "Hours review", badge: "Review", tone: "amber", href: "/payroll", summary: "Review time and payroll summaries before handoff.", detail: "Payroll stays review/export only unless explicitly built further." },
    ],
  },
  launch: {
    kicker: "Launch Command",
    subhead: "Final checks before selling and onboarding customers.",
    title: "Make launch feel controlled, not chaotic.",
    description: "Launch Command keeps the release checklist, proof, demo and backup links in one easy place.",
    healthTitle: "Launch health",
    health: [{ value: "Core", label: "Flows", tone: "blue" }, { value: "Proof", label: "Ready", tone: "green" }, { value: "Polish", label: "Last", tone: "amber" }],
    stats: [{ label: "Login", value: "Check", tone: "blue" }, { label: "Jobs", value: "Check", tone: "green" }, { label: "Invoices", value: "Check", tone: "amber" }, { label: "Mobile", value: "Check", tone: "blue" }],
    listKicker: "Launch list",
    listTitle: "Release controls",
    headerActions: [{ label: "Demo mode", href: "/demo-mode" }, { label: "Polish checklist", href: "/polish-checklist", primary: true }],
    cards: [
      { type: "Launch", title: "Launch readiness", badge: "Check", tone: "amber", href: "/launch-control", summary: "Final flow checks before real users are invited.", detail: "Login, clients, jobs, quotes, invoices, team and mobile taps should be verified." },
      { type: "Demo", title: "Demo mode", badge: "Sales", tone: "blue", href: "/demo-mode", summary: "Show Churvox cleanly to interested businesses.", detail: "Demo should show the promise fast: Churvox prepares, owner approves." },
      { type: "Proof", title: "Integration proof", badge: "Trust", tone: "green", href: "/integration-proof", summary: "Explain MYOB, CSV, email, SMS and accounting direction.", detail: "This helps when talking to customers and partners." },
      { type: "Backup", title: "Backup recovery", badge: "Safe", tone: "green", href: "/backup-recovery", summary: "Keep recovery and confidence notes visible.", detail: "Launch feels better when the owner knows what to do if something goes wrong." },
    ],
  },
  worker: {
    kicker: "Worker Command",
    subhead: "Simple worker view for assigned jobs and field actions.",
    title: "Workers should know exactly what to do next.",
    description: "Worker pages stay simple: assigned jobs, start/completion actions, notes and photos without owner-only pricing or admin clutter.",
    healthTitle: "Worker health",
    health: [{ value: "Assigned", label: "Jobs", tone: "blue" }, { value: "Photos", label: "Upload", tone: "green" }, { value: "Simple", label: "No clutter", tone: "amber" }],
    stats: [{ label: "Job list", value: "Clear", tone: "blue" }, { label: "Photos", value: "Yes", tone: "green" }, { label: "Pricing", value: "Hidden", tone: "amber" }, { label: "GPS", value: "Owner", tone: "blue" }],
    listKicker: "Worker list",
    listTitle: "Worker actions",
    headerActions: [{ label: "My jobs", href: "/worker/jobs" }, { label: "Worker settings", href: "/worker/settings", primary: true }],
    cards: [
      { type: "Worker", title: "Assigned jobs", badge: "Core", tone: "blue", href: "/worker/jobs", summary: "Workers see only the work assigned to them.", detail: "Worker view should avoid owner billing, pricing, MYOB and plan controls." },
      { type: "Field", title: "Job detail", badge: "Action", tone: "amber", href: "/worker/jobs", summary: "Start, pause, complete, notes and photos should stay simple.", detail: "Field actions need to be mobile-first and tappable." },
      { type: "Proof", title: "Upload photos", badge: "Proof", tone: "green", href: "/worker/jobs", summary: "Photos support owner review and customer trust.", detail: "Owners/admins see evidence, workers do not need admin clutter." },
      { type: "Settings", title: "Worker settings", badge: "Simple", tone: "blue", href: "/worker/settings", summary: "Worker account basics only.", detail: "Keep worker settings small and clear." },
    ],
  },
};

export function OnboardingCommandPage() { return <PortalPage config={configs.onboarding} />; }
export function TradePresetsCommandPage() { return <PortalPage config={configs.tradePresets} />; }
export function OperatorToolsCommandPage() { return <PortalPage config={configs.operatorTools} />; }
export function BillingCommandPage() { return <PortalPage config={configs.billing} />; }
export function CrewOpsCommandPage() { return <PortalPage config={configs.crewOps} />; }
export function LaunchCommandPage() { return <PortalPage config={configs.launch} />; }
export function WorkerCommandPage() { return <PortalPage config={configs.worker} />; }
