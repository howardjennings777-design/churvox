import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

const arr = (v) =>
  Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.jobs) ? v.jobs :
  Array.isArray(v?.clients) ? v.clients :
  Array.isArray(v?.invoices) ? v.invoices :
  Array.isArray(v?.quotes) ? v.quotes :
  Array.isArray(v?.workers) ? v.workers :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.notifications) ? v.notifications : [];

const low = (v) => String(v || "").toLowerCase();
const id = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const PAGE = {
  dashboard: ["DECISION CANVAS", "AI-prepared task • Your decision drives execution", "dashboard"],
  jobs: ["JOB COMMAND", "Assign, move, complete and bill field work", "jobs"],
  dispatch: ["SCHEDULE COMMAND", "Place jobs, balance crew and avoid clashes", "dispatch"],
  clients: ["CLIENT COMMAND", "Customers, missing details and follow-ups", "clients"],
  quotes: ["QUOTE COMMAND", "Prepare, send, chase and convert work", "quotes"],
  invoices: ["MONEY COMMAND", "Drafts, owing money, overdue and paid work", "invoices"],
  team: ["CREW COMMAND", "Workers, roles, workload and invitations", "team"],
  sms: ["MESSAGE COMMAND", "Customer reminders and safe communication", "sms"],
  notifications: ["ALERT COMMAND", "Unread updates and prepared actions", "notifications"],
  reports: ["REPORT COMMAND", "Records, exports and business visibility", "reports"],
  integrations: ["SYNC COMMAND", "MYOB, accounting and connected tools", "integrations"],
  settings: ["SYSTEM COMMAND", "Business setup and app control", "settings"],
  payroll: ["PAYROLL COMMAND", "Worker summaries and payroll handoff", "payroll"],
  automation: ["AUTOMATION COMMAND", "Rules, runs and AI-prepared admin", "automation"],
};

const ENDPOINTS = {
  dashboard: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications" },
  jobs: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices" },
  dispatch: { jobs: "/jobs", workers: "/team/workers" },
  clients: { clients: "/clients", jobs: "/jobs", quotes: "/quotes" },
  quotes: { quotes: "/quotes", clients: "/clients", jobs: "/jobs" },
  invoices: { invoices: "/invoices", jobs: "/jobs", clients: "/clients" },
  team: { workers: "/team/workers", jobs: "/jobs" },
  sms: { history: "/sms/history", invoices: "/invoices", clients: "/clients" },
  notifications: { notifications: "/notifications", actions: "/ai-operator/actions", jobs: "/jobs" },
  reports: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" },
  integrations: { invoices: "/invoices" },
  payroll: { workers: "/team/workers", jobs: "/jobs" },
  automation: { actions: "/ai-operator/actions" },
  settings: {},
};

function item(type, raw) {
  const rid = id(raw);
  const status = low(raw.status);
  if (type === "job") {
    const worker = raw.assigned_worker_name || raw.worker_name || "";
    return {
      key: `job-${rid}`,
      code: raw.job_number || raw.reference || `JOB-${rid.slice(-4) || "000"}`,
      title: raw.title || raw.job_name || raw.client_name || "Job",
      subtitle: raw.address || raw.description || raw.client_name || "Job record",
      tag: !worker && !raw.assigned_worker_id ? "Unassigned" : raw.status || "Job",
      status,
      value: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0,
      to: `/jobs/${rid}`,
      raw,
    };
  }
  if (type === "client") return {
    key: `client-${rid}`,
    code: "CLIENT",
    title: raw.name || raw.client_name || raw.customer_name || "Client",
    subtitle: raw.email || raw.phone || raw.address || "Client record",
    tag: raw.email && raw.phone ? "Ready" : "Missing",
    status,
    value: 0,
    to: `/clients/${rid}`,
    raw,
  };
  if (type === "invoice") return {
    key: `invoice-${rid}`,
    code: raw.invoice_number || `INV-${rid.slice(-4) || "000"}`,
    title: raw.customer_name || raw.client_name || "Invoice",
    subtitle: raw.description || raw.email || "Invoice record",
    tag: raw.status || "Invoice",
    status,
    value: raw.balance_due || raw.balance || raw.total || raw.amount || 0,
    to: `/invoices/${rid}`,
    raw,
  };
  if (type === "quote") return {
    key: `quote-${rid}`,
    code: raw.quote_number || `QUOTE-${rid.slice(-4) || "000"}`,
    title: raw.title || raw.customer_name || raw.client_name || "Quote",
    subtitle: raw.description || "Quote record",
    tag: raw.status || "Quote",
    status,
    value: raw.total || raw.amount || raw.price || 0,
    to: `/quotes/${rid}`,
    raw,
  };
  if (type === "worker") return {
    key: `worker-${rid}`,
    code: "CREW",
    title: raw.name || raw.full_name || raw.email || "Worker",
    subtitle: raw.role || raw.email || raw.phone || "Worker record",
    tag: raw.invite_status || raw.status || raw.role || "Worker",
    status,
    value: 0,
    to: "/team",
    raw,
  };
  return {
    key: `${type}-${rid || Math.random()}`,
    code: "AI",
    title: raw.title || raw.summary || raw.subject || "Prepared action",
    subtitle: raw.message || raw.reason || raw.description || raw.body || "Churvox prepared this for review.",
    tag: raw.status || type,
    status,
    value: 0,
    to: "#",
    raw,
  };
}

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = ENDPOINTS[area] || ENDPOINTS.dashboard;

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([key, endpoint]) => {
      try {
        const res = await get(endpoint);
        next[key] = res?.data ?? res?.[key] ?? res ?? [];
      } catch {
        next[key] = [];
      }
    }));
    setData(next);
    setLoading(false);
  }, [get, endpoints]);

  useEffect(() => { load(); }, [load]);

  return { data, loading };
}

function model(data) {
  const jobs = arr(data.jobs).map((x) => item("job", x));
  const clients = arr(data.clients).map((x) => item("client", x));
  const invoices = arr(data.invoices).map((x) => item("invoice", x));
  const quotes = arr(data.quotes).map((x) => item("quote", x));
  const workers = arr(data.workers).map((x) => item("worker", x));
  const actions = arr(data.actions).map((x) => item("action", x));
  const notifications = arr(data.notifications).map((x) => item("notification", x));
  const history = arr(data.history).map((x) => item("message", x));

  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const unassigned = jobs.filter((x) => low(x.tag) === "unassigned");
  const completed = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const field = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const readyBill = completed.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const draftQuotes = quotes.filter((x) => ["draft", "pending", ""].includes(x.status));
  const follow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));

  return { jobs, clients, invoices, quotes, workers, actions, notifications, history, openJobs, unassigned, completed, field, readyBill, owing, overdue, draftInvoices, draftQuotes, follow };
}

function sum(items) {
  return items.reduce((n, x) => n + Number(x.value || 0), 0);
}

function MiniTask({ x }) {
  const content = (
    <>
      <div>
        <b>{x.code}</b>
        <small>{x.tag}</small>
      </div>
      <strong>{x.title}</strong>
      <span>{x.subtitle}</span>
    </>
  );
  return x.to && x.to !== "#" ? <Link className="shot-task" to={x.to}>{content}</Link> : <button className="shot-task" type="button">{content}</button>;
}

function CrewRow({ x, i }) {
  return (
    <Link className="shot-crew-row" to={x.to || "/team"}>
      <div>
        <strong>{x.title}</strong>
        <span>{x.subtitle}</span>
      </div>
      <small>{x.code || `JOB-${1038 + i}`}</small>
      <b>{[60, 30, 90, 45, 75][i % 5]}%</b>
    </Link>
  );
}

function MoneyRow({ x, i }) {
  return (
    <Link className="shot-money-row" to={x.to || "/invoices"}>
      <span>{x.code || `INV-${1028 + i}`}</span>
      <strong>{money(x.value || [3450, 2890, 1750, 955][i % 4])}</strong>
      <small>{x.status === "overdue" ? "Overdue" : "Waiting"}</small>
    </Link>
  );
}

function FollowUp({ x, i }) {
  return (
    <Link className="shot-follow" to={x.to || "/quotes"}>
      <div className="shot-follow-icon">{["✦", "☎", "✉", "☷", "$"][i % 5]}</div>
      <div>
        <small>{["TODAY", "TOMORROW", "FRI, 23 MAY", "MON, 26 MAY", "TUE, 27 MAY"][i % 5]}</small>
        <strong>{x.title}</strong>
        <span>{x.subtitle}</span>
      </div>
    </Link>
  );
}

function BottomDock({ active }) {
  const links = [
    ["command", "Command", "/dashboard"],
    ["schedule", "Schedule", "/dispatch"],
    ["jobs", "Jobs", "/jobs"],
    ["clients", "Clients", "/clients"],
    ["invoicing", "Invoicing", "/invoices"],
    ["reports", "Reports", "/reports"],
    ["more", "•••", "/settings"],
  ];
  const mapped = active === "dashboard" ? "command" : active === "dispatch" ? "schedule" : active === "invoices" ? "invoicing" : active === "quotes" ? "jobs" : active === "team" ? "clients" : active;
  return (
    <nav className="shot-dock">
      <Link className="shot-dock-logo" to="/dashboard">C</Link>
      {links.map(([key, label, to]) => <Link key={key} className={mapped === key ? "active" : ""} to={to}>{label}</Link>)}
    </nav>
  );
}

export default function ConceptCPage({ area = "dashboard" }) {
  const page = PAGE[area] || PAGE.dashboard;
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const m = useMemo(() => model(data), [data]);

  const needsApproval = m.actions.length ? m.actions : (m.follow.length ? m.follow : m.draftQuotes);
  const needsFixing = [...m.unassigned, ...m.clients.filter((x) => x.tag === "Missing")];
  const activeJobs = m.field.length ? m.field : m.openJobs;
  const primary = needsApproval[0] || needsFixing[0] || activeJobs[0] || m.owing[0];

  const modeItems =
    area === "jobs" || area === "dispatch" ? activeJobs :
    area === "clients" ? m.clients :
    area === "quotes" ? m.quotes :
    area === "invoices" ? m.invoices :
    area === "team" ? m.workers :
    area === "sms" || area === "notifications" ? [...m.notifications, ...m.history, ...m.owing] :
    [...needsApproval, ...needsFixing, ...activeJobs, ...m.owing];

  return (
    <main className="concept-shot" data-version="CHURVOX_SCREENSHOT_CONCEPT_C_20260524">
      <header className="shot-top">
        <Link className="shot-logo" to="/dashboard"><span>C</span><div><b>CHURVOX</b><small>AI-FIRST JOB MANAGEMENT</small></div></Link>
        <div className="shot-date"><small>Today</small><strong>Thursday, 22 May</strong></div>
        <div className="shot-user"><span>🔔</span><div><strong>Jordan Smith</strong><small>Operations Manager</small></div><i /></div>
        <b className="shot-badge">concept C</b>
      </header>

      <section className="shot-board">
        <aside className="shot-left">
          <div className="shot-greeting">
            <h2>Good morning, Jordan.</h2>
            <p>Here's your command board.</p>
          </div>

          <div className="shot-kpis">
            <div><i>▣</i><span>Active jobs</span><strong>{m.openJobs.length || 48}</strong><small>↑ 6 from yesterday</small></div>
            <div><i>$</i><span>Revenue this month</span><strong>{money(sum(m.invoices) || 126430)}</strong><small>↑ 18% vs last month</small></div>
            <div><i>✓</i><span>Jobs completed</span><strong>{m.completed.length || 23}</strong><small>↑ 5 from yesterday</small></div>
            <div><i>☆</i><span>First time fix rate</span><strong>92%</strong><small>↑ 4% vs last month</small></div>
          </div>

          <div className="shot-graph">
            <h3>Workload overview</h3>
            <svg viewBox="0 0 260 130">
              <polyline points="10,92 45,75 78,42 112,68 145,60 180,28 214,55 248,34" />
              <polyline className="dash" points="10,108 45,100 78,84 112,92 145,78 180,60 214,44 248,20" />
              <circle cx="78" cy="42" r="6" />
              <circle cx="180" cy="28" r="6" />
            </svg>
          </div>

          <div className="shot-ai-mini">
            <p>✦ AI Copilot</p>
            <span>I've prepared {needsApproval.length || 8} tasks for you. {needsFixing.length || 3} need your attention.</span>
            <Link to="/dashboard">View suggestions →</Link>
          </div>

          <div className="shot-smart">
            <p>Smart insight</p>
            <span>You're booked solid next week. Consider moving 2 jobs.</span>
            <Link to="/dispatch">View schedule →</Link>
          </div>
        </aside>

        <section className="shot-centre">
          <div className="shot-title">
            <p>✦ {page[0]}</p>
            <span>{page[1]}</span>
          </div>

          <div className="shot-decision-card">
            <div className="shot-card-head">
              <div><b>{primary?.code || "JOB-1047"}</b><small>{primary?.tag || "INSTALLATION"}</small></div>
              <span>Prepared by Churvox AI<br />Today, 7:32 AM</span>
            </div>

            <h1>{primary?.title || (area === "invoices" ? "Review invoice and send reminder" : area === "clients" ? "Review client follow-up" : "Install 2 x Heat Pump Units")}</h1>

            <div className="shot-detail-lines">
              <p>📍 {primary?.subtitle || "145 Ocean View Road, Palm Beach NSW 2108"}</p>
              <p>👤 {primary?.raw?.client_name || "Emily Harper"} &nbsp;&nbsp; ☎ 0412 555 018</p>
            </div>

            <div className="shot-fields">
              <label>Scheduled date <span>Fri, 23 May 2025</span></label>
              <label>Start time <span>8:00 AM</span></label>
              <label>Estimated duration <span>5.0 hrs</span></label>
              <label>Assigned crew <span>James, Tom +1</span></label>
              <label>Service vehicle <span>VH-37</span></label>
              <label>Priority <span>🚩 High</span></label>
            </div>

            <div className="shot-ai-reason">
              <b>✦ AI reasoning</b>
              <span>Customer has accepted previous quote. Site inspection notes confirm adequate access. Nearest certified crew available.</span>
            </div>

            <div className="shot-actions">
              <button>Send back to AI</button>
              <button>Edit task</button>
              <Link to={primary?.to || "/jobs/new"}>Approve & run ⚑</Link>
            </div>
          </div>

          <div className="shot-followups">
            <header><b>CLIENT FOLLOW-UPS</b><span>{m.follow.length || 5}</span></header>
            <div>
              {(m.follow.length ? m.follow : modeItems).slice(0, 5).map((x, i) => <FollowUp key={x.key || i} x={x} i={i} />)}
            </div>
          </div>
        </section>

        <aside className="shot-right">
          <div className="shot-panel crew">
            <header><b>CREW IN FIELD</b><span>{m.workers.length || 5}</span></header>
            {(m.workers.length ? m.workers : activeJobs).slice(0, 3).map((x, i) => <CrewRow key={x.key || i} x={x} i={i} />)}
            <Link to="/team">view all crews ›</Link>
          </div>

          <div className="shot-map">
            <div className="pin main">C</div>
            <div className="pin one">JT</div>
            <div className="pin two">L</div>
            <div className="pin three">SA</div>
          </div>

          <div className="shot-panel bill">
            <header><b>READY TO BILL</b><span>{m.readyBill.length || 4}</span></header>
            <h3>{money(sum(m.readyBill) || 8765)}</h3>
            {(m.readyBill.length ? m.readyBill : m.completed).slice(0, 4).map((x, i) => <MoneyRow key={x.key || i} x={x} i={i} />)}
            <Link to="/invoices">View all ›</Link>
          </div>

          <div className="shot-panel owing">
            <header><b>MONEY OWING</b><span>{m.owing.length || 6}</span></header>
            <h3>{money(sum(m.owing) || 14230)}</h3>
            {(m.owing.length ? m.owing : m.invoices).slice(0, 4).map((x, i) => <MoneyRow key={x.key || i} x={x} i={i} />)}
            <Link to="/invoices">View all ›</Link>
          </div>

          <div className="shot-weather">
            <p>🌤 Weather this week</p>
            <h3>18°</h3>
            <span>Mostly sunny<br />Sydney NSW</span>
          </div>
        </aside>
      </section>

      <BottomDock active={area} />
      {loading && <div className="shot-loading">Loading live Churvox data…</div>}
    </main>
  );
}
