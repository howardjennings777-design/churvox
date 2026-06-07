import React from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

const statusTone = {
  completed: "bg-emerald-300 text-slate-950",
  complete: "bg-emerald-300 text-slate-950",
  in_progress: "bg-cyan-300 text-slate-950",
  progress: "bg-cyan-300 text-slate-950",
  paused: "bg-amber-300 text-slate-950",
  assigned: "bg-slate-200 text-slate-950",
  cancelled: "bg-red-300 text-slate-950",
  draft: "bg-white/10 text-white ring-1 ring-white/10",
};

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "jobs", "workers", "invoices", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(item) {
  const raw = item?.id || item?._id || item?.job_id || item?.worker_id || item?.invoice_id || "";
  return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || "");
}

function titleOf(job) {
  return first(job?.title, job?.job_title, job?.job_name, job?.name, job?.service_type, "Untitled job");
}

function clientOf(job) {
  return first(job?.client_name, job?.customer_name, job?.client?.name, job?.customer?.name, "No client saved");
}

function workerOf(job) {
  return first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assignedWorkerName, job?.worker?.name, job?.assigned_worker?.name, job?.assigned_to, "Unassigned");
}

function statusOf(job) {
  return String(first(job?.status, job?.job_status, "ready")).replaceAll("_", " ");
}

function rawStatus(job) {
  return String(first(job?.status, job?.job_status, "ready")).toLowerCase();
}

function isDone(job) {
  const status = rawStatus(job);
  return status.includes("complete") || status.includes("finished") || status.includes("done") || job?.completed === true || Boolean(job?.completed_at);
}

function isActive(job) {
  const status = rawStatus(job);
  return status.includes("progress") || status.includes("start") || status.includes("active") || status.includes("timer") || job?.timer_running === true;
}

function isTimerRunning(job) {
  return job?.timer_running === true;
}

function isUnassigned(job) {
  return workerOf(job) === "Unassigned" && !isDone(job) && !rawStatus(job).includes("cancel");
}

function formatDate(value) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds) {
  const total = Number(seconds || 0);
  if (!Number.isFinite(total) || total <= 0) return "0 min";
  const hours = Math.floor(total / 3600);
  const mins = Math.max(1, Math.floor((total % 3600) / 60));
  return hours ? `${hours}h ${mins}m` : `${mins} min`;
}

function money(value) {
  const num = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) && num > 0 ? num.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00";
}

function numberValue(value) {
  const num = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function statusClass(job) {
  const key = rawStatus(job);
  if (key.includes("complete")) return statusTone.completed;
  if (key.includes("progress") || key.includes("start") || job?.timer_running) return statusTone.in_progress;
  if (key.includes("pause")) return statusTone.paused;
  if (key.includes("assign")) return statusTone.assigned;
  if (key.includes("cancel")) return statusTone.cancelled;
  return statusTone.draft;
}

function detailsFor(job) {
  return {
    Client: clientOf(job),
    Worker: workerOf(job),
    Status: statusOf(job),
    Timer: isTimerRunning(job) ? "Running" : "Stopped",
    "Time logged": formatDuration(job?.total_time_seconds),
    Address: first(job?.address, job?.site_address, job?.street_address, "Not saved"),
    Scheduled: formatDate(first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.job_date)),
    Pricing: money(first(job?.price, job?.total, job?.amount, job?.fixed_price, 0)),
    Notes: first(job?.notes, job?.description, job?.job_notes, "No notes saved"),
  };
}

function hasInvoiceForJob(job, invoices) {
  const jobId = idOf(job);
  return invoices.some((invoice) => String(first(invoice?.job_id, invoice?.jobId, "")) === jobId);
}

function SecurityTape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function MetricCard({ label, value, text, color }) {
  return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><SecurityTape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>;
}

function DetailRow({ label, value }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>;
}

function Field({ label, value, onChange, type = "text", children }) {
  return <label className="grid gap-2 rounded-2xl border border-white/10 bg-slate-950/45 p-4"><span className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</span>{children || <input type={type} value={value || ""} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300" />}</label>;
}

function JobSlip({ job, workers, hasInvoice, busy, onClose, onRefresh, api }) {
  const [form, setForm] = React.useState({ notes: "", worker_id: "", subtotal: "", description: "" });
  const details = React.useMemo(() => detailsFor(job || {}), [job]);
  const jobId = idOf(job || {});

  React.useEffect(() => {
    if (!job) return;
    setForm({
      notes: first(job?.notes, job?.description, ""),
      worker_id: first(job?.assigned_worker_id, job?.worker_id, ""),
      subtotal: first(job?.price, job?.total, job?.amount, job?.fixed_price, ""),
      description: first(job?.invoice_description, job?.description, job?.notes, `${titleOf(job)} completed`),
    });
  }, [job]);

  if (!job) return null;

  async function run(label, fn) {
    try {
      const res = await fn();
      if (res?.success === false) throw new Error(res?.error || `${label} failed`);
      toast.success(label);
      await onRefresh();
      onClose();
    } catch (error) {
      toast.error(error?.message || `${label} failed`);
    }
  }

  const cancelled = rawStatus(job).includes("cancel");
  const timerRunning = isTimerRunning(job);
  const canStartTimer = jobId && !isDone(job) && !timerRunning && !cancelled;
  const canPauseTimer = jobId && !isDone(job) && timerRunning && !cancelled;
  const canResumeTimer = jobId && !isDone(job) && !timerRunning && (rawStatus(job).includes("progress") || rawStatus(job).includes("pause") || Number(job?.total_time_seconds || 0) > 0) && !cancelled;
  const canComplete = jobId && !isDone(job) && !cancelled;
  const canInvoice = jobId && isDone(job) && !hasInvoice;
  const hasWorkerChoice = workers.length > 0;

  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
    <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
      <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
        <div>
          <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Job action slip</div>
          <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{titleOf(job)}</h2>
          <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{clientOf(job)} · {workerOf(job)} · {statusOf(job)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
      </header>

      <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this exact job</div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Job notes" value={form.notes} onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))} />
            {hasWorkerChoice ? <Field label="Assign worker"><select value={form.worker_id || ""} onChange={(event) => setForm((prev) => ({ ...prev, worker_id: event.target.value }))} className="rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm font-bold text-white outline-none focus:border-amber-300"><option value="">Choose worker</option>{workers.map((worker) => <option key={idOf(worker)} value={idOf(worker)}>{first(worker?.name, worker?.email, "Unnamed worker")}</option>)}</select></Field> : <DetailRow label="Team" value="Add workers in Team before assigning" />}
            <Field label="Invoice amount" value={form.subtotal} onChange={(value) => setForm((prev) => ({ ...prev, subtotal: value }))} />
            <Field label="Invoice description" value={form.description} onChange={(value) => setForm((prev) => ({ ...prev, description: value }))} />
          </div>
        </section>

        <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Real job actions</div>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">These buttons call real job, timer and invoice endpoints. Start/Pause/Resume now uses the timer system, not a fake status-only action.</p>
          <div className="mt-5 grid gap-3">
            <button type="button" disabled={busy || !jobId} onClick={() => run("Job notes saved", () => api.patch(`/jobs/${jobId}`, { notes: form.notes }))} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10 disabled:opacity-50">Save notes</button>
            <button type="button" disabled={busy || !jobId || !form.worker_id} onClick={() => run("Worker assigned", () => api.post(`/jobs/${jobId}/assign`, { worker_id: form.worker_id }))} className="rounded-2xl bg-cyan-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Assign worker</button>
            <button type="button" disabled={busy || !canStartTimer} onClick={() => run("Job timer started", () => api.post(`/jobs/${jobId}/timer/start`, {}))} className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Start timer</button>
            <button type="button" disabled={busy || !canPauseTimer} onClick={() => run("Job timer paused", () => api.post(`/jobs/${jobId}/timer/pause`, {}))} className="rounded-2xl bg-orange-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Pause timer</button>
            <button type="button" disabled={busy || !canResumeTimer} onClick={() => run("Job timer resumed", () => api.post(`/jobs/${jobId}/timer/resume`, {}))} className="rounded-2xl bg-cyan-200 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Resume timer</button>
            <button type="button" disabled={busy || !canComplete} onClick={() => run("Job completed", () => api.post(`/jobs/${jobId}/complete`, {}))} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Complete job</button>
            <button type="button" disabled={busy || !canInvoice || !numberValue(form.subtotal)} onClick={() => run("Draft invoice created", () => api.post("/invoices", { job_id: jobId, customer_name: clientOf(job), customer_email: first(job?.customer_email, job?.client_email, job?.email), address: first(job?.address, job?.site_address, ""), description: form.description || `${titleOf(job)} completed`, subtotal: numberValue(form.subtotal) }))} className="rounded-2xl bg-orange-400 px-5 py-4 text-sm font-black text-slate-950 disabled:opacity-50">Create draft invoice</button>
            {hasInvoice ? <div className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">This job already has an invoice linked.</div> : null}
            {jobId ? <Link to={`/jobs/${jobId}/edit`} onClick={onClose} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center text-sm font-black text-white no-underline">Edit job record</Link> : null}
            {jobId ? <Link to={`/jobs/${jobId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full job page</Link> : null}
            <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to jobs</button>
          </div>
        </aside>
      </div>
    </div>
  </div>;
}

function JobRow({ job, onOpen }) {
  return <button type="button" onClick={() => onOpen(job)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><SecurityTape color={isDone(job) ? "#34d399" : isActive(job) ? "#22d3ee" : isUnassigned(job) ? "#fb923c" : "#facc15"} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{titleOf(job)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{clientOf(job)} · {workerOf(job)} · {first(job?.address, job?.site_address, "No address saved")}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(job)}`}>{statusOf(job)}</span></div></button>;
}

export default function JobsCommandPage() {
  const api = useApi();
  const { get } = api;
  const [jobs, setJobs] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [invoices, setInvoices] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [selectedJob, setSelectedJob] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, workersRes, invoicesRes] = await Promise.allSettled([get("/jobs"), get("/team/workers"), get("/invoices")]);
      setJobs(jobsRes.status === "fulfilled" ? listFrom(jobsRes.value, ["jobs"]) : []);
      setWorkers(workersRes.status === "fulfilled" ? listFrom(workersRes.value, ["workers", "team", "users"]) : []);
      setInvoices(invoicesRes.status === "fulfilled" ? listFrom(invoicesRes.value, ["invoices"]) : []);
    } catch (error) {
      console.warn("Jobs page load failed", error);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  async function refreshFromSlip() {
    setBusy(true);
    try { await load(); } finally { setBusy(false); }
  }

  const openJobs = jobs.filter((job) => !isDone(job) && !rawStatus(job).includes("cancel"));
  const activeJobs = jobs.filter(isActive);
  const unassignedJobs = jobs.filter(isUnassigned);
  const completedJobs = jobs.filter(isDone);

  return <main className={industrialPageShell} data-industrial-simple-page="jobs" data-command-canvas>
    <section className={`${industrialContentLane} space-y-5`}>
      <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}>
        <SecurityTape color="#fb923c" />
        <span className={industrialChip}>Jobs</span>
        <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Jobs that need doing, assigning, or invoicing.</h1>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a job to open a real action slip. Assign, start, pause, resume, complete, save notes, or create a draft invoice from the slip.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/jobs/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Create job</Link>
          <button type="button" onClick={load} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Refresh jobs</button>
          <Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open" value={openJobs.length} text="Jobs still moving through the business." color="#facc15" />
        <MetricCard label="Active" value={activeJobs.length} text="Jobs currently started or in progress." color="#22d3ee" />
        <MetricCard label="Unassigned" value={unassignedJobs.length} text="Jobs needing a worker assigned." color="#fb923c" />
        <MetricCard label="Completed" value={completedJobs.length} text="Finished jobs ready for review or invoice." color="#34d399" />
      </section>

      <section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Job list</div>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a job to review it</h2>
          </div>
          {loading ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">Loading…</span> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{jobs.length} jobs</span>}
        </div>
        {jobs.length ? <div className="grid gap-3">{jobs.map((job, index) => <JobRow key={idOf(job) || `${titleOf(job)}-${index}`} job={job} onOpen={setSelectedJob} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No jobs showing yet.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Create the first job and Churvox will start showing assignment, timer, invoice and approval slips here.</p><Link to="/jobs/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Create job</Link></div>}
      </section>
    </section>
    <JobSlip job={selectedJob} workers={workers} hasInvoice={selectedJob ? hasInvoiceForJob(selectedJob, invoices) : false} busy={busy} onClose={() => setSelectedJob(null)} onRefresh={refreshFromSlip} api={api} />
  </main>;
}
