import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { ArrowLeft, MapPin, Clock3, User, CheckCircle, Camera, X, Navigation, Play, Pause, RotateCcw, Hand, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { safeText } from "../../utils/safeRender";
import { PremiumStatusBadge, PremiumButton, PremiumCard, PremiumAIDraftPanel } from "@/components/premium";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";

async function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
async function compressImage(file, { maxWidth = 1600, quality = 0.78 } = {}) { const dataUrl = await fileToDataUrl(file); const img = await new Promise((resolve, reject) => { const el = new Image(); el.onload = () => resolve(el); el.onerror = () => reject(new Error("image decode failed")); el.src = dataUrl; }); const ratio = img.width > maxWidth ? maxWidth / img.width : 1; const targetW = Math.round(img.width * ratio); const targetH = Math.round(img.height * ratio); const canvas = document.createElement("canvas"); canvas.width = targetW; canvas.height = targetH; const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, targetW, targetH); ctx.drawImage(img, 0, 0, targetW, targetH); return canvas.toDataURL("image/jpeg", quality); }

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
    const res = await get(`/jobs/${id}`);
    if (res.success) {
      setJob(res.data);
      setWorkerNotes(res.data?.worker_notes || "");
      setFinalNote(res.data?.worker_notes || "");
    }
    setLoading(false);
  }, [get, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const getGeo = () => new Promise((resolve) => {
    if (!navigator?.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 120000 },
    );
  });

  const handleStatus = async (status) => {
    setSaving(true);
    const geo = ["in_progress", "completed"].includes(status) ? await getGeo() : null;
    if (!geo && ["in_progress", "completed"].includes(status)) toast.warning("Location unavailable. Status was still saved.");
    const res = await patch(`/jobs/${id}`, { status, worker_geo: geo });
    if (res?.success) { toast.success(`Job ${status.replace(/_/g, " ")}`); await loadJob(); }
    else toast.error(safeText(res?.error, "Failed to update"));
    setSaving(false);
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    const res = await post(`/jobs/${id}/acknowledge`, {});
    if (res?.success) { toast.success("Job acknowledged"); await loadJob(); }
    else {
      const patchRes = await patch(`/jobs/${id}`, { status: "acknowledged" });
      if (patchRes?.success) { toast.success("Job acknowledged"); await loadJob(); }
      else toast.error("Failed to acknowledge");
    }
    setSaving(false);
  };

  const handleSaveNotes = async (text = workerNotes) => {
    setSavingNotes(true);
    const res = await patch(`/jobs/${id}`, { worker_notes: text });
    if (res?.success) { toast.success("Notes saved"); await loadJob(); }
    else toast.error("Failed to save notes");
    setSavingNotes(false);
  };

  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    const existing = Array.isArray(job?.photos) ? job.photos : [];
    setUploadingPhoto(true);
    try {
      const dataUrl = await compressImage(file);
      const res = await patch(`/jobs/${id}`, { photos: [...existing, dataUrl] });
      if (res?.success) setJob((prev) => ({ ...prev, photos: Array.isArray(res?.data?.photos) ? res.data.photos : [...existing, dataUrl] }));
      else toast.error(safeText(res?.error, "Failed to upload photo"));
    } catch { toast.error("Could not process this photo."); }
    setUploadingPhoto(false);
  };

  const status = String(job?.status || "assigned").toLowerCase();
  const safeAiContext = {
    title: job?.title || "",
    status,
    address: job?.address || "",
    scheduled_date: job?.scheduled_date || "",
    scheduled_time: job?.scheduled_time || "",
    notes: job?.notes || "",
    worker_notes: workerNotes || "",
    photo_count: Array.isArray(job?.photos) ? job.photos.length : 0,
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="px-loading__spinner" /></div>;
  if (!job) return <div className="min-h-screen flex items-center justify-center"><Link to="/worker/jobs">Back</Link></div>;

  return (
    <div className="px-app min-h-screen pb-28">
      <header className="bg-white/90 backdrop-blur border-b border-[#e6eef9] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3"><Link to="/worker/jobs"><ArrowLeft className="h-5 w-5 text-[#5b6c87]" /></Link><h1 className="text-lg font-bold text-[#0d1b34]">Job checklist</h1></div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <PremiumCard><div className="px-card__body space-y-2"><div className="flex justify-between gap-2"><h2 className="font-bold text-[#0d1b34]">{job.title || "Untitled Job"}</h2><PremiumStatusBadge status={status} /></div>{job.client_name ? <p className="text-sm text-[#5b6c87] flex items-center gap-1"><User className="h-4 w-4" />{job.client_name}</p> : null}{job.address ? <p className="text-sm text-[#5b6c87] flex items-center gap-1"><MapPin className="h-4 w-4" />{job.address}</p> : null}{job.scheduled_date ? <p className="text-sm text-[#5b6c87] flex items-center gap-1"><Clock3 className="h-4 w-4" />{String(job.scheduled_date).slice(0, 10)} {job.scheduled_time ? `• ${job.scheduled_time}` : ""}</p> : null}</div></PremiumCard>

        {job.address ? <PremiumCard><div className="px-card__body"><p className="text-sm font-semibold text-[#0d1b34] mb-2">Directions</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`} target="_blank" rel="noreferrer"><PremiumButton className="w-full" iconLeft={<Navigation className="h-4 w-4" />}>Open map</PremiumButton></a></div></PremiumCard> : null}

        <PremiumCard><div className="px-card__body space-y-3"><p className="text-sm font-semibold text-[#0d1b34]">Notes</p>{job.notes ? <p className="text-sm text-[#5b6c87] whitespace-pre-wrap">{job.notes}</p> : <p className="text-sm text-[#8da0bf]">No job notes yet.</p>}<textarea value={workerNotes} onChange={(e) => setWorkerNotes(e.target.value)} rows={4} placeholder="Add your worker notes..." className="px-input" /><PremiumButton onClick={() => handleSaveNotes()} disabled={savingNotes}>{savingNotes ? "Saving..." : "Save worker notes"}</PremiumButton></div></PremiumCard>

        <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[#0d1b34]">Time & work controls</p><div className="grid grid-cols-2 gap-2"><PremiumButton onClick={handleAcknowledge} disabled={saving || status !== "assigned"} iconLeft={<Hand className="h-4 w-4" />}>Acknowledge</PremiumButton><PremiumButton onClick={() => handleStatus("in_progress")} disabled={saving || (status !== "assigned" && status !== "acknowledged" && status !== "paused")} iconLeft={<Play className="h-4 w-4" />}>Start</PremiumButton><PremiumButton variant="secondary" onClick={() => handleStatus("paused")} disabled={saving || status !== "in_progress"} iconLeft={<Pause className="h-4 w-4" />}>Pause</PremiumButton><PremiumButton variant="secondary" onClick={() => handleStatus("in_progress")} disabled={saving || status !== "paused"} iconLeft={<RotateCcw className="h-4 w-4" />}>Resume</PremiumButton><div className="col-span-2"><PremiumButton className="w-full" onClick={() => handleStatus("completed")} disabled={saving || status === "completed"} iconLeft={<CheckCircle className="h-4 w-4" />}>Complete</PremiumButton></div></div></div></PremiumCard>

        <PremiumCard><div className="px-card__body space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-[#0d1b34]">Photos</p><label className="cursor-pointer text-[#2563eb] text-sm font-medium inline-flex items-center gap-1"><Camera className="h-4 w-4" />{uploadingPhoto ? "Uploading..." : "Upload photo"}<input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddPhoto} disabled={uploadingPhoto} /></label></div>{Array.isArray(job.photos) && job.photos.length > 0 ? <div className="grid grid-cols-3 gap-2">{job.photos.map((src, idx) => <div key={idx} className="relative group"><img src={src} alt={`Job ${idx + 1}`} className="h-24 w-full object-cover rounded-lg border border-[#dbe6f5]" /><button type="button" onClick={async () => { const next = job.photos.filter((_, i) => i !== idx); const res = await patch(`/jobs/${id}`, { photos: next }); if (res?.success) setJob((prev) => ({ ...prev, photos: next })); }} className="absolute top-1 right-1 p-1 bg-white rounded-full border border-[#dbe6f5]"><X className="h-3 w-3" /></button></div>)}</div> : <p className="text-sm text-[#8da0bf]">No photos yet.</p>}</div></PremiumCard>

        <PremiumAIDraftPanel
          title="AI Job Helper"
          subtitle="Worker-safe drafting for your field updates."
          surface="jobs"
          context={safeAiContext}
          defaultPrompt="Summarise what I need to do for this job."
          quickActions={[
            { label: "Summarise tasks", prompt: "Summarise what I need to do for this job." },
            { label: "Professional note", prompt: "Turn my rough note into a professional job note." },
            { label: "Completion summary", prompt: "Create a completion summary for the owner." },
            { label: "Checklist", prompt: "Create a clear checklist for this job." },
          ]}
        />

        <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[#0d1b34]">Completion</p><textarea className="px-input" rows={3} value={finalNote} onChange={(e) => setFinalNote(e.target.value)} placeholder="Final completion note..." /><p className="text-xs text-[#5b6c87]">Reminder: add at least one final photo where possible before completion.</p><PremiumButton className="w-full" onClick={async () => { await handleSaveNotes(finalNote); await handleStatus("completed"); }} disabled={saving || savingNotes || status === "completed"}>Complete job now</PremiumButton></div></PremiumCard>
        <PremiumCard><div className="px-card__body space-y-2"><p className="text-sm font-semibold text-[#0d1b34]">Need help with this job?</p><p className="text-xs text-[#5b6c87]">Contact your office team for scheduling, access, or job instruction support.</p><PremiumButton variant="secondary" className="w-full" onClick={() => setShowContactOffice(true)} iconLeft={<ClipboardList className="h-4 w-4" />}>Contact office</PremiumButton></div></PremiumCard>
      </main>
      <WorkerContactOfficePanel
        open={showContactOffice}
        onClose={() => setShowContactOffice(false)}
        jobId={id}
        jobTitle={job?.title || ""}
        defaultMessage={`I need help with this job: ${job?.title || "Untitled Job"}`}
      />
      <WorkerBottomNav active="jobs" />
    </div>
  );
}
