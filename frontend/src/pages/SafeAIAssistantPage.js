import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  HandCoins,
  HeartPulse,
  Mail,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { canAccess } from "../lib/roles";

const safeArray = (value, key) => {
  if (Array.isArray(value)) return value;
  if (key && Array.isArray(value?.[key])) return value[key];
  if (key && Array.isArray(value?.data?.[key])) return value.data[key];
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.rules)) return value.rules;
  if (Array.isArray(value?.runs)) return value.runs;
  if (Array.isArray(value?.clients)) return value.clients;
  return [];
};

const txt = (v, f = "") => (v === null || v === undefined || v === "" ? f : String(v));
const low = (v) => txt(v).toLowerCase().trim();
const statusOf = (x) => low(x?.status || x?.job_status || x?.workflow_status || x?.payment_status || "");
const unwrap = (settled) => (settled?.status === "fulfilled" && settled.value?.success ? settled.value?.data || {} : null);
const recordId = (item) => String(item?.id || item?._id || "");
const money = (v) => Number(v || 0) || 0;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

const getDateString = (v) => {
  if (!v) return "";
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};

const daysOld = (v) => {
  if (!v) return 0;
  const dt = new Date(v);
  if (Number.isNaN(dt.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - dt.getTime()) / 86400000));
};

const routeForAction = (kind, id) => {
  if (kind === "invoice") return id ? `/invoices/${id}` : "/invoices";
  if (kind === "quote") return id ? `/quotes/${id}` : "/quotes";
  if (kind === "job") return id ? `/jobs/${id}` : "/jobs";
  if (kind === "automation") return "/automation/runs";
  if (kind === "team") return "/team";
  if (kind === "followups") return "/follow-ups";
  return "/smart-hub";
};

function SnapshotCard({ title, value, hint, icon: Icon, to }) {
  const body = (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md shadow-slate-300/30 transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <span className="rounded-xl border border-blue-100 bg-blue-50 p-2 text-blue-700"><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-600">{hint}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function HealthBar({ label, score, reason, to }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-slate-50 to-slate-100 p-4 shadow-md shadow-slate-300/30">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">{reason}</p>
        </div>
        <span className="text-lg font-black text-slate-950">{score}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      {to ? <Link to={to} className="mt-3 inline-flex text-xs font-black text-blue-700 hover:underline">Open area</Link> : null}
    </div>
  );
}

function ActionCard({ item }) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md shadow-slate-300/20">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700">{item.type || "Action"}</span>
        {item.meta ? <span className="text-[11px] font-bold text-slate-500">{item.meta}</span> : null}
      </div>
      <p className="mt-3 text-sm font-black text-slate-950">{item.title}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{item.text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to={item.to} className="inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black text-white hover:bg-blue-700">{item.cta}</Link>
        {item.copy ? <button type="button" onClick={() => navigator.clipboard?.writeText(item.copy)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700">Copy draft</button> : null}
      </div>
    </div>
  );
}

export default function SafeAIAssistantPage() {
  const { get } = useApi();
  const { normalizedRole } = useAuth();
  const [data, setData] = useState({ jobs: [], quotes: [], invoices: [], workers: [], rules: [], runs: [], clients: [], followUps: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);
  const [assistantMode, setAssistantMode] = useState("attention");
  const [apiSuggestions, setApiSuggestions] = useState([]);
  const [digestPreview, setDigestPreview] = useState("");
  const [digestData, setDigestData] = useState({});
  const [quickOpen, setQuickOpen] = useState(false);
  const quickItems = useMemo(() => ([
    { label: "New job", to: "/jobs/new" },
    { label: "New client", to: "/clients/new" },
    { label: "New quote", to: "/quotes/new" },
    { label: "New invoice", to: "/invoices/new" },
    { label: "New team member", to: "/team", require: "team" },
  ]).filter((item) => !item.require || canAccess(normalizedRole || "owner", item.require)), [normalizedRole]);

  const fetchHubData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    const requests = await Promise.allSettled([
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/team/workers"),
      get("/automation/rules"),
      get("/automation/runs"),
      get("/clients"),
      get("/follow-up-tasks?status=open"),
      get("/follow-up-suggestions"),
      get("/smart-hub/digest"),
    ]);
    const next = {
      jobs: safeArray(unwrap(requests[0]), "jobs"),
      quotes: safeArray(unwrap(requests[1]), "quotes"),
      invoices: safeArray(unwrap(requests[2]), "invoices"),
      workers: safeArray(unwrap(requests[3]), "workers"),
      rules: safeArray(unwrap(requests[4]), "rules"),
      runs: safeArray(unwrap(requests[5]), "runs"),
      clients: safeArray(unwrap(requests[6]), "clients"),
      followUps: safeArray(unwrap(requests[7]), "tasks"),
    };
    setData(next);
    setApiSuggestions(safeArray(unwrap(requests[8]), "items"));
    const digestPayload = unwrap(requests[9]) || {};
    setDigestData(digestPayload);
    setDigestPreview(digestPayload.digest_text || "");
    const sections = ["Jobs", "Quotes", "Invoices", "Team", "Automation rules", "Automation runs", "Clients", "Follow-ups", "Suggestions", "Digest"];
    const failures = requests.flatMap((r, i) => (r.status === "fulfilled" && r.value?.success ? [] : [sections[i]]));
    setLoadErrors(failures);
    setLoading(false);
    setRefreshing(false);
  }, [get]);

  useEffect(() => {
    fetchHubData(false);
  }, [fetchHubData]);

  const model = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const jobs = data.jobs;
    const quotes = data.quotes;
    const invoices = data.invoices;
    const workers = data.workers;
    const rules = data.rules;
    const runs = data.runs;
    const followUps = data.followUps;

    const todayJobs = jobs.filter((j) => getDateString(j.start_time || j.scheduled_for || j.date || j.scheduled_date || j.job_date || j.due_date) === today);
    const tomorrowJobs = jobs.filter((j) => getDateString(j.start_time || j.scheduled_for || j.date || j.scheduled_date || j.job_date || j.due_date) === tomorrow);
    const jobsInProgress = jobs.filter((j) => ["in_progress", "in progress", "active", "started", "on_the_way"].includes(statusOf(j)));
    const completedJobs = jobs.filter((j) => ["completed", "complete", "done"].includes(statusOf(j)));
    const unfinishedJobs = jobs.filter((j) => !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(j)));
    const overdueJobs = jobs.filter((j) => {
      const due = getDateString(j.due_date || j.scheduled_for || j.date || j.scheduled_date);
      return due && due < today && !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(j));
    });
    const jobsNeedingAssignment = unfinishedJobs.filter((j) => !(j.assigned_worker_id || j.worker_id || j.assigned_to || j.worker_name || j.assigned_worker_name));

    const openQuotes = quotes.filter((q) => ["draft", "sent", "pending", "open", "awaiting", ""].includes(statusOf(q)));
    const staleQuotes = openQuotes.filter((q) => daysOld(q.sent_at || q.updated_at || q.created_at) >= 3);
    const unpaidInvoices = invoices.filter((i) => !["paid", "void", "cancelled", "canceled"].includes(statusOf(i)));
    const overdueInvoices = unpaidInvoices.filter((i) => statusOf(i) === "overdue" || (getDateString(i.due_date) && getDateString(i.due_date) < today));

    const failedRuns = runs.filter((r) => ["failed", "error", "paused"].includes(statusOf(r)));
    const activeRules = rules.filter((r) => r.enabled !== false).length;
    const openFollowUps = followUps.filter((f) => !["completed", "done", "closed"].includes(statusOf(f)));
    const overdueFollowUps = openFollowUps.filter((f) => getDateString(f.due_at || f.due_date) && getDateString(f.due_at || f.due_date) < today);
    const assignedToday = new Set(todayJobs.map((j) => j.assigned_worker_id || j.worker_id || j.assigned_worker_name).filter(Boolean)).size;

    const jobHealth = clamp(100 - overdueJobs.length * 12 - jobsNeedingAssignment.length * 8 - jobsInProgress.length * 2);
    const cashflowHealth = clamp(100 - overdueInvoices.length * 15 - unpaidInvoices.length * 4);
    const quoteHealth = clamp(100 - staleQuotes.length * 12 - openQuotes.length * 2);
    const teamHealth = clamp(100 - jobsNeedingAssignment.length * 12 + Math.min(10, assignedToday * 2));
    const automationHealth = clamp(100 - failedRuns.length * 18 + Math.min(10, activeRules * 2));
    const followUpHealth = clamp(100 - overdueFollowUps.length * 14 - openFollowUps.length * 3);
    const overallScore = clamp((jobHealth + cashflowHealth + quoteHealth + teamHealth + automationHealth + followUpHealth) / 6);

    const urgentActions = [
      overdueInvoices[0] && { key: "invoice", type: "Invoice", title: `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`, text: "Review overdue invoices and send approved reminders.", to: routeForAction("invoice", recordId(overdueInvoices[0])), cta: "View invoice", meta: "Cashflow" },
      jobsNeedingAssignment[0] && { key: "assign", type: "Job", title: `${jobsNeedingAssignment.length} job${jobsNeedingAssignment.length === 1 ? "" : "s"} need assignment`, text: "Assign workers to avoid missed schedule work.", to: routeForAction("job", recordId(jobsNeedingAssignment[0])), cta: "View job", meta: "Team" },
      todayJobs[0] && { key: "due", type: "Schedule", title: `${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} due today`, text: "Check readiness, worker assignment, and customer updates.", to: routeForAction("job", recordId(todayJobs[0])), cta: "View job", meta: "Today" },
      staleQuotes[0] && { key: "quotes", type: "Quote", title: `${staleQuotes.length} quote${staleQuotes.length === 1 ? "" : "s"} need follow-up`, text: "Quote has been waiting at least 3 days. Draft a customer follow-up.", to: routeForAction("quote", recordId(staleQuotes[0])), cta: "View quote", meta: "Pipeline" },
      failedRuns[0] && { key: "automation", type: "Automation", title: `${failedRuns.length} automation issue${failedRuns.length === 1 ? "" : "s"}`, text: "Review failed or paused automation runs before they pile up.", to: routeForAction("automation"), cta: "Open runs", meta: "Ops" },
      overdueFollowUps[0] && { key: "followups", type: "Follow-up", title: `${overdueFollowUps.length} overdue follow-up${overdueFollowUps.length === 1 ? "" : "s"}`, text: "Clear customer follow-ups so quotes and invoices keep moving.", to: routeForAction("followups"), cta: "Open follow-ups", meta: "Customer" },
    ].filter(Boolean);

    const smartSuggestions = [
      staleQuotes[0] && { key: "quote-follow", type: "Quote", title: "Quote sent 3+ days ago", text: "Draft a quick check-in to keep this quote moving.", to: routeForAction("quote", recordId(staleQuotes[0])), cta: "Open quote", copy: `Hi, just checking in on the quote we sent through. Happy to answer any questions or lock in a time if you would like to go ahead.` },
      overdueInvoices[0] && { key: "invoice-reminder", type: "Invoice", title: "Invoice overdue", text: "Prepare a polite reminder. Nothing is sent automatically.", to: routeForAction("invoice", recordId(overdueInvoices[0])), cta: "Open invoice", copy: `Hi, just a friendly reminder that this invoice is now overdue. Please let us know if you need the payment details resent.` },
      completedJobs[0] && { key: "review", type: "Review", title: "Completed job — ask for review", text: "Draft a customer review request after completed work.", to: routeForAction("job", recordId(completedJobs[0])), cta: "Open job", copy: `Thanks for choosing us for the job. If you are happy with the work, we would really appreciate a quick review.` },
      jobsNeedingAssignment[0] && { key: "assign-worker", type: "Team", title: "Job needs worker", text: "Assign a worker before the schedule gets tight.", to: routeForAction("job", recordId(jobsNeedingAssignment[0])), cta: "Assign job" },
      tomorrowJobs[0] && { key: "tomorrow", type: "Schedule", title: "Job due tomorrow", text: "Confirm the job has a worker and customer details are correct.", to: routeForAction("job", recordId(tomorrowJobs[0])), cta: "Open job" },
    ].filter(Boolean);

    const dailyDigest = [
      `${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} scheduled today`,
      `${assignedToday} worker${assignedToday === 1 ? "" : "s"} assigned today`,
      `${overdueInvoices.length} overdue invoice${overdueInvoices.length === 1 ? "" : "s"}`,
      `${openQuotes.length} open quote${openQuotes.length === 1 ? "" : "s"}`,
      `${jobsNeedingAssignment.length} job${jobsNeedingAssignment.length === 1 ? "" : "s"} need assignment`,
      `${failedRuns.length} automation issue${failedRuns.length === 1 ? "" : "s"}`,
    ];

    const digestEmail = [
      "Churvox Daily Digest",
      "",
      `Business health: ${overallScore}%`,
      ...dailyDigest.map((line) => `• ${line}`),
      "",
      urgentActions.length ? "Top actions:" : "No urgent actions right now.",
      ...urgentActions.slice(0, 5).map((action) => `• ${action.title} — ${action.text}`),
    ].join("\n");

    return {
      todayJobs,
      tomorrowJobs,
      jobsInProgress,
      completedJobs,
      overdueJobs,
      openQuotes,
      staleQuotes,
      unpaidInvoices,
      overdueInvoices,
      workers,
      activeRules,
      failedRuns,
      jobsNeedingAssignment,
      urgentActions,
      smartSuggestions,
      openFollowUps,
      overdueFollowUps,
      assignedToday,
      dailyDigest,
      digestEmail,
      health: { overallScore, jobHealth, cashflowHealth, quoteHealth, teamHealth, automationHealth, followUpHealth },
    };
  }, [data]);

  const assistantResponses = {
    attention: model.urgentActions.length ? model.urgentActions.map((a) => `• ${a.title}: ${a.text}`).join("\n") : "Nothing urgent right now — your business is looking clear.",
    invoice: model.overdueInvoices.length ? `Draft reminder ready for ${model.overdueInvoices.length} overdue invoice(s). Open Invoices, review the customer, then send only after approval.` : "No overdue invoices found right now.",
    jobs: model.todayJobs.length ? `Today has ${model.todayJobs.length} job(s), ${model.jobsNeedingAssignment.length} needing assignment, and ${model.jobsInProgress.length} currently in progress.` : "No jobs scheduled for today from the loaded data.",
    action: model.jobsNeedingAssignment.length ? `${model.jobsNeedingAssignment.length} job(s) need assignment. Start with the oldest scheduled job and assign a worker.` : "No unassigned active jobs found.",
    automation: model.failedRuns.length ? `${model.failedRuns.length} automation run(s) need review. Open Automation Runs first.` : "Automation looks healthy from loaded runs. Suggested templates: completed job to invoice draft, overdue invoice reminder, quote follow-up, job-due reminder.",
  };

  const assistantPrompts = [
    { key: "attention", label: "What needs attention today?" },
    { key: "invoice", label: "Draft follow-up for overdue invoice" },
    { key: "jobs", label: "Summarise today's jobs" },
    { key: "action", label: "Find jobs that need action" },
    { key: "automation", label: "Suggest automations" },
  ];

  return (
    <Layout>
      <div className="cx-page space-y-5 pb-24 md:pb-8">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Command Centre</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Smart Hub</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-300">Your daily command centre for jobs, invoices, quotes, team activity, follow-ups, automation, and safe AI actions.</p>
            </div>
            <div className="min-w-[168px] rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
              <p className="text-xs font-black uppercase tracking-wide text-slate-300">Business Health</p>
              <p className="mt-1 text-4xl font-black text-white">{digestData?.health_score?.overall?.score ?? model.health.overallScore}%</p>
              <p className="text-xs font-semibold text-slate-300">{model.urgentActions.length} action{model.urgentActions.length === 1 ? "" : "s"} need attention</p>
            </div>
            <div className="flex items-center gap-2">
              {normalizedRole !== "worker" && normalizedRole !== "payroll" && (
                <div className="relative">
                  <button type="button" onClick={() => setQuickOpen((v) => !v)} className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20">Quick Create ▾</button>
                  {quickOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 text-left shadow-xl z-20">
                      {quickItems.map((item) => (
                        <Link key={item.to} to={item.to} onClick={() => setQuickOpen(false)} className="block rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">{item.label}</Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => fetchHubData(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-white/15 disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          {loading && <p className="mt-3 text-sm font-semibold text-slate-300">Loading Smart Hub data...</p>}
          {loadErrors.length > 0 && <div className="mt-4 rounded-xl border border-amber-200/40 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">Some sections are in safe fallback mode: {loadErrors.join(", ")}.</div>}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SnapshotCard title="Today's jobs" value={model.todayJobs.length} hint="Scheduled for today" icon={CalendarClock} to="/schedule" />
          <SnapshotCard title="Jobs in progress" value={model.jobsInProgress.length} hint="Live active work" icon={Clock3} to="/jobs" />
          <SnapshotCard title="Completed jobs" value={model.completedJobs.length} hint="Completed status" icon={CheckCircle2} to="/jobs" />
          <SnapshotCard title="Overdue jobs" value={model.overdueJobs.length} hint="Past due and incomplete" icon={AlertTriangle} to="/jobs" />
          <SnapshotCard title="Open quotes" value={model.openQuotes.length} hint="Awaiting customer decision" icon={BriefcaseBusiness} to="/quotes" />
          <SnapshotCard title="Unpaid invoices" value={model.unpaidInvoices.length} hint="Pending collection" icon={HandCoins} to="/invoices" />
          <SnapshotCard title="Team members" value={model.workers.length} hint="Workers available" icon={Users} to={normalizedRole === "office_admin" ? undefined : "/team"} />
          <SnapshotCard title="Urgent follow-ups" value={model.urgentActions.length} hint="Action centre priorities" icon={Sparkles} to="/follow-ups" />
        </section>

        <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md shadow-slate-300/30">
            <h2 className="text-lg font-black text-slate-950">Business Health</h2>
            <div className="mt-3 grid gap-2">
              <HealthBar label="Overall score" score={digestData?.health_score?.overall?.score ?? model.health.overallScore} reason="Across jobs, cashflow, quotes, team, automation, and follow-ups" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">Owner Daily Digest</h2>
                <p className="text-sm font-semibold text-slate-600">A quick read of today’s work, cashflow, team, and automation risks.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigator.clipboard?.writeText(model.digestEmail)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700"><Mail className="mr-1 inline h-3.5 w-3.5" />Copy digest</button>
                <button type="button" onClick={async()=>{const r=await get('/smart-hub/digest-email/test'); alert(r?.success ? 'Test digest sent' : (r?.error || 'Could not send test digest'));}} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">Send test digest</button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {model.dailyDigest.map((line) => <div key={line} className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800">{line}</div>)}
            </div>
            <div className="mt-3 rounded-xl border border-slate-300 bg-slate-100 p-3 text-xs font-semibold text-slate-700">{digestPreview || "No digest available yet."}</div>
          </div>
          <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
            <h2 className="text-lg font-black text-slate-950">Daily Digest Metrics</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">Digest-backed with safe fallback data.</p>
            <div className="mt-3 grid gap-2">
              <HealthBar label="Jobs" score={digestData?.health_score?.jobs?.score ?? model.health.jobHealth} reason={digestData?.health_score?.jobs?.reason || `${model.overdueJobs.length} overdue · ${model.jobsNeedingAssignment.length} unassigned`} to={digestData?.health_score?.jobs?.route || "/jobs"} />
              <HealthBar label="Cashflow" score={digestData?.health_score?.cashflow?.score ?? model.health.cashflowHealth} reason={digestData?.health_score?.cashflow?.reason || `${model.overdueInvoices.length} overdue · ${model.unpaidInvoices.length} unpaid`} to={digestData?.health_score?.cashflow?.route || "/invoices"} />
              <HealthBar label="Quote pipeline" score={digestData?.health_score?.quote_pipeline?.score ?? model.health.quoteHealth} reason={digestData?.health_score?.quote_pipeline?.reason || `${model.staleQuotes.length} stale · ${model.openQuotes.length} open`} to={digestData?.health_score?.quote_pipeline?.route || "/quotes"} />
              <HealthBar label="Team activity" score={digestData?.health_score?.team_activity?.score ?? model.health.teamHealth} reason={digestData?.health_score?.team_activity?.reason || `${model.assignedToday} assigned today`} to={digestData?.health_score?.team_activity?.route || "/team"} />
              <HealthBar label="Automation" score={digestData?.health_score?.automation_health?.score ?? model.health.automationHealth} reason={digestData?.health_score?.automation_health?.reason || `${model.failedRuns.length} issues · ${model.activeRules} active`} to={digestData?.health_score?.automation_health?.route || "/automation"} />
              <HealthBar label="Follow-ups" score={digestData?.health_score?.follow_up_health?.score ?? model.health.followUpHealth} reason={digestData?.health_score?.follow_up_health?.reason || `${model.overdueFollowUps.length} overdue · ${model.openFollowUps.length} open`} to={digestData?.health_score?.follow_up_health?.route || "/follow-ups"} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
          <h2 className="text-lg font-black text-slate-950">Urgent Action Centre</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">The highest-impact actions to keep jobs, money, and customers moving.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.urgentActions.length ? model.urgentActions.map((item) => <ActionCard key={item.key} item={item} />) : <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-sm font-semibold text-slate-600">Nothing urgent right now — your business is looking clear.</p>}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">AI Business Assistant</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">Approval-first. Drafts and suggestions only.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Approval-first</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {assistantPrompts.map((prompt) => <button type="button" key={prompt.key} onClick={() => setAssistantMode(prompt.key)} className={`rounded-xl border px-3 py-2 text-left text-sm font-bold ${assistantMode === prompt.key ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"}`}><Bot className="mr-2 inline h-4 w-4 text-blue-600" />{prompt.label}</button>)}
            </div>
            <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold leading-6 text-slate-800 shadow-sm">{assistantResponses[assistantMode]}</div>
          </div>

          <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
            <h2 className="text-lg font-black text-slate-950">Automation Command Centre</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3"><p className="text-xs text-slate-600">Active rules</p><p className="text-xl font-black text-slate-900">{digestData?.active_rules_count ?? model.activeRules}</p></div>
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3"><p className="text-xs text-slate-600">Recent runs</p><p className="text-xl font-black text-slate-900">{data.runs.length}</p></div>
              <div className="rounded-xl border border-slate-300 bg-slate-50 p-3"><p className="text-xs text-slate-600">Failed runs</p><p className="text-xl font-black text-rose-600">{digestData?.failed_runs_count ?? model.failedRuns.length}</p></div>
            </div>
            <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600">
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-3"><ClipboardCheck className="mr-2 inline h-4 w-4 text-blue-600" />Template: completed job → invoice draft</div>
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-3"><FileText className="mr-2 inline h-4 w-4 text-blue-600" />Template: quote sent 3 days → follow-up</div>
              <div className="rounded-xl border border-slate-300 bg-slate-100 p-3"><HeartPulse className="mr-2 inline h-4 w-4 text-blue-600" />Template: overdue invoice → reminder suggestion</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/automation" className="inline-flex items-center gap-1 rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 hover:bg-slate-50"><Zap className="h-3.5 w-3.5" />Open automation</Link>
              <Link to="/automation/runs" className="inline-flex items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 hover:bg-blue-700">Open runs</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
            <h2 className="text-lg font-black text-slate-950">Cashflow & Follow-ups</h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">{model.unpaidInvoices.length} unpaid invoices, {model.openQuotes.length} open quotes, and {model.openFollowUps.length} active follow-ups.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/invoices" className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">Review unpaid invoices</Link>
              <Link to="/quotes" className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">Review open quotes</Link>
              <Link to="/follow-ups" className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">Open follow-ups</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
            <h2 className="text-lg font-black text-slate-950">Jobs, Team & Route Planning</h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">{model.jobsNeedingAssignment.length} jobs need worker assignment. {model.todayJobs.length} jobs are on today's schedule.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/jobs/new" className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800">New job</Link>
              <Link to="/jobs" className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">View jobs</Link>
              <Link to="/schedule" className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">Route planner</Link>
              {normalizedRole !== "office_admin" ? <Link to="/team" className="rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100">View team</Link> : null}
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-md shadow-slate-300/30">
          <h2 className="text-lg font-black text-slate-950">Smart Follow-up Suggestions</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">Approval-first drafts only. Churvox never sends customer messages automatically.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(model.smartSuggestions.length ? model.smartSuggestions : apiSuggestions.slice(0, 6).map((s) => ({ key: s.key || s.id, title: s.title, text: s.reason, to: s.route || "/follow-ups", cta: "Open", copy: s.draft_text, type: "Suggestion" }))).length ? (model.smartSuggestions.length ? model.smartSuggestions : apiSuggestions.slice(0, 6).map((s) => ({ key: s.key || s.id, title: s.title, text: s.reason, to: s.route || "/follow-ups", cta: "Open", copy: s.draft_text, type: "Suggestion" }))).map((item) => <ActionCard key={item.key} item={item} />) : <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-sm font-semibold text-slate-600">No smart follow-up suggestions available yet.</p>}
          </div>
        </section>
      </div>
</Layout>
  );
}
