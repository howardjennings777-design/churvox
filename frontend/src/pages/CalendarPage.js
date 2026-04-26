import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { AlertTriangle, CalendarClock, ClipboardList, UserPlus2, Users, BriefcaseBusiness, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { safeArray, safeText } from "../utils/safeRender";

export default function CalendarPage() {
  const { get, post } = useApi();
  const { isEmployer } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragJobId, setDragJobId] = useState("");

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    const [jobsRes, workersRes] = await Promise.all([get("/jobs"), get("/team/workers")]);
    setJobs(safeArray(jobsRes?.success ? jobsRes.data : []));
    setWorkers(safeArray(workersRes?.success ? workersRes.data : []).filter((w) => String(w.role || "worker") === "worker"));
    setLoading(false);
  }, [get]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekJobs = useMemo(() => jobs.filter((j) => String(j.scheduled_date || "").slice(0, 10) >= todayKey), [jobs, todayKey]);

  const columnData = useMemo(() => {
    const byWorker = {};
    workers.forEach((w) => { byWorker[String(w.id)] = []; });
    const unassigned = [];
    weekJobs.forEach((job) => {
      const wid = String(job.assigned_worker_id || "");
      if (wid && byWorker[wid]) byWorker[wid].push(job);
      else unassigned.push(job);
    });
    return { byWorker, unassigned };
  }, [weekJobs, workers]);

  const hasConflict = (job, targetWorkerId) => {
    const sameWorkerJobs = weekJobs.filter((j) => String(j.assigned_worker_id || "") === String(targetWorkerId));
    const slot = `${String(job.scheduled_date || "").slice(0, 10)} ${job.scheduled_time || ""}`;
    return sameWorkerJobs.some((j) => String(j.id) !== String(job.id) && `${String(j.scheduled_date || "").slice(0, 10)} ${j.scheduled_time || ""}` === slot && slot.trim());
  };

  const conflictCount = useMemo(() => {
    const workerSlotMap = new Map();
    let conflicts = 0;
    weekJobs.forEach((job) => {
      const workerId = String(job.assigned_worker_id || "");
      const date = String(job.scheduled_date || "").slice(0, 10);
      if (!workerId || !date) return;
      const slot = `${date} ${job.scheduled_time || ""}`.trim();
      if (!slot) return;
      const key = `${workerId}-${slot}`;
      const seen = workerSlotMap.get(key) || 0;
      if (seen >= 1) conflicts += 1;
      workerSlotMap.set(key, seen + 1);
    });
    return conflicts;
  }, [weekJobs]);

  const scheduledTodayCount = useMemo(
    () => weekJobs.filter((job) => String(job.scheduled_date || "").slice(0, 10) === todayKey).length,
    [weekJobs, todayKey]
  );

  const activeWorkerCount = useMemo(() => {
    const workerIds = new Set(weekJobs.filter((job) => job.assigned_worker_id).map((job) => String(job.assigned_worker_id)));
    return workerIds.size;
  }, [weekJobs]);

  const assignJob = async (jobId, workerId) => {
    const current = jobs;
    const targetJob = current.find((j) => String(j.id) === String(jobId));
    if (!targetJob) return;

    if (workerId && hasConflict(targetJob, workerId)) {
      toast.warning("Schedule conflict: worker already has a job at this time");
    }

    setJobs((prev) => prev.map((j) => (String(j.id) === String(jobId) ? { ...j, assigned_worker_id: workerId || null } : j)));
    const res = await post(`/jobs/${jobId}/assign`, { worker_id: workerId });
    if (res?.success) {
      toast.success("Assignment updated");
      fetchBoard();
    } else {
      setJobs(current);
      toast.error(safeText(res?.error, "Failed to save assignment"));
    }
  };

  const badgeClass = (status) => {
    const value = String(status || "").toLowerCase();
    if (["completed", "paid", "accepted"].includes(value)) return "cx-status-badge--green";
    if (["in_progress", "in-progress", "sent", "active"].includes(value)) return "cx-status-badge--blue";
    if (["cancelled", "declined", "failed", "overdue"].includes(value)) return "cx-status-badge--red";
    return "cx-status-badge--amber";
  };

  const JobCard = ({ job, workerName }) => (
    <div draggable={isEmployer} onDragStart={() => setDragJobId(String(job.id))} className="cx-job-card border-l-4 border-l-[#155EEF]" data-testid={`dispatch-job-${job.id}`}>
      <p className="text-sm font-semibold text-[#172033]">{safeText(job.title, "Untitled job")}</p>
      <p className="text-xs text-[#667085] mt-0.5">{safeText(job.customer_name || job.client_name, "No client")}</p>
      <p className="text-xs text-[#667085] mt-2">{safeText(job.address, "No address")}</p>
      <p className="text-xs text-[#667085] mt-1">{String(job.scheduled_date || "").slice(0, 10)} {job.scheduled_time || ""}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`cx-status-badge ${badgeClass(job.status)}`}>{safeText(job.status, "scheduled")}</span>
        <span className="text-[11px] text-[#667085] truncate">Worker: {safeText(workerName, "Unassigned")}</span>
      </div>
      <div className="mt-2">
        <Link to={`/jobs/${job.id}`} className="text-xs font-semibold text-[#155EEF] hover:underline inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          Open job
        </Link>
      </div>
      <div className="md:hidden mt-2">
        <select
          className="w-full border border-[#e4e0d8] rounded-md p-2 text-xs bg-white"
          value={job.assigned_worker_id || ""}
          onChange={(e) => assignJob(job.id, e.target.value)}
        >
          <option value="">Unassigned</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="cx-page" data-testid="calendar-page">
        <div className="cx-page-hero">
          <div>
            <h1 className="cx-page-title">Dispatch Board</h1>
            <p className="cx-page-subtitle">Plan the week, assign workers, spot conflicts, and keep jobs moving.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
            <div className="cx-stat-card">
              <p className="text-xs text-[#667085]">Unassigned jobs</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{columnData.unassigned.length}</p>
            </div>
            <div className="cx-stat-card">
              <p className="text-xs text-[#667085]">Scheduled today</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{scheduledTodayCount}</p>
            </div>
            <div className="cx-stat-card">
              <p className="text-xs text-[#667085]">Active workers</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{activeWorkerCount}/{workers.length}</p>
            </div>
            <div className="cx-stat-card">
              <p className="text-xs text-[#667085]">Schedule conflicts</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{conflictCount}</p>
            </div>
          </div>

          <div className="cx-toolbar">
            {isEmployer && (
              <>
                <Link to="/jobs/new" className="cx-button-primary"><Plus className="h-4 w-4 mr-1.5" />New job</Link>
                <Link to="/team" className="cx-button-secondary"><UserPlus2 className="h-4 w-4 mr-1.5" />Add worker</Link>
              </>
            )}
            <Link to="/jobs" className="cx-button-secondary"><ClipboardList className="h-4 w-4 mr-1.5" />View jobs</Link>
            <Link to="/calendar" className="cx-button-secondary"><CalendarClock className="h-4 w-4 mr-1.5" />Today</Link>
          </div>
        </div>

        {loading ? <div className="cx-loading-state text-[#667085]">Loading dispatch board...</div> : (
          <div className="cx-dispatch-board md:snap-x md:snap-mandatory">
            <div className="cx-dispatch-column snap-start border-[#f4cf95] bg-[#FFF6E5]" onDragOver={(e) => e.preventDefault()} onDrop={() => dragJobId && assignJob(dragJobId, "")}>
              <div className="h-1.5 bg-[#F59E0B]" />
              <div className="p-4 border-b border-[#f1dbb8]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-[#172033]">Unassigned Jobs</h3>
                    <p className="text-xs text-[#667085] mt-1">Needs worker allocation</p>
                  </div>
                  <span className="cx-status-badge cx-status-badge--amber">{columnData.unassigned.length} jobs</span>
                </div>
              </div>
              <div className="p-4 flex-1">
                {columnData.unassigned.map((job) => <JobCard key={job.id} job={job} workerName="" />)}
                {columnData.unassigned.length === 0 && (
                  <div className="cx-empty-state-inline">
                    <p className="text-sm font-semibold text-[#172033]">All jobs are assigned</p>
                    <p className="text-xs text-[#667085] mt-1">New unassigned jobs will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {safeArray(workers).map((worker, index) => (
              <div key={worker.id} className="cx-dispatch-column snap-start" onDragOver={(e) => e.preventDefault()} onDrop={() => dragJobId && assignJob(dragJobId, worker.id)}>
                <div className="h-1.5" style={{ background: index % 2 === 0 ? "#155EEF" : "#16A34A" }} />
                <div className="p-4 border-b border-[#e4e0d8] bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#172033]">{safeText(worker.name, "Worker")}</h3>
                      <p className="text-xs text-[#667085] mt-1">
                        {safeText(worker.role, "Worker")}
                        {worker.region ? ` • ${safeText(worker.region, "")}` : ""}
                      </p>
                    </div>
                    <span className={`cx-status-badge ${safeArray(columnData.byWorker[String(worker.id)]).length ? "cx-status-badge--green" : "cx-status-badge--blue"}`}>
                      {safeArray(columnData.byWorker[String(worker.id)]).length} jobs
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1">
                  {safeArray(columnData.byWorker[String(worker.id)]).map((job) => {
                    const conflict = hasConflict(job, worker.id);
                    return (
                      <div key={job.id}>
                        <JobCard job={job} workerName={worker.name} />
                        {conflict && (
                          <div className="mb-3 rounded-md border border-[#fbd5a5] bg-[#FFF6E5] text-[#b45309] text-[11px] p-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Conflict warning for this time slot
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {safeArray(columnData.byWorker[String(worker.id)]).length === 0 && (
                    <div className="cx-empty-state-inline">
                      <p className="text-sm font-semibold text-[#172033]">No jobs assigned yet</p>
                      <p className="text-xs text-[#667085] mt-1">Drag a job here or use Assign from the job card.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {workers.length === 0 && (
              <div className="cx-dispatch-column">
                <div className="h-1.5 bg-[#16A34A]" />
                <div className="p-5 cx-empty-state-inline m-4">
                  <p className="text-base font-semibold text-[#172033] flex items-center justify-center gap-2"><Users className="h-4 w-4" />No active workers</p>
                  <p className="text-sm text-[#667085] mt-1">Add your first worker to start dispatching jobs across the week.</p>
                  {isEmployer && <Link to="/team" className="cx-button-primary mt-4 inline-flex"><BriefcaseBusiness className="h-4 w-4 mr-1.5" />Add worker</Link>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
