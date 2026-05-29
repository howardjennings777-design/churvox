// CHURVOX_CLEAR_WORK_SLIP_ACTION_FEEDBACK_20260527
// CHURVOX_BIG_LAUNCH_FINISH_SLIP_MARKER_20260528
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CommandFloorApprovalSlip.css";

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

function buildSituation(active, photos, draft, isJobLike) {
  const raw = active?.raw || {};
  const price = moneyNumber(draft?.amount, active?.amount, raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  const worker = firstText(draft?.worker_name, raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, "Selected worker");
  if (!isJobLike) return [
    `${active?.code || "Record"} is open for review.`,
    price ? `Value is ${cash(price)}.` : "Value may still need owner review.",
    "Only buttons that make sense for this record are shown below.",
  ];
  return [
    `${worker} completed or is ready for this job.`,
    photos.length ? `${photos.length} completion photo${photos.length === 1 ? " has" : "s have"} been uploaded.` : "Photos are optional and can be added later.",
    firstText(draft?.worker_notes, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes) ? "Worker notes have been added." : "No worker notes are recorded yet.",
    price ? `Job price confirmed at ${cash(price)}.` : "Job price still needs confirming.",
    firstText(draft?.invoice_status, raw.invoice_number, raw.draft_invoice_id, raw.invoice_id, raw.invoiced ? "yes" : "") ? "Invoice draft is already linked." : "Invoice draft can be prepared from this slip.",
  ];
}

function buildNeedsAttention(missing, isJobLike, isInvoice) {
  const needs = [];
  if (missing.customer) needs.push("Customer needs owner input.");
  if (missing.site && isJobLike) needs.push("Site address needs owner input.");
  if (missing.worker && isJobLike) needs.push("Worker must be chosen before approval.");
  if (missing.amount) needs.push(`${isInvoice ? "Invoice" : "Job"} price is missing.`);
  if (missing.invoiceDescription && (isJobLike || isInvoice)) needs.push("Invoice description needs owner input.");
  if (missing.workerNotes && isJobLike) needs.push("Worker notes are missing.");
  if (missing.message && isJobLike) needs.push("Customer message needs owner input.");
  return needs.length ? needs.slice(0, 4) : ["Everything important is filled. Photos are optional. Review once, then approve."];
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

function Field({ label, value, onChange, textarea = false, type = "text", missing = false, note = "AI filled", readOnly = false }) {
  const className = `cfs-field ${missing ? "is-missing" : "is-filled"}`;
  const helper = missing ? "Needs owner input" : note;
  return <label className={className}><span>{label}</span>{textarea ? <textarea readOnly={readOnly} placeholder={missing ? "Needs owner input" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} /> : <input readOnly={readOnly} type={type} placeholder={missing ? "Needs owner input" : ""} value={value || ""} onChange={(e) => onChange(e.target.value)} />}<em>{helper}</em></label>;
}

function SelectField({ label, value, onChange, options, missing = false, note = "Choose from list" }) {
  const className = `cfs-field cfs-select-field ${missing ? "is-missing" : "is-filled"}`;
  const normalized = options.includes(value) ? value : value ? "__custom" : "";
  return <label className={className}><span>{label}</span><select value={normalized} onChange={(e) => onChange(e.target.value === "__custom" ? value : e.target.value)}><option value="">Needs owner input</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}{value && !options.includes(value) && <option value="__custom">{value}</option>}</select><em>{missing ? "Needs owner input" : note}</em></label>;
}

function ScheduleField({ value, onChange, missing }) {
  const className = `cfs-field cfs-schedule-field ${missing ? "is-missing" : "is-filled"}`;
  const quickValue = !value ? "none" : isDateTimeLocal(value) ? "custom" : "manual";
  return <label className={className}><span>Scheduled date / time</span><select value={quickValue} onChange={(e) => { const v = e.target.value; if (v === "custom") return; onChange(v === "manual" ? value : quickScheduleValue(v)); }}><option value="none">Not scheduled</option><option value="today">Today 9:00 AM</option><option value="afternoon">Today 1:00 PM</option><option value="tomorrow">Tomorrow 9:00 AM</option><option value="next_week">Next week 9:00 AM</option><option value="custom">Pick exact date/time</option>{quickValue === "manual" && <option value="manual">Saved schedule</option>}</select><input type="datetime-local" value={isDateTimeLocal(value) ? value.slice(0, 16) : ""} onChange={(e) => onChange(e.target.value)} /><em>{missing ? "Choose a schedule or leave as Not scheduled" : "Dropdown + exact picker"}</em></label>;
}

function Fact({ label, value, missing = false }) { return <span className={missing ? "is-missing" : ""}><small>{label}</small><b>{value || "Needs input"}</b></span>; }
function CheckLine({ children }) { return <li><i>✓</i><span>{children}</span></li>; }
function WarnLine({ children }) { return <li><i>!</i><span>{children}</span></li>; }
function updateDraft(setDraft, key) { return (value) => setDraft((d) => ({ ...d, [key]: value })); }


const SLIP_FORCE_CSS = `
/* CHURVOX_FORCE_INLINE_SLIP_THEME_20260529 */
.cfs-force-command-theme,
.cfs-force-command-theme.cfs-overlay {
  color: #f8fbff !important;
  background:
    radial-gradient(circle at 12% 2%, rgba(38, 211, 238, .20), transparent 30%),
    radial-gradient(circle at 88% 4%, rgba(98, 72, 255, .26), transparent 32%),
    linear-gradient(135deg, #020817 0%, #06152c 42%, #071d3d 100%) !important;
}

.cfs-force-command-theme::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(125,189,255,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(125,189,255,.045) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at 50% 22%, black, transparent 84%);
}

.cfs-force-command-theme .cfs-force-command-sheet,
.cfs-force-command-theme .cfs-sheet {
  padding: 16px !important;
  border-radius: 32px !important;
  color: #f8fbff !important;
  background:
    radial-gradient(circle at 80% 8%, rgba(98,72,255,.22), transparent 34%),
    radial-gradient(circle at 12% 92%, rgba(38,211,238,.13), transparent 34%),
    linear-gradient(135deg, rgba(2,8,23,.97), rgba(6,21,44,.95)) !important;
  border: 1px solid rgba(125,189,255,.22) !important;
  box-shadow: 0 34px 120px rgba(0,0,0,.48), inset 0 1px 0 rgba(255,255,255,.08) !important;
}

.cfs-force-command-theme .cfs-head {
  border-radius: 26px !important;
  background:
    radial-gradient(circle at 78% 18%, rgba(98,72,255,.34), transparent 32%),
    radial-gradient(circle at 8% 88%, rgba(38,211,238,.18), transparent 34%),
    rgba(3,13,33,.96) !important;
  border: 1px solid rgba(125,189,255,.22) !important;
  color: #f8fbff !important;
}

.cfs-force-command-theme :is(h1,h2,h3,h4,b,strong,label) {
  color: #fff !important;
}

.cfs-force-command-theme :is(p,span,small,em,li) {
  color: rgba(248,251,255,.78) !important;
}

.cfs-force-command-theme :is(.cfs-head p,.cfs-section-title,.cfs-facts:before,.cfs-job-form small,.cfs-card small,.cfs-read-field small) {
  color: #62e8f5 !important;
  letter-spacing: .18em !important;
  text-transform: uppercase !important;
  font-weight: 950 !important;
}

.cfs-force-command-theme :is(
  .cfs-facts span,
  .cfs-lane-summary,
  .cfs-lane-summary > *,
  .cfs-lane-list,
  .cfs-lane-row,
  .cfs-decision,
  .cfs-job-form article,
  .cfs-card,
  .cfs-empty,
  .cfs-read-field,
  .cfs-ai-box,
  .cfs-next,
  .cfs-attention,
  .cfs-happened,
  .cfs-ai
) {
  color: #f8fbff !important;
  background:
    radial-gradient(circle at 82% 12%, rgba(98,72,255,.13), transparent 30%),
    linear-gradient(135deg, rgba(4,16,39,.93), rgba(8,30,66,.85)) !important;
  border-color: rgba(125,189,255,.20) !important;
  box-shadow: 0 18px 58px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.08) !important;
}

.cfs-force-command-theme .cfs-lane-summary {
  border-radius: 18px !important;
  padding: 12px !important;
}

.cfs-force-command-theme .cfs-lane-summary > * {
  border-radius: 14px !important;
  padding: 12px !important;
  background: rgba(255,255,255,.07) !important;
}

.cfs-force-command-theme .cfs-lane-list {
  border-radius: 24px !important;
  padding: 16px !important;
  gap: 10px !important;
  background:
    radial-gradient(circle at 8% 0%, rgba(20,216,244,.10), transparent 32%),
    rgba(3,13,33,.62) !important;
}

.cfs-force-command-theme .cfs-lane-row {
  min-height: 78px !important;
  border-radius: 18px !important;
  padding: 16px 18px !important;
  color: #fff !important;
  background:
    linear-gradient(135deg, rgba(255,255,255,.10), rgba(255,255,255,.045)) !important;
  border: 1px solid rgba(125,189,255,.22) !important;
}

.cfs-force-command-theme .cfs-lane-row:hover {
  transform: translateY(-1px) !important;
  border-color: rgba(98,232,245,.42) !important;
  background:
    linear-gradient(135deg, rgba(20,216,244,.16), rgba(98,72,255,.13)) !important;
}

.cfs-force-command-theme .cfs-lane-row em {
  color: #62e8f5 !important;
  font-style: normal !important;
  font-weight: 950 !important;
}

.cfs-force-command-theme :is(input,textarea,select,.cfs-read-field) {
  background: rgba(255,255,255,.075) !important;
  color: #fff !important;
  border: 1px solid rgba(125,189,255,.20) !important;
  border-radius: 14px !important;
}

.cfs-force-command-theme :is(input,textarea,select):focus {
  outline: none !important;
  border-color: rgba(98,232,245,.62) !important;
  box-shadow: 0 0 0 4px rgba(98,232,245,.10) !important;
}

.cfs-force-command-theme :is(.is-missing,.cfs-missing-card,.cfs-blocked) {
  background:
    linear-gradient(135deg, rgba(127,29,29,.42), rgba(45,18,38,.84)) !important;
  border-color: rgba(248,113,113,.52) !important;
}

.cfs-force-command-theme :is(.cfs-photo-row span,.cfs-photo-placeholders span) {
  border-radius: 14px !important;
  border: 1px solid rgba(125,189,255,.20) !important;
  background:
    linear-gradient(135deg, rgba(20,216,244,.24), rgba(36,92,255,.18)) !important;
}

.cfs-force-command-theme .cfs-actions {
  position: sticky !important;
  left: auto !important;
  right: auto !important;
  bottom: 12px !important;
  transform: none !important;
  width: min(900px, 100%) !important;
  margin: 18px auto 0 !important;
  z-index: 5 !important;
  display: flex !important;
  flex-wrap: wrap !important;
  justify-content: center !important;
  gap: 10px !important;
  padding: 10px !important;
  border-radius: 24px !important;
  background: rgba(3,13,33,.94) !important;
  border: 1px solid rgba(125,189,255,.22) !important;
  box-shadow: 0 24px 90px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.08) !important;
  backdrop-filter: blur(22px) saturate(150%) !important;
}

.cfs-force-command-theme .cfs-actions :is(button,a) {
  min-height: 46px !important;
  border-radius: 14px !important;
  padding: 0 16px !important;
  border: 1px solid rgba(125,189,255,.20) !important;
  background: rgba(255,255,255,.075) !important;
  color: #f8fbff !important;
  font-weight: 900 !important;
  text-decoration: none !important;
}

.cfs-force-command-theme .cfs-actions :is(button:first-child,.primary) {
  background: linear-gradient(135deg, #14d8f4, #245cff 48%, #9333ea) !important;
  color: #fff !important;
  border-color: transparent !important;
  box-shadow: 0 16px 42px rgba(36,92,255,.30) !important;
}

.cfs-force-command-theme .cfs-notice {
  background: rgba(119,255,193,.12) !important;
  color: #77ffc1 !important;
  border: 1px solid rgba(119,255,193,.20) !important;
  border-radius: 14px !important;
}


/* CHURVOX_FINAL_WHITE_CARD_ACTION_BAR_FIX_20260529 */
/* Kill the last pale lower card and make actions sit cleanly. */

.cfs-force-command-theme .cfs-lower {
  display: grid !important;
  grid-template-columns: 1.25fr 1fr .9fr !important;
  gap: 16px !important;
  padding-bottom: 18px !important;
}

.cfs-force-command-theme .cfs-lower > article,
.cfs-force-command-theme .cfs-lower .cfs-card,
.cfs-force-command-theme .cfs-lower .cfs-card.cfs-next,
.cfs-force-command-theme article.cfs-card.cfs-next,
.cfs-force-command-theme .cfs-next {
  color: #f8fbff !important;
  background:
    radial-gradient(circle at 82% 12%, rgba(98,72,255,.16), transparent 30%),
    linear-gradient(135deg, rgba(4,16,39,.96), rgba(8,30,66,.88)) !important;
  border: 1px solid rgba(125,189,255,.22) !important;
  box-shadow: 0 18px 58px rgba(0,0,0,.30), inset 0 1px 0 rgba(255,255,255,.08) !important;
}

.cfs-force-command-theme .cfs-lower .cfs-card.cfs-next *,
.cfs-force-command-theme article.cfs-card.cfs-next *,
.cfs-force-command-theme .cfs-next * {
  color: rgba(248,251,255,.78) !important;
}

.cfs-force-command-theme .cfs-lower .cfs-card.cfs-next :is(b,strong,h3,h4),
.cfs-force-command-theme article.cfs-card.cfs-next :is(b,strong,h3,h4),
.cfs-force-command-theme .cfs-next :is(b,strong,h3,h4) {
  color: #fff !important;
}

.cfs-force-command-theme .cfs-lower .cfs-card.cfs-next :is(small,.cfs-section-title),
.cfs-force-command-theme article.cfs-card.cfs-next :is(small,.cfs-section-title),
.cfs-force-command-theme .cfs-next :is(small,.cfs-section-title) {
  color: #62e8f5 !important;
}

.cfs-force-command-theme .cfs-actions {
  position: sticky !important;
  bottom: 10px !important;
  left: auto !important;
  right: auto !important;
  transform: none !important;
  width: min(940px, 100%) !important;
  margin: 16px auto 0 !important;
  z-index: 6 !important;
  border-radius: 24px !important;
  background: rgba(3,13,33,.94) !important;
}

/* Stop any white/yellow helper chip from leaking into the slip */
.cfs-force-command-theme :is(
  [class*="bg-white"],
  [class*="bg-slate"],
  [class*="bg-gray"],
  [class*="bg-zinc"],
  [class*="bg-neutral"],
  [class*="bg-yellow"],
  [class*="bg-amber"],
  [style*="background: white"],
  [style*="background:#fff"],
  [style*="background-color: white"],
  [style*="background-color:#fff"]
) {
  background: rgba(255,255,255,.075) !important;
  color: #f8fbff !important;
  border-color: rgba(125,189,255,.18) !important;
}


@media(max-width: 700px) {
  .cfs-force-command-theme .cfs-force-command-sheet,
  .cfs-force-command-theme .cfs-sheet {
    padding: 10px !important;
  }
}
`;

function LaneSlip({ active, onClose, onPick }) {
  const items = active.items || [];
  return <aside className="cfs-overlay cfs-lane-slip cfs-force-command-theme" data-version="CHURVOX_FORCE_INLINE_SLIP_THEME_20260529"><style>{SLIP_FORCE_CSS}</style><section className="cfs-sheet cfs-force-command-sheet"><header className="cfs-head"><div><p>WORK SLIP</p><h2>{active.title}</h2><em>{active.meta}</em></div><button type="button" onClick={onClose}>× Close</button></header><section className="cfs-lane-summary"><Fact label="Waiting" value={items.length} /><Fact label="Total value" value={Number(active.amount || 0) > 0 ? cash(active.amount) : "—"} /><strong>{active.actionLabel || "Open a row to approve the detail."}</strong></section><section className="cfs-lane-list">{items.length ? items.slice(0, 12).map((x, i) => <button className="cfs-lane-row" type="button" key={`${x.type}-${x.id}-${i}`} onClick={() => onPick(x)}><span><b>{x.title}</b><small>{x.code} · {detailText(x.raw || {}, x.meta)}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>) : <div className="cfs-empty">Nothing waiting in this lane.</div>}</section><footer className="cfs-actions">{items.length ? <button className="primary" type="button" onClick={() => onPick(items[0])}>Open first waiting item</button> : <button disabled type="button">Nothing waiting</button>}</footer></section></aside>;
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

  const photosMissingOptional = isJobLike && photos.length === 0;
  const missing = {
    title: !hasText(draft.title),
    customer: !hasText(draft.customer_name) || isGenericCustomer(draft.customer_name),
    site: isJobLike && !hasText(draft.site_address),
    service: isJobLike && !hasText(draft.service_type),
    scheduled: false,
    status: isEditableRecord && !hasText(draft.status),
    description: isEditableRecord && !hasText(draft.meta),
    worker: isJobLike && !hasText(draft.worker_id) && !hasText(draft.worker_name),
    pricing: (isJobLike || isInvoice) && (!hasText(draft.pricing_type) || low(draft.pricing_type).includes("needs")),
    amount: (isJobLike || isInvoice || isQuote) && !moneyNumber(draft.amount),
    workerNotes: isJobLike && !hasText(draft.worker_notes),
    invoiceDescription: (isJobLike || isInvoice) && !hasText(draft.invoice_description),
    message: isJobLike && !hasText(draft.message),
    photos: false,
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
  const situation = buildSituation(active, photos, draft, isJobLike);
  const needs = buildNeedsAttention(missing, isJobLike, isInvoice);
  const hasRealBackup = active.href && active.href !== "#";

  const run = async (action) => { setBusy(true); setNotice(""); const msg = await onAction(action, active, draft); const patched = patchPickedAfterAction(active, action, draft, msg); if (patched) setLocalPicked(patched); setNotice(msg); setBusy(false); };
  const changeWorker = (value) => { const selected = workers.find((worker) => workerIdOf(worker) === value); setDraft((d) => ({ ...d, worker_id: value, worker_name: selected ? workerNameOf(selected) : "" })); };

  return <aside className="cfs-overlay cfs-force-command-theme" data-version="CHURVOX_FORCE_INLINE_SLIP_THEME_20260529"><style>{SLIP_FORCE_CSS}</style><section className="cfs-sheet cfs-force-command-sheet">
    <header className="cfs-head"><div><p>WORK SLIP</p><h2>{draft.customer_name || active.title}</h2><em>{active.code || active.type}</em><span>{isEditableRecord ? "Churvox filled what it could. Red fields need owner input. Photos are optional evidence and do not block approval." : "This record is review-only here. Use the right action or open the full page backup."}</span></div><button type="button" onClick={onClose}>× Close</button></header>
    <section className="cfs-facts"><Fact label="Status" value={draft.status || active.state} missing={missing.status} /><Fact label="Value" value={value} missing={missing.amount} /><Fact label="Site" value={draft.site_address || "—"} missing={missing.site} /><Fact label="Customer" value={draft.customer_name || active.title} missing={missing.customer} /><Fact label="Worker" value={draft.worker_name || (recommendation?.best ? workerNameOf(recommendation.best.worker) : "—")} missing={missing.worker} /><Fact label="Invoice" value={draft.invoice_status} missing={missing.invoiceDescription} /></section>
    <section className="cfs-decision-grid"><article className="cfs-decision cfs-happened"><header><i>1</i><b>What happened</b></header><ul>{situation.map((x) => <CheckLine key={x}>{x}</CheckLine>)}</ul></article><article className="cfs-decision cfs-ai"><header><i>2</i><b>AI Recommendation</b></header><div className="cfs-ai-box"><strong>{blocked ? "⚠ Review first" : "✓ Ready"}</strong><p>{blocked ? "Churvox filled the form, but red fields still need owner input before approval. Photos are optional." : isJobLike && recommendation?.best ? `No worker conflict found, ${workerNameOf(recommendation.best.worker)} selected, invoice draft prepared, and customer update drafted.` : "Only the actions that make sense for this record are available below."}</p></div></article><article className={`cfs-decision cfs-attention ${blocked ? "cfs-blocked" : ""}`}><header><i>3</i><b>Needs attention</b></header><ul>{needs.map((x) => <WarnLine key={x}>{x}</WarnLine>)}</ul></article></section>
    <h3 className="cfs-section-title">Editable job form Churvox prepared</h3>
    <section className="cfs-job-form cfs-job-form-editable">
      <article className={mainMissing ? "cfs-missing-card" : ""}><header><small>{isJobLike ? "Job details" : "Record details"}</small><b>{isEditableRecord ? "Editable record" : "Review-only record"}</b></header><div className="cfs-form-grid"><Field label="Title" value={draft.title} onChange={updateDraft(setDraft, "title")} missing={missing.title} readOnly={!isEditableRecord} /><Field label="Client / customer" value={draft.customer_name} onChange={updateDraft(setDraft, "customer_name")} missing={missing.customer} readOnly={!isEditableRecord} /><Field label="Site address" value={draft.site_address} onChange={updateDraft(setDraft, "site_address")} missing={missing.site} readOnly={!isEditableRecord} /><SelectField label="Service type" value={draft.service_type} onChange={updateDraft(setDraft, "service_type")} options={SERVICE_OPTIONS} missing={missing.service} /><ScheduleField value={draft.scheduled} onChange={updateDraft(setDraft, "scheduled")} missing={missing.scheduled} /><SelectField label="Status" value={draft.status} onChange={updateDraft(setDraft, "status")} options={STATUS_OPTIONS} missing={missing.status} /><Field label="Description / scope" value={draft.meta} onChange={updateDraft(setDraft, "meta")} missing={missing.description} textarea readOnly={!isEditableRecord} /></div></article>
      <article className={assignmentMissing ? "cfs-missing-card" : ""}><header><small>Assignment</small><b>{isJobLike ? "Worker selected by AI" : "Not needed"}</b></header><div className="cfs-form-grid cfs-form-grid-small"><label className={`cfs-field ${missing.worker ? "is-missing" : "is-filled"}`}><span>Assigned worker</span><select disabled={!isJobLike} value={draft.worker_id || ""} onChange={(e) => changeWorker(e.target.value)}><option value="">{isJobLike ? "Needs owner input" : "Not needed"}</option>{workers.map((worker) => { const wid = workerIdOf(worker); const blockedWorker = isWorkerBlocked(worker) || workerHasActiveConflict(worker, jobs, active); return <option key={wid || worker.title} value={wid}>{workerNameOf(worker)}{blockedWorker ? ` · ${blockedWorker}` : worker.state ? ` · ${worker.state}` : ""}</option>; })}</select><em>{isJobLike ? (missing.worker ? "Needs owner input" : "AI selected") : "Not required"}</em></label><Field label="Assigned worker name" value={draft.worker_name} onChange={updateDraft(setDraft, "worker_name")} missing={missing.worker} readOnly={!isJobLike} /><Field label="AI reason / conflict check" value={recommendation?.summary || (isJobLike ? "Needs manual check" : "Not a worker-assignment record")} onChange={() => {}} textarea note="AI filled" readOnly /></div></article>
      <article className={pricingMissing ? "cfs-missing-card" : ""}><header><small>Pricing + invoice prep</small><b>Admin fields</b></header><div className="cfs-form-grid cfs-form-grid-small"><SelectField label="Pricing type" value={draft.pricing_type} onChange={updateDraft(setDraft, "pricing_type")} options={PRICING_OPTIONS} missing={missing.pricing} /><Field label="Amount" type="number" value={draft.amount} onChange={updateDraft(setDraft, "amount")} missing={missing.amount} readOnly={!isEditableRecord} /><SelectField label="Invoice status" value={draft.invoice_status} onChange={updateDraft(setDraft, "invoice_status")} options={INVOICE_STATUS_OPTIONS} note="Choose from list" /><Field label="Invoice description" value={draft.invoice_description} onChange={updateDraft(setDraft, "invoice_description")} missing={missing.invoiceDescription} textarea readOnly={!isEditableRecord} /></div></article>
      <article className={completionMissing ? "cfs-missing-card" : ""}><header><small>Completion</small><b>{isJobLike ? "Worker evidence" : "Not needed"}</b></header><div className="cfs-form-grid cfs-form-grid-small"><Field label="Worker notes" value={draft.worker_notes} onChange={updateDraft(setDraft, "worker_notes")} missing={missing.workerNotes} textarea readOnly={!isJobLike} /><Field label="Photos" value={photos.length ? `${photos.length} uploaded` : "Optional"} onChange={() => {}} missing={false} note="Optional evidence" readOnly /><Field label="Owner approval" value={blocked ? "Fix red fields first" : "Ready for available action"} onChange={() => {}} note="Type-aware" readOnly /></div></article>
    </section>
    <section className="cfs-lower"><article className={`cfs-card cfs-message ${missing.message ? "cfs-missing-card" : ""}`}><header><small>Draft customer update</small><b>{isEditableRecord ? "Draft before sending" : "Review-only"}</b></header><textarea readOnly={!isEditableRecord} placeholder="Needs owner input" value={draft.message || ""} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} /><p>{(draft.message || "").length} / 500</p></article><article className="cfs-card cfs-photos"><header><small>Evidence & photos</small><b>{photos.length ? `${photos.length} photos uploaded` : isJobLike ? "Optional" : "Not needed"}</b></header>{photos.length ? <div className="cfs-photo-row">{photos.slice(0, 3).map((photo, i) => <span key={`${photo.url || photo.label}-${i}`}>{photo.url ? <img src={photo.url} alt={photo.label} /> : null}</span>)}</div> : <div className="cfs-photo-placeholders"><span /><span /><span /></div>}<p>{photos.length ? `${photos.length} photos uploaded by worker` : isJobLike ? "Photos are optional. You can approve this work without photos." : "Photos are not required for this record type."}</p></article><article className="cfs-card cfs-next"><header><small>What happens after approval</small><b>{blocked ? "Fix red fields first" : "Action-specific"}</b></header><ul><CheckLine>Job approvals update job review status.</CheckLine><CheckLine>Invoice approval only appears for invoice records.</CheckLine><CheckLine>Customer message remains a draft until saved/sent elsewhere.</CheckLine></ul></article></section>
    {notice && <strong className="cfs-notice">{notice}</strong>}
    <footer className="cfs-actions">{isEditableRecord && <button type="button" disabled={busy} onClick={() => run("save")}>Save changes</button>}{isAction && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve & execute</button>}{isAction && <button className="danger" type="button" disabled={busy} onClick={() => run("reject")}>Reject action</button>}{isJobLike && <button className="primary" type="button" disabled={busy || blocked} onClick={() => run("approve")}>Approve work</button>}{isInvoice && <button className="primary" type="button" disabled={busy || blocked} onClick={() => run("approve")}>Approve invoice</button>}{isJobLike && <button type="button" disabled={busy || !draft.worker_id} onClick={() => run("assign")}>Assign worker</button>}{isJobLike && <button type="button" disabled={busy || !canPrepareInvoice} onClick={() => run("invoice")}>Prepare invoice</button>}{isEditableRecord && <button type="button" disabled={busy} onClick={() => run("message")}>Save message draft</button>}{hasRealBackup && <Link to={active.href}>Full page backup</Link>}{!isEditableRecord && !isAction && !hasRealBackup && <button type="button" disabled>Review-only record</button>}</footer>
  </section></aside>;
}
