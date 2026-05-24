import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";

const list = (v) => Array.isArray(v) ? v :
  Array.isArray(v?.data) ? v.data :
  Array.isArray(v?.items) ? v.items :
  Array.isArray(v?.jobs) ? v.jobs :
  Array.isArray(v?.clients) ? v.clients :
  Array.isArray(v?.invoices) ? v.invoices :
  Array.isArray(v?.quotes) ? v.quotes :
  Array.isArray(v?.workers) ? v.workers :
  Array.isArray(v?.actions) ? v.actions :
  Array.isArray(v?.notifications) ? v.notifications : [];

const lower = (v) => String(v || "").toLowerCase();
const uid = (v) => String(v?.id || v?._id || v?.uuid || "");
const nzMoney = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const PAGES = {
  dashboard: ["OWNER VIEW", "Focus Board", "Approve, fix, move and bill from one place.", "Add job", "/jobs/new", {
    jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications"
  }],
  jobs: ["FIELD WORK", "Jobs", "Blocked jobs, today’s work, live work and jobs ready to bill.", "Add job", "/jobs/new", { jobs: "/jobs" }],
  clients: ["CUSTOMERS", "Clients", "Clean records, missing details, recent work and follow-ups.", "Add client", "/clients/new", { clients: "/clients", jobs: "/jobs", quotes: "/quotes" }],
  invoices: ["MONEY", "Invoices", "Ready, sent, overdue and paid money in one clean place.", "New invoice", "/invoices/new", { invoices: "/invoices", jobs: "/jobs" }],
  quotes: ["SALES", "Quotes", "Drafts, sent quotes, follow-ups and accepted work.", "New quote", "/quotes/new", { quotes: "/quotes", clients: "/clients" }],
  team: ["CREW", "Team", "Active crew, invites, workload and setup issues.", "Open team", "/team", { workers: "/team/workers", jobs: "/jobs" }],
  settings: ["CONTROL", "Settings", "Business setup, users, billing and integrations.", "Main board", "/dashboard", {}],
  reports: ["RECORDS", "Reports", "Job, quote, invoice and export records.", "Main board", "/dashboard", { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" }],
  payroll: ["PAYROLL", "Payroll", "Workers, completed jobs and payroll handoff.", "Main board", "/dashboard", { workers: "/team/workers", jobs: "/jobs" }],
  automation: ["AUTOMATION", "Automation", "Rules, runs and AI-prepared admin actions.", "Main board", "/dashboard", { actions: "/ai-operator/actions" }],
  sms: ["MESSAGES", "Messages", "Credits, history, reminders and safe messaging.", "Main board", "/dashboard", { history: "/sms/history", balance: "/sms/balance", invoices: "/invoices" }],
  integrations: ["SYNC", "Integrations", "MYOB, invoice status, payment state and connected tools.", "Main board", "/dashboard", { invoices: "/invoices" }],
  notifications: ["ALERTS", "Alerts", "Unread updates, approvals and recent changes.", "Main board", "/dashboard", { notifications: "/notifications", actions: "/ai-operator/actions" }],
  dispatch: ["SCHEDULE", "Dispatch", "Scheduled work, crew movement and field conflicts.", "Add job", "/jobs/new", { jobs: "/jobs", workers: "/team/workers" }],
};

function make(type, raw) {
  const id = uid(raw);
  const status = lower(raw.status);

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

const fixed = (key, title, detail, tag, to = "#") => ({ key, title, detail, tag, to, value: 0, status: "", raw: {} });

function build(area, data) {
  const jobs = list(data.jobs).map((x) => make("job", x));
  const clients = list(data.clients).map((x) => make("client", x));
  const invoices = list(data.invoices).map((x) => make("invoice", x));
  const quotes = list(data.quotes).map((x) => make("quote", x));
  const workers = list(data.workers).map((x) => make("worker", x));
  const actions = list(data.actions).map((x) => make("action", x));
  const notes = list(data.notifications).map((x) => make("notification", x));

  const activeJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const unassigned = jobs.filter((x) => x.tag === "Unassigned");
  const completeJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const moneyDue = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));

  if (area === "dashboard") return [
    ["Approve", actions.length ? actions : quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status)), "Prepared admin waiting for owner approval."],
    ["Fix", [...unassigned, ...clients.filter((x) => x.tag === "Missing info"), ...notes.filter((x) => !x.raw?.read).slice(0, 8)], "Broken, missing or unread work."],
    ["Today", activeJobs, "Work moving now."],
    ["Owing", moneyDue, "Money to collect."],
  ];

  if (area === "jobs" || area === "dispatch") return [
    ["Fix", unassigned, "Jobs without workers or missing details."],
    ["Today", activeJobs, "Work moving today."],
    ["Field", jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status)), "Crew activity now."],
    ["Bill", completeJobs.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced)), "Finished work waiting for money."],
  ];

  if (area === "clients") return [
    ["Clients", clients, "All customer records."],
    ["Missing", clients.filter((x) => x.tag === "Missing info"), "Missing phone, email or detail."],
    ["Recent", jobs.slice(0, 20), "Customer-linked jobs."],
    ["Follow up", quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status)), "Sales needing action."],
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
    ["Crew", workers.filter((x) => !["pending", "invited"].includes(lower(x.tag))), "Ready to assign."],
    ["Invites", workers.filter((x) => ["pending", "invited"].includes(lower(x.tag))), "Still setting up."],
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
    ["History", list(data.history).map((x) => make("sms", x)), "Messages sent."],
    ["Reminders", moneyDue, "Possible reminders."],
    ["Safe mode", [fixed("safe", "Controlled SMS", "Approval-first messaging.", "Safe")], "Control."],
  ];

  if (area === "notifications") return [
    ["Unread", notes.filter((x) => !x.raw?.read), "Needs attention."],
    ["Updates", notes, "Feed."],
    ["Approvals", actions, "Prepared work."],
    ["History", notes.slice(0, 20), "Recent alerts."],
  ];

  return [
    ["Money", invoices, "Invoice records."],
    ["Jobs", jobs, "Work records."],
    ["People", workers, "Crew records."],
    ["Export", [fixed("export", "Export handoff", "Prepare records for accountant, payroll or admin.", "Export")], "Handoff."],
  ];
}

function Nav({ area }) {
  const links = [
    ["dashboard", "Board", "/dashboard"],
    ["jobs", "Jobs", "/jobs"],
    ["clients", "Clients", "/clients"],
    ["invoices", "Money", "/invoices"],
    ["quotes", "Quotes", "/quotes"],
    ["team", "Team", "/team"],
    ["settings", "Setup", "/settings"],
  ];

  return (
    <nav className="focus-nav">
      <strong>CHURVOX</strong>
      {links.map(([key, label, to]) => <Link key={key} to={to} className={area === key ? "active" : ""}>{label}</Link>)}
    </nav>
  );
}

function Card({ item }) {
  const body = (
    <>
      <span>{item.tag}</span>
      <strong>{item.title}</strong>
      <em>{item.value ? `${nzMoney(item.value)} · ${item.detail}` : item.detail}</em>
    </>
  );

  return item.to && item.to !== "#"
    ? <Link className="focus-card" to={item.to}>{body}</Link>
    : <button className="focus-card" type="button">{body}</button>;
}

function Rail({ group, main }) {
  const items = group[1] || [];

  return (
    <section className={main ? "focus-rail main" : "focus-rail"}>
      <header>
        <div>
          <p>{group[0]}</p>
          <small>{group[2]}</small>
        </div>
        <b>{items.length}</b>
      </header>
      <div className="focus-items">
        {items.length ? items.slice(0, main ? 12 : 6).map((item) => <Card key={item.key} item={item} />) : (
          <div className="focus-clear"><strong>Clear</strong><span>Nothing sitting here right now.</span></div>
        )}
      </div>
    </section>
  );
}

export default function FocusBoardPage({ area = "dashboard" }) {
  const page = PAGES[area] || PAGES.dashboard;
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

  const groups = useMemo(() => build(area, data), [area, data]);
  const main = groups[0] || ["Focus", [], "Main work."];
  const total = groups.reduce((sum, group) => sum + group[1].length, 0);
  const value = groups.flatMap((group) => group[1]).reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <main className="focus" data-version="CHURVOX_FOCUS_BOARD_RESET_20260524">
      <Nav area={area} />
      <section className="focus-screen">
        <header className="focus-hero">
          <div>
            <p>{page[0]}</p>
            <h1>{page[1]}</h1>
            <span>{page[2]}</span>
          </div>
          <Link to={page[4]}>{page[3]}</Link>
        </header>
        <section className="focus-metrics">
          <button type="button"><span>Open</span><strong>{total}</strong><em>visible records</em></button>
          <button type="button"><span>Action</span><strong>{main[1].length}</strong><em>{main[0]}</em></button>
          <button type="button"><span>Value</span><strong>{nzMoney(value)}</strong><em>visible amount</em></button>
          <button type="button"><span>Status</span><strong>{loading ? "Loading" : "Live"}</strong><em>real data</em></button>
        </section>
        <section className="focus-layout">
          <Rail group={main} main />
          <div className="focus-side">{groups.slice(1).map((group) => <Rail key={group[0]} group={group} />)}</div>
        </section>
      </section>
      <aside className="focus-ai">
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
