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

const STAGES = [
  ["work_in", "Work In"],
  ["assign", "Assign"],
  ["doing", "Doing"],
  ["proof", "Proof"],
  ["invoice", "Invoice"],
  ["paid", "Paid"],
];

const NAV = [
  ["today", "Today"],
  ["flow", "Flowline"],
  ["work", "Work"],
  ["money", "Money"],
  ["clients", "Clients"],
  ["crew", "Crew"],
  ["quotes", "Quotes"],
  ["payroll", "Payroll"],
  ["settings", "Settings"],
];

const PAGE = {
  work: {
    title: "Work Flow",
    stage: "work_in",
    read: "/jobs",
    create: "/jobs",
    action: "Add work",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
  },
  money: {
    title: "Money Flow",
    stage: "invoice",
    read: "/invoices",
    create: "/invoices",
    action: "Create invoice",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
  clients: {
    title: "Client Flow",
    stage: "work_in",
    read: "/clients",
    create: "/clients",
    action: "Add client",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
  },
  crew: {
    title: "Crew Flow",
    stage: "assign",
    read: "/team/workers",
    create: "/team/invite",
    action: "Invite crew",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
  },
  quotes: {
    title: "Quote Flow",
    stage: "work_in",
    read: "/quotes",
    create: "/quotes",
    action: "Create quote",
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
};

const DEMO = {
  work: [
    { type: "work", stage: "assign", title: "Switchboard upgrade", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { type: "work", stage: "work_in", title: "Garden clean-up", client_name: "Bayview Rentals", status: "Needs info", amount: 780 },
    { type: "work", stage: "proof", title: "Hot water repair", client_name: "Harbour Plumbing", status: "Prepared", amount: 1240 },
  ],
  money: [
    { type: "money", stage: "invoice", invoice_number: "INV-1047", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { type: "money", stage: "invoice", invoice_number: "INV-1031", client_name: "Bayview Rentals", status: "Overdue", amount: 2430 },
  ],
  clients: [
    { type: "clients", stage: "work_in", name: "Carter Electrical", email: "accounts@carter.co.nz", status: "Ready" },
    { type: "clients", stage: "work_in", name: "Bayview Rentals", phone: "020 000 000", status: "Needs email" },
  ],
  crew: [
    { type: "crew", stage: "assign", name: "Sam", role: "Worker", region: "North", status: "Active" },
    { type: "crew", stage: "assign", name: "Jess", role: "Manager", region: "Central", status: "Active" },
  ],
  quotes: [
    { type: "quotes", stage: "work_in", quote_number: "Q-1075", client_name: "Northside Plumbing", status: "Follow up", amount: 6420 },
    { type: "quotes", stage: "work_in", quote_number: "Q-1074", client_name: "Oceanview Homes", status: "Prepared", amount: 12100 },
  ],
};

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return clean(value.title || value.name || value.email || value.id, fallback);
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
    flow: "/flow",
    work: "/work",
    money: "/invoices",
    clients: "/clients",
    crew: "/crew",
    team: "/crew",
    quotes: "/quotes",
    payroll: "/payroll",
    settings: "/settings",
  }[route] || "/dashboard";
}

function routeNow() {
  const path = window.location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!path || path === "home") return "public";
  if (path === "login" || path === "signup") return path;
  if (path === "dashboard") return "today";
  if (path === "invoices") return "money";
  if (path === "jobs") return "work";
  if (path === "team") return "crew";
  return NAV.some(([key]) => key === path) ? path : "today";
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

function typeFromRoute(route) {
  if (route === "money") return "money";
  if (PAGE[route]) return route;
  return "work";
}

function titleOf(item = {}, index = 0) {
  if (item.kind === "approval") return item.title;
  if (item.type === "money") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  if (item.type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (item.type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (item.type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work ${index + 1}`);
}

function subOf(item = {}) {
  if (item.kind === "approval") return item.detail;
  if (item.type === "money") return clean(item.client_name || item.customer_name || item.status, "Invoice");
  if (item.type === "clients") return clean(item.email || item.phone || item.address, "Client details");
  if (item.type === "crew") return clean(item.role || item.region || item.phone, "Crew member");
  if (item.type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work details");
}

function statusOf(item = {}) {
  return clean(item.status || item.invoice_status || item.payment_status || item.quote_status || item.role, item.kind === "approval" ? "Prepared" : "Ready");
}

function stageOf(item = {}) {
  if (item.stage) return item.stage;
  if (item.type === "money") return "invoice";
  if (item.type === "crew") return "assign";
  if (item.type === "clients" || item.type === "quotes") return "work_in";
  return "doing";
}

function searchText(item = {}) {
  return [titleOf(item), subOf(item), statusOf(item), stageOf(item), ...Object.values(item).map((v) => clean(v))]
    .join(" ")
    .toLowerCase();
}

function makeItems(data) {
  return [
    ...(data.work.length ? data.work : DEMO.work),
    ...(data.money.length ? data.money : DEMO.money),
    ...(data.clients.length ? data.clients : DEMO.clients),
    ...(data.crew.length ? data.crew : DEMO.crew),
    ...(data.quotes.length ? data.quotes : DEMO.quotes),
  ];
}

function makeApprovals(data) {
  const items = makeItems(data);
  const invoice = items.find((item) => item.type === "money") || DEMO.money[0];
  const job = items.find((item) => item.type === "work") || DEMO.work[0];
  const quote = items.find((item) => item.type === "quotes") || DEMO.quotes[0];

  return [
    {
      kind: "approval",
      type: "money",
      stage: "invoice",
      title: "Invoice ready to approve",
      detail: "Completed work has proof, amount and customer details ready.",
      status: "Review",
      amount: invoice.amount,
      source: invoice,
    },
    {
      kind: "approval",
      type: "work",
      stage: "assign",
      title: "Worker suggested",
      detail: "Churvox found a likely worker match with no obvious conflict.",
      status: "Approve",
      source: job,
    },
    {
      kind: "approval",
      type: "quotes",
      stage: "work_in",
      title: "Quote follow-up ready",
      detail: "A customer has not replied and the follow-up is ready.",
      status: "Send",
      source: quote,
    },
  ];
}

function Logo() {
  return (
    <span className="flowline-logo">
      <span className="flowline-mark">C</span>
      <span>
        <b>CHURVOX</b>
        <small>Flowline</small>
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

  return <span className={`flowline-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="flowline-public-nav">
      <button type="button" className="flowline-logo-button" onClick={() => go("public")}><Logo /></button>
      <nav>
        <a href="#flow">Flowline</a>
        <a href="#pricing">Pricing</a>
        <button type="button" className="ghost" onClick={() => go("login")}>Login</button>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </nav>
    </header>
  );
}

function PublicPage({ go }) {
  return (
    <main className="flowline-public">
      <PublicNav go={go} />

      <section className="flowline-hero">
        <article>
          <span className="flowline-kicker">AI flow machine for trade and service owners</span>
          <h1>Work goes in. <em>Admin comes out ready.</em></h1>
          <p>
            Churvox turns jobs, crew updates, proof, quotes, invoices and payments into one visual flowline:
            Work In → Assign → Doing → Proof → Invoice → Paid.
          </p>
          <div className="flowline-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
        </article>

        <aside className="flowline-public-machine">
          <span className="flowline-kicker">Live flow</span>
          <MiniFlowline />
          <div className="flowline-next-mini">
            <b>Invoice ready</b>
            <small>Carter Electrical • $4,870 • proof attached</small>
            <button type="button" onClick={() => go("signup")}>Review</button>
          </div>
        </aside>
      </section>

      <section className="flowline-section" id="flow">
        <span className="flowline-kicker">What makes it different</span>
        <h2>Your business shown as a moving flow, not a pile of pages.</h2>
        <div className="flowline-feature-grid">
          {[
            ["Flowline stages", "See work move from Work In through to Paid."],
            ["Approval sparks", "Churvox highlights where the owner needs to approve."],
            ["Review sheet", "Tap anything to review, edit and approve without losing context."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="flowline-section" id="pricing">
        <span className="flowline-kicker">Pricing</span>
        <h2>Operator is where AI admin prep starts.</h2>
        <div className="flowline-pricing">
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
    <main className="flowline-public">
      <PublicNav go={go} />
      <section className="flowline-auth">
        <article>
          <span className="flowline-kicker">Secure Flowline</span>
          <h1>{signup ? "Start your business flowline." : "Open your flowline."}</h1>
          <p>Work In → Assign → Doing → Proof → Invoice → Paid.</p>
        </article>

        <form className="flowline-card flowline-auth-card" onSubmit={submit}>
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

          {error ? <p className="flowline-error">{error}</p> : null}

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
  const [query, setQuery] = useState("");

  return (
    <main className="flowline-app">
      <header className="flowline-topbar">
        <button type="button" className="flowline-logo-button" onClick={() => go("today")}><Logo /></button>
        <label className="flowline-search"><span>Search</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find jobs, invoices, clients..." /></label>
        <button type="button" className="ghost" onClick={reload}>Refresh</button>
        <button type="button" onClick={() => setCreateType(PAGE[typeFromRoute(route)] ? typeFromRoute(route) : "work")}>Quick add</button>
        <strong>{clean(user?.name || user?.email, "Owner")}</strong>
      </header>

      <aside className="flowline-nav">
        {NAV.map(([key, label]) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {label}
          </button>
        ))}
        <button type="button" className="flowline-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="flowline-main">
        {["today", "flow"].includes(route) ? <FlowlineHome data={data} query={query} /> : null}
        {PAGE[route] ? <FlowlineFiltered type={route} data={data} query={query} reload={reload} /> : null}
        {["payroll", "settings"].includes(route) ? <UtilityPage route={route} go={go} /> : null}
      </section>

      <nav className="flowline-mobile-nav">
        {["today", "flow", "money", "crew", "settings"].map((key) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {NAV.find(([navKey]) => navKey === key)?.[1] || key}
          </button>
        ))}
      </nav>

      {createType ? <CreateModal type={createType} onClose={() => setCreateType(null)} onSaved={reload} /> : null}
    </main>
  );
}

function FlowlineHome({ data, query }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const all = useMemo(() => makeItems(data).filter((item) => !query || searchText(item).includes(query.toLowerCase())), [data, query]);
  const approvals = makeApprovals(data);
  const current = selected || approvals[0];

  return (
    <section className="flowline-page">
      <section className="flowline-hero-strip">
        <div>
          <span className="flowline-kicker">Your business flow is ready</span>
          <h1>Work in. Admin prepared. Owner approval. Money out.</h1>
          <p>This is not a dashboard. It is your live job-to-cash flowline.</p>
        </div>
        <button type="button" onClick={() => setSelected(approvals[0])}>Start approval</button>
      </section>

      {notice ? <section className="flowline-notice">{notice}</section> : null}

      <NextApproval item={current} onApprove={(item) => setNotice(`${titleOf(item)} approved locally.`)} />
      <StageFlowline items={all} approvals={approvals} selected={current} onSelect={setSelected} />
      <Pulse data={data} />
    </section>
  );
}

function FlowlineFiltered({ type, data, query, reload }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const page = PAGE[type];
  const rows = data[type]?.length ? data[type] : DEMO[type] || [];
  const filtered = rows.filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const approvals = [
    { kind: "approval", type, stage: page.stage, title: `${page.title} approval ready`, detail: "Churvox prepared the next owner action.", status: "Prepared" },
    { kind: "approval", type, stage: page.stage, title: "Missing info check", detail: "Review details before this blocks the flow.", status: "Check" },
  ];
  const current = selected || approvals[0];

  return (
    <section className="flowline-page">
      <section className="flowline-hero-strip row">
        <div>
          <span className="flowline-kicker">{page.title}</span>
          <h1>{page.title} moving through the business flow.</h1>
          <p>Filtered to this area, but still part of the same flowline.</p>
        </div>
        <button type="button" onClick={reload}>Refresh</button>
      </section>

      {notice ? <section className="flowline-notice">{notice}</section> : null}

      <NextApproval item={current} onApprove={(item) => setNotice(`${titleOf(item)} approved locally.`)} />
      <StageFlowline items={filtered} approvals={approvals} selected={current} onSelect={setSelected} />
      <Pulse data={{ [type]: rows }} />
    </section>
  );
}

function NextApproval({ item, onApprove }) {
  const [sheet, setSheet] = useState(false);

  return (
    <section className="flowline-next">
      <div>
        <span className="flowline-kicker">Next approval</span>
        <h2>{titleOf(item)}</h2>
        <p>{subOf(item) || "Review what Churvox prepared, edit if needed, then approve."}</p>
      </div>

      <div className="flowline-next-meta">
        <div><b>Stage</b><span>{stageLabel(stageOf(item))}</span></div>
        <div><b>Status</b><span>{statusOf(item)}</span></div>
        <div><b>Amount</b><span>{money(item?.amount)}</span></div>
      </div>

      <footer>
        <button type="button" className="ghost" onClick={() => setSheet(true)}>Review</button>
        <button type="button" onClick={() => onApprove?.(item)}>Approve</button>
      </footer>

      {sheet ? <ReviewSheet item={item} onClose={() => setSheet(false)} onApprove={onApprove} /> : null}
    </section>
  );
}

function StageFlowline({ items, approvals, selected, onSelect }) {
  return (
    <section className="flowline-machine">
      <header>
        <span className="flowline-kicker">Flowline</span>
        <p>Work moves left to right. Lime sparks are owner approvals Churvox prepared.</p>
      </header>

      <div className="flowline-track">
        {STAGES.map(([stage, label], index) => {
          const stageItems = items.filter((item) => stageOf(item) === stage).slice(0, 4);
          const stageApprovals = approvals.filter((item) => stageOf(item) === stage);

          return (
            <article className="flowline-stage" key={stage}>
              <div className="flowline-stage-dot">{index + 1}</div>
              <h3>{label}</h3>

              {stageApprovals.map((item, approvalIndex) => (
                <button key={`approval-${approvalIndex}`} type="button" className={`flowline-work approval ${selected === item ? "active" : ""}`} onClick={() => onSelect(item)}>
                  <b>{titleOf(item)}</b>
                  <small>{subOf(item)}</small>
                </button>
              ))}

              {stageItems.length ? stageItems.map((item, itemIndex) => (
                <button key={itemIndex} type="button" className={`flowline-work ${selected === item ? "active" : ""}`} onClick={() => onSelect(item)}>
                  <b>{titleOf(item, itemIndex)}</b>
                  <small>{subOf(item)}</small>
                  <Status value={statusOf(item)} />
                </button>
              )) : (
                <p className="flowline-empty">Nothing here</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniFlowline() {
  return (
    <div className="flowline-mini">
      {STAGES.map(([stage, label]) => (
        <span key={stage}>{label}</span>
      ))}
    </div>
  );
}

function Pulse({ data }) {
  const invoices = data.money || DEMO.money;
  const invoiceTotal = invoices.reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);

  return (
    <section className="flowline-pulse">
      <Metric label="Money waiting" value={money(invoiceTotal, "$18,420")} sub="Invoice stage" />
      <Metric label="Work moving" value={(data.work || DEMO.work).length} sub="Work stages" />
      <Metric label="Crew checks" value={(data.crew || DEMO.crew).length} sub="Assign stage" />
      <Metric label="Quote actions" value={(data.quotes || DEMO.quotes).length} sub="Work in" />
    </section>
  );
}

function UtilityPage({ route, go }) {
  const copy = {
    payroll: ["Payroll Flow", "Hours → Review → Export.", "crew"],
    settings: ["Settings", "Business profile, roles, invoice setup, MYOB, SMS and notifications.", "today"],
  }[route] || ["Flow tools", "Business flow tools.", "today"];

  return (
    <section className="flowline-page">
      <section className="flowline-hero-strip">
        <div>
          <span className="flowline-kicker">{copy[0]}</span>
          <h1>{copy[1]}</h1>
          <p>This area keeps the same Churvox flowline idea.</p>
        </div>
        <button type="button" onClick={() => go(copy[2])}>Open related flow</button>
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
    <section className="flowline-modal">
      <form onSubmit={submit}>
        <header><h2>{page.action}</h2><button type="button" onClick={onClose}>×</button></header>

        <div className="flowline-form-grid">
          {page.fields.map(([key, label]) => (
            <label key={key}>
              {label}
              {key === "description"
                ? <textarea value={form[key] || ""} onChange={(event) => update(key, event.target.value)} />
                : <input value={form[key] || ""} onChange={(event) => update(key, event.target.value)} />}
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

function ReviewSheet({ item, onClose, onApprove }) {
  return (
    <section className="flowline-modal">
      <article>
        <header><div><span className="flowline-kicker">Review & approve</span><h2>{titleOf(item)}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{subOf(item)}</p>

        <div className="flowline-sheet-grid">
          <div><b>Stage</b><span>{stageLabel(stageOf(item))}</span></div>
          <div><b>Status</b><span>{statusOf(item)}</span></div>
          <div><b>Amount</b><span>{money(item?.amount)}</span></div>
        </div>

        <div className="flowline-detail">
          {Object.entries(item || {}).slice(0, 10).map(([key, value]) => (
            <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "—")}</span></p>
          ))}
        </div>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          <button type="button" onClick={() => { onApprove?.(item); onClose(); }}>Approve</button>
        </footer>
      </article>
    </section>
  );
}

function stageLabel(stage) {
  return STAGES.find(([key]) => key === stage)?.[1] || "Flow";
}

function Metric({ label, value, sub }) {
  return <article><span>{label}</span><strong>{value}</strong><small>{sub}</small></article>;
}

export default function ChurvoxAIShell() {
  const [route, setRoute] = useState(routeNow());
  const [authed, setAuthed] = useState(isLoggedIn());
  const [user, setUser] = useState(() => getUser());
  const [data, setData] = useState({ work: [], money: [], clients: [], crew: [], quotes: [] });

  function go(next) {
    window.history.pushState({}, "", pathFor(next));
    setRoute(routeNow());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function load() {
    if (!isLoggedIn()) return;

    const results = await Promise.allSettled([
      api(PAGE.work.read),
      api(PAGE.money.read),
      api(PAGE.clients.read),
      api(PAGE.crew.read),
      api(PAGE.quotes.read),
    ]);

    setData({
      work: results[0].status === "fulfilled" ? pickList(results[0].value, ["jobs", "items", "data"]).map((x) => ({ ...x, type: "work", stage: x.stage || x.flow_stage || "doing" })) : [],
      money: results[1].status === "fulfilled" ? pickList(results[1].value, ["invoices", "items", "data"]).map((x) => ({ ...x, type: "money", stage: x.stage || x.flow_stage || "invoice" })) : [],
      clients: results[2].status === "fulfilled" ? pickList(results[2].value, ["clients", "items", "data"]).map((x) => ({ ...x, type: "clients", stage: "work_in" })) : [],
      crew: results[3].status === "fulfilled" ? pickList(results[3].value, ["workers", "team", "items", "data"]).map((x) => ({ ...x, type: "crew", stage: "assign" })) : [],
      quotes: results[4].status === "fulfilled" ? pickList(results[4].value, ["quotes", "items", "data"]).map((x) => ({ ...x, type: "quotes", stage: "work_in" })) : [],
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
