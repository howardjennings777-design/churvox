import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Plus, AlertTriangle } from "lucide-react";
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

  const JobCard = ({ job }) => (
    <div draggable={isEmployer} onDragStart={() => setDragJobId(String(job.id))} className="rounded-xl border border-[#dfdacf] bg-white p-3 mb-2 border-l-4 border-l-[#155EEF]" data-testid={`dispatch-job-${job.id}`}>
      <p className="text-sm font-semibold text-slate-900">{safeText(job.title, "Untitled job")}</p>
      <p className="text-xs text-slate-500">{safeText(job.customer_name || job.client_name, "No client")}</p>
      <p className="text-xs text-slate-500">{safeText(job.address, "No address")}</p>
      <p className="text-xs text-slate-500">{String(job.scheduled_date || "").slice(0, 10)} {job.scheduled_time || ""}</p>
      <p className="cx-status-badge status-assigned mt-1">{safeText(job.status, "assigned")}</p>
      <div className="md:hidden mt-2">
        <select
          className="w-full border border-slate-200 rounded-md p-2 text-xs"
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
        <div className="cx-page-hero flex items-center justify-between">
          <div>
            <h1 className="cx-page-title">Dispatch Board</h1>
            <p className="cx-page-subtitle">Week view with worker columns and unassigned jobs</p>
          </div>
          {isEmployer && <Button asChild className="bg-blue-600 hover:bg-blue-700"><Link to="/jobs/new"><Plus className="h-4 w-4 mr-1" />New Job</Link></Button>}
        </div>

        {loading ? <Card><CardContent className="p-6 text-slate-500">Loading dispatch board...</CardContent></Card> : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Card className="bg-[#fbfaf7] border-[#e4e0d8]" onDragOver={(e) => e.preventDefault()} onDrop={() => dragJobId && assignJob(dragJobId, "")}>
              <CardContent className="p-3">
                <h3 className="font-semibold text-slate-800 mb-2">Unassigned</h3>
                {columnData.unassigned.map((job) => <JobCard key={job.id} job={job} />)}
                {columnData.unassigned.length === 0 && <p className="text-xs text-slate-400">No unassigned jobs</p>}
              </CardContent>
            </Card>

            {workers.map((worker) => (
              <Card key={worker.id} className="bg-[#fbfaf7] border-[#e4e0d8]" onDragOver={(e) => e.preventDefault()} onDrop={() => dragJobId && assignJob(dragJobId, worker.id)}>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-slate-800 mb-2">{safeText(worker.name, "Worker")}</h3>
                  {safeArray(columnData.byWorker[String(worker.id)]).map((job) => {
                    const conflict = hasConflict(job, worker.id);
                    return (
                      <div key={job.id}>
                        <JobCard job={job} />
                        {conflict && (
                          <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[11px] p-2 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Conflict warning for this time slot
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {safeArray(columnData.byWorker[String(worker.id)]).length === 0 && <p className="text-xs text-slate-400">No assigned jobs</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
