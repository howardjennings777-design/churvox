import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

const asList = (value) => {
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

const lower = (value) => String(value || "").toLowerCase();
const idOf = (value) => String(value?.id || value?._id || value?.uuid || "");
const money = (value) => `$${Number(value || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const PAGES = {
  dashboard: {
    mode: "command",
    eyebrow: "AI OPERATOR THEATRE",
    title: "Run the day.",
    subtitle: "Approve the admin, fix the blockers, move the field, collect the money.",
    action: "Create job",
    actionTo: "/jobs/new",
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
    mode: "jobs",
    eyebrow: "FIELD CONTROL",
    title: "Move work.",
    subtitle: "A live field floor for unassigned, active, completed and ready-to-bill work.",
    action: "Create job",
    actionTo: "/jobs/new",
    endpoints: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices" },
  },
  dispatch: {
    mode: "schedule",
    eyebrow: "DISPATCH MAP",
    title: "Place work.",
    subtitle: "See crew capacity, scheduled pressure and work that needs a home.",
    action: "Create job",
    actionTo: "/jobs/new",
    endpoints: { jobs: "/jobs", workers: "/team/workers" },
  },
  clients: {
    mode: "people",
    eyebrow: "CUSTOMER CONTROL",
    title: "Know people.",
    subtitle: "Clients, missing details, recent jobs and follow-ups in one customer console.",
    action: "Add client",
    actionTo: "/clients/new",
    endpoints: { clients: "/clients", jobs: "/jobs", quotes: "/quotes", workers: "/team/workers" },
  },
  team: {
    mode: "people",
    eyebrow: "CREW CONTROL",
    title: "Control crew.",
    subtitle: "Team, roles, invites, workload and worker readiness.",
    action: "Open team",
    actionTo: "/team",
    endpoints: { workers: "/team/workers", jobs: "/jobs", clients: "/clients" },
  },
  invoices: {
    mode: "finance",
    eyebrow: "MONEY CONTROL",
    title: "Collect cash.",
    subtitle: "Draft invoices, sent invoices, overdue money and paid work.",
    action: "New invoice",
    actionTo: "/invoices/new",
    endpoints: { invoices: "/invoices", jobs: "/jobs", clients: "/clients" },
  },
  quotes: {
    mode: "sales",
    eyebrow: "SALES CONTROL",
    title: "Win work.",
    subtitle: "Draft, send, chase and convert quotes into scheduled jobs.",
    action: "New quote",
    actionTo: "/quotes/new",
    endpoints: { quotes: "/quotes", clients: "/clients", jobs: "/jobs" },
  },
  sms: {
    mode: "messages",
    eyebrow: "MESSAGE CONTROL",
    title: "Talk clean.",
    subtitle: "Customer reminders, draft replies and safe approval-first communication.",
    action: "Messages",
    actionTo: "/sms",
    endpoints: { history: "/sms/history", invoices: "/invoices", clients: "/clients" },
  },
  notifications: {
    mode: "messages",
    eyebrow: "ALERT CONTROL",
    title: "Catch changes.",
    subtitle: "Unread alerts, approvals and important business events.",
    action: "Main board",
    actionTo: "/dashboard",
    endpoints: { notifications: "/notifications", actions: "/ai-operator/actions", jobs: "/jobs" },
  },
  settings: {
    mode: "more",
    eyebrow: "SYSTEM CONTROL",
    title: "Tune the system.",
    subtitle: "Settings, integrations, reports, payroll and automation controls.",
    action: "Main board",
    actionTo: "/dashboard",
    endpoints: {},
  },
  reports: {
    mode: "more",
    eyebrow: "RECORD CONTROL",
    title: "Read the business.",
    subtitle: "Reports, exports and business performance surfaces.",
    action: "Main board",
    actionTo: "/dashboard",
    endpoints: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" },
  },
  payroll: {
    mode: "more",
    eyebrow: "PAYROLL CONTROL",
    title: "Prepare payroll.",
    subtitle: "Worker summaries, completed work and payroll handoff.",
    action: "Main board",
    actionTo: "/dashboard",
    endpoints: { workers: "/team/workers", jobs: "/jobs" },
  },
  automation: {
    mode: "more",
    eyebrow: "AUTOMATION CONTROL",
    title: "Automate admin.",
    subtitle: "Rules, templates and AI-prepared business actions.",
    action: "Main board",
    actionTo: "/dashboard",
    endpoints: { actions: "/ai-operator/actions" },
  },
  integrations: {
    mode: "more",
    eyebrow: "SYNC CONTROL",
    title: "Sync tools.",
    subtitle: "MYOB, accounting sync, messaging and connected apps.",
    action: "Main board",
    actionTo: "/dashboard",
    endpoints: { invoices: "/invoices" },
  },
};

function makeRecord(type, raw) {
  const id = idOf(raw);
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

  if (type === "client") {
    return {
      key: `client-${id}`,
      title: raw.name || raw.client_name || raw.customer_name || "Client",
      detail: raw.email || raw.phone || raw.address || "Client record",
      tag: raw.email && raw.phone ? "Ready" : "Missing info",
      status,
      value: 0,
      to: `/clients/${id}`,
      raw,
    };
  }

  if (type === "invoice") {
    return {
      key: `invoice-${id}`,
      title: raw.customer_name || raw.client_name || raw.invoice_number || "Invoice",
      detail: raw.description || raw.email || "Invoice record",
      tag: raw.status || "Invoice",
      status,
      value: raw.balance_due || raw.balance || raw.total || raw.amount || 0,
      to: `/invoices/${id}`,
      raw,
    };
  }

  if (type === "quote") {
    return {
      key: `quote-${id}`,
      title: raw.title || raw.customer_name || raw.client_name || "Quote",
      detail: raw.description || "Quote record",
      tag: raw.status || "Quote",
      status,
      value: raw.total || raw.amount || raw.price || 0,
      to: `/quotes/${id}`,
      raw,
    };
  }

  if (type === "worker") {
    return {
      key: `worker-${id}`,
      title: raw.name || raw.full_name || raw.email || "Worker",
      detail: raw.role || raw.email || raw.phone || "Worker record",
      tag: raw.invite_status || raw.status || raw.role || "Worker",
      status,
      value: 0,
      to: "/team",
      raw,
    };
  }

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

function useLiveData(page, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};

    await Promise.all(Object.entries(page.endpoints || {}).map(async ([key, endpoint]) => {
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

  return { data, loading };
}

function buildModel(data) {
  const jobs = asList(data.jobs).map((x) => makeRecord("job", x));
  const clients = asList(data.clients).map((x) => makeRecord("client", x));
  const invoices = asList(data.invoices).map((x) => makeRecord("invoice", x));
  const quotes = asList(data.quotes).map((x) => makeRecord("quote", x));
  const workers = asList(data.workers).map((x) => makeRecord("worker", x));
  const actions = asList(data.actions).map((x) => makeRecord("action", x));
  const notifications = asList(data.notifications).map((x) => makeRecord("notification", x));
  const history = asList(data.history).map((x) => makeRecord("message", x));

  const activeJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const unassigned = jobs.filter((x) => x.tag === "Unassigned");
  const field = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const completed = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const readyToBill = completed.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const paid = invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status));
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const draftQuotes = quotes.filter((x) => ["draft", "pending", ""].includes(x.status));
  const quoteFollow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const acceptedQuotes = quotes.filter((x) => ["accepted", "approved"].includes(x.status));

  return {
    jobs,
    clients,
    invoices,
    quotes,
    workers,
    actions,
    notifications,
    history,
    activeJobs,
    unassigned,
    field,
    completed,
    readyToBill,
    owing,
    overdue,
    paid,
    draftInvoices,
    draftQuotes,
    quoteFollow,
    acceptedQuotes,
  };
}

const totalValue = (items) => items.reduce((sum, item) => sum + Number(item.value || 0), 0);

function Shell({ area, page, children }) {
  const active = area === "team" || area === "clients" ? "people" :
    area === "sms" || area === "notifications" ? "messages" :
    area === "invoices" ? "finance" :
    area === "dispatch" ? "schedule" :
    area === "quotes" ? "jobs" :
    area === "settings" || area === "reports" || area === "payroll" || area === "automation" || area === "integrations" ? "more" :
    area;

  const links = [
    ["dashboard", "Command", "/dashboard"],
    ["jobs", "Jobs", "/jobs"],
    ["schedule", "Schedule", "/dispatch"],
    ["people", "People", "/clients"],
    ["messages", "Messages", "/sms"],
    ["finance", "Finance", "/invoices"],
    ["more", "More", "/settings"],
  ];

  return (
    <main className="concept-c2" data-version="CHURVOX_CONCEPT_C2_OPERATOR_THEATRE_20260524">
      <div className="c2-noise" />

      <header className="c2-topbar">
        <Link className="c2-brand" to="/dashboard">
          <span>C</span>
          <b>CHURVOX</b>
        </Link>

        <div className="c2-status">
          <span>AI Operator</span>
          <strong>Live</strong>
          <i>3</i>
        </div>
      </header>

      <section className="c2-frame">
        <aside className="c2-spine">
          <p>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <span>{page.subtitle}</span>
          <Link to={page.actionTo}>{page.action}</Link>
        </aside>

        <section className="c2-stage">
          {children}
        </section>

        <aside className="c2-ai">
          <p>AI OPERATOR</p>
          <h2>Admin prepared. You approve.</h2>
          <span>Churvox keeps the owner focused on the next best move instead of digging through pages.</span>

          <div>
            <small>Mode</small>
            <strong>{page.mode}</strong>
          </div>

          <div>
            <small>Rule</small>
            <strong>No auto-send. No auto-charge.</strong>
          </div>
        </aside>
      </section>

      <nav className="c2-dock">
        {links.map(([key, label, to]) => (
          <Link key={key} to={to} className={active === key ? "active" : ""}>{label}</Link>
        ))}
      </nav>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="c2-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Item({ item, compact }) {
  const body = (
    <>
      <span>{item.tag}</span>
      <strong>{item.title}</strong>
      <em>{item.value ? `${money(item.value)} · ${item.detail}` : item.detail}</em>
    </>
  );

  return item.to && item.to !== "#"
    ? <Link className={compact ? "c2-item compact" : "c2-item"} to={item.to}>{body}</Link>
    : <button className={compact ? "c2-item compact" : "c2-item"} type="button">{body}</button>;
}

function Empty() {
  return (
    <div className="c2-empty">
      <strong>Clear</strong>
      <span>Nothing sitting here right now.</span>
    </div>
  );
}

function Block({ title, count, children, tone }) {
  return (
    <section className={`c2-block ${tone || ""}`}>
      <header>
        <h3>{title}</h3>
        <b>{count}</b>
      </header>
      {children}
    </section>
  );
}

function CommandView({ model, loading }) {
  const approvalItems = model.actions.length ? model.actions : model.quoteFollow;
  const priority = approvalItems[0] || model.unassigned[0] || model.owing[0];

  return (
    <div className="c2-command">
      <section className="c2-metrics">
        <Metric label="needs approval" value={approvalItems.length} />
        <Metric label="needs fixing" value={model.unassigned.length} />
        <Metric label="jobs moving" value={model.activeJobs.length} />
        <Metric label="money owing" value={money(totalValue(model.owing))} />
      </section>

      <section className="c2-priority">
        <div>
          <p>TOP MOVE</p>
          <h2>{priority?.title || "Nothing urgent"}</h2>
          <span>{priority?.detail || "When Churvox prepares an action, it will sit here first."}</span>
        </div>

        <div className="c2-action-stack">
          <Link to={priority?.to || "/dashboard"}>Open</Link>
          <button type="button">Approve</button>
          <button type="button">Edit first</button>
        </div>

        <small>{loading ? "Loading live business data..." : "Live data connected"}</small>
      </section>

      <section className="c2-command-grid">
        <Block title="Approve" count={approvalItems.length} tone="hot">
          {approvalItems.slice(0, 5).map((item) => <Item key={item.key} item={item} />)}
          {!approvalItems.length && <Empty />}
        </Block>

        <Block title="Fix" count={model.unassigned.length} tone="warn">
          {model.unassigned.slice(0, 5).map((item) => <Item key={item.key} item={item} />)}
          {!model.unassigned.length && <Empty />}
        </Block>

        <Block title="Move" count={model.activeJobs.length}>
          {model.activeJobs.slice(0, 5).map((item) => <Item key={item.key} item={item} />)}
          {!model.activeJobs.length && <Empty />}
        </Block>

        <Block title="Collect" count={model.owing.length} tone="money">
          {model.owing.slice(0, 5).map((item) => <Item key={item.key} item={item} />)}
          {!model.owing.length && <Empty />}
        </Block>
      </section>
    </div>
  );
}

function JobsView({ model }) {
  const lanes = [
    ["Unassigned", model.unassigned],
    ["In field", model.field.length ? model.field : model.activeJobs],
    ["Ready to bill", model.readyToBill],
    ["Complete", model.completed],
  ];

  const selected = model.activeJobs[0] || model.jobs[0];

  return (
    <section className="c2-workroom">
      <div className="c2-lanes">
        {lanes.map(([title, items]) => (
          <Block key={title} title={title} count={items.length}>
            {items.slice(0, 6).map((item) => <Item key={item.key} item={item} compact />)}
            {!items.length && <Empty />}
          </Block>
        ))}
      </div>

      <aside className="c2-record">
        <p>{selected?.tag || "JOB CARD"}</p>
        <h2>{selected?.title || "Select a job"}</h2>
        <span>{selected?.detail || "The selected work card opens here."}</span>

        <div className="c2-checklist">
          <label><input type="checkbox" defaultChecked /> Job details ready</label>
          <label><input type="checkbox" /> Worker confirmed</label>
          <label><input type="checkbox" /> Photos attached</label>
          <label><input type="checkbox" /> Invoice prepared</label>
        </div>

        <Link to={selected?.to || "/jobs"}>Open job</Link>
      </aside>
    </section>
  );
}

function ScheduleView({ model }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <section className="c2-schedule">
      <aside>
        <h3>Crew load</h3>
        {model.workers.slice(0, 7).map((worker) => <Item key={worker.key} item={worker} compact />)}
        {!model.workers.length && <Empty />}
      </aside>

      <div className="c2-week">
        {days.map((day, index) => (
          <section key={day}>
            <h4>{day}</h4>
            {model.activeJobs.slice(index, index + 3).map((job) => (
              <Link className="c2-event" key={job.key} to={job.to}>
                <strong>{job.title}</strong>
                <span>{job.detail}</span>
              </Link>
            ))}
            {!model.activeJobs.slice(index, index + 3).length && <small>No jobs</small>}
          </section>
        ))}
      </div>

      <aside className="c2-health">
        <h3>Schedule health</h3>
        <strong>88%</strong>
        <span>Conflicts, gaps and capacity warnings appear here.</span>
      </aside>
    </section>
  );
}

function PeopleView({ area, model }) {
  const records = area === "team" ? model.workers : model.clients;
  const selected = records[0];

  return (
    <section className="c2-people">
      <aside>
        <h3>{area === "team" ? "Crew" : "Clients"}</h3>
        {records.slice(0, 10).map((item) => <Item key={item.key} item={item} compact />)}
        {!records.length && <Empty />}
      </aside>

      <div className="c2-people-main">
        <Block title="Recent work" count={model.jobs.length}>
          {model.jobs.slice(0, 6).map((item) => <Item key={item.key} item={item} />)}
          {!model.jobs.length && <Empty />}
        </Block>

        <Block title="Follow up" count={model.quoteFollow.length} tone="warn">
          {model.quoteFollow.slice(0, 5).map((item) => <Item key={item.key} item={item} />)}
          {!model.quoteFollow.length && <Empty />}
        </Block>
      </div>

      <aside className="c2-record">
        <p>PROFILE</p>
        <h2>{selected?.title || "No record selected"}</h2>
        <span>{selected?.detail || "People details open here."}</span>
        <Link to={selected?.to || "/clients"}>Open record</Link>
      </aside>
    </section>
  );
}

function FinanceView({ model }) {
  const selected = model.overdue[0] || model.owing[0] || model.invoices[0];

  return (
    <section className="c2-finance">
      <div className="c2-money-strip">
        <Metric label="outstanding" value={money(totalValue(model.owing))} />
        <Metric label="overdue" value={model.overdue.length} />
        <Metric label="ready" value={model.draftInvoices.length} />
        <Metric label="paid" value={model.paid.length} />
      </div>

      <section className="c2-table">
        <header>
          <h3>Invoices</h3>
          <Link to="/invoices/new">New invoice</Link>
        </header>

        <table>
          <tbody>
            {model.invoices.slice(0, 10).map((invoice) => (
              <tr key={invoice.key}>
                <td>{invoice.title}</td>
                <td>{invoice.detail}</td>
                <td>{money(invoice.value)}</td>
                <td><span>{invoice.tag}</span></td>
              </tr>
            ))}
          </tbody>
        </table>

        {!model.invoices.length && <Empty />}
      </section>

      <aside className="c2-record money">
        <p>SELECTED INVOICE</p>
        <h2>{selected?.title || "No invoice"}</h2>
        <strong>{money(selected?.value || 0)}</strong>
        <span>{selected?.detail || "Invoice details appear here."}</span>
        <Link to={selected?.to || "/invoices"}>Open invoice</Link>
      </aside>
    </section>
  );
}

function SalesView({ model }) {
  const lanes = [
    ["Draft", model.draftQuotes],
    ["Follow up", model.quoteFollow],
    ["Accepted", model.acceptedQuotes],
    ["Jobs", model.jobs],
  ];

  return (
    <section className="c2-workroom">
      <div className="c2-lanes">
        {lanes.map(([title, items]) => (
          <Block key={title} title={title} count={items.length}>
            {items.slice(0, 6).map((item) => <Item key={item.key} item={item} compact />)}
            {!items.length && <Empty />}
          </Block>
        ))}
      </div>

      <aside className="c2-record">
        <p>SALES ACTION</p>
        <h2>Turn quotes into work.</h2>
        <span>Draft, send, follow up and convert accepted quotes from this screen.</span>
        <Link to="/quotes/new">New quote</Link>
      </aside>
    </section>
  );
}

function MessagesView({ model }) {
  const messages = [...model.notifications, ...model.history, ...model.owing];
  const selected = messages[0];

  return (
    <section className="c2-messages">
      <aside>
        <h3>Inbox</h3>
        {messages.slice(0, 9).map((item) => <Item key={item.key} item={item} compact />)}
        {!messages.length && <Empty />}
      </aside>

      <section className="c2-thread">
        <h2>{selected?.title || "No message selected"}</h2>
        <div>{selected?.detail || "Customer and internal messages appear here."}</div>
        <footer>
          <input placeholder="Write a reply..." />
          <button type="button">Send</button>
        </footer>
      </section>

      <aside className="c2-draft">
        <p>AI DRAFT</p>
        <h3>Prepared reminder</h3>
        <span>Hi, just a quick reminder about your scheduled work. Please confirm access is available.</span>
        <button type="button">Approve & send</button>
        <button type="button">Save draft</button>
      </aside>
    </section>
  );
}

function MoreView() {
  const tools = [
    ["Automations", "Approval-first business flows", "/automation"],
    ["MYOB", "Invoices and accounting sync", "/integrations"],
    ["Payroll", "Worker summaries and handoff", "/payroll"],
    ["Reports", "Exports and performance", "/reports"],
    ["Settings", "Business setup and permissions", "/settings"],
    ["Alerts", "Notifications and updates", "/notifications"],
  ];

  return (
    <section className="c2-more">
      <div>
        {tools.map(([title, detail, to]) => (
          <Link className="c2-tool" key={title} to={to}>
            <b>{title}</b>
            <span>{detail}</span>
          </Link>
        ))}
      </div>

      <aside>
        <h3>System status</h3>
        <p>Churvox platform</p>
        <strong>Operational</strong>
        <p>AI Operator</p>
        <strong>Operational</strong>
        <p>Integrations</p>
        <strong>Operational</strong>
      </aside>
    </section>
  );
}

export default function ConceptCPage({ area = "dashboard" }) {
  const page = PAGES[area] || PAGES.dashboard;
  const { get } = useApi();
  const { data, loading } = useLiveData(page, get);
  const model = useMemo(() => buildModel(data), [data]);

  return (
    <Shell area={area} page={page}>
      {page.mode === "jobs" ? <JobsView model={model} /> :
       page.mode === "schedule" ? <ScheduleView model={model} /> :
       page.mode === "people" ? <PeopleView area={area} model={model} /> :
       page.mode === "messages" ? <MessagesView model={model} /> :
       page.mode === "finance" ? <FinanceView model={model} /> :
       page.mode === "sales" ? <SalesView model={model} /> :
       page.mode === "more" ? <MoreView model={model} /> :
       <CommandView model={model} loading={loading} />}
    </Shell>
  );
}
