import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hand,
  MapPin,
  MessageSquare,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { safeText } from "../../utils/safeRender";
import { PremiumAIDraftPanel } from "@/components/premium";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "./worker-field.css";

const statusClass = (status) => String(status || "assigned").toLowerCase().replace(/\s+/g, "_");
const isDone = (status) => ["completed", "done", "finished"].includes(statusClass(status));

function StatusBadge({ status }) {
  const clean = statusClass(status);
  return <span className={`worker-status ${clean}`}>{clean.replace(/_/g, " ")}</span>;
}

function WorkerButton({ children, className = "", ...props }) {
  return <button className={`worker-btn ${className}`} {...props}>{children}</button>;
}

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
    el.onerror = () => reject(new Error("Image decode failed"));
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

function getGeo() {
  return new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 120000 },
    );
  });
}

function DetailCard({ children }) {
  return (
    <section className="worker-card">
      <div className="worker-card-body">{children}</div>
    </section>
  );
}

export default function WorkerJobDetailPage() {
  const { id } = useParams();
  const { get, post, patch } = useApi();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState("");
  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [finalNote, setFinalNote] = useState("");
  const [showContactOffice, setShowContactOffice] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    const res = await get(`/jobs/${id}`);
    if (res?.success || res?.ok) {
      const data = res.data?.job || res.data || {};
      setJob(data);
      setWorkerNotes(data?.worker_notes || "");
      setFinalNote(data?.worker_notes || "");
    } else {
      toast.error("Could not load this job.");
    }
    setLoading(false);
  }, [get, id]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  const status = statusClass(job?.status || "assigned");
  const photos = Array.isArray(job?.photos) ? job.photos : [];

  const proofReady = useMemo(() => {
    return {
      acknowledged: ["acknowledged", "in_progress", "paused", "completed"].includes(status),
      notes: Boolean((workerNotes || "").trim()),
      photos: photos.length > 0,
      completed: isDone(status),
    };
  }, [status, workerNotes, photos.length]);

  const handleStatus = async (nextStatus) => {
    setSavingStatus(nextStatus);
    const geo = ["in_progress", "completed"].includes(nextStatus) ? await getGeo() : null;
    if (!geo && ["in_progress", "completed"].includes(nextStatus)) {
      toast.warning("Location unavailable. Status will still save.");
    }

    let res = null;
    if (nextStatus === "in_progress") {
      res = await post(`/jobs/${id}/start`, { worker_geo: geo });
    } else if (nextStatus === "completed") {
      res = await post(`/jobs/${id}/complete`, { worker_geo: geo, worker_notes: finalNote || workerNotes });
    }

    if (!(res?.success || res?.ok)) {
      res = await patch(`/jobs/${id}`, { status: nextStatus, worker_geo: geo, worker_notes: finalNote || workerNotes });
    }

    if (res?.success || res?.ok) {
      toast.success(`Job ${nextStatus.replace(/_/g, " ")}`);
      await loadJob();
    } else {
      toast.error(safeText(res?.error || res?.message, "Failed to update job"));
    }

    setSavingStatus("");
  };

  const handleAcknowledge = async () => {
    setSavingStatus("acknowledged");
    let res = await post(`/jobs/${id}/acknowledge`, {});
    if (!(res?.success || res?.ok)) {
      res = await patch(`/jobs/${id}`, { status: "acknowledged" });
    }
    if (res?.success || res?.ok) {
      toast.success("Job acknowledged");
      await loadJob();
    } else {
      toast.error("Failed to acknowledge job");
    }
    setSavingStatus("");
  };

  const handleSaveNotes = async (text = workerNotes) => {
    setSavingNotes(true);
    const res = await patch(`/jobs/${id}`, { worker_notes: text });
    if (res?.success || res?.ok) {
      toast.success("Worker notes saved");
      await loadJob();
    } else {
      toast.error("Failed to save notes");
    }
    setSavingNotes(false);
  };

  const handleAddPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image.");
      return;
    }

    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      const nextPhotos = [...photos, dataUrl];
      const res = await patch(`/jobs/${id}`, { photos: nextPhotos });
      if (res?.success || res?.ok) {
        toast.success("Photo added");
        setJob((prev) => ({ ...prev, photos: nextPhotos }));
      } else {
        toast.error(safeText(res?.error || res?.message, "Failed to upload photo"));
      }
    } catch {
      toast.error("Could not process this photo.");
    }
    setUploadingPhoto(false);
  };

  const removePhoto = async (idx) => {
    const nextPhotos = photos.filter((_, index) => index !== idx);
    const res = await patch(`/jobs/${id}`, { photos: nextPhotos });
    if (res?.success || res?.ok) {
      setJob((prev) => ({ ...prev, photos: nextPhotos }));
      toast.success("Photo removed");
    } else {
      toast.error("Could not remove photo");
    }
  };

  const title = job?.title || job?.job_title || job?.name || "Untitled job";
  const client = job?.client_name || job?.customer_name || "";
  const address = job?.address || job?.job_address || "";
  const scheduled = job?.scheduled_date || job?.date || "";

  const workerAiContext = {
    title,
    status,
    client,
    address,
    scheduled_date: scheduled,
    scheduled_time: job?.scheduled_time || "",
    job_notes: job?.notes || "",
    worker_notes: workerNotes || "",
    photo_count: photos.length,
  };

  if (loading) {
    return (
      <div className="worker-field-app">
        <div className="worker-loading"><div className="worker-spinner" /></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="worker-field-app">
        <div className="worker-field-shell">
          <div className="worker-empty">
            <div className="worker-empty-icon"><Briefcase size={26} /></div>
            <h3>Job not found</h3>
            <Link className="worker-btn primary full" to="/worker/jobs">Back to jobs</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="worker-field-app">
      <header className="worker-topbar">
        <div className="worker-topbar-inner">
          <Link to="/worker/jobs" className="worker-icon-btn" aria-label="Back to jobs"><ArrowLeft size={20} /></Link>
          <b style={{ color: "#080a10" }}>Job Field Card</b>
          <button className="worker-icon-btn" onClick={() => setShowContactOffice(true)} aria-label="Contact office">
            <MessageSquare size={19} />
          </button>
        </div>
      </header>

      <main className="worker-field-shell">
        <section className="worker-hero">
          <span className="worker-eyebrow"><Sparkles size={14} /> Worker job command</span>
          <h1>{title}</h1>
          <p>
            Follow the job, capture proof, save notes, and complete the work.
            Pricing, billing, owner settings, and admin controls are hidden from worker view.
          </p>
          <div className="worker-hero-actions">
            <StatusBadge status={status} />
            {address ? (
              <a className="worker-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">
                <Navigation size={17} /> Open map
              </a>
            ) : null}
          </div>
        </section>

        <div className="worker-proof-strip" style={{ margin: "14px 0" }}>
          <div className="worker-proof-pill"><small>Acknowledge</small><b>{proofReady.acknowledged ? "Done" : "Needed"}</b></div>
          <div className="worker-proof-pill"><small>Photos</small><b>{photos.length}</b></div>
          <div className="worker-proof-pill"><small>Completion</small><b>{proofReady.completed ? "Done" : "Open"}</b></div>
        </div>

        <DetailCard>
          <div className="worker-card-head">
            <div>
              <p className="worker-card-title">Job details</p>
              <div style={{ marginTop: 8 }}><StatusBadge status={status} /></div>
            </div>
          </div>

          <div className="worker-meta">
            {client ? <div className="worker-meta-row"><User size={16} /> {client}</div> : null}
            {address ? <div className="worker-meta-row"><MapPin size={16} /> {address}</div> : null}
            {scheduled ? <div className="worker-meta-row"><Clock3 size={16} /> {String(scheduled).slice(0, 10)} {job?.scheduled_time ? `• ${job.scheduled_time}` : ""}</div> : null}
          </div>
        </DetailCard>

        <DetailCard>
          <p className="worker-card-title">Job instructions</p>
          <div style={{ marginTop: 12 }}>
            {job?.notes ? (
              <p style={{ color: "#59614f", fontWeight: 700, whiteSpace: "pre-wrap" }}>{job.notes}</p>
            ) : (
              <p style={{ color: "#7b8470", fontWeight: 650 }}>No job instructions have been added yet.</p>
            )}
          </div>
        </DetailCard>

        <DetailCard>
          <p className="worker-card-title">Worker action controls</p>
          <div className="worker-action-grid">
            <WorkerButton className="primary" onClick={handleAcknowledge} disabled={savingStatus || status !== "assigned"}>
              <Hand size={17} /> Acknowledge
            </WorkerButton>
            <WorkerButton className="primary" onClick={() => handleStatus("in_progress")} disabled={savingStatus || !["assigned", "acknowledged", "paused"].includes(status)}>
              <Play size={17} /> Start
            </WorkerButton>
            <WorkerButton onClick={() => handleStatus("paused")} disabled={savingStatus || status !== "in_progress"}>
              <Pause size={17} /> Pause
            </WorkerButton>
            <WorkerButton onClick={() => handleStatus("in_progress")} disabled={savingStatus || status !== "paused"}>
              <RotateCcw size={17} /> Resume
            </WorkerButton>
            <WorkerButton className="dark" onClick={() => handleStatus("completed")} disabled={savingStatus || isDone(status)}>
              <CheckCircle size={17} /> Complete
            </WorkerButton>
          </div>
        </DetailCard>

        <DetailCard>
          <div className="worker-card-head">
            <div>
              <p className="worker-card-title">Proof photos</p>
              <p style={{ margin: "6px 0 0", color: "#68705e", fontWeight: 650 }}>Add photos before completing where possible.</p>
            </div>
            <label className="worker-btn primary" style={{ cursor: "pointer" }}>
              <Camera size={17} /> {uploadingPhoto ? "Uploading..." : "Add photo"}
              <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleAddPhoto} disabled={uploadingPhoto} />
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            {photos.length ? (
              <div className="worker-photo-grid">
                {photos.map((src, idx) => (
                  <div className="worker-photo" key={`${src?.slice?.(0, 20) || "photo"}-${idx}`}>
                    <img src={src} alt={`Job proof ${idx + 1}`} />
                    <button type="button" onClick={() => removePhoto(idx)} aria-label="Remove photo"><X size={14} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="worker-empty" style={{ padding: 18 }}>
                <div className="worker-empty-icon"><Camera size={22} /></div>
                <b>No photos yet</b>
                <p style={{ margin: "6px 0 0", color: "#68705e" }}>Use Add photo to capture proof for the owner.</p>
              </div>
            )}
          </div>
        </DetailCard>

        <DetailCard>
          <p className="worker-card-title">Worker notes</p>
          <p style={{ color: "#68705e", fontWeight: 650, margin: "6px 0 12px" }}>Add what happened, access issues, materials used, or anything the office should know.</p>
          <textarea
            className="worker-textarea"
            value={workerNotes}
            onChange={(event) => setWorkerNotes(event.target.value)}
            placeholder="Add worker notes..."
          />
          <div style={{ marginTop: 10 }}>
            <WorkerButton className="primary" onClick={() => handleSaveNotes()} disabled={savingNotes}>
              <ClipboardList size={17} /> {savingNotes ? "Saving..." : "Save notes"}
            </WorkerButton>
          </div>
        </DetailCard>

        <PremiumAIDraftPanel
          title="Worker-safe AI helper"
          subtitle="Draft clear job updates without exposing owner pricing or billing."
          surface="worker_job"
          context={workerAiContext}
          defaultPrompt="Summarise this job into a simple worker checklist."
          quickActions={[
            { label: "Job checklist", prompt: "Create a clear worker checklist for this job." },
            { label: "Clean up my note", prompt: "Turn my rough worker note into a professional update for the owner." },
            { label: "Completion summary", prompt: "Create a short completion summary for this job." },
            { label: "Ask office", prompt: "Draft a short message asking the office for help with missing job details." },
          ]}
        />

        <DetailCard>
          <p className="worker-card-title">Complete job</p>
          <p style={{ color: "#68705e", fontWeight: 650, margin: "6px 0 12px" }}>Final note is saved with the job before completion.</p>
          <textarea
            className="worker-textarea"
            value={finalNote}
            onChange={(event) => setFinalNote(event.target.value)}
            placeholder="Final completion note..."
          />
          <div style={{ marginTop: 10 }}>
            <WorkerButton className="dark full" onClick={async () => { await handleSaveNotes(finalNote); await handleStatus("completed"); }} disabled={savingStatus || savingNotes || isDone(status)}>
              <CheckCircle2 size={18} /> Complete job now
            </WorkerButton>
          </div>
        </DetailCard>

        <DetailCard>
          <p className="worker-card-title">Need office help?</p>
          <p style={{ color: "#68705e", fontWeight: 650, margin: "6px 0 12px" }}>Ask the office about access, scheduling, job details, or customer instructions.</p>
          <WorkerButton className="full" onClick={() => setShowContactOffice(true)}>
            <MessageSquare size={17} /> Contact office
          </WorkerButton>
        </DetailCard>
      </main>

      <WorkerContactOfficePanel
        open={showContactOffice}
        onClose={() => setShowContactOffice(false)}
        jobId={id}
        jobTitle={title}
        defaultMessage={`I need help with this job: ${title}`}
      />

      <WorkerBottomNav active="jobs" />
    </div>
  );
}
