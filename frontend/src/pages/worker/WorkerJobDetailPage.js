import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Camera, CheckCircle2, ClipboardList, MapPin, MessageCircle, Navigation, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "./WorkerCleanApp.css";

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

function statusOf(job) {
  return String(job?.status || "assigned").toLowerCase().replaceAll(" ", "_");
}

function reviewStatus(job) {
  return String(job?.work_review_status || job?.review_status || job?.owner_review_status || "").trim().toLowerCase();
}

function isSentBack(job) {
  return reviewStatus(job) === "sent_back" || job?.worker_action_required === true;
}

function safeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function jobTitle(job) {
  return job?.title || job?.job_name || job?.job_type || job?.service_type || "Untitled job";
}

function clientName(job) {
  return job?.client_name || job?.customer_name || job?.client || job?.customer || "No customer";
}

function addressOf(job) {
  return job?.address || job?.site_address || job?.service_address || job?.job_address || "";
}

function instructionsOf(job) {
  return job?.worker_instructions || job?.instructions || job?.notes || job?.job_notes || job?.description || "";
}

function ownerNoteOf(job) {
  return job?.owner_note || job?.boss_note || job?.send_back_note || "";
}

function dateText(job) {
  const date = String(job?.scheduled_date || job?.date || job?.start || job?.due_date || "").slice(0, 10);
  const time = job?.scheduled_time || job?.time || "";
  return [date, time].filter(Boolean).join(" · ") || "No time set";
}

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
    const address = data?.address || {};
    const street = [address.house_number, address.road].filter(Boolean).join(" ");
    const suburb = address.suburb || address.neighbourhood || address.city_district || address.locality || "";
    const city = address.city || address.town || address.village || address.state_district || "";
    const parts = [street, suburb, city].filter(Boolean);
    return [...new Set(parts)].join(", ") || data?.display_name || "";
  } catch {
    return "";
  }
}

function getGpsPosition() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
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

  const loadJob = useCallback(async () => {
    setLoading(true);

    try {
      let nextJob = null;

      const direct = await get(`/jobs/${encodeURIComponent(id)}`);
      if (direct?.success) {
        nextJob = direct.data?.job || direct.data?.data?.job || direct.data?.data || direct.data || null;
      }

      if (!nextJob || !jobIdOf(nextJob)) {
        const listRes = await get("/jobs");
        const list = arr(listRes?.data);
        nextJob = list.find((item) => jobIdOf(item) === String(id)) || null;
      }

      if (nextJob) {
        setJob(nextJob);
        setWorkerNotes(nextJob?.worker_notes || "");
      } else {
        setJob(null);
        toast.error("Could not load this job.");
      }
    } catch {
      setJob(null);
      toast.error("Could not load this job.");
    } finally {
      setLoading(false);
    }
  }, [get, id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  async function sendLivePing(payload) {
    try {
      await post("/worker/live-ping", payload);
    } catch {
      // keep worker flow unblocked
    }
  }

  async function saveFieldUpdate(payload) {
    return patch(`/worker/jobs/${encodeURIComponent(id)}/field-update`, payload);
  }

  async function saveNotes(text = workerNotes) {
    const trimmed = String(text || "").trim();
    setWorkerNotes(trimmed);
    const res = await saveFieldUpdate({ worker_notes: trimmed });
    if (!res?.success) toast.error(res?.error || "Could not save message");
    return Boolean(res?.success);
  }

  async function addPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }

    const existing = Array.isArray(job?.photos) ? job.photos : [];
    setUploadingPhoto(true);

    try {
      const dataUrl = await compressImage(file);
      const photos = [...existing, dataUrl];
      const res = await saveFieldUpdate({ photos });
      if (res?.success) {
        setJob((prev) => ({ ...prev, photos }));
        setProofPrompt(false);
        toast.success("Photo added");
      } else {
        toast.error(res?.error || "Could not upload photo");
      }
    } catch {
      toast.error("Could not process this photo");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function removePhoto(index) {
    const photos = (Array.isArray(job?.photos) ? job.photos : []).filter((_, i) => i !== index);
    const res = await saveFieldUpdate({ photos });
    if (res?.success) setJob((prev) => ({ ...prev, photos }));
    else toast.error(res?.error || "Could not remove photo");
  }

  async function finishJob() {
    const photos = Array.isArray(job?.photos) ? job.photos : [];
    const note = String(workerNotes || "").trim();

    if (!photos.length && !note) {
      setProofPrompt(true);
      document.getElementById("worker-proof")?.scrollIntoView({ behavior: "smooth", block: "start" });
      toast.info("Add a photo or message before sending this to the boss.");
      return;
    }

    setSaving(true);

    try {
      if (note) await saveNotes(note);

      const location = await getGpsPosition();
      const payload = {
        worker_notes: note,
        photos,
        completed_by_worker: true,
        work_review_status: "ready_for_review",
        review_status: "ready_for_review",
        owner_review_status: "ready_for_review",
        worker_action_required: false,
        completed_at: new Date().toISOString(),
      };
      if (location) payload.location = location;

      const res = await post(`/worker/jobs/${encodeURIComponent(id)}/complete`, payload);

      if (res?.success) {
        await sendLivePing({
          source: "job-finished",
          live_status: "Finished job",
          clock_status: "clocked_in",
          job_id: id,
          job_title: jobTitle(job),
          job_status: "completed",
          location,
        });
        toast.success("Job sent to owner");
        await loadJob();
      } else {
        toast.error(res?.error || "Could not finish job");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="wc-screen wc-loading-screen">
        <RefreshCw className="spin" />
        <b>Loading job…</b>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="wc-screen wc-loading-screen">
        <AlertTriangle />
        <b>Job not found</b>
        <Link to="/worker/jobs">Back to today’s jobs</Link>
      </div>
    );
  }

  const address = addressOf(job);
  const instructions = instructionsOf(job);
  const ownerNote = ownerNoteOf(job);
  const photos = Array.isArray(job?.photos) ? job.photos : [];
  const noteReady = String(workerNotes || "").trim().length > 0;
  const photoReady = photos.length > 0;
  const complete = ["completed", "complete", "done", "finished"].includes(statusOf(job));
  const sentBack = isSentBack(job);

  return (
    <div className="wc-screen wc-job-screen">
      <header className="wc-topbar">
        <div>
          <Link to="/worker/jobs" className="wc-back"><ArrowLeft /> Jobs</Link>
          <b>{complete ? "Job sent" : "Open job"}</b>
        </div>
        <button type="button" onClick={() => setShowContactOffice(true)}><MessageCircle /></button>
      </header>

      <main className="wc-main">
        <section className="wc-job-hero">
          <span>{sentBack ? "Owner needs fix" : complete ? "Sent to owner" : "Job details"}</span>
          <h1>{jobTitle(job)}</h1>
          <p>{clientName(job)}</p>
          <small>{dateText(job)}</small>
        </section>

        {sentBack ? (
          <section className="wc-alert">
            <AlertTriangle />
            <div>
              <b>Boss sent this back</b>
              <span>{ownerNote || "Check the job, add photo or message, then send it again."}</span>
            </div>
          </section>
        ) : null}

        <section className="wc-card">
          <div className="wc-section-head">
            <span>Where</span>
            <h2>Address</h2>
          </div>
          {address ? <p><MapPin size={17} /> {address}</p> : <p><MapPin size={17} /> No address added.</p>}
          {address ? <a className="wc-map-button" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer"><Navigation size={17} /> Open directions</a> : null}
        </section>

        <section className="wc-card">
          <div className="wc-section-head">
            <span>Instructions</span>
            <h2>What to do</h2>
          </div>
          <p>{instructions || "No special instructions added. Do the job as assigned."}</p>
        </section>

        <section className="wc-card" id="worker-proof">
          <div className="wc-section-head">
            <span>Proof</span>
            <h2>Photos and message</h2>
            <p>Before you send it, add a photo or leave the boss a quick message.</p>
          </div>

          {proofPrompt ? (
            <section className="wc-alert need">
              <Camera />
              <div>
                <b>Add proof first</b>
                <span>Take a photo or write a quick message, then press “I’ve finished this job” again.</span>
              </div>
            </section>
          ) : null}

          <ProofSteps photoCount={photos.length} workerNotes={workerNotes} complete={complete} />

          <label className="wc-photo-button">
            <Camera size={22} />
            {uploadingPhoto ? "Adding photo…" : "Add photo"}
            <input type="file" accept="image/*" capture="environment" onChange={addPhoto} disabled={uploadingPhoto} />
          </label>

          {photos.length ? (
            <div className="wc-photo-grid">
              {photos.map((src, index) => (
                <div className="wc-photo-thumb" key={`${src}-${index}`}>
                  <img src={src} alt={`Job proof ${index + 1}`} />
                  <button type="button" onClick={() => removePhoto(index)}><X size={14} /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="wc-empty-proof">No photos yet.</p>
          )}

          <textarea
            className="wc-textarea"
            rows={4}
            value={workerNotes}
            onChange={(event) => {
              setWorkerNotes(event.target.value);
              if (event.target.value.trim()) setProofPrompt(false);
            }}
            placeholder="Message for boss… e.g. Done lawns and edges. Gate was locked at first."
          />

          <button type="button" className="wc-save-note" onClick={() => saveNotes(workerNotes)}>
            Save message
          </button>
        </section>

        <section className={`wc-finish ${noteReady || photoReady ? "ready" : ""}`}>
          <div>
            <span>Finish</span>
            <h2>{complete ? "Sent to owner" : "I’ve finished this job"}</h2>
            <p>{complete ? "The owner can now review the work." : "This sends the job, photos and message back to the boss."}</p>
          </div>
          <button type="button" disabled={saving || complete} onClick={finishJob}>
            <CheckCircle2 size={20} />
            {saving ? "Sending…" : complete ? "Finished" : "I’ve finished this job"}
          </button>
        </section>

        <section className="wc-card">
          <div className="wc-section-head">
            <span>Help</span>
            <h2>Need help?</h2>
          </div>
          <p>Message the boss if the address, access, instructions or job scope is wrong.</p>
          <button type="button" className="wc-save-note" onClick={() => setShowContactOffice(true)}>
            <ClipboardList size={17} />
            Message boss
          </button>
        </section>
      </main>

      <WorkerContactOfficePanel
        open={showContactOffice}
        onClose={() => setShowContactOffice(false)}
        jobId={id}
        jobTitle={jobTitle(job)}
        defaultMessage={`I need help with this job: ${jobTitle(job)}`}
      />
      <WorkerBottomNav active="jobs" />
    </div>
  );
}
