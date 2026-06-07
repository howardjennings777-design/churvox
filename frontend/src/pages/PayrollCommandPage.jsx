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

function first(...values) { return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || ""; }
function listFrom(res, keys = []) {
  const data = res?.data ?? res;
  if (Array.isArray(data)) return data;
  for (const key of [...keys, "workers", "team", "users", "jobs", "items", "results", "data"]) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
function normId(value) { if (!value) return ""; if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || ""); const text = String(value || ""); return text === "[object Object]" ? "" : text; }
function idOf(item) { return normId(item?.id || item?._id || item?.user_id || item?.worker_id || item?.employee_id || item?.job_id || ""); }
function nameOf(worker) { return first(worker?.name, worker?.full_name, worker?.display_name, worker?.email, "Team member"); }
function emailOf(worker) { return first(worker?.email, worker?.email_address, "No email saved"); }
function roleOf(worker) { return String(first(worker?.role, worker?.account_type, worker?.user_role, "worker")).replaceAll("_", " "); }
function isPayrollVisible(worker) { const role = roleOf(worker).toLowerCase(); return role.includes("worker") || role.includes("manager") || role.includes("payroll"); }
function payRate(worker) { return Number(first(worker?.pay_rate, worker?.hourly_rate, worker?.rate, 0)) || 0; }
function jobWorkerId(job) { return normId(first(job?.assigned_worker_id, job?.worker_id, job?.assigned_to_id, "")); }
function jobWorkerName(job) { return String(first(job?.assigned_worker_name, job?.worker_name, job?.assignee_name, job?.assigned_to_name, job?.assigned_to, "")).toLowerCase(); }
function jobTitle(job) { return first(job?.title, job?.job_title, job?.job_name, job?.service_type, "Untitled job"); }
function rawJobStatus(job) { return String(first(job?.status, job?.job_status, "")).toLowerCase(); }
function isCompletedJob(job) { const s = rawJobStatus(job); return s.includes("complete") || s.includes("done") || Boolean(job?.completed_at); }
function isCancelledJob(job) { return rawJobStatus(job).includes("cancel"); }
function timeSeconds(job) { return Number(first(job?.net_time_seconds, job?.worked_time_seconds, job?.total_worked_seconds, job?.total_time_seconds, job?.duration_seconds, 0)) || 0; }
function timeHours(job) { const seconds = timeSeconds(job); return seconds > 0 ? seconds / 3600 : Number(first(job?.hours, job?.time_hours, 0)) || 0; }
function jobsForWorker(worker, jobs) { const wid = idOf(worker); const name = nameOf(worker).toLowerCase(); return jobs.filter((job) => (wid && jobWorkerId(job) === wid) || (name && jobWorkerName(job) === name)); }
function approvedHours(worker, jobs = []) {
  const manual = Number(first(worker?.approved_hours, worker?.hours_approved, worker?.payroll_hours, 0)) || 0;
  const fromJobs = jobsForWorker(worker, jobs).filter((job) => isCompletedJob(job) && !isCancelledJob(job)).reduce((sum, job) => sum + timeHours(job), 0);
  return manual + fromJobs;
}
function pendingHours(worker, jobs = []) {
  const manual = Number(first(worker?.pending_hours, worker?.unapproved_hours, worker?.hours_pending, 0)) || 0;
  const fromJobs = jobsForWorker(worker, jobs).filter((job) => !isCompletedJob(job) && !isCancelledJob(job)).reduce((sum, job) => sum + timeHours(job), 0);
  return manual + fromJobs;
}
function grossPay(worker, jobs = []) { return approvedHours(worker, jobs) * payRate(worker); }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }) : "$0.00"; }
function hours(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toFixed(n % 1 ? 1 : 0) : "0"; }
function formatDate(value) { if (!value) return "Not set"; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }); }
function statusOf(worker, jobs, reviewed) { if (reviewed) return "Reviewed"; if (pendingHours(worker, jobs) > 0) return "Needs review"; if (approvedHours(worker, jobs) > 0) return "Ready for export"; return "No hours"; }
function statusClass(worker, jobs, reviewed) { if (reviewed) return "bg-emerald-300 text-slate-950"; if (pendingHours(worker, jobs) > 0) return "bg-amber-300 text-slate-950"; if (approvedHours(worker, jobs) > 0) return "bg-cyan-300 text-slate-950"; return "bg-slate-300 text-slate-950"; }
function Tape({ color = "#a78bfa" }) { return <span aria-hidden="true" className="absolute left-0 top-0 h-full w-2.5 rounded-l-[26px]" style={{ background: `linear-gradient(180deg, ${color}, #facc15)`, boxShadow: `0 0 18px ${color}66` }} />; }
function Metric({ label, value, text, color }) { return <article className="relative overflow-hidden rounded-[28px] border border-white/10 p-5 pl-7 text-white" style={tileStyle}><Tape color={color} /><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">{label}</div><div className="mt-3 text-4xl font-black tracking-[-0.07em] text-white">{value}</div><p className="mt-2 text-sm font-bold leading-6 text-slate-300">{text}</p></article>; }
function Detail({ label, value }) { return <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4"><div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-300">{label}</div><div className="mt-2 break-words text-sm font-black leading-6 text-white">{String(value || "Not saved")}</div></div>; }

function exportCsv(rows, jobs = [], reviewedIds = {}) {
  const header = ["Name", "Email", "Role", "Approved Hours", "Pending Hours", "Pay Rate", "Gross Estimate", "Completed Jobs", "Open Jobs", "Review Status"];
  const body = rows.map((worker) => {
    const key = idOf(worker) || nameOf(worker);
    const related = jobsForWorker(worker, jobs);
    return [nameOf(worker), emailOf(worker), roleOf(worker), hours(approvedHours(worker, jobs)), hours(pendingHours(worker, jobs)), payRate(worker), grossPay(worker, jobs), related.filter(isCompletedJob).length, related.filter((job) => !isCompletedJob(job) && !isCancelledJob(job)).length, reviewedIds[key] ? "Reviewed" : statusOf(worker, jobs, false)];
  });
  const csv = [header, ...body].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `churvox-payroll-handoff-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function PayrollSlip({ worker, jobs, reviewed, onClose, onReview, onExportOne }) {
  if (!worker) return null;
  const relatedJobs = jobsForWorker(worker, jobs);
  const completedJobs = relatedJobs.filter((job) => isCompletedJob(job) && !isCancelledJob(job));
  const openJobs = relatedJobs.filter((job) => !isCompletedJob(job) && !isCancelledJob(job));
  return <div className="fixed inset-0 z-[2147483600] overflow-y-auto bg-slate-950/92 p-3 text-white backdrop-blur-xl md:p-6" role="dialog" aria-modal="true"><div className="mx-auto flex min-h-[calc(100vh-24px)] max-w-6xl flex-col overflow-hidden rounded-[34px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-2xl md:min-h-[calc(100vh-48px)]"><header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-7"><div><div className="inline-flex rounded-full bg-amber-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Payroll review slip</div><h2 className="mt-3 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white md:text-6xl">{nameOf(worker)}</h2><p className="mt-4 max-w-3xl text-sm font-bold leading-6 text-slate-300 md:text-base">{roleOf(worker)} · {emailOf(worker)} · {statusOf(worker, jobs, reviewed)}</p></div><button type="button" onClick={onClose} className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950">Close</button></header><div className="grid flex-1 gap-5 p-5 md:grid-cols-[1.15fr_.85fr] md:p-7"><section className="space-y-5"><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Review pay summary</div><div className="mt-4 grid gap-3 md:grid-cols-2"><Detail label="Approved hours" value={`${hours(approvedHours(worker, jobs))}h`} /><Detail label="Pending hours" value={`${hours(pendingHours(worker, jobs))}h`} /><Detail label="Pay rate" value={payRate(worker) ? money(payRate(worker)) : "Not set"} /><Detail label="Gross estimate" value={money(grossPay(worker, jobs))} /><Detail label="Completed jobs" value={completedJobs.length} /><Detail label="Open jobs" value={openJobs.length} /></div></section><section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Job time source</div><div className="mt-4 grid gap-3">{relatedJobs.length ? relatedJobs.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/jobs/${idOf(job)}`} onClick={onClose} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm font-black text-white no-underline"><span>{jobTitle(job)}</span><div className="mt-1 text-xs font-bold text-slate-300">{isCompletedJob(job) ? "Completed" : "Open"} · {hours(timeHours(job))}h · {formatDate(first(job.completed_at, job.scheduled_date, job.created_at))}</div></Link>) : <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-sm font-black text-slate-300">No job time found for this worker yet.</div>}</div></section><section className="rounded-[28px] border border-amber-300/25 bg-amber-300/10 p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">Safety scope</div><p className="mt-2 text-sm font-bold leading-6 text-amber-50">This is a payroll handoff workspace only. Churvox does not submit taxes, create bank payout files, file government returns, or make compliance decisions.</p></section></section><aside className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5"><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">Payroll action</div><p className="mt-3 text-sm font-bold leading-6 text-slate-300">Review confirms the summary has been checked for export. It does not process pay.</p>{reviewed ? <div className="mt-4 rounded-3xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-black text-emerald-100">Reviewed. Ready for CSV handoff.</div> : null}<div className="mt-5 grid gap-3"><button type="button" onClick={onReview} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-slate-950">Mark summary reviewed</button><button type="button" onClick={onExportOne} className="rounded-2xl bg-amber-300 px-5 py-4 text-sm font-black text-slate-950">Export this worker CSV</button><Link to="/team-board" onClick={onClose} className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 no-underline">Open team record</Link><button type="button" onClick={onClose} className="rounded-2xl bg-white/10 px-5 py-4 text-sm font-black text-white ring-1 ring-white/10">Back to payroll</button></div></aside></div></div></div>;
}

function PayrollRow({ worker, jobs, reviewed, onOpen }) {
  const tape = reviewed ? "#34d399" : pendingHours(worker, jobs) > 0 ? "#facc15" : approvedHours(worker, jobs) > 0 ? "#22d3ee" : "#a78bfa";
  return <button type="button" onClick={() => onOpen(worker)} className="relative w-full overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.06] p-4 pl-7 text-left text-white transition hover:border-cyan-300/40 hover:bg-white/[0.09] active:scale-[0.99]"><Tape color={tape} /><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xl font-black tracking-[-0.05em] text-white">{nameOf(worker)}</h3><p className="mt-1 line-clamp-1 text-sm font-bold leading-6 text-slate-300">{hours(approvedHours(worker, jobs))}h approved · {hours(pendingHours(worker, jobs))}h pending · {money(grossPay(worker, jobs))}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${statusClass(worker, jobs, reviewed)}`}>{statusOf(worker, jobs, reviewed)}</span></div></button>;
}

export default function PayrollCommandPage() {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedWorker, setSelectedWorker] = React.useState(null);
  const [reviewedIds, setReviewedIds] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem("churvox_payroll_reviewed") || "{}"); } catch { return {}; }
  });

  React.useEffect(() => {
    let alive = true;
    async function loadPayroll() {
      try {
        setLoading(true);
        const [workerRes, jobRes] = await Promise.allSettled([get("/team/workers"), get("/jobs")]);
        if (!alive) return;
        setWorkers(workerRes.status === "fulfilled" ? listFrom(workerRes.value, ["workers", "team", "users"]).filter(isPayrollVisible) : []);
        setJobs(jobRes.status === "fulfilled" ? listFrom(jobRes.value, ["jobs", "items", "results"]) : []);
      } catch (error) {
        console.warn("Payroll page load failed", error);
        if (alive) { setWorkers([]); setJobs([]); }
      } finally {
        if (alive) setLoading(false);
      }
    }
    loadPayroll();
    return () => { alive = false; };
  }, [get]);

  function markReviewed(worker) {
    const key = idOf(worker) || nameOf(worker);
    const next = { ...reviewedIds, [key]: true };
    setReviewedIds(next);
    localStorage.setItem("churvox_payroll_reviewed", JSON.stringify(next));
    toast.success("Payroll summary marked reviewed");
  }

  const approved = workers.reduce((sum, worker) => sum + approvedHours(worker, jobs), 0);
  const pending = workers.reduce((sum, worker) => sum + pendingHours(worker, jobs), 0);
  const gross = workers.reduce((sum, worker) => sum + grossPay(worker, jobs), 0);
  const review = workers.filter((worker) => pendingHours(worker, jobs) > 0 && !reviewedIds[idOf(worker) || nameOf(worker)]).length;
  const selectedId = selectedWorker ? idOf(selectedWorker) || nameOf(selectedWorker) : "current";

  return <main className={industrialPageShell} data-industrial-simple-page="payroll" data-command-canvas><section className={`${industrialContentLane} space-y-5`}><section className="relative overflow-hidden rounded-[30px] border border-white/10 p-5 pl-8 text-white md:p-7 md:pl-9" style={tileStyle}><Tape color="#a78bfa" /><span className={industrialChip}>Payroll</span><h1 className="mt-4 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.075em] text-white md:text-6xl">Review hours. Mark summaries. Export the handoff.</h1><p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-slate-300 md:text-base">Payroll reads workers and job time, then prepares a review/export handoff. It does not process pay, submit taxes, or create bank files.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => exportCsv(workers, jobs, reviewedIds)} className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialAction}`}>Export payroll CSV</button><Link to="/team-board" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Team</Link><Link to="/dispatch-board" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Dispatch</Link><Link to="/dashboard" className={`rounded-2xl px-5 py-3 text-sm font-black ${industrialGhost}`}>Command Board</Link></div></section><section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Metric label="Need review" value={loading ? "…" : review} text="People with pending job time or hours to check." color="#facc15" /><Metric label="Approved" value={`${hours(approved)}h`} text="Completed-job/manual hours ready for handoff." color="#34d399" /><Metric label="Pending" value={`${hours(pending)}h`} text="Open-job/manual hours to check." color="#fb923c" /><Metric label="Gross estimate" value={money(gross)} text="Gross estimate only, before payroll processing." color="#a78bfa" /></section><section className="rounded-[30px] border border-white/10 p-5 text-white md:p-6" style={tileStyle}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Payroll review list</div><h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white">Tap a person to review pay</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-slate-300">{loading ? "Loading…" : `${workers.length} people`}</span></div>{workers.length ? <div className="grid gap-3">{workers.map((worker, index) => <PayrollRow key={idOf(worker) || `${nameOf(worker)}-${index}`} worker={worker} jobs={jobs} reviewed={Boolean(reviewedIds[idOf(worker) || nameOf(worker)])} onOpen={setSelectedWorker} />)}</div> : <div className="rounded-[26px] border border-white/10 bg-white/[0.06] p-5"><h3 className="text-2xl font-black tracking-[-0.05em] text-white">No payroll people showing yet.</h3><p className="mt-2 text-sm font-bold leading-6 text-slate-300">Add workers and complete timed jobs. Payroll review slips will appear here from real team and job-time data.</p></div>}</section></section><PayrollSlip worker={selectedWorker} jobs={jobs} reviewed={Boolean(reviewedIds[selectedId])} onClose={() => setSelectedWorker(null)} onReview={() => selectedWorker && markReviewed(selectedWorker)} onExportOne={() => selectedWorker && exportCsv([selectedWorker], jobs, reviewedIds)} /></main>;
}
