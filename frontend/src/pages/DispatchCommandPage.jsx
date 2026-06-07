import React from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { industrialAction, industrialChip, industrialContentLane, industrialGhost, industrialPageShell } from "../components/industrialCommandTheme";

const tileStyle = {
  background: "linear-gradient(135deg, #111827, #070d16)",
  color: "#ffffff",
  boxShadow: "0 18px 46px rgba(2,6,23,.26), inset 0 1px 0 rgba(255,255,255,.06)",
};

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function listFrom(res, keys) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function idOf(item) { const raw = item?.id || item?._id || item?.job_id || item?.worker_id || item?.user_id || ""; return typeof raw === "object" && raw?.$oid ? raw.$oid : String(raw || ""); }
function jobTitle(job) { return first(job?.title, job?.job_title, job?.job_name, job?.service_type, "Untitled job"); }
function clientName(job) { return first(job?.client_name, job?.customer_name, job?.client?.name, "No client saved"); }
function workerName(worker) { return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Unnamed worker"); }
function assignedWorker(job) { return first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assignedWorkerName, "Unassigned"); }
function statusOf(item) { return String(first(item?.status, item?.job_status, item?.availability, "ready")).replaceAll("_", " "); }
function rawStatus(item) { return statusOf(item).toLowerCase(); }
function isDone(job) { const s = rawStatus(job); return s.includes("complete") || s.includes("finished") || s.includes("done"); }
function isActiveJob(job) { const s = rawStatus(job); return s.includes("progress") || s.includes("start") || s.includes("active") || s.includes("timer"); }
function isUnassigned(job) { const worker = assignedWorker(job); const s = rawStatus(job); return worker === "Unassigned" && !isDone(job) && !s.includes("cancel"); }
function isFieldWorker(worker) { const role = String(first(worker?.role, worker?.account_type, "worker")).toLowerCase(); return role.includes("worker") || role.includes("field") || role.includes("manager"); }
function workerLoad(worker) { return Number(first(worker?.assigned_jobs_count, worker?.jobs_count, worker?.open_jobs, worker?.active_jobs, 0)) || 0; }
function scheduleKey(job) { return first(job?.scheduled_at, job?.scheduled_date, job?.date, job?.start_time, job?.scheduled_time, "unscheduled"); }
function formatDate(value) { if (!value) return "Not set"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); }
function recommendWorker(job, workers) {
  const region = String(first(job?.region, job?.area, job?.suburb, "")).toLowerCase();
  const field = workers.filter(isFieldWorker);
  const sorted = [...field].sort((a, b) => {
    const aRegion = String(first(a?.region, a?.area, a?.suburb, "")).toLowerCase() === region ? -2 : 0;
    const bRegion = String(first(b?.region, b?.area, b?.suburb, "")).toLowerCase() === region ? -2 : 0;
    return (aRegion + workerLoad(a)) - (bRegion + workerLoad(b));
  });
  return sorted[0] || null;
}
function conflictCount(jobs) {
  const seen = new Map();
  jobs.forEach((job) => {
    const worker = assignedWorker(job);
    if (worker === "Unassigned" || isDone(job)) return;
    const key = `${worker}::${scheduleKey(job)}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  return [...seen.values()].filter((count) => count > 1).length;
}
function statusClass(job) {
  const s = rawStatus(job);
  if (isDone(job)) return "bg-emerald-300 text-slate-950";
  if (s.includes("progress") || s.includes("start") || s.includes("active")) return "bg-cyan-300 text-slate-950";
  if (s.includes("pause")) return "bg-amber-300 text-slate-950";
  if (s.includes("cancel")) return "bg-red-300 text-slate-950";
  if (isUnassigned(job)) return "bg-orange-300 text-slate-950";
  return "bg-slate-200 text-slate-950";
}
function Tape({ color = "#22d3ee" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 18px ${color}66` }} />; }
function Metric({ label, value, text, color }) { return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><Tape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function Detail({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>; }

function DispatchSlip({ item, onClose, approved, onApprove }) {
  if (!item?.job) return null;
  const { job, worker } = item;
  const jobId = idOf(job);
  return (
    <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Crew Dispatch slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{jobTitle(job)}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{clientName(job)} · {assignedWorker(job)} · {statusOf(job)}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header>
        <div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7">
          <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Dispatch review</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Detail label="Client" value={clientName(job)} /><Detail label="Status" value={statusOf(job)} /><Detail label="Current worker" value={assignedWorker(job)} /><Detail label="Recommended worker" value={worker ? workerName(worker) : "No match yet"} /><Detail label="Scheduled" value={formatDate(scheduleKey(job))} /><Detail label="Address" value={first(job?.address, job?.site_address, job?.job_address, "Not saved")} /></div></section>
          <aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Owner action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review workload, area and schedule before assigning. This page does not auto-assign or live-track crew.</p>{approved ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Approved. This dispatch slip is marked reviewed.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onApprove} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Approve slip</button>{jobId ? <Link to={`/jobs/${jobId}`} onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open full job page</Link> : null}<button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to Crew Dispatch</button></div></aside>
        </div>
      </div>
    </div>
  );
}
function JobRow({ job, workers, onOpen }) {
  const worker = isUnassigned(job) ? recommendWorker(job, workers) : null;
  const tape = isUnassigned(job) ? "#fb923c" : isActiveJob(job) ? "#22d3ee" : isDone(job) ? "#34d399" : "#facc15";
  return <button type="button" onClick={() => onOpen({ job, worker })} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><Tape color={tape} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{jobTitle(job)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{clientName(job)} · {assignedWorker(job)} · {first(job?.address, job?.site_address, job?.job_address, "No address saved")}</p>{worker ? <p className="mt-2 text-xs font-black text-cyan-200">Suggested: {workerName(worker)} · {first(worker?.region, worker?.area, "area not set")}</p> : null}</div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(job)}`}>{statusOf(job)}</span></div></button>;
}
function WorkerRow({ worker }) { const busy = workerLoad(worker) > 0 || rawStatus(worker).includes("busy"); return <div className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-white"><Tape color={busy ? "#facc15" : "#34d399"} /><div className="text-lg font-black tracking-[-0.04em] text-white">{workerName(worker)}</div><div className="mt-1 text-sm font-bold text-slate-300">{first(worker?.region, worker?.area, "No area set")} · {busy ? `${workerLoad(worker)} open jobs` : "available"}</div></div>; }

export default function DispatchCommandPage() {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [workers, setWorkers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activeSlip, setActiveSlip] = React.useState(null);
  const [approved, setApproved] = React.useState({});
  React.useEffect(() => { let alive = true; async function load() { try { setLoading(true); const [jobRes, workerRes] = await Promise.allSettled([get("/jobs"), get("/team/workers")]); if (!alive) return; setJobs(jobRes.status === "fulfilled" ? listFrom(jobRes.value, ["jobs", "items", "results", "data"]) : []); setWorkers(workerRes.status === "fulfilled" ? listFrom(workerRes.value, ["workers", "team", "users", "items", "results", "data"]) : []); } finally { if (alive) setLoading(false); } } load(); return () => { alive = false; }; }, [get]);
  const activeJobs = jobs.filter(isActiveJob);
  const unassignedJobs = jobs.filter(isUnassigned);
  const fieldWorkers = workers.filter(isFieldWorker);
  const conflicts = conflictCount(jobs);
  const slipId = activeSlip?.job ? idOf(activeSlip.job) || jobTitle(activeSlip.job) : "current";
  const mainJobs = [...unassignedJobs, ...activeJobs, ...jobs.filter((job) => !isUnassigned(job) && !isActiveJob(job) && !isDone(job))].slice(0, 16);
  return (
    <main className={industrialPageShell} data-industrial-simple-page="crew-dispatch" data-command-canvas>
      <section className={`${industrialContentLane} space-y-5`}>
        <section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><Tape color="#22d3ee" /><span className={industrialChip}>Crew Dispatch</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Dispatch jobs, crew and assignments without live tracking.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">See active jobs, unassigned work, crew capacity and schedule warnings. Tap a job to review the dispatch slip first.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/jobs/new" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Create job</Link><Link to="/team" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Team</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Active jobs" value={loading ? "…" : activeJobs.length} text="Jobs started or in progress." color="#22d3ee" /><Metric label="Unassigned" value={loading ? "…" : unassignedJobs.length} text="Jobs needing a worker." color="#fb923c" /><Metric label="Field crew" value={loading ? "…" : fieldWorkers.length} text="People available for dispatch view." color="#34d399" /><Metric label="Conflicts" value={loading ? "…" : conflicts} text="Possible same-time worker clashes." color="#f43f5e" /></section>
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,.9fr)]"><section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Dispatch queue</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a job to review assignment</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{loading ? "Loading…" : `${mainJobs.length} showing`}</span></div>{mainJobs.length ? <div className="grid gap-3">{mainJobs.map((job, index) => <JobRow key={idOf(job) || `${jobTitle(job)}-${index}`} job={job} workers={workers} onOpen={setActiveSlip} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No dispatch work showing.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Create or schedule jobs and they will appear here for dispatch review.</p></div>}</section><aside className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Crew status</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Field crew</h2><div className="mt-5 grid gap-3">{fieldWorkers.length ? fieldWorkers.slice(0, 10).map((worker, index) => <WorkerRow key={idOf(worker) || `${workerName(worker)}-${index}`} worker={worker} />) : <div className="rounded-[22px] border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-slate-300">No field crew showing yet.</div>}</div></aside></section>
      </section>
      <DispatchSlip item={activeSlip} approved={Boolean(approved[slipId])} onClose={() => setActiveSlip(null)} onApprove={() => setApproved((prev) => ({ ...prev, [slipId]: true }))} />
    </main>
  );
}
