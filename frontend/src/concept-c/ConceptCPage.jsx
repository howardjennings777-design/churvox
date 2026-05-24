import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

const asList = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const text = (v) => String(v || "");
const low = (v) => text(v).toLowerCase();
const keyOf = (v) => text(v?.id || v?._id || v?.uuid || "");
const nzMoney = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

const API = {
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
  settings: { actions: "/ai-operator/actions" },
};

const PAGES = {
  dashboard: { title: "Today", subtitle: "The business view: what is done, what needs action, what is owing, and what can be billed.", tabs: ["needs", "bill", "owing", "crew", "issues"], primary: "needs" },
  jobs: { title: "Jobs", subtitle: "Unassigned, active, finished and billable work without leaving the workspace.", tabs: ["unassigned", "active", "done", "bill", "issues"], primary: "unassigned" },
  dispatch: { title: "Dispatch", subtitle: "Crew capacity and field pressure laid out for quick assignment decisions.", tabs: ["unassigned", "crew", "active", "issues"], primary: "unassigned" },
  clients: { title: "Clients", subtitle: "Missing details, active records, money risk and recent work in one place.", tabs: ["issues", "clients", "owing", "needs"], primary: "issues" },
  quotes: { title: "Quotes", subtitle: "Drafts, follow-ups, accepted work and quote movement.", tabs: ["needs", "drafts", "done", "issues"], primary: "needs" },
  invoices: { title: "Money", subtitle: "Owing, overdue, draft invoices and jobs ready to bill.", tabs: ["owing", "bill", "drafts", "done", "issues"], primary: "owing" },
  team: { title: "Crew", subtitle: "People, workload, field work and blocked jobs.", tabs: ["crew", "active", "unassigned", "issues"], primary: "crew" },
  sms: { title: "Messages", subtitle: "Customer reminders and communication work kept beside the job and invoice context.", tabs: ["messages", "owing", "clients", "needs"], primary: "messages" },
  notifications: { title: "Alerts", subtitle: "Unread updates and prepared actions, filtered to what matters.", tabs: ["alerts", "needs", "issues"], primary: "alerts" },
  reports: { title: "Reports", subtitle: "Completed work, invoices, quotes and export-ready records.", tabs: ["done", "invoices", "quotes", "clients"], primary: "done" },
  integrations: { title: "Sync", subtitle: "Accounting readiness, invoice sync and connection work.", tabs: ["invoices", "owing", "needs", "issues"], primary: "invoices" },
  payroll: { title: "Payroll", subtitle: "Crew summaries, finished work and payroll handoff context.", tabs: ["crew", "done", "active", "issues"], primary: "crew" },
  automation: { title: "Automation", subtitle: "Prepared admin, rules, approvals and failed or waiting actions.", tabs: ["needs", "active", "bill", "issues"], primary: "needs" },
  settings: { title: "Settings", subtitle: "System controls, missing setup and action items.", tabs: ["issues", "needs"], primary: "issues" },
};

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = API[area] || API.dashboard;
  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([name, url]) => {
      try { const res = await get(url); next[name] = res?.data ?? res?.[name] ?? res ?? []; }
      catch { next[name] = []; }
    }));
    setData(next);
    setLoading(false);
  }, [get, endpoints]);
  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

function makeItem(kind, raw) {
  const id = keyOf(raw);
  const status = low(raw.status);
  const base = { id, kind, raw, status, amount: 0, href: "#" };
  if (kind === "job") { const assigned = raw.assigned_worker_id || raw.assigned_worker_name || raw.worker_name; return { ...base, code: raw.job_number || raw.reference || `JOB-${id.slice(-4) || "000"}`, title: raw.title || raw.job_name || raw.client_name || "Job", meta: raw.address || raw.description || raw.client_name || "Job record", state: !assigned ? "Unassigned" : raw.status || "Job", amount: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0, href: id ? `/jobs/${id}` : "/jobs" }; }
  if (kind === "invoice") return { ...base, code: raw.invoice_number || `INV-${id.slice(-4) || "000"}`, title: raw.customer_name || raw.client_name || "Invoice", meta: raw.description || raw.email || "Invoice record", state: raw.status || "Invoice", amount: raw.balance_due || raw.balance || raw.total || raw.amount || 0, href: id ? `/invoices/${id}` : "/invoices" };
  if (kind === "quote") return { ...base, code: raw.quote_number || `QTE-${id.slice(-4) || "000"}`, title: raw.title || raw.customer_name || raw.client_name || "Quote", meta: raw.description || "Quote record", state: raw.status || "Quote", amount: raw.total || raw.amount || raw.price || 0, href: id ? `/quotes/${id}` : "/quotes" };
  if (kind === "client") return { ...base, code: "CLIENT", title: raw.name || raw.client_name || raw.customer_name || "Client", meta: raw.email || raw.phone || raw.address || "Client record", state: raw.email && raw.phone ? "Ready" : "Missing details", href: id ? `/clients/${id}` : "/clients" };
  if (kind === "worker") return { ...base, code: "CREW", title: raw.name || raw.full_name || raw.email || "Worker", meta: raw.role || raw.email || raw.phone || "Worker record", state: raw.invite_status || raw.status || raw.role || "Worker", href: "/team" };
  return { ...base, code: kind === "alert" ? "ALERT" : "AI", title: raw.title || raw.summary || raw.subject || "Prepared action", meta: raw.message || raw.reason || raw.description || raw.body || "Prepared for review.", state: raw.status || "Action", href: raw.target_url || raw.url || "#" };
}

function build(data) {
  const jobs = asList(data.jobs).map((x) => makeItem("job", x));
  const invoices = asList(data.invoices).map((x) => makeItem("invoice", x));
  const quotes = asList(data.quotes).map((x) => makeItem("quote", x));
  const clients = asList(data.clients).map((x) => makeItem("client", x));
  const crew = asList(data.workers).map((x) => makeItem("worker", x));
  const needs = asList(data.actions).map((x) => makeItem("action", x));
  const alerts = asList(data.notifications).map((x) => makeItem("alert", x));
  const messages = asList(data.history).map((x) => makeItem("message", x));
  const doneJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const active = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const unassigned = jobs.filter((x) => x.state === "Unassigned");
  const bill = doneJobs.filter((x) => !(x.raw.invoice_id || x.raw.draft_invoice_id || x.raw.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const drafts = [...invoices.filter((x) => ["draft", "pending", ""].includes(x.status)), ...quotes.filter((x) => ["draft", "pending", ""].includes(x.status))];
  const follow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const accepted = quotes.filter((x) => ["accepted", "approved"].includes(x.status));
  const missing = clients.filter((x) => x.state === "Missing details");
  const done = [...doneJobs, ...invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status)), ...accepted];
  const issues = [...overdue, ...unassigned, ...missing];
  const todo = [...needs, ...unassigned, ...missing, ...drafts, ...follow];
  return { jobs, invoices, quotes, clients, crew, needs, alerts, messages, doneJobs, openJobs, active, unassigned, bill, owing, overdue, drafts, follow, accepted, missing, done, issues, todo };
}

function getGroup(key, m) { return ({ needs: m.todo, bill: m.bill, owing: m.owing, crew: m.crew, issues: m.issues, unassigned: m.unassigned, active: m.active.length ? m.active : m.openJobs, done: m.done, drafts: m.drafts, clients: m.clients, invoices: m.invoices, quotes: m.quotes, alerts: m.alerts, messages: m.messages, open: m.openJobs })[key] || []; }
const total = (items) => items.reduce((sum, x) => sum + Number(x.amount || 0), 0);
const formatValue = (key, m) => key === "owing" ? nzMoney(total(m.owing)) : key === "bill" ? nzMoney(total(m.bill)) : getGroup(key, m).length;

function QuickAction({ to, children }) { return <Link className="os-action" to={to}>{children}</Link>; }
function Row({ item, selected, onSelect }) { return <button type="button" className={`os-row ${selected ? "selected" : ""}`} onClick={() => onSelect(item)}><span>{item.code}</span><b>{item.title}</b><small>{item.meta}</small><em>{item.state}</em></button>; }
function Board({ items, selected, onSelect }) { return <div className="os-board" role="list">{items.length ? items.slice(0, 14).map((item, index) => <Row key={`${item.kind}-${item.code}-${index}`} item={item} selected={selected === item} onSelect={onSelect} />) : <div className="os-clear"><b>Clear right now.</b><span>When work appears in this category, it will show here.</span></div>}</div>; }

export default function ConceptCPage({ area = "dashboard" }) {
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const model = useMemo(() => build(data), [data]);
  const config = PAGES[area] || PAGES.dashboard;
  const [active, setActive] = useState(config.primary);
  const list = useMemo(() => getGroup(active, model), [active, model]);
  const [selected, setSelected] = useState(null);
  useEffect(() => { setActive(config.primary); }, [area, config.primary]);
  useEffect(() => { setSelected((current) => current && list.includes(current) ? current : list[0] || model.todo[0] || model.bill[0] || model.owing[0] || null); }, [list, model.todo, model.bill, model.owing]);
  const pulse = ["done", "needs", "owing", "bill", "crew", "issues"];
  return <main className="os-app" data-version="CHURVOX_TRUE_FULLSCREEN_WORKBOARD_20260524"><div className="os-ambient" />
    <header className="os-top"><Link to="/dashboard" className="os-logo"><span>Churvox</span><b>{config.title}</b></Link><nav><Link to="/dashboard">Desk</Link><Link to="/jobs">Jobs</Link><Link to="/dispatch">Dispatch</Link><Link to="/invoices">Money</Link><Link to="/team">Crew</Link></nav><div className="os-top-right"><span>{loading ? "Syncing" : "Live"}</span><b>{new Date().toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })}</b></div></header>
    <section className="os-pulse">{pulse.map((key) => <button key={key} type="button" onClick={() => setActive(key)} className={active === key ? "active" : ""}><span>{key === "bill" ? "Ready to bill" : key}</span><b>{formatValue(key, model)}</b></button>)}</section>
    <section className="os-shell"><aside className="os-page-tabs"><p>{config.title}</p>{config.tabs.map((key) => <button key={key} type="button" onClick={() => setActive(key)} className={active === key ? "active" : ""}><span>{key}</span><b>{formatValue(key, model)}</b></button>)}</aside><section className="os-work"><div className="os-work-head"><div><p>Workboard</p><h1>{config.title}</h1><span>{config.subtitle}</span></div><div className="os-actions"><QuickAction to="/jobs/new">Add job</QuickAction><QuickAction to="/clients/new">Add client</QuickAction><QuickAction to="/invoices/new">New invoice</QuickAction></div></div><Board items={list} selected={selected} onSelect={setSelected} /></section><aside className="os-detail"><p>In-page detail</p><h2>{selected?.title || "Nothing selected"}</h2><span>{selected?.meta || "Pick a row to inspect it here without leaving the page."}</span><dl><div><dt>Status</dt><dd>{selected?.state || "Clear"}</dd></div><div><dt>Owing</dt><dd>{nzMoney(total(model.owing))}</dd></div><div><dt>Ready to bill</dt><dd>{nzMoney(total(model.bill))}</dd></div><div><dt>Issues</dt><dd>{model.issues.length}</dd></div></dl><div className="os-detail-actions">{selected?.href && selected.href !== "#" && <Link to={selected.href}>Open full record</Link>}<Link to="/ai-operator/approvals">Approvals</Link></div></aside></section>
  </main>;
}
