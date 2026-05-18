import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const RAW_API =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.VITE_BACKEND_URL ||
  "https://grassley-backend.onrender.com";

const API_BASE = String(RAW_API).replace(/\/+$/, "").endsWith("/api")
  ? String(RAW_API).replace(/\/+$/, "")
  : `${String(RAW_API).replace(/\/+$/, "")}/api`;

const ENTITY_ROUTES = ["work", "clients", "crew", "quotes", "invoices"];

const AREAS = {
  dashboard: { label: "Command", sub: "Prepared today" },
  work: {
    label: "Work",
    sub: "Jobs & slips",
    read: "/jobs",
    create: "/jobs",
    title: "Work Feed",
    line: "Jobs, workers, proof and invoice readiness.",
    action: "Add work",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
    prepared: ["Assign worker", "Fix missing info", "Prepare invoice"],
  },
  clients: {
    label: "Clients",
    sub: "Customer base",
    read: "/clients",
    create: "/clients",
    title: "Client Feed",
    line: "Customers connected to work, quotes and invoices.",
    action: "Add client",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
    prepared: ["Fix contact gaps", "Create job", "Prepare follow-up"],
  },
  crew: {
    label: "Crew",
    sub: "Team flow",
    read: "/team/workers",
    create: "/team/invite",
    title: "Crew Feed",
    line: "Workers, workload, roles and conflicts.",
    action: "Invite crew",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
    prepared: ["Suggest worker", "Check conflict", "Review workload"],
  },
  quotes: {
    label: "Quotes",
    sub: "Follow-ups",
    read: "/quotes",
    create: "/quotes",
    title: "Quote Feed",
    line: "Quotes that need follow-up or conversion.",
    action: "Create quote",
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
    prepared: ["Follow up quote", "Convert to job", "Improve wording"],
  },
  invoices: {
    label: "Invoices",
    sub: "Cashflow",
    read: "/invoices",
    create: "/invoices",
    title: "Money Feed",
    line: "Draft invoices, reminders, proof packs and MYOB readiness.",
    action: "Create invoice",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
    prepared: ["Approve draft", "Send reminder", "Check proof pack"],
  },
  proof: { label: "Proof & Pay", sub: "Photos to paid" },
  payroll: { label: "Payroll", sub: "Hours review" },
  plans: { label: "Plans", sub: "Billing" },
  settings: { label: "Settings", sub: "Setup" },
};

const NAV = ["dashboard", "work", "clients", "crew", "quotes", "invoices", "proof", "payroll", "plans", "settings"];

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
  if (typeof value === "object") return clean(value.actionTitle || value.name || value.title || value.email || value.id, fallback);
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function money(value, fallback = "—") {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(n);
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

function currentRoute() {
  const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path === "home") return "public";
  if (path === "login" || path === "signup") return path;
  if (path === "jobs") return "work";
  if (path === "team") return "crew";
  if (path === "proof-and-pay") return "proof";
  return AREAS[path] ? path : "dashboard";
}

function getToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function isLoggedIn() {
  try {
    return Boolean(getToken() || localStorage.getItem("churvox_session_active") === "true");
  } catch {
    return false;
  }
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("churvox_user") || "null");
  } catch {
    return null;
  }
}

function saveAuth(payload = {}, fallbackEmail = "") {
  const data = payload.data || payload || {};
  const authToken = data.token || data.access_token || data.authToken || data.jwt || "";
  if (authToken) {
    localStorage.setItem("token", authToken);
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("access_token", authToken);
  }

  const user = data.user || data.account || data.profile || (data.email ? data : null) || { email: fallbackEmail };
  localStorage.setItem("churvox_user", JSON.stringify(user));
  localStorage.setItem("churvox_session_active", "true");
  if (user?.email || fallbackEmail) localStorage.setItem("churvox_email", user?.email || fallbackEmail);
}

async function api(path, options = {}) {
  const authToken = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {}),
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

function pickList(value, keys) {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

function titleOf(type, item = {}, index = 0) {
  if (item.actionTitle) return item.actionTitle;
  if (type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  if (type === "invoices") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work Slip ${index + 1}`);
}

function subOf(type, item = {}) {
  if (item.detail) return item.detail;
  if (type === "clients") return clean(item.email || item.phone || item.address, "Client details");
  if (type === "crew") return clean(item.role || item.region || item.phone, "Crew member");
  if (type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote");
  if (type === "invoices") return clean(item.client_name || item.customer_name || item.status, "Invoice");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work details");
}

function statusOf(type, item = {}) {
  if (item.status) return clean(item.status, "Prepared");
  if (type === "invoices") return clean(item.invoice_status || item.payment_status, "Draft");
  if (type === "quotes") return clean(item.quote_status, "Prepared");
  if (type === "crew") return clean(item.role, "Active");
  return "Ready";
}

function searchText(type, item = {}) {
  return [titleOf(type, item), subOf(type, item), statusOf(type, item), ...Object.values(item).map((v) => clean(v))]
    .join(" ")
    .toLowerCase();
}

function Logo() {
  return (
    <span className="cb-logo">
      <i>C</i>
      <span>
        <b>CHURVOX</b>
        <small>Command Board</small>
      </span>
    </span>
  );
}

function Status({ value }) {
  const label = clean(value, "Ready");
  const low = label.toLowerCase();
  const tone = low.includes("overdue") || low.includes("block")
    ? "red"
    : low.includes("need") || low.includes("draft") || low.includes("pending")
    ? "amber"
    : low.includes("complete") || low.includes("paid") || low.includes("active")
    ? "green"
    : "blue";
  return <span className={`cb-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="cb-public-nav">
      <button type="button" className="cb-logo-btn" onClick={() => go("public")}><Logo /></button>
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
    <main className="cb-public">
      <PublicNav go={go} />

      <section className="cb-hero">
        <article>
          <span className="cb-kicker">AI command board for trade and service owners</span>
          <h1>What came in. What Churvox prepared. What you approve.</h1>
          <p>Churvox turns work, clients, crew updates, quotes, invoices, proof and payroll into a clear owner approval board.</p>
          <div className="cb-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
        </article>

        <aside className="cb-preview">
          <header>
            <span>Prepared by Churvox</span>
            <strong>7 ready</strong>
          </header>
          {[
            ["Invoice ready", "Completed job has proof and amount", "$4,870"],
            ["Worker suggested", "Best match found, no conflict", "Approve"],
            ["Quote follow-up", "Customer has not replied", "Send"],
            ["Payment reminder", "18 days overdue", "Review"],
          ].map(([title, detail, meta]) => (
            <button type="button" key={title}>
              <i />
              <span><b>{title}</b><small>{detail}</small></span>
              <strong>{meta}</strong>
            </button>
          ))}
        </aside>
      </section>

      <section className="cb-section" id="how">
        <span className="cb-kicker">How it works</span>
        <h2>One board. Three zones.</h2>
        <div className="cb-grid">
          {[
            ["Work Feed", "Jobs, invoices, quotes, workers and clients appear as a simple feed."],
            ["Prepared by Churvox", "AI prepares invoice drafts, reminders, worker suggestions and proof packs."],
            ["Detail Preview", "Tap anything to review, edit and approve without page jumping."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="cb-section" id="features">
        <span className="cb-kicker">What it prepares</span>
        <h2>The daily admin your business keeps repeating.</h2>
        <div className="cb-grid">
          {["Work slips", "Client follow-ups", "Worker assignment", "Quote reminders", "Draft invoices", "Proof packs", "Payroll checks", "MYOB readiness"].map((x) => (
            <article key={x}><h3>{x}</h3><p>Prepared as a clear owner action with review and approval.</p></article>
          ))}
        </div>
      </section>

      <section className="cb-section" id="pricing">
        <span className="cb-kicker">Pricing</span>
        <h2>Operator is where Churvox starts preparing admin for approval.</h2>
        <div className="cb-pricing">
          {[
            ["Start", "$39", "Solo operators"],
            ["Crew", "$89", "Small teams"],
            ["Operator", "$149", "AI Operator Actions"],
            ["Command", "$299", "MYOB + payroll"],
          ].map(([name, price, sub]) => (
            <article key={name} className={name === "Operator" ? "featured" : ""}>
              <span>{sub}</span>
              <h3>{name}</h3>
              <strong>{price}<small>/month + GST</small></strong>
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
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = signup
        ? await api("/auth/register", { method: "POST", body: JSON.stringify({ ...form, plan: "operator" }) })
        : await api("/auth/login", { method: "POST", body: JSON.stringify({ email: form.email, password: form.password }) });

      saveAuth(payload, form.email);
      onLogin();
      go("dashboard");
    } catch (err) {
      setError(err.message || "Could not open Churvox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cb-public">
      <PublicNav go={go} />
      <section className="cb-auth">
        <article>
          <span className="cb-kicker">Secure command board</span>
          <h1>{signup ? "Start your Churvox board." : "Open your prepared actions."}</h1>
          <p>Same system everywhere: work feed, prepared actions, detail preview, approve.</p>
        </article>

        <form className="cb-card cb-auth-card" onSubmit={submit}>
          <Logo />
          <h2>{signup ? "Create account" : "Login"}</h2>

          {signup ? (
            <>
              <label>Your name<input value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
              <label>Business name<input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} /></label>
            </>
          ) : null}

          <label>Email<input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          <label>Password<input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} /></label>

          {error ? <p className="cb-error">{error}</p> : null}

          <button type="submit" disabled={busy}>{busy ? "Opening..." : signup ? "Start free trial" : "Open Churvox"}</button>
          <small>
            {signup ? "Already have an account?" : "Need an account?"}{" "}
            <button type="button" onClick={() => go(signup ? "login" : "signup")}>{signup ? "Login" : "Start free trial"}</button>
          </small>
        </form>
      </section>
    </main>
  );
}

function AppShell({ route, go, data, user, reload, logout }) {
  const [quickCreate, setQuickCreate] = useState(false);
  const createType = ENTITY_ROUTES.includes(route) ? route : "work";

  return (
    <main className="cb-app">
      <aside className="cb-rail">
        <button type="button" className="cb-logo-btn" onClick={() => go("dashboard")}><Logo /></button>
        <nav>
          {NAV.map((key) => (
            <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
              <b>{AREAS[key].label}</b>
              <small>{AREAS[key].sub}</small>
            </button>
          ))}
        </nav>
        <button type="button" className="cb-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="cb-shell">
        <header className="cb-topbar">
          <div>
            <span className="cb-kicker">Churvox Command Board</span>
            <h1>{AREAS[route]?.label || "Command"}</h1>
          </div>
          <aside>
            <button type="button" className="ghost" onClick={() => go("dashboard")}>Notifications</button>
            <button type="button" className="ghost" onClick={reload}>Refresh</button>
            <button type="button" onClick={() => setQuickCreate(true)}>Quick add</button>
            <strong>{clean(user?.name || user?.email, "Owner")}</strong>
          </aside>
        </header>

        <Workspace route={route} go={go} data={data} reload={reload} />

        {quickCreate ? (
          <CreateModal type={createType} onClose={() => setQuickCreate(false)} onSaved={reload} />
        ) : null}
      </section>
    </main>
  );
}

function Workspace({ route, go, data, reload }) {
  if (route === "dashboard") return <DashboardBoard data={data} go={go} />;
  if (ENTITY_ROUTES.includes(route)) return <EntityBoard type={route} rows={data[route] || []} reload={reload} />;
  if (route === "plans") return <PlansBoard go={go} />;
  if (route === "settings") return <SettingsBoard reload={reload} />;
  return <UtilityBoard route={route} go={go} />;
}

function DashboardBoard({ data, go }) {
  const invoices = data.invoices || [];
  const total = invoices.reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);
  const prepared = [
    { actionTitle: "Invoice draft ready", detail: "Completed job has proof and amount", status: "Approve", route: "invoices" },
    { actionTitle: "Worker suggestion ready", detail: "Best match found with no conflict", status: "Review", route: "work" },
    { actionTitle: "Quote follow-up written", detail: "Customer has not replied", status: "Send", route: "quotes" },
  ];

  return (
    <section className="cb-board-page">
      <section className="cb-metrics">
        <Metric label="Prepared" value="7" sub="Owner actions" />
        <Metric label="Work" value={(data.work || []).length || 8} sub="Jobs in motion" />
        <Metric label="Invoices" value={invoices.length || 3} sub={money(total, "$18,420")} />
        <Metric label="Quotes" value={(data.quotes || []).length || 4} sub="Follow-up queue" />
      </section>

      <section className="cb-board">
        <FeedColumn title="Work Feed" type="work" rows={(data.work || []).length ? data.work : DEMO.work} />
        <PreparedColumn title="Prepared by Churvox" actions={prepared} onAction={(action) => go(action.route)} />
        <PreviewColumn type="dashboard" item={prepared[0]} onOpen={() => go("invoices")} />
      </section>
    </section>
  );
}

function EntityBoard({ type, rows, reload }) {
  const area = AREAS[type];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [create, setCreate] = useState(false);
  const [notice, setNotice] = useState("");

  const baseRows = rows.length ? rows : DEMO[type] || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return baseRows.filter((item) => !q || searchText(type, item).includes(q));
  }, [baseRows, query, type]);

  const current = selected || filtered[0] || baseRows[0] || {};
  const prepared = area.prepared.map((title) => ({
    actionTitle: title,
    detail: preparedDetail(type, title),
    status: title.includes("Fix") || title.includes("Check") ? "Review" : "Ready",
    route: type,
  }));

  function openItem(item) {
    setSelected(item);
    if (window.innerWidth < 900) setSheet(true);
  }

  function approve(label) {
    setNotice(`${label} marked ready for owner approval.`);
  }

  return (
    <section className="cb-board-page">
      <section className="cb-card cb-page-head">
        <div>
          <span className="cb-kicker">{area.label}</span>
          <h2>{area.line}</h2>
          <p>Feed on the left. Prepared actions in the middle. Detail preview on the right.</p>
        </div>
        <button type="button" onClick={() => setCreate(true)}>{area.action}</button>
      </section>

      {notice ? <section className="cb-notice">{notice}</section> : null}

      <section className="cb-card cb-controls">
        <label>
          Search {area.label}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${area.label.toLowerCase()}...`} />
        </label>
        <button type="button" className="ghost" onClick={() => setQuery("")}>Clear</button>
        <button type="button" className="ghost" onClick={reload}>Refresh</button>
      </section>

      <section className="cb-board">
        <FeedColumn title={area.title} type={type} rows={filtered} selected={current} onSelect={openItem} />
        <PreparedColumn
          title="Prepared by Churvox"
          actions={prepared}
          onAction={(action) => {
            setSelected(action);
            setSheet(true);
          }}
        />
        <PreviewColumn
          type={type}
          item={current}
          onOpen={() => setSheet(true)}
          onApprove={() => approve(titleOf(type, current))}
        />
      </section>

      {sheet ? <DetailSheet type={type} item={current} onClose={() => setSheet(false)} onApprove={() => approve(titleOf(type, current))} /> : null}
      {create ? <CreateModal type={type} onClose={() => setCreate(false)} onSaved={reload} /> : null}
    </section>
  );
}

function FeedColumn({ title, type, rows = [], selected, onSelect }) {
  return (
    <article className="cb-card cb-feed">
      <header>
        <span className="cb-kicker">{title}</span>
        <strong>{rows.length}</strong>
      </header>
      <div className="cb-feed-list">
        {rows.length ? rows.map((item, index) => (
          <button key={index} type="button" className={selected === item ? "active" : ""} onClick={() => onSelect?.(item)}>
            <span>
              <b>{titleOf(type, item, index)}</b>
              <small>{subOf(type, item)}</small>
            </span>
            <Status value={statusOf(type, item)} />
          </button>
        )) : (
          <div className="cb-empty">Nothing here yet.</div>
        )}
      </div>
    </article>
  );
}

function PreparedColumn({ title, actions, onAction }) {
  return (
    <article className="cb-card cb-prepared">
      <header>
        <span className="cb-kicker">{title}</span>
        <strong>{actions.length}</strong>
      </header>
      {actions.map((action) => (
        <button key={action.actionTitle} type="button" onClick={() => onAction(action)}>
          <i />
          <span>
            <b>{action.actionTitle}</b>
            <small>{action.detail}</small>
          </span>
          <strong>{action.status}</strong>
        </button>
      ))}
    </article>
  );
}

function PreviewColumn({ type, item, onOpen, onApprove }) {
  return (
    <article className="cb-card cb-preview-panel">
      <span className="cb-kicker">Detail Preview</span>
      <h2>{titleOf(type, item || {})}</h2>
      <p>{nextMove(type, item)}</p>

      <div className="cb-detail">
        {Object.entries(item || {}).slice(0, 8).map(([key, value]) => (
          <p key={key}>
            <b>{key.replace(/_/g, " ")}</b>
            <span>{clean(value, "—")}</span>
          </p>
        ))}
      </div>

      <footer>
        <button type="button" className="ghost" onClick={onOpen}>Review</button>
        <button type="button" onClick={onApprove || onOpen}>Approve</button>
      </footer>
    </article>
  );
}

function DetailSheet({ type, item, onClose, onApprove }) {
  return (
    <section className="cb-sheet">
      <article>
        <header>
          <div>
            <span className="cb-kicker">Review / edit / approve</span>
            <h2>{titleOf(type, item)}</h2>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <p>{nextMove(type, item)}</p>

        <div className="cb-sheet-grid">
          <div><b>Status</b><span>{statusOf(type, item)}</span></div>
          <div><b>Detail</b><span>{subOf(type, item)}</span></div>
          <div><b>Owner action</b><span>Review prepared action</span></div>
        </div>

        <div className="cb-detail light">
          {Object.entries(item || {}).slice(0, 10).map(([key, value]) => (
            <p key={key}>
              <b>{key.replace(/_/g, " ")}</b>
              <span>{clean(value, "—")}</span>
            </p>
          ))}
        </div>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          <button type="button" onClick={() => { onApprove?.(); onClose(); }}>Approve when ready</button>
        </footer>
      </article>
    </section>
  );
}

function UtilityBoard({ route, go }) {
  const map = {
    proof: ["Proof & Pay", "Completed work, photos and invoice-ready proof packs.", "invoices"],
    payroll: ["Payroll", "Approved hours, missing times and export-ready pay summaries.", "crew"],
  };
  const [title, line, target] = map[route] || ["Workspace", "Prepared actions and approval flow.", "dashboard"];

  return (
    <section className="cb-board-page">
      <section className="cb-card cb-page-head">
        <div>
          <span className="cb-kicker">{title}</span>
          <h2>{line}</h2>
          <p>This area follows the same Command Board pattern.</p>
        </div>
        <button type="button" onClick={() => go(target)}>Open related work</button>
      </section>

      <section className="cb-grid">
        {["Review prepared items", "Check missing info", "Approve next step"].map((x) => (
          <article className="cb-card" key={x}>
            <h3>{x}</h3>
            <p>Prepared by Churvox for owner approval.</p>
            <button type="button" onClick={() => go(target)}>Open</button>
          </article>
        ))}
      </section>
    </section>
  );
}

function PlansBoard({ go }) {
  const [message, setMessage] = useState("");

  function choose(name) {
    localStorage.setItem("churvox_selected_plan", name.toLowerCase());
    setMessage(`${name} selected. Opening Command.`);
    setTimeout(() => go("dashboard"), 600);
  }

  return (
    <section className="cb-board-page">
      <section className="cb-card cb-page-head">
        <div>
          <span className="cb-kicker">Plans</span>
          <h2>Pricing built around AI Operator Actions.</h2>
          <p>Operator is the main plan where Churvox starts preparing admin for approval.</p>
        </div>
      </section>

      {message ? <section className="cb-notice">{message}</section> : null}

      <section className="cb-pricing app">
        {[
          ["Start", "$39", "Solo operators"],
          ["Crew", "$89", "Small teams"],
          ["Operator", "$149", "AI Operator Actions"],
          ["Command", "$299", "MYOB + payroll"],
        ].map(([name, price, sub]) => (
          <article key={name} className={name === "Operator" ? "featured" : ""}>
            <span>{sub}</span>
            <h3>{name}</h3>
            <strong>{price}<small>/month + GST</small></strong>
            <button type="button" onClick={() => choose(name)}>Choose {name}</button>
          </article>
        ))}
      </section>
    </section>
  );
}

function SettingsBoard({ reload }) {
  const user = getUser() || {};
  const [form, setForm] = useState({
    email: user.email || "",
    business_name: user.business_name || user.company_name || "",
    industry: user.industry || "",
    region: user.region || "",
  });
  const [message, setMessage] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save(event) {
    event.preventDefault();
    const next = { ...user, ...form };
    localStorage.setItem("churvox_user", JSON.stringify(next));
    setMessage("Settings saved.");
  }

  return (
    <section className="cb-board-page">
      <form className="cb-card cb-settings" onSubmit={save}>
        <span className="cb-kicker">Settings</span>
        <h2>Business setup and workspace controls.</h2>

        <div className="cb-form-grid">
          <label>Owner email<input value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
          <label>Business name<input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} /></label>
          <label>Industry<input value={form.industry} onChange={(e) => update("industry", e.target.value)} placeholder="Lawn care, plumbing, electrical..." /></label>
          <label>Region<input value={form.region} onChange={(e) => update("region", e.target.value)} /></label>
        </div>

        {message ? <p className="cb-notice inline">{message}</p> : null}

        <footer>
          <button type="submit">Save settings</button>
          <button type="button" className="ghost" onClick={reload}>Refresh account</button>
        </footer>
      </form>
    </section>
  );
}

function CreateModal({ type, onClose, onSaved }) {
  const area = AREAS[type] || AREAS.work;
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const payload = {
        ...form,
        title: form.title || form.name || form.invoice_number || form.quote_number || area.action,
        status: form.status || "new",
      };

      await api(area.create || "/jobs", { method: "POST", body: JSON.stringify(payload) });
      setMessage("Saved.");
      await onSaved?.();
      setTimeout(onClose, 500);
    } catch (err) {
      setMessage(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cb-modal">
      <form onSubmit={submit}>
        <header>
          <h2>{area.action}</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="cb-form-grid">
          {(area.fields || AREAS.work.fields).map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "description" ? (
                <textarea value={form[key] || ""} onChange={(e) => update(key, e.target.value)} />
              ) : (
                <input value={form[key] || ""} onChange={(e) => update(key, e.target.value)} />
              )}
            </label>
          ))}
        </div>

        {message ? <p>{message}</p> : null}

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
        </footer>
      </form>
    </section>
  );
}

function Metric({ label, value, sub }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}

function preparedDetail(type, title) {
  if (type === "work") return title.includes("invoice") ? "Completed work can become invoice-ready." : "Churvox checks worker, proof and missing details.";
  if (type === "clients") return "Churvox checks contact gaps, recent work and follow-up options.";
  if (type === "crew") return "Churvox checks role, workload, region and schedule conflict.";
  if (type === "quotes") return "Churvox prepares follow-up wording or job conversion.";
  if (type === "invoices") return "Churvox checks amount, proof, due date and customer email.";
  return "Prepared for owner approval.";
}

function nextMove(type, item) {
  if (item?.actionTitle) return item.detail || "Review what Churvox prepared, edit if needed, then approve.";
  return {
    work: "Check worker, missing details, proof and invoice readiness before approving the next step.",
    clients: "Check contact details, recent work and unpaid invoices before creating more admin.",
    crew: "Check role, region, workload and conflicts before assigning work.",
    quotes: "Check follow-up timing, wording and whether this should become a job.",
    invoices: "Check amount, customer email, proof, due date and reminder/MYOB path.",
    dashboard: "Review the prepared admin action, edit if needed, then approve.",
  }[type] || "Review what Churvox prepared, edit if needed, then approve.";
}

export default function ChurvoxAIShell() {
  const [route, setRoute] = useState(currentRoute());
  const [authed, setAuthed] = useState(isLoggedIn());
  const [user, setUser] = useState(() => getUser());
  const [data, setData] = useState({ work: [], clients: [], crew: [], quotes: [], invoices: [] });

  function go(next) {
    window.history.pushState({}, "", pathFor(next));
    setRoute(currentRoute());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function load() {
    if (!isLoggedIn()) return;
    const results = await Promise.allSettled([
      api("/jobs"),
      api("/clients"),
      api("/team/workers"),
      api("/quotes"),
      api("/invoices"),
    ]);

    setData({
      work: results[0].status === "fulfilled" ? pickList(results[0].value, ["jobs", "items", "data"]) : [],
      clients: results[1].status === "fulfilled" ? pickList(results[1].value, ["clients", "items", "data"]) : [],
      crew: results[2].status === "fulfilled" ? pickList(results[2].value, ["workers", "team", "items", "data"]) : [],
      quotes: results[3].status === "fulfilled" ? pickList(results[3].value, ["quotes", "items", "data"]) : [],
      invoices: results[4].status === "fulfilled" ? pickList(results[4].value, ["invoices", "items", "data"]) : [],
    });
  }

  function onLogin() {
    setAuthed(true);
    setUser(getUser());
    load();
  }

  function logout() {
    ["token", "authToken", "access_token", "churvox_user", "churvox_email", "churvox_session_active"].forEach((key) => {
      try { localStorage.removeItem(key); } catch {}
    });
    setAuthed(false);
    setUser(null);
    go("public");
  }

  useEffect(() => {
    const onPop = () => setRoute(currentRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (authed && !["public", "login", "signup"].includes(route)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, authed]);

  if (route === "public") return <PublicPage go={go} />;
  if (route === "login" || route === "signup") return <AuthPage mode={route} go={go} onLogin={onLogin} />;
  if (!authed) return <AuthPage mode="login" go={go} onLogin={onLogin} />;

  return (
    <AppShell
      route={AREAS[route] ? route : "dashboard"}
      go={go}
      data={data}
      user={user || getUser() || {}}
      reload={load}
      logout={logout}
    />
  );
}
