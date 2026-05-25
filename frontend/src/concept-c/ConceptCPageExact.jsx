import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./ConceptCPageExact.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const str = (v) => String(v || "");
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const sum = (items) => items.reduce((total, item) => total + Number(item.amount || 0), 0);

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
  dashboard: ["Command Floor", "Churvox does the admin. You approve."],
  jobs: ["Jobs", "Open work, completed work and job records."],
  dispatch: ["Dispatch", "Assign workers and close crew gaps."],
  clients: ["Clients", "Customer records and missing details."],
  quotes: ["Quotes", "Quote follow-up and quote records."],
  invoices: ["Invoices", "Invoice control and cashflow."],
  team: ["Live Crew", "Crew, roles and worker status."],
  sms: ["Messages", "Customer communication."],
  notifications: ["Issues", "Risks, alerts and updates."],
  reports: ["Reports", "Completed work and money records."],
  integrations: ["Sync", "Connected tools and invoice sync."],
  payroll: ["Payroll", "Crew summaries and pay review."],
  automation: ["Automation", "Rules and AI prepared actions."],
  settings: ["Settings", "Business setup."],
};

function useLive(area, get) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const endpoints = API[area] || API.dashboard;

  const load = useCallback(async () => {
    setLoading(true);
    const next = {};
    await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
      try {
        const response = await get(url);
        next[key] = response?.data ?? response?.[key] ?? response ?? [];
      } catch {
        next[key] = [];
      }
    }));
    setData(next);
    setLoading(false);
  }, [get, endpoints]);

  useEffect(() => { load(); }, [load]);
  return { data, loading };
}

function item(type, record) {
  const id = idOf(record);
  const status = low(record?.status);
  const base = { type, id, raw: record, status, amount: 0, href: "#" };

  if (type === "job") {
    const assigned = record.assigned_worker_id || record.assigned_worker_name || record.worker_name;
    return { ...base, code: record.job_number || record.reference || `JOB-${id.slice(-4) || "000"}`, title: record.title || record.job_name || record.client_name || "Job", meta: record.address || record.description || record.client_name || "Job record", state: !assigned ? "Unassigned" : record.status || "Job", amount: record.price || record.job_price || record.fixed_price || record.total || record.amount || 0, href: id ? `/jobs/${id}` : "/jobs" };
  }

  if (type === "invoice") return { ...base, code: record.invoice_number || `INV-${id.slice(-4) || "000"}`, title: record.customer_name || record.client_name || "Invoice", meta: record.description || record.email || "Invoice record", state: record.status || "Invoice", amount: record.balance_due || record.balance || record.total || record.amount || 0, href: id ? `/invoices/${id}` : "/invoices" };
  if (type === "quote") return { ...base, code: record.quote_number || `QTE-${id.slice(-4) || "000"}`, title: record.title || record.customer_name || record.client_name || "Quote", meta: record.description || "Quote record", state: record.status || "Quote", amount: record.total || record.amount || record.price || 0, href: id ? `/quotes/${id}` : "/quotes" };
  if (type === "client") return { ...base, code: "CLIENT", title: record.name || record.client_name || record.customer_name || "Client", meta: record.email || record.phone || record.address || "Client record", state: record.email && record.phone ? "Good" : "Missing details", href: id ? `/clients/${id}` : "/clients" };
  if (type === "worker") {
    const active = record.current_job_title || record.active_job_title || record.current_job_id || record.active_job_id;
    return { ...base, code: "CREW", title: record.name || record.full_name || record.email || "Worker", meta: active ? `On site · ${active}` : (record.role || record.email || "Worker record"), state: active ? "On job" : "Available", href: "/team" };
  }

  return { ...base, code: type === "alert" ? "ALERT" : "AI", title: record.title || record.summary || record.subject || "Prepared action", meta: record.message || record.reason || record.description || record.body || "Prepared for review.", state: record.status || "Review", href: record.target_url || record.url || "#" };
}

function reviewed(x) {
  const r = x?.raw || {};
  const s = low(r.work_review_status || r.review_status || r.owner_review_status || r.approval_status);
  return Boolean(r.reviewed || r.owner_approved || r.work_approved || r.job_approved || r.approved_at || ["approved", "reviewed", "accepted", "invoiced"].includes(s));
}

function build(data) {
  const jobs = arr(data.jobs).map((x) => item("job", x));
  const invoices = arr(data.invoices).map((x) => item("invoice", x));
  const quotes = arr(data.quotes).map((x) => item("quote", x));
  const clients = arr(data.clients).map((x) => item("client", x));
  const crew = arr(data.workers).map((x) => item("worker", x));
  const actions = arr(data.actions).map((x) => item("action", x));
  const alerts = arr(data.notifications).map((x) => item("alert", x));
  const messages = arr(data.history).map((x) => item("message", x));

  const doneJobs = jobs.filter((x) => ["completed", "complete", "done"].includes(x.status));
  const workReview = doneJobs.filter((x) => !reviewed(x)).map((x) => ({ ...x, type: "work_review", state: "Needs review", meta: `${x.meta} · finished work` }));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const active = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const unassigned = jobs.filter((x) => x.state === "Unassigned");
  const bill = doneJobs.filter((x) => reviewed(x) && !(x.raw?.invoice_id || x.raw?.draft_invoice_id || x.raw?.invoiced));
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const quoteFollow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const clientWatch = clients.filter((x) => x.state === "Missing details");
  const issues = [...overdue, ...unassigned, ...clientWatch, ...alerts];
  const money = [...bill, ...owing, ...draftInvoices];
  const dispatch = [...unassigned, ...openJobs.filter((x) => !active.includes(x))];
  const live = [...active, ...crew].slice(0, 8);
  const done = [...doneJobs, ...invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status))];
  const followUp = [...actions, ...quoteFollow, ...owing].slice(0, 20);

  return { jobs, invoices, quotes, clients, crew, actions, alerts, messages, doneJobs, workReview, openJobs, active, unassigned, bill, owing, overdue, draftInvoices, quoteFollow, clientWatch, issues, money, dispatch, live, done, followUp };
}

function TopBar({ loading }) {
  return <header className="xcf-topbar">
    <Link className="xcf-brand" to="/dashboard"><i>CV</i><span><b>Churvox</b><small>AI Operator</small></span></Link>
    <div className="xcf-search">Search jobs, clients, invoices...</div>
    <nav>
      <Link to="/ai-operator/approvals">Take Action</Link>
      <Link to="/jobs/new">+ New</Link>
      <Link to="/invoices">Money</Link>
    </nav>
    <strong className={loading ? "syncing" : "live"}>{loading ? "Syncing" : "Live"}</strong>
  </header>;
}

function BottomNav() {
  const links = [["/dashboard", "Command"], ["/jobs", "Jobs"], ["/team", "Crew"], ["/clients", "Clients"], ["/invoices", "Money"], ["/quotes", "Quotes"], ["/dispatch", "Dispatch"], ["/notifications", "Issues"], ["/reports", "Reports"], ["/settings", "Settings"]];
  return <nav className="xcf-bottom-nav">{links.map(([href, label]) => <Link key={href} to={href}>{label}</Link>)}</nav>;
}

function Metric({ label, value, note, tone }) {
  return <article className={`xcf-metric ${tone}`}><i /><span>{label}</span><b>{value}</b><small>{note}</small></article>;
}

function ActionBox({ title, value, note, href, tone }) {
  return <Link className={`xcf-action-box ${tone}`} to={href}><span>{title}</span><b>{value}</b><small>{note}</small></Link>;
}

function Row({ item: x, onPick }) {
  return <button className="xcf-row" type="button" onClick={() => onPick(x)}><i /><span><b>{x.title}</b><small>{x.code} · {x.meta}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>;
}

function Card({ title, eyebrow, value, children, href, className = "" }) {
  return <section className={`xcf-card ${className}`}><header><span><small>{eyebrow}</small><b>{title}</b></span>{value !== undefined && <strong>{value}</strong>}{href && <Link to={href}>View all</Link>}</header>{children}</section>;
}

function Empty({ text = "Clear right now." }) { return <div className="xcf-empty">{text}</div>; }

function ActionHub({ m, onPick }) {
  const urgent = [...m.bill, ...m.unassigned, ...m.workReview, ...m.followUp, ...m.issues];
  return <section className="xcf-card xcf-action-hub-card">
    <header><span><small>Focus on what needs you</small><b>Take Action</b></span><strong>{urgent.length}</strong><Link to="/ai-operator/approvals">View all</Link></header>
    <div className="xcf-action-box-grid">
      <ActionBox title="Invoices" value={m.bill.length} note="ready to send" href="/invoices" tone="green" />
      <ActionBox title="Assign Worker" value={m.unassigned.length} note="unassigned jobs" href="/dispatch" tone="blue" />
      <ActionBox title="Review Work" value={m.workReview.length} note="awaiting approval" href="/jobs" tone="amber" />
      <ActionBox title="Customer Follow-up" value={m.followUp.length} note="messages & reminders" href="/ai-operator/approvals" tone="purple" />
      <ActionBox title="Fix Issues" value={m.issues.length} note="need attention" href="/notifications" tone="red" />
    </div>
    <div className="xcf-list xcf-urgent-list">{urgent.length ? urgent.slice(0, 5).map((x, i) => <Row key={`urgent-${i}`} item={x} onPick={onPick} />) : <Empty text="No priority actions waiting." />}</div>
  </section>;
}

function Dashboard({ m, loading, onPick }) {
  const nextAction = m.workReview.length ? "Review finished work → prepare invoices" : m.bill.length ? "Prepare invoices" : m.unassigned.length ? "Assign workers" : m.issues.length ? "Fix issues" : "All clear";
  return <main className="xcf-shell" data-version="CHURVOX_EXACT_FULL_SCREEN_IMAGE_LAYOUT_20260526">
    <TopBar loading={loading} />

    <section className="xcf-hero">
      <div><p>AI OPERATOR COMMAND FLOOR</p><h1>Command Floor</h1><span>Churvox does the admin. You approve.</span></div>
      <aside><i>⚡</i><small>Next Best Action</small><b>{nextAction}</b><em>{m.bill.length + m.workReview.length} jobs are ready to move toward invoice</em></aside>
    </section>

    <section className="xcf-metrics">
      <Metric label="Ready to Bill" value={cash(sum(m.bill))} note={`${m.bill.length} invoices`} tone="green" />
      <Metric label="Unassigned Jobs" value={m.unassigned.length} note="needs workers" tone="blue" />
      <Metric label="Work Review" value={m.workReview.length} note="awaiting approval" tone="amber" />
      <Metric label="Take Action" value={[...m.bill, ...m.unassigned, ...m.workReview, ...m.followUp, ...m.issues].length} note="items need attention" tone="purple" />
      <Metric label="Team On Jobs" value={m.live.length} note="field activity" tone="cyan" />
      <Metric label="Completed This Week" value={m.doneJobs.length} note="jobs closed" tone="green" />
    </section>

    <section className="xcf-main-grid">
      <ActionHub m={m} onPick={onPick} />

      <Card title="Live Crew" eyebrow="Real-time crew activity in the field" value={m.live.length} href="/team" className="xcf-live-card">
        <div className="xcf-map-card"><span>Owner crew map</span><b>Timers • GPS • photos • status</b></div>
        <div className="xcf-live-stats"><i>{m.live.length}<small>Crew on jobs</small></i><i>{m.active.length}<small>Active jobs</small></i><i>{m.unassigned.length}<small>Need worker</small></i></div>
        <div className="xcf-list">{m.live.length ? m.live.slice(0, 4).map((x, i) => <Row key={`live-${i}`} item={x} onPick={onPick} />) : <Empty text="No crew on jobs right now." />}</div>
      </Card>

      <Card title="Money Desk" eyebrow="Your cashflow at a glance" value={cash(sum(m.money))} href="/invoices" className="xcf-money-card">
        <div className="xcf-money-hero"><span>Ready to bill</span><b>{cash(sum(m.bill))}</b><small>{m.bill.length} approved jobs</small></div>
        <div className="xcf-money-queue"><p><span>Invoice Queue</span><b>{m.bill.length}</b><em>{cash(sum(m.bill))}</em></p><p><span>Overdue</span><b>{m.overdue.length}</b><em>{cash(sum(m.overdue))}</em></p><p><span>Owing</span><b>{m.owing.length}</b><em>{cash(sum(m.owing))}</em></p></div>
      </Card>

      <Card title="Work Review" eyebrow="Jobs waiting for your approval" value={m.workReview.length} href="/jobs" className="xcf-review-card">
        <div className="xcf-list">{m.workReview.length ? m.workReview.slice(0, 6).map((x, i) => <Row key={`review-${i}`} item={x} onPick={onPick} />) : <Empty text="No finished jobs waiting for review." />}</div>
      </Card>
    </section>

    <BottomNav />
  </main>;
}

function Workspace({ area, m, loading, onPick }) {
  const [title, subtitle] = PAGES[area] || ["Workspace", "Simple workspace"];
  const rowsByArea = { jobs: m.jobs, dispatch: m.dispatch, clients: m.clients, quotes: m.quotes, invoices: m.invoices, team: m.crew, sms: m.messages, notifications: [...m.alerts, ...m.issues], reports: m.done, integrations: m.invoices, payroll: [...m.crew, ...m.doneJobs], automation: m.actions, settings: m.issues };
  const rows = rowsByArea[area] || m.actions;
  return <main className="xcf-shell xcf-workspace"><TopBar loading={loading} /><section className="xcf-hero"><div><p>Workspace</p><h1>{title}</h1><span>{subtitle}</span></div><aside><small>Records</small><b>{rows.length}</b><em>Tap a record to inspect it.</em></aside></section><section className="xcf-workspace-list">{rows.length ? rows.slice(0, 40).map((x, i) => <Row key={`${area}-${i}`} item={x} onPick={onPick} />) : <Empty />}</section><BottomNav /></main>;
}

function DetailDrawer({ picked, onClose }) {
  if (!picked) return null;
  return <aside className="xcf-drawer"><button type="button" onClick={onClose}>Close</button><p>{picked.type}</p><h2>{picked.title}</h2><span>{picked.meta}</span><dl><div><dt>Status</dt><dd>{picked.state}</dd></div><div><dt>Value</dt><dd>{Number(picked.amount || 0) > 0 ? cash(picked.amount) : "—"}</dd></div><div><dt>Code</dt><dd>{picked.code}</dd></div></dl>{picked.href && picked.href !== "#" && <Link to={picked.href}>Open record</Link>}</aside>;
}

export default function ConceptCPageExact({ area = "dashboard" }) {
  const { get } = useApi();
  const { data, loading } = useLive(area, get);
  const m = useMemo(() => build(data), [data]);
  const [picked, setPicked] = useState(null);
  return <>{area === "dashboard" ? <Dashboard m={m} loading={loading} onPick={setPicked} /> : <Workspace area={area} m={m} loading={loading} onPick={setPicked} />}<DetailDrawer picked={picked} onClose={() => setPicked(null)} /></>;
}
