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
  ["settings", "Settings"],
];

const PAGES = {
  work: {
    title: "Work",
    read: "/jobs",
    create: "/jobs",
    empty: "No jobs yet.",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
  },
  money: {
    title: "Money",
    read: "/invoices",
    create: "/invoices",
    empty: "No invoices yet.",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
  clients: {
    title: "Clients",
    read: "/clients",
    create: "/clients",
    empty: "No clients yet.",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
  },
  crew: {
    title: "Crew",
    read: "/team/workers",
    create: "/team/invite",
    empty: "No crew yet.",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
  },
  quotes: {
    title: "Quotes",
    read: "/quotes",
    create: "/quotes",
    empty: "No quotes yet.",
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
};

const DEMO = {
  work: [
    { type: "work", title: "Switchboard upgrade", client_name: "Carter Electrical", status: "Ready", amount: 4870 },
    { type: "work", title: "Garden clean-up", client_name: "Bayview Rentals", status: "Needs info", amount: 780 },
    { type: "work", title: "Hot water repair", client_name: "Harbour Plumbing", status: "Prepared", amount: 1240 },
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

function titleOf(item = {}, index = 0) {
  if (item.kind === "action") return item.title;
  if (item.type === "money") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  if (item.type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (item.type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (item.type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work ${index + 1}`);
}

function subOf(item = {}) {
  if (item.kind === "action") return item.detail;
  if (item.type === "money") return clean(item.client_name || item.customer_name || item.status, "Invoice");
  if (item.type === "clients") return clean(item.email || item.phone || item.address, "Client details");
  if (item.type === "crew") return clean(item.role || item.region || item.phone, "Crew member");
  if (item.type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work details");
}

function statusOf(item = {}) {
  return clean(item.status || item.invoice_status || item.payment_status || item.quote_status || item.role, item.kind === "action" ? "Prepared" : "Ready");
}

function searchText(item = {}) {
  return [titleOf(item), subOf(item), statusOf(item), ...Object.values(item).map((v) => clean(v))]
    .join(" ")
    .toLowerCase();
}

function makeActions(data) {
  const work = data.work.length ? data.work : DEMO.work;
  const moneyRows = data.money.length ? data.money : DEMO.money;
  const quotes = data.quotes.length ? data.quotes : DEMO.quotes;
  const crew = data.crew.length ? data.crew : DEMO.crew;

  return [
    {
      kind: "action",
      type: "money",
      title: "Invoice ready to approve",
      detail: "Completed work has amount, proof and customer details ready.",
      status: "Review",
      amount: moneyRows[0]?.amount,
      source: moneyRows[0],
    },
    {
      kind: "action",
      type: "work",
      title: "Worker suggestion ready",
      detail: "A job can be assigned after owner review.",
      status: "Approve",
      source: work[0],
    },
    {
      kind: "action",
      type: "quotes",
      title: "Quote follow-up prepared",
      detail: "A customer has not replied and a follow-up is ready.",
      status: "Send",
      source: quotes[0],
    },
    {
      kind: "action",
      type: "crew",
      title: "Crew workload check",
      detail: "Worker capacity and conflict check is ready.",
      status: "Check",
      source: crew[0],
    },
  ];
}

function Logo() {
  return (
    <span className="run-logo">
      <i>C</i>
      <span>
        <b>CHURVOX</b>
        <small>Daily Run Board</small>
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
  return <span className={`run-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="run-public-nav">
      <button type="button" className="run-logo-button" onClick={() => go("public")}><Logo /></button>
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
    <main className="run-public">
      <PublicNav go={go} />

      <section className="run-hero">
        <article>
          <span className="run-kicker">AI daily run board for trade and service owners</span>
          <h1>Churvox runs the admin. <em>You approve the next move.</em></h1>
          <p>
            Open Churvox and see the business feed, the one thing to do next,
            and the money/work/crew pulse without hunting around.
          </p>
          <div className="run-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
        </article>

        <aside className="run-preview">
          <span className="run-kicker">Do this next</span>
          <h2>Invoice ready to approve</h2>
          <p>Completed job. Proof attached. Customer email ready. Amount prepared.</p>
          <button type="button" onClick={() => go("signup")}>Review & approve</button>
        </aside>
      </section>

      <section className="run-section" id="how">
        <span className="run-kicker">How it works</span>
        <h2>One feed. One next action. One approval flow.</h2>
        <div className="run-feature-grid">
          {[
            ["Business Feed", "Everything that happened in the business lands in one simple stream."],
            ["Do This Next", "Churvox chooses the most useful prepared action for the owner."],
            ["Business Pulse", "Money, work, crew and quotes stay visible without clutter."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="run-section" id="pricing">
        <span className="run-kicker">Pricing</span>
        <h2>Operator is where AI admin prep starts.</h2>
        <div className="run-pricing">
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
    <main className="run-public">
      <PublicNav go={go} />
      <section className="run-auth">
        <article>
          <span className="run-kicker">Secure Daily Run Board</span>
          <h1>{signup ? "Start your daily run board." : "Open today’s prepared actions."}</h1>
          <p>Business feed, next action, pulse, approve.</p>
        </article>

        <form className="run-card run-auth-card" onSubmit={submit}>
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

          {error ? <p className="run-error">{error}</p> : null}

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
  const [noticeOpen, setNoticeOpen] = useState(false);

  return (
    <main className="run-app">
      <header className="run-topbar">
        <button type="button" className="run-logo-button" onClick={() => go("today")}><Logo /></button>
        <label className="run-search"><span>Search</span><input placeholder="Find jobs, clients, invoices..." /></label>
        <button type="button" className="ghost" onClick={() => setNoticeOpen(true)}>Notifications</button>
        <button type="button" onClick={() => setCreateType(PAGES[route] ? route : "work")}>Quick add</button>
        <strong>{clean(user?.name || user?.email, "Owner")}</strong>
      </header>

      <aside className="run-side-nav">
        {NAV.map(([key, label]) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {label}
          </button>
        ))}
        <button type="button" className="run-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="run-main">
        {route === "today" ? <TodayBoard data={data} /> : null}
        {PAGES[route] ? <FilteredBoard type={route} rows={data[route] || []} reload={reload} /> : null}
        {["proof", "payroll", "settings"].includes(route) ? <UtilityBoard route={route} go={go} /> : null}
      </section>

      <nav className="run-mobile-nav">
        {["today", "work", "money", "crew", "settings"].map((key) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {NAV.find(([navKey]) => navKey === key)?.[1] || key}
          </button>
        ))}
      </nav>

      {createType ? <CreateModal type={createType} onClose={() => setCreateType(null)} onSaved={reload} /> : null}
      {noticeOpen ? <NoticeSheet onClose={() => setNoticeOpen(false)} /> : null}
    </main>
  );
}

function TodayBoard({ data }) {
  const [selected, setSelected] = useState(null);
  const [approved, setApproved] = useState("");
  const actions = makeActions(data);
  const feed = makeFeed(data);
  const current = selected || actions[0];

  function approve(item) {
    setApproved(`${titleOf(item)} approved locally.`);
  }

  return (
    <section className="run-page">
      <section className="run-heading">
        <span className="run-kicker">Today</span>
        <h1>Here’s what Churvox prepared for you.</h1>
        <p>Start with the next action, then check the feed and pulse only if needed.</p>
      </section>

      {approved ? <section className="run-notice">{approved}</section> : null}

      <section className="run-board">
        <FeedPanel feed={feed} selected={current} onSelect={setSelected} />
        <NextPanel item={current} onApprove={approve} />
        <PulsePanel data={data} />
      </section>
    </section>
  );
}

function FilteredBoard({ type, rows, reload }) {
  const page = PAGES[type];
  const base = rows.length ? rows : DEMO[type] || [];
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [approved, setApproved] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return base.filter((item) => !q || searchText(item).includes(q));
  }, [base, query]);

  const actions = (page.title === "Money"
    ? [
        { kind: "action", type, title: "Approve invoice draft", detail: "Completed work has been prepared as a draft invoice.", status: "Review" },
        { kind: "action", type, title: "Send payment reminder", detail: "Overdue invoice reminder is ready for approval.", status: "Review" },
      ]
    : [
        { kind: "action", type, title: `${page.title} action ready`, detail: "Churvox prepared the next owner action.", status: "Prepared" },
        { kind: "action", type, title: "Missing info check", detail: "Important gaps are ready to review.", status: "Check" },
      ]);

  const current = selected || actions[0] || list[0];

  return (
    <section className="run-page">
      <section className="run-heading row">
        <div>
          <span className="run-kicker">{page.title}</span>
          <h1>{page.title} run board.</h1>
          <p>Filtered view of the same Daily Run Board.</p>
        </div>
        <button type="button" onClick={reload}>Refresh</button>
      </section>

      {approved ? <section className="run-notice">{approved}</section> : null}

      <section className="run-card run-filter">
        <label>Search {page.title}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${page.title.toLowerCase()}...`} /></label>
        <button type="button" className="ghost" onClick={() => setQuery("")}>Clear</button>
      </section>

      <section className="run-board">
        <FeedPanel feed={[...actions, ...list]} selected={current} onSelect={(item) => { setSelected(item); if (window.innerWidth < 980) setSheet(true); }} />
        <NextPanel item={current} onApprove={(item) => setApproved(`${titleOf(item)} approved locally.`)} onOpen={() => setSheet(true)} />
        <PulsePanel data={{ [type]: base }} />
      </section>

      {sheet ? <ReviewSheet item={current} onClose={() => setSheet(false)} onApprove={(item) => setApproved(`${titleOf(item)} approved locally.`)} /> : null}
    </section>
  );
}

function makeFeed(data) {
  const feed = [
    ...makeActions(data),
    ...(data.work.length ? data.work : DEMO.work),
    ...(data.money.length ? data.money : DEMO.money),
    ...(data.quotes.length ? data.quotes : DEMO.quotes),
  ];
  return feed.slice(0, 12);
}

function FeedPanel({ feed, selected, onSelect }) {
  return (
    <article className="run-card run-feed">
      <header><span className="run-kicker">Business Feed</span><strong>{feed.length}</strong></header>
      <div className="run-feed-list">
        {feed.map((item, index) => (
          <button key={index} type="button" className={selected === item ? "active" : ""} onClick={() => onSelect(item)}>
            <span><b>{titleOf(item, index)}</b><small>{subOf(item)}</small></span>
            <Status value={statusOf(item)} />
          </button>
        ))}
      </div>
    </article>
  );
}

function NextPanel({ item, onApprove, onOpen }) {
  const [sheet, setSheet] = useState(false);
  const open = onOpen || (() => setSheet(true));

  return (
    <article className="run-next">
      <span className="run-kicker">Do this next</span>
      <h2>{titleOf(item)}</h2>
      <p>{subOf(item) || "Review the prepared admin and approve when ready."}</p>

      <div className="run-next-meta">
        <div><b>Status</b><span>{statusOf(item)}</span></div>
        <div><b>Amount</b><span>{money(item?.amount)}</span></div>
        <div><b>Source</b><span>{clean(item?.type, "Prepared")}</span></div>
      </div>

      <footer>
        <button type="button" className="ghost" onClick={open}>Review</button>
        <button type="button" onClick={() => onApprove?.(item)}>Approve</button>
      </footer>

      {sheet ? <ReviewSheet item={item} onClose={() => setSheet(false)} onApprove={onApprove} /> : null}
    </article>
  );
}

function PulsePanel({ data }) {
  const invoiceTotal = (data.money || []).reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);

  return (
    <article className="run-card run-pulse">
      <span className="run-kicker">Business Pulse</span>
      <Metric label="Money waiting" value={money(invoiceTotal, "$18,420")} sub="Invoice path" />
      <Metric label="Work needing attention" value={(data.work || DEMO.work).length} sub="Jobs" />
      <Metric label="Quote follow-ups" value={(data.quotes || DEMO.quotes).length} sub="Sales" />
      <Metric label="Crew checks" value={(data.crew || DEMO.crew).length} sub="Team" />
    </article>
  );
}

function UtilityBoard({ route, go }) {
  const copy = {
    proof: ["Proof", "Proof packs turn completed work into customer-ready updates.", "money"],
    payroll: ["Payroll", "Review approved hours, missing times and export summaries.", "crew"],
    settings: ["Settings", "Business profile, roles, invoices, MYOB, SMS and notifications.", "today"],
  }[route] || ["Workspace", "Daily run tools.", "today"];

  return (
    <section className="run-page">
      <section className="run-heading row">
        <div><span className="run-kicker">{copy[0]}</span><h1>{copy[1]}</h1><p>This keeps the same review and approval pattern.</p></div>
        <button type="button" onClick={() => go(copy[2])}>Open related area</button>
      </section>
      <section className="run-board single">
        <NextPanel item={{ kind: "action", title: `${copy[0]} review ready`, detail: copy[1], status: "Prepared" }} />
        <PulsePanel data={{}} />
      </section>
    </section>
  );
}

function CreateModal({ type, onClose, onSaved }) {
  const page = PAGES[type] || PAGES.work;
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
    <section className="run-modal">
      <form onSubmit={submit}>
        <header><h2>{page.title}</h2><button type="button" onClick={onClose}>×</button></header>

        <div className="run-form-grid">
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

function ReviewSheet({ item, onClose, onApprove }) {
  return (
    <section className="run-modal">
      <article>
        <header><div><span className="run-kicker">Review & approve</span><h2>{titleOf(item)}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{subOf(item)}</p>

        <div className="run-sheet-grid">
          <div><b>Status</b><span>{statusOf(item)}</span></div>
          <div><b>Amount</b><span>{money(item?.amount)}</span></div>
          <div><b>Owner action</b><span>Approve when ready</span></div>
        </div>

        <div className="run-detail">
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

function NoticeSheet({ onClose }) {
  return (
    <section className="run-modal">
      <article>
        <header><div><span className="run-kicker">Notifications</span><h2>Nothing urgent missed.</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>Notifications will show owner approvals, worker completions, overdue money and quote follow-ups.</p>
        <footer><button type="button" onClick={onClose}>Close</button></footer>
      </article>
    </section>
  );
}

function Metric({ label, value, sub }) {
  return <div className="run-metric"><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>;
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
      api(PAGES.work.read),
      api(PAGES.money.read),
      api(PAGES.clients.read),
      api(PAGES.crew.read),
      api(PAGES.quotes.read),
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
