import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import CommandFloorApprovalSlip from "./CommandFloorApprovalSlip";
import "./ConceptCPageExact.css";
import "./ConceptCFullScreenSlip.css";
import "./ConceptCWorkSlipTight.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const firstText = (...values) => values.map(str).find(Boolean) || "";
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const sum = (items) => items.reduce((total, item) => total + Number(item.amount || 0), 0);
const apiOk = (res) => Boolean(res?.success && res?.data?.success !== false);
const apiError = (res, fallback = "unknown error") => firstText(res?.error, res?.data?.error, res?.data?.detail, res?.data?.message, fallback);
const recordIdFromResponse = (res) => idOf(res?.data) || idOf(res?.data?.invoice) || idOf(res?.data?.data) || idOf(res?.data?.record) || idOf(res?.data?.item) || idOf(res?.invoice) || idOf(res);

function moneyNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

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
  dashboard: ["Command Floor", "Approve the work Churvox prepared."],
  jobs: ["Jobs", "Open work, completed work and job records."],
  dispatch: ["Worker Assignments", "Assign workers and close crew gaps."],
  clients: ["Clients", "Customer records and missing details."],
  quotes: ["Quotes", "Quote follow-up and quote records."],
  invoices: ["Invoices", "Invoice approval and cashflow."],
  team: ["Workers", "Crew, roles and worker status."],
  sms: ["Messages", "Customer communication."],
  notifications: ["Issues", "Risks, alerts and updates."],
  reports: ["Reports", "Completed work and money records."],
  integrations: ["Sync", "Connected tools and invoice sync."],
  payroll: ["Payroll", "Crew summaries and pay review."],
  automation: ["Automation", "Rules and AI prepared actions."],
  settings: ["Settings", "Business setup."],
};

function detailText(record, fallback = "") {
  return firstText(record?.owner_facing_explanation, record?.reason, record?.recommendation, record?.what_happens, record?.generated_message, record?.description, record?.job_description, record?.service_description, record?.scope, record?.completion_notes, record?.worker_completion_notes, record?.worker_notes, record?.job_notes, record?.notes, record?.admin_notes, record?.message, record?.address, fallback);
}

function reviewed(item) {
  const r = item?.raw || {};
  const s = low(r.work_review_status || r.review_status || r.owner_review_status || r.approval_status);
  return Boolean(r.reviewed || r.owner_approved || r.work_approved || r.job_approved || r.approved_at || ["approved", "reviewed", "accepted", "invoiced"].includes(s));
}

function invoiceLinked(item) {
  const r = item?.raw || {};
  return Boolean(r.invoice_id || r.draft_invoice_id || r.invoice_number || r.invoiced);
}

async function patchWithFallback(api, endpoint, payload) {
  const res = await api.patch(endpoint, payload);
  if (apiOk(res)) return res;
  if (/405|method not allowed/i.test(apiError(res, "")) && typeof api.put === "function") return api.put(endpoint, payload);
  return res;
}

function item(type, record) {
  const id = idOf(record);
  const status = low(record?.status);
  const base = { type, id, raw: record, status, amount: 0, href: "#" };
  if (type === "job") {
    const assigned = firstText(record.assigned_worker_id, record.assigned_worker_name, record.worker_name, record.assigned_to);
    return { ...base, code: record.job_number || record.reference || `JOB-${id.slice(-4) || "000"}`, title: record.title || record.job_name || record.client_name || record.customer_name || "Job", meta: detailText(record, record.client_name || record.customer_name || "Job record"), state: !assigned ? "Unassigned" : record.status || "Job", amount: moneyNumber(record.price, record.job_price, record.fixed_price, record.total, record.amount, record.subtotal), href: id ? `/jobs/${id}` : "/jobs" };
  }
  if (type === "invoice") return { ...base, code: record.invoice_number || `INV-${id.slice(-4) || "000"}`, title: record.customer_name || record.client_name || "Invoice", meta: detailText(record, record.email || "Invoice record"), state: record.status || "Invoice", amount: moneyNumber(record.balance_due, record.balance, record.total, record.amount, record.subtotal), href: id ? `/invoices/${id}` : "/invoices" };
  if (type === "quote") return { ...base, code: record.quote_number || `QTE-${id.slice(-4) || "000"}`, title: record.title || record.customer_name || record.client_name || "Quote", meta: detailText(record, "Quote record"), state: record.status || "Quote", amount: moneyNumber(record.total, record.amount, record.price, record.subtotal), href: id ? `/quotes/${id}` : "/quotes" };
  if (type === "client") return { ...base, code: "CLIENT", title: record.name || record.client_name || record.customer_name || "Client", meta: firstText(record.email, record.phone, record.address, "Client record"), state: record.email && record.phone ? "Good" : "Missing details", href: id ? `/clients/${id}` : "/clients" };
  if (type === "worker") {
    const active = firstText(record.current_job_title, record.active_job_title, record.current_job_id, record.active_job_id);
    return { ...base, code: "WORKER", title: record.name || record.full_name || record.email || "Worker", meta: active ? `On site · ${active}` : (record.role || record.email || "Worker record"), state: active ? "On job" : "Available", href: "/team" };
  }
  return { ...base, code: type === "alert" ? "ISSUE" : "AI ACTION", title: record.title || record.summary || record.subject || "Prepared action", meta: detailText(record, "Prepared for review."), state: record.status || "Review", href: record.target_url || record.url || "#" };
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
  const approved = doneJobs.filter((x) => reviewed(x));
  const workReview = doneJobs.filter((x) => !reviewed(x)).map((x) => ({ ...x, type: "work_review", state: "Needs approval", meta: `${x.meta} · finished work` }));
  const readyInvoice = approved.filter((x) => !invoiceLinked(x));
  const openJobs = jobs.filter((x) => !["completed", "complete", "done", "cancelled"].includes(x.status));
  const active = jobs.filter((x) => ["in_progress", "in progress", "started", "paused"].includes(x.status));
  const unassigned = jobs.filter((x) => x.state === "Unassigned");
  const owing = invoices.filter((x) => ["sent", "open", "unpaid", "overdue"].includes(x.status));
  const overdue = invoices.filter((x) => x.status === "overdue");
  const draftInvoices = invoices.filter((x) => ["draft", "pending", ""].includes(x.status));
  const quoteFollow = quotes.filter((x) => !["accepted", "approved", "lost", "declined"].includes(x.status));
  const clientWatch = clients.filter((x) => x.state === "Missing details");
  const invoiceActions = [...readyInvoice, ...draftInvoices, ...owing];
  const workerActions = [...unassigned, ...openJobs.filter((x) => !active.includes(x))];
  const messageActions = [...actions, ...quoteFollow, ...messages].slice(0, 20);
  const issues = [...overdue, ...clientWatch, ...alerts, ...jobs.filter((x) => !moneyNumber(x.amount) && ["completed", "complete", "done"].includes(x.status))];
  const live = [...active, ...crew].slice(0, 8);
  const done = [...doneJobs, ...invoices.filter((x) => ["paid", "complete", "completed"].includes(x.status))];
  const urgent = [...workReview, ...invoiceActions, ...workerActions, ...messageActions, ...issues];

  return { jobs, invoices, quotes, clients, crew, actions, alerts, messages, doneJobs, approved, approvedValue: sum(approved), workReview, readyInvoice, openJobs, active, unassigned, owing, overdue, draftInvoices, quoteFollow, clientWatch, invoiceActions, workerActions, messageActions, issues, live, done, urgent };
}

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

function makeGroup(title, meta, items, tone = "blue", actionLabel = "Open action") {
  return { type: "action_group", title, code: "APPROVAL LANE", state: `${items.length} waiting`, meta, items, tone, actionLabel, amount: sum(items), href: "#" };
}

function TopBar({ loading }) {
  return <header className="xcf-topbar"><Link className="xcf-brand" to="/dashboard"><i>CV</i><span><b>Churvox</b><small>AI Operator</small></span></Link><div className="xcf-search">Search jobs, clients, invoices...</div><nav><Link to="/ai-operator/approvals">AI Actions</Link><Link to="/jobs/new">+ New</Link><Link to="/invoices">Money</Link></nav><strong className={loading ? "syncing" : "live"}>{loading ? "Syncing" : "Live"}</strong></header>;
}

function BottomNav() {
  const links = [["/dashboard", "Command"], ["/jobs", "Jobs"], ["/team", "Crew"], ["/clients", "Clients"], ["/invoices", "Money"], ["/quotes", "Quotes"], ["/dispatch", "Dispatch"], ["/notifications", "Issues"], ["/reports", "Reports"], ["/settings", "Settings"]];
  return <nav className="xcf-bottom-nav">{links.map(([href, label]) => <Link key={href} to={href}>{label}</Link>)}</nav>;
}

function Metric({ label, value, note, tone, onClick }) {
  return <button className={`xcf-metric ${tone}`} type="button" onClick={onClick}><i /><span>{label}</span><b>{value}</b><small>{note}</small></button>;
}
function Row({ item: x, onPick }) {
  return <button className="xcf-row" type="button" onClick={(event) => { event.stopPropagation(); onPick(x); }}><i /><span><b>{x.title}</b><small>{x.code} · {x.meta}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>;
}
function Empty({ text = "Nothing waiting here." }) { return <div className="xcf-empty">{text}</div>; }

function ApprovalLane({ title, eyebrow, description, value, note, tone, items, group, onPick, primary }) {
  return <section className={`xcf-card xcf-approval-lane xcf-lane-${tone}`}><header><span><small>{eyebrow}</small><b>{title}</b></span><strong>{value}</strong></header><p className="xcf-lane-description">{description}</p><button className="xcf-lane-primary" type="button" onClick={() => onPick(group)}>{primary}</button><div className="xcf-list">{items.length ? items.slice(0, 4).map((x, i) => <Row key={`${title}-${x.type}-${x.id || i}`} item={x} onPick={onPick} />) : <Empty />}</div><small className="xcf-lane-note">{note}</small></section>;
}

function Dashboard({ m, loading, onPick }) {
  const workLane = makeGroup("Approve Work", "Finished jobs waiting for your approval. Check evidence, photos, notes and value before signing off.", m.workReview, "amber", "Open work approvals");
  const invoiceLane = makeGroup("Approve Invoices", "Approved work and invoice records waiting for invoice action.", m.invoiceActions, "green", "Open invoice actions");
  const workerLane = makeGroup("Assign Workers", "Jobs that need a worker or dispatch decision.", m.workerActions, "blue", "Open worker assignments");
  const messageLane = makeGroup("Approve Messages", "AI-prepared quote follow-ups, customer updates and reminders to review before sending.", m.messageActions, "purple", "Open message approvals");
  const issueLane = makeGroup("Fix Issues", "Missing price, missing customer details, overdue money or blocked admin work.", m.issues, "red", "Open issues");
  const nextAction = m.workReview.length ? "Approve finished work" : m.invoiceActions.length ? "Approve invoices" : m.workerActions.length ? "Assign workers" : m.messageActions.length ? "Approve messages" : m.issues.length ? "Fix issues" : "All clear";
  return <main className="xcf-shell xcf-approval-desk" data-version="CHURVOX_COMMAND_FLOOR_APPROVAL_DESK_20260527"><TopBar loading={loading} /><section className="xcf-hero xcf-approval-hero"><div><p>OWNER APPROVAL DESK</p><h1>Command Floor</h1><span>See what needs a decision. Approve the next step. Stay on this page.</span></div><aside><i>✓</i><small>Next approval</small><b>{nextAction}</b><em>{m.workReview.length + m.invoiceActions.length + m.workerActions.length + m.messageActions.length + m.issues.length} decisions waiting</em></aside></section><section className="xcf-metrics xcf-approval-summary"><Metric label="Approve Work" value={m.workReview.length} note="finished jobs" tone="amber" onClick={() => onPick(workLane)} /><Metric label="Approve Invoices" value={m.invoiceActions.length} note={cash(sum(m.invoiceActions))} tone="green" onClick={() => onPick(invoiceLane)} /><Metric label="Assign Workers" value={m.workerActions.length} note="dispatch decisions" tone="blue" onClick={() => onPick(workerLane)} /><Metric label="Approve Messages" value={m.messageActions.length} note="drafts & follow-ups" tone="purple" onClick={() => onPick(messageLane)} /><Metric label="Fix Issues" value={m.issues.length} note="blocking admin" tone="red" onClick={() => onPick(issueLane)} /></section><section className="xcf-approval-lanes"><ApprovalLane title="Approve Work" eyebrow="Worker finished work" description="Review evidence, notes, photos and job value before signing off." value={m.workReview.length} note="Approval moves the job to invoice/admin." tone="amber" items={m.workReview} group={workLane} onPick={onPick} primary="Review work" /><ApprovalLane title="Approve Invoices" eyebrow="Money waiting on approval" description="Approved work, draft invoices, owing and overdue invoice actions." value={cash(sum(m.invoiceActions))} note={`${m.readyInvoice.length} jobs ready to invoice`} tone="green" items={m.invoiceActions} group={invoiceLane} onPick={onPick} primary="Review invoices" /><ApprovalLane title="Assign Workers" eyebrow="Dispatch decisions" description="Unassigned jobs and crew gaps that need a worker picked." value={m.workerActions.length} note={`${m.unassigned.length} jobs without workers`} tone="blue" items={m.workerActions} group={workerLane} onPick={onPick} primary="Assign workers" /><ApprovalLane title="Approve Messages" eyebrow="Customer communication" description="Quote follow-ups, customer updates and reminders drafted by Churvox." value={m.messageActions.length} note="Nothing sends without approval." tone="purple" items={m.messageActions} group={messageLane} onPick={onPick} primary="Review messages" /><ApprovalLane title="Fix Issues" eyebrow="Blocked admin" description="Missing details, no price, overdue money or risks stopping the next step." value={m.issues.length} note="Fix these before approval/send." tone="red" items={m.issues} group={issueLane} onPick={onPick} primary="Fix blockers" /></section><section className="xcf-field-strip"><span><small>Field pulse</small><b>{m.live.length} crew/job records live</b></span><button type="button" onClick={() => onPick(makeGroup("Field Pulse", "Live crew and active jobs. Kept secondary so approval stays first.", m.live, "cyan", "Open field pulse"))}>Open field pulse</button></section><BottomNav /></main>;
}

function Workspace({ area, m, loading, onPick }) {
  const [title, subtitle] = PAGES[area] || ["Workspace", "Simple workspace"];
  const rowsByArea = { jobs: m.jobs, dispatch: m.workerActions, clients: m.clients, quotes: m.quotes, invoices: m.invoices, team: m.crew, sms: m.messages, notifications: [...m.alerts, ...m.issues], reports: m.done, integrations: m.invoices, payroll: [...m.crew, ...m.doneJobs], automation: m.actions, settings: m.issues };
  const rows = rowsByArea[area] || m.actions;
  return <main className="xcf-shell xcf-workspace"><TopBar loading={loading} /><section className="xcf-hero"><div><p>Workspace</p><h1>{title}</h1><span>{subtitle}</span></div><aside><small>Records</small><b>{rows.length}</b><em>Tap a record to inspect, edit, approve or open the full record only when needed.</em></aside></section><section className="xcf-workspace-list">{rows.length ? rows.slice(0, 40).map((x, i) => <Row key={`${area}-${i}`} item={x} onPick={onPick} />) : <Empty />}</section><BottomNav /></main>;
}

function invoicePayloadFromPicked(picked, draft) {
  const raw = picked?.raw || {};
  const customer = firstText(raw.customer_name, raw.client_name, raw.name, raw.contact_name, picked?.title);
  const address = firstText(raw.address, raw.site_address, raw.job_address, raw.service_address, raw.location);
  const description = firstText(raw.ai_invoice_description, raw.invoice_description_draft, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes, raw.description, draft?.meta, picked?.meta, `${picked?.title || "Service work"} completed${customer ? ` for ${customer}` : ""}${address ? ` at ${address}` : ""}.`);
  const subtotal = moneyNumber(picked?.amount, raw.subtotal, raw.total, raw.amount, raw.price, raw.job_price, raw.fixed_price, raw.hourly_total);
  if (!customer) return { ok: false, error: "Need a customer name before Churvox can prepare an invoice." };
  if (!description) return { ok: false, error: "Need an invoice description before Churvox can prepare an invoice." };
  if (!subtotal) return { ok: false, error: "Need a job price or subtotal before Churvox can prepare an invoice." };
  return { ok: true, data: { client_id: firstText(raw.client_id, raw.customer_id) || null, customer_name: customer, customer_email: firstText(raw.customer_email, raw.client_email, raw.email), address, description, subtotal, gst_rate: moneyNumber(raw.gst_rate) || 15, notes: firstText(raw.invoice_notes, `Prepared by Churvox Command Floor from ${picked?.code || "work slip"}. Review before sending.`) } };
}

async function runRecordAction(action, picked, draft, api, reload) {
  if (!picked || picked.type === "action_group") return "Open a record inside the slip first.";
  const id = picked.id;
  if (!id && ["save", "approve", "reject", "invoice", "assign", "message"].includes(action)) return "This record has no saved ID yet.";
  const titlePayload = { title: draft.title, description: draft.meta, status: draft.status };
  try {
    if (picked.type === "action") {
      if (action === "approve") { const res = await api.post(`/ai-operator/actions/${id}/approve`, {}); if (apiOk(res)) { await reload(); return "AI action approved and executed."; } return `Could not approve AI action: ${apiError(res)}`; }
      if (action === "reject") { const res = await api.post(`/ai-operator/actions/${id}/reject`, {}); if (apiOk(res)) { await reload(); return "AI action rejected."; } return `Could not reject AI action: ${apiError(res)}`; }
      if (action === "message") return draft.message || firstText(picked.raw?.generated_message, picked.raw?.draft_message, "No drafted message saved for this AI action yet.");
      return "AI action is ready for approve or reject.";
    }
    if (action === "assign") {
      if (picked.type !== "job" && picked.type !== "work_review") return "Select a job before assigning a worker.";
      if (!draft.worker_id) return "Choose a worker first.";
      const res = await patchWithFallback(api, `/jobs/${id}`, { assigned_worker_id: draft.worker_id, assigned_worker_name: draft.worker_name, assigned_to: draft.worker_id, status: picked.raw?.status || "assigned" });
      if (apiOk(res)) { await reload(); return `Assigned to ${draft.worker_name || "selected worker"}.`; }
      return `Could not assign worker: ${apiError(res)}`;
    }
    if (action === "save") { const endpoint = picked.type === "invoice" ? `/invoices/${id}` : picked.type === "quote" ? `/quotes/${id}` : picked.type === "client" ? `/clients/${id}` : `/jobs/${id}`; const res = await patchWithFallback(api, endpoint, titlePayload); if (apiOk(res)) { await reload(); return "Saved in this slip."; } return `Could not save: ${apiError(res)}`; }
    if (action === "approve") { if (picked.type === "invoice") { const res = await patchWithFallback(api, `/invoices/${id}`, { status: "approved" }); if (apiOk(res)) { await reload(); return "Invoice approved."; } return `Could not approve: ${apiError(res)}`; } if (picked.type !== "job" && picked.type !== "work_review") return "Only jobs, work reviews and invoices can be approved from this slip."; const res = await patchWithFallback(api, `/jobs/${id}`, { owner_review_status: "approved", work_review_status: "approved", reviewed: true }); if (apiOk(res)) { await reload(); return "Work approved."; } return `Could not approve: ${apiError(res)}`; }
    if (action === "invoice") { if (picked.type !== "job" && picked.type !== "work_review") return "Select a job or work review item before preparing an invoice."; const payload = invoicePayloadFromPicked(picked, draft); if (!payload.ok) return payload.error; const res = await api.post("/invoices", payload.data); if (!apiOk(res)) return `Could not prepare invoice: ${apiError(res)}`; const invoiceId = recordIdFromResponse(res); if (invoiceId && id) { try { await patchWithFallback(api, `/jobs/${id}`, { draft_invoice_id: invoiceId, invoice_description_draft: payload.data.description }); } catch (_err) {} } await reload(); return invoiceId ? `Draft invoice prepared: INV ${invoiceId}. Open invoice lane to review/send.` : "Draft invoice prepared. Open invoice lane to review/send."; }
    if (action === "message") { const message = draft.message; if (!message) return "No message draft to save."; const endpoint = picked.type === "invoice" ? `/invoices/${id}` : picked.type === "quote" ? `/quotes/${id}` : picked.type === "client" ? `/clients/${id}` : `/jobs/${id}`; const res = await patchWithFallback(api, endpoint, { customer_message_draft: message, draft_message: message, last_message_draft: message }); if (apiOk(res)) { await reload(); return "Message draft saved. Nothing has been sent."; } return `Could not save message draft: ${apiError(res)}`; }
  } catch (err) { return `Action failed: ${err?.message || "unknown error"}`; }
  return "Action ready.";
}

export default function ConceptCPageExact({ area = "dashboard" }) {
  const api = useApi();
  const { get } = api;
  const { data, loading, reload } = useLive(area, get);
  const m = useMemo(() => build(data), [data]);
  const [picked, setPicked] = useState(null);
  const onAction = useCallback((action, record, draft) => runRecordAction(action, record, draft, api, reload), [api, reload]);
  return <>{area === "dashboard" ? <Dashboard m={m} loading={loading} onPick={setPicked} /> : <Workspace area={area} m={m} loading={loading} onPick={setPicked} />}<CommandFloorApprovalSlip picked={picked} onClose={() => setPicked(null)} onAction={onAction} onPick={setPicked} workers={m.crew} jobs={m.jobs} /></>;
}
