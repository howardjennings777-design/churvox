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
  queue: "/dashboard",
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


async function apiPost(path, body) {
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
          {["Smart Hub", "Owner approvals", "Jobs", "Clients", "Team", "Quotes", "Invoices", "Proof-to-Paid", "Worker App", "Settings"].map((feature) => (
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

          <button type="button" className="cx-top-primary" onClick={() => setPage("jobs")}>
            Open jobs
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
        <button type="button" onClick={() => setPage("dashboard")}>Open Smart Hub</button>
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

      <section className={`cx-stats ${page === "dashboard" ? "cx-hide-on-smart-hub" : ""}`}>
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


const SMART_HUB_ITEM_STATUS_KEY = "churvox_smart_hub_item_status";

function readSmartHubItemStatus() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SMART_HUB_ITEM_STATUS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveSmartHubItemStatus(items) {
  try {
    localStorage.setItem(SMART_HUB_ITEM_STATUS_KEY, JSON.stringify(items || {}));
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
    item?.subject,
    item?.job_title,
    item?.name,
    item?.client_name,
    item?.customer_name,
    item?.quote_number,
    item?.invoice_number,
    item?.email,
    item?.kind,
    `${fallback} ${index + 1}`
  );

  const detail = textValue(
    item?.message,
    item?.body,
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
    queue: "/dashboard",
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
          <button type="button" aria-label="Close Smart Hub pop-up" onClick={onClose}>×</button>
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


function SmartHubBoxModal({
  box,
  rows = [],
  approved = {},
  onClose,
  onOpen,
  onApprove,
  onSnooze,
  onDismiss,
  onResolve,
  onCopyMessage,
  onMarkReady,
  onMarkSent,
  onOpenFull,
}) {
  const [editingSelection, setEditingSelection] = useState(null);
  const [editingDraft, setEditingDraft] = useState({
    title: "",
    detail: "",
    status: "",
    ownerNote: "",
    customerMessage: "",
  });

  useEffect(() => {
    if (!box) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;

      if (editingSelection) {
        setEditingSelection(null);
        return;
      }

      onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [box, editingSelection, onClose]);

  if (!box) return null;

  const workspaceForBox = {
    approvals: "dashboard",
    fix: "dashboard",
    invoice: "invoices",
    messages: "quotes",
    work: "jobs",
    collect: "invoices",
    quotes: "quotes",
    crew: "team",
    setup: "settings",
  }[box.key] || "dashboard";

  const intro = {
    approvals: "Churvox prepared these actions for your review. Edit first if needed, then approve.",
    fix: "These are blockers or missing details that may slow the day down.",
    invoice: "Completed work and draft invoices that can turn into money.",
    messages: "Customer follow-ups and reminders prepared for review.",
    work: "Jobs and invoice work worth checking today.",
    collect: "Unpaid or overdue invoices that need follow-up.",
    quotes: "Open quotes and follow-ups that may need a nudge.",
    crew: "Worker capacity and team records available for assignment.",
    setup: "These setup checks help Churvox make better AI decisions for your business.",
  }[box.key] || "Review the items Churvox found.";

  function riskFor(row) {
    const text = `${row.lead} ${row.title} ${row.detail} ${row.status}`.toLowerCase();
    if (text.includes("missing") || text.includes("failed")) return "Missing info";
    if (text.includes("overdue") || text.includes("unassigned") || text.includes("block")) return "Urgent";
    if (text.includes("draft") || text.includes("ready") || text.includes("complete")) return "Ready";
    return "Needs owner check";
  }

  function riskClassFor(row) {
    const risk = riskFor(row).toLowerCase();
    if (risk.includes("urgent")) return "urgent";
    if (risk.includes("missing")) return "missing";
    if (risk.includes("ready")) return "ready";
    return "check";
  }

  function reasonFor(row) {
    const text = `${row.lead} ${row.title} ${row.detail} ${row.status}`.toLowerCase();

    if (text.includes("unassigned")) return "AI found work that has not been assigned to a worker yet.";
    if (text.includes("invoice") || text.includes("completed job")) return "AI found completed or draft invoice work that may be ready for owner approval.";
    if (text.includes("quote")) return "AI found a quote or follow-up that may need attention.";
    if (text.includes("payment") || text.includes("overdue") || text.includes("collect")) return "AI found unpaid or overdue money that may need a reminder.";
    if (text.includes("worker") || text.includes("crew")) return "AI found team capacity or worker context that may help with assignment.";
    if (text.includes("setup") || text.includes("business settings") || text.includes("import")) return "AI found setup details that will improve recommendations and reduce manual admin.";
    if (text.includes("message") || text.includes("follow")) return "AI prepared communication for review before anything is sent.";

    return "AI surfaced this because it may need an owner decision.";
  }

  function primaryActionLabel(row) {
    const text = `${box.key} ${row.lead} ${row.title} ${row.detail} ${row.status}`.toLowerCase();

    if (box.key === "setup") return "Fix setup";
    if (box.key === "fix") return "Fix now";
    if (box.key === "invoice") return "Approve invoice";
    if (box.key === "messages") return "Approve message";
    if (box.key === "collect") return "Prepare reminder";
    if (box.key === "quotes") return "Follow up";
    if (box.key === "crew") return "Review worker";
    if (box.key === "work") return "Review work";

    if (text.includes("worker") || text.includes("assign")) return "Approve worker";
    if (text.includes("invoice")) return "Approve invoice";
    if (text.includes("quote")) return "Approve follow-up";
    if (text.includes("payment") || text.includes("overdue")) return "Approve reminder";

    return "Approve";
  }

  function fullRecordLabel() {
    if (workspaceForBox === "jobs") return "Open jobs";
    if (workspaceForBox === "invoices") return "Open invoices";
    if (workspaceForBox === "quotes") return "Open quotes";
    if (workspaceForBox === "team") return "Open team";
    if (workspaceForBox === "settings") return "Open settings";
    return "Open Smart Hub";
  }

  function canResolveBox() {
    return box.key === "fix" || box.key === "setup" || box.key === "work";
  }

  function resolveLabel() {
    if (box.key === "setup") return "Mark improved";
    if (box.key === "work") return "Mark reviewed";
    return "Mark resolved";
  }

  function isMessageBox() {
    return box.key === "messages";
  }

  function messageArea(item) {
    return item?.source_area === "send" ? "send" : "approved";
  }

  function modalEmptyTitle() {
    if (box.key === "approvals") return "No approvals waiting.";
    if (box.key === "fix") return "No blockers right now.";
    if (box.key === "invoice") return "No invoice-ready work right now.";
    if (box.key === "messages") return "No messages ready right now.";
    if (box.key === "collect") return "No collection actions right now.";
    if (box.key === "setup") return "Setup is looking good.";
    return "Nothing here right now.";
  }

  function modalEmptyBody() {
    if (box.key === "setup") return "Churvox will keep checking setup details as the business grows.";
    return "Everything in this box is handled, snoozed, or dismissed for this session.";
  }

  function startEdit(selection) {
    const row = rowText(selection?.item, 0, selection?.label || "Smart Hub item");
    setEditingSelection(selection);
    setEditingDraft({
      title: row.title,
      detail: row.detail,
      status: row.status,
      ownerNote: "",
      customerMessage: "",
    });
  }

  function updateEditingDraft(key, value) {
    setEditingDraft((current) => ({ ...current, [key]: value }));
  }

  function approveEditedSelection() {
    if (!editingSelection) return;
    onApprove(editingSelection, editingDraft);
    setEditingSelection(null);
  }

  return (
    <div className="cx-smart-modal-backdrop" onClick={onClose}>
      <section
        className="cx-smart-modal"
        role="dialog"
        aria-modal="true"
        aria-label={box.title}
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span>Smart Hub</span>
            <h2>{box.title}</h2>
            <p>{intro}</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <section className="cx-smart-modal-summary">
          <article>
            <span>Found</span>
            <strong>{box.count}</strong>
            <small>{box.label}</small>
          </article>
          <article>
            <span>Mode</span>
            <strong>Review</strong>
            <small>Owner approves first</small>
          </article>
          <article>
            <span>Safety</span>
            <strong>No auto-send</strong>
            <small>You stay in control</small>
          </article>
        </section>

        <section className="cx-smart-modal-list">
          {rows.length ? rows.map((item, index) => {
            const row = rowText(item, index, box.title);
            const actionGroup = box.key === "approvals"
              ? row.lead
              : box.key === "invoice"
                ? "Invoice"
                : box.key === "collect"
                  ? "Cashflow"
                  : box.key === "quotes"
                    ? "Quote"
                    : box.key === "messages"
                      ? "Message"
                      : box.title;

            const selection = {
              item,
              page: workspaceForBox,
              group: actionGroup,
              hubBoxKey: box.key,
              label: row.title,
              recommendation: reasonFor(row),
            };
            const isApproved = approved[row.title];

            return (
              <article className="cx-smart-modal-item" key={`${box.key}-${index}-${row.title}`}>
                <div>
                  <span>{row.lead}</span>
                  <h3>{row.title}</h3>
                  <p>{row.detail}</p>
                  <div className="cx-smart-modal-tags">
                    <b className={`risk-${riskClassFor(row)}`}>{riskFor(row)}</b>
                    <small>{row.status}</small>
                    {isApproved ? <small>Approved</small> : null}
                  </div>
                </div>

                <aside>
                  <strong>Why AI found this</strong>
                  <p>{reasonFor(row)}</p>
                  <div>
                    <button type="button" onClick={() => startEdit(selection)}>Details / edit</button>
                    <button
                      type="button"
                      className="approve"
                      onClick={() => onApprove(selection, {
                        title: row.title,
                        detail: row.detail,
                        status: row.status,
                        ownerNote: "",
                      })}
                    >
                      {isApproved ? "Approved" : primaryActionLabel(row)}
                    </button>
                    {canResolveBox() ? (
                      <button type="button" className="resolve" onClick={() => onResolve(box, item)}>
                        {resolveLabel()}
                      </button>
                    ) : null}
                    {isMessageBox() ? (
                      <>
                        <button type="button" className="message-action" onClick={() => onCopyMessage(item, messageArea(item))}>
                          Copy message
                        </button>
                        <button type="button" className="message-action" onClick={() => onMarkReady(item)}>
                          Mark ready
                        </button>
                        <button type="button" className="message-action" onClick={() => onMarkSent(item)}>
                          Mark sent
                        </button>
                      </>
                    ) : null}
                    <button type="button" onClick={() => onSnooze(box, item)}>Snooze</button>
                    <button type="button" onClick={() => onDismiss(box, item)}>Dismiss</button>
                    <button type="button" onClick={() => onOpenFull(workspaceForBox)}>{fullRecordLabel()}</button>
                  </div>
                </aside>
              </article>
            );
          }) : (
            <div className="cx-smart-modal-empty">
              <h3>{modalEmptyTitle()}</h3>
              <p>{modalEmptyBody()}</p>
            </div>
          )}
        </section>

        {editingSelection ? (
          <section className="cx-smart-modal-edit">
            <header>
              <div>
                <span>Edit before approval</span>
                <h3>{editingDraft.title}</h3>
                <p>Adjust the title, note, or message before Churvox saves the approval.</p>
              </div>
              <button type="button" onClick={() => setEditingSelection(null)}>Close edit</button>
            </header>

            <div>
              <label>
                Title / summary
                <input
                  value={editingDraft.title}
                  onChange={(event) => updateEditingDraft("title", event.target.value)}
                />
              </label>

              <label>
                Status
                <input
                  value={editingDraft.status}
                  onChange={(event) => updateEditingDraft("status", event.target.value)}
                />
              </label>

              <label className="wide">
                AI context / detail
                <textarea
                  value={editingDraft.detail}
                  onChange={(event) => updateEditingDraft("detail", event.target.value)}
                />
              </label>

              <label className="wide">
                Owner note
                <textarea
                  value={editingDraft.ownerNote}
                  onChange={(event) => updateEditingDraft("ownerNote", event.target.value)}
                  placeholder="Add your instruction or internal decision note..."
                />
              </label>

              <label className="wide">
                Customer / worker message
                <textarea
                  value={editingDraft.customerMessage}
                  onChange={(event) => updateEditingDraft("customerMessage", event.target.value)}
                  placeholder="Edit the message before anything is marked ready..."
                />
              </label>
            </div>

            <footer>
              <button type="button" onClick={() => setEditingSelection(null)}>Cancel</button>
              <button type="button" onClick={() => onOpen(editingSelection)}>Open full editor</button>
              <button type="button" className="approve" onClick={approveEditedSelection}>
                Approve edited action
              </button>
            </footer>
          </section>
        ) : null}
      </section>
    </div>
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
  const [backendApprovalLog, setBackendApprovalLog] = useState([]);
  const [backendApprovalStatus, setBackendApprovalStatus] = useState("");
  const [approvedDrafts, setApprovedDrafts] = useState([]);
  const [approvedDraftsStatus, setApprovedDraftsStatus] = useState("");
  const [sendCenterItems, setSendCenterItems] = useState([]);
  const [sendCenterStatus, setSendCenterStatus] = useState("");
  const [hubFocus, setHubFocus] = useState("");
  const [selectedHubBox, setSelectedHubBox] = useState(null);
  const [hubItemStatus, setHubItemStatus] = useState(() => readSmartHubItemStatus());
  const [hubNotice, setHubNotice] = useState(null);

  const meta = {
    dashboard: {
      kicker: "Smart Hub",
      title: "Your business at a glance.",
      body: data?.loading
        ? "Syncing live Churvox data..."
        : data?.error || "AI sorts the day into approvals, blockers, invoices, messages, cashflow, quotes and crew.",
      rows: jobs,
    },
    queue: {
      kicker: "Smart Hub",
      title: "Approvals live inside Smart Hub.",
      body: "Use the To approve box on Smart Hub to review AI-prepared actions.",
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

  useEffect(() => {
    saveSmartHubItemStatus(hubItemStatus);
  }, [hubItemStatus]);

  useEffect(() => {
    if (!hubNotice) return undefined;
    const timer = window.setTimeout(() => setHubNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [hubNotice]);

  useEffect(() => {
    let cancelled = false;

    async function loadBackendApprovals() {
      try {
        setBackendApprovalStatus("Loading saved approvals...");
        const payload = await apiGet("/ai/owner-command/approvals");
        const approvals = Array.isArray(payload?.approvals) ? payload.approvals : [];
        if (!cancelled) {
          setBackendApprovalLog(approvals.slice(0, 12));
          setBackendApprovalStatus(approvals.length ? "Saved approvals loaded" : "No saved approvals yet");
        }
      } catch (err) {
        if (!cancelled) {
          setBackendApprovalStatus("Saved approvals could not load yet");
        }
      }
    }

    async function loadApprovedDrafts() {
      try {
        setApprovedDraftsStatus("Loading approved drafts...");
        const payload = await apiGet("/ai/owner-command/approved-drafts");
        const drafts = Array.isArray(payload?.drafts) ? payload.drafts : [];
        if (!cancelled) {
          setApprovedDrafts(drafts.slice(0, 10));
          setApprovedDraftsStatus(drafts.length ? "Approved drafts ready" : "No approved drafts yet");
        }
      } catch (err) {
        if (!cancelled) {
          setApprovedDraftsStatus("Approved drafts could not load yet");
        }
      }
    }

    async function loadSendCenter() {
      try {
        setSendCenterStatus("Loading ready-to-send drafts...");
        const payload = await apiGet("/ai/owner-command/send-center");
        const items = Array.isArray(payload?.items) ? payload.items : [];
        if (!cancelled) {
          setSendCenterItems(items.slice(0, 10));
          setSendCenterStatus(items.length ? "Ready-to-send drafts loaded" : "No drafts ready to send");
        }
      } catch (err) {
        if (!cancelled) {
          setSendCenterStatus("Send Center could not load yet");
        }
      }
    }

    loadBackendApprovals();
    loadApprovedDrafts();
    loadSendCenter();

    return () => {
      cancelled = true;
    };
  }, []);


  const todayRows = [
    ...jobs.slice(0, 3),
    ...invoices.slice(0, 2),
  ];

  const preparedMessageRows = [
    ...sendCenterItems.map((item) => ({
      ...item,
      type: item.kind || item.type || "Ready message",
      title: item.client_name || item.customer_name || item.title || "Client message",
      message: item.message || item.body || item.title || "Ready to send",
      status: item.send_status || item.status || "ready_to_send",
      source_area: "send",
    })),
    ...approvedDrafts.map((item) => ({
      ...item,
      type: item.kind || item.type || "Approved draft",
      title: item.client_name || item.customer_name || item.title || "Client message",
      message: item.message || item.body || item.title || "Approved draft",
      status: item.send_status || item.status || "not_sent",
      source_area: "approved",
    })),
  ].slice(0, 6);

  const completedJobs = jobs.filter((job) => {
    const status = String(job?.status || job?.job_status || job?.workflow_status || "").toLowerCase();
    return status.includes("complete") || status.includes("done") || job?.completed === true || Boolean(job?.completed_at);
  });

  const invoicedJobIds = new Set(
    invoices
      .map((invoice) => String(invoice?.job_id || invoice?.source_job_id || invoice?.ai_source_job_id || ""))
      .filter(Boolean)
  );

  const completedJobsReadyToInvoice = completedJobs
    .filter((job) => {
      const jobId = String(job?._id || job?.id || job?.job_id || "");
      return !jobId || !invoicedJobIds.has(jobId);
    })
    .map((job) => [
      "Completed job",
      job?.title || job?.name || job?.client_name || "Completed job",
      job?.address || job?.description || "Ready for invoice review",
      "Create invoice",
    ]);

  const draftInvoiceRows = invoices
    .filter((invoice) => /draft|ready|pending/i.test(String(invoice?.status || invoice?.invoice_status || invoice?.payment_status || "")))
    .map((invoice) => [
      "Invoice draft",
      invoice?.client_name || invoice?.customer_name || invoice?.title || "Draft invoice",
      invoice?.description || invoice?.notes || "Draft invoice ready for review",
      invoice?.status || invoice?.invoice_status || "draft",
    ]);

  const readyInvoiceRows = [
    ...completedJobsReadyToInvoice,
    ...draftInvoiceRows,
  ].slice(0, 6);

  const unassignedJobRows = jobs
    .filter((job) => {
      const status = String(job?.status || job?.job_status || job?.workflow_status || "").toLowerCase();
      const done = status.includes("complete") || status.includes("cancel");
      const assigned = job?.assigned_worker_id || job?.worker_id || job?.assigned_worker || job?.assigned_worker_name;
      return !done && !assigned;
    })
    .map((job) => [
      "Unassigned job",
      job?.title || job?.name || job?.client_name || "Job needs worker",
      job?.address || job?.description || "No worker assigned yet",
      "Assign",
    ]);

  const brokenInvoiceRows = invoices
    .filter((invoice) => {
      const hasClient = invoice?.client_name || invoice?.customer_name || invoice?.client_id || invoice?.customer_id;
      const hasAmount = Number(invoice?.total || invoice?.amount || invoice?.balance || 0) > 0;
      return !hasClient || !hasAmount;
    })
    .map((invoice) => [
      "Invoice issue",
      invoice?.title || invoice?.client_name || "Invoice needs checking",
      !invoice?.client_name && !invoice?.customer_name ? "Missing client details" : "Missing amount or balance",
      "Fix",
    ]);

  const aiBlockerRows = actions
    .filter((item) => {
      const type = String(item.type || "").toLowerCase();
      return type.includes("dispatch") || type.includes("cashflow") || type.includes("payment") || type.includes("overdue");
    })
    .map((item) => [item.type, item.title, item.body, item.action]);

  const attentionRows = [
    ...unassignedJobRows,
    ...brokenInvoiceRows,
    ...aiBlockerRows,
  ].slice(0, 6);

  const collectRows = invoices
    .filter((invoice) => /overdue|unpaid|late/i.test(String(invoice?.status || invoice?.invoice_status || invoice?.payment_status || "")) || Number(invoice?.balance || 0) > 0)
    .slice(0, 6);

  const quoteRows = quotes
    .filter((quote) => /sent|pending|open|follow/i.test(String(quote?.status || quote?.quote_status || quote?.state || "")))
    .slice(0, 6);

  const crewRows = team.slice(0, 6);

  const setupRows = [
    clients.length ? null : ["Setup", "Import or add clients", "Clients help AI connect jobs, quotes and invoices.", "Missing info"],
    team.length ? null : ["Setup", "Add workers", "Workers let AI recommend job assignments.", "Missing info"],
    jobs.length ? null : ["Setup", "Create first job", "Jobs are the centre of the daily Smart Hub workflow.", "Missing info"],
    invoices.length ? null : ["Setup", "Set invoice details", "Invoice settings help AI prepare clean drafts.", "Needs owner check"],
    quotes.length ? null : ["Setup", "Create or import quotes", "Quotes allow AI to prepare follow-ups.", "Needs owner check"],
    ["Setup", "Review business settings", "Check business details, roles, SMS, MYOB and invoice preferences.", "Review"],
  ].filter(Boolean).slice(0, 6);

  const setupCompleteChecks = [
    clients.length > 0,
    team.length > 0,
    jobs.length > 0,
    invoices.length > 0,
    quotes.length > 0,
  ];

  const setupScore = Math.round((setupCompleteChecks.filter(Boolean).length / setupCompleteChecks.length) * 100);

  const moneyToCollect = collectRows.reduce((sum, invoice) => {
    const raw = invoice?.balance || invoice?.total || invoice?.amount || 0;
    const value = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.-]/g, ""));
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const moneyToCollectLabel = moneyToCollect > 0
    ? new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(moneyToCollect)
    : String(collectRows.length);

  const baseHubBoxes = [
    {
      key: "approvals",
      count: actions.length,
      label: "to approve",
      title: "To approve",
      body: "AI-prepared actions waiting for your decision.",
      action: "Open",
    },
    {
      key: "fix",
      count: attentionRows.length,
      label: "to fix",
      title: "Needs attention",
      body: "Unassigned jobs, invoice issues, overdue items, or cashflow blockers.",
      action: "Check",
    },
    {
      key: "invoice",
      count: readyInvoiceRows.length,
      label: "ready",
      title: "Ready to invoice",
      body: "Completed jobs and draft invoices that can turn into money.",
      action: "Review",
    },
    {
      key: "messages",
      count: preparedMessageRows.length,
      label: "messages",
      title: "Messages ready",
      body: "Quote follow-ups and reminders ready to copy or mark sent.",
      action: "View",
    },
    {
      key: "work",
      count: todayRows.length,
      label: "today",
      title: "Today’s work",
      body: "Jobs and invoices worth checking today.",
      action: "Review",
    },
    {
      key: "collect",
      count: moneyToCollectLabel,
      label: "to collect",
      title: "Money to collect",
      body: "Unpaid or overdue invoices that need attention.",
      action: "Collect",
    },
    {
      key: "quotes",
      count: quoteRows.length,
      label: "waiting",
      title: "Quotes waiting",
      body: "Open quotes and follow-ups that may need a nudge.",
      action: "Open",
    },
    {
      key: "crew",
      count: crewRows.length,
      label: "active",
      title: "Crew active",
      body: "Workers and team records available for assignment.",
      action: "View",
    },
  ];

  const setupHealthBox = {
    key: "setup",
    count: `${setupScore}%`,
    label: "complete",
    title: "Setup health",
    body: "Business setup checks that improve AI recommendations.",
    action: "Improve",
  };

  const hubBoxes = setupScore < 100
    ? [...baseHubBoxes, setupHealthBox]
    : baseHubBoxes;


  function hubRemainingCount(key) {
    return hubRowsForKey(key).filter((item) => {
      const status = hubItemStatus[hubItemKey(key, item)];
      return status !== "approved" && status !== "snoozed" && status !== "dismissed" && status !== "resolved";
    }).length;
  }

  const remainingApprovals = hubRemainingCount("approvals");
  const remainingAttention = hubRemainingCount("fix");
  const remainingInvoices = hubRemainingCount("invoice");
  const remainingMessages = hubRemainingCount("messages");
  const remainingCollect = hubRemainingCount("collect");

  const dailyBriefItems = [
    remainingApprovals ? `${remainingApprovals} approval${remainingApprovals === 1 ? "" : "s"}` : "",
    remainingAttention ? `${remainingAttention} blocker${remainingAttention === 1 ? "" : "s"}` : "",
    remainingInvoices ? `${remainingInvoices} ready to invoice` : "",
    remainingMessages ? `${remainingMessages} message${remainingMessages === 1 ? "" : "s"} ready` : "",
    remainingCollect ? `${moneyToCollectLabel} to collect` : "",
  ].filter(Boolean);

  const dailyBriefText = data?.loading
    ? "Churvox is checking today’s jobs, invoices, quotes, messages and crew."
    : data?.error
      ? data.error
      : dailyBriefItems.length
        ? `Churvox found ${dailyBriefItems.join(", ")}. Review the boxes below when you are ready.`
        : "Churvox has checked the workspace. Nothing urgent needs approval right now.";

  const topBriefBox = [
    "approvals",
    "fix",
    "invoice",
    "messages",
    "collect",
    "work",
    "quotes",
    "crew",
    "setup",
  ]
    .map((key) => hubBoxes.find((box) => box.key === key))
    .filter(Boolean)
    .find((box) => {
      if (box.key === "collect") return hubRemainingCount("collect") > 0;
      if (box.key === "setup") return setupScore < 100;
      return hubRemainingCount(box.key) > 0;
    }) || hubBoxes[0];


  const commandSections = page === "dashboard"
    ? hubFocus === "messages"
      ? [["Messages ready", "quotes", preparedMessageRows]]
      : hubFocus === "fix"
        ? [["Needs attention", "queue", attentionRows]]
        : hubFocus === "work"
          ? [["Today’s work", "jobs", todayRows.slice(0, 5)]]
          : hubFocus === "invoice"
            ? [["Ready to invoice", "invoices", readyInvoiceRows]]
            : hubFocus === "collect"
              ? [["Money to collect", "invoices", collectRows]]
              : hubFocus === "quotes"
                ? [["Quotes waiting", "quotes", quoteRows]]
                : hubFocus === "crew"
                  ? [["Crew active", "team", crewRows]]
                  : []
    : page === "queue"
      ? []
      : [[current.kicker, page, current.rows]];



  function hubItemKey(boxKey, item) {
    const row = rowText(item, 0, boxKey || "Smart Hub");
    const rawId = item?.id || item?._id || item?.draft_id || item?.invoice_number || item?.quote_number || "";
    return `${boxKey || "hub"}::${rawId || row.lead}::${row.title}::${row.detail}`;
  }

  function hubRowsForKey(key) {
    if (key === "approvals") {
      return actions.map((item) => [item.type, item.title, item.body, item.action]);
    }
    if (key === "messages") return preparedMessageRows;
    if (key === "fix") return attentionRows;
    if (key === "work") return todayRows.slice(0, 5);
    if (key === "invoice") return readyInvoiceRows;
    if (key === "collect") return collectRows;
    if (key === "quotes") return quoteRows;
    if (key === "crew") return crewRows;
    if (key === "setup") return setupRows;
    return [];
  }


  function visibleHubCount(key, fallback) {
    if (key === "collect" && String(fallback || "").includes("$")) {
      return fallback;
    }
    if (key === "setup" && String(fallback || "").includes("%")) {
      return fallback;
    }

    return hubRowsForKey(key).filter((item) => {
      const status = hubItemStatus[hubItemKey(key, item)];
      return status !== "approved" && status !== "snoozed" && status !== "dismissed" && status !== "resolved";
    }).length;
  }

  function snoozeHubItem(box, item) {
    const row = rowText(item, 0, box?.title || "Smart Hub");
    const key = hubItemKey(box?.key || box?.title, item);
    setHubItemStatus((current) => ({ ...current, [key]: "snoozed" }));
    logCommand(box?.title || "Smart Hub", row.title, "Snoozed");
  }

  function dismissHubItem(box, item) {
    const row = rowText(item, 0, box?.title || "Smart Hub");
    const key = hubItemKey(box?.key || box?.title, item);
    setHubItemStatus((current) => ({ ...current, [key]: "dismissed" }));
    logCommand(box?.title || "Smart Hub", row.title, "Dismissed");
  }

  function resolveHubItem(box, item) {
    const row = rowText(item, 0, box?.title || "Smart Hub");
    const key = hubItemKey(box?.key || box?.title, item);
    setHubItemStatus((current) => ({ ...current, [key]: "resolved" }));
    logCommand(box?.title || "Smart Hub", row.title, box?.key === "setup" ? "Improved" : "Resolved");
  }

  function clearSmartHubSession() {
    setHubItemStatus({});
    saveSmartHubItemStatus({});
    saveOwnerCommandLog([]);
    setApprovalLog([]);
    logCommand("Smart Hub", "Session reset", "Cleared");
  }

  const selectedHubRows = selectedHubBox
    ? hubRowsForKey(selectedHubBox.key).filter((item) => {
        const status = hubItemStatus[hubItemKey(selectedHubBox.key, item)];
        return status !== "approved" && status !== "snoozed" && status !== "dismissed" && status !== "resolved";
      })
    : [];

  const recentDecisionItems = [
    ...backendApprovalLog.map((item, index) => ({
      id: item.id || item._id || `backend-${index}`,
      time: item.approved_at
        ? new Date(item.approved_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })
        : "Saved",
      type: item.type || "Approval",
      title: item.title || "Owner command approved",
      status: item.status || "saved",
    })),
    ...approvalLog.map((item, index) => ({
      id: `session-${index}-${item.time || ""}`,
      time: item.time || "Session",
      type: item.type || "Smart Hub",
      title: item.title || "Owner decision",
      status: item.status || "saved",
    })),
  ].slice(0, 6);

  function openCommand(selection) {
    setSelectedRecord(selection);
  }

  function pageForCommandType(type) {
    const text = String(type || "").toLowerCase();
    if (text.includes("invoice") || text.includes("cashflow") || text.includes("payment") || text.includes("collect")) return "invoices";
    if (text.includes("quote")) return "quotes";
    if (text.includes("dispatch") || text.includes("job") || text.includes("work")) return "jobs";
    if (text.includes("crew") || text.includes("worker") || text.includes("team")) return "team";
    if (text.includes("setup") || text.includes("setting")) return "settings";
    if (text.includes("message")) return "quotes";
    return "dashboard";
  }

  function logCommand(type, title, status) {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const targetPage = pageForCommandType(type);
    setHubNotice({ type, title, status, time, targetPage });
    setApprovalLog((currentLog) => {
      const nextLog = [{ type, title, status, time, targetPage }, ...currentLog].slice(0, 8);
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

  async function approveSelection(selection, draft) {
    const title = draft?.title || selection?.label || "Owner command approved";
    setApproved((currentApproved) => ({ ...currentApproved, [title]: true }));
    logCommand(selection.group || "Approved", title, "Saving...");

    try {
      const payload = {
        type: selection.group || "Owner command",
        group: selection.group || "Owner command",
        title,
        status: draft?.status || "approved",
        page: selection.page || page,
        draft: draft || {},
        selection: {
          label: selection.label,
          group: selection.group,
          page: selection.page,
          item: selection.item,
        },
      };

      const approvalType = String(selection.group || payload.type || "").toLowerCase();
      const isDispatchApproval = approvalType.includes("dispatch");
      const isInvoiceApproval = approvalType.includes("invoice");
      const isQuoteApproval = approvalType.includes("quote");
      const isCashflowApproval = approvalType.includes("cashflow") || approvalType.includes("payment") || approvalType.includes("overdue");

      const approvalPath = isDispatchApproval
        ? "/ai/owner-command/dispatch/approve"
        : isInvoiceApproval
          ? "/ai/owner-command/invoice/approve"
          : isQuoteApproval
            ? "/ai/owner-command/quote/approve"
            : isCashflowApproval
              ? "/ai/owner-command/cashflow/approve"
              : "/ai/owner-command/approve";

      const result = await apiPost(approvalPath, payload);

      logCommand(
        selection.group || "Approved",
        title,
        isDispatchApproval
          ? "Worker assigned"
          : isInvoiceApproval
            ? "Invoice draft created"
            : isQuoteApproval
              ? "Quote follow-up saved"
              : isCashflowApproval
                ? "Payment reminder saved"
                : "Saved to backend"
      );

      if (!selection?.fromSmartHubModal) {
        setSelectedRecord({
          ...selection,
          item: [
            selection.group || "Owner approval",
            `${title} approved`,
            result?.message || "Approval saved to backend.",
            "Backend saved",
          ],
          recommendation: String(selection.group || "").toLowerCase().includes("dispatch")
            ? "Dispatch approval completed. Churvox assigned a worker to an unassigned job and saved the owner approval."
            : String(selection.group || "").toLowerCase().includes("invoice")
              ? "Invoice approval completed. Churvox created or updated a draft invoice from a completed job."
              : String(selection.group || "").toLowerCase().includes("quote")
                ? "Quote approval completed. Churvox saved a follow-up draft. Nothing was sent automatically."
                : (String(selection.group || "").toLowerCase().includes("cashflow") || String(selection.group || "").toLowerCase().includes("payment") || String(selection.group || "").toLowerCase().includes("overdue"))
                  ? "Cashflow approval completed. Churvox saved a payment reminder draft. Nothing was sent automatically."
                  : "This approval is now saved on the backend.",
        });
      }

      return true;
    } catch (err) {
      logCommand(selection.group || "Approve failed", title, "Backend error");
      if (!selection?.fromSmartHubModal) {
        setSelectedRecord({
          ...selection,
          item: [
            selection.group || "Owner approval",
            `${title} needs attention`,
            err?.message || "Could not save approval to backend.",
            "Save failed",
          ],
          recommendation: "The front-end stayed safe, but the backend did not accept this approval. Check Render logs if this repeats.",
        });
      }

      return false;
    }
  }

  function switchPage(nextPage) {
    const safePage = nextPage === "queue" ? "dashboard" : nextPage;
    if (safePage !== "dashboard") setHubFocus("");
    setPage(safePage);
    window.history.pushState({}, "", workspacePathForPage(safePage));
    window.dispatchEvent(new PopStateEvent("popstate"));
  }

  async function markDraftReadyToSend(item) {
    const draftId = item?.id || item?._id || "";
    if (!draftId) {
      setApprovedDraftsStatus("Draft missing ID");
      return;
    }

    setApprovedDraftsStatus("Marking draft ready to send...");

    try {
      const result = await apiPost("/ai/owner-command/approved-drafts/ready", {
        draft_id: draftId,
        kind: item.kind || item.type || item.source_type,
      });

      setApprovedDrafts((current) => current.map((draft) => {
        const currentId = draft.id || draft._id;
        if (String(currentId) !== String(draftId)) return draft;
        return {
          ...draft,
          send_status: "ready_to_send",
          status: "ready_to_send",
          ready_to_send: true,
        };
      }));

      if (result?.approval) {
        setBackendApprovalLog((current) => [result.approval, ...current].slice(0, 12));
      }

      setSendCenterItems((current) => [
        {
          ...item,
          send_status: "ready_to_send",
          status: "ready_to_send",
        },
        ...current.filter((draft) => String(draft.id || draft._id) !== String(draftId)),
      ].slice(0, 10));

      setApprovedDraftsStatus(result?.message || "Draft marked ready to send");
      setSendCenterStatus("Ready-to-send drafts loaded");
    } catch (err) {
      setApprovedDraftsStatus(err?.message || "Could not mark draft ready to send");
    }
  }

  async function markDraftManuallySent(item) {
    const draftId = item?.id || item?._id || "";
    if (!draftId) {
      setSendCenterStatus("Draft missing ID");
      return;
    }

    setSendCenterStatus("Marking draft manually sent...");

    try {
      const result = await apiPost("/ai/owner-command/send-center/mark-sent", {
        draft_id: draftId,
        kind: item.kind || item.type || item.source_type,
      });

      setSendCenterItems((current) => current.filter((draft) => String(draft.id || draft._id) !== String(draftId)));

      if (result?.approval) {
        setBackendApprovalLog((current) => [result.approval, ...current].slice(0, 12));
      }

      setSendCenterStatus(result?.message || "Draft marked manually sent");
    } catch (err) {
      setSendCenterStatus(err?.message || "Could not mark draft sent");
    }
  }

  async function copyHubMessage(item, area = "approved") {
    const row = rowText(item, 0, "Message");
    await copyDraftMessage(item, area);
    logCommand("Messages ready", row.title, "Copied");
  }

  async function markHubMessageReady(item) {
    const row = rowText(item, 0, "Message");
    await markDraftReadyToSend(item);
    logCommand("Messages ready", row.title, "Marked ready");
  }

  async function markHubMessageSent(item) {
    const row = rowText(item, 0, "Message");
    await markDraftManuallySent(item);
    const key = hubItemKey("messages", item);
    setHubItemStatus((current) => ({ ...current, [key]: "resolved" }));
    logCommand("Messages ready", row.title, "Marked sent");
  }

  async function copyDraftMessage(item, area = "approved") {
    const message = String(item?.message || item?.title || "").trim();

    if (!message) {
      if (area === "send") setSendCenterStatus("No message to copy");
      else setApprovedDraftsStatus("No message to copy");
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = message;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "absolute";
        textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      if (area === "send") setSendCenterStatus("Message copied");
      else setApprovedDraftsStatus("Message copied");
    } catch (err) {
      if (area === "send") setSendCenterStatus("Could not copy message");
      else setApprovedDraftsStatus("Could not copy message");
    }
  }

  return (
    <section className="cx-workspace cx-owner-command-shell">
      <section className="cx-work-hero cx-owner-command-hero">
        <div className={page === "dashboard" ? "cx-smart-hero-copy" : ""}>
          {page === "dashboard" ? (
            <>
              <div className="cx-smart-hero-badge">
                <span>AI Operator</span>
                <b>Daily command brief</b>
              </div>
              <h1>
                AI has lined up
                <em> today’s decisions.</em>
              </h1>
              <p>Approve work, fix blockers, review messages, and keep the day moving from one simple board.</p>
              <div className="cx-smart-hero-pills">
                <small>Approval-first</small>
                <small>Nothing sends itself</small>
                <small>You stay in control</small>
              </div>
            </>
          ) : (
            <>
              <span>{current.kicker}</span>
              <h1>{current.title}</h1>
              <p>{current.body}</p>
            </>
          )}
        </div>

        {page !== "dashboard" ? (
          <aside>
            <span>AI Operator</span>
            <strong>{actions.length} ready</strong>
            <p>Approve/edit from this page first. Open full workspaces only when needed.</p>
            <button type="button" onClick={() => switchPage("dashboard")}>Open Smart Hub</button>
          </aside>
        ) : null}
      </section>

      {page === "dashboard" ? (
        <section className="cx-ai-daily-brief">
          <div>
            <span>AI Daily Brief</span>
            <h2>Churvox has checked the day.</h2>
            <p>{dailyBriefText}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setHubFocus("");
              setSelectedHubBox(topBriefBox);
            }}
          >
            Review first item
          </button>
        </section>
      ) : null}

      {page === "dashboard" && hubNotice ? (
        <section className="cx-smart-hub-notice">
          <div>
            <span>{hubNotice.type}</span>
            <strong>{hubNotice.title}</strong>
            <p>{hubNotice.status} · {hubNotice.time}</p>
          </div>
          <div className="cx-smart-hub-notice-actions">
            {hubNotice.targetPage && hubNotice.targetPage !== "dashboard" ? (
              <button
                type="button"
                onClick={() => {
                  const nextPage = hubNotice.targetPage;
                  setHubNotice(null);
                  switchPage(nextPage);
                }}
              >
                Open workspace
              </button>
            ) : null}
            <button type="button" onClick={() => setHubNotice(null)}>Dismiss</button>
          </div>
        </section>
      ) : null}

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

      <section className={`cx-workspace-command-bar cx-owner-command-tabs ${page === "dashboard" ? "cx-hide-on-smart-hub" : ""}`}>
        {[
          ["Smart Hub", "dashboard"],
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

      <section className={`cx-stats ${page === "dashboard" ? "cx-hide-on-smart-hub" : ""}`}>
        <Stat label="Jobs today" value={stats.jobsToday || String(jobs.length)} note="tap jobs below to inspect" />
        <Stat label="Ready to invoice" value={stats.readyToInvoice || "$0"} note="drafts and reminders" />
        <Stat label="Open quotes" value={stats.openQuotes || String(quotes.length)} note="follow-ups watched" />
        <Stat label="Crew online" value={stats.crewOnline || String(team.length)} note="assignment context" />
      </section>

      {page === "dashboard" ? (
        <section className="cx-hub-box-grid">
          {hubBoxes.map((box) => (
            <button
              type="button"
              key={box.key}
              className={`cx-hub-box cx-hub-box-${box.key} ${selectedHubBox?.key === box.key ? "active" : ""}`}
              onClick={() => {
                setHubFocus("");
                setSelectedHubBox({ ...box, count: visibleHubCount(box.key, box.count) });
              }}
            >
              <span>{box.title}</span>
              <strong className={String(visibleHubCount(box.key, box.count)).includes("$") ? "money" : ""}>{visibleHubCount(box.key, box.count)}</strong>
              <b>{box.label}</b>
              <small>{box.body}</small>
              <em>{box.action}</em>
            </button>
          ))}
        </section>
      ) : null}

      {page === "dashboard" && recentDecisionItems.length ? (
        <section className="cx-ai-decision-history">
          <header>
            <div>
              <span>Recent AI decisions</span>
              <h2>What Churvox has handled</h2>
              <p>Approvals, snoozes and dismissals appear here so the owner can see what changed.</p>
            </div>
            {approvalLog.length ? (
              <button
                type="button"
                onClick={clearSmartHubSession}
              >
                Reset handled items
              </button>
            ) : null}
          </header>

          <div>
            {recentDecisionItems.map((item) => (
              <article key={item.id}>
                <span>{item.time}</span>
                <strong>{item.type}</strong>
                <p>{item.title}</p>
                <b>{item.status}</b>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={`cx-owner-command-layout ${page === "dashboard" ? "cx-smart-hub-popup-only" : ""} ${page === "dashboard" && (!hubFocus || hubFocus === "fix" || hubFocus === "work") ? "cx-hub-single-column" : ""}`}>
        <section className="cx-owner-command-main">
          {((page === "dashboard" && hubFocus === "approvals") || page === "queue") ? (
            <section className="cx-owner-queue">
              <header>
                <div>
                  <span>Needs approval now</span>
                  <h2>Review these first</h2>
                </div>
                <button type="button" onClick={() => setHubFocus("approvals")}>Viewing</button>
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
                  <h2>
                    {group === "Today’s work"
                      ? "Jobs and invoices needing attention"
                      : sectionPage === "queue"
                        ? "Prepared actions"
                        : "Open, edit, approve"}
                  </h2>
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
          <section className={`cx-panel cx-owner-log cx-owner-prepared-messages ${page === "dashboard" && hubFocus !== "messages" ? "cx-hub-hidden-panel" : ""}`}>
            <header>
              <div>
                <span>Prepared messages</span>
                <h2>Messages waiting</h2>
                <p>
                  {sendCenterItems.length
                    ? sendCenterStatus
                    : approvedDrafts.length
                      ? approvedDraftsStatus
                      : "No prepared messages yet"}
                </p>
              </div>
              <button type="button" onClick={() => switchPage("quotes")}>
                Open quotes
              </button>
            </header>

            <div className="cx-prepared-message-group">
              {sendCenterItems.length ? (
                <>
                  <strong className="cx-prepared-message-heading">Ready to send</strong>
                  {sendCenterItems.slice(0, 4).map((item, index) => (
                    <article key={`${item.id || index}-${item.title}`}>
                      <span>{item.kind || "Ready draft"}</span>
                      <strong>{item.client_name || "Client"}</strong>
                      <small>{item.message || item.title || "Ready to send"}</small>
                      <b>{item.send_status || "ready_to_send"}</b>
                      <button
                        type="button"
                        className="cx-owner-draft-copy"
                        onClick={() => copyDraftMessage(item, "send")}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="cx-owner-draft-ready"
                        onClick={() => markDraftManuallySent(item)}
                      >
                        Mark sent
                      </button>
                    </article>
                  ))}
                </>
              ) : null}

              {approvedDrafts.length ? (
                <>
                  <strong className="cx-prepared-message-heading">Approved drafts</strong>
                  {approvedDrafts.slice(0, 4).map((item, index) => (
                    <article key={`${item.id || index}-${item.title}`}>
                      <span>{item.kind || "Draft"}</span>
                      <strong>{item.client_name || "Client"}</strong>
                      <small>{item.message || item.title || "Approved draft ready"}</small>
                      <b>{item.send_status || item.status || "not_sent"}</b>
                      <button
                        type="button"
                        className="cx-owner-draft-copy"
                        onClick={() => copyDraftMessage(item, "approved")}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        className="cx-owner-draft-ready"
                        onClick={() => markDraftReadyToSend(item)}
                        disabled={String(item.send_status || item.status || "").includes("ready_to_send")}
                      >
                        {String(item.send_status || item.status || "").includes("ready_to_send") ? "Ready" : "Mark ready"}
                      </button>
                    </article>
                  ))}
                </>
              ) : null}

              {!sendCenterItems.length && !approvedDrafts.length ? (
                <p>No approved message drafts yet.</p>
              ) : null}
            </div>
          </section>

          <section className={`cx-panel cx-owner-log ${page === "dashboard" && hubFocus !== "approvals" ? "cx-hub-hidden-panel" : ""}`}>
            <header>
              <div>
                <span>Recent approvals</span>
                <h2>Saved decisions</h2>
                {backendApprovalStatus ? <p>{backendApprovalStatus}</p> : null}
              </div>
              {(approvalLog.length || backendApprovalLog.length) ? (
                <button
                  type="button"
                  onClick={() => {
                    saveOwnerCommandLog([]);
                    setApprovalLog([]);
                  }}
                >
                  Clear session
                </button>
              ) : null}
            </header>

            <div>
              {backendApprovalLog.length ? backendApprovalLog.map((item, index) => (
                <article key={`${item.id || item._id || index}-${item.title}`}>
                  <span>{item.approved_at ? new Date(item.approved_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Saved"}</span>
                  <strong>{item.type || "Approval"}</strong>
                  <small>{item.title || "Owner command approved"}</small>
                  <b>{item.status || "saved"}</b>
                </article>
              )) : null}

              {approvalLog.length ? approvalLog.map((item) => (
                <article key={`${item.time}-${item.title}`}>
                  <span>{item.time}</span>
                  <strong>{item.type}</strong>
                  <small>{item.title}</small>
                  <b>{item.status}</b>
                </article>
              )) : null}

              {!backendApprovalLog.length && !approvalLog.length ? <p>No owner approvals yet.</p> : null}
            </div>
          </section>
        </aside>
      </section>

      <SmartHubBoxModal
        box={selectedHubBox}
        rows={selectedHubRows}
        approved={approved}
        onClose={() => setSelectedHubBox(null)}
        onOpen={(selection) => {
          setSelectedHubBox(null);
          openCommand(selection);
        }}
        onApprove={async (selection, draft) => {
          const saved = await approveSelection(
            {
              ...selection,
              fromSmartHubModal: true,
            },
            draft
          );

          if (saved && selection?.hubBoxKey && selection?.item) {
            const key = hubItemKey(selection.hubBoxKey, selection.item);
            setHubItemStatus((current) => ({ ...current, [key]: "approved" }));
          }
        }}
        onSnooze={snoozeHubItem}
        onDismiss={dismissHubItem}
        onResolve={resolveHubItem}
        onCopyMessage={copyHubMessage}
        onMarkReady={markHubMessageReady}
        onMarkSent={markHubMessageSent}
        onOpenFull={(nextPage) => {
          setSelectedHubBox(null);
          switchPage(nextPage);
        }}
      />

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
        "/ai-approvals": "dashboard",
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
