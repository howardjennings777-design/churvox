import React from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";

const navGroups = [
  {
    title: "Command",
    items: [
      ["Command Board", "/dashboard", "CB"],
      ["AI Operator", "/ai-operator", "AI"],
      ["Approvals", "/ai-operator/approvals", "OK"],
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

const stats = [
  ["Needs approval", "7", "Invoices, quotes and dispatch decisions", "amber"],
  ["Jobs today", "18", "Scheduled, running or ready to review", "blue"],
  ["Ready money", "$4.8k", "Work ready to invoice or chase", "green"],
  ["Crew risks", "3", "Conflicts, gaps or overloaded workers", "slate"],
];

const approvals = [
  {
    badge: "Invoice ready",
    title: "Create invoice from completed job",
    summary: "Job completed, photos uploaded, time checked and invoice wording prepared.",
    href: "/invoices/new",
    evidence: ["Worker marked the job complete", "Photos and notes are attached", "Invoice description is drafted", "Owner approval required before sending"],
    primary: "Approve draft invoice",
  },
  {
    badge: "Dispatch ready",
    title: "Assign best worker",
    summary: "Churvox checked availability, area and workload before recommending a worker.",
    href: "/dispatch",
    evidence: ["Worker is available", "No obvious schedule conflict", "Area match looks good", "Assignment waits for owner approval"],
    primary: "Approve assignment",
  },
  {
    badge: "Quote follow-up",
    title: "Send customer nudge",
    summary: "A quiet quote needs follow-up. Message is drafted; owner approves before it sends.",
    href: "/quotes",
    evidence: ["Quote has not been answered", "Follow-up message is prepared", "Tone is polite and direct", "No message sends without approval"],
    primary: "Approve follow-up",
  },
  {
    badge: "Payment chase",
    title: "Overdue invoice reminder",
    summary: "A firm but polite reminder is ready so cash does not sit forgotten.",
    href: "/money-desk",
    evidence: ["Invoice is overdue", "Reminder is prepared", "Customer wording can be edited", "Owner approval required before sending"],
    primary: "Approve reminder",
  },
];

const jobs = [
  ["8:30", "Lawn service", "In progress"],
  ["10:00", "Rental cleanup", "Assigned"],
  ["1:30", "Quote visit", "Needs worker"],
  ["3:00", "Hedge trim", "Ready"],
];

function isActivePath(pathname, href) {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/overview";
  if (href === "/money-desk") return pathname === "/money-desk" || pathname === "/money";
  if (href === "/dispatch") return pathname === "/dispatch" || pathname === "/dispatch-board";
  if (href === "/invoices") return pathname === "/invoices" || pathname.startsWith("/invoices/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Stat({ item }) {
  const colour = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    slate: "bg-slate-100 text-slate-800 border-slate-200",
  }[item[3]];

  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${colour}`}>{item[0]}</span>
      <strong className="mt-4 block text-3xl font-black tracking-[-0.06em] text-slate-950">{item[1]}</strong>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">{item[2]}</p>
    </article>
  );
}

function Approval({ item, onOpen }) {
  return (
    <article className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">{item.badge}</span>
          <h3 className="mt-1 text-lg font-black tracking-[-0.04em] text-slate-950">{item.title}</h3>
        </div>
        <span className="rounded-full bg-slate-950 px-2.5 py-1 text-[10px] font-black text-white">AI</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.summary}</p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => onOpen(item)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">Details</button>
        <button type="button" onClick={() => onOpen(item)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">Open slip</button>
      </div>
    </article>
  );
}

function WorkSlip({ active, onClose }) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[2147483647] bg-slate-950/65 p-3 backdrop-blur-sm md:p-7" role="dialog" aria-modal="true">
      <div className="ml-auto flex h-full max-w-[680px] flex-col overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_35px_120px_rgba(15,23,42,0.40)]">
        <header className="relative overflow-hidden border-b border-slate-800 bg-slate-950 p-6 text-white md:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Churvox Work Slip</div>
              <h2 className="mt-4 text-3xl font-black leading-[0.95] tracking-[-0.07em] md:text-5xl">{active.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15">Close</button>
          </div>
          <p className="relative mt-5 max-w-xl text-sm font-semibold leading-6 text-slate-300">{active.summary}</p>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#f4f6f8] p-5 md:p-6">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prepared by Churvox</div>
            <p className="mt-3 text-lg font-black tracking-[-0.035em] text-slate-950">The admin is prepared. The owner still makes the call.</p>
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-950">Review the prepared action, check the evidence, then approve when it looks right.</div>
          </section>

          <section className="mt-4 rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Evidence checked</div>
            <div className="mt-4 space-y-3">
              {active.evidence.map((row) => (
                <div key={row} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
                  {row}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-4 rounded-[26px] border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">Owner decision</div>
            <p className="mt-2 text-sm font-bold leading-6 text-amber-950">Approve from here, open the record to edit, or close the slip and leave it waiting.</p>
          </section>
        </main>

        <footer className="flex flex-wrap gap-3 border-t border-slate-200 bg-white p-5">
          <Link to={active.href} className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">Open record</Link>
          <button type="button" onClick={onClose} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">{active.primary}</button>
        </footer>
      </div>
    </div>
  );
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
                  <Link key={href} to={href} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-black ${active ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-[10px] font-black ${active ? "bg-slate-950 text-white" : "bg-white/10 text-cyan-200"}`}>{icon}</span>
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">AI Operator</div>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Smart Hub is the board. Work Slips are where decisions happen.</p>
      </div>
    </aside>
  );
}

function CommandDeskContent() {
  const [activeSlip, setActiveSlip] = React.useState(null);

  return (
    <main className="fixed inset-0 z-[2147483000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1 p-4 md:p-6 xl:p-8">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Smart Hub</div>
              <div className="text-sm font-bold text-slate-500">What needs attention, what Churvox prepared, what to approve next.</div>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">AI Operator Live</div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1fr_430px]">
            <div className="overflow-hidden rounded-[30px] border border-slate-900 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.20)]">
              <div className="relative p-6 md:p-8">
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Built for trade owners</span>
                  <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Churvox does the admin. You approve.</h1>
                  <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-300 md:text-base">A premium AI command board for jobs, quotes, invoices, crew decisions and cash follow-up. The detailed decision opens as a Work Slip.</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setActiveSlip(approvals[0])} className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/20 hover:bg-amber-400">Open next Work Slip</button>
                    <Link to="/jobs" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Open work list</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Operator queue</div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.055em] text-slate-950">Ready for Work Slip review</h2>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">4 ready</span>
              </div>
              <div className="mt-5 space-y-3">
                {approvals.map((item) => (
                  <button key={item.title} type="button" onClick={() => setActiveSlip(item)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-blue-200 hover:bg-blue-50">
                    <div className="text-sm font-black text-slate-950">{item.badge}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">Open slip, review, approve.</div>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            {stats.map((item) => <Stat key={item[0]} item={item} />)}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.22fr_0.78fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Owner decisions</div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">AI-prepared actions</h2>
                </div>
                <span className="hidden rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600 sm:inline-flex">Slip based</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {approvals.map((item) => <Approval key={item.title} item={item} onOpen={setActiveSlip} />)}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.055)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Today’s run sheet</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Work in motion</h2>
                <div className="mt-5 space-y-3">
                  {jobs.map(([time, name, state]) => (
                    <div key={`${time}-${name}`} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="text-sm font-black text-slate-950">{name}</div>
                        <div className="mt-1 text-xs font-bold text-slate-500">{time}</div>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">{state}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Ask Churvox</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Command box</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Ask what needs approving, what is late, what is ready to invoice, or who should take the next job.</p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-slate-200">“Show me what needs approving today”</div>
              </div>
            </div>
          </section>
        </section>
      </div>

      <WorkSlip active={activeSlip} onClose={() => setActiveSlip(null)} />
    </main>
  );
}

export default function CommandDeskSlipHomePage() {
  if (typeof document === "undefined") return <CommandDeskContent />;
  return createPortal(<CommandDeskContent />, document.body);
}
