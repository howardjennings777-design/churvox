import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CommandFloorApprovalSlip.css";

const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const firstText = (...values) => values.map(str).find(Boolean) || "";
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
const hasText = (v) => Boolean(str(v));
const isGenericCustomer = (v) => ["customer", "client", "there"].includes(low(v));

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
  const buckets = [raw.photos, raw.job_photos, raw.worker_photos, raw.completion_photos, raw.photo_urls, raw.images, raw.attachments];
  const seen = new Set();
  return buckets
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
    if (blocked) return { worker, score: -999, blocked, conflict, reasons: [blocked] };
    if (conflict) return { worker, score: -500, blocked, conflict, reasons: [conflict] };
    score += 50; reasons.push("no active conflict found");
    if (workerArea && jobArea && (jobArea.includes(workerArea) || workerArea.includes(jobArea))) { score += 25; reasons.push("area match"); }
    if (role.includes("worker") || role.includes("field") || role.includes("manager")) { score += 12; reasons.push(`${role || "field"} role can take jobs`); }
    if (low(worker?.state).includes("available") || low(rawOf(worker).availability).includes("available")) { score += 10; reasons.push("marked available"); }
    return { worker, score, blocked, conflict, reasons };
  }).sort((a, b) => b.score - a.score);
  const best = candidates.find((c) => c.score > 0) || null;
  const blocked = candidates.filter((c) => c.score <= 0).slice(0, 4);
  return {
    best,
    blocked,
    summary: best ? `${workerNameOf(best.worker)} is recommended because ${best.reasons.join(", ")}.` : "No conflict-free field worker was found from the loaded team list.",
    warning: best ? "Owner can still change the worker before assigning." : "Choose manually or clear a worker conflict first.",
  };
}

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

function buildSituation(active, photos, draft) {
  const raw = active?.raw || {};
  const price = moneyNumber(draft?.amount, active?.amount, raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  const worker = firstText(draft?.worker_name, raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, "Selected worker");
  return [
    `${worker} completed or is ready for this job.`,
    photos.length ? `${photos.length} completion photo${photos.length === 1 ? " has" : "s have"} been uploaded.` : "No completion photos are saved yet.",
    firstText(draft?.worker_notes, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes) ? "Worker notes have been added." : "No worker notes are recorded yet.",
    price ? `Job price confirmed at ${cash(price)}.` : "Job price still needs confirming.",
    firstText(draft?.invoice_status, raw.invoice_number, raw.draft_invoice_id, raw.invoice_id, raw.invoiced ? "yes" : "") ? "Invoice draft is already linked." : "Invoice draft can be prepared from this slip.",
  ];
}

function buildNeedsAttention(active, photos, draft) {
  const raw = active?.raw || {};
  const price = moneyNumber(draft?.amount, active?.amount, raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  const notes = firstText(draft?.worker_notes, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes);
  const needs = [];
  if (!photos.length) needs.push("No photos saved — highlighted in red."); else needs.push("Check photos to confirm quality.");
  if (!price) needs.push("Job price is missing — highlighted in red."); else needs.push("Confirm invoice amount is correct.");
  if (!notes) needs.push("Worker notes are missing — highlighted in red.");
  if (!draft?.message) needs.push("Customer message needs owner input."); else needs.push("Review customer message before sending.");
  return needs.slice(0, 4);
}

function actionWorked(msg) { return !/^(could not|action failed|need |select |choose |no message|this record|open a record|only jobs)/i.test(str(msg)); }
function patchPickedAfterAction(picked, action, draft, msg) {
  if (!actionWorked(msg)) return null;
  const raw = { ...(picked?.raw || {}) };
  const next = { ...picked, raw };
  if (action === "save") {
    Object.assign(raw, {
      title: draft.title,
      customer_name: draft.customer_name,
      client_name: draft.customer_name,
      address: draft.site_address,
      site_address: draft.site_address,
      service_type: draft.service_type,
      scheduled_date: draft.scheduled,
      description: draft.meta,
      status: draft.status,
      pricing_type: draft.pricing_type,
      price: draft.amount,
      job_price: draft.amount,
      worker_notes: draft.worker_notes,
      invoice_description_draft: draft.invoice_description,
      customer_message_draft: draft.message,
    });
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

function Field({ label, value, onChange, textarea = false, type = "text", missing = false, note = "AI filled" }) {
  const className = `cfs-field ${missing ? "is-missing" : "is-filled"}`;
  const helper = missing ? "Needs owner input" : note;
  return <label className={className}><span>{label}</span>{textarea ? <textarea placeholder={missing ? "Needs owner input" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} /> : <input type={type} placeholder={missing ? "Needs owner input" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} />}<em>{helper}</em></label>;
}
function Fact({ label, value, missing = false }) { return <span className={missing ? "is-missing" : ""}><small>{label}</small><b>{value || "Needs input"}</b></span>; }
function CheckLine({ children }) { return <li><i>✓</i><span>{children}</span></li>; }
function WarnLine({ children }) { return <li><i>!</i><span>{children}</span></li>; }
function updateDraft(setDraft, key) { return (value) => setDraft((d) => ({ ...d, [key]: value })); }

function LaneSlip({ active, onClose, onPick }) {
  const items = active.items || [];
  return <aside className="cfs-overlay cfs-lane-slip" data-version="CHURVOX_WORK_SLIP_MISSING_FIELD_HIGHLIGHTS_20260527"><section className="cfs-sheet"><header className="cfs-head"><div><p>WORK SLIP</p><h2>{active.title}</h2><em>{active.meta}</em></div><button type="button" onClick={onClose}>× Close</button></header><section className="cfs-lane-summary"><Fact label="Waiting" value={items.length} /><Fact label="Total value" value={Number(active.amount || 0) > 0 ? cash(active.amount) : "—"} /><strong>{active.actionLabel || "Open a row to approve the detail."}</strong></section><section className="cfs-lane-list">{items.length ? items.slice(0, 12).map((x, i) => <button className="cfs-lane-row" type="button" key={`${x.type}-${x.id}-${i}`} onClick={() => onPick(x)}><span><b>{x.title}</b><small>{x.code} · {detailText(x.raw || {}, x.meta)}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>) : <div className="cfs-empty">Nothing waiting in this lane.</div>}</section><footer className="cfs-actions">{items.length ? <button className="primary" type="button" onClick={() => onPick(items[0])}>Open first waiting item</button> : <button disabled type="button">Nothing waiting</button>}</footer></section></aside>;
}

export default function CommandFloorApprovalSlip({ picked, onClose, onAction, onPick, workers = [], jobs = [] }) {
  const [localPicked, setLocalPicked] = useState(null);
  const [draft, setDraft] = useState({ title: "", customer_name: "", site_address: "", service_type: "", scheduled: "", status: "", meta: "", pricing_type: "", amount: "", worker_id: "", worker_name: "", worker_notes: "", invoice_status: "", invoice_description: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setLocalPicked(picked);
    setDraft(editableDraftFromPicked(picked, workers, jobs));
    setNotice("");
    setBusy(false);
  }, [picked, workers, jobs]);

  const active = localPicked || picked;
  const photos = useMemo(() => evidencePhotos(active?.raw || {}), [active]);
  const isAction = active?.type === "action";
  const isJobLike = active?.type === "job" || active?.type === "work_review";
  const recommendation = useMemo(() => isJobLike && active ? recommendWorkerForJob(active, workers, jobs) : null, [active, isJobLike, workers, jobs]);

  if (!active) return null;
  if (active.type === "action_group") return <LaneSlip active={active} onClose={onClose} onPick={onPick} />;

  const missing = {
    title: !hasText(draft.title),
    customer: !hasText(draft.customer_name) || isGenericCustomer(draft.customer_name),
    site: !hasText(draft.site_address),
    service: !hasText(draft.service_type),
    scheduled: !hasText(draft.scheduled),
    status: !hasText(draft.status),
    description: !hasText(draft.meta),
    worker: !hasText(draft.worker_id) && !hasText(draft.worker_name),
    pricing: !hasText(draft.pricing_type) || low(draft.pricing_type).includes("needs"),
    amount: !moneyNumber(draft.amount),
    workerNotes: !hasText(draft.worker_notes),
    invoiceDescription: !hasText(draft.invoice_description),
    message: !hasText(draft.message),
    photos: photos.length === 0,
  };
  const mainMissing = missing.title || missing.customer || missing.site || missing.description || missing.status;
  const assignmentMissing = missing.worker;
  const pricingMissing = missing.amount || missing.pricing || missing.invoiceDescription;
  const completionMissing = missing.workerNotes || missing.photos;
  const blocked = mainMissing || assignmentMissing || pricingMissing || completionMissing || missing.message;
  const value = moneyNumber(draft.amount, active.amount) ? cash(moneyNumber(draft.amount, active.amount)) : "Needs input";
  const situation = buildSituation(active, photos, draft);
  const needs = buildNeedsAttention(active, photos, draft);

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

  return <aside className="cfs-overlay" data-version="CHURVOX_WORK_SLIP_MISSING_FIELD_HIGHLIGHTS_20260527"><section className="cfs-sheet">
    <header className="cfs-head"><div><p>WORK SLIP</p><h2>{draft.customer_name || active.title}</h2><em>{active.code || active.type}</em><span>Churvox filled what it could. Red fields still need owner input before this is safe to approve.</span></div><button type="button" onClick={onClose}>× Close</button></header>
    <section className="cfs-facts"><Fact label="Status" value={draft.status} missing={missing.status} /><Fact label="Value" value={value} missing={missing.amount} /><Fact label="Site" value={draft.site_address} missing={missing.site} /><Fact label="Customer" value={draft.customer_name} missing={missing.customer} /><Fact label="Worker" value={draft.worker_name || (recommendation?.best ? workerNameOf(recommendation.best.worker) : "")} missing={missing.worker} /><Fact label="Invoice" value={draft.invoice_status} missing={missing.invoiceDescription} /></section>
    <section className="cfs-decision-grid"><article className="cfs-decision cfs-happened"><header><i>1</i><b>What happened</b></header><ul>{situation.map((x) => <CheckLine key={x}>{x}</CheckLine>)}</ul></article><article className="cfs-decision cfs-ai"><header><i>2</i><b>AI Recommendation</b></header><div className="cfs-ai-box"><strong>{blocked ? "⚠ Review first" : "✓ Approve work"}</strong><p>{blocked ? "Churvox filled the form, but red fields still need owner input before approval." : recommendation?.best ? `No worker conflict found, ${workerNameOf(recommendation.best.worker)} selected, invoice draft prepared, and customer update drafted.` : "Review the job form, choose a worker if needed, then approve when ready."}</p></div></article><article className={`cfs-decision cfs-attention ${blocked ? "cfs-blocked" : ""}`}><header><i>3</i><b>Needs attention</b></header><ul>{needs.map((x) => <WarnLine key={x}>{x}</WarnLine>)}</ul></article></section>
    <h3 className="cfs-section-title">Editable job form Churvox prepared</h3>
    <section className="cfs-job-form cfs-job-form-editable">
      <article className={mainMissing ? "cfs-missing-card" : ""}><header><small>Job details</small><b>Proper editable job record</b></header><div className="cfs-form-grid"><Field label="Job title" value={draft.title} onChange={updateDraft(setDraft, "title")} missing={missing.title} /><Field label="Client / customer" value={draft.customer_name} onChange={updateDraft(setDraft, "customer_name")} missing={missing.customer} /><Field label="Site address" value={draft.site_address} onChange={updateDraft(setDraft, "site_address")} missing={missing.site} /><Field label="Service type" value={draft.service_type} onChange={updateDraft(setDraft, "service_type")} missing={missing.service} /><Field label="Scheduled date / time" value={draft.scheduled} onChange={updateDraft(setDraft, "scheduled")} missing={missing.scheduled} note="Optional but helpful" /><Field label="Status" value={draft.status} onChange={updateDraft(setDraft, "status")} missing={missing.status} /><Field label="Job description / scope" value={draft.meta} onChange={updateDraft(setDraft, "meta")} missing={missing.description} textarea /></div></article>
      <article className={assignmentMissing ? "cfs-missing-card" : ""}><header><small>Assignment</small><b>Worker selected by AI</b></header><div className="cfs-form-grid cfs-form-grid-small"><label className={`cfs-field ${missing.worker ? "is-missing" : "is-filled"}`}><span>Assigned worker</span><select value={draft.worker_id || ""} onChange={(e) => changeWorker(e.target.value)}><option value="">Needs owner input</option>{workers.map((worker) => { const wid = workerIdOf(worker); const blockedWorker = isWorkerBlocked(worker) || workerHasActiveConflict(worker, jobs, active); return <option key={wid || worker.title} value={wid}>{workerNameOf(worker)}{blockedWorker ? ` · ${blockedWorker}` : worker.state ? ` · ${worker.state}` : ""}</option>; })}</select><em>{missing.worker ? "Needs owner input" : "AI selected"}</em></label><Field label="Assigned worker name" value={draft.worker_name} onChange={updateDraft(setDraft, "worker_name")} missing={missing.worker} /><Field label="AI reason / conflict check" value={recommendation?.summary || "Needs manual check"} onChange={() => {}} textarea note="AI filled" /></div></article>
      <article className={pricingMissing ? "cfs-missing-card" : ""}><header><small>Pricing + invoice prep</small><b>Editable admin fields</b></header><div className="cfs-form-grid cfs-form-grid-small"><Field label="Pricing type" value={draft.pricing_type} onChange={updateDraft(setDraft, "pricing_type")} missing={missing.pricing} /><Field label="Amount" type="number" value={draft.amount} onChange={updateDraft(setDraft, "amount")} missing={missing.amount} /><Field label="Invoice status" value={draft.invoice_status} onChange={updateDraft(setDraft, "invoice_status")} note="AI filled" /><Field label="Invoice description" value={draft.invoice_description} onChange={updateDraft(setDraft, "invoice_description")} missing={missing.invoiceDescription} textarea /></div></article>
      <article className={completionMissing ? "cfs-missing-card" : ""}><header><small>Completion</small><b>Editable worker evidence</b></header><div className="cfs-form-grid cfs-form-grid-small"><Field label="Worker notes" value={draft.worker_notes} onChange={updateDraft(setDraft, "worker_notes")} missing={missing.workerNotes} textarea /><Field label="Photos" value={photos.length ? `${photos.length} uploaded` : ""} onChange={() => {}} missing={missing.photos} /><Field label="Owner approval" value="Waiting for your approval" onChange={() => {}} note="Ready when red fields are fixed" /></div></article>
    </section>
    <section className="cfs-lower"><article className={`cfs-card cfs-message ${missing.message ? "cfs-missing-card" : ""}`}><header><small>Draft customer update</small><b>Draft before sending</b></header><textarea placeholder="Needs owner input" value={draft.message || ""} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} /><p>{(draft.message || "").length} / 500</p></article><article className={`cfs-card cfs-photos ${missing.photos ? "cfs-missing-card" : ""}`}><header><small>Evidence & photos</small><b>{photos.length ? `${photos.length} photos uploaded` : "Needs owner input"}</b></header>{photos.length ? <div className="cfs-photo-row">{photos.slice(0, 3).map((photo, i) => <span key={`${photo.url || photo.label}-${i}`}>{photo.url ? <img src={photo.url} alt={photo.label} /> : null}</span>)}</div> : <div className="cfs-photo-placeholders"><span /><span /><span /></div>}<p>{photos.length ? `${photos.length} photos uploaded by worker` : "No photos saved. This box is red so the owner sees it."}</p></article><article className="cfs-card cfs-next"><header><small>What happens after approval</small><b>{blocked ? "Fix red fields first" : "Owner approval only"}</b></header><ul><CheckLine>Job will move to Approved status.</CheckLine><CheckLine>Invoice draft will be ready to send.</CheckLine><CheckLine>Customer message remains as draft until you send it.</CheckLine></ul></article></section>
    {notice && <strong className="cfs-notice">{notice}</strong>}
    <footer className="cfs-actions">{!isAction && <button type="button" disabled={busy} onClick={() => run("save")}>Save changes</button>}{isAction && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve & execute</button>}{isAction && <button className="danger" type="button" disabled={busy} onClick={() => run("reject")}>Reject action</button>}{isJobLike && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve work</button>}{active.type === "invoice" && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve invoice</button>}{isJobLike && <button type="button" disabled={busy || !draft.worker_id} onClick={() => run("assign")}>Assign worker</button>}{isJobLike && <button type="button" disabled={busy} onClick={() => run("invoice")}>Prepare invoice</button>}{!isAction && <button type="button" disabled={busy} onClick={() => run("message")}>Save message draft</button>}{active.href && active.href !== "#" && <Link to={active.href}>Full page backup</Link>}</footer>
  </section></aside>;
}
