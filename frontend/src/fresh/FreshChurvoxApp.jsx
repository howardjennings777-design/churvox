import React, { useEffect, useMemo, useState } from "react";
import WorkerFieldApp from "./worker/WorkerFieldApp";
import BillingCentrePage from "./billing/BillingCentrePage";
import PlansCentrePage from "./plans/PlansCentrePage";
import SettingsHubPage from "./settings/SettingsHubPage";
import ImportCentrePage from "./imports/ImportCentrePage";
import AISetupGuide from "./components/AISetupGuide";
import DemoModePage from "./demo/DemoModePage";
import OnboardingSetupPage from "./onboarding/OnboardingSetupPage";
import ProofToPaidPage from "./proof/ProofToPaidPage";
import MyobControlCentre from "./components/MyobControlCentre";
import AutopilotReplay from "./components/AutopilotReplay";
import TrustQualityScores from "./components/TrustQualityScores";
import OperatorActionDrawer from "./operator/OperatorActionDrawer";
import OperatorApprovalCentre from "./operator/OperatorApprovalCentre";
import { buildOperatorQueue } from "./operator/operatorHelpers";
import { persistOperatorAction } from "./operator/operatorStorage";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import PublicClientPortalPage from "../pages/public/PublicClientPortalPage";

import "./churvoxOperatorDirection.css";
import FreshAuthShell from "./FreshAuthShell";
const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();


function ChurvoxPublicLanding() {
  return <FreshAuthShell />;
}

function readToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = readToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function toArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ["data", "items", "results"]) if (Array.isArray(payload[key])) return payload[key];
  return Object.values(payload).find(Array.isArray) || [];
}

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.client_name || item?.customer_name || item?.invoice_number || item?.quote_number || item?.email || fallback;
}

function statusOf(item, fallback = "active") {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || item?.state || fallback).replaceAll("_", " ");
}


// CHURVOX_MANUAL_CREATE_START
const MANUAL_CREATE_CONFIG = {
  clients: {
    label: "Add client",
    title: "Add client manually",
    endpoint: "/clients",
    fields: [
      ["client_name", "Client name", "text", true],
      ["contact_name", "Contact name", "text", false],
      ["email", "Email", "email", false],
      ["phone", "Phone", "tel", false],
      ["address", "Address", "text", false],
      ["notes", "Notes", "textarea", false],
    ],
  },
  jobs: {
    label: "Add job",
    title: "Add job manually",
    endpoint: "/jobs",
    fields: [
      ["title", "Job title", "text", true],
      ["client_name", "Client name", "text", false],
      ["address", "Job address", "text", false],
      ["scheduled_date", "Scheduled date", "date", false],
      ["scheduled_time", "Scheduled time", "time", false],
      ["description", "Job notes", "textarea", false],
    ],
  },
  quotes: {
    label: "Add quote",
    title: "Create quote manually",
    endpoint: "/quotes",
    fields: [
      ["title", "Quote title", "text", true],
      ["client_name", "Client name", "text", false],
      ["email", "Client email", "email", false],
      ["amount", "Amount", "number", false],
      ["description", "Quote description", "textarea", false],
    ],
  },
  invoices: {
    label: "Add invoice",
    title: "Create invoice manually",
    endpoint: "/invoices",
    fields: [
      ["client_name", "Client name", "text", true],
      ["email", "Client email", "email", false],
      ["amount", "Amount", "number", false],
      ["description", "Invoice description", "textarea", false],
      ["due_date", "Due date", "date", false],
    ],
  },
  team: {
    label: "Add worker",
    title: "Add worker manually",
    endpoint: "/team/workers",
    fields: [
      ["name", "Worker name", "text", true],
      ["email", "Email", "email", true],
      ["phone", "Phone", "tel", false],
      ["role", "Role", "text", false],
      ["region", "Region", "text", false],
      ["skills", "Skills", "text", false],
      ["notes", "Notes", "textarea", false],
    ],
  },
};

function ManualCreateModal({ type, onClose, onSaved }) {
  const config = MANUAL_CREATE_CONFIG[type];
  const [form, setForm] = React.useState({});
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  if (!config) return null;

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    const payload = { ...form };

    if (type === "clients") {
      payload.name = payload.client_name || payload.name;
      payload.customer_name = payload.client_name || payload.customer_name;
    }

    if (type === "jobs") {
      payload.job_title = payload.title || payload.job_title;
      payload.status = payload.status || "draft";
    }

    if (type === "quotes") {
      payload.status = payload.status || "draft";
      payload.total = Number(payload.amount || 0);
    }

    if (type === "invoices") {
      payload.status = payload.status || "draft";
      payload.total = Number(payload.amount || 0);
    }

    if (type === "team") {
      payload.role = payload.role || "worker";
    }

    try {
      await api(config.endpoint, { method: "POST", body: payload });
      await onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message || "Could not save. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manual-create-backdrop" role="presentation" onClick={!busy ? onClose : undefined}>
      <section className="manual-create-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>MANUAL ENTRY</p>
            <h2>{config.title}</h2>
            <span>Add it now. AI can help with the admin after it exists.</span>
          </div>
          <button type="button" onClick={onClose} disabled={busy}>×</button>
        </header>

        {error ? <div className="manual-create-error">{error}</div> : null}

        <form onSubmit={submit}>
          {config.fields.map(([name, label, inputType, required]) => (
            <label key={name}>
              <span>{label}{required ? " *" : ""}</span>
              {inputType === "textarea" ? (
                <textarea
                  value={form[name] || ""}
                  required={required}
                  rows={3}
                  onChange={(event) => updateField(name, event.target.value)}
                />
              ) : (
                <input
                  type={inputType}
                  value={form[name] || ""}
                  required={required}
                  onChange={(event) => updateField(name, event.target.value)}
                />
              )}
            </label>
          ))}

          <footer>
            <button type="button" className="manual-create-secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="manual-create-primary" disabled={busy}>
              {busy ? "Saving..." : config.label}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ManualCreateButton({ type, onSaved }) {
  const config = MANUAL_CREATE_CONFIG[type];
  const [open, setOpen] = React.useState(false);

  if (!config) return null;

  return (
    <>
      <button type="button" className="manual-create-button" onClick={() => setOpen(true)}>
        + {config.label}
      </button>
      {open ? <ManualCreateModal type={type} onClose={() => setOpen(false)} onSaved={onSaved} /> : null}
    </>
  );
}
// CHURVOX_MANUAL_CREATE_END


function money(item) {
  const value = Number(item?.total || item?.amount || item?.price || item?.balance || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function useLiveData() {
  const [state, setState] = useState({ loading: true, error: "", jobs: [], clients: [], quotes: [], invoices: [], team: [] });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    const calls = await Promise.allSettled([
      api("/jobs"),
      api("/clients"),
      api("/quotes"),
      api("/invoices"),
      api("/team/workers"),
    ]);

    setState({
      loading: false,
      error: calls.some((c) => c.status === "rejected") ? "Live data is syncing. Dashboard is active." : "",
      jobs: calls[0].status === "fulfilled" ? toArray(calls[0].value, ["jobs"]) : [],
      clients: calls[1].status === "fulfilled" ? toArray(calls[1].value, ["clients"]) : [],
      quotes: calls[2].status === "fulfilled" ? toArray(calls[2].value, ["quotes"]) : [],
      invoices: calls[3].status === "fulfilled" ? toArray(calls[3].value, ["invoices"]) : [],
      team: calls[4].status === "fulfilled" ? toArray(calls[4].value, ["workers", "team"]) : [],
    });
  }

  useEffect(() => { load(); }, []);
  return { ...state, reload: load };
}

function ChurvoxLogo() {
  return (
    <div className="op-logo">
      <img className="op-logo-img" src="/brand/churvox-holo-c.svg" alt="Churvox" />
      <div>
        <strong>CHURVOX</strong>
        <small>OPERATOR OS</small>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const location = useLocation();
  const nav = [
    ["Smart Hub", "/dashboard", "⬡", "Daily command centre"],
    ["AI Work Queue", "/ai-approvals", "◆", "Edit & Approve"],
    ["Jobs", "/jobs", "⌘", "Schedule & Dispatch"],
    ["Crew", "/team", "♧", "People & Availability"],
    ["Quotes", "/quotes", "▤", "Estimates & Follow-ups"],
    ["Invoices", "/invoices", "▥", "Billing & Payments"],
    ["Clients", "/clients", "◎", "Customers & Sites"],
    ["Import", "/import", "⇪", "CSV setup"],
    ["Proof-to-Paid", "/proof-to-paid", "✓", "Invoice ready"],
    ["Plans", "/plans", "◍", "Choose plan"],
    ["Billing", "/billing", "$", "Users & SMS credits"],
    ["Settings", "/settings", "⚙", "System & Preferences"],
  ];

  return (
    <div className="op-shell">
      <aside className="op-rail">
        <ChurvoxLogo />

        <nav className="op-nav">
          {nav.map(([label, href, icon, sub]) => (
            <Link key={href} to={href} className={location.pathname === href ? "active" : ""}>
              <i>{icon}</i>
              <span>
                <b>{label}</b>
                <small>{sub}</small>
              </span>
            </Link>
          ))}
        </nav>

        <section className="op-ai-mode">
          <p>AI OPERATOR</p>
          <strong>Active & running 24/7</strong>
          <small>Prepares work for approval</small>
        </section>

        <section className="op-user">
          <div className="op-avatar">A</div>
          <div>
            <strong>{localStorage.getItem("churvox_owner_name") || "Owner"}</strong>
            <small>Business Owner</small>
          </div>
        </section>
      </aside>

      <main className="op-main">{children}<AISetupGuide /></main>
    </div>
  );
}

function Topbar() {
  const navigate = useNavigate();
  const greeting = `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${localStorage.getItem("churvox_owner_name") || "Owner"}.`;

  return (
    <div className="op-topbar op-topbar-command">
      <span>☼ {greeting}</span>

      <div className="op-topbar-actions">
        <ManualCreateButton type="jobs" />
        <ManualCreateButton type="clients" />
        <ManualCreateButton type="invoices" />

        <button type="button" className="op-action-chip" onClick={() => navigate("/import")}>
          Import CSV
        </button>

        <button type="button" className="op-action-chip" onClick={() => navigate("/ai-approvals")}>
          AI work queue
        </button>

        <button type="button" className="op-action-chip" onClick={() => navigate("/proof-to-paid")}>
          Proof-to-Paid
        </button>

        <button type="button" className="op-date-chip" onClick={() => navigate("/jobs")}>
          {new Date().toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
        </button>
      </div>
    </div>
  );
}

function Hero({ data, prepared }) {
  return (
    <section className="op-hero">
      <div className="op-hero-copy">
        <p>CHURVOX OPERATOR OS</p>
        <h1>AI prepares the admin.<br /><span>You approve the work.</span></h1>
        <small>Churvox prepares the admin work for you — jobs, invoices, messages and follow-ups — then puts it in one queue for owner approval.</small>
        <div className="op-hero-actions">
          <Link to="/ai-approvals" className="op-hero-primary">Open AI Work Queue</Link>
          <Link to="/proof-to-paid" className="op-hero-secondary">Open Proof-to-Paid</Link>
        </div>
      </div>

      <div className="op-orb-wrap">
        <div className="op-radar" />
        <div className="op-orb">
          <img className="op-orb-logo-img" src="/brand/churvox-holo-c.svg" alt="Churvox Operator" />
        </div>
      </div>

      <aside className="op-status">
        <p>AI OPERATOR</p>
        <strong>Always on. Always working.</strong>
        <span>✓ Monitoring everything</span>
        <span>✓ Managing the admin</span>
        <span>✓ Preparing decisions</span>
      </aside>

      <aside className="op-prepared">
        <strong>{prepared}</strong>
        <span>Prepared actions</span>
        <small>Ready for your approval</small>
      </aside>
    </section>
  );
}

function OwnerNotifications({ jobs = [], quotes = [], invoices = [], clients = [], team = [] }) {
  const notifications = [];
  const completed = jobs.filter((j) => statusSlug(j) === "completed");
  const unassigned = jobs.filter(isUnassigned);
  const overdueInvoices = invoices.filter((i) => statusOf(i, "").toLowerCase().includes("overdue"));
  const quoteFollowups = quotes.filter((q) => ["sent", "pending", "open"].includes(statusSlug(q)));

  if (completed.length) notifications.push({ id: "worker-complete", label: "Worker completed job", detail: `${completed.length} completed job${completed.length === 1 ? "" : "s"} ready for proof/invoice prep.`, to: "/proof-to-paid" });
  if (unassigned.length) notifications.push({ id: "job-unassigned", label: "Job unassigned", detail: `${unassigned.length} job${unassigned.length === 1 ? "" : "s"} still need worker assignment.`, to: "/jobs" });
  if (quoteFollowups.length) notifications.push({ id: "quote-followup", label: "Quote needs follow-up", detail: `${quoteFollowups.length} quote${quoteFollowups.length === 1 ? "" : "s"} waiting for customer response.`, to: "/quotes" });
  if (overdueInvoices.length) notifications.push({ id: "payment-overdue", label: "Payment overdue", detail: `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} are overdue and need owner action.`, to: "/invoices" });
  if (!clients.length || !team.length) notifications.push({ id: "setup-required", label: "Setup reminder", detail: "Finish import/setup to unlock full AI dispatch and billing flow.", to: "/import" });

  return (
    <section className="op-panel">
      <header><h3>OWNER NOTIFICATIONS <b>{notifications.length}</b></h3><span>Tappable, approval-first actions</span></header>
      {!notifications.length ? <div className="op-empty-mini">No urgent notifications right now.</div> : notifications.map((n) => (
        <Link key={n.id} to={n.to} className="op-data-row" style={{ textDecoration: "none" }}>
          <strong>{n.label}</strong>
          <small>{n.detail}</small>
        </Link>
      ))}
    </section>
  );
}


function buildApprovalActions(props = {}) {
  const actions = buildOperatorQueue(props);
  return actions;
}

/* legacy helper retired */
function _legacyBuildApprovalActions({ unassigned = 0, openInvoices = 0, openQuotes = 0, completedNeedsInvoice = 0 }) {
  const actions = [];

  if (unassigned > 0) {
    actions.push({
      icon: "♧",
      label: "DISPATCH",
      title: `Assign ${unassigned} unassigned ${unassigned === 1 ? "job" : "jobs"}`,
      text: "AI found jobs without a worker assigned.",
      why: "Why: Churvox can recommend the best available worker using active status, region and current workload.",
      guardrail: "Owner approval required before any worker is assigned.",
      confidence: "Ready",
      tone: "blue",
    });
  }

  if (openInvoices > 0) {
    actions.push({
      icon: "✉",
      label: "CASHFLOW",
      title: `Prepare reminders for ${openInvoices} open ${openInvoices === 1 ? "invoice" : "invoices"}`,
      text: "AI found invoices that may need payment follow-up.",
      why: "Why: Draft reminders can help cashflow without auto-sending anything.",
      guardrail: "Nothing is sent to customers until the owner approves.",
      confidence: "Ready",
      tone: "amber",
    });
  }

  if (openQuotes > 0) {
    actions.push({
      icon: "☷",
      label: "SALES",
      title: `Follow up ${openQuotes} open ${openQuotes === 1 ? "quote" : "quotes"}`,
      text: "AI found quotes still waiting for a customer decision.",
      why: "Why: A timely follow-up can recover work that may otherwise go cold.",
      guardrail: "AI prepares editable follow-up drafts only.",
      confidence: "Ready",
      tone: "purple",
    });
  }

  if (completedNeedsInvoice > 0) {
    actions.push({
      icon: "▤",
      label: "INVOICE",
      title: `Draft ${completedNeedsInvoice} invoice ${completedNeedsInvoice === 1 ? "from completed work" : "from completed jobs"}`,
      text: "AI found completed jobs that do not appear to have linked invoices yet.",
      why: "Why: Completed work should move into proof, invoice draft and owner approval.",
      guardrail: "AI creates draft invoices only. Owner still approves before sending.",
      confidence: "Ready",
      tone: "green",
    });
  }

  return actions;
}

function ApprovalQueue({ jobs = [], invoices = [], quotes = [], team = [], clients = [], leads = [], enquiries = [], drafts = [], history = [], moneyReviews = [], onAction }) {
  const actions = buildApprovalActions({ jobs, invoices, quotes, team, clients, leads, enquiries, drafts, history, moneyReviews });

  return (
    <section className="op-approval">
      <header>
        <div>
          <h2>AI Approval Queue <b>{actions.length}</b></h2>
          <p>{actions.length ? "AI found actions requiring owner approval" : "No approvals waiting. Churvox is monitoring jobs, invoices, quotes and leads."}</p>
        </div>
      </header>

      {!actions.length ? (
        <div className="op-approval-empty">
          <strong>No approvals waiting.</strong>
          <span>Churvox is monitoring jobs, invoices, quotes and leads.</span>
        </div>
      ) : (
        <div className="op-approval-list">
          {actions.map((a) => (
            <article className={`op-action`} key={a.id}>
              <i>⚙</i>
              <div>
                <span>{a.type}</span>
                <strong>{a.title}</strong>
                <p>{a.summary}</p>
                <small>Risk / Guardrail: {a.risk}</small>
                <small>Confidence: {a.confidence_label}</small>
              </div>
              <div className="op-action-buttons">
                <button onClick={() => onAction?.(a, "review")}>Review action</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}


function jobPhotos(job) {
  const raw = job.photos || job.job_photos || job.proof_photos || job.completion_photos || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => typeof p === "string" ? p : p?.url || p?.src || p?.path).filter(Boolean);
}

function jobProofSummary(job) {
  return (
    job.ai_summary ||
    job.completion_summary ||
    job.ai_invoice_description ||
    job.invoice_description_draft ||
    job.worker_completion_notes ||
    job.completion_notes ||
    job.worker_notes ||
    job.notes ||
    "Completed work is ready for owner review. Add proof notes/photos before sending anything to the client if needed."
  );
}

function ProofToPaid({ jobs = [], invoices = [], reload }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const invoicedJobIds = new Set(invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
  const candidates = jobs
    .filter((j) => ["completed", "done", "closed"].includes(statusSlug(j)))
    .filter((j) => !invoicedJobIds.has(String(j.id || j._id || "")))
    .slice(0, 8);

  async function createDraftInvoice(job) {
    if (!job || busy) return;
    setBusy(true);
    setNotice("");

    const total = Number(job.total || job.amount || job.price || job.job_price || job.subtotal || 0);
    const customerName = job.client_name || job.customer_name || job.customer || job.client || "Client";
    const description = jobProofSummary(job);

    const body = {
      job_id: job.id || job._id,
      source_job_id: job.id || job._id,
      client_id: job.client_id || job.customer_id || "",
      customer_id: job.customer_id || job.client_id || "",
      customer_name: customerName,
      client_name: customerName,
      customer_email: job.customer_email || job.client_email || "",
      address: job.address || job.site_address || job.job_address || "",
      description,
      subtotal: total,
      amount: total,
      total,
      status: "draft",
      created_by_ai: true,
      source: "proof_to_paid",
    };

    let ok = false;
    for (const path of ["/invoices", "/invoices/create"]) {
      try {
        await api(path, { method: "POST", body });
        ok = true;
        break;
      } catch {}
    }

    if (ok) {
      setNotice("Draft invoice created from completed job proof.");
      setSelected(null);
      await reload?.();
    } else {
      const drafts = readLocalList("churvox_operator_drafts");
      drafts.unshift({
        id: `proof-${Date.now()}`,
        type: "proof_to_paid_invoice_draft",
        title: `Invoice draft for ${titleOf(job, "completed job")}`,
        target: "/invoices",
        created_at: new Date().toISOString(),
        job_id: job.id || job._id,
        description,
        amount: total,
      });
      saveLocalList("churvox_operator_drafts", drafts);
      setNotice("Backend did not accept invoice creation yet. Draft saved for owner review.");
    }

    setBusy(false);
  }

  return (
    <section className="op-proof-live">
      <header>
        <div>
          <p>PROOF TO PAID</p>
          <h2>Completed work ready to invoice.</h2>
          <span>{candidates.length} completed {candidates.length === 1 ? "job" : "jobs"} waiting for invoice review</span>
        </div>
        <Link to="/invoices">Open invoices</Link>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      {!candidates.length ? (
        <div className="op-approval-empty">
          <strong>No completed jobs waiting for invoice.</strong>
          <span>When workers complete jobs, Churvox will collect proof, prepare a summary and move the job toward a draft invoice.</span>
        </div>
      ) : (
        <div className="op-proof-live-grid">
          {candidates.map((job, index) => {
            const photos = jobPhotos(job);
            return (
              <article className="op-proof-live-card" key={job.id || job._id || index}>
                <div>
                  <span>COMPLETED</span>
                  <strong>{titleOf(job, `Completed job ${index + 1}`)}</strong>
                  <small>{[job.client_name || job.customer_name, job.address || job.site_address, money(job)].filter(Boolean).join(" · ") || "Ready for review"}</small>
                </div>

                <section>
                  <b>AI proof summary</b>
                  <p>{jobProofSummary(job)}</p>
                </section>

                <footer>
                  <small>{photos.length} proof {photos.length === 1 ? "photo" : "photos"}</small>
                  <button type="button" onClick={() => setSelected(job)}>Review proof</button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={!busy ? () => setSelected(null) : undefined}>
          <section className="op-modal op-proof-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>PROOF REVIEW</p>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>×</button>
            </header>

            <div className="op-modal-body">
              <span>COMPLETED JOB</span>
              <h2>{titleOf(selected, "Completed job")}</h2>
              <p>{jobProofSummary(selected)}</p>

              <div className="op-modal-reason">
                <strong>Job details</strong>
                <small>{[
                  selected.client_name || selected.customer_name,
                  selected.address || selected.site_address,
                  selected.completed_at ? `Completed ${new Date(selected.completed_at).toLocaleString()}` : "",
                  money(selected) || "Amount needs review"
                ].filter(Boolean).join(" · ")}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Owner approval guardrail</strong>
                <small>Churvox will create a draft invoice only. Nothing is sent to the client until the owner approves it.</small>
              </div>

              {jobPhotos(selected).length ? (
                <div className="op-proof-photo-grid">
                  {jobPhotos(selected).slice(0, 6).map((src, idx) => (
                    <img key={`${src}-${idx}`} src={src} alt={`Job proof ${idx + 1}`} />
                  ))}
                </div>
              ) : (
                <div className="op-approval-empty">
                  <strong>No proof photos found.</strong>
                  <span>You can still create a draft invoice, but owner review is recommended before sending.</span>
                </div>
              )}
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)} disabled={busy}>Cancel</button>
              <button type="button" className="op-modal-primary" onClick={() => createDraftInvoice(selected)} disabled={busy}>
                {busy ? "Creating draft..." : "Create draft invoice"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}


function CrewStatus({ team, reload }) {
  const rows = team.slice(0, 6);

  return (
    <section className="op-panel op-crew">
      <header>
        <h3>CREW STATUS</h3>
        <div className="op-panel-actions">
          <ManualCreateButton type="team" onSaved={reload} />
          <Link to="/team">View all crew</Link>
        </div>
      </header>
      {rows.length ? rows.map((w, i) => (
        <div className="op-crew-row" key={w.id || w._id || i}>
          <i>{(titleOf(w, "W")[0] || "W").toUpperCase()}</i>
          <strong>{titleOf(w, `Worker ${i + 1}`)}</strong>
          <span className={statusOf(w, "active").toLowerCase().replace(" ", "-")}>● {statusOf(w, "active")}</span>
          <small>⌖ {w.region || w.location || w.suburb || "Region not set"}</small>
        </div>
      )) : <div className="op-empty">No crew added</div>}
      <footer>{team.length} crew members</footer>
    </section>
  );
}

function Cashflow({ invoices }) {
  const invoiced = invoices.reduce((sum, x) => sum + Number(x.total || x.amount || 0), 0);
  const received = invoices.filter((x) => String(statusOf(x,"")).toLowerCase().includes("paid")).reduce((sum, x) => sum + Number(x.total || x.amount || 0), 0);
  const outstanding = Math.max(invoiced - received, 0);
  return (
    <section className="op-panel op-cash">
      <header><h3>CASHFLOW OVERVIEW</h3><Link to="/invoices">Live</Link></header>
      <div className="op-cash-grid">
        <div className="op-donut" />
        <div>
          <strong>{money({ total: received }) || "$0"}</strong>
          <span>Received payments</span>
          <p><i className="blue" /> Invoiced {money({ total: invoiced }) || "$0"}</p>
          <p><i className="green" /> Received {money({ total: received }) || "$0"}</p>
          <p><i className="orange" /> Outstanding {money({ total: outstanding }) || "$0"}</p>
        </div>
      </div>
    </section>
  );
}

function Schedule({ jobs }) {
  const rows = jobs.filter((j) => !["completed","done","cancelled"].includes(statusSlug(j))).slice(0, 6);
  return (
    <section className="op-panel">
      <header><h3>TODAY'S SCHEDULE <b>{rows.length}</b></h3><Link to="/jobs">View full schedule</Link></header>
      {!rows.length ? <div className="op-empty">No jobs scheduled</div> : rows.map((r, idx) => (
        <div className="op-schedule-row" key={r.id || r._id || idx}>
          <span>▦ {r.scheduled_time || r.start_time || "Time TBD"}</span>
          <strong>{titleOf(r, `Job ${idx+1}`)}<small>{r.assigned_worker_name || r.worker_name || "Unassigned"}</small></strong>
          <em>⌖ {r.address || r.site_address || r.region || "Location TBD"}</em>
        </div>
      ))}
    </section>
  );
}

function QuotePipeline({ quotes }) {
  const open = quotes.filter((q) => ["open","sent","pending","waiting","draft"].includes(statusSlug(q)));
  return (
    <section className="op-pipeline">
      <h3>QUOTE PIPELINE <b>{open.length}</b></h3>
      {!open.length ? <div className="op-empty">No quote follow-ups</div> : open.slice(0, 5).map((q, i) => (
        <article key={q.id || q._id || i}><span>{statusOf(q, "open")}</span><strong>{titleOf(q, `Quote ${i+1}`)}</strong><small>{money(q) || "Amount needs review"}</small></article>
      ))}
    </section>
  );
}

function LiveActivity({ history }) {
  return (
    <section className="op-panel op-activity">
      <header><h3>LIVE ACTIVITY</h3><Link to="/dashboard">View all activity</Link></header>
      {!history.length ? <div className="op-empty">No activity yet</div> : history.map((h) => (
        <div className="op-activity-row" key={h.id}><i>✓</i><span>{h.title}</span><small>{new Date(h.created_at).toLocaleString()}</small></div>
      ))}
    </section>
  );
}

function DataPanel({ title, items, type, reload }) {
  const list = items.length ? items.slice(0, 6) : [];
  const target = type === "jobs" ? "/jobs" : type === "invoices" ? "/invoices" : type === "quotes" ? "/quotes" : type === "clients" ? "/clients" : "/dashboard";
  return (
    <section className="op-panel op-data">
      <header>
        <h3>{title} <b>{list.length}</b></h3>
        <div className="op-panel-actions">
          {MANUAL_CREATE_CONFIG[type] ? <ManualCreateButton type={type} onSaved={reload} /> : null}
          <Link to={target}>View all {type}</Link>
        </div>
      </header>
      {!list.length ? <div className="op-empty">{type === "jobs" ? "No jobs scheduled" : type === "invoices" ? "No invoices yet" : type === "quotes" ? "No quote follow-ups" : "No data yet"}</div> : null}
      {list.map((item, index) => (
        <div className="op-data-row" key={item?.id || item?._id || index}>
          <div>
            <strong>{titleOf(item, `${type} ${index + 1}`)}</strong>
            <small>{[item.client_name || item.customer_name, item.address || item.site_address, money(item)].filter(Boolean).join(" · ")}</small>
          </div>
          <span>{statusOf(item, type === "invoices" ? "draft" : "assigned")}</span>
        </div>
      ))}
    </section>
  );
}


function actionTarget(action) {
  const label = String(action?.label || action?.title || "").toLowerCase();

  if (label.includes("dispatch") || label.includes("assign") || label.includes("job")) return "/jobs";
  if (label.includes("cashflow") || label.includes("invoice") || label.includes("payment")) return "/invoices";
  if (label.includes("sales") || label.includes("quote")) return "/quotes";
  if (label.includes("crew")) return "/team";
  return "/dashboard";
}

function readLocalList(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function saveLocalList(key, rows, max = 80) {
  localStorage.setItem(key, JSON.stringify(rows.slice(0, max)));
}

function saveApprovalLog(action, mode, result = "reviewed") {
  try {
    const existing = readLocalList("churvox_operator_approval_log");
    existing.unshift({
      id: `${Date.now()}`,
      mode,
      result,
      label: action?.label || "AI Action",
      title: action?.title || "Prepared action",
      target: actionTarget(action),
      created_at: new Date().toISOString(),
    });
    saveLocalList("churvox_operator_approval_log", existing, 40);
  } catch {}
}

function statusSlug(item) { return statusOf(item, "").toLowerCase().trim(); }
function isUnassigned(job) { return !(job?.assigned_worker_id || job?.worker_id || job?.assigned_to); }
function isActiveWorker(worker) { return ["active", "available", "on_site", "busy"].includes(String(worker?.status || "active").toLowerCase()); }

function chooseDispatchCandidate(jobs, team) {
  const unassigned = jobs.filter(isUnassigned).filter((j) => !["completed", "cancelled", "closed", "done"].includes(statusSlug(j)));
  const activeWorkers = team.filter(isActiveWorker);
  if (!unassigned.length || !activeWorkers.length) return { job: unassigned[0], worker: activeWorkers[0], reason: "No eligible dispatch records found." };
  const job = unassigned[0];
  const assignedCount = new Map();
  jobs.forEach((j) => {
    const key = String(j.assigned_worker_id || j.worker_id || j.assigned_to || "");
    if (key) assignedCount.set(key, (assignedCount.get(key) || 0) + 1);
  });
  const jobRegion = String(job.region || job.location || job.suburb || "").toLowerCase();
  const sorted = [...activeWorkers].sort((a, b) => {
    const aMatch = jobRegion && String(a.region || a.location || a.suburb || "").toLowerCase() === jobRegion ? 1 : 0;
    const bMatch = jobRegion && String(b.region || b.location || b.suburb || "").toLowerCase() === jobRegion ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    const aCount = assignedCount.get(String(a.id || a._id || "")) || 0;
    const bCount = assignedCount.get(String(b.id || b._id || "")) || 0;
    return aCount - bCount;
  });
  const worker = sorted[0] || activeWorkers[0];
  return { job, worker, reason: "Worker selected using active status, regional match, and lowest assigned load." };
}

function buildActionPreview(action, data) {
  const label = String(action?.label || "").toLowerCase();
  if (label.includes("dispatch")) {
    const pick = chooseDispatchCandidate(data.jobs, data.team);
    return { records: pick.job && pick.worker ? [pick.job, pick.worker] : [], reason: pick.reason, pick };
  }
  if (label.includes("cashflow")) {
    const invoices = data.invoices.filter((x) => ["open", "unpaid", "draft", "sent", "overdue"].includes(statusSlug(x))).filter((x) => !["paid", "void", "cancelled"].includes(statusSlug(x))).slice(0, 20);
    return { records: invoices, reason: "Prepared reminder drafts only for open invoices." };
  }
  if (label.includes("sales")) {
    const quotes = data.quotes.filter((x) => ["open", "sent", "pending", "waiting", "draft"].includes(statusSlug(x))).filter((x) => !["accepted", "declined", "converted"].includes(statusSlug(x))).slice(0, 20);
    return { records: quotes, reason: "Prepared follow-up drafts only for quotes awaiting response." };
  }
  if (label.includes("invoice")) {
    const invoicedIds = new Set(data.invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
    const jobs = data.jobs.filter((j) => ["completed", "done", "closed"].includes(statusSlug(j))).filter((j) => !invoicedIds.has(String(j.id || j._id || ""))).slice(0, 10);
    return { records: jobs, reason: "Completed jobs without invoice detected for draft invoice preparation." };
  }
  return { records: [], reason: "Owner review required." };
}

function ActionModal({ modal, onClose, onConfirm, busy }) {
  if (!modal) return null;
  const { action = {}, mode = "review", preview = {} } = modal;
  const target = actionTarget(action);
  return (<div className="op-modal-backdrop" role="presentation" onClick={!busy ? onClose : undefined}>
    <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
      <div className="op-modal-glow" />
      <header><p>{mode === "approve" ? "APPROVE AI MOVE" : "REVIEW AI MOVE"}</p><button type="button" onClick={onClose} disabled={busy}>×</button></header>
      <div className="op-modal-body">
        <span>{action.label || "AI OPERATOR"}</span><h2>{action.title || "Prepared action"}</h2><p>{action.text || "Churvox has prepared this move for your approval."}</p>
        <div className="op-modal-reason"><strong>AI reasoning</strong><small>{preview.reason || action.why || "Based on live data and approval-first policy."}</small></div>
        <div className="op-modal-reason"><strong>Owner approval required</strong><small>No customer messages, invoice sends, charges or payroll actions will run automatically.</small></div>
        <div className="op-modal-records">{(preview.records || []).slice(0, 6).map((item, idx)=><div key={item.id || item._id || idx}><b>{titleOf(item, `Record ${idx+1}`)}</b><small>{statusOf(item, "ready")} · {money(item) || item.address || item.region || item.email || ""}</small></div>)}</div>
        <div className="op-modal-route"><b>Review workspace</b><em>{target}</em></div>
      </div>
      <footer>
        <button type="button" className="op-modal-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="op-modal-secondary" onClick={() => onConfirm("review")} disabled={busy}>Review workspace</button>
        <button type="button" className="op-modal-primary" onClick={() => onConfirm("approve")} disabled={busy}>{busy ? "Working..." : "Approve action"}</button>
      </footer>
    </section></div>);
}



function recommendWorkerForJob(job, jobs, team) {
  const activeWorkers = team.filter(isActiveWorker);
  if (!activeWorkers.length) return { worker: null, reason: "No active workers available yet." };

  const assignedCount = new Map();
  jobs.forEach((j) => {
    const key = String(j.assigned_worker_id || j.worker_id || j.assigned_to || "");
    if (key) assignedCount.set(key, (assignedCount.get(key) || 0) + 1);
  });

  const jobRegion = String(job.region || job.location || job.suburb || job.address || "").toLowerCase();

  const sorted = [...activeWorkers].sort((a, b) => {
    const aArea = String(a.region || a.location || a.suburb || "").toLowerCase();
    const bArea = String(b.region || b.location || b.suburb || "").toLowerCase();

    const aMatch = jobRegion && aArea && jobRegion.includes(aArea) ? 1 : 0;
    const bMatch = jobRegion && bArea && jobRegion.includes(bArea) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;

    const aCount = assignedCount.get(String(a.id || a._id || "")) || 0;
    const bCount = assignedCount.get(String(b.id || b._id || "")) || 0;
    if (aCount !== bCount) return aCount - bCount;

    return titleOf(a, "").localeCompare(titleOf(b, ""));
  });

  const worker = sorted[0];
  const load = assignedCount.get(String(worker.id || worker._id || "")) || 0;
  const regionText = worker.region || worker.location || worker.suburb ? "area match checked" : "no worker region set";
  return {
    worker,
    reason: `Recommended from active workers using ${regionText} and current workload (${load} assigned).`,
  };
}

function hasScheduleConflict(worker, job, jobs) {
  const workerId = String(worker?.id || worker?._id || "");
  if (!workerId) return false;

  const jobDate = String(job?.scheduled_date || job?.date || "").slice(0, 10);
  const jobTime = String(job?.scheduled_time || job?.start_time || "");
  if (!jobDate && !jobTime) return false;

  return jobs.some((j) => {
    if (String(j.id || j._id || "") === String(job.id || job._id || "")) return false;
    const assigned = String(j.assigned_worker_id || j.worker_id || j.assigned_to || "");
    if (assigned !== workerId) return false;
    const otherDate = String(j.scheduled_date || j.date || "").slice(0, 10);
    const otherTime = String(j.scheduled_time || j.start_time || "");
    return (jobDate && otherDate && jobDate === otherDate) && (!jobTime || !otherTime || jobTime === otherTime);
  });
}

function DispatchBoard({ jobs, team, reload }) {
  const [selected, setSelected] = useState(null);
  const [workerId, setWorkerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const unassigned = jobs
    .filter(isUnassigned)
    .filter((j) => !["completed", "cancelled", "closed", "done"].includes(statusSlug(j)))
    .slice(0, 12);

  function openAssign(job) {
    const pick = recommendWorkerForJob(job, jobs, team);
    setSelected({ job, pick });
    setWorkerId(String(pick.worker?.id || pick.worker?._id || ""));
    setNotice("");
  }

  async function approveAssignment() {
    if (!selected?.job || !workerId || busy) return;

    const job = selected.job;
    const worker = team.find((w) => String(w.id || w._id || "") === String(workerId));
    const jobId = job.id || job._id;

    setBusy(true);
    setNotice("");

    const payloads = [
      { worker_id: workerId, assigned_worker_id: workerId, assigned_worker_name: titleOf(worker, "Worker") },
      { assigned_worker_id: workerId, assigned_worker_name: titleOf(worker, "Worker") },
      { worker_id: workerId, worker_name: titleOf(worker, "Worker") },
    ];

    const calls = [
      () => api(`/jobs/${jobId}/assign`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}/assign-worker`, { method: "POST", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PATCH", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PUT", body: payloads[2] }),
    ];

    let ok = false;
    for (const fn of calls) {
      try {
        await fn();
        ok = true;
        break;
      } catch {}
    }

    if (ok) {
      setNotice("Worker assigned successfully.");
      setSelected(null);
      await reload?.();
    } else {
      setNotice("Backend did not accept assignment yet. Review job assignment endpoint wiring.");
    }

    setBusy(false);
  }

  return (
    <section className="op-dispatch">
      <header>
        <div>
          <p>AI DISPATCH BOARD</p>
          <h2>Unassigned work, matched to your crew.</h2>
          <span>{unassigned.length} unassigned {unassigned.length === 1 ? "job" : "jobs"} · {team.length} crew members</span>
        </div>
        <Link to="/jobs">Open jobs workspace</Link>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      {!unassigned.length ? (
        <div className="op-approval-empty">
          <strong>No dispatch needed right now.</strong>
          <span>When jobs are created without workers, Churvox will show them here with an AI worker recommendation.</span>
        </div>
      ) : (
        <div className="op-dispatch-grid">
          {unassigned.map((job, index) => {
            const pick = recommendWorkerForJob(job, jobs, team);
            const conflict = pick.worker ? hasScheduleConflict(pick.worker, job, jobs) : false;

            return (
              <article className="op-dispatch-card" key={job.id || job._id || index}>
                <div>
                  <span>{statusOf(job, "unassigned")}</span>
                  <strong>{titleOf(job, `Job ${index + 1}`)}</strong>
                  <small>{[job.client_name || job.customer_name, job.address || job.site_address || job.region, job.scheduled_time || "Time TBD"].filter(Boolean).join(" · ")}</small>
                </div>

                <section>
                  <b>AI recommends</b>
                  <strong>{pick.worker ? titleOf(pick.worker, "Worker") : "Add a worker first"}</strong>
                  <small>{pick.reason}</small>
                  {conflict ? <em>Schedule conflict warning</em> : null}
                </section>

                <button type="button" onClick={() => openAssign(job)} disabled={!team.length}>
                  Assign worker
                </button>
              </article>
            );
          })}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={!busy ? () => setSelected(null) : undefined}>
          <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>APPROVE DISPATCH</p>
              <button type="button" onClick={() => setSelected(null)} disabled={busy}>×</button>
            </header>

            <div className="op-modal-body">
              <span>WORKER MATCH</span>
              <h2>{titleOf(selected.job, "Unassigned job")}</h2>
              <p>{selected.pick.reason}</p>

              <div className="op-modal-reason">
                <strong>Job</strong>
                <small>{[selected.job.client_name || selected.job.customer_name, selected.job.address || selected.job.site_address, selected.job.scheduled_time || "Time TBD"].filter(Boolean).join(" · ")}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Choose worker</strong>
                <select className="op-select" value={workerId} onChange={(event) => setWorkerId(event.target.value)}>
                  <option value="">Select worker</option>
                  {team.map((worker) => (
                    <option key={worker.id || worker._id || worker.email} value={worker.id || worker._id}>
                      {titleOf(worker, "Worker")} · {worker.region || worker.location || worker.suburb || "No region"}
                    </option>
                  ))}
                </select>
              </div>

              {workerId && hasScheduleConflict(team.find((w) => String(w.id || w._id || "") === String(workerId)), selected.job, jobs) ? (
                <div className="op-modal-reason danger">
                  <strong>Conflict warning</strong>
                  <small>This worker appears to have another job scheduled at the same date/time. Review before approving.</small>
                </div>
              ) : null}
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)} disabled={busy}>Cancel</button>
              <button type="button" className="op-modal-primary" onClick={approveAssignment} disabled={busy || !workerId}>
                {busy ? "Assigning..." : "Approve assignment"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}



function invoiceAmount(invoice) {
  return Number(invoice?.total || invoice?.amount || invoice?.subtotal || invoice?.balance || 0) || 0;
}

function jobAmount(job) {
  return Number(job?.total || job?.amount || job?.price || job?.job_price || job?.subtotal || 0) || 0;
}

function quoteAmount(quote) {
  return Number(quote?.total || quote?.amount || quote?.price || quote?.subtotal || 0) || 0;
}

function isOverdueInvoice(invoice) {
  const status = statusSlug(invoice);
  if (status.includes("overdue")) return true;
  const due = invoice?.due_date || invoice?.due_at || invoice?.payment_due_at;
  if (!due) return false;
  const d = new Date(due);
  return Number.isFinite(d.getTime()) && d.getTime() < Date.now() && !status.includes("paid");
}

function hasUnbilledJobHints(job) {
  const text = [
    job?.worker_notes,
    job?.completion_notes,
    job?.notes,
    job?.materials,
    job?.extras_summary,
    job?.included_work,
    job?.description,
  ].filter(Boolean).join(" ").toLowerCase();

  return (
    text.includes("extra") ||
    text.includes("material") ||
    text.includes("green waste") ||
    text.includes("tip") ||
    text.includes("dump") ||
    text.includes("additional") ||
    Number(job?.extra_time_minutes || job?.additional_minutes || 0) > 0 ||
    (Array.isArray(job?.extras) && job.extras.length > 0)
  );
}

function buildMoneyRadarItems({ jobs = [], invoices = [], quotes = [] }) {
  const items = [];
  const invoicedJobIds = new Set(
    invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean)
  );

  const completedNoInvoice = jobs
    .filter((j) => ["completed", "done", "closed"].includes(statusSlug(j)))
    .filter((j) => !invoicedJobIds.has(String(j.id || j._id || "")));

  completedNoInvoice.forEach((job) => {
    items.push({
      type: "completed_not_invoiced",
      tone: "green",
      title: "Completed job not invoiced",
      recordTitle: titleOf(job, "Completed job"),
      amount: jobAmount(job),
      reason: "Work is marked complete but no linked invoice was found.",
      action: "Prepare invoice draft",
      target: "/invoices",
      source: job,
    });
  });

  invoices.filter(isOverdueInvoice).forEach((invoice) => {
    items.push({
      type: "overdue_invoice",
      tone: "amber",
      title: "Overdue invoice needs follow-up",
      recordTitle: titleOf(invoice, "Invoice"),
      amount: invoiceAmount(invoice),
      reason: "Invoice appears overdue or past its due date.",
      action: "Prepare payment reminder",
      target: "/invoices",
      source: invoice,
    });
  });

  invoices.filter((invoice) => statusSlug(invoice).includes("draft")).forEach((invoice) => {
    items.push({
      type: "draft_invoice",
      tone: "blue",
      title: "Draft invoice not sent",
      recordTitle: titleOf(invoice, "Draft invoice"),
      amount: invoiceAmount(invoice),
      reason: "Invoice is still in draft, so payment cannot be collected yet.",
      action: "Review draft invoice",
      target: "/invoices",
      source: invoice,
    });
  });

  quotes
    .filter((quote) => ["open", "sent", "pending", "waiting", "draft"].includes(statusSlug(quote)))
    .forEach((quote) => {
      items.push({
        type: "quote_followup",
        tone: "purple",
        title: "Quote awaiting follow-up",
        recordTitle: titleOf(quote, "Open quote"),
        amount: quoteAmount(quote),
        reason: "Quote has not been accepted, declined or converted yet.",
        action: "Prepare quote follow-up",
        target: "/quotes",
        source: quote,
      });
    });

  jobs
    .filter((job) => !["cancelled", "closed"].includes(statusSlug(job)))
    .filter(hasUnbilledJobHints)
    .forEach((job) => {
      items.push({
        type: "possible_unbilled_extras",
        tone: "red",
        title: "Possible unbilled extras",
        recordTitle: titleOf(job, "Job with extras"),
        amount: jobAmount(job),
        reason: "Job notes mention extras, materials or additional time. Owner review recommended.",
        action: "Review job pricing",
        target: "/jobs",
        source: job,
      });
    });

  return items.slice(0, 12);
}

function MoneyRadar({ jobs = [], invoices = [], quotes = [] }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const items = buildMoneyRadarItems({ jobs, invoices, quotes });
  const totalKnown = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function saveRadarDraft(item) {
    const drafts = readLocalList("churvox_operator_drafts");
    drafts.unshift({
      id: `money-${Date.now()}`,
      type: item.type,
      title: `${item.action}: ${item.recordTitle}`,
      target: item.target,
      created_at: new Date().toISOString(),
      amount: item.amount || 0,
      reason: item.reason,
    });
    saveLocalList("churvox_operator_drafts", drafts);
    setNotice("Money Radar action saved to Operator Drafts for owner review.");
    setSelected(null);
  }

  return (
    <section className="op-money-radar">
      <header>
        <div>
          <p>MONEY RADAR</p>
          <h2>Find missed money before it leaks.</h2>
          <span>{items.length} money {items.length === 1 ? "item" : "items"} found · {money({ total: totalKnown }) || "$0"} known value</span>
        </div>
        <Link to="/invoices">Open billing</Link>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      {!items.length ? (
        <div className="op-approval-empty">
          <strong>No money leaks found right now.</strong>
          <span>Churvox will flag completed jobs without invoices, overdue invoices, draft invoices, quote follow-ups and possible unbilled extras here.</span>
        </div>
      ) : (
        <div className="op-money-grid">
          {items.map((item, index) => (
            <article className={`op-money-card ${item.tone}`} key={`${item.type}-${item.recordTitle}-${index}`}>
              <div>
                <span>{item.title}</span>
                <strong>{item.recordTitle}</strong>
                <small>{item.reason}</small>
              </div>
              <aside>
                <b>{item.amount ? money({ total: item.amount }) : "Needs review"}</b>
                <button type="button" onClick={() => setSelected(item)}>{item.action}</button>
              </aside>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>MONEY RADAR REVIEW</p>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </header>

            <div className="op-modal-body">
              <span>{selected.title}</span>
              <h2>{selected.recordTitle}</h2>
              <p>{selected.reason}</p>

              <div className="op-modal-reason">
                <strong>Known value</strong>
                <small>{selected.amount ? money({ total: selected.amount }) : "Amount needs owner review"}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Owner approval guardrail</strong>
                <small>Churvox will only save this as a review draft. It will not send messages, change prices or invoice customers without owner approval.</small>
              </div>

              <div className="op-modal-route">
                <b>Review workspace</b>
                <em>{selected.target}</em>
              </div>
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button type="button" className="op-modal-primary" onClick={() => saveRadarDraft(selected)}>
                Save review draft
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}



function sameClientRecord(client, record) {
  const clientIds = [
    client?.id,
    client?._id,
    client?.client_id,
    client?.customer_id,
  ].filter(Boolean).map(String);

  const recordIds = [
    record?.client_id,
    record?.customer_id,
    record?.clientId,
    record?.customerId,
  ].filter(Boolean).map(String);

  if (clientIds.length && recordIds.some((id) => clientIds.includes(id))) return true;

  const clientNames = [
    client?.name,
    client?.client_name,
    client?.customer_name,
    client?.business_name,
  ].filter(Boolean).map((x) => String(x).toLowerCase().trim());

  const recordNames = [
    record?.client_name,
    record?.customer_name,
    record?.customer,
    record?.client,
  ].filter(Boolean).map((x) => String(x).toLowerCase().trim());

  return clientNames.length && recordNames.some((name) => clientNames.includes(name));
}

function newestFirst(a, b) {
  const ad = new Date(a?.completed_at || a?.scheduled_date || a?.created_at || a?.updated_at || 0).getTime() || 0;
  const bd = new Date(b?.completed_at || b?.scheduled_date || b?.created_at || b?.updated_at || 0).getTime() || 0;
  return bd - ad;
}

function buildSiteMemory(client, jobs, invoices) {
  const clientJobs = jobs.filter((job) => sameClientRecord(client, job)).sort(newestFirst);
  const clientInvoices = invoices.filter((invoice) => sameClientRecord(client, invoice)).sort(newestFirst);
  const completedJobs = clientJobs.filter((job) => ["completed", "done", "closed"].includes(statusSlug(job)));
  const recurringJobs = clientJobs.filter((job) => job.is_recurring || job.recurring || job.recurrence_pattern);

  const lastJob = clientJobs[0];
  const lastInvoice = clientInvoices[0];
  const knownValues = clientInvoices.map(invoiceAmount).filter((n) => n > 0);
  const avgValue = knownValues.length ? knownValues.reduce((a, b) => a + b, 0) / knownValues.length : 0;

  const notes = [
    client?.notes,
    client?.access_notes,
    client?.site_notes,
    client?.gate_code ? `Gate/access: ${client.gate_code}` : "",
    client?.parking_notes ? `Parking: ${client.parking_notes}` : "",
    client?.hazards ? `Hazards: ${client.hazards}` : "",
    lastJob?.notes,
    lastJob?.worker_notes,
    lastJob?.completion_notes,
  ].filter(Boolean);

  const preferredWorker =
    client?.preferred_worker_name ||
    lastJob?.assigned_worker_name ||
    lastJob?.worker_name ||
    "";

  const siteAddress =
    client?.address ||
    client?.site_address ||
    lastJob?.address ||
    lastJob?.site_address ||
    "Address not set";

  let nextAction = "No action needed right now.";
  if (recurringJobs.length && !clientJobs.some((j) => !["completed", "cancelled", "closed", "done"].includes(statusSlug(j)))) {
    nextAction = "Recurring pattern found but no active future job is obvious. Consider rebooking.";
  } else if (completedJobs.length && !clientInvoices.length) {
    nextAction = "Completed work exists but no invoice was found. Review billing.";
  } else if (!clientJobs.length) {
    nextAction = "No job history yet. First visit notes should be captured carefully.";
  } else if (lastJob && statusSlug(lastJob).includes("completed")) {
    nextAction = "Last job is complete. Check proof, invoice and follow-up status.";
  }

  return {
    client,
    jobs: clientJobs,
    invoices: clientInvoices,
    completedJobs,
    recurringJobs,
    lastJob,
    lastInvoice,
    avgValue,
    notes,
    preferredWorker,
    siteAddress,
    nextAction,
  };
}

function PropertyBrain({ clients = [], jobs = [], invoices = [] }) {
  const [selected, setSelected] = useState(null);

  const memories = clients
    .map((client) => buildSiteMemory(client, jobs, invoices))
    .sort((a, b) => (b.jobs.length + b.invoices.length) - (a.jobs.length + a.invoices.length))
    .slice(0, 8);

  return (
    <section className="op-property-brain">
      <header>
        <div>
          <p>PROPERTY BRAIN</p>
          <h2>Every site remembers the work.</h2>
          <span>{clients.length} clients · {jobs.length} jobs · site history built from live records</span>
        </div>
        <Link to="/clients">Open clients</Link>
      </header>

      {!memories.length ? (
        <div className="op-approval-empty">
          <strong>No site memory yet.</strong>
          <span>Add clients and complete jobs, then Churvox will build access notes, job history, pricing memory and rebooking hints here.</span>
        </div>
      ) : (
        <div className="op-property-grid">
          {memories.map((memory, index) => (
            <article className="op-property-card" key={memory.client.id || memory.client._id || index}>
              <div>
                <span>SITE MEMORY</span>
                <strong>{titleOf(memory.client, `Client ${index + 1}`)}</strong>
                <small>{memory.siteAddress}</small>
              </div>

              <section>
                <b>AI site memory</b>
                <p>{memory.nextAction}</p>
              </section>

              <footer>
                <small>{memory.jobs.length} jobs · {memory.invoices.length} invoices · {memory.avgValue ? money({ total: memory.avgValue }) + " avg" : "No invoice average yet"}</small>
                <button type="button" onClick={() => setSelected(memory)}>Open brain</button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="op-modal op-property-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>PROPERTY BRAIN</p>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </header>

            <div className="op-modal-body">
              <span>SITE MEMORY</span>
              <h2>{titleOf(selected.client, "Client site")}</h2>
              <p>{selected.nextAction}</p>

              <div className="op-property-detail-grid">
                <div><b>Address</b><small>{selected.siteAddress}</small></div>
                <div><b>Preferred worker</b><small>{selected.preferredWorker || "Not learned yet"}</small></div>
                <div><b>Total jobs</b><small>{selected.jobs.length}</small></div>
                <div><b>Completed jobs</b><small>{selected.completedJobs.length}</small></div>
                <div><b>Last invoice</b><small>{selected.lastInvoice ? `${titleOf(selected.lastInvoice, "Invoice")} · ${money({ total: invoiceAmount(selected.lastInvoice) }) || "Amount needs review"}` : "No invoice found"}</small></div>
                <div><b>Average invoice</b><small>{selected.avgValue ? money({ total: selected.avgValue }) : "Not enough invoice data"}</small></div>
              </div>

              <div className="op-modal-reason">
                <strong>Access / site notes</strong>
                {selected.notes.length ? (
                  <ul className="op-property-notes">
                    {selected.notes.slice(0, 8).map((note, index) => <li key={index}>{note}</li>)}
                  </ul>
                ) : (
                  <small>No access, hazard or parking notes captured yet.</small>
                )}
              </div>

              <div className="op-modal-reason">
                <strong>Recent job history</strong>
                {selected.jobs.length ? (
                  <div className="op-property-history">
                    {selected.jobs.slice(0, 6).map((job, index) => (
                      <div key={job.id || job._id || index}>
                        <b>{titleOf(job, `Job ${index + 1}`)}</b>
                        <small>{[
                          statusOf(job, "active"),
                          job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : "",
                          job.assigned_worker_name || job.worker_name || "",
                          money(job),
                        ].filter(Boolean).join(" · ")}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <small>No jobs recorded for this client yet.</small>
                )}
              </div>

              <div className="op-modal-reason">
                <strong>Owner guardrail</strong>
                <small>Property Brain only summarizes live Churvox records. It does not change prices, rebook jobs or message customers without owner approval.</small>
              </div>
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="op-modal-primary" onClick={() => setSelected(null)}>Done</button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}



function parseAdminNote(rawText, jobs = []) {
  const text = String(rawText || "").trim();
  const lower = text.toLowerCase();

  const matchedJob = jobs.find((job) => {
    const title = String(titleOf(job, "")).toLowerCase();
    const client = String(job.client_name || job.customer_name || "").toLowerCase();
    const address = String(job.address || job.site_address || "").toLowerCase();
    return (
      (title && lower.includes(title)) ||
      (client && lower.includes(client)) ||
      (address && lower.includes(address))
    );
  });

  const minutesMatch =
    lower.match(/extra\s+(\d+)\s*(min|mins|minute|minutes)/) ||
    lower.match(/additional\s+(\d+)\s*(min|mins|minute|minutes)/) ||
    lower.match(/(\d+)\s*(min|mins|minute|minutes)\s+extra/);

  const hoursMatch =
    lower.match(/extra\s+(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)/) ||
    lower.match(/additional\s+(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs)/);

  const extraMinutes = minutesMatch ? Number(minutesMatch[1]) : hoursMatch ? Math.round(Number(hoursMatch[1]) * 60) : 0;

  const hasGreenWaste = lower.includes("green waste") || lower.includes("rubbish") || lower.includes("dump") || lower.includes("tip");
  const hasMaterials = lower.includes("material") || lower.includes("parts") || lower.includes("supplies");
  const hasPhoto = lower.includes("photo") || lower.includes("photos") || lower.includes("picture");
  const hasComplete = lower.includes("finished") || lower.includes("complete") || lower.includes("completed") || lower.includes("done");
  const hasInvoice = lower.includes("invoice") || lower.includes("bill") || lower.includes("charge") || lower.includes("add to");

  const bullets = [];
  if (hasComplete) bullets.push("Mark/review job as completed");
  if (extraMinutes) bullets.push(`Review extra time: ${extraMinutes} minutes`);
  if (hasGreenWaste) bullets.push("Review green waste / disposal charge");
  if (hasMaterials) bullets.push("Review materials or parts used");
  if (hasPhoto) bullets.push("Check attached proof photos");
  if (hasInvoice) bullets.push("Prepare invoice description / possible extra charge");

  const invoiceDescription = [
    matchedJob ? `Work completed for ${titleOf(matchedJob, "job")}.` : "Work completed for client.",
    text,
    extraMinutes ? `Additional time noted: ${extraMinutes} minutes.` : "",
    hasGreenWaste ? "Green waste/disposal was mentioned and should be reviewed for billing." : "",
    hasMaterials ? "Materials/parts were mentioned and should be reviewed for billing." : "",
  ].filter(Boolean).join(" ");

  return {
    original: text,
    matchedJob,
    job_id: matchedJob?.id || matchedJob?._id || "",
    title: matchedJob ? `Admin draft for ${titleOf(matchedJob, "job")}` : "Admin draft from note",
    summary: bullets.length ? bullets.join(" · ") : "General admin note captured for review.",
    bullets,
    extraMinutes,
    invoiceDescription,
    needsInvoiceReview: hasInvoice || extraMinutes > 0 || hasGreenWaste || hasMaterials,
    needsProofReview: hasPhoto,
    needsCompletionReview: hasComplete,
  };
}

function NoteToAdmin({ jobs = [] }) {
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState("");

  function prepareDraft() {
    setNotice("");
    if (!note.trim()) {
      setNotice("Add a job/admin note first.");
      return;
    }
    setDraft(parseAdminNote(note, jobs));
  }

  function saveDraft() {
    if (!draft) return;

    const drafts = readLocalList("churvox_operator_drafts");
    drafts.unshift({
      id: `note-${Date.now()}`,
      type: "ai_note_to_admin",
      title: draft.title,
      target: draft.job_id ? "/jobs" : "/dashboard",
      created_at: new Date().toISOString(),
      job_id: draft.job_id,
      original_note: draft.original,
      summary: draft.summary,
      invoice_description: draft.invoiceDescription,
      extra_minutes: draft.extraMinutes,
      needs_invoice_review: draft.needsInvoiceReview,
      needs_proof_review: draft.needsProofReview,
      needs_completion_review: draft.needsCompletionReview,
    });
    saveLocalList("churvox_operator_drafts", drafts);
    setNotice("Structured admin draft saved to Operator Drafts.");
    setNote("");
    setDraft(null);
  }

  return (
    <section className="op-note-admin">
      <header>
        <div>
          <p>AI NOTE TO ADMIN</p>
          <h2>Turn messy notes into admin drafts.</h2>
          <span>Paste owner or worker notes. Churvox prepares structured follow-up without changing records automatically.</span>
        </div>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      <div className="op-note-admin-grid">
        <div className="op-note-input-card">
          <label>Paste note / voice dictation</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Example: Finished hedge job, extra 30 mins, green waste removed, add to invoice."
          />
          <button type="button" onClick={prepareDraft}>Prepare admin draft</button>
        </div>

        <div className="op-note-result-card">
          {!draft ? (
            <div className="op-approval-empty">
              <strong>No draft prepared yet.</strong>
              <span>Churvox will identify job match, extra time, materials, proof notes and invoice wording.</span>
            </div>
          ) : (
            <>
              <span>PREPARED DRAFT</span>
              <h3>{draft.title}</h3>
              <p>{draft.summary}</p>

              <div className="op-note-result-list">
                <div><b>Matched job</b><small>{draft.matchedJob ? titleOf(draft.matchedJob, "Job") : "No clear job match"}</small></div>
                <div><b>Extra time</b><small>{draft.extraMinutes ? `${draft.extraMinutes} minutes` : "None detected"}</small></div>
                <div><b>Invoice review</b><small>{draft.needsInvoiceReview ? "Recommended" : "Not detected"}</small></div>
                <div><b>Proof review</b><small>{draft.needsProofReview ? "Recommended" : "Not detected"}</small></div>
              </div>

              <div className="op-modal-reason">
                <strong>Draft invoice wording</strong>
                <small>{draft.invoiceDescription}</small>
              </div>

              <button type="button" onClick={saveDraft}>Save to Operator Drafts</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}



function PublicBookingPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    service_type: "",
    preferred_date: "",
    preferred_time: "",
    notes: "",
  });
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setNotice("");

    if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
      setNotice("Please add your name, phone and job address.");
      return;
    }

    setBusy(true);

    const payload = {
      ...form,
      source: "public_booking",
      status: "new",
      created_at: new Date().toISOString(),
    };

    let ok = false;
    for (const path of ["/public/enquiry", "/enquiries/public", "/enquiries"]) {
      try {
        await api(path, { method: "POST", body: payload });
        ok = true;
        break;
      } catch {}
    }

    if (!ok) {
      const existing = readLocalList("churvox_public_enquiries");
      existing.unshift({ id: `lead-${Date.now()}`, ...payload });
      saveLocalList("churvox_public_enquiries", existing, 80);
    }

    setNotice("Thanks — your request has been captured. The business can review it and come back to you.");
    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      service_type: "",
      preferred_date: "",
      preferred_time: "",
      notes: "",
    });
    setBusy(false);
  }

  return (
    <div className="op-booking-page">
      <section className="op-booking-shell">
        <div className="op-booking-hero">
          <div className="op-logo">
            <img className="op-logo-img" src="/brand/churvox-holo-c.svg" alt="Churvox" />
            <div>
              <strong>CHURVOX</strong>
              <small>REQUEST WORK</small>
            </div>
          </div>
          <p>BOOKING REQUEST</p>
          <h1>Tell us what needs doing.</h1>
          <span>Your request goes into the Churvox AI Operator queue so the business can review, quote or schedule it.</span>
        </div>

        <form className="op-booking-form" onSubmit={submit}>
          {notice ? <div className="op-warning">{notice}</div> : null}

          <div className="op-booking-grid">
            <label>
              Name *
              <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your name" />
            </label>
            <label>
              Phone *
              <input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Best phone number" />
            </label>
            <label>
              Email
              <input value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="Email address" />
            </label>
            <label>
              Service type
              <input value={form.service_type} onChange={(event) => update("service_type", event.target.value)} placeholder="Lawn care, cleaning, plumbing..." />
            </label>
            <label className="wide">
              Address *
              <input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Job address" />
            </label>
            <label>
              Preferred date
              <input type="date" value={form.preferred_date} onChange={(event) => update("preferred_date", event.target.value)} />
            </label>
            <label>
              Preferred time
              <input value={form.preferred_time} onChange={(event) => update("preferred_time", event.target.value)} placeholder="Morning, afternoon, 10am..." />
            </label>
            <label className="wide">
              Job notes
              <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Describe the job, access notes, photos needed, timing, anything important." />
            </label>
          </div>

          <button type="submit" disabled={busy}>
            {busy ? "Sending..." : "Send request"}
          </button>
        </form>
      </section>
    </div>
  );
}

function buildLeadSuggestion(lead) {
  const service = lead.service_type || "service work";
  const when = [lead.preferred_date, lead.preferred_time].filter(Boolean).join(" ");
  return [
    `Create a ${service} job request for ${lead.name || "new customer"}.`,
    lead.address ? `Site: ${lead.address}.` : "",
    when ? `Preferred time: ${when}.` : "",
    lead.notes ? `Notes: ${lead.notes}` : "",
  ].filter(Boolean).join(" ");
}


function buildReceptionistReply(lead) {
  const service = lead.service_type || "the work";
  const name = lead.name || "there";
  const when = [lead.preferred_date, lead.preferred_time].filter(Boolean).join(" ");
  return [
    `Hi ${name}, thanks for getting in touch about ${service}.`,
    lead.address ? `I have the job address as ${lead.address}.` : "",
    when ? `I can see your preferred time is ${when}.` : "",
    "We’ll review the details and come back to you with the next step.",
    "Thanks.",
  ].filter(Boolean).join(" ");
}

function ManualLeadCapture({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    service_type: "",
    notes: "",
    source: "missed_call",
  });
  const [notice, setNotice] = useState("");

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function saveLead() {
    setNotice("");

    if (!form.name.trim() && !form.phone.trim()) {
      setNotice("Add at least a name or phone number.");
      return;
    }

    const lead = {
      id: `manual-lead-${Date.now()}`,
      ...form,
      status: "new",
      source: form.source || "manual",
      created_at: new Date().toISOString(),
      ai_reply: buildReceptionistReply(form),
    };

    const rows = readLocalList("churvox_public_enquiries");
    rows.unshift(lead);
    saveLocalList("churvox_public_enquiries", rows);

    setForm({
      name: "",
      phone: "",
      email: "",
      address: "",
      service_type: "",
      notes: "",
      source: "missed_call",
    });
    setOpen(false);
    onSaved?.();
  }

  return (
    <>
      <button type="button" className="op-receptionist-add" onClick={() => setOpen(true)}>
        Add missed lead
      </button>

      {open ? (
        <div className="op-modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>ADD MISSED LEAD</p>
              <button type="button" onClick={() => setOpen(false)}>×</button>
            </header>

            <div className="op-modal-body">
              <span>AI RECEPTIONIST</span>
              <h2>Capture a missed call or manual lead.</h2>
              <p>Churvox will prepare a safe reply and draft next steps for owner approval.</p>

              {notice ? <div className="op-warning">{notice}</div> : null}

              <div className="op-receptionist-form">
                <label>Name<input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Customer name" /></label>
                <label>Phone<input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Phone number" /></label>
                <label>Email<input value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="Email address" /></label>
                <label>Service<input value={form.service_type} onChange={(event) => update("service_type", event.target.value)} placeholder="What do they need?" /></label>
                <label className="wide">Address<input value={form.address} onChange={(event) => update("address", event.target.value)} placeholder="Job address" /></label>
                <label className="wide">Notes<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Example: missed call, wants quote for hedge trim, prefers Friday morning." /></label>
              </div>

              <div className="op-modal-reason">
                <strong>Prepared reply preview</strong>
                <small>{buildReceptionistReply(form)}</small>
              </div>
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setOpen(false)}>Cancel</button>
              <button type="button" className="op-modal-primary" onClick={saveLead}>Save lead</button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}


function LeadInbox({ clients = [], jobs = [] }) {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");

  async function loadLeads() {
    const local = readLocalList("churvox_public_enquiries");
    let remote = [];

    for (const path of ["/enquiries", "/booking-requests", "/leads"]) {
      try {
        const res = await api(path);
        remote = toArray(res, ["enquiries", "leads", "requests"]);
        break;
      } catch {}
    }

    const all = [...remote, ...local];
    const seen = new Set();
    const unique = all.filter((lead) => {
      const key = String(lead.id || lead._id || `${lead.name}-${lead.phone}-${lead.created_at}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setLeads(unique.slice(0, 20));
  }

  useEffect(() => {
    loadLeads();
  }, []);

  function saveLeadDraft(lead, type) {
    const drafts = readLocalList("churvox_operator_drafts");
    drafts.unshift({
      id: `lead-draft-${Date.now()}`,
      type,
      title: `${type === "quote" ? "Quote" : type === "job" ? "Job" : "Client"} draft for ${lead.name || "new lead"}`,
      target: type === "quote" ? "/quotes" : type === "job" ? "/jobs" : "/clients",
      created_at: new Date().toISOString(),
      lead,
      suggestion: buildLeadSuggestion(lead),
    });
    saveLocalList("churvox_operator_drafts", drafts);
    setNotice(`Saved ${type} draft to Operator Drafts.`);
    setSelected(null);
  }

  return (
    <section className="op-lead-inbox">
      <header>
        <div>
          <p>AI RECEPTIONIST</p>
          <h2>New requests ready for review.</h2>
          <span>{leads.length} lead {leads.length === 1 ? "request" : "requests"} captured from booking/enquiry flow</span>
        </div>
        <div className="op-lead-actions"><ManualLeadCapture onSaved={loadLeads} /><Link to="/book">Open public booking</Link></div>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      {!leads.length ? (
        <div className="op-approval-empty">
          <strong>No new requests yet.</strong>
          <span>Share the /book link with customers. New enquiries will appear here for owner review.</span>
        </div>
      ) : (
        <div className="op-lead-grid">
          {leads.map((lead, index) => (
            <article className="op-lead-card" key={lead.id || lead._id || index}>
              <div>
                <span>NEW REQUEST</span>
                <strong>{lead.name || `Lead ${index + 1}`}</strong>
                <small>{[lead.service_type, lead.phone, lead.address].filter(Boolean).join(" · ")}</small>
              </div>

              <section>
                <b>AI suggestion</b>
                <p>{buildLeadSuggestion(lead)}</p>
              </section>

              <footer>
                <small>{lead.created_at ? new Date(lead.created_at).toLocaleString() : "Captured recently"}</small>
                <button type="button" onClick={() => setSelected(lead)}>Review lead</button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div className="op-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
          <section className="op-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="op-modal-glow" />
            <header>
              <p>LEAD REVIEW</p>
              <button type="button" onClick={() => setSelected(null)}>×</button>
            </header>

            <div className="op-modal-body">
              <span>AI RECEPTIONIST</span>
              <h2>{selected.name || "New lead"}</h2>
              <p>{buildLeadSuggestion(selected)}</p>

              <div className="op-property-detail-grid">
                <div><b>Phone</b><small>{selected.phone || "Not provided"}</small></div>
                <div><b>Email</b><small>{selected.email || "Not provided"}</small></div>
                <div><b>Address</b><small>{selected.address || "Not provided"}</small></div>
                <div><b>Service</b><small>{selected.service_type || "Not specified"}</small></div>
                <div><b>Preferred date</b><small>{selected.preferred_date || "Flexible"}</small></div>
                <div><b>Preferred time</b><small>{selected.preferred_time || "Flexible"}</small></div>
              </div>

              <div className="op-modal-reason">
                <strong>Customer notes</strong>
                <small>{selected.notes || "No extra notes provided."}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Prepared customer reply</strong>
                <small>{selected.ai_reply || buildReceptionistReply(selected)}</small>
              </div>

              <div className="op-modal-reason">
                <strong>Owner approval guardrail</strong>
                <small>Churvox will save a draft only. It will not message the customer or create final records without owner review.</small>
              </div>
            </div>

            <footer>
              <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)}>Cancel</button>
              <button type="button" className="op-modal-secondary" onClick={() => saveLeadDraft(selected, "client")}>Client draft</button>
              <button type="button" className="op-modal-secondary" onClick={() => saveLeadDraft(selected, "quote")}>Quote draft</button>
              <button type="button" className="op-modal-primary" onClick={() => saveLeadDraft(selected, "job")}>Job draft</button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}



function buildQuoteSuggestion(client, jobs = [], quotes = []) {
  const memory = client ? buildSiteMemory(client, jobs, []) : null;
  const clientJobs = client ? jobs.filter((job) => sameClientRecord(client, job)).sort(newestFirst) : [];
  const clientQuotes = client ? quotes.filter((quote) => sameClientRecord(client, quote)).sort(newestFirst) : [];

  const lastJob = clientJobs[0];
  const lastQuote = clientQuotes[0];

  const service =
    lastJob?.job_type ||
    lastJob?.service_type ||
    lastQuote?.job_type ||
    lastQuote?.service_type ||
    "service work";

  const address =
    client?.address ||
    client?.site_address ||
    lastJob?.address ||
    lastJob?.site_address ||
    "";

  const lastAmount =
    quoteAmount(lastQuote) ||
    jobAmount(lastJob) ||
    0;

  const description = [
    `${service} for ${titleOf(client, "client")}${address ? ` at ${address}` : ""}.`,
    memory?.notes?.[0] ? `Site note: ${memory.notes[0]}` : "",
    lastJob ? `Based on previous work: ${titleOf(lastJob, "last job")}.` : "",
    "Scope, timing and final price should be reviewed before sending.",
  ].filter(Boolean).join(" ");

  const addons = [];
  const combinedNotes = [
    client?.notes,
    lastJob?.notes,
    lastJob?.worker_notes,
    lastJob?.completion_notes,
  ].filter(Boolean).join(" ").toLowerCase();

  if (combinedNotes.includes("green waste") || service.toLowerCase().includes("lawn") || service.toLowerCase().includes("garden")) {
    addons.push("Optional green-waste removal");
  }
  if (combinedNotes.includes("photo") || combinedNotes.includes("proof")) {
    addons.push("Before/after proof photos");
  }
  if (combinedNotes.includes("recurring") || lastJob?.is_recurring || lastJob?.recurring) {
    addons.push("Recurring service option");
  }
  if (!addons.length) {
    addons.push("Optional extra labour/materials line", "Customer approval before extras");
  }

  const followup =
    clientQuotes.filter((q) => ["open", "sent", "pending", "waiting", "draft"].includes(statusSlug(q))).length;

  return {
    service,
    address,
    lastAmount,
    description,
    addons,
    followup,
    memory,
  };
}

function AIQuoteBuilder({ clients = [], jobs = [], quotes = [] }) {
  const [clientId, setClientId] = useState("");
  const [customScope, setCustomScope] = useState("");
  const [draft, setDraft] = useState(null);
  const [notice, setNotice] = useState("");

  const selectedClient = clients.find((client) => String(client.id || client._id || client.email || client.name) === String(clientId));
  const suggestion = selectedClient ? buildQuoteSuggestion(selectedClient, jobs, quotes) : null;

  function prepareQuoteDraft() {
    setNotice("");

    if (!selectedClient) {
      setNotice("Choose a client first.");
      return;
    }

    const base = buildQuoteSuggestion(selectedClient, jobs, quotes);
    const quoteText = [
      base.description,
      customScope.trim() ? `Owner notes: ${customScope.trim()}` : "",
      base.addons.length ? `Suggested add-ons: ${base.addons.join(", ")}.` : "",
      base.lastAmount ? `Previous known value: ${money({ total: base.lastAmount })}.` : "No previous price found. Amount needs review.",
    ].filter(Boolean).join("\n\n");

    setDraft({
      client: selectedClient,
      title: `Quote draft for ${titleOf(selectedClient, "client")}`,
      description: quoteText,
      addons: base.addons,
      amount_hint: base.lastAmount,
      followup_count: base.followup,
    });
  }

  function saveDraft() {
    if (!draft) return;

    const rows = readLocalList("churvox_operator_drafts");
    rows.unshift({
      id: `quote-${Date.now()}`,
      type: "ai_quote_draft",
      title: draft.title,
      target: "/quotes",
      created_at: new Date().toISOString(),
      client_id: draft.client.id || draft.client._id || "",
      customer_name: titleOf(draft.client, "Client"),
      description: draft.description,
      addons: draft.addons,
      amount_hint: draft.amount_hint,
    });
    saveLocalList("churvox_operator_drafts", rows);

    setNotice("Quote draft saved to Operator Drafts. Owner can review before sending.");
    setDraft(null);
    setCustomScope("");
  }

  return (
    <section className="op-quote-builder">
      <header>
        <div>
          <p>AI QUOTE BUILDER</p>
          <h2>Prepare smarter quotes from client history.</h2>
          <span>{clients.length} clients · {quotes.length} quotes · site memory used where available</span>
        </div>
        <Link to="/quotes">Open quotes</Link>
      </header>

      {notice ? <div className="op-warning">{notice}</div> : null}

      <div className="op-quote-builder-grid">
        <div className="op-quote-form-card">
          <label>
            Client
            <select value={clientId} onChange={(event) => { setClientId(event.target.value); setDraft(null); }}>
              <option value="">Choose client</option>
              {clients.map((client, index) => (
                <option key={client.id || client._id || client.email || index} value={client.id || client._id || client.email || client.name}>
                  {titleOf(client, `Client ${index + 1}`)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Scope notes
            <textarea
              value={customScope}
              onChange={(event) => setCustomScope(event.target.value)}
              placeholder="Example: Quote lawn mow, hedge trim and green waste removal. Client wants monthly option."
            />
          </label>

          <button type="button" onClick={prepareQuoteDraft}>Prepare quote draft</button>
        </div>

        <div className="op-quote-suggestion-card">
          {!selectedClient ? (
            <div className="op-approval-empty">
              <strong>Choose a client to build a quote.</strong>
              <span>Churvox will use previous jobs, quotes, site memory and common add-ons to prepare editable wording.</span>
            </div>
          ) : draft ? (
            <>
              <span>PREPARED QUOTE</span>
              <h3>{draft.title}</h3>
              <pre>{draft.description}</pre>

              <div className="op-quote-addons">
                {draft.addons.map((addon) => <em key={addon}>{addon}</em>)}
              </div>

              <button type="button" onClick={saveDraft}>Save quote draft</button>
            </>
          ) : (
            <>
              <span>SITE-BASED SUGGESTION</span>
              <h3>{titleOf(selectedClient, "Client")}</h3>
              <p>{suggestion?.description}</p>

              <div className="op-note-result-list">
                <div><b>Last value</b><small>{suggestion?.lastAmount ? money({ total: suggestion.lastAmount }) : "No previous value"}</small></div>
                <div><b>Open follow-ups</b><small>{suggestion?.followup || 0}</small></div>
                <div><b>Service hint</b><small>{suggestion?.service || "Service work"}</small></div>
                <div><b>Address</b><small>{suggestion?.address || "Not set"}</small></div>
              </div>

              <div className="op-quote-addons">
                {(suggestion?.addons || []).map((addon) => <em key={addon}>{addon}</em>)}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}


function Dashboard() {
  const data = useLiveData();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [setTick] = useState(0);
  const history = useMemo(() => readLocalList("churvox_operator_approval_log").slice(0,5), []);
  const drafts = useMemo(() => readLocalList("churvox_operator_drafts").slice(0,5), []);

  function openAction(action, mode) { setModal({ action, mode, preview: buildActionPreview(action, data) }); }
  function pushDraft(draft) { const rows = readLocalList("churvox_operator_drafts"); rows.unshift({ id:`d-${Date.now()}`, created_at:new Date().toISOString(), ...draft }); saveLocalList("churvox_operator_drafts", rows); setTick((x)=>x+1); }

  async function tryDispatch(preview) {
    const job = preview?.pick?.job; const worker = preview?.pick?.worker;
    if (!job || !worker) throw new Error("No eligible job/worker found.");
    const jobId = job.id || job._id; const workerId = worker.id || worker._id;
    const payloads = [{ worker_id: workerId, assigned_worker_id: workerId },{ assigned_worker_id: workerId },{ worker_id: workerId }];
    const calls = [
      () => api(`/jobs/${jobId}/assign`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}/assign-worker`, { method: "POST", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PATCH", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PUT", body: payloads[2] }),
    ];
    for (const fn of calls) { try { await fn(); return { job, worker }; } catch {} }
    pushDraft({ type:"assignment_recommendation", title:`Assign ${titleOf(job,'job')} to ${titleOf(worker,'worker')}`, target:"/jobs" });
    setToast("Backend did not accept assignment yet. Recommendation saved.");
    return null;
  }

  async function confirmAction(intent) {
    if (!modal || busy) return;
    const target = actionTarget(modal.action);
    if (intent === "review") { saveApprovalLog(modal.action, "review", "reviewed"); setModal(null); setTick((x)=>x+1); navigate(target); return; }
    setBusy(true);
    try {
      const label = String(modal.action?.label || "").toLowerCase();
      if (label.includes("dispatch")) {
        const result = await tryDispatch(modal.preview);
        saveApprovalLog(modal.action, "approve", result ? "approved" : "drafted");
        if (result) { await data.reload(); setToast("Dispatch approved and assignment updated."); }
      } else if (label.includes("cashflow")) {
        (modal.preview.records || []).forEach((inv) => pushDraft({ type:"payment_reminder", title:`Reminder draft for ${titleOf(inv,'invoice')}`, target:"/invoices" }));
        saveApprovalLog(modal.action, "approve", "drafted"); setToast("Payment reminder drafts prepared. Nothing was sent.");
      } else if (label.includes("sales")) {
        (modal.preview.records || []).forEach((q) => pushDraft({ type:"quote_followup", title:`Follow-up draft for ${titleOf(q,'quote')}`, target:"/quotes" }));
        saveApprovalLog(modal.action, "approve", "drafted"); setToast("Quote follow-up drafts prepared. Nothing was sent.");
      } else if (label.includes("invoice")) {
        const job = modal.preview.records?.[0];
        if (job) {
          const body = { job_id: job.id || job._id, client_id: job.client_id || job.customer_id, customer_id: job.customer_id || job.client_id, client_name: job.client_name || job.customer_name, status: "draft", amount: Number(job.total || job.amount || job.price || 0), total: Number(job.total || job.amount || job.price || 0), description: `Draft invoice for ${job.title || 'completed job'} at ${job.address || job.site_address || 'client site'}`, created_by_ai: true };
          let ok = false; for (const path of ["/invoices", "/invoices/create"]) { try { await api(path, { method: "POST", body }); ok = true; break; } catch {} }
          if (!ok) { pushDraft({ type:"invoice_draft", title:`Invoice draft for ${titleOf(job,'completed job')}`, target:"/invoices" }); setToast("Invoice draft saved locally for review."); saveApprovalLog(modal.action, "approve", "drafted"); }
          else { await data.reload(); saveApprovalLog(modal.action, "approve", "approved"); setToast("Invoice draft created for review."); navigate('/invoices'); }
        }
      }
    } finally { setBusy(false); setModal(null); setTick((x)=>x+1); }
  }

  const openInvoices = data.invoices.filter((x) => !["paid", "void", "cancelled"].includes(statusOf(x).toLowerCase()));
  const openQuotes = data.quotes.filter((x) => !["accepted", "declined", "converted"].includes(statusOf(x).toLowerCase()));
  const unassigned = data.jobs.filter(isUnassigned);
  const invoicedJobIds = new Set(data.invoices.map((i) => String(i.job_id || i.source_job_id || i.linked_job_id || "")).filter(Boolean));
  const completedNeedsInvoice = data.jobs
    .filter((j) => ["completed", "done", "closed"].includes(statusSlug(j)))
    .filter((j) => !invoicedJobIds.has(String(j.id || j._id || "")));
  const prepared = unassigned.length + openInvoices.length + openQuotes.length + completedNeedsInvoice.length;

  return <Shell><Topbar />{toast ? <div className="op-warning">{toast}</div> : null}<ActionModal modal={modal} onClose={() => setModal(null)} onConfirm={confirmAction} busy={busy} />{data.error ? <div className="op-warning">{data.error}</div> : null}<Hero data={data} prepared={prepared} />
  <section className="op-top-grid"><ApprovalQueue jobs={data.jobs} invoices={data.invoices} quotes={data.quotes} team={data.team} clients={data.clients} drafts={drafts} history={history} onAction={openAction} /><ProofToPaid jobs={data.jobs} invoices={data.invoices} reload={data.reload} /></section>
  <section className="op-mid-grid"><DispatchBoard jobs={data.jobs} team={data.team} reload={data.reload} /><Cashflow invoices={data.invoices} /><CrewStatus team={data.team} /><Schedule jobs={data.jobs} /></section>
  <section className="op-mid-grid"><OwnerNotifications jobs={data.jobs} quotes={data.quotes} invoices={data.invoices} clients={data.clients} team={data.team} /><LiveActivity history={history} /><section className="op-panel"><h3>DEEP AI MODULES</h3><p>Extra tools stay tucked away until you need them.</p><div className="op-link-row"><Link to="/ai-approvals">AI Work Queue</Link><Link to="/billing">Billing Centre</Link><Link to="/settings">Settings Hub</Link><Link to="/import">Import Centre</Link><Link to="/demo">Setup Check</Link></div></section></section>
  <section className="op-bottom-grid"><DataPanel title="TODAY'S SCHEDULE" type="jobs" items={data.jobs} /><DataPanel title="QUOTE PIPELINE" type="quotes" items={data.quotes} /></section>
  <section className="op-bottom-grid"><section className="op-panel"><h3>APPROVAL HISTORY</h3>{history.map((h)=><div className="op-data-row" key={h.id}><strong>{h.result || h.mode}</strong><small>{h.title} · {new Date(h.created_at).toLocaleString()} · {h.target}</small></div>)}</section><section className="op-panel"><h3>OPERATOR DRAFTS</h3>{drafts.map((d)=><div className="op-data-row" key={d.id}><strong>{d.title}</strong><small>{d.type} · {new Date(d.created_at).toLocaleString()} · {d.target}</small></div>)}</section></section>
  <QuotePipeline quotes={data.quotes} />
</Shell>;
}


function Workspace({ kind }) {
  const data = useLiveData();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [jobActionBusy, setJobActionBusy] = useState(false);
  const [workspaceToast, setWorkspaceToast] = useState("");

  const map = {
    jobs: ["Jobs Command", "Schedule, dispatch, prove and complete work.", data.jobs, "jobs"],
    clients: ["Client Command", "Customers, sites and repeat work.", data.clients, "clients"],
    quotes: ["Quote Command", "Follow-ups, approvals and conversion.", data.quotes, "quotes"],
    invoices: ["Money Command", "Draft, send, follow up and collect.", data.invoices, "invoices"],
    team: ["Crew Command", "Availability, roles and dispatch.", data.team, "crew"],
  };

  const [title, subtitle, items, type] = map[kind] || map.jobs;

  const drafts = readLocalList("churvox_operator_drafts").filter((draft) => {
    const target = String(draft.target || "").toLowerCase();
    const draftType = String(draft.type || "").toLowerCase();

    if (kind === "jobs") return target.includes("jobs") || draftType.includes("assignment");
    if (kind === "invoices") return target.includes("invoice") || draftType.includes("payment");
    if (kind === "quotes") return target.includes("quote");
    return target.includes(kind);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const haystack = [
        titleOf(item, ""),
        item.client_name,
        item.customer_name,
        item.address,
        item.site_address,
        item.email,
        item.phone,
        item.region,
        item.role,
        statusOf(item, ""),
        money(item),
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }, [items, query]);

  function primaryLine(item) {
    if (kind === "jobs") {
      return [item.client_name || item.customer_name, item.address || item.site_address, item.assigned_worker_name || item.worker_name].filter(Boolean).join(" · ");
    }

    if (kind === "invoices" || kind === "quotes") {
      return [item.client_name || item.customer_name, money(item), item.due_date || item.created_at].filter(Boolean).join(" · ");
    }

    if (kind === "clients") {
      return [item.email, item.phone, item.address].filter(Boolean).join(" · ");
    }

    if (kind === "team") {
      return [item.role, item.email, item.phone, item.region].filter(Boolean).join(" · ");
    }

    return "";
  }

  function aiHint(item) {
    if (kind !== "jobs") return "";

    if (isUnassigned(item)) return "AI: needs worker assignment";

    const s = statusOf(item, "").toLowerCase();
    if (s.includes("complete")) return "AI: ready for invoice check";

    return "AI: watching job progress";
  }

  function statusClass(item) {
    const s = statusOf(item, "").toLowerCase();

    if (s.includes("complete") || s.includes("paid") || s.includes("accepted") || s.includes("active")) return "good";
    if (s.includes("overdue") || s.includes("cancel") || s.includes("declin")) return "bad";
    if (s.includes("draft") || s.includes("pending") || s.includes("sent") || s.includes("assigned")) return "wait";

    return "info";
  }


  function workspaceRecordId(item) {
    return item?.id || item?._id || item?.job_id || item?.worker_id || "";
  }

  function saveWorkspaceDraft(draft) {
    const rows = readLocalList("churvox_operator_drafts");
    rows.unshift({
      id: `d-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...draft,
    });
    saveLocalList("churvox_operator_drafts", rows);
  }

  function activeWorkers() {
    return data.team.filter((worker) => isActiveWorker(worker));
  }

  function saveJobAssignmentRecommendation() {
    if (kind !== "jobs" || !selected) return;

    const workers = activeWorkers();
    const worker =
      workers.find((w) => String(workspaceRecordId(w)) === String(selectedWorkerId)) ||
      workers[0];

    if (!worker) {
      setWorkspaceToast("No active worker found.");
      return;
    }

    saveWorkspaceDraft({
      type: "assignment_recommendation",
      title: `Assign ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}`,
      target: "/jobs",
      job_id: workspaceRecordId(selected),
      worker_id: workspaceRecordId(worker),
    });

    saveApprovalLog(
      { label: "DISPATCH", title: `Assignment prepared for ${titleOf(selected, "job")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Assignment recommendation saved for approval.");
  }

  function saveJobInvoiceDraft() {
    if (kind !== "jobs" || !selected) return;

    const amount = Number(selected.total || selected.amount || selected.price || selected.job_price || 0) || 0;

    saveWorkspaceDraft({
      type: "invoice_draft",
      title: `Invoice draft for ${titleOf(selected, "job")}`,
      target: "/invoices",
      record: {
        job_id: workspaceRecordId(selected),
        client_id: selected.client_id || selected.customer_id || "",
        client_name: selected.client_name || selected.customer_name || "",
        status: "draft",
        amount,
        total: amount,
        description: `Draft invoice for ${titleOf(selected, "completed job")} at ${selected.address || selected.site_address || "client site"}. Prepared by Churvox Operator OS.`,
        created_by_ai: true,
      },
    });

    saveApprovalLog(
      { label: "INVOICE", title: `Invoice draft prepared for ${titleOf(selected, "job")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Invoice draft saved for review.");
  }


  function workspaceRecordId(item) {
    return item?.id || item?._id || item?.job_id || item?.worker_id || "";
  }

  function saveWorkspaceDraft(draft) {
    const rows = readLocalList("churvox_operator_drafts");
    rows.unshift({
      id: `d-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...draft,
    });
    saveLocalList("churvox_operator_drafts", rows);
  }

  function activeWorkers() {
    return data.team.filter((worker) => isActiveWorker(worker));
  }

  async function prepareJobAssignmentDraft() {
    if (kind !== "jobs" || !selected || jobActionBusy) return;

    const workers = activeWorkers();
    const worker =
      workers.find((w) => String(workspaceRecordId(w)) === String(selectedWorkerId)) ||
      workers[0];

    if (!worker) {
      setWorkspaceToast("No active worker found. Add a worker first.");
      return;
    }

    const jobId = workspaceRecordId(selected);
    const workerId = workspaceRecordId(worker);

    if (!jobId || !workerId) {
      saveWorkspaceDraft({
        type: "assignment_recommendation",
        title: `Assign ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}`,
        target: "/jobs",
        job_id: jobId,
        worker_id: workerId,
        job_title: titleOf(selected, "job"),
        worker_name: titleOf(worker, "worker"),
        text: "Could not safely find job/worker IDs, so this was saved as a recommendation.",
      });

      saveApprovalLog(
        { label: "DISPATCH", title: `Assignment recommendation saved for ${titleOf(selected, "job")}` },
        "drafted",
        "drafted"
      );

      setWorkspaceToast("Missing job or worker ID. Recommendation saved.");
      return;
    }

    const payloads = [
      {
        worker_id: workerId,
        assigned_worker_id: workerId,
        assigned_to: workerId,
        assigned_worker_name: titleOf(worker, "Worker"),
      },
      {
        assigned_worker_id: workerId,
        assigned_worker_name: titleOf(worker, "Worker"),
      },
      {
        worker_id: workerId,
        assigned_worker_name: titleOf(worker, "Worker"),
      },
    ];

    const calls = [
      () => api(`/jobs/${jobId}/assign`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}/assign-worker`, { method: "POST", body: payloads[0] }),
      () => api(`/jobs/${jobId}`, { method: "PATCH", body: payloads[1] }),
      () => api(`/jobs/${jobId}`, { method: "PUT", body: payloads[2] }),
    ];

    setJobActionBusy(true);

    try {
      let success = false;

      for (const call of calls) {
        try {
          await call();
          success = true;
          break;
        } catch {
          // Try the next safe endpoint.
        }
      }

      if (!success) {
        saveWorkspaceDraft({
          type: "assignment_recommendation",
          title: `Assign ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}`,
          target: "/jobs",
          job_id: jobId,
          worker_id: workerId,
          job_title: titleOf(selected, "job"),
          worker_name: titleOf(worker, "worker"),
          text: "Backend did not accept assignment yet. Recommendation saved for owner review.",
        });

        saveApprovalLog(
          { label: "DISPATCH", title: `Assignment recommendation saved for ${titleOf(selected, "job")}` },
          "drafted",
          "drafted"
        );

        setWorkspaceToast("Backend did not accept assignment yet. Recommendation saved.");
        return;
      }

      saveApprovalLog(
        { label: "DISPATCH", title: `Assigned ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}` },
        "approve",
        "approved"
      );

      setWorkspaceToast(`Assigned ${titleOf(selected, "job")} to ${titleOf(worker, "worker")}.`);
      await data.reload();
      setSelected(null);
    } finally {
      setJobActionBusy(false);
    }
  }
async function prepareJobInvoiceDraft() {
    if (kind !== "jobs" || !selected || jobActionBusy) return;

    const jobId = workspaceRecordId(selected);
    const amount = Number(selected.total || selected.amount || selected.price || selected.job_price || 0) || 0;

    const body = {
      job_id: jobId,
      client_id: selected.client_id || selected.customer_id || "",
      customer_id: selected.customer_id || selected.client_id || "",
      client_name: selected.client_name || selected.customer_name || "",
      status: "draft",
      amount,
      total: amount,
      description: `Draft invoice for ${titleOf(selected, "completed job")} at ${selected.address || selected.site_address || "client site"}. Prepared by Churvox Operator OS.`,
      created_by_ai: true,
    };

    setJobActionBusy(true);

    try {
      let success = false;

      for (const path of ["/invoices", "/invoices/create"]) {
        try {
          await api(path, { method: "POST", body });
          success = true;
          break;
        } catch {
          // Try the next safe endpoint.
        }
      }

      if (!success) {
        saveWorkspaceDraft({
          type: "invoice_draft",
          title: `Invoice draft for ${titleOf(selected, "job")}`,
          target: "/invoices",
          record: body,
          text: body.description,
        });

        saveApprovalLog(
          { label: "INVOICE", title: `Invoice draft saved locally for ${titleOf(selected, "job")}` },
          "drafted",
          "drafted"
        );

        setWorkspaceToast("Backend did not accept invoice creation yet. Draft saved locally for review.");
        return;
      }

      saveApprovalLog(
        { label: "INVOICE", title: `Draft invoice created for ${titleOf(selected, "job")}` },
        "approve",
        "approved"
      );

      setWorkspaceToast("Draft invoice created for review.");
      await data.reload();
      setSelected(null);
    } finally {
      setJobActionBusy(false);
    }
  }



  function prepareInvoiceReminderDraft() {
    if (kind !== "invoices" || !selected) return;

    saveWorkspaceDraft({
      type: "payment_reminder",
      title: `Payment reminder draft for ${titleOf(selected, "invoice")}`,
      target: "/invoices",
      invoice_id: workspaceRecordId(selected),
      invoice_title: titleOf(selected, "invoice"),
      client_name: selected.client_name || selected.customer_name || "",
      amount: money(selected),
      text: `Friendly payment reminder for ${titleOf(selected, "invoice")} prepared by Churvox Operator OS. Nothing has been sent.`,
    });

    saveApprovalLog(
      { label: "CASHFLOW", title: `Payment reminder prepared for ${titleOf(selected, "invoice")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Payment reminder draft saved. Nothing was sent.");
  }

  function prepareQuoteFollowupDraft() {
    if (kind !== "quotes" || !selected) return;

    saveWorkspaceDraft({
      type: "quote_followup",
      title: `Quote follow-up draft for ${titleOf(selected, "quote")}`,
      target: "/quotes",
      quote_id: workspaceRecordId(selected),
      quote_title: titleOf(selected, "quote"),
      client_name: selected.client_name || selected.customer_name || "",
      amount: money(selected),
      text: `Quote follow-up for ${titleOf(selected, "quote")} prepared by Churvox Operator OS. Nothing has been sent.`,
    });

    saveApprovalLog(
      { label: "SALES", title: `Quote follow-up prepared for ${titleOf(selected, "quote")}` },
      "drafted",
      "drafted"
    );

    setWorkspaceToast("Quote follow-up draft saved. Nothing was sent.");
  }

  function DetailModal() {
    if (!selected) return null;

    const fields = [
      ["Status", statusOf(selected, "ready")],
      ["Client", selected.client_name || selected.customer_name],
      ["Address", selected.address || selected.site_address],
      ["Email", selected.email],
      ["Phone", selected.phone],
      ["Worker", selected.assigned_worker_name || selected.worker_name || selected.assigned_to],
      ["Role", selected.role],
      ["Region", selected.region || selected.location || selected.suburb],
      ["Amount", money(selected)],
      ["Date", selected.scheduled_date || selected.date || selected.created_at],
      ["ID", selected.id || selected._id],
    ].filter(([, value]) => value);

    return (
      <div className="op-modal-backdrop" role="presentation" onClick={() => setSelected(null)}>
        <section className="op-modal op-workspace-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          <div className="op-modal-glow" />

          <header>
            <p>{type.toUpperCase()} DETAIL</p>
            <button type="button" onClick={() => setSelected(null)}>×</button>
          </header>

          <div className="op-modal-body">
            <span>{statusOf(selected, "ready")}</span>
            <h2>{titleOf(selected, `${type} detail`)}</h2>
            <p>{primaryLine(selected) || "Churvox is showing the live record details available for this item."}</p>

            {kind === "jobs" ? (
              <>
                <div className="op-modal-reason">
                  <strong>AI job read</strong>
                  <small>{aiHint(selected)}</small>
                </div>

                <div className="op-job-action-box">
                  <strong>Job actions</strong>
                  <small>Prepare dispatch and invoice work from this popup. Nothing is sent automatically.</small>

                  <select value={selectedWorkerId} onChange={(event) => setSelectedWorkerId(event.target.value)}>
                    <option value="">Best available worker</option>
                    {activeWorkers().map((worker) => (
                      <option key={workspaceRecordId(worker) || titleOf(worker, "worker")} value={workspaceRecordId(worker)}>
                        {titleOf(worker, "Worker")} {worker.region ? `· ${worker.region}` : ""}
                      </option>
                    ))}
                  </select>

                  <div>
                    <button type="button" onClick={saveJobAssignmentRecommendation}>Prepare assignment</button>
                    <button type="button" onClick={saveJobInvoiceDraft}>Prepare invoice draft</button>
                  </div>
                </div>
              </>
            ) : null}

            {kind === "invoices" ? (
              <div className="op-money-action-box">
                <strong>Cashflow action</strong>
                <small>Prepare a payment reminder draft for this invoice. Nothing is sent automatically.</small>
                <button type="button" onClick={prepareInvoiceReminderDraft}>Prepare reminder draft</button>
              </div>
            ) : null}

            {kind === "quotes" ? (
              <div className="op-money-action-box">
                <strong>Sales action</strong>
                <small>Prepare a quote follow-up draft for this quote. Nothing is sent automatically.</small>
                <button type="button" onClick={prepareQuoteFollowupDraft}>Prepare follow-up draft</button>
              </div>
            ) : null}

            <div className="op-detail-grid">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <b>{label}</b>
                  <small>{String(value)}</small>
                </div>
              ))}
            </div>
          </div>

          <footer>
            <button type="button" className="op-modal-secondary" onClick={() => setSelected(null)}>Close</button>
            <button type="button" className="op-modal-primary" onClick={data.reload}>Run scan</button>
          </footer>
        </section>
      </div>
    );
  }

  return (
    <Shell>
      <Topbar />
      <DetailModal />
      {workspaceToast ? <div className="op-warning">{workspaceToast}</div> : null}

      <section className="op-page-hero op-workspace-hero">
        <p>CHURVOX COMMAND</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>

        <div className="op-workspace-actions">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${type}...`}
            aria-label={`Search ${type}`}
          />
          <button type="button" onClick={data.reload}>Run AI scan</button>
        </div>
      </section>

      {data.error ? <div className="op-warning">{data.error}</div> : null}
      {data.loading ? <div className="op-warning">Loading live {type} data...</div> : null}

      {drafts.length ? (
        <section className="op-panel op-drafts-strip">
          <header>
            <h3>OPERATOR DRAFTS <b>{drafts.length}</b></h3>
            <span>Approval-first drafts. Nothing auto-sent.</span>
          </header>

          {drafts.slice(0, 6).map((draft) => (
            <div className="op-draft-row op-draft-row-action" key={draft.id || draft.created_at || draft.title}>
              <div>
                <strong>{draft.title || "Operator draft"}</strong>
                <small>{draft.type || "draft"} · {draft.created_at || "saved"}</small>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWorkspaceToast(`${draft.title || "Draft"} is ready for owner review. Nothing has been sent.`);
                }}
              >
                Review
              </button>
            </div>
          ))}
        </section>
      ) : null}

      <section className="op-panel op-workspace-list">
        <header>
          <h3>{title.toUpperCase()} <b>{filtered.length}</b></h3>
          <span>{query ? "Filtered live records" : "Live records"}</span>
        </header>

        {!filtered.length && !data.loading ? (
          <div className="op-empty-mini">No {type} found yet.</div>
        ) : null}

        {filtered.slice(0, 40).map((item, index) => (
          <button
            type="button"
            className="op-workspace-row"
            key={item.id || item._id || `${type}-${index}`}
            onClick={() => { setSelected(item); setSelectedWorkerId(""); setWorkspaceToast(""); }}
          >
            <i>{kind === "jobs" ? "⌘" : kind === "invoices" ? "▥" : kind === "quotes" ? "▤" : kind === "team" ? "♧" : "◎"}</i>

            <span>
              <b>{titleOf(item, `${type} ${index + 1}`)}</b>
              <small>{primaryLine(item) || "Tap to inspect record"}</small>
              {kind === "jobs" ? <em>{aiHint(item)}</em> : null}
            </span>

            <strong className={`op-row-status ${statusClass(item)}`}>{statusOf(item, "ready")}</strong>
          </button>
        ))}
      </section>
    </Shell>
  );
}

function Settings() {
  return (
    <Shell>
      <Topbar />
      <section className="op-page-hero">
        <p>SYSTEM CONTROL</p>
        <h1>Settings Command</h1>
        <span>Plan, billing, MYOB, SMS and AI Operator rules.</span>
      </section>
      <section className="op-settings-grid">
        {["Plan & Billing", "MYOB Sync", "SMS Credits", "AI Operator Rules"].map((name) => (
          <article className="op-panel" key={name}>
            <h3>{name}</h3>
            <p>Ready for the next rebuild layer.</p>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ business_name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  async function submitLogin(e) {
    e.preventDefault();
    setMessage("Signing in...");
    try {
      const res = await api("/auth/login", { method: "POST", body: loginForm });
      const access = res?.token || res?.access_token || res?.accessToken;
      if (access) localStorage.setItem("token", access);
      navigate("/dashboard");
    } catch (err) {
      setMessage(err.message || "Login failed.");
    }
  }

  async function submitSignup(e) {
    e.preventDefault();
    setMessage("Creating account...");
    try {
      const res = await api("/auth/register", { method: "POST", body: signupForm });
      const access = res?.token || res?.access_token || res?.accessToken;
      if (access) {
        localStorage.setItem("token", access);
        navigate("/dashboard");
        return;
      }
      setMessage("Account created. Please log in.");
    } catch (err) {
      setMessage(err.message || "Sign up failed.");
    }
  }

  const loginNode = (
    <form onSubmit={submitLogin}>
      <input placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
      <input placeholder="Password" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
      <button type="submit">Sign in</button>
      {message ? <small>{message}</small> : null}
    </form>
  );

  const signupNode = (
    <form onSubmit={submitSignup}>
      <input placeholder="Business name" value={signupForm.business_name} onChange={(e) => setSignupForm({ ...signupForm, business_name: e.target.value })} />
      <input placeholder="Email" type="email" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} />
      <input placeholder="Password" type="password" value={signupForm.password} onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} />
      <button type="submit">Create account</button>
      {message ? <small>{message}</small> : null}
    </form>
  );

  return <FreshAuthShell onLogin={loginNode} onSignup={signupNode} />;
}



function OperatorActionHost({ api, children }) {
  const [active, setActive] = useState(null);
  async function onApprove(action){ const result = await persistOperatorAction(api, { ...action, status: "approved" }); alert(result.source === "backend" ? "Action saved to backend draft queue." : "Backend unavailable. Action saved locally."); setActive(null); }
  const wrapped = React.cloneElement(children, { openOperatorAction: setActive });
  return <>
    {wrapped}
    <OperatorActionDrawer action={active} onClose={()=>setActive(null)} onApprove={onApprove} onReject={(a)=>setActive({ ...a, status: "rejected"})} onReview={(a)=>setActive({ ...a, status: "pending"})} />
  </>;
}

export default function FreshChurvoxApp() {
  if (typeof document !== "undefined") {
    const freshPath = window.location.pathname.replace(/\/+$/, "") || "/";
    document.body.classList.toggle("chx-live-login", ["/login", "/admin/login", "/owner/login"].includes(freshPath));
  }
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/book" element={<PublicBookingPage />} />
        <Route path="/request" element={<PublicBookingPage />} />
        <Route path="/public/client-portal/:token" element={<PublicClientPortalPage />} />
        <Route path="/client-portal/:token" element={<PublicClientPortalPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plans" element={<Shell><Topbar /><PlansCentrePage /></Shell>} />
          <Route path="/billing" element={<Shell><Topbar /><BillingCentrePage /></Shell>} />
          <Route path="/settings" element={<Shell><Topbar /><SettingsHubPage /></Shell>} />
          <Route path="/import" element={<Shell><Topbar /><ImportCentrePage /></Shell>} />
          <Route path="/demo" element={<Shell><Topbar /><DemoModePage /></Shell>} />
          <Route path="/proof-to-paid" element={<Shell><Topbar /><ProofToPaidPage /></Shell>} />
          <Route path="/onboarding" element={<Shell><Topbar /><OnboardingSetupPage /></Shell>} />
          <Route path="/ai-approvals" element={<Shell><Topbar /><OperatorApprovalCentre /></Shell>} />
        <Route path="/jobs" element={<Workspace kind="jobs" />} />
        <Route path="/clients" element={<Workspace kind="clients" />} />
        <Route path="/quotes" element={<Workspace kind="quotes" />} />
        <Route path="/invoices" element={<Workspace kind="invoices" />} />
        <Route path="/team" element={<Workspace kind="team" />} />
        <Route path="/worker" element={<WorkerFieldApp />} />
        <Route path="/worker/jobs" element={<WorkerFieldApp />} />
        <Route path="/worker/dashboard" element={<WorkerFieldApp />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
