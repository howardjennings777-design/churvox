import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const API_BASE = (() => {
  const raw =
    process.env.REACT_APP_API_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    process.env.VITE_BACKEND_URL ||
    "https://grassley-backend.onrender.com";
  const clean = String(raw).replace(/\/+$/, "");
  return clean.endsWith("/api") ? clean : `${clean}/api`;
})();

function readToken() {
  try {
    return localStorage.getItem("token") || localStorage.getItem("authToken") || localStorage.getItem("access_token") || "";
  } catch {
    return "";
  }
}

async function api(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const t = readToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}/${String(path).replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    credentials: "include",
    headers,
    body: options.body && !(options.body instanceof FormData) ? JSON.stringify(options.body) : options.body,
  });

  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) throw new Error(payload?.detail || payload?.message || payload?.error || `${path} failed`);
  return payload;
}

function toArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of keys) if (Array.isArray(payload[key])) return payload[key];
  for (const key of ["data", "items", "results"]) if (Array.isArray(payload[key])) return payload[key];
  return Object.values(payload).find(Array.isArray) || [];
}

function titleOf(item, fallback) {
  return item?.title || item?.name || item?.client_name || item?.customer_name || item?.invoice_number || item?.quote_number || item?.email || fallback;
}

function statusOf(item, fallback = "active") {
  return String(item?.status || item?.job_status || item?.payment_status || item?.quote_status || item?.state || fallback).replaceAll("_", " ");
}

function money(item) {
  const value = Number(item?.total || item?.amount || item?.price || item?.balance || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
}

function useLiveData() {
  const [state, setState] = useState({ loading: true, error: "", jobs: [], clients: [], quotes: [], invoices: [], team: [] });

  async function load() {
    setState((s) => ({ ...s, loading: true, error: "" }));
    const calls = await Promise.allSettled([
      api("/jobs"),
      api("/clients"),
      api("/quotes"),
      api("/invoices"),
      api("/team/workers"),
    ]);

    setState({
      loading: false,
      error: calls.some((c) => c.status === "rejected") ? "Some live data could not load. Showing the Operator OS shell." : "",
      jobs: calls[0].status === "fulfilled" ? toArray(calls[0].value, ["jobs"]) : [],
      clients: calls[1].status === "fulfilled" ? toArray(calls[1].value, ["clients"]) : [],
      quotes: calls[2].status === "fulfilled" ? toArray(calls[2].value, ["quotes"]) : [],
      invoices: calls[3].status === "fulfilled" ? toArray(calls[3].value, ["invoices"]) : [],
      team: calls[4].status === "fulfilled" ? toArray(calls[4].value, ["workers", "team"]) : [],
    });
  }

  useEffect(() => { load(); }, []);
  return { ...state, reload: load };
}

function ChurvoxLogo() {
  return (
    <div className="op-logo">
      <div className="op-logo-mark">
        <span className="op-logo-c1" />
        <span className="op-logo-c2" />
        <span className="op-logo-c3" />
      </div>
      <div>
        <strong>CHURVOX</strong>
        <small>OPERATOR OS</small>
      </div>
    </div>
  );
}

function Shell({ children }) {
  const location = useLocation();
  const nav = [
    ["Command", "/dashboard", "⬡", "Approval Command Centre"],
    ["Jobs", "/jobs", "⌘", "Schedule & Dispatch"],
    ["Crew", "/team", "♧", "People & Availability"],
    ["Quotes", "/quotes", "▤", "Estimates & Follow-ups"],
    ["Invoices", "/invoices", "▥", "Billing & Payments"],
    ["Clients", "/clients", "◎", "Customers & Sites"],
    ["Settings", "/settings", "⚙", "System & Preferences"],
  ];

  return (
    <div className="op-shell">
      <aside className="op-rail">
        <ChurvoxLogo />

        <nav className="op-nav">
          {nav.map(([label, href, icon, sub]) => (
            <Link key={href} to={href} className={location.pathname === href ? "active" : ""}>
              <i>{icon}</i>
              <span>
                <b>{label}</b>
                <small>{sub}</small>
              </span>
            </Link>
          ))}
        </nav>

        <section className="op-ai-mode">
          <p>AI OPERATOR</p>
          <strong>Active & running 24/7</strong>
          <small>Running 12 automations</small>
        </section>

        <section className="op-user">
          <div className="op-avatar">A</div>
          <div>
            <strong>Alex Turner</strong>
            <small>Business Owner</small>
          </div>
        </section>
      </aside>

      <main className="op-main">{children}</main>
    </div>
  );
}

function Topbar() {
  return (
    <div className="op-topbar">
      <span>☼ Good morning, Alex.</span>
      <div>
        <button>⌂ All locations</button>
        <button>🔔 <i>3</i></button>
        <button>Wed, 11 May 2026</button>
      </div>
    </div>
  );
}

function Hero({ data, prepared }) {
  return (
    <section className="op-hero">
      <div className="op-hero-copy">
        <p>CHURVOX OPERATOR OS</p>
        <h1>AI runs the admin.<br /><span>You approve the moves.</span></h1>
        <small>Churvox Operator OS handles jobs, invoices, quote follow-ups and admin busywork so you can keep the business moving.</small>
      </div>

      <div className="op-orb-wrap">
        <div className="op-radar" />
        <div className="op-orb">
          <div className="op-logo-mark mini">
            <span className="op-logo-c1" />
            <span className="op-logo-c2" />
            <span className="op-logo-c3" />
          </div>
        </div>
      </div>

      <aside className="op-status">
        <p>AI OPERATOR</p>
        <strong>Always on. Always working.</strong>
        <span>✓ Monitoring everything</span>
        <span>✓ Managing the admin</span>
        <span>✓ Preparing decisions</span>
      </aside>

      <aside className="op-prepared">
        <strong>{prepared}</strong>
        <span>Prepared actions</span>
        <small>Ready for your approval</small>
      </aside>
    </section>
  );
}

function ApprovalQueue({ unassigned, openInvoices, openQuotes }) {
  const actions = [
    {
      icon: "♧",
      label: "DISPATCH",
      title: `Assign ${unassigned || 0} unassigned jobs`,
      text: "Jobs matched to available crew",
      why: "Why: Crew are available and within 15km of site.",
      confidence: "95%",
      tone: "blue",
    },
    {
      icon: "✉",
      label: "CASHFLOW",
      title: `Prepare payment reminders for ${openInvoices || 0} invoices`,
      text: "Invoices are overdue or ready for follow-up",
      why: "Why: Improves cash flow based on payment history.",
      confidence: "91%",
      tone: "amber",
    },
    {
      icon: "☷",
      label: "SALES",
      title: `Follow up ${openQuotes || 0} open quotes`,
      text: "Quotes sent with no response",
      why: "Why: High-intent leads are most likely to convert now.",
      confidence: "88%",
      tone: "purple",
    },
    {
      icon: "▤",
      label: "INVOICE",
      title: "Draft invoice from completed job proof",
      text: "Photos, time logs and notes are ready",
      why: "Why: Ready to invoice based on job completion.",
      confidence: "93%",
      tone: "green",
    },
  ];

  return (
    <section className="op-approval">
      <header>
        <div>
          <h2>AI APPROVAL QUEUE <b>4</b></h2>
          <p>Actions ready for your approval</p>
        </div>
        <div className="op-confidence">AI confidence <span>High</span> <button>Review all</button></div>
      </header>

      <div className="op-approval-list">
        {actions.map((a) => (
          <article className={`op-action ${a.tone}`} key={a.label}>
            <i>{a.icon}</i>
            <div>
              <span>{a.label}</span>
              <strong>{a.title}</strong>
              <p>{a.text}</p>
              <small>{a.why}</small>
            </div>
            <em>{a.confidence}<b>••••</b></em>
            <div className="op-action-buttons">
              <button>Approve</button>
              <button>Review</button>
            </div>
          </article>
        ))}
      </div>

      <footer>
        <span>‹ 4 actions ready</span>
        <strong>◷ Est. time saved: <b>1h 42m</b></strong>
      </footer>
    </section>
  );
}

function ProofToPaid() {
  const steps = [
    ["▦", "Job", "Booked"],
    ["♧", "Crew", "Assigned"],
    ["◆", "Work", "Completed"],
    ["▣", "Proof", "Captured"],
    ["▤", "Invoice", "Drafted"],
    ["➤", "Sent", ""],
    ["$", "Paid", ""],
  ];

  return (
    <section className="op-proof">
      <h2>FROM PROOF TO PAID. HANDLED BY AI.</h2>
      <div className="op-flow">
        {steps.map(([icon, a, b], index) => (
          <article className={index === 2 ? "active" : ""} key={`${a}-${b}`}>
            <i>{icon}</i>
            <span>{a}</span>
            <small>{b}</small>
          </article>
        ))}
      </div>
      <p>Churvox follows every job from first call to final payment. You approve the moves, we handle the rest.</p>
    </section>
  );
}

function CrewStatus({ team }) {
  const rows = [
    ["James Carter", "On site", "Newtown"],
    ["Mia Patel", "On site", "Lower Hutt"],
    ["Sam Cooper", "Travelling", "Wellington"],
    ["Luke Barnes", "Off", "Upper Hutt"],
  ];

  return (
    <section className="op-panel op-crew">
      <header><h3>CREW STATUS</h3><a>View all crew</a></header>
      {rows.map((r, i) => (
        <div className="op-crew-row" key={r[0]}>
          <i>{r[0][0]}</i>
          <strong>{r[0]}</strong>
          <span className={r[1].toLowerCase().replace(" ", "-")}>● {r[1]}</span>
          <small>⌖ {r[2]}</small>
        </div>
      ))}
      <footer>{team.length || 22} crew members</footer>
    </section>
  );
}

function Cashflow() {
  return (
    <section className="op-panel op-cash">
      <header><h3>CASHFLOW OVERVIEW</h3><a>This month⌄</a></header>
      <div className="op-cash-grid">
        <div className="op-donut" />
        <div>
          <strong>$124,580</strong>
          <span>Net cashflow</span>
          <small>▲ 18% vs last month</small>
          <p><i className="blue" /> Invoiced $182,430</p>
          <p><i className="green" /> Received $124,580</p>
          <p><i className="orange" /> Outstanding $57,850</p>
        </div>
      </div>
    </section>
  );
}

function Schedule() {
  const rows = [
    ["8:00 AM", "Bathroom Reno", "James Carter", "Newtown"],
    ["10:30 AM", "Deck Repair", "Mia Patel", "Lower Hutt"],
    ["1:00 PM", "Kitchen Install", "Sam Cooper", "Island Bay"],
  ];
  return (
    <section className="op-panel">
      <header><h3>TODAY'S SCHEDULE <b>6</b></h3><a>View full schedule</a></header>
      {rows.map((r) => (
        <div className="op-schedule-row" key={r.join("-")}>
          <span>▦ {r[0]}</span>
          <strong>{r[1]}<small>{r[2]}</small></strong>
          <em>⌖ {r[3]}</em>
        </div>
      ))}
    </section>
  );
}

function QuotePipeline() {
  const stages = [
    ["NEW", 6, "$28,450"],
    ["SENT", 12, "$74,820"],
    ["FOLLOW UP", 8, "$46,210"],
    ["NEGOTIATION", 5, "$31,560"],
    ["WON", 7, "$58,330"],
  ];
  return (
    <section className="op-pipeline">
      <h3>QUOTE PIPELINE <b>4</b></h3>
      {stages.map((s) => (
        <article key={s[0]}>
          <span>{s[0]}</span>
          <strong>{s[1]}</strong>
          <small>{s[2]}</small>
        </article>
      ))}
      <div><strong>$239,370</strong><small>Total pipeline value</small><em>▲ 12% vs last month</em></div>
    </section>
  );
}

function LiveActivity() {
  const rows = [
    ["⚡", "AI prepared 4 actions for your approval", "2 min ago"],
    ["▤", "Invoice INV-20260503-124 drafted", "8 min ago"],
    ["✉", "Payment reminder batch queued", "15 min ago"],
    ["✓", "Job #1232 marked complete", "32 min ago"],
    ["☷", "Quote Q-20260511-04 viewed by client", "45 min ago"],
  ];

  return (
    <section className="op-panel op-activity">
      <header><h3>LIVE ACTIVITY</h3><a>View all activity</a></header>
      {rows.map((r) => (
        <div className="op-activity-row" key={r[1]}>
          <i>{r[0]}</i>
          <span>{r[1]}</span>
          <small>{r[2]}</small>
        </div>
      ))}
    </section>
  );
}

function DataPanel({ title, items, type }) {
  const list = items.length ? items.slice(0, 6) : [];
  return (
    <section className="op-panel op-data">
      <header><h3>{title} <b>{list.length || 6}</b></h3><a>View all {type}</a></header>
      {(list.length ? list : Array.from({ length: 5 })).map((item, index) => (
        <div className="op-data-row" key={item?.id || item?._id || index}>
          <div>
            <strong>{item ? titleOf(item, `${type} ${index + 1}`) : ["Bathroom Reno", "Deck Repair", "Fence repair", "Kitchen install", "Lawn service"][index]}</strong>
            <small>{item ? [item.client_name || item.customer_name, item.address || item.site_address, money(item)].filter(Boolean).join(" · ") : "1 Deep Audit Street, Wellington · $120"}</small>
          </div>
          <span>{item ? statusOf(item, type === "invoices" ? "draft" : "assigned") : type === "invoices" ? "Draft" : "Assigned"}</span>
        </div>
      ))}
    </section>
  );
}

function Dashboard() {
  const data = useLiveData();
  const openInvoices = data.invoices.filter((x) => !["paid", "void", "cancelled"].includes(statusOf(x).toLowerCase()));
  const openQuotes = data.quotes.filter((x) => !["accepted", "declined", "converted"].includes(statusOf(x).toLowerCase()));
  const unassigned = data.jobs.filter((j) => !j.assigned_worker_id && !j.worker_id && !j.assigned_to);
  const prepared = unassigned.length + openInvoices.length + openQuotes.length || 23;

  return (
    <Shell>
      <Topbar />
      {data.error ? <div className="op-warning">{data.error}</div> : null}
      <Hero data={data} prepared={prepared} />

      <section className="op-top-grid">
        <ApprovalQueue unassigned={unassigned.length || 6} openInvoices={openInvoices.length || 13} openQuotes={openQuotes.length || 4} />
        <ProofToPaid />
      </section>

      <section className="op-mid-grid">
        <CrewStatus team={data.team} />
        <Cashflow />
        <Schedule />
        <LiveActivity />
      </section>

      <section className="op-bottom-grid">
        <DataPanel title="TODAY'S SCHEDULE" type="jobs" items={data.jobs} />
        <DataPanel title="QUOTE PIPELINE" type="quotes" items={data.quotes} />
      </section>

      <QuotePipeline />
    </Shell>
  );
}

function Workspace({ kind }) {
  const data = useLiveData();
  const map = {
    jobs: ["Jobs Command", "Schedule, dispatch, prove and complete work.", data.jobs, "jobs"],
    clients: ["Client Command", "Customers, sites and repeat work.", data.clients, "clients"],
    quotes: ["Quote Command", "Follow-ups, approvals and conversion.", data.quotes, "quotes"],
    invoices: ["Money Command", "Draft, send, follow up and collect.", data.invoices, "invoices"],
    team: ["Crew Command", "Availability, roles and dispatch.", data.team, "crew"],
  };
  const [title, subtitle, items, type] = map[kind];

  return (
    <Shell>
      <Topbar />
      <section className="op-page-hero">
        <p>CHURVOX COMMAND</p>
        <h1>{title}</h1>
        <span>{subtitle}</span>
        <button onClick={data.reload}>Run scan</button>
      </section>
      <DataPanel title={title.toUpperCase()} type={type} items={items} />
    </Shell>
  );
}

function Settings() {
  return (
    <Shell>
      <Topbar />
      <section className="op-page-hero">
        <p>SYSTEM CONTROL</p>
        <h1>Settings Command</h1>
        <span>Plan, billing, MYOB, SMS and AI Operator rules.</span>
      </section>
      <section className="op-settings-grid">
        {["Plan & Billing", "MYOB Sync", "SMS Credits", "AI Operator Rules"].map((name) => (
          <article className="op-panel" key={name}>
            <h3>{name}</h3>
            <p>Ready for the next rebuild layer.</p>
          </article>
        ))}
      </section>
    </Shell>
  );
}

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMessage("Signing in...");
    try {
      const res = await api("/auth/login", { method: "POST", body: form });
      const access = res?.token || res?.access_token || res?.accessToken;
      if (access) localStorage.setItem("token", access);
      navigate("/dashboard");
    } catch (err) {
      setMessage(err.message || "Login failed.");
    }
  }

  return (
    <main className="op-login">
      <form onSubmit={submit}>
        <ChurvoxLogo />
        <h1>Open Operator OS.</h1>
        <p>AI runs the admin. You approve the moves.</p>
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit">Sign in</button>
        {message ? <small>{message}</small> : null}
      </form>
    </main>
  );
}

export default function FreshChurvoxApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs" element={<Workspace kind="jobs" />} />
        <Route path="/clients" element={<Workspace kind="clients" />} />
        <Route path="/quotes" element={<Workspace kind="quotes" />} />
        <Route path="/invoices" element={<Workspace kind="invoices" />} />
        <Route path="/team" element={<Workspace kind="team" />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
