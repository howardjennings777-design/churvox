import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function token() {
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

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body:
      options.body && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) throw new Error(data?.detail || data?.message || data?.error || `${path} failed`);
  return data;
}

function arr(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ["data", "items", "results"]) if (Array.isArray(payload[key])) return payload[key];
  return Object.values(payload).find(Array.isArray) || [];
}

function titleOf(x, fallback) {
  return x?.title || x?.name || x?.client_name || x?.customer_name || x?.email || x?.number || x?.invoice_number || x?.quote_number || fallback;
}

function statusOf(x, fallback = "active") {
  return String(x?.status || x?.job_status || x?.payment_status || x?.quote_status || x?.state || fallback).replaceAll("_", " ");
}

function money(x) {
  const n = Number(x?.total || x?.amount || x?.price || x?.balance || 0);
  if (!Number.isFinite(n) || n <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(n);
}

function Shell({ children }) {
  const location = useLocation();
  const nav = [
    ["/dashboard", "Smart Hub"],
    ["/jobs", "Jobs"],
    ["/clients", "Clients"],
    ["/quotes", "Quotes"],
    ["/invoices", "Invoices"],
    ["/team", "Team"],
    ["/settings", "Settings"],
  ];

  return (
    <div className="fresh-shell">
      <aside className="fresh-side">
        <div className="fresh-brand">
          <span>CV</span>
          <div>
            <strong>Churvox</strong>
            <small>AI command centre</small>
          </div>
        </div>

        <nav>
          {nav.map(([href, label]) => (
            <Link key={href} to={href} className={location.pathname === href ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="fresh-main">{children}</main>
    </div>
  );
}

function Hero({ eyebrow, title, text, action }) {
  return (
    <section className="fresh-hero">
      <div>
        <p className="fresh-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </section>
  );
}

function StatGrid({ stats }) {
  return (
    <section className="fresh-stats">
      {stats.map((s) => (
        <article key={s.label} className="fresh-stat">
          <strong>{s.value}</strong>
          <span>{s.label}</span>
          <small>{s.text}</small>
        </article>
      ))}
    </section>
  );
}

function DataList({ title, items, type, empty = "Nothing here yet." }) {
  return (
    <section className="fresh-card">
      <div className="fresh-card-head">
        <div>
          <p className="fresh-eyebrow">{type}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="fresh-list">
        {items.map((item, i) => (
          <article className="fresh-row" key={item.id || item._id || item.email || i}>
            <div>
              <strong>{titleOf(item, `${type} ${i + 1}`)}</strong>
              <small>
                {[item.client_name || item.customer_name || item.email || item.phone, item.address || item.site_address, money(item)]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            </div>
            <span className={`fresh-badge ${statusOf(item).toLowerCase().replace(/\s+/g, "-")}`}>
              {statusOf(item)}
            </span>
          </article>
        ))}

        {!items.length && (
          <div className="fresh-empty">
            <strong>{empty}</strong>
            <p>Add real data and this page will fill automatically.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function useData() {
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
      error: calls.some((c) => c.status === "rejected") ? "Some live data could not load yet. The app is still usable." : "",
      jobs: calls[0].status === "fulfilled" ? arr(calls[0].value, ["jobs"]) : [],
      clients: calls[1].status === "fulfilled" ? arr(calls[1].value, ["clients"]) : [],
      quotes: calls[2].status === "fulfilled" ? arr(calls[2].value, ["quotes"]) : [],
      invoices: calls[3].status === "fulfilled" ? arr(calls[3].value, ["invoices"]) : [],
      team: calls[4].status === "fulfilled" ? arr(calls[4].value, ["workers", "team"]) : [],
    });
  }

  useEffect(() => { load(); }, []);
  return { ...state, reload: load };
}

function Dashboard() {
  const data = useData();
  const openInvoices = data.invoices.filter((x) => !["paid", "cancelled", "void"].includes(statusOf(x).toLowerCase()));
  const openQuotes = data.quotes.filter((x) => !["accepted", "declined", "converted"].includes(statusOf(x).toLowerCase()));
  const unassigned = data.jobs.filter((x) => !x.assigned_worker_id && !x.worker_id && !x.assigned_to);

  return (
    <Shell>
      <Hero
        eyebrow="Smart Hub"
        title="AI command centre for trade and service teams."
        text="One clean workspace for jobs, clients, invoices, quotes, team and owner approvals."
        action={<button className="fresh-primary" onClick={data.reload}>Refresh live data</button>}
      />

      {data.error ? <div className="fresh-warning">{data.error}</div> : null}

      <StatGrid
        stats={[
          { value: data.jobs.length, label: "Jobs", text: `${unassigned.length} unassigned` },
          { value: data.clients.length, label: "Clients", text: "Live client records" },
          { value: openInvoices.length, label: "Open invoices", text: "Cashflow follow-up" },
          { value: openQuotes.length, label: "Open quotes", text: "Sales follow-up" },
        ]}
      />

      <section className="fresh-grid">
        <DataList title="Priority jobs" type="Jobs" items={data.jobs.slice(0, 6)} />
        <DataList title="Money queue" type="Invoices" items={openInvoices.slice(0, 6)} />
      </section>
    </Shell>
  );
}

function Page({ kind }) {
  const data = useData();
  const map = {
    jobs: ["Jobs", "Plan, assign, track and complete work.", data.jobs, "Jobs"],
    clients: ["Clients", "Your customer list and job history base.", data.clients, "Clients"],
    quotes: ["Quotes", "Create, follow up and convert quotes.", data.quotes, "Quotes"],
    invoices: ["Invoices", "Draft, review and collect invoices.", data.invoices, "Invoices"],
    team: ["Team", "Manage workers, roles and dispatch.", data.team, "Team"],
  };

  const [title, text, items, type] = map[kind];

  return (
    <Shell>
      <Hero
        eyebrow={type}
        title={title}
        text={text}
        action={<button className="fresh-primary" onClick={data.reload}>Refresh</button>}
      />
      {data.error ? <div className="fresh-warning">{data.error}</div> : null}
      <DataList title={`${title} workspace`} type={type} items={items} empty={`No ${title.toLowerCase()} loaded yet.`} />
    </Shell>
  );
}

function Settings() {
  return (
    <Shell>
      <Hero
        eyebrow="Settings"
        title="Business settings."
        text="Plan, billing, MYOB, SMS and account controls can be rebuilt here next."
      />
      <section className="fresh-grid">
        {["Plan and billing", "MYOB integration", "SMS credits", "Business profile"].map((x) => (
          <article className="fresh-card" key={x}>
            <p className="fresh-eyebrow">Coming back clean</p>
            <h2>{x}</h2>
            <p className="fresh-muted">This area is ready for the next rebuild pass.</p>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("Signing in...");
    try {
      const res = await api("/auth/login", { method: "POST", body: form });
      const t = res?.token || res?.access_token || res?.accessToken;
      if (t) localStorage.setItem("token", t);
      navigate("/dashboard");
    } catch (err) {
      setMsg(err.message || "Login failed.");
    }
  }

  return (
    <main className="fresh-login">
      <form onSubmit={submit} className="fresh-login-card">
        <div className="fresh-brand big">
          <span>CV</span>
          <div>
            <strong>Churvox</strong>
            <small>AI command centre</small>
          </div>
        </div>
        <h1>Welcome back.</h1>
        <p>Sign in to open the fresh Churvox workspace.</p>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="fresh-primary" type="submit">Sign in</button>
        {msg ? <small>{msg}</small> : null}
      </form>
    </main>
  );
}

function FreshChurvoxApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Page kind="jobs" />} />
        <Route path="/clients" element={<Page kind="clients" />} />
        <Route path="/quotes" element={<Page kind="quotes" />} />
        <Route path="/invoices" element={<Page kind="invoices" />} />
        <Route path="/team" element={<Page kind="team" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default FreshChurvoxApp;
