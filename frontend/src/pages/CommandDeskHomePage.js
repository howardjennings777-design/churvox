import React from "react";
import { Link } from "react-router-dom";

const nav = [
  ["Command", "/dashboard"],
  ["Jobs", "/jobs"],
  ["Dispatch", "/dispatch"],
  ["Clients", "/clients"],
  ["Invoices", "/invoices"],
  ["Quotes", "/quotes"],
  ["Team", "/team"],
];

const stats = [
  { label: "Needs approval", value: "7", note: "Invoices, quotes and dispatch decisions", tone: "amber" },
  { label: "Jobs today", value: "18", note: "Scheduled, running or ready to review", tone: "blue" },
  { label: "Ready money", value: "$4.8k", note: "Work ready to invoice or chase", tone: "green" },
  { label: "Crew risks", value: "3", note: "Conflicts, gaps or overloaded workers", tone: "slate" },
];

const approvals = [
  ["Invoice ready", "Create invoice from completed job", "Job completed, photos uploaded, time checked and invoice wording prepared.", "/invoices/new"],
  ["Dispatch ready", "Assign best worker", "Churvox checked availability, area and workload before recommending a worker.", "/dispatch"],
  ["Quote follow-up", "Send customer nudge", "A quiet quote needs follow-up. Message is drafted, owner approves before it sends.", "/quotes"],
  ["Payment chase", "Overdue invoice reminder", "A firm but polite reminder is ready so cash does not sit forgotten.", "/money-desk"],
];

const jobs = [
  ["8:30", "Lawn service", "In progress"],
  ["10:00", "Rental cleanup", "Assigned"],
  ["1:30", "Quote visit", "Needs worker"],
  ["3:00", "Hedge trim", "Ready"],
];

function Stat({ item }) {
  const colour = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    green: "bg-emerald-50 text-emerald-800 border-emerald-200",
    slate: "bg-slate-100 text-slate-800 border-slate-200",
  }[item.tone];

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
      <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${colour}`}>{item.label}</span>
      <strong className="mt-5 block text-4xl font-black tracking-[-0.06em] text-slate-950">{item.value}</strong>
      <p className="mt-2 text-sm font-bold leading-5 text-slate-500">{item.note}</p>
    </article>
  );
}

function Approval({ item }) {
  return (
    <article className="group rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.11)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">{item[0]}</span>
          <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950">{item[1]}</h3>
        </div>
        <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">AI</span>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item[2]}</p>
      <div className="mt-5 flex gap-3">
        <Link className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50" to={item[3]}>Details</Link>
        <Link className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700" to={item[3]}>Approve</Link>
      </div>
    </article>
  );
}

export default function CommandDeskHomePage() {
  return (
    <main className="fixed inset-0 z-[1000] overflow-y-auto bg-[#eef1f4] text-slate-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-[255px] shrink-0 border-r border-slate-800 bg-[#101722] p-5 text-white lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-500 text-lg font-black text-slate-950">C</div>
            <div>
              <div className="text-sm font-black tracking-[-0.03em]">CHURVOX</div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Iron Command</div>
            </div>
          </div>

          <nav className="mt-9 space-y-2">
            {nav.map(([label, href]) => (
              <Link key={href} to={href} className={`block rounded-2xl px-4 py-3 text-sm font-black ${href === "/dashboard" ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">AI Operator</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Daily admin gets prepared here. Owner approves before anything serious happens.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 md:p-7 xl:p-10">
          <header className="mb-7 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-950 text-sm font-black text-white">C</div>
              <div>
                <div className="text-sm font-black">CHURVOX</div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Iron Command</div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Smart Hub</div>
              <div className="text-sm font-bold text-slate-500">What needs attention, what Churvox prepared, what to approve next.</div>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">AI Operator Live</div>
          </header>

          <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
            <div className="overflow-hidden rounded-[34px] border border-slate-900 bg-slate-950 shadow-[0_30px_90px_rgba(15,23,42,0.22)]">
              <div className="relative p-7 md:p-10">
                <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
                <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">Built for trade owners</span>
                  <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.08em] text-white md:text-7xl">
                    Churvox does the admin. You approve.
                  </h1>
                  <p className="mt-6 max-w-2xl text-base font-semibold leading-7 text-slate-300 md:text-lg">
                    A premium AI command desk for jobs, quotes, invoices, crew decisions and cash follow-up. Strong, clear, practical — no clutter.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link to="/ai-operator" className="rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-amber-500/20 hover:bg-amber-400">Review owner actions</Link>
                    <Link to="/jobs" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Open work list</Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Operator queue</div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">Ready for approval</h2>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">4 ready</span>
              </div>
              <div className="mt-6 space-y-3">
                {["Invoice prepared from completed job", "Worker match ready for open job", "Quote follow-up drafted", "Overdue invoice reminder prepared"].map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-black text-slate-950">{item}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">Review details, then approve.</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 md:grid-cols-4">
            {stats.map((item) => <Stat key={item.label} item={item} />)}
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:p-6">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600">Owner decisions</div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">AI-prepared actions</h2>
                </div>
                <Link to="/ai-operator" className="hidden rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800 sm:inline-flex">View all</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {approvals.map((item) => <Approval key={item[1]} item={item} />)}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] md:p-6">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Today’s run sheet</div>
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

              <div className="rounded-[30px] border border-slate-900 bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">Ask Churvox</div>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Command box</h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">Ask what needs approving, what is late, what is ready to invoice, or who should take the next job.</p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-slate-200">“Show me what needs approving today”</div>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
