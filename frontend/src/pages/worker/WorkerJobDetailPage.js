import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, MapPin, Clock, User, CheckCircle, Camera, X, Phone, Navigation } from "lucide-react";
import { toast } from "sonner";
import { safeText } from "../../utils/safeRender";

const WORKER_STATUSES = ["acknowledged", "in_progress", "paused", "completed"];
const WORKER_ACTION_LABELS = {
  acknowledged: "Start job",
  in_progress: "Start",
  paused: "Pause",
  completed: "Complete",
};
const statusBadgeClass = {
  completed: "status-completed",
  in_progress: "status-in-progress",
  paused: "status-paused",
  assigned: "status-assigned",
  acknowledged: "status-assigned",
  cancelled: "status-cancelled",
};

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Resize + compress a picked image in-browser so workers don't have to manually resize.
// Keeps aspect ratio, scales down to maxWidth if larger, outputs JPEG at quality 0.78.
// Returns a data URL string (always image/jpeg) or throws on failure.
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
  // White background so JPEG output of PNGs with transparency stays clean
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);
  return canvas.toDataURL("image/jpeg", quality);
}

async function captureLocation() {
  if (!("geolocation" in navigator)) {
    return { status: "unavailable" };
  }
  const tryOnce = (options) =>
    new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const timer = setTimeout(() => finish({ status: "timeout" }), options.timeout + 1000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          finish({ status: "captured", lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          clearTimeout(timer);
          if (err?.code === 1) finish({ status: "permission_denied" });
          else if (err?.code === 2) finish({ status: "unavailable" });
          else if (err?.code === 3) finish({ status: "timeout" });
          else finish({ status: "unavailable" });
        },
        options,
      );
    });

  // Attempt 1: high accuracy, generous timeout, allow recent cache
  let result = await tryOnce({ enableHighAccuracy: true, timeout: 20000, maximumAge: 300000 });
  if (result.status === "captured" || result.status === "permission_denied") return result;

  // Attempt 2: drop high-accuracy, accept older cache — usually succeeds indoors/weak signal
  const retry = await tryOnce({ enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  if (retry.status === "captured") return retry;
  // Prefer the more specific of the two failures
  return retry.status !== "timeout" ? retry : result;
}

export default function WorkerJobDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { get, patch } = useApi();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadJob = useCallback(async () => {
    setLoading(true);
    const res = await get(`/jobs/${id}`);
    if (res.success) {
      setJob(res.data);
      setWorkerNotes(res.data?.worker_notes || "");
    }
    setLoading(false);
  }, [get, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const handleStatus = async (status) => {
    setSaving(true);
    const body = { status };
    if (status === "in_progress") {
      const loc = await captureLocation();
      if (loc.status === "captured") {
        body.start_lat = loc.lat;
        body.start_lng = loc.lng;
        body.location_status = "captured";
      } else {
        body.location_status = loc.status;
      }
    }
    const res = await patch(`/jobs/${id}`, body);
    if (res?.success) {
      toast.success(`Job ${status.replace(/_/g, " ")}`);
      await loadJob();
    } else {
      toast.error(safeText(res?.error, "Failed to update"));
    }
    setSaving(false);
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    const res = await get(`/jobs/${id}/acknowledge`, { method: "POST" });
    if (res?.success) {
      toast.success("Job acknowledged");
      await loadJob();
    } else {
      const patchRes = await patch(`/jobs/${id}`, { status: "acknowledged" });
      if (patchRes?.success) { toast.success("Job acknowledged"); await loadJob(); }
      else toast.error("Failed to acknowledge");
    }
    setSaving(false);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const res = await patch(`/jobs/${id}`, { worker_notes: workerNotes });
    if (res?.success) { toast.success("Notes saved"); await loadJob(); }
    else toast.error("Failed to save notes");
    setSavingNotes(false);
  };

  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    const existing = Array.isArray(job?.photos) ? job.photos : [];
    if (existing.length >= 10) {
      toast.error("Maximum 10 photos per job");
      return;
    }
    setUploadingPhoto(true);
    try {
      // Auto-compress so workers don't need to resize normal phone photos first.
      const dataUrl = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/") || dataUrl.length > 6_000_000) {
        toast.error("Could not process this photo. Please try another one.");
        setUploadingPhoto(false);
        return;
      }
      const next = [...existing, dataUrl];
      const res = await patch(`/jobs/${id}`, { photos: next });
      if (res?.success) {
        const saved = Array.isArray(res.data?.photos) ? res.data.photos : next;
        setJob((prev) => (prev ? { ...prev, photos: saved } : prev));
        toast.success("Photo added");
      } else {
        toast.error(safeText(res?.error, "Failed to upload photo"));
      }
    } catch (err) {
      toast.error("Could not process this photo. Please try another one.");
    }
    setUploadingPhoto(false);
  };

  const handleRemovePhoto = async (idx) => {
    const existing = Array.isArray(job?.photos) ? job.photos : [];
    const next = existing.filter((_, i) => i !== idx);
    const res = await patch(`/jobs/${id}`, { photos: next });
    if (res?.success) {
      const saved = Array.isArray(res.data?.photos) ? res.data.photos : next;
      setJob((prev) => (prev ? { ...prev, photos: saved } : prev));
      toast.success("Photo removed");
    } else {
      toast.error(safeText(res?.error, "Failed to remove photo"));
    }
  };

  if (loading) return (
    <div className="chx-worker-shell flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
    </div>
  );

  if (!job) return (
    <div className="chx-worker-shell flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-500">Job not found</p>
        <Link to="/worker/jobs" className="text-blue-600 text-sm mt-2 inline-block">Back to jobs</Link>
      </div>
    </div>
  );

  const status = (job.status || "assigned").toLowerCase();

  return (
    <div className="chx-worker-shell">
      <header className="chx-worker-header px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/worker/jobs" className="text-slate-400 hover:text-slate-600"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-lg font-bold text-slate-900 truncate">{job.title || "Job Detail"}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Job info */}
        <div className="chx-worker-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{job.title}</h2>
            <span className={`cx-status-badge ${statusBadgeClass[status] || "status-assigned"}`}>{status.replace(/_/g, " ")}</span>
          </div>
          {job.client_name && <p className="text-sm text-slate-500 flex items-center gap-1.5"><User className="h-4 w-4" />{job.client_name}</p>}
          {job.address && <p className="text-sm text-slate-500 flex items-center gap-1.5"><MapPin className="h-4 w-4" />{job.address}</p>}
          {job.scheduled_date && <p className="text-sm text-slate-500 flex items-center gap-1.5"><Clock className="h-4 w-4" />{String(job.scheduled_date).slice(0, 10)}{job.scheduled_time ? ` at ${job.scheduled_time}` : ""}</p>}
          <div className="flex gap-2">
            {job.customer_phone && (
              <a href={`tel:${job.customer_phone}`} className="cx-button-primary text-xs px-3 py-2 rounded-lg">
                <Phone className="h-3 w-3" /> Call customer
              </a>
            )}
            {job.address && (
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer" className="cx-button-secondary text-xs px-3 py-2 rounded-lg">
                <Navigation className="h-3 w-3" /> Directions
              </a>
            )}
          </div>
          {job.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-400 uppercase mb-1">Employer Notes</p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </div>

        {/* Status actions */}
        {status === "assigned" && (
          <button onClick={handleAcknowledge} disabled={saving}
            className="w-full bg-[#155EEF] text-white rounded-2xl py-3 font-semibold hover:bg-[#1247b8] disabled:opacity-50 transition-colors shadow-[0_10px_20px_rgba(21,94,239,0.2)]"
            data-testid="accept-job-btn">
            {saving ? "Accepting..." : "Accept Job"}
          </button>
        )}

        {status !== "assigned" && status !== "completed" && (
          <div className="chx-worker-card p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Update job progress</p>
            <div className="flex gap-2 flex-wrap">
              {WORKER_STATUSES.filter(s => s !== "acknowledged").map((s) => (
                <button key={s} onClick={() => handleStatus(s)} disabled={saving || status === s}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"} disabled:opacity-50`}
                  data-testid={`status-btn-${s}`}>
                  {WORKER_ACTION_LABELS[s] || s.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "completed" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-700">Job completed</p>
          </div>
        )}

        {/* Worker notes */}
        <div className="chx-worker-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Add note</p>
            <button onClick={handleSaveNotes} disabled={savingNotes}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              data-testid="save-worker-notes-btn">
              {savingNotes ? "Saving..." : "Save"}
            </button>
          </div>
          <textarea value={workerNotes} onChange={(e) => setWorkerNotes(e.target.value)}
            placeholder="Add notes about this job..." rows={4}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 text-slate-900 p-3 text-sm outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300"
            data-testid="worker-notes-textarea" />
        </div>

        {/* Photos */}
        <div className="chx-worker-card p-4 space-y-3" data-testid="worker-photos-section">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Job Photos</p>
            <label className="text-sm font-medium text-blue-600 hover:text-blue-700 cursor-pointer inline-flex items-center gap-1" data-testid="add-photo-label">
              <Camera className="h-4 w-4" />
              {uploadingPhoto ? "Uploading..." : "Upload photo"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} data-testid="worker-photo-input" />
            </label>
          </div>
          {Array.isArray(job.photos) && job.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {job.photos.map((src, idx) => (
                <div key={idx} className="relative group">
                  <img src={src} alt={`Job photo ${idx + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-200" />
                  <button type="button" onClick={() => handleRemovePhoto(idx)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 border border-slate-200 opacity-0 group-hover:opacity-100 transition" aria-label="Remove photo" data-testid={`remove-photo-${idx}`}>
                    <X className="h-3 w-3 text-slate-600" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">No photos yet. Add one after starting the job.</p>
          )}
        </div>

        {/* Progress info */}
        {(job.accepted_at || job.started_at || job.completed_at) && (
          <div className="chx-worker-card p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Progress</p>
            {job.accepted_at && <p className="text-xs text-slate-400">Accepted: {new Date(job.accepted_at).toLocaleString()}</p>}
            {job.started_at && <p className="text-xs text-slate-400">Started: {new Date(job.started_at).toLocaleString()}</p>}
            {job.completed_at && <p className="text-xs text-slate-400">Completed: {new Date(job.completed_at).toLocaleString()}</p>}
          </div>
        )}
      </main>
    </div>
  );
}
