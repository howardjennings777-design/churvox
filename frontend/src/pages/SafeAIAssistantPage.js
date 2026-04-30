import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bot, BriefcaseBusiness, CalendarClock, CheckCircle2, Clock3, HandCoins, RefreshCw, Sparkles, Users, Zap } from "lucide-react";
import Layout from "../components/Layout";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";

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
  return [];
};

const txt = (v, f = "") => (v === null || v === undefined || v === "" ? f : String(v));
const low = (v) => txt(v).toLowerCase().trim();
const statusOf = (x) => low(x?.status || x?.job_status || x?.workflow_status || x?.payment_status || "");
const unwrap = (settled) => (settled?.status === "fulfilled" && settled.value?.success ? settled.value?.data || {} : null);

const getDateString = (v) => {
  if (!v) return "";
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
};

const routeForAction = (kind, id) => {
  if (kind === "invoice") return id ? `/invoices/${id}` : "/invoices";
  if (kind === "quote") return id ? `/quotes/${id}` : "/quotes";
  if (kind === "job") return id ? `/jobs/${id}` : "/jobs";
  if (kind === "automation") return "/automation/runs";
  if (kind === "team") return "/team";
  return "/smart-hub";
};

function SnapshotCard({ title, value, hint, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

export default function SafeAIAssistantPage() {
  const { get } = useApi();
  const { normalizedRole } = useAuth();
  const [data, setData] = useState({ jobs: [], quotes: [], invoices: [], workers: [], rules: [], runs: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadErrors, setLoadErrors] = useState([]);

  const fetchHubData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    const requests = await Promise.allSettled([
      get("/jobs"),
      get("/quotes"),
      get("/invoices"),
      get("/team/workers"),
      get("/automation/rules"),
      get("/automation/runs"),
    ]);
    const next = {
      jobs: safeArray(unwrap(requests[0]), "jobs"),
      quotes: safeArray(unwrap(requests[1]), "quotes"),
      invoices: safeArray(unwrap(requests[2]), "invoices"),
      workers: safeArray(unwrap(requests[3]), "workers"),
      rules: safeArray(unwrap(requests[4]), "rules"),
      runs: safeArray(unwrap(requests[5]), "runs"),
    };
    setData(next);
    const sections = ["Jobs", "Quotes", "Invoices", "Team", "Automation rules", "Automation runs"];
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
    const jobs = data.jobs;
    const quotes = data.quotes;
    const invoices = data.invoices;
    const workers = data.workers;
    const rules = data.rules;
    const runs = data.runs;

    const todayJobs = jobs.filter((j) => {
      const date = getDateString(j.start_time || j.scheduled_for || j.date || j.scheduled_date || j.job_date || j.due_date);
      return date === today;
    });
    const jobsInProgress = jobs.filter((j) => ["in_progress", "in progress", "active", "started"].includes(statusOf(j)));
    const completedJobs = jobs.filter((j) => ["completed", "complete", "done"].includes(statusOf(j)));
    const overdueJobs = jobs.filter((j) => {
      const due = getDateString(j.due_date || j.scheduled_for || j.date);
      return due && due < today && !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(j));
    });
    const jobsNeedingAssignment = jobs.filter((j) => !["completed", "cancelled", "canceled"].includes(statusOf(j)) && !(j.assigned_worker_id || j.worker_id || j.assigned_to || j.worker_name));

    const openQuotes = quotes.filter((q) => ["draft", "sent", "pending", "open", "awaiting", ""].includes(statusOf(q)));
    const unpaidInvoices = invoices.filter((i) => !["paid", "void", "cancelled", "canceled"].includes(statusOf(i)));
    const overdueInvoices = unpaidInvoices.filter((i) => statusOf(i) === "overdue");

    const failedRuns = runs.filter((r) => ["failed", "error", "paused"].includes(statusOf(r)));
    const activeRules = rules.filter((r) => Boolean(r.enabled)).length;

    const urgentActions = [
      overdueInvoices[0] && { key: "invoice", title: `${overdueInvoices.length} overdue invoices`, text: "Review overdue invoices and send approved follow-ups.", to: routeForAction("invoice", overdueInvoices[0].id || overdueInvoices[0]._id), cta: "View invoice" },
      jobsNeedingAssignment[0] && { key: "assign", title: `${jobsNeedingAssignment.length} jobs need assignment`, text: "Assign workers to avoid scheduling delays.", to: routeForAction("job", jobsNeedingAssignment[0].id || jobsNeedingAssignment[0]._id), cta: "View job" },
      todayJobs[0] && { key: "due", title: `${todayJobs.length} jobs due today`, text: "Check dispatch readiness and customer updates.", to: routeForAction("job", todayJobs[0].id || todayJobs[0]._id), cta: "View job" },
      openQuotes[0] && { key: "quotes", title: `${openQuotes.length} quotes awaiting decision`, text: "Follow up to close pending work.", to: routeForAction("quote", openQuotes[0].id || openQuotes[0]._id), cta: "View quote" },
      failedRuns[0] && { key: "automation", title: `${failedRuns.length} automation run issues`, text: "Review failed or paused automation runs.", to: routeForAction("automation"), cta: "Open automation" },
    ].filter(Boolean);

    return { todayJobs, jobsInProgress, completedJobs, overdueJobs, openQuotes, unpaidInvoices, workers, activeRules, failedRuns, jobsNeedingAssignment, urgentActions };
  }, [data]);

  const assistantPrompts = [
    "What needs attention today?",
    "Draft follow-up for overdue invoice",
    "Summarise today's jobs",
    "Find jobs that need action",
    "Suggest automations",
  ];

  return (
    <Layout>
      <div className="cx-page space-y-6 pb-28 md:pb-8">
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Command Centre</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950">Smart Hub</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">Your daily command centre for jobs, cashflow, team activity, follow-ups, and automation.</p>
            </div>
            <button onClick={() => fetchHubData(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          {loading && <p className="mt-3 text-sm text-slate-500">Loading Smart Hub data...</p>}
          {loadErrors.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">Some sections are in safe fallback mode: {loadErrors.join(", ")}.</div>}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SnapshotCard title="Today's jobs" value={model.todayJobs.length} hint="Scheduled for today" icon={CalendarClock} />
          <SnapshotCard title="Jobs in progress" value={model.jobsInProgress.length} hint="Live active work" icon={Clock3} />
          <SnapshotCard title="Completed jobs" value={model.completedJobs.length} hint="Completed status" icon={CheckCircle2} />
          <SnapshotCard title="Overdue jobs" value={model.overdueJobs.length} hint="Past due and incomplete" icon={AlertTriangle} />
          <SnapshotCard title="Open quotes" value={model.openQuotes.length} hint="Awaiting customer decision" icon={BriefcaseBusiness} />
          <SnapshotCard title="Unpaid invoices" value={model.unpaidInvoices.length} hint="Pending collection" icon={HandCoins} />
          <SnapshotCard title="Team members" value={model.workers.length} hint="Workers available" icon={Users} />
          <SnapshotCard title="Urgent follow-ups" value={model.urgentActions.length} hint="Action centre priorities" icon={Sparkles} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Urgent Action Centre</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {model.urgentActions.length ? model.urgentActions.map((item) => (
              <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs text-slate-600">{item.text}</p>
                <Link to={item.to} className="mt-3 inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">{item.cta}</Link>
              </div>
            )) : <p className="text-sm text-slate-500">No urgent actions right now. Keep monitoring jobs, invoices, and automations.</p>}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">AI Business Assistant</h2>
            <p className="mt-1 text-sm text-slate-600">Approval-first only. AI can draft and suggest, but never auto-sends, edits payroll, or changes pricing.</p>
            <div className="mt-3 space-y-2">
              {assistantPrompts.map((prompt) => <div key={prompt} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"><Bot className="mr-2 inline h-4 w-4 text-blue-600" />{prompt}</div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Automation Command Centre</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Active rules</p><p className="text-xl font-black text-slate-900">{model.activeRules}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Recent runs</p><p className="text-xl font-black text-slate-900">{data.runs.length}</p></div>
              <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Failed runs</p><p className="text-xl font-black text-rose-600">{model.failedRuns.length}</p></div>
            </div>
            {!data.rules.length && !data.runs.length && <p className="mt-3 text-sm text-slate-500">Automation engine ready to connect.</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/automation" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Zap className="h-3.5 w-3.5" />Open automation</Link>
              <Link to="/automation/runs" className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Open runs</Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Follow-up & Customer Money</h2>
            <p className="mt-2 text-sm text-slate-600">{model.unpaidInvoices.length} unpaid invoices and {model.openQuotes.length} open quotes to follow up.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/invoices" className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Review unpaid invoices</Link>
              <Link to="/quotes" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Review open quotes</Link>
              <Link to="/follow-ups" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">Open follow-ups</Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-slate-900">Team & Jobs</h2>
            <p className="mt-2 text-sm text-slate-600">{model.jobsNeedingAssignment.length} jobs need worker assignment. {model.todayJobs.length} jobs are on today's schedule.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/jobs/new" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">New job</Link>
              <Link to="/jobs" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">View jobs</Link>
              <Link to="/schedule" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">View schedule</Link>
              {normalizedRole !== "office_admin" ? <Link to="/team" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">View team</Link> : null}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
