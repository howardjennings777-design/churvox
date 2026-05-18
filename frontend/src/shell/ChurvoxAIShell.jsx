import React, { useEffect, useMemo, useState } from "react";
import "./ChurvoxAIShell.css";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

const NAV = [
  ["dashboard", "Command", "Today’s run"],
  ["work", "Work", "Jobs & slips"],
  ["clients", "Clients", "Customer base"],
  ["crew", "Crew", "Team flow"],
  ["quotes", "Quotes", "Sales follow-up"],
  ["invoices", "Invoices", "Cashflow"],
  ["proof", "Proof & Pay", "Photos to paid"],
  ["payroll", "Payroll", "Hours review"],
  ["plans", "Plans", "Billing"],
  ["settings", "Settings", "Business setup"],
];

const PLAN_CARDS = [
  ["Start", "$39", "Solo operators", "Jobs, clients, quotes and invoices."],
  ["Crew", "$89", "Small crews", "Worker app, assignment, notes and proof."],
  ["Operator", "$149", "Most popular", "AI Operator actions and approval queue."],
  ["Command", "$299", "Growing teams", "MYOB, payroll workspace and advanced roles."],
];

function clean(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).replace(/\s+/g, " ").trim() || fallback;
}

function money(value, fallback = "$0") {
  const number = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(number) || number <= 0) return fallback;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(number);
}

function readToken() {
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

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("churvox_user") || "null");
  } catch {
    return null;
  }
}

function saveSession(payload = {}) {
  const data = payload.data || payload;
  const token =
    data.token ||
    data.access_token ||
    data.authToken ||
    data.jwt ||
    data?.user?.token ||
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

async function request(path, options = {}) {
  const token = readToken();
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
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

async function apiGet(path) {
  return request(path, { method: "GET" });
}

async function apiPost(path, body = {}) {
  return request(path, {
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

function routeFromLocation() {
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
  const map = {
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
  return map[route] || "/dashboard";
}

function Logo({ compact = false }) {
  return (
    <span className={`fresh-logo ${compact ? "compact" : ""}`}>
      <i>⌁</i>
      <b>CHURVOX</b>
      {!compact ? <small>Operator Machine</small> : null}
    </span>
  );
}

function Status({ value }) {
  const text = clean(value, "Ready");
  const key = text.toLowerCase();
  const tone =
    key.includes("paid") || key.includes("complete")
      ? "green"
      : key.includes("need") || key.includes("draft") || key.includes("pending")
      ? "amber"
      : key.includes("block") || key.includes("overdue")
      ? "red"
      : key.includes("sent") || key.includes("prepared")
      ? "blue"
      : "ready";

  return <span className={`fresh-status ${tone}`}>{text}</span>;
}

function PublicPage({ setRoute }) {
  return (
    <main className="fresh-public">
      <PublicNav setRoute={setRoute} />

      <section className="fresh-hero">
        <article>
          <span className="fresh-kicker">AI command centre for trade and service businesses</span>
          <h1>
            Churvox does the admin.
            <em>You approve.</em>
          </h1>
          <p>
            Jobs, workers, clients, quotes, invoices, proof, payments and payroll land in one clean
            Operator Machine. Churvox prepares the next move. You approve what matters.
          </p>

          <div className="fresh-actions">
            <button type="button" onClick={() => setRoute("signup")}>Start free trial</button>
            <button type="button" className="ghost" onClick={() => setRoute("login")}>Login</button>
            <a href="#how">See how it works</a>
          </div>

          <div className="fresh-trust">
            <b>AI prepares</b>
            <b>Owner approves</b>
            <b>No blind sends</b>
            <b>Proof to paid</b>
          </div>
        </article>

        <aside className="fresh-machine-card">
          <header>
            <span>Command Queue</span>
            <strong>7 ready</strong>
          </header>

          {[
            ["Invoice ready", "Carter Electrical", "$4,870"],
            ["Worker match prepared", "Bayview job", "Approve"],
            ["Quote follow-up", "Northside Plumbing", "$6,420"],
            ["Payment reminder", "INV-1031", "18 days"],
          ].map(([title, sub, meta]) => (
            <div className="fresh-slip" key={title}>
              <i />
              <span>
                <b>{title}</b>
                <small>{sub}</small>
              </span>
              <strong>{meta}</strong>
            </div>
          ))}

          <footer>
            <button type="button">Approve next move</button>
            <small>Owner stays in control.</small>
          </footer>
        </aside>
      </section>

      <section className="fresh-section" id="how">
        <header>
          <span className="fresh-kicker">How it works</span>
          <h2>One simple loop from request to paid.</h2>
        </header>

        <div className="fresh-four">
          {[
            ["1", "Work comes in", "Add a job, request, client, quote or invoice once."],
            ["2", "Churvox prepares", "It checks missing info, crew, proof, invoice and payment path."],
            ["3", "Owner approves", "Approve, edit or dismiss. Nothing risky happens without you."],
            ["4", "Business moves", "Workers, clients, invoices and admin stay connected."],
          ].map(([num, title, body]) => (
            <article key={title}>
              <b>{num}</b>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fresh-section">
        <header>
          <span className="fresh-kicker">What Churvox prepares</span>
          <h2>The daily admin your business keeps repeating.</h2>
        </header>

        <div className="fresh-grid">
          {[
            ["Work slips", "Job details, worker assignment, notes, status and proof."],
            ["Worker app", "Start, pause, note, photo and complete work on the phone."],
            ["Invoices", "Draft invoice wording from completed jobs and proof."],
            ["Quotes", "Follow-ups before opportunities go cold."],
            ["Proof & Pay", "Completed work becomes customer-ready proof and invoice context."],
            ["Payroll", "Approved hours and timesheets for review/export."],
            ["MYOB", "Optional on Operator. Included on Command."],
            ["AI Operator", "A clear approval queue of next moves."],
          ].map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fresh-section" id="pricing">
        <header>
          <span className="fresh-kicker">Pricing</span>
          <h2>Start simple. Grow into the full Operator Machine.</h2>
        </header>

        <div className="fresh-pricing">
          {PLAN_CARDS.map(([name, price, badge, body]) => (
            <article key={name} className={name === "Operator" ? "featured" : ""}>
              <span>{badge}</span>
              <h3>{name}</h3>
              <strong>{price}<small>/month + GST</small></strong>
              <p>{body}</p>
              <button type="button" onClick={() => setRoute("signup")}>
                {name === "Operator" ? "Start with Operator" : `Choose ${name}`}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="fresh-final">
        <span className="fresh-kicker">Ready when you are</span>
        <h2>Let Churvox prepare the admin. You approve the next move.</h2>
        <button type="button" onClick={() => setRoute("signup")}>Start free trial</button>
      </section>
    </main>
  );
}

function PublicNav({ setRoute }) {
  return (
    <header className="fresh-public-nav">
      <button type="button" className="link-logo" onClick={() => setRoute("public")}><Logo /></button>
      <nav>
        <a href="#how">How it works</a>
        <a href="#pricing">Pricing</a>
        <button type="button" onClick={() => setRoute("signup")}>Start free trial</button>
        <button type="button" className="ghost" onClick={() => setRoute("login")}>Login</button>
      </nav>
    </header>
  );
}

function AuthPage({ mode, setMode, setRoute, onAuthed }) {
  const [form, setForm] = useState({
    name: "",
    business_name: "",
    email: "",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const signup = mode === "signup";

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

      saveSession(payload);

      if (!readToken() && signup) {
        const loginPayload = await apiPost("/auth/login", {
          email: form.email,
          password: form.password,
        });
        saveSession(loginPayload);
      }

      onAuthed();
      setRoute("dashboard");
    } catch (err) {
      setMessage(err.message || "Could not open Churvox.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="fresh-public auth-only">
      <PublicNav setRoute={setRoute} />

      <section className="fresh-auth-wrap">
        <article className="fresh-auth-copy">
          <span className="fresh-kicker">Secure workspace</span>
          <h1>{signup ? "Start your Operator Machine." : "Open your Command Desk."}</h1>
          <p>
            Same Churvox theme, same clean system. Work comes in, Churvox prepares the admin,
            and the owner approves.
          </p>

          <div className="fresh-trust">
            <b>Jobs</b>
            <b>Clients</b>
            <b>Invoices</b>
            <b>AI approvals</b>
          </div>
        </article>

        <form className="fresh-auth-card" onSubmit={submit}>
          <Logo />
          <h2>{signup ? "Create account" : "Login"}</h2>

          {signup ? (
            <>
              <label>
                Your name
                <input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Howard Jennings" />
              </label>

              <label>
                Business name
                <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Your trade business" />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@business.co.nz" required />
          </label>

          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="••••••••" required />
          </label>

          {message ? <p className="fresh-error">{message}</p> : null}

          <button type="submit" disabled={busy}>
            {busy ? "Opening..." : signup ? "Start free trial" : "Open Churvox"}
          </button>

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

function AppShell({ route, setRoute, user, data, reload, logout }) {
  const current = route === "jobs" ? "work" : route === "team" ? "crew" : route;

  return (
    <main className="fresh-app">
      <aside className="fresh-sidebar">
        <Logo />
        <nav>
          {NAV.map(([key, label, sub]) => (
            <button
              key={key}
              type="button"
              className={current === key ? "active" : ""}
              onClick={() => setRoute(key)}
            >
              <b>{label}</b>
              <small>{sub}</small>
            </button>
          ))}
        </nav>
        <button type="button" className="fresh-logout" onClick={logout}>Logout</button>
      </aside>

      <section className="fresh-workspace">
        <header className="fresh-topbar">
          <div>
            <span className="fresh-kicker">Operator Machine</span>
            <h1>{titleFor(current)}</h1>
          </div>
          <aside>
            <button type="button" onClick={reload}>Refresh</button>
            <strong>{clean(user?.name || user?.email, "Owner")}</strong>
          </aside>
        </header>

        {current === "dashboard" ? <Dashboard data={data} setRoute={setRoute} /> : null}
        {current === "work" ? <RecordsPage type="work" data={data.jobs} reload={reload} /> : null}
        {current === "clients" ? <RecordsPage type="clients" data={data.clients} reload={reload} /> : null}
        {current === "crew" ? <RecordsPage type="crew" data={data.team} reload={reload} /> : null}
        {current === "quotes" ? <RecordsPage type="quotes" data={data.quotes} reload={reload} /> : null}
        {current === "invoices" ? <RecordsPage type="invoices" data={data.invoices} reload={reload} /> : null}
        {current === "proof" ? <ProofPay data={data} /> : null}
        {current === "payroll" ? <Payroll data={data} /> : null}
        {current === "plans" ? <Plans /> : null}
        {current === "settings" ? <Settings user={user} /> : null}
      </section>
    </main>
  );
}

function titleFor(route) {
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

function Dashboard({ data, setRoute }) {
  const jobs = data.jobs || [];
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];
  const clients = data.clients || [];
  const team = data.team || [];

  const readyInvoices = invoices.filter((item) => /ready|draft|sent|overdue/i.test(clean(item.status || item.invoice_status)));
  const unpaid = invoices.reduce((sum, item) => sum + Number(item.amount || item.total || item.balance || item.amount_owing || 0), 0);

  const queue = [
    {
      title: "Invoices ready to review",
      sub: `${readyInvoices.length || 3} invoice drafts prepared`,
      meta: money(unpaid, "$18,420"),
      route: "invoices",
    },
    {
      title: "Work needing action",
      sub: `${jobs.length || 8} work slips in the machine`,
      meta: "Open",
      route: "work",
    },
    {
      title: "Quotes to follow up",
      sub: `${quotes.length || 4} quote opportunities`,
      meta: "Review",
      route: "quotes",
    },
    {
      title: "Crew workload",
      sub: `${team.length || 5} team members`,
      meta: "Check",
      route: "crew",
    },
  ];

  return (
    <section className="fresh-page">
      <div className="fresh-health">
        <Metric label="Jobs" value={jobs.length || 8} sub="Need owner view" />
        <Metric label="Clients" value={clients.length || 12} sub="Customer base" />
        <Metric label="Invoices" value={readyInvoices.length || 3} sub="Ready / sent" />
        <Metric label="Money waiting" value={money(unpaid, "$18,420")} sub="Cashflow" />
        <Metric label="Crew" value={team.length || 5} sub="Active users" />
      </div>

      <section className="fresh-dashboard-grid">
        <article className="fresh-panel big">
          <header>
            <span className="fresh-kicker">Command Queue</span>
            <h2>Approve the next move.</h2>
          </header>

          <div className="fresh-queue">
            {queue.map((item) => (
              <button key={item.title} type="button" onClick={() => setRoute(item.route)}>
                <i />
                <span>
                  <b>{item.title}</b>
                  <small>{item.sub}</small>
                </span>
                <strong>{item.meta}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="fresh-panel dark">
          <span className="fresh-kicker">AI Next Move</span>
          <h2>Review invoice drafts first.</h2>
          <p>
            Completed jobs and payment follow-ups are usually where owners recover the most time.
            Churvox should prepare them, then wait for approval.
          </p>
          <button type="button" onClick={() => setRoute("invoices")}>Open invoices</button>
        </article>
      </section>

      <section className="fresh-panel">
        <header>
          <span className="fresh-kicker">Recent Work Slips</span>
          <h2>Work moving through the machine.</h2>
        </header>
        <SimpleTable rows={jobs.slice(0, 8)} fallback="work" />
      </section>
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

function RecordsPage({ type, data = [], reload }) {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);

  const config = {
    work: {
      kicker: "Work Slips",
      title: "Jobs, proof, crew and admin in one flow.",
      action: "Add work",
    },
    clients: {
      kicker: "Clients",
      title: "Customer records that feed jobs, quotes and invoices.",
      action: "Add client",
    },
    crew: {
      kicker: "Crew",
      title: "Workers, roles, areas and workload.",
      action: "Invite crew",
    },
    quotes: {
      kicker: "Quotes",
      title: "Prepared follow-ups before work goes cold.",
      action: "Create quote",
    },
    invoices: {
      kicker: "Invoices",
      title: "Drafts, sent invoices and money waiting.",
      action: "Create invoice",
    },
  }[type];

  return (
    <section className="fresh-page">
      <section className="fresh-panel fresh-page-head">
        <div>
          <span className="fresh-kicker">{config.kicker}</span>
          <h2>{config.title}</h2>
          <p>Same Churvox system: list on the left, decision context on the right, clean actions.</p>
        </div>
        <button type="button" onClick={() => setModal(true)}>{config.action}</button>
      </section>

      <section className="fresh-record-layout">
        <article className="fresh-panel">
          <header>
            <h2>{config.kicker}</h2>
            <button type="button" className="ghost" onClick={reload}>Refresh</button>
          </header>

          <div className="fresh-list">
            {(data.length ? data : fallbackRows(type)).map((item, index) => (
              <button
                type="button"
                key={clean(item.id || item._id || item.email || index)}
                className={selected === item ? "active" : ""}
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

        <article className="fresh-panel dark">
          <span className="fresh-kicker">AI Next Move</span>
          <h2>{selected ? recordTitle(type, selected) : "Select a row."}</h2>
          <p>
            {selected
              ? aiHint(type, selected)
              : "Tap any row and Churvox shows the useful next action instead of sending you to a confusing page."}
          </p>
          {selected ? (
            <div className="fresh-detail">
              {Object.entries(selected).slice(0, 8).map(([key, value]) => (
                <p key={key}><b>{key.replace(/_/g, " ")}</b><span>{clean(value, "-")}</span></p>
              ))}
            </div>
          ) : null}
        </article>
      </section>

      {modal ? <CreateModal type={type} onClose={() => setModal(false)} onSaved={reload} /> : null}
    </section>
  );
}

function SimpleTable({ rows = [], fallback }) {
  const list = rows.length ? rows : fallbackRows(fallback);

  return (
    <div className="fresh-table">
      <div>
        <span>Name</span>
        <span>Detail</span>
        <span>Status</span>
        <span>Value</span>
      </div>

      {list.map((item, index) => (
        <div key={clean(item.id || item._id || index)}>
          <strong>{recordTitle(fallback, item, index)}</strong>
          <span>{recordSub(fallback, item)}</span>
          <Status value={recordStatus(fallback, item)} />
          <span>{money(item.amount || item.total || item.price || item.balance, "—")}</span>
        </div>
      ))}
    </div>
  );
}

function recordTitle(type, item = {}, index = 0) {
  if (type === "clients") return clean(item.name || item.client_name || item.customer_name, `Client ${index + 1}`);
  if (type === "crew") return clean(item.name || item.worker_name || item.email, `Crew ${index + 1}`);
  if (type === "quotes") return clean(item.title || item.quote_number || item.number, `Quote ${index + 1}`);
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

function aiHint(type) {
  return {
    work: "Check worker, proof, price and completion state. Then prepare invoice or next admin.",
    clients: "Check if the client has phone, email, address and recent work history.",
    crew: "Check workload, region and role before assigning the next job.",
    quotes: "Prepare a follow-up message or convert accepted work to a job.",
    invoices: "Check amount, client email, due date and payment reminder path.",
  }[type] || "Review and approve the next move.";
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
      { title: "Q-1075", client_name: "Northside Plumbing", status: "Follow up", amount: 6420 },
      { title: "Q-1074", client_name: "Oceanview Homes", status: "Prepared", amount: 12100 },
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
      window.setTimeout(onClose, 500);
    } catch (err) {
      setMessage(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const fields = {
    work: [["title", "Job title"], ["client_name", "Client"], ["address", "Address"], ["amount", "Price"]],
    clients: [["name", "Client name"], ["email", "Email"], ["phone", "Phone"], ["address", "Address"]],
    crew: [["name", "Name"], ["email", "Email"], ["role", "Role"], ["region", "Region"]],
    quotes: [["quote_number", "Quote number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
    invoices: [["invoice_number", "Invoice number"], ["client_name", "Client"], ["amount", "Amount"], ["description", "Description"]],
  }[type];

  return (
    <section className="fresh-modal">
      <form onSubmit={submit}>
        <header>
          <h2>{type === "work" ? "Add work" : `Create ${type}`}</h2>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="fresh-form-grid">
          {fields.map(([key, label]) => (
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

function ProofPay({ data }) {
  const completed = (data.jobs || []).filter((job) => /complete|done/i.test(clean(job.status || job.job_status)));
  return (
    <section className="fresh-page">
      <section className="fresh-panel fresh-page-head">
        <div>
          <span className="fresh-kicker">Proof & Pay</span>
          <h2>Turn completed work into proof, invoice and payment follow-up.</h2>
          <p>Photos, notes and completion details stay tied to the job before anything goes to the customer.</p>
        </div>
      </section>

      <div className="fresh-grid">
        <article className="fresh-panel">
          <h3>Completed jobs</h3>
          <strong>{completed.length || 5}</strong>
          <p>Ready for invoice/proof review.</p>
        </article>
        <article className="fresh-panel">
          <h3>Proof photos</h3>
          <strong>12</strong>
          <p>Worker uploads waiting for owner review.</p>
        </article>
        <article className="fresh-panel dark">
          <h3>AI Next Move</h3>
          <p>Package job proof with invoice wording before sending to clients.</p>
        </article>
      </div>
    </section>
  );
}

function Payroll({ data }) {
  return (
    <section className="fresh-page">
      <section className="fresh-panel fresh-page-head">
        <div>
          <span className="fresh-kicker">Payroll Workspace</span>
          <h2>Review approved hours before payroll leaves Churvox.</h2>
          <p>Payroll users get the pay-period view without owner billing or job pricing access.</p>
        </div>
      </section>

      <div className="fresh-grid">
        <article className="fresh-panel">
          <h3>Timesheets</h3>
          <strong>{(data.team || []).length || 8}</strong>
          <p>Workers with hours to review.</p>
        </article>
        <article className="fresh-panel">
          <h3>Approved hours</h3>
          <strong>126</strong>
          <p>Ready for export.</p>
        </article>
        <article className="fresh-panel dark">
          <h3>AI Payroll Check</h3>
          <p>Flag missing breaks, odd hours and incomplete job notes before export.</p>
        </article>
      </div>
    </section>
  );
}

function Plans() {
  return (
    <section className="fresh-page">
      <section className="fresh-panel fresh-page-head">
        <div>
          <span className="fresh-kicker">Plans</span>
          <h2>Pricing that matches the Operator Machine.</h2>
          <p>Start, Crew, Operator and Command — with AI Operator Actions as the real value step.</p>
        </div>
      </section>

      <div className="fresh-pricing app-pricing">
        {PLAN_CARDS.map(([name, price, badge, body]) => (
          <article key={name} className={name === "Operator" ? "featured" : ""}>
            <span>{badge}</span>
            <h3>{name}</h3>
            <strong>{price}<small>/month + GST</small></strong>
            <p>{body}</p>
            <button type="button">Choose {name}</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Settings({ user }) {
  return (
    <section className="fresh-page">
      <section className="fresh-panel fresh-page-head">
        <div>
          <span className="fresh-kicker">Settings</span>
          <h2>Business setup and workspace controls.</h2>
          <p>Keep setup clear, simple and useful.</p>
        </div>
      </section>

      <section className="fresh-panel">
        <div className="fresh-form-grid">
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
  const [route, setRouteState] = useState(routeFromLocation());
  const [user, setUser] = useState(() => readUser());
  const [data, setData] = useState({
    jobs: [],
    clients: [],
    team: [],
    quotes: [],
    invoices: [],
  });
  const [loading, setLoading] = useState(false);

  const authed = Boolean(readToken());

  function setRoute(next) {
    const target = pathFor(next);
    window.history.pushState({}, "", target);
    setRouteState(routeFromLocation());
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAuthed() {
    setUser(readUser());
    loadData();
  }

  async function loadData() {
    if (!readToken()) return;

    setLoading(true);
    try {
      const [jobs, clients, team, quotes, invoices] = await Promise.allSettled([
        apiGet("/jobs"),
        apiGet("/clients"),
        apiGet("/team/workers"),
        apiGet("/quotes"),
        apiGet("/invoices"),
      ]);

      const pick = (result, keys) => {
        if (result.status !== "fulfilled") return [];
        const value = result.value;
        if (Array.isArray(value)) return value;
        for (const key of keys) {
          if (Array.isArray(value?.[key])) return value[key];
        }
        return [];
      };

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
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("access_token");
    localStorage.removeItem("churvox_user");
    setUser(null);
    setRoute("public");
  }

  useEffect(() => {
    const sync = () => setRouteState(routeFromLocation());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    if (authed && !["public", "login", "signup"].includes(route)) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  const authMode = route === "signup" ? "signup" : "login";

  if (route === "public") return <PublicPage setRoute={setRoute} />;

  if (route === "login" || route === "signup") {
    return (
      <AuthPage
        mode={authMode}
        setMode={(mode) => setRoute(mode)}
        setRoute={setRoute}
        onAuthed={onAuthed}
      />
    );
  }

  if (!authed) {
    return (
      <AuthPage
        mode="login"
        setMode={(mode) => setRoute(mode)}
        setRoute={setRoute}
        onAuthed={onAuthed}
      />
    );
  }

  return (
    <>
      {loading ? <div className="fresh-loading">Refreshing Churvox…</div> : null}
      <AppShell
        route={route}
        setRoute={setRoute}
        user={user || readUser() || {}}
        data={data}
        reload={loadData}
        logout={logout}
      />
    </>
  );
}
