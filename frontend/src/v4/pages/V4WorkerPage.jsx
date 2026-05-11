import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Home,
  LogOut,
  MapPinned,
  MessageSquare,
  Navigation,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  StickyNote,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { get, patch, post } from "../../lib/api";
const lower = (v) => String(v || "").toLowerCase();
const list = (payload) => Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.data?.jobs) ? payload.data.jobs : Array.isArray(payload?.jobs) ? payload.jobs : Array.isArray(payload) ? payload : [];
const idOf = (j) => j?.id || j?._id || j?.job_id;
const titleOf = (j) => j?.title || j?.job_title || j?.service_type || j?.service || j?.name || "Job";
const clientOf = (j) => j?.client_name || j?.customer_name || j?.client?.name || j?.customer?.name || "Client not set";
const addressOf = (j) => j?.address || j?.site_address || j?.job_address || j?.property_address || j?.location || "Address not set";
const instructionsOf = (j) => j?.instructions || j?.description || j?.scope || j?.notes || "No instructions added yet.";
const statusOf = (j) => lower(j?.status || j?.job_status || "assigned").replace(/\s+/g, "_");
const photosOf = (j) => Array.isArray(j?.photos) ? j.photos : Array.isArray(j?.worker_photos) ? j.worker_photos : Array.isArray(j?.photo_urls) ? j.photo_urls : [];
const workerNoteOf = (j) => j?.worker_notes || j?.worker_note || "";

function when(j) {
  const d = new Date(j?.scheduled_at || j?.scheduledAt || j?.start_time || j?.due_date || j?.created_at || "");
  return Number.isNaN(d.getTime()) ? "Today" : d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function mapUrl(address) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`; }
function label(s) { return { assigned: "Assigned", acknowledged: "Acknowledged", on_the_way: "On the way", in_progress: "In progress", paused: "Paused", completed: "Completed", cancelled: "Cancelled" }[s] || String(s || "assigned").replace(/_/g, " "); }
function cls(s) { if (s === "completed") return "good"; if (s === "in_progress" || s === "on_the_way") return "blue"; if (s === "paused") return "warn"; if (s === "cancelled") return "danger"; return "neutral"; }

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file, { maxWidth = 1600, quality = 0.78 } = {}) {
  const dataUrl = await fileToDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Image decode failed"));
    el.src = dataUrl;
  });
  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const width = Math.round(img.width * ratio);
  const height = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff7ed";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function getGeo() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 120000 },
    );
  });
}

function Detail({ job, busy, note, finalNote, officeMessage, uploadBusy, onClose, onAction, onNoteChange, onFinalNoteChange, onSaveNote, onPhoto, onRemovePhoto, onOfficeMessageChange, onSendOffice }) {
  if (!job) return null;
  const s = statusOf(job);
  const photos = photosOf(job);
  const needsPhoto = photos.length === 0 && s !== "completed";

  return (
    <div className="v4-modal-backdrop" onClick={onClose}>
      <section className="v4-modal v4-worker-modal" onClick={(e) => e.stopPropagation()}>
        <header className="v4-modal-head">
          <div><span>Worker field card</span><h2>{titleOf(job)}</h2></div>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="v4-worker-job-meta">
          <div><small>Client</small><b>{clientOf(job)}</b></div>
          <div><small>When</small><b>{when(job)}</b></div>
          <div><small>Status</small><b>{label(s)}</b></div>
        </div>

        <div className="v4-worker-address"><MapPinned size={22} /><div><small>Site</small><b>{addressOf(job)}</b></div></div>
        <p className="v4-modal-copy">{instructionsOf(job)}</p>

        <div className="v4-worker-proof-strip">
          <div><small>Acknowledge</small><b>{["acknowledged", "on_the_way", "in_progress", "paused", "completed"].includes(s) ? "Done" : "Needed"}</b></div>
          <div><small>Photos</small><b>{photos.length}</b></div>
          <div><small>Notes</small><b>{note?.trim() ? "Saved" : "Needed"}</b></div>
          <div><small>Complete</small><b>{s === "completed" ? "Done" : "Open"}</b></div>
        </div>

        <footer className="v4-worker-actions">
          <a className="v4-btn secondary" href={mapUrl(addressOf(job))} target="_blank" rel="noreferrer"><Navigation size={18} /> Navigate</a>
          {s === "assigned" ? <button className="v4-btn secondary" disabled={busy} onClick={() => onAction(job, "acknowledge")}><img src="/brand/churvox-mark.svg" alt="Churvox" className="h-10 w-10 rounded-2xl shadow-sm" /> Acknowledge</button> : null}
          {["assigned", "acknowledged", "on_the_way", "paused"].includes(s) ? <button className="v4-btn primary" disabled={busy} onClick={() => onAction(job, s === "paused" ? "resume" : "start")}><Play size={18} /> {s === "paused" ? "Resume" : "Start"}</button> : null}
          {s === "in_progress" ? <button className="v4-btn secondary" disabled={busy} onClick={() => onAction(job, "pause")}><Pause size={18} /> Pause</button> : null}
          {s === "paused" ? <button className="v4-btn secondary" disabled={busy} onClick={() => onAction(job, "resume")}><RotateCcw size={18} /> Resume</button> : null}
          {s !== "completed" ? <button className="v4-btn dark" disabled={busy} onClick={() => onAction(job, "complete")}><CheckCircle2 size={18} /> Complete</button> : null}
        </footer>

        <section className="v4-worker-section">
          <div className="v4-worker-section-head">
            <div><small>Proof photos</small><b>Photos the owner can review</b></div>
            <label className="v4-btn primary"><Camera size={18} /> {uploadBusy ? "Adding…" : "Add photo"}<input type="file" accept="image/*" capture="environment" onChange={(e) => onPhoto(job, e)} disabled={uploadBusy} /></label>
          </div>
          {needsPhoto ? <p className="v4-worker-warning"><AlertTriangle size={16} /> Add photos before completing where possible.</p> : null}
          {photos.length ? <div className="v4-worker-photo-grid">{photos.map((src, idx) => <div className="v4-worker-photo" key={`${idx}-${String(src).slice(0, 12)}`}><img src={src} alt={`Job proof ${idx + 1}`} /><button onClick={() => onRemovePhoto(job, idx)} aria-label="Remove photo"><X size={14} /></button></div>)}</div> : <div className="v4-worker-empty-mini"><Camera size={20} /><b>No photos yet</b><span>Tap Add photo to capture proof.</span></div>}
        </section>

        <section className="v4-worker-section">
          <div className="v4-worker-section-head"><div><small>Worker notes</small><b>What happened on site</b></div></div>
          <textarea className="v4-worker-textarea" value={note} onChange={(e) => onNoteChange(e.target.value)} placeholder="Access issues, materials used, what was done, anything office needs to know..." />
          <div className="v4-worker-actions"><button className="v4-btn primary" disabled={busy} onClick={() => onSaveNote(job)}><StickyNote size={18} /> Save note</button></div>
        </section>

        <section className="v4-worker-section">
          <div className="v4-worker-section-head"><div><small>Complete job</small><b>Final completion note</b></div></div>
          <textarea className="v4-worker-textarea" value={finalNote} onChange={(e) => onFinalNoteChange(e.target.value)} placeholder="Final completion summary..." />
          <div className="v4-worker-actions"><button className="v4-btn dark" disabled={busy || s === "completed"} onClick={() => onAction(job, "complete")}><CheckCircle2 size={18} /> Save and complete</button></div>
        </section>

        <section className="v4-worker-section">
          <div className="v4-worker-section-head"><div><small>Office help</small><b>Ask office without leaving the job</b></div></div>
          <textarea className="v4-worker-textarea" value={officeMessage} onChange={(e) => onOfficeMessageChange(e.target.value)} placeholder="Ask about access, timing, missing info, customer details..." />
          <div className="v4-worker-actions"><button className="v4-btn secondary" disabled={busy || !officeMessage.trim()} onClick={() => onSendOffice(job)}><MessageSquare size={18} /> Send office note</button></div>
        </section>

        <p className="v4-worker-safe-note">Worker-safe view: pricing, invoice values, owner billing, GPS evidence, and admin settings are hidden here.</p>
      </section>
    </div>
  );
}

export default function V4WorkerPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [tab, setTab] = useState("active");
  const [note, setNote] = useState("");
  const [finalNote, setFinalNote] = useState("");
  const [officeMessage, setOfficeMessage] = useState("");

  async function load() {
    setLoading(true);
    const res = await get("/worker/jobs");
    const items = list(res);
    if (!items.length) {
      const fallback = await get("/jobs");
      setJobs(list(fallback));
    } else setJobs(items);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const active = useMemo(() => jobs.filter((j) => !["completed", "cancelled"].includes(statusOf(j))), [jobs]);
  const completed = useMemo(() => jobs.filter((j) => statusOf(j) === "completed"), [jobs]);
  const needsProof = useMemo(() => active.filter((j) => photosOf(j).length === 0), [active]);
  const visibleJobs = tab === "completed" ? completed : tab === "proof" ? needsProof : active;
  const next = active[0];

  function openJob(job) {
    setSelected(job);
    const existingNote = workerNoteOf(job);
    setNote(existingNote);
    setFinalNote(existingNote);
    setOfficeMessage(`I need help with this job: ${titleOf(job)}`);
  }

  async function trySave(job, payload, actionName) {
    const id = idOf(job);
    const endpointSets = {
      acknowledge: [[`/worker/jobs/${id}/acknowledge`, "post"], [`/jobs/${id}/acknowledge`, "post"], [`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
      start: [[`/worker/jobs/${id}/start`, "post"], [`/jobs/${id}/start`, "post"], [`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
      pause: [[`/worker/jobs/${id}/pause`, "post"], [`/jobs/${id}/pause`, "post"], [`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
      resume: [[`/worker/jobs/${id}/resume`, "post"], [`/jobs/${id}/resume`, "post"], [`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
      complete: [[`/worker/jobs/${id}/complete`, "post"], [`/jobs/${id}/complete`, "post"], [`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
      note: [[`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"], [`/worker/jobs/${id}/note`, "post"], [`/jobs/${id}/note`, "post"]],
      photo: [[`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
      office: [[`/worker/jobs/${id}/office-note`, "post"], [`/jobs/${id}/office-note`, "post"], [`/worker/jobs/${id}`, "patch"], [`/jobs/${id}`, "patch"]],
    }[actionName] || [];
    for (const [path, method] of endpointSets) {
      const res = method === "patch" ? await patch(path, payload) : await post(path, payload);
      if (res?.ok || res?.success) return true;
    }
    return false;
  }

  async function action(job, actionName) {
    const id = idOf(job); if (!id) return;
    setBusy(true); setNotice("Saving worker action…");
    const geo = ["start", "complete"].includes(actionName) ? await getGeo() : null;
    const status = { acknowledge: "acknowledged", start: "in_progress", resume: "in_progress", pause: "paused", complete: "completed" }[actionName];
    const payload = { status, action: actionName, worker_notes: actionName === "complete" ? (finalNote || note) : note, worker_geo: geo, source: "v4_worker", timestamp: new Date().toISOString() };
    const ok = await trySave(job, payload, actionName);
    setNotice(ok ? "Saved. Office can see the update." : "Could not save yet. Try again.");
    await load();
    setBusy(false);
    if (ok) {
      if (actionName === "complete") setSelected(null);
      else setSelected((prev) => prev ? { ...prev, status } : prev);
    }
  }

  async function saveNote(job) {
    setBusy(true); setNotice("Saving note…");
    const ok = await trySave(job, { worker_notes: note, note, source: "v4_worker", timestamp: new Date().toISOString() }, "note");
    setNotice(ok ? "Worker note saved." : "Could not save note yet.");
    await load(); setBusy(false);
  }

  async function addPhoto(job, event) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Please choose an image."); return; }
    setUploadBusy(true); setNotice("Adding photo…");
    try {
      const dataUrl = await compressImage(file);
      const nextPhotos = [...photosOf(job), dataUrl];
      const ok = await trySave(job, { photos: nextPhotos, worker_photos: nextPhotos, source: "v4_worker", timestamp: new Date().toISOString() }, "photo");
      if (ok) {
        setSelected((prev) => prev ? { ...prev, photos: nextPhotos, worker_photos: nextPhotos } : prev);
        setNotice("Photo added. Owner can review it.");
        await load();
      } else setNotice("Could not add photo yet.");
    } catch { setNotice("Could not process this photo."); }
    setUploadBusy(false);
  }

  async function removePhoto(job, idx) {
    const nextPhotos = photosOf(job).filter((_, i) => i !== idx);
    setUploadBusy(true);
    const ok = await trySave(job, { photos: nextPhotos, worker_photos: nextPhotos, source: "v4_worker", timestamp: new Date().toISOString() }, "photo");
    if (ok) { setSelected((prev) => prev ? { ...prev, photos: nextPhotos, worker_photos: nextPhotos } : prev); setNotice("Photo removed."); await load(); }
    else setNotice("Could not remove photo.");
    setUploadBusy(false);
  }

  async function sendOffice(job) {
    setBusy(true); setNotice("Sending office note…");
    const ok = await trySave(job, { office_message: officeMessage, worker_message: officeMessage, worker_notes: note, source: "v4_worker", timestamp: new Date().toISOString() }, "office");
    setNotice(ok ? "Office note saved." : "Could not send office note yet.");
    setBusy(false);
  }

  async function signOut() { await logout(); navigate("/login", { replace: true }); }

  return <main className="v4-worker">
    <header className="v4-worker-hero"><div><span>Churvox Worker</span><h1>Today’s field deck.</h1><p>Next job, navigation, start, pause, notes, photos and completion — same Churvox forge theme, with owner-only pricing and GPS evidence hidden.</p></div><button onClick={signOut}><LogOut size={18} /> Log out</button></header>
    {notice ? <div className="v4-worker-notice">{notice}</div> : null}

    <section className="v4-worker-grid">
      <article className="v4-worker-next"><small>Next job</small>{loading ? <b>Loading…</b> : next ? <><b>{titleOf(next)}</b><span>{clientOf(next)} · {when(next)}</span><button className="v4-btn primary" onClick={() => openJob(next)}>Open job</button></> : <><b>No active jobs</b><span>Assigned jobs will appear here.</span></>}</article>
      <article><small>Active</small><b>{active.length}</b><span>Jobs to handle</span></article>
      <article><small>Proof needed</small><b>{needsProof.length}</b><span>Jobs with no photos yet</span></article>
    </section>

    <section className="v4-worker-list">
      <div><h2>Jobs</h2><button onClick={load}><RefreshCw size={16} /> Refresh</button></div>
      <div className="v4-worker-tabs"><button className={tab === "active" ? "active" : ""} onClick={() => setTab("active")}>Active</button><button className={tab === "proof" ? "active" : ""} onClick={() => setTab("proof")}>Needs proof</button><button className={tab === "completed" ? "active" : ""} onClick={() => setTab("completed")}>Completed</button></div>
      {visibleJobs.length ? visibleJobs.map((j) => <button key={idOf(j) || titleOf(j)} onClick={() => openJob(j)}><div><b>{titleOf(j)}</b><span>{clientOf(j)} · {addressOf(j)}</span></div><span className={`v4-status ${cls(statusOf(j))}`}>{label(statusOf(j))}</span></button>) : <div className="v4-empty"><Home size={28} /><b>No jobs here</b><span>Refresh or check assigned work.</span></div>}
    </section>

    <nav className="v4-worker-dock"><button onClick={() => next && openJob(next)} disabled={!next}>Next Job</button><button onClick={load}>Refresh</button><button onClick={signOut}>Log out</button></nav>
    <Detail job={selected} busy={busy} note={note} finalNote={finalNote} officeMessage={officeMessage} uploadBusy={uploadBusy} onClose={() => setSelected(null)} onAction={action} onNoteChange={setNote} onFinalNoteChange={setFinalNote} onSaveNote={saveNote} onPhoto={addPhoto} onRemovePhoto={removePhoto} onOfficeMessageChange={setOfficeMessage} onSendOffice={sendOffice} />
  </main>;
}
