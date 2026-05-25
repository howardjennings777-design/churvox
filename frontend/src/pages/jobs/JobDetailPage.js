import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/AuthContext";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { safeText } from "../../utils/safeRender";
import { ClipboardList, MapPin, UserCircle2, Timer, Image, StickyNote } from "lucide-react";

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
function formatMeters(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "Distance unavailable";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}km from job address`;
  return `${Math.round(n)}m from job address`;
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

function getWorkReviewStatus(job) {
  return norm(job?.work_review_status || job?.review_status || job?.owner_review_status || "");
}

function getSendBackNote(job) {
  return safeText(job?.send_back_note || job?.owner_note || job?.worker_note || "", "");
}

function collectJobPhotos(job) {
  const buckets = [
    job?.photos,
    job?.job_photos,
    job?.uploaded_photos,
    job?.completion_photos,
    job?.images,
    job?.attachments,
  ];

  const urls = [];
  buckets.forEach((bucket) => {
    if (!Array.isArray(bucket)) return;
    bucket.forEach((item) => {
      const url = typeof item === "string"
        ? item
        : item?.url || item?.photo_url || item?.image_url || item?.file_url || item?.src;
      if (url && !urls.includes(url)) urls.push(url);
    });
  });

  return urls;
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

  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [employerNotes, setEmployerNotes] = useState("");
  const [savingEmployerNotes, setSavingEmployerNotes] = useState(false);
  const [proofPack, setProofPack] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);

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
      const packRes = await get(`/proof-packs?job_id=${id}`);
      if (packRes?.success && Array.isArray(packRes.data)) setProofPack(packRes.data[0] || null);
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
      let locationPayload = {};
      if (isWorker && (nextStatus === "in_progress" || nextStatus === "completed") && navigator?.geolocation) {
        const locationKey = nextStatus === "in_progress" ? "start" : "end";
        const geo = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ ok: true, pos }),
            (err) => resolve({ ok: false, err }),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
          );
        });
        if (geo.ok) {
          locationPayload = {
            [`${locationKey}_lat`]: geo.pos.coords.latitude,
            [`${locationKey}_lng`]: geo.pos.coords.longitude,
            [`${locationKey}_accuracy_meters`]: geo.pos.coords.accuracy,
          };
        } else {
          const denied = geo?.err?.code === 1;
          locationPayload = { location_status: denied ? "location_denied" : "location_error" };
          toast.warning("Location could not be verified, but start time was saved.");
        }
      }
      const res = await patch(`/jobs/${id}`, { status: nextStatus, ...locationPayload });
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

  const handleCreateDraftInvoice = () => {
    navigate(`/invoices/new?job_id=${encodeURIComponent(id)}`);
  };
  const handlePrepareProofPack = async () => {
    await post(`/proof-packs/prepare-for-job/${id}`, {});
    await loadPage();
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
          <Card className="cx-command-card">
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
          <Card className="cx-command-card">
            <CardContent className="p-6">
              <div className="text-slate-900 text-lg font-semibold mb-2">Job page could not load</div>
              <div className="text-slate-500 text-sm">{error || "Job not found"}</div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
            <Button onClick={loadPage} className="bg-churvox-accent hover:bg-churvox-accent/90 text-white">
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
    user?.is_admin === true ||
    user?.is_owner === true;
  const hasAssignedWorker = !!(job?.assigned_worker_id || job?.assigned_worker_name);
  const workReviewStatus = getWorkReviewStatus(job);
  const sendBackNote = getSendBackNote(job);
  const isSentBackFromReview = workReviewStatus === "sent_back" || job?.worker_action_required === true;
  const isApprovedFromReview = workReviewStatus === "approved" || job?.work_approved || job?.owner_approved || job?.job_approved;
  const isInvoicedFromReview = workReviewStatus === "invoiced" || job?.invoiced || !!job?.invoice_id;
  const ownerPhotos = collectJobPhotos(job);
  const selectedPhoto = selectedPhotoIndex !== null ? ownerPhotos[selectedPhotoIndex] : null;

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="job-detail-page" data-marker="CHURVOX_JOB_DETAIL_OWNER_PHOTO_SOURCES_20260525">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {job.title || "Job"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Digital job sheet • Status: {niceStatus(currentStatus)}
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
                  <Button onClick={handleCreateDraftInvoice} className="bg-churvox-accent hover:bg-churvox-accent/90 text-white">
                    {invoiceMode === "myob_external" ? "Prepare billing draft for MYOB" : "Create Draft Invoice"}
                  </Button>
                )}
                {job?.invoice_id && (
                  <Button variant="outline" onClick={() => navigate(`/invoices/${job.invoice_id}`)}>
                    View Invoice
                  </Button>
                )}
                {currentStatus === "completed" && (
                  <Button variant="outline" onClick={handlePrepareProofPack}>
                    {proofPack ? "Refresh Proof-to-Paid" : "Prepare Proof-to-Paid"}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {isSentBackFromReview && (
          <Card className="border-orange-200 bg-orange-50 shadow-sm" data-testid="work-review-sent-back-banner">
            <CardContent className="p-5 space-y-2">
              <div className="text-orange-950 font-bold">Work Review: sent back to worker</div>
              <div className="text-sm text-orange-900">
                This job needs fixing before it can be approved or invoiced.
              </div>
              {sendBackNote && (
                <div className="rounded-xl border border-orange-200 bg-white/80 p-3 text-sm text-orange-950 whitespace-pre-wrap">
                  {sendBackNote}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!isSentBackFromReview && (isApprovedFromReview || isInvoicedFromReview) && isOwnerView && (
          <Card className="border-emerald-200 bg-emerald-50 shadow-sm" data-testid="work-review-approved-banner">
            <CardContent className="p-5 space-y-2">
              <div className="text-emerald-950 font-bold">
                Work Review: {isInvoicedFromReview ? "invoiced" : "approved"}
              </div>
              <div className="text-sm text-emerald-900">
                This completed job has been reviewed. {job?.invoice_id ? "An invoice is linked to this job." : "It is ready for invoice creation."}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-semibold"><ClipboardList size={16} /> Job details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Client</div>
                <div className="text-slate-900">{job.client_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500 inline-flex items-center gap-1"><MapPin size={12} /> Site address</div>
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
                  <div className="text-xs uppercase tracking-wide text-slate-500 inline-flex items-center gap-1"><UserCircle2 size={12} /> Assigned worker</div>
                  <div className="text-slate-900">{job.assigned_worker_name}</div>
                </div>
              )}
            </div>

            {isOwnerView ? (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs uppercase tracking-wide text-slate-500 inline-flex items-center gap-1"><StickyNote size={12} /> Site notes</div>
                  <Button size="sm" variant="ghost" onClick={handleSaveEmployerNotes} disabled={savingEmployerNotes}
                    className="text-xs text-churvox-accent" data-testid="save-employer-notes-btn">
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
                <div className="text-white whitespace-pre-wrap">{job.notes}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isOwnerView && (
          <Card className="cx-command-card">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold inline-flex items-center gap-2"><Timer size={16} /> Time tracking</div>
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
                  <div className="text-xs uppercase tracking-wide text-slate-500">Total Time On Site</div>
                  <div className="text-slate-900">{job?.total_time_on_site_label || "-"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Quote</div>
                  <div className="text-slate-900">
                    {job?.quote_id ? (
                      <Link to={`/quotes/${job.quote_id}`} className="text-churvox-accent hover:underline">
                        Open Quote
                      </Link>
                    ) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Invoice</div>
                  <div className="text-slate-900">
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

        {isOwnerView && (
          <Card className="cx-command-card">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Visit Timeline</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-900">Arrived / started</div>
                  <div className="text-sm text-slate-700">{safeDate(job?.started_at)}</div>
                  <div className="text-xs text-slate-500">{formatMeters(job?.start_distance_from_site_meters)} · {niceStatus(job?.start_location_status)}</div>
                  {job?.start_location_lat && job?.start_location_lng && <a className="text-xs text-churvox-accent hover:underline" href={`https://maps.google.com/?q=${job.start_location_lat},${job.start_location_lng}`} target="_blank" rel="noreferrer">Open start map</a>}
                </div>
                <div className="rounded border border-slate-200 p-3">
                  <div className="text-sm font-semibold text-slate-900">Completed / left</div>
                  <div className="text-sm text-slate-700">{safeDate(job?.completed_at)}</div>
                  <div className="text-xs text-slate-500">{formatMeters(job?.end_distance_from_site_meters)} · {niceStatus(job?.end_location_status)}</div>
                  {job?.end_location_lat && job?.end_location_lng && <a className="text-xs text-churvox-accent hover:underline" href={`https://maps.google.com/?q=${job.end_location_lat},${job.end_location_lng}`} target="_blank" rel="noreferrer">Open finish map</a>}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">AI Visit Summary</div>
                <div className="text-sm text-slate-800">{job?.ai_visit_summary || "Visit summary will appear when the job is completed."}</div>
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
                className="bg-churvox-accent hover:bg-churvox-accent/90 text-white"
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
                className="bg-churvox-accent hover:bg-churvox-accent/90 text-white"
              >
                {saving ? "Saving..." : "Accept Job"}
              </Button>
            </CardContent>
          </Card>
        )}

        {isWorker && isSentBackFromReview && (
          <Card className="border-orange-200 bg-orange-50 shadow-sm" data-testid="worker-send-back-note-card">
            <CardContent className="p-5 space-y-2">
              <div className="text-orange-950 font-bold">This job was sent back from Work Review</div>
              <div className="text-sm text-orange-900">Fix the item below, add notes/photos if needed, then mark the job completed again.</div>
              {sendBackNote && (
                <div className="rounded-xl border border-orange-200 bg-white/80 p-3 text-sm text-orange-950 whitespace-pre-wrap">
                  {sendBackNote}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isWorker && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Update Status</div>
              <div className="text-sm text-slate-600">
                Started at {safeDate(job?.started_at)} · Completed at {safeDate(job?.completed_at)} · Total time {job?.total_time_on_site_label || "-"}
              </div>

              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    variant={currentStatus === status ? "default" : "outline"}
                    onClick={() => handleStatusChange(status)}
                    disabled={saving}
                    className={currentStatus === status ? "bg-churvox-accent hover:bg-churvox-accent/90 text-white" : ""}
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
                  className="bg-churvox-accent hover:bg-churvox-accent/90 text-white"
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

        {isOwnerView && ownerPhotos.length > 0 && (
          <Card className="bg-white border-slate-200 shadow-sm" data-testid="owner-photos-card">
            <CardContent className="p-5 space-y-3">
              <div className="text-slate-900 font-semibold inline-flex items-center gap-2"><Image size={16} /> Job photos</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ownerPhotos.map((src, idx) => (
                  <button key={idx} type="button" onClick={() => setSelectedPhotoIndex(idx)} className="block text-left rounded-lg focus:outline-none focus:ring-2 focus:ring-churvox-accent" data-testid={`owner-photo-${idx}`}>
                    <img src={src} alt={`Job photo ${idx + 1}`} className="w-full h-28 object-cover rounded-lg border border-slate-200" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isOwnerView && selectedPhoto && (
          <div className="fixed inset-0 z-[9999] bg-black/80 p-4 flex items-center justify-center" role="dialog" aria-modal="true" data-marker="CHURVOX_JOB_DETAIL_OWNER_PHOTO_SOURCES_20260525">
            <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3">
                <div className="text-sm font-black text-slate-900">Job photo {Number(selectedPhotoIndex) + 1} of {ownerPhotos.length}</div>
                <button type="button" onClick={() => setSelectedPhotoIndex(null)} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-black text-white">Close</button>
              </div>
              <div className="bg-slate-950 p-3 flex items-center justify-center min-h-[55vh]">
                <img src={selectedPhoto} alt="Selected job evidence" className="max-h-[72vh] max-w-full object-contain rounded-2xl" />
              </div>
              {ownerPhotos.length > 1 && (
                <div className="flex justify-between gap-3 border-t border-slate-200 p-3">
                  <button type="button" onClick={() => setSelectedPhotoIndex((Number(selectedPhotoIndex) - 1 + ownerPhotos.length) % ownerPhotos.length)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-900">Previous</button>
                  <button type="button" onClick={() => setSelectedPhotoIndex((Number(selectedPhotoIndex) + 1) % ownerPhotos.length)} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-black text-slate-900">Next</button>
                </div>
              )}
            </div>
          </div>
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
                  <a className="text-churvox-accent hover:underline" href={`https://www.google.com/maps?q=${job.start_lat},${job.start_lng}`} target="_blank" rel="noreferrer">open in Google Maps</a>
                </div>
              )}
              {job.location_captured_at && (
                <div className="text-xs text-slate-400">Captured: {safeDate(job.location_captured_at)}</div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
