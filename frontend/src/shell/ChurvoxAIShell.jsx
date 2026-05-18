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

const TRACK = [
  ["work", "Work"],
  ["crew", "Crew"],
  ["proof", "Proof"],
  ["invoice", "Invoice"],
  ["paid", "Paid"],
];

const PAGE = {
  work: {
    title: "Work Slips",
    read: "/jobs",
    create: "/jobs",
    action: "New work slip",
    track: "work",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
  },
  money: {
    title: "Invoice Slips",
    read: "/invoices",
    create: "/invoices",
    action: "New invoice slip",
    track: "invoice",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
  clients: {
    title: "Client Slips",
    read: "/clients",
    create: "/clients",
    action: "New client",
    track: "work",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
  },
  crew: {
    title: "Crew Slips",
    read: "/team/workers",
    create: "/team/invite",
    action: "Invite crew",
    track: "crew",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
  },
  quotes: {
    title: "Quote Slips",
    read: "/quotes",
    create: "/quotes",
    action: "New quote",
    track: "work",
    fields: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
};

const DEMO = {
  work: [
    { type: "work", title: "Switchboard upgrade", client_name: "Carter Electrical", status: "Ready", amount: 4870, track: "crew" },
    { type: "work", title: "Garden clean-up", client_name: "Bayview Rentals", status: "Needs info", amount: 780, track: "work" },
    { type: "work", title: "Hot water repair", client_name: "Harbour Plumbing", status: "Proof ready", amount: 1240, track: "proof" },
  ],
  money: [
    { type: "money", invoice_number: "INV-1047", client_name: "Carter Electrical", status: "Ready", amount: 4870, track: "invoice" },
    { type: "money", invoice_number: "INV-1031", client_name: "Bayview Rentals", status: "Overdue", amount: 2430, track: "invoice" },
  ],
  clients: [
    { type: "clients", name: "Carter Electrical", email: "accounts@carter.co.nz", status: "Ready", track: "work" },
    { type: "clients", name: "Bayview Rentals", phone: "020 000 000", status: "Needs email", track: "work" },
  ],
  crew: [
    { type: "crew", name: "Sam", role: "Worker", region: "North", status: "Active", track: "crew" },
    { type: "crew", name: "Jess", role: "Manager", region: "Central", status: "Active", track: "crew" },
  ],
  quotes: [
    { type: "quotes", quote_number: "Q-1075", client_name: "Northside Plumbing", status: "Follow up", amount: 6420, track: "work" },
    { type: "quotes", quote_number: "Q-1074", client_name: "Oceanview Homes", status: "Prepared", amount: 12100, track: "work" },
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

function slipTitle(item = {}, index = 0) {
  if (item.kind === "slip") return item.title;
  if (item.type === "money") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  if (item.type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (item.type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (item.type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work ${index + 1}`);
}

function slipDetail(item = {}) {
  if (item.kind === "slip") return item.detail;
  if (item.type === "money") return clean(item.client_name || item.customer_name || item.status, "Invoice prepared");
  if (item.type === "clients") return clean(item.email || item.phone || item.address, "Client record");
  if (item.type === "crew") return clean(item.role || item.region || item.phone, "Crew record");
  if (item.type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote prepared");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work prepared");
}

function slipStatus(item = {}) {
  return clean(item.status || item.invoice_status || item.payment_status || item.quote_status || item.role, item.kind === "slip" ? "Prepared" : "Ready");
}

function slipTrack(item = {}) {
  if (item.track) return item.track;
  if (item.type === "money") return "invoice";
  if (item.type === "crew") return "crew";
  if (item.type === "work") return "work";
  return "work";
}

function searchText(item = {}) {
  return [slipTitle(item), slipDetail(item), slipStatus(item), slipTrack(item), ...Object.values(item).map((v) => clean(v))]
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

function makeSlips(data) {
  const records = allRecords(data);
  const invoice = records.find((item) => item.type === "money") || DEMO.money[0];
  const job = records.find((item) => item.type === "work") || DEMO.work[0];
  const quote = records.find((item) => item.type === "quotes") || DEMO.quotes[0];
  const client = records.find((item) => item.type === "clients") || DEMO.clients[0];

  return [
    {
      kind: "slip",
      type: "money",
      slipType: "INVOICE SLIP",
      title: "Invoice ready to approve",
      detail: "Completed work has proof, amount and customer details ready.",
      status: "Review",
      amount: invoice.amount,
      track: "invoice",
      source: invoice,
    },
    {
      kind: "slip",
      type: "work",
      slipType: "WORK SLIP",
      title: "Worker suggested",
      detail: "Churvox prepared the worker assignment for owner review.",
      status: "Approve",
      amount: job.amount,
      track: "crew",
      source: job,
    },
    {
      kind: "slip",
      type: "quotes",
      slipType: "QUOTE SLIP",
      title: "Quote follow-up ready",
      detail: "A customer has not replied and the follow-up is ready.",
      status: "Send",
      amount: quote.amount,
      track: "work",
      source: quote,
    },
    {
      kind: "slip",
      type: "clients",
      slipType: "CLIENT SLIP",
      title: "Client detail check",
      detail: "Missing or weak client details are ready to fix before they block admin.",
      status: "Check",
      track: "work",
      source: client,
    },
  ];
}

function Logo() {
  return (
    <span className="slip-logo">
      <span className="slip-mark">C</span>
      <span>
        <b>CHURVOX</b>
        <small>Slipstream</small>
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

  return <span className={`slip-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="slip-public-nav">
      <button type="button" className="slip-logo-button" onClick={() => go("public")}><Logo /></button>
      <nav>
        <a href="#slips">Slips</a>
        <a href="#pricing">Pricing</a>
        <button type="button" className="ghost" onClick={() => go("login")}>Login</button>
        <button type="button" onClick={() => go("signup")}>Start free trial</button>
      </nav>
    </header>
  );
}

function PublicPage({ go }) {
  return (
    <main className="slip-public">
      <PublicNav go={go} />

      <section className="slip-public-hero">
        <article>
          <span className="slip-kicker">AI-prepared work slips for trade and service owners</span>
          <h1>Churvox prints the admin slips. <em>You approve.</em></h1>
          <p>
            Jobs, quotes, invoices, proof, crew updates and payment follow-ups are prepared as clear slips,
            so the owner can review, edit and approve.
          </p>
          <div className="slip-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open login</button>
          </div>
        </article>

        <aside className="slip-public-stack">
          <PublicSlip title="WORK SLIP" body="Worker suggested" meta="Approve" />
          <PublicSlip title="INVOICE SLIP" body="Proof attached • $4,870" meta="Review" featured />
          <PublicSlip title="PAYMENT SLIP" body="Reminder ready" meta="Send" />
        </aside>
      </section>

      <section className="slip-section" id="slips">
        <span className="slip-kicker">What makes it different</span>
        <h2>It does not feel like a dashboard. It feels like admin already prepared.</h2>
        <div className="slip-feature-grid">
          {[
            ["Slip Stack", "All prepared admin sits in one clear stack."],
            ["Active Slip", "The most important approval is big, readable and focused."],
            ["Job-to-Cash Track", "Every slip shows where it belongs: Work → Crew → Proof → Invoice → Paid."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="slip-section" id="pricing">
        <span className="slip-kicker">Pricing</span>
        <h2>Operator is the AI admin slips plan.</h2>
        <div className="slip-pricing">
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

function PublicSlip({ title, body, meta, featured }) {
  return (
    <div className={`slip-public-slip ${featured ? "featured" : ""}`}>
      <span>{title}</span>
      <b>{body}</b>
      <small>{meta}</small>
    </div>
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
    <main className="slip-public">
      <PublicNav go={go} />
      <section className="slip-auth">
        <article>
          <span className="slip-kicker">Secure Slipstream</span>
          <h1>{signup ? "Start your admin slip stack." : "Open today’s slips."}</h1>
          <p>Slip Stack → Active Slip → Business Meters → Job-to-Cash Track.</p>
        </article>

        <form className="slip-auth-card" onSubmit={submit}>
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

          {error ? <p className="slip-error">{error}</p> : null}

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
    <main className="slip-app">
      <header className="slip-topbar">
        <button type="button" className="slip-logo-button" onClick={() => go("today")}><Logo /></button>
        <label className="slip-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find slips, jobs, invoices..." /></label>
        <button type="button" className="ghost" onClick={reload}>Refresh</button>
        <button type="button" onClick={() => setCreateType(PAGE[typeForRoute(route)] ? typeForRoute(route) : "work")}>Quick add</button>
        <strong>{clean(user?.name || user?.email, "Owner")}</strong>
      </header>

      <aside className="slip-nav">
        {NAV.map(([key, label]) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {label}
          </button>
        ))}
        <button type="button" className="slip-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="slip-main">
        {route === "today" ? <SlipstreamHome data={data} query={query} /> : null}
        {PAGE[route] ? <SlipstreamFiltered type={route} data={data} query={query} reload={reload} /> : null}
        {["proof", "payroll", "settings"].includes(route) ? <UtilityPage route={route} go={go} /> : null}
      </section>

      <nav className="slip-mobile-nav">
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

function SlipstreamHome({ data, query }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const slips = makeSlips(data);
  const records = allRecords(data).filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const stack = [...slips, ...records].slice(0, 14);
  const active = selected || slips[0];

  return (
    <section className="slip-page">
      <section className="slip-page-head">
        <div>
          <span className="slip-kicker">Today’s slips are ready</span>
          <h1>Churvox prepared the admin. You approve the slip.</h1>
          <p>No dashboard hunting. Pick a slip, review it, approve it, move on.</p>
        </div>
        <button type="button" onClick={() => setSelected(slips[0])}>Start approval</button>
      </section>

      {notice ? <section className="slip-notice">{notice}</section> : null}

      <section className="slip-workspace">
        <SlipStack items={stack} selected={active} onSelect={setSelected} />
        <ActiveSlip item={active} onApprove={(item) => setNotice(`${slipTitle(item)} approved locally.`)} />
        <BusinessMeters data={data} />
      </section>

      <CashTrack active={active} />
    </section>
  );
}

function SlipstreamFiltered({ type, data, query, reload }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const page = PAGE[type];
  const rows = data[type]?.length ? data[type] : DEMO[type] || [];
  const records = rows.filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const prepared = [
    { kind: "slip", type, slipType: page.title.toUpperCase(), title: `${page.title} ready`, detail: "Churvox prepared the next owner action.", status: "Prepared", track: page.track },
    { kind: "slip", type, slipType: "CHECK SLIP", title: "Missing info check", detail: "Review this before it blocks the flow.", status: "Check", track: page.track },
  ];
  const active = selected || prepared[0];

  return (
    <section className="slip-page">
      <section className="slip-page-head row">
        <div>
          <span className="slip-kicker">{page.title}</span>
          <h1>{page.title} prepared for approval.</h1>
          <p>Same Slipstream pattern, filtered to this part of the business.</p>
        </div>
        <button type="button" onClick={reload}>Refresh</button>
      </section>

      {notice ? <section className="slip-notice">{notice}</section> : null}

      <section className="slip-workspace">
        <SlipStack items={[...prepared, ...records]} selected={active} onSelect={setSelected} />
        <ActiveSlip item={active} onApprove={(item) => setNotice(`${slipTitle(item)} approved locally.`)} />
        <BusinessMeters data={{ [type]: rows }} />
      </section>

      <CashTrack active={active} />
    </section>
  );
}

function SlipStack({ items, selected, onSelect }) {
  return (
    <aside className="slip-stack">
      <header>
        <span className="slip-kicker">Slip Stack</span>
        <strong>{items.length}</strong>
      </header>

      <div>
        {items.map((item, index) => (
          <button key={index} type="button" className={selected === item ? "active" : ""} onClick={() => onSelect(item)}>
            <span>
              <b>{slipTitle(item, index)}</b>
              <small>{slipDetail(item)}</small>
            </span>
            <Status value={slipStatus(item)} />
          </button>
        ))}
      </div>
    </aside>
  );
}

function ActiveSlip({ item, onApprove }) {
  const [sheet, setSheet] = useState(false);

  return (
    <article className="active-slip">
      <div className="active-slip-paper">
        <header>
          <span>{item?.slipType || `${clean(item?.type, "WORK").toUpperCase()} SLIP`}</span>
          <Status value={slipStatus(item)} />
        </header>

        <h2>{slipTitle(item)}</h2>
        <p>{slipDetail(item)}</p>

        <div className="active-slip-lines">
          <p><b>Money attached</b><span>{money(item?.amount)}</span></p>
          <p><b>Stage</b><span>{trackLabel(slipTrack(item))}</span></p>
          <p><b>Prepared by</b><span>Churvox Operator</span></p>
        </div>

        <footer>
          <button type="button" className="ghost" onClick={() => setSheet(true)}>Review</button>
          <button type="button" className="ghost" onClick={() => setSheet(true)}>Edit</button>
          <button type="button" onClick={() => onApprove?.(item)}>Approve</button>
        </footer>
      </div>

      {sheet ? <ReviewSheet item={item} onClose={() => setSheet(false)} onApprove={onApprove} /> : null}
    </article>
  );
}

function BusinessMeters({ data }) {
  const invoices = data.money || DEMO.money;
  const total = invoices.reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);

  return (
    <aside className="slip-meters">
      <span className="slip-kicker">Business meters</span>
      <Meter label="Money waiting" value={money(total, "$18,420")} />
      <Meter label="Work blocked" value={(data.work || DEMO.work).filter((item) => /need|block|missing/i.test(slipStatus(item))).length || 1} />
      <Meter label="Quotes due" value={(data.quotes || DEMO.quotes).length} />
      <Meter label="Crew checks" value={(data.crew || DEMO.crew).length} />
    </aside>
  );
}

function Meter({ label, value }) {
  return (
    <div className="slip-meter">
      <span>{label}</span>
      <strong>{value}</strong>
      <i />
    </div>
  );
}

function CashTrack({ active }) {
  const activeTrack = slipTrack(active);

  return (
    <section className="cash-track">
      {TRACK.map(([key, label]) => (
        <article key={key} className={activeTrack === key ? "active" : ""}>
          <i />
          <b>{label}</b>
        </article>
      ))}
    </section>
  );
}

function UtilityPage({ route, go }) {
  const copy = {
    proof: ["Proof Slips", "Proof packs turn completed work into customer-ready invoice slips.", "money"],
    payroll: ["Payroll Slips", "Hours, missing times and export checks prepared for review.", "crew"],
    settings: ["Settings", "Business profile, roles, invoice setup, MYOB, SMS and notifications.", "today"],
  }[route] || ["Slipstream", "Prepared business slips.", "today"];

  return (
    <section className="slip-page">
      <section className="slip-page-head">
        <div>
          <span className="slip-kicker">{copy[0]}</span>
          <h1>{copy[1]}</h1>
          <p>This area keeps the same prepared-slip approval pattern.</p>
        </div>
        <button type="button" onClick={() => go(copy[2])}>Open related slips</button>
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
    <section className="slip-modal">
      <form onSubmit={submit}>
        <header><h2>{page.action}</h2><button type="button" onClick={onClose}>×</button></header>

        <div className="slip-form-grid">
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
    <section className="slip-modal">
      <article>
        <header><div><span className="slip-kicker">Review slip</span><h2>{slipTitle(item)}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{slipDetail(item)}</p>

        <div className="slip-sheet-grid">
          <div><b>Status</b><span>{slipStatus(item)}</span></div>
          <div><b>Money</b><span>{money(item?.amount)}</span></div>
          <div><b>Track</b><span>{trackLabel(slipTrack(item))}</span></div>
        </div>

        <div className="slip-detail">
          {Object.entries(item || {}).slice(0, 10).map(([key, value]) => (
            <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "—")}</span></p>
          ))}
        </div>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          <button type="button" onClick={() => { onApprove?.(item); onClose(); }}>Approve slip</button>
        </footer>
      </article>
    </section>
  );
}

function trackLabel(track) {
  return TRACK.find(([key]) => key === track)?.[1] || "Work";
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
      work: results[0].status === "fulfilled" ? pickList(results[0].value, ["jobs", "items", "data"]).map((x) => ({ ...x, type: "work", track: x.track || x.flow_stage || "work" })) : [],
      money: results[1].status === "fulfilled" ? pickList(results[1].value, ["invoices", "items", "data"]).map((x) => ({ ...x, type: "money", track: x.track || x.flow_stage || "invoice" })) : [],
      clients: results[2].status === "fulfilled" ? pickList(results[2].value, ["clients", "items", "data"]).map((x) => ({ ...x, type: "clients", track: "work" })) : [],
      crew: results[3].status === "fulfilled" ? pickList(results[3].value, ["workers", "team", "items", "data"]).map((x) => ({ ...x, type: "crew", track: "crew" })) : [],
      quotes: results[4].status === "fulfilled" ? pickList(results[4].value, ["quotes", "items", "data"]).map((x) => ({ ...x, type: "quotes", track: "work" })) : [],
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
