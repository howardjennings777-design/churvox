import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const API_ROOT = (() => {
  const raw =
    process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const NAV_ITEMS = [
  { key: "dashboard", label: "Command", sub: "Today" },
  { key: "work", label: "Work", sub: "Jobs" },
  { key: "clients", label: "Clients", sub: "People" },
  { key: "crew", label: "Crew", sub: "Team" },
  { key: "quotes", label: "Quotes", sub: "Sales" },
  { key: "invoices", label: "Invoices", sub: "Money" },
  { key: "proof", label: "Proof & Pay", sub: "Photos" },
  { key: "payroll", label: "Payroll", sub: "Hours" },
  { key: "plans", label: "Plans", sub: "Billing" },
  { key: "settings", label: "Settings", sub: "Setup" },
];

const PLAN_CARDS = [
  {
    name: "Start",
    price: "$39",
    badge: "Solo operator",
    body: "Jobs, clients, quotes, invoices and a clean command desk.",
  },
  {
    name: "Crew",
    price: "$89",
    badge: "Small teams",
    body: "Worker app, team assignment, job notes, proof photos and time flow.",
  },
  {
    name: "Operator",
    price: "$149",
    badge: "Most popular",
    body: "AI Operator Actions that prepare admin for owner approval.",
  },
  {
    name: "Command",
    price: "$299",
    badge: "Growing business",
    body: "MYOB included, payroll workspace, roles, automation and higher limits.",
  },
];

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") {
    if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).join(", ") || fallback;
    return clean(value.name || value.title || value.label || value.email || value.id, fallback);
  }
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function money(value, fallback = "$0") {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(parsed);
}

function getToken() {
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

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("churvox_user") || "null");
  } catch {
    return null;
  }
}

function saveAuth(payload = {}) {
  const data = payload.data || payload;
  const token =
    data.token ||
    data.access_token ||
    data.authToken ||
    data.jwt ||
    data.accessToken ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("access_token", token);
  }

  const user =
    data.user ||
    data.account ||
    data.profile ||
    (data.email || data.id || data._id ? data : {});

  if (user && typeof user === "object") {
    localStorage.setItem("churvox_user", JSON.stringify(user));
    if (user.email) localStorage.setItem("churvox_email", user.email);
    if (user.role) localStorage.setItem("churvox_role", user.role);
    if (user.plan) localStorage.setItem("churvox_plan", user.plan);
  }
}

async function api(path, options = {}) {
  const token = getToken();
  const isForm = options.body instanceof FormData;

  const res = await fetch(`${API_ROOT}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
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

function apiGet(path) {
  return api(path, { method: "GET" });
}

function apiPost(path, body = {}) {
  return api(path, {
    method: "POST",
    body: body instanceof FormData ? body : JSON.stringify(body),
  });
}

async function postFirst(paths, body = {}) {
  let lastError = null;
  for (const path of paths) {
    try {
      return await apiPost(path, body);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Could not save.");
}

function currentRoute() {
  const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path === "home") return "public";
  if (path === "login") return "login";
  if (path === "signup") return "signup";
  if (path === "jobs") return "work";
  if (path === "team") return "crew";
  if (path === "proof-and-pay") return "proof";
  return path.split("/")[0] || "public";
}

function pathFor(route) {
  const paths = {
    public: "/",
    login: "/login",
    signup: "/signup",
    dashboard: "/dashboard",
    work: "/work",
    jobs: "/work",
    clients: "/clients",
    crew: "/crew",
    team: "/crew",
    quotes: "/quotes",
    invoices: "/invoices",
    proof: "/proof-and-pay",
    payroll: "/payroll",
    plans: "/plans",
    settings: "/settings",
  };
  return paths[route] || "/dashboard";
}

function Logo({ compact = false }) {
  return (
    <span className={`op-logo ${compact ? "compact" : ""}`}>
      <i>C</i>
      <span>
        <b>CHURVOX</b>
        {!compact ? <small>Operator Machine</small> : null}
      </span>
    </span>
  );
}

function PublicNav({ go }) {
  return (
    <header className="op-public-nav">
      <button type="button" className="op-logo-button" onClick={() => go("public")}>
        <Logo />
      </button>

      <nav>
        <a href="#how">How it works</a>
        <a href="#features">What it does</a>
        <a href="#pricing">Pricing</a>
        <button type="button" className="ghost" onClick={() => go("login")}>Login</button>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </nav>
    </header>
  );
}

function PublicPage({ go }) {
  return (
    <main className="op-public">
      <div className="op-grid-bg" />
      <div className="op-glow one" />
      <div className="op-glow two" />

      <PublicNav go={go} />

      <section className="op-hero">
        <article className="op-hero-copy">
          <span className="op-kicker">AI command centre for trade and service businesses</span>
          <h1>
            Churvox does the admin.
            <em>You approve.</em>
          </h1>
          <p>
            Work comes in. Churvox checks the client, crew, job, proof, quote, invoice and payment path.
            Then it prepares the next move for the owner to approve.
          </p>

          <div className="op-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
            <a href="#how">See the flow</a>
          </div>

          <div className="op-trust">
            <b>AI prepares</b>
            <b>Owner approves</b>
            <b>No blind sends</b>
            <b>Proof to paid</b>
          </div>
        </article>

        <aside className="op-machine-preview">
          <header>
            <span>Operator Queue</span>
            <strong>Ready now</strong>
          </header>

          {[
            ["Invoice prepared", "Carter Electrical", "$4,870"],
            ["Worker match", "Bayview job", "Approve"],
            ["Quote follow-up", "Northside Plumbing", "$6,420"],
            ["Payment reminder", "INV-1031", "18 days"],
          ].map(([title, sub, meta]) => (
            <article key={title}>
              <i />
              <div>
                <b>{title}</b>
                <small>{sub}</small>
              </div>
              <strong>{meta}</strong>
            </article>
          ))}

          <footer>
            <button type="button" onClick={() => go("signup")}>Approve next move</button>
            <small>Every action is approval-first.</small>
          </footer>
        </aside>
      </section>

      <section className="op-section" id="how">
        <header>
          <span className="op-kicker">How it works</span>
          <h2>One loop from request to paid.</h2>
        </header>

        <div className="op-four">
          {[
            ["1", "Work comes in", "Create a job, quote, invoice, client or request once."],
            ["2", "Churvox checks", "It looks for missing details, crew gaps, proof, pricing and payment state."],
            ["3", "Admin is prepared", "Worker matches, invoice wording, reminders and follow-ups are drafted."],
            ["4", "Owner approves", "You approve, edit or dismiss. Churvox does not act blindly."],
          ].map(([num, title, body]) => (
            <article key={title}>
              <b>{num}</b>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="op-section" id="features">
        <header>
          <span className="op-kicker">What Churvox handles</span>
          <h2>Built around the real business day.</h2>
        </header>

        <div className="op-feature-grid">
          {[
            ["Work slips", "Jobs, workers, notes, photos, status and pricing context."],
            ["Clients", "Customer details that connect to every job, quote and invoice."],
            ["Crew", "Worker assignment, roles, workload and mobile job updates."],
            ["Quotes", "Follow-ups before sales opportunities go cold."],
            ["Invoices", "Draft-first invoices prepared from completed work."],
            ["Proof & Pay", "Photos and notes become customer-ready proof."],
            ["Payroll", "Approved time, pay summaries and export-ready review."],
            ["MYOB", "Optional on Operator. Included in Command."],
          ].map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="op-section" id="pricing">
        <header>
          <span className="op-kicker">Pricing</span>
          <h2>Start simple. Grow into the Operator Machine.</h2>
        </header>

        <PlanGrid onChoose={() => go("signup")} />
      </section>

      <section className="op-final">
        <span className="op-kicker">Ready when you are</span>
        <h2>Let Churvox prepare the admin. You approve the next move.</h2>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </section>
    </main>
  );
}

function AuthPage({ mode, setMode, go, onAuthed }) {
  const signup = mode === "signup";
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
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
      const payload = signup
        ? await apiPost("/auth/register", {
            name: form.name,
            business_name: form.business_name || form.name || "My Business",
            email: form.email,
            password: form.password,
            plan: "operator",
          })
        : await apiPost("/auth/login", {
            email: form.email,
            password: form.password,
          });

      saveAuth(payload);

      if (!getToken() && signup) {
        const loginPayload = await apiPost("/auth/login", {
          email: form.email,
          password: form.password,
        });
        saveAuth(loginPayload);
      }

      onAuthed();
      go("dashboard");
    } catch (err) {
      setMessage(err.message || "Could not open Churvox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="op-public op-auth-page">
      <div className="op-grid-bg" />
      <div className="op-glow one" />
      <PublicNav go={go} />

      <section className="op-auth-wrap">
        <article>
          <span className="op-kicker">Secure workspace</span>
          <h1>{signup ? "Start your Operator Machine." : "Open your Command Desk."}</h1>
          <p>
            Same Churvox system across every screen. Jobs, clients, crew, quotes, invoices and approvals all work from one command centre.
          </p>
          <div className="op-trust">
            <b>Work</b>
            <b>Money</b>
            <b>Crew</b>
            <b>AI approvals</b>
          </div>
        </article>

        <form className="op-auth-card" onSubmit={submit}>
          <Logo />
          <h2>{signup ? "Create account" : "Login"}</h2>

          {signup ? (
            <>
              <label>
                Your name
                <input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Howard Jennings" />
              </label>
              <label>
                Business name
                <input value={form.business_name} onChange={(event) => update("business_name", event.target.value)} placeholder="Your trade business" />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} placeholder="you@business.co.nz" />
          </label>

          <label>
            Password
            <input type="password" required value={form.password} onChange={(event) => update("password", event.target.value)} placeholder="••••••••" />
          </label>

          {message ? <p className="op-error">{message}</p> : null}

          <button type="submit" disabled={busy}>{busy ? "Opening..." : signup ? "Start free trial" : "Open Churvox"}</button>

          <small>
            {signup ? "Already have an account?" : "Need an account?"}{" "}
            <button type="button" onClick={() => setMode(signup ? "login" : "signup")}>
              {signup ? "Login" : "Start free trial"}
            </button>
          </small>
        </form>
      </section>
    </main>
  );
}

function AppShell({ route, go, data, user, reload, logout, loading }) {
  const current = route === "jobs" ? "work" : route === "team" ? "crew" : route;

  return (
    <main className="op-app">
      <aside className="op-sidebar">
        <button type="button" className="op-logo-button" onClick={() => go("dashboard")}>
          <Logo />
        </button>

        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={current === item.key ? "active" : ""}
              onClick={() => go(item.key)}
            >
              <b>{item.label}</b>
              <small>{item.sub}</small>
            </button>
          ))}
        </nav>

        <button type="button" className="op-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="op-workspace">
        <header className="op-topbar">
          <div>
            <span className="op-kicker">Operator Machine</span>
            <h1>{pageTitle(current)}</h1>
          </div>
          <aside>
            <button type="button" onClick={reload}>{loading ? "Refreshing..." : "Refresh"}</button>
            <strong>{clean(user?.name || user?.email, "Owner")}</strong>
          </aside>
        </header>

        {current === "dashboard" ? <Dashboard data={data} go={go} /> : null}
        {current === "work" ? <RecordsPage type="work" rows={data.jobs} reload={reload} /> : null}
        {current === "clients" ? <RecordsPage type="clients" rows={data.clients} reload={reload} /> : null}
        {current === "crew" ? <RecordsPage type="crew" rows={data.team} reload={reload} /> : null}
        {current === "quotes" ? <RecordsPage type="quotes" rows={data.quotes} reload={reload} /> : null}
        {current === "invoices" ? <RecordsPage type="invoices" rows={data.invoices} reload={reload} /> : null}
        {current === "proof" ? <ProofPay data={data} /> : null}
        {current === "payroll" ? <Payroll data={data} /> : null}
        {current === "plans" ? <Plans /> : null}
        {current === "settings" ? <Settings user={user} /> : null}
      </section>
    </main>
  );
}

function pageTitle(route) {
  return {
    dashboard: "Today’s Command Desk",
    work: "Work Slips",
    clients: "Clients",
    crew: "Crew",
    quotes: "Quotes",
    invoices: "Invoices",
    proof: "Proof & Pay",
    payroll: "Payroll Review",
    plans: "Plans",
    settings: "Settings",
  }[route] || "Command Desk";
}

function Dashboard({ data, go }) {
  const jobs = data.jobs || [];
  const clients = data.clients || [];
  const team = data.team || [];
  const quotes = data.quotes || [];
  const invoices = data.invoices || [];
  const invoiceTotal = invoices.reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || item.amount_owing || 0), 0);

  const queue = [
    ["Invoices ready", `${invoices.length || 3} invoices in the money flow`, money(invoiceTotal, "$18,420"), "invoices"],
    ["Work needs owner", `${jobs.length || 8} jobs in the machine`, "Open", "work"],
    ["Quotes to follow", `${quotes.length || 4} quotes to review`, "Review", "quotes"],
    ["Crew workload", `${team.length || 5} people in crew`, "Check", "crew"],
  ];

  return (
    <section className="op-page">
      <section className="op-health">
        <Metric label="Jobs" value={jobs.length || 8} sub="Work in motion" />
        <Metric label="Clients" value={clients.length || 12} sub="Customer base" />
        <Metric label="Invoices" value={invoices.length || 3} sub="Cashflow" />
        <Metric label="Money waiting" value={money(invoiceTotal, "$18,420")} sub="Invoice path" />
        <Metric label="Crew" value={team.length || 5} sub="Active users" />
      </section>

      <section className="op-dashboard-grid">
        <article className="op-panel big">
          <header>
            <span className="op-kicker">Command Queue</span>
            <h2>Approve the next move.</h2>
          </header>

          <div className="op-queue">
            {queue.map(([title, sub, meta, target]) => (
              <button type="button" key={title} onClick={() => go(target)}>
                <i />
                <span>
                  <b>{title}</b>
                  <small>{sub}</small>
                </span>
                <strong>{meta}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="op-panel dark">
          <span className="op-kicker">AI Next Move</span>
          <h2>Review money and work first.</h2>
          <p>
            The fastest win for trade owners is simple: completed work becomes invoice-ready admin,
            overdue invoices get reminders, and quotes get followed up.
          </p>
          <button type="button" onClick={() => go("invoices")}>Open invoices</button>
        </article>
      </section>

      <article className="op-panel">
        <header>
          <span className="op-kicker">Recent Work</span>
          <h2>Work moving through the machine.</h2>
        </header>
        <DataTable type="work" rows={jobs} />
      </article>
    </section>
  );
}

function Metric({ label, value, sub }) {
  return (
    <article>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}

function RecordsPage({ type, rows = [], reload }) {
  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const config = pageConfig(type);
  const list = rows.length ? rows : fallbackRows(type);
  const active = selected || list[0];

  return (
    <section className="op-page">
      <section className="op-panel op-page-head">
        <div>
          <span className="op-kicker">{config.kicker}</span>
          <h2>{config.title}</h2>
          <p>{config.body}</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}>{config.action}</button>
      </section>

      <section className="op-record-layout">
        <article className="op-panel">
          <header>
            <h2>{config.listTitle}</h2>
            <button type="button" className="ghost" onClick={reload}>Refresh</button>
          </header>

          <div className="op-list">
            {list.map((item, index) => (
              <button
                type="button"
                key={clean(item.id || item._id || item.email || index)}
                className={active === item ? "active" : ""}
                onClick={() => setSelected(item)}
              >
                <span>
                  <b>{recordTitle(type, item, index)}</b>
                  <small>{recordSub(type, item)}</small>
                </span>
                <Status value={recordStatus(type, item)} />
              </button>
            ))}
          </div>
        </article>

        <article className="op-panel dark">
          <span className="op-kicker">AI Next Move</span>
          <h2>{recordTitle(type, active, 0)}</h2>
          <p>{config.ai}</p>
          <div className="op-detail">
            {Object.entries(active || {}).slice(0, 8).map(([key, value]) => (
              <p key={key}>
                <b>{key.replace(/_/g, " ")}</b>
                <span>{clean(value, "—")}</span>
              </p>
            ))}
          </div>
        </article>
      </section>

      {modalOpen ? (
        <CreateModal type={type} onClose={() => setModalOpen(false)} onSaved={reload} />
      ) : null}
    </section>
  );
}

function pageConfig(type) {
  return {
    work: {
      kicker: "Work Slips",
      title: "Jobs, crew, notes, proof and admin in one flow.",
      body: "Owners see the job path clearly. Workers do the work. Churvox prepares the admin.",
      action: "Add work",
      listTitle: "All work",
      ai: "Check worker, status, proof, client details and pricing before preparing invoice/admin.",
    },
    clients: {
      kicker: "Clients",
      title: "Customer records that feed every workflow.",
      body: "Clients connect directly to jobs, quotes, invoices and payment follow-ups.",
      action: "Add client",
      listTitle: "Client base",
      ai: "Check missing phone, email, address and recent work history before the next job.",
    },
    crew: {
      kicker: "Crew",
      title: "Team workload, roles and job readiness.",
      body: "Keep worker assignment simple and business-owner friendly.",
      action: "Invite crew",
      listTitle: "Crew members",
      ai: "Check role, area, workload and schedule conflict before assigning work.",
    },
    quotes: {
      kicker: "Quotes",
      title: "Follow up sales before they go cold.",
      body: "Quotes should become jobs or clean follow-ups, not forgotten documents.",
      action: "Create quote",
      listTitle: "Quote pipeline",
      ai: "Prepare follow-up wording and suggest next action based on quote age and value.",
    },
    invoices: {
      kicker: "Invoices",
      title: "Draft-first cashflow without messy admin.",
      body: "Invoices stay owner-approved before sending, reminders or accounting sync.",
      action: "Create invoice",
      listTitle: "Invoice flow",
      ai: "Check amount, customer email, due date, proof and reminder path.",
    },
  }[type];
}

function recordTitle(type, item = {}, index = 0) {
  if (type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  if (type === "invoices") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work Slip ${index + 1}`);
}

function recordSub(type, item = {}) {
  if (type === "clients") return clean(item.email || item.phone || item.address, "Client details");
  if (type === "crew") return clean(item.role || item.region || item.phone, "Crew member");
  if (type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote");
  if (type === "invoices") return clean(item.client_name || item.customer_name || item.status, "Invoice");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work details");
}

function recordStatus(type, item = {}) {
  if (type === "invoices") return clean(item.status || item.invoice_status || item.payment_status, "Draft");
  if (type === "quotes") return clean(item.status || item.quote_status, "Prepared");
  if (type === "crew") return clean(item.status || item.role, "Active");
  if (type === "clients") return clean(item.status, "Ready");
  return clean(item.status || item.job_status, "Ready");
}

function Status({ value }) {
  const label = clean(value, "Ready");
  const lower = label.toLowerCase();
  const tone =
    lower.includes("paid") || lower.includes("complete")
      ? "green"
      : lower.includes("overdue") || lower.includes("block")
      ? "red"
      : lower.includes("need") || lower.includes("draft") || lower.includes("pending")
      ? "amber"
      : lower.includes("sent") || lower.includes("prepared")
      ? "blue"
      : "ready";
  return <span className={`op-status ${tone}`}>{label}</span>;
}

function DataTable({ type, rows = [] }) {
  const list = rows.length ? rows : fallbackRows(type);

  return (
    <div className="op-table">
      <div>
        <span>Name</span>
        <span>Detail</span>
        <span>Status</span>
        <span>Value</span>
      </div>
      {list.map((item, index) => (
        <div key={clean(item.id || item._id || item.email || index)}>
          <strong>{recordTitle(type, item, index)}</strong>
          <span>{recordSub(type, item)}</span>
          <Status value={recordStatus(type, item)} />
          <span>{money(item.amount || item.total || item.price || item.balance, "—")}</span>
        </div>
      ))}
    </div>
  );
}

function fallbackRows(type) {
  const rows = {
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
  return rows[type] || rows.work;
}

function CreateModal({ type, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const fields = formFields(type);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const payload = {
      ...form,
      title: form.title || form.name || form.client_name || form.invoice_number || form.quote_number,
      status: form.status || "new",
    };

    const paths = {
      work: ["/jobs"],
      clients: ["/clients"],
      crew: ["/team/invite", "/team/workers"],
      quotes: ["/quotes"],
      invoices: ["/invoices"],
    }[type] || ["/jobs"];

    try {
      await postFirst(paths, payload);
      setMessage("Saved.");
      await onSaved?.();
      window.setTimeout(onClose, 450);
    } catch (err) {
      setMessage(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="op-modal">
      <form onSubmit={submit}>
        <header>
          <h2>{type === "work" ? "Add work" : `Create ${type}`}</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="op-form-grid">
          {fields.map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "description" ? (
                <textarea value={form[key] || ""} onChange={(event) => update(key, event.target.value)} />
              ) : (
                <input value={form[key] || ""} onChange={(event) => update(key, event.target.value)} />
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

function formFields(type) {
  return {
    work: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
    clients: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
    crew: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
    quotes: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
    invoices: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  }[type] || [["title", "Title"], ["description", "Description"]];
}

function ProofPay({ data }) {
  const completed = (data.jobs || []).filter((job) => /complete|done/i.test(clean(job.status || job.job_status)));
  return (
    <section className="op-page">
      <section className="op-panel op-page-head">
        <div>
          <span className="op-kicker">Proof & Pay</span>
          <h2>Turn completed work into proof, invoice and payment follow-up.</h2>
          <p>Worker photos and completion notes become owner-approved admin.</p>
        </div>
      </section>

      <section className="op-feature-grid">
        <article className="op-panel">
          <h3>Completed jobs</h3>
          <strong>{completed.length || 5}</strong>
          <p>Ready for proof review.</p>
        </article>
        <article className="op-panel">
          <h3>Proof photos</h3>
          <strong>12</strong>
          <p>Worker uploads waiting for owner review.</p>
        </article>
        <article className="op-panel dark">
          <h3>AI Next Move</h3>
          <p>Package proof with invoice wording before sending anything to clients.</p>
        </article>
      </section>
    </section>
  );
}

function Payroll({ data }) {
  return (
    <section className="op-page">
      <section className="op-panel op-page-head">
        <div>
          <span className="op-kicker">Payroll Workspace</span>
          <h2>Review hours before payroll leaves Churvox.</h2>
          <p>Payroll stays separate from owner billing, pricing and settings.</p>
        </div>
      </section>

      <section className="op-feature-grid">
        <article className="op-panel">
          <h3>Timesheets</h3>
          <strong>{(data.team || []).length || 8}</strong>
          <p>Workers with hours to review.</p>
        </article>
        <article className="op-panel">
          <h3>Approved hours</h3>
          <strong>126</strong>
          <p>Ready for export.</p>
        </article>
        <article className="op-panel dark">
          <h3>AI Payroll Check</h3>
          <p>Flag missing breaks, odd hours and incomplete job notes before export.</p>
        </article>
      </section>
    </section>
  );
}

function PlanGrid({ onChoose }) {
  return (
    <div className="op-pricing">
      {PLAN_CARDS.map((plan) => (
        <article key={plan.name} className={plan.name === "Operator" ? "featured" : ""}>
          <span>{plan.badge}</span>
          <h3>{plan.name}</h3>
          <strong>{plan.price}<small>/month + GST</small></strong>
          <p>{plan.body}</p>
          <button type="button" onClick={onChoose}>Choose {plan.name}</button>
        </article>
      ))}
    </div>
  );
}

function Plans() {
  return (
    <section className="op-page">
      <section className="op-panel op-page-head">
        <div>
          <span className="op-kicker">Plans</span>
          <h2>Pricing built around the Operator Machine.</h2>
          <p>Operator is where AI starts preparing admin for approval.</p>
        </div>
      </section>
      <PlanGrid />
    </section>
  );
}

function Settings({ user }) {
  return (
    <section className="op-page">
      <section className="op-panel op-page-head">
        <div>
          <span className="op-kicker">Settings</span>
          <h2>Business setup and workspace controls.</h2>
          <p>Keep setup clean, obvious and useful.</p>
        </div>
      </section>

      <section className="op-panel">
        <div className="op-form-grid">
          <label>
            Owner email
            <input defaultValue={user?.email || ""} />
          </label>
          <label>
            Business name
            <input defaultValue={user?.business_name || user?.company_name || ""} />
          </label>
          <label>
            Industry
            <input defaultValue={user?.industry || ""} placeholder="Lawn care, plumbing, electrical..." />
          </label>
          <label>
            Region
            <input defaultValue={user?.region || ""} />
          </label>
        </div>
      </section>
    </section>
  );
}

export default function ChurvoxAIShell() {
  const [route, setRouteState] = useState(currentRoute());
  const [user, setUser] = useState(() => getUser());
  const [data, setData] = useState({ jobs: [], clients: [], team: [], quotes: [], invoices: [] });
  const [loading, setLoading] = useState(false);

  const authed = Boolean(getToken());

  const safeRoute = useMemo(() => {
    if (route === "jobs") return "work";
    if (route === "team") return "crew";
    return route;
  }, [route]);

  function go(next) {
    const path = pathFor(next);
    window.history.pushState({}, "", path);
    setRouteState(currentRoute());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAuthed() {
    setUser(getUser());
    loadData();
  }

  async function loadData() {
    if (!getToken()) return;
    setLoading(true);

    try {
      const [jobs, clients, team, quotes, invoices] = await Promise.allSettled([
        apiGet("/jobs"),
        apiGet("/clients"),
        apiGet("/team/workers"),
        apiGet("/quotes"),
        apiGet("/invoices"),
      ]);

      function pick(result, keys) {
        if (result.status !== "fulfilled") return [];
        const value = result.value;
        if (Array.isArray(value)) return value;
        for (const key of keys) {
          if (Array.isArray(value?.[key])) return value[key];
        }
        return [];
      }

      setData({
        jobs: pick(jobs, ["jobs", "items", "data"]),
        clients: pick(clients, ["clients", "items", "data"]),
        team: pick(team, ["workers", "team", "items", "data"]),
        quotes: pick(quotes, ["quotes", "items", "data"]),
        invoices: pick(invoices, ["invoices", "items", "data"]),
      });
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    ["token", "authToken", "access_token", "churvox_user", "churvox_email", "churvox_role"].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });
    setUser(null);
    go("public");
  }

  useEffect(() => {
    const onPop = () => setRouteState(currentRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (authed && !["public", "login", "signup"].includes(safeRoute)) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeRoute]);

  if (safeRoute === "public") return <PublicPage go={go} />;

  if (safeRoute === "login" || safeRoute === "signup") {
    return (
      <AuthPage
        mode={safeRoute === "signup" ? "signup" : "login"}
        setMode={go}
        go={go}
        onAuthed={onAuthed}
      />
    );
  }

  if (!authed) {
    return <AuthPage mode="login" setMode={go} go={go} onAuthed={onAuthed} />;
  }

  return (
    <>
      {loading ? <div className="op-loading">Refreshing Churvox…</div> : null}
      <AppShell
        route={safeRoute}
        go={go}
        data={data}
        user={user || getUser() || {}}
        reload={loadData}
        logout={logout}
        loading={loading}
      />
    </>
  );
}
