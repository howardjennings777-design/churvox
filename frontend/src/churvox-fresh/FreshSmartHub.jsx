import React from "react";
import { useApi } from "../hooks/useApi";
import FreshNewUserGuide from "./FreshNewUserGuide";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

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
function idOf(record) { return String(record?.id || record?._id || record?.uuid || ""); }
function money(value) { return `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`; }
function amountOf(record) { const raw = record?.balance_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? record?.fixed_price ?? 0; const n = Number(String(raw).replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function dateValue(record, ...keys) { const value = pick(record, ...keys); const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function isToday(date) { if (!date) return false; const now = new Date(); return date.toDateString() === now.toDateString(); }
function isThisWeek(date) { if (!date) return false; const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(now.getDate() - now.getDay()); const end = new Date(start); end.setDate(start.getDate() + 7); return date >= start && date < end; }
function isPaidInvoice(invoice) { return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status)); }
function isOverdueInvoice(invoice) { const status = lower(invoice?.status || invoice?.payment_status); if (status === "overdue") return true; if (isPaidInvoice(invoice)) return false; const due = dateValue(invoice, "due_date", "dueAt", "due", "payment_due"); return Boolean(due && due < new Date()); }
function isCompletedJob(job) { return ["completed", "complete", "done", "finished"].includes(lower(job?.status || job?.job_status)); }
function isCancelledJob(job) { return ["cancelled", "canceled", "archived", "void"].includes(lower(job?.status || job?.job_status)); }
function jobHasInvoice(job) { return Boolean(job?.invoice_id || job?.invoiceId || job?.draft_invoice_id || job?.draftInvoiceId || job?.invoiced || job?.invoice_number); }
function jobWorker(job) { return pick(job, "worker", "worker_name", "assigned_worker_name", "assigned_worker", "assigned_to", "assigned_worker_id", "worker_id"); }
function jobTitle(job) { return pick(job, "title", "job_name", "name", "service", "description") || pick(job, "client_name", "customer_name") || "Job"; }
function clientTitle(client) { return pick(client, "name", "client_name", "customer_name", "business_name", "email") || "Client"; }
function invoiceTitle(invoice) { return pick(invoice, "customer_name", "client_name", "name", "email") || "Invoice"; }
function quoteTitle(quote) { return pick(quote, "title", "customer_name", "client_name", "name", "email") || "Quote"; }
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
  const activeJobs = openJobs.filter((job) => ["in progress", "in_progress", "started", "paused", "assigned", "ready", "scheduled", "booked"].includes(lower(job?.status || job?.job_status)));
  const todayJobs = openJobs.filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const weekJobs = openJobs.filter((job) => isThisWeek(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const unassignedJobs = openJobs.filter((job) => !jobWorker(job));
  const completedReadyToInvoice = jobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job));
  const owingInvoices = invoices.filter((invoice) => {
    const status = lower(invoice?.status || invoice?.payment_status);
    return ["sent", "open", "unpaid", "overdue", "part paid", "partial"].includes(status) || isOverdueInvoice(invoice);
  });
  const overdueInvoices = invoices.filter(isOverdueInvoice);
  const draftInvoices = invoices.filter((invoice) => ["draft", "pending", ""].includes(lower(invoice?.status)));
  const quotesToChase = quotes.filter(quoteNeedsChase);
  const acceptedQuotes = quotes.filter((quote) => ["accepted", "approved", "won"].includes(lower(quote?.status || quote?.quote_status)));
  const clientsMissingDetails = clients.filter((client) => !pick(client, "email") || !pick(client, "phone", "mobile"));
  const liveCrew = workers.filter((worker) => ["on job", "onsite", "on site", "active", "working", "available"].includes(lower(worker?.status || worker?.availability || worker?.current_status)) || worker?.current_job_id);
  const owingAmount = owingInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const readyToInvoiceAmount = completedReadyToInvoice.reduce((sum, job) => sum + amountOf(job), 0) + draftInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);

  const commandPreview = [];
  overdueInvoices.slice(0, 2).forEach((invoice) => commandPreview.push({ id: `invoice-overdue-${idOf(invoice) || commandPreview.length}`, title: `Chase overdue invoice · ${invoiceTitle(invoice)}`, found: `${invoiceTitle(invoice)} has ${money(amountOf(invoice))} outstanding.`, prepared: "Review and approve a payment reminder.", why: "Overdue invoices affect cashflow.", page: "invoices", source: "Live invoice" }));
  completedReadyToInvoice.slice(0, 2).forEach((job) => commandPreview.push({ id: `job-ready-invoice-${idOf(job) || commandPreview.length}`, title: `Ready to invoice · ${jobTitle(job)}`, found: `${jobTitle(job)} is completed and has no invoice attached.`, prepared: `Review invoice for ${money(amountOf(job))}.`, why: "Completed work should turn into money quickly.", page: "invoices", source: "Live job" }));
  unassignedJobs.slice(0, 2).forEach((job) => commandPreview.push({ id: `job-unassigned-${idOf(job) || commandPreview.length}`, title: `Assign worker · ${jobTitle(job)}`, found: `${jobTitle(job)} has no worker assigned.`, prepared: "Assign a worker before it becomes a dispatch problem.", why: "Unassigned jobs are easy to miss.", page: "jobs", source: "Live job" }));
  quotesToChase.slice(0, 2).forEach((quote) => commandPreview.push({ id: `quote-follow-${idOf(quote) || commandPreview.length}`, title: `Follow up quote · ${quoteTitle(quote)}`, found: `${quoteTitle(quote)} is still ${pick(quote, "status", "quote_status") || "open"}.`, prepared: "Approve a follow-up or update the quote status.", why: "Open quotes are possible work not yet won.", page: "quotes", source: "Live quote" }));
  clientsMissingDetails.slice(0, 2).forEach((client) => commandPreview.push({ id: `client-missing-${idOf(client) || commandPreview.length}`, title: `Complete client details · ${clientTitle(client)}`, found: `${clientTitle(client)} is missing email or phone details.`, prepared: "Complete the client record.", why: "Missing details block quotes, messages and invoices.", page: "clients", source: "Live client" }));
  actions.slice(0, 2).forEach((action) => commandPreview.push({ id: `ai-action-${idOf(action) || commandPreview.length}`, title: pick(action, "title", "summary", "subject") || "AI action ready", found: pick(action, "found", "message", "reason", "description") || "AI operator found admin work.", prepared: pick(action, "prepared", "body", "suggestion") || "Review the prepared action.", why: pick(action, "why") || "Owner approval is needed before anything changes.", page: "command", source: "Live AI action" }));
  notifications.slice(0, 2).forEach((notification) => commandPreview.push({ id: `notification-${idOf(notification) || commandPreview.length}`, title: pick(notification, "title", "subject", "summary") || "Alert needs review", found: pick(notification, "message", "body", "description") || "A live alert was found.", prepared: "Open alerts and review it.", why: "Important alerts should not be buried.", page: "alerts", source: "Live alert" }));

  return { jobs, clients, invoices, quotes, workers, actions, notifications, openJobs, activeJobs, todayJobs, weekJobs, unassignedJobs, completedReadyToInvoice, owingInvoices, overdueInvoices, draftInvoices, quotesToChase, acceptedQuotes, clientsMissingDetails, liveCrew, owingAmount, overdueAmount, readyToInvoiceAmount, commandPreview };
}

function sendToCommand(action, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const slip = { id: `smart-preview-${action.id || Date.now()}`, group: "Smart Hub preview", title: action.title, info: action.source || "Live data", urgency: "High", found: action.found, prepared: action.prepared, why: action.why, owner: "Approve, edit, ignore, or open the related page.", area: "Smart Hub", page: action.page || "smart", fromInbox: true, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...(Array.isArray(current) ? current : [])].slice(0, 30)));
  } catch {}
  onNavigate?.("command");
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
      } catch { failed.push(key); next[key] = []; }
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
  const topCommand = overview.commandPreview.slice(0, 3);

  return (
    <section className="freshSmartPage">
      <div className="freshSmartHero">
        <div>
          <span>Smart Hub</span>
          <h1>Your business overview, not the approval desk.</h1>
          <p>Smart Hub shows what is happening today: jobs, money waiting, worker gaps, setup health and a small preview of Command actions.</p>
          <div className="freshSmartSync">
            <b>{loading ? "Syncing live data..." : "Live business data connected"}</b>
            {lastSynced ? <small>Last synced {lastSynced}</small> : null}
            <button type="button" onClick={loadLiveData} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
          {syncError ? <p className="freshSmartError">{syncError}</p> : null}
        </div>
        <div className="freshSmartStats">
          <div><b>{overview.todayJobs.length}</b><small>jobs today</small></div>
          <div><b>{money(overview.owingAmount)}</b><small>money waiting</small></div>
          <div><b>{overview.unassignedJobs.length}</b><small>worker gaps</small></div>
          <div><b>{topCommand.length}</b><small>command previews</small></div>
        </div>
      </div>

      <FreshNewUserGuide onNavigate={onNavigate} mode="compact" />

      <div className="freshSmartGrid">
        <article className="freshSmartPanel freshSmartWide">
          <header><span>Today / this week</span><h2>Business pulse</h2><p>This is the owner overview: live jobs, crew status and where work may get stuck.</p></header>
          <div className="freshSmartFlow">
            <MetricButton value={overview.todayJobs.length} label="jobs today" page="jobs" onNavigate={onNavigate} />
            <MetricButton value={overview.weekJobs.length} label="jobs this week" page="jobs" onNavigate={onNavigate} />
            <MetricButton value={overview.activeJobs.length} label="active jobs" page="dispatch" onNavigate={onNavigate} />
            <MetricButton value={overview.liveCrew.length} label="crew active" page="team" onNavigate={onNavigate} />
            <MetricButton value={overview.unassignedJobs.length} label="need workers" page="jobs" onNavigate={onNavigate} />
            <MetricButton value={overview.acceptedQuotes.length} label="accepted quotes" page="quotes" onNavigate={onNavigate} />
          </div>
        </article>

        <article className="freshSmartPanel">
          <header><span>Money</span><h2>Cash waiting</h2><p>Quick money view. Command handles the approval work.</p></header>
          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => onNavigate?.("invoices")}>{money(overview.owingAmount)} owing</button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>{money(overview.overdueAmount)} overdue</button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>{money(overview.readyToInvoiceAmount)} ready to invoice</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>{overview.completedReadyToInvoice.length} completed jobs need invoice</button>
          </div>
        </article>

        <article className="freshSmartPanel">
          <header><span>Setup health</span><h2>Things that block admin</h2><p>Fix these to make quotes, messages, invoices and Command stronger.</p></header>
          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => onNavigate?.("clients")}>{overview.clientsMissingDetails.length} clients missing contact details</button>
            <button type="button" onClick={() => onNavigate?.("quotes")}>{overview.quotesToChase.length} quotes still open</button>
            <button type="button" onClick={() => onNavigate?.("team")}>{overview.workers.length} workers on file</button>
            <button type="button" onClick={() => onNavigate?.("settings")}>Open business setup</button>
          </div>
        </article>

        <article className="freshSmartPanel freshSmartWide">
          <header><span>Command preview</span><h2>Top decisions only</h2><p>Smart Hub only previews the top 3 decisions. Use Command for the full approve / decline / edit desk.</p></header>
          <div className="freshSmartActions">
            {topCommand.length ? topCommand.map((action) => (
              <section key={action.id}>
                <div><b>{action.title}</b><p>{action.found}</p><small className="freshSmartSource">{action.source}</small></div>
                <div className="freshSmartActionButtons"><button type="button" onClick={() => sendToCommand(action, onNavigate)}>Review in Command</button><button type="button" onClick={() => onNavigate?.(action.page)}>Open area</button></div>
              </section>
            )) : <div className="freshSmartEmpty"><b>{loading ? "Loading live overview..." : "No Command previews right now."}</b><p>When money, jobs, quotes or setup need owner decisions, the top 3 will appear here.</p></div>}
          </div>
          <div className="freshSmartLaunchButtons" style={{ marginTop: 14 }}><button type="button" onClick={() => onNavigate?.("command")}>Open full Command desk</button></div>
        </article>
      </div>
    </section>
  );
}
