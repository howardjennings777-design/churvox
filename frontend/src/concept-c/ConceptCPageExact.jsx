import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./ConceptCPageExact.css";
import "./ConceptCFullScreenSlip.css";
import "./ConceptCWorkSlipTight.css";

const arr = (v) => Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : Array.isArray(v?.jobs) ? v.jobs : Array.isArray(v?.clients) ? v.clients : Array.isArray(v?.invoices) ? v.invoices : Array.isArray(v?.quotes) ? v.quotes : Array.isArray(v?.workers) ? v.workers : Array.isArray(v?.actions) ? v.actions : Array.isArray(v?.notifications) ? v.notifications : [];
const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const sum = (items) => items.reduce((total, item) => total + Number(item.amount || 0), 0);
const firstText = (...values) => values.map(str).find(Boolean) || "";
const pretty = (v) => str(v).replace(/_/g, " ");

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

async function patchWithFallback(api, endpoint, payload) {
  const res = await api.patch(endpoint, payload);
  if (apiOk(res)) return res;
  if (/405|method not allowed/i.test(apiError(res, "")) && typeof api.put === "function") return api.put(endpoint, payload);
  return res;
}

const detailText = (record, fallback = "") => firstText(
  record?.owner_facing_explanation,
  record?.reason,
  record?.recommendation,
  record?.what_happens,
  record?.generated_message,
  record?.description,
  record?.job_description,
  record?.service_description,
  record?.scope,
  record?.completion_notes,
  record?.worker_completion_notes,
  record?.worker_notes,
  record?.job_notes,
  record?.notes,
  record?.admin_notes,
  record?.message,
  record?.address,
  fallback
);

const workerNameOf = (worker) => firstText(worker?.raw?.name, worker?.raw?.full_name, worker?.raw?.email, worker?.title, worker?.name, "Worker");
const workerIdOf = (worker) => idOf(worker?.raw || worker) || idOf(worker);

function rawPhotoUrl(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return firstText(photo.url, photo.image_url, photo.file_url, photo.public_url, photo.photo_url, photo.thumbnail_url, photo.src, photo.path);
}

function photoLabel(photo, index) {
  if (!photo || typeof photo === "string") return `Evidence ${index + 1}`;
  return firstText(photo.label, photo.caption, photo.filename, photo.name, photo.title, `Evidence ${index + 1}`);
}

function evidencePhotos(raw = {}) {
  const buckets = [raw.photos, raw.job_photos, raw.worker_photos, raw.completion_photos, raw.photo_urls, raw.images, raw.attachments];
  const seen = new Set();
  return buckets.flatMap((bucket) => Array.isArray(bucket) ? bucket : bucket ? [bucket] : [])
    .map((photo, index) => ({ url: rawPhotoUrl(photo), label: photoLabel(photo, index), raw: photo }))
    .filter((photo) => {
      const key = photo.url || photo.label;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function evidenceText(raw = {}, fallback = "") {
  const scope = firstText(raw.ai_approval_summary, raw.description, raw.job_description, raw.service_description, raw.scope, fallback, "No job description recorded.");
  const workerNotes = firstText(raw.worker_completion_notes, raw.completion_notes, raw.worker_notes, raw.job_notes, raw.notes, "No worker notes recorded yet.");
  const price = moneyNumber(raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  const priceSource = firstText(raw.pricing_type, raw.price_type, raw.billing_type, price ? "job price" : "not set");
  const invoice = firstText(raw.invoice_number, raw.draft_invoice_id, raw.invoice_id, raw.invoiced ? "Invoice already linked" : "No invoice linked yet");
  const photos = evidencePhotos(raw).length || Number(raw.photo_count || 0);
  const started = firstText(raw.started_at, raw.start_time, raw.work_started_at, "No start time recorded");
  const finished = firstText(raw.completed_at, raw.finished_at, raw.work_completed_at, "No completion time recorded");

  return [
    `Scope: ${scope}`,
    `Worker notes: ${workerNotes}`,
    `Timing: ${started} → ${finished}`,
    `Evidence: ${photos ? `${photos} photo${photos === 1 ? "" : "s"}` : "No photos recorded"}`,
    `Price source: ${price ? `${cash(price)} from ${priceSource}` : "No price set"}`,
    `Invoice status: ${invoice}`,
  ].join("\n");
}

function messageDraftFromPicked(picked, draft = {}) {
  const raw = picked?.raw || {};
  const type = picked?.type || "record";
  const customer = firstText(raw.customer_name, raw.client_name, raw.name, picked?.title, "there");
  const site = firstText(raw.address, raw.site_address, raw.job_address, raw.location);
  const description = firstText(
    raw.generated_message,
    raw.draft_message,
    raw.customer_message_draft,
    raw.last_message_draft,
    raw.message,
    raw.completion_notes,
    raw.worker_completion_notes,
    raw.worker_notes,
    raw.job_notes,
    raw.notes,
    raw.description,
    draft?.meta,
    picked?.meta
  );
  const amount = moneyNumber(picked?.amount, raw.total, raw.amount, raw.balance_due, raw.subtotal, raw.price, raw.job_price, raw.fixed_price);
  const siteLine = site ? ` at ${site}` : "";

  if (type === "invoice") return `Hi ${customer},\n\nYour invoice is ready for review${amount ? ` for ${cash(amount)}` : ""}.\n\n${description || "This covers the completed service work."}\n\nThanks,\nChurvox`;
  if (type === "quote") return `Hi ${customer},\n\nYour quote is ready for review${amount ? ` for ${cash(amount)}` : ""}.\n\n${description || "Please check the scope and let us know if you would like to go ahead."}\n\nThanks,\nChurvox`;
  if (type === "action") return firstText(raw.generated_message, raw.draft_message, raw.recommendation, raw.owner_facing_explanation, raw.reason, "AI prepared this action. Review the wording before sending anything to the customer.");
  return `Hi ${customer},\n\nQuick update on your job${siteLine}.\n\n${description || "The work has been reviewed and the next admin step is being prepared."}\n\nThanks,\nChurvox`;
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

function approvalBrief(picked, draft) {
  const raw = picked?.raw || {};
  const type = picked?.type || "record";
  if (type === "action") {
    const reason = firstText(raw.owner_facing_explanation, raw.reason, raw.subtitle, raw.description, raw.message, picked?.meta, "AI prepared this action for owner review.");
    const happens = firstText(raw.what_happens, raw.outcome, raw.result, "Approving runs this AI Operator action using the saved approval endpoint.");
    const recommendation = firstText(raw.recommendation, raw.generated_message, raw.draft_message, "Review the details, then approve or reject.");
    return { summary: "AI prepared this action. Check the reason, risk and what will happen before approving.", description: `${reason}${recommendation && recommendation !== reason ? `\n\nRecommendation: ${recommendation}` : ""}`, outcome: happens, facts: [["Risk", pretty(raw.risk || raw.risk_level || "medium")], ["Action", pretty(raw.action_type || raw.type || "AI action")], ["Group", pretty(raw.group || "general")], ["Status", pretty(raw.status || picked?.state || "pending")], ["Related", pretty(raw.related_type || raw.target_type || "record")], ["Created", firstText(raw.created_at, raw.updated_at, "Not recorded")]] };
  }

  const customer = firstText(raw.client_name, raw.customer_name, raw.name, raw.email, picked?.title, "Customer not recorded");
  const site = firstText(raw.address, raw.site_address, raw.job_address, raw.location, "No site address recorded");
  const assigned = firstText(raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, raw.assigned_worker_email, raw.assigned_worker_id, "Not assigned yet");
  const finished = firstText(raw.completed_at, raw.finished_at, raw.updated_at, raw.date, "No finish time recorded");
  const valueNumber = moneyNumber(picked?.amount, raw.total, raw.amount, raw.price, raw.job_price, raw.fixed_price);
  const value = valueNumber > 0 ? cash(valueNumber) : "No price set";
  const status = picked?.state || raw.status || "Review";
  const invoiceStatus = firstText(raw.invoice_number, raw.draft_invoice_id, raw.invoice_id, raw.invoiced ? "Linked" : "Not linked");
  const summary = type === "invoice" ? `Approve this invoice for ${customer}. Check the description, value and status before sending or syncing.` : type === "quote" ? `Approve or review this quote for ${customer}. Check scope, value and customer detail before follow-up.` : type === "client" ? "Review this customer record and confirm the missing or changed details are correct." : "Approve this job only if the work evidence below matches what was done on site.";
  const outcome = type === "invoice" ? "Approval marks the invoice as approved. Sending/payment steps stay separate." : type === "quote" ? "Approval confirms the quote is ready for customer follow-up." : `Approval marks this work as reviewed. Invoice status: ${invoiceStatus}.`;

  return { summary, description: type === "job" || type === "work_review" ? evidenceText(raw, draft?.meta || picked?.meta) : detailText(raw, draft?.meta || picked?.meta || "No detail recorded."), outcome, facts: [["Customer", customer], ["Site", site], ["Assigned", assigned], ["Value", value], ["Status", status], ["Last update", finished]] };
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
  dashboard: ["Command Floor", "Churvox does the admin. You approve."], jobs: ["Jobs", "Open work, completed work and job records."], dispatch: ["Dispatch", "Assign workers and close crew gaps."], clients: ["Clients", "Customer records and missing details."], quotes: ["Quotes", "Quote follow-up and quote records."], invoices: ["Invoices", "Invoice control and cashflow."], team: ["Live Crew", "Crew, roles and worker status."], sms: ["Messages", "Customer communication."], notifications: ["Issues", "Risks, alerts and updates."], reports: ["Reports", "Completed work and money records."], integrations: ["Sync", "Connected tools and invoice sync."], payroll: ["Payroll", "Crew summaries and pay review."], automation: ["Automation", "Rules and AI prepared actions."], settings: ["Settings", "Business setup."],
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
    return { ...base, code: record.job_number || record.reference || `JOB-${id.slice(-4) || "000"}`, title: record.title || record.job_name || record.client_name || "Job", meta: detailText(record, record.client_name || "Job record"), state: !assigned ? "Unassigned" : record.status || "Job", amount: moneyNumber(record.price, record.job_price, record.fixed_price, record.total, record.amount, record.subtotal), href: id ? `/jobs/${id}` : "/jobs" };
  }
  if (type === "invoice") return { ...base, code: record.invoice_number || `INV-${id.slice(-4) || "000"}`, title: record.customer_name || record.client_name || "Invoice", meta: detailText(record, record.email || "Invoice record"), state: record.status || "Invoice", amount: record.balance_due || record.balance || record.total || record.amount || 0, href: id ? `/invoices/${id}` : "/invoices" };
  if (type === "quote") return { ...base, code: record.quote_number || `QTE-${id.slice(-4) || "000"}`, title: record.title || record.customer_name || record.client_name || "Quote", meta: detailText(record, "Quote record"), state: record.status || "Quote", amount: record.total || record.amount || record.price || 0, href: id ? `/quotes/${id}` : "/quotes" };
  if (type === "client") return { ...base, code: "CLIENT", title: record.name || record.client_name || record.customer_name || "Client", meta: record.email || record.phone || record.address || "Client record", state: record.email && record.phone ? "Good" : "Missing details", href: id ? `/clients/${id}` : "/clients" };
  if (type === "worker") {
    const active = record.current_job_title || record.active_job_title || record.current_job_id || record.active_job_id;
    return { ...base, code: "CREW", title: record.name || record.full_name || record.email || "Worker", meta: active ? `On site · ${active}` : (record.role || record.email || "Worker record"), state: active ? "On job" : "Available", href: "/team" };
  }
  return { ...base, code: type === "alert" ? "ALERT" : "AI ACTION", title: record.title || record.summary || record.subject || "Prepared action", meta: detailText(record, "Prepared for review."), state: record.status || "Review", href: record.target_url || record.url || "#" };
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
  return <header className="xcf-topbar"><Link className="xcf-brand" to="/dashboard"><i>CV</i><span><b>Churvox</b><small>AI Operator</small></span></Link><div className="xcf-search">Search jobs, clients, invoices...</div><nav><Link to="/ai-operator/approvals">Take Action</Link><Link to="/jobs/new">+ New</Link><Link to="/invoices">Money</Link></nav><strong className={loading ? "syncing" : "live"}>{loading ? "Syncing" : "Live"}</strong></header>;
}
function BottomNav() {
  const links = [["/dashboard", "Command"], ["/jobs", "Jobs"], ["/team", "Crew"], ["/clients", "Clients"], ["/invoices", "Money"], ["/quotes", "Quotes"], ["/dispatch", "Dispatch"], ["/notifications", "Issues"], ["/reports", "Reports"], ["/settings", "Settings"]];
  return <nav className="xcf-bottom-nav">{links.map(([href, label]) => <Link key={href} to={href}>{label}</Link>)}</nav>;
}
function Metric({ label, value, note, tone, onClick }) { return <button className={`xcf-metric ${tone}`} type="button" onClick={onClick}><i /><span>{label}</span><b>{value}</b><small>{note}</small></button>; }
function ActionBox({ title, value, note, tone, onClick }) { return <button className={`xcf-action-box ${tone}`} type="button" onClick={onClick}><span>{title}</span><b>{value}</b><small>{note}</small></button>; }
function Row({ item: x, onPick }) { return <button className="xcf-row" type="button" onClick={() => onPick(x)}><i /><span><b>{x.title}</b><small>{x.code} · {x.meta}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>; }
function Card({ title, eyebrow, value, children, onOpen, className = "" }) { return <section className={`xcf-card ${className}`}><header><span><small>{eyebrow}</small><b>{title}</b></span>{value !== undefined && <strong>{value}</strong>}{onOpen && <button type="button" onClick={onOpen}>Open slip</button>}</header>{children}</section>; }
function Empty({ text = "Clear right now." }) { return <div className="xcf-empty">{text}</div>; }
function makeGroup(title, subtitle, items, tone = "blue") { return { type: "action_group", title, code: "ACTION SLIP", state: `${items.length} items`, meta: subtitle, items, tone, amount: sum(items), href: "#" }; }

function ActionHub({ m, onPick }) {
  const urgent = [...m.bill, ...m.unassigned, ...m.workReview, ...m.followUp, ...m.issues];
  const groups = { invoices: makeGroup("Invoices", "Ready-to-bill work and invoice records in one slip.", m.bill, "green"), assign: makeGroup("Assign Worker", "Unassigned work and dispatch gaps ready to assign.", m.unassigned, "blue"), review: makeGroup("Review Work", "Finished jobs waiting for owner approval.", m.workReview, "amber"), follow: makeGroup("Customer Follow-up", "Customer reminders, quote follow-ups and prepared messages.", m.followUp, "purple"), issues: makeGroup("Fix Issues", "Risks, missing details and items needing attention.", m.issues, "red") };
  return <section className="xcf-card xcf-action-hub-card"><header><span><small>Tap once. Work in the slip.</small><b>Take Action</b></span><strong>{urgent.length}</strong><button type="button" onClick={() => onPick(makeGroup("All Actions", "Everything needing owner attention.", urgent, "purple"))}>Open slip</button></header><div className="xcf-action-box-grid"><ActionBox title="Invoices" value={m.bill.length} note="ready to send" tone="green" onClick={() => onPick(groups.invoices)} /><ActionBox title="Assign Worker" value={m.unassigned.length} note="unassigned jobs" tone="blue" onClick={() => onPick(groups.assign)} /><ActionBox title="Review Work" value={m.workReview.length} note="awaiting approval" tone="amber" onClick={() => onPick(groups.review)} /><ActionBox title="Customer Follow-up" value={m.followUp.length} note="messages & reminders" tone="purple" onClick={() => onPick(groups.follow)} /><ActionBox title="Fix Issues" value={m.issues.length} note="need attention" tone="red" onClick={() => onPick(groups.issues)} /></div><div className="xcf-list xcf-urgent-list">{urgent.length ? urgent.slice(0, 5).map((x, i) => <Row key={`urgent-${i}`} item={x} onPick={onPick} />) : <Empty text="No priority actions waiting." />}</div></section>;
}

function Dashboard({ m, loading, onPick }) {
  const urgent = [...m.bill, ...m.unassigned, ...m.workReview, ...m.followUp, ...m.issues];
  const nextAction = m.workReview.length ? "Review finished work → prepare invoices" : m.bill.length ? "Prepare invoices" : m.unassigned.length ? "Assign workers" : m.issues.length ? "Fix issues" : "All clear";
  return <main className="xcf-shell" data-version="CHURVOX_COMMAND_FLOOR_PHOTO_EVIDENCE_VIEWER_20260526"><TopBar loading={loading} /><section className="xcf-hero"><div><p>AI OPERATOR COMMAND FLOOR</p><h1>Command Floor</h1><span>Churvox does the admin. You approve.</span></div><aside><i>⚡</i><small>Next Best Action</small><b>{nextAction}</b><em>{m.bill.length + m.workReview.length} jobs are ready to move toward invoice</em></aside></section><section className="xcf-metrics"><Metric label="Ready to Bill" value={cash(sum(m.bill))} note={`${m.bill.length} invoices`} tone="green" onClick={() => onPick(makeGroup("Ready to Bill", "Approved work ready for invoice action.", m.bill, "green"))} /><Metric label="Unassigned Jobs" value={m.unassigned.length} note="needs workers" tone="blue" onClick={() => onPick(makeGroup("Unassigned Jobs", "Jobs needing worker assignment.", m.unassigned, "blue"))} /><Metric label="Work Review" value={m.workReview.length} note="awaiting approval" tone="amber" onClick={() => onPick(makeGroup("Work Review", "Finished jobs waiting for approval.", m.workReview, "amber"))} /><Metric label="Take Action" value={urgent.length} note="items need attention" tone="purple" onClick={() => onPick(makeGroup("Take Action", "All owner actions in one slip.", urgent, "purple"))} /><Metric label="Team On Jobs" value={m.live.length} note="field activity" tone="cyan" onClick={() => onPick(makeGroup("Team On Jobs", "Live crew and active field activity.", m.live, "cyan"))} /><Metric label="Completed This Week" value={m.doneJobs.length} note="jobs closed" tone="green" onClick={() => onPick(makeGroup("Completed This Week", "Completed job records.", m.doneJobs, "green"))} /></section><section className="xcf-main-grid"><ActionHub m={m} onPick={onPick} /><Card title="Live Crew" eyebrow="Real-time crew activity in the field" value={m.live.length} onOpen={() => onPick(makeGroup("Live Crew", "Crew, job status, GPS and evidence in one place.", m.live, "cyan"))} className="xcf-live-card"><div className="xcf-map-card"><span>Owner crew map</span><b>Timers • GPS • photos • status</b></div><div className="xcf-live-stats"><i>{m.live.length}<small>Crew on jobs</small></i><i>{m.active.length}<small>Active jobs</small></i><i>{m.unassigned.length}<small>Need worker</small></i></div><div className="xcf-list">{m.live.length ? m.live.slice(0, 4).map((x, i) => <Row key={`live-${i}`} item={x} onPick={onPick} />) : <Empty text="No crew on jobs right now." />}</div></Card><Card title="Money Desk" eyebrow="Your cashflow at a glance" value={cash(sum(m.money))} onOpen={() => onPick(makeGroup("Money Desk", "Ready-to-bill, owing and overdue work in one slip.", m.money, "green"))} className="xcf-money-card"><div className="xcf-money-hero"><span>Ready to bill</span><b>{cash(sum(m.bill))}</b><small>{m.bill.length} approved jobs</small></div><div className="xcf-money-queue"><p><span>Invoice Queue</span><b>{m.bill.length}</b><em>{cash(sum(m.bill))}</em></p><p><span>Overdue</span><b>{m.overdue.length}</b><em>{cash(sum(m.overdue))}</em></p><p><span>Owing</span><b>{m.owing.length}</b><em>{cash(sum(m.owing))}</em></p></div></Card><Card title="Work Review" eyebrow="Jobs waiting for your approval" value={m.workReview.length} onOpen={() => onPick(makeGroup("Work Review", "Approve finished work without leaving the command floor.", m.workReview, "amber"))} className="xcf-review-card"><div className="xcf-list">{m.workReview.length ? m.workReview.slice(0, 6).map((x, i) => <Row key={`review-${i}`} item={x} onPick={onPick} />) : <Empty text="No finished jobs waiting for review." />}</div></Card></section><BottomNav /></main>;
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

function PhotoEvidencePanel({ photos, preview, onPreview }) {
  if (!photos.length) return null;
  const active = preview || photos[0];
  return <section className="xcf-photo-evidence"><header><small>Site evidence</small><b>{photos.length} photo{photos.length === 1 ? "" : "s"}</b></header><div className="xcf-photo-grid">{photos.slice(0, 8).map((photo, index) => <button key={`${photo.url || photo.label}-${index}`} type="button" onClick={() => onPreview(photo)} className={active?.url === photo.url ? "active" : ""}>{photo.url ? <img src={photo.url} alt={photo.label} loading="lazy" /> : <span>Photo</span>}<em>{photo.label}</em></button>)}</div>{active && <div className="xcf-photo-preview">{active.url ? <img src={active.url} alt={active.label} /> : <span>No image URL saved</span>}<p>{active.label}</p></div>}</section>;
}

function actionWorked(msg) {
  return !/^(could not|action failed|need |select |choose |no message|this record|open a record)/i.test(str(msg));
}

function patchPickedAfterAction(picked, action, draft, msg) {
  if (!actionWorked(msg)) return null;
  const raw = { ...(picked?.raw || {}) };
  const next = { ...picked, raw };
  if (action === "save") { raw.title = draft.title; raw.description = draft.meta; raw.status = draft.status; next.title = draft.title || picked.title; next.meta = draft.meta || picked.meta; next.state = draft.status || picked.state; }
  if (action === "approve") { raw.status = picked.type === "invoice" ? "approved" : raw.status; raw.owner_review_status = "approved"; raw.work_review_status = "approved"; raw.reviewed = true; next.status = "approved"; next.state = picked.type === "invoice" ? "approved" : "Approved"; }
  if (action === "assign") { raw.assigned_worker_id = draft.worker_id; raw.assigned_worker_name = draft.worker_name; raw.assigned_to = draft.worker_id; raw.status = raw.status || "assigned"; next.state = raw.status || "assigned"; }
  if (action === "message") { raw.customer_message_draft = draft.message; raw.draft_message = draft.message; raw.last_message_draft = draft.message; }
  if (action === "invoice") { const invoiceId = firstText((msg.match(/INV\s+([^\.\s]+)/i) || [])[1], raw.draft_invoice_id); raw.draft_invoice_id = invoiceId || raw.draft_invoice_id || "prepared"; raw.invoice_description_draft = draft.meta || raw.invoice_description_draft; next.state = picked.state === "Needs review" ? "Invoice prepared" : picked.state; }
  if (picked.type === "action" && (action === "approve" || action === "reject")) { raw.status = action === "approve" ? "approved" : "rejected"; next.status = raw.status; next.state = raw.status; }
  return next;
}

function DetailDrawer({ picked, onClose, onAction, onPick, workers = [] }) {
  const [localPicked, setLocalPicked] = useState(null);
  const [draft, setDraft] = useState({ title: "", meta: "", status: "", worker_id: "", worker_name: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState(null);

  useEffect(() => {
    setLocalPicked(picked);
    const raw = picked?.raw || {};
    const currentWorkerId = firstText(raw.assigned_worker_id, raw.worker_id, raw.assigned_to);
    const currentWorkerName = firstText(raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, raw.assigned_worker_email);
    const nextMeta = detailText(raw, picked?.meta || "");
    const photos = evidencePhotos(raw);
    setDraft({ title: picked?.title || "", meta: nextMeta, status: picked?.state || "", worker_id: currentWorkerId, worker_name: currentWorkerName, message: messageDraftFromPicked(picked, { meta: nextMeta }) });
    setPreviewPhoto(photos[0] || null);
    setNotice("");
    setBusy(false);
  }, [picked]);

  if (!picked) return null;
  const active = localPicked || picked;
  const isGroup = active.type === "action_group";
  const isAction = active.type === "action";
  const isJobLike = active.type === "job" || active.type === "work_review";
  const items = active.items || [];
  const brief = isGroup ? null : approvalBrief(active, draft);
  const photos = isJobLike ? evidencePhotos(active.raw) : [];

  const run = async (action) => {
    setBusy(true);
    setNotice("");
    const msg = await onAction(action, active, draft);
    const patched = patchPickedAfterAction(active, action, draft, msg);
    if (patched) setLocalPicked(patched);
    setNotice(msg);
    setBusy(false);
  };

  const changeWorker = (value) => {
    const selected = workers.find((worker) => workerIdOf(worker) === value);
    setDraft((d) => ({ ...d, worker_id: value, worker_name: selected ? workerNameOf(selected) : "" }));
  };

  return <aside className={`xcf-drawer xcf-drawer-${isGroup ? "group" : "record"}`}>
    <button className="xcf-close" type="button" onClick={onClose}>Close</button>
    <p>{active.code || active.type}</p>
    <h2>{active.title}</h2>
    <span>{isGroup ? active.meta : brief.summary}</span>
    {isGroup ? <div className="xcf-slip-list">{items.length ? items.slice(0, 12).map((x, i) => <button className="xcf-slip-row" type="button" key={`${x.type}-${x.id}-${i}`} onClick={() => onPick(x)}><b>{x.title}</b><small>{x.code} · {detailText(x.raw || {}, x.meta)}</small><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>) : <Empty text="Nothing waiting in this slip." />}</div> : <>
      <dl><div><dt>Status</dt><dd>{active.state}</dd></div><div><dt>Value</dt><dd>{Number(active.amount || 0) > 0 ? cash(active.amount) : "—"}</dd></div><div><dt>Code</dt><dd>{active.code}</dd></div></dl>
      <section className="xcf-approval-brief"><header><small>{isAction ? "AI operator action" : isJobLike ? "AI evidence brief" : "AI approval brief"}</small><b>{isAction ? "Approve or reject this action" : isJobLike ? "Evidence before approval" : "What you are approving"}</b></header><p>{brief.description}</p><div>{brief.facts.map(([label, value]) => <span key={label}><small>{label}</small><b>{value}</b></span>)}</div><strong>{brief.outcome}</strong></section>
      <PhotoEvidencePanel photos={photos} preview={previewPhoto} onPreview={setPreviewPhoto} />
      <section className="xcf-message-draft"><header><small>Customer message</small><b>Draft before sending</b></header><textarea value={draft.message} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} /><p>No message sends from here yet. This stays owner-editable and approval-first.</p></section>
      {isJobLike && <section className="xcf-worker-assign"><header><small>Dispatch</small><b>Assign worker in this slip</b></header><select value={draft.worker_id} onChange={(e) => changeWorker(e.target.value)}><option value="">Choose worker</option>{workers.map((worker) => { const wid = workerIdOf(worker); return <option key={wid || worker.title} value={wid}>{workerNameOf(worker)}{worker.state ? ` · ${worker.state}` : ""}</option>; })}</select><p>{draft.worker_name ? `Selected: ${draft.worker_name}` : workers.length ? "Pick a worker, then tap Assign worker." : "No workers loaded yet."}</p></section>}
      <EditableField label="Title" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} />
      <EditableField label={isAction ? "AI reason / drafted message" : "Approval description / edit before saving"} value={draft.meta} onChange={(v) => setDraft((d) => ({ ...d, meta: v }))} textarea />
      <EditableField label="Status" value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} />
    </>}
    <div className="xcf-drawer-actions">{isGroup ? <button className="xcf-action-primary" type="button" disabled={!items.length} onClick={() => items[0] && onPick(items[0])}>Open first item</button> : <>{!isAction && <button className="xcf-action-muted" type="button" disabled={busy} onClick={() => run("save")}>Save changes</button>}<button className="xcf-action-primary" type="button" disabled={busy} onClick={() => run("approve")}>{isAction ? "Approve & execute" : "Approve work"}</button>{isAction && <button className="xcf-action-danger" type="button" disabled={busy} onClick={() => run("reject")}>Reject action</button>}{isJobLike && <button type="button" disabled={busy || !draft.worker_id} onClick={() => run("assign")}>Assign worker</button>}{!isAction && <button type="button" disabled={busy} onClick={() => run("invoice")}>Prepare invoice</button>}<button type="button" disabled={busy} onClick={() => run("message")}>Save message draft</button>{active.href && active.href !== "#" && <Link to={active.href}>Full page</Link>}</>}</div>
    {notice && <strong className="xcf-drawer-notice">{notice}</strong>}
  </aside>;
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
    if (action === "approve") { if (picked.type === "invoice") { const res = await patchWithFallback(api, `/invoices/${id}`, { status: "approved" }); if (apiOk(res)) { await reload(); return "Invoice approved."; } return `Could not approve: ${apiError(res)}`; } const res = await patchWithFallback(api, `/jobs/${id}`, { owner_review_status: "approved", work_review_status: "approved", reviewed: true }); if (apiOk(res)) { await reload(); return "Work approved."; } return `Could not approve: ${apiError(res)}`; }
    if (action === "invoice") {
      if (picked.type !== "job" && picked.type !== "work_review") return "Select a job or work review item before preparing an invoice.";
      const payload = invoicePayloadFromPicked(picked, draft);
      if (!payload.ok) return payload.error;
      const res = await api.post("/invoices", payload.data);
      if (!apiOk(res)) return `Could not prepare invoice: ${apiError(res)}`;
      const invoiceId = recordIdFromResponse(res);
      if (invoiceId && id) { try { await patchWithFallback(api, `/jobs/${id}`, { draft_invoice_id: invoiceId, invoice_description_draft: payload.data.description }); } catch (_err) {} }
      await reload();
      return invoiceId ? `Draft invoice prepared: INV ${invoiceId}. Open Money Desk or Full page to review/send.` : "Draft invoice prepared. Open Money Desk to review/send.";
    }
    if (action === "message") {
      const message = draft.message || messageDraftFromPicked(picked, draft);
      if (!message) return "No message draft to save.";
      const endpoint = picked.type === "invoice" ? `/invoices/${id}` : picked.type === "quote" ? `/quotes/${id}` : picked.type === "client" ? `/clients/${id}` : `/jobs/${id}`;
      const res = await patchWithFallback(api, endpoint, { customer_message_draft: message, draft_message: message, last_message_draft: message });
      if (apiOk(res)) { await reload(); return "Message draft saved. Nothing has been sent."; }
      return `Could not save message draft: ${apiError(res)}`;
    }
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
  return <>{area === "dashboard" ? <Dashboard m={m} loading={loading} onPick={setPicked} /> : <Workspace area={area} m={m} loading={loading} onPick={setPicked} />}<DetailDrawer picked={picked} onClose={() => setPicked(null)} onAction={onAction} onPick={setPicked} workers={m.crew} /></>;
}
