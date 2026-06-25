import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ClipboardList, Clock3, MapPin, MessageCircle, Navigation, PauseCircle, Phone, PlayCircle, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "./WorkerCleanApp.css";
import "./WorkerFieldFlow.css";

const OFFLINE_QUEUE_KEY = "churvox-worker-offline-queue";
const FLOW_MARKER = "WORKER_APP_14_FIELD_FLOW_20260625";

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file) {
  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("image decode failed"));
    el.src = dataUrl;
  });
  const maxWidth = 1600;
  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function oid(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return oid(value.$oid || value.oid || value.id || value._id || value.job_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function jobIdOf(job) { return oid(job?.id || job?._id || job?.job_id || ""); }
function statusOf(job) { return String(job?.status || "assigned").toLowerCase().replaceAll(" ", "_"); }
function reviewStatus(job) { return String(job?.work_review_status || job?.review_status || job?.owner_review_status || "").trim().toLowerCase(); }
function isSentBack(job) { return reviewStatus(job) === "sent_back" || job?.worker_action_required === true; }
function jobTitle(job) { return job?.title || job?.job_name || job?.job_type || job?.service_type || "Untitled job"; }
function clientName(job) { return job?.client_name || job?.customer_name || job?.client || job?.customer || "No customer"; }
function addressOf(job) { return job?.address || job?.site_address || job?.service_address || job?.job_address || ""; }
function instructionsOf(job) { return job?.worker_instructions || job?.instructions || job?.notes || job?.job_notes || job?.description || ""; }
function ownerNoteOf(job) { return job?.owner_note || job?.boss_note || job?.send_back_note || ""; }
function customerPhone(job) { return job?.customer_phone || job?.client_phone || job?.phone || job?.mobile || job?.contact_phone || ""; }
function customerEmail(job) { return job?.customer_email || job?.client_email || job?.email || job?.contact_email || ""; }
function customerContactAllowed(job) { return Boolean(job?.worker_can_contact_customer || job?.allow_worker_customer_contact || job?.show_customer_contact_to_worker || job?.customer_contact_allowed); }

function dateText(job) {
  const date = String(job?.scheduled_date || job?.date || job?.start || job?.due_date || "").slice(0, 10);
  const time = job?.scheduled_time || job?.time || "";
  return [date, time].filter(Boolean).join(" · ") || "No time set";
}

function defaultChecklist(job) {
  const raw = job?.worker_checklist || job?.checklist || job?.job_checklist || job?.completion_checklist;
  const source = Array.isArray(raw) && raw.length ? raw : [
    "Check address and access",
    "Read boss instructions",
    "Take before/after photo if useful",
    "Clean up and confirm the work is done",
    "Leave notes for owner review",
  ];
  return source.map((item, index) => {
    if (typeof item === "object") {
      return { id: item.id || item.key || `check-${index}`, label: item.label || item.title || item.text || `Step ${index + 1}`, done: Boolean(item.done || item.completed || item.checked) };
    }
    return { id: `check-${index}`, label: String(item), done: false };
  });
}

function readJson(key, fallback) {
  try { return JSON.parse(window.localStorage.getItem(key) || "") || fallback; } catch { return fallback; }
}
function writeJson(key, value) { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {} }
function draftKey(jobId) { return `churvox-worker-job-draft:${jobId}`; }
function queuedItems() { return readJson(OFFLINE_QUEUE_KEY, []); }
function queueOffline(item) {
  const next = [...queuedItems(), { ...item, queued_at: new Date().toISOString() }].slice(-40);
  writeJson(OFFLINE_QUEUE_KEY, next);
  return next.length;
}
function minutesFromTimer(startedAt) { return startedAt ? Math.max(0, Math.round((Date.now() - Number(startedAt)) / 60000)) : 0; }

async function reverseGeocodeLocation(location) {
  const lat = location?.lat ?? location?.latitude;
  const lng = location?.lng ?? location?.longitude;
  if (!lat || !lng) return "";
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`, {
      signal: controller.signal,
      headers: { Accept: "application/json", "Accept-Language": "en-NZ,en;q=0.9" },
    });
    window.clearTimeout(timer);
    if (!res.ok) return "";
    const data = await res.json();
    return data?.display_name || "";
  } catch {
    return "";
  }
}

function getGpsPosition() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        const addressLabel = await reverseGeocodeLocation(location);
        resolve({ ...location, address_label: addressLabel, display_name: addressLabel });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 120000 }
    );
  });
}

function ProofSteps({ photoCount, workerNotes, complete }) {
  const hasNote = String(workerNotes || "").trim().length > 0;
  const hasPhoto = Number(photoCount || 0) > 0;
  return (
    <section className="wc-proof-steps">
      <div className={hasPhoto ? "done" : ""}><b>{hasPhoto ? "✓" : "1"}</b><span>Add photo proof</span></div>
      <div className={hasNote ? "done" : ""}><b>{hasNote ? "✓" : "2"}</b><span>Leave message</span></div>
      <div className={complete ? "done" : ""}><b>{complete ? "✓" : "3"}</b><span>Send to owner</span></div>
    </section>
  );
}

export default function WorkerJobDetailPage() {
  const { id } = useParams();
  const { get, post, patch } = useApi();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerNotes, setWorkerNotes] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showContactOffice, setShowContactOffice] = useState(false);
  const [proofPrompt, setProofPrompt] = useState(false);
  const [workerStatus, setWorkerStatus] = useState("assigned");
  const [checklist, setChecklist] = useState([]);
  const [materialsText, setMaterialsText] = useState("");
  const [issueFound, setIssueFound] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(0);
  const [timerStartedAt, setTimerStartedAt] = useState(0);
  const [queuedCount, setQueuedCount] = useState(() => queuedItems().length);
  const [elapsedTick, setElapsedTick] = useState(0);

  const loadJob = useCallback(async () => {
    setLoading(true);
    try {
      let nextJob = null;
      const direct = await get(`/jobs/${encodeURIComponent(id)}`);
      if (direct?.success) nextJob = direct.data?.job || direct.data?.data?.job || direct.data?.data || direct.data || null;
      if (!nextJob || !jobIdOf(nextJob)) {
        const listRes = await get("/jobs");
        nextJob = arr(listRes?.data).find((item) => jobIdOf(item) === String(id)) || null;
      }
      if (!nextJob) throw new Error("not found");
      const draft = readJson(draftKey(id), {});
      setJob(nextJob);
      setWorkerNotes(draft.worker_notes ?? nextJob?.worker_notes ?? "");
      setWorkerStatus(draft.worker_status || statusOf(nextJob));
      setChecklist(Array.isArray(draft.checklist) ? draft.checklist : defaultChecklist(nextJob));
      setMaterialsText(draft.materials_used || nextJob?.materials_used || "");
      setIssueFound(Boolean(draft.issue_found ?? nextJob?.issue_found));
      setTimeMinutes(Number(draft.worker_time_minutes ?? nextJob?.worker_time_minutes ?? nextJob?.time_spent_minutes ?? 0) || 0);
      setTimerStartedAt(Number(draft.timer_started_at || 0));
    } catch {
      setJob(null);
      toast.error("Could not load this job.");
    } finally {
      setLoading(false);
    }
  }, [get, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  useEffect(() => {
    if (!timerStartedAt) return undefined;
    const timer = window.setInterval(() => setElapsedTick((value) => value + 1), 15000);
    return () => window.clearInterval(timer);
  }, [timerStartedAt]);

  useEffect(() => {
    if (!job) return;
    writeJson(draftKey(id), {
      worker_notes: workerNotes,
      worker_status: workerStatus,
      checklist,
      materials_used: materialsText,
      issue_found: issueFound,
      worker_time_minutes: timeMinutes,
      timer_started_at: timerStartedAt,
      saved_at: new Date().toISOString(),
    });
  }, [checklist, id, issueFound, job, materialsText, timeMinutes, timerStartedAt, workerNotes, workerStatus]);

  async function sendLivePing(payload) {
    try { await post("/worker/live-ping", payload); } catch {}
  }

  async function syncOfflineQueue() {
    const queue = queuedItems();
    if (!queue.length) { setQueuedCount(0); toast.success("No offline updates waiting"); return; }
    const remaining = [];
    for (const item of queue) {
      try {
        const res = item.method === "post" ? await post(item.path, item.payload) : await patch(item.path, item.payload);
        if (!res?.success) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    writeJson(OFFLINE_QUEUE_KEY, remaining);
    setQueuedCount(remaining.length);
    if (remaining.length) toast.error(`${remaining.length} update${remaining.length === 1 ? "" : "s"} still waiting for signal`);
    else toast.success("Offline updates synced");
    await loadJob();
  }

  async function saveFieldUpdate(payload, { quiet = false } = {}) {
    const enriched = { ...payload, worker_app_flow: FLOW_MARKER, worker_updated_at: new Date().toISOString() };
    try {
      const res = await patch(`/worker/jobs/${encodeURIComponent(id)}/field-update`, enriched);
      if (!res?.success) throw new Error(res?.error || "Could not save update");
      if (!quiet) toast.success("Saved");
      return true;
    } catch {
      const count = queueOffline({ method: "patch", path: `/worker/jobs/${encodeURIComponent(id)}/field-update`, payload: enriched });
      setQueuedCount(count);
      if (!quiet) toast.error("No signal. Saved offline and will sync later.");
      return false;
    }
  }

  async function saveNotes(text = workerNotes) {
    const trimmed = String(text || "").trim();
    setWorkerNotes(trimmed);
    return saveFieldUpdate({ worker_notes: trimmed });
  }

  async function updateWorkerStatus(nextStatus) {
    setWorkerStatus(nextStatus);
    if (nextStatus === "started" && !timerStartedAt) setTimerStartedAt(Date.now());
    if (nextStatus === "paused" && timerStartedAt) stopTimer(false);
    await saveFieldUpdate({
      status: nextStatus === "on_my_way" ? "assigned" : nextStatus,
      job_status: nextStatus,
      workflow_status: nextStatus,
      worker_live_status: nextStatus.replaceAll("_", " "),
      worker_status: nextStatus,
      worker_status_updated_at: new Date().toISOString(),
    }, { quiet: true });
    await sendLivePing({ source: "worker-status", job_id: id, job_title: jobTitle(job), job_status: nextStatus, live_status: nextStatus.replaceAll("_", " ") });
    toast.success(nextStatus.replaceAll("_", " "));
  }

  function startTimer() {
    setTimerStartedAt(Date.now());
    if (workerStatus !== "started") updateWorkerStatus("started");
  }

  function stopTimer(showToast = true) {
    const added = minutesFromTimer(timerStartedAt);
    setTimeMinutes((value) => Number(value || 0) + added);
    setTimerStartedAt(0);
    if (showToast) toast.success(`Added ${added || 0} min`);
  }

  async function toggleChecklist(index) {
    const next = checklist.map((item, i) => i === index ? { ...item, done: !item.done } : item);
    setChecklist(next);
    await saveFieldUpdate({ worker_checklist: next, checklist: next }, { quiet: true });
  }

  async function addPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image"); return; }
    const existing = Array.isArray(job?.photos) ? job.photos : [];
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      const photos = [...existing, dataUrl];
      const ok = await saveFieldUpdate({ photos }, { quiet: true });
      setJob((prev) => ({ ...prev, photos }));
      setProofPrompt(false);
      toast.success(ok ? "Photo added" : "Photo saved offline");
    } catch {
      toast.error("Could not process this photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(index) {
    const photos = (Array.isArray(job?.photos) ? job.photos : []).filter((_, i) => i !== index);
    const ok = await saveFieldUpdate({ photos }, { quiet: true });
    setJob((prev) => ({ ...prev, photos }));
    if (!ok) toast.error("No signal. Photo removal queued.");
  }

  async function saveMaterials() {
    await saveFieldUpdate({ materials_used: materialsText, issue_found: issueFound });
  }

  async function finishJob() {
    const photos = Array.isArray(job?.photos) ? job.photos : [];
    const note = String(workerNotes || "").trim();
    const finalTimeMinutes = Number(timeMinutes || 0) + minutesFromTimer(timerStartedAt);
    if (!photos.length && !note) {
      setProofPrompt(true);
      document.getElementById("worker-proof")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.info("Add a photo or message before sending this to the boss.");
      return;
    }
    setSaving(true);
    try {
      if (timerStartedAt) { setTimeMinutes(finalTimeMinutes); setTimerStartedAt(0); }
      if (note) await saveNotes(note);
      const location = await getGpsPosition();
      const payload = {
        worker_notes: note,
        photos,
        worker_checklist: checklist,
        checklist,
        materials_used: materialsText,
        issue_found: issueFound,
        worker_time_minutes: finalTimeMinutes,
        completed_by_worker: true,
        work_review_status: "ready_for_review",
        review_status: "ready_for_review",
        owner_review_status: "ready_for_review",
        worker_action_required: false,
        completed_at: new Date().toISOString(),
        worker_app_flow: FLOW_MARKER,
      };
      if (location) payload.location = location;
      let res = null;
      try { res = await post(`/worker/jobs/${encodeURIComponent(id)}/complete`, payload); } catch { res = null; }
      if (res?.success) {
        await sendLivePing({ source: "job-finished", live_status: "Finished job", clock_status: "clocked_in", job_id: id, job_title: jobTitle(job), job_status: "completed", location });
        setWorkerStatus("completed");
        toast.success("Job sent to owner");
        try { window.localStorage.removeItem(draftKey(id)); } catch {}
        await loadJob();
      } else {
        const count = queueOffline({ method: "post", path: `/worker/jobs/${encodeURIComponent(id)}/complete`, payload });
        setQueuedCount(count);
        toast.error("No signal. Completion saved offline.");
      }
    } finally {
      setSaving(false);
    }
  }

  const currentTimerMinutes = timeMinutes + minutesFromTimer(timerStartedAt) + (elapsedTick * 0);

  if (loading) return <div className="wc-screen wc-loading-screen"><RefreshCw className="spin" /><b>Loading job…</b></div>;
  if (!job) return <div className="wc-screen wc-loading-screen"><AlertTriangle /><b>Job not found</b><Link to="/worker/jobs">Back to today’s jobs</Link></div>;

  const address = addressOf(job);
  const instructions = instructionsOf(job);
  const ownerNote = ownerNoteOf(job);
  const photos = Array.isArray(job?.photos) ? job.photos : [];
  const noteReady = String(workerNotes || "").trim().length > 0;
  const photoReady = photos.length > 0;
  const complete = ["completed", "complete", "done", "finished"].includes(statusOf(job)) || workerStatus === "completed";
  const sentBack = isSentBack(job);
  const phone = customerPhone(job);
  const email = customerEmail(job);
  const canContact = customerContactAllowed(job) && (phone || email);
  const checkedCount = checklist.filter((item) => item.done).length;

  return (
    <div className="wc-screen wc-job-screen" data-worker-flow={FLOW_MARKER}>
      <header className="wc-topbar">
        <div><Link to="/worker/jobs" className="wc-back"><ArrowLeft /> Jobs</Link><b>{complete ? "Job sent" : "Open job"}</b></div>
        <button type="button" onClick={() => setShowContactOffice(true)}><MessageCircle /></button>
      </header>

      <main className="wc-main">
        <section className="wc-job-hero"><span>{sentBack ? "Owner needs fix" : complete ? "Sent to owner" : "Job details"}</span><h1>{jobTitle(job)}</h1><p>{clientName(job)}</p><small>{dateText(job)}</small></section>

        {queuedCount ? <section className="wc-alert need"><Send /><div><b>{queuedCount} offline update{queuedCount === 1 ? "" : "s"} waiting</b><span>Saved on this phone. Sync when signal is back.</span><button type="button" className="wc-mini-action" onClick={syncOfflineQueue}>Sync now</button></div></section> : null}
        {sentBack ? <section className="wc-alert"><AlertTriangle /><div><b>Boss sent this back</b><span>{ownerNote || "Check the job, add photo or message, then send it again."}</span></div></section> : null}

        <section className="wc-status-strip" aria-label="Job status buttons">
          <button type="button" className={workerStatus === "on_my_way" ? "active" : ""} onClick={() => updateWorkerStatus("on_my_way")} disabled={complete}>On my way</button>
          <button type="button" className={workerStatus === "started" ? "active" : ""} onClick={() => updateWorkerStatus("started")} disabled={complete}>Started</button>
          <button type="button" className={workerStatus === "paused" ? "active" : ""} onClick={() => updateWorkerStatus("paused")} disabled={complete}>Paused</button>
          <button type="button" onClick={() => setShowContactOffice(true)} disabled={complete}>Need help</button>
        </section>

        <section className="wc-card wc-timer-card"><div className="wc-section-head"><span>Time</span><h2>{currentTimerMinutes} min</h2><p>Track time for this job. It is included when you send the job to owner review.</p></div><div className="wc-two-actions">{!timerStartedAt ? <button type="button" onClick={startTimer}><PlayCircle size={18} /> Start timer</button> : <button type="button" onClick={() => stopTimer()}><PauseCircle size={18} /> Stop timer</button>}<button type="button" onClick={() => saveFieldUpdate({ worker_time_minutes: currentTimerMinutes })}><Clock3 size={18} /> Save time</button></div></section>

        <section className="wc-card"><div className="wc-section-head"><span>Where</span><h2>Address</h2></div>{address ? <p><MapPin size={17} /> {address}</p> : <p><MapPin size={17} /> No address added.</p>}{address ? <a className="wc-map-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><Navigation size={17} /> Open directions</a> : null}</section>

        <section className="wc-card"><div className="wc-section-head"><span>Customer contact</span><h2>{canContact ? "Contact allowed" : "Hidden by owner"}</h2><p>{canContact ? "Use only for job access or arrival updates." : "Customer phone/email stays hidden unless the owner turns it on for workers."}</p></div>{canContact ? <div className="wc-two-actions">{phone ? <a href={`tel:${phone}`}><Phone size={18} /> Call customer</a> : null}{phone ? <a href={`sms:${phone}`}><MessageCircle size={18} /> Text customer</a> : null}{email ? <a href={`mailto:${email}`}><Send size={18} /> Email customer</a> : null}</div> : null}</section>

        <section className="wc-card"><div className="wc-section-head"><span>Instructions</span><h2>What to do</h2></div><p>{instructions || "No special instructions added. Do the job as assigned."}</p></section>

        <section className="wc-card"><div className="wc-section-head"><span>Checklist</span><h2>{checkedCount}/{checklist.length || 0} done</h2><p>Tick off the field steps so the owner gets consistent work back.</p></div><div className="wc-checklist">{checklist.map((item, index) => <button type="button" key={item.id || item.label} className={item.done ? "done" : ""} onClick={() => toggleChecklist(index)}><b>{item.done ? "✓" : index + 1}</b><span>{item.label}</span></button>)}</div><button type="button" className="wc-save-note" onClick={() => saveFieldUpdate({ worker_checklist: checklist, checklist })}>Save checklist</button></section>

        <section className="wc-card" id="worker-proof"><div className="wc-section-head"><span>Proof</span><h2>Photos and message</h2><p>Before you send it, add a photo or leave the boss a quick message.</p></div>{proofPrompt ? <section className="wc-alert need"><Camera /><div><b>Add proof first</b><span>Take a photo or write a quick message, then press “I’ve finished this job” again.</span></div></section> : null}<ProofSteps photoCount={photos.length} workerNotes={workerNotes} complete={complete} /><label className="wc-photo-button"><Camera size={22} />{uploadingPhoto ? "Adding photo…" : "Add photo"}<input type="file" accept="image/*" capture="environment" onChange={addPhoto} disabled={uploadingPhoto} /></label>{photos.length ? <div className="wc-photo-grid">{photos.map((src, index) => <div className="wc-photo-thumb" key={`${src}-${index}`}><img src={src} alt={`Job proof ${index + 1}`} /><button type="button" onClick={() => removePhoto(index)}><X size={14} /></button></div>)}</div> : <p className="wc-empty-proof">No photos yet.</p>}<textarea className="wc-textarea" rows={4} value={workerNotes} onChange={(event) => { setWorkerNotes(event.target.value); if (event.target.value.trim()) setProofPrompt(false); }} placeholder="Message for boss… e.g. Done lawns and edges. Gate was locked at first." /><button type="button" className="wc-save-note" onClick={() => saveNotes(workerNotes)}>Save message</button></section>

        <section className="wc-card"><div className="wc-section-head"><span>Materials</span><h2>Parts or extras used</h2><p>Add anything the owner should review before invoicing.</p></div><textarea className="wc-textarea" rows={3} value={materialsText} onChange={(event) => setMaterialsText(event.target.value)} placeholder="Example: 2 bags mulch, 30 min extra, replacement latch" /><label className="wc-issue-toggle"><input type="checkbox" checked={issueFound} onChange={(event) => setIssueFound(event.target.checked)} /> Issue found or extra owner review needed</label><button type="button" className="wc-save-note" onClick={saveMaterials}>Save materials</button></section>

        <section className="wc-card wc-wrap-card"><div className="wc-section-head"><span>Daily wrap-up</span><h2>Before you finish</h2><p>Quick summary for owner review.</p></div><div className="wc-wrap-grid"><article><span>Time</span><b>{currentTimerMinutes} min</b></article><article><span>Checklist</span><b>{checkedCount}/{checklist.length || 0}</b></article><article><span>Photos</span><b>{photos.length}</b></article><article><span>Issue</span><b>{issueFound ? "Yes" : "No"}</b></article></div></section>

        <section className={`wc-finish ${noteReady || photoReady ? "ready" : ""}`}><div><span>Finish</span><h2>{complete ? "Sent to owner" : "I’ve finished this job"}</h2><p>{complete ? "The owner can now review the work." : "This sends the job, photos, checklist, materials, time and message back to the boss."}</p></div><button type="button" disabled={saving || complete} onClick={finishJob}><CheckCircle2 size={20} />{saving ? "Sending…" : complete ? "Finished" : "I’ve finished this job"}</button></section>

        <section className="wc-card"><div className="wc-section-head"><span>Help</span><h2>Need help?</h2></div><p>Message the boss if the address, access, instructions or job scope is wrong.</p><button type="button" className="wc-save-note" onClick={() => setShowContactOffice(true)}><ClipboardList size={17} /> Message boss</button></section>
      </main>

      <WorkerContactOfficePanel open={showContactOffice} onClose={() => setShowContactOffice(false)} jobId={id} jobTitle={jobTitle(job)} defaultMessage={`I need help with this job: ${jobTitle(job)}`} />
      <WorkerBottomNav active="jobs" />
    </div>
  );
}
