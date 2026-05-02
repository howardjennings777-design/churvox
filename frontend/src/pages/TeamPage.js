import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { UserPlus, Trash2, Upload, RefreshCw, Shield, Sparkles, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { UpgradePrompt } from "../components/UpgradePrompt";
import { PremiumAIBox } from "../components/premium";
import axios from "axios"
import API_BASE from "../lib/apiBase";

axios.defaults.withCredentials = true;

const COUNTRY_OPTIONS = [
  { value: "New Zealand", label: "New Zealand" },
  { value: "Australia", label: "Australia" },
];

const REGION_OPTIONS = {
  "New Zealand": [
    "Northland",
    "Auckland",
    "Waikato",
    "Bay of Plenty",
    "Gisborne",
    "Hawke's Bay",
    "Taranaki",
    "Manawatu-Whanganui",
    "Wellington",
    "Tasman",
    "Nelson",
    "Marlborough",
    "West Coast",
    "Canterbury",
    "Otago",
    "Southland",
  ],
  "Australia": [
    "New South Wales",
    "Victoria",
    "Queensland",
    "Western Australia",
    "South Australia",
    "Tasmania",
    "Northern Territory",
    "Australian Capital Territory",
  ],
};

function getRegionOptions(country) {
  return REGION_OPTIONS[country] || [];
}

export default function TeamPage() {
  const navigate = useNavigate();
  const { user, isEmployer, isOwnerUser, loading: authLoading } = useAuth();
  const { get, post, del, patch, loading } = useApi();
  const {
    plan,
    includedUsers,
    canUseTeamManagement,
    features,
  } = usePlanLimits(user?.plan);

  const safePlan = normalizePlan(user?.plan || plan);
  const canUseOwnerCsv = !!isEmployer && (isOwnerUser || hasPlanAccess(safePlan, "team"));

  const [workers, setWorkers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingWorkerGeo, setSavingWorkerGeo] = useState(false);
  const [workerJobs, setWorkerJobs] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "New Zealand", region: "", invite_role: "worker" });
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const roleLabelMap = {
    owner: "Owner",
    manager: "Manager",
    office_admin: "Office Admin",
    payroll: "Payroll",
    worker: "Worker",
  };

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
    if (isOwnerUser) return true;
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

  const openWorkerPanel = (worker) => {
    const jobs = Array.isArray(worker?.assigned_jobs)
      ? worker.assigned_jobs
      : Array.isArray(worker?.jobs)
      ? worker.jobs
      : [];
    setSelectedWorker(worker);
    setWorkerNotes(worker?.notes || "");
    setWorkerJobs(jobs);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeWorkerPanel = () => {
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
      country: String(form.country || "New Zealand").trim(),
      region: String(form.region || "").trim(),
      role: form.invite_role || "worker",
    });

    if (res?.success) {
      toast.success(`Invite sent to ${form.email}`);
      setForm({ name: "", email: "", phone: "", country: "New Zealand", region: "", invite_role: "worker" });
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
      if (selectedWorker && ((selectedWorker.id || selectedWorker._id) === workerId)) {
        closeWorkerPanel();
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
      const res = await axios.post(`${API_BASE}/api/team/import-csv`, formData, {
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


  const saveWorkerGeo = async () => {
    const workerId = selectedWorker?.id || selectedWorker?._id;
    if (!workerId) return;

    setSavingWorkerGeo(true);
    try {
      const payload = {
        country: String(selectedWorker?.country || "New Zealand").trim() || "New Zealand",
        region: String(selectedWorker?.region || "").trim(),
      };

      const res = await patch(`/team/workers/${workerId}`, payload);

      if (res?.success) {
        toast.success("Worker location updated");
        setWorkers((prev) => prev.map((worker) => {
          const id = worker.id || worker._id;
          return String(id) === String(workerId)
            ? { ...worker, ...payload }
            : worker;
        }));
        setSelectedWorker((prev) => prev ? { ...prev, ...payload } : prev);
      } else {
        toast.error(res?.error || "Failed to save worker location");
      }
    } catch {
      toast.error("Failed to save worker location");
    } finally {
      setSavingWorkerGeo(false);
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
        setSelectedWorker((prev) => (prev ? { ...prev, notes: workerNotes } : prev));
        toast.success("Worker notes saved");
      } else {
        toast.error(res?.error || "Failed to save notes");
      }
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  if (!isEmployer) {
    return (
      <Layout>
        <div className="p-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-8 text-center">
              <Shield className="mx-auto mb-3 text-slate-500" size={40} />
              <p className="text-slate-500">Only employers can manage team members.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="cx-page max-w-5xl" data-testid="team-page">
        {!isOwnerUser && !isFeatureEnabled("team") ? (
          <UpgradePrompt feature="team" message="Team management requires a Team plan or higher." />
        ) : (
          <>
            <div className="cx-page-hero flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="cx-page-title" data-testid="team-heading">Team</h1>
                <p className="cx-page-subtitle">
                  {workers.length} worker{workers.length !== 1 ? "s" : ""}
                  {planData && planData.max_workers >= 0 && (
                    <span className="text-slate-500/60"> / {planData.max_workers} max</span>
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
                  className="border-slate-200 text-slate-500 hover:text-slate-900"
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
                    setShowAdd((prev) => !prev);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="add-worker-button"
                >
                  <UserPlus size={16} className="mr-2" />
                  {showAdd ? "Close Invite" : "Invite Worker"}
                </Button>
              </div>
            </div>

            <PremiumAIBox
              title="AI Team Assistant"
              subtitle="Crew insights, role suggestions and onboarding drafts — review before sending"
              chip="Approval-first"
              notice="AI never makes payroll, tax or compliance decisions. Worker invites are always actioned by you."
              suggestions={[
                workers.length === 0
                  ? { icon: <UserPlus className="h-4 w-4" />, title: "Invite your first worker", description: "Send a CSV of crew members or invite individually." }
                  : { icon: <Sparkles className="h-4 w-4" />, title: `${workers.length} active crew member${workers.length === 1 ? "" : "s"}`, description: "AI can suggest assignments based on region, trade and availability." },
                { icon: <ShieldCheck className="h-4 w-4" />, title: "Role-based access is on", description: "Workers don’t see pricing, owner-only reports or admin pages." },
                planData?.max_workers >= 0 && workers.length >= (planData.max_workers - 1)
                  ? { icon: <AlertTriangle className="h-4 w-4" />, title: "Approaching team limit", description: "Upgrade your plan to add more workers." }
                  : null,
              ].filter(Boolean)}
            />

            {showAdd && (
              <Card className="bg-white border-slate-200 shadow-lg shadow-black/20">
                <CardContent className="p-6 space-y-4 text-slate-900">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Invite Worker</div>
                    <div className="text-sm text-slate-500 mt-1">
                      Add a worker with country and region/state for assignment matching.
                    </div>
                  </div>

                  <form onSubmit={handleAdd} className="space-y-4">
                    <div>
                      <Label htmlFor="worker-name-inline">Name</Label>
                      <Input
                        id="worker-name-inline"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>

                    <div>
                      <Label htmlFor="worker-email-inline">Email</Label>
                      <Input
                        id="worker-email-inline"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>

                    <div>
                      <Label htmlFor="worker-phone-inline">Phone</Label>
                      <Input
                        id="worker-phone-inline"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-slate-900"
                      />
                    </div>

                    <div>
                      <Label htmlFor="worker-role-inline">Role</Label>
                      <select
                        id="worker-role-inline"
                        value={form.invite_role || "worker"}
                        onChange={(e) => setForm({ ...form, invite_role: e.target.value })}
                        className="w-full h-10 min-h-[40px] rounded-md border border-slate-300 bg-white px-3 pr-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        data-testid="invite-role-select"
                      >
                        <option value="manager">Manager</option>
                        <option value="office_admin">Office Admin</option>
                        <option value="worker">Worker</option>
                        <option value="payroll">Payroll</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="worker-country-inline">Country</Label>
                      <select
                        id="worker-country-inline"
                        value={form.country || "New Zealand"}
                        onChange={(e) => setForm({ ...form, country: e.target.value, region: "" })}
                        className="w-full h-10 min-h-[40px] rounded-md border border-slate-300 bg-white px-3 pr-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        data-testid="invite-country-select"
                      >
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="worker-region-inline">Region / State</Label>
                      <select
                        id="worker-region-inline"
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        className="w-full h-10 min-h-[40px] rounded-md border border-slate-300 bg-white px-3 pr-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        data-testid="invite-region-select"
                      >
                        <option value="">Select region / state</option>
                        {getRegionOptions(form.country || "New Zealand").map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAdd(false);
                          setForm({ name: "", email: "", phone: "", country: "New Zealand", region: "", invite_role: "worker" });
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                        Send Invite
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {selectedWorker && (
              <Card className="bg-white border-slate-200 shadow-lg shadow-black/20 overflow-hidden">
                <div className="h-1 w-full bg-blue-600/80" />
                <CardContent className="p-6 space-y-5 text-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <div className="h-10 w-10 rounded-full bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-600">
                          {String(selectedWorker?.name || "W").trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xl font-semibold leading-tight">{selectedWorker?.name || "Worker"}</div>
                          <div className="text-xs text-slate-500">
                            Team member details and assigned work
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                          {selectedWorker?.status ? `Status: ${selectedWorker.status}` : "Status: active"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                          Country: {selectedWorker?.country || "New Zealand"} • Region: {selectedWorker?.region || "-"}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
                          {workerJobs.length} assigned job{workerJobs.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeWorkerPanel}
                      className="border-slate-200 text-slate-500 hover:text-slate-900"
                    >
                      Close
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Email</div>
                      <div className="text-slate-900 break-all font-medium">{selectedWorker.email || "-"}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Phone</div>
                      <div className="text-slate-900 font-medium">{selectedWorker.phone || "-"}</div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Country</div>
                      <select
                        value={selectedWorker?.country || "New Zealand"}
                        onChange={(e) => setSelectedWorker((prev) => prev ? { ...prev, country: e.target.value, region: "" } : prev)}
                        className="w-full h-10 min-h-[40px] rounded-md border border-slate-300 bg-white px-3 pr-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {COUNTRY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Region / State</div>
                      <select
                        value={selectedWorker?.region || ""}
                        onChange={(e) => setSelectedWorker((prev) => prev ? { ...prev, region: e.target.value } : prev)}
                        className="w-full h-10 min-h-[40px] rounded-md border border-slate-300 bg-white px-3 pr-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select region / state</option>
                        {getRegionOptions(selectedWorker?.country || "New Zealand").map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>

                      <Button
                        type="button"
                        onClick={saveWorkerGeo}
                        disabled={savingWorkerGeo}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {savingWorkerGeo ? "Saving..." : "Save Location"}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/25 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-slate-900 font-semibold">Worker Notes</div>
                        <div className="text-xs text-slate-500">Private notes for this team member</div>
                      </div>
                      <Button
                        type="button"
                        onClick={saveWorkerNotes}
                        disabled={savingNotes}
                        className="bg-blue-600 hover:bg-blue-700 text-slate-900 min-w-[120px]"
                      >
                        {savingNotes ? "Saving..." : "Save Notes"}
                      </Button>
                    </div>

                    <textarea
                      value={workerNotes}
                      onChange={(e) => setWorkerNotes(e.target.value)}
                      placeholder="Add notes for this worker..."
                      rows={5}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 p-3 outline-none"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/25 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-slate-900 font-semibold">Assigned Jobs</div>
                        <div className="text-xs text-slate-500">Jobs currently linked to this worker</div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => navigate(`/jobs/new?workerId=${selectedWorker.id || selectedWorker._id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Add / Assign Job
                      </Button>
                    </div>

                    {workerJobs.length > 0 ? (
                      <div className="space-y-3">
                        {workerJobs.map((job, index) => {
                          const jobId = job.id || job._id;
                          return (
                            <div key={jobId || index} className="rounded-lg border border-slate-200 p-3 flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-slate-900 font-medium">{job.title || job.job_type || "Job"}</div>
                                <div className="text-sm text-slate-500">{job.client_name || "-"}</div>
                                <div className="text-sm text-slate-500">{job.address || "-"}</div>
                                <div className="text-sm text-slate-500">Status: {job.status || "-"}</div>
                                <div className="text-sm text-slate-500">
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
                      <div className="text-sm text-slate-500">No assigned jobs yet.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {importResults && (
              <Card className="bg-white border-slate-200 shadow-sm" data-testid="csv-import-results">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-900">Import Results</p>
                    <button onClick={() => setImportResults(null)} className="text-slate-500 hover:text-slate-900 text-xs">
                      Dismiss
                    </button>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">
                    {importResults.invited || 0} invited, {importResults.skipped || 0} skipped of {importResults.total || 0} rows
                  </p>
                  {Array.isArray(importResults.details) && importResults.details.filter((d) => d.status !== "invited").length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {importResults.details.filter((d) => d.status !== "invited").map((d, i) => (
                        <p key={i} className="text-xs text-slate-500/70">
                          Row {d.row}: {d.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {loading && workers.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
              </div>
            ) : workers.length === 0 && !loading ? (
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-8 text-center">
                  <UserPlus className="mx-auto mb-3 text-slate-500/40" size={32} />
                  <p className="text-slate-900 font-medium mb-1">No team members yet</p>
                  <p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">
                    Invite workers to join your team.
                  </p>
                  <Button
                    onClick={() => setShowAdd(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
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
                      className="bg-white border-slate-200 hover:border-blue-600/40 transition-colors shadow-sm shadow-black/10"
                      data-testid={`worker-card-${workerId}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            className="flex-1 text-left"
                            onClick={() => openWorkerPanel(worker)}
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-11 w-11 rounded-full bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                                {String(worker.name || "W").trim().charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="text-slate-900 font-semibold">
                                    {worker.name || "Unnamed Worker"}
                                  </div>
                                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                    {roleLabelMap[String(worker.role || "worker").toLowerCase()] || "Worker"}
                                  </span>
                                  {worker.status && (
                                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500">
                                      {worker.status}
                                    </span>
                                  )}
                                </div>

                                <div className="text-sm text-slate-500 mt-1 break-all">
                                  {worker.email || "-"}
                                </div>
                                <div className="text-sm text-slate-500">
                                  {worker.phone || "-"}
                                </div>
                                <div className="mt-2">
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">
                                    Country: {worker.country || "New Zealand"} • Region: {worker.region || "-"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-2 shrink-0">
                            {(worker.status === "pending" || worker.status === "invited") && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvite(workerId, worker.email)}
                                className="border-slate-200 text-slate-500 hover:text-slate-900"
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


    </Layout>
  );
}
