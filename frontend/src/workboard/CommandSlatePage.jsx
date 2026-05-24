import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./commandSlate.css";

const list = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.invoices)) return value.invoices;
  if (Array.isArray(value?.quotes)) return value.quotes;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.actions)) return value.actions;
  if (Array.isArray(value?.notifications)) return value.notifications;
  return [];
};

const text = (value) => String(value || "");
const low = (value) => text(value).toLowerCase();
const idOf = (value) => text(value?.id || value?._id || value?.uuid || "");
const dollars = (value) => `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const CONFIG = {
  dashboard: {
    area: "COMMAND",
    title: "Churvox cockpit",
    intent: "Approvals, fixes, field work and money on one serious business screen.",
    primary: "New job",
    to: "/jobs/new",
    endpoints: {
      jobs: "/jobs",
      clients: "/clients",
      invoices: "/invoices",
      quotes: "/quotes",
      workers: "/team/workers",
      actions: "/ai-operator/actions",
      notifications: "/notifications",
    },
  },
  jobs: {
    area: "FIELD",
    title: "Job cockpit",
    intent: "Fix stuck work, move today’s jobs and bill finished work.",
    primary: "New job",
    to: "/jobs/new",
    endpoints: { jobs: "/jobs" },
  },
  clients: {
    area: "CUSTOMERS",
    title: "Customer cockpit",
    intent: "Customer records, missing details, recent work and follow-ups.",
    primary: "Add client",
    to: "/clients/new",
    endpoints: { clients: "/clients", jobs: "/jobs", quotes: "/quotes" },
  },
  invoices: {
    area: "MONEY",
    title: "Money cockpit",
    intent: "Draft, sent, overdue and paid invoices without hunting through pages.",
    primary: "New invoice",
    to: "/invoices/new",
    endpoints: { invoices: "/invoices", jobs: "/jobs" },
  },
  quotes: {
    area: "SALES",
    title: "Quote cockpit",
    intent: "Drafts, sent quotes, follow-ups and accepted work ready to convert.",
    primary: "New quote",
    to: "/quotes/new",
    endpoints: { quotes: "/quotes", clients: "/clients" },
  },
  team: {
    area: "CREW",
    title: "Crew cockpit",
    intent: "Active crew, invites, setup gaps and live workload.",
    primary: "Team",
    to: "/team",
    endpoints: { workers: "/team/workers", jobs: "/jobs" },
  },
  settings: {
    area: "CONTROL",
    title: "Control cockpit",
    intent: "Business setup, access, billing and integrations.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: {},
  },
  reports: {
    area: "RECORDS",
    title: "Reports cockpit",
    intent: "Money, jobs, quotes and export handoff in one place.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" },
  },
  payroll: {
    area: "PAYROLL",
    title: "Payroll cockpit",
    intent: "Workers, completed work, review items and handoff.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: { workers: "/team/workers", jobs: "/jobs" },
  },
  automation: {
    area: "AUTOMATION",
    title: "Automation cockpit",
    intent: "Rules, runs and AI-prepared admin work waiting for approval.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: { actions: "/ai-operator/actions" },
  },
  sms: {
    area: "MESSAGES",
    title: "Message cockpit",
    intent: "Credits, history, reminders and controlled customer messages.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: { history: "/sms/history", balance: "/sms/balance", invoices: "/invoices" },
  },
  integrations: {
    area: "SYNC",
    title: "Sync cockpit",
    intent: "MYOB, invoice state, payment state and connected tools.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: { invoices: "/invoices" },
  },
  notifications: {
    area: "ALERTS",
    title: "Alert cockpit",
    intent: "Unread updates, approvals and recent business changes.",
    primary: "Main cockpit",
    to: "/dashboard",
    endpoints: { notifications: "/notifications", actions: "/ai-operator/actions" },
  },
  dispatch: {
    area: "SCHEDULE",
    title: "Dispatch cockpit",
    intent: "Crew, scheduled jobs, field movement and conflicts.",
    primary: "New job",
    to: "/jobs/new",
    endpoints: { jobs: "/jobs", workers: "/team/workers" },
  },
};

function record(type, source) {
  const id = idOf(source);
  const status = low(source.status);

  if (type === "job") {
    const worker = source.assigned_worker_name || source.worker_name || "";
    return {
      key: `job-${id}`,
      title: source.title || source.job_name || source.client_name || "Job",
      detail: source.address || source.description || source.client_name || "Job record",
      label: !worker && !source.assigned_worker_id ? "UNASSIGNED" : ["completed", "complete", "done"].includes(status) ? "COMPLETE" : status || "JOB",
      to: `/jobs/${id}`,
      amount: source.price || source.job_price || source.fixed_price || source.total || source.amount || 0,
      status,
      raw: source,
    };
  }

  if (type === "client") {
    return {
      key: `client-${id}`,
      title: source.name || source.client_name || source.customer_name || "Client",
      detail: source.email || source.phone || source.address || "Client record",
      label: source.email && source.phone ? "READY" : "MISSING INFO",
      to: `/clients/${id}`,
      status,
      raw: source,
    };
  }

  if (type === "invoice") {
    return {
      key: `invoice-${id}`,
      title: source.customer_name || source.client_name || source.invoice_number || "Invoice",
      detail: source.description || source.email || "Invoice record",
      label: status || "INVOICE",
      to: `/invoices/${id}`,
      amount: source.balance_due || source.balance || source.total || source.amount || 0,
      status,
      raw: source,
    };
  }

  if (type === "quote") {
    return {
      key: `quote-${id}`,
      title: source.title || source.customer_name || source.client_name || "Quote",
      detail: source.description || "Quote record",
      label: status || "QUOTE",
      to: `/quotes/${id}`,
      amount: source.total || source.amount || source.price || 0,
      status,
      raw: source,
    };
  }

  if (type === "worker") {
    return {
      key: `worker-${id}`,
      title: source.name || source.full_name || source.email || "Worker",
      detail: source.role || source.email || source.phone || "Worker record",
      label: source.invite_status || source.status || source.role || "WORKER",
      to: "/team",
      status,
      raw: source,
    };
  }

  return {
    key: `${type}-${id || Math.random()}`,
    title: source.title || source.summary || source.subject || "Item",
    detail: source.message || source.reason || source.description || source.body || "Record",
    label: source.status || type.toUpperCase(),
    to: "#",
    status,
    raw: source,
  };
}

const fixed = (key, title, detail, label, to = "#", amount = 0) => ({
  key,
  title,
  detail,
  label,
  to,
  amount,
  status: "",
  raw: {},
});

function groupsFor(area, data) {
  const jobs = list(data.jobs).map((item) => record("job", item));
  const clients = list(data.clients).map((item) => record("client", item));
  const invoices = list(data.invoices).map((item) => record("invoice", item));
  const quotes = list(data.quotes).map((item) => record("quote", item));
  const workers = list(data.workers).map((item) => record("worker", item));
  const actions = list(data.actions).map((item) => record("action", item));
  const notes = list(data.notifications).map((item) => record("note", item));

  const activeJobs = jobs.filter((item) => !["completed", "complete", "done", "cancelled"].includes(item.status));
  const unassignedJobs = jobs.filter((item) => item.label === "UNASSIGNED");
  const moneyDue = invoices.filter((item) => ["sent", "open", "unpaid", "overdue"].includes(item.status));
  const completedJobs = jobs.filter((item) => ["completed", "complete", "done"].includes(item.status));

  if (area === "dashboard") {
    return [
      ["Needs approval", actions.length ? actions : quotes.filter((item) => !["accepted", "approved", "lost", "declined"].includes(item.status)), "AI/admin decisions waiting for owner review."],
      ["Needs fixing", [...unassignedJobs, ...clients.filter((item) => item.label === "MISSING INFO"), ...notes.filter((item) => !item.raw?.read).slice(0, 8)], "Broken, missing or unread items."],
      ["Today moving", activeJobs, "Jobs and field work that should move now."],
      ["Money owing", moneyDue, "Sent, unpaid or overdue invoices."],
    ];
  }

  if (area === "jobs" || area === "dispatch") {
    return [
      ["Needs fixing", unassignedJobs, "No worker, blocked or missing action."],
      ["Today moving", activeJobs, "Work that should move today."],
      ["In field", jobs.filter((item) => ["in_progress", "in progress", "started", "paused"].includes(item.status)), "Crew activity now."],
      ["Ready to bill", completedJobs.filter((item) => !(item.raw.invoice_id || item.raw.draft_invoice_id || item.raw.invoiced)), "Finished work waiting for money."],
    ];
  }

  if (area === "clients") {
    return [
      ["Active records", clients, "Every customer on file."],
      ["Missing info", clients.filter((item) => item.label === "MISSING INFO"), "Phone, email or details missing."],
      ["Recent work", jobs.slice(0, 20), "Customer-linked jobs."],
      ["Follow-ups", quotes.filter((item) => !["accepted", "approved", "lost", "declined"].includes(item.status)), "Sales needing a nudge."],
    ];
  }

  if (area === "invoices") {
    return [
      ["Draft / ready", invoices.filter((item) => ["draft", "pending", ""].includes(item.status)), "Not sent yet."],
      ["Sent", invoices.filter((item) => ["sent", "open", "unpaid"].includes(item.status)), "Money waiting."],
      ["Overdue", invoices.filter((item) => item.status === "overdue"), "Needs chasing."],
      ["Paid", invoices.filter((item) => ["paid", "complete", "completed"].includes(item.status)), "Money received."],
    ];
  }

  if (area === "quotes") {
    return [
      ["Drafts", quotes.filter((item) => ["draft", "pending", ""].includes(item.status)), "Being prepared."],
      ["Sent", quotes.filter((item) => ["sent", "open"].includes(item.status)), "With customers."],
      ["Follow-up", quotes.filter((item) => !["accepted", "approved", "lost", "declined"].includes(item.status)), "Needs contact."],
      ["Accepted", quotes.filter((item) => ["accepted", "approved"].includes(item.status)), "Ready to convert."],
    ];
  }

  if (area === "team") {
    return [
      ["Active crew", workers.filter((item) => !["pending", "invited"].includes(low(item.label))), "Ready to assign."],
      ["Invites", workers.filter((item) => ["pending", "invited"].includes(low(item.label))), "Still setting up."],
      ["Workload", jobs.filter((item) => item.label !== "UNASSIGNED"), "Assigned work."],
      ["Setup issues", workers.filter((item) => !item.raw.role), "Missing role or access."],
    ];
  }

  if (area === "settings") {
    return [
      ["Business", [fixed("business", "Business profile", "Trade, details, defaults and branding.", "CONTROL")], "Core setup."],
      ["Access", [fixed("access", "Users and roles", "Owner, Manager, Worker, Office Admin and Payroll.", "ROLES")], "Permissions."],
      ["Billing", [fixed("billing", "Plan controls", "Limits, billing, MYOB add-ons and growth packs.", "PLAN", "/plans")], "Plan control."],
      ["Integrations", [fixed("sync", "Connected tools", "MYOB, SMS and future sync controls.", "SYNC", "/integrations")], "Connections."],
    ];
  }

  if (area === "automation") {
    return [
      ["Approvals", actions, "Prepared AI actions."],
      ["Rules", [fixed("rules", "Automation rules", "Rule builder and triggers.", "RULES")], "Logic."],
      ["Runs", [fixed("runs", "Run history", "Automation history.", "RUNS")], "History."],
      ["Templates", [fixed("templates", "Smart templates", "Reminders, invoices, jobs and admin.", "TEMPLATES")], "Patterns."],
    ];
  }

  if (area === "sms") {
    return [
      ["Credits", [fixed("credits", "SMS credits", data.balance?.balance !== undefined ? `${data.balance.balance} credits available` : "Credit balance loads here.", "BALANCE")], "Credit state."],
      ["History", list(data.history).map((item) => record("sms", item)), "Messages sent."],
      ["Reminders", moneyDue, "Possible reminders."],
      ["Safe mode", [fixed("safe", "Controlled SMS", "Approval-first messaging.", "SAFE")], "Control."],
    ];
  }

  if (area === "notifications") {
    return [
      ["Unread", notes.filter((item) => !item.raw?.read), "Needs attention."],
      ["All updates", notes, "Feed."],
      ["Approvals", actions, "Prepared work."],
      ["History", notes.slice(0, 20), "Recent alerts."],
    ];
  }

  return [
    ["Money records", invoices, "Invoice records."],
    ["Job records", jobs, "Work records."],
    ["People", workers, "Crew records."],
    ["Exports", [fixed("export", "Export handoff", "Prepare records for accountant, payroll or admin.", "EXPORT")], "Handoff."],
  ];
}

function Nav({ area }) {
  const items = [
    ["dashboard", "Cockpit", "/dashboard"],
    ["jobs", "Jobs", "/jobs"],
    ["clients", "Clients", "/clients"],
    ["invoices", "Money", "/invoices"],
    ["quotes", "Quotes", "/quotes"],
    ["team", "Crew", "/team"],
    ["settings", "Control", "/settings"],
  ];

  return (
    <nav className="cmd-map">
      <div className="cmd-mark">C</div>
      {items.map(([key, label, to]) => (
        <Link key={key} className={area === key ? "active" : ""} to={to}>
          {label}
        </Link>
      ))}
    </nav>
  );
}

function Ticket({ item }) {
  const body = (
    <>
      <span>{item.label}</span>
      <strong>{item.title}</strong>
      <em>{item.amount ? `${dollars(item.amount)} · ${item.detail}` : item.detail}</em>
    </>
  );

  return item.to && item.to !== "#"
    ? <Link className="cmd-ticket" to={item.to}>{body}</Link>
    : <button className="cmd-ticket" type="button">{body}</button>;
}

function Column({ group, large }) {
  const items = group[1] || [];

  return (
    <section className={large ? "cmd-column cmd-column-focus" : "cmd-column"}>
      <header>
        <div>
          <p>{group[0]}</p>
          <span>{group[2]}</span>
        </div>
        <b>{items.length}</b>
      </header>

      <div>
        {items.length ? (
          items.slice(0, large ? 14 : 7).map((item) => <Ticket key={item.key} item={item} />)
        ) : (
          <div className="cmd-empty">
            <strong>Clear</strong>
            <span>Nothing sitting here right now.</span>
          </div>
        )}
      </div>
    </section>
  );
}

export default function CommandSlatePage({ area = "dashboard" }) {
  const config = CONFIG[area] || CONFIG.dashboard;
  const { get } = useApi();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};

    await Promise.all(Object.entries(config.endpoints || {}).map(async ([key, path]) => {
      try {
        const response = await get(path);
        next[key] = response?.data ?? response?.[key] ?? response ?? [];
      } catch {
        next[key] = [];
      }
    }));

    setData(next);
    setLoading(false);
  }, [config, get]);

  useEffect(() => {
    load();
  }, [load]);

  const groups = useMemo(() => groupsFor(area, data), [area, data]);
  const focus = groups[0] || ["Focus", [], "Main work."];
  const total = groups.reduce((sum, group) => sum + group[1].length, 0);
  const value = groups.flatMap((group) => group[1]).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <main className="cmd" data-version="CHURVOX_COCKPIT_RESET_20260524">
      <Nav area={area} />

      <section className="cmd-main">
        <header className="cmd-hero">
          <div>
            <p>{config.area}</p>
            <h1>{config.title}</h1>
            <span>{config.intent}</span>
          </div>

          <div className="cmd-actions">
            <Link className="primary" to={config.to}>{config.primary}</Link>
            <Link to="/invoices">Money</Link>
          </div>
        </header>

        <section className="cmd-metrics">
          <button type="button"><span>Open</span><strong>{total}</strong><em>visible records</em></button>
          <button type="button"><span>Attention</span><strong>{focus[1].length}</strong><em>{focus[0]}</em></button>
          <button type="button"><span>Value</span><strong>{dollars(value)}</strong><em>visible amount</em></button>
        </section>

        <section className="cmd-floor">
          <Column group={focus} large />
          <div className="cmd-sidegrid">
            {groups.slice(1).map((group) => <Column key={group[0]} group={group} />)}
          </div>
        </section>
      </section>

      <aside className="cmd-operator">
        <p>AI OPERATOR</p>
        <h2>{focus[1].length ? focus[0] : "All clear"}</h2>
        <span>{focus[2]}</span>

        <div>
          <small>Next move</small>
          <strong>{focus[1][0]?.title || "No urgent item"}</strong>
          <em>{focus[1][0]?.detail || "Anything that needs action appears here with the path to open it."}</em>
        </div>

        <div className="soft">
          <small>Status</small>
          <strong>{loading ? "Loading live data" : "Live data"}</strong>
          <em>One cockpit layout. No old theme stack.</em>
        </div>
      </aside>
    </main>
  );
}
