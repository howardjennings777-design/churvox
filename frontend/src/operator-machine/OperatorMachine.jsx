import React, { useEffect, useMemo, useState } from "react";
import "./OperatorMachine.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function readToken() {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      ""
    );
  } catch {
    return "";
  }
}

function saveSession(payload) {
  const data = payload?.data || payload || {};
  const token =
    data.access_token ||
    data.token ||
    data.authToken ||
    data.jwt ||
    data?.user?.token ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("access_token", token);
  }

  const user = data.user || data.account || data.profile || {};
  if (user && typeof user === "object") {
    localStorage.setItem("churvox_user", JSON.stringify(user));
    if (user.name) localStorage.setItem("churvox_owner_name", user.name);
    if (user.email) localStorage.setItem("churvox_email", user.email);
    if (user.role) localStorage.setItem("churvox_role", user.role);
  }
}

async function authRequest(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || "Could not open Churvox");
  }

  return payload;
}

async function apiPost(path, body = {}) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || `${path} failed`);
  }

  return payload;
}

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).join(", ") || fallback;
  if (typeof value === "object") {
    for (const key of ["title", "name", "label", "message", "body", "description", "status", "summary", "detail"]) {
      if (value[key]) return clean(value[key], fallback);
    }
  }
  return fallback;
}

function money(value) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function arrayFrom(...sources) {
  for (const source of sources) {
    if (Array.isArray(source)) return source;
  }
  return [];
}

function itemId(item = {}, fallback = "") {
  return clean(item.id || item._id || item.job_id || item.quote_id || item.invoice_id || item.source_id || fallback);
}

function statusOf(item = {}) {
  return clean(item.status || item.job_status || item.invoice_status || item.quote_status || item.payment_status || item.state, "new").toLowerCase();
}

function isCompletedJob(job = {}) {
  const status = statusOf(job);
  return status.includes("complete") || status.includes("done") || job.completed === true;
}

function hasWorker(job = {}) {
  return Boolean(clean(
    job.assigned_worker_id ||
    job.worker_id ||
    job.assigned_worker ||
    job.assigned_to ||
    job.assigned_worker_name ||
    job.worker_name
  ));
}

function photoCount(item = {}) {
  for (const key of ["photos", "worker_photos", "proof_photos", "job_photos", "images"]) {
    if (Array.isArray(item[key])) return item[key].length;
  }
  const count = Number(item.photo_count || item.photos_count || item.proof_count || 0);
  return Number.isFinite(count) ? count : 0;
}

function invoiceAmount(item = {}) {
  const direct = [
    item.invoice_amount,
    item.amount_due,
    item.balance,
    item.total,
    item.total_amount,
    item.amount,
    item.price,
    item.job_price,
    item.fixed_price,
    item.quote_total,
    item.estimated_price,
  ];

  for (const value of direct) {
    const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return String(parsed);
  }

  const rate = Number(String(item.hourly_rate || item.rate || "").replace(/[^0-9.-]/g, ""));
  const hours = Number(String(item.billable_hours || item.worked_hours || item.total_hours || item.hours || "").replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(rate) && Number.isFinite(hours) && rate > 0 && hours > 0) {
    return String(Math.round(rate * hours * 100) / 100);
  }

  return "";
}

function completedDate(item = {}) {
  const raw =
    item.completed_at ||
    item.completed_date ||
    item.updated_at ||
    item.finish_time ||
    item.finished_at ||
    item.date_completed ||
    "";
  if (!raw) return "";
  try {
    return new Date(raw).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return clean(raw);
  }
}

function invoiceDescription(item = {}) {
  const client = clean(item.client_name || item.customer_name || item.client?.name || item.customer?.name, "the client");
  const jobTitle = clean(item.title || item.job_title || item.service_type || item.name, "service work");
  const address = clean(item.address || item.job_address || item.service_address || item.location);
  const notes = clean(item.completion_notes || item.worker_notes || item.job_notes || item.notes);
  const done = completedDate(item);
  const photos = photoCount(item);
  const pricingType = clean(item.pricing_type || item.price_type);
  const amount = money(invoiceAmount(item));

  const parts = [];
  parts.push(`${jobTitle} completed for ${client}${address ? ` at ${address}` : ""}.`);
  if (done) parts.push(`Work was completed on ${done}.`);
  if (notes) parts.push(`Worker notes: ${notes.endsWith(".") ? notes : `${notes}.`}`);
  if (photos) parts.push(`Proof photo${photos === 1 ? "" : "s"} uploaded for owner review: ${photos}.`);
  if (pricingType || amount) parts.push(`Pricing context: ${pricingType || "set price"}${amount ? `, ${amount}` : ""}.`);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function reminderMessage(invoice = {}) {
  const client = clean(invoice.client_name || invoice.customer_name || invoice.client?.name || "there");
  const number = clean(invoice.invoice_number || invoice.number || invoice.title, "your invoice");
  const amount = money(invoice.balance || invoice.amount_due || invoice.total || invoice.amount);
  const due = clean(invoice.due_date || invoice.payment_due_date || invoice.invoice_due_date);
  return `Hi ${client}, just a friendly reminder that ${number}${amount ? ` for ${amount}` : ""}${due ? ` was due on ${due}` : " is still awaiting payment"}. Please let us know if you need anything from us.`;
}

function quoteFollowup(quote = {}) {
  const client = clean(quote.client_name || quote.customer_name || quote.client?.name || "there");
  const title = clean(quote.title || quote.quote_number || quote.number || "your quote");
  const amount = money(quote.total || quote.amount || quote.quote_total);
  return `Hi ${client}, just checking in on ${title}${amount ? ` (${amount})` : ""}. Happy to answer questions or adjust details before you approve the work.`;
}

function buildMachine(data = {}) {
  const raw = data.raw || {};
  const jobs = arrayFrom(raw.jobs, data.jobs);
  const clients = arrayFrom(raw.clients, data.clients);
  const team = arrayFrom(raw.team, raw.workers, data.team);
  const quotes = arrayFrom(raw.quotes, data.quotes);
  const invoices = arrayFrom(raw.invoices, data.invoices);

  const input = [];
  const processing = [];
  const approval = [];

  jobs.slice(0, 30).forEach((job, index) => {
    const id = itemId(job, `job-${index}`);
    const client = clean(job.client_name || job.customer_name || job.client?.name, "Client");
    const title = clean(job.title || job.job_title || job.service_type || job.name, `Job ${index + 1}`);
    const address = clean(job.address || job.job_address || job.service_address || job.location);
    const notes = clean(job.completion_notes || job.worker_notes || job.job_notes || job.notes);
    const photos = photoCount(job);

    input.push({
      id: `input-${id}`,
      sourceId: id,
      kind: "input",
      title,
      eyebrow: "Job input",
      client,
      detail: `${client}${address ? ` · ${address}` : ""}`,
      state: statusOf(job),
      item: job,
    });

    if (!hasWorker(job) && !isCompletedJob(job)) {
      const worker = team[0] || {};
      processing.push({
        id: `dispatch-${id}`,
        sourceId: id,
        kind: "dispatch",
        title: `Assign worker for ${title}`,
        eyebrow: "Worker fit",
        client,
        need: "This job needs a worker before the day can run cleanly.",
        prepared: `Churvox checked the job, client and available crew. Suggested worker: ${clean(worker.name || worker.full_name || worker.worker_name, "choose worker")}.`,
        draft: {
          title: `Assign worker for ${title}`,
          workerChoice: clean(worker.id || worker._id || worker.name || worker.full_name || ""),
          ownerNote: address ? `Assign based on job address: ${address}` : "Assign the best available worker.",
          customerMessage: "",
          invoiceDescription: "",
          amount: "",
        },
        item: job,
      });
    }

    if (isCompletedJob(job)) {
      const amount = invoiceAmount(job);
      const preparedDescription = invoiceDescription(job);

      approval.push({
        id: `invoice-${id}`,
        sourceId: id,
        kind: "invoice",
        title: `Approve invoice draft for ${client}`,
        eyebrow: amount ? "Invoice ready" : "Owner input needed",
        client,
        need: amount ? "Completed work is ready for invoice approval." : "Completed work is ready, but the amount needs owner input.",
        prepared: preparedDescription,
        draft: {
          title: `Invoice for ${title}`,
          invoiceClientName: client,
          invoiceLineItem: title,
          invoiceDescription: preparedDescription,
          amount,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          ownerNote: notes,
          customerMessage: preparedDescription,
        },
        item: job,
      });

      if (notes || photos) {
        processing.push({
          id: `proof-${id}`,
          sourceId: id,
          kind: "proof",
          title: `Proof package for ${client}`,
          eyebrow: "Proof-to-Paid",
          client,
          need: "Worker proof can feed invoice wording and owner review.",
          prepared: `${photos} proof photo${photos === 1 ? "" : "s"}${notes ? ` · ${notes}` : ""}`,
          draft: {
            title: `Proof reviewed for ${title}`,
            ownerNote: notes || "Proof reviewed.",
            customerMessage: preparedDescription,
            invoiceDescription: preparedDescription,
            amount,
          },
          item: job,
        });
      }
    }
  });

  invoices.slice(0, 20).forEach((invoice, index) => {
    const status = statusOf(invoice);
    const id = itemId(invoice, `invoice-${index}`);
    const client = clean(invoice.client_name || invoice.customer_name || invoice.client?.name, "Client");
    if (status.includes("unpaid") || status.includes("overdue") || status.includes("draft") || status.includes("sent")) {
      approval.push({
        id: `reminder-${id}`,
        sourceId: id,
        kind: "cashflow",
        title: `Review payment follow-up for ${client}`,
        eyebrow: status.includes("overdue") ? "Copper warning" : "Cashflow",
        client,
        need: "This invoice may need a reminder or owner review.",
        prepared: reminderMessage(invoice),
        draft: {
          title: `Payment reminder for ${client}`,
          ownerNote: clean(invoice.notes || invoice.internal_note),
          customerMessage: reminderMessage(invoice),
          invoiceDescription: clean(invoice.description || invoice.invoice_description),
          amount: invoiceAmount(invoice),
        },
        item: invoice,
      });
    }
  });

  quotes.slice(0, 20).forEach((quote, index) => {
    const status = statusOf(quote);
    const id = itemId(quote, `quote-${index}`);
    const client = clean(quote.client_name || quote.customer_name || quote.client?.name, "Client");
    if (!status.includes("accepted") && !status.includes("declined") && !status.includes("won")) {
      approval.push({
        id: `quote-${id}`,
        sourceId: id,
        kind: "quote",
        title: `Approve quote follow-up for ${client}`,
        eyebrow: "Quote follow-up",
        client,
        need: "Quote is still open. Churvox prepared a follow-up for owner review.",
        prepared: quoteFollowup(quote),
        draft: {
          title: `Quote follow-up for ${client}`,
          ownerNote: clean(quote.notes || quote.description),
          customerMessage: quoteFollowup(quote),
          invoiceDescription: "",
          amount: invoiceAmount(quote),
        },
        item: quote,
      });
    }
  });

  clients.slice(0, 12).forEach((client, index) => {
    const id = itemId(client, `client-${index}`);
    const name = clean(client.client_name || client.customer_name || client.name, `Client ${index + 1}`);
    if (!clean(client.email || client.phone || client.client_email || client.client_phone)) {
      processing.push({
        id: `client-${id}`,
        sourceId: id,
        kind: "client",
        title: `Client details need cleanup: ${name}`,
        eyebrow: "Client update",
        client: name,
        need: "Missing contact details can block reminders, invoices and quote follow-ups.",
        prepared: "Churvox flagged this client so owner/admin can add missing phone or email.",
        draft: {
          title: `Update client details for ${name}`,
          ownerNote: "Add missing contact details.",
          customerMessage: "",
          invoiceDescription: "",
          amount: "",
        },
        item: client,
      });
    }
  });

  return {
    counts: {
      jobs: jobs.length,
      clients: clients.length,
      team: team.length,
      quotes: quotes.length,
      invoices: invoices.length,
      input: input.length,
      processing: processing.length,
      approval: approval.length,
    },
    input,
    processing,
    approval,
  };
}

function WorkSlip({ slip, team, outputStatus, onClose, onSave, onApprove }) {
  const [draft, setDraft] = useState(slip?.draft || {});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(slip?.draft || {});
  }, [slip]);

  if (!slip) return null;

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function approve() {
    setBusy(true);
    try {
      await onApprove(slip, draft);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="om-slip-backdrop" onClick={onClose}>
      <section className="om-slip" onClick={(event) => event.stopPropagation()}>
        <header className="om-slip-head">
          <div>
            <span>{slip.eyebrow}</span>
            <h2>{slip.title}</h2>
            <p>{slip.need}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close work slip">×</button>
        </header>

        <section className="om-slip-context">
          <span>Prepared context</span>
          <p>{slip.prepared}</p>
        </section>

        <section className="om-slip-fields">
          <label>
            Clear title
            <input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} />
          </label>

          {slip.kind === "dispatch" ? (
            <label>
              Worker / crew choice
              <select value={draft.workerChoice || ""} onChange={(event) => update("workerChoice", event.target.value)}>
                <option value="">Choose worker</option>
                {team.map((worker, index) => {
                  const value = clean(worker.id || worker._id || worker.name || worker.full_name || worker.worker_name || `worker-${index}`);
                  const label = clean(worker.name || worker.full_name || worker.worker_name || worker.email || `Worker ${index + 1}`);
                  return <option value={value} key={value}>{label}</option>;
                })}
              </select>
            </label>
          ) : null}

          {(slip.kind === "invoice" || slip.kind === "cashflow" || slip.kind === "proof") ? (
            <>
              <label>
                Amount / owner input
                <input value={draft.amount || ""} onChange={(event) => update("amount", event.target.value)} placeholder="Add amount if missing" />
              </label>
              <label>
                Due date
                <input value={draft.dueDate || ""} onChange={(event) => update("dueDate", event.target.value)} placeholder="YYYY-MM-DD" />
              </label>
              <label className="wide">
                Invoice description
                <textarea value={draft.invoiceDescription || ""} onChange={(event) => update("invoiceDescription", event.target.value)} />
              </label>
            </>
          ) : null}

          <label className="wide">
            Owner note / fix
            <textarea value={draft.ownerNote || ""} onChange={(event) => update("ownerNote", event.target.value)} placeholder="Add what matters before approval..." />
          </label>

          <label className="wide">
            Message / prepared wording
            <textarea value={draft.customerMessage || ""} onChange={(event) => update("customerMessage", event.target.value)} placeholder="Edit before anything is copied, saved, or sent..." />
          </label>
        </section>

        {outputStatus ? <p className="om-slip-status">{outputStatus}</p> : null}

        <footer className="om-slip-actions">
          <button type="button" className="ghost" onClick={onClose}>Back</button>
          <button type="button" onClick={() => onSave(slip, draft)}>Save edit</button>
          <button type="button" className="approve" disabled={busy} onClick={approve}>
            {busy ? "Approving..." : "Approve"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function MachineLane({ title, subtitle, items, empty, onOpen, quiet }) {
  return (
    <section className={`om-lane ${quiet ? "quiet" : ""}`}>
      <header>
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
        <b>{items.length}</b>
      </header>

      <div className="om-lane-list">
        {items.length ? items.slice(0, 8).map((item) => (
          <button type="button" key={item.id} onClick={() => onOpen(item)} className={`om-slip-row ${item.kind}`}>
            <span>{item.eyebrow}</span>
            <strong>{item.title}</strong>
            <small>{item.need || item.detail}</small>
          </button>
        )) : <p className="om-empty">{empty}</p>}
      </div>
    </section>
  );
}

export default function OperatorMachine({ setPage, onLogout, data }) {
  const machine = useMemo(() => buildMachine(data || {}), [data]);
  const team = arrayFrom(data?.raw?.team, data?.raw?.workers, data?.team);
  const [activeSlip, setActiveSlip] = useState(null);
  const [outputLog, setOutputLog] = useState([]);
  const [outputStatus, setOutputStatus] = useState("");

  function go(page) {
    const paths = {
      dashboard: "/dashboard",
      jobs: "/jobs",
      clients: "/clients",
      team: "/team",
      quotes: "/quotes",
      invoices: "/invoices",
      proof: "/proof-to-paid",
      payroll: "/payroll",
      plans: "/plans",
      settings: "/settings",
    };
    setPage(page);
    window.history.pushState({}, "", paths[page] || "/dashboard");
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  function openSlip(slip) {
    setOutputStatus("");
    setActiveSlip(slip);
  }

  function saveEdit(slip, draft) {
    setOutputStatus("Edit saved in this Operator Machine session.");
    setOutputLog((current) => [
      {
        id: `${Date.now()}-${slip.id}`,
        type: "Saved edit",
        title: draft.title || slip.title,
        detail: "Owner edited the work slip before approval.",
      },
      ...current,
    ].slice(0, 8));
  }

  async function approveSlip(slip, draft) {
    setOutputStatus("Saving owner-approved action...");

    const payload = {
      type: slip.kind,
      group: slip.eyebrow,
      title: draft.title || slip.title,
      status: "approved",
      page: slip.kind === "dispatch" ? "jobs" : slip.kind === "quote" ? "quotes" : "invoices",
      source_id: slip.sourceId,
      source_type: slip.kind,
      draft: {
        ...draft,
        invoice_amount: draft.amount || "",
        invoice_description: draft.invoiceDescription || draft.customerMessage || "",
        owner_note: draft.ownerNote || "",
        customer_message: draft.customerMessage || "",
        worker_choice: draft.workerChoice || "",
      },
    };

    const paths =
      slip.kind === "dispatch"
        ? ["/ai/owner-command/dispatch/approve", "/ai/owner-command/approve"]
        : slip.kind === "invoice" || slip.kind === "proof"
          ? ["/ai/owner-command/invoice/approve", "/ai/owner-command/approve"]
          : slip.kind === "quote"
            ? ["/ai/owner-command/quote/approve", "/ai/owner-command/approve"]
            : slip.kind === "cashflow"
              ? ["/ai/owner-command/cashflow/approve", "/ai/owner-command/approve"]
              : ["/ai/owner-command/approve"];

    let lastError = null;
    for (const path of paths) {
      try {
        const result = await apiPost(path, payload);
        const message = result?.performed_result?.message || result?.message || "Approved and saved to Churvox.";
        setOutputStatus(message);
        setOutputLog((current) => [
          {
            id: `${Date.now()}-${slip.id}`,
            type: "Approved",
            title: draft.title || slip.title,
            detail: message,
          },
          ...current,
        ].slice(0, 8));
        return;
      } catch (err) {
        lastError = err;
      }
    }

    const message = lastError?.message || "Backend did not accept this approval yet.";
    setOutputStatus(message);
    setOutputLog((current) => [
      {
        id: `${Date.now()}-${slip.id}`,
        type: "Needs backend check",
        title: draft.title || slip.title,
        detail: message,
      },
      ...current,
    ].slice(0, 8));
  }

  const nav = [
    ["Operator Machine", "dashboard"],
    ["Jobs", "jobs"],
    ["Clients", "clients"],
    ["Team", "team"],
    ["Quotes", "quotes"],
    ["Invoices", "invoices"],
    ["Proof-to-Paid", "proof"],
    ["Payroll", "payroll"],
    ["Plans", "plans"],
    ["Settings", "settings"],
  ];

  return (
    <main className="om-shell">
      <aside className="om-nav">
        <button type="button" className="om-brand" onClick={() => go("dashboard")}>
          <i><b /></i>
          <span>
            <strong>Churvox</strong>
            <small>Operator Machine</small>
          </span>
        </button>

        <nav>
          {nav.map(([label, page]) => (
            <button type="button" className={page === "dashboard" ? "active" : ""} key={label} onClick={() => go(page)}>
              {label}
            </button>
          ))}
        </nav>

        <button type="button" className="om-logout" onClick={onLogout}>Log out</button>
      </aside>

      <section className="om-main">
        <header className="om-hero">
          <div>
            <span>Churvox Operator Machine</span>
            <h1>Work goes in. Churvox prepares the admin. You approve.</h1>
            <p>
              Jobs, proof, quotes, invoices, reminders and worker updates feed the machine in the background.
              The owner sees only the slips that need approval, edits, or a fix.
            </p>
          </div>

          <section className="om-gauges" aria-label="Machine counts">
            <article><span>Input</span><strong>{machine.counts.input}</strong></article>
            <article><span>Processing</span><strong>{machine.counts.processing}</strong></article>
            <article><span>Approval</span><strong>{machine.counts.approval}</strong></article>
          </section>
        </header>

        {data?.error ? <section className="om-warning"><b>Machine warning</b><span>{data.error}</span></section> : null}

        <section className="om-flow">
          <article><span>01</span><strong>Input Tray</strong><small>Work arrives</small></article>
          <article><span>02</span><strong>Processing Line</strong><small>Churvox checks</small></article>
          <article className="active"><span>03</span><strong>Approval Desk</strong><small>Owner decides</small></article>
          <article><span>04</span><strong>Output Log</strong><small>Actions recorded</small></article>
        </section>

        <section className="om-machine-grid">
          <MachineLane
            title="Input Tray"
            subtitle="What came in"
            items={machine.input}
            empty="No live work input found yet."
            onOpen={openSlip}
          />

          <MachineLane
            title="Processing Line"
            subtitle="What Churvox is checking"
            items={machine.processing}
            empty="Nothing needs processing right now."
            onOpen={openSlip}
          />

          <section className="om-approval-desk">
            <header>
              <div>
                <span>Open by default</span>
                <h2>Approval Desk</h2>
                <p>Approve invoices, assign workers, edit reminders, add missing amounts, or fix only what matters.</p>
              </div>
              <b>{machine.approval.length}</b>
            </header>

            <div className="om-approval-list">
              {machine.approval.length ? machine.approval.slice(0, 10).map((item) => (
                <button type="button" className={`om-approval-ticket ${item.kind}`} key={item.id} onClick={() => openSlip(item)}>
                  <span>{item.eyebrow}</span>
                  <strong>{item.title}</strong>
                  <small>{item.need}</small>
                  <em>Open Work Slip</em>
                </button>
              )) : (
                <section className="om-done-state">
                  <span />
                  <strong>No approvals waiting.</strong>
                  <p>When workers complete jobs, quotes age, invoices go unpaid, or a request comes in, the machine will prepare a work slip here.</p>
                </section>
              )}
            </div>
          </section>

          <MachineLane
            title="Output Log"
            subtitle="Quiet trail"
            items={outputLog.map((item) => ({
              ...item,
              eyebrow: item.type,
              need: item.detail,
              kind: "output",
            }))}
            empty="Approved actions will appear here."
            onOpen={() => {}}
            quiet
          />
        </section>
      </section>

      <WorkSlip
        slip={activeSlip}
        team={team}
        outputStatus={outputStatus}
        onClose={() => setActiveSlip(null)}
        onSave={saveEdit}
        onApprove={approveSlip}
      />
    </main>
  );
}

function OperatorAuth({ authMode, setAuthMode, onLogin }) {
  const signup = authMode === "signup";
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = signup
        ? await authRequest("/auth/register", {
            name: form.name,
            business_name: form.business_name,
            email: form.email,
            password: form.password,
          })
        : await authRequest("/auth/login", {
            email: form.email,
            password: form.password,
          });

      saveSession(payload);
      onLogin();
    } catch (err) {
      setError(err.message || "Could not open Churvox");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="om-auth" id="login">
      <span>{signup ? "Start the machine" : "Secure owner login"}</span>
      <h2>{signup ? "Create Churvox workspace" : "Open Operator Machine"}</h2>
      {error ? <p className="om-auth-error">{error}</p> : null}

      <form onSubmit={submit}>
        {signup ? (
          <>
            <label>Your name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
            <label>Business name<input value={form.business_name} onChange={(event) => update("business_name", event.target.value)} /></label>
          </>
        ) : null}
        <label>Email<input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
        <label>Password<input required type="password" value={form.password} onChange={(event) => update("password", event.target.value)} /></label>
        <button type="submit" disabled={busy}>{busy ? "Opening..." : signup ? "Start free trial" : "Open Churvox"}</button>
      </form>

      <button
        type="button"
        className="om-auth-switch"
        onClick={() => {
          setError("");
          setAuthMode(signup ? "login" : "signup");
        }}
      >
        {signup ? "Already have an account? Log in" : "Need an account? Start free trial"}
      </button>
    </section>
  );
}

export function OperatorLanding({ authMode, setAuthMode, onLogin }) {
  const prices = [
    ["Start", "$39", "For owner operators"],
    ["Crew", "$89", "For small teams"],
    ["Operator", "$149", "Most Popular"],
    ["Command", "$299", "For growing crews"],
  ];

  function signup() {
    setAuthMode("signup");
    setTimeout(() => document.getElementById("login")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  return (
    <main className="om-public" id="top">
      <header className="om-public-nav">
        <a href="#top" className="om-public-brand">
          <i><b /></i>
          <span><strong>Churvox</strong><small>Operator Machine</small></span>
        </a>
        <nav>
          <a href="#machine">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#login">Login</a>
        </nav>
      </header>

      <section className="om-public-hero">
        <div>
          <span>Churvox does the admin. You approve.</span>
          <h1>Turn trade work into owner-approved admin without the dashboard mess.</h1>
          <p>
            Work goes in. Churvox checks it, prepares invoices, reminders, quote follow-ups,
            worker assignments and proof-to-paid admin. You approve, edit, or fix only what matters.
          </p>
          <div className="om-public-actions">
            <button type="button" onClick={signup}>Start free trial</button>
            <a href="#pricing">View pricing</a>
          </div>
        </div>

        <section className="om-public-machine" id="machine">
          {["Input Tray", "Processing Line", "Approval Desk", "Output Log"].map((label, index) => (
            <article key={label} className={index === 2 ? "active" : ""}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{label}</strong>
              <small>
                {index === 0
                  ? "Requests, jobs, proof"
                  : index === 1
                    ? "Churvox checks gaps"
                    : index === 2
                      ? "Owner approves"
                      : "Actions recorded"}
              </small>
            </article>
          ))}
        </section>
      </section>

      <section className="om-public-proof">
        <article>
          <span>Not a normal dashboard</span>
          <strong>Complex features feed one simple machine.</strong>
          <p>Jobs, clients, team, quotes, invoices, proof-to-paid, payroll, plans and settings stay powerful. The first screen only shows the work that needs owner action.</p>
        </article>
        <article>
          <span>Approval-first AI</span>
          <strong>Nothing risky happens blindly.</strong>
          <p>Churvox can prepare the admin, but owner approval stays in front of messages, invoices, pricing, payroll and accounting actions.</p>
        </article>
      </section>

      <section className="om-public-pricing" id="pricing">
        <header>
          <span>Pricing</span>
          <h2>Easy to understand. Built around AI Operator Actions.</h2>
        </header>
        <div>
          {prices.map(([name, price, body]) => (
            <article key={name} className={name === "Operator" ? "featured" : ""}>
              <span>{body}</span>
              <h3>{name}</h3>
              <strong>{price}<small>/month + GST</small></strong>
              <button type="button" onClick={signup}>{name === "Operator" ? "Choose Operator" : `Choose ${name}`}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="om-public-access">
        <div>
          <span>Secure workspace</span>
          <h2>Open Churvox Operator Machine.</h2>
          <p>Start a trial or log in to your existing workspace.</p>
        </div>
        <OperatorAuth authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />
      </section>
    </main>
  );
}
