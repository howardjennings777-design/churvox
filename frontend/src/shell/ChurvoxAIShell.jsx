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
  ["dashboard", "Smart Hub", "AI command centre"],
  ["queue", "AI Work Queue", "Prepared actions"],
  ["jobs", "Jobs", "Dispatch board"],
  ["clients", "Clients", "Customer history"],
  ["team", "Team", "Crew availability"],
  ["quotes", "Quotes", "Sales pipeline"],
  ["invoices", "Invoices", "Cashflow"],
  ["proof", "Proof-to-Paid", "Completed work"],
  ["settings", "Settings", "Business setup"],
];

const AI_ACTIONS = [
  {
    type: "Dispatch",
    title: "Unassigned job found",
    body: "AI checked workload, area and trade fit. Jay looks like the best match.",
    action: "Approve worker",
    tone: "blue",
  },
  {
    type: "Invoice",
    title: "Draft invoice prepared",
    body: "Completed job notes, photos and price have been shaped into an invoice draft.",
    action: "Review draft",
    tone: "teal",
  },
  {
    type: "Quote",
    title: "Follow-up ready",
    body: "A quote has gone quiet. AI wrote a short follow-up for approval.",
    action: "Approve send",
    tone: "purple",
  },
  {
    type: "Cashflow",
    title: "Payment reminder drafted",
    body: "An overdue invoice needs a friendly reminder. Nothing sends until approved.",
    action: "Review reminder",
    tone: "amber",
  },
];

const JOBS = [
  ["8:00", "Kitchen renovation", "Acme Property", "In progress"],
  ["10:30", "Pool pump repair", "Blue Lagoon Pools", "Scheduled"],
  ["12:45", "Fence repair", "Westside Carpentry", "Assigned"],
  ["2:30", "Lawns and grounds", "ECB Property Maintenance", "Needs worker"],
];

const CLIENTS = [
  ["AC", "Acme Property", "3 active jobs", "Active"],
  ["BL", "Blue Lagoon Pools", "Quote follow-up due", "Follow-up"],
  ["EC", "ECB Property Maintenance", "Invoice draft ready", "Ready"],
  ["WC", "Westside Carpentry", "Recent work completed", "Active"],
];

const TEAM = [
  ["J", "Jay Morgan", "Lawn care · Available nearby", "Best match"],
  ["M", "Mia Taylor", "Cleaning · On site", "Busy"],
  ["K", "Kahu Brown", "Handyman · Free after 1pm", "Available"],
  ["S", "Sarah Lee", "Admin · In office", "Online"],
];

const QUOTES = [
  ["Q-1207", "Blue Lagoon Pools", "$3,450", "Sent"],
  ["Q-1208", "Acme Property", "$8,900", "Draft"],
  ["Q-1209", "Westside Carpentry", "$1,250", "Follow-up"],
];

const INVOICES = [
  ["INV-1042", "ECB Property Maintenance", "$2,850", "Draft"],
  ["INV-1041", "Acme Property", "$1,250", "Overdue"],
  ["INV-1040", "Blue Lagoon Pools", "$4,600", "Paid"],
];

function hasSavedLogin() {
  try {
    return Boolean(
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("access_token") ||
      localStorage.getItem("churvox_user")
    );
  } catch {
    return false;
  }
}

function saveSession(payload) {
  const data = payload?.data || payload || {};
  const token =
    data.access_token ||
    data.token ||
    data.authToken ||
    data.jwt ||
    data?.user?.token ||
    "";

  if (token) {
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("access_token", token);
  }

  const user = data.user || data.account || data.profile || {};
  if (user && typeof user === "object") {
    localStorage.setItem("churvox_user", JSON.stringify(user));
    if (user.name) localStorage.setItem("churvox_owner_name", user.name);
    if (user.email) localStorage.setItem("churvox_email", user.email);
    if (user.role) localStorage.setItem("churvox_role", user.role);
  }
}

async function authRequest(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!res.ok) {
    throw new Error(payload.detail || payload.message || payload.error || "Could not open Churvox");
  }

  return payload;
}

function Logo() {
  return (
    <div className="cx-logo">
      <div className="cx-logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div>
        <strong>Churvox</strong>
        <span>AI Operator OS</span>
      </div>
    </div>
  );
}

function PublicNav({ setAuthMode }) {
  return (
    <header className="cx-public-nav">
      <a href="#top" className="cx-logo-link">
        <Logo />
      </a>
      <nav>
        <a href="#operator">AI Operator</a>
        <a href="#flow">How it works</a>
        <a href="#features">Features</a>
      </nav>
      <button type="button" onClick={() => setAuthMode("login")}>
        Login
      </button>
    </header>
  );
}

function AuthCard({ authMode, setAuthMode, onLogin }) {
  const [form, setForm] = useState({ name: "", business_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signup = authMode === "signup";

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const payload = signup
        ? await authRequest("/auth/register", {
            name: form.name,
            business_name: form.business_name,
            email: form.email,
            password: form.password,
          })
        : await authRequest("/auth/login", {
            email: form.email,
            password: form.password,
          });

      saveSession(payload);
      onLogin();
    } catch (err) {
      setError(err.message || "Could not open Churvox");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="cx-auth-card" id="login">
      <div className="cx-auth-head">
        <div>
          <span>Secure workspace</span>
          <h2>{signup ? "Create account" : "Open Churvox"}</h2>
        </div>
        <div className="cx-auth-orb" />
      </div>

      {error ? <div className="cx-error">{error}</div> : null}

      <form onSubmit={submit} className="cx-form">
        {signup ? (
          <>
            <label>
              Your name
              <input value={form.name} onChange={(e) => update("name", e.target.value)} autoComplete="name" />
            </label>
            <label>
              Business name
              <input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} autoComplete="organization" />
            </label>
          </>
        ) : null}

        <label>
          Email
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" />
        </label>

        <label>
          Password
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>

        <button type="submit" disabled={busy}>
          {busy ? "Opening..." : signup ? "Create AI workspace" : "Open AI workspace"}
        </button>
      </form>

      <button
        type="button"
        className="cx-switch"
        onClick={() => {
          setError("");
          setAuthMode(signup ? "login" : "signup");
        }}
      >
        {signup ? "Already have an account? Login" : "Need an account? Start free trial"}
      </button>
    </aside>
  );
}

function Landing({ authMode, setAuthMode, onLogin }) {
  return (
    <main className="cx-public" id="top">
      <div className="cx-grid-bg" />
      <div className="cx-glow cx-glow-a" />
      <div className="cx-glow cx-glow-b" />

      <PublicNav setAuthMode={setAuthMode} />

      <section className="cx-hero">
        <div className="cx-hero-copy">
          <p className="cx-pill">
            <span />
            AI command centre for trade and service businesses
          </p>

          <h1>
            AI runs the admin.
            <em>You approve the work.</em>
          </h1>

          <p className="cx-hero-text">
            Churvox watches jobs, clients, workers, invoices and quotes, then prepares the next action.
            Owners get one calm approval queue instead of a messy admin dashboard.
          </p>

          <div className="cx-hero-actions">
            <a href="#login" className="cx-primary" onClick={() => setAuthMode("login")}>
              Open Churvox
            </a>
            <a href="#operator" className="cx-secondary">
              See AI Operator
            </a>
          </div>

          <div className="cx-proof-strip">
            <article>
              <strong>1 queue</strong>
              <span>Everything ready for approval</span>
            </article>
            <article>
              <strong>Less admin</strong>
              <span>AI prepares the boring work</span>
            </article>
            <article>
              <strong>Owner safe</strong>
              <span>No risky auto-send</span>
            </article>
          </div>
        </div>

        <AuthCard authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />
      </section>

      <section className="cx-operator-preview" id="operator">
        <div className="cx-section-title">
          <span>AI Operator</span>
          <h2>Better than a dashboard. Churvox prepares what needs doing.</h2>
        </div>

        <div className="cx-ai-card-grid">
          {AI_ACTIONS.map((item) => (
            <article className={`cx-ai-card ${item.tone}`} key={item.title}>
              <div className="cx-ai-status">Ready for approval</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <button type="button">{item.action}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="cx-flow" id="flow">
        {[
          ["1", "Work comes in", "Jobs, notes, photos, clients, quotes and invoices stay connected."],
          ["2", "AI checks the day", "It finds missing workers, overdue invoices, quote follow-ups and completed jobs."],
          ["3", "AI prepares actions", "Worker assignments, invoice drafts and messages are prepared for review."],
          ["4", "Owner approves", "You stay in control before anything important is sent or changed."],
        ].map(([num, title, body]) => (
          <article key={num}>
            <b>{num}</b>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="cx-features" id="features">
        <div>
          <span>Inside Churvox</span>
          <h2>One AI-powered workspace for the whole business.</h2>
        </div>

        <div className="cx-feature-list">
          {["Smart Hub", "AI Work Queue", "Jobs", "Clients", "Team", "Quotes", "Invoices", "Proof-to-Paid", "Worker App", "Settings"].map((feature) => (
            <article key={feature}>{feature}</article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Shell({ page, setPage, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = NAV.find(([key]) => key === page) || NAV[0];

  return (
    <main className="cx-app">
      <aside className={`cx-sidebar ${mobileOpen ? "open" : ""}`}>
        <Logo />

        <nav className="cx-app-nav">
          {NAV.map(([key, label, sub]) => (
            <button
              type="button"
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => {
                setPage(key);
                setMobileOpen(false);
              }}
            >
              <span>{label}</span>
              <small>{sub}</small>
            </button>
          ))}
        </nav>

        <section className="cx-side-operator">
          <span>AI Operator</span>
          <strong>{AI_ACTIONS.length} actions ready</strong>
          <p>Prepared for owner approval.</p>
        </section>
      </aside>

      <section className="cx-app-main">
        <header className="cx-topbar">
          <button className="cx-menu" type="button" onClick={() => setMobileOpen(!mobileOpen)}>
            ☰
          </button>

          <div>
            <strong>{current[1]}</strong>
            <span>{current[2]}</span>
          </div>

          <input placeholder="Search jobs, clients, invoices..." />

          <button type="button" onClick={() => setPage("queue")}>
            AI Queue
          </button>
          <button type="button" className="cx-top-primary" onClick={() => setPage("jobs")}>
            New job
          </button>
          <button type="button" className="cx-logout" onClick={onLogout}>
            Logout
          </button>
        </header>

        <Workspace page={page} setPage={setPage} />
      </section>
    </main>
  );
}

function Stat({ label, value, note }) {
  return (
    <article className="cx-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function WorkspaceHero({ kicker, title, body, metric, action, setPage }) {
  return (
    <section className="cx-work-hero">
      <div>
        <span>{kicker}</span>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>

      <aside>
        <span>AI Operator</span>
        <strong>{metric}</strong>
        <p>{action}</p>
        <button type="button" onClick={() => setPage("queue")}>
          Review queue
        </button>
      </aside>
    </section>
  );
}

function ActionQueue() {
  return (
    <section className="cx-action-board">
      {AI_ACTIONS.map((item) => (
        <article className={`cx-work-action ${item.tone}`} key={item.title}>
          <span>{item.type}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
          <div>
            <button type="button">Details</button>
            <button type="button" className="approve">{item.action}</button>
          </div>
        </article>
      ))}
    </section>
  );
}

function DataRow({ item }) {
  return (
    <button type="button" className="cx-row">
      <span>{item[0]}</span>
      <strong>{item[1]}</strong>
      <small>{item[2]}</small>
      <b>{item[3]}</b>
    </button>
  );
}

function Dashboard({ setPage }) {
  return (
    <section className="cx-workspace">
      <WorkspaceHero
        kicker="Smart Hub"
        title="AI has prepared today’s business actions."
        body="Start with decisions, not clutter. Churvox turns admin into a simple approval queue."
        metric="4 ready"
        action="Dispatch, invoice, quote and cashflow actions prepared."
        setPage={setPage}
      />

      <section className="cx-stats">
        <Stat label="Jobs today" value="14" note="3 need owner action" />
        <Stat label="Ready to invoice" value="$8.7k" note="AI drafts prepared" />
        <Stat label="Open quotes" value="7" note="2 follow-ups ready" />
        <Stat label="Crew online" value="4" note="1 best match found" />
      </section>

      <ActionQueue />

      <section className="cx-split">
        <Panel title="Today’s run sheet" subtitle="Live field work">
          {JOBS.map((item) => <DataRow item={item} key={item[1]} />)}
        </Panel>
        <Panel title="Crew status" subtitle="AI worker matching">
          {TEAM.map((item) => <DataRow item={item} key={item[1]} />)}
        </Panel>
      </section>
    </section>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="cx-panel">
      <header>
        <div>
          <span>{subtitle}</span>
          <h2>{title}</h2>
        </div>
      </header>
      <div className="cx-panel-list">{children}</div>
    </section>
  );
}

function Board({ title, body, columns, setPage }) {
  return (
    <section className="cx-workspace">
      <WorkspaceHero kicker="Workspace" title={title} body={body} metric="AI ready" action="Smart actions prepared." setPage={setPage} />
      <section className="cx-board">
        {columns.map(([name, rows]) => (
          <article className="cx-column" key={name}>
            <span>Stage</span>
            <h3>{name}</h3>
            {rows.map((row) => <DataRow item={row} key={`${name}-${row[1]}`} />)}
          </article>
        ))}
      </section>
    </section>
  );
}

function Workspace({ page, setPage }) {
  if (page === "dashboard") return <Dashboard setPage={setPage} />;

  if (page === "queue") {
    return (
      <section className="cx-workspace">
        <WorkspaceHero
          kicker="AI Work Queue"
          title="Review what AI prepared."
          body="Every important action is approval-first. Check the reason, edit if needed, then approve."
          metric="4 actions"
          action="Prepared and waiting."
          setPage={setPage}
        />
        <ActionQueue />
      </section>
    );
  }

  if (page === "jobs") {
    return (
      <Board
        title="Dispatch without the mess."
        body="Jobs are grouped into simple stages with AI worker suggestions ready for approval."
        setPage={setPage}
        columns={[
          ["Needs worker", JOBS.filter((j) => j[3] === "Needs worker")],
          ["Scheduled", JOBS.filter((j) => j[3] === "Scheduled" || j[3] === "Assigned")],
          ["In progress", JOBS.filter((j) => j[3] === "In progress")],
        ]}
      />
    );
  }

  if (page === "clients") {
    return (
      <Board
        title="Clients with memory."
        body="See active work, follow-ups and invoice opportunities without hunting through pages."
        setPage={setPage}
        columns={[
          ["Active", CLIENTS.filter((c) => c[3] === "Active")],
          ["Needs follow-up", CLIENTS.filter((c) => c[3] === "Follow-up")],
          ["Ready", CLIENTS.filter((c) => c[3] === "Ready")],
        ]}
      />
    );
  }

  if (page === "team") {
    return (
      <Board
        title="Crew availability and worker matching."
        body="AI recommends who can take the job, but the owner approves the assignment."
        setPage={setPage}
        columns={[
          ["Best match", TEAM.filter((t) => t[3] === "Best match")],
          ["Available", TEAM.filter((t) => t[3] === "Available" || t[3] === "Online")],
          ["Busy", TEAM.filter((t) => t[3] === "Busy")],
        ]}
      />
    );
  }

  if (page === "quotes") {
    return (
      <Board
        title="Quote pipeline that follows up."
        body="AI spots stale quotes and prepares follow-up messages for owner approval."
        setPage={setPage}
        columns={[
          ["Draft", QUOTES.filter((q) => q[3] === "Draft")],
          ["Sent", QUOTES.filter((q) => q[3] === "Sent")],
          ["Follow-up", QUOTES.filter((q) => q[3] === "Follow-up")],
        ]}
      />
    );
  }

  if (page === "invoices") {
    return (
      <Board
        title="Cashflow without chasing."
        body="Drafts, overdue reminders and payment follow-ups are prepared in one place."
        setPage={setPage}
        columns={[
          ["Draft", INVOICES.filter((i) => i[3] === "Draft")],
          ["Overdue", INVOICES.filter((i) => i[3] === "Overdue")],
          ["Paid", INVOICES.filter((i) => i[3] === "Paid")],
        ]}
      />
    );
  }

  if (page === "proof") {
    return (
      <Board
        title="Proof-to-paid workflow."
        body="Completed work, notes and photos become invoice-ready drafts for approval."
        setPage={setPage}
        columns={[
          ["Completed jobs", JOBS.slice(0, 2)],
          ["AI invoice drafts", INVOICES.filter((i) => i[3] === "Draft")],
          ["Approve and send", INVOICES.filter((i) => i[3] === "Overdue")],
        ]}
      />
    );
  }

  return (
    <section className="cx-workspace">
      <WorkspaceHero
        kicker="Settings"
        title="Business setup and controls."
        body="Plans, billing, roles and integrations should feel part of the same AI-powered system."
        metric="Owner safe"
        action="Guardrails stay on."
        setPage={setPage}
      />
      <section className="cx-feature-list app">
        {["Plan", "Billing", "Roles", "MYOB", "SMS", "Imports", "Security", "Business profile"].map((item) => (
          <article key={item}>{item}</article>
        ))}
      </section>
    </section>
  );
}

export default function ChurvoxAIShell() {
  const [authed, setAuthed] = useState(hasSavedLogin);
  const [authMode, setAuthMode] = useState("login");
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const map = {
      "/": "public",
      "/login": "login",
      "/signup": "signup",
      "/register": "signup",
      "/dashboard": "dashboard",
      "/smart-hub": "dashboard",
      "/ai-approvals": "queue",
      "/jobs": "jobs",
      "/clients": "clients",
      "/team": "team",
      "/quotes": "quotes",
      "/invoices": "invoices",
      "/proof-to-paid": "proof",
      "/settings": "settings",
    };

    const next = map[path] || "dashboard";
    if (next === "login" || next === "signup") setAuthMode(next);
    if (!["public", "login", "signup"].includes(next)) setPage(next);
  }, []);

  const showPublic = useMemo(() => !authed, [authed]);

  function onLogin() {
    setAuthed(true);
    setPage("dashboard");
    window.history.pushState({}, "", "/dashboard");
  }

  function onLogout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem("churvox_user");
      localStorage.removeItem("churvox_role");
      localStorage.removeItem("churvox_email");
    } catch {
      // ignore
    }
    setAuthed(false);
    setAuthMode("login");
    window.history.pushState({}, "", "/");
  }

  if (showPublic) {
    return <Landing authMode={authMode} setAuthMode={setAuthMode} onLogin={onLogin} />;
  }

  return <Shell page={page} setPage={setPage} onLogout={onLogout} />;
}
