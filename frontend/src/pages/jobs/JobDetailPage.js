import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { safeText } from "../../utils/safeRender";

const STATUS_OPTIONS = [
  "acknowledged",
  "in_progress",
  "paused",
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

function hasValue(value) {
  return String(value ?? "").trim() !== "";
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

function includesLocation(haystack, needle) {
  if (!needle) return false;
  return norm(haystack).includes(norm(needle));
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
  const [accounting, setAccounting] = useState(null);
  const [selectedWorker, setSelectedWorker] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [photoLightboxIndex, setPhotoLightboxIndex] = useState(null);

  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [employerNotes, setEmployerNotes] = useState("");
  const [savingEmployerNotes, setSavingEmployerNotes] = useState(false);

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    setError("");

    try {
      const [jobRes, workersRes, accountingRes] = await Promise.all([
        get(`/jobs/${id}`),
        get("/team/workers"),
        get("/accounting/settings"),
      ]);

      if (!jobRes?.success || !jobRes?.data) {
        setError(jobRes?.error || "Failed to load job");
        setJob(null);
      } else {
        const loadedJob = jobRes.data;
        setJob(loadedJob);
        setWorkerNotes(loadedJob?.worker_notes || "");
        setEmployerNotes(loadedJob?.notes || "");
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
      if (accountingRes?.success) setAccounting(accountingRes.data || null);
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
        toast.error(safeText(res?.error, "Failed to assign worker"));
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
        toast.error(safeText(res?.error, "Failed to update job"));
      }
    } catch {
      toast.error("Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDraftInvoice = async () => {
    setSaving(true);
    try {
      const res = await post(`/jobs/${id}/create-draft-invoice`);
      if (res?.success && res?.data?.invoice_id) {
        toast.success(res?.data?.message || "Draft invoice created");
        navigate(`/invoices/${res.data.invoice_id}`);
      } else if (res?.success && res?.invoice_id) {
        toast.success(res?.message || "Draft invoice ready");
        navigate(`/invoices/${res.invoice_id}`);
      } else {
        toast.error(safeText(res?.error, "Failed to create draft invoice"));
      }
    } catch {
      toast.error("Failed to create draft invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmployerNotes = async () => {
    setSavingEmployerNotes(true);
    try {
      const res = await patch(`/jobs/${id}`, { notes: employerNotes });
      if (res?.success) {
        toast.success("Notes saved");
        await loadPage();
      } else {
        toast.error(safeText(res?.error, "Failed to save notes"));
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingEmployerNotes(false);
    }
  };

  const handleSaveWorkerNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await patch(`/jobs/${id}`, { worker_notes: workerNotes });
      if (res?.success) {
        toast.success("Notes saved");
        await loadPage();
      } else {
        toast.error(safeText(res?.error, "Failed to save notes"));
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (pageLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6 text-slate-500">Loading job...</CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !job) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <div className="text-slate-900 text-lg font-semibold mb-2">Job page could not load</div>
              <div className="text-slate-500 text-sm">{error || "Job not found"}</div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
            <Button onClick={loadPage} className="bg-blue-600 hover:bg-blue-700 text-white">
              Retry
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const filteredWorkerList = Array.isArray(workers) ? workers.filter((worker) => workerMatchesJobRegion(worker, job)) : [];


  const currentStatus = job?.status || "assigned";
  const invoiceMode = accounting?.invoice_mode || "churvox_only";
  const userRole = String(user?.role || "").trim().toLowerCase();
  const isOwnerView =
    userRole === "owner" ||
    userRole === "admin" ||
    userRole === "employer" ||
    userRole === "manager" ||
    userRole === "office_admin" ||
    user?.is_admin === true ||
    user?.is_owner === true;
  const hasAssignedWorker = !!(job?.assigned_worker_id || job?.assigned_worker_name);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="job-detail-page">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {job.title || "Job"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Status: {niceStatus(currentStatus)}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link to="/jobs">Back</Link>
            </Button>
            {isOwnerView && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/jobs/${id}/edit`)}
                >
                  Edit Job
                </Button>
                {currentStatus === "completed" && !job?.invoice_id && (
                  <Button onClick={handleCreateDraftInvoice} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {invoiceMode === "myob_external" ? "Prepare billing draft for MYOB" : "Create Draft Invoice"}
                  </Button>
                )}
                {job?.invoice_id && (
                  <Button variant="outline" onClick={() => navigate(`/invoices/${job.invoice_id}`)}>
                    View Invoice
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Client</div>
                <div className="text-slate-900">{job.client_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Address</div>
                <div className="text-slate-900">{job.address || "-"}</div>
              </div>
              {hasValue(job.country) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Country</div>
                  <div className="text-slate-900">{job.country}</div>
                </div>
              )}
              {hasValue(job.region) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Region / State</div>
                  <div className="text-slate-900">{job.region}</div>
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Scheduled</div>
                <div className="text-slate-900">{safeDate(job.scheduled_date)}</div>
              </div>
              {hasValue(job.assigned_worker_name) && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Assigned Worker</div>
                  <div className="text-slate-900">{job.assigned_worker_name}</div>
                </div>
              )}
            </div>

            {isOwnerView ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Notes</div>
                  <Button size="sm" variant="ghost" onClick={handleSaveEmployerNotes} disabled={savingEmployerNotes}
                    className="text-xs text-blue-600" data-testid="save-employer-notes-btn">
                    {savingEmployerNotes ? "Saving..." : "Save"}
                  </Button>
                </div>
                <textarea
                  value={employerNotes}
                  onChange={(e) => setEmployerNotes(e.target.value)}
                  placeholder="Add notes for this job..."
                  rows={3}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-2 outline-none text-sm"
                  data-testid="employer-notes-textarea"
                />
              </div>
            ) : hasValue(job.notes) ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Notes</div>
                <div className="text-slate-700 whitespace-pre-wrap">{job.notes}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isOwnerView && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Progress Summary</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Current Status</div>
                  <div className="text-slate-900">{niceStatus(job?.status)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Created</div>
                  <div className="text-slate-900">{safeDate(job?.created_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Last Updated</div>
                  <div className="text-slate-900">{safeDate(job?.updated_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Accepted</div>
                  <div className="text-slate-900">{safeDate(job?.accepted_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Started</div>
                  <div className="text-slate-900">{safeDate(job?.started_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Completed</div>
                  <div className="text-slate-900">{safeDate(job?.completed_at)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Time Spent</div>
                  <div className="text-slate-900">{formatMinutes(job?.time_spent_minutes)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Quote</div>
                  <div className="text-slate-900">
                    {job?.quote_id ? (
                      <Link to={`/quotes/${job.quote_id}`} className="text-blue-600 hover:underline">
                        Open Quote
                      </Link>
                    ) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Invoice</div>
                  <div className="text-slate-900">
                    {job?.invoice_id ? (
                      <Link to={`/invoices/${job.invoice_id}`} className="text-blue-600 hover:underline">
                        Open Invoice
                      </Link>
                    ) : "-"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isOwnerView && !hasAssignedWorker && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Assign Worker</div>

              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-3"
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
                <div className="text-xs text-slate-500">
                  Showing workers matching {[job.country, job.region].filter(Boolean).join(" • ")}
                </div>
              ) : null}

              {filteredWorkerList.length === 0 ? (
                <div className="text-sm text-slate-500">
                  No workers available for this country / region.
                </div>
              ) : null}

              <Button
                onClick={handleAssign}
                disabled={saving || !selectedWorker || filteredWorkerList.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="confirm-assign-worker"
              >
                {saving ? "Saving..." : "Assign Worker"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isWorker && currentStatus === "assigned" && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Worker Acceptance</div>
              <Button
                onClick={handleAcknowledge}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? "Saving..." : "Accept Job"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isWorker && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Update Status</div>

              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    variant={currentStatus === status ? "default" : "outline"}
                    onClick={() => handleStatusChange(status)}
                    disabled={saving}
                    className={currentStatus === status ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                    data-testid={`status-btn-${status}`}
                  >
                    {niceStatus(status)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isWorker && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-slate-900 font-semibold">Worker Notes</div>
                <Button
                  onClick={handleSaveWorkerNotes}
                  disabled={savingNotes}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="save-worker-notes-button"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
              <textarea
                value={workerNotes}
                onChange={(e) => setWorkerNotes(e.target.value)}
                placeholder="Add notes about this job..."
                rows={4}
                className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-3 outline-none"
                data-testid="worker-notes-textarea"
              />
            </CardContent>
          </Card>
        )}

        {isOwnerView && hasValue(job.worker_notes) && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-2">
              <div className="text-slate-900 font-semibold">Worker Notes</div>
              <div className="text-slate-700 whitespace-pre-wrap">{job.worker_notes}</div>
            </CardContent>
          </Card>
        )}

        {isOwnerView && Array.isArray(job.photos) && job.photos.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm" data-testid="owner-photos-card">
            <CardContent className="p-5 space-y-3">
              <div className="text-slate-900 font-semibold">Worker Photos</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {job.photos.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoLightboxIndex(idx)}
                    className="block overflow-hidden rounded-lg border border-slate-200 bg-white text-left hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid={`open-job-photo-${idx}`}
                  >
                    <img src={src} alt={`Job photo ${idx + 1}`} className="w-full h-28 object-cover" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isOwnerView && (job.location_status || job.start_lat != null) && (
          <Card className="bg-white border-slate-200 shadow-sm" data-testid="owner-gps-card">
            <CardContent className="p-5 space-y-2">
              <div className="text-slate-900 font-semibold">Start Location</div>
              <div className="text-sm text-slate-600">
                Status: <span className="font-medium">{job.location_status || "unknown"}</span>
              </div>
              {job.start_lat != null && job.start_lng != null && (
                <div className="text-sm text-slate-600">
                  Coords: {Number(job.start_lat).toFixed(5)}, {Number(job.start_lng).toFixed(5)}
                  {" · "}
                  <a className="text-blue-600 hover:underline" href={`https://www.google.com/maps?q=${job.start_lat},${job.start_lng}`} target="_blank" rel="noreferrer">open in Google Maps</a>
                </div>
              )}
              {job.location_captured_at && (
                <div className="text-xs text-slate-400">Captured: {safeDate(job.location_captured_at)}</div>
              )}
            </CardContent>
          </Card>
        )}
        {photoLightboxIndex !== null && Array.isArray(job.photos) && job.photos[photoLightboxIndex] && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
            onClick={() => setPhotoLightboxIndex(null)}
            data-testid="job-photo-lightbox"
          >
            <div
              className="relative w-full max-w-4xl rounded-2xl bg-white p-3 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPhotoLightboxIndex(null)}
                className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-3 py-1 text-sm font-semibold text-slate-900 shadow"
                data-testid="close-job-photo-lightbox"
              >
                Close
              </button>

              <img
                src={job.photos[photoLightboxIndex]}
                alt={`Job photo ${photoLightboxIndex + 1}`}
                className="max-h-[78vh] w-full rounded-xl object-contain bg-slate-100"
              />

              {job.photos.length > 1 && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPhotoLightboxIndex((photoLightboxIndex - 1 + job.photos.length) % job.photos.length)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-slate-500">
                    {photoLightboxIndex + 1} / {job.photos.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPhotoLightboxIndex((photoLightboxIndex + 1) % job.photos.length)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
