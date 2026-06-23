import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";

const ENDPOINTS = {
  jobs: "/jobs",
  workers: "/team/workers",
  clients: "/clients",
  invoices: "/invoices",
};

function asArray(payload, key) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.[key])) return data[key];
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

function idText(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idText(value.$oid || value.oid || value.id || value._id || value.job_id || value.invoice_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function recordId(record, ...keys) {
  for (const key of keys) {
    const text = idText(record?.[key]);
    if (text) return text;
  }
  return idText(record?.id || record?._id || record?.job_id || "");
}

function todayInputValue(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function dateFromInput(value) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function addDays(value, days) {
  const d = dateFromInput(value);
  d.setDate(d.getDate() + days);
  return todayInputValue(d);
}

function dateValue(record, ...keys) {
  const value = pick(record, ...keys);
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function sameInputDay(date, inputValue) {
  if (!date) return false;
  return todayInputValue(date) === inputValue;
}

function timeText(date) {
  if (!date) return "No time";
  const hasTime = date.getHours() || date.getMinutes();
  if (!hasTime) return "All day";
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

function longDay(value) {
  const date = dateFromInput(value);
  return date.toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function money(value) {
  const n = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return `$${Number.isFinite(n) ? n.toLocaleString("en-NZ", { maximumFractionDigits: 0 }) : "0"}`;
}

function isCompletedJob(job) {
  return ["completed", "complete", "done", "finished"].includes(lower(job?.status || job?.job_status));
}

function isCancelledJob(job) {
  return ["cancelled", "canceled", "archived", "void"].includes(lower(job?.status || job?.job_status));
}

function invoiceJobId(invoice) {
  return recordId(invoice, "job_id", "linked_job_id", "jobId", "linkedJobId", "source_job_id", "sourceJobId");
}

function jobHasInvoice(job, invoicedJobIds = new Set()) {
  const directInvoice = Boolean(
    job?.invoice_id ||
    job?.linked_invoice_id ||
    job?.invoiceId ||
    job?.linkedInvoiceId ||
    job?.draft_invoice_id ||
    job?.draftInvoiceId ||
    job?.invoiced ||
    job?.invoice_number ||
    job?.invoice_status
  );
  const id = recordId(job, "id", "_id", "job_id");
  return directInvoice || Boolean(id && invoicedJobIds.has(id));
}

function amountOf(record) {
  const raw = record?.balance_due ?? record?.amount_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? record?.fixed_price ?? 0;
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
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

function statusLabel(job) {
  return pick(job, "status", "job_status") || "Ready";
}

function openJobModal(text = "Create job from Plan My Day") {
  try {
    window.localStorage.setItem("churvox:fresh-open-job-modal:v1", JSON.stringify({ open: true, instruction: text, text, at: Date.now() }));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text, instruction: text, source: "plan-my-day" } }));
  } catch {}
}

function JobCard({ job, invoicedJobIds, onNavigate }) {
  const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date");
  const completed = isCompletedJob(job);
  const hasInvoice = jobHasInvoice(job, invoicedJobIds);
  const needsInvoice = completed && !hasInvoice;
  const worker = jobWorker(job);

  return (
    <button type="button" className={`freshTodayWorkJob ${completed ? "done" : ""} ${needsInvoice ? "needsInvoice" : ""}`} onClick={() => onNavigate?.("jobs")}>
      <div className="freshTodayWorkTime">
        <b>{timeText(when)}</b>
        <span>{statusLabel(job)}</span>
      </div>
      <div className="freshTodayWorkBody">
        <strong>{jobTitle(job)}</strong>
        <span>{clientName(job)}</span>
        <small>{jobAddress(job)}</small>
      </div>
      <div className="freshTodayWorkMeta">
        <span>{worker || "No worker"}</span>
        {needsInvoice ? <b>Need invoice</b> : hasInvoice ? <b className="ok">Invoice ready</b> : <b className="muted">No invoice yet</b>}
      </div>
    </button>
  );
}

export default function FreshTodaysWork({ onNavigate }) {
  const { get } = useApi();
  const [selectedDate, setSelectedDate] = React.useState(() => todayInputValue());
  const [quickAsk, setQuickAsk] = React.useState("");
  const [data, setData] = React.useState({ jobs: [], workers: [], clients: [], invoices: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [lastSynced, setLastSynced] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const next = {};
    const failed = [];

    await Promise.all(
      Object.entries(ENDPOINTS).map(async ([key, endpoint]) => {
        try {
          const result = await get(endpoint, { timeout: 25000 });
          if (!result?.success) {
            next[key] = [];
            if (key === "jobs") failed.push(key);
            return;
          }
          next[key] = hideDemoRecords(asArray(result.data, key));
        } catch {
          next[key] = [];
          if (key === "jobs") failed.push(key);
        }
      })
    );

    setData({
      jobs: next.jobs || [],
      workers: next.workers || [],
      clients: next.clients || [],
      invoices: next.invoices || [],
    });
    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    if (failed.length) setError(`Could not load ${failed.join(", ")}.`);
    setLoading(false);
  }, [get]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    const refresh = () => load();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 45000);
    return () => {
      window.removeEventListener("churvox:fresh-data-updated", refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [load]);

  const invoicedJobIds = React.useMemo(() => new Set(data.invoices.map(invoiceJobId).filter(Boolean)), [data.invoices]);

  const dayJobs = React.useMemo(() => {
    return data.jobs
      .filter((job) => !isCancelledJob(job))
      .filter((job) => sameInputDay(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date"), selectedDate))
      .sort((a, b) => {
        const ad = dateValue(a, "scheduled_date", "date", "start", "start_time", "due_date")?.getTime() || 0;
        const bd = dateValue(b, "scheduled_date", "date", "start", "start_time", "due_date")?.getTime() || 0;
        return ad - bd;
      });
  }, [data.jobs, selectedDate]);

  const completed = dayJobs.filter(isCompletedJob);
  const unassigned = dayJobs.filter((job) => !jobWorker(job));
  const needInvoice = dayJobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job, invoicedJobIds));
  const activeWorkers = data.workers.filter((worker) => ["on job", "onsite", "on site", "active", "working", "available"].includes(lower(worker?.status || worker?.availability || worker?.current_status)) || worker?.current_job_id);

  function addJob() {
    openJobModal(`Create a job for ${longDay(selectedDate)}`);
    onNavigate?.("jobs");
    [150, 450, 900].forEach((delay) => window.setTimeout(() => openJobModal(`Create a job for ${longDay(selectedDate)}`), delay));
  }

  function submitQuickAsk(event) {
    event?.preventDefault?.();
    const text = quickAsk.trim();
    const clean = text.toLowerCase();

    if (!text) return;

    if (clean.includes("client") || clean.includes("customer")) {
      try { window.localStorage.setItem("churvox:fresh-open-client-modal:v1", "true"); } catch {}
      onNavigate?.("clients");
      return;
    }

    if (clean.includes("unpaid") || clean.includes("overdue") || clean.includes("payment") || clean.includes("money")) {
      onNavigate?.("payments");
      return;
    }

    if (clean.includes("invoice")) {
      onNavigate?.("invoices");
      return;
    }

    if (clean.includes("command") || clean.includes("approve") || clean.includes("review")) {
      onNavigate?.("command");
      return;
    }

    if (clean.includes("job") || clean.includes("book") || clean.includes("work") || clean.includes("mow") || clean.includes("clean")) {
      openJobModal(text);
      onNavigate?.("jobs");
      [150, 450, 900].forEach((delay) => window.setTimeout(() => openJobModal(text), delay));
      return;
    }

    onNavigate?.("command");
  }

  return (
    <section className="freshTodayWorkPage">
      <header className="freshTodayWorkHero">
        <div>
          <span>Home</span>
          <h1>Plan My Day</h1>
          <p>Jobs, worker gaps and invoice admin for {longDay(selectedDate)} in one owner cockpit.</p>
          <div className="freshTodayWorkSync">
            <b>{loading ? "Checking day plan..." : "Live day plan loaded"}</b>
            {lastSynced ? <small>Updated {lastSynced}</small> : null}
            <button type="button" onClick={load} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
          </div>
          {error ? <p className="freshTodayWorkError">{error}</p> : null}
        </div>

        <div className="freshTodayWorkStats">
          <button type="button" onClick={() => onNavigate?.("jobs")}><b>{dayJobs.length}</b><span>Jobs</span></button>
          <button type="button" onClick={() => onNavigate?.("jobs")}><b>{unassigned.length}</b><span>No worker</span></button>
          <button type="button" onClick={() => onNavigate?.("invoices")}><b>{needInvoice.length}</b><span>Need invoice</span></button>
          <button type="button" onClick={() => onNavigate?.("workercommand")}><b>{activeWorkers.length}</b><span>Active workers</span></button>
        </div>
      </header>

      <form className="freshTodayWorkAsk" onSubmit={submitQuickAsk}>
        <label>
          <span>What do you want to do?</span>
          <input
            value={quickAsk}
            onChange={(event) => setQuickAsk(event.target.value)}
            placeholder="Add job, open invoices, show unpaid money..."
          />
        </label>
        <button type="submit">Ask Churvox</button>
      </form>

      <section className="freshTodayWorkToolbar">
        <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>Yesterday</button>
        <button type="button" onClick={() => setSelectedDate(todayInputValue())}>Today</button>
        <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Tomorrow</button>
        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
        <button type="button" className="primary" onClick={addJob}>Add job</button>
        <button type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
      </section>

      <section className="freshTodayWorkBoard">
        <article className="freshTodayWorkMain">
          <header>
            <span>Daily plan</span>
            <h2>{longDay(selectedDate)}</h2>
            <p>{dayJobs.length ? `${dayJobs.length} job${dayJobs.length === 1 ? "" : "s"} booked.` : "No jobs booked for this day."}</p>
          </header>

          <div className="freshTodayWorkList">
            {loading && !dayJobs.length ? (
              <div className="freshTodayWorkEmpty">Checking day jobs...</div>
            ) : dayJobs.length ? (
              dayJobs.map((job, index) => <JobCard key={recordId(job, "id", "_id") || index} job={job} invoicedJobIds={invoicedJobIds} onNavigate={onNavigate} />)
            ) : (
              <div className="freshTodayWorkEmpty">
                <b>No jobs booked.</b>
                <span>Add a job or pick another day.</span>
                <button type="button" onClick={addJob}>Add job for this day</button>
              </div>
            )}
          </div>
        </article>

        <aside className="freshTodayWorkSide">
          <article>
            <span>Progress</span>
            <h3>{completed.length}/{dayJobs.length}</h3>
            <p>Completed jobs for this day</p>
          </article>
          <article>
            <span>Money next</span>
            <h3>{needInvoice.length}</h3>
            <p>Completed jobs needing an invoice</p>
          </article>
          <article>
            <span>Work value</span>
            <h3>{money(dayJobs.reduce((sum, job) => sum + amountOf(job), 0))}</h3>
            <p>Estimated value from listed jobs</p>
          </article>
        </aside>
      </section>
    </section>
  );
}
