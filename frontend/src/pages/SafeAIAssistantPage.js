import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileText,
  HandCoins,
  Rocket,
  Settings,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Layout from "../components/Layout";

const quickActions = [
  { label: "New job", to: "/jobs/new", kind: "primary" },
  { label: "Open jobs", to: "/jobs", kind: "light" },
  { label: "New client", to: "/clients/new", kind: "light" },
  { label: "New quote", to: "/quotes/new", kind: "light" },
  { label: "New invoice", to: "/invoices/new", kind: "light" },
];

const snapshots = [
  {
    title: "Today’s command centre",
    body: "Run daily operations confidently with launch-ready navigation and clear actions.",
  },
  {
    title: "Core workflows",
    body: "Jobs, clients, quotes, invoices, team and schedule are available in one flow.",
  },
  {
    title: "Approval-first automation",
    body: "Draft and review actions before anything customer-facing is sent or changed.",
  },
  {
    title: "Launch testing ready",
    body: "Designed for full-route and mobile-tap testing without risky live dashboard calls.",
  },
];

const cards = [
  { title: "Jobs", to: "/jobs", icon: BriefcaseBusiness, text: "Create, assign, open, and complete work." },
  { title: "Schedule", to: "/schedule", icon: CalendarDays, text: "Plan today’s bookings and field work." },
  { title: "Clients", to: "/clients", icon: Users, text: "Manage customers, addresses, and notes." },
  { title: "Quotes", to: "/quotes", icon: FileText, text: "Create quotes and follow up open work." },
  { title: "Invoices", to: "/invoices", icon: HandCoins, text: "Review invoices and cashflow tasks." },
  { title: "Follow-ups", to: "/follow-ups", icon: CheckCircle2, text: "Track reminders and customer actions." },
  { title: "Automation", to: "/automation", icon: Zap, text: "Open rules and automation reviews." },
  { title: "Team", to: "/team", icon: Users, text: "Manage workers, roles, and access." },
  { title: "Settings", to: "/settings", icon: Settings, text: "Business setup and account controls." },
  { title: "Launch Check", to: "/launch-check", icon: Rocket, text: "Run the launch readiness checklist." },
];

const checklist = [
  { label: "Create job", to: "/jobs/new" },
  { label: "Add/open client", to: "/clients" },
  { label: "Create quote", to: "/quotes/new" },
  { label: "Create invoice", to: "/invoices/new" },
  { label: "Invite/check team", to: "/team" },
  { label: "Test mobile taps", to: "/launch-check" },
];

function Card({ card }) {
  const Icon = card.icon;
  return (
    <Link
      to={card.to}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-700" />
      </div>
      <h2 className="mt-4 text-lg font-black text-slate-950">{card.title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{card.text}</p>
    </Link>
  );
}

export default function SafeAIAssistantPage() {
  return (
    <Layout>
      <div className="cx-page space-y-6 pb-20 md:pb-8">
        <section className="rounded-[2rem] border border-slate-900/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 shadow-2xl md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Churvox command centre</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Smart Hub</h1>
          <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-100 md:text-base">
            Run the day from one place: jobs, clients, quotes, invoices, team, schedule, follow-ups, and automation.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {quickActions.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={item.kind === "primary"
                  ? "rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg hover:bg-blue-700"
                  : "rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-900 hover:bg-blue-50"
                }
              >
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshots.map((item) => (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-black uppercase tracking-wide text-slate-950">{item.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{item.body}</p>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-3">
            <h2 className="text-2xl font-black text-slate-950">Command shortcuts</h2>
            <p className="mt-1 text-sm font-semibold text-slate-700">Fast access to launch-critical work areas.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((card) => <Card key={card.to} card={card} />)}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Today’s operating checklist</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {checklist.map((item) => (
                <Link key={item.label} to={item.to} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:border-blue-300 hover:text-blue-700">
                  {item.label}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
              <div>
                <h2 className="text-xl font-black text-slate-950">Approval-first automation</h2>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                  <li>• Draft reminders only.</li>
                  <li>• No auto-send without approval.</li>
                  <li>• Payroll and accounting changes stay manual and approved.</li>
                  <li>• Review automation rules in <Link to="/automation" className="text-blue-700">Automation</Link>.</li>
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-white p-3 text-blue-700"><Bot className="h-5 w-5" /></span>
            <div>
              <h2 className="text-xl font-black text-slate-950">AI Assistant coming back safely</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">
                Planned rollout includes job summary, invoice follow-up drafting, quote follow-up suggestions, and automation suggestions.
              </p>
            </div>
          </div>
        </section>

        <p className="text-xs font-semibold text-slate-600">
          Approval-first: Churvox does not auto-send customer messages or change payroll/accounting data without confirmation.
        </p>
      </div>
    </Layout>
  );
}
