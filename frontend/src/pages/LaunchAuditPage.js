import React from "react";
import { Activity, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";

const checks = [
  "Owner login and dashboard access",
  "Worker login, jobs, notes and photos",
  "Clients, jobs, quotes and invoices",
  "Payroll workflow",
  "Automation rules and test runs",
  "Reports and live business health",
  "Notifications and timestamps",
  "Mobile/PWA layout",
];

export default function LaunchAuditPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-cyan-200/15 bg-[radial-gradient(circle_at_85%_0%,rgba(34,211,238,0.20),transparent_22rem),linear-gradient(135deg,#020617,#0f172a_55%,#172554)] p-6 shadow-2xl shadow-black/30 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Churvox owner command</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Launch Audit</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">
            Owner-only checklist for confirming the app is ready across owner, worker, payroll, automation and reporting flows.
          </p>
        </section>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {checks.map((check) => (
            <div key={check} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-xl shadow-black/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <p className="font-black text-white">{check}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <a href="/admin" className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 font-black text-white hover:bg-white/[0.10]">
            <ShieldCheck className="mb-3 h-6 w-6 text-cyan-300" /> Owner dashboard
          </a>
          <a href="/reports" className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 font-black text-white hover:bg-white/[0.10]">
            <Activity className="mb-3 h-6 w-6 text-cyan-300" /> Reports
          </a>
          <a href="/automation" className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 font-black text-white hover:bg-white/[0.10]">
            <ExternalLink className="mb-3 h-6 w-6 text-cyan-300" /> Automation
          </a>
        </div>
      </div>
    </div>
  );
}
