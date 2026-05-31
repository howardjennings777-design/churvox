// CHURVOX_JOB_DETAIL_WORK_REVIEW_STABLE_20260601
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
function idOf(value) { return String(value?.id || value?._id || value?.worker_id || value?.user_id || ""); }
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

export default function JobDetailPageStable() {
  const { id } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const { user, isWorker } = useAuth();
  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [ownerNotes, setOwnerNotes] = useState("");
  const [workerNotes, setWorkerNotes] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const role = String(user?.role || "").toLowerCase();
  const isOwnerView = (!isWorker && ["owner", "admin", "employer", "manager", "office_admin"].includes(role)) || user?.is_owner || user?.is_admin;

  const loadJob = useCallback(async () => {
    setLoading(true);
    const [jobRes, workersRes] = await Promise.all([api.get(`/jobs/${encodeURIComponent(id)}`), api.get("/team/workers")]);
    if (jobRes?.success) {
      const nextJob = asRecord(jobRes);
      setJob(nextJob);
      setOwnerNotes(nextJob?.notes || nextJob?.internal_notes || "");
      setWorkerNotes(nextJob?.worker_notes || nextJob?.latest_worker_note || "");
      setSelectedWorker(nextJob?.assigned_worker_id || nextJob?.worker_id || "");
    } else {
      setJob(null);
      toast.error(jobRes?.error || "Could not load job");
    }
    setWorkers(workersRes?.success ? arr(workersRes.data) : []);
    setLoading(false);
  }, [api, id]);

  useEffect(() => { loadJob(); }, [loadJob]);

  const photos = useMemo(() => collectPhotos(job || {}), [job]);
  const status = statusOf(job || {});
  const reviewStatus = reviewStatusOf(job || {});
  const price = jobPrice(job || {});
  const selectedWorkerRecord = workers.find((worker) => idOf(worker) === String(selectedWorker));

  async function patchJob(payload, success = "Job updated") {
    setBusy(success);
    const res = await api.patch(`/jobs/${encodeURIComponent(id)}`, { ...payload, updated_at: new Date().toISOString() });
    setBusy("");
    if (res?.success) {
      toast.success(success);
      await loadJob();
      return true;
    }
    toast.error(res?.error || "Could not update job");
    return false;
  }
  async function assignWorker() {
    if (!selectedWorker) return toast.error("Choose a worker first");
    const worker = selectedWorkerRecord;
    return patchJob({ assigned_worker_id: selectedWorker, worker_id: selectedWorker, assigned_worker_name: worker ? workerName(worker) : job?.assigned_worker_name, worker_name: worker ? workerName(worker) : job?.worker_name, status: status === "completed" ? status : "assigned", assigned_at: new Date().toISOString() }, "Worker assigned");
  }
  async function workerAction(nextStatus) {
    const now = new Date().toISOString();
    let patch = { status: nextStatus };
    if (nextStatus === "acknowledged") patch = { ...patch, accepted_at: now };
    if (nextStatus === "in_progress") patch = { ...patch, started_at: job?.started_at || now };
    if (nextStatus === "paused") patch = { ...patch, paused_at: now };
    if (nextStatus === "completed") {
      const desc = invoiceDescription(job || {}, workerNotes);
      patch = { ...patch, completed_at: now, worker_notes: workerNotes, completion_notes: workerNotes || job?.completion_notes || desc, latest_worker_note: workerNotes || job?.latest_worker_note || "Completed by worker", work_review_status: "pending_review", owner_review_status: "pending_review", worker_action_required: false, ai_invoice_description: desc, invoice_description_draft: desc, customer_message_draft: customerDraft({ ...(job || {}), completion_notes: workerNotes || desc }) };
    }
    return patchJob(patch, nextStatus === "completed" ? "Job completed for owner review" : "Job updated");
  }
  async function approveWork() {
    const desc = invoiceDescription(job || {}, workerNotes);
    return patchJob({ work_review_status: "approved", owner_review_status: "approved", owner_approved: true, work_approved: true, approved_at: new Date().toISOString(), approved_by: user?.email || user?.name || "owner", worker_action_required: false, ai_invoice_description: desc, invoice_description_draft: desc, customer_message_draft: customerDraft({ ...(job || {}), completion_notes: desc }) }, "Work approved");
  }
  async function sendBack() {
    const note = reviewNote.trim();
    if (!note) return toast.error("Add a note for the worker before sending back");
    return patchJob({ work_review_status: "sent_back", owner_review_status: "sent_back", send_back_note: note, owner_note: note, worker_action_required: true, sent_back_at: new Date().toISOString() }, "Sent back to worker");
  }
  async function prepareMessage() {
    const message = customerDraft(job || {});
    const ok = await patchJob({ customer_message_draft: message, last_message_subject: `Job update for ${titleOf(job || {})}` }, "Customer message draft prepared");
    if (ok) navigate(`/message-approvals?job_id=${encodeURIComponent(id)}`);
  }
  async function approveAndInvoice() {
    const ok = reviewStatus === "approved" || job?.owner_approved || await approveWork();
    if (ok) navigate(`/invoices/new?job_id=${encodeURIComponent(id)}`);
  }

  if (loading) return <Layout><PremiumPage maxWidth={980}><PremiumCard><div className="p-8 text-center font-bold text-slate-300">Loading job…</div></PremiumCard></PremiumPage></Layout>;
  if (!job) return <Layout><PremiumPage maxWidth={980}><PremiumCard><div className="p-8 text-center"><h2 className="text-2xl font-black text-white">Job could not load</h2><button className="mt-4 rounded-full bg-white px-5 py-3 font-black text-slate-950" onClick={() => navigate("/jobs")}>Back to jobs</button></div></PremiumCard></PremiumPage></Layout>;

  return <Layout><PremiumPage maxWidth={1160}>
    <button type="button" onClick={() => navigate("/jobs")} className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-300 hover:text-white"><ArrowLeft size={16} /> Back to jobs</button>
    <PremiumHero eyebrow="Job detail" title={titleOf(job)} subtitle="Worker completes the job, owner reviews it, then invoice and customer message flow from the same job record." icon={<ClipboardList className="h-6 w-6" />} actions={isOwnerView ? <div className="flex flex-wrap gap-2"><PremiumButton variant="secondary" onClick={() => navigate(`/jobs/${id}/edit`)}>Edit job</PremiumButton>{job?.invoice_id ? <PremiumButton variant="secondary" onClick={() => navigate(`/invoices/${job.invoice_id}`)}>View invoice</PremiumButton> : null}</div> : null} />

    <section className="mb-5 grid gap-3 md:grid-cols-5">
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Status</span><b className="mt-2 block text-2xl text-white">{pretty(status)}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-lime-300">Review</span><b className="mt-2 block text-2xl text-white">{pretty(reviewStatus || "not reviewed")}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300">Client</span><b className="mt-2 block truncate text-xl text-white">{clientOf(job)}</b></article>
      <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-purple-300">Worker</span><b className="mt-2 block truncate text-xl text-white">{job.assigned_worker_name || job.worker_name || "Unassigned"}</b></article>
      {isOwnerView ? <article className="rounded-3xl border border-slate-700 bg-slate-950/50 p-4"><span className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Invoice source</span><b className="mt-2 block text-2xl text-white">{money(price)}</b></article> : null}
    </section>

    {reviewStatus === "sent_back" || job?.worker_action_required ? <PremiumCard><div className="rounded-3xl border border-amber-300/30 bg-amber-400/10 p-4"><b className="text-amber-100">Sent back to worker</b><p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-amber-50/80">{job.send_back_note || job.owner_note || "Worker needs to update this job before owner approval."}</p></div></PremiumCard> : null}

    <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-5">
        <PremiumCard title="Job record"><div className="grid gap-4 md:grid-cols-2"><div><span className="text-xs font-black uppercase text-slate-400">Client</span><p className="mt-1 font-bold text-white">{clientOf(job)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Site address</span><p className="mt-1 font-bold text-white">{job.address || job.site_address || "No address"}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Scheduled</span><p className="mt-1 font-bold text-white">{dateLabel(job.scheduled_date)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Created</span><p className="mt-1 font-bold text-white">{dateLabel(job.created_at)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Started</span><p className="mt-1 font-bold text-white">{dateLabel(job.started_at)}</p></div><div><span className="text-xs font-black uppercase text-slate-400">Completed</span><p className="mt-1 font-bold text-white">{dateLabel(job.completed_at)}</p></div></div></PremiumCard>
        <PremiumCard title={isOwnerView ? "Owner notes" : "Worker notes"} icon={<FileText className="h-5 w-5" />}>{isOwnerView ? <><textarea className="min-h-[120px] w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 font-semibold text-white" value={ownerNotes} onChange={(e) => setOwnerNotes(e.target.value)} placeholder="Private owner/admin notes for this job" /><div className="mt-3 flex justify-end"><PremiumButton onClick={() => patchJob({ notes: ownerNotes, internal_notes: ownerNotes }, "Owner notes saved")} disabled={Boolean(busy)} iconLeft={<Save className="h-4 w-4" />}>Save owner notes</PremiumButton></div></> : <><textarea className="min-h-[140px] w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 font-semibold text-white" value={workerNotes} onChange={(e) => setWorkerNotes(e.target.value)} placeholder="Work completed, access notes, issues, materials used..." /><div className="mt-3 flex justify-end"><PremiumButton onClick={() => patchJob({ worker_notes: workerNotes, latest_worker_note: workerNotes }, "Worker notes saved")} disabled={Boolean(busy)} iconLeft={<Save className="h-4 w-4" />}>Save worker notes</PremiumButton></div></>}</PremiumCard>
        {photos.length ? <PremiumCard title="Worker photos"><div className="grid gap-3 md:grid-cols-3">{photos.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl border border-slate-700"><img src={url} alt="Job upload" className="h-44 w-full object-cover" /></a>)}</div></PremiumCard> : null}
      </div>
      <aside className="grid content-start gap-5">
        {isOwnerView ? <PremiumCard title="Assign worker" icon={<UserCircle2 className="h-5 w-5" />}><select className="w-full rounded-2xl border border-slate-700 bg-slate-950/60 p-3 font-bold text-white" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)}><option value="">Choose worker</option>{workers.map((worker) => <option key={idOf(worker)} value={idOf(worker)}>{workerName(worker)}</option>)}</select><div className="mt-3"><PremiumButton onClick={assignWorker} disabled={Boolean(busy)}>Assign worker</PremiumButton></div></PremiumCard> : null}
        {!isOwnerView ? <PremiumCard title="Worker actions" icon={<Clock className="h-5 w-5" />}><div className="grid gap-2"><PremiumButton variant="secondary" onClick={() => workerAction("acknowledged")} disabled={Boolean(busy)}>Accept job</PremiumButton><PremiumButton onClick={() => workerAction("in_progress")} disabled={Boolean(busy)} iconLeft={<Play className="h-4 w-4" />}>Start job</PremiumButton><PremiumButton variant="secondary" onClick={() => workerAction("paused")} disabled={Boolean(busy)}>Pause</PremiumButton><PremiumButton variant="secondary" onClick={() => workerAction("in_progress")} disabled={Boolean(busy)} iconLeft={<RotateCcw className="h-4 w-4" />}>Resume</PremiumButton><PremiumButton onClick={() => workerAction("completed")} disabled={Boolean(busy)} iconLeft={<CheckCircle2 className="h-4 w-4" />}>Complete for owner review</PremiumButton></div></PremiumCard> : null}
        {isOwnerView ? <PremiumCard title="Owner review" icon={<CheckCircle2 className="h-5 w-5" />}><p className="text-sm font-semibold text-slate-300">Approve completed work, create the invoice draft, or prepare a customer message.</p><div className="mt-3 grid gap-2"><PremiumButton onClick={approveWork} disabled={Boolean(busy) || status !== "completed"} iconLeft={<CheckCircle2 className="h-4 w-4" />}>Approve work</PremiumButton><PremiumButton onClick={approveAndInvoice} disabled={Boolean(busy) || status !== "completed"} iconLeft={<FileText className="h-4 w-4" />}>Approve & create invoice</PremiumButton><PremiumButton variant="secondary" onClick={prepareMessage} disabled={Boolean(busy)} iconLeft={<MessageSquareText className="h-4 w-4" />}>Prepare customer message</PremiumButton></div><div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-3"><textarea className="min-h-[90px] w-full rounded-xl border border-slate-700 bg-slate-900/80 p-3 text-sm font-semibold text-white" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Reason if sending back to worker" /><button type="button" onClick={sendBack} disabled={Boolean(busy)} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100"><Send className="h-4 w-4" /> Send back to worker</button></div></PremiumCard> : null}
        {job.invoice_id ? <PremiumCard title="Invoice linked"><Link className="font-black text-cyan-300" to={`/invoices/${job.invoice_id}`}>Open linked invoice</Link></PremiumCard> : null}
      </aside>
    </section>
  </PremiumPage></Layout>;
}
