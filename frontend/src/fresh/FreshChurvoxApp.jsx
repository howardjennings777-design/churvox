import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const API_BASE = (() => {
  const raw = process.env.REACT_APP_API_URL || process.env.REACT_APP_BACKEND_URL || process.env.VITE_BACKEND_URL || "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function readToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (readToken()) headers.Authorization = `Bearer ${readToken()}`;
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

function itemTitle(item, fallback) {
  return item?.title || item?.name || item?.client_name || item?.customer_name || item?.invoice_number || item?.quote_number || item?.email || fallback;
}

function status(item, fallback = "active") {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || item?.state || fallback).replaceAll("_", " ");
}

function money(item) {
  const value = Number(item?.total || item?.amount || item?.price || item?.balance || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function ChurvoxMark() {
  return (
    <div className="cx-mark" aria-hidden="true">
      <i />
      <b />
      <em />
      <span />
    </div>
  );
}

function Brand({ large = false }) {
  return (
    <div className={`cx-brand ${large ? "cx-brand-large" : ""}`}>
      <ChurvoxMark />
      <div>
        <strong>Churvox</strong>
        <small>Operator OS</small>
      </div>
    </div>
  );
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
      error: calls.some((c) => c.status === "rejected") ? "Some live data could not load. Churvox is still usable." : "",
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

function Shell({ children }) {
  const location = useLocation();
  const nav = [
    ["/dashboard", "Command"],
    ["/jobs", "Jobs"],
    ["/clients", "Clients"],
    ["/quotes", "Quotes"],
    ["/invoices", "Invoices"],
    ["/team", "Crew"],
    ["/settings", "Settings"],
  ];

  return (
    <div className="cx-os">
      <aside className="cx-rail">
        <Brand />
        <nav>
          {nav.map(([href, label]) => (
            <Link key={href} to={href} className={location.pathname === href ? "active" : ""}>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="cx-rail-card">
          <small>MODE</small>
          <strong>Owner approval</strong>
          <p>AI prepares. You approve.</p>
        </div>
      </aside>

      <main className="cx-main">
        <div className="cx-topline">
          <span>Proof → Photos → Time → Invoice → Paid</span>
          <b>Live Operator Workspace</b>
        </div>
        {children}
      </main>
    </div>
  );
}

function Hero({ data }) {
  const unassigned = data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to);
  const openInvoices = data.invoices.filter((x) => !["paid", "void", "cancelled"].includes(status(x).toLowerCase()));
  const openQuotes = data.quotes.filter((x) => !["accepted", "declined", "converted"].includes(status(x).toLowerCase()));

  return (
    <section className="cx-hero">
      <div className="cx-hero-copy">
        <p className="cx-kicker">CHURVOX OPERATOR OS</p>
        <h1>Run the day from one approval-first command centre.</h1>
        <p>Churvox turns trade work into a proof-to-paid system: jobs, crew, photos, time, invoices, quote follow-ups, and owner approvals.</p>
        <div className="cx-hero-actions">
          <button onClick={data.reload}>Run live scan</button>
          <span>{data.loading ? "Scanning business…" : "Live scan ready"}</span>
        </div>
      </div>

      <div className="cx-command-orb">
        <ChurvoxMark />
        <strong>{unassigned.length + openInvoices.length + openQuotes.length}</strong>
        <span>AI-prepared moves</span>
      </div>
    </section>
  );
}

function ProofRail() {
  const steps = [
    ["Job", "Booked", "Client, site, notes"],
    ["Proof", "Captured", "Photos, time, GPS"],
    ["Draft", "Prepared", "Invoice wording"],
    ["Paid", "Closed", "Send, sync, collect"],
  ];

  return (
    <section className="cx-proof">
      {steps.map(([label, title, text], index) => (
        <article key={label}>
          <b>{index + 1}</b>
          <span>{label}</span>
          <strong>{title}</strong>
          <small>{text}</small>
        </article>
      ))}
    </section>
  );
}

function ApprovalQueue({ data }) {
  const unassigned = data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to);
  const openInvoices = data.invoices.filter((x) => !["paid", "void", "cancelled"].includes(status(x).toLowerCase()));
  const openQuotes = data.quotes.filter((x) => !["accepted", "declined", "converted"].includes(status(x).toLowerCase()));

  const actions = [
    ["Dispatch", unassigned.length ? `${unassigned.length} jobs need a worker match` : "No dispatch blockers", "Match crew by area, role and load"],
    ["Cashflow", openInvoices.length ? `${openInvoices.length} invoices need follow-up` : "Invoice queue clear", "Prepare payment reminders"],
    ["Sales", openQuotes.length ? `${openQuotes.length} quotes waiting` : "Quote follow-ups clear", "Prepare follow-up messages"],
  ];

  return (
    <section className="cx-panel cx-approval">
      <div className="cx-panel-head">
        <div>
          <p className="cx-kicker">AI APPROVAL QUEUE</p>
          <h2>Prepared actions, not generic alerts.</h2>
        </div>
        <span className="cx-live">Live</span>
      </div>

      <div className="cx-actions">
        {actions.map(([label, title, text]) => (
          <article key={label}>
            <span>{label}</span>
            <strong>{title}</strong>
            <p>{text}</p>
            <button type="button">Open approval</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricDock({ data }) {
  const stats = [
    ["Jobs", data.jobs.length, "Work in motion"],
    ["Clients", data.clients.length, "Customer base"],
    ["Invoices", data.invoices.length, "Money workspace"],
    ["Crew", data.team.length, "Team capacity"],
  ];

  return (
    <section className="cx-metrics">
      {stats.map(([label, value, text]) => (
        <article key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
          <small>{text}</small>
        </article>
      ))}
    </section>
  );
}

function ListPanel({ title, label, items, empty }) {
  return (
    <section className="cx-panel">
      <div className="cx-panel-head">
        <div>
          <p className="cx-kicker">{label}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="cx-list">
        {items.map((item, index) => (
          <article className="cx-row" key={item.id || item._id || item.email || index}>
            <div>
              <strong>{itemTitle(item, `${label} ${index + 1}`)}</strong>
              <small>{[item.client_name || item.customer_name || item.email || item.phone, item.address || item.site_address, money(item)].filter(Boolean).join(" · ")}</small>
            </div>
            <span>{status(item)}</span>
          </article>
        ))}

        {!items.length && (
          <div className="cx-empty">
            <strong>{empty}</strong>
            <p>Once live records exist, they will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Dashboard() {
  const data = useLiveData();

  return (
    <Shell>
      <Hero data={data} />
      {data.error ? <div className="cx-warning">{data.error}</div> : null}
      <ProofRail />
      <MetricDock data={data} />
      <ApprovalQueue data={data} />
      <section className="cx-grid">
        <ListPanel title="Priority workstream" label="Jobs" items={data.jobs.slice(0, 6)} empty="No jobs loaded yet." />
        <ListPanel title="Money workstream" label="Invoices" items={data.invoices.slice(0, 6)} empty="No invoices loaded yet." />
      </section>
    </Shell>
  );
}

function Workspace({ kind }) {
  const data = useLiveData();
  const map = {
    jobs: ["Jobs Command", "Schedule, assign, prove and complete work.", data.jobs, "Jobs"],
    clients: ["Client Base", "Customers, addresses and repeat work.", data.clients, "Clients"],
    quotes: ["Quote Pipeline", "Follow-ups and approvals before work starts.", data.quotes, "Quotes"],
    invoices: ["Money Command", "Draft, send, follow up and collect.", data.invoices, "Invoices"],
    team: ["Crew Board", "Workers, roles, capacity and dispatch.", data.team, "Crew"],
  };
  const [title, text, items, label] = map[kind];

  return (
    <Shell>
      <section className="cx-page-hero">
        <p className="cx-kicker">{label}</p>
        <h1>{title}</h1>
        <p>{text}</p>
        <button onClick={data.reload}>Refresh live data</button>
      </section>
      {data.error ? <div className="cx-warning">{data.error}</div> : null}
      <ListPanel title={`${label} live records`} label={label} items={items} empty={`No ${label.toLowerCase()} loaded yet.`} />
    </Shell>
  );
}

function Settings() {
  return (
    <Shell>
      <section className="cx-page-hero">
        <p className="cx-kicker">Settings</p>
        <h1>Control the Churvox engine.</h1>
        <p>Plan, billing, MYOB, SMS, business profile and AI Operator controls sit here as the next rebuild layer.</p>
      </section>
      <section className="cx-grid">
        {["Plan & Billing", "MYOB Sync", "SMS Credits", "AI Operator Rules"].map((name) => (
          <article className="cx-panel cx-setting" key={name}>
            <p className="cx-kicker">Module</p>
            <h2>{name}</h2>
            <p>Ready for the next proper page rebuild.</p>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setMessage("Signing in…");
    try {
      const response = await api("/auth/login", { method: "POST", body: form });
      const access = response?.token || response?.access_token || response?.accessToken;
      if (access) localStorage.setItem("token", access);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.message || "Login failed.");
    }
  }

  return (
    <main className="cx-login">
      <form onSubmit={submit}>
        <Brand large />
        <h1>Open Operator OS.</h1>
        <p>Sign in to run Churvox.</p>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit">Sign in</button>
        {message ? <small>{message}</small> : null}
      </form>
    </main>
  );
}

export default function FreshChurvoxApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Workspace kind="jobs" />} />
        <Route path="/clients" element={<Workspace kind="clients" />} />
        <Route path="/quotes" element={<Workspace kind="quotes" />} />
        <Route path="/invoices" element={<Workspace kind="invoices" />} />
        <Route path="/team" element={<Workspace kind="team" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
