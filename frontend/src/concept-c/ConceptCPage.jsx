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
const rid = (v) => String(v?.id || v?._id || v?.uuid || "");
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const endpoints = {
  dashboard: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications" },
  jobs: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices", actions: "/ai-operator/actions" },
  dispatch: { jobs: "/jobs", workers: "/team/workers", actions: "/ai-operator/actions" },
  clients: { clients: "/clients", jobs: "/jobs", quotes: "/quotes", invoices: "/invoices" },
  quotes: { quotes: "/quotes", clients: "/clients", jobs: "/jobs", actions: "/ai-operator/actions" },
  invoices: { invoices: "/invoices", jobs: "/jobs", clients: "/clients", actions: "/ai-operator/actions" },
  team: { workers: "/team/workers", jobs: "/jobs", actions: "/ai-operator/actions" },
  sms: { history: "/sms/history", invoices: "/invoices", clients: "/clients", actions: "/ai-operator/actions" },
  notifications: { notifications: "/notifications", actions: "/ai-operator/actions", jobs: "/jobs" },
  reports: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes", clients: "/clients" },
  integrations: { invoices: "/invoices", actions: "/ai-operator/actions" },
  payroll: { workers: "/team/workers", jobs: "/jobs", actions: "/ai-operator/actions" },
  automation: { actions: "/ai-operator/actions", jobs: "/jobs", invoices: "/invoices" },
  settings: { actions: "/ai-operator/actions" }
};

const page = {
  dashboard: ["Today", "Everything important, fitted to one screen.", ["Needs doing", "Ready to bill", "Owing"]],
  jobs: ["Jobs", "Work grouped by what should happen next.", ["Unassigned", "In progress", "Completed"]],
  dispatch: ["Dispatch", "Crew capacity and assignment pressure.", ["Unassigned", "Crew", "Field work"]],
  clients: ["Clients", "Missing details, active records and money risk.", ["Missing", "Active", "Owing"]],
  quotes: ["Quotes", "Drafts, follow-ups and accepted work.", ["Follow up", "Drafts", "Accepted"]],
  invoices: ["Money", "Owing, overdue and ready-to-bill work.", ["Owing", "Ready to bill", "Drafts"]],
  team: ["Crew", "People, workload and blocked work.", ["Crew", "Field work", "Unassigned"]],
  sms: ["Messages", "Customer communication and reminders.", ["History", "Owing", "Clients"]],
  notifications: ["Alerts", "Updates and AI-prepared actions.", ["Alerts", "Actions", "Issues"]],
  reports: ["Reports", "Completed work and business records.", ["Done", "Invoices", "Quotes"]],
  integrations: ["Sync", "MYOB and connected operating data.", ["Invoices", "Actions", "Owing"]],
  payroll: ["Payroll", "Worker handoff, completed work and hours.", ["Crew", "Done", "Field work"]],
  automation: ["Automation", "Rules, prepared admin and things to approve.", ["Actions", "Needs doing", "Open work"]],
  settings: ["Settings", "Controls, setup and records that need fixing.", ["Issues", "Actions", "System"]]
};

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const targets = endpoints[area] || endpoints.dashboard;

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(targets).map(async ([k, url]) => {
      try {
        const r = await get(url);
        next[k] = r?.data ?? r?.[k] ?? r ?? [];
      } catch {
        next[k] = [];
      }
    }));
    setData(next);
    setLoading(false);
  }, [get, targets]);

  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

function item(type, raw) {
  const id = rid(raw);
  const st = low(raw.status);
  const base = { type, raw, status: st, value: 0, to: "#" };

  if (type === "job") {
    const assigned = raw.assigned_worker_id || raw.assigned_worker_name || raw.worker_name;
    return {
      ...base,
      code: raw.job_number || raw.reference || `JOB-${id.slice(-4) || "000"}`,
      title: raw.title || raw.job_name || raw.client_name || "Job",
      detail: raw.address || raw.description || raw.client_name || "Job record",
      state: !assigned ? "Unassigned" : raw.status || "Job",
      value: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0,
      to: id ? `/jobs/${id}` : "/jobs",
    };
  }

  if (type === "invoice") {
    return {
      ...base,
      code: raw.invoice_number || `INV-${id.slice(-4) || "000"}`,
      title: raw.customer_name || raw.client_name || "Invoice",
      detail: raw.description || raw.email || "Invoice record",
      state: raw.status || "Invoice",
      value: raw.balance_due || raw.balance || raw.total || raw.amount || 0,
      to: id ? `/invoices/${id}` : "/invoices",
    };
  }

  if (type === "quote") {
    return {
      ...base,
      code: raw.quote_number || `QTE-${id.slice(-4) || "000"}`,
      title: raw.title || raw.customer_name || raw.client_name || "Quote",
      detail: raw.description || "Quote record",
      state: raw.status || "Quote",
      value: raw.total || raw.amount || raw.price || 0,
      to: id ? `/quotes/${id}` : "/quotes",
    };
  }

  if (type === "client") {
    return {
      ...base,
      code: "CLIENT",
      title: raw.name || raw.client_name || raw.customer_name || "Client",
      detail: raw.email || raw.phone || raw.address || "Client record",
      state: raw.email && raw.phone ? "Ready" : "Missing details",
      to: id ? `/clients/${id}` : "/clients",
    };
  }

  if (type === "worker") {
    return {
      ...base,
      code: "CREW",
      title: raw.name || raw.full_name || raw.email || "Worker",
      detail: raw.role || raw.email || raw.phone || "Worker record",
      state: raw.invite_status || raw.status || raw.role || "Worker",
      to: "/team",
    };
  }

  return {
    ...base,
    code: "AI",
    title: raw.title || raw.summary || raw.subject || "Prepared action",
    detail: raw.message || raw.reason || raw.description || "Churvox prepared this.",
    state: raw.status || "Action",
    to: raw.target_url || raw.url || "#",
  };
}

function shape(data) {
  const jobs = arr(data.jobs).map((x) => item("job", x));
  const invoices = arr(data.invoices).map((x) => item("invoice", x));
  const quotes = arr(data.quotes).map((x) => item("quote", x));
  const clients = arr(data.clients).map((x) => item("client", x));
  const crew = arr(data.workers).map((x) => item("worker", x));
  const actions = arr(data.actions).map((x) => item("action", x));
  const alerts = arr(data.notifications).map((x) => item("alert", x));
  const history = arr(data.history).map((x) => item("message", x));

  const doneJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const field = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const unassigned = jobs.filter((x) => x.state === "Unassigned");
  const readyBill = doneJobs.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const drafts = [
    ...invoices.filter((x) => ["draft", "pending", ""].includes(x.status)),
    ...quotes.filter((x) => ["draft", "pending", ""].includes(x.status)),
  ];
  const follow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const accepted = quotes.filter((x) => ["accepted", "approved"].includes(x.status));
  const missing = clients.filter((x) => x.state === "Missing details");
  const done = [
    ...doneJobs,
    ...invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status)),
    ...accepted,
  ];
  const todo = [...actions, ...unassigned, ...missing, ...drafts, ...follow];
  const issues = [...overdue, ...unassigned, ...missing];

  return { jobs, invoices, quotes, clients, crew, actions, alerts, history, doneJobs, openJobs, field, unassigned, readyBill, owing, overdue, drafts, follow, accepted, missing, done, todo, issues };
}

const total = (list) => list.reduce((n, x) => n + Number(x.value || 0), 0);

function laneData(label, m) {
  const l = low(label);
  if (l.includes("ready")) return m.readyBill;
  if (l.includes("owing")) return m.owing;
  if (l.includes("done") || l.includes("completed") || l.includes("accepted")) return m.done;
  if (l.includes("issue") || l.includes("missing")) return m.issues.length ? m.issues : m.missing;
  if (l.includes("unassigned")) return m.unassigned;
  if (l.includes("progress") || l.includes("field")) return m.field;
  if (l.includes("crew")) return m.crew;
  if (l.includes("draft")) return m.drafts;
  if (l.includes("follow")) return m.follow;
  if (l.includes("invoice")) return m.invoices;
  if (l.includes("quote")) return m.quotes;
  if (l.includes("client") || l.includes("active")) return m.clients;
  if (l.includes("alert")) return m.alerts;
  if (l.includes("action") || l.includes("needs")) return m.todo;
  if (l.includes("history")) return m.history;
  return m.todo;
}

function routeFor(area) {
  return area === "dashboard" ? "/dashboard" : `/${area}`;
}

function Pill({ label, value, active }) {
  return (
    <button className={active ? "fs-pill active" : "fs-pill"} type="button">
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}

function WorkItem({ x }) {
  const body = (
    <>
      <div>
        <small>{x.code}</small>
        <b>{x.title}</b>
        <span>{x.detail}</span>
      </div>
      <em>{x.state}</em>
    </>
  );
  return x.to && x.to !== "#" ? <Link className="fs-item" to={x.to}>{body}</Link> : <div className="fs-item">{body}</div>;
}

function Lane({ name, items }) {
  return (
    <section className="fs-lane">
      <header>
        <span>{name}</span>
        <b>{items.length}</b>
      </header>
      <div>
        {items.length ? items.slice(0, 8).map((x, i) => <WorkItem key={`${name}-${x.code}-${i}`} x={x} />) : <p className="fs-empty">Clear right now.</p>}
      </div>
    </section>
  );
}

export default function ConceptCPage({ area = "dashboard" }) {
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const m = useMemo(() => shape(data), [data]);
  const [title, subtitle, lanes] = page[area] || page.dashboard;
  const focus = m.todo[0] || m.readyBill[0] || m.owing[0] || m.openJobs[0];

  const rail = [
    { k: "Done", v: m.done.length },
    { k: "Needs", v: m.todo.length },
    { k: "Owing", v: cash(total(m.owing)) },
    { k: "Bill", v: cash(total(m.readyBill)) },
    { k: "Crew", v: m.crew.length },
    { k: "Issues", v: m.issues.length },
  ];

  return (
    <main className="fs-app" data-version="CHURVOX_FULLSCREEN_OS_20260524">
      <header className="fs-bar">
        <Link to="/dashboard" className="fs-logo">
          <span>Churvox</span>
          <b>{title}</b>
        </Link>

        <nav>
          <Link to="/dashboard">Desk</Link>
          <Link to="/jobs">Jobs</Link>
          <Link to="/dispatch">Dispatch</Link>
          <Link to="/invoices">Money</Link>
          <Link to="/team">Crew</Link>
        </nav>

        <div>
          <small>{loading ? "Syncing" : "Live"}</small>
          <strong>{new Date().toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}</strong>
        </div>
      </header>

      <section className="fs-frame">
        <aside className="fs-rail">
          {rail.map((r, i) => <Pill key={r.k} label={r.k} value={r.v} active={i === 1} />)}
        </aside>

        <section className="fs-main">
          <div className="fs-title">
            <p>Fullscreen operator</p>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>

          <div className="fs-lanes">
            {lanes.map((name) => <Lane key={name} name={name} items={laneData(name, m)} />)}
          </div>
        </section>

        <aside className="fs-inspector">
          <p>Selected priority</p>
          <h2>{focus?.title || "Nothing urgent"}</h2>
          <span>{focus?.detail || "The workspace is clear. New work will appear here when Churvox finds something that needs action."}</span>

          <div className="fs-actions">
            <Link to={focus?.to && focus.to !== "#" ? focus.to : routeFor(area)}>Review</Link>
            <Link to="/ai-operator/approvals">Approvals</Link>
          </div>

          <dl>
            <div><dt>Ready to bill</dt><dd>{cash(total(m.readyBill))}</dd></div>
            <div><dt>Owing</dt><dd>{cash(total(m.owing))}</dd></div>
            <div><dt>Open jobs</dt><dd>{m.openJobs.length}</dd></div>
          </dl>
        </aside>
      </section>
    </main>
  );
}
