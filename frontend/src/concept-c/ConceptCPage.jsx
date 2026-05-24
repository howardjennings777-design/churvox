import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

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

const low = (v) => String(v || "").toLowerCase();
const idOf = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const PAGE = {
  dashboard: {
    mode: "command",
    eyebrow: "AI OPERATOR COMMAND",
    title: "Decision canvas",
    subtitle: "AI prepares the admin. You approve what moves next.",
    primary: "New job",
    to: "/jobs/new",
    endpoints: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications" },
  },
  jobs: {
    mode: "jobs",
    eyebrow: "FIELD WORK",
    title: "Jobs board",
    subtitle: "Assign, track, complete and bill work without leaving the page.",
    primary: "New job",
    to: "/jobs/new",
    endpoints: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices" },
  },
  dispatch: {
    mode: "schedule",
    eyebrow: "SCHEDULE",
    title: "Schedule board",
    subtitle: "Plan jobs across the week and see where crew capacity is sitting.",
    primary: "Create job",
    to: "/jobs/new",
    endpoints: { jobs: "/jobs", workers: "/team/workers" },
  },
  clients: {
    mode: "people",
    eyebrow: "CUSTOMERS",
    title: "People desk",
    subtitle: "Clients, recent work, missing details and follow-ups.",
    primary: "Add client",
    to: "/clients/new",
    endpoints: { clients: "/clients", jobs: "/jobs", quotes: "/quotes", workers: "/team/workers" },
  },
  team: {
    mode: "people",
    eyebrow: "CREW",
    title: "Crew desk",
    subtitle: "Workers, roles, workload, invites and setup issues.",
    primary: "Open team",
    to: "/team",
    endpoints: { workers: "/team/workers", jobs: "/jobs", clients: "/clients" },
  },
  invoices: {
    mode: "finance",
    eyebrow: "FINANCE",
    title: "Cashflow clarity",
    subtitle: "Drafts, sent invoices, overdue money and paid work.",
    primary: "New invoice",
    to: "/invoices/new",
    endpoints: { invoices: "/invoices", jobs: "/jobs", clients: "/clients" },
  },
  quotes: {
    mode: "sales",
    eyebrow: "SALES",
    title: "Quote press",
    subtitle: "Draft, send, chase and convert quotes into scheduled work.",
    primary: "New quote",
    to: "/quotes/new",
    endpoints: { quotes: "/quotes", clients: "/clients", jobs: "/jobs" },
  },
  sms: {
    mode: "messages",
    eyebrow: "MESSAGES",
    title: "Message studio",
    subtitle: "Customer reminders, replies and approval-first communication.",
    primary: "New message",
    to: "/sms",
    endpoints: { history: "/sms/history", invoices: "/invoices", clients: "/clients" },
  },
  notifications: {
    mode: "messages",
    eyebrow: "ALERTS",
    title: "Message studio",
    subtitle: "Unread updates, approvals and important business changes.",
    primary: "Main board",
    to: "/dashboard",
    endpoints: { notifications: "/notifications", actions: "/ai-operator/actions", jobs: "/jobs" },
  },
  settings: {
    mode: "more",
    eyebrow: "CONTROL",
    title: "Control centre",
    subtitle: "Settings, integrations, reports and admin tools.",
    primary: "Main board",
    to: "/dashboard",
    endpoints: {},
  },
  reports: {
    mode: "more",
    eyebrow: "REPORTS",
    title: "Reports centre",
    subtitle: "Exports, records and business performance.",
    primary: "Main board",
    to: "/dashboard",
    endpoints: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" },
  },
  payroll: {
    mode: "more",
    eyebrow: "PAYROLL",
    title: "Payroll centre",
    subtitle: "Worker summaries, completed work and payroll handoff.",
    primary: "Main board",
    to: "/dashboard",
    endpoints: { workers: "/team/workers", jobs: "/jobs" },
  },
  automation: {
    mode: "more",
    eyebrow: "AUTOMATION",
    title: "Automation centre",
    subtitle: "Rules, templates and AI-prepared admin flows.",
    primary: "Main board",
    to: "/dashboard",
    endpoints: { actions: "/ai-operator/actions" },
  },
  integrations: {
    mode: "more",
    eyebrow: "SYNC",
    title: "Integration centre",
    subtitle: "MYOB, accounting sync, messaging and connected tools.",
    primary: "Main board",
    to: "/dashboard",
    endpoints: { invoices: "/invoices" },
  },
};

function make(type, raw) {
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
    tag: raw.email && raw.phone ? "Active" : "Missing info",
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

function useLiveData(page, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(page.endpoints || {}).map(async ([key, endpoint]) => {
      try {
        const res = await get(endpoint);
        next[key] = res?.data ?? res?.[key] ?? res ?? [];
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

function build(data) {
  const jobs = list(data.jobs).map((x) => make("job", x));
  const clients = list(data.clients).map((x) => make("client", x));
  const invoices = list(data.invoices).map((x) => make("invoice", x));
  const quotes = list(data.quotes).map((x) => make("quote", x));
  const workers = list(data.workers).map((x) => make("worker", x));
  const actions = list(data.actions).map((x) => make("action", x));
  const notes = list(data.notifications).map((x) => make("notification", x));
  const history = list(data.history).map((x) => make("message", x));

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

  return { jobs, clients, invoices, quotes, workers, actions, notes, history, activeJobs, unassigned, field, completed, readyToBill, owing, overdue, paid, draftInvoices, draftQuotes, quoteFollow, acceptedQuotes };
}

const totalValue = (items) => items.reduce((sum, item) => sum + Number(item.value || 0), 0);

function Shell({ area, children }) {
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
    <main className="concept-c" data-version="CHURVOX_EXACT_CONCEPT_C_20260524">
      <header className="cc-top">
        <Link to="/dashboard" className="cc-logo"><span>C</span><b>CHURVOX</b></Link>
        <div className="cc-profile-strip"><span>AI Operator live</span><i>3</i><em /></div>
      </header>

      {children}

      <nav className="cc-dock">
        {links.map(([key, label, to]) => <Link key={key} to={to} className={active === key ? "active" : ""}>{label}</Link>)}
      </nav>
    </main>
  );
}

function Hero({ page }) {
  return (
    <section className="cc-hero">
      <p>{page.eyebrow}</p>
      <h1>{page.title}</h1>
      <span>{page.subtitle}</span>
    </section>
  );
}

function Stats({ items }) {
  return <section className="cc-stats">{items.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}</section>;
}

function Card({ item, compact }) {
  const body = (
    <>
      <span>{item.tag}</span>
      <strong>{item.title}</strong>
      <em>{item.value ? `${money(item.value)} · ${item.detail}` : item.detail}</em>
    </>
  );

  return item.to && item.to !== "#"
    ? <Link className={compact ? "cc-card compact" : "cc-card"} to={item.to}>{body}</Link>
    : <button className={compact ? "cc-card compact" : "cc-card"} type="button">{body}</button>;
}

function Empty() {
  return <div className="cc-empty"><b>Clear</b><span>Nothing sitting here right now.</span></div>;
}

function Panel({ title, count, children }) {
  return (
    <section className="cc-panel">
      <header><h3>{title}</h3><b>{count}</b></header>
      {children}
    </section>
  );
}

function Command({ page, data, loading }) {
  const approval = data.actions[0] || data.quoteFollow[0] || data.draftQuotes[0];
  const approvalList = data.actions.length ? data.actions : data.quoteFollow;

  return (
    <>
      <Hero page={page} />
      <Stats items={[
        { label: "needs approval", value: approvalList.length },
        { label: "needs fixing", value: data.unassigned.length },
        { label: "jobs moving", value: data.activeJobs.length },
        { label: "money owing", value: money(totalValue(data.owing)) },
      ]} />

      <section className="cc-command-grid">
        <section className="cc-priority">
          <p>Top priority</p>
          <h2>{approval?.title || "No urgent approval"}</h2>
          <span>{approval?.detail || "AI Operator will place prepared admin here when there is something to approve."}</span>
          <div>
            <Link to={approval?.to || "/dashboard"}>Approve</Link>
            <button type="button">Edit</button>
            <button type="button">Skip</button>
          </div>
          <small>{loading ? "Loading live data" : "Connected to live business data"}</small>
        </section>

        <Panel title="Ready to approve" count={approvalList.length}>
          {approvalList.slice(0, 5).map((item) => <Card key={item.key} item={item} />)}
          {!approvalList.length && <Empty />}
        </Panel>

        <div className="cc-stack">
          <Panel title="Needs fixing" count={data.unassigned.length}>
            {data.unassigned.slice(0, 3).map((item) => <Card key={item.key} item={item} compact />)}
            {!data.unassigned.length && <Empty />}
          </Panel>
          <Panel title="Today" count={data.activeJobs.length}>
            {data.activeJobs.slice(0, 3).map((item) => <Card key={item.key} item={item} compact />)}
            {!data.activeJobs.length && <Empty />}
          </Panel>
          <Panel title="Owing" count={data.owing.length}>
            {data.owing.slice(0, 3).map((item) => <Card key={item.key} item={item} compact />)}
            {!data.owing.length && <Empty />}
          </Panel>
        </div>
      </section>
    </>
  );
}

function Jobs({ page, data }) {
  const lanes = [
    ["Unassigned", data.unassigned],
    ["In progress", data.activeJobs],
    ["Ready to bill", data.readyToBill],
    ["Completed", data.completed],
  ];
  const selected = data.activeJobs[0] || data.jobs[0];

  return (
    <>
      <Hero page={page} />
      <Stats items={[
        { label: "unassigned", value: data.unassigned.length },
        { label: "field work", value: data.field.length },
        { label: "ready to bill", value: data.readyToBill.length },
        { label: "completed", value: data.completed.length },
      ]} />

      <section className="cc-job-layout">
        <div className="cc-kanban">
          {lanes.map(([title, items]) => (
            <Panel key={title} title={title} count={items.length}>
              {items.slice(0, 5).map((item) => <Card key={item.key} item={item} />)}
              {!items.length && <Empty />}
            </Panel>
          ))}
        </div>

        <aside className="cc-detail">
          <button type="button">×</button>
          <p>{selected?.tag || "Job"}</p>
          <h2>{selected?.title || "Select a job"}</h2>
          <span>{selected?.detail || "Open a job to see the full work card."}</span>
          <div className="cc-checks">
            <b>Job checks</b>
            <label><input type="checkbox" defaultChecked /> Details ready</label>
            <label><input type="checkbox" /> Photos uploaded</label>
            <label><input type="checkbox" /> Invoice ready</label>
          </div>
          <div className="cc-actions">
            <Link to={selected?.to || "/jobs"}>Open job</Link>
            <Link to="/jobs/new">Create job</Link>
          </div>
        </aside>
      </section>
    </>
  );
}

function Schedule({ page, data }) {
  const days = ["Mon 26", "Tue 27", "Wed 28", "Thu 29", "Fri 30", "Sat 31", "Sun 1"];

  return (
    <>
      <Hero page={page} />
      <section className="cc-schedule">
        <aside>
          <h3>View by crew</h3>
          {data.workers.slice(0, 6).map((item) => <Card key={item.key} item={item} compact />)}
          {!data.workers.length && <Empty />}
        </aside>

        <section className="cc-week">
          <header><button type="button">Today</button><strong>Weekly schedule</strong><Link to="/jobs/new">Create job</Link></header>
          <div>
            {days.map((day, index) => (
              <section key={day}>
                <b>{day}</b>
                {data.activeJobs.slice(index, index + 3).map((job) => <Link className="cc-event" key={job.key} to={job.to}><span>{job.title}</span><em>{job.detail}</em></Link>)}
                {!data.activeJobs.slice(index, index + 3).length && <small>No jobs</small>}
              </section>
            ))}
          </div>
        </section>

        <aside>
          <h3>Schedule health</h3>
          <div className="cc-score">88%</div>
          <span>Conflicts, gaps and next available slots show here.</span>
        </aside>
      </section>
    </>
  );
}

function People({ page, data, area }) {
  const main = area === "team" ? data.workers : data.clients;
  const selected = main[0];

  return (
    <>
      <Hero page={page} />
      <section className="cc-people">
        <aside>
          <h3>{area === "team" ? "Team" : "Clients"}</h3>
          {main.slice(0, 9).map((item) => <Card key={item.key} item={item} compact />)}
          {!main.length && <Empty />}
        </aside>

        <section>
          <Panel title={area === "team" ? "Assigned work" : "Recent work"} count={data.jobs.length}>
            {data.jobs.slice(0, 7).map((item) => <Card key={item.key} item={item} />)}
            {!data.jobs.length && <Empty />}
          </Panel>
          <Panel title="Follow-ups" count={data.quoteFollow.length}>
            {data.quoteFollow.slice(0, 4).map((item) => <Card key={item.key} item={item} compact />)}
            {!data.quoteFollow.length && <Empty />}
          </Panel>
        </section>

        <aside className="cc-detail">
          <p>Profile</p>
          <h2>{selected?.title || "No record selected"}</h2>
          <span>{selected?.detail || "People details open here."}</span>
          <div className="cc-actions">
            <Link to={selected?.to || "/clients"}>Open</Link>
            <button type="button">Message</button>
          </div>
        </aside>
      </section>
    </>
  );
}

function Messages({ page, data }) {
  const messages = [...data.notes, ...data.history, ...data.owing];
  const current = messages[0];

  return (
    <>
      <Hero page={page} />
      <section className="cc-messages">
        <aside>
          <h3>Inbox</h3>
          {messages.slice(0, 8).map((item) => <Card key={item.key} item={item} compact />)}
          {!messages.length && <Empty />}
        </aside>

        <section className="cc-thread">
          <h2>{current?.title || "No message selected"}</h2>
          <div>{current?.detail || "Customer and internal messages appear here."}</div>
          <footer><input placeholder="Type your message..." /><button type="button">Send</button></footer>
        </section>

        <aside className="cc-ai-write">
          <p>AI draft</p>
          <h3>Prepared reminder</h3>
          <span>Hi, just a quick reminder about your scheduled work. Please confirm access is available.</span>
          <button type="button">Approve & send</button>
          <button type="button">Save draft</button>
        </aside>
      </section>
    </>
  );
}

function Finance({ page, data }) {
  const selected = data.overdue[0] || data.owing[0] || data.invoices[0];

  return (
    <>
      <Hero page={page} />
      <Stats items={[
        { label: "outstanding", value: money(totalValue(data.owing)) },
        { label: "overdue", value: data.overdue.length },
        { label: "ready", value: data.draftInvoices.length },
        { label: "paid", value: data.paid.length },
      ]} />
      <section className="cc-finance">
        <section>
          <header><h3>Invoices</h3><Link to="/invoices/new">New invoice</Link></header>
          <table><tbody>{data.invoices.slice(0, 9).map((invoice) => <tr key={invoice.key}><td>{invoice.title}</td><td>{invoice.detail}</td><td>{money(invoice.value)}</td><td><span>{invoice.tag}</span></td></tr>)}</tbody></table>
          {!data.invoices.length && <Empty />}
        </section>

        <aside className="cc-detail">
          <p>Invoice detail</p>
          <h2>{selected?.title || "No invoice"}</h2>
          <strong>{money(selected?.value || 0)}</strong>
          <span>{selected?.detail || "Invoice details appear here."}</span>
          <div className="cc-actions">
            <Link to={selected?.to || "/invoices"}>Open</Link>
            <button type="button">Reminder</button>
          </div>
        </aside>
      </section>
    </>
  );
}

function Sales({ page, data }) {
  const lanes = [
    ["Draft", data.draftQuotes],
    ["Follow up", data.quoteFollow],
    ["Accepted", data.acceptedQuotes],
    ["Recent jobs", data.jobs],
  ];

  return (
    <>
      <Hero page={page} />
      <section className="cc-job-layout">
        <div className="cc-kanban">
          {lanes.map(([title, items]) => (
            <Panel key={title} title={title} count={items.length}>
              {items.slice(0, 5).map((item) => <Card key={item.key} item={item} />)}
              {!items.length && <Empty />}
            </Panel>
          ))}
        </div>
        <aside className="cc-detail"><p>Sales</p><h2>Quotes that need action</h2><span>Review drafts, chase customers and convert accepted work.</span><div className="cc-actions"><Link to="/quotes/new">New quote</Link><Link to="/jobs/new">Create job</Link></div></aside>
      </section>
    </>
  );
}

function More({ page }) {
  const tools = [
    ["Automations", "Build and manage approval-first flows", "/automation"],
    ["MYOB", "Sync invoices and accounts", "/integrations"],
    ["Payroll", "Review and export payroll handoff", "/payroll"],
    ["Reports", "See performance and exports", "/reports"],
    ["Settings", "Business preferences and permissions", "/settings"],
    ["Notifications", "Review alerts and updates", "/notifications"],
  ];

  return (
    <>
      <Hero page={page} />
      <section className="cc-more">
        <div>
          {tools.map(([title, detail, to]) => <Link className="cc-tool" key={title} to={to}><b>{title}</b><span>{detail}</span></Link>)}
        </div>
        <aside><h3>System status</h3><p>Churvox platform</p><strong>Operational</strong><p>AI Operator</p><strong>Operational</strong><p>Integrations</p><strong>Operational</strong></aside>
      </section>
    </>
  );
}

export default function ConceptCPage({ area = "dashboard" }) {
  const page = PAGE[area] || PAGE.dashboard;
  const { get } = useApi();
  const { data, loading } = useLiveData(page, get);
  const model = useMemo(() => build(data), [data]);

  return (
    <Shell area={area}>
      {page.mode === "jobs" ? <Jobs page={page} data={model} /> :
       page.mode === "schedule" ? <Schedule page={page} data={model} /> :
       page.mode === "people" ? <People page={page} data={model} area={area} /> :
       page.mode === "messages" ? <Messages page={page} data={model} /> :
       page.mode === "finance" ? <Finance page={page} data={model} /> :
       page.mode === "sales" ? <Sales page={page} data={model} /> :
       page.mode === "more" ? <More page={page} data={model} /> :
       <Command page={page} data={model} loading={loading} />}
    </Shell>
  );
}
