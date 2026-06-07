import React from "react";
import { Link } from "react-router-dom";

const sections = [
  ["Business profile", "Business name, contact details, address, GST settings and launch basics.", "/settings", "Ready for polish"],
  ["Branding", "Logo, colours, customer-facing wording and invoice/quote presentation.", "/settings", "Keep consistent"],
  ["Xero accounting", "Xero is the visible accounting direction for launch. Sync remains approval-first and staged.", "/support", "Launch direction"],
  ["Plan and billing", "Start, Crew, Operator, Command and Growth Pack access.", "/plans", "Owner only"],
  ["Team access", "Roles, invites, worker access and payroll permissions.", "/team", "Role safe"],
  ["Legal and support", "Privacy, terms, account deletion, help and setup support.", "/support", "Live links"],
];

const checklist = [
  "Business profile completed",
  "Logo and customer-facing details checked",
  "First client created",
  "First job created",
  "First invoice or quote reviewed",
  "Worker invite tested",
  "Xero shown as accounting direction",
  "Old experimental pages hidden from launch",
];

function Tape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[30px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.3) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 20px ${color}66` }} />;
}

function DarkCard({ children, color = "#fb923c", className = "" }) {
  return (
    <article className={`relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#111827,#070d16)] p-5 pl-8 text-white shadow-[0_22px_62px_rgba(2,6,23,.24),inset_0_1px_0_rgba(255,255,255,.06)] ${className}`}>
      <Tape color={color} />
      {children}
    </article>
  );
}

export default function SettingsCommandPage() {
  return (
    <main className="min-h-screen bg-[#f7f3ea] p-4 pb-32 text-slate-950 md:p-6 md:pb-28 xl:pl-[320px]">
      <section className="mx-auto max-w-7xl space-y-5">
        <DarkCard className="p-6 pl-9 md:p-8 md:pl-10">
          <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-300">Settings</div>
          <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">Set the business up once. Keep it clean.</h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Settings is the launch control area for business details, branding, plan access, Xero direction, roles and support. No old integration clutter.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/plans" className="rounded-2xl bg-[linear-gradient(135deg,#facc15,#fb923c_55%,#22d3ee)] px-5 py-3 text-sm font-black text-slate-950 no-underline shadow-lg shadow-orange-500/20">View plans</Link>
            <Link to="/support" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Get support</Link>
            <Link to="/dashboard" className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white no-underline hover:bg-white/15">Command Board</Link>
          </div>
        </DarkCard>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]">
          <section className="grid gap-4 md:grid-cols-2">
            {sections.map(([title, copy, href, badge], index) => (
              <DarkCard key={title} color={["#fb923c", "#22d3ee", "#34d399", "#facc15", "#a78bfa", "#f43f5e"][index % 6]} className="min-h-[180px]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">{badge}</div>
                    <h2 className="mt-2 text-2xl font-black tracking-[-.05em] text-white">{title}</h2>
                  </div>
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{copy}</p>
                <Link to={href} className="mt-4 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 no-underline">Open</Link>
              </DarkCard>
            ))}
          </section>

          <aside className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">Launch checklist</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Before going live</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">These are the settings-level checks that stop the app feeling unfinished.</p>
            <div className="mt-5 grid gap-3">
              {checklist.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
                  <span className="text-sm font-black leading-6 text-slate-800">{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] md:p-6">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-700">Accounting direction</div>
          <h2 className="mt-2 text-3xl font-black tracking-[-.06em]">Xero visible. Approval-first sync.</h2>
          <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">For launch polish, Churvox should talk about Xero where accounting is visible. Accounting sync should stay approval-first: Churvox prepares the admin, the owner approves it.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/support" className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white no-underline">Ask about Xero setup</Link>
            <Link to="/invoices" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-950 no-underline">Review invoices</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
