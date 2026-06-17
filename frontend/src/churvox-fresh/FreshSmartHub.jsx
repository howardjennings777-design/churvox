import React from "react";
import { useApi } from "../hooks/useApi";
import FreshNewUserGuide from "./FreshNewUserGuide";

const LIVE_ENDPOINTS = {
  jobs: "/jobs",
  clients: "/clients",
  invoices: "/invoices",
  quotes: "/quotes",
  workers: "/team/workers",
  actions: "/ai/actions",
  notifications: "/notifications",
};

function asArray(payload, key) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  if (Array.isArray(payload?.clients)) return payload.clients;
  if (Array.isArray(payload?.invoices)) return payload.invoices;
  if (Array.isArray(payload?.quotes)) return payload.quotes;
  if (Array.isArray(payload?.workers)) return payload.workers;
  if (Array.isArray(payload?.actions)) return payload.actions;
  if (Array.isArray(payload?.notifications)) return payload.notifications;
  return [];
}

function lower(value) { return String(value || "").trim().toLowerCase(); }
function pick(record, ...keys) { for (const key of keys) { const value = record?.[key]; if (value !== undefined && value !== null && String(value).trim() !== "") return value; } return ""; }
function amountOf(record) { const raw = record?.balance_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? record?.fixed_price ?? 0; const n = Number(String(raw).replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function money(value) { return `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`; }
function dateValue(record, ...keys) { const value = pick(record, ...keys); const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function isToday(date) { if (!date) return false; return date.toDateString() === new Date().toDateString(); }
function isThisWeek(date) { if (!date) return false; const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(now.getDate() - now.getDay()); const end = new Date(start); end.setDate(start.getDate() + 7); return date >= start && date < end; }
function isPaidInvoice(invoice) { return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status)); }
function isOverdueInvoice(invoice) { const status = lower(invoice?.status || invoice?.payment_status); if (status === "overdue") return true; if (isPaidInvoice(invoice)) return false; const due = dateValue(invoice, "due_date", "dueAt", "due", "payment_due"); return Boolean(due && due < new Date()); }
function isCompletedJob(job) { return ["completed", "complete", "done", "finished"].includes(lower(job?.status || job?.job_status)); }
function isCancelledJob(job) { return ["cancelled", "canceled", "archived", "void"].includes(lower(job?.status || job?.job_status)); }
function jobHasInvoice(job) { return Boolean(job?.invoice_id || job?.invoiceId || job?.draft_invoice_id || job?.draftInvoiceId || job?.invoiced || job?.invoice_number); }
function jobWorker(job) { return pick(job, "worker", "worker_name", "assigned_worker_name", "assigned_worker", "assigned_to", "assigned_worker_id", "worker_id"); }
function quoteNeedsChase(quote) { return !["accepted", "approved", "won", "lost", "declined", "rejected", "cancelled"].includes(lower(quote?.status || quote?.quote_status)); }

function buildOverview(data) {
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const workers = data.workers || [];
  const actions = data.actions || [];
  const notifications = data.notifications || [];

  const openJobs = jobs.filter((job) => !isCompletedJob(job) && !isCancelledJob(job));
  const todayJobs = openJobs.filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const weekJobs = openJobs.filter((job) => isThisWeek(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const activeJobs = openJobs.filter((job) => ["in progress", "in_progress", "started", "paused", "assigned", "ready", "scheduled", "booked"].includes(lower(job?.status || job?.job_status)));
  const unassignedJobs = openJobs.filter((job) => !jobWorker(job));
  const completedReadyToInvoice = jobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job));
  const owingInvoices = invoices.filter((invoice) => ["sent", "open", "unpaid", "overdue", "part paid", "partial"].includes(lower(invoice?.status || invoice?.payment_status)) || isOverdueInvoice(invoice));
  const overdueInvoices = invoices.filter(isOverdueInvoice);
  const draftInvoices = invoices.filter((invoice) => ["draft", "pending", ""].includes(lower(invoice?.status)));
  const quotesToChase = quotes.filter(quoteNeedsChase);
  const acceptedQuotes = quotes.filter((quote) => ["accepted", "approved", "won"].includes(lower(quote?.status || quote?.quote_status)));
  const clientsMissingDetails = clients.filter((client) => !pick(client, "email") || !pick(client, "phone", "mobile"));
  const liveCrew = workers.filter((worker) => ["on job", "onsite", "on site", "active", "working", "available"].includes(lower(worker?.status || worker?.availability || worker?.current_status)) || worker?.current_job_id);
  const owingAmount = owingInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const readyToInvoiceAmount = completedReadyToInvoice.reduce((sum, job) => sum + amountOf(job), 0) + draftInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const commandCount = overdueInvoices.length + completedReadyToInvoice.length + unassignedJobs.length + quotesToChase.length + clientsMissingDetails.length + actions.length + notifications.length;

  return { jobs, clients, invoices, quotes, workers, openJobs, todayJobs, weekJobs, activeJobs, unassignedJobs, completedReadyToInvoice, owingInvoices, overdueInvoices, draftInvoices, quotesToChase, acceptedQuotes, clientsMissingDetails, liveCrew, owingAmount, overdueAmount, readyToInvoiceAmount, commandCount };
}

function MetricButton({ value, label, page, onNavigate }) {
  return <button type="button" onClick={() => onNavigate?.(page)}><b>{value}</b><small>{label}</small></button>;
}

export default function FreshSmartHub({ onNavigate }) {
  const { get } = useApi();
  const [liveData, setLiveData] = React.useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], actions: [], notifications: [] });
  const [loading, setLoading] = React.useState(true);
  const [syncError, setSyncError] = React.useState("");
  const [lastSynced, setLastSynced] = React.useState("");

  const loadLiveData = React.useCallback(async () => {
    setLoading(true);
    setSyncError("");
    const next = {};
    const failed = [];
    await Promise.all(Object.entries(LIVE_ENDPOINTS).map(async ([key, endpoint]) => {
      try {
        const result = await get(endpoint);
        if (!result?.success) { failed.push(key); next[key] = []; return; }
        next[key] = asArray(result.data, key);
      } catch {
        failed.push(key);
        next[key] = [];
      }
    }));
    setLiveData({ jobs: next.jobs || [], clients: next.clients || [], invoices: next.invoices || [], quotes: next.quotes || [], workers: next.workers || [], actions: next.actions || [], notifications: next.notifications || [] });
    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    if (failed.length) setSyncError(`Some live data could not load: ${failed.join(", ")}.`);
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadLiveData(); }, [loadLiveData]);
  React.useEffect(() => {
    const refresh = () => loadLiveData();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 45000);
    return () => { window.removeEventListener("churvox:fresh-data-updated", refresh); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [loadLiveData]);

  const overview = React.useMemo(() => buildOverview(liveData), [liveData]);

  return (
    <section className="freshSmartPage">
      <div className="freshSmartHero freshSmartHero--today">
        <div>
          <span>Today</span>
          <h1>What needs doing?</h1>
          <p>A clean daily view of jobs, money, crew gaps and admin waiting for you.</p>
          <div className="freshSmartSync"><b>{loading ? "Refreshing live data..." : "Live data connected"}</b>{lastSynced ? <small>Synced {lastSynced}</small> : null}<button type="button" onClick={loadLiveData} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button></div>
          {syncError ? <p className="freshSmartError">{syncError}</p> : null}
        </div>
        <div className="freshSmartStats freshSmartStats--today">
          <button type="button" onClick={() => onNavigate?.("jobs")}><b>{overview.todayJobs.length}</b><small>Jobs today</small></button>
          <button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(overview.owingAmount)}</b><small>Money waiting</small></button>
          <button type="button" onClick={() => onNavigate?.("jobs")}><b>{overview.unassignedJobs.length}</b><small>Need worker</small></button>
          <button type="button" onClick={() => onNavigate?.("command")}><b>{overview.commandCount}</b><small>Need review</small></button>
        </div>
      </div>

      <FreshNewUserGuide onNavigate={onNavigate} mode="compact" />

      <div className="freshSmartTodayGrid">
        <article className="freshSmartPanel freshSmartPanel--main">
          <header><span>Work</span><h2>Today and this week</h2><p>Open jobs, schedule or crew from here.</p></header>
          <div className="freshSmartActionGrid">
            <button type="button" onClick={() => onNavigate?.("jobs")}><b>{overview.todayJobs.length}</b><span>Jobs today</span><small>Open job board</small></button>
            <button type="button" onClick={() => onNavigate?.("jobs")}><b>{overview.weekJobs.length}</b><span>This week</span><small>See upcoming work</small></button>
            <button type="button" onClick={() => onNavigate?.("dispatch")}><b>{overview.activeJobs.length}</b><span>Active jobs</span><small>Open schedule</small></button>
            <button type="button" onClick={() => onNavigate?.("team")}><b>{overview.liveCrew.length}</b><span>Crew active</span><small>Check team</small></button>
          </div>
        </article>

        <article className="freshSmartPanel freshSmartPanel--quick">
          <header><span>Quick create</span><h2>Add work fast</h2><p>Pop-up forms stay on this screen.</p></header>
          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: "" } }))}>Add job</button>
            <button type="button" onClick={() => window.dispatchEvent(new Event("churvox:open-client-popup"))}>Add client</button>
            <button type="button" onClick={() => onNavigate?.("quickcreateai")}>Tell Churvox</button>
            <button type="button" onClick={() => onNavigate?.("command")}>Review prepared work</button>
          </div>
        </article>

        <article className="freshSmartPanel">
          <header><span>Money</span><h2>Cash waiting</h2><p>Invoices and completed jobs that may need attention.</p></header>
          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => onNavigate?.("invoices")}>{money(overview.owingAmount)} owing</button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>{money(overview.overdueAmount)} overdue</button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>{money(overview.readyToInvoiceAmount)} ready to invoice</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>{overview.completedReadyToInvoice.length} completed jobs need invoice</button>
          </div>
        </article>

        <article className="freshSmartPanel">
          <header><span>Needs action</span><h2>Admin blockers</h2><p>Fix these so Churvox can prepare cleaner admin.</p></header>
          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => onNavigate?.("clients")}>{overview.clientsMissingDetails.length} clients missing contact details</button>
            <button type="button" onClick={() => onNavigate?.("quotes")}>{overview.quotesToChase.length} quotes still open</button>
            <button type="button" onClick={() => onNavigate?.("team")}>{overview.workers.length} workers on file</button>
            <button type="button" onClick={() => onNavigate?.("settings")}>Open business setup</button>
          </div>
        </article>
      </div>
    </section>
  );
}
