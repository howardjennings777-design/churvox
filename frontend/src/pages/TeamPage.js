import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { UserPlus, Trash2, Upload, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { UpgradePrompt } from "../components/UpgradePrompt";
import axios from "axios";

axios.defaults.withCredentials = true;

const API_URL = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "https://grassley-backend.onrender.com").replace(/\/$/, "");

export default function TeamPage() {
  const navigate = useNavigate();
  const { user, isEmployer, loading: authLoading } = useAuth();
  const { get, post, del, patch, loading } = useApi();
  const {
    plan,
    includedUsers,
    canUseTeamManagement,
    features,
  } = usePlanLimits(user?.plan);

  const safePlan = normalizePlan(user?.plan || plan || "solo");
  const canUseOwnerCsv = !!isEmployer && hasPlanAccess(safePlan, "team");

  const [workers, setWorkers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [workerJobs, setWorkerJobs] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const isFeatureEnabled = (key) => {
    const normalized = String(key || "").trim().toLowerCase();
    if (normalized === "team" || normalized === "teammanagement" || normalized === "team_management") {
      return !!canUseTeamManagement;
    }
    if (normalized === "csvteamimport" || normalized === "csv_team_import") {
      return !!canUseOwnerCsv;
    }
    return !!features?.[key];
  };

  const canAddWorker = (currentCount) => {
    const included = Number(includedUsers || 1);
    return currentCount < included;
  };

  const planData = {
    max_workers: Number(includedUsers || 1),
  };

  const fetchWorkers = useCallback(async () => {
    const res = await get("/team/workers");
    if (res?.success) {
      setWorkers(Array.isArray(res.data) ? res.data : []);
    } else {
      setWorkers([]);
    }
  }, [get]);

  useEffect(() => {
    if (authLoading || !user?.token) return;
    fetchWorkers();
  }, [authLoading, user?.token, fetchWorkers]);

  const openWorkerModal = (worker) => {
    const jobs = Array.isArray(worker?.assigned_jobs)
      ? worker.assigned_jobs
      : Array.isArray(worker?.jobs)
      ? worker.jobs
      : [];
    setSelectedWorker(worker);
    setWorkerNotes(worker?.notes || "");
    setWorkerJobs(jobs);
    setWorkerModalOpen(true);
  };

  const closeWorkerModal = () => {
    setWorkerModalOpen(false);
    setSelectedWorker(null);
    setWorkerNotes("");
    setWorkerJobs([]);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await post("/team/workers", {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });

    if (res?.success) {
      toast.success(`Invite sent to ${form.email}`);
      setForm({ name: "", email: "", phone: "" });
      setShowAdd(false);
      fetchWorkers();
    } else {
      toast.error(res?.error || "Failed to invite worker");
    }
  };

  const handleDelete = async (worker) => {
    const workerId = worker?.id || worker?._id;
    if (!workerId) return;

    const confirmed = window.confirm(`Remove ${worker?.name || "this worker"}?`);
    if (!confirmed) return;

    const res = await del(`/team/workers/${workerId}`);
    if (res?.success) {
      toast.success("Worker removed");
      if (selectedWorker && (selectedWorker.id === workerId || selectedWorker._id === workerId)) {
        closeWorkerModal();
      }
      fetchWorkers();
    } else {
      toast.error(res?.error || "Failed to remove worker");
    }
  };

  const handleResendInvite = async (workerId, email) => {
    const res = await post(`/team/resend-invite/${workerId}`);
    if (res?.success) {
      toast.success(`Invite resent to ${email}`);
    } else {
      toast.error(res?.error || "Failed to resend invite");
    }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`${API_URL}/api/team/import-csv`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });
      setImportResults(res.data);
      const invited = Number(res?.data?.invited ?? res?.data?.imported ?? 0);
      toast.success(`${invited} worker(s) invited`);
      await fetchWorkers();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "CSV import failed");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveWorkerNotes = async () => {
    const workerId = selectedWorker?.id || selectedWorker?._id;
    if (!workerId) {
      toast.error("Worker not found");
      return;
    }

    setSavingNotes(true);
    try {
      const res = await patch(`/team/workers/${workerId}/notes`, {
        notes: workerNotes,
      });

      if (res?.success) {
        await fetchWorkers();
        setSelectedWorker((prev) =>
          prev ? { ...prev, notes: workerNotes, id: workerId, _id: workerId } : prev
        );
        toast.success("Worker notes saved");
      } else {
        toast.error(res?.error || "Failed to save notes");
      }
    } catch (err) {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (!isEmployer) {
    return (
      <Layout>
        <div className="p-6">
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-8 text-center">
              <Shield className="mx-auto mb-3 text-churvox-muted" size={40} />
              <p className="text-churvox-muted">Only employers can manage team members.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6" data-testid="team-page">
        {!isFeatureEnabled("team") ? (
          <UpgradePrompt feature="team" message="Team management requires a Team plan or higher." />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="team-heading">Team</h1>
                <p className="text-sm text-churvox-muted mt-1">
                  {workers.length} worker{workers.length !== 1 ? "s" : ""}
                  {planData && planData.max_workers >= 0 && (
                    <span className="text-churvox-muted/60"> / {planData.max_workers} max</span>
                  )}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  className="hidden"
                  data-testid="csv-file-input"
                />

                <Button
                  variant="outline"
                  onClick={() => {
                    if (!isFeatureEnabled("csv_team_import")) {
                      toast.error("CSV team import requires a Team plan or higher.");
                      return;
                    }
                    fileInputRef.current?.click();
                  }}
                  disabled={importing}
                  className="border-churvox-border text-churvox-muted hover:text-white"
                  data-testid="csv-import-button"
                >
                  <Upload size={16} className="mr-2" />
                  {importing ? "Importing..." : "CSV Import"}
                </Button>

                <Button
                  onClick={() => {
                    if (!canAddWorker(workers.length)) {
                      toast.error(`Team limit reached for your plan (${includedUsers || 1} users). Upgrade your plan.`);
                      return;
                    }
                    setShowAdd(true);
                  }}
                  className="bg-churvox-accent hover:bg-churvox-accent/90"
                  data-testid="add-worker-button"
                >
                  <UserPlus size={16} className="mr-2" />
                  Invite Worker
                </Button>
              </div>
            </div>

            {importResults && (
              <Card className="bg-churvox-card border-churvox-border" data-testid="csv-import-results">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-white">Import Results</p>
                    <button onClick={() => setImportResults(null)} className="text-churvox-muted hover:text-white text-xs">
                      Dismiss
                    </button>
                  </div>
                  <p className="text-sm text-churvox-muted mb-2">
                    {importResults.invited || 0} invited, {importResults.skipped || 0} skipped of {importResults.total || 0} rows
                  </p>
                  {Array.isArray(importResults.details) && importResults.details.filter((d) => d.status !== "invited").length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResults.details.filter((d) => d.status !== "invited").map((d, i) => (
                        <p key={i} className="text-xs text-churvox-muted/70">
                          Row {d.row}: {d.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {workers.length === 0 && !loading ? (
              <Card className="bg-churvox-card border-churvox-border">
                <CardContent className="p-8 text-center">
                  <UserPlus className="mx-auto mb-3 text-churvox-muted/40" size={32} />
                  <p className="text-white font-medium mb-1">No team members yet</p>
                  <p className="text-xs text-churvox-muted mb-4 max-w-xs mx-auto">
                    Invite workers to join your team.
                  </p>
                  <Button
                    onClick={() => setShowAdd(true)}
                    size="sm"
                    className="bg-churvox-accent hover:bg-churvox-accent/90"
                    data-testid="add-first-worker"
                  >
                    <UserPlus size={14} className="mr-1" />
                    Invite Your First Worker
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {workers.map((worker) => {
                  const workerId = worker.id || worker._id;
                  return (
                    <Card
                      key={workerId}
                      className="bg-churvox-card border-churvox-border"
                      data-testid={`worker-card-${workerId}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => openWorkerModal(worker)}
                          >
                            <div className="text-white font-semibold">
                              {worker.name || "Unnamed Worker"}
                            </div>
                            <div className="text-sm text-churvox-muted">
                              {worker.email || "-"}
                            </div>
                            <div className="text-sm text-churvox-muted">
                              {worker.phone || "-"}
                            </div>
                            {worker.status && (
                              <div className="text-xs text-churvox-muted mt-1">
                                Status: {worker.status}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {worker.status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvite(workerId, worker.email)}
                                className="border-churvox-border text-churvox-muted hover:text-white"
                              >
                                <RefreshCw size={14} />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(worker)}
                              className="border-red-500/30 text-red-400 hover:text-red-300"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-churvox-card border-churvox-border text-white">
          <DialogHeader>
            <DialogTitle>Invite Worker</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label htmlFor="worker-name">Name</Label>
              <Input
                id="worker-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-churvox-bg border-churvox-border text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="worker-email">Email</Label>
              <Input
                id="worker-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-churvox-bg border-churvox-border text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="worker-phone">Phone</Label>
              <Input
                id="worker-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="bg-churvox-bg border-churvox-border text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-churvox-accent hover:bg-churvox-accent/90">
                Send Invite
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {workerModalOpen && selectedWorker && (
        <div
          className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4"
          onClick={closeWorkerModal}
        >
          <div
            className="bg-churvox-card border border-churvox-border text-white max-w-2xl w-full rounded-xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-xl font-semibold">{selectedWorker?.name || "Worker"}</div>
              <button
                type="button"
                onClick={closeWorkerModal}
                className="text-white/70 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="rounded-lg border border-churvox-border p-4">
              <div className="text-sm text-churvox-muted">Email</div>
              <div className="text-white">{selectedWorker.email || "-"}</div>
            </div>

            <div className="rounded-lg border border-churvox-border p-4">
              <div className="text-sm text-churvox-muted">Phone</div>
              <div className="text-white">{selectedWorker.phone || "-"}</div>
            </div>

            <div className="rounded-lg border border-churvox-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-white font-medium">Worker Notes</div>
                <Button
                  type="button"
                  onClick={saveWorkerNotes}
                  disabled={savingNotes}
                  className="bg-churvox-accent hover:bg-churvox-accent/90"
                >
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>

              <textarea
                value={workerNotes}
                onChange={(e) => setWorkerNotes(e.target.value)}
                placeholder="Add notes for this worker..."
                rows={5}
                className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3 outline-none"
              />
            </div>

            <div className="rounded-lg border border-churvox-border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-white font-medium">Assigned Jobs</div>
                <Button
                  type="button"
                  onClick={() => navigate(`/jobs/new?workerId=${selectedWorker.id || selectedWorker._id}`)}
                  className="bg-churvox-accent hover:bg-churvox-accent/90"
                >
                  Add / Assign Job
                </Button>
              </div>

              {workerJobs.length > 0 ? (
                <div className="space-y-3">
                  {workerJobs.map((job, index) => {
                    const jobId = job.id || job._id;
                    return (
                      <div key={jobId || index} className="rounded-lg border border-churvox-border p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-white font-medium">{job.title || job.job_type || "Job"}</div>
                          <div className="text-sm text-churvox-muted">{job.client_name || "-"}</div>
                          <div className="text-sm text-churvox-muted">{job.address || "-"}</div>
                          <div className="text-sm text-churvox-muted">Status: {job.status || "-"}</div>
                          <div className="text-sm text-churvox-muted">
                            Date: {job.scheduled_date ? String(job.scheduled_date).slice(0, 10) : "-"}
                          </div>
                        </div>

                        {jobId && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/jobs/${jobId}`)}
                          >
                            Open Job
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-churvox-muted">No assigned jobs yet.</div>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={closeWorkerModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
