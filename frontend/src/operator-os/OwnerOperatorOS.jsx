import React, { useCallback, useEffect, useMemo, useState } from "react";
function getApiBase() {
  const env =
    typeof process !== "undefined" && process.env
      ? process.env
      : {};

  const raw =
    env.REACT_APP_API_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";

  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
}

const API_BASE = getApiBase();

function apiUrl(path) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  return `${API_BASE}/${cleanPath}`;
}

function readToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("churvox_token") ||
      ""
    );
  } catch {
    return "";
  }
}

async function apiRequest(path, options = {}) {
  const token = readToken();
  const method = options.method || "GET";
  const body = options.body;
  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message =
      payload?.detail ||
      payload?.message ||
      payload?.error ||
      `${method} ${path} failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function fetchJson(path) {
  return apiRequest(path, { method: "GET" });
}

async function tryMutation(candidates) {
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const payload = await apiRequest(candidate.path, {
        method: candidate.method,
        body: candidate.body,
      });

      return {
        path: candidate.path,
        method: candidate.method,
        payload,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No approval endpoint worked yet.");
}

function toArray(payload, preferredKeys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;

  const firstArray = Object.values(payload).find((value) => Array.isArray(value));
  return firstArray || [];
}

function pickId(item) {
  return item?.id || item?._id || item?.job_id || item?.invoice_id || item?.quote_id || item?.worker_id || item?.email || item?.name || Math.random().toString(36);
}

function pickName(item, fallback = "Untitled") {
  return (
    item?.title ||
    item?.name ||
    item?.job_title ||
    item?.client_name ||
    item?.customer_name ||
    item?.email ||
    item?.number ||
    item?.invoice_number ||
    item?.quote_number ||
    fallback
  );
}

function normaliseStatus(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function getJobStatus(job) {
  return normaliseStatus(job?.status || job?.job_status || job?.state);
}

function isCompleteJob(job) {
  const status = getJobStatus(job);
  return ["completed", "complete", "done", "finished"].some((word) => status.includes(word));
}

function isCancelledJob(job) {
  const status = getJobStatus(job);
  return ["cancelled", "canceled", "void", "deleted"].some((word) => status.includes(word));
}

function getAssignedWorker(job) {
  return (
    job?.assigned_worker_id ||
    job?.assigned_worker ||
    job?.worker_id ||
    job?.worker ||
    job?.assigned_to ||
    job?.assigned_to_name ||
    job?.assigned_worker_name ||
    ""
  );
}

function isUnassignedJob(job) {
  return !isCompleteJob(job) && !isCancelledJob(job) && !getAssignedWorker(job);
}

function isOpenInvoice(invoice) {
  const status = normaliseStatus(invoice?.status || invoice?.payment_status || invoice?.state);
  return !["paid", "cancelled", "canceled", "void", "deleted"].some((word) => status.includes(word));
}

function isOpenQuote(quote) {
  const status = normaliseStatus(quote?.status || quote?.quote_status || quote?.state);
  return !["accepted", "approved", "declined", "rejected", "converted", "cancelled", "canceled", "deleted"].some((word) => status.includes(word));
}

function moneyValue(item) {
  const value = item?.total || item?.amount || item?.price || item?.balance_due || item?.balance || item?.grand_total;
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number <= 0) return "";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(number);
}

function dateLabel(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

function itemSubtitle(item, type) {
  if (type === "job") {
    return [
      item?.client_name || item?.customer_name || item?.client || item?.customer,
      item?.address || item?.site_address || item?.location,
      getJobStatus(item),
    ].filter(Boolean).join(" · ");
  }

  if (type === "invoice") {
    return [
      item?.client_name || item?.customer_name || item?.client,
      normaliseStatus(item?.status || item?.payment_status),
      moneyValue(item),
    ].filter(Boolean).join(" · ");
  }

  if (type === "quote") {
    return [
      item?.client_name || item?.customer_name || item?.client,
      normaliseStatus(item?.status || item?.quote_status),
      moneyValue(item),
    ].filter(Boolean).join(" · ");
  }

  if (type === "worker") {
    return [
      item?.role,
      item?.region || item?.area,
      item?.email,
      item?.phone,
    ].filter(Boolean).join(" · ");
  }

  return "";
}

function chooseWorkerForJob(job, workers) {
  if (!job || !workers.length) return null;

  const jobArea = String(job?.region || job?.area || job?.suburb || job?.city || "").toLowerCase();

  const activeWorkers = workers.filter((worker) => {
    const status = normaliseStatus(worker?.status || worker?.state);
    const role = normaliseStatus(worker?.role || worker?.user_role);
    return !status.includes("inactive") && !role.includes("owner");
  });

  if (!activeWorkers.length) return workers[0] || null;

  const sameArea = activeWorkers.find((worker) => {
    const workerArea = String(worker?.region || worker?.area || worker?.suburb || worker?.city || "").toLowerCase();
    return jobArea && workerArea && (jobArea.includes(workerArea) || workerArea.includes(jobArea));
  });

  return sameArea || activeWorkers[0];
}

function getClientName(item) {
  return item?.client_name || item?.customer_name || item?.client || item?.customer || "";
}

function getClientId(item) {
  return item?.client_id || item?.customer_id || item?.clientId || item?.customerId || "";
}

function getJobAmount(job) {
  const raw =
    job?.price ||
    job?.job_price ||
    job?.fixed_price ||
    job?.amount ||
    job?.total ||
    job?.estimated_total ||
    0;

  const amount = Number(raw || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function buildInvoiceDescription(job) {
  const client = getClientName(job) || "the client";
  const service =
    job?.service_type ||
    job?.job_type ||
    job?.title ||
    job?.job_title ||
    "completed service";
  const address =
    job?.address ||
    job?.site_address ||
    job?.location ||
    "";

  return [
    `${service} completed for ${client}.`,
    address ? `Site: ${address}.` : "",
    job?.notes ? `Notes: ${job.notes}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildApprovalMessage(action) {
  if (!action) return "";

  if (action.kind === "invoice-reminder") {
    const invoice = action.invoice;
    return `Hi ${getClientName(invoice) || "there"}, just a friendly reminder that ${pickName(invoice, "your invoice")} is still open${moneyValue(invoice) ? ` for ${moneyValue(invoice)}` : ""}. Thanks.`;
  }

  if (action.kind === "quote-followup") {
    const quote = action.quote;
    return `Hi ${getClientName(quote) || "there"}, just checking in on ${pickName(quote, "the quote")} to see if you would like to go ahead or have any questions. Thanks.`;
  }

  return "";
}

function Modal({ modal, onClose, onPrepare }) {
  if (!modal) return null;

  return (
    <div className="op-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="op-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="op-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="op-modal-head">
          <div>
            <p className="op-kicker">{modal.meta || "Details"}</p>
            <h2 id="op-modal-title">{modal.title}</h2>
          </div>
          <button type="button" className="op-icon-btn" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </div>

        {modal.body ? <p className="op-modal-body">{modal.body}</p> : null}

        {modal.items?.length ? (
          <div className="op-modal-list">
            {modal.items.map((item) => (
              <button
                type="button"
                className="op-live-row"
                key={`${modal.type || "item"}-${pickId(item)}`}
                onClick={() =>
                  modal.onItemClick
                    ? modal.onItemClick(item)
                    : null
                }
              >
                <span>
                  <strong>{pickName(item, modal.emptyName || "Item")}</strong>
                  <small>{itemSubtitle(item, modal.itemType)}</small>
                </span>
                <em>{dateLabel(item?.created_at || item?.updated_at || item?.date || item?.scheduled_date) || "Open"}</em>
              </button>
            ))}
          </div>
        ) : null}

        {modal.steps?.length ? (
          <div className="op-modal-steps">
            {modal.steps.map((step, index) => (
              <div className="op-step" key={step}>
                <b>{index + 1}</b>
                <span>{step}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="op-modal-actions">
          <button type="button" className="op-btn op-btn-soft" onClick={onClose}>
            Close
          </button>
          {modal.prepareLabel ? (
            <button type="button" className="op-btn op-btn-primary" onClick={() => onPrepare(modal)}>
              {modal.prepareLabel}
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div className="op-toast">{message}</div>;
}

function StatCard({ label, value, text, tone, onClick }) {
  return (
    <button className={`op-stat op-stat-${tone}`} type="button" onClick={onClick}>
      <span className="op-stat-top">
        <strong>{value}</strong>
        <span>{label}</span>
      </span>
      <small>{text}</small>
      <em>Tap to view live list</em>
    </button>
  );
}

function ActionCard({ title, meta, summary, primary, onReview, onPrepare }) {
  return (
    <article className="op-action-card">
      <div>
        <p className="op-card-kicker">{meta}</p>
        <h3>{title}</h3>
        <p>{summary}</p>
      </div>
      <div className="op-card-actions">
        <button type="button" className="op-btn op-btn-soft" onClick={onReview}>
          Details
        </button>
        <button type="button" className="op-btn op-btn-primary" onClick={onPrepare}>
          {primary}
        </button>
      </div>
    </article>
  );
}

export default function AIControlRoomPage() {
  const [mode, setMode] = useState("today");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [data, setData] = useState({
    jobs: [],
    invoices: [],
    quotes: [],
    workers: [],
  });

  const showToast = useCallback((message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    const requests = await Promise.allSettled([
      fetchJson("/jobs"),
      fetchJson("/invoices"),
      fetchJson("/quotes"),
      fetchJson("/team/workers"),
    ]);

    const jobs = requests[0].status === "fulfilled" ? toArray(requests[0].value, ["jobs"]) : [];
    const invoices = requests[1].status === "fulfilled" ? toArray(requests[1].value, ["invoices"]) : [];
    const quotes = requests[2].status === "fulfilled" ? toArray(requests[2].value, ["quotes"]) : [];
    const workers = requests[3].status === "fulfilled" ? toArray(requests[3].value, ["workers", "team"]) : [];

    const failed = requests
      .map((result, index) => ({ result, name: ["jobs", "invoices", "quotes", "workers"][index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ name }) => name);

    setData({ jobs, invoices, quotes, workers });

    if (failed.length) {
      setLoadError(`Could not load: ${failed.join(", ")}. The rest of the page still works.`);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const derived = useMemo(() => {
    const unassignedJobs = data.jobs.filter(isUnassignedJob);
    const completedJobs = data.jobs.filter(isCompleteJob);
    const openInvoices = data.invoices.filter(isOpenInvoice);
    const openQuotes = data.quotes.filter(isOpenQuote);

    const firstUnassignedJob = unassignedJobs[0] || null;
    const bestWorker = chooseWorkerForJob(firstUnassignedJob, data.workers);

    return {
      unassignedJobs,
      completedJobs,
      openInvoices,
      openQuotes,
      firstUnassignedJob,
      bestWorker,
    };
  }, [data]);

  const actions = useMemo(() => {
    const list = [];

    if (derived.firstUnassignedJob) {
      list.push({
        id: "assign-live-job",
        type: "dispatch",
        title: "Assign unassigned job",
        meta: "Live dispatch",
        primary: "Stage assignment",
        summary: `${pickName(derived.firstUnassignedJob, "Unassigned job")} is waiting for a worker. Best match: ${derived.bestWorker ? pickName(derived.bestWorker, "Worker") : "no worker found yet"}.`,
        modal: {
          title: "Assign unassigned job",
          meta: "Live dispatch",
          body: "This is using live jobs and live workers. When approved, Churvox will try the real assignment endpoints and refresh live data.",
          steps: [
            `Job: ${pickName(derived.firstUnassignedJob, "Unassigned job")}`,
            `Client: ${derived.firstUnassignedJob?.client_name || derived.firstUnassignedJob?.customer_name || "Not shown"}`,
            `Best worker: ${derived.bestWorker ? pickName(derived.bestWorker, "Worker") : "No worker found"}`,
            "Owner approval required before real assignment",
          ],
          prepareLabel: "Approve assignment",
          action: { kind: "assign-job", job: derived.firstUnassignedJob, worker: derived.bestWorker },
        },
      });
    }

    if (derived.completedJobs[0]) {
      list.push({
        id: "draft-live-invoice",
        type: "money",
        title: "Prepare invoice draft",
        meta: "Live completed job",
        primary: "Stage invoice draft",
        summary: `${pickName(derived.completedJobs[0], "Completed job")} is completed and ready for an invoice draft.`,
        modal: {
          title: "Prepare invoice draft",
          meta: "Live invoicing",
          body: "This is using completed live jobs. When approved, Churvox will try to create a real draft invoice from this completed job.",
          steps: [
            `Completed job: ${pickName(derived.completedJobs[0], "Completed job")}`,
            `Client: ${derived.completedJobs[0]?.client_name || derived.completedJobs[0]?.customer_name || "Not shown"}`,
            "AI description should use job notes, service type, photos, address, and pricing",
            "Owner approves before real invoice creation",
          ],
          prepareLabel: "Create draft invoice",
          action: { kind: "create-invoice", job: derived.completedJobs[0] },
        },
      });
    }

    if (derived.openInvoices[0]) {
      list.push({
        id: "invoice-reminder",
        type: "money",
        title: "Prepare invoice reminder",
        meta: "Live cashflow",
        primary: "Stage reminder",
        summary: `${pickName(derived.openInvoices[0], "Open invoice")} is open and may need a payment reminder.`,
        modal: {
          title: "Prepare invoice reminder",
          meta: "Live invoice",
          body: "This is using live invoice data. The next write phase will connect this to the real message/reminder flow.",
          steps: [
            `Invoice: ${pickName(derived.openInvoices[0], "Open invoice")}`,
            `Amount: ${moneyValue(derived.openInvoices[0]) || "Not shown"}`,
            "Draft friendly reminder",
            "Owner approves before sending",
          ],
          prepareLabel: "Prepare reminder",
          action: { kind: "invoice-reminder", invoice: derived.openInvoices[0] },
        },
      });
    }

    if (derived.openQuotes[0]) {
      list.push({
        id: "quote-followup",
        type: "followups",
        title: "Prepare quote follow-up",
        meta: "Live quote",
        primary: "Stage follow-up",
        summary: `${pickName(derived.openQuotes[0], "Open quote")} is still open and can be followed up.`,
        modal: {
          title: "Prepare quote follow-up",
          meta: "Live quote",
          body: "This is using live quote data. The next write phase will connect this to the real quote follow-up action.",
          steps: [
            `Quote: ${pickName(derived.openQuotes[0], "Open quote")}`,
            `Client: ${derived.openQuotes[0]?.client_name || derived.openQuotes[0]?.customer_name || "Not shown"}`,
            "Draft follow-up message",
            "Owner approves before sending",
          ],
          prepareLabel: "Prepare follow-up",
          action: { kind: "quote-followup", quote: derived.openQuotes[0] },
        },
      });
    }

    if (!list.length) {
      list.push({
        id: "all-clear",
        type: "today",
        title: "No urgent live actions found",
        meta: "All clear",
        primary: "Refresh",
        summary: "Churvox did not find unassigned jobs, completed jobs needing invoices, open invoices, or quote follow-ups from the live data currently loaded.",
        modal: {
          title: "No urgent live actions found",
          meta: "All clear",
          body: "Refresh live data or continue testing jobs, invoices, and quotes.",
          steps: ["Jobs checked", "Workers checked", "Invoices checked", "Quotes checked"],
          prepareLabel: "Refresh live data",
        },
      });
    }

    return list;
  }, [derived]);

  const visibleActions = useMemo(() => {
    if (mode === "today") return actions;
    return actions.filter((action) => action.type === mode);
  }, [actions, mode]);

  function openLiveList(title, meta, body, items, itemType) {
    setModal({
      title,
      meta,
      body,
      items,
      itemType,
      emptyName: title,
      onItemClick: (item) =>
        setModal({
          title: pickName(item, title),
          meta,
          body: itemSubtitle(item, itemType) || "Live record detail",
          steps: [
            `Status: ${item?.status || item?.payment_status || item?.quote_status || "Not shown"}`,
            `Client: ${item?.client_name || item?.customer_name || item?.client || "Not shown"}`,
            `Amount: ${moneyValue(item) || "Not shown"}`,
            `ID: ${pickId(item)}`,
          ],
        }),
    });
  }

  async function prepareModalAction(currentModal) {
    if (currentModal?.prepareLabel === "Refresh live data") {
      setModal(null);
      loadData();
      showToast("Refreshing live data.");
      return;
    }

    const action = currentModal?.action;

    if (!action) {
      setModal(null);
      showToast("Action staged safely.");
      return;
    }

    try {
      showToast("Working on approved action...");

      if (action.kind === "assign-job") {
        const job = action.job;
        const worker = action.worker;

        if (!job) throw new Error("No job selected.");
        if (!worker) throw new Error("No worker match found.");

        const jobId = pickId(job);
        const workerId = pickId(worker);
        const workerName = pickName(worker, "Worker");

        const body = {
          worker_id: workerId,
          assigned_worker_id: workerId,
          assigned_worker: workerId,
          assigned_to: workerId,
          worker_name: workerName,
          assigned_worker_name: workerName,
          assigned_to_name: workerName,
        };

        const result = await tryMutation([
          { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/assign`, body },
          { method: "PATCH", path: `/jobs/${encodeURIComponent(jobId)}/assign`, body },
          { method: "PATCH", path: `/jobs/${encodeURIComponent(jobId)}`, body },
          { method: "PUT", path: `/jobs/${encodeURIComponent(jobId)}`, body },
        ]);

        setModal(null);
        showToast(`Assigned ${workerName}. Used ${result.method} ${result.path}`);
        await loadData();
        return;
      }

      if (action.kind === "create-invoice") {
        const job = action.job;
        if (!job) throw new Error("No completed job selected.");

        const jobId = pickId(job);
        const amount = getJobAmount(job);
        const description = buildInvoiceDescription(job);

        const invoiceBody = {
          job_id: jobId,
          client_id: getClientId(job),
          customer_id: getClientId(job),
          client_name: getClientName(job),
          customer_name: getClientName(job),
          status: "draft",
          invoice_status: "draft",
          description,
          invoice_description: description,
          notes: description,
          amount,
          total: amount,
          line_items: [
            {
              description,
              quantity: 1,
              unit_price: amount,
              price: amount,
              total: amount,
            },
          ],
        };

        const result = await tryMutation([
          { method: "POST", path: `/invoices/from-job/${encodeURIComponent(jobId)}`, body: invoiceBody },
          { method: "POST", path: `/jobs/${encodeURIComponent(jobId)}/invoice`, body: invoiceBody },
          { method: "POST", path: `/invoices`, body: invoiceBody },
        ]);

        setModal(null);
        showToast(`Draft invoice created. Used ${result.method} ${result.path}`);
        await loadData();
        return;
      }

      if (action.kind === "invoice-reminder" || action.kind === "quote-followup") {
        const message = buildApprovalMessage(action);

        setModal({
          title: action.kind === "invoice-reminder" ? "Prepared invoice reminder" : "Prepared quote follow-up",
          meta: "Approval-first message",
          body: message || "Message prepared.",
          steps: [
            "This is prepared only.",
            "Nothing has been sent automatically.",
            "Next phase can wire this to email/SMS once the sending flow is stable.",
          ],
        });

        showToast("Message prepared. Nothing sent automatically.");
        return;
      }

      setModal(null);
      showToast("Action approved.");
    } catch (error) {
      showToast(error?.message || "Approved action could not complete yet.");
    }
  }

  return (
    <main className="op-page">
      <Toast message={toast} />

      <section className="op-hero">
        <div className="op-hero-copy">
          <p className="op-kicker">Churvox Operator</p>
          <h1>Live command centre for today&apos;s work.</h1>
          <p>
            This Operator now reads live jobs, workers, invoices, and quotes. It shows what needs action
            and keeps details inside popups so the owner stays in context.
          </p>

          <div className="op-hero-actions">
            <button type="button" className="op-btn op-btn-primary" onClick={() => setMode("today")}>
              Review live actions
            </button>
            <button type="button" className="op-btn op-btn-dark" onClick={loadData}>
              Refresh live data
            </button>
          </div>

          {loadError ? <div className="op-error">{loadError}</div> : null}
        </div>

        <div className="op-command-panel">
          <div className="op-command-head">
            <span>Live status</span>
            <strong>{loading ? "Loading" : "Connected"}</strong>
          </div>

          <div className="op-command-grid">
            <button type="button" onClick={() => setMode("dispatch")}>
              <strong>{derived.unassignedJobs.length}</strong>
              <span>unassigned</span>
            </button>
            <button type="button" onClick={() => setMode("money")}>
              <strong>{derived.completedJobs.length}</strong>
              <span>completed</span>
            </button>
            <button type="button" onClick={() => setMode("followups")}>
              <strong>{derived.openQuotes.length}</strong>
              <span>open quotes</span>
            </button>
          </div>

          <p>
            Read-only phase: live records are loaded, details open in-page, and risky write actions are staged only.
          </p>
        </div>
      </section>

      <section className="op-tabs" aria-label="Operator modes">
        <button className={mode === "today" ? "active" : ""} onClick={() => setMode("today")} type="button">
          Today
        </button>
        <button className={mode === "dispatch" ? "active" : ""} onClick={() => setMode("dispatch")} type="button">
          Dispatch
        </button>
        <button className={mode === "money" ? "active" : ""} onClick={() => setMode("money")} type="button">
          Money
        </button>
        <button className={mode === "followups" ? "active" : ""} onClick={() => setMode("followups")} type="button">
          Follow-ups
        </button>
      </section>

      <section className="op-stats">
        <StatCard
          value={loading ? "..." : derived.unassignedJobs.length}
          label="Unassigned jobs"
          text="Live jobs waiting for a worker."
          tone="red"
          onClick={() => openLiveList("Unassigned jobs", "Live dispatch", "Jobs that currently have no assigned worker.", derived.unassignedJobs, "job")}
        />
        <StatCard
          value={loading ? "..." : derived.completedJobs.length}
          label="Completed jobs"
          text="Live completed work ready for invoice review."
          tone="green"
          onClick={() => openLiveList("Completed jobs", "Live jobs", "Completed jobs that may be ready for invoice drafts.", derived.completedJobs, "job")}
        />
        <StatCard
          value={loading ? "..." : derived.openInvoices.length}
          label="Open invoices"
          text="Live invoices not marked paid."
          tone="blue"
          onClick={() => openLiveList("Open invoices", "Live cashflow", "Invoices that are not marked as paid.", derived.openInvoices, "invoice")}
        />
        <StatCard
          value={loading ? "..." : derived.openQuotes.length}
          label="Open quotes"
          text="Live quotes that may need follow-up."
          tone="amber"
          onClick={() => openLiveList("Open quotes", "Live quotes", "Quotes still open or waiting.", derived.openQuotes, "quote")}
        />
      </section>

      <section className="op-layout">
        <div className="op-left">
          <div className="op-section-head">
            <div>
              <p className="op-kicker">Approval queue</p>
              <h2>Live AI-prepared actions</h2>
            </div>
            <button type="button" className="op-btn op-btn-soft" onClick={loadData}>
              Refresh
            </button>
          </div>

          {visibleActions.map((action) => (
            <ActionCard
              key={action.id}
              title={action.title}
              meta={action.meta}
              summary={action.summary}
              primary={action.primary}
              onReview={() => setModal(action.modal)}
              onPrepare={() => setModal(action.modal)}
            />
          ))}
        </div>

        <aside className="op-right">
          <div className="op-mini-panel">
            <p className="op-kicker">Crew match</p>
            <h2>Best worker option</h2>

            {derived.bestWorker ? (
              <button
                className="op-worker"
                type="button"
                onClick={() =>
                  setModal({
                    title: pickName(derived.bestWorker, "Worker"),
                    meta: "Live worker",
                    body: itemSubtitle(derived.bestWorker, "worker") || "Worker detail",
                    steps: [
                      `Role: ${derived.bestWorker?.role || "Not shown"}`,
                      `Region: ${derived.bestWorker?.region || derived.bestWorker?.area || "Not shown"}`,
                      `Email: ${derived.bestWorker?.email || "Not shown"}`,
                      `Phone: ${derived.bestWorker?.phone || "Not shown"}`,
                    ],
                  })
                }
              >
                <div>
                  <strong>{pickName(derived.bestWorker, "Worker")}</strong>
                  <span>{itemSubtitle(derived.bestWorker, "worker") || "Live worker record"}</span>
                </div>
                <b>Best</b>
              </button>
            ) : (
              <div className="op-empty">No worker match found yet.</div>
            )}

            <button
              type="button"
              className="op-link-btn"
              onClick={() => openLiveList("Workers", "Live team", "Current worker/team records loaded from Churvox.", data.workers, "worker")}
            >
              View all workers
            </button>
          </div>

          <div className="op-mini-panel">
            <p className="op-kicker">Run sheet</p>
            <h2>Live jobs focus</h2>

            <div className="op-job-list">
              {data.jobs.slice(0, 6).map((job) => (
                <button
                  className="op-job"
                  type="button"
                  key={`job-${pickId(job)}`}
                  onClick={() =>
                    setModal({
                      title: pickName(job, "Job"),
                      meta: getJobStatus(job) || "Live job",
                      body: itemSubtitle(job, "job") || "Live job detail",
                      steps: [
                        `Client: ${job?.client_name || job?.customer_name || job?.client || "Not shown"}`,
                        `Assigned worker: ${getAssignedWorker(job) || "Unassigned"}`,
                        `Address: ${job?.address || job?.site_address || job?.location || "Not shown"}`,
                        `ID: ${pickId(job)}`,
                      ],
                    })
                  }
                >
                  <span>
                    <strong>{pickName(job, "Job")}</strong>
                    <small>{itemSubtitle(job, "job") || "Live job"}</small>
                  </span>
                  <em>{getAssignedWorker(job) ? "Assigned" : "Needs worker"}</em>
                </button>
              ))}

              {!data.jobs.length && <div className="op-empty">No jobs loaded yet.</div>}
            </div>
          </div>
        </aside>
      </section>

      <Modal modal={modal} onClose={() => setModal(null)} onPrepare={prepareModalAction} />
    </main>
  );
}
