import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshAdminDebtRadar.css";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const ENDPOINTS = {
  jobs: "/jobs",
  workers: "/team/workers",
  clients: "/clients",
  invoices: "/invoices",
  quotes: "/quotes",
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
  return idText(record?.id || record?._id || record?.job_id || record?.quote_id || record?.invoice_id || "");
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

function ageDays(date) {
  if (!date) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
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
  const raw = record?.balance_due ?? record?.amount_due ?? record?.balance ?? record?.total ?? record?.amount ?? record?.price ?? record?.job_price ?? record?.fixed_price ?? record?.quote_total ?? record?.invoice_total ?? 0;
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

function invoiceStatus(invoice) {
  return lower(invoice?.status || invoice?.invoice_status || invoice?.payment_status);
}

function invoiceNumber(invoice) {
  return pick(invoice, "invoice_number", "number", "invoice_id", "id", "_id") || "invoice";
}

function isUnpaidInvoice(invoice) {
  const status = invoiceStatus(invoice);
  if (["paid", "void", "cancelled", "canceled", "draft"].includes(status)) return false;
  return amountOf(invoice) > 0 || ["sent", "viewed", "overdue", "unpaid", "part_paid", "partial"].includes(status);
}

function quoteTitle(quote) {
  return pick(quote, "title", "quote_title", "service_type", "job_title", "description") || "Quote";
}

function quoteIsCold(quote) {
  const status = lower(quote?.status || quote?.quote_status || "draft");
  if (["accepted", "approved", "won", "declined", "rejected", "lost", "converted", "invoiced", "archived"].includes(status)) return false;
  const date = dateValue(quote, "sent_at", "created_at", "updated_at", "date", "quote_date");
  return ageDays(date) >= 5;
}

function hasWorkerProof(job) {
  return Boolean(
    job?.worker_completion_notes ||
    job?.worker_notes ||
    job?.proof_note ||
    job?.completion_note ||
    (Array.isArray(job?.photos) && job.photos.length) ||
    (Array.isArray(job?.proof_photos) && job.proof_photos.length) ||
    (Array.isArray(job?.done_properly_checklist) && job.done_properly_checklist.length)
  );
}

function openJobModal(text = "Create job from Today's Plan") {
  try {
    window.localStorage.setItem("churvox:fresh-open-job-modal:v1", JSON.stringify({ open: true, instruction: text, text, at: Date.now() }));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text, instruction: text, source: "todays-plan" } }));
  } catch {}
}

function pushCommandNote(item) {
  try {
    if (typeof window === "undefined") return false;
    const raw = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(current) ? current : [];
    items.unshift({
      id: `admin-debt-${item.id || Date.now()}`,
      source: "admin-debt-radar",
      category: item.type,
      action: item.commandAction,
      title: item.title,
      summary: item.summary,
      found: item.found,
      prepared: item.prepared,
      why: item.why,
      details: item.details,
      page: item.page,
      created_at: new Date().toISOString(),
    });
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify(items.slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated"));
    return true;
  } catch {
    return false;
  }
}

function buildAdminDebtItems({ jobs, invoices, quotes, invoicedJobIds }) {
  const items = [];
  const openJobs = jobs.filter((job) => !isCancelledJob(job));

  openJobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job, invoicedJobIds)).slice(0, 8).forEach((job) => {
    items.push({
      id: `job-no-invoice-${recordId(job, "id", "_id", "job_id")}`,
      type: "Money waiting",
      page: "invoices",
      priority: 100,
      commandAction: "Prepare invoice form",
      title: `${jobTitle(job)} needs an invoice`,
      summary: `${clientName(job)} is done but not invoiced.`,
      found: `Completed job: ${jobTitle(job)} for ${clientName(job)} at ${jobAddress(job)}.`,
      prepared: "Fill the invoice form from the completed job and hold it for owner approval.",
      why: "Completed work is not money until the invoice step is approved.",
      amount: amountOf(job),
      details: { customer_name: clientName(job), job_title: jobTitle(job), address: jobAddress(job), price: money(amountOf(job)), worker_name: jobWorker(job), status: statusLabel(job) },
    });
  });

  invoices.filter(isUnpaidInvoice).slice(0, 8).forEach((invoice) => {
    const due = dateValue(invoice, "due_date", "due", "created_at", "date");
    items.push({
      id: `unpaid-invoice-${recordId(invoice, "id", "_id", "invoice_id")}`,
      type: "Unpaid money",
      page: "invoices",
      priority: 88 + Math.min(ageDays(due), 20),
      commandAction: "Prepare payment follow-up",
      title: `${invoiceNumber(invoice)} needs follow-up`,
      summary: `${clientName(invoice)} has ${money(amountOf(invoice))} still unpaid.`,
      found: `Invoice ${invoiceNumber(invoice)} is ${invoiceStatus(invoice) || "unpaid"}.`,
      prepared: "Prepare a polite payment follow-up for owner approval.",
      why: "The boss should not hunt for unpaid invoices manually.",
      amount: amountOf(invoice),
      details: { customer_name: clientName(invoice), invoice: invoiceNumber(invoice), amount: money(amountOf(invoice)), status: invoiceStatus(invoice) || "unpaid" },
    });
  });

  quotes.filter(quoteIsCold).slice(0, 8).forEach((quote) => {
    const date = dateValue(quote, "sent_at", "created_at", "updated_at", "date", "quote_date");
    items.push({
      id: `quote-followup-${recordId(quote, "id", "_id", "quote_id")}`,
      type: "Quote follow-up",
      page: "quotes",
      priority: 72 + Math.min(ageDays(date), 18),
      commandAction: "Prepare quote follow-up",
      title: `${quoteTitle(quote)} needs a nudge`,
      summary: `${clientName(quote)} quote is ${ageDays(date)} days old.`,
      found: `Open quote for ${clientName(quote)} is still waiting.`,
      prepared: "Prepare a short quote follow-up message for owner approval.",
      why: "Old quotes quietly leak work unless the follow-up is ready.",
      amount: amountOf(quote),
      details: { customer_name: clientName(quote), quote: quoteTitle(quote), amount: money(amountOf(quote)), age: `${ageDays(date)} days` },
    });
  });

  openJobs.filter((job) => isCompletedJob(job) && !hasWorkerProof(job)).slice(0, 6).forEach((job) => {
    items.push({
      id: `missing-proof-${recordId(job, "id", "_id", "job_id")}`,
      type: "Missing proof",
      page: "jobs",
      priority: 68,
      commandAction: "Prepare proof request",
      title: `${jobTitle(job)} needs proof`,
      summary: `${clientName(job)} job is complete but has no worker proof note or photo.`,
      found: `Completed job has no worker proof saved: ${jobTitle(job)}.`,
      prepared: "Prepare a worker proof request before billing moves forward.",
      why: "The owner needs confidence before approving invoices or follow-ups.",
      amount: amountOf(job),
      details: { customer_name: clientName(job), job_title: jobTitle(job), address: jobAddress(job), worker_name: jobWorker(job) || "No worker" },
    });
  });

  openJobs.filter((job) => !jobWorker(job) && !isCompletedJob(job)).slice(0, 6).forEach((job) => {
    items.push({
      id: `no-worker-${recordId(job, "id", "_id", "job_id")}`,
      type: "Worker gap",
      page: "jobs",
      priority: 58,
      commandAction: "Prepare assignment check",
      title: `${jobTitle(job)} has no worker`,
      summary: `${clientName(job)} is booked but not assigned.`,
      found: `Job is waiting without a worker: ${jobTitle(job)} at ${jobAddress(job)}.`,
      prepared: "Prepare an assignment check for owner approval.",
      why: "Unassigned work becomes missed work.",
      amount: amountOf(job),
      details: { customer_name: clientName(job), job_title: jobTitle(job), address: jobAddress(job), scheduled_date: pick(job, "scheduled_date", "date", "due_date") || "No date" },
    });
  });

  return items.sort((a, b) => b.priority - a.priority).slice(0, 12);
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

function DebtCard({ item, onSend, onOpen }) {
  return (
    <article className="freshAdminDebtItem">
      <div>
        <span>{item.type}</span>
        <h3>{item.title}</h3>
        <p>{item.summary}</p>
      </div>
      <b>{item.amount ? money(item.amount) : "Check"}</b>
      <footer>
        <button type="button" onClick={() => onSend(item)}>Send to Command</button>
        <button type="button" onClick={() => onOpen(item.page)}>Open area</button>
      </footer>
    </article>
  );
}

export default function FreshTodaysWork({ onNavigate }) {
  const { get } = useApi();
  const [selectedDate, setSelectedDate] = React.useState(() => todayInputValue());
  const [quickAsk, setQuickAsk] = React.useState("");
  const [data, setData] = React.useState({ jobs: [], workers: [], clients: [], invoices: [], quotes: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [lastSynced, setLastSynced] = React.useState("");
  const [radarMessage, setRadarMessage] = React.useState("");

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
      quotes: next.quotes || [],
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

  const adminDebtItems = React.useMemo(() => buildAdminDebtItems({
    jobs: data.jobs,
    invoices: data.invoices,
    quotes: data.quotes,
    invoicedJobIds,
  }), [data.jobs, data.invoices, data.quotes, invoicedJobIds]);

  const adminDebtScore = Math.max(0, 100 - adminDebtItems.length * 8);

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

  function sendToCommand(item) {
    const saved = pushCommandNote(item);
    setRadarMessage(saved ? `${item.title} sent to Command.` : "Could not send that item to Command.");
    if (saved) onNavigate?.("command");
  }

  function sendTopAttentionToCommand() {
    if (!adminDebtItems.length) {
      setRadarMessage("No admin debt found right now.");
      return;
    }
    sendToCommand(adminDebtItems[0]);
  }

  function submitQuickAsk(event) {
    event?.preventDefault?.();
    const text = quickAsk.trim();
    const clean = text.toLowerCase();

    if (!text) return;

    if (clean.includes("debt") || clean.includes("attention") || clean.includes("stuck") || clean.includes("behind")) {
      sendTopAttentionToCommand();
      return;
    }

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
          <span>Smart Hub</span>
          <h1>Smart Hub</h1>
          <p>Your simple track for the day: work booked, money waiting, missing proof and what needs attention. Churvox keeps the heavy admin underneath.</p>
          <div className="freshTodayWorkSync">
            <b>{loading ? "Checking today's plan..." : "Today's plan loaded"}</b>
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
          <button type="button" onClick={sendTopAttentionToCommand}><b>{adminDebtItems.length}</b><span>Admin debt</span></button>
        </div>
      </header>

      <form className="freshTodayWorkAsk" onSubmit={submitQuickAsk}>
        <label>
          <span>What do you want to do?</span>
          <input
            value={quickAsk}
            onChange={(event) => setQuickAsk(event.target.value)}
            placeholder="Add job, find admin debt, open invoices..."
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
        <button type="button" onClick={() => onNavigate?.("command")}>Review in Command</button>
      </section>

      <section className="freshTodayWorkFlow" aria-label="How Churvox keeps this simple">
        <article>
          <b>1</b>
          <span>Run today's work</span>
          <small>Jobs, clients and recurring work stay easy to find.</small>
        </article>
        <article>
          <b>2</b>
          <span>Churvox spots admin</span>
          <small>Invoices, unpaid money, missing proof and old quotes are watched quietly.</small>
        </article>
        <article>
          <b>3</b>
          <span>Approve when ready</span>
          <small>Command holds prepared admin for approve, edit or park.</small>
        </article>
      </section>

      <section className="freshAdminDebtRadar">
        <header>
          <div>
            <span>Admin Debt Radar</span>
            <h2>{adminDebtScore}% clean</h2>
            <p>{adminDebtItems.length ? `${adminDebtItems.length} thing${adminDebtItems.length === 1 ? "" : "s"} need owner attention.` : "No obvious admin debt found right now."}</p>
          </div>
          <button type="button" onClick={sendTopAttentionToCommand}>Send top issue to Command</button>
        </header>
        {radarMessage ? <p className="freshAdminDebtMessage">{radarMessage}</p> : null}
        <div className="freshAdminDebtGrid">
          {adminDebtItems.length ? adminDebtItems.slice(0, 4).map((item) => <DebtCard key={item.id} item={item} onSend={sendToCommand} onOpen={(page) => onNavigate?.(page)} />) : (
            <article className="freshAdminDebtEmpty"><b>Clean right now</b><span>No done-not-invoiced jobs, unpaid invoice follow-ups, old quotes, missing proof or unassigned work jumped out.</span></article>
          )}
        </div>
      </section>

      <section className="freshTodayWorkBoard">
        <article className="freshTodayWorkMain">
          <header>
            <span>Today's plan</span>
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
