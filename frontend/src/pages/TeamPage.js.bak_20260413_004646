import { useNavigate } from "react-router-dom";
import React, { useState, useEffect, useCallback, useRef } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { UserPlus, Trash2, Phone, Mail, Shield, Upload, RefreshCw, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { UpgradePrompt } from "../components/UpgradePrompt";
import axios from "axios";
axios.defaults.withCredentials = true;

const API_URL = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_BACKEND_URL) || "https://grassley-backend.onrender.com").replace(/\/$/, "");

export default function TeamPage() {
  const navigate = useNavigate();
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerJobs, setWorkerJobs] = useState([]);
  const [workerModalOpen, setWorkerModalOpen] = useState(false);
  const [workerNotes, setWorkerNotes] = useState("");
  const { user, isEmployer, loading: authLoading } = useAuth();
  const { get, post, patch, del, loading } = useApi();
  const {
    plan,
    includedUsers,
    canUseTeamManagement,
    features,
  } = usePlanLimits(user?.plan);

  const safePlan = normalizePlan(user?.plan || plan || "solo");
  const canUseOwnerCsv = !!isEmployer && hasPlanAccess(safePlan, "team");

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

  const [workers, setWorkers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [deleteId, setDeleteId] = useState(null);
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchWorkers = useCallback(async () => {
    const res = await get("/team/workers");
    if (res.success) setWorkers(res.data);
  }, [get]);

  useEffect(() => {
    if (authLoading || !user?.token) return;
    fetchWorkers();
  }, [authLoading, user?.token, fetchWorkers]);


  const openWorkerDetail = async (worker) => {
    setSelectedWorker(worker);
    setWorkerJobs([]);
    setWorkerNotes(worker?.notes || "");
    setWorkerModalOpen(true);

    try {
      const res = await get("/jobs");
      const allJobs = res?.success && Array.isArray(res.data) ? res.data : [];
      const workerId = String(worker?.id || worker?._id || "");

      const filtered = allJobs
        .filter((job) => String(job.assigned_worker_id || "") === workerId)
        .map((job) => ({
          id: job.id || job._id,
          title: job.title || "Untitled Job",
          customer_name: job.customer_name || job.client_name || "No client",
          address: job.address || "No address",
          status: job.status || "assigned",
          scheduled_date: job.scheduled_date || "",
          scheduled_time: job.scheduled_time || "",
        }));

      setWorkerJobs(filtered);
    } catch (err) {
      console.error("WORKER_DETAIL_LOAD_ERROR", err);
      setWorkerJobs([]);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const res = await post("/team/workers", form);
    if (res.success) {
      toast.success(`Invite sent to ${form.email}`);
      setForm({ name: "", email: "", phone: "" });
      setShowAdd(false);
      fetchWorkers();
    } else {
      toast.error(res.error || "Failed to invite worker");
    }
  };


  const saveWorkerNotes = async () => {
    if (!selectedWorker?.id && !selectedWorker?._id) return;

    const workerId = selectedWorker.id || selectedWorker._id;
    const res = await patch(`/team/workers/${workerId}/notes`, { notes: workerNotes });

    if (res?.success) {
      toast.success("Worker notes saved");
      setSelectedWorker((prev) => prev ? { ...prev, notes: workerNotes } : prev);
    } else {
      toast.error(res?.error || "Failed to save notes");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const res = await del(`/team/workers/${deleteId}`);
    if (res.success) {
      toast.success("Worker removed");
      setDeleteId(null);
      fetchWorkers();
    } else {
      toast.error(res.error || "Failed to remove worker");
    }
  };

  const handleResendInvite = async (workerId, email) => {
    const res = await post(`/team/resend-invite/${workerId}`);
    if (res.success) {
      toast.success(`Invite resent to ${email}`);
    } else {
      toast.error(res.error || "Failed to resend invite");
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white" data-testid="team-heading">Team</h1>
                <p className="text-sm text-churvox-muted mt-1">
                  {workers.length} worker{workers.length !== 1 ? "s" : ""}
                  {planData && planData.max_workers >= 0 && (
                    <span className="text-churvox-muted/60"> / {planData.max_workers} max</span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
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
                  <UserPlus size={16} className="mr-2" /> Invite Worker
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
                    {importResults.invited} invited, {importResults.skipped} skipped of {importResults.total} rows
                  </p>
                  {importResults.details?.filter((d) => d.status !== "invited").length > 0 && (
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
                    Invite workers to join your team. They'll receive an email to set up their account and can then view and update their assigned work.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button onClick={() => setShowAdd(true)} size="sm" className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="add-first-worker">
                      <UserPlus size={14} className="mr-1" /> Invite Your First Worker
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!isFeatureEnabled("csv_team_import")) {
                          toast.error("CSV team import is for owners on Team, Pro, or Enterprise.");
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className="border-churvox-border text-churvox-muted hover:text-white"
                      data-testid="csv-import-first"
                    >
                      <Upload size={14} className="mr-1" /> Import CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {workers.map((w) => (
                  <Card key={w.id} className="bg-churvox-card border-churvox-border" data-testid={`worker-card-${w.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-churvox-accent/20 flex items-center justify-center text-churvox-accent font-bold text-sm">
                          {w.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => openWorkerDetail(w)} className="text-white font-medium underline text-left">{w.name}</button>
                            {w.status === "invited" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" data-testid={`worker-status-invited-${w.id}`}>
                                <Clock size={10} /> Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20" data-testid={`worker-status-active-${w.id}`}>
                                <CheckCircle size={10} /> Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-churvox-muted mt-0.5">
                            <span className="flex items-center gap-1"><Mail size={12} /> {w.email}</span>
                            {w.phone && <span className="flex items-center gap-1"><Phone size={12} /> {w.phone}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {w.status === "invited" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResendInvite(w.id, w.email)}
                            className="text-churvox-muted hover:text-white hover:bg-white/5"
                            data-testid={`resend-invite-${w.id}`}
                            title="Resend invite email"
                          >
                            <RefreshCw size={14} />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(w.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10" data-testid={`delete-worker-${w.id}`}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={showAdd} onOpenChange={setShowAdd}>
              <DialogContent className="bg-churvox-card border-churvox-border" data-testid="add-worker-dialog">
                <DialogHeader>
                  <DialogTitle className="text-white">Invite Worker</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div>
                    <Label className="text-churvox-muted">Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" placeholder="Full name" data-testid="worker-name-input" />
                  </div>
                  <div>
                    <Label className="text-churvox-muted">Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" placeholder="email@example.com" data-testid="worker-email-input" />
                  </div>
                  <div>
                    <Label className="text-churvox-muted">Phone (optional)</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" placeholder="0400 000 000" data-testid="worker-phone-input" />
                  </div>
                  <p className="text-xs text-churvox-muted/70">
                    An invite email will be sent. The worker will set their own password when they accept.
                  </p>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowAdd(false)} className="border-churvox-border text-churvox-muted">Cancel</Button>
                    <Button type="submit" disabled={loading} className="bg-churvox-accent hover:bg-churvox-accent/90" data-testid="submit-worker-button">
                      {loading ? "Sending..." : "Send Invite"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

                    {!!deleteId && (
          <div
            className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setDeleteId(null)}
            data-testid="delete-worker-modal-overlay"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-churvox-border bg-churvox-card shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              data-testid="delete-worker-modal"
            >
              <div className="flex items-center justify-between p-4 border-b border-churvox-border">
                <h2 className="text-white font-semibold text-lg">Remove Worker</h2>
                <button
                  type="button"
                  onClick={() => setDeleteId(null)}
                  className="text-churvox-muted hover:text-white text-xl leading-none"
                  data-testid="close-delete-worker-modal"
                >
                  ×
                </button>
              </div>

              <div className="p-4">
                <p className="text-churvox-muted">
                  Are you sure you want to remove this worker? This cannot be undone.
                </p>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDeleteId(null)}
                    className="border-churvox-border text-churvox-muted"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    data-testid="confirm-delete-worker"
                  >
                    {loading ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      {workerModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border border-churvox-border bg-churvox-card p-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{selectedWorker.name || "Worker"}</h2>
                <p className="text-sm text-churvox-muted">{selectedWorker.email || ""}</p>
              </div>
              <button
                type="button"
                onClick={() => setWorkerModalOpen(false)}
                className="px-3 py-2 rounded-md border border-churvox-border text-churvox-muted"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-churvox-border p-3">
                <div className="text-sm text-churvox-muted mb-1">Phone</div>
                <div className="text-white">{selectedWorker.phone || "-"}</div>
              </div>

              <div className="rounded-lg border border-churvox-border p-3">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-white font-medium">Worker Notes</div>
                  <button
                    type="button"
                    onClick={saveWorkerNotes}
                    className="px-3 py-2 rounded-md bg-churvox-accent text-white"
                  >
                    Save Notes
                  </button>
                </div>
                <textarea
                  value={workerNotes}
                  onChange={(e) => setWorkerNotes(e.target.value)}
                  placeholder="Add notes for this worker..."
                  className="w-full min-h-[120px] rounded-md border border-churvox-border bg-churvox-bg px-3 py-2 text-white"
                />
              </div>

              <div className="rounded-lg border border-churvox-border p-3">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-white font-medium">Assigned Jobs</div>
                  <button
                    type="button"
                    onClick={() => navigate(`/jobs/new?workerId=${selectedWorker.id || selectedWorker._id}`)}
                    className="px-3 py-2 rounded-md bg-churvox-accent text-white"
                  >
                    Add / Assign Job
                  </button>
                </div>

                {workerJobs.length === 0 ? (
                  <div className="text-sm text-churvox-muted">No jobs assigned yet.</div>
                ) : (
                  <div className="space-y-3">
                    {workerJobs.map((job) => (
                      <div key={job.id} className="rounded-lg border border-churvox-border p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-white font-medium">{job.title}</div>
                            <div className="text-sm text-churvox-muted">{job.customer_name}</div>
                            <div className="text-sm text-churvox-muted">{job.address}</div>
                            <div className="text-sm text-churvox-muted">
                              Status: {job.status}
                            </div>
                            {!!(job.scheduled_date || job.scheduled_time) && (
                              <div className="text-sm text-churvox-muted">
                                {job.scheduled_date ? `Date: ${String(job.scheduled_date).slice(0, 10)}` : ""}
                                {job.scheduled_date && job.scheduled_time ? " · " : ""}
                                {job.scheduled_time ? `Time: ${job.scheduled_time}` : ""}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/jobs/${job.id}`)}
                            className="px-3 py-2 rounded-md border border-churvox-border text-white whitespace-nowrap"
                          >
                            Open Job
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
