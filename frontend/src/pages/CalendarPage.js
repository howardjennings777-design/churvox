import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { AlertTriangle, CalendarClock, ClipboardList, UserPlus2, Users, BriefcaseBusiness, Plus, Eye, X } from "lucide-react";
import { toast } from "sonner";
import Layout from "../components/Layout";
import { safeArray, safeText } from "../utils/safeRender";

const FILTERS = {
  ALL: "all",
  TODAY: "today",
  UNASSIGNED: "unassigned",
  CONFLICTS: "conflicts",
};

export default function CalendarPage() {
  const { get, post } = useApi();
  const { isEmployer } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragJobId, setDragJobId] = useState("");
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const workerColumnsRef = useRef(null);
  const unassignedColumnRef = useRef(null);

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

  const hasConflict = useCallback((job, targetWorkerId) => {
    const sameWorkerJobs = weekJobs.filter((j) => String(j.assigned_worker_id || "") === String(targetWorkerId));
    const slot = `${String(job.scheduled_date || "").slice(0, 10)} ${job.scheduled_time || ""}`;
    return sameWorkerJobs.some((j) => String(j.id) !== String(job.id) && `${String(j.scheduled_date || "").slice(0, 10)} ${j.scheduled_time || ""}` === slot && slot.trim());
  }, [weekJobs]);

  const getConflictDetails = useCallback((job, worker) => {
    const workerId = String(worker?.id || "");
    if (!workerId || !job) return null;
    const date = String(job.scheduled_date || "").slice(0, 10);
    const time = String(job.scheduled_time || "").trim();
    const slot = `${date} ${time}`.trim();
    if (!slot) return null;

    const conflictingJobs = weekJobs.filter(
      (candidate) => String(candidate.assigned_worker_id || "") === workerId
      && `${String(candidate.scheduled_date || "").slice(0, 10)} ${String(candidate.scheduled_time || "")}`.trim() === slot
    );

    if (conflictingJobs.length <= 1) return null;

    return {
      worker,
      date,
      time,
      slot,
      reason: "Multiple jobs are scheduled for the same worker at the same date/time slot.",
      jobs: conflictingJobs,
    };
  }, [weekJobs]);

  const filteredJobs = useMemo(() => {
    if (activeFilter === FILTERS.TODAY) {
      return weekJobs.filter((job) => String(job.scheduled_date || "").slice(0, 10) === todayKey);
    }
    if (activeFilter === FILTERS.UNASSIGNED) {
      return weekJobs.filter((job) => !job.assigned_worker_id);
    }
    if (activeFilter === FILTERS.CONFLICTS) {
      return weekJobs.filter((job) => {
        if (!job.assigned_worker_id) return false;
        return hasConflict(job, job.assigned_worker_id);
      });
    }
    return weekJobs;
  }, [activeFilter, weekJobs, todayKey, hasConflict]);

  const columnData = useMemo(() => {
    const byWorker = {};
    workers.forEach((w) => { byWorker[String(w.id)] = []; });
    const unassigned = [];
    filteredJobs.forEach((job) => {
      const wid = String(job.assigned_worker_id || "");
      if (wid && byWorker[wid]) byWorker[wid].push(job);
      else unassigned.push(job);
    });
    return { byWorker, unassigned };
  }, [filteredJobs, workers]);

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

  const handleCardActivate = (job) => {
    if (!job) return;
    setActiveJob(job);
  };

  const onCardKeyDown = (event, job) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardActivate(job);
    }
  };

  const workerNameForJob = (job) => {
    if (!job?.assigned_worker_id) return "Unassigned";
    return safeText(workers.find((w) => String(w.id) === String(job.assigned_worker_id))?.name, "Unassigned");
  };

  const closeJobPopup = () => setActiveJob(null);

  const statCardBaseClass = "cx-stat-card cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155EEF]";

  const JobCard = ({ job, workerName }) => (
    <div
      draggable={isEmployer}
      onDragStart={() => setDragJobId(String(job.id))}
      role="button"
      tabIndex={0}
      onClick={() => handleCardActivate(job)}
      onKeyDown={(event) => onCardKeyDown(event, job)}
      aria-label={`Open job ${safeText(job.title, "job")}`}
      className="cx-job-card border-l-4 border-l-[#155EEF] cursor-pointer transition-all duration-150 hover:shadow-md hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#155EEF]"
      data-testid={`dispatch-job-${job.id}`}
    >
      <p className="text-sm font-semibold text-[#172033]">{safeText(job.title, "Untitled job")}</p>
      <p className="text-xs text-[#667085] mt-0.5">{safeText(job.customer_name || job.client_name, "No client")}</p>
      <p className="text-xs text-[#667085] mt-2">{safeText(job.address, "No address")}</p>
      <p className="text-xs text-[#667085] mt-1">{String(job.scheduled_date || "").slice(0, 10)} {job.scheduled_time || ""}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`cx-status-badge ${badgeClass(job.status)}`}>{safeText(job.status, "scheduled")}</span>
        <span className="text-[11px] text-[#667085] truncate">Worker: {safeText(workerName, "Unassigned")}</span>
      </div>
      <div className="mt-2 text-xs font-semibold text-[#155EEF] inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" />
        Open pop-up
      </div>
      <div className="md:hidden mt-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
        <select
          className="w-full border border-border rounded-md p-2 text-xs bg-white min-h-[40px]"
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
            <button
              type="button"
              className={statCardBaseClass}
              onClick={() => {
                setActiveFilter(FILTERS.UNASSIGNED);
                unassignedColumnRef.current?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
              }}
            >
              <p className="text-xs text-[#667085]">Unassigned jobs</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{columnData.unassigned.length}</p>
            </button>
            <button
              type="button"
              className={statCardBaseClass}
              onClick={() => setActiveFilter(FILTERS.TODAY)}
            >
              <p className="text-xs text-[#667085]">Scheduled today</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{scheduledTodayCount}</p>
            </button>
            <button
              type="button"
              className={statCardBaseClass}
              onClick={() => {
                setActiveFilter(FILTERS.ALL);
                workerColumnsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <p className="text-xs text-[#667085]">Active workers</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{activeWorkerCount}/{workers.length}</p>
            </button>
            <button
              type="button"
              className={statCardBaseClass}
              onClick={() => setActiveFilter(FILTERS.CONFLICTS)}
            >
              <p className="text-xs text-[#667085]">Schedule conflicts</p>
              <p className="mt-1 text-2xl font-bold text-[#172033]">{conflictCount}</p>
            </button>
          </div>

          <div className="cx-toolbar">
            {isEmployer && (
              <>
                <Link to="/jobs/new" className="cx-button-primary"><Plus className="h-4 w-4 mr-1.5" />New Job</Link>
                <Link to="/team" className="cx-button-secondary"><UserPlus2 className="h-4 w-4 mr-1.5" />Add Worker</Link>
              </>
            )}
            <Link to="/jobs" className="cx-button-secondary"><ClipboardList className="h-4 w-4 mr-1.5" />View Jobs</Link>
            <button type="button" className="cx-button-secondary" onClick={() => setActiveFilter(FILTERS.TODAY)}>
              <CalendarClock className="h-4 w-4 mr-1.5" />Today
            </button>
          </div>
        </div>

        {loading ? <div className="cx-loading-state text-[#667085]">Loading dispatch board...</div> : (
          <>
            <div className="text-xs text-[#667085] mt-2 mb-3">
              {activeFilter === FILTERS.TODAY && "Showing jobs scheduled for today."}
              {activeFilter === FILTERS.UNASSIGNED && "Showing unassigned jobs."}
              {activeFilter === FILTERS.CONFLICTS && "Showing jobs with schedule conflicts."}
              {activeFilter === FILTERS.ALL && "Showing all upcoming scheduled jobs."}
            </div>
            <div className="cx-dispatch-board md:snap-x md:snap-mandatory" ref={workerColumnsRef}>
              <div
                className="cx-dispatch-column snap-start border-[#f4cf95] bg-[#FFF6E5]"
                ref={unassignedColumnRef}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragJobId && assignJob(dragJobId, "")}
              >
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
                  <div className="p-4 border-b border-border bg-white">
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
                      const conflictDetails = conflict ? getConflictDetails(job, worker) : null;
                      return (
                        <div key={job.id}>
                          <JobCard job={job} workerName={worker.name} />
                          {conflict && (
                            <button
                              type="button"
                              className="mb-3 w-full rounded-md border border-[#fbd5a5] bg-[#FFF6E5] text-[#b45309] text-[11px] p-2 flex items-center gap-1 text-left cursor-pointer hover:bg-[#ffefce] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F59E0B]"
                              onClick={() => setSelectedConflict(conflictDetails || {
                                worker,
                                date: String(job.scheduled_date || "").slice(0, 10),
                                time: safeText(job.scheduled_time, "Unknown time"),
                                reason: "Potential schedule conflict detected.",
                                jobs: [job],
                              })}
                              aria-label={`Open conflict details for ${safeText(worker.name, "worker")}`}
                            >
                              <AlertTriangle className="h-3 w-3" /> Conflict warning for this time slot
                            </button>
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
          </>
        )}

        {selectedConflict && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3" role="dialog" aria-modal="true" aria-label="Conflict details">
            <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-border p-4 max-h-[85vh] overflow-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#172033]">Schedule conflict details</h2>
                  <p className="text-xs text-[#667085] mt-1">Review overlapping jobs before reassigning.</p>
                </div>
                <button type="button" className="p-1 rounded-md hover:bg-slate-100" onClick={() => setSelectedConflict(null)} aria-label="Close conflict details">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <p><span className="font-semibold">Worker:</span> {safeText(selectedConflict?.worker?.name, "Unknown worker")}</p>
                <p><span className="font-semibold">Date:</span> {safeText(selectedConflict?.date, "Unknown date")}</p>
                <p><span className="font-semibold">Time:</span> {safeText(selectedConflict?.time, "Unknown time")}</p>
                <p><span className="font-semibold">Reason:</span> {safeText(selectedConflict?.reason, "Conflict detected")}</p>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-[#172033]">Conflicting jobs</p>
                {safeArray(selectedConflict?.jobs).map((conflictJob) => (
                  <div key={conflictJob.id || conflictJob.title} className="rounded-md border border-border p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#172033]">{safeText(conflictJob.title, "Untitled job")}</p>
                      <p className="text-xs text-[#667085]">{safeText(conflictJob.customer_name || conflictJob.client_name, "No client")}</p>
                    </div>
                    {conflictJob?.id ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#155EEF] hover:underline"
                        onClick={() => {
                          setActiveJob(conflictJob);
                          setSelectedConflict(null);
                        }}
                      >
                        Open pop-up
                      </button>
                    ) : (
                      <span className="text-xs text-[#98a2b3]">No job link</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button" className="cx-button-secondary" onClick={() => setSelectedConflict(null)}>Close</button>
                {safeArray(selectedConflict?.jobs).some((job) => job?.id) && (
                  <button
                    type="button"
                    className="cx-button-primary"
                    onClick={() => {
                      const firstJob = safeArray(selectedConflict?.jobs).find((job) => job?.id);
                      if (!firstJob?.id) return;
                      setActiveJob(firstJob);
                      setSelectedConflict(null);
                    }}
                  >
                    Open pop-ups
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeJob && (
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Job detail pop-up">
            <div className="h-[92vh] w-full overflow-hidden rounded-t-3xl border border-[#d8e3f3] bg-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-3xl sm:rounded-3xl">
              <div className="flex items-start justify-between gap-3 border-b border-[#d8e3f3] bg-[#f7faff] px-4 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`cx-status-badge ${badgeClass(activeJob.status)}`}>{safeText(activeJob.status, "scheduled")}</span>
                    <span className="rounded-full border border-[#d8e3f3] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#5b6c87]">
                      {activeJob.assigned_worker_id ? "Assigned" : "Unassigned"}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-[#0d1b34]">{safeText(activeJob.title, "Untitled job")}</h2>
                  <p className="mt-1 text-sm text-[#5b6c87]">{safeText(activeJob.customer_name || activeJob.client_name, "No client")}</p>
                </div>
                <button type="button" onClick={closeJobPopup} className="rounded-xl p-2 text-[#5b6c87] hover:bg-white hover:text-[#0d1b34]" aria-label="Close job pop-up">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(92vh-160px)] space-y-4 overflow-y-auto px-4 py-4 sm:max-h-[65vh] sm:px-6">
                <section className="rounded-2xl border border-[#d8e3f3] bg-white p-4">
                  <h3 className="text-sm font-bold text-[#0d1b34]">Job details</h3>
                  <div className="mt-3 grid gap-2 text-sm text-[#1a2c4d] sm:grid-cols-2">
                    <p><span className="font-semibold">Address:</span> {safeText(activeJob.address, "No address")}</p>
                    <p><span className="font-semibold">Date:</span> {String(activeJob.scheduled_date || "").slice(0, 10) || "Not scheduled"}</p>
                    <p><span className="font-semibold">Time:</span> {safeText(activeJob.scheduled_time, "No time")}</p>
                    <p><span className="font-semibold">Worker:</span> {workerNameForJob(activeJob)}</p>
                    <p className="sm:col-span-2"><span className="font-semibold">Description:</span> {safeText(activeJob.description || activeJob.notes, "No job description recorded")}</p>
                  </div>
                </section>

                {isEmployer ? (
                  <section className="rounded-2xl border border-[#d8e3f3] bg-[#f7faff] p-4">
                    <h3 className="text-sm font-bold text-[#0d1b34]">Assign worker</h3>
                    <select
                      className="mt-3 w-full rounded-xl border border-[#d8e3f3] bg-white px-3 py-3 text-sm text-[#0d1b34]"
                      value={activeJob.assigned_worker_id || ""}
                      onChange={(e) => assignJob(activeJob.id, e.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </section>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-[#d8e3f3] bg-white px-4 py-3 sm:flex-row sm:justify-end sm:px-6">
                <button type="button" className="cx-button-secondary" onClick={closeJobPopup}>Close</button>
                <Link to={`/jobs/${activeJob.id}/edit`} className="cx-button-secondary">Edit job</Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
