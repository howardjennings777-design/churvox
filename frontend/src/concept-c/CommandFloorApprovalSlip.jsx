import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./CommandFloorApprovalSlip.css";

const str = (v) => String(v || "").trim();
const low = (v) => str(v).toLowerCase();
const idOf = (v) => str(v?.id || v?._id || v?.uuid || "");
const firstText = (...values) => values.map(str).find(Boolean) || "";
const cash = (v) => `$${Number(v || 0).toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;

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
  return buckets.flatMap((bucket) => Array.isArray(bucket) ? bucket : bucket ? [bucket] : [])
    .map((photo, index) => ({ url: photoUrl(photo), label: typeof photo === "string" ? `Evidence ${index + 1}` : firstText(photo.label, photo.caption, photo.filename, photo.name, photo.title, `Evidence ${index + 1}`) }))
    .filter((photo) => {
      const key = photo.url || photo.label;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function workerNameOf(worker) {
  return firstText(worker?.raw?.name, worker?.raw?.full_name, worker?.raw?.email, worker?.title, worker?.name, "Worker");
}
function workerIdOf(worker) {
  return idOf(worker?.raw || worker) || idOf(worker);
}

function messageDraftFromPicked(picked, draft = {}) {
  const raw = picked?.raw || {};
  const customer = firstText(raw.customer_name, raw.client_name, raw.name, picked?.title, "there");
  const site = firstText(raw.address, raw.site_address, raw.job_address, raw.location);
  const siteLine = site ? ` at ${site}` : "";
  const description = firstText(raw.generated_message, raw.draft_message, raw.customer_message_draft, raw.last_message_draft, raw.message, raw.completion_notes, raw.worker_completion_notes, raw.worker_notes, raw.job_notes, raw.notes, raw.description, draft?.meta, picked?.meta);
  if (picked?.type === "invoice") return `Hi ${customer},\n\nYour invoice is ready for review.\n\n${description || "This covers the completed service work."}\n\nThanks,\nChurvox`;
  if (picked?.type === "quote") return `Hi ${customer},\n\nYour quote is ready for review.\n\n${description || "Please check the scope and let us know if you would like to go ahead."}\n\nThanks,\nChurvox`;
  if (picked?.type === "action") return firstText(raw.generated_message, raw.draft_message, raw.recommendation, raw.owner_facing_explanation, raw.reason, "AI prepared this action. Review before approving.");
  return `Hi ${customer},\n\nQuick update on your job${siteLine}.\n\n${description || "The work has been reviewed and the next admin step is being prepared."}\n\nThanks,\nChurvox`;
}

function evidenceText(raw = {}, fallback = "") {
  const scope = firstText(raw.ai_approval_summary, raw.description, raw.job_description, raw.service_description, raw.scope, fallback, "No job description recorded.");
  const workerNotes = firstText(raw.worker_completion_notes, raw.completion_notes, raw.worker_notes, raw.job_notes, raw.notes, "No worker notes recorded yet.");
  const price = moneyNumber(raw.price, raw.job_price, raw.fixed_price, raw.total, raw.amount, raw.subtotal, raw.hourly_total);
  const photos = evidencePhotos(raw).length || Number(raw.photo_count || 0);
  return [`Scope: ${scope}`, `Worker notes: ${workerNotes}`, `Evidence: ${photos ? `${photos} photo${photos === 1 ? "" : "s"}` : "No photos recorded"}`, `Price: ${price ? cash(price) : "No price set"}`, `Invoice: ${firstText(raw.invoice_number, raw.draft_invoice_id, raw.invoice_id, raw.invoiced ? "Linked" : "Not linked")}`].join("\n");
}

function approvalBrief(picked, draft) {
  const raw = picked?.raw || {};
  const isJobLike = picked?.type === "job" || picked?.type === "work_review";
  const isAction = picked?.type === "action";
  const customer = firstText(raw.client_name, raw.customer_name, raw.name, raw.email, picked?.title, "Customer not recorded");
  const site = firstText(raw.address, raw.site_address, raw.job_address, raw.location, "No site address recorded");
  const assigned = firstText(raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, raw.assigned_worker_email, raw.assigned_worker_id, "Not assigned yet");
  const value = Number(picked?.amount || 0) > 0 ? cash(picked.amount) : "No price set";
  if (isAction) return { summary: "AI prepared this action. Check the reason and outcome before approving.", description: detailText(raw, picked?.meta || "AI action waiting for approval."), outcome: firstText(raw.what_happens, raw.outcome, "Approval runs the saved AI Operator action."), facts: [["Risk", raw.risk || raw.risk_level || "medium"], ["Action", raw.action_type || raw.type || "AI action"], ["Status", raw.status || picked.state || "pending"], ["Created", firstText(raw.created_at, raw.updated_at, "Not recorded")]] };
  return { summary: isJobLike ? "Approve this job only if the evidence matches the work done on site." : `Review this ${picked?.type || "record"} before taking the next step.`, description: isJobLike ? evidenceText(raw, draft?.meta || picked?.meta) : detailText(raw, draft?.meta || picked?.meta || "No detail recorded."), outcome: isJobLike ? "Approval moves this work into the invoice/admin lane." : "Save changes only. Approval buttons are limited by record type.", facts: [["Customer", customer], ["Site", site], ["Assigned", assigned], ["Value", value], ["Status", picked?.state || raw.status || "Review"]] };
}

function actionWorked(msg) {
  return !/^(could not|action failed|need |select |choose |no message|this record|open a record|only jobs)/i.test(str(msg));
}

function patchPickedAfterAction(picked, action, draft, msg) {
  if (!actionWorked(msg)) return null;
  const raw = { ...(picked?.raw || {}) };
  const next = { ...picked, raw };
  if (action === "save") { raw.title = draft.title; raw.description = draft.meta; raw.status = draft.status; next.title = draft.title || picked.title; next.meta = draft.meta || picked.meta; next.state = draft.status || picked.state; }
  if (action === "approve") { raw.status = picked.type === "invoice" ? "approved" : raw.status; raw.owner_review_status = "approved"; raw.work_review_status = "approved"; raw.reviewed = true; next.status = "approved"; next.state = picked.type === "invoice" ? "approved" : "Approved"; }
  if (action === "assign") { raw.assigned_worker_id = draft.worker_id; raw.assigned_worker_name = draft.worker_name; raw.assigned_to = draft.worker_id; raw.status = raw.status || "assigned"; next.state = raw.status || "assigned"; }
  if (action === "message") { raw.customer_message_draft = draft.message; raw.draft_message = draft.message; raw.last_message_draft = draft.message; }
  if (action === "invoice") { raw.draft_invoice_id = raw.draft_invoice_id || "prepared"; raw.invoice_description_draft = draft.meta || raw.invoice_description_draft; next.state = "Invoice prepared"; }
  if (picked.type === "action" && (action === "approve" || action === "reject")) { raw.status = action === "approve" ? "approved" : "rejected"; next.status = raw.status; next.state = raw.status; }
  return next;
}

function Field({ label, value, onChange, textarea = false }) {
  return <label className="cfs-field"><span>{label}</span>{textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}

function Fact({ label, value }) {
  return <span><small>{label}</small><b>{value || "—"}</b></span>;
}

function LaneSlip({ active, onClose, onPick }) {
  const items = active.items || [];
  return <aside className="cfs-overlay cfs-lane-slip" data-version="CHURVOX_REAL_APPROVAL_SLIP_REPLACEMENT_20260527">
    <section className="cfs-sheet">
      <header className="cfs-head"><div><p>{active.code || "APPROVAL LANE"}</p><h2>{active.title}</h2><em>{active.meta}</em></div><button type="button" onClick={onClose}>Close</button></header>
      <section className="cfs-lane-summary"><Fact label="Waiting" value={items.length} /><Fact label="Total value" value={Number(active.amount || 0) > 0 ? cash(active.amount) : "—"} /><strong>{active.actionLabel || "Open a row to approve the detail."}</strong></section>
      <section className="cfs-lane-list">{items.length ? items.slice(0, 12).map((x, i) => <button className="cfs-lane-row" type="button" key={`${x.type}-${x.id}-${i}`} onClick={() => onPick(x)}><span><b>{x.title}</b><small>{x.code} · {detailText(x.raw || {}, x.meta)}</small></span><em>{Number(x.amount || 0) > 0 ? cash(x.amount) : x.state}</em></button>) : <div className="cfs-empty">Nothing waiting in this lane.</div>}</section>
      <footer className="cfs-actions">{items.length ? <button className="primary" type="button" onClick={() => onPick(items[0])}>Open first waiting item</button> : <button disabled type="button">Nothing waiting</button>}</footer>
    </section>
  </aside>;
}

export default function CommandFloorApprovalSlip({ picked, onClose, onAction, onPick, workers = [] }) {
  const [localPicked, setLocalPicked] = useState(null);
  const [draft, setDraft] = useState({ title: "", meta: "", status: "", worker_id: "", worker_name: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setLocalPicked(picked);
    const raw = picked?.raw || {};
    const currentWorkerId = firstText(raw.assigned_worker_id, raw.worker_id, raw.assigned_to);
    const currentWorkerName = firstText(raw.assigned_worker_name, raw.worker_name, raw.assigned_to_name, raw.assigned_worker_email);
    const nextMeta = detailText(raw, picked?.meta || "");
    setDraft({ title: picked?.title || "", meta: nextMeta, status: picked?.state || "", worker_id: currentWorkerId, worker_name: currentWorkerName, message: messageDraftFromPicked(picked, { meta: nextMeta }) });
    setNotice("");
    setBusy(false);
  }, [picked]);

  const active = localPicked || picked;
  const photos = useMemo(() => evidencePhotos(active?.raw || {}), [active]);
  if (!active) return null;
  if (active.type === "action_group") return <LaneSlip active={active} onClose={onClose} onPick={onPick} />;

  const isAction = active.type === "action";
  const isJobLike = active.type === "job" || active.type === "work_review";
  const brief = approvalBrief(active, draft);

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

  return <aside className="cfs-overlay" data-version="CHURVOX_REAL_APPROVAL_SLIP_REPLACEMENT_20260527">
    <section className="cfs-sheet">
      <header className="cfs-head"><div><p>{active.code || active.type}</p><h2>{active.title}</h2><em>{brief.summary}</em></div><button type="button" onClick={onClose}>Close</button></header>

      <section className="cfs-facts"><Fact label="Status" value={active.state} /><Fact label="Value" value={Number(active.amount || 0) > 0 ? cash(active.amount) : "—"} /><Fact label="Code" value={active.code} />{brief.facts.slice(0, 3).map(([label, value]) => <Fact key={label} label={label} value={value} />)}</section>

      <section className="cfs-main"><article className="cfs-card cfs-brief"><header><small>{isAction ? "AI action" : isJobLike ? "Evidence brief" : "Approval brief"}</small><b>{isAction ? "Approve or reject this action" : isJobLike ? "Evidence before approval" : "What you are reviewing"}</b></header><p>{brief.description}</p><strong>{brief.outcome}</strong></article><article className="cfs-card cfs-evidence"><header><small>Evidence</small><b>{photos.length ? `${photos.length} photo${photos.length === 1 ? "" : "s"}` : "No photos saved"}</b></header>{photos.length ? <div className="cfs-photo-row">{photos.slice(0, 4).map((photo, i) => <span key={`${photo.url || photo.label}-${i}`}>{photo.url ? <img src={photo.url} alt={photo.label} /> : null}<small>{photo.label}</small></span>)}</div> : <p>No site photos are saved on this record.</p>}</article></section>

      <section className="cfs-edit"><Field label="Title" value={draft.title} onChange={(v) => setDraft((d) => ({ ...d, title: v }))} /><Field label="Approval description / edit before saving" value={draft.meta} onChange={(v) => setDraft((d) => ({ ...d, meta: v }))} textarea /><Field label="Status" value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} /></section>

      <section className="cfs-lower"><article className="cfs-card"><header><small>Customer message</small><b>Draft before sending</b></header><textarea value={draft.message} onChange={(e) => setDraft((d) => ({ ...d, message: e.target.value }))} /><p>Nothing sends from here. This only saves the draft.</p></article>{isJobLike && <article className="cfs-card"><header><small>Worker assignment</small><b>Assign worker in this slip</b></header><select value={draft.worker_id} onChange={(e) => changeWorker(e.target.value)}><option value="">Choose worker</option>{workers.map((worker) => { const wid = workerIdOf(worker); return <option key={wid || worker.title} value={wid}>{workerNameOf(worker)}{worker.state ? ` · ${worker.state}` : ""}</option>; })}</select><p>{draft.worker_name ? `Selected: ${draft.worker_name}` : workers.length ? "Pick a worker, then tap Assign worker." : "No workers loaded yet."}</p></article>}<article className="cfs-card cfs-next"><header><small>Next step</small><b>Owner approval only</b></header><p>Use the buttons below. Nothing sends without owner action.</p></article></section>

      {notice && <strong className="cfs-notice">{notice}</strong>}
      <footer className="cfs-actions">{!isAction && <button type="button" disabled={busy} onClick={() => run("save")}>Save changes</button>}{isAction && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve & execute</button>}{isAction && <button className="danger" type="button" disabled={busy} onClick={() => run("reject")}>Reject action</button>}{isJobLike && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve work</button>}{active.type === "invoice" && <button className="primary" type="button" disabled={busy} onClick={() => run("approve")}>Approve invoice</button>}{isJobLike && <button type="button" disabled={busy || !draft.worker_id} onClick={() => run("assign")}>Assign worker</button>}{isJobLike && <button type="button" disabled={busy} onClick={() => run("invoice")}>Prepare invoice</button>}{!isAction && <button type="button" disabled={busy} onClick={() => run("message")}>Save message draft</button>}{active.href && active.href !== "#" && <Link to={active.href}>Full page backup</Link>}</footer>
    </section>
  </aside>;
}
