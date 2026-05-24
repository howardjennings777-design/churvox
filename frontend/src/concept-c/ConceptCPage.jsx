import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : [];
const low = (v) => String(v || "").toLowerCase();
const rid = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const ENDPOINTS = {
  dashboard: { jobs: "/jobs", clients: "/clients", invoices: "/invoices", quotes: "/quotes", workers: "/team/workers", actions: "/ai-operator/actions" },
  jobs: { jobs: "/jobs", workers: "/team/workers", invoices: "/invoices" },
  dispatch: { jobs: "/jobs", workers: "/team/workers" },
  clients: { clients: "/clients", jobs: "/jobs", quotes: "/quotes" },
  quotes: { quotes: "/quotes", clients: "/clients", jobs: "/jobs" },
  invoices: { invoices: "/invoices", jobs: "/jobs", clients: "/clients" },
  team: { workers: "/team/workers", jobs: "/jobs" },
  sms: { history: "/sms/history", invoices: "/invoices", clients: "/clients" },
  notifications: { actions: "/ai-operator/actions", jobs: "/jobs" },
  reports: { jobs: "/jobs", invoices: "/invoices", quotes: "/quotes" },
  integrations: { invoices: "/invoices" },
  payroll: { workers: "/team/workers", jobs: "/jobs" },
  automation: { actions: "/ai-operator/actions" },
  settings: {},
};

const AREA = {
  dashboard: ["AI Operator Desk", "The day is prepared. You approve what moves next."],
  jobs: ["Job Desk", "Field work, proof and completion in one clean flow."],
  dispatch: ["Dispatch Desk", "Crew workload, job timing and assignment decisions."],
  clients: ["Client Desk", "Customer records, missing details and follow-ups."],
  quotes: ["Quote Desk", "Draft, send, chase and convert work."],
  invoices: ["Money Desk", "Drafts, owing money and ready-to-bill work."],
  team: ["Crew Desk", "Workers, roles, workload and invitations."],
  sms: ["Message Desk", "Customer communication and reminders."],
  notifications: ["Alert Desk", "Important updates and prepared actions."],
  reports: ["Report Desk", "Business records and exports."],
  integrations: ["Sync Desk", "MYOB and connected tools."],
  settings: ["System Desk", "Business setup and controls."],
  payroll: ["Payroll Desk", "Worker summaries and payroll handoff."],
  automation: ["Automation Desk", "Rules, runs and AI-prepared admin."],
};

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = ENDPOINTS[area] || ENDPOINTS.dashboard;
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

function makeItem(type, raw) {
  const id = rid(raw);
  const status = low(raw.status);
  const base = { id, status, raw, to: "#", value: 0 };
  if (type === "job") return { ...base, type, code: raw.job_number || raw.reference || `JOB-${id.slice(-4) || "000"}`, title: raw.title || raw.job_name || raw.client_name || "Job", detail: raw.address || raw.description || raw.client_name || "Job record", tag: raw.status || (!raw.assigned_worker_id ? "Unassigned" : "Job"), value: raw.price || raw.job_price || raw.fixed_price || raw.total || 0, to: `/jobs/${id}` };
  if (type === "invoice") return { ...base, type, code: raw.invoice_number || `INV-${id.slice(-4) || "000"}`, title: raw.customer_name || raw.client_name || "Invoice", detail: raw.description || raw.email || "Invoice record", tag: raw.status || "Invoice", value: raw.balance_due || raw.balance || raw.total || raw.amount || 0, to: `/invoices/${id}` };
  if (type === "quote") return { ...base, type, code: raw.quote_number || `QUOTE-${id.slice(-4) || "000"}`, title: raw.title || raw.customer_name || raw.client_name || "Quote", detail: raw.description || "Quote record", tag: raw.status || "Quote", value: raw.total || raw.amount || raw.price || 0, to: `/quotes/${id}` };
  if (type === "client") return { ...base, type, code: "CLIENT", title: raw.name || raw.client_name || raw.customer_name || "Client", detail: raw.email || raw.phone || raw.address || "Client record", tag: raw.email && raw.phone ? "Ready" : "Missing", to: `/clients/${id}` };
  if (type === "worker") return { ...base, type, code: "CREW", title: raw.name || raw.full_name || raw.email || "Worker", detail: raw.role || raw.email || raw.phone || "Worker record", tag: raw.invite_status || raw.status || raw.role || "Worker", to: "/team" };
  return { ...base, type, code: "AI", title: raw.title || raw.summary || raw.subject || "Prepared action", detail: raw.message || raw.reason || raw.description || "Churvox prepared this for review.", tag: raw.status || "Action" };
}

function model(data) {
  const jobs = arr(data.jobs).map((x) => makeItem("job", x));
  const clients = arr(data.clients).map((x) => makeItem("client", x));
  const invoices = arr(data.invoices).map((x) => makeItem("invoice", x));
  const quotes = arr(data.quotes).map((x) => makeItem("quote", x));
  const workers = arr(data.workers).map((x) => makeItem("worker", x));
  const actions = arr(data.actions).map((x) => makeItem("action", x));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const completeJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const readyBill = completeJobs.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const unassigned = jobs.filter((x) => low(x.tag) === "unassigned" || (!x.raw.assigned_worker_id && !x.raw.assigned_worker_name));
  const follow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  return { jobs, clients, invoices, quotes, workers, actions, openJobs, completeJobs, readyBill, owing, unassigned, follow };
}

function total(items) { return items.reduce((n, x) => n + Number(x.value || 0), 0); }

function Row({ item, action = "Open" }) {
  const body = <><div><small>{item.code}</small><strong>{item.title}</strong><span>{item.detail}</span></div><em>{item.tag}</em></>;
  return item.to && item.to !== "#" ? <Link className="cx-row" to={item.to}>{body}</Link> : <div className="cx-row">{body}</div>;
}

function Metric({ label, value, note }) {
  return <article className="cx-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function BottomDock({ active }) {
  const links = [["dashboard", "Desk", "/dashboard"], ["dispatch", "Dispatch", "/dispatch"], ["jobs", "Jobs", "/jobs"], ["clients", "Clients", "/clients"], ["invoices", "Money", "/invoices"], ["team", "Crew", "/team"], ["settings", "More", "/settings"]];
  return <nav className="cx-dock">{links.map(([key, label, to]) => <Link key={key} className={active === key || (active === "quotes" && key === "jobs") ? "active" : ""} to={to}>{label}</Link>)}</nav>;
}

export default function ConceptCPage({ area = "dashboard" }) {
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const m = useMemo(() => model(data), [data]);
  const [title, subtitle] = AREA[area] || AREA.dashboard;
  const approval = m.actions[0] || m.readyBill[0] || m.follow[0] || m.unassigned[0] || m.openJobs[0];
  const queue = [...m.actions, ...m.readyBill, ...m.follow, ...m.unassigned, ...m.openJobs].slice(0, 7);
  const crew = (m.workers.length ? m.workers : m.openJobs).slice(0, 5);
  const moneyItems = (m.owing.length ? m.owing : m.invoices).slice(0, 5);

  return <main className="concept-shot cx-executive" data-version="CHURVOX_APP_DASHBOARD_EXECUTIVE_20260524">
    <header className="cx-topbar">
      <Link className="cx-brand" to="/dashboard"><span>CH</span><div><strong>Churvox</strong><small>AI Operator Desk</small></div></Link>
      <nav className="cx-nav"><Link to="/dashboard">Desk</Link><Link to="/dispatch">Dispatch</Link><Link to="/jobs">Jobs</Link><Link to="/invoices">Money</Link><Link to="/team">Crew</Link></nav>
      <div className="cx-user"><span>Today</span><strong>Operator mode</strong></div>
    </header>

    <section className="cx-hero">
      <div className="cx-hero-copy"><p>Owner approval system</p><h1>{title}</h1><span>{subtitle}</span></div>
      <div className="cx-metrics"><Metric label="Open jobs" value={m.openJobs.length || 0} note="Active work"/><Metric label="Ready to bill" value={money(total(m.readyBill))} note={`${m.readyBill.length} jobs`}/><Metric label="Money owing" value={money(total(m.owing))} note={`${m.owing.length} invoices`}/><Metric label="Crew" value={m.workers.length || 0} note="People loaded"/></div>
    </section>

    <section className="cx-decision">
      <article className="cx-primary-card"><div className="cx-card-label"><span>Prepared by Churvox</span><em>{approval?.tag || "Ready"}</em></div><h2>{approval?.title || "No urgent approval waiting"}</h2><p>{approval?.detail || "When jobs, invoices or follow-ups need a decision, they will appear here."}</p><div className="cx-primary-actions"><Link to={approval?.to || "/jobs"}>Review work</Link><Link to="/ai-operator/approvals">Open approvals</Link></div></article>
      <aside className="cx-operator-note"><span>AI reasoning</span><p>Churvox sorts the day into decisions, field movement and money follow-up so the owner is not digging through screens.</p></aside>
    </section>

    <section className="cx-grid">
      <div className="cx-panel cx-wide"><header><span>Approval queue</span><Link to="/ai-operator/approvals">View all</Link></header>{queue.length ? queue.map((x, i) => <Row key={x.code + i} item={x}/>) : <p className="cx-empty">No approval items loaded yet.</p>}</div>
      <div className="cx-panel"><header><span>Field and crew</span><Link to="/team">Crew</Link></header>{crew.length ? crew.map((x, i) => <Row key={x.code + i} item={x}/>) : <p className="cx-empty">No crew records loaded yet.</p>}</div>
      <div className="cx-panel"><header><span>Money desk</span><Link to="/invoices">Invoices</Link></header>{moneyItems.length ? moneyItems.map((x, i) => <Row key={x.code + i} item={x}/>) : <p className="cx-empty">No invoice records loaded yet.</p>}</div>
    </section>

    <BottomDock active={area}/>
    {loading && <div className="cx-loading">Loading live Churvox data…</div>}
  </main>;
}
