import React from "react";
import { Link } from "react-router-dom";

const stats = [
  { label: "Needs approval", value: "7", note: "AI-prepared actions waiting", tone: "orange" },
  { label: "Today’s work", value: "18", note: "Jobs running or scheduled", tone: "blue" },
  { label: "Money desk", value: "$4.8k", note: "Ready to invoice or chase", tone: "green" },
  { label: "Crew load", value: "3", note: "Conflicts or overloaded crew", tone: "slate" },
];

const actions = [
  {
    tag: "Invoice",
    title: "Create invoice from completed job",
    copy: "Job completed, photos uploaded, time checked and a clean invoice description prepared for owner approval.",
    href: "/invoices/new",
  },
  {
    tag: "Dispatch",
    title: "Assign best worker to open job",
    copy: "Churvox checked availability, area and workload, then prepared a recommended crew assignment.",
    href: "/dispatch",
  },
  {
    tag: "Quote",
    title: "Send quote follow-up",
    copy: "A quote has gone quiet. The AI drafted a simple customer follow-up for you to approve first.",
    href: "/quotes",
  },
  {
    tag: "Money",
    title: "Chase overdue invoice",
    copy: "Payment is overdue. Churvox prepared a firm but polite reminder so you stay in control.",
    href: "/money-desk",
  },
];

const runSheet = [
  "8:30 · Lawn service · In progress",
  "10:00 · Rental cleanup · Assigned",
  "1:30 · Quote visit · Needs worker",
  "3:00 · Hedge trim · Ready",
];

function toneClasses(tone) {
  if (tone === "orange") return "border-orange-200 bg-orange-50 text-orange-700";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-blue-700";
  if (tone === "green") return "border-green-200 bg-green-50 text-green-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function StatCard({ item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${toneClasses(item.tone)}`}>
        {item.label}
      </div>
      <div className="text-3xl font-black tracking-[-0.04em] text-slate-950">{item.value}</div>
      <div className="mt-2 text-sm font-semibold text-slate-500">{item.note}</div>
    </div>
  );
}

function OperatorAction({ action }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">{action.tag}</div>
          <h3 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">{action.title}</h3>
        </div>
        <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">AI ready</div>
      </div>
      <p className="text-sm font-semibold leading-6 text-slate-600">{action.copy}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to={action.href} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-50">
          View details
        </Link>
        <Link to={action.href} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
          Approve
        </Link>
      </div>
    </div>
  );
}

export default function CommandDeskHomePage() {
  return (
    <main className="min-h-screen bg-[#f3f5f7] p-4 text-slate-950 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl">
          <div className="grid gap-8 p-6 md:grid-cols-[1.08fr_0.92fr] md:p-10">
            <div>
              <div className="mb-5 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-orange-300">
                Churvox Iron Command
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-[-0.07em] text-white md:text-6xl">
                Churvox does the admin. You approve.
              </h1>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-300 md:text-lg">
                A strong, practical command desk for trade businesses. AI prepares invoices, jobs, quotes and crew decisions, then the owner stays in control.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/ai-operator" className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-xl shadow-orange-500/20 hover:bg-orange-600">
                  Review AI actions
                </Link>
                <Link to="/dispatch" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                  Open today’s run sheet
                </Link>
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/10 bg-white/10 p-4 backdrop-blur">
              <div className="rounded-[1.35rem] bg-white p-5 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">AI Operator Queue</div>
                    <div className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">Ready for owner approval</div>
                  </div>
                  <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">Live</div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <div className="text-sm font-black text-slate-950">Invoice prepared</div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">Completed job, photos uploaded, time checked.</div>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="text-sm font-black text-slate-950">Worker match found</div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">Best fit based on availability and area.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm font-black text-slate-950">Quote follow-up drafted</div>
                    <div className="mt-1 text-xs font-semibold leading-5 text-slate-600">Ready to send after approval.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {stats.map((item) => <StatCard key={item.label} item={item} />)}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">What needs attention</div>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">AI Operator Actions</h2>
              </div>
              <Link to="/ai-operator" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
                View all actions
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {actions.map((action) => <OperatorAction key={action.title} action={action} />)}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Today’s run sheet</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">Work in motion</h2>
              <div className="mt-5 space-y-3">
                {runSheet.map((item) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-xl md:p-6">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-300">Ask Churvox</div>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-white">Command box</h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                Ask for invoices, overdue work, job issues, crew conflicts or today’s priority list.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm font-bold text-slate-200">
                “Show me what needs approving today”
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
