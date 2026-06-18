import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Camera, CheckCircle, ClipboardList, Clock3, Hand, MapPin, Navigation, Pause, Play, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { PremiumButton, PremiumCard, PremiumStatusBadge } from "@/components/premium";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import { safeText } from "../../utils/safeRender";

async function fileToDataUrl(file) {
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
    el.onerror = () => reject(new Error("image decode failed"));
    el.src = dataUrl;
  });
  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const targetW = Math.round(img.width * ratio);
  const targetH = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", quality);
}

const reviewStatus = (job) => String(job?.work_review_status || job?.review_status || job?.owner_review_status || "").trim().toLowerCase();
const isSentBackJob = (job) => reviewStatus(job) === "sent_back" || job?.worker_action_required === true;
const getSendBackNote = (job) => safeText(job?.send_back_note || job?.owner_note || job?.worker_note || "", "");
const statusOf = (job) => String(job?.status || "assigned").toLowerCase().replaceAll(" ", "_");
const canAcknowledge = (status) => status === "assigned";
const canStart = (status) => ["assigned", "acknowledged"].includes(status);
const canPause = (status) => status === "in_progress";
const canResume = (status) => status === "paused";
const canComplete = (status, sentBack) => sentBack || ["in_progress", "paused"].includes(status);
const activeStatuses = new Set(["in_progress", "paused"]);

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

function jobIdOf(job) {
  return oid(job?.id || job?._id || job?.job_id || "");
}

function WorkerProofSteps({ status, photoCount, workerNotes }) {
  const noteReady = String(workerNotes || "").trim().length > 0;
  const photosReady = Number(photoCount || 0) > 0;
  const completed = String(status || "").toLowerCase() === "completed";
  return (
    <section className="worker-flow-steps">
      <div className={noteReady ? "done" : ""}><b>{noteReady ? "✓" : "1"}</b><span>Add note</span></div>
      <div className={photosReady ? "done" : ""}><b>{photosReady ? "✓" : "2"}</b><span>Add photos</span></div>
      <div className={completed ? "done" : ""}><b>{completed ? "✓" : "3"}</b><span>Finish</span></div>
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
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [finalNote, setFinalNote] = useState("");
  const [showContactOffice, setShowContactOffice] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    const withTimeout = (promise, label = "request") => {
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), 12000);
      });
      return Promise.race([promise, timeout]).finally(() => {
        if (timer) window.clearTimeout(timer);
      });
    };
    const applyJob = (nextJob) => {
      setJob(nextJob);
      setWorkerNotes(nextJob?.worker_notes || "");
      setFinalNote(nextJob?.worker_notes || "");
    };
    try {
      let nextJob = null;
      try {
        const res = await withTimeout(get(`/jobs/${encodeURIComponent(id)}`), "job detail load");
        if (res?.success) nextJob = res.data?.job || res.data?.data?.job || res.data?.data || res.data || null;
      } catch (err) {
        console.warn("Worker job detail direct load failed:", err);
      }
      if (!nextJob || !jobIdOf(nextJob)) {
        try {
          const listRes = await withTimeout(get("/jobs"), "worker jobs fallback load");
          const list = arr(listRes?.data);
          nextJob = list.find((item) => jobIdOf(item) === String(id)) || null;
        } catch (err) {
          console.warn("Worker job detail fallback load failed:", err);
        }
      }
      if (nextJob && typeof nextJob === "object") applyJob(nextJob);
      else {
        setJob(null);
        toast.error("Could not load this job. Go back and refresh your jobs.");
      }
    } catch (err) {
      console.error("Worker job detail load crashed:", err);
      setJob(null);
      toast.error("Could not load this job. Go back and refresh your jobs.");
    } finally {
      setLoading(false);
    }
  }, [get, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  async function reverseGeocodeLocation(location) {
    const lat = location?.lat ?? location?.latitude;
    const lng = location?.lng ?? location?.longitude;
    if (!lat || !lng) return "";
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 4500);
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      window.clearTimeout(timer);
      if (!res.ok) return "";
      const data = await res.json();
      const address = data?.address || {};
      const street = [address.house_number, address.road].filter(Boolean).join(" ");
      const suburb = address.suburb || address.neighbourhood || address.city_district || address.locality || "";
      const town = address.city || address.town || address.village || address.state_district || "";
      const parts = [street, suburb, town].filter(Boolean);
      return [...new Set(parts)].join(", ") || data?.display_name || "";
    } catch {
      return "";
    }
  }

  const getGeo = () => new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        const addressLabel = await reverseGeocodeLocation(location);
        resolve({ ...location, address_label: addressLabel, display_name: addressLabel });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 120000 },
    );
  });

  async function sendLivePing(payload) {
    try { await post("/worker/live-ping", payload); } catch {}
  }

  const checkAnotherActiveJob = async () => {
    const res = await get("/jobs");
    return arr(res?.data).find((item) => activeStatuses.has(statusOf(item)) && jobIdOf(item) !== String(id));
  };

  async function saveFieldUpdate(payload) {
    return patch(`/worker/jobs/${encodeURIComponent(id)}/field-update`, payload);
  }

  async function runTimerAction(label, action, endpoint, extraPayload = {}) {
    setSaving(true);
    try {
      if (action === "start") {
        const otherActive = await checkAnotherActiveJob();
        if (otherActive) {
          toast.error(`Pause or finish your active job first: ${otherActive?.title || "current job"}`);
          return;
        }
      }
      const needsLocation = ["start", "complete"].includes(action);
      const geo = needsLocation ? await getGeo() : null;
      const payload = { ...extraPayload };
      if (geo) payload.location = geo;
      const res = await post(endpoint, payload);
      if (res?.success) {
        const liveStatus = action === "pause" ? "Paused" : action === "complete" ? "Finished job" : "On job now";
        const jobStatus = action === "pause" ? "paused" : action === "complete" ? "completed" : "in_progress";
        await sendLivePing({ source: `job-${action}`, live_status: liveStatus, clock_status: liveStatus, job_id: id, job_title: job?.title || "", job_status: jobStatus, location: geo });
        toast.success(label);
        await loadJob();
      } else {
        toast.error(safeText(res?.error, "Job action failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function completeJob(label, extraPayload = {}) {
    const payload = { ...extraPayload, worker_notes: finalNote || workerNotes || "" };
    await runTimerAction(label, "complete", `/worker/jobs/${encodeURIComponent(id)}/complete`, payload);
  }

  const handleAcknowledge = async () => {
    setSaving(true);
    const res = await post(`/jobs/${encodeURIComponent(id)}/acknowledge`, {});
    if (res?.success) {
      toast.success("Yep, got it");
      await loadJob();
    } else {
      toast.error(safeText(res?.error, "Could not acknowledge job"));
    }
    setSaving(false);
  };

  const handleSaveNotes = async (text = workerNotes) => {
    setSavingNotes(true);
    const res = await saveFieldUpdate({ worker_notes: text });
    if (res?.success) {
      toast.success("Note saved");
      await loadJob();
    } else {
      toast.error(safeText(res?.error, "Failed to save notes"));
    }
    setSavingNotes(false);
  };

  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    const existing = Array.isArray(job?.photos) ? job.photos : [];
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      const photos = [...existing, dataUrl];
      const res = await saveFieldUpdate({ photos });
      if (res?.success) {
        setJob((prev) => ({ ...prev, photos }));
        toast.success("Photo added");
      } else {
        toast.error(safeText(res?.error, "Failed to upload photo"));
      }
    } catch {
      toast.error("Could not process this photo.");
    }
    setUploadingPhoto(false);
  };

  async function removePhoto(index) {
    const photos = (Array.isArray(job?.photos) ? job.photos : []).filter((_, i) => i !== index);
    const res = await saveFieldUpdate({ photos });
    if (res?.success) setJob((prev) => ({ ...prev, photos }));
    else toast.error(safeText(res?.error, "Could not remove photo"));
  }

  const status = statusOf(job);
  const sentBack = isSentBackJob(job);
  const sentBackNote = getSendBackNote(job);
  const photoCount = Array.isArray(job?.photos) ? job.photos.length : 0;
  const timeLabel = job?.total_time_on_site_label || job?.worked_time_label || "Saved when you finish";
  const resubmitPayload = sentBack ? { worker_action_required: false, work_review_status: "ready_for_review", review_status: "ready_for_review", owner_review_status: "ready_for_review", resubmitted_at: new Date().toISOString() } : {};
  const noteReady = String(workerNotes || finalNote || "").trim().length > 0;
  const photoReady = photoCount > 0;
  const canFinishNow = canComplete(status, sentBack);

  if (loading) return <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4"><div className="px-loading__spinner" /><p className="text-sm font-semibold text-[var(--cx-muted)]">Loading this job…</p><Link to="/worker/jobs" className="px-btn px-btn--secondary px-btn--sm no-underline">Back to jobs</Link></div>;
  if (!job) return <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4"><p className="text-lg font-bold text-[var(--cx-text)]">This job could not be loaded.</p><p className="text-sm text-[var(--cx-muted)]">Go back to your jobs and refresh. The office may have changed or removed this job.</p><Link to="/worker/jobs" className="px-btn px-btn--primary px-btn--md no-underline">Back to jobs</Link></div>;

  return (
    <div className="px-app worker-job-flow min-h-screen">
      <header className="worker-job-topbar">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs"><ArrowLeft className="h-6 w-6" /></Link>
          <div><p>Worker job</p><h1>Do the job</h1></div>
        </div>
      </header>

      <main className="worker-job-main max-w-2xl mx-auto px-4 py-5">
        <PremiumCard>
          <div className="px-card__body worker-job-title-card">
            <div>
              <h2>{job.title || "Untitled Job"}</h2>
              <PremiumStatusBadge status={status} />
            </div>
            {job.client_name ? <p><span>Customer</span>{job.client_name}</p> : null}
            {job.address ? <p><MapPin className="h-4 w-4" />{job.address}</p> : null}
            {job.scheduled_date ? <p><Clock3 className="h-4 w-4" />{String(job.scheduled_date).slice(0, 10)} {job.scheduled_time ? `• ${job.scheduled_time}` : ""}</p> : null}
          </div>
        </PremiumCard>

        {sentBack ? <PremiumCard><div className="px-card__body worker-warning-card"><div><AlertTriangle className="h-5 w-5" /> Sent back from Work Review</div><p>Fix what the owner asked for, add a note/photo, then finish again.</p>{sentBackNote ? <section>{sentBackNote}</section> : null}</div></PremiumCard> : null}

        <section className="worker-next-card">
          <span>Next step</span>
          <h2>{status === "assigned" ? "Yep, got it" : status === "acknowledged" ? "Start the job" : status === "in_progress" ? "Add photos and note" : status === "paused" ? "Resume or finish" : status === "completed" ? "Job completed" : "Keep going"}</h2>
          <p>{status === "completed" ? "You can still add photos or notes if the owner needs proof." : "Simple flow: accept it, start it, add proof, finish it."}</p>
          <div className="worker-action-grid">
            <PremiumButton onClick={handleAcknowledge} disabled={saving || !canAcknowledge(status)} iconLeft={<Hand className="h-4 w-4" />}>Yep, got it</PremiumButton>
            <PremiumButton onClick={() => runTimerAction(status === "paused" ? "Job resumed" : "Job started", status === "paused" ? "resume" : "start", status === "paused" ? `/jobs/${encodeURIComponent(id)}/timer/resume` : `/jobs/${encodeURIComponent(id)}/timer/start`)} disabled={saving || (!canStart(status) && !canResume(status))} iconLeft={status === "paused" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}>{status === "paused" ? "Resume" : "Start job"}</PremiumButton>
            <PremiumButton variant="secondary" onClick={() => runTimerAction("Job paused", "pause", `/jobs/${encodeURIComponent(id)}/timer/pause`)} disabled={saving || !canPause(status)} iconLeft={<Pause className="h-4 w-4" />}>Pause</PremiumButton>
            <PremiumButton variant="secondary" onClick={() => document.getElementById("worker-photos")?.scrollIntoView({ behavior: "smooth", block: "center" })} iconLeft={<Camera className="h-4 w-4" />}>Add photos</PremiumButton>
          </div>
        </section>

        <WorkerProofSteps status={status} photoCount={photoCount} workerNotes={workerNotes || finalNote} />

        {job.address ? <PremiumCard><div className="px-card__body worker-map-card"><p>Address / directions</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer"><Navigation className="h-4 w-4" />Open map</a></div></PremiumCard> : null}

        <PremiumCard id="worker-photos">
          <div className="px-card__body worker-photo-card">
            <div className="worker-section-head"><span>Proof photos</span><h2>Add photos here</h2><p>Take before, after, or issue photos. This is the proof the owner sees.</p></div>
            <label className="worker-add-photo-button">
              <Camera className="h-5 w-5" />
              {uploadingPhoto ? "Adding photo…" : "Add job photos"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} />
            </label>
            {Array.isArray(job.photos) && job.photos.length > 0 ? <div className="worker-photo-grid">{job.photos.map((src, idx) => <div key={idx} className="worker-photo-thumb"><img src={src} alt={`Job ${idx + 1}`} /><button type="button" onClick={() => removePhoto(idx)}><X className="h-3 w-3" /></button></div>)}</div> : <p className="worker-empty-proof">No photos yet. Add one before finishing if you can.</p>}
          </div>
        </PremiumCard>

        <PremiumCard id="notes">
          <div className="px-card__body worker-note-card">
            <div className="worker-section-head"><span>Worker note</span><h2>What happened?</h2><p>Short and clear is fine. Example: “Done lawns, edges and blower. Gate was locked at first.”</p></div>
            {job.notes ? <section><b>Office note</b><p>{job.notes}</p></section> : null}
            <textarea className="px-input" rows={4} value={workerNotes} onChange={(e) => { setWorkerNotes(e.target.value); setFinalNote(e.target.value); }} placeholder="Type what happened on site…" />
            <PremiumButton variant="secondary" onClick={() => handleSaveNotes(workerNotes)} disabled={savingNotes}>{savingNotes ? "Saving…" : "Save note"}</PremiumButton>
          </div>
        </PremiumCard>

        <section className={`worker-finish-card ${noteReady && photoReady ? "ready" : ""}`}>
          <div><span>Finish</span><h2>{status === "completed" ? "Job is finished" : "Finish job"}</h2><p>{noteReady && photoReady ? "Nice. Note and photo are done." : "Add a photo and note first so the owner can approve the work."}</p><small>Timer: {activeStatuses.has(status) ? status.replace("_", " ") : "not running"} · Timesheet: {timeLabel}</small></div>
          <PremiumButton onClick={async () => { await handleSaveNotes(finalNote || workerNotes); await completeJob(sentBack ? "Resubmitted for owner review" : "Job finished", resubmitPayload); }} disabled={saving || savingNotes || !canFinishNow} iconLeft={<CheckCircle className="h-4 w-4" />}>{sentBack ? "Send back to owner" : status === "completed" ? "Finished" : "Finish job"}</PremiumButton>
        </section>

        <PremiumCard><div className="px-card__body worker-help-card"><p>Need help with this job?</p><span>Message the office if the address, access, or job notes are wrong.</span><PremiumButton variant="secondary" className="w-full" onClick={() => setShowContactOffice(true)} iconLeft={<ClipboardList className="h-4 w-4" />}>Contact office</PremiumButton></div></PremiumCard>
      </main>

      <WorkerContactOfficePanel open={showContactOffice} onClose={() => setShowContactOffice(false)} jobId={id} jobTitle={job?.title || ""} defaultMessage={`I need help with this job: ${job?.title || "Untitled Job"}`} />
      <WorkerBottomNav active="jobs" />
    </div>
  );
}
