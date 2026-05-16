import React, { useEffect, useMemo, useState } from "react";
import "./OperatorMachine.css";
// PHASE_73_PLANS_PRICING_BOARD
// PHASE_72_ACTIVE_PLAN_ADDONS_SMS
// PHASE_71_PLAN_FEATURE_LOCKS
// PHASE_70_PROPER_PLAN_SLIP
// PHASE_68_OPERATOR_MACHINE_POLISH

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

  if (slip.kind === "plan" || slip.kind === "addon") {
    const features = Array.isArray(slip.features) ? slip.features : [];
    return (
      <div className="om-slip-backdrop" onClick={onClose}>
        <section className="om-slip om-plan-slip" onClick={(event) => event.stopPropagation()}>
          <header className="om-slip-head">
            <div>
              <span>{slip.badge || slip.eyebrow}</span>
              <h2>{slip.title}</h2>
              <p>{slip.need}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close plan slip">×</button>
          </header>

          <section className="om-plan-slip-body">
            <article className="om-plan-price-card">
              <span>{slip.kind === "addon" ? "Add-on price" : "Plan price"}</span>
              <strong>{slip.price}<small>/month + GST</small></strong>
              <p>{slip.prepared}</p>
            </article>

            <article className="om-plan-feature-card">
              <span>Included</span>
              <div>
                {features.map((feature) => (
                  <b key={feature}>{feature}</b>
                ))}
              </div>
            </article>

            <article className="om-plan-machine-note">
              <span>How this fits Churvox</span>
              <p>
                {slip.kind === "addon"
                  ? "Add-ons extend Churvox without changing the main plan. Growth Packs add scale, MYOB adds accounting sync, and SMS credits add prepaid messaging capacity."
                  : "The plan controls how much of the Operator Machine Churvox can run for the business. Owner approval still stays in front of sensitive actions."}
              </p>
            </article>
          </section>

          <footer className="om-slip-actions">
            <button type="button" className="ghost" onClick={onClose}>Back</button>
            <button
              type="button"
              className="approve"
              onClick={() => {
                setOutputLog((current) => [
                  {
                    id: `${Date.now()}-${slip.id}`,
                    type: "Plan reviewed",
                    title: slip.title,
                    detail: `${slip.planName || slip.eyebrow} selected for owner review.`,
                  },
                  ...current,
                ].slice(0, 8));
                try {
                  if (slip.kind === "addon") {
                    localStorage.setItem("churvox_selected_addon", slip.id || slip.planName || slip.eyebrow);
                  } else {
                    localStorage.setItem("churvox_plan", normalisePlanName(slip.planName || slip.eyebrow));
                  }
                } catch {
                  // ignore local plan preview storage
                }
                setOutputStatus(`${slip.planName || "Plan"} selected. Checkout wiring can be connected next.`);
              }}
            >
              {slip.cta || "Choose plan"}
            </button>
          </footer>
        </section>
      </div>
    );
  }

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

function MachineLane({ title, subtitle, items, empty, onOpen, quiet, limit = 5 }) {
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
        {items.length ? items.slice(0, limit).map((item) => (
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



const OM_PLAN_DEFS = {
  start: {
    label: "Start",
    price: "$39",
    rank: 1,
    includes: ["Jobs", "Clients", "Quotes", "Invoices", "Basic Operator Machine"],
  },
  crew: {
    label: "Crew",
    price: "$89",
    rank: 2,
    includes: ["Everything in Start", "Team", "Worker workflow", "Proof-to-Paid", "Time tracking"],
  },
  operator: {
    label: "Operator",
    price: "$149",
    rank: 3,
    includes: ["Everything in Crew", "AI Operator Actions", "Draft invoices", "Quote follow-ups", "Payment reminders", "MYOB add-on available"],
  },
  command: {
    label: "Command",
    price: "$299",
    rank: 4,
    includes: ["Everything in Operator", "Payroll", "MYOB included", "Advanced roles", "Higher limits", "Advanced automation"],
  },
};

const OM_PAGE_PLAN = {
  dashboard: "start",
  jobs: "start",
  clients: "start",
  quotes: "start",
  invoices: "start",
  settings: "start",
  plans: "start",
  team: "crew",
  proof: "crew",
  payroll: "command",
};

function normalisePlanName(value) {
  const raw = clean(value, "start").toLowerCase();
  if (raw.includes("command") || raw.includes("enterprise")) return "command";
  if (raw.includes("operator") || raw.includes("pro")) return "operator";
  if (raw.includes("crew") || raw.includes("team")) return "crew";
  if (raw.includes("start") || raw.includes("solo")) return "start";
  return "start";
}

function currentPlanKey(data = {}) {
  const raw = data.raw || {};
  const user = raw.user || raw.profile || data.user || data.profile || {};
  const billing = raw.billing || raw.subscription || data.billing || data.subscription || {};

  try {
    const stored =
      localStorage.getItem("churvox_plan") ||
      localStorage.getItem("plan") ||
      localStorage.getItem("selectedPlan") ||
      "";
    const candidate =
      billing.plan ||
      billing.plan_name ||
      billing.tier ||
      billing.current_plan ||
      user.plan ||
      user.plan_name ||
      user.tier ||
      data.plan ||
      stored ||
      "start";

    return normalisePlanName(candidate);
  } catch {
    return "start";
  }
}

function planRank(plan) {
  return OM_PLAN_DEFS[normalisePlanName(plan)]?.rank || 1;
}

function planAllows(currentPlan, requiredPlan) {
  return planRank(currentPlan) >= planRank(requiredPlan);
}

function requiredPlanForPage(page) {
  return OM_PAGE_PLAN[page] || "start";
}

function planLabel(plan) {
  return OM_PLAN_DEFS[normalisePlanName(plan)]?.label || "Start";
}

function planPrice(plan) {
  return OM_PLAN_DEFS[normalisePlanName(plan)]?.price || "$39";
}

function featureLockedMessage(page) {
  const required = requiredPlanForPage(page);
  const labels = {
    team: "Team and worker workflow starts on Crew.",
    proof: "Proof-to-Paid starts on Crew because it depends on worker notes, photos and completion flow.",
    payroll: "Payroll is a Command feature because it needs locked-down payroll access, timesheets and pay review.",
  };

  return labels[page] || `${featureConfig(page).label} requires ${planLabel(required)}.`;
}


function rowsForPage(page, machine, data = {}) {
  const raw = data.raw || {};
  const source = {
    jobs: arrayFrom(raw.jobs, data.jobs),
    clients: arrayFrom(raw.clients, data.clients),
    team: arrayFrom(raw.team, raw.workers, data.team),
    quotes: arrayFrom(raw.quotes, data.quotes),
    invoices: arrayFrom(raw.invoices, data.invoices),
    proof: machine.processing.filter((item) => item.kind === "proof"),
    payroll: arrayFrom(raw.team, raw.workers, data.team),
    plans: [],
    settings: [],
  }[page] || [];

  if (page === "proof") return source;

  if (page === "plans") {
    return [
      {
        id: "plan-start",
        eyebrow: "Start",
        title: "Start · $39/month + GST",
        need: "For solo operators who need the basics clean and simple.",
        kind: "plan",
        price: "$39",
        planName: "Start",
        badge: "Solo operators",
        prepared: "Jobs, clients, quotes, invoices and basic Operator Machine. Best for one-person businesses that want the work organised without advanced AI Operator capacity.",
        features: ["Jobs", "Clients", "Quotes", "Invoices", "Basic Operator Machine"],
        cta: "Choose Start",
      },
      {
        id: "plan-crew",
        eyebrow: "Crew",
        title: "Crew · $89/month + GST",
        need: "For small teams that need worker workflow and job proof.",
        kind: "plan",
        price: "$89",
        planName: "Crew",
        badge: "Small teams",
        prepared: "Worker app, job assignment, notes, proof photos and time tracking. Best when the business has crew in the field and the owner needs cleaner updates.",
        features: ["Worker app", "Job assignment", "Notes", "Photos", "Time tracking"],
        cta: "Choose Crew",
      },
      {
        id: "plan-operator",
        eyebrow: "Operator",
        title: "Operator · $149/month + GST",
        need: "Most Popular. The plan where Churvox starts preparing the admin.",
        kind: "plan",
        price: "$149",
        planName: "Operator",
        badge: "Most Popular",
        prepared: "AI Operator Actions, draft invoices, quote follow-ups, payment reminders and approval-first admin. Best for owners who want Churvox doing the admin prep.",
        features: ["AI Operator Actions", "Draft invoices", "Quote follow-ups", "Payment reminders", "Approval Desk"],
        cta: "Choose Operator",
      },
      {
        id: "plan-command",
        eyebrow: "Command",
        title: "Command · $299/month + GST",
        need: "For growing teams that need the full operating machine.",
        kind: "plan",
        price: "$299",
        planName: "Command",
        badge: "Growing teams",
        prepared: "MYOB included, payroll workspace, advanced roles, higher limits, stronger automation and Command Growth Packs for extra active team members.",
        features: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher limits", "Automation"],
        cta: "Choose Command",
      },
      {
        id: "addon-growth-pack",
        eyebrow: "Growth add-on",
        title: "Command Growth Pack · $99/month + GST",
        need: "Add more active team capacity and more Operator Machine power as the business grows.",
        kind: "addon",
        price: "$99",
        planName: "Command Growth Pack",
        badge: "Active add-on",
        prepared: "Adds 50 extra active team members, extra job capacity, extra AI Operator Actions, extra automation runs, and extra admin/payroll capacity. Only active team members count, so old or inactive staff records do not increase the bill.",
        features: ["+50 active team members", "Extra job capacity", "Extra AI Operator Actions", "Extra automation runs", "Extra admin/payroll capacity"],
        cta: "Add Growth Pack",
      },
      {
        id: "addon-myob-operator",
        eyebrow: "MYOB add-on",
        title: "MYOB add-on · $39/month + GST",
        need: "Optional MYOB sync add-on for Operator. Included by default on Command.",
        kind: "addon",
        price: "$39",
        planName: "MYOB add-on",
        badge: "Operator add-on",
        prepared: "Adds MYOB sync capacity to Operator. Command includes MYOB by default. Churvox keeps accounting actions approval-first so invoice/payment sync does not happen blindly.",
        features: ["Operator add-on", "Included on Command", "Invoice sync", "Payment status sync", "Approval-first"],
        cta: "Add MYOB",
      },
      {
        id: "addon-sms-100",
        eyebrow: "SMS credits",
        title: "100 SMS credits · $10",
        need: "Prepaid SMS credits for reminders and customer messages.",
        kind: "addon",
        price: "$10",
        planName: "100 SMS credits",
        badge: "Active add-on",
        prepared: "Buy 100 prepaid SMS credits. SMS credits are separate from the monthly plan and are used for reminders, customer updates and message actions inside Churvox.",
        features: ["100 SMS credits", "Prepaid pack", "Separate from plan", "Use for reminders", "Use for customer updates"],
        cta: "Buy 100 credits",
      },
      {
        id: "addon-sms-500",
        eyebrow: "SMS credits",
        title: "500 SMS credits · $45",
        need: "Better value prepaid SMS credits for regular customer reminders.",
        kind: "addon",
        price: "$45",
        planName: "500 SMS credits",
        badge: "Best value",
        prepared: "Buy 500 prepaid SMS credits. Good for businesses sending regular job reminders, quote nudges, payment reminders and customer updates.",
        features: ["500 SMS credits", "Better value", "Prepaid pack", "Separate from plan", "Regular reminders"],
        cta: "Buy 500 credits",
      },
      {
        id: "addon-sms-1000",
        eyebrow: "SMS credits",
        title: "1000 SMS credits · $80",
        need: "Largest prepaid SMS pack for busy teams.",
        kind: "addon",
        price: "$80",
        planName: "1000 SMS credits",
        badge: "Busy teams",
        prepared: "Buy 1000 prepaid SMS credits. Best for larger teams using SMS heavily for reminders, job updates and payment follow-ups.",
        features: ["1000 SMS credits", "Largest pack", "Prepaid pack", "Separate from plan", "High message volume"],
        cta: "Buy 1000 credits",
      },
    ];
  }

  if (page === "settings") {
    return [
      { id: "settings-business", eyebrow: "Business setup", title: "Business details", need: "Business name, trade type, region and invoice wording feed the Operator Machine.", kind: "settings" },
      { id: "settings-guardrails", eyebrow: "Owner controls", title: "Approval guardrails", need: "Churvox prepares admin, but sensitive actions stay owner-approved.", kind: "settings" },
      { id: "settings-integrations", eyebrow: "Connected systems", title: "MYOB, email, SMS and imports", need: "Integrations should feed prepared actions, not send blindly.", kind: "settings" },
    ];
  }

  return source.map((item, index) => {
    const title = clean(
      item.title ||
      item.job_title ||
      item.client_name ||
      item.customer_name ||
      item.name ||
      item.invoice_number ||
      item.quote_number ||
      item.email,
      `${page} record ${index + 1}`
    );

    const detail = clean(
      item.description ||
      item.message ||
      item.notes ||
      item.address ||
      item.email ||
      item.phone ||
      item.status ||
      item.invoice_status ||
      item.quote_status ||
      item.job_status,
      "Open the work slip to review details."
    );

    return {
      id: `${page}-${itemId(item, index)}`,
      sourceId: itemId(item, index),
      eyebrow:
        page === "jobs" ? "Job" :
        page === "clients" ? "Client" :
        page === "team" ? "Worker" :
        page === "quotes" ? "Quote" :
        page === "invoices" ? "Invoice" :
        page === "payroll" ? "Payroll source" :
        "Record",
      title,
      need: detail,
      kind: page,
      item,
      draft: {
        title,
        ownerNote: detail,
        customerMessage:
          page === "quotes" ? quoteFollowup(item) :
          page === "invoices" ? reminderMessage(item) :
          page === "jobs" ? invoiceDescription(item) :
          "",
        invoiceDescription:
          page === "jobs" || page === "invoices" ? invoiceDescription(item) : "",
        amount: invoiceAmount(item),
        dueDate: "",
      },
    };
  });
}

function featureConfig(page) {
  const configs = {
    jobs: {
      label: "Jobs",
      title: "Jobs feed the Operator Machine.",
      body: "Create, assign and complete work here. Churvox uses the job data to prepare dispatch, proof-to-paid and invoice actions.",
      primary: "Open job slip",
      empty: "No jobs found yet.",
      machine: ["Dispatch", "Proof", "Invoice prep"],
    },
    clients: {
      label: "Clients",
      title: "Clients power clean jobs, quotes and invoices.",
      body: "Keep client details tidy once. Churvox uses them in prepared messages, invoices and follow-ups.",
      primary: "Open client slip",
      empty: "No clients found yet.",
      machine: ["Contact check", "Duplicate check", "Invoice context"],
    },
    team: {
      label: "Team",
      title: "Team records power worker matching.",
      body: "Roles, regions and availability help Churvox recommend the right worker without dumping decisions on the owner.",
      primary: "Open worker slip",
      empty: "No team records found yet.",
      machine: ["Worker fit", "Region", "Workload"],
    },
    quotes: {
      label: "Quotes",
      title: "Quotes become prepared follow-ups.",
      body: "Churvox watches quote age, client details and status, then prepares owner-approved follow-up wording.",
      primary: "Open quote slip",
      empty: "No quotes found yet.",
      machine: ["Age check", "Follow-up draft", "Convert to job"],
    },
    invoices: {
      label: "Invoices",
      title: "Invoices become cashflow actions.",
      body: "Churvox checks drafts, missing amounts and unpaid invoices, then prepares reminders or owner fixes.",
      primary: "Open invoice slip",
      empty: "No invoices found yet.",
      machine: ["Amount check", "Payment status", "Reminder draft"],
    },
    proof: {
      label: "Proof-to-Paid",
      title: "Worker proof becomes invoice-ready admin.",
      body: "Notes, photos and completion details feed better invoice descriptions and owner approval.",
      primary: "Open proof slip",
      empty: "No proof packages found yet.",
      machine: ["Notes", "Photos", "Invoice wording"],
    },
    payroll: {
      label: "Payroll",
      title: "Payroll stays controlled and review-first.",
      body: "Timesheets, worker hours and pay summaries should be prepared for review, not blindly changed.",
      primary: "Open payroll source",
      empty: "No payroll source records found yet.",
      machine: ["Timesheets", "Hours", "Review"],
    },
    plans: {
      label: "Plans",
      title: "Pricing stays easy to understand.",
      body: "Start simple. Move into Operator when you want Churvox preparing the admin. Growth Packs, MYOB add-on and SMS credits are active add-ons.",
      primary: "Review",
      empty: "Plan options are loading.",
      machine: ["Start", "Crew", "Operator", "Command", "Growth Pack", "MYOB", "SMS Credits"],
    },
    settings: {
      label: "Settings",
      title: "Teach Churvox how the business should run.",
      body: "Business details, owner controls and integrations feed the machine in the background.",
      primary: "Review setting",
      empty: "Settings are ready.",
      machine: ["Business setup", "Guardrails", "Integrations"],
    },
  };

  return configs[page] || configs.jobs;
}


function PlanPricingBoard({ data, currentPlan, onOpen }) {
  const rows = rowsForPage("plans", buildMachine(data || {}), data || {});
  const mainPlans = rows.filter((row) => row.kind === "plan");
  const addOns = rows.filter((row) => row.kind === "addon");
  const current = planLabel(currentPlan);

  const smsAddons = addOns.filter((row) => String(row.id || "").includes("sms"));
  const otherAddons = addOns.filter((row) => !String(row.id || "").includes("sms"));

  return (
    <section className="om-plans-board" data-phase="PHASE_73_PLANS_PRICING_BOARD">
      <header className="om-plans-board-hero">
        <div>
          <span>Plans</span>
          <h1>Pricing stays easy to understand.</h1>
          <p>
            Choose the machine level. Add Growth Pack, MYOB or SMS credits when the business needs more power.
          </p>
        </div>

        <aside>
          <b>Current plan: {current}</b>
          <b>Operator is the main AI admin plan</b>
          <b>Command includes MYOB + payroll</b>
        </aside>
      </header>

      <section className="om-plan-board-section">
        <header>
          <div>
            <span>Main plans</span>
            <h2>Pick the Churvox level.</h2>
          </div>
          <small>Monthly + GST</small>
        </header>

        <div className="om-plan-card-grid">
          {mainPlans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              className={`om-plan-board-card ${plan.planName === "Operator" ? "featured" : ""}`}
              onClick={() => onOpen(plan)}
            >
              <span>{plan.badge || plan.eyebrow}</span>
              <strong>{plan.planName || plan.eyebrow}</strong>
              <b>{plan.price}<small>/month + GST</small></b>
              <p>{plan.need}</p>
              <em>{plan.cta || "Review plan"}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="om-plan-board-section addons">
        <header>
          <div>
            <span>Growth + Add-ons</span>
            <h2>Add power without confusing the plans.</h2>
          </div>
          <small>Active add-ons</small>
        </header>

        <div className="om-addon-board">
          {otherAddons.map((addon) => (
            <button type="button" key={addon.id} className="om-addon-card" onClick={() => onOpen(addon)}>
              <span>{addon.badge || addon.eyebrow}</span>
              <strong>{addon.planName || addon.eyebrow}</strong>
              <b>{addon.price}<small>{addon.id === "addon-growth-pack" || addon.id === "addon-myob-operator" ? "/month + GST" : ""}</small></b>
              <p>{addon.need}</p>
              <em>{addon.cta || "Review add-on"}</em>
            </button>
          ))}

          <article className="om-sms-pack-card">
            <span>SMS credits</span>
            <strong>Prepaid SMS credit packs</strong>
            <p>SMS credits are separate from the monthly plan and used for reminders, job updates and payment follow-ups.</p>

            <div>
              {smsAddons.map((addon) => (
                <button type="button" key={addon.id} onClick={() => onOpen(addon)}>
                  <b>{addon.planName}</b>
                  <small>{addon.price}</small>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}


function FeatureWorkspace({ page, machine, data, currentPlan, onOpen, onPlans }) {
  if (page === "plans") {
    return <PlanPricingBoard data={data} currentPlan={currentPlan} onOpen={onOpen} />;
  }

  const config = featureConfig(page);
  const rows = rowsForPage(page, machine, data);
  const topRows = rows.slice(0, 12);
  const requiredPlan = requiredPlanForPage(page);
  const locked = !planAllows(currentPlan, requiredPlan);

  if (locked) {
    return (
      <section className="om-feature-workspace om-feature-locked" data-phase="PHASE_71_PLAN_FEATURE_LOCKS">
        <header className="om-feature-hero">
          <div>
            <span>{config.label}</span>
            <h1>{config.title}</h1>
            <p>{featureLockedMessage(page)}</p>
          </div>
          <aside>
            <b>Current: {planLabel(currentPlan)}</b>
            <b>Required: {planLabel(requiredPlan)}</b>
            <b>{planPrice(requiredPlan)}/month + GST</b>
          </aside>
        </header>

        <section className="om-plan-lock-card">
          <div>
            <span>Feature locked</span>
            <h2>{config.label} is included in {planLabel(requiredPlan)}.</h2>
            <p>
              Churvox keeps this feature visible so the owner knows where it lives,
              but the actual workspace stays locked until the plan includes it.
            </p>
          </div>

          <article>
            <strong>{planLabel(requiredPlan)} includes</strong>
            {(OM_PLAN_DEFS[requiredPlan]?.includes || []).map((item) => (
              <b key={item}>{item}</b>
            ))}
          </article>

          <button type="button" onClick={onPlans}>
            View plans
          </button>
        </section>
      </section>
    );
  }

  return (
    <section className="om-feature-workspace" data-phase="PHASE_69_OPERATOR_MACHINE_ALL_PAGES">
      <header className="om-feature-hero">
        <div>
          <span>{config.label}</span>
          <h1>{config.title}</h1>
          <p>{config.body}</p>
        </div>
        <aside>
          {config.machine.map((item) => (
            <b key={item}>{item}</b>
          ))}
        </aside>
      </header>

      <section className="om-feature-layout">
        <section className="om-feature-records">
          <header>
            <div>
              <span>Records</span>
              <h2>{config.label}</h2>
              <p>Simple list first. Details open in one Work Slip.</p>
            </div>
            <b>{rows.length}</b>
          </header>

          <div>
            {topRows.length ? topRows.map((item) => (
              <button type="button" className={`om-feature-row ${item.kind}`} key={item.id} onClick={() => onOpen(item)}>
                <span>{item.eyebrow}</span>
                <strong>{item.title}</strong>
                <small>{item.need}</small>
                <em>{config.primary}</em>
              </button>
            )) : (
              <article className="om-feature-empty">
                <strong>{config.empty}</strong>
                <p>When records are added, Churvox will use them to prepare owner-approved actions.</p>
              </article>
            )}
          </div>
        </section>

        <aside className="om-feature-machine">
          <span>How this feeds the machine</span>
          <h2>Power stays in the background.</h2>
          <p>
            This page keeps the full feature available, but the Operator Machine only surfaces what needs owner action.
          </p>

          <div>
            <article><b>Input</b><small>Records enter once.</small></article>
            <article><b>Check</b><small>Churvox looks for gaps.</small></article>
            <article><b>Prepare</b><small>Admin is drafted with context.</small></article>
            <article><b>Approve</b><small>Owner stays in control.</small></article>
          </div>
        </aside>
      </section>
    </section>
  );
}


export default function OperatorMachine({ page = "dashboard", setPage, onLogout, data }) {
  const currentPlan = currentPlanKey(data || {});
  const machine = useMemo(() => buildMachine(data || {}), [data]);
  const team = arrayFrom(data?.raw?.team, data?.raw?.workers, data?.team);
  const [activeSlip, setActiveSlip] = useState(null);
  const [outputLog, setOutputLog] = useState([]);
  const [outputStatus, setOutputStatus] = useState("");
  const [showAllApprovals, setShowAllApprovals] = useState(false);

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

  const visibleApprovals = showAllApprovals ? machine.approval.slice(0, 24) : machine.approval.slice(0, 5);
  const hiddenApprovalCount = Math.max(machine.approval.length - visibleApprovals.length, 0);

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
          {nav.map(([label, navPage]) => (
            <button type="button" className={navPage === page ? "active" : ""} key={label} onClick={() => go(navPage)}>
              <span>{label}</span>
              {!planAllows(currentPlan, requiredPlanForPage(navPage)) ? <small>Locked</small> : null}
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
            <article><span>Plan</span><strong>{planLabel(currentPlan)}</strong></article>
            <article><span>Processing</span><strong>{machine.counts.processing}</strong></article>
            <article><span>Approval</span><strong>{machine.counts.approval}</strong></article>
          </section>
        </header>

        {data?.error ? <section className="om-warning"><b>Machine warning</b><span>{data.error}</span></section> : null}

        {page === "dashboard" ? (
          <>
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
              {visibleApprovals.length ? visibleApprovals.map((item) => (
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

              {hiddenApprovalCount > 0 ? (
                <button type="button" className="om-view-all-approvals" onClick={() => setShowAllApprovals(true)}>
                  View all {machine.approval.length} approvals
                </button>
              ) : null}

              {showAllApprovals && machine.approval.length > 5 ? (
                <button type="button" className="om-view-all-approvals secondary" onClick={() => setShowAllApprovals(false)}>
                  Show top 5 only
                </button>
              ) : null}
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
          </>
        ) : (
          <FeatureWorkspace page={page} machine={machine} data={data} currentPlan={currentPlan} onOpen={openSlip} onPlans={() => go("plans")} />
        )}
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
