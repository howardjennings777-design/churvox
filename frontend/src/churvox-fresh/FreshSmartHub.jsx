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

function idOf(record) {
  return String(record?.id || record?._id || record?.uuid || "");
}

function amountOf(record) {
  const value =
    record?.balance_due ??
    record?.balance ??
    record?.total ??
    record?.amount ??
    record?.price ??
    record?.job_price ??
    record?.fixed_price ??
    0;

  const n = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
}

function isPaidInvoice(invoice) {
  const status = lower(invoice?.status || invoice?.payment_status);
  return ["paid", "complete", "completed", "closed"].includes(status);
}

function isOverdueInvoice(invoice) {
  const status = lower(invoice?.status || invoice?.payment_status);
  if (status === "overdue") return true;
  if (isPaidInvoice(invoice)) return false;

  const due = invoice?.due_date || invoice?.dueAt || invoice?.due || invoice?.payment_due;
  if (!due) return false;

  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return false;
  return date < new Date();
}

function isCompletedJob(job) {
  const status = lower(job?.status || job?.job_status);
  return ["completed", "complete", "done", "finished"].includes(status);
}

function isCancelledJob(job) {
  const status = lower(job?.status || job?.job_status);
  return ["cancelled", "canceled", "archived", "void"].includes(status);
}

function jobHasInvoice(job) {
  return Boolean(
    job?.invoice_id ||
      job?.invoiceId ||
      job?.draft_invoice_id ||
      job?.draftInvoiceId ||
      job?.invoiced ||
      job?.invoice_number
  );
}

function jobWorker(job) {
  return pick(
    job,
    "worker",
    "worker_name",
    "assigned_worker_name",
    "assigned_worker",
    "assigned_to",
    "assigned_worker_id",
    "worker_id"
  );
}

function jobTitle(job) {
  return (
    pick(job, "title", "job_name", "name", "service", "description") ||
    pick(job, "client_name", "customer_name") ||
    "Job"
  );
}

function clientTitle(client) {
  return pick(client, "name", "client_name", "customer_name", "business_name", "email") || "Client";
}

function invoiceTitle(invoice) {
  return pick(invoice, "customer_name", "client_name", "name", "email") || "Invoice";
}

function quoteTitle(quote) {
  return pick(quote, "title", "customer_name", "client_name", "name", "email") || "Quote";
}

function workerTitle(worker) {
  return pick(worker, "name", "full_name", "worker_name", "email") || "Worker";
}

function quoteNeedsChase(quote) {
  const status = lower(quote?.status || quote?.quote_status);
  return !["accepted", "approved", "won", "lost", "declined", "rejected", "cancelled"].includes(status);
}

function buildLiveCockpit(data) {
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const workers = data.workers || [];
  const actions = data.actions || [];
  const notifications = data.notifications || [];

  const openJobs = jobs.filter((job) => !isCompletedJob(job) && !isCancelledJob(job));
  const activeJobs = openJobs.filter((job) =>
    ["in progress", "in_progress", "started", "paused", "assigned", "ready", "scheduled", "booked"].includes(
      lower(job?.status || job?.job_status)
    )
  );

  const unassignedJobs = openJobs.filter((job) => !jobWorker(job));
  const completedReadyToInvoice = jobs.filter((job) => isCompletedJob(job) && !jobHasInvoice(job));

  const owingInvoices = invoices.filter((invoice) => {
    const status = lower(invoice?.status || invoice?.payment_status);
    return ["sent", "open", "unpaid", "overdue", "part paid", "partial"].includes(status) || isOverdueInvoice(invoice);
  });

  const overdueInvoices = invoices.filter(isOverdueInvoice);
  const draftInvoices = invoices.filter((invoice) => ["draft", "pending", ""].includes(lower(invoice?.status)));
  const quotesToChase = quotes.filter(quoteNeedsChase);
  const acceptedQuotes = quotes.filter((quote) =>
    ["accepted", "approved", "won"].includes(lower(quote?.status || quote?.quote_status))
  );

  const clientsMissingDetails = clients.filter((client) => !pick(client, "email") || !pick(client, "phone", "mobile"));

  const readyToInvoiceAmount =
    completedReadyToInvoice.reduce((sum, job) => sum + amountOf(job), 0) +
    draftInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);

  const owingAmount = owingInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);
  const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + amountOf(invoice), 0);

  const workerChecks = [...unassignedJobs, ...activeJobs.filter((job) => !jobWorker(job))];

  const liveCrew = workers.filter((worker) => {
    const status = lower(worker?.status || worker?.availability || worker?.current_status);
    return ["on job", "onsite", "on site", "active", "working", "available"].includes(status) || worker?.current_job_id;
  });

  const ownerDecisions = [];

  overdueInvoices.slice(0, 4).forEach((invoice) => {
    ownerDecisions.push({
      id: `invoice-overdue-${idOf(invoice) || ownerDecisions.length}`,
      title: `Chase overdue invoice · ${invoiceTitle(invoice)}`,
      found: `${invoiceTitle(invoice)} has ${money(amountOf(invoice))} outstanding.`,
      prepared: "Owner can review the invoice and follow up before cash slips further.",
      why: "Overdue invoices affect cashflow and should sit at the top of the owner brief.",
      page: "invoices",
      source: "Live invoice",
    });
  });

  completedReadyToInvoice.slice(0, 4).forEach((job) => {
    ownerDecisions.push({
      id: `job-ready-invoice-${idOf(job) || ownerDecisions.length}`,
      title: `Ready to invoice · ${jobTitle(job)}`,
      found: `${jobTitle(job)} is completed and has no invoice attached.`,
      prepared: `Create or review an invoice for ${money(amountOf(job))}.`,
      why: "Completed work should turn into money quickly.",
      page: "invoices",
      source: "Live job",
    });
  });

  unassignedJobs.slice(0, 4).forEach((job) => {
    ownerDecisions.push({
      id: `job-unassigned-${idOf(job) || ownerDecisions.length}`,
      title: `Assign worker · ${jobTitle(job)}`,
      found: `${jobTitle(job)} has no worker assigned.`,
      prepared: "Open jobs and assign a worker before it becomes a dispatch problem.",
      why: "Unassigned jobs are the easiest way to miss work.",
      page: "jobs",
      source: "Live job",
    });
  });

  quotesToChase.slice(0, 4).forEach((quote) => {
    ownerDecisions.push({
      id: `quote-follow-${idOf(quote) || ownerDecisions.length}`,
      title: `Follow up quote · ${quoteTitle(quote)}`,
      found: `${quoteTitle(quote)} is still ${pick(quote, "status", "quote_status") || "open"}.`,
      prepared: "Open the quote and send a follow-up or update the status.",
      why: "Quotes sitting open are possible work not yet won.",
      page: "quotes",
      source: "Live quote",
    });
  });

  clientsMissingDetails.slice(0, 4).forEach((client) => {
    ownerDecisions.push({
      id: `client-missing-${idOf(client) || ownerDecisions.length}`,
      title: `Complete client details · ${clientTitle(client)}`,
      found: `${clientTitle(client)} is missing email or phone details.`,
      prepared: "Open client record and complete contact details.",
      why: "Missing contact details block messages, quotes and invoices.",
      page: "clients",
      source: "Live client",
    });
  });

  actions.slice(0, 4).forEach((action) => {
    ownerDecisions.push({
      id: `ai-action-${idOf(action) || ownerDecisions.length}`,
      title: pick(action, "title", "summary", "subject") || "AI operator action ready",
      found: pick(action, "found", "message", "reason", "description") || "AI operator found admin work.",
      prepared: pick(action, "prepared", "body", "suggestion") || "Review the prepared action.",
      why: pick(action, "why") || "This needs owner approval before anything changes.",
      page: "command",
      source: "Live AI action",
    });
  });

  notifications.slice(0, 4).forEach((notification) => {
    ownerDecisions.push({
      id: `notification-${idOf(notification) || ownerDecisions.length}`,
      title: pick(notification, "title", "subject", "summary") || "Notification needs review",
      found: pick(notification, "message", "body", "description") || "A live notification was found.",
      prepared: "Open alerts and review the update.",
      why: "Important alerts should not be buried.",
      page: "alerts",
      source: "Live alert",
    });
  });

  const stats = [
    [openJobs.length, "open jobs"],
    [money(readyToInvoiceAmount), "ready to invoice"],
    [quotesToChase.length, "quotes to chase"],
    [workerChecks.length, "worker checks"],
  ];

  return {
    stats,
    jobs,
    clients,
    invoices,
    quotes,
    workers,
    actions,
    notifications,
    openJobs,
    activeJobs,
    unassignedJobs,
    completedReadyToInvoice,
    owingInvoices,
    overdueInvoices,
    quotesToChase,
    acceptedQuotes,
    clientsMissingDetails,
    liveCrew,
    readyToInvoiceAmount,
    owingAmount,
    overdueAmount,
    ownerDecisions,
  };
}

function pushCommandSlip(action, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `smart-live-${action.id || Date.now()}`,
      group: "Owner Brief",
      title: action.title,
      info: action.source || "Live data",
      urgency: "High",
      found: action.found,
      prepared: action.prepared,
      why: action.why,
      owner: "Approve, edit, ignore, or open the related page.",
      area: "Owner Brief",
      page: "smart",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 30)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "smart-command" } }));
  } catch {
    // Keep cockpit working even if storage is blocked.
  }

  onNavigate?.("command");
}

export default function FreshSmartHub({ onNavigate }) {
  const { get } = useApi();
  const [liveData, setLiveData] = React.useState({
    jobs: [],
    clients: [],
    invoices: [],
    quotes: [],
    workers: [],
    actions: [],
    notifications: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [syncError, setSyncError] = React.useState("");
  const [lastSynced, setLastSynced] = React.useState("");

  const loadLiveData = React.useCallback(async () => {
    setLoading(true);
    setSyncError("");

    const next = {};
    const failed = [];

    await Promise.all(
      Object.entries(LIVE_ENDPOINTS).map(async ([key, endpoint]) => {
        try {
          const result = await get(endpoint);
          if (!result?.success) {
            failed.push(key);
            next[key] = [];
            return;
          }

          next[key] = asArray(result.data, key);
        } catch {
          failed.push(key);
          next[key] = [];
        }
      })
    );

    setLiveData({
      jobs: next.jobs || [],
      clients: next.clients || [],
      invoices: next.invoices || [],
      quotes: next.quotes || [],
      workers: next.workers || [],
      actions: next.actions || [],
      notifications: next.notifications || [],
    });

    setLastSynced(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));

    if (failed.length) {
      setSyncError(`Some live data could not load: ${failed.join(", ")}.`);
    }

    setLoading(false);
  }, [get]);

  React.useEffect(() => {
    loadLiveData();
  }, [loadLiveData]);

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

  const cockpit = React.useMemo(() => buildLiveCockpit(liveData), [liveData]);

  const flow = [
    ["Clients", `${cockpit.clients.length} live records`, "clients"],
    ["Quotes", `${cockpit.quotesToChase.length} need follow-up`, "quotes"],
    ["Jobs", `${cockpit.openJobs.length} open jobs`, "jobs"],
    ["Team", `${cockpit.workers.length} workers`, "team"],
    ["Invoices", `${money(cockpit.owingAmount)} owing`, "invoices"],
    ["Command", `${cockpit.ownerDecisions.length} decisions`, "command"],
  ];

  return (
    <section className="freshSmartPage">
      <div className="freshSmartHero">
        <div>
          <span>Owner Brief</span>
          <h1>Churvox does the admin. You approve.</h1>
          <p>
            This cockpit is now fed by live jobs, clients, quotes, invoices, team, AI actions and alerts.
            No demo numbers are used here.
          </p>

          <div className="freshSmartSync">
            <b>{loading ? "Syncing live data..." : "Live data connected"}</b>
            {lastSynced ? <small>Last synced {lastSynced}</small> : null}
            <button type="button" onClick={loadLiveData} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {syncError ? <p className="freshSmartError">{syncError}</p> : null}
        </div>

        <div className="freshSmartStats">
          {cockpit.stats.map(([value, label]) => (
            <div key={label}>
              <b>{value}</b>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </div>

      <FreshNewUserGuide onNavigate={onNavigate} mode="compact" />

      <div className="freshSmartGrid">
        <article className="freshSmartPanel freshSmartWide">
          <header>
            <span>Owner decisions</span>
            <h2>Live work needing attention</h2>
            <p>
              Churvox only shows real items here: overdue invoices, jobs ready to invoice, unassigned jobs,
              quotes to chase, incomplete clients, AI actions and alerts.
            </p>
          </header>

          <div className="freshSmartActions">
            {cockpit.ownerDecisions.length ? (
              cockpit.ownerDecisions.slice(0, 10).map((action) => (
                <section key={action.id}>
                  <div>
                    <b>{action.title}</b>
                    <p><strong>Found:</strong> {action.found}</p>
                    <p><strong>Prepared:</strong> {action.prepared}</p>
                    <p><strong>Why:</strong> {action.why}</p>
                    <small className="freshSmartSource">{action.source}</small>
                  </div>

                  <div className="freshSmartActionButtons">
                    <button type="button" onClick={() => pushCommandSlip(action, onNavigate)}>
                      Send to Command
                    </button>
                    <button type="button" onClick={() => onNavigate?.(action.page)}>
                      Open area
                    </button>
                  </div>
                </section>
              ))
            ) : (
              <div className="freshSmartEmpty">
                <b>{loading ? "Loading live cockpit..." : "No owner decisions found right now."}</b>
                <p>
                  When real jobs, invoices, quotes, clients, workers, AI actions or alerts need attention,
                  they will appear here.
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="freshSmartPanel">
          <header>
            <span>Live totals</span>
            <h2>Business pulse</h2>
            <p>Counts come from your actual API records.</p>
          </header>

          <div className="freshSmartFlow">
            {flow.map(([title, text, page]) => (
              <button type="button" key={page} onClick={() => onNavigate?.(page)}>
                <b>{title}</b>
                <small>{text}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="freshSmartPanel">
          <header>
            <span>Money</span>
            <h2>Invoice cockpit</h2>
            <p>Shows real invoice risk and completed work ready to turn into money.</p>
          </header>

          <div className="freshSmartLaunchButtons">
            <button type="button" onClick={() => onNavigate?.("invoices")}>
              {money(cockpit.owingAmount)} owing
            </button>
            <button type="button" onClick={() => onNavigate?.("invoices")}>
              {money(cockpit.overdueAmount)} overdue
            </button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>
              {cockpit.completedReadyToInvoice.length} jobs ready to invoice
            </button>
            <button type="button" onClick={() => onNavigate?.("quotes")}>
              {cockpit.acceptedQuotes.length} accepted quotes
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
