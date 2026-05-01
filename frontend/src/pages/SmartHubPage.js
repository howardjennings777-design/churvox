import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  RefreshCw,
  Rocket,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";

const promptButtons = [
  ["attention", "What needs attention today?"],
  ["invoice_followup", "Draft invoice follow-up"],
  ["jobs_summary", "Summarise today’s jobs"],
  ["automation_suggestions", "Suggest automations"],
  ["jobs_needing_action", "Find jobs needing action"],
];

const quickActions = [
  ["New job", "/jobs/new", "primary"],
  ["Jobs", "/jobs", "light"],
  ["Clients", "/clients", "light"],
  ["Quotes", "/quotes", "light"],
  ["Invoices", "/invoices", "light"],
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

const fallbackAssistant = {
  attention: "Start with open jobs, unpaid invoices, open quotes, and team availability. Open Jobs first, then check Invoices and Quotes before applying any workflow changes.",
  invoice_followup: "Draft only: Hi, just a friendly reminder this invoice is still awaiting payment. Please let us know if you want payment details resent or a copy attached.",
  jobs_summary: "Use Jobs and Schedule to confirm each job has a client, address, assigned worker, and clear status. Prioritise overdue and unassigned jobs first.",
  automation_suggestions: "Recommended launch automations: completed job creates a draft invoice, quote follow-up draft after 3 days, unpaid invoice reminder draft, and worker status alerts.",
  jobs_needing_action: "Open Jobs and filter for unassigned, overdue, in progress, or missing client/address details. Resolve these first to keep the day moving smoothly.",
};

const safeArray = (value) => Array.isArray(value) ? value : [];
const statusOf = (item) => String(item?.status || item?.job_status || item?.workflow_status || "").toLowerCase();
const todayIso = () => new Date().toISOString().slice(0, 10);
const dateIso = (value) => String(value || "").slice(0, 10);

function SmartButton({ label, href, kind }) {
  const cls = kind === "primary"
    ? "inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-900/25 transition hover:bg-blue-700"
    : "inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-sm transition hover:border-blue-200 hover:bg-blue-50";
  return <Link to={href} className={cls}>{label}</Link>;
}

function MetricCard({ title, value, icon: Icon, helper }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-700">{title}</p>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-xs font-bold text-slate-600">{helper}</p> : null}
        </div>
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function SnapshotCard({ icon: Icon, title, body }) {
  return (
    <article
      className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/40"
      style={{ background: "#ffffff", color: "#0f172a", opacity: 1, filter: "none" }}
    >
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-700">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-black text-slate-950" style={{ color: "#020617", opacity: 1 }}>{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-800" style={{ color: "#1f2937", opacity: 1 }}>{body}</p>
    </article>
  );
}

function ShortcutCard({ item }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100/70"
      style={{ background: "#ffffff", color: "#0f172a", opacity: 1, filter: "none" }}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white">
          <Icon className="h-5 w-5" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:text-blue-700" />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950" style={{ color: "#020617" }}>{item.title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-700" style={{ color: "#334155" }}>{item.description}</p>
      <p className="mt-4 text-xs font-black uppercase tracking-wide text-blue-700">Open {item.title}</p>
    </Link>
  );
}

export default function SmartHubPage() {
  const { get, post } = useApi();
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [assistant, setAssistant] = useState(fallbackAssistant.attention);
  const [activePrompt, setActivePrompt] = useState("attention");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hubRes, jobsRes, quotesRes, invoicesRes, teamRes, runsRes] = await Promise.allSettled([
        get("/smart-hub/summary"),
        get("/jobs"),
        get("/quotes"),
        get("/invoices"),
        get("/team/workers"),
        get("/automation/runs?limit=10"),
      ]);

      const hubData = hubRes.status === "fulfilled" && hubRes.value?.success ? hubRes.value.data || {} : {};
      const jobs = jobsRes.status === "fulfilled" && jobsRes.value?.success ? safeArray(jobsRes.value.data) : [];
      const quotes = quotesRes.status === "fulfilled" && quotesRes.value?.success ? safeArray(quotesRes.value.data) : [];
      const invoices = invoicesRes.status === "fulfilled" && invoicesRes.value?.success ? safeArray(invoicesRes.value.data) : [];
      const team = teamRes.status === "fulfilled" && teamRes.value?.success ? safeArray(teamRes.value.data) : [];
      const runsRaw = runsRes.status === "fulfilled" && runsRes.value?.success ? runsRes.value.data : [];
      const runs = safeArray(runsRaw?.runs || runsRaw);
      const today = todayIso();

      setSummary({
        today_jobs: jobs.filter((job) => dateIso(job.scheduled_date || job.date || job.start_time) === today).length,
        jobs_in_progress: jobs.filter((job) => ["in_progress", "in progress", "started"].includes(statusOf(job))).length,
        overdue_jobs: jobs.filter((job) => statusOf(job) === "overdue" || (dateIso(job.scheduled_date) < today && !["completed", "cancelled"].includes(statusOf(job)))).length,
        open_quotes: quotes.filter((quote) => ["draft", "sent", "open", "pending"].includes(statusOf(quote))).length,
        unpaid_invoices: invoices.filter((invoice) => !["paid", "cancelled", "void"].includes(statusOf(invoice))).length,
        team_members: team.length,
        automation_issues: runs.filter((run) => ["failed", "error"].includes(statusOf(run))).slice(0, 3),
        urgent_followups: safeArray(hubData.urgent_followups).slice(0, 5),
        health_score: Number(hubData.health_score || 0),
        ...hubData,
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { load(); }, [load]);

  const askAssistant = async (promptType) => {
    setActivePrompt(promptType);
    setAssistantLoading(true);
    try {
      const res = await post("/ai/business-assistant", { prompt_type: promptType });
      setAssistant((res?.success && (res?.data?.response || res?.data?.answer)) || fallbackAssistant[promptType] || fallbackAssistant.attention);
    } catch (_error) {
      setAssistant(fallbackAssistant[promptType] || fallbackAssistant.attention);
    } finally {
      setAssistantLoading(false);
    }
  };

  const copyResponse = async () => {
    try {
      await navigator.clipboard.writeText(assistant || "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (_error) {
      setCopied(false);
    }
  };

  const metricCards = useMemo(() => ([
    { title: "Today’s jobs", value: summary.today_jobs || 0, icon: CalendarDays, helper: "Scheduled for today" },
    { title: "Jobs in progress", value: summary.jobs_in_progress || 0, icon: BriefcaseBusiness, helper: "Live active work" },
    { title: "Overdue jobs", value: summary.overdue_jobs || 0, icon: BellRing, helper: "Needs attention" },
    { title: "Open quotes", value: summary.open_quotes || 0, icon: FileText, helper: "Awaiting decision" },
    { title: "Unpaid invoices", value: summary.unpaid_invoices || 0, icon: HandCoins, helper: "Pending collection" },
    { title: "Team members", value: summary.team_members || 0, icon: Users, helper: "People in workspace" },
  ]), [summary]);

  const snapshots = [
    { icon: ClipboardCheck, title: "Today’s Command Centre", body: "Prioritise daily operations with live counts, AI guidance, and fast access to launch-critical workflows." },
    { icon: BriefcaseBusiness, title: "Core Workflows", body: "Move from job planning to quoting and invoicing with reliable handoffs between office and field." },
    { icon: ShieldCheck, title: "Approval-First Automation", body: "Keep messages and workflow changes in draft state until an approved team member confirms them." },
    { icon: Rocket, title: "Launch Testing Ready", body: "Use launch checks and mobile tap testing to verify every key route is clear and ready for the team." },
  ];

  return (
    <Layout>
      <div className="cx-page smart-hub-v3 space-y-6 pb-20 md:pb-8">
        <style>{`
          .smart-hub-v3 > section:nth-of-type(4),
          .smart-hub-v3 > section:nth-of-type(4) * {
            opacity: 1 !important;
            filter: none !important;
            text-shadow: none !important;
          }
          .smart-hub-v3 .force-readable-card,
          .smart-hub-v3 .force-readable-card * {
            opacity: 1 !important;
            filter: none !important;
            text-shadow: none !important;
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
                {quickActions.map(([label, href, kind]) => <SmartButton key={href} label={label} href={href} kind={kind} />)}
              </div>
            </div>
            <div className="grid gap-3">
              {["AI Assistant: On", "Live snapshot: On", "Approval-first: Yes"].map((item) => (
                <div key={item} className="rounded-2xl border border-blue-400/20 bg-white/10 px-4 py-3 text-sm font-black text-white shadow-inner shadow-slate-950/20">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg hover:bg-blue-700">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <p className="text-sm font-bold text-slate-700">Last updated: {lastUpdated ? lastUpdated.toLocaleString() : "Not loaded yet"}</p>
        </div>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {metricCards.map((card) => <MetricCard key={card.title} {...card} />)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700"><Bot className="h-6 w-6" /></span>
              <div>
                <h2 className="text-2xl font-black text-slate-950">AI Business Assistant</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">Approval-first assistant guidance for daily operations, message drafting, and workflow decisions.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {promptButtons.map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => askAssistant(id)}
                  className={activePrompt === id ? "rounded-2xl border border-blue-600 bg-blue-600 px-4 py-3 text-left text-sm font-black text-white shadow-lg shadow-blue-900/15" : "rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-black text-slate-950 transition hover:border-blue-300 hover:bg-blue-50"}
                >
                  {label}
                </button>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-900 bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/20 md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-200"><Sparkles className="h-5 w-5" /></span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Assistant response</p>
                <h2 className="mt-1 text-xl font-black text-white">Draft-only guidance</h2>
              </div>
            </div>
            <p className="mt-4 min-h-28 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold leading-6 text-slate-100">
              {assistantLoading ? "Loading assistant response…" : assistant}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={copyResponse} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-slate-100"><Copy className="h-4 w-4" />{copied ? "Copied" : "Copy response"}</button>
              <Link to="/jobs" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Jobs</Link>
              <Link to="/invoices" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Invoices</Link>
              <Link to="/quotes" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Quotes</Link>
              <Link to="/automation" className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:border-cyan-300">Automation</Link>
            </div>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshots.map((card) => <SnapshotCard key={card.title} {...card} />)}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Command shortcuts</h2>
              <p className="mt-1 text-sm font-semibold text-slate-700">Fast access to launch-critical work areas.</p>
            </div>
            <Link to="/jobs" className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-950 hover:border-blue-300 hover:bg-blue-50 sm:inline-flex">Back to Jobs</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {shortcuts.map((item) => <ShortcutCard key={item.title} item={item} />)}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/80 md:p-6">
            <h2 className="text-2xl font-black text-slate-950">Today’s operating checklist</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checklist.map(([label, href]) => <Link key={label} to={href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">{label}</Link>)}
            </div>
          </article>

          <article className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm shadow-emerald-100/70 md:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span>
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
