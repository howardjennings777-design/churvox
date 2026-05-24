import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./focusBoard.css";

const list = (v) => {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.items)) return v.items;
  if (Array.isArray(v?.jobs)) return v.jobs;
  if (Array.isArray(v?.clients)) return v.clients;
  if (Array.isArray(v?.invoices)) return v.invoices;
  if (Array.isArray(v?.quotes)) return v.quotes;
  if (Array.isArray(v?.workers)) return v.workers;
  if (Array.isArray(v?.actions)) return v.actions;
  if (Array.isArray(v?.notifications)) return v.notifications;
  return [];
};

const low = (v) => String(v || "").toLowerCase();
const idOf = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const PAGE = {
  dashboard: ["OWNER DESK", "Run today from here.", "Approve what matters, fix what is stuck, see what is moving, and collect what is owing.", "Add job", "/jobs/new", {
    jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications"
  }],
  jobs: ["FIELD DESK", "Move the work.", "Unassigned jobs, today’s jobs, live field work, and completed work ready to invoice.", "Add job", "/jobs/new", { jobs: "/jobs" }],
  clients: ["CUSTOMER DESK", "Keep customers clean.", "Active records, missing info, recent jobs, and follow-ups.", "Add client", "/clients/new", { clients: "/clients", jobs: "/jobs", quotes: "/quotes" }],
  invoices: ["MONEY DESK", "Collect the money.", "Draft invoices, sent invoices, overdue money, and paid work.", "New invoice", "/invoices/new", { invoices: "/invoices", jobs: "/jobs" }],
  quotes: ["SALES DESK", "Win the work.", "Draft quotes, sent quotes, follow-ups, and accepted work.", "New quote", "/quotes/new", { quotes: "/quotes", clients: "/clients" }],
  team: ["CREW DESK", "Control the crew.", "Active staff, invites, setup gaps, and workload.", "Open team", "/team", { workers: "/team/workers", jobs: "/jobs" }],
  settings: ["CONTROL DESK", "Set the system.", "Business setup, users, billing, and integrations.", "Main desk", "/dashboard", {}],
  reports: ["RECORD DESK", "Review the records.", "Job, quote, invoice, and export records.", "Main desk", "/dashboard", { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" }],
  payroll: ["PAYROLL DESK", "Prepare payroll.", "Workers, completed work, review items, and handoff.", "Main desk", "/dashboard", { workers: "/team/workers", jobs: "/jobs" }],
  automation: ["AUTO DESK", "Review automation.", "Rules, runs, and AI-prepared admin actions.", "Main desk", "/dashboard", { actions: "/ai-operator/actions" }],
  sms: ["MESSAGE DESK", "Control messages.", "Credits, history, reminders, and safe customer messaging.", "Main desk", "/dashboard", { history: "/sms/history", balance: "/sms/balance", invoices: "/invoices" }],
  integrations: ["SYNC DESK", "Keep tools aligned.", "MYOB, invoice status, payment state, and connected tools.", "Main desk", "/dashboard", { invoices: "/invoices" }],
  notifications: ["ALERT DESK", "See what changed.", "Unread updates, approvals, and recent business changes.", "Main desk", "/dashboard", { notifications: "/notifications", actions: "/ai-operator/actions" }],
  dispatch: ["DISPATCH DESK", "Place the work.", "Scheduled work, crew movement, and field conflicts.", "Add job", "/jobs/new", { jobs: "/jobs", workers: "/team/workers" }],
};

function record(type, raw) {
  const id = idOf(raw);
  const status = low(raw.status);

  if (type === "job") {
    const worker = raw.assigned_worker_name || raw.worker_name || "";
    return {
      key: `job-${id}`,
      title: raw.title || raw.job_name || raw.client_name || "Job",
      detail: raw.address || raw.description || raw.client_name || "Job record",
      tag: !worker && !raw.assigned_worker_id ? "Unassigned" : ["completed", "complete", "done"].includes(status) ? "Complete" : raw.status || "Job",
      status,
      value: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0,
      to: `/jobs/${id}`,
      raw,
    };
  }

  if (type === "client") return {
    key: `client-${id}`,
    title: raw.name || raw.client_name || raw.customer_name || "Client",
    detail: raw.email || raw.phone || raw.address || "Client record",
    tag: raw.email && raw.phone ? "Ready" : "Missing info",
    status,
    value: 0,
    to: `/clients/${id}`,
    raw,
  };

  if (type === "invoice") return {
    key: `invoice-${id}`,
    title: raw.customer_name || raw.client_name || raw.invoice_number || "Invoice",
    detail: raw.description || raw.email || "Invoice record",
    tag: raw.status || "Invoice",
    status,
    value: raw.balance_due || raw.balance || raw.total || raw.amount || 0,
    to: `/invoices/${id}`,
    raw,
  };

  if (type === "quote") return {
    key: `quote-${id}`,
    title: raw.title || raw.customer_name || raw.client_name || "Quote",
    detail: raw.description || "Quote record",
    tag: raw.status || "Quote",
    status,
    value: raw.total || raw.amount || raw.price || 0,
    to: `/quotes/${id}`,
    raw,
  };

  if (type === "worker") return {
    key: `worker-${id}`,
    title: raw.name || raw.full_name || raw.email || "Worker",
    detail: raw.role || raw.email || raw.phone || "Worker record",
    tag: raw.invite_status || raw.status || raw.role || "Worker",
    status,
    value: 0,
    to: "/team",
    raw,
  };

  return {
    key: `${type}-${id || Math.random()}`,
    title: raw.title || raw.summary || raw.subject || "Item",
    detail: raw.message || raw.reason || raw.description || raw.body || "Record",
    tag: raw.status || type,
    status,
    value: 0,
    to: "#",
    raw,
  };
}

const fixed = (key, title, detail, tag, to = "#") => ({
  key, title, detail, tag, to, status: "", value: 0, raw: {}
});

function groups(area, data) {
  const jobs = list(data.jobs).map((x) => record("job", x));
  const clients = list(data.clients).map((x) => record("client", x));
  const invoices = list(data.invoices).map((x) => record("invoice", x));
  const quotes = list(data.quotes).map((x) => record("quote", x));
  const workers = list(data.workers).map((x) => record("worker", x));
  const actions = list(data.actions).map((x) => record("action", x));
  const notes = list(data.notifications).map((x) => record("notification", x));

  const activeJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const unassigned = jobs.filter((x) => x.tag === "Unassigned");
  const completed = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));

  if (area === "dashboard") return [
    ["Approve", actions.length ? actions : quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status)), "Admin Churvox prepared."],
    ["Fix", [...unassigned, ...clients.filter((x) => x.tag === "Missing info"), ...notes.filter((x) => !x.raw?.read).slice(0, 8)], "Missing or blocked work."],
    ["Move", activeJobs, "Work moving today."],
    ["Collect", owing, "Money waiting."],
  ];

  if (area === "jobs" || area === "dispatch") return [
    ["Fix", unassigned, "Jobs without workers or missing details."],
    ["Today", activeJobs, "Work moving today."],
    ["Field", jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status)), "Crew activity now."],
    ["Bill", completed.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced)), "Finished work waiting for invoice."],
  ];

  if (area === "clients") return [
    ["Clients", clients, "All customer records."],
    ["Missing", clients.filter((x) => x.tag === "Missing info"), "Missing phone, email, or detail."],
    ["Recent", jobs.slice(0, 20), "Recent customer work."],
    ["Follow up", quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status)), "Quotes needing action."],
  ];

  if (area === "invoices") return [
    ["Ready", invoices.filter((x) => ["draft", "pending", ""].includes(x.status)), "Not sent yet."],
    ["Sent", invoices.filter((x) => ["sent", "open", "unpaid"].includes(x.status)), "Money waiting."],
    ["Overdue", invoices.filter((x) => x.status === "overdue"), "Needs chasing."],
    ["Paid", invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status)), "Money received."],
  ];

  if (area === "quotes") return [
    ["Draft", quotes.filter((x) => ["draft", "pending", ""].includes(x.status)), "Being prepared."],
    ["Sent", quotes.filter((x) => ["sent", "open"].includes(x.status)), "With customers."],
    ["Follow up", quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status)), "Needs contact."],
    ["Accepted", quotes.filter((x) => ["accepted", "approved"].includes(x.status)), "Ready to convert."],
  ];

  if (area === "team") return [
    ["Crew", workers.filter((x) => !["pending", "invited"].includes(low(x.tag))), "Ready to assign."],
    ["Invites", workers.filter((x) => ["pending", "invited"].includes(low(x.tag))), "Still setting up."],
    ["Workload", jobs.filter((x) => x.tag !== "Unassigned"), "Assigned work."],
    ["Setup", workers.filter((x) => !x.raw.role), "Missing role or access."],
  ];

  if (area === "settings") return [
    ["Business", [fixed("business", "Business profile", "Trade, details, defaults and branding.", "Control")], "Core setup."],
    ["Access", [fixed("access", "Users and roles", "Owner, Manager, Worker, Office Admin and Payroll.", "Roles")], "Permissions."],
    ["Billing", [fixed("billing", "Plan controls", "Limits, billing, MYOB add-ons and growth packs.", "Plan", "/plans")], "Plan control."],
    ["Sync", [fixed("sync", "Connected tools", "MYOB, SMS and future sync controls.", "Sync", "/integrations")], "Connections."],
  ];

  if (area === "automation") return [
    ["Approvals", actions, "Prepared AI actions."],
    ["Rules", [fixed("rules", "Automation rules", "Rule builder and triggers.", "Rules")], "Logic."],
    ["Runs", [fixed("runs", "Run history", "Automation history.", "Runs")], "History."],
    ["Templates", [fixed("templates", "Smart templates", "Reminders, invoices, jobs and admin.", "Templates")], "Patterns."],
  ];

  if (area === "sms") return [
    ["Credits", [fixed("credits", "SMS credits", data.balance?.balance !== undefined ? `${data.balance.balance} credits available` : "Credit balance loads here.", "Balance")], "Credit state."],
    ["History", list(data.history).map((x) => record("sms", x)), "Messages sent."],
    ["Reminders", owing, "Possible reminders."],
    ["Safe", [fixed("safe", "Controlled SMS", "Approval-first messaging.", "Safe")], "Control."],
  ];

  if (area === "notifications") return [
    ["Unread", notes.filter((x) => !x.raw?.read), "Needs attention."],
    ["Updates", notes, "All updates."],
    ["Approvals", actions, "Prepared work."],
    ["History", notes.slice(0, 20), "Recent alerts."],
  ];

  return [
    ["Money", invoices, "Invoice records."],
    ["Jobs", jobs, "Work records."],
    ["People", workers, "Crew records."],
    ["Export", [fixed("export", "Export handoff", "Prepare records for accountant, payroll, or admin.", "Export")], "Handoff."],
  ];
}

function Nav({ area }) {
  const links = [
    ["dashboard", "Desk", "/dashboard"],
    ["jobs", "Jobs", "/jobs"],
    ["clients", "Clients", "/clients"],
    ["invoices", "Money", "/invoices"],
    ["quotes", "Quotes", "/quotes"],
    ["team", "Crew", "/team"],
    ["settings", "Setup", "/settings"],
  ];

  return (
    <nav className="md-nav">
      <Link to="/dashboard" className="md-brand">CHURVOX</Link>
      {links.map(([key, label, to]) => (
        <Link key={key} to={to} className={area === key ? "active" : ""}>{label}</Link>
      ))}
    </nav>
  );
}

function Ticket({ item }) {
  const body = (
    <>
      <span>{item.tag}</span>
      <strong>{item.title}</strong>
      <em>{item.value ? `${money(item.value)} · ${item.detail}` : item.detail}</em>
    </>
  );

  return item.to && item.to !== "#"
    ? <Link className="md-ticket" to={item.to}>{body}</Link>
    : <button className="md-ticket" type="button">{body}</button>;
}

function Strip({ group, hero }) {
  const items = group[1] || [];

  return (
    <section className={hero ? "md-strip hero-strip" : "md-strip"}>
      <header>
        <div>
          <p>{group[0]}</p>
          <small>{group[2]}</small>
        </div>
        <b>{items.length}</b>
      </header>
      <div className="md-list">
        {items.length ? items.slice(0, hero ? 10 : 5).map((item) => <Ticket key={item.key} item={item} />) : (
          <div className="md-empty"><strong>Clear</strong><span>Nothing sitting here right now.</span></div>
        )}
      </div>
    </section>
  );
}

export default function FocusBoardPage({ area = "dashboard" }) {
  const page = PAGE[area] || PAGE.dashboard;
  const { get } = useApi();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(page[5] || {}).map(async ([key, endpoint]) => {
      try {
        const response = await get(endpoint);
        next[key] = response?.data ?? response?.[key] ?? response ?? [];
      } catch {
        next[key] = [];
      }
    }));
    setData(next);
    setLoading(false);
  }, [page, get]);

  useEffect(() => { load(); }, [load]);

  const built = useMemo(() => groups(area, data), [area, data]);
  const main = built[0] || ["Focus", [], "Main work."];
  const total = built.reduce((sum, group) => sum + group[1].length, 0);
  const value = built.flatMap((group) => group[1]).reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <main className="mission-desk" data-version="CHURVOX_MISSION_DESK_20260524">
      <Nav area={area} />

      <section className="md-page">
        <header className="md-top">
          <div>
            <p>{page[0]}</p>
            <h1>{page[1]}</h1>
            <span>{page[2]}</span>
          </div>
          <Link to={page[4]}>{page[3]}</Link>
        </header>

        <section className="md-stats">
          <button type="button"><span>Open</span><strong>{total}</strong><em>records</em></button>
          <button type="button"><span>Now</span><strong>{main[1].length}</strong><em>{main[0]}</em></button>
          <button type="button"><span>Value</span><strong>{money(value)}</strong><em>shown</em></button>
          <button type="button"><span>Data</span><strong>{loading ? "Loading" : "Live"}</strong><em>connected</em></button>
        </section>

        <section className="md-layout">
          <Strip group={main} hero />
          <div className="md-secondary">
            {built.slice(1).map((group) => <Strip key={group[0]} group={group} />)}
          </div>
        </section>
      </section>

      <aside className="md-ai">
        <p>AI OPERATOR</p>
        <h2>{main[1].length ? main[0] : "All clear"}</h2>
        <span>{main[2]}</span>
        <div>
          <small>Next move</small>
          <strong>{main[1][0]?.title || "No urgent item"}</strong>
          <em>{main[1][0]?.detail || "When something needs attention, it appears here."}</em>
        </div>
      </aside>
    </main>
  );
}
