import React, { useEffect, useMemo, useState } from "react";
import "./CommandSuite.css";

const PAGE_MAP = {
  dashboard: "dashboard",
  jobs: "work",
  work: "work",
  clients: "clients",
  team: "crew",
  crew: "crew",
  quotes: "quotes",
  invoices: "invoices",
  proof: "proof",
  payments: "proof",
  payroll: "payroll",
  plans: "plans",
  settings: "settings",
};

const NAV_ITEMS = [
  ["Dashboard", "dashboard", "target"],
  ["Work", "jobs", "briefcase"],
  ["Clients", "clients", "client"],
  ["Crew", "team", "crew"],
  ["Quotes", "quotes", "document"],
  ["Invoices", "invoices", "money"],
  ["Proof & Pay", "proof", "photo"],
  ["Payroll", "payroll", "pulse"],
  ["Plans", "plans", "shield"],
  ["Settings", "settings", "gear"],
];

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function rowsFrom(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object" && Array.isArray(value.items)) return value.items;
    if (value && typeof value === "object" && Array.isArray(value.results)) return value.results;
    if (value && typeof value === "object" && Array.isArray(value.data)) return value.data;
  }
  return [];
}

function money(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n) || n <= 0) return "$0";
  return `$${n.toLocaleString()}`;
}

function statusOf(item = {}) {
  return clean(item.status || item.job_status || item.workflow_status || item.state || "Ready");
}

function areaOf(item = {}) {
  return clean(item.area || item.region || item.suburb || item.location || item.address || "Not set");
}

function clientName(item = {}) {
  return clean(
    item.client_name ||
      item.clientName ||
      item.customer_name ||
      item.customerName ||
      item.client ||
      item.name ||
      "Client"
  );
}

function workerName(item = {}) {
  return clean(
    item.worker_name ||
      item.assigned_worker_name ||
      item.assignedWorkerName ||
      item.employee_name ||
      item.full_name ||
      item.name ||
      "Unassigned"
  );
}

function titleOf(item = {}, fallback = "Record") {
  return clean(
    item.title ||
      item.name ||
      item.job_title ||
      item.jobTitle ||
      item.description ||
      item.invoice_number ||
      item.quote_number ||
      item.number ||
      fallback
  );
}

function idOf(item = {}, index = 0) {
  return clean(item.id || item._id || item.uuid || item.number || item.invoice_number || item.quote_number || `row-${index}`);
}

function textOf(item = {}) {
  return Object.values(item || {}).map((value) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") return "";
    return clean(value);
  }).join(" ").toLowerCase();
}

function slipText(item = {}) {
  return [
    item.kind,
    item.eyebrow,
    item.title,
    item.need,
    item.prepared,
    item.detail,
    item.status,
    item.reason,
    item.ai_reason,
  ].map(clean).join(" ").toLowerCase();
}

function riskFor(item = {}) {
  const text = slipText(item) || textOf(item);
  if (
    text.includes("missing") ||
    text.includes("blocked") ||
    text.includes("failed") ||
    text.includes("overdue") ||
    text.includes("risk") ||
    text.includes("amount") ||
    text.includes("no email") ||
    text.includes("no phone")
  ) {
    return { label: "High risk", tone: "high" };
  }
  if (
    text.includes("quote") ||
    text.includes("follow") ||
    text.includes("payment") ||
    text.includes("reminder") ||
    text.includes("worker") ||
    text.includes("crew") ||
    text.includes("dispatch")
  ) {
    return { label: "Medium", tone: "medium" };
  }
  return { label: "Low risk", tone: "low" };
}

function aiReason(item = {}, fallback = "Churvox prepared this for review.") {
  return clean(item.prepared || item.need || item.ai_reason || item.reason, fallback);
}

function Icon({ type }) {
  return <i className={`cs-icon ${type || "spark"}`} aria-hidden="true" />;
}

function filterRows(rows, filter) {
  // PHASE_283_DETERMINISTIC_FILTERS
  if (!filter || filter === "All") return rows;

  const label = clean(filter).toLowerCase();
  const compact = label.replace(/[^a-z0-9]/g, "");

  const tests = {
    needsaction: (row) => /need|missing|risk|blocked|overdue|draft|ready|unassigned|follow|review/i.test(textOf(row)),
    unassigned: (row) => workerName(row) === "Unassigned",
    today: (row) => /today/i.test(textOf(row)) || new Date().toISOString().slice(0, 10) && textOf(row).includes(new Date().toISOString().slice(0, 10)),
    active: (row) => /active|progress|started|working/i.test(statusOf(row)),
    completed: (row) => /complete|completed|done|finished/i.test(statusOf(row)),
    readytoinvoice: (row) => /ready|invoice|complete|completed|finished/i.test(textOf(row)),
    needsdetails: (row) => !clean(row.email || row.phone || row.mobile || row.address || row.area || row.region),
    activework: (row) => /active|progress|started|job|work/i.test(textOf(row)),
    owing: (row) => /owing|unpaid|overdue|due/i.test(textOf(row)),
    followup: (row) => /follow|sent|pending|await|open/i.test(textOf(row)),
    allclients: () => true,
    available: (row) => /available|ready/i.test(textOf(row)),
    overloaded: (row) => /overload|busy|full|risk/i.test(textOf(row)),
    needsupdate: (row) => /missing|update|review|needs/i.test(textOf(row)),
    allcrew: () => true,
    drafts: (row) => /draft|new/i.test(textOf(row)),
    awaiting: (row) => /await|pending|sent|open/i.test(textOf(row)),
    accepted: (row) => /accept|approved|won/i.test(textOf(row)),
    allquotes: () => true,
    readytosend: (row) => /ready/i.test(textOf(row)),
    overdue: (row) => /overdue/i.test(textOf(row)),
    paid: (row) => /paid|settled/i.test(textOf(row)),
    photos: (row) => (Array.isArray(row.photos) && row.photos.length > 0) || /photo|proof/i.test(textOf(row)),
    paymentfollowup: (row) => /payment|owing|unpaid|overdue|reminder/i.test(textOf(row)),
    allproof: () => true,
    needsreview: (row) => /review|missing|risk|flag/i.test(textOf(row)),
    approved: (row) => /approved|ready|ok/i.test(textOf(row)),
    missingclockoff: (row) => /clock|missing|started|no end|no clock/i.test(textOf(row)),
    exportready: (row) => /export|ready|approved/i.test(textOf(row)),
    business: (row) => /business|profile|company/i.test(textOf(row)),
    roles: (row) => /role|team|permission/i.test(textOf(row)),
    aioperator: (row) => /ai|operator|approval/i.test(textOf(row)),
    billing: (row) => /billing|plan|stripe|subscription/i.test(textOf(row)),
    myob: (row) => /myob/i.test(textOf(row)),
    sms: (row) => /sms|credit|message/i.test(textOf(row)),
    security: (row) => /security|login|access/i.test(textOf(row)),
    monthly: (row) => /month|monthly|\$/i.test(textOf(row)),
    command: (row) => /command/i.test(textOf(row)),
  };

  const test = tests[compact];
  if (test) {
    const matches = rows.filter((row) => {
      try {
        return test(row);
      } catch {
        return false;
      }
    });
    return matches;
  }

  return rows.filter((row) => textOf(row).replace(/[^a-z0-9]/g, "").includes(compact));
}


function authHeadersForBilling() {
  const headers = { "Content-Type": "application/json" };
  try {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("churvox_token");
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore storage errors
  }
  return headers;
}

function billingApiBase() {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "";

  const configured = String(raw || "").replace(/\/$/, "");
  if (configured) return configured;

  try {
    const host = window.location.hostname || "";
    if (host.includes("churvox.com")) {
      return "https://grassley-backend.onrender.com";
    }
  } catch {
    // ignore browser access errors
  }

  return "";
}


function formatTrialStatus(status = {}) {
  if (status.has_paid_subscription) {
    return {
      tone: "paid",
      title: "Paid plan active",
      body: "Your Churvox access is unlocked.",
      cta: "Manage plan",
    };
  }

  if (status.trial_expired || status.requires_payment) {
    return {
      tone: "expired",
      title: "Your 14-day trial has ended",
      body: "Choose a paid plan to unlock Churvox again.",
      cta: "Choose a plan",
    };
  }

  if (status.trial_active) {
    const days = Number(status.days_left || 0);
    return {
      tone: "active",
      title: `${days || 1} day${days === 1 ? "" : "s"} left in your trial`,
      body: "Your 14-day trial is active. Churvox will lock until payment when it ends.",
      cta: "Choose plan early",
    };
  }

  return {
    tone: "ready",
    title: "Start your 14-day free trial",
    body: "No card needed. Try Operator first, then choose a plan when ready.",
    cta: "Start 14-day trial",
  };
}


function LockedTrialPage({ billingStatus, goToPage }) {
  const info = formatTrialStatus(billingStatus);

  return (
    <section className="cs-page cs-locked-page" data-phase="PHASE_220_EXPIRED_TRIAL_LOCK_VIEW">
      <header className="cs-hero cs-locked-hero">
        <section>
          <span>Trial ended</span>
          <h1>
            Your 14-day trial has ended.
            <mark>Choose a plan to unlock Churvox.</mark>
          </h1>
          <p>
            Work, clients, crew, quotes, invoices, proof, payroll and settings are locked until payment is active.
          </p>

          <div className={`cs-trial-status-pill ${info.tone}`}>
            <strong>{info.title}</strong>
            <span>{info.body}</span>
          </div>

          <button type="button" className="cs-locked-pay-button" onClick={() => goToPage("plans")}>
            View plans and unlock
          </button>
        </section>

        <section className="cs-lock-list">
          {["Work locked", "Clients locked", "Crew locked", "Invoices locked"].map((item) => (
            <article key={item}>
              <Icon type="shield" />
              <strong>{item}</strong>
              <p>Payment required after the trial period.</p>
            </article>
          ))}
        </section>
      </header>
    </section>
  );
}

function openTop() {
  try {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    window.scrollTo(0, 0);
  }
}

function Stat({ label, value, icon, onClick }) {
  return (
    <button type="button" className="cs-stat" onClick={onClick}>
      <Icon type={icon || "target"} />
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function AiCard({ title, body, tone = "normal", icon = "spark", onClick }) {
  return (
    <button type="button" className={`cs-ai-card ${tone}`} onClick={onClick}>
      <Icon type={icon} />
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </button>
  );
}

// PHASE_287_DEEP_WIRING_ROUTE_HELPERS
const CHURVOX_KNOWN_ROUTES = new Set([
  "dashboard",
  "work",
  "jobs",
  "clients",
  "crew",
  "team",
  "quotes",
  "invoices",
  "proof",
  "payments",
  "payroll",
  "plans",
  "settings",
]);

const CHURVOX_ROUTE_LABELS = {
  dashboard: "Command Desk",
  work: "Work",
  jobs: "Work",
  clients: "Clients",
  crew: "Crew",
  team: "Crew",
  quotes: "Quotes",
  invoices: "Invoices",
  proof: "Proof & Pay",
  payments: "Proof & Pay",
  payroll: "Payroll",
  plans: "Plans",
  settings: "Settings",
};

function normalRoute(route, fallback = "dashboard") {
  const raw = clean(route, fallback).toLowerCase().replace(/\s+/g, "-");

  if (raw === "job") return "jobs";
  if (raw === "work") return "jobs";
  if (raw === "crew") return "team";
  if (raw === "worker" || raw === "workers") return "team";
  if (raw === "proof-pay" || raw === "proof_and_pay" || raw === "proofpay") return "proof";
  if (raw === "payment" || raw === "payments" || raw === "cashflow") return "proof";
  if (raw === "client") return "clients";
  if (raw === "quote") return "quotes";
  if (raw === "invoice") return "invoices";
  if (raw === "plan" || raw === "pricing") return "plans";
  if (raw === "setting") return "settings";
  if (CHURVOX_KNOWN_ROUTES.has(raw)) return raw;

  return fallback;
}

function routeLabel(route) {
  const normal = normalRoute(route);
  return CHURVOX_ROUTE_LABELS[normal] || normal.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function routeForRecord(record = {}, fallback = "dashboard") {
  if (record.__route) return normalRoute(record.__route, fallback);

  const typeText = `${record.__modalType || ""} ${record.kind || ""} ${record.type || ""} ${record.eyebrow || ""} ${record.source_type || ""}`.toLowerCase();

  if (typeText.includes("client") || record.client_id || record.customer_id || record.email || record.phone || record.mobile) return "clients";
  if (typeText.includes("crew") || typeText.includes("worker") || record.worker_id || record.assigned_worker_id || record.role || record.position) return "team";
  if (typeText.includes("quote") || record.quote_number) return "quotes";
  if (typeText.includes("invoice") || record.invoice_number) return "invoices";
  if (typeText.includes("proof") || typeText.includes("payment") || typeText.includes("cashflow")) return "proof";
  if (typeText.includes("payroll") || record.total_hours || record.approved_hours || record.payrollHours) return "payroll";
  if (typeText.includes("plan") || record.plan || ["start", "crew", "operator", "command"].includes(clean(record.id).toLowerCase())) return "plans";
  if (typeText.includes("setting") || record.setting_key) return "settings";
  if (typeText.includes("job") || typeText.includes("work") || record.job_title || record.job_id || record.title) return "jobs";

  return normalRoute(fallback, "dashboard");
}

function planIdFromRecord(record = {}) {
  const raw = clean(record.id || record.plan || record.name || record.title).toLowerCase();

  if (raw.includes("start")) return "start";
  if (raw.includes("crew")) return "crew";
  if (raw.includes("operator")) return "operator";
  if (raw.includes("command")) return "command";

  return "";
}

// PHASE_278_QUICK_ACTIONS_AND_INSTALL_HELPERS
const QUICK_ACTIONS_BY_PAGE = {
  dashboard: [
    { id: "work", kind: "work", label: "Add work", route: "jobs", title: "Add work" },
    { id: "client", kind: "client", label: "Add client", route: "clients", title: "Add client" },
    { id: "quote", kind: "quote", label: "Create quote", route: "quotes", title: "Create quote" },
    { id: "invoice", kind: "invoice", label: "Create invoice", route: "invoices", title: "Create invoice" },
    { id: "proof", kind: "proof", label: "Add proof note", route: "proof", title: "Add proof note" },
    { id: "payroll_export", kind: "payroll_export", label: "Prepare payroll export", route: "payroll", title: "Prepare payroll export" },
  ],
  work: [
    { id: "work", kind: "work", label: "Add work", route: "jobs", title: "Add work" },
    { id: "proof", kind: "proof", label: "Add proof note", route: "proof", title: "Add proof note" },
    { id: "invoice", kind: "invoice", label: "Create invoice", route: "invoices", title: "Create invoice" },
  ],
  clients: [
    { id: "client", kind: "client", label: "Add client", route: "clients", title: "Add client" },
    { id: "quote", kind: "quote", label: "Create quote", route: "quotes", title: "Create quote" },
    { id: "payment_note", kind: "payment_note", label: "Add payment note", route: "proof", title: "Add payment note" },
  ],
  crew: [
    { id: "crew", kind: "crew", label: "Add crew", route: "team", title: "Add crew member" },
    { id: "work", kind: "work", label: "Assign work", route: "jobs", title: "Add work for crew" },
  ],
  quotes: [
    { id: "quote", kind: "quote", label: "Create quote", route: "quotes", title: "Create quote" },
    { id: "work", kind: "work", label: "Convert to work", route: "jobs", title: "Create work from quote" },
  ],
  invoices: [
    { id: "invoice", kind: "invoice", label: "Create invoice", route: "invoices", title: "Create invoice" },
    { id: "payment_note", kind: "payment_note", label: "Add payment note", route: "proof", title: "Add payment note" },
  ],
  proof: [
    { id: "proof", kind: "proof", label: "Add proof note", route: "proof", title: "Add proof note" },
    { id: "invoice", kind: "invoice", label: "Create invoice", route: "invoices", title: "Create invoice from proof" },
    { id: "payment_note", kind: "payment_note", label: "Add payment note", route: "proof", title: "Add payment note" },
  ],
  payroll: [
    { id: "payroll_export", kind: "payroll_export", label: "Prepare export", route: "payroll", title: "Prepare payroll export" },
    { id: "settings", kind: "settings", label: "Payroll setting", route: "settings", title: "Payroll setting" },
  ],
  settings: [
    { id: "settings", kind: "settings", label: "Save AI mode", route: "settings", title: "Save AI approval mode" },
    { id: "crew", kind: "crew", label: "Add crew", route: "team", title: "Add crew member" },
  ],
};

const QUICK_ACTION_FIELDS = {
  work: [
    ["title", "Work title", "text"],
    ["client_name", "Client name", "text"],
    ["address", "Address / site", "text"],
    ["area", "Area / region", "text"],
    ["amount", "Price or estimate", "number"],
    ["notes", "Notes for AI", "textarea"],
  ],
  client: [
    ["name", "Client name", "text"],
    ["email", "Email", "email"],
    ["phone", "Phone", "text"],
    ["address", "Address", "text"],
    ["area", "Area / region", "text"],
    ["notes", "Notes", "textarea"],
  ],
  crew: [
    ["name", "Crew member name", "text"],
    ["email", "Email", "email"],
    ["phone", "Phone", "text"],
    ["role", "Role", "text"],
    ["area", "Area / region", "text"],
    ["notes", "Notes", "textarea"],
  ],
  quote: [
    ["title", "Quote title", "text"],
    ["client_name", "Client name", "text"],
    ["amount", "Amount", "number"],
    ["notes", "Quote notes", "textarea"],
  ],
  invoice: [
    ["title", "Invoice title", "text"],
    ["client_name", "Client name", "text"],
    ["amount", "Amount", "number"],
    ["notes", "Invoice description", "textarea"],
  ],
  proof: [
    ["title", "Proof title", "text"],
    ["client_name", "Client name", "text"],
    ["job_id", "Job ID / reference", "text"],
    ["notes", "Proof notes", "textarea"],
  ],
  payment_note: [
    ["title", "Payment note title", "text"],
    ["client_name", "Client name", "text"],
    ["invoice_number", "Invoice number", "text"],
    ["amount", "Amount", "number"],
    ["notes", "Payment note", "textarea"],
  ],
  payroll_export: [
    ["period", "Pay period", "text"],
    ["notes", "Payroll notes", "textarea"],
  ],
  settings: [
    ["setting_key", "Setting key", "text"],
    ["setting_value", "Setting value", "text"],
    ["notes", "Notes", "textarea"],
  ],
};

function QuickActionModal({ action, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    setting_key: "ai_approval_mode",
    setting_value: "approval_first",
  }));

  if (!action) return null;

  const fields = QUICK_ACTION_FIELDS[action.kind] || QUICK_ACTION_FIELDS.work;

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit({ ...form, kind: action.kind });
  }

  return (
    <section className="cs-modal-backdrop" onClick={onClose}>
      <form className="cs-modal cs-quick-action-modal" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <header>
          <span>Business action</span>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <h2>{action.title || action.label}</h2>
        <p>
          Churvox will save this, prepare the admin around it, and keep owner approval in control.
        </p>

        <section className="cs-action-path">
          <strong>Work goes in</strong>
          <em>›</em>
          <strong>AI prepares</strong>
          <em>›</em>
          <strong>Owner approves</strong>
        </section>

        <div className="cs-quick-form-grid">
          {fields.map(([key, label, type]) => (
            <label key={key} className={type === "textarea" ? "wide" : ""}>
              <span>{label}</span>
              {type === "textarea" ? (
                <textarea value={form[key] || ""} onChange={(event) => update(key, event.target.value)} />
              ) : (
                <input type={type} value={form[key] || ""} onChange={(event) => update(key, event.target.value)} />
              )}
            </label>
          ))}
        </div>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          <button type="submit" disabled={Boolean(busy)}>
            {busy ? "Saving..." : "Save and let AI prepare"}
          </button>
        </footer>
      </form>
    </section>
  );
}




// PHASE_280_BUSINESS_USEFULNESS_LAYER
function countRows(rows, test) {
  try {
    return (rows || []).filter(test).length;
  } catch {
    return 0;
  }
}

function recordMoney(item = {}) {
  return money(item.amount || item.total || item.price || item.balance || item.amount_due || item.job_price);
}

function isMissingWorker(item = {}) {
  return workerName(item) === "Unassigned";
}

function isReadyInvoice(item = {}) {
  return /complete|ready|invoice|finished/i.test(statusOf(item));
}

function isOwing(item = {}) {
  return /owing|unpaid|overdue|sent/i.test(statusOf(item));
}

function SetupChecklist({ model, onQuickAction, goToPage }) {
  const steps = [
    {
      id: "business",
      title: "Business details",
      body: "Confirm business name, invoice details and approval mode.",
      done: true,
      action: () => goToPage("settings"),
      cta: "Open settings",
    },
    {
      id: "client",
      title: "Add first client",
      body: "Clients let Churvox prepare quotes, invoices and follow-ups cleanly.",
      done: model.clients.length > 0,
      action: () => onQuickAction?.({ id: "client", kind: "client", label: "Add client", route: "clients", title: "Add client" }),
      cta: "Add client",
    },
    {
      id: "crew",
      title: "Add crew",
      body: "Crew details power worker matching, workload and dispatch.",
      done: model.crew.length > 0,
      action: () => onQuickAction?.({ id: "crew", kind: "crew", label: "Add crew", route: "team", title: "Add crew member" }),
      cta: "Add crew",
    },
    {
      id: "work",
      title: "Add work",
      body: "Work goes in once, then Churvox checks crew, proof and invoice readiness.",
      done: model.jobs.length > 0,
      action: () => onQuickAction?.({ id: "work", kind: "work", label: "Add work", route: "jobs", title: "Add work" }),
      cta: "Add work",
    },
    {
      id: "invoice",
      title: "Invoice path",
      body: "Create or prepare the first invoice so Proof & Pay can flow.",
      done: model.invoices.length > 0,
      action: () => onQuickAction?.({ id: "invoice", kind: "invoice", label: "Create invoice", route: "invoices", title: "Create invoice" }),
      cta: "Create invoice",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <section className="cs-setup-checklist" data-phase="PHASE_280_SETUP_CHECKLIST">
      <header>
        <div>
          <span>Setup path</span>
          <h2>Finish setting up Churvox</h2>
          <p>Get the business ready so the AI Operator has real data to work with.</p>
        </div>
        <strong>{percent}%</strong>
      </header>

      <div className="cs-setup-progress">
        <i style={{ width: `${percent}%` }} />
      </div>

      <div className="cs-setup-grid">
        {steps.map((step) => (
          <article key={step.id} className={step.done ? "done" : ""}>
            <b>{step.done ? "✓" : "•"}</b>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
            <button type="button" onClick={step.action}>
              {step.done ? "Review" : step.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CommandBriefing({ model, approvals, readyToInvoice, crewActive, goToPage }) {
  const missingCrew = countRows(model.jobs, isMissingWorker);
  const missingClientDetails = countRows(model.clients, (client) => !clean(client.email || client.phone || client.mobile));
  const quoteFollowups = countRows(model.quotes, (quote) => /sent|pending|await|open|follow/i.test(statusOf(quote)));
  const owingInvoices = countRows(model.invoices, isOwing);
  const proofNeeded = countRows(model.jobs, (job) => /active|progress|started|complete/i.test(statusOf(job)) && !(Array.isArray(job.photos) && job.photos.length));

  const cards = [
    { label: "Needs approval", value: approvals.length, body: "Owner decisions waiting.", route: "dashboard" },
    { label: "Jobs need crew", value: missingCrew, body: "Unassigned work to dispatch.", route: "jobs" },
    { label: "Ready to invoice", value: readyToInvoice, body: "Completed work to bill.", route: "invoices" },
    { label: "Client gaps", value: missingClientDetails, body: "Missing contact details.", route: "clients" },
    { label: "Quote follow-ups", value: quoteFollowups, body: "Open quotes to chase.", route: "quotes" },
    { label: "Payment watch", value: owingInvoices, body: "Invoices needing attention.", route: "invoices" },
    { label: "Proof checks", value: proofNeeded, body: "Proof/photos to verify.", route: "proof" },
    { label: "Crew active", value: crewActive, body: "Crew/work activity today.", route: "team" },
  ];

  return (
    <section className="cs-command-briefing" data-phase="PHASE_280_TODAYS_COMMAND_BRIEFING">
      <header>
        <div>
          <span>Today’s command briefing</span>
          <h2>Churvox found {cards.reduce((sum, card) => sum + Number(card.value || 0), 0)} business signals.</h2>
          <p>Open the app and see what needs action without hunting through every page.</p>
        </div>
      </header>

      <div>
        {cards.map((card) => (
          <button type="button" key={card.label} onClick={() => goToPage(card.route)}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
            <p>{card.body}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function CommandSearch({ model, approvals, goToPage, onQuickAction, openRecord }) {
  const [query, setQuery] = useState("");

  const commands = [
    { id: "add-work", label: "Add work", body: "Capture a new job and let AI prepare the admin.", run: () => onQuickAction?.({ id: "work", kind: "work", label: "Add work", route: "jobs", title: "Add work" }) },
    { id: "add-client", label: "Add client", body: "Create a new client record.", run: () => onQuickAction?.({ id: "client", kind: "client", label: "Add client", route: "clients", title: "Add client" }) },
    { id: "create-quote", label: "Create quote", body: "Draft a quote for owner review.", run: () => onQuickAction?.({ id: "quote", kind: "quote", label: "Create quote", route: "quotes", title: "Create quote" }) },
    { id: "create-invoice", label: "Create invoice", body: "Draft an invoice for owner review.", run: () => onQuickAction?.({ id: "invoice", kind: "invoice", label: "Create invoice", route: "invoices", title: "Create invoice" }) },
    { id: "unpaid-invoices", label: "Show unpaid invoices", body: "Open invoice control centre.", run: () => goToPage("invoices") },
    { id: "what-approval", label: "What needs approval?", body: "Open the Approval Desk.", run: () => goToPage("dashboard") },
    { id: "payroll", label: "Prepare payroll", body: "Open payroll workspace.", run: () => goToPage("payroll") },
  ];

  const records = [
    ...model.jobs.map((item) => ({ id: `job-${idOf(item)}`, label: titleOf(item, "Work"), body: `Work • ${clientName(item)} • ${statusOf(item)}`, item, route: "jobs" })),
    ...model.clients.map((item) => ({ id: `client-${idOf(item)}`, label: clientName(item), body: `Client • ${clean(item.email || item.phone || "missing contact")}`, item, route: "clients" })),
    ...model.quotes.map((item) => ({ id: `quote-${idOf(item)}`, label: clean(item.quote_number || item.number || titleOf(item, "Quote")), body: `Quote • ${clientName(item)} • ${recordMoney(item)}`, item, route: "quotes" })),
    ...model.invoices.map((item) => ({ id: `invoice-${idOf(item)}`, label: clean(item.invoice_number || item.number || titleOf(item, "Invoice")), body: `Invoice • ${clientName(item)} • ${recordMoney(item)}`, item, route: "invoices" })),
    ...approvals.map((item) => ({ id: `approval-${idOf(item)}`, label: titleOf(item, "Approval"), body: `Approval • ${clean(item.kind || item.eyebrow || "AI action")}`, item, route: "dashboard" })),
  ];

  const term = query.trim().toLowerCase();
  const results = term
    ? [...commands, ...records]
        .filter((item) => `${item.label} ${item.body}`.toLowerCase().includes(term))
        .slice(0, 8)
    : commands.slice(0, 4);

  function run(item) {
    if (item.run) {
      item.run();
      setQuery("");
      return;
    }

    if (item.item) {
      openRecord({
        ...item.item,
        __modalType: item.route === "dashboard" ? "Approval slip" : "Found record",
        __modalTitle: item.label,
        __body: item.body,
        __route: item.route,
      });
      setQuery("");
    }
  }

  return (
    <section className="cs-command-search" data-phase="PHASE_280_COMMAND_SEARCH">
      <header>
        <span>Command search</span>
        <strong>Ask Churvox or find anything</strong>
      </header>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try: unpaid invoices, add client, create job, what needs approval..."
      />

      <div>
        {results.map((item) => (
          <button type="button" key={item.id} onClick={() => run(item)}>
            <strong>{item.label}</strong>
            <span>{item.body}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function JobPipeline({ jobs, openRecord }) {
  const lanes = [
    ["New", (job) => /new|pending|draft/i.test(statusOf(job))],
    ["Assigned", (job) => !isMissingWorker(job) && !/complete|invoice|done/i.test(statusOf(job))],
    ["In progress", (job) => /progress|started|active/i.test(statusOf(job))],
    ["Proof needed", (job) => /complete|active|progress/i.test(statusOf(job)) && !(Array.isArray(job.photos) && job.photos.length)],
    ["Ready invoice", isReadyInvoice],
    ["Completed", (job) => /complete|done|finished/i.test(statusOf(job))],
  ];

  return (
    <section className="cs-pipeline-board" data-phase="PHASE_280_JOB_PIPELINE_BOARD">
      <header>
        <span>Pipeline board</span>
        <h2>New → assigned → proof → invoice</h2>
        <p>See where jobs are stuck before admin falls behind.</p>
      </header>

      <div>
        {lanes.map(([label, test]) => {
          const laneJobs = jobs.filter(test).slice(0, 4);
          return (
            <article key={label}>
              <header>
                <strong>{label}</strong>
                <b>{laneJobs.length}</b>
              </header>

              {laneJobs.length ? laneJobs.map((job, index) => (
                <button
                  type="button"
                  key={idOf(job, index)}
                  onClick={() => openRecord({
                    ...job,
                    __modalType: "Work slip",
                    __modalTitle: titleOf(job, "Work"),
                    __body: aiReason(job, "Churvox is checking this job path."),
                    __route: "jobs",
                  })}
                >
                  <strong>{titleOf(job, "Work")}</strong>
                  <span>{clientName(job)} • {workerName(job)}</span>
                </button>
              )) : <p>No items.</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ClientTimeline({ clients, jobs, quotes, invoices, openRecord }) {
  const topClients = clients.slice(0, 4);

  return (
    <section className="cs-client-timeline" data-phase="PHASE_280_CLIENT_TIMELINE">
      <header>
        <span>Client timeline</span>
        <h2>Client history at a glance</h2>
        <p>Jobs, quotes, invoices, payments and AI next actions in one place.</p>
      </header>

      <div>
        {topClients.length ? topClients.map((client, index) => {
          const name = clientName(client);
          const clientJobs = jobs.filter((job) => clientName(job).toLowerCase() === name.toLowerCase()).length;
          const clientQuotes = quotes.filter((quote) => clientName(quote).toLowerCase() === name.toLowerCase()).length;
          const clientInvoices = invoices.filter((invoice) => clientName(invoice).toLowerCase() === name.toLowerCase()).length;

          return (
            <button
              type="button"
              key={idOf(client, index)}
              onClick={() => openRecord({
                ...client,
                __modalType: "Client timeline",
                __modalTitle: name,
                __body: `${clientJobs} jobs, ${clientQuotes} quotes and ${clientInvoices} invoices found for this client.`,
                __route: "clients",
              })}
            >
              <strong>{name}</strong>
              <span>{clientJobs} jobs</span>
              <span>{clientQuotes} quotes</span>
              <span>{clientInvoices} invoices</span>
              <p>{clean(client.email || client.phone || "Missing contact details")}</p>
            </button>
          );
        }) : <p>No clients yet. Add a client to start building history.</p>}
      </div>
    </section>
  );
}

function CrewWorkload({ crew, jobs, openRecord }) {
  return (
    <section className="cs-crew-workload" data-phase="PHASE_280_CREW_WORKLOAD_VIEW">
      <header>
        <span>Crew workload</span>
        <h2>Who is free, busy or missing details</h2>
        <p>Helps Churvox recommend the right worker before approval.</p>
      </header>

      <div>
        {(crew.length ? crew : [{ name: "No crew yet", status: "needs setup" }]).slice(0, 6).map((worker, index) => {
          const name = workerName(worker);
          const assigned = jobs.filter((job) => workerName(job).toLowerCase() === name.toLowerCase()).length;
          const missing = !clean(worker.email || worker.phone || worker.mobile || worker.area || worker.region);
          const state = assigned > 2 ? "Busy" : assigned > 0 ? "Active" : missing ? "Needs profile" : "Available";

          return (
            <button
              type="button"
              key={idOf(worker, index)}
              onClick={() => openRecord({
                ...worker,
                __modalType: "Crew workload",
                __modalTitle: name,
                __body: `${state}. ${assigned} assigned job(s). Area: ${areaOf(worker)}.`,
                __route: "team",
              })}
            >
              <strong>{name}</strong>
              <span>{state}</span>
              <p>{assigned} assigned job(s) • {areaOf(worker)}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function InvoiceControlCentre({ invoices, jobs, openRecord, goToPage }) {
  const groups = [
    ["Drafts", invoices.filter((item) => /draft/i.test(statusOf(item)))],
    ["Ready to send", invoices.filter((item) => /ready/i.test(statusOf(item)))],
    ["Sent / owing", invoices.filter((item) => /sent|owing|unpaid/i.test(statusOf(item)))],
    ["Overdue", invoices.filter((item) => /overdue/i.test(statusOf(item)))],
    ["Paid", invoices.filter((item) => /paid/i.test(statusOf(item)))],
    ["Work ready", jobs.filter(isReadyInvoice)],
  ];

  return (
    <section className="cs-invoice-control" data-phase="PHASE_280_INVOICE_PAYMENT_CONTROL">
      <header>
        <span>Invoice control</span>
        <h2>Drafts, owing, overdue and ready work</h2>
        <p>One control panel for moving work into money.</p>
        <button type="button" onClick={() => goToPage("proof")}>Open Proof & Pay</button>
      </header>

      <div>
        {groups.map(([label, items]) => (
          <article key={label}>
            <strong>{items.length}</strong>
            <span>{label}</span>
            {items.slice(0, 2).map((item, index) => (
              <button
                type="button"
                key={idOf(item, index)}
                onClick={() => openRecord({
                  ...item,
                  __modalType: label === "Work ready" ? "Work ready to invoice" : "Invoice control",
                  __modalTitle: titleOf(item, label),
                  __body: `${label}: ${clientName(item)} ${recordMoney(item)}`,
                  __route: label === "Work ready" ? "jobs" : "invoices",
                })}
              >
                {titleOf(item, label)}
              </button>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}

function NotificationCentre({ approvals, model, openRecord, goToPage }) {
  const notifications = [
    ...approvals.slice(0, 5).map((item) => ({
      id: `approval-${idOf(item)}`,
      title: titleOf(item, "Approval waiting"),
      body: clean(item.need || item.prepared || item.body, "Owner approval needed."),
      type: "Approval",
      item,
    })),
    ...model.jobs.filter(isReadyInvoice).slice(0, 3).map((item) => ({
      id: `ready-${idOf(item)}`,
      title: `${titleOf(item, "Work")} is ready to invoice`,
      body: `${clientName(item)} can move to invoice prep.`,
      type: "Invoice",
      item: { ...item, __route: "jobs" },
    })),
    ...model.invoices.filter(isOwing).slice(0, 3).map((item) => ({
      id: `owing-${idOf(item)}`,
      title: `${clean(item.invoice_number || item.number || "Invoice")} needs payment follow-up`,
      body: `${clientName(item)} • ${recordMoney(item)}`,
      type: "Payment",
      item: { ...item, __route: "invoices" },
    })),
  ].slice(0, 8);

  return (
    <section className="cs-notification-centre" data-phase="PHASE_280_NOTIFICATION_CENTRE">
      <header>
        <span>Command inbox</span>
        <h2>Live business notifications</h2>
        <p>Important updates should land here instead of hiding in pages.</p>
        <button type="button" onClick={() => goToPage("dashboard")}>Approval Desk</button>
      </header>

      <div>
        {notifications.length ? notifications.map((notice) => (
          <button
            type="button"
            key={notice.id}
            onClick={() => openRecord({
              ...notice.item,
              __modalType: notice.type,
              __modalTitle: notice.title,
              __body: notice.body,
              __route: notice.item?.__route || "dashboard",
            })}
          >
            <span>{notice.type}</span>
            <strong>{notice.title}</strong>
            <p>{notice.body}</p>
          </button>
        )) : <p>No command inbox items yet.</p>}
      </div>
    </section>
  );
}

function ReadinessPanel({ model, approvals, goToPage }) {
  const checks = [
    { label: "Clients", ok: model.clients.length > 0, route: "clients" },
    { label: "Crew", ok: model.crew.length > 0, route: "team" },
    { label: "Work", ok: model.jobs.length > 0, route: "jobs" },
    { label: "Invoices", ok: model.invoices.length > 0 || model.jobs.some(isReadyInvoice), route: "invoices" },
    { label: "AI actions", ok: approvals.length > 0 || model.jobs.length > 0, route: "dashboard" },
    { label: "Payments", ok: model.invoices.some(isOwing) || model.payments.length > 0, route: "proof" },
  ];

  return (
    <section className="cs-readiness-panel" data-phase="PHASE_280_READINESS_DASHBOARD">
      <header>
        <span>Readiness check</span>
        <h2>Launch strength</h2>
        <p>A quick built-in view of what makes Churvox useful for a real business.</p>
      </header>

      <div>
        {checks.map((check) => (
          <button type="button" key={check.label} className={check.ok ? "ok" : "todo"} onClick={() => goToPage(check.route)}>
            <b>{check.ok ? "✓" : "!"}</b>
            <strong>{check.label}</strong>
            <span>{check.ok ? "Ready" : "Needs setup"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WorkSlipContext({ selected, modalType }) {
  if (!selected) return null;

  const typeText = `${modalType} ${selected.kind || ""} ${selected.type || ""} ${selected.eyebrow || ""}`.toLowerCase();

  let title = "Owner decision";
  let points = [
    "Churvox prepared this from the business data it can see.",
    "Review the details before approving.",
    "Nothing customer-facing is sent unless the owner approves.",
  ];

  if (typeText.includes("dispatch") || typeText.includes("worker") || typeText.includes("crew")) {
    title = "Worker match check";
    points = [
      `Suggested crew: ${workerName(selected)}`,
      `Area / route: ${areaOf(selected)}`,
      "Check workload, clash risk and fit before assigning.",
    ];
  } else if (typeText.includes("invoice")) {
    title = "Invoice readiness check";
    points = [
      `Client: ${clientName(selected)}`,
      `Amount: ${recordMoney(selected)}`,
      "Confirm proof, notes, price and customer email before sending.",
    ];
  } else if (typeText.includes("quote")) {
    title = "Quote follow-up check";
    points = [
      `Client: ${clientName(selected)}`,
      `Quote: ${clean(selected.quote_number || selected.number || selected.title, "Quote")}`,
      "Approve the follow-up wording before contacting the customer.",
    ];
  } else if (typeText.includes("payment") || typeText.includes("cashflow")) {
    title = "Payment follow-up check";
    points = [
      `Invoice: ${clean(selected.invoice_number || selected.number || selected.title, "Invoice")}`,
      `Amount: ${recordMoney(selected)}`,
      "Draft the reminder, then owner approves before sending.",
    ];
  } else if (typeText.includes("client")) {
    title = "Client detail check";
    points = [
      `Client: ${clientName(selected)}`,
      `Contact: ${clean(selected.email || selected.phone || selected.mobile, "Missing")}`,
      "Fill gaps so quotes, reminders and invoices do not get blocked.",
    ];
  } else if (typeText.includes("payroll")) {
    title = "Payroll review check";
    points = [
      `Worker: ${workerName(selected)}`,
      `Hours: ${clean(selected.hours || selected.total_hours || selected.approved_hours, "0")}`,
      "Prepare payroll handoff only. No payout or compliance submission is made.",
    ];
  } else if (typeText.includes("proof")) {
    title = "Proof check";
    points = [
      `Work: ${titleOf(selected, "Work")}`,
      `Proof: ${Array.isArray(selected.photos) && selected.photos.length ? `${selected.photos.length} photo(s)` : "Needs notes/photos check"}`,
      "Proof should support invoice readiness before billing.",
    ];
  }

  return (
    <section className="cs-slip-context" data-phase="PHASE_280_SPECIFIC_WORK_SLIP_TYPES">
      <strong>{title}</strong>
      <ul>
        {points.map((point) => <li key={point}>{point}</li>)}
      </ul>
    </section>
  );
}


function Table({ rows, columns, onOpen, emptyText = "Nothing here yet.", actionLabel = "Open Slip" }) {
  const gridTemplateColumns = `repeat(${columns.length}, minmax(150px, 1fr)) 170px`;

  return (
    <section className="cs-table">
      <header style={{ gridTemplateColumns }}>
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
        <span>Action</span>
      </header>

      {rows.length ? rows.map((row, index) => (
        <article
          className="cs-row"
          key={idOf(row, index)}
          style={{ gridTemplateColumns }}
          role="button"
          tabIndex={0}
          onClick={() => onOpen(row)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onOpen(row);
          }}
        >
          {columns.map((column) => (
            <div key={column.key}>{column.render ? column.render(row, index) : clean(row[column.key], "—")}</div>
          ))}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpen(row);
            }}
          >
            {actionLabel} <em>›</em>
          </button>
        </article>
      )) : (
        <section className="cs-empty">
          <strong>{emptyText}</strong>
          <p>As work flows in, Churvox will prepare the admin and show the next best action here.</p>
        </section>
      )}
    </section>
  );
}

function DetailModal({ selected, onClose, onApprove, setPage, operatorBusyAction = "" }) {
  if (!selected) return null;

  const route = selected.__route;
  const modalType = clean(selected.__modalType, "Detail");
  const title = clean(selected.__modalTitle || selected.title || selected.name, titleOf(selected, "Record detail"));
  const detail = selected.__body || aiReason(selected, "Churvox prepared this item so you can review it without digging through the app.");

  const isPlan = selected.amount || /plan|pricing/i.test(modalType);
  const isSetting = /setting|control/i.test(modalType) || selected.id === "settings";
  const isCrew = /crew|worker/i.test(modalType) || selected.role || selected.position;
  const isClient = /client/i.test(modalType) || selected.email || selected.phone || selected.mobile;
  const isInvoice = /invoice/i.test(modalType) || selected.invoice_number;
  const isQuote = /quote/i.test(modalType) || selected.quote_number;
  const isWork = /work|job/i.test(modalType) || selected.job_title || selected.jobTitle;

  const rows = [];

  if (isPlan) {
    rows.push(["Plan", clean(selected.name || selected.title, "Plan")]);
    rows.push(["Price", selected.amount ? `$${selected.amount}/mo + GST` : "See plan"]);
    rows.push(["Best for", statusOf(selected)]);
    rows.push(["Churvox prepares", clean(selected.prepared, detail)]);
  } else if (isSetting) {
    rows.push(["Setting", title]);
    rows.push(["Status", statusOf(selected)]);
    rows.push(["Controls", clean(selected.prepared, detail)]);
    rows.push(["Owner action", "Review and save the setting."]);
  } else if (isCrew) {
    rows.push(["Worker", workerName(selected)]);
    rows.push(["Role", clean(selected.role || selected.position, "Worker")]);
    rows.push(["Area", areaOf(selected)]);
    rows.push(["AI action", detail]);
  } else if (isClient) {
    rows.push(["Client", clientName(selected)]);
    rows.push(["Contact", clean(selected.email || selected.phone || selected.mobile, "Missing")]);
    rows.push(["Area", areaOf(selected)]);
    rows.push(["AI action", detail]);
  } else if (isInvoice) {
    rows.push(["Invoice", clean(selected.invoice_number || selected.number || title, "Invoice")]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Amount", money(selected.amount || selected.total)]);
    rows.push(["AI action", detail]);
  } else if (isQuote) {
    rows.push(["Quote", clean(selected.quote_number || selected.number || title, "Quote")]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Amount", money(selected.amount || selected.total)]);
    rows.push(["AI action", detail]);
  } else if (isWork) {
    rows.push(["Work", titleOf(selected, "Work")]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Crew", workerName(selected)]);
    rows.push(["AI action", detail]);
  } else {
    rows.push(["Status", statusOf(selected)]);
    rows.push(["Client", clientName(selected)]);
    rows.push(["Area", areaOf(selected)]);
    rows.push(["AI action", detail]);
  }

  const actionLabel = isPlan
    ? `Choose ${clean(selected.name || selected.title, "plan")}`
    : clean(selected.__actionLabel, selected.__approval ? "Approve next move" : "Save / approve");

  return (
    <section className="cs-modal-backdrop" onClick={onClose}>
      <article className="cs-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <span>{modalType}</span>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <h2>{title}</h2>
        <p>{detail}</p>

        {selected?.__operatorAction ? (
          <section className="cs-decision-box" data-phase="PHASE_278_WORK_SLIP_DECISION_BOX">
            <strong>{clean(selected.__actionLabel, "Approve AI action")}</strong>
            <span>{clean(selected.reason || selected.ai_reason || selected.need, "AI prepared this from live business data.")}</span>
            <small>Safe mode: Churvox prepares the action. Owner approval is required before anything important changes.</small>
          </section>
        ) : null}

        <WorkSlipContext selected={selected} modalType={modalType} />

        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>

          {route ? (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setPage?.(route);
                onClose();
                openTop();
              }}
            >
              Open {routeLabel(route)}
            </button>
          ) : null}

          <button
            type="button"
            disabled={Boolean(operatorBusyAction && selected?.__operatorAction)}
            onClick={() => onApprove(selected)}
          >
            {operatorBusyAction && selected?.__operatorAction ? "Working..." : actionLabel}
          </button>
        </footer>
      </article>
    </section>
  );
}

function SmartPage({ config, rows, columns, aiCards, onOpen, activeFilter, setActiveFilter, openInfo, goToPage, quickActions = [], onQuickAction, extraPanel = null }) {
  const loweredTitle = clean(config.workspaceTitle).toLowerCase();

  const actionLabel = config.actionLabel ||
    (loweredTitle.includes("pricing") ? "Review plan" :
    loweredTitle.includes("control") || loweredTitle.includes("settings") ? "Open setting" :
    loweredTitle.includes("client") ? "Open client" :
    loweredTitle.includes("crew") ? "Open crew" :
    loweredTitle.includes("quote") ? "Open quote" :
    loweredTitle.includes("invoice") ? "Open invoice" :
    loweredTitle.includes("proof") ? "Open proof" :
    loweredTitle.includes("payroll") || loweredTitle.includes("timesheet") ? "Review hours" :
    "Open slip");

  const modalType = config.modalType ||
    (loweredTitle.includes("pricing") ? "Plan review" :
    loweredTitle.includes("control") || loweredTitle.includes("settings") ? "Setting" :
    loweredTitle.includes("client") ? "Client profile" :
    loweredTitle.includes("crew") ? "Crew profile" :
    loweredTitle.includes("quote") ? "Quote slip" :
    loweredTitle.includes("invoice") ? "Invoice slip" :
    loweredTitle.includes("proof") ? "Proof & Pay slip" :
    loweredTitle.includes("payroll") || loweredTitle.includes("timesheet") ? "Payroll review" :
    "Work slip");

  function openSmartRow(row) {
    onOpen({
      ...row,
      __modalType: modalType,
      __modalTitle: titleOf(row, config.workspaceTitle),
      __body: aiReason(row, config.workspaceBody),
      __actionLabel: actionLabel,
      __route: config.route,
    });
  }

  const filteredRows = filterRows(rows, activeFilter);

  return (
    <section className="cs-page">
      <header className="cs-hero compact">
        <section>
          <span>{config.kicker}</span>
          <h1>{config.title}<mark>{config.accent}</mark></h1>
          <p>{config.body}</p>
        </section>

        <section className="cs-stats">
          {config.stats.map((stat) => (
            <Stat
              key={stat.label}
              {...stat}
              onClick={() => openInfo({
                __modalType: "Smart Metric",
                __modalTitle: stat.label,
                __body: `${stat.label}: ${stat.value}. Churvox tracks this live for the ${config.workspaceTitle} workspace.`,
                __route: stat.route || config.route,
                status: "Live",
              })}
            />
          ))}
        </section>
      </header>

      <section className="cs-ai-strip">
        {aiCards.map((card) => (
          <AiCard
            key={card.title}
            {...card}
            onClick={() => openInfo({
              __modalType: "AI Prepared Action",
              __modalTitle: card.title,
              __body: card.body,
              __route: card.route || config.route,
              status: "Prepared",
            })}
          />
        ))}
      </section>

      {extraPanel}

      <section className="cs-workspace">
        <header>
          <div>
            <span>{config.workspaceKicker}</span>
            <h2>{config.workspaceTitle}</h2>
            <p>{config.workspaceBody}</p>
          </div>

          <div className="cs-filters" data-phase="PHASE_278_PAGE_QUICK_ACTIONS">
            {quickActions.map((action) => (
              <button
                type="button"
                key={action.id}
                className="strong"
                onClick={() => onQuickAction?.(action)}
              >
                {action.label}
              </button>
            ))}

            {config.filters.map((filter) => (
              <button
                type="button"
                key={filter}
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(activeFilter === filter ? "All" : filter)}
              >
                {filter}
              </button>
            ))}

            {config.jumpTo ? (
              <button type="button" className="strong" onClick={() => goToPage(config.jumpTo)}>
                Open related page
              </button>
            ) : null}
          </div>
        </header>

        <Table rows={filteredRows} columns={columns} onOpen={openSmartRow} emptyText={config.emptyText} actionLabel={actionLabel} />
      </section>
    </section>
  );
}



function PlansCommandPage({
  planName,
  openInfo,
  goToPage,
  startTrial,
  startCheckout,
  billingBusy,
  billingNotice,
  billingStatus,
}) {
  const plans = [
    {
      id: "start",
      name: "Start",
      price: 39,
      strap: "Start clean",
      badge: "Solo ready",
      body: "For one operator who wants work, clients and invoices tidy without the mess.",
      bestFor: "Solo operators",
      included: ["Work and client control", "Basic invoices and quotes", "Simple owner approval flow", "Mobile-ready workspace"],
      ai: "Churvox keeps the basics organised and surfaces what needs action.",
      icon: "target",
    },
    {
      id: "crew",
      name: "Crew",
      price: 89,
      strap: "Run the team",
      badge: "Crew workflow",
      body: "For businesses assigning jobs, tracking worker updates and keeping proof connected.",
      bestFor: "Small teams",
      included: ["Crew assignment", "Worker updates", "Proof and photos", "Client/job history"],
      ai: "Churvox checks crew fit, proof and unfinished admin.",
      icon: "crew",
    },
    {
      id: "operator",
      name: "Operator",
      price: 149,
      strap: "AI runs the admin",
      badge: "Most popular",
      featured: true,
      body: "The main Churvox plan. AI prepares admin actions and the owner approves.",
      bestFor: "Growing trade teams",
      included: ["AI Operator Actions", "Approval Desk", "Quote and invoice prep", "Follow-up suggestions", "MYOB add-on available"],
      ai: "Churvox prepares invoices, follow-ups, crew suggestions and missing-detail checks.",
      icon: "spark",
    },
    {
      id: "command",
      name: "Command",
      price: 299,
      strap: "Full command centre",
      badge: "MYOB included",
      body: "For larger teams needing payroll workspace, advanced roles, MYOB and more capacity.",
      bestFor: "Serious operators",
      included: ["MYOB included", "Payroll workspace", "Advanced roles", "Higher limits", "Priority support"],
      ai: "Churvox watches the whole admin path from work intake to payment follow-up.",
      icon: "shield",
    },
  ];

  const addons = [
    {
      id: "command_growth_pack",
      title: "Command Growth Pack",
      price: "$99/mo + GST",
      body: "Adds 50 more active team members plus extra jobs, AI Operator Actions, automation runs and admin/payroll capacity.",
      type: "growth_pack",
      icon: "crew",
    },
    {
      id: "myob_addon",
      title: "MYOB Sync",
      price: "$39/mo + GST",
      body: "Optional on Operator. Included by default on Command.",
      type: "myob_addon",
      icon: "document",
    },
  ];

  const smsPacks = [
    { id: "sms_100", credits: 100, label: "100 SMS credits", body: "Small reminder pack.", icon: "card" },
    { id: "sms_500", credits: 500, label: "500 SMS credits", body: "Best for steady teams.", icon: "card" },
    { id: "sms_1000", credits: 1000, label: "1000 SMS credits", body: "For high volume reminders.", icon: "card" },
  ];

  const compare = [
    ["AI Operator Actions", "Basic", "Crew checks", "Strong", "Full"],
    ["Active team members", "1", "Small crew", "Growing team", "50 included"],
    ["MYOB", "—", "—", "$39 add-on", "Included"],
    ["Payroll workspace", "—", "—", "—", "Included"],
    ["Owner Approval Desk", "Yes", "Yes", "Advanced", "Advanced"],
  ];

  const trialInfo = formatTrialStatus(billingStatus || {});

  function openPlan(plan) {
    openInfo({
      ...plan,
      amount: plan.price,
      status: plan.badge,
      prepared: plan.ai,
      __modalType: "Plan review",
      __modalTitle: `${plan.name} plan`,
      __body: `${plan.body} ${plan.ai}`,
      __actionLabel: `Choose ${plan.name}`,
      __route: "plans",
      plan: plan.id,
      plan: plan.id,
    });
  }

  return (
    <section className="cs-page cs-plans-page" data-phase="PHASE_216_STRIPE_WIRED_PLANS">
      <header className="cs-hero cs-plans-hero">
        <section>
          <span>Plans command</span>
          <h1>
            Choose how much admin
            <mark>Churvox handles.</mark>
          </h1>
          <p>
            Start with a 14-day trial, then choose Start, Crew, Operator or Command.
            Add SMS credits, MYOB or Command Growth Pack when the business needs it.
          </p>

          <div className={`cs-trial-box ${trialInfo.tone}`}>
            <strong>{trialInfo.title}</strong>
            <span>{trialInfo.body}</span>
            <button
              type="button"
              disabled={billingBusy === "trial" || billingStatus?.trial_active || billingStatus?.requires_payment}
              onClick={() => startTrial("operator")}
            >
              {billingBusy === "trial"
                ? "Starting trial..."
                : billingStatus?.requires_payment
                  ? "Trial ended — choose plan"
                  : billingStatus?.trial_active
                    ? "Trial active"
                    : "Start 14-day trial"}
            </button>
          </div>

          {billingNotice ? <p className="cs-billing-notice">{billingNotice}</p> : null}
        </section>

        <section className="cs-plan-price-stack">
          {plans.map((plan) => (
            <button
              type="button"
              key={plan.id}
              className={plan.featured ? "featured" : ""}
              onClick={() => openPlan(plan)}
            >
              <Icon type={plan.icon} />
              <span>{plan.name}</span>
              <strong>${plan.price}</strong>
            </button>
          ))}
        </section>
      </header>

      <section className="cs-plan-cards">
        {plans.map((plan) => (
          <article className={plan.featured ? "featured" : ""} key={plan.id}>
            <header>
              <span>{plan.badge}</span>
              <h2>{plan.name}</h2>
              <p>{plan.strap}</p>
            </header>

            <div className="cs-plan-price">
              <strong>${plan.price}</strong>
              <span>/mo + GST</span>
            </div>

            <p>{plan.body}</p>

            <div className="cs-plan-trial-strip">
              <strong>14-day free trial</strong>
              <span>No card needed. Locks after trial until payment.</span>
            </div>

            <ul>
              {plan.included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <section>
              <b>AI role</b>
              <p>{plan.ai}</p>
            </section>

            <div className="cs-plan-actions">
              <button type="button" className="ghost" onClick={() => openPlan(plan)}>
                Review
              </button>
              <button
                type="button"
                disabled={billingBusy === plan.id}
                onClick={() => startCheckout({ type: "plan", plan: plan.id, key: plan.id })}
              >
                {billingBusy === plan.id ? "Opening Stripe..." : plan.featured ? "Choose Operator" : `Choose ${plan.name}`}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="cs-plan-addons">
        <header>
          <div>
            <span>Scale when ready</span>
            <h2>Add-ons wired to Stripe</h2>
            <p>Growth Pack, MYOB and SMS credits are separate so the owner only pays for what they need.</p>
          </div>
        </header>

        <div>
          {addons.map((addon) => (
            <button
              type="button"
              key={addon.id}
              disabled={billingBusy === addon.id}
              onClick={() => startCheckout({ type: addon.id === "command_growth_pack" ? "command_growth_pack" : addon.type, addon: addon.id, key: addon.id })}
            >
              <Icon type={addon.icon} />
              <strong>{addon.title}</strong>
              <span>{addon.price}</span>
              <p>{addon.body}</p>
              <em>{billingBusy === addon.id ? "Opening Stripe..." : "Buy add-on"}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-sms-packs">
        <header>
          <div>
            <span>SMS credits</span>
            <h2>Buy reminder credits</h2>
            <p>Use credits for customer reminders and future SMS flows. SMS packs checkout through Stripe.</p>
          </div>
        </header>

        <div>
          {smsPacks.map((pack) => (
            <button
              type="button"
              key={pack.id}
              disabled={billingBusy === pack.id}
              onClick={() => startCheckout({ type: "sms", sms_pack: pack.id, key: pack.id })}
            >
              <Icon type={pack.icon} />
              <strong>{pack.label}</strong>
              <p>{pack.body}</p>
              <em>{billingBusy === pack.id ? "Opening Stripe..." : "Buy SMS pack"}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="cs-plan-compare">
        <header>
          <div>
            <span>What changes</span>
            <h2>Plan comparison</h2>
            <p>Operator is the main AI admin plan. Command is the full control centre.</p>
          </div>

          <button type="button" onClick={() => goToPage("dashboard")}>
            Back to Command Desk
          </button>
        </header>

        <div className="cs-plan-compare-table">
          <article className="head">
            <span>Feature</span>
            <span>Start</span>
            <span>Crew</span>
            <span>Operator</span>
            <span>Command</span>
          </article>

          {compare.map((row) => (
            <article key={row[0]}>
              {row.map((cell) => (
                <span key={cell}>{cell}</span>
              ))}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function CommandSuite({
  page,
  setPage,
  data,
  machine,
  planName,
  visibleApprovals,
  hiddenApprovalCount,
  showAllApprovals,
  setShowAllApprovals,
  onOpenSlip,
  onDataRefresh,
}) {
  const [selected, setSelected] = useState(null);
  const [quickAction, setQuickAction] = useState(null);
  const [quickBusy, setQuickBusy] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [localQuickRecords, setLocalQuickRecords] = useState([]);
  const [toast, setToast] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [billingBusy, setBillingBusy] = useState("");
  const [billingNotice, setBillingNotice] = useState("");
  const [billingStatus, setBillingStatus] = useState(null);
  const [operatorActions, setOperatorActions] = useState([]);
  const [operatorBusyAction, setOperatorBusyAction] = useState("");
  const current = PAGE_MAP[page] || "dashboard";
  const appLocked = Boolean(billingStatus?.requires_payment || billingStatus?.trial_expired);


  async function billingPost(path, payload) {
    const base = billingApiBase();
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      credentials: "include",
      headers: authHeadersForBilling(),
      body: JSON.stringify(payload || {}),
    });

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok || body.success === false) {
      const message = body.detail || body.message || body.error || `Billing request failed (${res.status})`;
      console.error("Churvox billing request failed", { path, status: res.status, body, payload });
      throw new Error(message);
    }

    return body;
  }


  async function billingGet(path) {
    const base = billingApiBase();
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      credentials: "include",
      headers: authHeadersForBilling(),
    });

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    if (!res.ok || body.success === false) {
      const message = body.detail || body.message || body.error || `Billing status failed (${res.status})`;
      throw new Error(message);
    }

    return body;
  }

  async function refreshBillingStatus() {
    try {
      const body = await billingGet("/api/billing/status");
      setBillingStatus(body);
      return body;
    } catch (err) {
      console.warn("Could not load billing status", err);
      return null;
    }
  }

  async function refreshOperatorActions() {
    try {
      const body = await billingGet("/api/ai/actions?status=pending");
      const actions = rowsFrom(body.actions, body.items, body.data);
      setOperatorActions(actions);
      return actions;
    } catch (err) {
      console.warn("Could not load AI Operator actions", err);
      setOperatorActions([]);
      return [];
    }
  }

  function operatorActionToApproval(item = {}) {
    return {
      ...item,
      __operatorAction: true,
      __modalType: "AI Operator Action",
      __modalTitle: clean(item.title, "AI prepared action"),
      __body: clean(item.body || item.detail || item.reason, "Churvox prepared this for owner approval."),
      __actionLabel: clean(item.recommended_action || item.action, "Approve AI action"),
      eyebrow: clean(item.eyebrow || item.type || item.kind, "AI Operator"),
      kind: clean(item.kind || item.type, "AI Operator"),
      title: clean(item.title, "AI prepared action"),
      prepared: clean(item.prepared || item.body || item.reason, "AI prepared this from live business data."),
      need: clean(item.need || item.reason || item.body, "Owner approval required."),
      status: clean(item.priority, "pending"),
    };
  }

  async function startTrial(plan = "operator") {
    setBillingBusy("trial");
    setBillingNotice("");
    try {
      const body = await billingPost("/api/billing/start-trial", { plan, plan_type: plan });
      setBillingStatus(body);
      setBillingNotice(body.message || "14-day trial started.");
      setToast(body.message || "14-day trial started.");
    } catch (err) {
      setBillingNotice(err.message || "Could not start trial.");
      setToast(err.message || "Could not start trial.");
    } finally {
      setBillingBusy("");
      window.setTimeout(() => setToast(""), 3200);
    }
  }

  async function startCheckout(item) {
    const key = item?.key || item?.plan || item?.addon || item?.sms_pack || "checkout";
    setBillingBusy(key);
    setBillingNotice("");
    try {
      const body = await billingPost("/api/billing/checkout", item);
      const url = body.checkout_url || body.url;
      if (!url) throw new Error("Stripe checkout URL was not returned.");
      window.location.href = url;
    } catch (err) {
      setBillingNotice(err.message || "Could not open Stripe checkout.");
      setToast(err.message || "Could not open Stripe checkout.");
      setBillingBusy("");
      window.setTimeout(() => setToast(""), 4200);
    }
  }


  useEffect(() => {
    // PHASE_274_LOAD_AI_OPERATOR_ACTIONS
    refreshBillingStatus();
    refreshOperatorActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const stripeStatus = params.get("stripe");

    if (!sessionId || stripeStatus !== "success") return;

    const storageKey = `churvox_checkout_confirmed_${sessionId}`;
    try {
      if (sessionStorage.getItem(storageKey)) return;
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore session storage errors
    }

    billingPost("/api/billing/confirm-checkout", { session_id: sessionId })
      .then((body) => {
        const msg = body.message || "Stripe checkout confirmed.";
        setBillingNotice(msg);
        setToast(msg);
        refreshBillingStatus();
        const url = new URL(window.location.href);
        url.searchParams.delete("session_id");
        url.searchParams.delete("stripe");
        url.searchParams.delete("item");
        window.history.replaceState({}, "", url.toString());
        window.setTimeout(() => setToast(""), 3400);
      })
      .catch((err) => {
        const msg = err.message || "Could not confirm Stripe checkout.";
        setBillingNotice(msg);
        setToast(msg);
        window.setTimeout(() => setToast(""), 4200);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  // PHASE_278_REFRESH_AND_PWA_INSTALL
  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function refreshWholeBusiness(reason = "operator-action") {
    await refreshOperatorActions();
    await refreshBillingStatus();

    try {
      onDataRefresh?.(reason);
    } catch {
      // parent refresh is optional
    }

    try {
      window.dispatchEvent(new CustomEvent("churvox:refresh-data", { detail: { reason } }));
      window.dispatchEvent(new CustomEvent("churvox:business-data-changed", { detail: { reason } }));
    } catch {
      // ignore browser event issues
    }
  }

  async function installChurvoxApp() {
    if (!installPrompt) {
      setToast("Install is not ready in this browser yet. Use browser menu > Install app, or try after a refresh.");
      window.setTimeout(() => setToast(""), 4200);
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
      setToast("Churvox install prompt opened.");
    } catch {
      setToast("Install prompt could not open.");
    }

    window.setTimeout(() => setToast(""), 3200);
  }


  // PHASE_292_QUICK_ACTION_FRONTEND_FALLBACK
  function routeForQuickKind(kind = "", actionRoute = "") {
    const compact = clean(kind).toLowerCase();

    if (compact.includes("client")) return "clients";
    if (compact.includes("crew") || compact.includes("worker")) return "team";
    if (compact.includes("quote")) return "quotes";
    if (compact.includes("invoice")) return "invoices";
    if (compact.includes("proof") || compact.includes("payment")) return "proof";
    if (compact.includes("payroll")) return "payroll";
    if (compact.includes("setting")) return "settings";
    if (compact.includes("work") || compact.includes("job")) return "jobs";

    return normalRoute(actionRoute, "dashboard");
  }

  function buildFallbackQuickRecord(action = {}, values = {}, err = null) {
    const kind = clean(values.kind || action.kind || action.id || "work").toLowerCase();
    const route = routeForQuickKind(kind, action.route);
    const now = new Date().toISOString();
    const baseTitle = clean(values.title || values.name || values.job_title || action.title || action.label, "Saved quick action");
    const client = clean(values.client_name || values.client || values.customer_name, "Client");
    const amount = clean(values.amount || values.price || values.total, "");

    const record = {
      id: `local-${kind}-${Date.now()}`,
      kind,
      __route: route,
      __modalType: "Saved business action",
      __modalTitle: baseTitle,
      __body: "Saved on this screen because the backend quick-create endpoint returned an error. The action is still visible so you can keep working while the backend is fixed.",
      __actionLabel: `Open ${routeLabel(route)}`,
      title: baseTitle,
      name: baseTitle,
      job_title: baseTitle,
      client_name: client,
      customer_name: client,
      description: clean(values.notes || values.description || values.details, ""),
      notes: clean(values.notes || values.description || values.details, ""),
      amount: amount,
      total: amount,
      status: "saved locally",
      source: "frontend_quick_action_fallback",
      created_at: now,
      updated_at: now,
      backend_error: clean(err?.message || err, "Backend quick-create failed."),
      ai_operator_note: "Frontend fallback saved this item because backend quick-create failed.",
    };

    if (route === "quotes") {
      record.quote_number = `LOCAL-Q-${Date.now().toString().slice(-5)}`;
      record.quote_status = "draft";
    }

    if (route === "invoices") {
      record.invoice_number = `LOCAL-INV-${Date.now().toString().slice(-5)}`;
      record.payment_status = "draft";
    }

    if (route === "team") {
      record.role = clean(values.role, "worker");
      record.full_name = baseTitle;
      record.email = clean(values.email, "");
      record.phone = clean(values.phone || values.mobile, "");
      record.area = clean(values.area || values.region, "");
      record.region = clean(values.region || values.area, "");
    }

    if (route === "clients") {
      record.email = clean(values.email, "");
      record.phone = clean(values.phone || values.mobile, "");
      record.address = clean(values.address, "");
      record.area = clean(values.area || values.region, "");
    }

    return record;
  }

  function addLocalQuickRecord(record) {
    setLocalQuickRecords((current) => [record, ...current].slice(0, 80));

    try {
      const key = "churvox_local_quick_records";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      localStorage.setItem(key, JSON.stringify([record, ...existing].slice(0, 80)));
    } catch {
      // local storage is optional
    }
  }


  async function submitQuickAction(values) {
    const action = quickAction;
    if (!action) return;

    setQuickBusy(action.id);
    setToast("Saving business action...");

    try {
      const endpoint =
        action.kind === "settings"
          ? "/api/operator/settings-safe"
          : action.kind === "payroll_export"
            ? "/api/operator/payroll/export-safe"
            : "/api/operator/quick-create-safe";

      const body = await billingPost(endpoint, values);
      const targetRoute = normalRoute(action.route || routeForRecord(body.record || body.export || body.setting || {}, current), current);
      const createdRecord = body.record || body.export || body.setting || body.data || null;

      setToast(body.message || "Business action saved. AI will prepare the next step.");
      setQuickAction(null);

      await refreshWholeBusiness(action.kind);

      if (createdRecord && typeof createdRecord === "object") {
        setSelected({
          ...createdRecord,
          __modalType: "Saved business action",
          __modalTitle: titleOf(createdRecord, action.title || action.label || "Saved"),
          __body: body.message || "Saved. Churvox will prepare the next admin step.",
          __actionLabel: `Open ${routeLabel(targetRoute)}`,
          __route: targetRoute,
        });
      } else {
        goToPage(targetRoute);
      }
    } catch (err) {
      const localRecord = buildFallbackQuickRecord(action, values, err);
      addLocalQuickRecord(localRecord);

      const targetRoute = localRecord.__route || normalRoute(action.route, current);

      setToast("Saved on screen. Backend quick-create still needs fixing.");
      setQuickAction(null);
      setSelected({
        ...localRecord,
        __modalType: "Saved business action",
        __modalTitle: localRecord.title,
        __body: `${localRecord.__body} Backend said: ${localRecord.backend_error}`,
        __actionLabel: `Open ${routeLabel(targetRoute)}`,
        __route: targetRoute,
      });

      try {
        window.dispatchEvent(new CustomEvent("churvox:quick-action-fallback", { detail: { record: localRecord } }));
      } catch {
        // ignore event issues
      }
    } finally {
      setQuickBusy("");
      window.setTimeout(() => setToast(""), 4200);
    }
  }


  const model = useMemo(() => {
    const raw = data?.raw || data || {}; // PHASE_219_FRONTEND_PARTIAL_DATA_SAFE
    const localRows = rowsFrom(localQuickRecords);

    const localJobs = localRows.filter((item) => item.__route === "jobs");
    const localClients = localRows.filter((item) => item.__route === "clients");
    const localCrew = localRows.filter((item) => item.__route === "team");
    const localQuotes = localRows.filter((item) => item.__route === "quotes");
    const localInvoices = localRows.filter((item) => item.__route === "invoices");
    const localPayments = localRows.filter((item) => item.__route === "proof" || item.kind?.includes?.("payment"));

    const jobs = [...localJobs, ...rowsFrom(raw.jobs, data?.jobs, raw.work, data?.work)];
    const clients = [...localClients, ...rowsFrom(raw.clients, data?.clients, raw.customers, data?.customers)];
    const crew = [...localCrew, ...rowsFrom(raw.workers, data?.workers, raw.team, data?.team, raw.crew, data?.crew)];
    const quotes = [...localQuotes, ...rowsFrom(raw.quotes, data?.quotes)];
    const invoices = [...localInvoices, ...rowsFrom(raw.invoices, data?.invoices)];
    const payments = [...localPayments, ...rowsFrom(raw.payments, data?.payments, raw.transactions, data?.transactions)];
    const approvalRows = rowsFrom(machine?.approval, visibleApprovals);
    const input = rowsFrom(machine?.input);
    const processing = rowsFrom(machine?.processing);

    return { raw, jobs, clients, crew, quotes, invoices, payments, approvals: approvalRows, input, processing, operatorActions };
  }, [data, machine, visibleApprovals, operatorActions, localQuickRecords]);

  function goToPage(nextPage) {
    // PHASE_283_NORMALIZED_PAGE_ROUTING
    const normalized = normalRoute(nextPage, "dashboard");
    const mappedPage = PAGE_MAP[normalized] || normalized;

    if (billingStatus?.requires_payment && mappedPage !== "plans") {
      setActiveFilter("All");
      setPage?.("plans");
      setBillingNotice("Your 14-day trial has ended. Choose a paid plan to unlock Churvox.");
      openTop();
      return;
    }

    setActiveFilter("All");
    setPage?.(mappedPage);
    openTop();
  }

  function openRecord(record) {
    // PHASE_283_RECORDS_GET_DESTINATIONS
    if (!record) return;
    const routed = { ...record };
    routed.__route = routeForRecord(routed, current);
    setSelected(routed);
  }

  function openInfo(record) {
    if (!record) return;
    const routed = { ...record };
    routed.__route = routeForRecord(routed, current);
    setSelected(routed);
  }

  async function approveRecord(record) {
    if (record?.__operatorAction) {
      const actionId = clean(record.id || record._id || record.action_id);
      if (!actionId) {
        setToast("AI action is missing an id.");
        window.setTimeout(() => setToast(""), 2800);
        return;
      }

      setOperatorBusyAction(actionId);
      setToast("AI Operator is applying the approved action...");

      try {
        const body = await billingPost(`/api/ai/actions/${encodeURIComponent(actionId)}/approve`, {});
        const msg =
          body.message ||
          body.performed_result?.message ||
          "AI Operator action approved.";

        setToast(msg);
        setSelected(null);
        await refreshWholeBusiness("ai-operator-approved");

        try {
          window.dispatchEvent(new CustomEvent("churvox:operator-action-approved", { detail: { actionId, body } }));
        } catch {
          // ignore browser event issues
        }
      } catch (err) {
        setToast(err.message || "AI Operator action failed.");
      } finally {
        setOperatorBusyAction("");
        window.setTimeout(() => setToast(""), 4200);
      }

      return;
    }

    if (record?.__approval && onOpenSlip) {
      onOpenSlip(record.__raw || record);
      setSelected(null);
      return;
    }

    const chosenPlan = planIdFromRecord(record);
    if (chosenPlan && routeForRecord(record, current) === "plans") {
      setSelected(null);
      await startCheckout({ type: "plan", plan: chosenPlan, key: chosenPlan });
      return;
    }

    const targetRoute = routeForRecord(record, current);
    if (targetRoute) {
      setToast(`Opening ${routeLabel(targetRoute)}...`);
      setSelected(null);
      goToPage(targetRoute);
      window.setTimeout(() => setToast(""), 1800);
      return;
    }

    setToast("Reviewed. Churvox marked this next move as owner checked.");
    setSelected(null);
    window.setTimeout(() => setToast(""), 2400);
  }

  const operatorApprovalRows = model.operatorActions.map(operatorActionToApproval);
  const legacyApprovalRows = model.approvals.map((item) => ({ ...item, __approval: true, __raw: item }));

  const approvalSeen = new Set();
  const approvals = [...operatorApprovalRows, ...legacyApprovalRows].filter((item) => {
    const key = clean(item.id || item._id || item.title || item.__modalTitle);
    if (!key || approvalSeen.has(key)) return false;
    approvalSeen.add(key);
    return true;
  });

  const readyToInvoice = model.invoices.filter((item) => /draft|ready|unpaid|owing/i.test(statusOf(item))).length ||
    model.jobs.filter((item) => /complete|ready/i.test(statusOf(item))).length;

  const crewActive = model.crew.filter((item) => /active|working|on|ready/i.test(statusOf(item))).length ||
    model.jobs.filter((item) => /active|progress|started/i.test(statusOf(item))).length;

  const dashboardStats = [
    { label: "Plan", value: planName || "Command", icon: "target", route: "plans" },
    { label: "New inputs", value: model.input.length, icon: "tray", route: "jobs" },
    { label: "Prepared", value: model.processing.length + approvals.length, icon: "document", route: "dashboard" },
    { label: "Approvals", value: approvals.length, icon: "shield", route: "dashboard" },
  ];

  const pages = {
    work: {
      config: {
        kicker: "Work command",
        title: "All work,",
        accent: "already sorted.",
        body: "Jobs enter once. Churvox checks client, area, crew fit, proof and invoice readiness in the background.",
        stats: [
          { label: "New", value: model.jobs.filter((j) => /new|pending/i.test(statusOf(j))).length, icon: "tray" },
          { label: "Assigned", value: model.jobs.filter((j) => workerName(j) !== "Unassigned").length, icon: "crew" },
          { label: "Active", value: model.jobs.filter((j) => /active|progress|started/i.test(statusOf(j))).length, icon: "pulse" },
          { label: "Ready invoice", value: model.jobs.filter((j) => /complete|ready/i.test(statusOf(j))).length, icon: "money", route: "invoices" },
        ],
        workspaceKicker: "Work board",
        workspaceTitle: "Work slips",
        modalType: "Work slip",
        actionLabel: "Open work",
        route: "jobs",
        workspaceBody: "Tap a row to review client, crew, proof and invoice readiness.",
        filters: ["Needs action", "Unassigned", "Today", "Active", "Completed", "Ready to invoice"],
        emptyText: "No work found.",
      },
      rows: model.jobs,
      aiCards: [
        { title: "Best crew match", body: "When area is selected, Churvox suggests the best worker using area, workload and clashes.", icon: "crew", route: "team" },
        { title: "Invoice readiness", body: "Completed work is checked for proof, notes and pricing before invoice prep.", icon: "money", route: "invoices" },
        { title: "Schedule guard", body: "Crew clashes and risky timing are flagged before approval.", icon: "shield" },
      ],
      columns: [
        { key: "title", label: "Work", render: (row) => <strong>{titleOf(row, "Work slip")}</strong> },
        { key: "client", label: "Client", render: clientName },
        { key: "area", label: "Area", render: areaOf },
        { key: "crew", label: "Crew", render: workerName },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI suggestion", render: (row) => aiReason(row, "Churvox is checking crew fit and invoice readiness.") },
      ],
    },

    clients: {
      config: {
        kicker: "Client command",
        title: "Every client record,",
        accent: "cleaned and ready.",
        body: "Churvox watches missing details, unpaid invoices, open quotes and follow-up opportunities.",
        stats: [
          { label: "Clients", value: model.clients.length, icon: "client" },
          { label: "Missing details", value: model.clients.filter((c) => !clean(c.email || c.phone || c.mobile)).length, icon: "alert" },
          { label: "Open quotes", value: model.quotes.length, icon: "document", route: "quotes" },
          { label: "Unpaid", value: model.invoices.filter((i) => /unpaid|overdue|owing/i.test(statusOf(i))).length, icon: "money", route: "invoices" },
        ],
        workspaceKicker: "Client list",
        workspaceTitle: "Client records",
        modalType: "Client profile",
        actionLabel: "Open client",
        route: "clients",
        workspaceBody: "Tap a client to see work history, quotes, invoices and AI next action.",
        filters: ["Needs details", "Active work", "Owing", "Follow-up", "All clients"],
        emptyText: "No clients found.",
      },
      rows: model.clients,
      aiCards: [
        { title: "Missing details", body: "Churvox flags missing phone, email, address or payment details.", icon: "alert" },
        { title: "Follow-up ready", body: "Clients with old quotes or unpaid invoices are prepared for owner review.", icon: "spark" },
        { title: "Duplicate check", body: "Similar names, phones and addresses can be flagged before records get messy.", icon: "shield" },
      ],
      columns: [
        { key: "name", label: "Client", render: clientName },
        { key: "contact", label: "Contact", render: (row) => clean(row.email || row.phone || row.mobile, "Missing") },
        { key: "area", label: "Area", render: areaOf },
        { key: "work", label: "Active work", render: () => "Checked" },
        { key: "owing", label: "Owing", render: (row) => money(row.owing || row.balance || row.amount_due) },
        { key: "ai", label: "AI status", render: (row) => aiReason(row, "Client record checked.") },
      ],
    },

    crew: {
      config: {
        kicker: "Crew command",
        title: "Crew matched,",
        accent: "to the right work.",
        body: "Churvox checks area, availability, workload, job history and schedule risk before suggesting crew.",
        stats: [
          { label: "Crew", value: model.crew.length, icon: "crew" },
          { label: "Active", value: crewActive, icon: "pulse" },
          { label: "Available", value: model.crew.filter((w) => /available|ready/i.test(statusOf(w))).length, icon: "shield" },
          { label: "Review", value: model.crew.filter((w) => /missing|late|risk/i.test(statusOf(w))).length, icon: "alert" },
        ],
        workspaceKicker: "Crew list",
        workspaceTitle: "Crew profiles",
        modalType: "Crew profile",
        actionLabel: "Open crew",
        route: "team",
        workspaceBody: "Tap a worker to see today’s work, notes, proof history and suggested assignments.",
        filters: ["Available", "Active", "Overloaded", "Needs update", "All crew"],
        emptyText: "No crew found.",
      },
      rows: model.crew,
      aiCards: [
        { title: "Best worker found", body: "Unassigned work gets a recommended crew match with the reason attached.", icon: "crew", route: "jobs" },
        { title: "Live updates", body: "Worker notes, pauses, proof photos and completions feed owner/admin automatically.", icon: "pulse", route: "proof" },
        { title: "Clash warning", body: "Churvox warns before assigning someone into a schedule clash.", icon: "alert" },
      ],
      columns: [
        { key: "name", label: "Worker", render: workerName },
        { key: "role", label: "Role", render: (row) => clean(row.role || row.position, "Worker") },
        { key: "area", label: "Area", render: areaOf },
        { key: "current", label: "Current work", render: (row) => clean(row.current_job || row.currentJob, "None") },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI note", render: (row) => aiReason(row, "Crew availability checked.") },
      ],
    },

    quotes: {
      config: {
        kicker: "Quote command",
        title: "Quotes prepared,",
        accent: "followed up and ready to win.",
        body: "Churvox watches quote age, missing pricing, follow-up timing and accepted quote conversion.",
        stats: [
          { label: "Drafts", value: model.quotes.filter((q) => /draft/i.test(statusOf(q))).length, icon: "document" },
          { label: "Sent", value: model.quotes.filter((q) => /sent/i.test(statusOf(q))).length, icon: "tray" },
          { label: "Awaiting", value: model.quotes.filter((q) => /await|pending/i.test(statusOf(q))).length, icon: "pulse" },
          { label: "Accepted", value: model.quotes.filter((q) => /accept/i.test(statusOf(q))).length, icon: "shield" },
        ],
        workspaceKicker: "Quote list",
        workspaceTitle: "Quote slips",
        modalType: "Quote slip",
        actionLabel: "Open quote",
        route: "quotes",
        workspaceBody: "Tap a quote to approve follow-up, convert to work, or convert to invoice.",
        filters: ["Follow-up due", "Drafts", "Awaiting", "Accepted", "All quotes"],
        emptyText: "No quotes found.",
      },
      rows: model.quotes,
      aiCards: [
        { title: "Follow-up prepared", body: "Old quotes get a polite follow-up drafted for owner approval.", icon: "spark" },
        { title: "Missing price check", body: "Quotes missing amount or detail are flagged before sending.", icon: "alert" },
        { title: "Convert when accepted", body: "Accepted quotes can become work or invoice prep without retyping.", icon: "shield", route: "jobs" },
      ],
      columns: [
        { key: "number", label: "Quote", render: (row) => clean(row.quote_number || row.number || row.id, "Quote") },
        { key: "client", label: "Client", render: clientName },
        { key: "work", label: "Work", render: titleOf },
        { key: "amount", label: "Amount", render: (row) => money(row.amount || row.total) },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Follow-up timing checked.") },
      ],
    },

    invoices: {
      config: {
        kicker: "Invoice command",
        title: "Invoices prepared,",
        accent: "from completed work.",
        body: "Churvox links invoices to work, clients, proof, payment status and reminders.",
        stats: [
          { label: "Drafts", value: model.invoices.filter((i) => /draft/i.test(statusOf(i))).length, icon: "document" },
          { label: "Sent", value: model.invoices.filter((i) => /sent/i.test(statusOf(i))).length, icon: "tray" },
          { label: "Owing", value: model.invoices.filter((i) => /unpaid|owing/i.test(statusOf(i))).length, icon: "money" },
          { label: "Overdue", value: model.invoices.filter((i) => /overdue/i.test(statusOf(i))).length, icon: "alert" },
        ],
        workspaceKicker: "Invoice list",
        workspaceTitle: "Invoice slips",
        modalType: "Invoice slip",
        actionLabel: "Open invoice",
        route: "invoices",
        workspaceBody: "Tap an invoice to review proof, AI description, missing details and send readiness.",
        filters: ["Drafts", "Ready to send", "Owing", "Overdue", "Paid"],
        emptyText: "No invoices found.",
      },
      rows: model.invoices,
      aiCards: [
        { title: "Draft invoice ready", body: "Completed work becomes invoice prep with proof and notes attached.", icon: "money", route: "proof" },
        { title: "Reminder prepared", body: "Unpaid invoices get customer reminders drafted for approval.", icon: "spark" },
        { title: "Missing email check", body: "Churvox flags invoices that cannot be sent yet.", icon: "alert", route: "clients" },
      ],
      columns: [
        { key: "number", label: "Invoice", render: (row) => clean(row.invoice_number || row.number || row.id, "Invoice") },
        { key: "client", label: "Client", render: clientName },
        { key: "work", label: "Linked work", render: titleOf },
        { key: "amount", label: "Amount", render: (row) => money(row.amount || row.total) },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Invoice checked.") },
      ],
    },

    proof: {
      config: {
        kicker: "Proof & Pay",
        title: "Proof in.",
        accent: "Payment ready.",
        body: "Worker proof, job notes and completion details flow into invoice and payment readiness.",
        stats: [
          { label: "Completed", value: model.jobs.filter((j) => /complete/i.test(statusOf(j))).length, icon: "shield" },
          { label: "Photos", value: model.jobs.filter((j) => Array.isArray(j.photos) && j.photos.length).length, icon: "photo" },
          { label: "Ready invoice", value: readyToInvoice, icon: "money", route: "invoices" },
          { label: "Follow-up", value: model.payments.length, icon: "card" },
        ],
        workspaceKicker: "Proof feed",
        workspaceTitle: "Proof and payment slips",
        modalType: "Proof & Pay slip",
        actionLabel: "Open proof",
        route: "proof",
        workspaceBody: "Tap proof to check photos, completion notes, invoice readiness and payment action.",
        filters: ["Completed", "Photos", "Ready invoice", "Payment follow-up", "All proof"],
        emptyText: "No proof items found.",
      },
      rows: model.jobs.filter((j) => /complete|proof|photo|ready/i.test(statusOf(j))).length ? model.jobs.filter((j) => /complete|proof|photo|ready/i.test(statusOf(j))) : model.jobs,
      aiCards: [
        { title: "Proof checked", body: "Photos and worker notes are attached before invoice prep.", icon: "photo" },
        { title: "Invoice path ready", body: "Completed work becomes draft invoice context automatically.", icon: "money", route: "invoices" },
        { title: "Payment follow-up", body: "Unpaid or overdue payment actions are surfaced for approval.", icon: "card" },
      ],
      columns: [
        { key: "job", label: "Work", render: titleOf },
        { key: "client", label: "Client", render: clientName },
        { key: "worker", label: "Worker", render: workerName },
        { key: "proof", label: "Proof", render: (row) => Array.isArray(row.photos) && row.photos.length ? `${row.photos.length} photos` : "Checked" },
        { key: "invoice", label: "Invoice", render: (row) => clean(row.invoice_status || row.invoiceStatus, "Ready check") },
        { key: "ai", label: "AI action", render: (row) => aiReason(row, "Proof checked for invoice readiness.") },
      ],
    },

    payroll: {
      config: {
        kicker: "Payroll command",
        title: "Hours prepared,",
        accent: "for payroll review.",
        body: "Churvox prepares hours, pauses, job links, notes and export readiness without exposing owner billing mess.",
        stats: [
          { label: "Crew", value: model.crew.length, icon: "crew" },
          { label: "Hours", value: model.jobs.reduce((sum, j) => sum + Number(j.hours || j.total_hours || 0), 0), icon: "pulse" },
          { label: "Review", value: model.jobs.filter((j) => /missing|pause|review/i.test(statusOf(j))).length, icon: "alert" },
          { label: "Export", value: "Ready", icon: "document" },
        ],
        workspaceKicker: "Payroll review",
        workspaceTitle: "Timesheet slips",
        modalType: "Payroll review",
        actionLabel: "Review hours",
        route: "payroll",
        workspaceBody: "Tap a payroll slip to review worker hours, jobs, pauses and notes.",
        filters: ["Needs review", "Approved", "Missing clock-off", "Export ready"],
        emptyText: "No payroll records found.",
      },
      rows: model.crew.length ? model.crew : model.jobs,
      aiCards: [
        { title: "Missing clock-off", body: "Churvox flags time entries that need owner/admin review.", icon: "alert" },
        { title: "Long pause check", body: "Pauses and unusual time patterns are surfaced before approval.", icon: "pulse" },
        { title: "Export ready", body: "Approved hours can be exported for payroll handoff.", icon: "document" },
      ],
      columns: [
        { key: "worker", label: "Worker", render: workerName },
        { key: "hours", label: "Hours", render: (row) => clean(row.hours || row.total_hours || row.approved_hours, "0") },
        { key: "jobs", label: "Jobs", render: (row) => clean(row.jobs_count || row.job_count || row.current_job, "—") },
        { key: "pauses", label: "Pauses", render: (row) => clean(row.pause_total || row.pauses, "Checked") },
        { key: "status", label: "Status", render: statusOf },
        { key: "ai", label: "AI flag", render: (row) => aiReason(row, "Payroll details checked.") },
      ],
    },

    plans: {
      config: {
        kicker: "Plan command",
        title: "Choose how much admin,",
        accent: "Churvox handles.",
        body: "Start simple, then grow into AI Operator Actions, MYOB sync, payroll workspace and advanced roles.",
        stats: [
          { label: "Start", value: "$39", icon: "target" },
          { label: "Crew", value: "$89", icon: "crew" },
          { label: "Operator", value: "$149", icon: "spark" },
          { label: "Command", value: "$299", icon: "shield" },
        ],
        workspaceKicker: "Plans",
        workspaceTitle: "Churvox pricing",
        modalType: "Plan review",
        actionLabel: "Review plan",
        route: "plans",
        workspaceBody: "Tap a plan to review what Churvox prepares for you.",
        filters: ["Monthly", "AI Operator", "MYOB", "Command"],
        emptyText: "No plans loaded.",
      },
      rows: [
        { id: "start", name: "Start", amount: 39, status: "Basic admin", prepared: "For solo operators getting work under control." },
        { id: "crew", name: "Crew", amount: 89, status: "Team workflow", prepared: "For businesses assigning work and tracking crew." },
        { id: "operator", name: "Operator", amount: 149, status: "Most popular", prepared: "AI Operator Actions prepare admin for approval." },
        { id: "command", name: "Command", amount: 299, status: "Full command", prepared: "MYOB included, payroll workspace, advanced roles and higher limits." },
      ],
      aiCards: [
        { title: "Operator is the main plan", body: "Best fit when Churvox prepares admin and the owner approves.", icon: "spark" },
        { title: "Command includes MYOB", body: "Command adds MYOB, payroll workspace and larger capacity.", icon: "shield" },
        { title: "Growth pack ready", body: "Command can grow by 50 active team member blocks.", icon: "crew" },
      ],
      columns: [
        { key: "name", label: "Plan", render: (row) => <strong>{row.name}</strong> },
        { key: "amount", label: "Price", render: (row) => `$${row.amount}/mo + GST` },
        { key: "status", label: "Best for", render: statusOf },
        { key: "included", label: "Included", render: (row) => row.prepared },
        { key: "ai", label: "AI value", render: () => "Churvox prepares admin. You approve." },
      ],
    },

    settings: {
      config: {
        kicker: "Settings command",
        title: "Business controls,",
        accent: "without the mess.",
        body: "Control roles, notifications, AI approval mode, billing, MYOB, SMS credits and security.",
        stats: [
          { label: "Business", value: "Ready", icon: "briefcase" },
          { label: "Roles", value: model.crew.length || "Set", icon: "crew" },
          { label: "AI mode", value: "Approve", icon: "spark" },
          { label: "Security", value: "On", icon: "shield" },
        ],
        workspaceKicker: "Settings",
        workspaceTitle: "Control centre",
        modalType: "Setting",
        actionLabel: "Open setting",
        route: "settings",
        workspaceBody: "Tap a setting to manage business controls and AI behaviour.",
        filters: ["Business", "Roles", "AI Operator", "Billing", "MYOB", "SMS", "Security"],
        emptyText: "No settings found.",
      },
      rows: [
        { id: "business", title: "Business profile", status: "Ready", prepared: "Company details, industry and contact information." },
        { id: "roles", title: "Team roles", status: "Ready", prepared: "Owner, manager, worker, office admin and payroll permissions." },
        { id: "ai", title: "AI approval mode", status: "Prepare and ask", prepared: "Churvox prepares admin but never sends without approval." },
        { id: "billing", title: "Billing and plan", status: "Checked", prepared: "Plan, subscription and add-ons." },
        { id: "myob", title: "MYOB connection", status: "Optional", prepared: "Sync settings and accounting controls." },
        { id: "sms", title: "SMS credits", status: "Coming soon", prepared: "Credit packs and reminder controls." },
        { id: "security", title: "Security", status: "On", prepared: "Login, account and access controls." },
      ],
      aiCards: [
        { title: "Approval mode", body: "Draft only, prepare and ask, or high-confidence auto-prepare. Never auto-send without approval.", icon: "shield" },
        { title: "Role safety", body: "Payroll and worker users stay locked to the areas they need.", icon: "crew" },
        { title: "Integration control", body: "MYOB, SMS and billing settings stay grouped without clutter.", icon: "document" },
      ],
      columns: [
        { key: "title", label: "Setting", render: titleOf },
        { key: "status", label: "Status", render: statusOf },
        { key: "prepared", label: "What it controls", render: (row) => row.prepared },
        { key: "owner", label: "Owner action", render: () => "Review settings" },
        { key: "ai", label: "AI note", render: () => "Configured for approval-first admin." },
      ],
    },
  };

  const pageConfig = pages[current] || pages.work;

  return (
    <section className="cs-suite" data-phase="PHASE_212_WIRED_COMMAND_SUITE">
      {/* PHASE_249_DUPLICATE_TOP_NAV_REMOVED: main top nav is the only page nav now. */}

      {appLocked && current !== "plans" ? (
        <LockedTrialPage billingStatus={billingStatus} goToPage={goToPage} />
      ) : current === "dashboard" ? (
        <section className="cs-page">
          <header className="cs-hero">
            <section>
              <span>Command Desk</span>
              <h1>
                Churvox prepares the admin.
                <mark>You approve the next move.</mark>
              </h1>
              <p>
                Work comes in, Churvox checks the admin path, then shows the owner one clean approval slip.
              </p>
            </section>

            <section className="cs-stats">
              {dashboardStats.map((stat) => (
                <Stat
                  key={stat.label}
                  {...stat}
                  onClick={() => openInfo({
                    __modalType: "Live metric",
                    __modalTitle: stat.label,
                    __body: `${stat.label}: ${stat.value}. Churvox keeps this updated from your business data.`,
                    status: "Live",
                    __route: stat.route || "dashboard",
                  })}
                />
              ))}
            </section>
          </header>

          <section className="cs-command-cards">
            <button type="button" onClick={() => openInfo({ __modalType: "Approval queue", __modalTitle: "Ready for approval", __body: "These are owner-ready approval slips prepared by Churvox.", status: "Ready" })}>
              <Icon type="briefcase" />
              <div><strong>{approvals.length}</strong><span>Ready for approval</span><p>Owner-ready admin waiting for your decision.</p></div>
              <b>›</b>
            </button>
            <button type="button" onClick={() => goToPage("invoices")}>
              <Icon type="money" />
              <div><strong>{readyToInvoice}</strong><span>Ready to invoice</span><p>Completed work ready for invoice prep.</p></div>
              <b>›</b>
            </button>
            <button type="button" onClick={() => goToPage("team")}>
              <Icon type="crew" />
              <div><strong>{crewActive}</strong><span>Crew active today</span><p>Worker notes, proof and updates flowing in.</p></div>
              <b>›</b>
            </button>
          </section>

          <CommandBriefing
            model={model}
            approvals={approvals}
            readyToInvoice={readyToInvoice}
            crewActive={crewActive}
            goToPage={goToPage}
          />

          <CommandSearch
            model={model}
            approvals={approvals}
            goToPage={goToPage}
            onQuickAction={(action) => setQuickAction(action)}
            openRecord={openRecord}
          />

          <SetupChecklist
            model={model}
            goToPage={goToPage}
            onQuickAction={(action) => setQuickAction(action)}
          />

          <NotificationCentre
            approvals={approvals}
            model={model}
            openRecord={openRecord}
            goToPage={goToPage}
          />

          <ReadinessPanel
            model={model}
            approvals={approvals}
            goToPage={goToPage}
          />

          <section className="cs-quick-launch" data-phase="PHASE_280_DASHBOARD_BUSINESS_STACK">
            <div className="cs-quick-copy">
              <span>Quick actions</span>
              <strong>Capture work fast.</strong>
              <p>Add the job, client, quote, invoice or proof note. Churvox prepares the admin path.</p>
            </div>

            <div className="cs-quick-buttons">
              {(QUICK_ACTIONS_BY_PAGE.dashboard || []).map((action) => (
                <button type="button" key={action.id} onClick={() => setQuickAction(action)}>
                  {action.label}
                </button>
              ))}
              <button type="button" onClick={installChurvoxApp}>
                Install Churvox
              </button>
            </div>
          </section>

          <section className="cs-desk">
            <header>
              <Icon type="clipboard" />
              <h2>Approval Desk</h2>
              <i />
              <p>Review what Churvox prepared, approve it, or edit before it goes out.</p>
            </header>

            <section className="cs-approval-list">
              {approvals.length ? approvals.slice(0, showAllApprovals ? approvals.length : 5).map((item, index) => {
                const risk = riskFor(item);
                return (
                  <article
                    className="cs-approval-row"
                    key={idOf(item, index)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openRecord(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") openRecord(item);
                    }}
                  >
                    <span>{clean(item.eyebrow || item.kind, "Approval")}</span>
                    <strong>{titleOf(item, "Approval slip")}</strong>
                    <p>{aiReason(item)}</p>
                    <b className={`cs-risk ${risk.tone}`}>{risk.label}</b>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openRecord(item);
                      }}
                    >
                      Open Approval Slip <em>›</em>
                    </button>
                  </article>
                );
              }) : (
                <section className="cs-empty">
                  <strong>No approvals waiting.</strong>
                  <p>When work comes in, Churvox prepares the admin and places clean approval slips here.</p>
                </section>
              )}

              {hiddenApprovalCount > 0 && !showAllApprovals ? (
                <button type="button" className="cs-view" onClick={() => setShowAllApprovals?.(true)}>
                  View all {approvals.length} approvals
                </button>
              ) : null}

              {showAllApprovals && approvals.length > 5 ? (
                <button type="button" className="cs-view ghost" onClick={() => setShowAllApprovals?.(false)}>
                  Show top 5 only
                </button>
              ) : null}
            </section>
          </section>

          <section className="cs-flow" data-phase="PHASE_287_FLOW_BUTTONS_WIRED">
            <button type="button" onClick={() => openInfo({ __modalType: "AI Watch", __modalTitle: "AI is watching", __body: "Churvox watches each step from work intake to payment follow-up.", status: "Active", __route: "dashboard" })}>
              <Icon type="eye" />
              <div><strong>AI is watching</strong><p>Every job. Every detail. Every time.</p></div>
            </button>
            <div>
              {[
                ["Work", "jobs"],
                ["Crew", "team"],
                ["Proof", "proof"],
                ["Invoice", "invoices"],
                ["Payment", "proof"],
              ].map(([label, route], index, arr) => (
                <React.Fragment key={`${label}-${route}`}>
                  <button type="button" onClick={() => goToPage(route)}>{label}</button>
                  {index < arr.length - 1 ? <b>›</b> : null}
                </React.Fragment>
              ))}
            </div>
          </section>
        </section>
      ) : current === "plans" ? (
        <PlansCommandPage
          planName={planName}
          openInfo={openInfo}
          goToPage={goToPage}
          startTrial={startTrial}
          startCheckout={startCheckout}
          billingBusy={billingBusy}
          billingNotice={billingNotice}
          billingStatus={billingStatus}
        />
      ) : (
        <SmartPage
          config={pageConfig.config}
          rows={pageConfig.rows}
          columns={pageConfig.columns}
          aiCards={pageConfig.aiCards}
          onOpen={openRecord}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          openInfo={openInfo}
          goToPage={goToPage}
          quickActions={QUICK_ACTIONS_BY_PAGE[current] || []}
          onQuickAction={(action) => setQuickAction(action)}
          extraPanel={
            <React.Fragment>
              {current === "work" ? (
                <JobPipeline jobs={model.jobs} openRecord={openRecord} />
              ) : null}

              {current === "clients" ? (
                <ClientTimeline
                  clients={model.clients}
                  jobs={model.jobs}
                  quotes={model.quotes}
                  invoices={model.invoices}
                  openRecord={openRecord}
                />
              ) : null}

              {current === "crew" ? (
                <CrewWorkload crew={model.crew} jobs={model.jobs} openRecord={openRecord} />
              ) : null}

              {current === "invoices" || current === "proof" ? (
                <InvoiceControlCentre
                  invoices={model.invoices}
                  jobs={model.jobs}
                  openRecord={openRecord}
                  goToPage={goToPage}
                />
              ) : null}

              {current === "settings" || current === "payroll" ? (
                <ReadinessPanel model={model} approvals={approvals} goToPage={goToPage} />
              ) : null}
            </React.Fragment>
          }
          data-phase="PHASE_280_PAGE_EXTRA_PANELS"
        />
      )}

      {toast ? <aside className="cs-toast">{toast}</aside> : null}

      <QuickActionModal
        action={quickAction}
        busy={quickBusy}
        onClose={() => setQuickAction(null)}
        onSubmit={submitQuickAction}
      />

      <DetailModal
        selected={selected}
        onClose={() => setSelected(null)}
        onApprove={approveRecord}
        setPage={goToPage}
        operatorBusyAction={operatorBusyAction}
      />
    </section>
  );
}
