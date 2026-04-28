import React from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Lightbulb,
  Receipt,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const AREA_CONFIG = {
  jobs: {
    icon: Briefcase,
    title: "AI Job Review",
    subtitle: "Checks job readiness, missing details, assignment risk, stuck work, photos, notes, and invoice handoff.",
    confidence: "Approval-first",
    checks: ["Missing client, address, worker, price or notes", "Unassigned or stuck jobs", "Completed jobs that should become draft invoices"],
    actions: ["Assign worker", "Summarise job notes/photos", "Create draft invoice", "Flag missing job information"],
    primary: { label: "Open schedule", to: "/schedule" },
    secondary: { label: "New job", to: "/jobs/new" },
  },
  schedule: {
    icon: CalendarDays,
    title: "AI Schedule Review",
    subtitle: "Looks for empty days, unassigned jobs, worker clashes, overload, and region/availability assignment opportunities.",
    confidence: "Planner assist",
    checks: ["No jobs scheduled today", "Worker double-booking risk", "Unassigned work waiting for a slot"],
    actions: ["Build today’s schedule", "Check team capacity", "Move clashing work", "Assign region-matched workers"],
    primary: { label: "Open jobs", to: "/jobs" },
    secondary: { label: "Open team", to: "/team" },
  },
  quotes: {
    icon: FileText,
    title: "AI Quote Review",
    subtitle: "Improves quote quality before sending and helps recover warm work with follow-ups.",
    confidence: "Draft only",
    checks: ["Missing scope, expiry, customer details or price", "Quotes waiting too long", "Accepted quotes ready to become jobs"],
    actions: ["Rewrite scope clearly", "Draft follow-up", "Create follow-up task", "Convert accepted quote to job"],
    primary: { label: "New quote", to: "/quotes/new" },
    secondary: { label: "Follow-ups", to: "/follow-ups" },
  },
  invoices: {
    icon: Receipt,
    title: "AI Invoice Review",
    subtitle: "Finds completed work waiting to invoice, overdue cash, missing payment details, and reminder opportunities.",
    confidence: "Approval-first",
    checks: ["Overdue or unpaid invoices", "Completed jobs not invoiced", "Missing payment or client details"],
    actions: ["Draft payment reminder", "Create invoice from completed job", "Check unpaid balance", "Prepare MYOB-safe handoff"],
    primary: { label: "New invoice", to: "/invoices/new" },
    secondary: { label: "Open jobs", to: "/jobs" },
  },
  clients: {
    icon: Users,
    title: "AI Client Review",
    subtitle: "Summarises client history and highlights open quotes, unpaid invoices, missing details, and next follow-ups.",
    confidence: "Business memory",
    checks: ["Client has unpaid invoices", "Client has open quotes", "Client details are incomplete"],
    actions: ["Summarise client history", "Suggest next follow-up", "Clean missing fields", "Prepare customer update"],
    primary: { label: "Add client", to: "/clients/new" },
    secondary: { label: "Open invoices", to: "/invoices" },
  },
  team: {
    icon: Users,
    title: "AI Team Review",
    subtitle: "Checks worker workload, missing rates/regions/roles, unassigned workers, and scheduling pressure.",
    confidence: "Manager assist",
    checks: ["Worker has no jobs", "Worker may be overloaded", "Missing role, region, invite or rate setup"],
    actions: ["Assign work", "Review worker profile", "Fix missing setup", "Prepare team note"],
    primary: { label: "Open jobs", to: "/jobs" },
    secondary: { label: "Timesheets", to: "/timesheets" },
  },
  automation: {
    icon: Zap,
    title: "AI Automation Review",
    subtitle: "Recommends practical rules and helps spot weak, duplicate or failing automations before they confuse the business.",
    confidence: "Safe rules only",
    checks: ["Quote follow-up opportunity", "Completed job without invoice", "Failed or duplicate rule risk"],
    actions: ["Create quote follow-up rule", "Create draft invoice rule", "Explain failed run", "Notify owner on unassigned job"],
    primary: { label: "View runs", to: "/automation/runs" },
    secondary: { label: "Smart Hub", to: "/dashboard" },
  },
  setup: {
    icon: Settings,
    title: "AI Setup Review",
    subtitle: "Helps finish business setup so Churvox becomes useful fast: profile, trade, team, clients, install prompt, and integrations.",
    confidence: "Setup helper",
    checks: ["Business profile incomplete", "No workers or clients added", "MYOB/install/integration setup unfinished"],
    actions: ["Finish business profile", "Invite first worker", "Add or import clients", "Check MYOB readiness"],
    primary: { label: "Add clients", to: "/clients" },
    secondary: { label: "Integrations", to: "/integrations" },
  },
};

function Chip({ children }) {
  return <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">{children}</span>;
}

function ListBlock({ title, items, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm font-black text-slate-950">
        <Icon className="h-4 w-4 text-blue-600" />
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm font-semibold leading-5 text-slate-600">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PageAIReviewPanel({ area = "jobs", className = "" }) {
  const config = AREA_CONFIG[area] || AREA_CONFIG.jobs;
  const Icon = config.icon || Bot;

  return (
    <section className={`rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50/70 to-slate-50 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] ${className}`} data-testid={`page-ai-review-${area}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
            <Icon className="h-4 w-4" />
            {config.title}
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Next-best-action assistant</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{config.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Mode</p>
          <p className="mt-1 text-sm font-black text-slate-950">{config.confidence}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ListBlock title="AI checks" items={config.checks} icon={AlertTriangle} />
        <ListBlock title="Recommended actions" items={config.actions} icon={Lightbulb} />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="flex items-center gap-2 text-sm font-black text-slate-950">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Safety rule
          </p>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            AI can suggest, draft, summarise and warn. You still approve customer messages, invoices, pricing, payroll, MYOB changes and important business actions.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={config.primary.to} className="inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700">{config.primary.label}</Link>
            <Link to={config.secondary.to} className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">{config.secondary.label}</Link>
            <Chip><Sparkles className="mr-1 h-3.5 w-3.5" /> approval-first</Chip>
          </div>
        </div>
      </div>
    </section>
  );
}
