import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const APP_PATHS = {
  dashboard: "/dashboard",
  queue: "/ai-approvals",
  jobs: "/jobs",
  clients: "/clients",
  team: "/team",
  quotes: "/quotes",
  invoices: "/invoices",
  proof: "/proof-to-paid",
  settings: "/settings",
};

const NAV = [
  ["dashboard", "Smart Hub", "AI command centre"],
  ["queue", "AI Work Queue", "Prepared actions"],
  ["jobs", "Jobs", "Dispatch board"],
  ["clients", "Clients", "Customer history"],
  ["team", "Team", "Crew availability"],
  ["quotes", "Quotes", "Sales pipeline"],
  ["invoices", "Invoices", "Cashflow"],
  ["proof", "Proof-to-Paid", "Completed work"],
  ["settings", "Settings", "Business setup"],
];

const AI_ACTIONS = [
  {
    type: "Dispatch",
    title: "Unassigned job found",
    body: "AI checked workload, area and trade fit. Jay looks like the best match.",
    action: "Approve worker",
    tone: "blue",
  },
  {
    type: "Invoice",
    title: "Draft invoice prepared",
    body: "Completed job notes, photos and price have been shaped into an invoice draft.",
    action: "Review draft",
    tone: "teal",
  },
  {
    type: "Quote",
    title: "Follow-up ready",
    body: "A quote has gone quiet. AI wrote a short follow-up for approval.",
    action: "Approve send",
    tone: "purple",
  },
  {
    type: "Cashflow",
    title: "Payment reminder drafted",
    body: "An overdue invoice needs a friendly reminder. Nothing sends until approved.",
    action: "Review reminder",
    tone: "amber",
  },
];

const JOBS = [
  ["8:00", "Kitchen renovation", "Acme Property", "In progress"],
  ["10:30", "Pool pump repair", "Blue Lagoon Pools", "Scheduled"],
  ["12:45", "Fence repair", "Westside Carpentry", "Assigned"],
  ["2:30", "Lawns and grounds", "ECB Property Maintenance", "Needs worker"],
];

const CLIENTS = [
  ["AC", "Acme Property", "3 active jobs", "Active"],
  ["BL", "Blue Lagoon Pools", "Quote follow-up due", "Follow-up"],
  ["EC", "ECB Property Maintenance", "Invoice draft ready", "Ready"],
  ["WC", "Westside Carpentry", "Recent work completed", "Active"],
];

const TEAM = [
  ["J", "Jay Morgan", "Lawn care · Available nearby", "Best match"],
  ["M", "Mia Taylor", "Cleaning · On site", "Busy"],
  ["K", "Kahu Brown", "Handyman · Free after 1pm", "Available"],
  ["S", "Sarah Lee", "Admin · In office", "Online"],
];

const QUOTES = [
  ["Q-1207", "Blue Lagoon Pools", "$3,450", "Sent"],
  ["Q-1208", "Acme Property", "$8,900", "Draft"],
  ["Q-1209", "Westside Carpentry", "$1,250", "Follow-up"],
];

const INVOICES = [
  ["INV-1042", "ECB Property Maintenance", "$2,850", "Draft"],
  ["INV-1041", "Acme Property", "$1,250", "Overdue"],
  ["INV-1040", "Blue Lagoon Pools", "$4,600", "Paid"],
];

const AI_APPROVAL_LOG_KEY = "churvox_ai_shell_approval_log";

function readApprovalLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_APPROVAL_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveApprovalLog(items) {
  try {
    localStorage.setItem(AI_APPROVAL_LOG_KEY, JSON.stringify(items.slice(0, 5)));
  } catch {
    // ignore storage errors
  }
}

function clearApprovalLogStorage() {
  try {
    localStorage.removeItem(AI_APPROVAL_LOG_KEY);
  } catch {
    // ignore storage errors
  }
}



function hasSavedLogin() {
  try {
    return Boolean(
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("churvox_user")
    );
  } catch {
    return false;
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
    body: JSON.stringify(body),
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

async function apiGet(path) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    body: JSON.stringify(body),
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

function toArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  for (const key of ["data", "items", "results", "records"]) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return Object.values(payload).find(Array.isArray) || [];
}

function textValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}

function statusText(item, fallback = "Active") {
  return textValue(item?.status, item?.job_status, item?.payment_status, item?.quote_status, item?.state, fallback)
    .replaceAll("_", " ");
}

function initials(name, fallback = "AI") {
  const parts = String(name || fallback).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback.slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function moneyValue(item) {
  const raw = item?.total ?? item?.amount ?? item?.price ?? item?.balance ?? item?.invoice_total ?? item?.quote_total;
  const value = Number(raw || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function jobRow(item, index) {
  const title = textValue(item?.title, item?.job_title, item?.name, item?.service_type, `Job ${index + 1}`);
  const client = textValue(item?.client_name, item?.customer_name, item?.client?.name, item?.address, "No client attached");
  const time = textValue(item?.scheduled_time, item?.start_time, item?.time, item?.scheduled_date, `${index + 1}`);
  return [time, title, client, statusText(item, item?.assigned_worker_id || item?.assigned_worker ? "Assigned" : "Needs worker")];
}

function clientRow(item, index) {
  const name = textValue(item?.client_name, item?.customer_name, item?.name, item?.business_name, `Client ${index + 1}`);
  const detail = textValue(item?.email, item?.phone, item?.address, item?.notes, "Client record");
  return [initials(name, "CL"), name, detail, statusText(item, "Active")];
}

function workerRow(item, index) {
  const name = textValue(item?.name, item?.full_name, item?.worker_name, item?.email, `Worker ${index + 1}`);
  const detail = [item?.role, item?.region, item?.email].filter(Boolean).join(" · ") || "Team member";
  return [initials(name, "WK"), name, detail, statusText(item, "Available")];
}

function quoteRow(item, index) {
  const title = textValue(item?.quote_number, item?.number, item?.title, `Quote ${index + 1}`);
  const client = textValue(item?.client_name, item?.customer_name, item?.client?.name, "Client");
  const amount = moneyValue(item);
  return [title, client, amount || "Quote", statusText(item, "Draft")];
}

function invoiceRow(item, index) {
  const title = textValue(item?.invoice_number, item?.number, item?.title, `Invoice ${index + 1}`);
  const client = textValue(item?.client_name, item?.customer_name, item?.client?.name, "Client");
  const amount = moneyValue(item);
  return [title, client, amount || "Invoice", statusText(item, "Draft")];
}


function aiActionTone(item) {
  const type = String(item?.type || "").toLowerCase();
  const priority = String(item?.priority || "").toLowerCase();

  if (priority === "urgent") return "amber";
  if (type.includes("dispatch")) return "blue";
  if (type.includes("invoice") || type.includes("proof")) return "teal";
  if (type.includes("quote")) return "purple";
  if (type.includes("cashflow")) return "amber";
  return "blue";
}

function aiActionRow(item) {
  return {
    id: textValue(item?.id, item?._id),
    type: textValue(item?.type, "AI"),
    title: textValue(item?.title, "AI action ready"),
    body: textValue(item?.body, item?.reason, "AI prepared this action for owner review."),
    action: textValue(item?.recommended_action, item?.action, "Review"),
    tone: aiActionTone(item),
    status: textValue(item?.status, "pending"),
    source_type: textValue(item?.source_type),
    source_id: textValue(item?.source_id),
    priority: textValue(item?.priority, "normal"),
  };
}

function buildLiveActions(raw) {
  const jobs = raw.jobs || [];
  const invoices = raw.invoices || [];
  const quotes = raw.quotes || [];

  const unassigned = jobs.filter((job) => {
    const status = statusText(job, "").toLowerCase();
    return (
      !job.assigned_worker_id &&
      !job.assigned_worker &&
      !job.worker_id &&
      !status.includes("complete") &&
      !status.includes("cancel")
    );
  });

  const completed = jobs.filter((job) => statusText(job, "").toLowerCase().includes("complete"));
  const overdue = invoices.filter((invoice) => statusText(invoice, "").toLowerCase().includes("overdue"));
  const drafts = invoices.filter((invoice) => statusText(invoice, "").toLowerCase().includes("draft"));
  const followQuotes = quotes.filter((quote) => {
    const status = statusText(quote, "").toLowerCase();
    return status.includes("sent") || status.includes("pending") || status.includes("follow") || status.includes("open");
  });

  const actions = [];

  if (unassigned.length) {
    actions.push({
      type: "Dispatch",
      title: `${unassigned.length} unassigned ${unassigned.length === 1 ? "job" : "jobs"} found`,
      body: "AI can recommend the best worker using workload, availability, area and job fit.",
      action: "Review assignment",
      tone: "blue",
    });
  }

  if (completed.length || drafts.length) {
    actions.push({
      type: "Invoice",
      title: `${completed.length || drafts.length} invoice ${completed.length + drafts.length === 1 ? "draft" : "drafts"} ready`,
      body: "Completed work and draft invoices are ready for owner review before sending.",
      action: "Review invoice",
      tone: "teal",
    });
  }

  if (followQuotes.length) {
    actions.push({
      type: "Quote",
      title: `${followQuotes.length} quote follow-up${followQuotes.length === 1 ? "" : "s"} ready`,
      body: "AI found quotes that may need a customer follow-up to keep work moving.",
      action: "Review follow-up",
      tone: "purple",
    });
  }

  if (overdue.length) {
    actions.push({
      type: "Cashflow",
      title: `${overdue.length} overdue invoice${overdue.length === 1 ? "" : "s"}`,
      body: "AI prepared payment follow-up work, but nothing sends without approval.",
      action: "Review reminder",
      tone: "amber",
    });
  }

  return actions.length ? actions : AI_ACTIONS;
}

function useLiveChurvoxData(authed) {
  const [state, setState] = useState({
    loading: false,
    error: "",
    jobs: JOBS,
    clients: CLIENTS,
    team: TEAM,
    quotes: QUOTES,
    invoices: INVOICES,
    actions: AI_ACTIONS,
    stats: {
      jobsToday: "14",
      readyToInvoice: "$8.7k",
      openQuotes: "7",
      crewOnline: "4",
    },
    raw: {
      jobs: [],
      clients: [],
      team: [],
      quotes: [],
      invoices: [],
    },
    raw: {
      jobs: [],
      clients: [],
      team: [],
      quotes: [],
      invoices: [],
    },
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!authed) return;

      setState((current) => ({ ...current, loading: true, error: "" }));

      const results = await Promise.allSettled([
        apiGet("/jobs"),
        apiGet("/clients"),
        apiGet("/team/workers"),
        apiGet("/quotes"),
        apiGet("/invoices"),
        apiGet("/ai/actions"),
      ]);

      if (cancelled) return;

      const rawJobs = results[0].status === "fulfilled" ? toArray(results[0].value, ["jobs"]) : [];
      const rawClients = results[1].status === "fulfilled" ? toArray(results[1].value, ["clients"]) : [];
      const rawTeam = results[2].status === "fulfilled" ? toArray(results[2].value, ["workers", "team"]) : [];
      const rawQuotes = results[3].status === "fulfilled" ? toArray(results[3].value, ["quotes"]) : [];
      const rawInvoices = results[4].status === "fulfilled" ? toArray(results[4].value, ["invoices"]) : [];
      const rawAiActions = results[5].status === "fulfilled" ? toArray(results[5].value, ["actions"]) : [];

      const mappedJobs = rawJobs.map(jobRow);
      const mappedClients = rawClients.map(clientRow);
      const mappedTeam = rawTeam.map(workerRow);
      const mappedQuotes = rawQuotes.map(quoteRow);
      const mappedInvoices = rawInvoices.map(invoiceRow);
      const liveActions = rawAiActions.length
        ? rawAiActions.map(aiActionRow)
        : buildLiveActions({
            jobs: rawJobs,
            clients: rawClients,
            team: rawTeam,
            quotes: rawQuotes,
            invoices: rawInvoices,
          });

      const readyInvoices = rawInvoices.filter((item) => {
        const status = statusText(item, "").toLowerCase();
        return status.includes("draft") || status.includes("ready") || status.includes("overdue");
      });

      const invoiceTotal = readyInvoices.reduce((sum, item) => {
        const value = Number(item?.total ?? item?.amount ?? item?.price ?? item?.balance ?? 0);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0);

      setState({
        loading: false,
        error: results.some((result) => result.status === "rejected") ? "Some live data is still syncing." : "",
        jobs: mappedJobs.length ? mappedJobs : JOBS,
        clients: mappedClients.length ? mappedClients : CLIENTS,
        team: mappedTeam.length ? mappedTeam : TEAM,
        quotes: mappedQuotes.length ? mappedQuotes : QUOTES,
        invoices: mappedInvoices.length ? mappedInvoices : INVOICES,
        actions: liveActions,
        stats: {
          jobsToday: String(rawJobs.length || JOBS.length),
          readyToInvoice: invoiceTotal > 0
            ? new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(invoiceTotal)
            : `$${Math.max(rawInvoices.length, INVOICES.length)}`,
          openQuotes: String(rawQuotes.length || QUOTES.length),
          crewOnline: String(rawTeam.length || TEAM.length),
        },
        raw: {
          jobs: rawJobs,
          clients: rawClients,
          team: rawTeam,
          quotes: rawQuotes,
          invoices: rawInvoices,
        },
      });
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [authed]);

  return state;
}


function Logo() {
  return (
    <div className="cx-logo">
      <div className="cx-logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div>
        <strong>Churvox</strong>
        <span>AI Operator OS</span>
      </div>
    </div>
  );
}

function PublicNav({ setAuthMode }) {
  return (
    <header className="cx-public-nav">
      <a href="#top" className="cx-logo-link">
        <Logo />
      </a>
      <nav>
        <a href="#operator">AI Operator</a>
        <a href="#flow">How it works</a>
        <a href="#features">Features</a>
      </nav>
      <button type="button" onClick={() => setAuthMode("login")}>
        Login
      </button>
    </header>
  );
}

function AuthCard({ authMode, setAuthMode, onLogin }) {
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signup = authMode === "signup";

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
    <aside className="cx-auth-card" id="login">
      <div className="cx-auth-head">
        <div>
          <span>Secure workspace</span>
          <h2>{signup ? "Create account" : "Open Churvox"}</h2>
        </div>
        <div className="cx-auth-orb" />
      </div>

      {error ? <div className="cx-error">{error}</div> : null}

      <form onSubmit={submit} className="cx-form">
        {signup ? (
          <>
            <label>
              Your name
              <input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" />
            </label>
            <label>
              Business name
              <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} autoComplete="organization" />
            </label>
          </>
        ) : null}

        <label>
          Email
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Opening..." : signup ? "Create AI workspace" : "Open AI workspace"}
        </button>
      </form>

      <button
        type="button"
        className="cx-switch"
        onClick={() => {
          setError("");
          setAuthMode(signup ? "login" : "signup");
        }}
      >
        {signup ? "Already have an account? Login" : "Need an account? Start free trial"}
      </button>
    </aside>
  );
}

function Landing({ authMode, setAuthMode, onLogin }) {
  return (
    <main className="cx-public" id="top">
      <div className="cx-grid-bg" />
      <div className="cx-glow cx-glow-a" />
      <div className="cx-glow cx-glow-b" />

      <PublicNav setAuthMode={setAuthMode} />

      <section className="cx-hero">
        <div className="cx-hero-copy">
          <p className="cx-pill">
            <span />
            AI command centre for trade and service businesses
          </p>

          <h1>
            AI runs the admin.
            <em>You approve the work.</em>
          </h1>

          <p className="cx-hero-text">
            Churvox watches jobs, clients, workers, invoices and quotes, then prepares the next action.
            Owners get one calm approval queue instead of a messy admin dashboard.
          </p>

          <div className="cx-hero-actions">
            <a href="#login" className="cx-primary" onClick={() => setAuthMode("login")}>
              Open Churvox
            </a>
            <a href="#operator" className="cx-secondary">
              See AI Operator
            </a>
          </div>

          <div className="cx-proof-strip">
            <article>
              <strong>1 queue</strong>
              <span>Everything ready for approval</span>
            </article>
            <article>
              <strong>Less admin</strong>
              <span>AI prepares the boring work</span>
            </article>
            <article>
              <strong>Owner safe</strong>
              <span>No risky auto-send</span>
            </article>
          </div>
        </div>

        <AuthCard authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />
      </section>

      <section className="cx-operator-preview" id="operator">
        <div className="cx-section-title">
          <span>AI Operator</span>
          <h2>Better than a dashboard. Churvox prepares what needs doing.</h2>
        </div>

        <div className="cx-ai-card-grid">
          {AI_ACTIONS.map((item) => (
            <article className={`cx-ai-card ${item.tone}`} key={item.title}>
              <div className="cx-ai-status">Ready for approval</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <button type="button">{item.action}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="cx-flow" id="flow">
        {[
          ["1", "Work comes in", "Jobs, notes, photos, clients, quotes and invoices stay connected."],
          ["2", "AI checks the day", "It finds missing workers, overdue invoices, quote follow-ups and completed jobs."],
          ["3", "AI prepares actions", "Worker assignments, invoice drafts and messages are prepared for review."],
          ["4", "Owner approves", "You stay in control before anything important is sent or changed."],
        ].map(([num, title, body]) => (
          <article key={num}>
            <b>{num}</b>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="cx-features" id="features">
        <div>
          <span>Inside Churvox</span>
          <h2>One AI-powered workspace for the whole business.</h2>
        </div>

        <div className="cx-feature-list">
          {["Smart Hub", "AI Work Queue", "Jobs", "Clients", "Team", "Quotes", "Invoices", "Proof-to-Paid", "Worker App", "Settings"].map((feature) => (
            <article key={feature}>{feature}</article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Shell({ page, setPage, onLogout, data }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV.find(([key]) => key === page) || NAV[0];

  return (
    <main className="cx-app">
      <aside className={`cx-sidebar ${mobileOpen ? "open" : ""}`}>
        <Logo />

        <nav className="cx-app-nav">
          {NAV.map(([key, label, sub]) => (
            <button
              type="button"
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => {
                setPage(key);
                setMobileOpen(false);
              }}
            >
              <span>{label}</span>
              <small>{sub}</small>
            </button>
          ))}
        </nav>

        <section className="cx-side-operator">
          <span>AI Operator</span>
          <strong>{(data?.actions?.length || AI_ACTIONS.length)} actions ready</strong>
          <p>Prepared for owner approval.</p>
        </section>
      </aside>

      <section className="cx-app-main">
        <header className="cx-topbar">
          <button className="cx-menu" type="button" onClick={() => setMobileOpen(!mobileOpen)}>
            ☰
          </button>

          <div>
            <strong>{current[1]}</strong>
            <span>{current[2]}</span>
          </div>

          <input placeholder="Search jobs, clients, invoices..." />

          <button type="button" onClick={() => setPage("queue")}>
            AI Queue
          </button>
          <button type="button" className="cx-top-primary" onClick={() => setPage("jobs")}>
            New job
          </button>
          <button type="button" className="cx-logout" onClick={onLogout}>
            Logout
          </button>
        </header>

        <Workspace page={page} setPage={setPage} data={data} />
      </section>
    </main>
  );
}

function Stat({ label, value, note }) {
  return (
    <article className="cx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}


function WorkspaceHero({ kicker, title, body, metric, action, setPage }) {
  return (
    <section className="cx-work-hero">
      <div>
        <span>{kicker}</span>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>
      <aside>
        <span>AI Operator</span>
        <strong>{metric}</strong>
        <p>{action}</p>
        <button type="button" onClick={() => setPage("queue")}>Review queue</button>
      </aside>
    </section>
  );
}

function MiniRow({ item }) {
  return (
    <button type="button" className="cx-row">
      <span>{item[0]}</span>
      <strong>{item[1]}</strong>
      <small>{item[2]}</small>
      <b>{item[3]}</b>
    </button>
  );
}

function ActionQueue({ actions = AI_ACTIONS }) {
  return (
    <section className="cx-action-board">
      {actions.map((item) => (
        <article className={`cx-work-action ${item.tone || "blue"}`} key={item.title}>
          <span>{item.type}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <button type="button">{item.action}</button>
        </article>
      ))}
    </section>
  );
}

function Board({ title, body, columns, setPage }) {
  return (
    <section className="cx-workspace">
      <WorkspaceHero
        kicker="Workspace"
        title={title}
        body={body}
        metric="AI ready"
        action="Smart actions prepared."
        setPage={setPage}
      />

      <section className="cx-board">
        {columns.map(([name, rows]) => (
          <article className="cx-column" key={name}>
            <span>Stage</span>
            <h3>{name}</h3>
            {rows.length ? rows.map((row, index) => (
              <MiniRow item={row} key={`${name}-${index}-${row[1]}`} />
            )) : <small>No records in this stage.</small>}
          </article>
        ))}
      </section>
    </section>
  );
}

function Dashboard({ setPage, data }) {
  const actions = data?.actions?.length ? data.actions : AI_ACTIONS;
  const jobs = data?.jobs?.length ? data.jobs : JOBS;
  const team = data?.team?.length ? data.team : TEAM;
  const stats = data?.stats || {};

  return (
    <section className="cx-workspace">
      <WorkspaceHero
        kicker="Smart Hub"
        title="AI has prepared today’s business actions."
        body={data?.loading ? "Syncing your live Churvox workspace..." : data?.error || "Start with decisions, not clutter. Churvox turns admin into a simple approval queue."}
        metric={`${actions.length} ready`}
        action="Dispatch, invoice, quote and cashflow actions prepared."
        setPage={setPage}
      />

      <section className="cx-stats">
        <Stat label="Jobs today" value={stats.jobsToday || String(jobs.length)} note="live workspace count" />
        <Stat label="Ready to invoice" value={stats.readyToInvoice || "$0"} note="drafts and follow-ups" />
        <Stat label="Open quotes" value={stats.openQuotes || "0"} note="pipeline watched" />
        <Stat label="Crew online" value={stats.crewOnline || String(team.length)} note="team records" />
      </section>

      <ActionQueue actions={actions} />

      <section className="cx-split">
        <section className="cx-panel">
          <header><div><span>Live field work</span><h2>Today’s run sheet</h2></div></header>
          <div className="cx-panel-list">
            {jobs.map((item, index) => <MiniRow item={item} key={`job-${index}-${item[1]}`} />)}
          </div>
        </section>

        <section className="cx-panel">
          <header><div><span>AI worker matching</span><h2>Crew status</h2></div></header>
          <div className="cx-panel-list">
            {team.map((item, index) => <MiniRow item={item} key={`team-${index}-${item[1]}`} />)}
          </div>
        </section>
      </section>
    </section>
  );
}



const OWNER_COMMAND_LOG_KEY = "churvox_owner_command_log";

function readOwnerCommandLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OWNER_COMMAND_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveOwnerCommandLog(items) {
  try {
    localStorage.setItem(OWNER_COMMAND_LOG_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // ignore storage errors
  }
}

function rowText(item, index, fallback = "Record") {
  if (Array.isArray(item)) {
    return {
      lead: textValue(item[0], fallback),
      title: textValue(item[1], `${fallback} ${index + 1}`),
      detail: textValue(item[2], "No details yet"),
      status: textValue(item[3], "Review"),
    };
  }

  const title = textValue(
    item?.title,
    item?.job_title,
    item?.name,
    item?.client_name,
    item?.customer_name,
    item?.quote_number,
    item?.invoice_number,
    item?.email,
    `${fallback} ${index + 1}`
  );

  const detail = textValue(
    item?.description,
    item?.notes,
    item?.address,
    item?.email,
    item?.phone,
    item?.client_name,
    item?.customer_name,
    "No details yet"
  );

  return {
    lead: textValue(item?.type, item?.role, fallback),
    title,
    detail,
    status: statusText(item, "Review"),
  };
}

function draftFromSelection(selection) {
  const row = rowText(selection?.item, 0, selection?.label || "Record");
  return {
    title: row.title,
    detail: row.detail,
    status: row.status,
    ownerNote: "",
    customerMessage: "",
    internalDecision: "",
  };
}

function workspacePathForPage(page) {
  const paths = {
    dashboard: "/dashboard",
    queue: "/ai-approvals",
    jobs: "/jobs",
    clients: "/clients",
    team: "/team",
    quotes: "/quotes",
    invoices: "/invoices",
    proof: "/proof-to-paid",
    settings: "/settings",
  };
  return paths[page] || "/dashboard";
}

function OwnerCommandModal({ selection, onClose, onSaveDraft, onApprove, setPage }) {
  const [draft, setDraft] = useState(() => draftFromSelection(selection));

  useEffect(() => {
    setDraft(draftFromSelection(selection));
  }, [selection]);

  if (!selection) return null;

  const row = rowText(selection.item, 0, selection.label || "Record");

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function go(page) {
    setPage(page);
    window.history.pushState({}, "", workspacePathForPage(page));
    window.dispatchEvent(new PopStateEvent("popstate"));
    onClose();
  }

  return (
    <div className="cx-command-modal-backdrop" onClick={onClose}>
      <section className="cx-command-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{selection.group || "Owner command"}</span>
            <h2>{draft.title}</h2>
            <p>{row.detail}</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <section className="cx-command-modal-grid">
          <label>
            Title / summary
            <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            Status
            <input value={draft.status} onChange={(event) => update("status", event.target.value)} />
          </label>

          <label className="wide">
            Owner edit / internal note
            <textarea
              value={draft.ownerNote}
              onChange={(event) => update("ownerNote", event.target.value)}
              placeholder="Add your edit, instruction, or approval note..."
            />
          </label>

          <label className="wide">
            Customer / worker message draft
            <textarea
              value={draft.customerMessage}
              onChange={(event) => update("customerMessage", event.target.value)}
              placeholder="Write or edit the message before anything is sent..."
            />
          </label>

          <label className="wide">
            AI decision context
            <textarea
              value={draft.detail}
              onChange={(event) => update("detail", event.target.value)}
            />
          </label>
        </section>

        <section className="cx-command-ai-box">
          <span>AI recommendation</span>
          <strong>{selection.recommendation || "Review, edit if needed, then approve only when it looks right."}</strong>
          <p>
            This hub keeps you on one page. You can inspect the record, edit the wording, save a command note, approve it,
            or jump to the exact workspace if you need deeper controls.
          </p>
        </section>

        <footer>
          <button type="button" onClick={() => onSaveDraft(selection, draft)}>Save edit</button>
          <button type="button" onClick={() => go(selection.page || "dashboard")}>Open workspace</button>
          <button type="button" onClick={() => go("jobs")}>Jobs</button>
          <button type="button" onClick={() => go("clients")}>Clients</button>
          <button type="button" onClick={() => go("team")}>Team</button>
          <button type="button" onClick={() => go("quotes")}>Quotes</button>
          <button type="button" onClick={() => go("invoices")}>Invoices</button>
          <button type="button" className="approve" onClick={() => onApprove(selection, draft)}>
            Approve
          </button>
        </footer>
      </section>
    </div>
  );
}

function OwnerCommandRow({ item, index, page, group, onOpen }) {
  const row = rowText(item, index, group);

  return (
    <button
      type="button"
      className="cx-command-row"
      onClick={() => onOpen({
        item,
        page,
        group,
        label: row.title,
        recommendation: "Open this in the hub, check the detail, edit the wording, then approve or jump to the full workspace."
      })}
    >
      <span>{row.lead}</span>
      <strong>{row.title}</strong>
      <small>{row.detail}</small>
      <b>{row.status}</b>
    </button>
  );
}


const OWNER_COMMAND_LOG_KEY = "churvox_owner_command_log";

function readOwnerCommandLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OWNER_COMMAND_LOG_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveOwnerCommandLog(items) {
  try {
    localStorage.setItem(OWNER_COMMAND_LOG_KEY, JSON.stringify(items.slice(0, 8)));
  } catch {
    // ignore storage errors
  }
}

function rowText(item, index, fallback = "Record") {
  if (Array.isArray(item)) {
    return {
      lead: textValue(item[0], fallback),
      title: textValue(item[1], `${fallback} ${index + 1}`),
      detail: textValue(item[2], "No details yet"),
      status: textValue(item[3], "Review"),
    };
  }

  const title = textValue(
    item?.title,
    item?.job_title,
    item?.name,
    item?.client_name,
    item?.customer_name,
    item?.quote_number,
    item?.invoice_number,
    item?.email,
    `${fallback} ${index + 1}`
  );

  const detail = textValue(
    item?.description,
    item?.notes,
    item?.address,
    item?.email,
    item?.phone,
    item?.client_name,
    item?.customer_name,
    "No details yet"
  );

  return {
    lead: textValue(item?.type, item?.role, fallback),
    title,
    detail,
    status: statusText(item, "Review"),
  };
}

function draftFromSelection(selection) {
  const row = rowText(selection?.item, 0, selection?.label || "Record");
  return {
    title: row.title,
    detail: row.detail,
    status: row.status,
    ownerNote: "",
    customerMessage: "",
    internalDecision: "",
  };
}

function workspacePathForPage(page) {
  const paths = {
    dashboard: "/dashboard",
    queue: "/ai-approvals",
    jobs: "/jobs",
    clients: "/clients",
    team: "/team",
    quotes: "/quotes",
    invoices: "/invoices",
    proof: "/proof-to-paid",
    settings: "/settings",
  };
  return paths[page] || "/dashboard";
}

function OwnerCommandModal({ selection, onClose, onSaveDraft, onApprove, setPage }) {
  const [draft, setDraft] = useState(() => draftFromSelection(selection));

  useEffect(() => {
    setDraft(draftFromSelection(selection));
  }, [selection]);

  if (!selection) return null;

  const row = rowText(selection.item, 0, selection.label || "Record");

  function update(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function go(page) {
    setPage(page);
    window.history.pushState({}, "", workspacePathForPage(page));
    window.dispatchEvent(new PopStateEvent("popstate"));
    onClose();
  }

  return (
    <div className="cx-command-modal-backdrop" onClick={onClose}>
      <section className="cx-command-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>{selection.group || "Owner command"}</span>
            <h2>{draft.title}</h2>
            <p>{row.detail}</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <section className="cx-command-modal-grid">
          <label>
            Title / summary
            <input value={draft.title} onChange={(event) => update("title", event.target.value)} />
          </label>

          <label>
            Status
            <input value={draft.status} onChange={(event) => update("status", event.target.value)} />
          </label>

          <label className="wide">
            Owner edit / internal note
            <textarea
              value={draft.ownerNote}
              onChange={(event) => update("ownerNote", event.target.value)}
              placeholder="Add your edit, instruction, or approval note..."
            />
          </label>

          <label className="wide">
            Customer / worker message draft
            <textarea
              value={draft.customerMessage}
              onChange={(event) => update("customerMessage", event.target.value)}
              placeholder="Write or edit the message before anything is sent..."
            />
          </label>

          <label className="wide">
            AI decision context
            <textarea
              value={draft.detail}
              onChange={(event) => update("detail", event.target.value)}
            />
          </label>
        </section>

        <section className="cx-command-ai-box">
          <span>AI recommendation</span>
          <strong>{selection.recommendation || "Review, edit if needed, then approve only when it looks right."}</strong>
          <p>
            This hub keeps you on one page. You can inspect the record, edit the wording, save a command note, approve it,
            or jump to the exact workspace if you need deeper controls.
          </p>
        </section>

        <footer>
          <button type="button" onClick={() => onSaveDraft(selection, draft)}>Save edit</button>
          <button type="button" onClick={() => go(selection.page || "dashboard")}>Open workspace</button>
          <button type="button" onClick={() => go("jobs")}>Jobs</button>
          <button type="button" onClick={() => go("clients")}>Clients</button>
          <button type="button" onClick={() => go("team")}>Team</button>
          <button type="button" onClick={() => go("quotes")}>Quotes</button>
          <button type="button" onClick={() => go("invoices")}>Invoices</button>
          <button type="button" className="approve" onClick={() => onApprove(selection, draft)}>
            Approve
          </button>
        </footer>
      </section>
    </div>
  );
}

function OwnerCommandRow({ item, index, page, group, onOpen }) {
  const row = rowText(item, index, group);

  return (
    <button
      type="button"
      className="cx-command-row"
      onClick={() => onOpen({
        item,
        page,
        group,
        label: row.title,
        recommendation: "Open this in the hub, check the detail, edit the wording, then approve or jump to the full workspace."
      })}
    >
      <span>{row.lead}</span>
      <strong>{row.title}</strong>
      <small>{row.detail}</small>
      <b>{row.status}</b>
    </button>
  );
}

function Workspace({ page, setPage, data }) {
  const actions = data?.actions?.length ? data.actions : AI_ACTIONS;
  const jobs = data?.jobs?.length ? data.jobs : JOBS;
  const clients = data?.clients?.length ? data.clients : CLIENTS;
  const team = data?.team?.length ? data.team : TEAM;
  const quotes = data?.quotes?.length ? data.quotes : QUOTES;
  const invoices = data?.invoices?.length ? data.invoices : INVOICES;
  const stats = data?.stats || {};
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [approved, setApproved] = useState({});
  const [approvalLog, setApprovalLog] = useState(() => readOwnerCommandLog());

  const meta = {
    dashboard: {
      kicker: "Owner Command Hub",
      title: "Approve, edit, and run the business from one page.",
      body: data?.loading
        ? "Syncing live Churvox data..."
        : data?.error || "AI lines up the admin. You inspect, edit, approve, or open the exact workspace without getting lost.",
      rows: jobs,
    },
    queue: {
      kicker: "AI Work Queue",
      title: "Every prepared action in one approval lane.",
      body: "Review AI-prepared dispatch, invoice, quote, and cashflow actions before anything important changes.",
      rows: actions.map((item) => [item.type, item.title, item.body, item.action]),
    },
    jobs: {
      kicker: "Jobs",
      title: "Dispatch, edit, and inspect job work.",
      body: "Open any job in a pop-up, review AI context, then approve or jump deeper.",
      rows: jobs,
    },
    clients: {
      kicker: "Clients",
      title: "Client history and follow-up control.",
      body: "Open client records, add notes, and move to jobs, quotes, or invoices fast.",
      rows: clients,
    },
    team: {
      kicker: "Team",
      title: "Crew availability and assignment decisions.",
      body: "Review worker fit, workload, region, and role before approving assignment work.",
      rows: team,
    },
    quotes: {
      kicker: "Quotes",
      title: "Quote follow-ups ready for approval.",
      body: "Open, edit, and approve quote follow-up actions from the hub.",
      rows: quotes,
    },
    invoices: {
      kicker: "Invoices",
      title: "Drafts, overdue reminders, and cashflow.",
      body: "Review invoice drafts and reminders before sending or opening full invoice controls.",
      rows: invoices,
    },
    proof: {
      kicker: "Proof-to-Paid",
      title: "Completed work into invoice-ready admin.",
      body: "Review job proof, completion context, notes, and invoice-readiness in one place.",
      rows: [...jobs.slice(0, 4), ...invoices.slice(0, 4)],
    },
    settings: {
      kicker: "Settings",
      title: "Business controls and guardrails.",
      body: "Review plans, roles, permissions, integrations, and owner safety controls.",
      rows: [
        ["Plan", "Billing", "Roles and owner controls", "Review"],
        ["MYOB", "Integration", "Accounting sync settings", "Review"],
        ["SMS", "Messages", "Credits and sending guardrails", "Review"],
        ["Security", "Permissions", "Team and role access", "Review"],
      ],
    },
  };

  const current = meta[page] || meta.dashboard;

  const commandSections = page === "dashboard"
    ? [
        ["AI approvals", "queue", actions.map((item) => [item.type, item.title, item.body, item.action]).slice(0, 4)],
        ["Jobs", "jobs", jobs.slice(0, 5)],
        ["Invoices", "invoices", invoices.slice(0, 5)],
        ["Quotes", "quotes", quotes.slice(0, 4)],
        ["Team", "team", team.slice(0, 4)],
        ["Clients", "clients", clients.slice(0, 4)],
      ]
    : [[current.kicker, page, current.rows]];

  function openCommand(selection) {
    setSelectedRecord(selection);
  }

  function logCommand(type, title, status) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setApprovalLog((currentLog) => {
      const nextLog = [{ type, title, status, time }, ...currentLog].slice(0, 8);
      saveOwnerCommandLog(nextLog);
      return nextLog;
    });
  }

  function saveDraft(selection, draft) {
    logCommand("Edited", draft.title, "Saved in hub");
    setSelectedRecord({
      ...selection,
      item: [selection.group || "Owner edit", draft.title, draft.ownerNote || draft.detail, "Saved"],
      recommendation: "Your edit has been saved in the command log for this session. Use Open workspace for deeper backend edits if needed.",
    });
  }

  function approveSelection(selection, draft) {
    setApproved((currentApproved) => ({ ...currentApproved, [draft.title]: true }));
    logCommand(selection.group || "Approved", draft.title, "Approved");
    setSelectedRecord({
      ...selection,
      item: [selection.group || "Owner approval", `${draft.title} approved`, draft.ownerNote || draft.detail, "Approved"],
      recommendation: "Approved in the Owner Command Hub. Next backend wiring can connect each approval type to its exact database action.",
    });
  }

  function switchPage(nextPage) {
    setPage(nextPage);
    window.history.pushState({}, "", workspacePathForPage(nextPage));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  return (
    <section className="cx-workspace cx-owner-command-shell">
      <section className="cx-work-hero cx-owner-command-hero">
        <div>
          <span>{current.kicker}</span>
          <h1>{current.title}</h1>
          <p>{current.body}</p>
        </div>

        <aside>
          <span>AI Operator</span>
          <strong>{actions.length} ready</strong>
          <p>Approve/edit from this page first. Open full workspaces only when needed.</p>
          <button type="button" onClick={() => switchPage("queue")}>Review AI queue</button>
        </aside>
      </section>

      <section className="cx-owner-command-strip">
        <article>
          <span>Approve</span>
          <strong>AI actions, job decisions, invoice drafts</strong>
        </article>
        <article>
          <span>Edit</span>
          <strong>Notes, customer messages, status wording</strong>
        </article>
        <article>
          <span>Navigate</span>
          <strong>Jobs, clients, team, quotes, invoices from one hub</strong>
        </article>
      </section>

      <section className="cx-workspace-command-bar cx-owner-command-tabs">
        {[
          ["Smart Hub", "dashboard"],
          ["AI Queue", "queue"],
          ["Jobs", "jobs"],
          ["Clients", "clients"],
          ["Team", "team"],
          ["Quotes", "quotes"],
          ["Invoices", "invoices"],
          ["Proof-to-Paid", "proof"],
          ["Settings", "settings"],
        ].map(([label, nextPage]) => (
          <button
            type="button"
            key={label}
            className={page === nextPage ? "active" : ""}
            onClick={() => switchPage(nextPage)}
          >
            {label}
          </button>
        ))}
      </section>

      <section className="cx-stats">
        <Stat label="Jobs today" value={stats.jobsToday || String(jobs.length)} note="tap jobs below to inspect" />
        <Stat label="Ready to invoice" value={stats.readyToInvoice || "$0"} note="drafts and reminders" />
        <Stat label="Open quotes" value={stats.openQuotes || String(quotes.length)} note="follow-ups watched" />
        <Stat label="Crew online" value={stats.crewOnline || String(team.length)} note="assignment context" />
      </section>

      <section className="cx-owner-command-layout">
        <section className="cx-owner-command-main">
          {(page === "dashboard" || page === "queue") ? (
            <section className="cx-owner-queue">
              <header>
                <div>
                  <span>Approval lane</span>
                  <h2>AI-prepared actions</h2>
                </div>
                <button type="button" onClick={() => switchPage("queue")}>Open queue</button>
              </header>

              <div className="cx-owner-queue-grid">
                {actions.map((item) => {
                  const isApproved = approved[item.title];

                  return (
                    <article className={`cx-work-action ${item.tone || "blue"}`} key={item.title}>
                      <span>{item.type}</span>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                      {isApproved ? <small className="cx-approved-note">Approved in this hub</small> : null}
                      <div>
                        <button
                          type="button"
                          onClick={() => openCommand({
                            item: [item.type, item.title, item.body, item.action],
                            page: "queue",
                            group: item.type,
                            label: item.title,
                            recommendation: "Check the AI reason, edit the message or note, then approve only when it looks right.",
                          })}
                        >
                          Details / edit
                        </button>
                        <button
                          type="button"
                          className="approve"
                          onClick={() => approveSelection({
                            item: [item.type, item.title, item.body, item.action],
                            page: "queue",
                            group: item.type,
                          }, {
                            title: item.title,
                            detail: item.body,
                            ownerNote: "",
                          })}
                        >
                          {isApproved ? "Approved" : item.action}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          {commandSections.map(([group, sectionPage, rows]) => (
            <section className="cx-panel cx-owner-section" key={`${group}-${sectionPage}`}>
              <header>
                <div>
                  <span>{group}</span>
                  <h2>{sectionPage === "queue" ? "Prepared actions" : "Open, edit, approve"}</h2>
                </div>
                <button type="button" onClick={() => switchPage(sectionPage)}>View all</button>
              </header>

              <div className="cx-command-list">
                {rows.length ? rows.map((item, index) => (
                  <OwnerCommandRow
                    item={item}
                    index={index}
                    page={sectionPage}
                    group={group}
                    onOpen={openCommand}
                    key={`${group}-${index}-${Array.isArray(item) ? item.join("-") : item?.id || item?._id || item?.title || index}`}
                  />
                )) : <small>No records here yet.</small>}
              </div>
            </section>
          ))}
        </section>

        <aside className="cx-owner-command-side">
          <section className="cx-panel">
            <header>
              <div>
                <span>Owner controls</span>
                <h2>Quick actions</h2>
              </div>
            </header>

            <div className="cx-owner-quick-buttons">
              {[
                ["New job", "jobs"],
                ["Add client", "clients"],
                ["Assign worker", "team"],
                ["New quote", "quotes"],
                ["New invoice", "invoices"],
                ["Proof-to-Paid", "proof"],
              ].map(([label, nextPage]) => (
                <button type="button" key={label} onClick={() => switchPage(nextPage)}>
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="cx-panel cx-owner-log">
            <header>
              <div>
                <span>Command log</span>
                <h2>Recent edits / approvals</h2>
              </div>
              {approvalLog.length ? (
                <button
                  type="button"
                  onClick={() => {
                    saveOwnerCommandLog([]);
                    setApprovalLog([]);
                  }}
                >
                  Clear
                </button>
              ) : null}
            </header>

            <div>
              {approvalLog.length ? approvalLog.map((item) => (
                <article key={`${item.time}-${item.title}`}>
                  <span>{item.time}</span>
                  <strong>{item.type}</strong>
                  <small>{item.title}</small>
                  <b>{item.status}</b>
                </article>
              )) : <p>No owner approvals yet this session.</p>}
            </div>
          </section>
        </aside>
      </section>

      <OwnerCommandModal
        selection={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onSaveDraft={saveDraft}
        onApprove={approveSelection}
        setPage={setPage}
      />
    </section>
  );
}


export default function ChurvoxAIShell() {
  const [authed, setAuthed] = useState(hasSavedLogin);
  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const mapPathToPage = () => {
      const path = window.location.pathname.replace(/\/+$/, "") || "/";
      const map = {
        "/": "public",
        "/login": "login",
        "/signup": "signup",
        "/register": "signup",
        "/dashboard": "dashboard",
        "/smart-hub": "dashboard",
        "/ai-approvals": "queue",
        "/jobs": "jobs",
        "/clients": "clients",
        "/team": "team",
        "/quotes": "quotes",
        "/invoices": "invoices",
        "/proof-to-paid": "proof",
        "/settings": "settings",
      };

      const next = map[path] || "dashboard";
      if (next === "login" || next === "signup") setAuthMode(next);
      if (!["public", "login", "signup"].includes(next)) setPage(next);
    };

    mapPathToPage();
    window.addEventListener("popstate", mapPathToPage);
    return () => window.removeEventListener("popstate", mapPathToPage);
  }, []);

  useEffect(() => {
    if (!authed) return;
    const nextPath = APP_PATHS[page] || "/dashboard";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  }, [authed, page]);

  const liveData = useLiveChurvoxData(authed);
  const showPublic = useMemo(() => !authed, [authed]);

  function onLogin() {
    setAuthed(true);
    setPage("dashboard");
    window.history.pushState({}, "", "/dashboard");
  }

  function onLogout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("churvox_user");
      localStorage.removeItem("churvox_role");
      localStorage.removeItem("churvox_email");
    } catch {
      // ignore
    }
    setAuthed(false);
    setAuthMode("login");
    window.history.pushState({}, "", "/");
  }

  if (showPublic) {
    return <Landing authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />;
  }

  return <Shell page={page} setPage={setPage} onLogout={onLogout} data={liveData} />;
}
