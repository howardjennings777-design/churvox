import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const low = (v) => String(v || "").toLowerCase();
const idOf = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const endpointsByArea = {
  dashboard: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions", notifications: "/notifications" },
  jobs: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices", actions: "/ai-operator/actions" },
  dispatch: { jobs: "/jobs", workers: "/team/workers", actions: "/ai-operator/actions" },
  clients: { clients: "/clients", jobs: "/jobs", quotes: "/quotes", actions: "/ai-operator/actions" },
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

const copyByArea = {
  dashboard: ["Operator overview", "Done, needs doing, owing, ready to bill, crew and issues in one fitted view.", "Best next decision"],
  jobs: ["Jobs workspace", "Open work, completed jobs, unassigned jobs and ready-to-bill jobs.", "Job needing attention"],
  dispatch: ["Dispatch workspace", "Crew capacity, unassigned work and schedule pressure.", "Assignment decision"],
  clients: ["Client workspace", "Customer records, missing details and quote follow-ups.", "Client item to fix"],
  quotes: ["Quote workspace", "Draft quotes, follow-ups and quote-to-job opportunities.", "Quote needing action"],
  invoices: ["Money workspace", "Ready to bill, owing, overdue and draft invoice work.", "Money action"],
  team: ["Crew workspace", "Workers, roles, workload, invites and field coverage.", "Crew item"],
  sms: ["Message workspace", "Customer reminders, history and communication tasks.", "Message action"],
  notifications: ["Alert workspace", "Unread updates and AI-prepared actions.", "Alert to review"],
  reports: ["Reports workspace", "Completed work, invoices, quotes and business records.", "Report item"],
  integrations: ["Sync workspace", "MYOB, invoice sync and accounting readiness.", "Sync item"],
  payroll: ["Payroll workspace", "Worker summaries, hours and payroll handoff.", "Payroll item"],
  automation: ["Automation workspace", "Rules, runs and AI-prepared admin.", "Automation action"],
  settings: ["System workspace", "Business setup, controls and access.", "System item"]
};

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = endpointsByArea[area] || endpointsByArea.dashboard;
  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([key, endpoint]) => {
      try { const res = await get(endpoint); next[key] = res?.data ?? res?.[key] ?? res ?? []; }
      catch { next[key] = []; }
    }));
    setData(next);
    setLoading(false);
  }, [get, endpoints]);
  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

function item(type, raw) {
  const id = idOf(raw); const status = low(raw.status); const base = { id, type, status, raw, value: 0, to: "#" };
  if (type === "job") { const assigned = raw.assigned_worker_id || raw.assigned_worker_name || raw.worker_name; return { ...base, code: raw.job_number || raw.reference || `JOB-${id.slice(-4) || "000"}`, title: raw.title || raw.job_name || raw.client_name || "Job", detail: raw.address || raw.description || raw.client_name || "Job record", tag: !assigned ? "Unassigned" : raw.status || "Job", value: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0, to: id ? `/jobs/${id}` : "/jobs" }; }
  if (type === "client") return { ...base, code: "CLIENT", title: raw.name || raw.client_name || raw.customer_name || "Client", detail: raw.email || raw.phone || raw.address || "Client record", tag: raw.email && raw.phone ? "Ready" : "Missing details", to: id ? `/clients/${id}` : "/clients" };
  if (type === "invoice") return { ...base, code: raw.invoice_number || `INV-${id.slice(-4) || "000"}`, title: raw.customer_name || raw.client_name || "Invoice", detail: raw.description || raw.email || "Invoice record", tag: raw.status || "Invoice", value: raw.balance_due || raw.balance || raw.total || raw.amount || 0, to: id ? `/invoices/${id}` : "/invoices" };
  if (type === "quote") return { ...base, code: raw.quote_number || `QUOTE-${id.slice(-4) || "000"}`, title: raw.title || raw.customer_name || raw.client_name || "Quote", detail: raw.description || "Quote record", tag: raw.status || "Quote", value: raw.total || raw.amount || raw.price || 0, to: id ? `/quotes/${id}` : "/quotes" };
  if (type === "worker") return { ...base, code: "CREW", title: raw.name || raw.full_name || raw.email || "Worker", detail: raw.role || raw.email || raw.phone || "Worker record", tag: raw.invite_status || raw.status || raw.role || "Worker", to: "/team" };
  return { ...base, code: "AI", title: raw.title || raw.summary || raw.subject || "Prepared action", detail: raw.message || raw.reason || raw.description || raw.body || "Churvox prepared this for review.", tag: raw.status || "Action", to: raw.target_url || raw.url || "#" };
}

function build(data) {
  const jobs = arr(data.jobs).map((x) => item("job", x));
  const clients = arr(data.clients).map((x) => item("client", x));
  const invoices = arr(data.invoices).map((x) => item("invoice", x));
  const quotes = arr(data.quotes).map((x) => item("quote", x));
  const workers = arr(data.workers).map((x) => item("worker", x));
  const actions = arr(data.actions).map((x) => item("action", x));
  const notifications = arr(data.notifications).map((x) => item("notification", x));
  const history = arr(data.history).map((x) => item("message", x));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const doneJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const fieldJobs = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const unassigned = jobs.filter((x) => x.tag === "Unassigned");
  const readyToBill = doneJobs.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const draftQuotes = quotes.filter((x) => ["draft", "pending", ""].includes(x.status));
  const quoteFollowups = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const missingClients = clients.filter((x) => x.tag === "Missing details");
  const done = [...doneJobs, ...invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status)), ...quotes.filter((x) => ["accepted", "approved"].includes(x.status))];
  const needsDoing = [...actions, ...unassigned, ...missingClients, ...draftQuotes, ...draftInvoices, ...quoteFollowups];
  const issues = [...overdue, ...unassigned, ...missingClients];
  return { jobs, clients, invoices, quotes, workers, actions, notifications, history, openJobs, doneJobs, fieldJobs, unassigned, readyToBill, owing, overdue, draftInvoices, draftQuotes, quoteFollowups, missingClients, done, needsDoing, issues };
}

const sum = (items) => items.reduce((n, x) => n + Number(x.value || 0), 0);
function areaItems(area, m) { if (area === "jobs") return [...m.openJobs, ...m.doneJobs]; if (area === "dispatch") return [...m.unassigned, ...m.fieldJobs, ...m.openJobs]; if (area === "clients") return [...m.missingClients, ...m.clients]; if (area === "quotes") return [...m.quoteFollowups, ...m.draftQuotes, ...m.quotes]; if (area === "invoices") return [...m.readyToBill, ...m.overdue, ...m.owing, ...m.invoices]; if (area === "team") return [...m.workers, ...m.unassigned]; if (area === "sms") return [...m.history, ...m.owing, ...m.clients]; if (area === "notifications") return [...m.notifications, ...m.actions, ...m.issues]; if (area === "reports") return [...m.doneJobs, ...m.invoices, ...m.quotes]; if (area === "integrations") return [...m.owing, ...m.invoices]; if (area === "payroll") return [...m.workers, ...m.doneJobs, ...m.fieldJobs]; if (area === "automation") return [...m.actions, ...m.needsDoing, ...m.openJobs]; if (area === "settings") return [...m.issues, ...m.actions]; return [...m.needsDoing, ...m.readyToBill, ...m.owing, ...m.fieldJobs]; }

function Tile({ label, value, note, tone, to }) { const body = <><span>{label}</span><strong>{value}</strong><small>{note}</small></>; return to ? <Link to={to} className={`op-tile ${tone || ""}`}>{body}</Link> : <article className={`op-tile ${tone || ""}`}>{body}</article>; }
function Row({ item }) { if (!item) return null; const body = <><div><small>{item.code}</small><strong>{item.title}</strong><span>{item.detail}</span></div><em>{item.tag}</em></>; return item.to && item.to !== "#" ? <Link to={item.to} className="op-row">{body}</Link> : <div className="op-row">{body}</div>; }
function Panel({ title, items, to, empty }) { const count = items?.length || 0; return <section className="op-panel"><header><div><strong>{title}</strong><span>{count} item{count === 1 ? "" : "s"}</span></div>{to && <Link to={to}>Open</Link>}</header><div className="op-list">{count ? items.slice(0, 5).map((x, i) => <Row key={`${x.code}-${i}`} item={x} />) : <p className="op-empty">{empty || "Nothing here right now."}</p>}</div></section>; }
function Decision({ item, label }) { return <section className="op-decision"><div className="op-decision-label"><span>{label}</span><em>{item?.tag || "Clear"}</em></div><h2>{item?.title || "Nothing urgent waiting"}</h2><p>{item?.detail || "When Churvox finds work that needs approval, fixing, billing, or follow-up, it appears here first."}</p><div className="op-decision-actions"><Link to={item?.to && item.to !== "#" ? item.to : "/dashboard"}>Review</Link><Link to="/ai-operator/approvals">Approval queue</Link></div></section>; }
function Dock({ active }) { const links = [["dashboard", "Desk", "/dashboard"], ["dispatch", "Dispatch", "/dispatch"], ["jobs", "Jobs", "/jobs"], ["clients", "Clients", "/clients"], ["invoices", "Money", "/invoices"], ["team", "Crew", "/team"], ["settings", "More", "/settings"]]; return <nav className="op-dock">{links.map(([key, label, to]) => <Link key={key} className={active === key || (active === "quotes" && key === "jobs") ? "active" : ""} to={to}>{label}</Link>)}</nav>; }

export default function ConceptCPage({ area = "dashboard" }) {
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const m = useMemo(() => build(data), [data]);
  const [title, subtitle, primaryLabel] = copyByArea[area] || copyByArea.dashboard;
  const pageItems = areaItems(area, m);
  const primary = pageItems[0] || m.needsDoing[0] || m.readyToBill[0] || m.owing[0] || m.openJobs[0];
  return <main className="operator-app" data-version="CHURVOX_OPERATOR_APP_ALL_PAGES_PUSHED_20260524">
    <header className="op-topbar"><Link to="/dashboard" className="op-brand"><span>CH</span><div><strong>Churvox</strong><small>Operator System</small></div></Link><nav className="op-nav"><Link to="/dashboard">Desk</Link><Link to="/jobs">Jobs</Link><Link to="/dispatch">Dispatch</Link><Link to="/invoices">Money</Link><Link to="/team">Crew</Link></nav><div className="op-mode"><span>{loading ? "Syncing" : "Live"}</span><strong>{title}</strong></div></header>
    <section className="op-stage"><div className="op-title"><p>Business operator</p><h1>{title}</h1><span>{subtitle}</span></div><div className="op-status-grid"><Tile label="Done" value={m.done.length} note="completed / paid / accepted" tone="done" to="/reports"/><Tile label="Needs doing" value={m.needsDoing.length} note="actions, drafts, missing info" tone="todo" to="/dashboard"/><Tile label="Owing" value={money(sum(m.owing))} note={`${m.owing.length} open invoices`} tone="owing" to="/invoices"/><Tile label="Ready to bill" value={money(sum(m.readyToBill))} note={`${m.readyToBill.length} completed jobs`} tone="bill" to="/invoices"/><Tile label="Crew" value={m.workers.length} note={`${m.fieldJobs.length} active in field`} tone="crew" to="/team"/><Tile label="Issues" value={m.issues.length} note="overdue, missing, unassigned" tone="issue" to="/notifications"/></div></section>
    <section className="op-layout"><div className="op-main"><Decision item={primary} label={primaryLabel}/><div className="op-page-strip"><Panel title="Done" items={m.done} to="/reports" empty="No completed records loaded yet."/><Panel title="Needs doing" items={m.needsDoing} to="/dashboard" empty="No admin tasks waiting."/></div></div><aside className="op-side"><Panel title="Owing" items={m.owing} to="/invoices" empty="No owing invoices loaded."/><Panel title="Ready to bill" items={m.readyToBill} to="/invoices" empty="No completed jobs waiting to bill."/></aside></section>
    <section className="op-wide-grid"><Panel title="This page" items={pageItems} to={area === "dashboard" ? "/dashboard" : `/${area}`} empty="No records loaded for this area yet."/><Panel title="Crew and field" items={[...m.workers, ...m.fieldJobs]} to="/team" empty="No crew or field records loaded."/><Panel title="Issues" items={m.issues} to="/notifications" empty="No issues detected right now."/></section>
    <Dock active={area}/>{loading && <div className="op-loading">Loading live Churvox data…</div>}
  </main>;
}
