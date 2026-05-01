import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  HandCoins,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Layout from "../components/Layout";

const assistantPrompts = [
  {
    id: "attention",
    label: "What needs attention today?",
    response:
      "Start with open jobs, unpaid invoices, open quotes, and team availability. Open Jobs first, then check Invoices and Quotes before applying any workflow changes.",
  },
  {
    id: "invoice-follow-up",
    label: "Draft invoice follow-up",
    response:
      "Draft only: Hi, just a friendly reminder this invoice is still awaiting payment. Please let us know if you want payment details resent or a copy attached.",
  },
  {
    id: "jobs-summary",
    label: "Summarise today’s jobs",
    response:
      "Use Jobs and Schedule to confirm each job has a client, address, assigned worker, and clear status. Prioritise overdue and unassigned jobs first.",
  },
  {
    id: "automations",
    label: "Suggest automations",
    response:
      "Recommended launch automations: completed job creates a draft invoice, quote follow-up draft after 3 days, unpaid invoice reminder draft, and worker status alerts.",
  },
  {
    id: "action-jobs",
    label: "Find jobs needing action",
    response:
      "Open Jobs and filter for unassigned, overdue, in progress, or missing client/address details. Resolve these first to keep the day moving smoothly.",
  },
];

const quickActions = [
  ["New job", "/jobs/new", "primary"],
  ["Open jobs", "/jobs", "light"],
  ["New client", "/clients/new", "light"],
  ["New quote", "/quotes/new", "light"],
  ["New invoice", "/invoices/new", "light"],
];

const snapshotCards = [
  {
    icon: ClipboardCheck,
    title: "Today’s Command Centre",
    body: "Prioritise daily operations with fast access to jobs, team capacity, client communication, and financial follow-through.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Core Workflows",
    body: "Move smoothly from job planning to quoting and invoicing with reliable handoffs between office and field.",
  },
  {
    icon: ShieldCheck,
    title: "Approval-First Automation",
    body: "Keep critical messages and workflow changes in draft state until an approved team member confirms them.",
  },
  {
    icon: Rocket,
    title: "Launch Testing Ready",
    body: "Use launch checks and mobile tap testing to verify every key route is clear, responsive, and ready for the team.",
  },
];

const shortcuts = [
  { icon: BriefcaseBusiness, title: "Jobs", description: "Plan, assign, and complete work.", href: "/jobs" },
  { icon: CalendarDays, title: "Schedule", description: "View and organise the day.", href: "/schedule" },
  { icon: Users, title: "Clients", description: "Manage people and businesses.", href: "/clients" },
  { icon: FileText, title: "Quotes", description: "Draft and track approvals.", href: "/quotes" },
  { icon: HandCoins, title: "Invoices", description: "Issue and monitor payments.", href: "/invoices" },
  { icon: BellRing, title: "Follow-ups", description: "Keep customer actions moving.", href: "/follow-ups" },
  { icon: Zap, title: "Automation", description: "Review and tune rule flows.", href: "/automation" },
  { icon: Users, title: "Team", description: "Access team and roles.", href: "/team" },
  { icon: Settings, title: "Settings", description: "Manage account preferences.", href: "/settings" },
  { icon: CheckCircle2, title: "Launch Check", description: "Test key experiences quickly.", href: "/launch-check" },
];

const checklist = [
  ["Create job", "/jobs/new"],
  ["Add/open client", "/clients"],
  ["Create quote", "/quotes/new"],
  ["Create invoice", "/invoices/new"],
  ["Invite/check team", "/team"],
  ["Test mobile taps", "/launch-check"],
];

function SmartButton({ label, href, kind }) {
  return (
    <Link
      to={href}
      className={
        kind === "primary"
          ? "inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-700"
          : "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-blue-50"
      }
    >
      {label}
    </Link>
  );
}

function ShortcutCard({ item }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className="sh-card group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/70"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="sh-icon inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:text-blue-700" />
      </div>
      <h3 className="sh-title mt-4 text-lg font-black text-slate-950">{item.title}</h3>
      <p className="sh-body mt-2 text-sm font-semibold leading-6 text-slate-700">{item.description}</p>
      <p className="sh-cta mt-4 text-xs font-black uppercase tracking-wide text-blue-700">Open {item.title}</p>
    </Link>
  );
}

function SnapshotCard({ card }) {
  const Icon = card.icon;
  return (
    <article className="sh-card sh-snapshot-card rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/40">
      <span className="sh-icon inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="sh-title mt-4 text-base font-black text-slate-950">{card.title}</h3>
      <p className="sh-body mt-2 text-sm font-bold leading-6 text-slate-800">{card.body}</p>
    </article>
  );
}

export default function SmartHubPage() {
  const [activePromptId, setActivePromptId] = React.useState(assistantPrompts[0].id);
  const [copied, setCopied] = React.useState(false);
  const activePrompt = assistantPrompts.find((prompt) => prompt.id === activePromptId) || assistantPrompts[0];

  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt.response);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (_error) {
      setCopied(false);
    }
  };

  return (
    <Layout>
      <div className="cx-page smart-hub-v3 space-y-6 pb-20 md:pb-8">
        <style>{`
          .smart-hub-v3 .sh-card,
          .smart-hub-v3 .sh-card * {
            opacity: 1 !important;
            filter: none !important;
            text-shadow: none !important;
          }
          .smart-hub-v3 .sh-card {
            background-color: #ffffff !important;
          }
          .smart-hub-v3 .sh-title,
          .smart-hub-v3 .sh-snapshot-card .sh-title,
          .smart-hub-v3 .sh-card h2,
          .smart-hub-v3 .sh-card h3 {
            color: #020617 !important;
            font-weight: 900 !important;
          }
          .smart-hub-v3 .sh-body,
          .smart-hub-v3 .sh-snapshot-card .sh-body,
          .smart-hub-v3 .sh-card p:not(.sh-cta) {
            color: #1f2937 !important;
            font-weight: 800 !important;
          }
          .smart-hub-v3 .sh-cta,
          .smart-hub-v3 .sh-card .sh-cta {
            color: #1d4ed8 !important;
            font-weight: 900 !important;
          }
          .smart-hub-v3 .sh-icon,
          .smart-hub-v3 .sh-icon svg {
            color: #1d4ed8 !important;
            opacity: 1 !important;
          }
          .smart-hub-v3 a,
          .smart-hub-v3 button {
            text-decoration: none !important;
          }
        `}</style>

        <section className="overflow-hidden rounded-[2rem] border border-slate-900/10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-2xl shadow-slate-900/20 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.75fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">CHURVOX COMMAND CENTRE</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Smart Hub</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-100 md:text-base">
                Run the day from one place: jobs, clients, quotes, invoices, team, schedule, follow-ups, automation, and AI assistance.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {quickActions.map(([label, href, kind]) => (
                  <SmartButton key={href} label={label} href={href} kind={kind} />
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {["AI Assistant: On", "Default landing: Jobs", "Approval-first: Yes"].map((item) => (
                <div key={item} className="rounded-2xl border border-blue-400/20 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-inner shadow-slate-950/20">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
                <Bot className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-2xl font-black text-slate-950">AI Business Assistant</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">
                  Approval-first assistant guidance for daily operations, message drafting, and workflow decisions.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {assistantPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => setActivePromptId(prompt.id)}
                  className={
                    activePromptId === prompt.id
                      ? "rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-900/15"
                      : "rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-black text-slate-950 transition hover:border-blue-300 hover:bg-blue-50"
                  }
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-900 bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/20 md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Assistant response</p>
                <h2 className="mt-1 text-xl font-black text-white">{activePrompt.label}</h2>
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold leading-6 text-slate-100">
              {activePrompt.response}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={copyResponse}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied" : "Copy response"}
              </button>
              <Link to="/jobs" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Jobs</Link>
              <Link to="/invoices" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Invoices</Link>
              <Link to="/quotes" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Quotes</Link>
              <Link to="/automation" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Automation</Link>
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshotCards.map((card) => <SnapshotCard key={card.title} card={card} />)}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Command shortcuts</h2>
              <p className="mt-1 text-sm font-semibold text-slate-700">Fast access to launch-critical work areas.</p>
            </div>
            <Link to="/jobs" className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-950 hover:border-blue-300 hover:bg-blue-50 sm:inline-flex">
              Back to Jobs
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {shortcuts.map((item) => <ShortcutCard key={item.title} item={item} />)}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 md:p-6">
            <h2 className="text-2xl font-black text-slate-950">Today’s operating checklist</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checklist.map(([label, href]) => (
                <Link key={label} to={href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                  {label}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-100/70 md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">Approval-first automation</h2>
                <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-700">
                  <li>• Draft reminders only.</li>
                  <li>• No auto-send without approval.</li>
                  <li>• Payroll stays manual and approved.</li>
                  <li>• Accounting changes stay manual and approved.</li>
                </ul>
              </div>
            </div>
          </article>
        </section>
      </div>
    </Layout>
  );
}
