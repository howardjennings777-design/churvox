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
    title: "Work Commands",
    read: "/jobs",
    create: "/jobs",
    action: "Create work command",
    fields: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
  },
  money: {
    title: "Money Commands",
    read: "/invoices",
    create: "/invoices",
    action: "Create invoice command",
    fields: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  },
  clients: {
    title: "Client Commands",
    read: "/clients",
    create: "/clients",
    action: "Create client command",
    fields: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
  },
  crew: {
    title: "Crew Commands",
    read: "/team/workers",
    create: "/team/invite",
    action: "Invite crew",
    fields: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
  },
  quotes: {
    title: "Quote Commands",
    read: "/quotes",
    create: "/quotes",
    action: "Create quote command",
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
  ["Crew", "$89", "Small teams", "Jobs, clients, team workflow and crew coordination."],
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

function commandTitle(item = {}, index = 0) {
  if (item.kind === "command") return item.title;
  if (item.type === "money") return clean(item.invoice_number || item.number || item.title, `Invoice ${index + 1}`);
  if (item.type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (item.type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (item.type === "quotes") return clean(item.quote_number || item.number || item.title, `Quote ${index + 1}`);
  return clean(item.title || item.job_title || item.name || item.service_type, `Work ${index + 1}`);
}

function commandDetail(item = {}) {
  if (item.kind === "command") return item.detail;
  if (item.type === "money") return clean(item.client_name || item.customer_name || item.status, "Invoice command");
  if (item.type === "clients") return clean(item.email || item.phone || item.address, "Client command");
  if (item.type === "crew") return clean(item.role || item.region || item.phone, "Crew command");
  if (item.type === "quotes") return clean(item.client_name || item.customer_name || item.status, "Quote command");
  return clean(item.client_name || item.customer_name || item.address || item.status, "Work command");
}

function commandStatus(item = {}) {
  return clean(item.status || item.invoice_status || item.payment_status || item.quote_status || item.role, item.kind === "command" ? "READY" : "READY").toUpperCase();
}

function commandTag(item = {}) {
  const status = commandStatus(item);
  if (/OVERDUE|BLOCK|ERROR|FAILED/.test(status)) return "BLOCK";
  if (/NEED|FIX|MISSING|CHECK/.test(status)) return "CHECK";
  if (/SEND|FOLLOW/.test(status)) return "SEND";
  if (/PAY|PAID|INVOICE|READY|APPROVE/.test(status)) return "READY";
  return "READY";
}

function searchText(item = {}) {
  return [commandTitle(item), commandDetail(item), commandStatus(item), ...Object.values(item).map((v) => clean(v))]
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

function makeCommands(data) {
  const records = allRecords(data);
  const invoice = records.find((item) => item.type === "money") || DEMO.money[0];
  const job = records.find((item) => item.type === "work") || DEMO.work[0];
  const quote = records.find((item) => item.type === "quotes") || DEMO.quotes[0];
  const client = records.find((item) => item.type === "clients") || DEMO.clients[0];
  const crew = records.find((item) => item.type === "crew") || DEMO.crew[0];

  return [
    {
      kind: "command",
      type: "money",
      title: "APPROVE INVOICE",
      detail: "Completed job detected. Proof attached. Invoice draft generated. Customer email ready.",
      status: "READY",
      amount: invoice.amount,
      source: invoice,
      evidence: ["Completed job found", "Proof pack prepared", "Invoice amount detected", "Customer email ready", "Waiting for owner approval"],
    },
    {
      kind: "command",
      type: "work",
      title: "CONFIRM WORKER",
      detail: "Churvox found a likely worker match and prepared assignment for review.",
      status: "CHECK",
      amount: job.amount,
      source: job,
      evidence: ["Worker availability checked", "Role match found", "Workload reviewed", "Schedule conflict check prepared"],
    },
    {
      kind: "command",
      type: "quotes",
      title: "SEND QUOTE FOLLOW-UP",
      detail: "Quote follow-up wording is prepared and ready for owner approval.",
      status: "SEND",
      amount: quote.amount,
      source: quote,
      evidence: ["Quote age checked", "Customer response missing", "Follow-up message prepared"],
    },
    {
      kind: "command",
      type: "clients",
      title: "FIX CLIENT EMAIL",
      detail: "Client contact details need correction before admin can be sent.",
      status: "FIX",
      source: client,
      evidence: ["Missing email detected", "Client record found", "Admin send blocked until fixed"],
    },
    {
      kind: "command",
      type: "crew",
      title: "REVIEW CREW LOAD",
      detail: "Crew workload and conflict check is ready.",
      status: "CHECK",
      source: crew,
      evidence: ["Crew list scanned", "Active workers found", "Assignment rules prepared"],
    },
  ];
}

function Logo() {
  return (
    <span className="operator-logo">
      <span className="operator-mark">C▮</span>
      <span>
        <b>CHURVOX</b>
        <small>Operator Console</small>
      </span>
    </span>
  );
}

function Status({ value }) {
  const label = clean(value, "READY").toUpperCase();
  const low = label.toLowerCase();
  const tone = low.includes("overdue") || low.includes("block") || low.includes("fail")
    ? "red"
    : low.includes("fix") || low.includes("need") || low.includes("check") || low.includes("missing")
    ? "amber"
    : low.includes("complete") || low.includes("paid") || low.includes("active") || low.includes("ready")
    ? "green"
    : "blue";

  return <span className={`operator-status ${tone}`}>{label}</span>;
}

function PublicNav({ go }) {
  return (
    <header className="operator-public-nav">
      <button type="button" className="operator-logo-button" onClick={() => go("public")}><Logo /></button>
      <nav>
        <a href="#system">System</a>
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
    <main className="operator-public">
      <PublicNav go={go} />

      <section className="operator-hero">
        <article>
          <span className="operator-kicker">AI operator for trade admin</span>
          <h1>AI runs the admin. <em>You clear the final move.</em></h1>
          <p>
            Churvox prepares jobs, quotes, invoices, proof, crew updates and payment follow-ups as owner-approved commands.
          </p>
          <div className="operator-actions">
            <button type="button" onClick={() => go("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => go("login")}>Open console</button>
          </div>
        </article>

        <aside className="operator-live-terminal">
          <header>
            <span>AI OPERATOR ACTIVE</span>
            <strong>ONLINE</strong>
          </header>
          {[
            "✓ Job completed detected",
            "✓ Proof pack prepared",
            "✓ Invoice draft generated",
            "✓ Customer email ready",
            "→ Waiting for owner approval",
          ].map((line) => <p key={line}>{line}</p>)}
          <button type="button" onClick={() => go("signup")}>Clear command</button>
        </aside>
      </section>

      <section className="operator-section" id="system">
        <span className="operator-kicker">How it works</span>
        <h2>Churvox behaves like an operator, not a dashboard.</h2>
        <div className="operator-feature-grid">
          {[
            ["Command queue", "A tight list of prepared admin actions."],
            ["Active command", "One clear owner decision at a time."],
            ["Evidence panel", "See why Churvox prepared the action before approving."],
          ].map(([title, body]) => (
            <article key={title}><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <PlansSection onChoose={() => go("signup")} />

      <section className="operator-section operator-legal-preview" id="legal">
        <span className="operator-kicker">Trust</span>
        <h2>Approval-first AI for real businesses.</h2>
        <p>Churvox prepares admin for approval. The owner remains responsible for reviewing and approving final business decisions.</p>
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
    <main className="operator-public">
      <PublicNav go={go} />
      <section className="operator-auth">
        <article>
          <span className="operator-kicker">Secure console</span>
          <h1>{signup ? "Start your operator console." : "Open your commands."}</h1>
          <p>AI status bar, command queue, evidence panel, approval dock.</p>
        </article>

        <form className="operator-auth-card" onSubmit={submit}>
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

          {error ? <p className="operator-error">{error}</p> : null}

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
    <main className="operator-app">
      <header className="operator-topbar">
        <button type="button" className="operator-logo-button" onClick={() => go("today")}><Logo /></button>
        <label className="operator-search"><span>Search</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find commands, jobs, invoices..." /></label>
        <button type="button" className="ghost" onClick={reload}>Refresh</button>
        <button type="button" onClick={() => setCreateType(PAGE[typeForRoute(route)] ? typeForRoute(route) : "work")}>Quick add</button>
        <strong>{clean(user?.name || user?.email, "Owner")}</strong>
      </header>

      <aside className="operator-nav">
        {NAV.map(([key, label]) => (
          <button key={key} type="button" className={route === key ? "active" : ""} onClick={() => go(key)}>
            {label}
          </button>
        ))}
        <button type="button" className="operator-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="operator-main">
        {route === "today" ? <OperatorHome data={data} query={query} /> : null}
        {PAGE[route] ? <OperatorFiltered type={route} data={data} query={query} reload={reload} /> : null}
        {route === "plans" ? <PlansPage /> : null}
        {route === "legal" ? <LegalPage /> : null}
        {["proof", "payroll", "settings"].includes(route) ? <UtilityPage route={route} go={go} /> : null}
      </section>

      <nav className="operator-mobile-nav">
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

function OperatorHome({ data, query }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const commands = makeCommands(data);
  const records = allRecords(data).filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const queue = [...commands, ...records].slice(0, 16);
  const active = selected || commands[0];

  return (
    <section className="operator-page">
      <AIStatusBar data={data} commands={commands} />

      {notice ? <section className="operator-notice">{notice}</section> : null}

      <section className="operator-console">
        <CommandQueue items={queue} active={active} onSelect={setSelected} />
        <ActiveCommand item={active} onApprove={(item) => setNotice(`${commandTitle(item)} cleared locally.`)} />
        <EvidencePanel item={active} data={data} />
      </section>

      <ApprovalDock item={active} onApprove={(item) => setNotice(`${commandTitle(item)} cleared locally.`)} />
    </section>
  );
}

function OperatorFiltered({ type, data, query, reload }) {
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const page = PAGE[type];
  const rows = data[type]?.length ? data[type] : DEMO[type] || [];
  const records = rows.filter((item) => !query || searchText(item).includes(query.toLowerCase()));
  const prepared = [
    {
      kind: "command",
      type,
      title: `${page.title.toUpperCase()} READY`,
      detail: "Churvox prepared the next owner command.",
      status: "READY",
      evidence: ["Records scanned", "Action prepared", "Waiting for owner approval"],
    },
    {
      kind: "command",
      type,
      title: "CHECK MISSING INFO",
      detail: "Review this before it blocks admin.",
      status: "CHECK",
      evidence: ["Missing fields checked", "Admin risk detected", "Owner review required"],
    },
  ];
  const active = selected || prepared[0];

  return (
    <section className="operator-page">
      <section className="operator-modebar">
        <div>
          <span>MODE</span>
          <strong>{page.title}</strong>
          <small>Filtered command console</small>
        </div>
        <button type="button" onClick={reload}>Refresh mode</button>
      </section>

      {notice ? <section className="operator-notice">{notice}</section> : null}

      <section className="operator-console">
        <CommandQueue items={[...prepared, ...records]} active={active} onSelect={setSelected} />
        <ActiveCommand item={active} onApprove={(item) => setNotice(`${commandTitle(item)} cleared locally.`)} />
        <EvidencePanel item={active} data={{ [type]: rows }} />
      </section>

      <ApprovalDock item={active} onApprove={(item) => setNotice(`${commandTitle(item)} cleared locally.`)} />
    </section>
  );
}

function AIStatusBar({ data, commands }) {
  const total = (data.money || DEMO.money).reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || 0), 0);
  const blockers = commands.filter((item) => commandTag(item) === "BLOCK" || commandTag(item) === "CHECK").length;

  return (
    <section className="operator-statusbar">
      <span>CHURVOX OPERATOR ACTIVE</span>
      <strong>{commands.length} actions prepared</strong>
      <strong>{blockers} checks/blockers</strong>
      <strong>{money(total, "$4,870")} ready to invoice</strong>
    </section>
  );
}

function CommandQueue({ items, active, onSelect }) {
  return (
    <aside className="operator-queue">
      <header>
        <span>COMMAND QUEUE</span>
        <strong>{items.length}</strong>
      </header>

      <div>
        {items.map((item, index) => (
          <button key={`${commandTitle(item)}-${index}`} type="button" className={active === item ? "active" : ""} onClick={() => onSelect(item)}>
            <code>[{commandTag(item)}]</code>
            <span>
              <b>{commandTitle(item, index)}</b>
              <small>{commandDetail(item)}</small>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ActiveCommand({ item, onApprove }) {
  const [sheet, setSheet] = useState(false);

  return (
    <article className="operator-active-command">
      <span className="operator-kicker">Active command</span>
      <h1>{commandTitle(item)}</h1>

      <div className="operator-command-readout">
        <p><b>CLIENT</b><span>{clean(item?.source?.client_name || item?.client_name || item?.customer_name || item?.name, "Not linked")}</span></p>
        <p><b>DETAIL</b><span>{commandDetail(item)}</span></p>
        <p><b>AMOUNT</b><span>{money(item?.amount || item?.source?.amount)}</span></p>
        <p><b>STATUS</b><span>{commandStatus(item)}</span></p>
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

function EvidencePanel({ item, data }) {
  const evidence = item?.evidence || [
    "Record loaded",
    "Admin context prepared",
    "Owner approval required",
  ];

  return (
    <aside className="operator-evidence">
      <span className="operator-kicker">Evidence</span>
      {evidence.map((line) => (
        <p key={line}>✓ {line}</p>
      ))}
      <hr />
      <Meter label="Work records" value={(data.work || DEMO.work).length} />
      <Meter label="Money records" value={(data.money || DEMO.money).length} />
      <Meter label="Crew records" value={(data.crew || DEMO.crew).length} />
    </aside>
  );
}

function Meter({ label, value }) {
  return (
    <div className="operator-meter">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ApprovalDock({ item, onApprove }) {
  const [sheet, setSheet] = useState(false);

  return (
    <section className="operator-approval-dock">
      <span>{commandTitle(item)}</span>
      <button type="button" className="ghost" onClick={() => setSheet(true)}>Review</button>
      <button type="button" className="ghost" onClick={() => setSheet(true)}>Edit</button>
      <button type="button" onClick={() => onApprove?.(item)}>Approve</button>

      {sheet ? <ReviewSheet item={item} onClose={() => setSheet(false)} onApprove={onApprove} /> : null}
    </section>
  );
}

function PlansSection({ onChoose }) {
  return (
    <section className="operator-section operator-plans" id="plans">
      <span className="operator-kicker">Plans</span>
      <h2>Pricing built around AI Operator Actions.</h2>
      <div className="operator-plan-grid">
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
    <section className="operator-page">
      <section className="operator-modebar">
        <div>
          <span>PLAN CONTROL</span>
          <strong>Choose Churvox capacity</strong>
          <small>Operator is the main AI admin plan.</small>
        </div>
      </section>

      {notice ? <section className="operator-notice">{notice}</section> : null}

      <section className="operator-plan-grid app">
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
    <section className="operator-page">
      <section className="operator-modebar">
        <div>
          <span>LEGAL CONTROL</span>
          <strong>Trust, policy and owner responsibility</strong>
          <small>Proper legal area for public confidence.</small>
        </div>
      </section>

      <section className="operator-legal-grid">
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
    <section className="operator-modal">
      <article>
        <header><div><span className="operator-kicker">Legal</span><h2>{item.title}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{item.body}</p>
        <p>Churvox prepares drafts, reminders, admin actions and business information for approval. The business owner or authorised user must review and approve final outputs before relying on or sending them.</p>
        <footer><button type="button" onClick={onClose}>Close</button></footer>
      </article>
    </section>
  );
}

function UtilityPage({ route, go }) {
  const copy = {
    proof: ["Proof Commands", "Proof packs, photos and job notes prepared for customer-ready admin.", "money"],
    payroll: ["Payroll Commands", "Hours, missing times and export checks prepared for review.", "crew"],
    settings: ["Settings", "Business profile, roles, invoice setup, MYOB, SMS and notifications.", "today"],
  }[route] || ["Operator Tools", "Prepared business commands.", "today"];

  return (
    <section className="operator-page">
      <section className="operator-modebar">
        <div>
          <span>{copy[0].toUpperCase()}</span>
          <strong>{copy[1]}</strong>
          <small>Same approval-first console pattern.</small>
        </div>
        <button type="button" onClick={() => go(copy[2])}>Open related mode</button>
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
    <section className="operator-modal">
      <form onSubmit={submit}>
        <header><h2>{page.action}</h2><button type="button" onClick={onClose}>×</button></header>

        <div className="operator-form-grid">
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
    <section className="operator-modal">
      <article>
        <header><div><span className="operator-kicker">Review command</span><h2>{commandTitle(item)}</h2></div><button type="button" onClick={onClose}>×</button></header>
        <p>{commandDetail(item)}</p>

        <div className="operator-sheet-grid">
          <div><b>Status</b><span>{commandStatus(item)}</span></div>
          <div><b>Amount</b><span>{money(item?.amount || item?.source?.amount)}</span></div>
          <div><b>Type</b><span>{clean(item?.type, "Admin")}</span></div>
        </div>

        <div className="operator-detail">
          {Object.entries(item || {}).slice(0, 10).map(([key, value]) => (
            <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "—")}</span></p>
          ))}
        </div>

        <footer>
          <button type="button" className="ghost" onClick={onClose}>Close</button>
          <button type="button" onClick={() => { onApprove?.(item); onClose(); }}>Approve command</button>
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
