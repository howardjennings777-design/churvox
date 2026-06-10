// CHURVOX_JOB_DETAIL_REAL_ACTIONS_20260607
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../../components/premium";
import { ArrowLeft, CheckCircle2, ClipboardList, Clock, FileText, MessageSquareText, Play, RotateCcw, Save, Send, UserCircle2 } from "lucide-react";

function asRecord(payload) {
  const data = payload?.data ?? payload;
  return data?.job || data?.item || data?.record || data || {};
}
function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.team)) return value.team;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function oid(value) {
  if (!value) return "";
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || "");
  return String(value);
}
function idOf(value) { return oid(value?.id || value?._id || value?.worker_id || value?.user_id || ""); }
function workerName(worker) { return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker"; }
function titleOf(job) { return job?.title || job?.job_name || job?.customer_name || job?.client_name || "Job"; }
function clientOf(job) { return job?.client_name || job?.customer_name || job?.name || "No client"; }
function statusOf(job) { return String(job?.status || job?.job_status || "assigned").toLowerCase(); }
function reviewStatusOf(job) { return String(job?.work_review_status || job?.owner_review_status || job?.review_status || "").toLowerCase(); }
function pretty(value) { return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) || "-"; }
function dateLabel(value) { if (!value) return "-"; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString("en-NZ"); }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00"; }
function hasValue(value) { return String(value ?? "").trim() !== ""; }
function jobPrice(job) { return Number(job?.fixed_price || job?.price || job?.job_price || job?.total || job?.amount || 0); }
function invoiceDescription(job, note = "") {
  return [job?.ai_invoice_description, job?.invoice_description_draft, job?.completion_notes, note, job?.worker_notes, job?.description, job?.notes, titleOf(job)].find((v) => hasValue(v)) || "Service work completed";
}
function customerDraft(job) {
  return `Hi ${clientOf(job)},\n\nYour job “${titleOf(job)}” has been completed and is ready for review.\n\nWork summary: ${invoiceDescription(job)}\n\nThanks.`;
}
function collectPhotos(job) {
  const buckets = [job?.photos, job?.job_photos, job?.uploaded_photos, job?.completion_photos, job?.images, job?.attachments];
  const out = [];
  buckets.forEach((bucket) => arr(bucket).forEach((item) => {
    const url = typeof item === "string" ? item : item?.url || item?.photo_url || item?.image_url || item?.file_url || item?.src;
    if (url && !out.includes(url)) out.push(url);
  }));
  return out;
}
function reviewed(job) {
  const state = reviewStatusOf(job);
  return Boolean(job?.reviewed || job?.owner_approved || job?.work_approved || ["approved", "reviewed", "accepted", "invoiced"].includes(state));
}
function timeLabel(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return "0 min";
  const h = Math.floor(total / 3600);
  const m = Math.max(1, Math.floor((total % 3600) / 60));
  return h ? `${h}h ${m}m` : `${m} min`;
}

export default function JobDetailPageStable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, patch } = useApi();
  const { user, isWorker } = useAuth();
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [workerNotes, setWorkerNotes] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState("");

  const role = String(user?.role || "").toLowerCase();
  const isOwnerView = (!isWorker && ["owner", "admin", "employer", "manager", "office_admin"].includes(role)) || user?.is_owner || user?.is_admin;

  const loadJob = useCallback(async () => {
    setLoading(true);
    const [jobRes, workersRes] = await Promise.all([get(`/jobs/${encodeURIComponent(id)}`), get("/team/workers")]);
    if (jobRes?.success) {
      const nextJob = asRecord(jobRes);
      setJob(nextJob);
      setOwnerNotes(nextJob?.notes || nextJob?.internal_notes || "");
      setWorkerNotes(nextJob?.worker_notes || nextJob?.latest_worker_note || "");
      setSelectedWorker(oid(nextJob?.assigned_worker_id || nextJob?.worker_id || ""));
    } else {
      setJob(null);
      toast.error(jobRes?.error || "Could not load job");
    }
    setWorkers(workersRes?.success ? arr(workersRes.data) : []);
    setLoading(false);
  }, [get, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const photos = useMemo(() => collectPhotos(job || {}), [job]);
  const status = statusOf(job || {});
  const reviewStatus = reviewStatusOf(job || {});
  const price = jobPrice(job || {});
  const selectedWorkerRecord = workers.find((worker) => idOf(worker) === String(selectedWorker));
  const isCompleted = ["completed", "complete", "done"].includes(status) || job?.completed === true;
  const isReviewed = reviewed(job || {});
  const hasInvoice = Boolean(job?.invoice_id || job?.draft_invoice_id);
  const readyForInvoice = isCompleted && isReviewed && !hasInvoice;
  const timerRunning = job?.timer_running === true;

  async function patchJob(payload, success = "Job updated") {
    setBusy(success);
    const res = await patch(`/jobs/${encodeURIComponent(id)}`, { ...payload, updated_at: new Date().toISOString() });
    setBusy("");
    if (res?.success) {
      toast.success(success);
      await loadJob();
      return true;
    }
    toast.error(res?.error || "Could not update job");
    return false;
  }

  async function postJob(endpoint, payload, success) {
    setBusy(success);
    const res = await post(endpoint, payload || {});
    setBusy("");
    if (res?.success) {
      toast.success(success);
      await loadJob();
      return true;
    }
    toast.error(res?.error || success || "Job action failed");
    return false;
  }

  async function assignWorker() {
    if (!selectedWorker) return toast.error("Choose a worker first");
    return postJob(`/jobs/${encodeURIComponent(id)}/assign`, { worker_id: selectedWorker }, "Worker assigned");
  }

  async function acceptJob() {
    return postJob(`/jobs/${encodeURIComponent(id)}/acknowledge`, {}, "Job accepted");
  }

  async function startTimer() {
    return postJob(`/jobs/${encodeURIComponent(id)}/timer/start`, {}, "Job timer started");
  }

  async function pauseTimer() {
    return postJob(`/jobs/${encodeURIComponent(id)}/timer/pause`, {}, "Job timer paused");
  }

  async function resumeTimer() {
    return postJob(`/jobs/${encodeURIComponent(id)}/timer/resume`, {}, "Job timer resumed");
  }

  async function completeForReview() {
    const nextDesc = invoiceDescription(job || {}, workerNotes);
    const done = await postJob(`/jobs/${encodeURIComponent(id)}/complete`, {}, "Job completed for owner review");
    if (!done) return false;
    return patchJob({
      worker_notes: workerNotes,
      completion_notes: workerNotes || job?.completion_notes || nextDesc,
      latest_worker_note: workerNotes || job?.latest_worker_note || "Completed by worker",
      work_review_status: "ready_for_review",
      owner_review_status: "ready_for_review",
      review_status: "ready_for_review",
      worker_action_required: false,
      ai_invoice_description: nextDesc,
      invoice_description_draft: nextDesc,
      customer_message_draft: customerDraft({ ...(job || {}), completion_notes: workerNotes || nextDesc }),
    }, "Completion notes saved");
  }

  async function approveWork() {
    const now = new Date().toISOString();
    const nextDesc = invoiceDescription(job || {}, workerNotes);
    return patchJob({
      reviewed: true,
      owner_approved: true,
      work_approved: true,
      job_approved: true,
      work_review_status: "approved",
      owner_review_status: "approved",
      review_status: "approved",
      approval_status: "approved",
      approved_at: now,
      reviewed_at: now,
      approved_by: user?.email || user?.name || "owner",
      worker_action_required: false,
      ai_invoice_description: nextDesc,
      invoice_description_draft: nextDesc,
      customer_message_draft: customerDraft({ ...(job || {}), completion_notes: nextDesc }),
      message_approval_status: job?.message_approval_status || "draft_ready",
    }, "Work approved");
  }

  async function sendBack() {
    const note = reviewNote.trim();
    if (!note) return toast.error("Add a note for the worker before sending back");
    const existingNotes = String(job?.notes || "");
    const reviewLine = `Owner sent work back: ${note}`;
    return patchJob({
      status: "assigned",
      reviewed: false,
      owner_approved: false,
      work_approved: false,
      job_approved: false,
      work_review_status: "sent_back",
      owner_review_status: "sent_back",
      review_status: "sent_back",
      send_back_note: note,
      owner_note: note,
      worker_note: note,
      worker_action_required: true,
      sent_back_at: new Date().toISOString(),
      notes: existingNotes ? `${existingNotes}\n\n${reviewLine}` : reviewLine,
    }, "Sent back to worker");
  }

  async function prepareMessage() {
    const message = customerDraft(job || {});
    await patchJob({
      customer_message_draft: message,
      last_message_subject: `Job update for ${titleOf(job || {})}`,
      message_approval_status: "draft_ready",
    }, "Customer message draft prepared");
  }

  async function approveAndInvoice() {
    let ok = isReviewed;
    if (!ok) ok = await approveWork();
    if (!ok) return;
    const nextDesc = invoiceDescription(job || {}, workerNotes);
    await patch(`/jobs/${encodeURIComponent(id)}`, {
      invoice_description_draft: nextDesc,
      ai_invoice_description: nextDesc,
      invoice_ready_at: new Date().toISOString(),
      invoice_source_status: "owner_approved",
      updated_at: new Date().toISOString(),
    });
    navigate(`/invoices/new?job_id=${encodeURIComponent(id)}`);
  }

  if (loading) return <Layout><PremiumPage maxWidth={980}><PremiumCard><div className="p-8 text-center font-bold text-slate-300">Loading job…</div></PremiumCard></PremiumPage></Layout>;
  if (!job) return <Layout><PremiumPage maxWidth={980}><PremiumCard><div className="p-8 text-center"><h2 className="text-2xl font-black text-white">Job could not load</h2><button className="mt-4 rounded-full bg-white px-5 py-3 font-black text-slate-950" onClick={() => navigate("/jobs-board")}>Back to Jobs board</button></div></PremiumCard></PremiumPage></Layout>;

  return <Layout><PremiumPage maxWidth={1160}>
    <button type="button" onClick={() => navigate("/jobs-board")} className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> Back to Jobs board</button>
    <PremiumHero eyebrow="Job detail" title={titleOf(job)} subtitle="Review the job record, run real timer actions, approve work, then create the invoice draft." icon={<ClipboardList className="h-6 w-6" />} actions={isOwnerView ? <div className="flex flex-wrap gap-2"><PremiumButton variant="secondary" onClick={() => navigate(`/jobs/${id}/edit`)}>Edit job</PremiumButton>{hasInvoice ? <PremiumButton variant="secondary" onClick={() => navigate(`/invoices/${job.invoice_id || job.draft_invoice_id}`)}>View invoice</PremiumButton> : null}</div> : null} />

    <section className="mb-5 grid gap-3 md:grid-cols-6">
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Status</span><b className="mt-2 block text-2xl text-white">{pretty(status)}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Review</span><b className="mt-2 block text-2xl text-white">{pretty(reviewStatus || "not reviewed")}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Client</span><b className="mt-2 block truncate text-xl text-white">{clientOf(job)}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Worker</span><b className="mt-2 block truncate text-xl text-white">{job.assigned_worker_name || job.worker_name || "Unassigned"}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">Timer</span><b className="mt-2 block text-2xl text-white">{timerRunning ? "Running" : "Stopped"}</b></article>
      {isOwnerView ? <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Invoice source</span><b className="mt-2 block text-2xl text-white">{money(price)}</b></article> : null}
    </section>

    {reviewStatus === "sent_back" || job?.worker_action_required ? <PremiumCard><div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-4"><b className="text-amber-100">Sent back to worker</b><p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-amber-50/80">{job.send_back_note || job.owner_note || "Worker needs to update this job before owner approval."}</p></div></PremiumCard> : null}
    {isOwnerView && readyForInvoice ? <PremiumCard><div className="rounded-3xl border border-lime-300/30 bg-lime-400/10 p-4"><b className="text-lime-100">Ready for invoice draft</b><p className="mt-2 text-sm font-semibold text-lime-50/80">This work has been approved. Churvox has a draft invoice description ready from the worker notes and job details.</p></div></PremiumCard> : null}

    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-5">
        <PremiumCard title="Job record"><div className="grid gap-4 md:grid-cols-2"><div><span className="text-xs font-black uppercase text-slate-400">Client</span><p className="mt-1 font-bold text-white">{clientOf(job)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Site address</span><p className="mt-1 font-bold text-white">{job.address || job.site_address || "No address"}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Scheduled</span><p className="mt-1 font-bold text-white">{dateLabel(job.scheduled_date)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Created</span><p className="mt-1 font-bold text-white">{dateLabel(job.created_at)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Started</span><p className="mt-1 font-bold text-white">{dateLabel(job.started_at)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Completed</span><p className="mt-1 font-bold text-white">{dateLabel(job.completed_at)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Time logged</span><p className="mt-1 font-bold text-white">{timeLabel(job.total_time_seconds)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Pricing</span><p className="mt-1 font-bold text-white">{money(price)}</p></div></div></PremiumCard>
        <PremiumCard title={isOwnerView ? "Owner notes" : "Worker notes"} icon={<FileText className="h-5 w-5" />}>{isOwnerView ? <><textarea className="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 font-semibold text-white" value={ownerNotes} onChange={(e) => setOwnerNotes(e.target.value)} placeholder="Private owner/admin notes for this job" /><div className="mt-3 flex justify-end"><PremiumButton onClick={() => patchJob({ notes: ownerNotes, internal_notes: ownerNotes }, "Owner notes saved")} disabled={Boolean(busy)} iconLeft={<Save className="h-4 w-4" />}>Save owner notes</PremiumButton></div></> : <><textarea className="min-h-[140px] w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 font-semibold text-white" value={workerNotes} onChange={(e) => setWorkerNotes(e.target.value)} placeholder="Work completed, access notes, issues, materials used..." /><div className="mt-3 flex justify-end"><PremiumButton onClick={() => patchJob({ worker_notes: workerNotes, latest_worker_note: workerNotes }, "Worker notes saved")} disabled={Boolean(busy)} iconLeft={<Save className="h-4 w-4" />}>Save worker notes</PremiumButton></div></>}</PremiumCard>
        {photos.length ? <PremiumCard title="Worker photos"><div className="grid gap-3 md:grid-cols-3">{photos.map((url) => <button key={url} type="button" onClick={() => setSelectedPhoto(url)} className="block overflow-hidden rounded-2xl border border-slate-700 text-left"><img src={url} alt="Job upload" className="h-44 w-full object-cover" /></button>)}</div></PremiumCard> : null}
      </div>

      
    </section>

    {selectedPhoto ? <div className="fixed inset-0 z-[2147483647] grid place-items-center bg-slate-950/90 p-4" role="dialog" aria-modal="true"><div className="max-h-[92vh] max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 shadow-2xl"><div className="flex items-center justify-between gap-3 border-b border-white/10 p-3"><b className="text-sm font-black text-white">Job photo</b><button type="button" onClick={() => setSelectedPhoto("")} className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950">Close</button></div><img src={selectedPhoto} alt="Job upload enlarged" className="max-h-[82vh] w-full object-contain" /></div></div> : null}
  </PremiumPage></Layout>;
}
