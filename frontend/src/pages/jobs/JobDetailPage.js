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

function workerMatchesJobRegion(worker, job) {
  const jobCountry = norm(job?.country);
  const jobRegion = norm(job?.region);
  const workerCountry = norm(worker?.country);
  const workerRegion = norm(worker?.region);
  if (!jobCountry || !jobRegion) return true;
  if (!workerCountry || !workerRegion) return true;
  return jobCountry === workerCountry && jobRegion === workerRegion;
}

function normalizeChecklist(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => {
      if (typeof item === "string") return { id: `item-${index}-${item}`, label: item, done: false };
      return {
        id: String(item?.id || item?._id || `item-${index}-${item?.label || item?.title || "check"}`),
        label: String(item?.label || item?.title || item?.text || "Checklist item"),
        done: Boolean(item?.done || item?.completed || item?.checked),
        completed_at: item?.completed_at || null,
      };
    })
    .filter((item) => item.label.trim());
}

function checklistProgress(items) {
  const total = Array.isArray(items) ? items.length : 0;
  const done = (items || []).filter((item) => item.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
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
  const [statusSaving, setStatusSaving] = useState(false);
  const [invoiceCreating, setInvoiceCreating] = useState(false);
  const [reviewLink, setReviewLink] = useState("");
  const [followUpDraft, setFollowUpDraft] = useState("");
  const [reviewDraft, setReviewDraft] = useState("");

  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [employerNotes, setEmployerNotes] = useState("");
  const [savingEmployerNotes, setSavingEmployerNotes] = useState(false);
  const [checklistItems, setChecklistItems] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [savingChecklist, setSavingChecklist] = useState(false);

  const loadPage = useCallback(async () => {
    setPageLoading(true);
    setError("");

    try {
      const [jobRes, workersRes, accountingRes, settingsRes] = await Promise.all([
        get(`/jobs/${id}`),
        get("/team/workers"),
        get("/accounting/settings"),
        get("/business/settings"),
      ]);

      if (!jobRes?.success || !jobRes?.data) {
        setError(jobRes?.error || "Failed to load job");
        setJob(null);
      } else {
        const loadedJob = jobRes.data;
        setJob(loadedJob);
        setWorkerNotes(loadedJob?.worker_notes || "");
        setEmployerNotes(loadedJob?.notes || "");
        setChecklistItems(normalizeChecklist(loadedJob?.checklist_items || loadedJob?.checklist || []));
        setSelectedWorker(
          loadedJob?.assigned_worker_id ||
          loadedJob?.worker_id ||
          ""
        );
        buildDrafts(loadedJob);
      }

      if (workersRes?.success && Array.isArray(workersRes.data)) {
        setWorkers(workersRes.data);
      } else {
        setWorkers([]);
      }
      if (accountingRes?.success) setAccounting(accountingRes.data || null);
      if (settingsRes?.success) setReviewLink(settingsRes.google_review_link || "");
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

  const saveChecklist = async (items) => {
    setSavingChecklist(true);
    try {
      const res = await patch(`/jobs/${id}`, { checklist_items: items });
      if (res?.success) {
        setChecklistItems(normalizeChecklist(res?.data?.checklist_items || items));
        setJob((prev) => (prev ? { ...prev, checklist_items: items } : prev));
      } else {
        toast.error(safeText(res?.error, "Failed to save checklist"));
      }
    } catch {
      toast.error("Failed to save checklist");
    } finally {
      setSavingChecklist(false);
    }
  };

  const addChecklistItem = async () => {
    const label = newChecklistItem.trim();
    if (!label) return;
    const next = [
      ...checklistItems,
      { id: `check-${Date.now()}`, label, done: false, created_at: new Date().toISOString() },
    ];
    setNewChecklistItem("");
    await saveChecklist(next);
  };

  const toggleChecklistItem = async (itemId) => {
    const next = checklistItems.map((item) => (
      item.id === itemId
        ? { ...item, done: !item.done, completed_at: !item.done ? new Date().toISOString() : null }
        : item
    ));
    setChecklistItems(next);
    await saveChecklist(next);
  };

  const removeChecklistItem = async (itemId) => {
    const next = checklistItems.filter((item) => item.id !== itemId);
    setChecklistItems(next);
    await saveChecklist(next);
  };

  const handleAssign = async () => {
    if (!selectedWorker) {
      toast.error("Choose a worker first");
      return;
    }

    setInvoiceCreating(true);
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
      setInvoiceCreating(false);
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

  const handleAiJobUpdateDraft = async () => {
    const res = await post("/ai/drafts/create", {
      type: "customer_update",
      source_record_id: id,
      source_record_type: "job",
    });
    if (res?.success) toast.success("AI job update draft created");
    else toast.error(safeText(res?.error, "Could not create AI draft"));
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


  const handleCustomerStatusChange = async (nextStatus) => {
    setStatusSaving(true);
    try {
      const res = await patch(`/jobs/${id}/customer-status`, { customer_live_status: nextStatus });
      if (res?.success) {
        setJob((prev) => ({ ...(prev || {}), customer_live_status: res.customer_live_status || nextStatus }));
        toast.success("Customer-safe status updated");
      } else {
        toast.error(safeText(res?.error, "Failed to update customer status"));
      }
    } catch {
      toast.error("Failed to update customer status");
    } finally {
      setStatusSaving(false);
    }
  };

  const buildDrafts = (jobData = job) => {
    const customer = jobData?.client_name || jobData?.customer_name || "there";
    const title = jobData?.title || "your recent job";
    const biz = user?.business_name || "our team";
    setFollowUpDraft(`Hi ${customer},\n\nThanks again for choosing ${biz}. We have marked "${title}" as complete. Please reply if you would like us to adjust anything and we will action it first.\n\nKind regards,\n${biz}`);
    setReviewDraft(`Hi ${customer},\n\nThanks for having ${biz} complete "${title}". If you are happy with the service, would you be open to leaving us a quick review?\n${reviewLink || "[Add Google review link in Settings]"}\n\nThank you!`);
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
  const checklist = checklistProgress(checklistItems);

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="job-detail-page">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {job.title || "Job"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Digital job sheet · Status: {niceStatus(currentStatus)}
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
                <Button variant="outline" onClick={handleAiJobUpdateDraft}>
                  AI job update draft
                </Button>
                {currentStatus === "completed" && !job?.invoice_id && (
                  <Button onClick={handleCreateDraftInvoice} disabled={invoiceCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {invoiceCreating ? "Creating..." : (invoiceMode === "myob_external" ? "Prepare billing draft for MYOB" : "Create Draft Invoice")}
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
            <div className="text-sm font-semibold text-slate-900">Job details</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Client</div>
                <div className="text-slate-900">{job.client_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Site Address</div>
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
                  <div className="text-xs uppercase tracking-wide text-slate-500">Site Notes</div>
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
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Site Notes</div>
                <div className="text-slate-700 whitespace-pre-wrap">{job.notes}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-sm" data-testid="job-checklist-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-slate-900 font-semibold">Job Checklist</div>
                <div className="text-xs text-slate-500">{checklist.done}/{checklist.total} complete · {checklist.percent}%</div>
              </div>
              <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-blue-600" style={{ width: `${checklist.percent}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700">
                    <input type="checkbox" checked={item.done} onChange={() => toggleChecklistItem(item.id)} disabled={savingChecklist} />
                    <span className={item.done ? "truncate text-slate-500 line-through" : "truncate"}>{item.label}</span>
                  </label>
                  {isOwnerView && (
                    <button type="button" onClick={() => removeChecklistItem(item.id)} disabled={savingChecklist} className="text-xs font-bold text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>
              ))}
              {!checklistItems.length && <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">No checklist items yet.</p>}
            </div>

            {isOwnerView && (
              <div className="flex gap-2">
                <input
                  value={newChecklistItem}
                  onChange={(event) => setNewChecklistItem(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addChecklistItem(); } }}
                  placeholder="Add checklist item..."
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300"
                  data-testid="new-checklist-item-input"
                />
                <Button type="button" onClick={addChecklistItem} disabled={savingChecklist || !newChecklistItem.trim()} className="bg-blue-600 text-white hover:bg-blue-700" data-testid="add-checklist-item-btn">
                  Add
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {isOwnerView && (
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold">Time Tracking & Progress</div>
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
                  <div className="text-xs uppercase tracking-wide text-slate-500">Quote Action</div>
                  <div className="text-slate-900">
                    {job?.quote_id ? (
                      <Link to={`/quotes/${job.quote_id}`} className="text-blue-600 hover:underline">
                        Open Quote
                      </Link>
                    ) : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-slate-500">Invoice Action</div>
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


        {isOwnerView && (currentStatus === "completed" || currentStatus === "in_progress" || currentStatus === "paused") && (
          <Card className="border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="text-slate-900 font-semibold text-lg">Completion Pack</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Started:</span> {safeDate(job?.started_at)}</div>
                <div><span className="text-slate-500">Completed:</span> {safeDate(job?.completed_at)}</div>
                <div><span className="text-slate-500">Total worked:</span> {formatMinutes(job?.time_spent_minutes)}</div>
                <div><span className="text-slate-500">Paused time:</span> {formatMinutes(job?.paused_minutes)}</div>
                <div><span className="text-slate-500">Customer-safe status:</span> {niceStatus(job?.customer_live_status || job?.status)}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["scheduled","assigned","on_the_way","in_progress","completed"].map((s)=> (
                  <Button key={s} size="sm" variant={(job?.customer_live_status||job?.status)===s?"default":"outline"} disabled={statusSaving} onClick={()=>handleCustomerStatusChange(s)}>{niceStatus(s)}</Button>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <textarea value={followUpDraft} onChange={(e)=>setFollowUpDraft(e.target.value)} rows={5} className="w-full rounded-md border border-slate-200 p-2 text-sm" placeholder="Draft customer follow-up"/>
                <textarea value={reviewDraft} onChange={(e)=>setReviewDraft(e.target.value)} rows={5} className="w-full rounded-md border border-slate-200 p-2 text-sm" placeholder="Draft review request"/>
              </div>
              {!reviewLink ? <div className="text-xs text-amber-700">Google review link not set. <Link className="underline" to="/settings">Open Settings</Link>.</div> : null}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={()=>navigator.clipboard?.writeText(followUpDraft||"")}>Copy follow-up</Button>
                <Button size="sm" variant="outline" onClick={()=>navigator.clipboard?.writeText(reviewDraft||"")}>Copy review request</Button>
                <Button size="sm" variant="outline" onClick={()=>window.open(`/public/customer-portal/${job?.portal_token||""}`,'_blank')}>Open portal</Button>
              </div>
              {(!job?.photos?.length && !job?.worker_notes && !job?.notes && !(job?.extras||[]).length) ? <div className="rounded-xl border border-dashed p-3 text-sm text-slate-500">No photos, notes, or extras yet.</div> : null}
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
                <div className="text-xs text-slate-500">Captured: {safeDate(job.location_captured_at)}</div>
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
