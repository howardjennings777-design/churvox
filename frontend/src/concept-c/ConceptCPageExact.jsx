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
  return { data, loading, reload: load };
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

function Metric({ label, value, note, tone, onClick }) {
  return <button className={`xcf-metric ${tone}`} type="button" onClick={onClick}><i /><span>{label}</span><b>{value}</b><small>{note}</small></button>;
}

function ActionBox({ title, value, note, tone, onClick }) {
  return <button className={`xcf-action-box ${tone}`} type="button" onClick={onClick}><span>{title}</span><b>{value}</b><small>{note}</small></button>;
}

function Row({ item: x, onPick }) {
  return <button className="xcf-row" type="button" onClick={() => onPick(x)}><i /><span><b>{x.title}</b><small>{x.code} · {x.meta}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>;
}

function Card({ title, eyebrow, value, children, onOpen, className = "" }) {
  return <section className={`xcf-card ${className}`}><header><span><small>{eyebrow}</small><b>{title}</b></span>{value !== undefined && <strong>{value}</strong>}{onOpen && <button type="button" onClick={onOpen}>Open slip</button>}</header>{children}</section>;
}

function Empty({ text = "Clear right now." }) { return <div className="xcf-empty">{text}</div>; }

function makeGroup(title, subtitle, items, tone = "blue") {
  return { type: "action_group", title, code: "ACTION SLIP", state: `${items.length} items`, meta: subtitle, items, tone, amount: sum(items), href: "#" };
}

function ActionHub({ m, onPick }) {
  const urgent = [...m.bill, ...m.unassigned, ...m.workReview, ...m.followUp, ...m.issues];
  const groups = {
    invoices: makeGroup("Invoices", "Ready-to-bill work and invoice records in one slip.", m.bill, "green"),
    assign: makeGroup("Assign Worker", "Unassigned work and dispatch gaps ready to assign.", m.unassigned, "blue"),
    review: makeGroup("Review Work", "Finished jobs waiting for owner approval.", m.workReview, "amber"),
    follow: makeGroup("Customer Follow-up", "Customer reminders, quote follow-ups and prepared messages.", m.followUp, "purple"),
    issues: makeGroup("Fix Issues", "Risks, missing details and items needing attention.", m.issues, "red"),
  };
  return <section className="xcf-card xcf-action-hub-card">
    <header><span><small>Tap once. Work in the slip.</small><b>Take Action</b></span><strong>{urgent.length}</strong><button type="button" onClick={() => onPick(makeGroup("All Actions", "Everything needing owner attention.", urgent, "purple"))}>Open slip</button></header>
    <div className="xcf-action-box-grid">
      <ActionBox title="Invoices" value={m.bill.length} note="ready to send" tone="green" onClick={() => onPick(groups.invoices)} />
      <ActionBox title="Assign Worker" value={m.unassigned.length} note="unassigned jobs" tone="blue" onClick={() => onPick(groups.assign)} />
      <ActionBox title="Review Work" value={m.workReview.length} note="awaiting approval" tone="amber" onClick={() => onPick(groups.review)} />
      <ActionBox title="Customer Follow-up" value={m.followUp.length} note="messages & reminders" tone="purple" onClick={() => onPick(groups.follow)} />
      <ActionBox title="Fix Issues" value={m.issues.length} note="need attention" tone="red" onClick={() => onPick(groups.issues)} />
    </div>
    <div className="xcf-list xcf-urgent-list">{urgent.length ? urgent.slice(0, 5).map((x, i) => <Row key={`urgent-${i}`} item={x} onPick={onPick} />) : <Empty text="No priority actions waiting." />}</div>
  </section>;
}

function Dashboard({ m, loading, onPick }) {
  const urgent = [...m.bill, ...m.unassigned, ...m.workReview, ...m.followUp, ...m.issues];
  const nextAction = m.workReview.length ? "Review finished work → prepare invoices" : m.bill.length ? "Prepare invoices" : m.unassigned.length ? "Assign workers" : m.issues.length ? "Fix issues" : "All clear";
  return <main className="xcf-shell" data-version="CHURVOX_EXACT_FULL_SCREEN_IMAGE_LAYOUT_20260526">
    <TopBar loading={loading} />

    <section className="xcf-hero">
      <div><p>AI OPERATOR COMMAND FLOOR</p><h1>Command Floor</h1><span>Churvox does the admin. You approve.</span></div>
      <aside><i>⚡</i><small>Next Best Action</small><b>{nextAction}</b><em>{m.bill.length + m.workReview.length} jobs are ready to move toward invoice</em></aside>
    </section>

    <section className="xcf-metrics">
      <Metric label="Ready to Bill" value={cash(sum(m.bill))} note={`${m.bill.length} invoices`} tone="green" onClick={() => onPick(makeGroup("Ready to Bill", "Approved work ready for invoice action.", m.bill, "green"))} />
      <Metric label="Unassigned Jobs" value={m.unassigned.length} note="needs workers" tone="blue" onClick={() => onPick(makeGroup("Unassigned Jobs", "Jobs needing worker assignment.", m.unassigned, "blue"))} />
      <Metric label="Work Review" value={m.workReview.length} note="awaiting approval" tone="amber" onClick={() => onPick(makeGroup("Work Review", "Finished jobs waiting for approval.", m.workReview, "amber"))} />
      <Metric label="Take Action" value={urgent.length} note="items need attention" tone="purple" onClick={() => onPick(makeGroup("Take Action", "All owner actions in one slip.", urgent, "purple"))} />
      <Metric label="Team On Jobs" value={m.live.length} note="field activity" tone="cyan" onClick={() => onPick(makeGroup("Team On Jobs", "Live crew and active field activity.", m.live, "cyan"))} />
      <Metric label="Completed This Week" value={m.doneJobs.length} note="jobs closed" tone="green" onClick={() => onPick(makeGroup("Completed This Week", "Completed job records.", m.doneJobs, "green"))} />
    </section>

    <section className="xcf-main-grid">
      <ActionHub m={m} onPick={onPick} />

      <Card title="Live Crew" eyebrow="Real-time crew activity in the field" value={m.live.length} onOpen={() => onPick(makeGroup("Live Crew", "Crew, job status, GPS and evidence in one place.", m.live, "cyan"))} className="xcf-live-card">
        <div className="xcf-map-card"><span>Owner crew map</span><b>Timers • GPS • photos • status</b></div>
        <div className="xcf-live-stats"><i>{m.live.length}<small>Crew on jobs</small></i><i>{m.active.length}<small>Active jobs</small></i><i>{m.unassigned.length}<small>Need worker</small></i></div>
        <div className="xcf-list">{m.live.length ? m.live.slice(0, 4).map((x, i) => <Row key={`live-${i}`} item={x} onPick={onPick} />) : <Empty text="No crew on jobs right now." />}</div>
      </Card>

      <Card title="Money Desk" eyebrow="Your cashflow at a glance" value={cash(sum(m.money))} onOpen={() => onPick(makeGroup("Money Desk", "Ready-to-bill, owing and overdue work in one slip.", m.money, "green"))} className="xcf-money-card">
        <div className="xcf-money-hero"><span>Ready to bill</span><b>{cash(sum(m.bill))}</b><small>{m.bill.length} approved jobs</small></div>
        <div className="xcf-money-queue"><p><span>Invoice Queue</span><b>{m.bill.length}</b><em>{cash(sum(m.bill))}</em></p><p><span>Overdue</span><b>{m.overdue.length}</b><em>{cash(sum(m.overdue))}</em></p><p><span>Owing</span><b>{m.owing.length}</b><em>{cash(sum(m.owing))}</em></p></div>
      </Card>

      <Card title="Work Review" eyebrow="Jobs waiting for your approval" value={m.workReview.length} onOpen={() => onPick(makeGroup("Work Review", "Approve finished work without leaving the command floor.", m.workReview, "amber"))} className="xcf-review-card">
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
  return <main className="xcf-shell xcf-workspace"><TopBar loading={loading} /><section className="xcf-hero"><div><p>Workspace</p><h1>{title}</h1><span>{subtitle}</span></div><aside><small>Records</small><b>{rows.length}</b><em>Tap a record to inspect, edit, approve or open the full record only when needed.</em></aside></section><section className="xcf-workspace-list">{rows.length ? rows.slice(0, 40).map((x, i) => <Row key={`${area}-${i}`} item={x} onPick={onPick} />) : <Empty />}</section><BottomNav /></main>;
}

function EditableField({ label, value, onChange, textarea = false }) {
  return <label className="xcf-edit-field"><span>{label}</span>{textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}

function DetailDrawer({ picked, onClose, onAction }) {
  const [draft, setDraft] = useState({ title: "", meta: "", status: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setDraft({ title: picked?.title || "", meta: picked?.meta || "", status: picked?.state || "" });
    setNotice("");
    setBusy(false);
  }, [picked]);

  if (!picked) return null;
  const isGroup = picked.type === "action_group";
  const items = picked.items || [];

  const run = async (action) => {
    setBusy(true);
    setNotice("");
    const msg = await onAction(action, picked, draft);
    setNotice(msg);
    setBusy(false);
  };

  return <aside className={`xcf-drawer xcf-drawer-${isGroup ? "group" : "record"}`}>
    <button className="xcf-close" type="button" onClick={onClose}>Close</button>
    <p>{picked.code || picked.type}</p>
    <h2>{picked.title}</h2>
    <span>{picked.meta}</span>

    {isGroup ? <div className="xcf-slip-list">
      {items.length ? items.slice(0, 12).map((x, i) => <button className="xcf-slip-row" type="button" key={`${x.type}-${x.id}-${i}`} onClick={() => setDraft({ title: x.title, meta: x.meta, status: x.state })}>
        <b>{x.title}</b><small>{x.code} · {x.meta}</small><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em>
      </button>) : <Empty text="Nothing waiting in this slip." />}
    </div> : <>
      <dl><div><dt>Status</dt><dd>{picked.state}</dd></div><div><dt>Value</dt><dd>{Number(picked.amount || 0) > 0 ? cash(picked.amount) : "—"}</dd></div><div><dt>Code</dt><dd>{picked.code}</dd></div></dl>
      <EditableField label="Title" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} />
      <EditableField label="Notes / description" value={draft.meta} onChange={(v) => setDraft((d) => ({ ...d, meta: v }))} textarea />
      <EditableField label="Status" value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
    </>}

    <div className="xcf-drawer-actions">
      {!isGroup && <button type="button" disabled={busy} onClick={() => run("save")}>Save changes</button>}
      <button type="button" disabled={busy} onClick={() => run("approve")}>{isGroup ? "Approve selected" : "Approve"}</button>
      <button type="button" disabled={busy} onClick={() => run("invoice")}>Prepare invoice</button>
      <button type="button" disabled={busy} onClick={() => run("message")}>Draft message</button>
      {picked.href && picked.href !== "#" && <Link to={picked.href}>Full page</Link>}
    </div>
    {notice && <strong className="xcf-drawer-notice">{notice}</strong>}
  </aside>;
}

async function runRecordAction(action, picked, draft, api, reload) {
  if (!picked || picked.type === "action_group") return "Open a record inside the slip first.";
  const id = picked.id;
  if (!id && ["save", "approve", "invoice"].includes(action)) return "This record has no saved ID yet.";
  const titlePayload = { title: draft.title, description: draft.meta, status: draft.status };

  try {
    if (action === "save") {
      const endpoint = picked.type === "invoice" ? `/invoices/${id}` : picked.type === "quote" ? `/quotes/${id}` : picked.type === "client" ? `/clients/${id}` : `/jobs/${id}`;
      const res = await api.patch(endpoint, titlePayload);
      await reload();
      return res?.success ? "Saved in this slip." : `Could not save: ${res?.error || "unknown error"}`;
    }
    if (action === "approve") {
      if (picked.type === "invoice") {
        const res = await api.patch(`/invoices/${id}`, { status: "approved" });
        await reload();
        return res?.success ? "Invoice approved." : `Could not approve: ${res?.error || "unknown error"}`;
      }
      const res = await api.patch(`/jobs/${id}`, { owner_review_status: "approved", work_review_status: "approved", reviewed: true });
      await reload();
      return res?.success ? "Work approved." : `Could not approve: ${res?.error || "unknown error"}`;
    }
    if (action === "invoice") {
      if (picked.type === "job") return "Use Full page only if you need the full invoice form. Draft invoice action stays here next.";
      return "Invoice prep is ready in the slip. Select a job first.";
    }
    if (action === "message") return "Message draft stays in this slip next; no page jump needed.";
  } catch (err) {
    return `Action failed: ${err?.message || "unknown error"}`;
  }
  return "Action ready.";
}

export default function ConceptCPageExact({ area = "dashboard" }) {
  const api = useApi();
  const { get } = api;
  const { data, loading, reload } = useLive(area, get);
  const m = useMemo(() => build(data), [data]);
  const [picked, setPicked] = useState(null);
  const onAction = useCallback((action, record, draft) => runRecordAction(action, record, draft, api, reload), [api, reload]);

  return <>{area === "dashboard" ? <Dashboard m={m} loading={loading} onPick={setPicked} /> : <Workspace area={area} m={m} loading={loading} onPick={setPicked} />}<DetailDrawer picked={picked} onClose={() => setPicked(null)} onAction={onAction} /></>;
}
