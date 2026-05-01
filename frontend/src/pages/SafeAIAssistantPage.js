import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  HandCoins,
  RefreshCw,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Layout from "../components/Layout";

const cards = [
  { title: "Jobs", to: "/jobs", icon: BriefcaseBusiness, text: "Create, assign, open, and complete work." },
  { title: "Schedule", to: "/schedule", icon: CalendarDays, text: "Plan today’s bookings and field work." },
  { title: "Clients", to: "/clients", icon: Users, text: "Manage customers, addresses, and notes." },
  { title: "Quotes", to: "/quotes", icon: FileText, text: "Create quotes and follow up open work." },
  { title: "Invoices", to: "/invoices", icon: HandCoins, text: "Review invoices and cashflow tasks." },
  { title: "Follow-ups", to: "/follow-ups", icon: BellRing, text: "Track reminders and customer actions." },
  { title: "Automation", to: "/automation", icon: Zap, text: "Open rules and automation runs safely." },
  { title: "Team", to: "/team", icon: Users, text: "Manage workers, roles, and access." },
  { title: "Settings", to: "/settings", icon: Settings, text: "Business setup and account controls." },
  { title: "Launch Check", to: "/launch-check", icon: Rocket, text: "Run the launch readiness checklist." },
];

function Card({ card }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700 group-hover:bg-blue-600 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
      </div>
      <h2 className="mt-4 text-lg font-black text-slate-950 group-hover:text-blue-700">{card.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{card.text}</p>
    </Link>
  );
}

export default function SafeAIAssistantPage() {
  return (
    <Layout>
      <div className="cx-page space-y-5 pb-20 md:pb-8">
        <section className="rounded-[2rem] border border-slate-900/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-2xl md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Churvox command centre</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Smart Hub</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-200 md:text-base">
                A clean launch command centre for jobs, clients, quotes, invoices, team, schedule, follow-ups, and settings.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/jobs/new" className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg hover:bg-blue-700">New job</Link>
                <Link to="/jobs" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-blue-50">Open jobs</Link>
                <Link to="/invoices/new" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-blue-50">Create invoice</Link>
                <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white hover:bg-white/15">
                  <RefreshCw className="mr-2 h-4 w-4" />Refresh
                </button>
              </div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-xl backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Today’s mode</p>
              <h2 className="mt-2 text-2xl font-black text-white">Stable launch testing</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">
                Live widgets are paused so this page opens every time while the core app is tested.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Launch focus</p>
            <p className="mt-2 text-3xl font-black text-slate-950">Core</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Jobs, clients, quotes, invoices, and team.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Safe mode</p>
            <p className="mt-2 text-3xl font-black text-slate-950">On</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">No risky background loading on Smart Hub.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Default landing</p>
            <p className="mt-2 text-3xl font-black text-slate-950">Jobs</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Login stays stable while Smart Hub is rebuilt.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Live widgets</p>
            <p className="mt-2 text-3xl font-black text-slate-950">Paused</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">Rebuild one section at a time.</p>
          </div>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-2xl font-black text-slate-950">Command shortcuts</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Fast access to the real launch-critical areas.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => <Card key={card.to} card={card} />)}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-xl font-black text-slate-950">Safe operating rules</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                  This Smart Hub is stable on purpose. It gives you a polished command centre without the risky live dashboard code.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {["No customer messages auto-send", "No invoices auto-change", "No payroll actions run", "No accounting sync actions run"].map((item) => (
                    <div key={item} className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                      <CheckCircle2 className="h-4 w-4 text-emerald-700" />{item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-white p-3 text-blue-700"><Bot className="h-5 w-5" /></span>
              <div>
                <h2 className="text-lg font-black text-blue-950">AI assistant rebuild plan</h2>
                <p className="mt-2 text-sm font-bold leading-6 text-blue-900">
                  Bring the AI widgets back after core testing: job summary first, then invoices, quote follow-ups, and automation suggestions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
