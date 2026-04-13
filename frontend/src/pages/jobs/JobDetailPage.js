import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  "assigned",
  "acknowledged",
  "in_progress",
  "completed",
];

function niceStatus(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase()) || "-";
}

function safeDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatMinutes(totalMinutes) {
  const mins = Number(totalMinutes || 0);
  if (!mins || mins <= 0) return "0m";
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}



function workerMatchesJobRegion(worker, job) {
  const jobCountry = norm(job?.country);
  const jobRegion = norm(job?.region);
  const workerCountry = norm(worker?.country);
  const workerRegion = norm(worker?.region);

  // Safe fallback:
  // if either side is missing country/region, do not hide the worker
  if (!jobCountry || !jobRegion) return true;
  if (!workerCountry || !workerRegion) return true;

  return jobCountry === workerCountry && jobRegion === workerRegion;
}

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, patch } = useApi();
  const { user, isWorker } = useAuth();

  const [job, setJob] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    setError("");

    try {
      const [jobRes, workersRes] = await Promise.all([
        get(`/jobs/${id}`),
        get("/team/workers"),
      ]);

      if (!jobRes?.success || !jobRes?.data) {
        setError(jobRes?.error || "Failed to load job");
        setJob(null);
      } else {
        const loadedJob = jobRes.data;
        setJob(loadedJob);
        setSelectedWorker(
          loadedJob?.assigned_worker_id ||
          loadedJob?.worker_id ||
          ""
        );
      }

      if (workersRes?.success && Array.isArray(workersRes.data)) {
        setWorkers(workersRes.data);
      } else {
        setWorkers([]);
      }
    } catch {
      setError("Failed to load job");
      setJob(null);
      setWorkers([]);
    } finally {
      setPageLoading(false);
    }
  }, [get, id]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!selectedWorkerStillValid) {
      setSelectedWorker("");
    }
  }, [selectedWorkerStillValid]);


  const handleAssign = async () => {
    if (!selectedWorker) {
      toast.error("Choose a worker first");
      return;
    }

    setSaving(true);
    try {
      const res = await post(`/jobs/${id}/assign`, { worker_id: selectedWorker });
      if (res?.success) {
        toast.success("Worker assigned");
        await loadPage();
      } else {
        toast.error(res?.error || "Failed to assign worker");
      }
    } catch {
      toast.error("Failed to assign worker");
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    try {
      const res = await post(`/jobs/${id}/acknowledge`);
      if (res?.success) {
        toast.success("Job accepted");
        await loadPage();
      } else {
        toast.error(res?.error || "Failed to accept job");
      }
    } catch {
      toast.error("Failed to accept job");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!job) return;

    setSaving(true);
    try {
      const res = await patch(`/jobs/${id}`, { status: nextStatus });
      if (res?.success) {
        toast.success("Job updated");
        await loadPage();
      } else {
        toast.error(res?.error || "Failed to update job");
      }
    } catch {
      toast.error("Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-6 text-white">Loading job...</CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !job) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-6">
              <div className="text-white text-lg font-semibold mb-2">Job page could not load</div>
              <div className="text-churvox-muted text-sm">{error || "Job not found"}</div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
            <Button onClick={loadPage} className="bg-churvox-accent hover:bg-churvox-accent/90">
              Retry
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredWorkerList = Array.isArray(workers) ? workers.filter((worker) => workerMatchesJobRegion(worker, job)) : [];

  const selectedWorkerStillValid = !selectedWorker
    ? true
    : filteredWorkerList.some((worker) => String(worker.id || worker._id || "") === String(selectedWorker));



  const currentStatus = job?.status || "assigned";
  const userRole = String(user?.role || "").trim().toLowerCase();
  const isOwnerView =
    userRole === "owner" ||
    userRole === "admin" ||
    userRole === "employer" ||
    user?.is_admin === true ||
    user?.is_owner === true;
  const hasAssignedWorker = !!(job?.assigned_worker_id || job?.assigned_worker_name);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="job-detail-page">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {job.title || "Job"}
            </h1>
            <p className="text-sm text-churvox-muted mt-1">
              Status: {niceStatus(currentStatus)}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/jobs">Back</Link>
            </Button>
            {isOwnerView && (
              <Button
                variant="outline"
                onClick={() => navigate(`/jobs/${id}/edit`)}
              >
                Edit Job
              </Button>
            )}
          </div>
        </div>

        <Card className="bg-churvox-card border-churvox-border">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-churvox-muted">Client</div>
                <div className="text-white">{job.client_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-churvox-muted">Address</div>
                <div className="text-white">{job.address || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-churvox-muted">Scheduled</div>
                <div className="text-white">{safeDate(job.scheduled_date)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-churvox-muted">Assigned Worker</div>
                <div className="text-white">{job.assigned_worker_name || "-"}</div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-churvox-muted mb-1">Notes</div>
              <div className="text-white whitespace-pre-wrap">{job.notes || "-"}</div>
            </div>
          </CardContent>
        </Card>

        {isOwnerView && (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-5 space-y-4">
              <div className="text-white font-semibold">Progress Summary</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Current Status</div>
                  <div className="text-white">{niceStatus(job?.status)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Created</div>
                  <div className="text-white">{safeDate(job?.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Last Updated</div>
                  <div className="text-white">{safeDate(job?.updated_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Accepted</div>
                  <div className="text-white">{safeDate(job?.accepted_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Started</div>
                  <div className="text-white">{safeDate(job?.started_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Completed</div>
                  <div className="text-white">{safeDate(job?.completed_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Time Spent</div>
                  <div className="text-white">{formatMinutes(job?.time_spent_minutes)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Quote</div>
                  <div className="text-white">
                    {job?.quote_id ? (
                      <Link to={`/quotes/${job.quote_id}`} className="text-churvox-accent hover:underline">
                        Open Quote
                      </Link>
                    ) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-churvox-muted">Invoice</div>
                  <div className="text-white">
                    {job?.invoice_id ? (
                      <Link to={`/invoices/${job.invoice_id}`} className="text-churvox-accent hover:underline">
                        Open Invoice
                      </Link>
                    ) : "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {(!isOwnerView || !hasAssignedWorker) && (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-5 space-y-4">
              <div className="text-white font-semibold">Assign Worker</div>

              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3"
                data-testid="assign-worker-select"
              >
                <option value="">Select worker</option>
                {filteredWorkerList.map((worker) => {
                  const workerId = worker.id || worker._id;
                  const labelBits = [
                    worker.name || worker.email || "Worker",
                    worker.region || worker.country || ""
                  ].filter(Boolean);
                  return (
                    <option key={workerId} value={workerId}>
                      {labelBits.join(" - ")}
                    </option>
                  );
                })}
              </select>

              {job?.region || job?.city || job?.country ? (
                <div className="text-xs text-churvox-muted">
                  Showing workers matching {[job.country, job.region].filter(Boolean).join(" • ")}
                </div>
              ) : null}

              {filteredWorkerList.length === 0 ? (
                <div className="text-sm text-churvox-muted">
                  No workers available for this country / region.
                </div>
              ) : null}

              <Button
                onClick={handleAssign}
                disabled={saving || !selectedWorker || filteredWorkerList.length === 0}
                className="bg-churvox-accent hover:bg-churvox-accent/90"
                data-testid="confirm-assign-worker"
              >
                {saving ? "Saving..." : "Assign Worker"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isWorker && currentStatus === "assigned" && (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-5 space-y-4">
              <div className="text-white font-semibold">Worker Acceptance</div>
              <Button
                onClick={handleAcknowledge}
                disabled={saving}
                className="bg-churvox-accent hover:bg-churvox-accent/90"
              >
                {saving ? "Saving..." : "Accept Job"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isWorker && (
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-5 space-y-4">
              <div className="text-white font-semibold">Update Status</div>

              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    variant={currentStatus === status ? "default" : "outline"}
                    onClick={() => handleStatusChange(status)}
                    disabled={saving}
                    className={currentStatus === status ? "bg-churvox-accent hover:bg-churvox-accent/90" : ""}
                  >
                    {niceStatus(status)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
