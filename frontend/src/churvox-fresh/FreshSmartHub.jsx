import React from "react";
import { useApi } from "../hooks/useApi";

const LIVE_ENDPOINTS = {
  jobs: "/jobs",
  clients: "/clients",
  invoices: "/invoices",
  quotes: "/quotes",
  workers: "/team/workers",
  reviewItems: "/ai-review-items",
};

function asArray(payload, key) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.clients)) return data.clients;
  if (Array.isArray(data?.invoices)) return data.invoices;
  if (Array.isArray(data?.quotes)) return data.quotes;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.reviewItems)) return data.reviewItems;
  return [];
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function amountOf(record) {
  const raw = record?.balance_due ?? record?.amount_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? record?.fixed_price ?? 0;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
}

function dateValue(record, ...keys) {
  const value = pick(record, ...keys);
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function isToday(date) {
  if (!date) return false;
  return date >= startOfToday() && date < endOfToday();
}

function isPast(date) {
  if (!date) return false;
  return date < startOfToday();
}

function timeText(date) {
  if (!date) return "No time set";
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

function dueText(date) {
  if (!date) return "No due date";
  if (isToday(date)) return "Due today";
  if (isPast(date)) return "Overdue";
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function isCompletedJob(job) {
  return ["completed", "complete", "done", "finished"].includes(lower(job?.status || job?.job_status));
}

function isCancelledJob(job) {
  return ["cancelled", "canceled", "archived", "void"].includes(lower(job?.status || job?.job_status));
}

function isPaidInvoice(invoice) {
  return ["paid", "complete", "completed", "closed"].includes(lower(invoice?.status || invoice?.payment_status));
}

function isOverdueInvoice(invoice) {
  const status = lower(invoice?.status || invoice?.payment_status);
  if (status === "overdue") return true;
  if (isPaidInvoice(invoice)) return false;
  return isPast(dateValue(invoice, "due_date", "dueAt", "due", "payment_due"));
}

function isDueTodayInvoice(invoice) {
  if (isPaidInvoice(invoice)) return false;
  return isToday(dateValue(invoice, "due_date", "dueAt", "due", "payment_due"));
}

function jobHasInvoice(job) {
  return Boolean(job?.invoice_id || job?.invoiceId || job?.draft_invoice_id || job?.draftInvoiceId || job?.invoiced || job?.invoice_number);
}

function jobTitle(job) {
  return pick(job, "title", "job_name", "job_title", "service_type", "job_type", "description") || "Untitled job";
}

function clientName(record) {
  return pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name") || "No client";
}

function jobAddress(job) {
  return pick(job, "address", "site_address", "service_address", "job_address") || "No address";
}

function jobWorker(job) {
  return pick(job, "worker", "worker_name", "assigned_worker_name", "assigned_worker", "assigned_to", "assigned_worker_id", "worker_id");
}

function quoteNeedsChase(quote) {
  return !["accepted", "approved", "won", "lost", "declined", "rejected", "cancelled"].includes(lower(quote?.status || quote?.quote_status));
}

function buildToday(data) {
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const workers = data.workers || [];
  const reviewItems = data.reviewItems || [];

  const openJobs = jobs.filter((job) => !isCompletedJob(job) && !isCancelledJob(job));
  const todayJobs = openJobs
    .filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")))
    .sort((a, b) => (dateValue(a, "scheduled_date", "date", "start", "start_time")?.getTime() || 0) - (dateValue(b, "scheduled_date", "date", "start", "start_time")?.getTime() || 0));

  const unassignedToday = todayJobs.filter((job) => !jobWorker(job));
  const completedNeedInvoice = jobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job));
  const overdueInvoices = invoices.filter(isOverdueInvoice);
  const dueTodayInvoices = invoices.filter(isDueTodayInvoice);
  const quotesToChase = quotes.filter(quoteNeedsChase);
  const clientsMissingDetails = clients.filter((client) => !pick(client, "email", "customer_email", "client_email") || !pick(client, "phone", "mobile", "customer_phone"));
  const activeCrew = workers.filter((worker) => ["on job", "onsite", "on site", "active", "working", "available"].includes(lower(worker?.status || worker?.availability || worker?.current_status)) || worker?.current_job_id);

  const needsDoing = [
    ...unassignedToday.map((job) => ({
      type: "Worker needed",
      title: jobTitle(job),
      detail: `${clientName(job)} · ${timeText(dateValue(job, "scheduled_date", "date", "start", "start_time"))}`,
      page: "jobs",
      tone: "warn",
    })),
    ...overdueInvoices.map((invoice) => ({
      type: "Overdue invoice",
      title: clientName(invoice),
      detail: `${money(amountOf(invoice))} overdue`,
      page: "invoices",
      tone: "danger",
    })),
    ...dueTodayInvoices.map((invoice) => ({
      type: "Due today",
      title: clientName(invoice),
      detail: `${money(amountOf(invoice))} due today`,
      page: "invoices",
      tone: "warn",
    })),
    ...completedNeedInvoice.map((job) => ({
      type: "Invoice needed",
      title: jobTitle(job),
      detail: `${clientName(job)} · completed job`,
      page: "jobs",
      tone: "info",
    })),
    ...reviewItems.map((item) => ({
      type: "Review waiting",
      title: item?.title || item?.summary || "Prepared work",
      detail: item?.action || "Needs approval",
      page: "command",
      tone: "info",
    })),
  ].slice(0, 8);

  const overdueMoney = overdueInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const dueTodayMoney = dueTodayInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);

  let message = "Nothing urgent yet. Keep the day moving.";
  if (todayJobs.length && needsDoing.length) message = `You have ${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} today and ${needsDoing.length} thing${needsDoing.length === 1 ? "" : "s"} needing attention.`;
  else if (todayJobs.length) message = `You have ${todayJobs.length} job${todayJobs.length === 1 ? "" : "s"} today.`;
  else if (needsDoing.length) message = `${needsDoing.length} thing${needsDoing.length === 1 ? "" : "s"} need attention today.`;

  return { jobs, clients, invoices, quotes, workers, reviewItems, todayJobs, needsDoing, overdueInvoices, dueTodayInvoices, overdueMoney, dueTodayMoney, activeCrew, quotesToChase, clientsMissingDetails, message };
}

function TodayJobCard({ job, onNavigate }) {
  const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date");
  const status = lower(job?.status || job?.job_status || "ready");
  return (
    <button type="button" className="freshTodayJobCard" onClick={() => onNavigate?.("jobs")}>
      <b>{timeText(when)}</b>
      <strong>{jobTitle(job)}</strong>
      <span>{clientName(job)} · {jobAddress(job)}</span>
      <small>{jobWorker(job) ? `Worker: ${jobWorker(job)}` : "Worker needed"} · {status || "ready"}</small>
    </button>
  );
}

function NeedCard({ item, onNavigate }) {
  return (
    <button type="button" className={`freshTodayNeedCard ${item.tone || ""}`} onClick={() => onNavigate?.(item.page)}>
      <span>{item.type}</span>
      <b>{item.title}</b>
      <small>{item.detail}</small>
    </button>
  );
}

export default function FreshSmartHub({ onNavigate }) {
  const { get } = useApi();
  const [liveData, setLiveData] = React.useState({ jobs: [], clients: [], invoices: [], quotes: [], workers: [], reviewItems: [] });
  const [loading, setLoading] = React.useState(true);
  const [syncError, setSyncError] = React.useState("");
  const [lastSynced, setLastSynced] = React.useState("");

  const loadLiveData = React.useCallback(async () => {
    setLoading(true);
    setSyncError("");
    const next = {};
    const failedCore = [];

    await Promise.all(Object.entries(LIVE_ENDPOINTS).map(async ([key, endpoint]) => {
      try {
        const result = await get(endpoint, { timeout: 25000 });
        if (!result?.success) {
          if (["jobs", "invoices"].includes(key)) failedCore.push(key);
          next[key] = [];
          return;
        }
        next[key] = asArray(result.data, key);
      } catch {
        if (["jobs", "invoices"].includes(key)) failedCore.push(key);
        next[key] = [];
      }
    }));

    setLiveData({
      jobs: next.jobs || [],
      clients: next.clients || [],
      invoices: next.invoices || [],
      quotes: next.quotes || [],
      workers: next.workers || [],
      reviewItems: next.reviewItems || [],
    });

    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    if (failedCore.length) setSyncError(`Could not load ${failedCore.join(", ")}.`);
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadLiveData(); }, [loadLiveData]);

  React.useEffect(() => {
    const refresh = () => loadLiveData();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 45000);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [loadLiveData]);

  const today = React.useMemo(() => buildToday(liveData), [liveData]);

  return (
    <section className="freshSmartPage freshTodayPage">
      <div className="freshTodayHero">
        <div>
          <span>Today</span>
          <h1>Today</h1>
          <p>{today.message}</p>
          <div className="freshSmartSync">
            <b>{loading ? "Checking today..." : "Live data connected"}</b>
            {lastSynced ? <small>Synced {lastSynced}</small> : null}
            <button type="button" onClick={loadLiveData} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
          {syncError ? <p className="freshSmartError">{syncError}</p> : null}
        </div>

        <div className="freshTodayHeroStats">
          <button type="button" onClick={() => onNavigate?.("jobs")}><b>{today.todayJobs.length}</b><small>Jobs today</small></button>
          <button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(today.dueTodayMoney)}</b><small>Due today</small></button>
          <button type="button" onClick={() => onNavigate?.("invoices")}><b>{money(today.overdueMoney)}</b><small>Overdue</small></button>
          <button type="button" onClick={() => onNavigate?.("command")}><b>{today.reviewItems.length}</b><small>Review</small></button>
        </div>
      </div>

      <div className="freshTodayBriefGrid">
        <article className="freshTodayPanel freshTodayPanel--jobs">
          <header>
            <span>Jobs</span>
            <h2>Jobs today</h2>
            <p>Only work scheduled for today.</p>
          </header>

          <div className="freshTodayList">
            {loading && !today.todayJobs.length ? (
              <div className="freshTodayEmpty">Checking jobs...</div>
            ) : today.todayJobs.length ? (
              today.todayJobs.map((job, index) => <TodayJobCard key={pick(job, "id", "_id") || index} job={job} onNavigate={onNavigate} />)
            ) : (
              <div className="freshTodayEmpty">No jobs booked for today.</div>
            )}
          </div>
        </article>

        <article className="freshTodayPanel freshTodayPanel--needs">
          <header>
            <span>Needs doing</span>
            <h2>Needs doing today</h2>
            <p>Things that could block the day or money.</p>
          </header>

          <div className="freshTodayList">
            {today.needsDoing.length ? (
              today.needsDoing.map((item, index) => <NeedCard key={`${item.type}-${index}`} item={item} onNavigate={onNavigate} />)
            ) : (
              <div className="freshTodayEmpty">No urgent blockers showing.</div>
            )}
          </div>
        </article>

        <article className="freshTodayPanel freshTodayPanel--money">
          <header>
            <span>Money</span>
            <h2>Due and overdue</h2>
            <p>Money that needs checking today.</p>
          </header>

          <div className="freshTodayMoneyRows">
            <button type="button" onClick={() => onNavigate?.("invoices")}>
              <b>{money(today.dueTodayMoney)}</b>
              <span>Due today</span>
            </button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>
              <b>{money(today.overdueMoney)}</b>
              <span>Overdue</span>
            </button>
            <button type="button" onClick={() => onNavigate?.("quotes")}>
              <b>{today.quotesToChase.length}</b>
              <span>Quotes still open</span>
            </button>
          </div>
        </article>

        <article className="freshTodayPanel freshTodayPanel--talk">
          <header>
            <span>Talk to me</span>
            <h2>Tell Churvox</h2>
            <p>Tell Churvox what happened, then approve it in Review.</p>
          </header>

          <div className="freshTodayQuickButtons">
            <button type="button" onClick={() => onNavigate?.("quickcreateai")}>Tell Churvox</button>
            <button type="button" onClick={() => onNavigate?.("command")}>Review prepared work</button>
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: "" } }))}>Add job</button>
            <button type="button" onClick={() => window.dispatchEvent(new Event("churvox:open-client-popup"))}>Add client</button>
          </div>
        </article>
      </div>
    </section>
  );
}
