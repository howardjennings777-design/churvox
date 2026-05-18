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
  ["today", "Today"],
  ["work", "Work"],
  ["money", "Money"],
  ["clients", "Clients"],
  ["crew", "Crew"],
  ["quotes", "Quotes"],
  ["proof", "Proof"],
  ["payroll", "Payroll"],
  ["plans", "Plans"],
  ["legal", "Legal"],
  ["settings", "Settings"],
];

const PAGE = {
  work: {
    title: "Work Orbit",
    read: "/jobs",
    create: "/jobs",
    action: "Add work",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
  },
  money: {
    title: "Money Orbit",
    read: "/invoices",
    create: "/invoices",
    action: "Create invoice",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
  clients: {
    title: "Client Orbit",
    read: "/clients",
    create: "/clients",
    action: "Add client",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
  },
  crew: {
    title: "Crew Orbit",
    read: "/team/workers",
    create: "/team/invite",
    action: "Invite crew",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
  },
  quotes: {
    title: "Quote Orbit",
    read: "/quotes",
    create: "/quotes",
    action: "Create quote",
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
};

const DEMO = {
  work: [
    { type: "work", title: "Switchboard upgrade", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { type: "work", title: "Garden clean-up", client_name: "Bayview Rentals", status: "Needs info", amount: 780 },
    { type: "work", title: "Hot water repair", client_name: "Harbour Plumbing", status: "Proof ready", amount: 1240 },
  ],
  money: [
    { type: "money", invoice_number: "INV-1047", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { type: "money", invoice_number: "INV-1031", client_name: "Bayview Rentals", status: "Overdue", amount: 2430 },
  ],
  clients: [
    { type: "clients", name: "Carter Electrical", email: "accounts@carter.co.nz", status: "Ready" },
    { type: "clients", name: "Bayview Rentals", phone: "020 000 000", status: "Needs email" },
  ],
  crew: [
    { type: "crew", name: "Sam", role: "Worker", region: "North", status: "Active" },
    { type: "crew", name: "Jess", role: "Manager", region: "Central", status: "Active" },
  ],
  quotes: [
    { type: "quotes", quote_number: "Q-1075", client_name: "Northside Plumbing", status: "Follow up", amount: 6420 },
    { type: "quotes", quote_number: "Q-1074", client_name: "Oceanview Homes", status: "Prepared", amount: 12100 },
  ],
};

const PLANS = [
  ["Start", "$39", "Solo operators", "Basic work/admin tracking for owner-operators."],
  ["Crew", "$89", "Small teams", "Team workflow, jobs, clients and crew coordination."],
  ["Operator", "$149", "Most popular", "AI Operator Actions. Churvox prepares admin for approval."],
  ["Command", "$299", "Full control", "MYOB included, payroll workspace, advanced roles and higher capacity."],
];

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
    work: "/work",
    money: "/invoices",
    clients: "/clients",
    crew: "/crew",
    team: "/crew",
    quotes: "/quotes",
    proof: "/proof-and-pay",
    payroll: "/payroll",
    plans: "/plans",
    legal: "/legal",
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

function typeForRoute(route) {
  if (route === "money") return "money";
  if (PAGE[route]) return route;
  return "work";
}

function titleOf(item = {}, index = 0) {
  if (item.kind === "orbit") return item.title;
  if (item.type === "money") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  if (item.type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (item.type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (item.type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work ${index + 1}`);
}

function detailOf(item = {}) {
  if (item.kind === "orbit") return item.detail;
  if (item.type === "money") return clean(item.client_name || item.customer_name || item.status, "Invoice prepared");
  if (item.type === "clients") return clean(item.email || item.phone || item.address, "Client record");
  if (item.type === "crew") return clean(item.role || item.region || item.phone, "Crew record");
  if (item.type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote prepared");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work prepared");
}

function statusOf(item = {}) {
  return clean(item.status || item.invoice_status || item.payment_status || item.quote_status || item.role, item.kind === "orbit" ? "Prepared" : "Ready");
}

function searchText(item = {}) {
  return [titleOf(item), detailOf(item), statusOf(item), ...Object.values(item).map((v) => clean(v))]
    .join(" ")
    .toLowerCase();
}

function allRecords(data) {
  return [
    ...(data.work.length ? data.work : DEMO.work),
    ...(data.money.length ? data.money : DEMO.money),
    ...(data.clients.length ? data.clients : DEMO.clients),
    ...(data.crew.length ? data.crew : DEMO.crew),
    ...(data.quotes.length ? data.quotes : DEMO.quotes),
  ];
}

function makeOrbitActions(data) {
  const records = allRecords(data);
  const invoice = records.find((item) => item.type === "money") || DEMO.money[0];
  const job = records.find((item) => item.type === "work") || DEMO.work[0];
  const quote = records.find((item) => item.type === "quotes") || DEMO.quotes[0];
  const client = records.find((item) => item.type === "clients") || DEMO.clients[0];
  const crew = records.find((item) => item.type === "crew") || DEMO.crew[0];

  return [
    { kind: "orbit", type: "money", title: "Invoice ready", detail: "Completed work has amount, proof and customer details ready.", status: "Approve", amount: invoice.amount, source: invoice },
    { kind: "orbit", type: "work", title: "Worker suggested", detail: "Churvox found a likely match for assignment.", status: "Review", amount: job.amount, source: job },
    { kind: "orbit", type: "quotes", title: "Quote follow-up", detail: "A customer has not replied and a follow-up is ready.", status: "Send", amount: quote.amount, source: quote },
    { kind: "orbit", type: "clients", title: "Client missing email", detail: "Contact details need fixing before admin gets blocked.", status: "Fix", source: client },
    { kind: "orbit", type: "proof", title: "Proof pack ready", detail: "Photos and notes are ready to attach to the customer update.", status: "Ready", amount: job.amount, source: job },
    { kind: "orbit", type: "money", title: "Payment reminder", detail: "Overdue invoice reminder is ready for owner approval.", status: "Review", amount: invoice.amount, source: invoice },
    { kind: "orbit", type: "crew", title: "Crew check", detail: "Crew workload and conflict check is ready.", status: "Check", source: crew },
  ];
}

function Logo() {
  return (
    <span className="orbit-logo">
      <span className="orbit-mark">C</span>
      <span>
        <b>CHURVOX</b>
        <small>OrbitDeck</small>
      </span>
    </span>
  );
}

function Status({ value }) {
  const label = clean(value, "Ready");
  const low = label.toLowerCase();
  const tone = low.includes("overdue") || low.includes("block")
    ? "red"
    : low.includes("fix") || low.includes("need") || low.includes("draft") || low.includes("pending")
    ? "amber"
    : low.includes("complete") || low.includes("paid") || low.includes("active") || low.includes("ready")
    ? "green"
    : "blue";

  return <span className={`orbit-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="orbit-public-nav">
      <button type="button" className="orbit-logo-button" onClick={() => go("public")}><Logo /></button>
      <nav>
        <a href="#how">How it works</a>
        <a href="#plans">Plans</a>
        <a href="#legal">Legal</a>
        <button type="button" className="ghost" onClick={() => go("login")}>Login</button>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </nav>
    </header>
  );
}

function PublicPage({ go }) {
  return (
    <main className="orbit-public">
      <PublicNav go={go} />

      <section className="orbit-public-hero">
        <article>
          <span className="orbit-kicker">AI approval orbit for trade and service owners</span>
          <h1>Churvox does the admin. <em>You approve.</em></h1>
          <p>
            Jobs, quotes, invoices, proof, crew updates and payment follow-ups float around one clear AI core,
            ready for the owner to review, edit and approve.
          </p>
          <div className="orbit-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
        </article>

        <aside className="orbit-public-orbit" aria-label="Churvox approval orbit preview">
          <div className="orbit-public-core">
            <Logo />
            <strong>7 prepared</strong>
          </div>
          {["Invoice ready", "Worker suggested", "Quote follow-up", "Proof pack", "Payment reminder", "Client email"].map((label, index) => (
            <button type="button" key={label} className={`orbit-public-card pos-${index}`} onClick={() => go("signup")}>
              <b>{label}</b>
              <small>{index === 0 ? "$4,870 ready" : "Review"}</small>
            </button>
          ))}
        </aside>
      </section>

      <section className="orbit-section" id="how">
        <span className="orbit-kicker">How it works</span>
        <h2>The admin floats in. Churvox prepares it. You pull one card in and approve.</h2>
        <div className="orbit-feature-grid">
          {[
            ["AI core", "Churvox sits in the middle and prepares what matters next."],
            ["Floating action cards", "Invoices, reminders, proof packs and worker suggestions orbit around the core."],
            ["Approval dock", "Review, edit and approve without hunting through pages."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <PlansSection onChoose={() => go("signup")} />

      <section className="orbit-section orbit-legal-preview" id="legal">
        <span className="orbit-kicker">Trust and legal</span>
        <h2>Built for real businesses, not random AI autopilot.</h2>
        <p>Churvox prepares admin for approval. The business owner reviews and approves final messages, invoices, payroll checks and business decisions.</p>
        <button type="button" onClick={() => go("legal")}>View legal area</button>
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
    <main className="orbit-public">
      <PublicNav go={go} />
      <section className="orbit-auth">
        <article>
          <span className="orbit-kicker">Secure OrbitDeck</span>
          <h1>{signup ? "Start your approval orbit." : "Open your prepared actions."}</h1>
          <p>Floating action cards, one AI core, approval dock, review sheet.</p>
        </article>

        <form className="orbit-auth-card" onSubmit={submit}>
          <Logo />
          <h2>{signup ? "Create account" : "Login"}</h2>

          {signup ? (
            <>
              <label>Your name<input value={form.name} onChange={(event) => update("name", event.target.value)} /></label>
              <label>Business name<input value={form.business_name} onChange={(event) => update("business_name", event.target.value)} /></label>
            </>
          ) : null}

          <label>Email<input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} /></label>
          <label>Password<input type="password" required value={form.password} onChange={(event) => update("password", event.target.value)} /></label>

          {error ? <p className="orbit-error">{error}</p> : null}

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
    <main className="orbit-app">
      <header className="orbit-topbar">
        <button type="button" className="orbit-logo-button" onClick={() => go("today")}><Logo /></button>
        <label className="orbit-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find cards, jobs, invoices..." /></label>
        <button type="button" className="ghost" onClick={reload}>Refresh</button>
        <button type="button" onClick={() => setCreateType(PAGE[typeForRoute(route)] ? typeForRoute(route) : "work")}>Quick add</button>
        <strong>{clean(user?.name || user?.email, "Owner")}</strong>
      </header>

      <aside className="orbit-nav">
        {NAV.map(([key, label]) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {label}
          </button>
        ))}
        <button type="button" className="orbit-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="orbit-main">
        {route === "today" ? <OrbitHome data={data} query={query} /> : null}
        {PAGE[route] ? <OrbitFiltered type={route} data={data} query={query} reload={reload} /> : null}
        {route === "plans" ? <PlansPage /> : null}
        {route === "legal" ? <LegalPage /> : null}
        {["proof", "payroll", "settings"].includes(route) ? <UtilityPage route={route} go={go} /> : null}
      </section>

      <nav className="orbit-mobile-nav">
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

function OrbitHome({ data, query }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const actions = makeOrbitActions(data);
  const records = allRecords(data).filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const cards = [...actions, ...records].slice(0, 12);
  const active = selected || actions[0];

  return (
    <section className="orbit-page">
      <section className="orbit-page-head">
        <div>
          <span className="orbit-kicker">Today’s orbit</span>
          <h1>Churvox prepared {actions.length} actions today.</h1>
          <p>Tap a floating card, review what Churvox prepared, then approve it from the dock.</p>
        </div>
        <button type="button" onClick={() => setSelected(actions[0])}>Start best action</button>
      </section>

      {notice ? <section className="orbit-notice">{notice}</section> : null}

      <section className="orbit-deck">
        <div className="orbit-core">
          <div className="orbit-core-inner">
            <Logo />
            <strong>{titleOf(active)}</strong>
            <small>{detailOf(active)}</small>
          </div>

          {cards.map((item, index) => (
            <button
              type="button"
              key={`${titleOf(item)}-${index}`}
              className={`orbit-card pos-${index % 8} ${active === item ? "active" : ""}`}
              onClick={() => setSelected(item)}
            >
              <b>{titleOf(item, index)}</b>
              <small>{detailOf(item)}</small>
              <Status value={statusOf(item)} />
            </button>
          ))}
        </div>

        <ActiveCard item={active} onApprove={(item) => setNotice(`${titleOf(item)} approved locally.`)} />
        <BusinessPulse data={data} />
      </section>

      <ApprovalDock item={active} onApprove={(item) => setNotice(`${titleOf(item)} approved locally.`)} />
    </section>
  );
}

function OrbitFiltered({ type, data, query, reload }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const page = PAGE[type];
  const rows = data[type]?.length ? data[type] : DEMO[type] || [];
  const records = rows.filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const prepared = [
    { kind: "orbit", type, title: `${page.title} ready`, detail: "Churvox prepared the next owner action.", status: "Prepared" },
    { kind: "orbit", type, title: "Missing detail check", detail: "Review this before it blocks admin.", status: "Fix" },
  ];
  const cards = [...prepared, ...records];
  const active = selected || prepared[0];

  return (
    <section className="orbit-page">
      <section className="orbit-page-head row">
        <div>
          <span className="orbit-kicker">{page.title}</span>
          <h1>{page.title} cards are orbiting around approval.</h1>
          <p>Filtered to this area, still using the same OrbitDeck approval flow.</p>
        </div>
        <button type="button" onClick={reload}>Refresh</button>
      </section>

      {notice ? <section className="orbit-notice">{notice}</section> : null}

      <section className="orbit-deck">
        <div className="orbit-core filtered">
          <div className="orbit-core-inner">
            <Logo />
            <strong>{titleOf(active)}</strong>
            <small>{detailOf(active)}</small>
          </div>

          {cards.map((item, index) => (
            <button
              type="button"
              key={`${titleOf(item)}-${index}`}
              className={`orbit-card pos-${index % 8} ${active === item ? "active" : ""}`}
              onClick={() => setSelected(item)}
            >
              <b>{titleOf(item, index)}</b>
              <small>{detailOf(item)}</small>
              <Status value={statusOf(item)} />
            </button>
          ))}
        </div>

        <ActiveCard item={active} onApprove={(item) => setNotice(`${titleOf(item)} approved locally.`)} />
        <BusinessPulse data={{ [type]: rows }} />
      </section>

      <ApprovalDock item={active} onApprove={(item) => setNotice(`${titleOf(item)} approved locally.`)} />
    </section>
  );
}

function ActiveCard({ item, onApprove }) {
  const [sheet, setSheet] = useState(false);

  return (
    <article className="orbit-active-card">
      <span className="orbit-kicker">Pulled into focus</span>
      <h2>{titleOf(item)}</h2>
      <p>{detailOf(item)}</p>

      <div className="orbit-active-grid">
        <div><b>Status</b><span>{statusOf(item)}</span></div>
        <div><b>Amount</b><span>{money(item?.amount)}</span></div>
        <div><b>Type</b><span>{clean(item?.type, "Admin")}</span></div>
      </div>

      <footer>
        <button type="button" className="ghost" onClick={() => setSheet(true)}>Review</button>
        <button type="button" className="ghost" onClick={() => setSheet(true)}>Edit</button>
        <button type="button" onClick={() => onApprove?.(item)}>Approve</button>
      </footer>

      {sheet ? <ReviewSheet item={item} onClose={() => setSheet(false)} onApprove={onApprove} /> : null}
    </article>
  );
}

function ApprovalDock({ item, onApprove }) {
  const [sheet, setSheet] = useState(false);

  return (
    <section className="orbit-approval-dock">
      <span>{titleOf(item)}</span>
      <button type="button" className="ghost" onClick={() => setSheet(true)}>Review</button>
      <button type="button" className="ghost" onClick={() => setSheet(true)}>Edit</button>
      <button type="button" onClick={() => onApprove?.(item)}>Approve</button>

      {sheet ? <ReviewSheet item={item} onClose={() => setSheet(false)} onApprove={onApprove} /> : null}
    </section>
  );
}

function BusinessPulse({ data }) {
  const invoices = data.money || DEMO.money;
  const total = invoices.reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);

  return (
    <aside className="orbit-pulse">
      <span className="orbit-kicker">Business pulse</span>
      <Meter label="Money waiting" value={money(total, "$18,420")} />
      <Meter label="Work cards" value={(data.work || DEMO.work).length} />
      <Meter label="Quote cards" value={(data.quotes || DEMO.quotes).length} />
      <Meter label="Crew checks" value={(data.crew || DEMO.crew).length} />
    </aside>
  );
}

function Meter({ label, value }) {
  return (
    <div className="orbit-meter">
      <span>{label}</span>
      <strong>{value}</strong>
      <i />
    </div>
  );
}

function PlansSection({ onChoose }) {
  return (
    <section className="orbit-section orbit-plans" id="plans">
      <span className="orbit-kicker">Plans</span>
      <h2>Pricing built around AI Operator Actions.</h2>
      <div className="orbit-plan-grid">
        {PLANS.map(([name, price, badge, body]) => (
          <article key={name} className={name === "Operator" ? "featured" : ""}>
            <span>{badge}</span>
            <h3>{name}</h3>
            <strong>{price}<small>/month + GST</small></strong>
            <p>{body}</p>
            <button type="button" onClick={onChoose}>Choose {name}</button>
          </article>
        ))}
        <article className="growth">
          <span>Add-on</span>
          <h3>Command Growth Pack</h3>
          <strong>$99<small>/month + GST</small></strong>
          <p>Add 50 active team members, extra job capacity, AI Operator Actions, automation runs and admin/payroll capacity.</p>
          <button type="button" onClick={onChoose}>Add growth pack</button>
        </article>
      </div>
    </section>
  );
}

function PlansPage() {
  const [notice, setNotice] = useState("");

  function choose(name) {
    localStorage.setItem("churvox_selected_plan", name.toLowerCase());
    setNotice(`${name} selected. Billing can be completed when checkout is connected.`);
  }

  return (
    <section className="orbit-page">
      <section className="orbit-page-head">
        <div>
          <span className="orbit-kicker">Plans</span>
          <h1>Choose the OrbitDeck level for your business.</h1>
          <p>Operator is the main plan where Churvox prepares admin cards for owner approval.</p>
        </div>
      </section>

      {notice ? <section className="orbit-notice">{notice}</section> : null}

      <section className="orbit-plan-grid app">
        {PLANS.map(([name, price, badge, body]) => (
          <article key={name} className={name === "Operator" ? "featured" : ""}>
            <span>{badge}</span>
            <h3>{name}</h3>
            <strong>{price}<small>/month + GST</small></strong>
            <p>{body}</p>
            <button type="button" onClick={() => choose(name)}>Choose {name}</button>
          </article>
        ))}
        <article className="growth">
          <span>Add-on</span>
          <h3>Command Growth Pack</h3>
          <strong>$99<small>/month + GST</small></strong>
          <p>Add 50 active team members and more AI/operator capacity.</p>
          <button type="button" onClick={() => choose("Command Growth Pack")}>Add growth pack</button>
        </article>
      </section>
    </section>
  );
}

function LegalPage() {
  const [open, setOpen] = useState(null);

  const legal = [
    ["Privacy Policy", "How Churvox handles business data, customer data and account information."],
    ["Terms of Service", "Rules for using Churvox, account responsibilities and acceptable use."],
    ["Refund / Cancellation Policy", "How subscriptions, cancellations and billing changes should be handled."],
    ["Data / Security Note", "Churvox prepares admin for approval. Owners remain responsible for final business decisions."],
    ["Contact", "Business contact: hello@churvox.com"],
  ];

  return (
    <section className="orbit-page">
      <section className="orbit-page-head">
        <div>
          <span className="orbit-kicker">Legal and trust</span>
          <h1>Clear policy cards for a real business website.</h1>
          <p>Privacy, terms, refunds, contact, data and approval responsibility all live here.</p>
        </div>
      </section>

      <section className="orbit-legal-grid">
        {legal.map(([title, body]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
            <button type="button" onClick={() => setOpen({ title, body })}>Open</button>
          </article>
        ))}
      </section>

      {open ? <LegalSheet item={open} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function LegalSheet({ item, onClose }) {
  return (
    <section className="orbit-modal">
      <article>
        <header><div><span className="orbit-kicker">Legal</span><h2>{item.title}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{item.body}</p>
        <p>Churvox prepares drafts, reminders, admin actions and business information for approval. The business owner or authorised user must review and approve final outputs before relying on or sending them.</p>
        <footer><button type="button" onClick={onClose}>Close</button></footer>
      </article>
    </section>
  );
}

function UtilityPage({ route, go }) {
  const copy = {
    proof: ["Proof Orbit", "Proof packs, photos and job notes prepared for customer-ready admin.", "money"],
    payroll: ["Payroll Orbit", "Hours, missing times and export checks prepared for review.", "crew"],
    settings: ["Settings", "Business profile, roles, invoice setup, MYOB, SMS and notifications.", "today"],
  }[route] || ["Orbit tools", "Prepared business actions.", "today"];

  return (
    <section className="orbit-page">
      <section className="orbit-page-head">
        <div>
          <span className="orbit-kicker">{copy[0]}</span>
          <h1>{copy[1]}</h1>
          <p>This area keeps the same floating-card approval pattern.</p>
        </div>
        <button type="button" onClick={() => go(copy[2])}>Open related orbit</button>
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
    <section className="orbit-modal">
      <form onSubmit={submit}>
        <header><h2>{page.action}</h2><button type="button" onClick={onClose}>×</button></header>

        <div className="orbit-form-grid">
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
    <section className="orbit-modal">
      <article>
        <header><div><span className="orbit-kicker">Review card</span><h2>{titleOf(item)}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{detailOf(item)}</p>

        <div className="orbit-sheet-grid">
          <div><b>Status</b><span>{statusOf(item)}</span></div>
          <div><b>Amount</b><span>{money(item?.amount)}</span></div>
          <div><b>Type</b><span>{clean(item?.type, "Admin")}</span></div>
        </div>

        <div className="orbit-detail">
          {Object.entries(item || {}).slice(0, 10).map(([key, value]) => (
            <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "—")}</span></p>
          ))}
        </div>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          <button type="button" onClick={() => { onApprove?.(item); onClose(); }}>Approve card</button>
        </footer>
      </article>
    </section>
  );
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
      work: results[0].status === "fulfilled" ? pickList(results[0].value, ["jobs", "items", "data"]).map((x) => ({ ...x, type: "work" })) : [],
      money: results[1].status === "fulfilled" ? pickList(results[1].value, ["invoices", "items", "data"]).map((x) => ({ ...x, type: "money" })) : [],
      clients: results[2].status === "fulfilled" ? pickList(results[2].value, ["clients", "items", "data"]).map((x) => ({ ...x, type: "clients" })) : [],
      crew: results[3].status === "fulfilled" ? pickList(results[3].value, ["workers", "team", "items", "data"]).map((x) => ({ ...x, type: "crew" })) : [],
      quotes: results[4].status === "fulfilled" ? pickList(results[4].value, ["quotes", "items", "data"]).map((x) => ({ ...x, type: "quotes" })) : [],
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
