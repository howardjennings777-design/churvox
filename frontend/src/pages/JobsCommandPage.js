import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import {
  industrialAction,
  industrialChip,
  industrialContentLane,
  industrialGhost,
  industrialPageShell,
} from "../components/industrialCommandTheme";

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

function listFrom(res) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of ["jobs", "items", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(job) {
  const raw = job?.id || job?._id || job?.job_id || "";
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
  return status.includes("complete") || status.includes("finished") || status.includes("done");
}

function isActive(job) {
  const status = rawStatus(job);
  return status.includes("progress") || status.includes("start") || status.includes("active") || status.includes("timer");
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

function money(value) {
  const num = Number(value || 0);
  return Number.isFinite(num) && num > 0 ? `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "$0";
}

function statusClass(job) {
  const key = rawStatus(job);
  if (key.includes("complete")) return statusTone.completed;
  if (key.includes("progress") || key.includes("start")) return statusTone.in_progress;
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
    Address: first(job?.address, job?.site_address, job?.street_address, "Not saved"),
    Scheduled: formatDate(first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.job_date)),
    Pricing: money(first(job?.price, job?.total, job?.amount, job?.fixed_price, 0)),
    Notes: first(job?.notes, job?.description, job?.job_notes, "No notes saved"),
  };
}

function SecurityTape({ color = "#fb923c" }) {
  return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `repeating-linear-gradient(135deg, ${color} 0 10px, rgba(255,255,255,.30) 10px 15px, ${color} 15px 25px)`, boxShadow: `0 0 18px ${color}66` }} />;
}

function MetricCard({ label, value, text, color }) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}>
      <SecurityTape color={color} />
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p>
    </article>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div>
      <div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div>
    </div>
  );
}

function JobSlip({ job, mode, approved, onClose, onApprove, onMode }) {
  const [draft, setDraft] = React.useState("");
  const details = React.useMemo(() => detailsFor(job || {}), [job]);

  React.useEffect(() => {
    if (!job) return;
    const detailText = Object.entries(details).map(([key, value]) => `${key}: ${value}`).join("\n");
    setDraft(`${titleOf(job)}\n${detailText}`.trim());
  }, [job, details]);

  if (!job) return null;
  const jobId = idOf(job);
  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7">
          <div>
            <div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Job slip</div>
            <h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{titleOf(job)}</h2>
            <p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{clientOf(job)} · {workerOf(job)} · {statusOf(job)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button>
        </header>

        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review this exact job</div>
            {isEdit ? (
              <>
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="mt-4 min-h-[330px] w-full rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-sm font-bold leading-6 text-white outline-none" />
                <button type="button" onClick={() => onMode("details")} className="mt-4 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950">Save edit in slip</button>
              </>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(details).map(([label, value]) => <DetailRow key={label} label={label} value={value} />)}
              </div>
            )}
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div>
            <p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review the job here first. Approve or edit the slip, then open the full job page only when you need the full record editor.</p>
            {approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This job slip decision is recorded in this view.</div> : null}
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button>
              <button type="button" onClick={() => onMode("edit")} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Edit in slip</button>
              {jobId ? <Link to={`/jobs/${jobId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full job page</Link> : null}
              <button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to jobs</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function JobRow({ job, onOpen }) {
  return (
    <button type="button" onClick={() => onOpen(job)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]">
      <SecurityTape color={isDone(job) ? "#34d399" : isActive(job) ? "#22d3ee" : isUnassigned(job) ? "#fb923c" : "#facc15"} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{titleOf(job)}</h3>
          <p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{clientOf(job)} · {workerOf(job)} · {first(job?.address, job?.site_address, "No address saved")}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(job)}`}>{statusOf(job)}</span>
      </div>
    </button>
  );
}

export default function JobsCommandPage() {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedJob, setSelectedJob] = React.useState(null);
  const [mode, setMode] = React.useState("details");
  const [approvedIds, setApprovedIds] = React.useState({});

  React.useEffect(() => {
    let alive = true;
    async function loadJobs() {
      try {
        setLoading(true);
        const res = await get("/jobs");
        if (!alive) return;
        setJobs(listFrom(res));
      } catch (error) {
        console.warn("Jobs page load failed", error);
        if (alive) setJobs([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadJobs();
    return () => { alive = false; };
  }, [get]);

  const openJobs = jobs.filter((job) => !isDone(job) && !rawStatus(job).includes("cancel"));
  const activeJobs = jobs.filter(isActive);
  const unassignedJobs = jobs.filter(isUnassigned);
  const completedJobs = jobs.filter(isDone);
  const selectedId = selectedJob ? idOf(selectedJob) || titleOf(selectedJob) : "current";

  const openSlip = (job, nextMode = "details") => {
    setSelectedJob(job);
    setMode(nextMode);
  };

  return (
    <main className={industrialPageShell} data-industrial-simple-page="jobs" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}>
          <SecurityTape color="#fb923c" />
          <span className={industrialChip}>Jobs</span>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Jobs that need doing, assigning, or checking.</h1>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Tap a job to open its full-screen slip. Use the full job page only when you need the full record editor.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/jobs/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Create job</Link>
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

          {jobs.length ? (
            <div className="grid gap-3">
              {jobs.map((job, index) => <JobRow key={idOf(job) || `${titleOf(job)}-${index}`} job={job} onOpen={openSlip} />)}
            </div>
          ) : (
            <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5">
              <h3 className="text-2xl font-black tracking-[-0.05em] text-white">No jobs showing yet.</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-slate-300">Create the first job and Churvox will start showing assignment, timer, invoice and approval slips here.</p>
              <Link to="/jobs/new" className={`mt-4 inline-flex rounded-2xl px-5 py-3 text-sm font-black no-underline ${industrialAction}`}>Create job</Link>
            </div>
          )}
        </section>
      </section>

      <JobSlip
        job={selectedJob}
        mode={mode}
        approved={Boolean(approvedIds[selectedId])}
        onMode={setMode}
        onClose={() => setSelectedJob(null)}
        onApprove={() => setApprovedIds((prev) => ({ ...prev, [selectedId]: true }))}
      />
    </main>
  );
}
