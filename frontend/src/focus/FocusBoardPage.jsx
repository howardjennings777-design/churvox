import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./focusBoard.css";

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const low = (v) => String(v || "").toLowerCase();
const idOf = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const MODES = {
  dashboard: "command",
  jobs: "jobs",
  dispatch: "schedule",
  clients: "people",
  team: "people",
  sms: "messages",
  notifications: "messages",
  invoices: "finance",
  quotes: "sales",
  settings: "more",
  reports: "more",
  payroll: "more",
  automation: "more",
  integrations: "more",
};

const PAGE = {
  dashboard: { eyebrow: "AI-FIRST. APPROVAL-FIRST.", title: "Decision canvas", subtitle: "AI prepares the admin. You approve what happens next.", action: "New job", to: "/jobs/new", endpoints: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications" } },
  jobs: { eyebrow: "FIELD WORK", title: "Jobs", subtitle: "Track, assign and complete work with the full job detail open beside the board.", action: "New job", to: "/jobs/new", endpoints: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices" } },
  dispatch: { eyebrow: "SCHEDULE", title: "Schedule", subtitle: "Plan smarter. Assign with confidence. Keep every crew moving.", action: "Create job", to: "/jobs/new", endpoints: { jobs: "/jobs", workers: "/team/workers" } },
  clients: { eyebrow: "PEOPLE. RELATIONSHIPS. RESULTS.", title: "People", subtitle: "One place for clients, contacts, follow-ups and recent work.", action: "Add client", to: "/clients/new", endpoints: { clients: "/clients", jobs: "/jobs", quotes: "/quotes", workers: "/team/workers" } },
  team: { eyebrow: "CREW", title: "People", subtitle: "Team, workload, skills and assigned work in one clean people view.", action: "Add person", to: "/team", endpoints: { workers: "/team/workers", jobs: "/jobs", clients: "/clients" } },
  invoices: { eyebrow: "FINANCE. CLARITY. CONTROL.", title: "Cashflow clarity", subtitle: "Track invoices, payments, overdue money and ready-to-send drafts.", action: "New invoice", to: "/invoices/new", endpoints: { invoices: "/invoices", jobs: "/jobs", clients: "/clients" } },
  quotes: { eyebrow: "SALES", title: "Quote desk", subtitle: "Draft, send, follow up and convert quotes into scheduled work.", action: "New quote", to: "/quotes/new", endpoints: { quotes: "/quotes", clients: "/clients", jobs: "/jobs" } },
  sms: { eyebrow: "MESSAGES", title: "Messages", subtitle: "Customer reminders, draft replies and approval-first communication.", action: "New message", to: "/sms", endpoints: { history: "/sms/history", invoices: "/invoices", clients: "/clients" } },
  notifications: { eyebrow: "ALERTS", title: "Messages", subtitle: "Unread updates, approvals and important changes in one communication centre.", action: "Main board", to: "/dashboard", endpoints: { notifications: "/notifications", actions: "/ai-operator/actions", jobs: "/jobs" } },
  settings: { eyebrow: "CONTROL CENTER", title: "More", subtitle: "Settings, tools, integrations, reports and admin operations.", action: "Main board", to: "/dashboard", endpoints: {} },
  reports: { eyebrow: "INSIGHTS", title: "More", subtitle: "Reports, exports and business performance tools.", action: "Main board", to: "/dashboard", endpoints: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" } },
  payroll: { eyebrow: "PAYROLL", title: "More", subtitle: "Payroll review, worker summaries and export handoff.", action: "Main board", to: "/dashboard", endpoints: { workers: "/team/workers", jobs: "/jobs" } },
  automation: { eyebrow: "AUTOMATION", title: "More", subtitle: "Rules, templates and AI-prepared admin flows.", action: "Main board", to: "/dashboard", endpoints: { actions: "/ai-operator/actions" } },
  integrations: { eyebrow: "CONNECTED APPS", title: "More", subtitle: "MYOB, accounting sync, messaging and connected business tools.", action: "Main board", to: "/dashboard", endpoints: { invoices: "/invoices" } },
};

function record(type, raw) {
  const id = idOf(raw); const status = low(raw.status);
  if (type === "job") { const worker = raw.assigned_worker_name || raw.worker_name || ""; return { key: `job-${id}`, id, title: raw.title || raw.job_name || raw.client_name || "Job", detail: raw.address || raw.description || raw.client_name || "Job record", tag: !worker && !raw.assigned_worker_id ? "Unassigned" : ["completed", "complete", "done"].includes(status) ? "Complete" : raw.status || "Job", status, value: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0, to: `/jobs/${id}`, raw }; }
  if (type === "client") return { key: `client-${id}`, id, title: raw.name || raw.client_name || raw.customer_name || "Client", detail: raw.email || raw.phone || raw.address || "Client record", tag: raw.email && raw.phone ? "Active" : "Missing info", status, value: 0, to: `/clients/${id}`, raw };
  if (type === "invoice") return { key: `invoice-${id}`, id, title: raw.customer_name || raw.client_name || raw.invoice_number || "Invoice", detail: raw.description || raw.email || "Invoice record", tag: raw.status || "Invoice", status, value: raw.balance_due || raw.balance || raw.total || raw.amount || 0, to: `/invoices/${id}`, raw };
  if (type === "quote") return { key: `quote-${id}`, id, title: raw.title || raw.customer_name || raw.client_name || "Quote", detail: raw.description || "Quote record", tag: raw.status || "Quote", status, value: raw.total || raw.amount || raw.price || 0, to: `/quotes/${id}`, raw };
  if (type === "worker") return { key: `worker-${id}`, id, title: raw.name || raw.full_name || raw.email || "Worker", detail: raw.role || raw.email || raw.phone || "Worker record", tag: raw.invite_status || raw.status || raw.role || "Worker", status, value: 0, to: "/team", raw };
  return { key: `${type}-${id || Math.random()}`, id, title: raw.title || raw.summary || raw.subject || "Item", detail: raw.message || raw.reason || raw.description || raw.body || "Record", tag: raw.status || type, status, value: 0, to: "#", raw };
}

function useBoardData(page, get) {
  const [data, setData] = useState({}); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const next = {}; await Promise.all(Object.entries(page.endpoints || {}).map(async ([key, endpoint]) => { try { const res = await get(endpoint); next[key] = res?.data ?? res?.[key] ?? res ?? []; } catch { next[key] = []; } })); setData(next); setLoading(false); }, [page, get]);
  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

function model(data) {
  const jobs = list(data.jobs).map((x) => record("job", x));
  const clients = list(data.clients).map((x) => record("client", x));
  const invoices = list(data.invoices).map((x) => record("invoice", x));
  const quotes = list(data.quotes).map((x) => record("quote", x));
  const workers = list(data.workers).map((x) => record("worker", x));
  const actions = list(data.actions).map((x) => record("action", x));
  const notes = list(data.notifications).map((x) => record("notification", x));
  const activeJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const unassigned = jobs.filter((x) => x.tag === "Unassigned");
  const field = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const completed = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const readyToBill = completed.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const draftQuotes = quotes.filter((x) => ["draft", "pending", ""].includes(x.status));
  const quoteFollow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  return { jobs, clients, invoices, quotes, workers, actions, notes, activeJobs, unassigned, field, completed, readyToBill, owing, overdue, draftInvoices, draftQuotes, quoteFollow };
}

const metricValue = (items) => items.reduce((sum, item) => sum + Number(item.value || 0), 0);

function AppChrome({ area, children }) {
  const nav = [["dashboard", "Command", "/dashboard"], ["jobs", "Jobs", "/jobs"], ["dispatch", "Schedule", "/dispatch"], ["clients", "People", "/clients"], ["sms", "Messages", "/sms"], ["invoices", "Finance", "/invoices"], ["settings", "More", "/settings"]];
  const active = area === "team" ? "clients" : area === "notifications" ? "sms" : area === "quotes" ? "jobs" : area;
  return <main className="concept-c" data-version="CHURVOX_CONCEPT_C_20260524"><header className="cc-top"><Link className="cc-logo" to="/dashboard"><span>C</span><b>CHURVOX</b></Link><div className="cc-top-right"><span>Churvox Electrical</span><span className="cc-bell">3</span><span className="cc-avatar" /></div></header>{children}<nav className="cc-dock">{nav.map(([key, label, to]) => <Link key={key} to={to} className={active === key ? "active" : ""}><span>{label}</span></Link>)}</nav></main>;
}

function Hero({ page }) { return <section className="cc-hero"><p>{page.eyebrow}</p><h1>{page.title}</h1><span>{page.subtitle}</span></section>; }
function PillStats({ stats }) { return <section className="cc-pill-stats">{stats.map((s) => <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}</section>; }
function MiniCard({ item, compact }) { const body = <><span>{item.tag}</span><strong>{item.title}</strong><em>{item.value ? `${money(item.value)} · ${item.detail}` : item.detail}</em></>; return item.to && item.to !== "#" ? <Link className={compact ? "cc-mini compact" : "cc-mini"} to={item.to}>{body}</Link> : <button className={compact ? "cc-mini compact" : "cc-mini"} type="button">{body}</button>; }
function Panel({ title, count, children, action }) { return <section className="cc-panel"><header><h3>{title} <small>{count}</small></h3>{action ? <Link to={action}>View all</Link> : null}</header>{children}</section>; }
function Empty() { return <div className="cc-empty"><b>Clear</b><span>Nothing sitting here right now.</span></div>; }

function CommandView({ page, m, loading }) {
  const approval = m.actions[0] || m.quoteFollow[0] || m.draftQuotes[0];
  const stats = [{ label: "Needs approval", value: m.actions.length || m.quoteFollow.length }, { label: "Needs fixing", value: m.unassigned.length }, { label: "Today's jobs", value: m.activeJobs.length }, { label: "Money owing", value: money(metricValue(m.owing)) }];
  return <><Hero page={page} /><PillStats stats={stats} /><section className="cc-command-grid"><section className="cc-priority"><p>Top priority</p><h2>{approval?.title || "No urgent approval"}</h2><span>{approval?.detail || "AI Operator will place prepared admin here."}</span><div className="cc-priority-actions"><Link to={approval?.to || "/dashboard"}>Approve</Link><button>Edit</button><button>Skip</button></div><small>{loading ? "Loading live business data" : "AI Operator is watching for updates"}</small></section><Panel title="Needs approval" count={m.actions.length || m.quoteFollow.length} action="/quotes">{(m.actions.length ? m.actions : m.quoteFollow).slice(0, 5).map((item) => <MiniCard key={item.key} item={item} />)}{!(m.actions.length || m.quoteFollow.length) && <Empty />}</Panel><div className="cc-right-stack"><Panel title="Needs fixing" count={m.unassigned.length}>{m.unassigned.slice(0, 3).map((item) => <MiniCard key={item.key} item={item} compact />)}{!m.unassigned.length && <Empty />}</Panel><Panel title="Today’s jobs" count={m.activeJobs.length}>{m.activeJobs.slice(0, 3).map((item) => <MiniCard key={item.key} item={item} compact />)}{!m.activeJobs.length && <Empty />}</Panel><Panel title="Money owing" count={m.owing.length}>{m.owing.slice(0, 3).map((item) => <MiniCard key={item.key} item={item} compact />)}{!m.owing.length && <Empty />}</Panel></div></section></>;
}

function JobsView({ page, m }) {
  const lanes = [["Unassigned", m.unassigned], ["In progress", m.activeJobs], ["Ready to bill", m.readyToBill], ["Completed today", m.completed]];
  const selected = m.activeJobs[0] || m.jobs[0];
  return <><Hero page={page} /><PillStats stats={[{ label: "Unassigned", value: m.unassigned.length }, { label: "In progress", value: m.field.length }, { label: "Ready to bill", value: m.readyToBill.length }, { label: "Money owing", value: money(metricValue(m.owing)) }]} /><section className="cc-job-layout"><div className="cc-kanban">{lanes.map(([title, items]) => <Panel key={title} title={title} count={items.length}>{items.slice(0, 5).map((item) => <MiniCard key={item.key} item={item} />)}{!items.length && <Empty />}</Panel>)}</div><aside className="cc-detail"><button type="button">×</button><p>{selected?.tag || "Job"}</p><h2>{selected?.title || "Select a job"}</h2><span>{selected?.detail || "Open a job to see its full work card."}</span><div className="cc-checks"><b>Checklist</b><label><input type="checkbox" defaultChecked /> Job details ready</label><label><input type="checkbox" /> Photos uploaded</label><label><input type="checkbox" /> Invoice ready</label></div><div className="cc-detail-actions"><Link to={selected?.to || "/jobs"}>Open</Link><Link to="/jobs/new">Create job</Link></div></aside></section></>;
}

function ScheduleView({ page, m }) {
  const days = ["Mon 26", "Tue 27", "Wed 28", "Thu 29", "Fri 30", "Sat 31", "Sun 1"];
  return <><Hero page={page} /><section className="cc-schedule-shell"><aside className="cc-crew-list"><h3>View by crew</h3>{m.workers.slice(0, 5).map((w) => <MiniCard key={w.key} item={w} compact />)}{!m.workers.length && <Empty />}</aside><section className="cc-calendar"><div className="cc-calendar-top"><button>Today</button><strong>May 26 - Jun 1, 2025</strong><Link to="/jobs/new">Create job</Link></div><div className="cc-week">{days.map((day, i) => <div key={day}><b>{day}</b>{m.activeJobs.slice(i, i + 3).map((job) => <Link key={job.key} to={job.to} className="cc-event"><span>{job.title}</span><em>{job.detail}</em></Link>)}{!m.activeJobs.slice(i, i + 3).length && <span className="cc-nojob">No jobs</span>}</div>)}</div></section><aside className="cc-day-card"><h3>Schedule health</h3><div className="cc-score">88%</div><span>Conflicts, travel gaps and next available slots appear here.</span></aside></section></>;
}

function PeopleView({ page, m, area }) {
  const primary = area === "team" ? m.workers : m.clients;
  const secondary = area === "team" ? m.jobs : m.workers;
  const selected = primary[0];
  return <><Hero page={page} /><section className="cc-people-layout"><aside className="cc-people-list"><h3>{area === "team" ? "Team" : "Clients"}</h3>{primary.slice(0, 8).map((item) => <MiniCard key={item.key} item={item} compact />)}{!primary.length && <Empty />}</aside><section className="cc-people-centre"><Panel title={area === "team" ? "Team members" : "Recent jobs"} count={secondary.length}>{secondary.slice(0, 8).map((item) => <MiniCard key={item.key} item={item} />)}{!secondary.length && <Empty />}</Panel><Panel title="Follow-ups" count={m.quoteFollow.length}>{m.quoteFollow.slice(0, 4).map((item) => <MiniCard key={item.key} item={item} compact />)}{!m.quoteFollow.length && <Empty />}</Panel></section><aside className="cc-profile"><h2>{selected?.title || "No person selected"}</h2><span>{selected?.detail || "People details open here."}</span><div className="cc-profile-actions"><Link to={selected?.to || "/clients"}>Open record</Link><button>Message</button><button>Assign job</button></div></aside></section></>;
}

function MessagesView({ page, m }) {
  const messages = [...m.notes, ...list(m.history).map((x) => record("message", x)), ...m.owing];
  const current = messages[0] || m.owing[0];
  return <><Hero page={page} /><section className="cc-message-layout"><aside className="cc-inbox"><h3>Inbox</h3>{messages.slice(0, 7).map((item) => <MiniCard key={item.key} item={item} compact />)}{!messages.length && <Empty />}</aside><section className="cc-thread"><h2>{current?.title || "No message selected"}</h2><div className="cc-bubble">{current?.detail || "Customer and internal messages appear here."}</div><div className="cc-reply"><input placeholder="Type your message..." /><button>Send</button></div></section><aside className="cc-ai-write"><p>AI assistance</p><h3>Prepared reminder</h3><span>Hi, just a quick reminder that your scheduled work is coming up. Please confirm access is available.</span><button>Approve & send</button><button>Save draft</button></aside></section></>;
}

function FinanceView({ page, m }) {
  const selected = m.overdue[0] || m.owing[0] || m.invoices[0];
  const totalOutstanding = metricValue(m.owing);
  return <><Hero page={page} /><PillStats stats={[{ label: "Outstanding", value: money(totalOutstanding) }, { label: "Paid this month", value: money(metricValue(m.invoices.filter((x) => x.status === "paid"))) }, { label: "Overdue invoices", value: m.overdue.length }, { label: "Ready to send", value: m.draftInvoices.length }]} /><section className="cc-finance-layout"><section className="cc-table-card"><header><h3>Invoices</h3><Link to="/invoices/new">New invoice</Link></header><table><tbody>{m.invoices.slice(0, 8).map((inv) => <tr key={inv.key}><td>{inv.title}</td><td>{inv.detail}</td><td>{money(inv.value)}</td><td><span>{inv.tag}</span></td></tr>)}</tbody></table>{!m.invoices.length && <Empty />}</section><aside className="cc-invoice-detail"><p>Invoice detail</p><h2>{selected?.title || "No invoice"}</h2><strong>{money(selected?.value || 0)}</strong><span>{selected?.detail || "Invoice details appear here."}</span><Link to={selected?.to || "/invoices"}>Open invoice</Link><button>Send reminder</button><button>Mark as paid</button></aside></section></>;
}

function SalesView({ page, m }) {
  return <><Hero page={page} /><section className="cc-job-layout"><div className="cc-kanban">{[["Draft", m.draftQuotes], ["Follow up", m.quoteFollow], ["Accepted", m.quotes.filter((x) => ["accepted", "approved"].includes(x.status))], ["Recent jobs", m.jobs]].map(([title, items]) => <Panel key={title} title={title} count={items.length}>{items.slice(0, 5).map((item) => <MiniCard key={item.key} item={item} />)}{!items.length && <Empty />}</Panel>)}</div><aside className="cc-detail"><p>Quote press</p><h2>Sales that need action</h2><span>Review draft quotes, follow up customers and convert accepted quotes into jobs.</span><Link to="/quotes/new">New quote</Link></aside></section></>;
}

function MoreView({ page }) {
  const tools = [["Automations", "Build and manage smart approval flows", "/automation"], ["MYOB Integration", "Sync invoices and accounts", "/integrations"], ["Payroll", "Review and export payroll handoff", "/payroll"], ["Reports", "See performance and exports", "/reports"], ["Settings", "Business preferences and permissions", "/settings"], ["Notifications", "Review alerts and updates", "/notifications"]];
  return <><Hero page={page} /><section className="cc-more-layout"><section className="cc-tool-grid">{tools.map(([title, detail, to]) => <Link key={title} to={to} className="cc-tool"><b>{title}</b><span>{detail}</span></Link>)}</section><aside className="cc-system"><h3>System status</h3><p>Churvox platform</p><strong>Operational</strong><p>AI services</p><strong>Operational</strong><p>Integrations</p><strong>Operational</strong></aside></section></>;
}

export default function FocusBoardPage({ area = "dashboard" }) {
  const page = PAGE[area] || PAGE.dashboard;
  const { get } = useApi();
  const { data, loading } = useBoardData(page, get);
  const m = useMemo(() => model(data), [data]);
  const mode = MODES[area] || "command";
  return <AppChrome area={area}>{mode === "jobs" ? <JobsView page={page} m={m} /> : mode === "schedule" ? <ScheduleView page={page} m={m} /> : mode === "people" ? <PeopleView page={page} m={m} area={area} /> : mode === "messages" ? <MessagesView page={page} m={m} /> : mode === "finance" ? <FinanceView page={page} m={m} /> : mode === "sales" ? <SalesView page={page} m={m} /> : mode === "more" ? <MoreView page={page} m={m} /> : <CommandView page={page} m={m} loading={loading} />}</AppChrome>;
}
