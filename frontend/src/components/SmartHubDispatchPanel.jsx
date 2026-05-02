import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "../hooks/useApi";
import { safeArray, safeText } from "../utils/safeRender";

export default function SmartHubDispatchPanel({ canManageDispatch = false, onAssigned }) {
  const { get, post } = useApi();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [pendingAssign, setPendingAssign] = useState({});

  const loadDispatchData = useCallback(async () => {
    setLoading(true);
    try {
      const [jobsRes, workersRes] = await Promise.all([get("/jobs"), get("/team/workers")]);
      setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
      setWorkers(safeArray(workersRes?.success ? workersRes.data : []).filter((w) => String(w.role || "worker") === "worker"));
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { loadDispatchData(); }, [loadDispatchData]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const unassignedJobs = useMemo(() => jobs.filter((j) => !j.assigned_worker_id), [jobs]);
  const todayJobs = useMemo(() => jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) === todayKey), [jobs, todayKey]);

  const workerStats = useMemo(() => workers.map((worker) => {
    const assignedToday = todayJobs.filter((job) => String(job.assigned_worker_id || "") === String(worker.id));
    const busy = assignedToday.length >= 3;
    const slots = new Set();
    let hasConflict = false;
    assignedToday.forEach((job) => {
      const slot = `${String(job.scheduled_date || "").slice(0, 10)}-${String(job.scheduled_time || "").trim()}`;
      if (slot && slots.has(slot)) hasConflict = true;
      slots.add(slot);
    });
    return {
      worker,
      assignedTodayCount: assignedToday.length,
      status: hasConflict ? "Conflict" : (assignedToday.length === 0 ? "No jobs today" : (busy ? "Busy" : "Available")),
      hasConflict,
    };
  }), [workers, todayJobs]);

  const onAssign = async (jobId) => {
    const workerId = pendingAssign[jobId] || "";
    if (!workerId) {
      toast.error("Select a worker before assigning");
      return;
    }
    const res = await post(`/jobs/${jobId}/assign`, { worker_id: workerId });
    if (res?.success) {
      toast.success("Worker assigned");
      await loadDispatchData();
      if (onAssigned) onAssigned();
      return;
    }
    toast.error(safeText(res?.error, "Failed to assign worker"));
  };

  if (loading) return <div className="rounded-2xl border border-[#d8e3f3] bg-white p-5 text-sm text-[#5b6c87]">Loading dispatch board…</div>;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#0d1b34]">Unassigned jobs</h3>
        <div className="mt-3 space-y-3">
          {unassignedJobs.length === 0 ? <p className="text-sm text-[#5b6c87]">No unassigned jobs</p> : unassignedJobs.map((job) => (
            <article key={job.id} className="rounded-xl border border-[#e4ecf7] bg-[#f8fbff] p-3 space-y-2">
              <p className="text-sm font-semibold text-[#0d1b34]">{safeText(job.title, "Untitled job")}</p>
              <p className="text-xs text-[#5b6c87]">{safeText(job.client_name || job.customer_name, "No client")}</p>
              <p className="text-xs text-[#5b6c87] inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{safeText(job.address || job.region, "No address")}</p>
              <p className="text-xs text-[#5b6c87]">{String(job.scheduled_date || "").slice(0, 10) || "No date"} {safeText(job.scheduled_time, "")}</p>
              {canManageDispatch ? <div className="flex gap-2"><select className="px-input text-xs" value={pendingAssign[job.id] || ""} onChange={(e) => setPendingAssign((prev) => ({ ...prev, [job.id]: e.target.value }))}><option value="">Select worker</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select><button type="button" onClick={() => onAssign(job.id)} className="rounded-lg bg-[#155EEF] text-white px-3 text-xs font-semibold">Assign</button></div> : <p className="text-xs text-[#5b6c87]">Dispatch assignment requires owner/admin access.</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#0d1b34]">Today’s scheduled jobs</h3>
        <div className="mt-3 space-y-2">
          {todayJobs.length === 0 ? <p className="text-sm text-[#5b6c87]">No jobs scheduled today</p> : todayJobs.map((job) => {
            const worker = workers.find((w) => String(w.id) === String(job.assigned_worker_id));
            return <div key={job.id} className="rounded-xl border border-[#e4ecf7] p-3 bg-[#f8fbff]"><p className="text-sm font-medium text-[#0d1b34]">{safeText(job.title, "Untitled job")}</p><p className="text-xs text-[#5b6c87]">{safeText(job.client_name || job.customer_name, "No client")}</p><p className="text-xs text-[#5b6c87]">{safeText(job.scheduled_time, "No time")} • {safeText(job.status, "scheduled")}</p><p className="text-xs text-[#5b6c87]">Worker: {safeText(worker?.name, "Unassigned")}</p></div>;
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4">
        <h3 className="text-sm font-semibold text-[#0d1b34] inline-flex items-center gap-1"><Users className="h-4 w-4" />Workers / crew availability</h3>
        <div className="mt-3 space-y-2">
          {workerStats.length === 0 ? <p className="text-sm text-[#5b6c87]">No workers found</p> : workerStats.map((row) => <div key={row.worker.id} className="rounded-xl border border-[#e4ecf7] p-3 bg-[#f8fbff]"><p className="text-sm font-medium text-[#0d1b34]">{safeText(row.worker.name, "Unnamed worker")}</p><p className="text-xs text-[#5b6c87]">Assigned today: {row.assignedTodayCount}</p><p className="text-xs text-[#5b6c87]">Status: {row.status}</p>{row.hasConflict ? <p className="text-xs text-[#b54708] inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Conflict warning</p> : null}</div>)}
        </div>
      </section>
    </div>
  );
}
