import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./conceptC.css";

const list = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const low = (v) => String(v || "").toLowerCase();
const idOf = (v) => String(v?.id || v?._id || v?.uuid || "");
const money = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

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
  dashboard: { title: "Today", sub: "Run the day from one floor: actions, money and field movement.", zones: ["needs", "money", "field"] },
  jobs: { title: "Jobs", sub: "Assign, monitor, complete and bill work without jumping pages.", zones: ["unassigned", "active", "bill"] },
  dispatch: { title: "Dispatch", sub: "See who is free, what is unassigned and what is blocked.", zones: ["unassigned", "crew", "active"] },
  clients: { title: "Clients", sub: "Missing details, active records and money risk in one flow.", zones: ["issues", "clients", "owing"] },
  quotes: { title: "Quotes", sub: "Follow up quotes, review drafts and see accepted work.", zones: ["follow", "drafts", "done"] },
  invoices: { title: "Money", sub: "Owing, ready to bill and draft invoice work.", zones: ["owing", "bill", "drafts"] },
  team: { title: "Crew", sub: "People, active work and assignment gaps.", zones: ["crew", "active", "unassigned"] },
  sms: { title: "Messages", sub: "Customer communication beside invoice and client context.", zones: ["messages", "owing", "clients"] },
  notifications: { title: "Alerts", sub: "Alerts, prepared actions and issues that need attention.", zones: ["alerts", "needs", "issues"] },
  reports: { title: "Reports", sub: "Completed work, invoice records and quote records.", zones: ["done", "invoices", "quotes"] },
  integrations: { title: "Sync", sub: "Accounting and integration readiness.", zones: ["invoices", "owing", "needs"] },
  payroll: { title: "Payroll", sub: "Crew, completed work and active job context for payroll review.", zones: ["crew", "done", "active"] },
  automation: { title: "Automation", sub: "Prepared actions, work triggers and items needing approval.", zones: ["needs", "active", "issues"] },
  settings: { title: "Settings", sub: "Setup gaps, actions and system items.", zones: ["issues", "needs", "alerts"] },
};

const ZONE_LABELS = { needs: "Needs doing", money: "Money", field: "Field / crew", bill: "Ready to bill", owing: "Owing", crew: "Crew", issues: "Issues", unassigned: "Unassigned", active: "Active work", done: "Done", drafts: "Drafts", clients: "Clients", invoices: "Invoices", quotes: "Quotes", follow: "Follow up", messages: "Messages", alerts: "Alerts" };

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = API[area] || API.dashboard;
  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
      try { const res = await get(url); next[key] = res?.data ?? res?.[key] ?? res ?? []; }
      catch { next[key] = []; }
    }));
    setData(next);
    setLoading(false);
  }, [get, endpoints]);
  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

function item(type, raw) {
  const id = idOf(raw);
  const status = low(raw.status);
  const base = { type, raw, id, status, amount: 0, href: "#" };
  if (type === "job") {
    const assigned = raw.assigned_worker_id || raw.assigned_worker_name || raw.worker_name;
    return { ...base, code: raw.job_number || raw.reference || `JOB-${id.slice(-4) || "000"}`, title: raw.title || raw.job_name || raw.client_name || "Job", meta: raw.address || raw.description || raw.client_name || "Job record", state: !assigned ? "Unassigned" : raw.status || "Job", amount: raw.price || raw.job_price || raw.fixed_price || raw.total || raw.amount || 0, href: id ? `/jobs/${id}` : "/jobs" };
  }
  if (type === "invoice") return { ...base, code: raw.invoice_number || `INV-${id.slice(-4) || "000"}`, title: raw.customer_name || raw.client_name || "Invoice", meta: raw.description || raw.email || "Invoice record", state: raw.status || "Invoice", amount: raw.balance_due || raw.balance || raw.total || raw.amount || 0, href: id ? `/invoices/${id}` : "/invoices" };
  if (type === "quote") return { ...base, code: raw.quote_number || `QTE-${id.slice(-4) || "000"}`, title: raw.title || raw.customer_name || raw.client_name || "Quote", meta: raw.description || "Quote record", state: raw.status || "Quote", amount: raw.total || raw.amount || raw.price || 0, href: id ? `/quotes/${id}` : "/quotes" };
  if (type === "client") return { ...base, code: "CLIENT", title: raw.name || raw.client_name || raw.customer_name || "Client", meta: raw.email || raw.phone || raw.address || "Client record", state: raw.email && raw.phone ? "Ready" : "Missing details", href: id ? `/clients/${id}` : "/clients" };
  if (type === "worker") return { ...base, code: "CREW", title: raw.name || raw.full_name || raw.email || "Worker", meta: raw.role || raw.email || raw.phone || "Worker record", state: raw.invite_status || raw.status || raw.role || "Worker", href: "/team" };
  return { ...base, code: type === "alert" ? "ALERT" : "AI", title: raw.title || raw.summary || raw.subject || "Prepared action", meta: raw.message || raw.reason || raw.description || raw.body || "Prepared for review.", state: raw.status || "Action", href: raw.target_url || raw.url || "#" };
}

function build(data) {
  const jobs = list(data.jobs).map((x) => item("job", x));
  const invoices = list(data.invoices).map((x) => item("invoice", x));
  const quotes = list(data.quotes).map((x) => item("quote", x));
  const clients = list(data.clients).map((x) => item("client", x));
  const crew = list(data.workers).map((x) => item("worker", x));
  const actions = list(data.actions).map((x) => item("action", x));
  const alerts = list(data.notifications).map((x) => item("alert", x));
  const messages = list(data.history).map((x) => item("message", x));
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
  const needs = [...actions, ...unassigned, ...missing, ...drafts, ...follow];
  const issues = [...overdue, ...unassigned, ...missing];
  const moneyItems = [...owing, ...bill, ...drafts.filter((x) => x.type === "invoice")];
  const field = [...active, ...crew, ...unassigned];
  return { jobs, invoices, quotes, clients, crew, actions, alerts, messages, doneJobs, openJobs, active, unassigned, bill, owing, overdue, drafts, follow, accepted, missing, done, needs, issues, money: moneyItems, field };
}

const total = (items) => items.reduce((sum, x) => sum + Number(x.amount || 0), 0);
function group(key, m) { return ({ needs: m.needs, money: m.money, field: m.field, bill: m.bill, owing: m.owing, crew: m.crew, issues: m.issues, unassigned: m.unassigned, active: m.active.length ? m.active : m.openJobs, done: m.done, drafts: m.drafts, clients: m.clients, invoices: m.invoices, quotes: m.quotes, follow: m.follow, messages: m.messages, alerts: m.alerts })[key] || []; }
function value(key, m) { return key === "owing" ? total(m.owing) : key === "bill" ? total(m.bill) : key === "money" ? total(m.money) : group(key, m).length; }
function displayValue(key, m) { return ["owing", "bill", "money"].includes(key) ? money(value(key, m)) : value(key, m); }

function WorkRow({ row, onSelect }) {
  return <button type="button" className="floor-row" onClick={() => onSelect(row)}><span>{row.code}</span><strong>{row.title}</strong><small>{row.meta}</small><em>{row.state}</em></button>;
}

function Zone({ name, rows, onSelect }) {
  return <section className="floor-zone"><header><div><span>{ZONE_LABELS[name] || name}</span><b>{rows.length}</b></div></header><div className="floor-zone-list">{rows.length ? rows.slice(0, 9).map((row, i) => <WorkRow key={`${name}-${row.code}-${i}`} row={row} onSelect={onSelect} />) : <p className="floor-empty">Clear right now.</p>}</div></section>;
}

export default function ConceptCPage({ area = "dashboard" }) {
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const m = useMemo(() => build(data), [data]);
  const config = PAGES[area] || PAGES.dashboard;
  const [selected, setSelected] = useState(null);
  const status = ["done", "needs", "owing", "bill", "crew", "issues"];
  return <main className="floor-app" data-version="CHURVOX_OPERATOR_FLOOR_20260524"><div className="floor-ambient" />
    <header className="floor-top"><Link to="/dashboard" className="floor-brand"><span>Churvox</span><b>{config.title}</b></Link><div className="floor-search">Search jobs, clients, invoices…</div><nav><Link to="/jobs/new">+ Job</Link><Link to="/clients/new">+ Client</Link><Link to="/invoices/new">+ Invoice</Link></nav><small>{loading ? "Syncing" : "Live"}</small></header>
    <section className="floor-belt">{status.map((key) => <button type="button" key={key} onClick={() => setSelected(group(key, m)[0] || null)}><span>{key === "bill" ? "Ready to bill" : key}</span><b>{displayValue(key, m)}</b></button>)}</section>
    <section className="floor-title"><div><p>Operator Floor</p><h1>{config.title}</h1><span>{config.sub}</span></div></section>
    <section className="floor-board">{config.zones.map((zone) => <Zone key={zone} name={zone} rows={group(zone, m)} onSelect={setSelected} />)}</section>
    {selected && <aside className="floor-drawer"><button type="button" onClick={() => setSelected(null)}>Close</button><p>Selected work</p><h2>{selected.title}</h2><span>{selected.meta}</span><dl><div><dt>Status</dt><dd>{selected.state}</dd></div><div><dt>Owing</dt><dd>{money(total(m.owing))}</dd></div><div><dt>Ready to bill</dt><dd>{money(total(m.bill))}</dd></div></dl><div>{selected.href && selected.href !== "#" && <Link to={selected.href}>Open full record</Link>}<Link to="/ai-operator/approvals">Approvals</Link></div></aside>}
  </main>;
}
