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

const NAV = [
  ["today", "Today", "Prepared"],
  ["work", "Work", "Jobs"],
  ["money", "Money", "Invoices"],
  ["clients", "Clients", "People"],
  ["crew", "Crew", "Team"],
  ["quotes", "Quotes", "Sales"],
  ["proof", "Proof", "Photos"],
  ["payroll", "Payroll", "Hours"],
  ["settings", "Settings", "Setup"],
];

const PAGE = {
  work: {
    title: "Work",
    line: "Jobs, worker actions, proof and invoice readiness.",
    read: "/jobs",
    create: "/jobs",
    action: "Add work",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
    prepared: [
      ["Assign worker", "Churvox checks crew, workload and conflicts before assignment."],
      ["Fix missing info", "Jobs missing client, address, price or proof are surfaced first."],
      ["Prepare invoice", "Completed jobs can become owner-approved invoice drafts."],
    ],
  },
  money: {
    title: "Money",
    line: "Draft invoices, overdue reminders, payment state and MYOB readiness.",
    read: "/invoices",
    create: "/invoices",
    action: "Create invoice",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
    prepared: [
      ["Approve invoice draft", "Completed work has been turned into a draft invoice."],
      ["Send payment reminder", "Overdue customers are ready for owner-approved reminders."],
      ["Check proof pack", "Photos and notes can be attached before sending."],
    ],
  },
  clients: {
    title: "Clients",
    line: "Customer records connected to work, money and follow-ups.",
    read: "/clients",
    create: "/clients",
    action: "Add client",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
    prepared: [
      ["Fix contact gaps", "Missing emails and phone numbers are shown before they block admin."],
      ["Create job", "Start a new work slip from the selected client."],
      ["Prepare follow-up", "Recent work and unpaid invoices shape the next message."],
    ],
  },
  crew: {
    title: "Crew",
    line: "Workers, workload, roles, regions and schedule conflict checks.",
    read: "/team/workers",
    create: "/team/invite",
    action: "Invite crew",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
    prepared: [
      ["Suggest worker", "Churvox checks role, region and workload."],
      ["Warn on conflict", "Schedule overlaps are highlighted before assignment."],
      ["Review workload", "Busy workers and open capacity are easy to see."],
    ],
  },
  quotes: {
    title: "Quotes",
    line: "Quote pipeline, follow-ups and accepted work ready to become jobs.",
    read: "/quotes",
    create: "/quotes",
    action: "Create quote",
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
    prepared: [
      ["Follow up quote", "Churvox prepares the message before the lead goes cold."],
      ["Convert to job", "Accepted quotes become work slips."],
      ["Improve wording", "Quote descriptions are cleaned before sending."],
    ],
  },
};

const DEMO = {
  work: [
    { title: "Switchboard upgrade", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { title: "Garden clean-up", client_name: "Bayview Rentals", status: "Needs info", amount: 780 },
    { title: "Hot water repair", client_name: "Harbour Plumbing", status: "Prepared", amount: 1240 },
  ],
  money: [
    { invoice_number: "INV-1047", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { invoice_number: "INV-1031", client_name: "Bayview Rentals", status: "Overdue", amount: 2430 },
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
};

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return clean(value.title || value.name || value.email || value.label || value.id, fallback);
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
    today: "/dashboard",
    dashboard: "/dashboard",
    work: "/work",
    money: "/invoices",
    clients: "/clients",
    crew: "/crew",
    team: "/crew",
    quotes: "/quotes",
    proof: "/proof-and-pay",
    payroll: "/payroll",
    settings: "/settings",
  }[route] || "/dashboard";
}

function routeNow() {
  const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path === "home") return "public";
  if (path === "login" || path === "signup") return path;
  if (path === "dashboard") return "today";
  if (path === "jobs") return "work";
  if (path === "invoices") return "money";
  if (path === "team") return "crew";
  if (path === "proof-and-pay") return "proof";
  return [...NAV.map(([key]) => key), "public"].includes(path) ? path : "today";
}

function getToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

function loggedIn() {
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

function saveAuth(payload = {}, email = "") {
  const data = payload.data || payload || {};
  const authToken = data.token || data.access_token || data.authToken || data.jwt || "";
  if (authToken) {
    localStorage.setItem("token", authToken);
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("access_token", authToken);
  }

  const user = data.user || data.account || data.profile || (data.email ? data : null) || { email };
  localStorage.setItem("churvox_user", JSON.stringify(user));
  localStorage.setItem("churvox_session_active", "true");
  if (email || user.email) localStorage.setItem("churvox_email", user.email || email);
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
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
  if (item.kind === "prepared") return item.title;
  if (type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  if (type === "money") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work ${index + 1}`);
}

function subOf(type, item = {}) {
  if (item.kind === "prepared") return item.detail;
  if (type === "clients") return clean(item.email || item.phone || item.address, "Client details");
  if (type === "crew") return clean(item.role || item.region || item.phone, "Crew member");
  if (type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote");
  if (type === "money") return clean(item.client_name || item.customer_name || item.status, "Invoice");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work details");
}

function statusOf(type, item = {}) {
  if (item.kind === "prepared") return "Prepared";
  return clean(item.status || item.invoice_status || item.payment_status || item.quote_status || item.role, "Ready");
}

function searchText(type, item) {
  return [titleOf(type, item), subOf(type, item), statusOf(type, item), ...Object.values(item || {}).map((v) => clean(v))]
    .join(" ")
    .toLowerCase();
}

function Logo() {
  return (
    <span className="desk-logo">
      <i>C</i>
      <span>
        <b>CHURVOX</b>
        <small>Command Desk</small>
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
  return <span className={`desk-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="desk-public-nav">
      <button type="button" className="desk-logo-button" onClick={() => go("public")}><Logo /></button>
      <nav>
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
        <button type="button" className="ghost" onClick={() => go("login")}>Login</button>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </nav>
    </header>
  );
}

function PublicPage({ go }) {
  return (
    <main className="desk-public">
      <PublicNav go={go} />

      <section className="desk-hero">
        <article>
          <span className="desk-kicker">AI command desk for trade and service owners</span>
          <h1>Churvox does the admin. <em>You approve.</em></h1>
          <p>
            Work comes in, Churvox prepares the admin, and the owner reviews the next move.
            Jobs, money, clients, crew, quotes, proof and payroll finally sit in one calm workspace.
          </p>
          <div className="desk-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
        </article>

        <aside className="desk-product-shot">
          <header>
            <span>Prepared for you</span>
            <strong>Today</strong>
          </header>
          {[
            ["Invoice ready", "Completed job has proof and amount", "$4,870"],
            ["Worker suggested", "No schedule conflict found", "Approve"],
            ["Quote follow-up", "Customer has not replied", "Send"],
            ["Payment reminder", "18 days overdue", "Review"],
          ].map(([title, detail, meta]) => (
            <button type="button" key={title}>
              <span><b>{title}</b><small>{detail}</small></span>
              <strong>{meta}</strong>
            </button>
          ))}
        </aside>
      </section>

      <section className="desk-section" id="how">
        <span className="desk-kicker">How the app works</span>
        <h2>Every screen starts with prepared work.</h2>
        <div className="desk-feature-grid">
          {[
            ["Prepared first", "The owner sees what Churvox prepared before searching through records."],
            ["Clean feed", "Jobs, invoices, quotes and clients are simple rows, not noisy boxes."],
            ["Detail drawer", "Tap anything to review, edit and approve without jumping pages."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="desk-section" id="pricing">
        <span className="desk-kicker">Pricing</span>
        <h2>Operator is the AI admin plan.</h2>
        <div className="desk-pricing">
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
      go("today");
    } catch (err) {
      setError(err.message || "Could not open Churvox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="desk-public">
      <PublicNav go={go} />
      <section className="desk-auth">
        <article>
          <span className="desk-kicker">Secure command desk</span>
          <h1>{signup ? "Start your command desk." : "Open your prepared actions."}</h1>
          <p>Same simple flow: prepared work, clean feed, detail drawer, approve.</p>
        </article>

        <form className="desk-card desk-auth-card" onSubmit={submit}>
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

          {error ? <p className="desk-error">{error}</p> : null}

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
  const [createType, setCreateType] = useState(null);
  const current = PAGE[route] ? route : route;

  function quickAdd() {
    setCreateType(PAGE[current] ? current : "work");
  }

  return (
    <main className="desk-app">
      <header className="desk-topbar">
        <button type="button" className="desk-logo-button" onClick={() => go("today")}><Logo /></button>
        <label className="desk-search">
          <span>Search</span>
          <input placeholder="Find jobs, clients, invoices..." />
        </label>
        <button type="button" className="ghost" onClick={() => go("today")}>Notifications</button>
        <button type="button" onClick={quickAdd}>Quick add</button>
        <strong>{clean(user?.name || user?.email, "Owner")}</strong>
      </header>

      <aside className="desk-side-nav">
        {NAV.map(([key, label, sub]) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            <b>{label}</b><small>{sub}</small>
          </button>
        ))}
        <button type="button" className="desk-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="desk-main">
        {route === "today" ? <TodayPage data={data} go={go} /> : null}
        {PAGE[route] ? <DeskPage type={route} rows={data[route] || []} reload={reload} /> : null}
        {["proof", "payroll", "settings"].includes(route) ? <UtilityPage route={route} go={go} /> : null}
      </section>

      <nav className="desk-mobile-nav">
        {["today", "work", "money", "crew", "settings"].map((key) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {NAV.find(([navKey]) => navKey === key)?.[1] || key}
          </button>
        ))}
      </nav>

      {createType ? <CreateModal type={createType} onClose={() => setCreateType(null)} onSaved={reload} /> : null}
    </main>
  );
}

function TodayPage({ data, go }) {
  const invoiceTotal = (data.money || []).reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);
  const prepared = [
    { title: "Invoice draft ready", detail: "Completed work has proof and amount.", route: "money" },
    { title: "Worker suggestion ready", detail: "Churvox found a likely worker match.", route: "work" },
    { title: "Quote follow-up prepared", detail: "A customer has not replied yet.", route: "quotes" },
  ];

  return (
    <section className="desk-page">
      <section className="desk-hero-strip">
        <div>
          <span className="desk-kicker">Prepared for you</span>
          <h1>Churvox prepared today’s admin.</h1>
          <p>Review the work Churvox has already lined up, then approve the next move.</p>
        </div>
        <button type="button" onClick={() => go("money")}>Start with money</button>
      </section>

      <section className="desk-metrics">
        <Metric label="Prepared actions" value="7" sub="Ready to review" />
        <Metric label="Work" value={(data.work || []).length || 8} sub="Jobs moving" />
        <Metric label="Money waiting" value={money(invoiceTotal, "$18,420")} sub="Invoice path" />
        <Metric label="Quotes" value={(data.quotes || []).length || 4} sub="Follow-ups" />
      </section>

      <section className="desk-layout">
        <article className="desk-card desk-prepared">
          <header><span className="desk-kicker">Prepared by Churvox</span></header>
          {prepared.map((item) => (
            <button key={item.title} type="button" onClick={() => go(item.route)}>
              <b>{item.title}</b>
              <small>{item.detail}</small>
              <span>Review</span>
            </button>
          ))}
        </article>

        <FeedCard title="Work Feed" type="work" rows={(data.work || []).length ? data.work : DEMO.work} />

        <article className="desk-card desk-detail-card">
          <span className="desk-kicker">Detail Preview</span>
          <h2>Invoice draft ready</h2>
          <p>Completed work has proof, amount and customer details ready for owner approval.</p>
          <button type="button" onClick={() => go("money")}>Review invoice</button>
        </article>
      </section>
    </section>
  );
}

function DeskPage({ type, rows, reload }) {
  const page = PAGE[type];
  const base = rows.length ? rows : DEMO[type] || [];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(base[0] || {});
  const [sheet, setSheet] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter((item) => !q || searchText(type, item).includes(q));
  }, [base, query, type]);

  const active = selected && Object.keys(selected).length ? selected : list[0] || base[0] || {};

  function open(item) {
    setSelected(item);
    if (window.innerWidth < 980) setSheet(true);
  }

  function approve(label) {
    setNotice(`${label} marked ready for approval.`);
  }

  return (
    <section className="desk-page">
      <section className="desk-hero-strip">
        <div>
          <span className="desk-kicker">{page.title}</span>
          <h1>{page.line}</h1>
          <p>Prepared work first, feed second, detail drawer last.</p>
        </div>
        <button type="button" onClick={() => setCreateOpen(true)}>{page.action}</button>
      </section>

      {notice ? <section className="desk-notice">{notice}</section> : null}

      <section className="desk-prepared-row">
        {page.prepared.map(([title, detail]) => (
          <button key={title} type="button" onClick={() => { setSelected({ kind: "prepared", title, detail, status: "Prepared" }); setSheet(true); }}>
            <b>{title}</b>
            <small>{detail}</small>
          </button>
        ))}
      </section>

      <section className="desk-card desk-controls">
        <label>
          Search {page.title}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${page.title.toLowerCase()}...`} />
        </label>
        <button type="button" className="ghost" onClick={() => setQuery("")}>Clear</button>
        <button type="button" className="ghost" onClick={reload}>Refresh</button>
      </section>

      <section className="desk-layout">
        <FeedCard title={`${page.title} Feed`} type={type} rows={list} selected={active} onSelect={open} />
        <PreparedCard page={page} onPrepare={(title, detail) => { setSelected({ kind: "prepared", title, detail, status: "Prepared" }); setSheet(true); }} />
        <DetailCard type={type} item={active} onOpen={() => setSheet(true)} onApprove={() => approve(titleOf(type, active))} />
      </section>

      {sheet ? <DetailSheet type={type} item={active} onClose={() => setSheet(false)} onApprove={() => approve(titleOf(type, active))} /> : null}
      {createOpen ? <CreateModal type={type} onClose={() => setCreateOpen(false)} onSaved={reload} /> : null}
    </section>
  );
}

function FeedCard({ title, type, rows, selected, onSelect }) {
  return (
    <article className="desk-card desk-feed">
      <header><span className="desk-kicker">{title}</span><strong>{rows.length}</strong></header>
      <div className="desk-feed-list">
        {rows.length ? rows.map((item, index) => (
          <button key={index} type="button" className={selected === item ? "active" : ""} onClick={() => onSelect?.(item)}>
            <span><b>{titleOf(type, item, index)}</b><small>{subOf(type, item)}</small></span>
            <Status value={statusOf(type, item)} />
          </button>
        )) : <p className="desk-empty">Nothing here yet.</p>}
      </div>
    </article>
  );
}

function PreparedCard({ page, onPrepare }) {
  return (
    <article className="desk-card desk-prepared">
      <header><span className="desk-kicker">Prepared by Churvox</span></header>
      {page.prepared.map(([title, detail]) => (
        <button key={title} type="button" onClick={() => onPrepare(title, detail)}>
          <b>{title}</b>
          <small>{detail}</small>
          <span>Review</span>
        </button>
      ))}
    </article>
  );
}

function DetailCard({ type, item, onOpen, onApprove }) {
  return (
    <article className="desk-card desk-detail-card">
      <span className="desk-kicker">Detail Preview</span>
      <h2>{titleOf(type, item)}</h2>
      <p>{nextMove(type, item)}</p>

      <div className="desk-detail">
        {Object.entries(item || {}).slice(0, 7).map(([key, value]) => (
          <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "—")}</span></p>
        ))}
      </div>

      <footer>
        <button type="button" className="ghost" onClick={onOpen}>Review</button>
        <button type="button" onClick={onApprove}>Approve</button>
      </footer>
    </article>
  );
}

function DetailSheet({ type, item, onClose, onApprove }) {
  return (
    <section className="desk-sheet">
      <article>
        <header>
          <div><span className="desk-kicker">Review / edit / approve</span><h2>{titleOf(type, item)}</h2></div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <p>{nextMove(type, item)}</p>

        <div className="desk-sheet-grid">
          <div><b>Status</b><span>{statusOf(type, item)}</span></div>
          <div><b>Detail</b><span>{subOf(type, item)}</span></div>
          <div><b>Owner action</b><span>Review prepared work</span></div>
        </div>

        <div className="desk-detail light">
          {Object.entries(item || {}).slice(0, 10).map(([key, value]) => (
            <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "—")}</span></p>
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

function UtilityPage({ route, go }) {
  const map = {
    proof: ["Proof", "Proof packs should turn completed work into invoice-ready customer updates.", "money"],
    payroll: ["Payroll", "Approved hours, missing times and export-ready pay summaries.", "crew"],
    settings: ["Settings", "Business profile, roles, invoices, MYOB, SMS and notifications.", "today"],
  };
  const [title, line, target] = map[route] || map.settings;

  return (
    <section className="desk-page">
      <section className="desk-hero-strip">
        <div><span className="desk-kicker">{title}</span><h1>{line}</h1><p>This page uses the same prepared-work pattern.</p></div>
        <button type="button" onClick={() => go(target)}>Open related area</button>
      </section>

      <section className="desk-prepared-row">
        {["Review prepared items", "Check missing info", "Approve next step"].map((item) => (
          <button key={item} type="button" onClick={() => go(target)}><b>{item}</b><small>Prepared by Churvox</small></button>
        ))}
      </section>
    </section>
  );
}

function CreateModal({ type, onClose, onSaved }) {
  const page = PAGE[type] || PAGE.work;
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
        title: form.title || form.name || form.invoice_number || form.quote_number || page.action,
        status: form.status || "new",
      };
      await api(page.create, { method: "POST", body: JSON.stringify(payload) });
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
    <section className="desk-modal">
      <form onSubmit={submit}>
        <header><h2>{page.action}</h2><button type="button" onClick={onClose}>×</button></header>

        <div className="desk-form-grid">
          {page.fields.map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "description"
                ? <textarea value={form[key] || ""} onChange={(e) => update(key, e.target.value)} />
                : <input value={form[key] || ""} onChange={(e) => update(key, e.target.value)} />}
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

function nextMove(type, item = {}) {
  if (item.kind === "prepared") return item.detail;
  return {
    work: "Check worker, missing details, proof and invoice readiness before approving the next step.",
    money: "Check amount, customer email, proof, due date and reminder/MYOB path.",
    clients: "Check contact details, recent work and unpaid invoices before creating more admin.",
    crew: "Check role, region, workload and conflicts before assigning work.",
    quotes: "Check follow-up timing, wording and whether this should become a job.",
  }[type] || "Review what Churvox prepared, edit if needed, then approve.";
}

export default function ChurvoxAIShell() {
  const [route, setRoute] = useState(routeNow());
  const [authed, setAuthed] = useState(loggedIn());
  const [user, setUser] = useState(() => getUser());
  const [data, setData] = useState({ work: [], money: [], clients: [], crew: [], quotes: [] });

  function go(next) {
    window.history.pushState({}, "", pathFor(next));
    setRoute(routeNow());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function load() {
    if (!loggedIn()) return;
    const results = await Promise.allSettled([
      api(PAGE.work.read),
      api(PAGE.money.read),
      api(PAGE.clients.read),
      api(PAGE.crew.read),
      api(PAGE.quotes.read),
    ]);

    setData({
      work: results[0].status === "fulfilled" ? pickList(results[0].value, ["jobs", "items", "data"]) : [],
      money: results[1].status === "fulfilled" ? pickList(results[1].value, ["invoices", "items", "data"]) : [],
      clients: results[2].status === "fulfilled" ? pickList(results[2].value, ["clients", "items", "data"]) : [],
      crew: results[3].status === "fulfilled" ? pickList(results[3].value, ["workers", "team", "items", "data"]) : [],
      quotes: results[4].status === "fulfilled" ? pickList(results[4].value, ["quotes", "items", "data"]) : [],
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
    const pop = () => setRoute(routeNow());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);

  useEffect(() => {
    if (authed && !["public", "login", "signup"].includes(route)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, authed]);

  if (route === "public") return <PublicPage go={go} />;
  if (route === "login" || route === "signup") return <AuthPage mode={route} go={go} onLogin={onLogin} />;
  if (!authed) return <AuthPage mode="login" go={go} onLogin={onLogin} />;

  return <AppShell route={route} go={go} data={data} user={user || getUser() || {}} reload={load} logout={logout} />;
}
