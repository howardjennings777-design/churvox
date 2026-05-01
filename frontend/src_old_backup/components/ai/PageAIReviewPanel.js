import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
    subtitle: "Checks job readiness, assignment risk, stuck work, notes/photos and invoice handoff.",
    confidence: "Approval-first",
    checks: ["Missing client, address, worker, price or notes", "Unassigned or stuck jobs", "Completed jobs that should become draft invoices"],
    actions: ["Assign worker", "Summarise notes/photos", "Create draft invoice", "Flag missing info"],
    primary: { label: "Open schedule", to: "/schedule" },
    secondary: { label: "New job", to: "/jobs/new" },
  },
  schedule: {
    icon: CalendarDays,
    title: "AI Schedule Review",
    subtitle: "Looks for empty days, unassigned jobs, clashes, overload and region/availability fit.",
    confidence: "Planner assist",
    checks: ["No jobs scheduled today", "Worker double-booking risk", "Unassigned work waiting for a slot"],
    actions: ["Build today’s schedule", "Check team capacity", "Move clashing work", "Assign region-matched workers"],
    primary: { label: "Open jobs", to: "/jobs" },
    secondary: { label: "Open team", to: "/team" },
  },
  quotes: {
    icon: FileText,
    title: "AI Quote Review",
    subtitle: "Improves quote quality and helps recover warm work with follow-ups.",
    confidence: "Draft only",
    checks: ["Missing scope, expiry, customer details or price", "Quotes waiting too long", "Accepted quotes ready to become jobs"],
    actions: ["Rewrite scope", "Draft follow-up", "Create follow-up task", "Convert accepted quote"],
    primary: { label: "New quote", to: "/quotes/new" },
    secondary: { label: "Follow-ups", to: "/follow-ups" },
  },
  invoices: {
    icon: Receipt,
    title: "AI Invoice Review",
    subtitle: "Finds completed work waiting to invoice, overdue cash and reminder opportunities.",
    confidence: "Approval-first",
    checks: ["Overdue or unpaid invoices", "Completed jobs not invoiced", "Missing payment or client details"],
    actions: ["Draft reminder", "Create invoice", "Check unpaid balance", "Prepare MYOB handoff"],
    primary: { label: "New invoice", to: "/invoices/new" },
    secondary: { label: "Open jobs", to: "/jobs" },
  },
  clients: {
    icon: Users,
    title: "AI Client Review",
    subtitle: "Summarises client history and highlights open quotes, unpaid invoices and next follow-ups.",
    confidence: "Business memory",
    checks: ["Client has unpaid invoices", "Client has open quotes", "Client details are incomplete"],
    actions: ["Summarise history", "Suggest follow-up", "Clean missing fields", "Prepare customer update"],
    primary: { label: "Add client", to: "/clients/new" },
    secondary: { label: "Open invoices", to: "/invoices" },
  },
  team: {
    icon: Users,
    title: "AI Team Review",
    subtitle: "Checks workload, missing rates/regions/roles, unassigned workers and scheduling pressure.",
    confidence: "Manager assist",
    checks: ["Worker has no jobs", "Worker may be overloaded", "Missing role, region, invite or rate setup"],
    actions: ["Assign work", "Review profile", "Fix missing setup", "Prepare team note"],
    primary: { label: "Open jobs", to: "/jobs" },
    secondary: { label: "Timesheets", to: "/timesheets" },
  },
  automation: {
    icon: Zap,
    title: "AI Automation Review",
    subtitle: "Recommends safe rules and spots weak, duplicate or failing automations.",
    confidence: "Safe rules only",
    checks: ["Quote follow-up opportunity", "Completed job without invoice", "Failed or duplicate rule risk"],
    actions: ["Create follow-up rule", "Create draft invoice rule", "Explain failed run", "Notify on unassigned job"],
    primary: { label: "View runs", to: "/automation/runs" },
    secondary: { label: "Smart Hub", to: "/dashboard" },
  },
  setup: {
    icon: Settings,
    title: "AI Setup Review",
    subtitle: "Helps finish business setup: profile, trade, team, clients, install prompt and integrations.",
    confidence: "Setup helper",
    checks: ["Business profile incomplete", "No workers or clients added", "MYOB/install/integration setup unfinished"],
    actions: ["Finish profile", "Invite first worker", "Add/import clients", "Check MYOB readiness"],
    primary: { label: "Add clients", to: "/clients" },
    secondary: { label: "Integrations", to: "/integrations" },
  },
};

function MiniItem({ children, icon: Icon = CheckCircle2 }) {
  return (
    <li className="flex items-start gap-2 text-xs font-semibold leading-5 text-slate-600">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

export default function PageAIReviewPanel({ area = "jobs", className = "" }) {
  const config = AREA_CONFIG[area] || AREA_CONFIG.jobs;
  const Icon = config.icon || Bot;
  const [open, setOpen] = useState(false);
  const previewChecks = config.checks.slice(0, 2);
  const previewActions = config.actions.slice(0, 2);

  return (
    <section className={`rounded-2xl border border-blue-100 bg-white shadow-[0_10px_26px_rgba(15,23,42,0.07)] ${className}`} data-testid={`page-ai-review-${area}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-base font-black text-slate-950">{config.title}</p>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">{config.confidence}</span>
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">{config.subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={config.primary.to} className="inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700">{config.primary.label}</Link>
          <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
            {open ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
            {open ? "Hide AI" : "Show AI"}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-3 border-t border-slate-100 bg-gradient-to-br from-white via-blue-50/40 to-slate-50 px-4 py-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><AlertTriangle className="h-4 w-4 text-blue-600" /> Checks</p>
            <ul className="mt-3 space-y-1.5">{previewChecks.map((item) => <MiniItem key={item}>{item}</MiniItem>)}</ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><Lightbulb className="h-4 w-4 text-blue-600" /> Actions</p>
            <ul className="mt-3 space-y-1.5">{previewActions.map((item) => <MiniItem key={item}>{item}</MiniItem>)}</ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Guardrail</p>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-600">AI suggests and drafts only. You approve messages, invoices, pricing, payroll, MYOB and important business actions.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={config.secondary.to} className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">{config.secondary.label}</Link>
              <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><Sparkles className="mr-1 h-3.5 w-3.5" />approval-first</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
