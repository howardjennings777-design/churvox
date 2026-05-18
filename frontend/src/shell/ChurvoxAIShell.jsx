import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const AREAS = {
  dashboard: { label: "Command", sub: "Prepared today" },
  work: { label: "Work", sub: "Jobs & slips", endpoint: "/jobs" },
  clients: { label: "Clients", sub: "Customer base", endpoint: "/clients" },
  crew: { label: "Crew", sub: "Team flow", endpoint: "/team/invite", read: "/team/workers" },
  quotes: { label: "Quotes", sub: "Follow-ups", endpoint: "/quotes" },
  invoices: { label: "Invoices", sub: "Cashflow", endpoint: "/invoices" },
  proof: { label: "Proof & Pay", sub: "Photos to paid" },
  payroll: { label: "Payroll", sub: "Hours review" },
  plans: { label: "Plans", sub: "Billing" },
  settings: { label: "Settings", sub: "Setup" },
};

const AREA_ORDER = Object.keys(AREAS);

const PAGE_META = {
  work: {
    title: "Work Slips",
    line: "Jobs, workers, proof, notes and invoice readiness in one owner view.",
    action: "Add work",
    prepared: ["Assign worker", "Fix missing info", "Prepare invoice"],
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
  },
  clients: {
    title: "Clients",
    line: "Customer records that connect to jobs, quotes, invoices and follow-ups.",
    action: "Add client",
    prepared: ["Fix contact gaps", "Create job", "Prepare follow-up"],
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
  },
  crew: {
    title: "Crew",
    line: "Workers, roles, workload, region and assignment readiness.",
    action: "Invite crew",
    prepared: ["Suggest worker", "Check conflict", "Review workload"],
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
  },
  quotes: {
    title: "Quotes",
    line: "Quote pipeline, follow-ups and accepted work ready to become jobs.",
    action: "Create quote",
    prepared: ["Follow up quote", "Convert to job", "Improve wording"],
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
  invoices: {
    title: "Invoices",
    line: "Draft invoices, payment reminders, proof packs and MYOB readiness.",
    action: "Create invoice",
    prepared: ["Approve draft", "Send reminder", "Check proof pack"],
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
};

const DEMO = {
  work: [
    { title: "Switchboard upgrade", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { title: "Garden clean-up", client_name: "Bayview Rentals", status: "Needs info", amount: 780 },
    { title: "Hot water repair", client_name: "Harbour Plumbing", status: "Prepared", amount: 1240 },
  ],
  clients: [
    { name: "Carter Electrical", email: "accounts@carter.co.nz", status: "Ready" },
    { name: "Bayview Rentals", phone: "020 000 000", status: "Needs email" },
    { name: "Harbour Plumbing", address: "Wellington", status: "Ready" },
  ],
  crew: [
    { name: "Sam", role: "Worker", region: "North", status: "Active" },
    { name: "Jess", role: "Manager", region: "Central", status: "Active" },
    { name: "Moana", role: "Payroll", region: "Office", status: "Active" },
  ],
  quotes: [
    { quote_number: "Q-1075", client_name: "Northside Plumbing", status: "Follow up", amount: 6420 },
    { quote_number: "Q-1074", client_name: "Oceanview Homes", status: "Prepared", amount: 12100 },
  ],
  invoices: [
    { invoice_number: "INV-1047", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { invoice_number: "INV-1031", client_name: "Bayview Rentals", status: "Overdue", amount: 2430 },
  ],
};

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return clean(value.name || value.title || value.email || value.id, fallback);
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function money(value, fallback = "—") {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(n);
}

function currentRoute() {
  const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path === "home") return "public";
  if (path === "login" || path === "signup") return path;
  if (path === "jobs") return "work";
  if (path === "team") return "crew";
  if (path === "proof-and-pay") return "proof";
  return path.split("/")[0] || "public";
}

function pathFor(route) {
  return {
    public: "/",
    login: "/login",
    signup: "/signup",
    dashboard: "/dashboard",
    work: "/work",
    clients: "/clients",
    crew: "/crew",
    quotes: "/quotes",
    invoices: "/invoices",
    proof: "/proof-and-pay",
    payroll: "/payroll",
    plans: "/plans",
    settings: "/settings",
  }[route] || "/dashboard";
}

function token() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("churvox_user") || "null");
  } catch {
    return null;
  }
}

function saveAuth(payload = {}) {
  const data = payload.data || payload;
  const authToken = data.token || data.access_token || data.authToken || data.jwt || "";
  if (authToken) {
    localStorage.setItem("token", authToken);
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("access_token", authToken);
  }
  const user = data.user || data.account || data.profile || data;
  if (user && typeof user === "object") localStorage.setItem("churvox_user", JSON.stringify(user));
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
    },
    ...options,
  });

  const text = await res.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }

  if (!res.ok) throw new Error(body.detail || body.message || body.error || `${path} failed`);
  return body;
}

function pickList(result, keys) {
  if (Array.isArray(result)) return result;
  for (const key of keys) if (Array.isArray(result?.[key])) return result[key];
  return [];
}

function titleOf(type, item = {}, index = 0) {
  if (type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  if (type === "invoices") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work Slip ${index + 1}`);
}

function subOf(type, item = {}) {
  if (type === "clients") return clean(item.email || item.phone || item.address, "Client details");
  if (type === "crew") return clean(item.role || item.region || item.phone, "Crew member");
  if (type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote");
  if (type === "invoices") return clean(item.client_name || item.customer_name || item.status, "Invoice");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work details");
}

function statusOf(type, item = {}) {
  if (type === "invoices") return clean(item.status || item.invoice_status || item.payment_status, "Draft");
  if (type === "quotes") return clean(item.status || item.quote_status, "Prepared");
  if (type === "crew") return clean(item.status || item.role, "Active");
  if (type === "clients") return clean(item.status, "Ready");
  return clean(item.status || item.job_status, "Ready");
}

function searchText(type, item = {}) {
  return [titleOf(type, item), subOf(type, item), statusOf(type, item), ...Object.values(item).map((v) => clean(v))].join(" ").toLowerCase();
}

function Logo() {
  return (
    <span className="cw-logo">
      <i>C</i>
      <span><b>CHURVOX</b><small>Workbench OS</small></span>
    </span>
  );
}

function PublicNav({ go }) {
  return (
    <header className="cw-public-nav">
      <button type="button" className="cw-logo-btn" onClick={() => go("public")}><Logo /></button>
      <nav>
        <a href="#how">How it works</a>
        <a href="#features">What it prepares</a>
        <a href="#pricing">Pricing</a>
        <button type="button" className="ghost" onClick={() => go("login")}>Login</button>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </nav>
    </header>
  );
}

function PublicPage({ go }) {
  return (
    <main className="cw-public">
      <PublicNav go={go} />
      <section className="cw-hero">
        <article>
          <span className="cw-kicker">AI workbench for trade and service owners</span>
          <h1>Churvox prepares the admin. <em>You approve.</em></h1>
          <p>Jobs, clients, crew, quotes, invoices, proof, payments and payroll become owner-ready actions. No hunting around. No blind sending.</p>
          <div className="cw-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
          <div className="cw-chips"><b>Prepared actions</b><b>Owner approval</b><b>Proof to paid</b><b>Worker flow</b></div>
        </article>

        <aside className="cw-preview">
          <header><span>Prepared by Churvox</span><strong>7 ready</strong></header>
          {[
            ["Invoice ready", "Completed job with proof", "$4,870"],
            ["Worker suggested", "No conflict found", "Approve"],
            ["Quote follow-up", "Customer has not replied", "Send"],
            ["Payment reminder", "18 days overdue", "Review"],
          ].map(([title, sub, meta]) => (
            <button type="button" key={title}><i /><span><b>{title}</b><small>{sub}</small></span><strong>{meta}</strong></button>
          ))}
        </aside>
      </section>

      <section className="cw-section" id="how">
        <span className="cw-kicker">How it works</span>
        <h2>Every page answers the same three things.</h2>
        <div className="cw-grid">
          {["What is happening here?", "What has Churvox prepared?", "What needs owner approval next?"].map((text, i) => (
            <article key={text}><b>{i + 1}</b><h3>{text}</h3><p>Review, edit and approve. That is the whole Churvox flow.</p></article>
          ))}
        </div>
      </section>

      <section className="cw-section" id="features">
        <span className="cw-kicker">What it prepares</span>
        <h2>The daily admin your business keeps repeating.</h2>
        <div className="cw-grid">
          {["Work slips", "Client follow-ups", "Worker assignment", "Quote reminders", "Draft invoices", "Proof packs", "Payroll checks", "MYOB readiness"].map((x) => (
            <article key={x}><h3>{x}</h3><p>Prepared as a clear owner action with review and approval.</p></article>
          ))}
        </div>
      </section>

      <section className="cw-section" id="pricing">
        <span className="cw-kicker">Pricing</span>
        <h2>Operator is where Churvox starts preparing admin for approval.</h2>
        <div className="cw-pricing">
          {[
            ["Start", "$39", "Solo operators"],
            ["Crew", "$89", "Small teams"],
            ["Operator", "$149", "AI Operator Actions"],
            ["Command", "$299", "MYOB + payroll"],
          ].map(([name, price, sub]) => (
            <article key={name} className={name === "Operator" ? "featured" : ""}>
              <span>{sub}</span><h3>{name}</h3><strong>{price}<small>/month + GST</small></strong>
              <button type="button" onClick={() => go("signup")}>Choose {name}</button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function AuthPage({ mode, go, onLogin }) {
  const signup = mode === "signup";
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = signup
        ? await api("/auth/register", { method: "POST", body: JSON.stringify({ ...form, plan: "operator" }) })
        : await api("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });
      saveAuth(payload);
      onLogin();
      go("dashboard");
    } catch (err) {
      setError(err.message || "Could not open Churvox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cw-public">
      <PublicNav go={go} />
      <section className="cw-auth">
        <article><span className="cw-kicker">Secure workbench</span><h1>{signup ? "Start your Churvox workbench." : "Open your prepared actions."}</h1><p>Same system everywhere: prepared admin, review, edit, approve.</p></article>
        <form className="cw-auth-card" onSubmit={submit}>
          <Logo />
          <h2>{signup ? "Create account" : "Login"}</h2>
          {signup && (
            <>
              <label>Your name<input value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
              <label>Business name<input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} /></label>
            </>
          )}
          <label>Email<input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          <label>Password<input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} /></label>
          {error ? <p className="cw-error">{error}</p> : null}
          <button type="submit" disabled={busy}>{busy ? "Opening..." : signup ? "Start free trial" : "Open Churvox"}</button>
          <small>{signup ? "Already have an account?" : "Need an account?"} <button type="button" onClick={() => go(signup ? "login" : "signup")}>{signup ? "Login" : "Start free trial"}</button></small>
        </form>
      </section>
    </main>
  );
}

function AppShell({ route, go, data, user, reload, logout }) {
  return (
    <main className="cw-app">
      <aside className="cw-sidebar">
        <button type="button" className="cw-logo-btn" onClick={() => go("dashboard")}><Logo /></button>
        <nav>
          {AREA_ORDER.map((key) => (
            <button type="button" key={key} className={route === key ? "active" : ""} onClick={() => go(key)}>
              <b>{AREAS[key].label}</b><small>{AREAS[key].sub}</small>
            </button>
          ))}
        </nav>
        <button type="button" className="cw-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="cw-workspace">
        <header className="cw-topbar">
          <div><span className="cw-kicker">Prepared Workbench</span><h1>{AREAS[route]?.label || "Command"}</h1></div>
          <aside><button type="button" onClick={reload}>Refresh</button><strong>{clean(user?.name || user?.email, "Owner")}</strong></aside>
        </header>

        {route === "dashboard" ? <CommandPage data={data} go={go} /> : null}
        {PAGE_META[route] ? <WorkbenchPage type={route} rows={data[route] || []} reload={reload} /> : null}
        {["proof", "payroll", "plans", "settings"].includes(route) ? <SimplePage route={route} /> : null}
      </section>
    </main>
  );
}

function CommandPage({ data, go }) {
  const invoices = data.invoices || [];
  const total = invoices.reduce((sum, x) => sum + Number(x.amount || x.total || x.balance || 0), 0);

  return (
    <section className="cw-page">
      <div className="cw-metrics">
        <Metric label="Prepared actions" value="7" sub="Ready to review" />
        <Metric label="Work" value={(data.work || []).length || 8} sub="Jobs in motion" />
        <Metric label="Clients" value={(data.clients || []).length || 12} sub="Customer base" />
        <Metric label="Invoices" value={invoices.length || 3} sub={money(total, "$18,420")} />
      </div>
      <section className="cw-main-grid">
        <article className="cw-panel">
          <span className="cw-kicker">Prepared by Churvox</span>
          <h2>Review today’s owner actions.</h2>
          <PreparedRow title="Invoice draft ready" sub="Completed job has proof and amount" meta="Approve" onClick={() => go("invoices")} />
          <PreparedRow title="Worker suggested" sub="Best match found with no conflict" meta="Review" onClick={() => go("work")} />
          <PreparedRow title="Quote follow-up prepared" sub="Customer has not replied" meta="Send" onClick={() => go("quotes")} />
        </article>
        <article className="cw-panel dark">
          <span className="cw-kicker">AI next move</span>
          <h2>Start with money waiting.</h2>
          <p>Invoices and follow-ups are the fastest admin win. Review prepared drafts before opening anything else.</p>
          <button type="button" onClick={() => go("invoices")}>Open invoices</button>
        </article>
      </section>
    </section>
  );
}

function WorkbenchPage({ type, rows, reload }) {
  const meta = PAGE_META[type];
  const base = rows.length ? rows : DEMO[type] || [];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(base[0] || {});
  const [sheet, setSheet] = useState(false);
  const [create, setCreate] = useState(false);

  const list = useMemo(() => base.filter((x) => searchText(type, x).includes(query.toLowerCase().trim())), [base, query, type]);
  const active = selected && Object.keys(selected).length ? selected : list[0] || base[0] || {};

  return (
    <section className="cw-page">
      <section className="cw-panel cw-head">
        <div><span className="cw-kicker">{meta.title}</span><h2>{meta.line}</h2><p>Prepared actions first. Records second. Owner decision last.</p></div>
        <button type="button" onClick={() => setCreate(true)}>{meta.action}</button>
      </section>

      <section className="cw-prepared">
        {meta.prepared.map((x) => <button type="button" key={x} onClick={() => setSheet(true)}><b>{x}</b><small>Prepared action</small></button>)}
      </section>

      <section className="cw-panel cw-controls">
        <label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${meta.title.toLowerCase()}...`} /></label>
        <button type="button" className="ghost" onClick={() => setQuery("")}>Clear</button>
      </section>

      <section className="cw-main-grid">
        <article className="cw-panel">
          <header><h2>{meta.title}</h2><button type="button" className="ghost" onClick={reload}>Refresh</button></header>
          <div className="cw-list">
            {list.map((item, index) => (
              <button type="button" key={index} className={active === item ? "active" : ""} onClick={() => { setSelected(item); if (window.innerWidth < 850) setSheet(true); }}>
                <span><b>{titleOf(type, item, index)}</b><small>{subOf(type, item)}</small></span>
                <Status value={statusOf(type, item)} />
              </button>
            ))}
            {!list.length ? <p className="cw-empty">No matching records.</p> : null}
          </div>
        </article>
        <DetailPanel type={type} item={active} onOpen={() => setSheet(true)} />
      </section>

      {sheet ? <Sheet type={type} item={active} onClose={() => setSheet(false)} /> : null}
      {create ? <CreateModal type={type} onClose={() => setCreate(false)} onSaved={reload} /> : null}
    </section>
  );
}

function DetailPanel({ type, item, onOpen }) {
  return (
    <article className="cw-panel dark">
      <span className="cw-kicker">AI next move</span>
      <h2>{titleOf(type, item)}</h2>
      <p>{nextMove(type)}</p>
      <div className="cw-detail">
        {Object.entries(item || {}).slice(0, 7).map(([k, v]) => <p key={k}><b>{k.replace(/_/g, " ")}</b><span>{clean(v, "—")}</span></p>)}
      </div>
      <button type="button" onClick={onOpen}>Review prepared action</button>
    </article>
  );
}

function Sheet({ type, item, onClose }) {
  return (
    <section className="cw-sheet">
      <article>
        <header><div><span className="cw-kicker">Review / edit / approve</span><h2>{titleOf(type, item)}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{nextMove(type)}</p>
        <div className="cw-sheet-grid">
          <div><b>Status</b><span>{statusOf(type, item)}</span></div>
          <div><b>Detail</b><span>{subOf(type, item)}</span></div>
          <div><b>Owner action</b><span>Review prepared action</span></div>
        </div>
        <div className="cw-detail light">
          {Object.entries(item || {}).slice(0, 10).map(([k, v]) => <p key={k}><b>{k.replace(/_/g, " ")}</b><span>{clean(v, "—")}</span></p>)}
        </div>
        <footer><button type="button" className="ghost" onClick={onClose}>Close</button><button type="button" onClick={onClose}>Approve when ready</button></footer>
      </article>
    </section>
  );
}

function SimplePage({ route }) {
  const copy = {
    proof: ["Proof & Pay", "Completed work, photos and invoice-ready proof packs."],
    payroll: ["Payroll Review", "Approved hours, missing times and export-ready pay summaries."],
    plans: ["Plans", "Start, Crew, Operator and Command with AI Operator Actions as the main upgrade."],
    settings: ["Settings", "Business profile, roles, invoice settings, MYOB, SMS and notifications."],
  }[route];

  return (
    <section className="cw-page">
      <section className="cw-panel cw-head">
        <div><span className="cw-kicker">{copy[0]}</span><h2>{copy[1]}</h2><p>Prepared actions first. Records second. Approval last.</p></div>
      </section>
      <section className="cw-prepared">
        <button type="button"><b>Review prepared items</b><small>Owner action</small></button>
        <button type="button"><b>Check missing info</b><small>Churvox scan</small></button>
        <button type="button"><b>Approve next step</b><small>Ready when checked</small></button>
      </section>
    </section>
  );
}

function CreateModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const meta = PAGE_META[type];

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const payload = { ...form, title: form.title || form.name || form.invoice_number || form.quote_number, status: form.status || "new" };
      const endpoint = AREAS[type]?.endpoint || "/jobs";
      const paths = type === "crew" ? [endpoint, AREAS[type].read] : [endpoint];
      await postFirst(paths, payload);
      setMsg("Saved.");
      await onSaved?.();
      setTimeout(onClose, 450);
    } catch (err) {
      setMsg(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function postFirst(paths, payload) {
    let last;
    for (const path of paths) {
      try {
        return await api(path, { method: "POST", body: JSON.stringify(payload) });
      } catch (err) {
        last = err;
      }
    }
    throw last;
  }

  return (
    <section className="cw-modal">
      <form onSubmit={submit}>
        <header><h2>{meta.action}</h2><button type="button" onClick={onClose}>×</button></header>
        <div className="cw-form-grid">
          {meta.fields.map(([key, label]) => (
            <label key={key}>{label}{key === "description" ? <textarea value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /> : <input value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>
          ))}
        </div>
        {msg ? <p>{msg}</p> : null}
        <footer><button type="button" className="ghost" onClick={onClose}>Cancel</button><button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</button></footer>
      </form>
    </section>
  );
}

function Metric({ label, value, sub }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}

function PreparedRow({ title, sub, meta, onClick }) {
  return <button type="button" className="cw-action-row" onClick={onClick}><i /><span><b>{title}</b><small>{sub}</small></span><strong>{meta}</strong></button>;
}

function Status({ value }) {
  const label = clean(value, "Ready");
  const low = label.toLowerCase();
  const tone = low.includes("overdue") || low.includes("block") ? "red" : low.includes("need") || low.includes("draft") || low.includes("pending") ? "amber" : low.includes("complete") || low.includes("paid") || low.includes("active") ? "green" : "blue";
  return <span className={`cw-status ${tone}`}>{label}</span>;
}

function nextMove(type) {
  return {
    work: "Check worker, missing details, proof and invoice readiness before approving the next step.",
    clients: "Check contact details, recent work and unpaid invoices before creating more admin.",
    crew: "Check role, region, workload and conflicts before assigning work.",
    quotes: "Check follow-up timing, wording and whether this should become a job.",
    invoices: "Check amount, client email, proof, due date and reminder/MYOB path.",
  }[type] || "Review what Churvox prepared, edit if needed, then approve.";
}

export default function ChurvoxAIShell() {
  const [route, setRoute] = useState(currentRoute());
  const [user, setUser] = useState(() => getUser());
  const [data, setData] = useState({ work: [], clients: [], crew: [], quotes: [], invoices: [] });
  const authed = Boolean(token());

  function go(next) {
    window.history.pushState({}, "", routePath(next));
    setRoute(currentRoute());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function load() {
    if (!token()) return;
    const entries = await Promise.allSettled([
      api("/jobs"),
      api("/clients"),
      api("/team/workers"),
      api("/quotes"),
      api("/invoices"),
    ]);
    setData({
      work: entries[0].status === "fulfilled" ? pickList(entries[0].value, ["jobs", "items", "data"]) : [],
      clients: entries[1].status === "fulfilled" ? pickList(entries[1].value, ["clients", "items", "data"]) : [],
      crew: entries[2].status === "fulfilled" ? pickList(entries[2].value, ["workers", "team", "items", "data"]) : [],
      quotes: entries[3].status === "fulfilled" ? pickList(entries[3].value, ["quotes", "items", "data"]) : [],
      invoices: entries[4].status === "fulfilled" ? pickList(entries[4].value, ["invoices", "items", "data"]) : [],
    });
  }

  function logout() {
    ["token", "authToken", "access_token", "churvox_user"].forEach((x) => localStorage.removeItem(x));
    setUser(null);
    go("public");
  }

  useEffect(() => {
    const pop = () => setRoute(currentRoute());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    if (authed && !["public", "login", "signup"].includes(route)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, authed]);

  if (route === "public") return <PublicPage go={go} />;
  if (route === "login" || route === "signup") return <AuthPage mode={route} go={go} onLogin={() => { setUser(getUser()); load(); }} />;
  if (!authed) return <AuthPage mode="login" go={go} onLogin={() => { setUser(getUser()); load(); }} />;

  return <AppShell route={AREAS[route] ? route : "dashboard"} go={go} data={data} user={user || getUser() || {}} reload={load} logout={logout} />;
}
