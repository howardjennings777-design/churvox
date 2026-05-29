// CHURVOX_CLEAN_WORK_SLIP_REBUILD_20260529
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CommandFloorApprovalSlipCleanRebuild.css";

const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const firstText = (...values) => values.map(str).find(Boolean) || "";
const hasText = (v) => Boolean(str(v));
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const isGenericCustomer = (v) => ["customer", "client", "there"].includes(low(v));

const SERVICE_OPTIONS = ["Service work", "Lawn care", "Landscaping", "Cleaning", "Handyman", "Painting", "Plumbing", "Electrical", "Pest control", "Gardening", "Other"];
const STATUS_OPTIONS = ["Needs approval", "Assigned", "Scheduled", "In progress", "Paused", "Completed", "Approved", "Cancelled"];
const PRICING_OPTIONS = ["Needs price", "Fixed price", "Hourly", "Fixed + extras", "Hourly + extras"];
const INVOICE_STATUS_OPTIONS = ["Draft ready", "Not started", "Needs price", "Ready to send", "Sent", "Paid", "Do not invoice"];

function moneyNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function detailText(record, fallback = "") {
  return firstText(record?.owner_facing_explanation, record?.reason, record?.recommendation, record?.what_happens, record?.generated_message, record?.description, record?.job_description, record?.service_description, record?.scope, record?.completion_notes, record?.worker_completion_notes, record?.worker_notes, record?.job_notes, record?.notes, record?.admin_notes, record?.message, record?.address, fallback);
}

function photoUrl(photo) {
  if (!photo) return "";
  if (typeof photo === "string") return photo;
  return firstText(photo.url, photo.image_url, photo.file_url, photo.public_url, photo.photo_url, photo.thumbnail_url, photo.src, photo.path);
}

function evidencePhotos(raw = {}) {
  const seen = new Set();
  return [raw.photos, raw.job_photos, raw.worker_photos, raw.completion_photos, raw.photo_urls, raw.images, raw.attachments]
    .flatMap((bucket) => (Array.isArray(bucket) ? bucket : bucket ? [bucket] : []))
    .map((photo, index) => ({
      url: photoUrl(photo),
      label: typeof photo === "string" ? `Evidence ${index + 1}` : firstText(photo.label, photo.caption, photo.filename, photo.name, photo.title, `Evidence ${index + 1}`),
    }))
    .filter((photo) => {
      const key = photo.url || photo.label;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function rawOf(worker) { return worker?.raw || worker || {}; }
function workerNameOf(worker) { const raw = rawOf(worker); return firstText(raw.name, raw.full_name, raw.email, worker?.title, worker?.name, "Worker"); }
function workerIdOf(worker) { return idOf(rawOf(worker)) || idOf(worker); }
function workerRoleOf(worker) { const raw = rawOf(worker); return low(raw.role || raw.position || raw.type || worker?.meta); }
function workerAreaOf(worker) { const raw = rawOf(worker); return low(raw.region || raw.area || raw.suburb || raw.zone || raw.location); }
function jobAreaOf(job) { const raw = job?.raw || job || {}; return low(raw.region || raw.area || raw.suburb || raw.zone || raw.address || raw.site_address || raw.job_address || raw.location); }
function assignedWorkerIdOf(job) { const raw = job?.raw || job || {}; return firstText(raw.assigned_worker_id, raw.worker_id, raw.assigned_to, raw.assigned_user_id); }
function assignedWorkerNameOf(job) { const raw = job?.raw || job || {}; return firstText(raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, raw.assigned_worker_email); }
function isOpenJob(job) { const s = low((job?.raw || job || {}).status || job?.status); return !["completed", "complete", "done", "cancelled", "canceled", "paid"].includes(s); }

function isWorkerBlocked(worker) {
  const raw = rawOf(worker);
  const status = low(raw.status || raw.availability || raw.active_status || worker?.state);
  const role = workerRoleOf(worker);
  if (raw.disabled || raw.archived || raw.is_active === false || raw.active === false) return "worker is inactive";
  if (["inactive", "disabled", "unavailable", "away", "off", "leave", "blocked"].some((x) => status.includes(x))) return status || "worker unavailable";
  if (["payroll", "office", "admin", "owner", "accountant"].some((x) => role.includes(x))) return `${role || "admin"} role is not a field-worker role`;
  return "";
}

function workerHasActiveConflict(worker, jobs = [], picked) {
  const wid = workerIdOf(worker);
  const wname = low(workerNameOf(worker));
  const raw = rawOf(worker);
  const activeJob = firstText(raw.current_job_id, raw.active_job_id, raw.current_job_title, raw.active_job_title);
  if (activeJob) return `already active on ${activeJob}`;
  const conflicts = (jobs || []).filter((job) => {
    if (!job || job.id === picked?.id) return false;
    if (!isOpenJob(job)) return false;
    const jid = assignedWorkerIdOf(job);
    const jname = low(assignedWorkerNameOf(job));
    return Boolean((wid && jid && wid === jid) || (wname && jname && wname === jname));
  });
  return conflicts.length ? `already assigned to ${conflicts.length} open job${conflicts.length === 1 ? "" : "s"}` : "";
}

function recommendWorkerForJob(picked, workers = [], jobs = []) {
  const candidates = (workers || []).filter(Boolean).map((worker) => {
    const blocked = isWorkerBlocked(worker);
    const conflict = blocked ? "" : workerHasActiveConflict(worker, jobs, picked);
    const role = workerRoleOf(worker);
    const workerArea = workerAreaOf(worker);
    const jobArea = jobAreaOf(picked);
    const reasons = [];
    let score = 0;
    if (blocked) return { worker, score: -999, reasons: [blocked] };
    if (conflict) return { worker, score: -500, reasons: [conflict] };
    score += 50; reasons.push("no active conflict found");
    if (workerArea && jobArea && (jobArea.includes(workerArea) || workerArea.includes(jobArea))) { score += 25; reasons.push("area match"); }
    if (role.includes("worker") || role.includes("field") || role.includes("manager")) { score += 12; reasons.push(`${role || "field"} role can take jobs`); }
    if (low(worker?.state).includes("available") || low(rawOf(worker).availability).includes("available")) { score += 10; reasons.push("marked available"); }
    return { worker, score, reasons };
  }).sort((a, b) => b.score - a.score);
  const best = candidates.find((c) => c.score > 0) || null;
  return { best, summary: best ? `${workerNameOf(best.worker)} is recommended because ${best.reasons.join(", ")}.` : "No conflict-free field worker was found from the loaded team list." };
}

function pad2(n) { return String(n).padStart(2, "0"); }
function localDateTimeValue(date) { return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`; }
function quickScheduleValue(kind) {
  const d = new Date();
  if (kind === "none") return "";
  if (kind === "today") d.setHours(9, 0, 0, 0);
  if (kind === "afternoon") d.setHours(13, 0, 0, 0);
  if (kind === "tomorrow") { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
  if (kind === "next_week") { d.setDate(d.getDate() + 7); d.setHours(9, 0, 0, 0); }
  return localDateTimeValue(d);
}
function isDateTimeLocal(v) { return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str(v)); }

function messageDraftFromPicked(picked, draft = {}) {
  const raw = picked?.raw || {};
  const customer = firstText(draft.customer_name, raw.customer_name, raw.client_name, raw.name, picked?.title, "there");
  const site = firstText(draft.site_address, raw.address, raw.site_address, raw.job_address, raw.location);
  const price = moneyNumber(draft.amount, picked?.amount, raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  if (picked?.type === "invoice") return `Hi ${customer},\n\nYour invoice is ready for review.\n\n${draft?.meta || "This covers the completed service work."}\n\nThanks,\nChurvox`;
  if (picked?.type === "quote") return `Hi ${customer},\n\nYour quote is ready for review.\n\n${draft?.meta || "Please check the scope and let us know if you would like to go ahead."}\n\nThanks,\nChurvox`;
  if (picked?.type === "action") return firstText(raw.generated_message, raw.draft_message, raw.recommendation, raw.owner_facing_explanation, raw.reason, "AI prepared this action. Review before approving.");
  return firstText(draft.message, raw.customer_message_draft, raw.draft_message, raw.last_message_draft, `Hi ${customer},\n\nYour job${site ? ` at ${site}` : ""} has been completed. We have reviewed the work${price ? ` and prepared your invoice for ${cash(price)}` : " and prepared the next admin step"}.\n\nPlease let us know if you need anything else.`);
}

function editableDraftFromPicked(picked, workers, jobs) {
  const raw = picked?.raw || {};
  const isJob = picked?.type === "job" || picked?.type === "work_review";
  const rec = isJob ? recommendWorkerForJob(picked, workers, jobs) : null;
  const currentWorkerId = firstText(raw.assigned_worker_id, raw.worker_id, raw.assigned_to);
  const currentWorkerName = firstText(raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, raw.assigned_worker_email);
  const customer = firstText(raw.client_name, raw.customer_name, raw.name, picked?.title, "Customer");
  const site = firstText(raw.address, raw.site_address, raw.job_address, raw.location, "");
  const price = moneyNumber(picked?.amount, raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  const title = firstText(raw.title, raw.job_name, `${customer} ${firstText(raw.service_type, raw.job_type, raw.category, "Service")}`);
  const description = firstText(raw.ai_approval_summary, raw.approval_description, raw.invoice_description_draft, raw.description, raw.job_description, raw.service_description, raw.scope, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes, `${customer} job${site ? ` at ${site}` : ""} is ready for owner review.${price ? ` Final job amount confirmed at ${cash(price)}.` : " Price still needs confirmation."}`);
  const recommendedId = rec?.best ? workerIdOf(rec.best.worker) : "";
  const recommendedName = rec?.best ? workerNameOf(rec.best.worker) : "";
  const draftBase = { customer_name: customer, site_address: site, amount: price, meta: description };
  return {
    title,
    customer_name: customer,
    site_address: site,
    service_type: firstText(raw.service_type, raw.job_type, raw.trade, raw.category, "Service work"),
    scheduled: firstText(raw.scheduled_date, raw.start_time, raw.due_date, raw.date, ""),
    status: picked?.state || raw.status || "Needs approval",
    meta: description,
    pricing_type: firstText(raw.pricing_type, raw.price_type, price ? "Fixed price" : "Needs price"),
    amount: price ? String(price) : "",
    worker_id: currentWorkerId || recommendedId,
    worker_name: currentWorkerName || recommendedName,
    worker_notes: firstText(raw.worker_completion_notes, raw.completion_notes, raw.worker_notes, raw.job_notes, raw.notes, ""),
    invoice_status: firstText(raw.invoice_number, raw.draft_invoice_id, raw.invoice_id, raw.invoiced ? "Draft ready" : "", "Draft ready"),
    invoice_description: firstText(raw.ai_invoice_description, raw.invoice_description_draft, description),
    message: messageDraftFromPicked(picked, draftBase),
  };
}

function actionWorked(msg) { return !/^(could not|action failed|need |select |choose |no message|this record|open a record|only jobs)/i.test(str(msg)); }
function patchPickedAfterAction(picked, action, draft, msg) {
  if (!actionWorked(msg)) return null;
  const raw = { ...(picked?.raw || {}) };
  const next = { ...picked, raw };
  if (action === "save") {
    Object.assign(raw, { title: draft.title, customer_name: draft.customer_name, client_name: draft.customer_name, address: draft.site_address, site_address: draft.site_address, service_type: draft.service_type, scheduled_date: draft.scheduled, description: draft.meta, status: draft.status, pricing_type: draft.pricing_type, price: draft.amount, job_price: draft.amount, worker_notes: draft.worker_notes, invoice_description_draft: draft.invoice_description, customer_message_draft: draft.message });
    next.title = draft.title || picked.title;
    next.meta = draft.meta || picked.meta;
    next.state = draft.status || picked.state;
    next.amount = moneyNumber(draft.amount) || picked.amount;
  }
  if (action === "approve") { raw.status = picked.type === "invoice" ? "approved" : raw.status; raw.owner_review_status = "approved"; raw.work_review_status = "approved"; raw.reviewed = true; next.status = "approved"; next.state = picked.type === "invoice" ? "approved" : "Approved"; }
  if (action === "assign") { raw.assigned_worker_id = draft.worker_id; raw.assigned_worker_name = draft.worker_name; raw.assigned_to = draft.worker_id; raw.status = raw.status || "assigned"; next.state = raw.status || "assigned"; }
  if (action === "message") { raw.customer_message_draft = draft.message; raw.draft_message = draft.message; raw.last_message_draft = draft.message; }
  if (action === "invoice") { raw.draft_invoice_id = raw.draft_invoice_id || "prepared"; raw.invoice_description_draft = draft.invoice_description || draft.meta || raw.invoice_description_draft; next.state = "Invoice prepared"; }
  if (picked.type === "action" && (action === "approve" || action === "reject")) { raw.status = action === "approve" ? "approved" : "rejected"; next.status = raw.status; next.state = raw.status; }
  return next;
}

function Field({ label, value, onChange, textarea = false, type = "text", missing = false, note = "AI prepared", readOnly = false, wide = false }) {
  const className = `cws-field ${missing ? "missing" : ""} ${wide ? "cws-wide" : ""}`;
  return <label className={className}><span>{label}</span>{textarea ? <textarea readOnly={readOnly} placeholder={missing ? "Needs owner input" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} /> : <input readOnly={readOnly} type={type} placeholder={missing ? "Needs owner input" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} />}<em>{missing ? "Needs owner input" : note}</em></label>;
}

function SelectField({ label, value, onChange, options, missing = false, note = "Prepared" }) {
  const normalized = options.includes(value) ? value : value ? "__custom" : "";
  return <label className={`cws-field ${missing ? "missing" : ""}`}><span>{label}</span><select value={normalized} onChange={(e) => onChange(e.target.value === "__custom" ? value : e.target.value)}><option value="">Needs owner input</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}{value && !options.includes(value) && <option value="__custom">{value}</option>}</select><em>{missing ? "Needs owner input" : note}</em></label>;
}

function ScheduleField({ value, onChange, missing }) {
  const quickValue = !value ? "none" : isDateTimeLocal(value) ? "custom" : "manual";
  return <label className={`cws-field ${missing ? "missing" : ""}`}><span>Schedule</span><select value={quickValue} onChange={(e) => { const v = e.target.value; if (v === "custom") return; onChange(v === "manual" ? value : quickScheduleValue(v)); }}><option value="none">Not scheduled</option><option value="today">Today 9:00 AM</option><option value="afternoon">Today 1:00 PM</option><option value="tomorrow">Tomorrow 9:00 AM</option><option value="next_week">Next week 9:00 AM</option><option value="custom">Pick exact time</option>{quickValue === "manual" && <option value="manual">Saved schedule</option>}</select><input type="datetime-local" value={isDateTimeLocal(value) ? value.slice(0, 16) : ""} onChange={(e) => onChange(e.target.value)} /><em>{missing ? "Needs owner input" : "Prepared"}</em></label>;
}

function Fact({ label, value, missing = false }) { return <div className={`cws-fact ${missing ? "missing" : ""}`}><small>{label}</small><b>{value || "Needs input"}</b></div>; }
function updateDraft(setDraft, key) { return (value) => setDraft((d) => ({ ...d, [key]: value })); }

function LaneSlip({ active, onClose, onPick }) {
  const items = active.items || [];
  return <aside className="cws-overlay" data-version="CHURVOX_CLEAN_WORK_SLIP_REBUILD_20260529"><section className="cws-shell"><header className="cws-hero"><div><p className="cws-kicker">WORK SLIP LANE</p><h2>{active.title}</h2><span className="cws-state">{active.meta}</span><p>{active.actionLabel || "Open a row to approve the detail."}</p></div><button className="cws-close" type="button" onClick={onClose}>× Close</button></header><section className="cws-summary"><div className="cws-summary-card"><small>Waiting</small><b>{items.length}</b></div><div className="cws-summary-card"><small>Total value</small><b>{Number(active.amount || 0) > 0 ? cash(active.amount) : "—"}</b></div><div className="cws-summary-card"><small>Owner action</small><b>{active.actionLabel || "Review the next item"}</b></div></section><section className="cws-lane-list">{items.length ? items.slice(0, 12).map((x, i) => <button className="cws-lane-row" type="button" key={`${x.type}-${x.id}-${i}`} onClick={() => onPick(x)}><span><b>{x.title}</b><small>{x.code} · {detailText(x.raw || {}, x.meta)}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>) : <div className="cws-empty">Nothing waiting in this lane.</div>}</section><footer className="cws-actions">{items.length ? <button className="primary" type="button" onClick={() => onPick(items[0])}>Open first waiting item</button> : <button disabled type="button">Nothing waiting</button>}</footer></section></aside>;
}

export default function CommandFloorApprovalSlip({ picked, onClose, onAction, onPick, workers = [], jobs = [] }) {
  const [localPicked, setLocalPicked] = useState(null);
  const [draft, setDraft] = useState({ title: "", customer_name: "", site_address: "", service_type: "", scheduled: "", status: "", meta: "", pricing_type: "", amount: "", worker_id: "", worker_name: "", worker_notes: "", invoice_status: "", invoice_description: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { setLocalPicked(picked); setDraft(editableDraftFromPicked(picked, workers, jobs)); setNotice(""); setBusy(false); }, [picked, workers, jobs]);

  const active = localPicked || picked;
  const photos = useMemo(() => evidencePhotos(active?.raw || {}), [active]);
  const isAction = active?.type === "action";
  const isJobLike = active?.type === "job" || active?.type === "work_review";
  const isInvoice = active?.type === "invoice";
  const isQuote = active?.type === "quote";
  const isClient = active?.type === "client";
  const isEditableRecord = isJobLike || isInvoice || isQuote || isClient;
  const recommendation = useMemo(() => isJobLike && active ? recommendWorkerForJob(active, workers, jobs) : null, [active, isJobLike, workers, jobs]);

  if (!active) return null;
  if (active.type === "action_group") return <LaneSlip active={active} onClose={onClose} onPick={onPick} />;

  const missing = {
    title: !hasText(draft.title),
    customer: !hasText(draft.customer_name) || isGenericCustomer(draft.customer_name),
    site: isJobLike && !hasText(draft.site_address),
    service: isJobLike && !hasText(draft.service_type),
    status: isEditableRecord && !hasText(draft.status),
    description: isEditableRecord && !hasText(draft.meta),
    worker: isJobLike && !hasText(draft.worker_id) && !hasText(draft.worker_name),
    pricing: (isJobLike || isInvoice) && (!hasText(draft.pricing_type) || low(draft.pricing_type).includes("needs")),
    amount: (isJobLike || isInvoice || isQuote) && !moneyNumber(draft.amount),
    workerNotes: isJobLike && !hasText(draft.worker_notes),
    invoiceDescription: (isJobLike || isInvoice) && !hasText(draft.invoice_description),
    message: isJobLike && !hasText(draft.message),
  };

  const mainMissing = missing.title || missing.customer || missing.site || missing.description || missing.status;
  const assignmentMissing = missing.worker;
  const pricingMissing = missing.amount || missing.pricing || missing.invoiceDescription;
  const completionMissing = missing.workerNotes;
  const jobBlocked = mainMissing || assignmentMissing || pricingMissing || completionMissing || missing.message;
  const invoiceBlocked = missing.customer || missing.amount || missing.invoiceDescription;
  const quoteBlocked = missing.customer || missing.amount;
  const blocked = isJobLike ? jobBlocked : isInvoice ? invoiceBlocked : isQuote ? quoteBlocked : false;
  const canPrepareInvoice = isJobLike && !missing.customer && !missing.amount && !missing.invoiceDescription;
  const value = moneyNumber(draft.amount, active.amount) ? cash(moneyNumber(draft.amount, active.amount)) : "Needs input";
  const hasRealBackup = active.href && active.href !== "#";

  const needs = [];
  if (missing.customer) needs.push("Customer needs owner input.");
  if (missing.site) needs.push("Site address needs owner input.");
  if (missing.worker) needs.push("Worker must be chosen before approval.");
  if (missing.amount) needs.push("Price is missing.");
  if (missing.invoiceDescription) needs.push("Invoice description needs owner input.");
  if (missing.workerNotes) needs.push("Worker notes are missing.");
  if (missing.message) needs.push("Customer message needs owner input.");
  const visibleNeeds = needs.length ? needs.slice(0, 5) : ["Everything important is filled. Review once, then approve."];

  const run = async (action) => { setBusy(true); setNotice(""); const msg = await onAction(action, active, draft); const patched = patchPickedAfterAction(active, action, draft, msg); if (patched) setLocalPicked(patched); setNotice(msg); setBusy(false); };
  const changeWorker = (value) => { const selected = workers.find((worker) => workerIdOf(worker) === value); setDraft((d) => ({ ...d, worker_id: value, worker_name: selected ? workerNameOf(selected) : "" })); };

  const primaryApproveLabel = isAction ? "Approve & execute" : isInvoice ? "Approve invoice" : isJobLike ? "Approve work" : "Approve";

  return <aside className="cws-overlay" data-version="CHURVOX_CLEAN_WORK_SLIP_REBUILD_20260529"><section className="cws-shell">
    <header className="cws-hero"><div><p className="cws-kicker">WORK SLIP</p><h2>{draft.customer_name || active.title}</h2><span className="cws-state">{blocked ? `${visibleNeeds.length} owner check${visibleNeeds.length === 1 ? "" : "s"}` : "Ready for approval"}</span><p>Churvox prepared the admin. Check the fields below, fix anything highlighted, then approve the next move.</p></div><button className="cws-close" type="button" onClick={onClose}>× Close</button></header>

    <section className="cws-facts"><Fact label="Status" value={draft.status || active.state} missing={missing.status} /><Fact label="Value" value={value} missing={missing.amount} /><Fact label="Site" value={draft.site_address || "—"} missing={missing.site} /><Fact label="Customer" value={draft.customer_name || active.title} missing={missing.customer} /><Fact label="Worker" value={draft.worker_name || (recommendation?.best ? workerNameOf(recommendation.best.worker) : "—")} missing={missing.worker} /><Fact label="Invoice" value={draft.invoice_status} missing={missing.invoiceDescription} /></section>

    <section className={`cws-fix ${blocked ? "" : "ready"}`}><h3>{blocked ? "Owner must check" : "Ready to approve"}</h3><ul>{visibleNeeds.map((x) => <li key={x}><span className="cws-dot">{blocked ? "!" : "✓"}</span>{x}</li>)}</ul></section>

    <section className="cws-grid">
      <div className="cws-panel cws-prepared"><p className="cws-section-title">Churvox prepared</p><div className="cws-field-grid"><Field label="Title" value={draft.title} onChange={updateDraft(setDraft, "title")} missing={missing.title} readOnly={!isEditableRecord} /><Field label="Client / customer" value={draft.customer_name} onChange={updateDraft(setDraft, "customer_name")} missing={missing.customer} readOnly={!isEditableRecord} /><Field label="Site address" value={draft.site_address} onChange={updateDraft(setDraft, "site_address")} missing={missing.site} readOnly={!isEditableRecord} /><SelectField label="Service type" value={draft.service_type} onChange={updateDraft(setDraft, "service_type")} options={SERVICE_OPTIONS} missing={missing.service} /><ScheduleField value={draft.scheduled} onChange={updateDraft(setDraft, "scheduled")} missing={false} /><SelectField label="Status" value={draft.status} onChange={updateDraft(setDraft, "status")} options={STATUS_OPTIONS} missing={missing.status} /><Field label="Description / scope" value={draft.meta} onChange={updateDraft(setDraft, "meta")} missing={missing.description} textarea wide readOnly={!isEditableRecord} /></div></div>
      <div className="cws-side">
        <article className="cws-card"><p className="cws-label">Assignment</p><div className="cws-field-grid"><label className={`cws-field ${missing.worker ? "missing" : ""}`}><span>Assigned worker</span><select disabled={!isJobLike} value={draft.worker_id || ""} onChange={(e) => changeWorker(e.target.value)}><option value="">{isJobLike ? "Needs owner input" : "Not needed"}</option>{workers.map((worker) => { const wid = workerIdOf(worker); const blockedWorker = isWorkerBlocked(worker) || workerHasActiveConflict(worker, jobs, active); return <option key={wid || worker.title} value={wid}>{workerNameOf(worker)}{blockedWorker ? ` · ${blockedWorker}` : worker.state ? ` · ${worker.state}` : ""}</option>; })}</select><em>{isJobLike ? (missing.worker ? "Needs owner input" : "AI selected") : "Not required"}</em></label><Field label="Worker name" value={draft.worker_name} onChange={updateDraft(setDraft, "worker_name")} missing={missing.worker} readOnly={!isJobLike} /></div><p>{recommendation?.summary || (isJobLike ? "Choose a worker or approve the current selection." : "No worker action needed.")}</p></article>
        <article className="cws-card"><p className="cws-label">Pricing + invoice</p><div className="cws-field-grid"><SelectField label="Pricing type" value={draft.pricing_type} onChange={updateDraft(setDraft, "pricing_type")} options={PRICING_OPTIONS} missing={missing.pricing} /><Field label="Amount" type="number" value={draft.amount} onChange={updateDraft(setDraft, "amount")} missing={missing.amount} readOnly={!isEditableRecord} /><SelectField label="Invoice status" value={draft.invoice_status} onChange={updateDraft(setDraft, "invoice_status")} options={INVOICE_STATUS_OPTIONS} /><Field label="Invoice description" value={draft.invoice_description} onChange={updateDraft(setDraft, "invoice_description")} missing={missing.invoiceDescription} textarea wide readOnly={!isEditableRecord} /></div></article>
      </div>
    </section>

    <section className="cws-grid"><article className="cws-card cws-message"><p className="cws-label">Draft customer update</p><textarea readOnly={!isEditableRecord} placeholder="Needs owner input" value={draft.message || ""} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} /><span className="cws-counter">{(draft.message || "").length} / 500</span></article><aside className="cws-side"><article className="cws-card"><p className="cws-label">Worker notes</p><Field label="Completion notes" value={draft.worker_notes} onChange={updateDraft(setDraft, "worker_notes")} missing={missing.workerNotes} textarea readOnly={!isJobLike} /></article><article className="cws-card"><p className="cws-label">Evidence & photos</p>{photos.length ? <div className="cws-photo-row">{photos.slice(0, 3).map((photo, i) => <span key={`${photo.url || photo.label}-${i}`}>{photo.url ? <img src={photo.url} alt={photo.label} /> : null}</span>)}</div> : <div className="cws-photo-empty"><span /><span /><span /></div>}<p>{photos.length ? `${photos.length} photos uploaded by worker.` : "Photos are optional evidence and do not block approval."}</p></article></aside></section>

    {notice && <strong className="cws-notice">{notice}</strong>}

    <footer className="cws-actions">{isEditableRecord && <button type="button" disabled={busy} onClick={() => run("save")}>Save changes</button>}{(isAction || isJobLike || isInvoice) && <button className="primary" type="button" disabled={busy || (!isAction && blocked)} onClick={() => run("approve")}>{primaryApproveLabel}</button>}{isJobLike && <button type="button" disabled={busy || !canPrepareInvoice} onClick={() => run("invoice")}>Prepare invoice</button>}<details className="cws-more"><summary>More tools</summary><div className="cws-more-panel">{isAction && <button className="danger" type="button" disabled={busy} onClick={() => run("reject")}>Reject action</button>}{isJobLike && <button type="button" disabled={busy || !draft.worker_id} onClick={() => run("assign")}>Assign worker</button>}{isEditableRecord && <button type="button" disabled={busy} onClick={() => run("message")}>Save message draft</button>}{hasRealBackup && <Link to={active.href}>Full page backup</Link>}{!isEditableRecord && !isAction && !hasRealBackup && <button type="button" disabled>Review-only record</button>}</div></details></footer>
  </section></aside>;
}
