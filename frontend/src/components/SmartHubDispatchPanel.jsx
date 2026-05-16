// PHASE_177_HIDE_DISPATCH_WORDING_BEHIND_AI_CREW_ASSIGNMENT
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, MapPin, PlusCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { safeArray, safeText } from "../utils/safeRender";

const statusTone = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  busy: "bg-sky-50 text-sky-700 border-sky-200",
  none: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function SmartHubAssign crewPanel({ canManageAssign crew = false, onAssigned }) {
  const { get, post } = useApi();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [pendingAssign, setPendingAssign] = useState({});
  const [savingJobId, setSavingJobId] = useState("");

  const loadAssign crewData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, workersRes] = await Promise.all([get("/jobs"), get("/team/workers")]);
      setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
      setWorkers(safeArray(workersRes?.success ? workersRes.data : []).filter((w) => String(w.role || "worker") === "worker"));
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { loadAssign crewData(); }, [loadAssign crewData]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const unassignedJobs = useMemo(() => jobs.filter((j) => !j.assigned_worker_id), [jobs]);
  const todayJobs = useMemo(() => jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey), [jobs, todayKey]);

  const workerStats = useMemo(() => workers.map((worker) => {
    const assignedToday = todayJobs.filter((job) => String(job.assigned_worker_id || "") === String(worker.id));
    return {
      worker,
      assignedTodayCount: assignedToday.length,
      status: assignedToday.length === 0 ? "none" : (assignedToday.length >= 3 ? "busy" : "available"),
      label: assignedToday.length === 0 ? "No jobs today" : (assignedToday.length >= 3 ? "Busy" : "Available"),
    };
  }), [workers, todayJobs]);

  const hasScheduleConflict = useCallback((job, workerId) => {
    const slotDate = String(job?.scheduled_date || "").slice(0, 10);
    const slotTime = String(job?.scheduled_time || "").trim();
    if (!slotDate || !slotTime) return false;
    return todayJobs.some((scheduled) => (
      String(scheduled.assigned_worker_id || "") === String(workerId)
      && String(scheduled.scheduled_date || "").slice(0, 10) === slotDate
      && String(scheduled.scheduled_time || "").trim() === slotTime
      && String(scheduled.id) !== String(job.id)
    ));
  }, [todayJobs]);

  const onAssign = async (job) => {
    const jobId = job.id;
    const workerId = pendingAssign[jobId] || "";
    if (!workerId) {
      toast.error("Select worker");
      return;
    }
    if (hasScheduleConflict(job, workerId)) {
      toast.warning("This worker may already have work scheduled around this time.");
    }
    setSavingJobId(String(jobId));
    const res = await post(`/jobs/${jobId}/assign`, { worker_id: workerId });
    setSavingJobId("");
    if (res?.success) {
      toast.success("Worker assigned");
      await loadAssign crewData();
      if (onAssigned) onAssigned();
      return;
    }
    toast.error(safeText(res?.error, "Failed to assign worker"));
  };

  if (loading) return <div className="rounded-2xl border border-[#d8e3f3] bg-white p-5 text-sm text-[#5b6c87]">Loading dispatch board…</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#0d1b34]">Unassigned jobs</h3><span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#35518a]">{unassignedJobs.length}</span></div>
          <div className="mt-3 space-y-3">
            {unassignedJobs.length === 0 ? <p className="text-sm text-[#5b6c87]">All jobs assigned. Nice work.</p> : unassignedJobs.map((job) => {
              const conflict = pendingAssign[job.id] ? hasScheduleConflict(job, pendingAssign[job.id]) : false;
              return (
                <article key={job.id} className="rounded-xl border border-[#e4ecf7] bg-[#f8fbff] p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-[#0d1b34]">{safeText(job.title, "Untitled job")}</p><span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">Unassigned</span></div>
                  <p className="text-xs text-[#5b6c87]">{safeText(job.client_name || job.customer_name, "No client")}</p>
                  <p className="text-xs text-[#5b6c87] inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{safeText(job.address || job.region, "No address")}</p>
                  <p className="text-xs text-[#5b6c87] inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{String(job.scheduled_date || "").slice(0, 10) || "No date"} {safeText(job.scheduled_time, "")}</p>
                  {conflict ? <p className="text-xs text-amber-700 inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />This worker may already have work scheduled around this time.</p> : null}
                  {canManageAssign crew ? <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><select className="px-input w-full min-w-0 text-sm" value={pendingAssign[job.id] || ""} onChange={(e) => setPendingAssign((prev) => ({ ...prev, [job.id]: e.target.value }))}><option value="">Select worker</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select><button type="button" disabled={savingJobId === String(job.id)} onClick={() => onAssign(job)} className="rounded-lg bg-[#155EEF] text-white px-3 h-10 text-sm font-semibold disabled:opacity-60 w-full sm:w-auto">{savingJobId === String(job.id) ? "Assigning…" : "Assign"}</button></div> : <p className="text-xs text-[#5b6c87]">Assign crew assignment requires owner/admin access.</p>}
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#0d1b34]">Today’s scheduled work</h3><span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#35518a]">{todayJobs.length}</span></div>
          <div className="mt-3 space-y-2">
            {todayJobs.length === 0 ? <div className="rounded-xl border border-dashed border-[#d8e3f3] bg-[#f8fbff] p-6 text-center"><CalendarClock className="h-8 w-8 mx-auto text-[#94a3b8]" /><p className="mt-2 text-sm font-semibold text-[#0d1b34]">No jobs scheduled today</p><p className="text-xs text-[#5b6c87] mt-1">Create a job or assign existing work to build today’s run sheet.</p><div className="mt-3 flex flex-wrap justify-center gap-2"><Link to="/jobs/new" className="rounded-lg bg-[#155EEF] text-white px-3 py-2 text-xs font-semibold">New job</Link><Link to="/dispatch" className="rounded-lg border border-[#d8e3f3] bg-white px-3 py-2 text-xs font-semibold text-[#35518a]">Open dispatch</Link></div></div> : todayJobs.map((job) => {
              const worker = workers.find((w) => String(w.id) === String(job.assigned_worker_id));
              return <div key={job.id} className="rounded-xl border border-[#e4ecf7] p-3 bg-[#f8fbff]"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-[#0d1b34]">{safeText(job.title, "Untitled job")}</p><p className="text-xs text-[#5b6c87]">{safeText(job.client_name || job.customer_name, "No client")}</p></div><span className="rounded-full border border-[#d9e4f6] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#35518a]">{safeText(job.status, "scheduled")}</span></div><p className="mt-2 text-xs text-[#5b6c87]">{safeText(job.scheduled_time, "No time")} • {safeText(worker?.name, "Unassigned")}</p><Link to={`/jobs/${job.id}`} className="mt-2 inline-flex rounded-md border border-[#d8e3f3] bg-white px-2.5 py-1 text-xs font-semibold text-[#35518a]">Open</Link></div>;
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5">
          <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-[#0d1b34] inline-flex items-center gap-1"><Users className="h-4 w-4" />Crew availability</h3><span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#35518a]">{workerStats.length}</span></div>
          <div className="mt-3 space-y-2">
            {workerStats.length === 0 ? <p className="text-sm text-[#5b6c87]">No workers found</p> : workerStats.map((row) => <div key={row.worker.id} className="rounded-xl border border-[#e4ecf7] p-3 bg-[#f8fbff]"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-medium text-[#0d1b34]">{safeText(row.worker.name, "Unnamed worker")}</p><p className="text-xs text-[#5b6c87]">{safeText(row.worker.role, "Worker")} • {safeText(row.worker.region, "No region")}</p></div><span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusTone[row.status]}`}>{row.label}</span></div><p className="text-xs text-[#5b6c87] mt-2">Assigned jobs today: {row.assignedTodayCount}</p><Link to="/dispatch" className="mt-2 inline-flex rounded-md border border-[#d8e3f3] bg-white px-2.5 py-1 text-xs font-semibold text-[#35518a]">Assign work</Link></div>)}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 rounded-xl border border-[#d8e3f3] bg-white/95 backdrop-blur px-3 py-2 flex items-center justify-between gap-2">
        <p className="text-xs text-[#5b6c87]">Keep dispatch balanced by assigning unclaimed jobs and checking worker load.</p>
        <Link to="/dispatch" className="text-xs font-semibold text-[#35518a] inline-flex items-center gap-1"><PlusCircle className="h-3.5 w-3.5" />Open full dispatch board</Link>
      </div>
    </div>
  );
}
