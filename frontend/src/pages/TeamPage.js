// CHURVOX_PREMIUM_TRADIE_REDESIGN_ACTIVE
// CHURVOX_NEW_FRONTEND_REAL_PAGE
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useApi } from "../hooks/useApi";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { UserPlus, Trash2, Upload, RefreshCw, Shield, Briefcase, Users, MapPin, CalendarDays, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { hasPlanAccess, normalizePlan } from "../utils/planRules";
import { UpgradePrompt } from "../components/UpgradePrompt";
import axios from "axios";
import API_BASE from "../lib/apiBase";

axios.defaults.withCredentials = true;

const COUNTRY_OPTIONS = [
  { value: "New Zealand", label: "New Zealand" },
  { value: "Australia", label: "Australia" },
];

const REGION_OPTIONS = {
  "New Zealand": [
    "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki",
    "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland",
  ],
  "Australia": [
    "New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory",
  ],
};

function getRegionOptions(country) {
  return REGION_OPTIONS[country] || [];
}

function str(value) {
  return String(value || "").trim();
}

function lower(value) {
  return str(value).toLowerCase();
}

function jobId(job) {
  return job?.id || job?._id;
}

function workerId(worker) {
  return worker?.id || worker?._id;
}

function getJobTitle(job) {
  return job?.title || job?.job_type || job?.type || "Job";
}

function getJobClient(job) {
  return job?.client_name || job?.customer_name || job?.client?.name || job?.customer?.name || "Unknown client";
}

function getClientKey(job) {
  return str(job?.client_id || job?.customer_id || job?.client?.id || job?.client?._id || job?.customer?.id || job?.customer?._id || getJobClient(job) || job?.address);
}

function getJobDate(job) {
  return job?.scheduled_date || job?.date || job?.start_date || job?.created_at || "";
}

function dateValue(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(value) {
  const parsed = dateValue(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function jobMatchesWorker(job, worker) {
  const id = str(workerId(worker));
  const email = lower(worker?.email);
  const name = lower(worker?.name);
  const jobWorkerIds = [job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assigned_worker?.id, job?.assigned_worker?._id].map(str);
  const jobWorkerEmail = lower(job?.assigned_worker_email || job?.worker_email || job?.assigned_worker?.email);
  const jobWorkerName = lower(job?.assigned_worker_name || job?.worker_name || job?.assigned_worker?.name);

  if (id && jobWorkerIds.includes(id)) return true;
  if (email && jobWorkerEmail === email) return true;
  if (name && jobWorkerName === name) return true;
  return false;
}


function normalizeRegionName(value) {
  return lower(value).replace(/[^a-z0-9]+/g, " ").trim();
}

const ADDRESS_REGION_HINTS = [
  { region: "northland", words: ["northland", "whangarei", "whangārei", "kaitaia", "kerikeri", "kaikohe", "dargaville", "paihia", "ruakaka", "mangawhai"] },
  { region: "auckland", words: ["auckland", "manukau", "waitakere", "albany", "takapuna", "papakura", "pukekohe"] },
  { region: "waikato", words: ["waikato", "hamilton", "cambridge", "te awamutu", "huntly", "taupo", "matamata"] },
  { region: "bay of plenty", words: ["bay of plenty", "tauranga", "rotorua", "whakatane", "katikati", "te puke"] },
  { region: "gisborne", words: ["gisborne", "tairawhiti"] },
  { region: "hawke s bay", words: ["hawke", "napier", "hastings", "wairoa"] },
  { region: "taranaki", words: ["taranaki", "new plymouth", "hawera", "stratford"] },
  { region: "manawatu whanganui", words: ["manawatu", "whanganui", "palmerston north", "levin", "feilding"] },
  { region: "wellington", words: ["wellington", "porirua", "lower hutt", "upper hutt", "kapiti", "paraparaumu", "masterton", "wainuiomata"] },
  { region: "tasman", words: ["tasman", "motueka", "richmond"] },
  { region: "nelson", words: ["nelson"] },
  { region: "marlborough", words: ["marlborough", "blenheim", "picton"] },
  { region: "west coast", words: ["west coast", "greymouth", "hokitika", "westport"] },
  { region: "canterbury", words: ["canterbury", "christchurch", "ashburton", "timaru", "rangiora"] },
  { region: "otago", words: ["otago", "dunedin", "queenstown", "wanaka", "alexandra"] },
  { region: "southland", words: ["southland", "invercargill", "gore"] },
];

function inferRegionFromAddress(job) {
  const text = normalizeRegionName([
    job?.region,
    job?.job_region,
    job?.service_region,
    job?.client_region,
    job?.customer_region,
    job?.client?.region,
    job?.customer?.region,
    job?.address,
    job?.client_address,
    job?.customer_address,
  ].filter(Boolean).join(" "));
  if (!text) return "";
  for (const hint of ADDRESS_REGION_HINTS) {
    if (hint.words.some((word) => text.includes(normalizeRegionName(word)))) return hint.region;
  }
  return text;
}

function jobMatchesWorkerRegion(job, worker) {
  const workerRegion = normalizeRegionName(worker?.region);
  if (!workerRegion) return true;
  const jobRegion = inferRegionFromAddress(job);
  if (!jobRegion) return true;
  return normalizeRegionName(jobRegion) === workerRegion;
}

function filterWorkerJobsForWorkerRegion(jobs, worker) {
  if (!Array.isArray(jobs)) return [];
  return jobs.filter((job) => jobMatchesWorkerRegion(job, worker));
}

function buildWorkerClientHistory(jobs) {
  const map = new Map();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  (Array.isArray(jobs) ? jobs : []).forEach((job) => {
    const key = getClientKey(job);
    if (!key) return;

    const existing = map.get(key) || {
      key,
      id: job?.client_id || job?.customer_id || job?.client?.id || job?.client?._id || job?.customer?.id || job?.customer?._id,
      name: getJobClient(job),
      phone: job?.client_phone || job?.customer_phone || job?.client?.phone || job?.customer?.phone || job?.phone || "",
      email: job?.client_email || job?.customer_email || job?.client?.email || job?.customer?.email || "",
      address: job?.client_address || job?.customer_address || job?.address || "",
      jobs: 0,
      completed: 0,
      lastDate: null,
      nextDate: null,
      lastJobId: null,
      nextJobId: null,
    };

    existing.jobs += 1;
    if (lower(job?.status) === "completed") existing.completed += 1;

    if (!existing.phone) existing.phone = job?.phone || "";
    if (!existing.email) existing.email = job?.email || "";
    if (!existing.address) existing.address = job?.address || "";

    const parsed = dateValue(getJobDate(job));
    if (parsed) {
      if (!existing.lastDate || parsed > existing.lastDate) {
        existing.lastDate = parsed;
        existing.lastJobId = jobId(job);
      }
      if (parsed >= now && (!existing.nextDate || parsed < existing.nextDate)) {
        existing.nextDate = parsed;
        existing.nextJobId = jobId(job);
      }
    }

    map.set(key, existing);
  });

  return Array.from(map.values()).sort((a, b) => (b.lastDate?.getTime() || 0) - (a.lastDate?.getTime() || 0));
}

export default function TeamPage() {
  const navigate = useNavigate();
  const { user, isEmployer, isOwnerUser, loading: authLoading } = useAuth();
  const { get, post, del, patch, loading } = useApi();
  const { plan, includedUsers, canUseTeamManagement, features } = usePlanLimits(user?.plan);

  const safePlan = normalizePlan(user?.plan || plan);
  const canUseOwnerCsv = !!isEmployer && (isOwnerUser || hasPlanAccess(safePlan, "team"));

  const [workers, setWorkers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [workerNotes, setWorkerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingWorkerGeo, setSavingWorkerGeo] = useState(false);
  const [workerJobs, setWorkerJobs] = useState([]);
  const [workerJobsLoading, setWorkerJobsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", country: "New Zealand", region: "", invite_role: "worker" });
  const [importResults, setImportResults] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const regionMatchedWorkerJobs = useMemo(() => filterWorkerJobsForWorkerRegion(workerJobs, selectedWorker), [workerJobs, selectedWorker]);
  const hiddenRegionMismatchCount = Math.max(0, workerJobs.length - regionMatchedWorkerJobs.length);
  const workerClients = useMemo(() => buildWorkerClientHistory(regionMatchedWorkerJobs), [regionMatchedWorkerJobs]);

  const isFeatureEnabled = (key) => {
    const normalized = lower(key);
    if (normalized === "team" || normalized === "teammanagement" || normalized === "team_management") return !!canUseTeamManagement;
    if (normalized === "csvteamimport" || normalized === "csv_team_import") return !!canUseOwnerCsv;
    return !!features?.[key];
  };

  const canAddWorker = (currentCount) => {
    if (isOwnerUser) return true;
    return currentCount < Number(includedUsers || 1);
  };

  const fetchWorkers = useCallback(async () => {
    const res = await get("/team/workers");
    setWorkers(res?.success && Array.isArray(res.data) ? res.data : []);
  }, [get]);

  useEffect(() => {
    if (authLoading) return;
    fetchWorkers();
  }, [authLoading, fetchWorkers]);

  const openWorkerPanel = async (worker) => {
    const existingJobs = Array.isArray(worker?.assigned_jobs)
      ? worker.assigned_jobs
      : Array.isArray(worker?.jobs)
      ? worker.jobs
      : [];

    setSelectedWorker(worker);
    setWorkerNotes(worker?.notes || "");
    setWorkerJobs(existingJobs);
    setWorkerJobsLoading(true);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const res = await get("/jobs");
      if (res?.success && Array.isArray(res.data)) {
        const matched = res.data.filter((job) => jobMatchesWorker(job, worker));
        if (matched.length > 0 || existingJobs.length === 0) setWorkerJobs(matched);
      }
    } catch {
      // Keep the jobs already attached to the worker card if the wider jobs lookup is unavailable.
    } finally {
      setWorkerJobsLoading(false);
    }
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
      country: str(form.country || "New Zealand"),
      region: str(form.region),
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
    const id = workerId(worker);
    if (!id) return;
    if (!window.confirm(`Remove ${worker?.name || "this worker"}?`)) return;

    const res = await del(`/team/workers/${id}`);
    if (res?.success) {
      toast.success("Worker removed");
      if (selectedWorker && String(workerId(selectedWorker)) === String(id)) closeWorkerPanel();
      fetchWorkers();
    } else {
      toast.error(res?.error || "Failed to remove worker");
    }
  };

  const handleResendInvite = async (id, email) => {
    const res = await post(`/team/resend-invite/${id}`);
    if (res?.success) toast.success(`Invite resent to ${email}`);
    else toast.error(res?.error || "Failed to resend invite");
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
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
    const id = workerId(selectedWorker);
    if (!id) return;
    setSavingWorkerGeo(true);

    try {
      const payload = {
        country: str(selectedWorker?.country || "New Zealand") || "New Zealand",
        region: str(selectedWorker?.region),
      };
      const res = await patch(`/team/workers/${id}`, payload);
      if (res?.success) {
        toast.success("Worker location updated");
        setWorkers((prev) => prev.map((worker) => String(workerId(worker)) === String(id) ? { ...worker, ...payload } : worker));
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
    const id = workerId(selectedWorker);
    if (!id) return toast.error("Worker not found");
    setSavingNotes(true);

    try {
      const res = await patch(`/team/workers/${id}/notes`, { notes: workerNotes });
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
      <div className="cx-page max-w-6xl" data-testid="team-page">
        {!isOwnerUser && !isFeatureEnabled("team") ? (
          <UpgradePrompt feature="team" message="Team management requires a Team plan or higher." />
        ) : (
          <>
            <div className="cx-page-hero flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="cx-page-title" data-testid="team-heading">Crew Board</h1>
                <p className="cx-page-subtitle">
                  Crew activity, client history, and assigned work visibility · {workers.length} worker{workers.length !== 1 ? "s" : ""}
                  <span className="text-slate-300/70"> / {Number(includedUsers || 1)} max</span>
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" data-testid="csv-file-input" />
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!isFeatureEnabled("csv_team_import")) return toast.error("CSV team import requires a Team plan or higher.");
                    fileInputRef.current?.click();
                  }}
                  disabled={importing}
                  className="border-slate-200 text-slate-500 hover:text-slate-900"
                  data-testid="csv-import-button"
                >
                  <Upload size={16} className="mr-2" />{importing ? "Importing..." : "CSV Import"}
                </Button>

                <Button
                  onClick={() => {
                    if (!canAddWorker(workers.length)) return toast.error(`Team limit reached for your plan (${includedUsers || 1} users). Upgrade your plan.`);
                    setShowAdd((prev) => !prev);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  data-testid="add-worker-button"
                >
                  <UserPlus size={16} className="mr-2" />{showAdd ? "Close Invite" : "Invite Worker"}
                </Button>
              </div>
            </div>

            {showAdd && (
              <Card className="bg-white border-slate-200 shadow-lg shadow-black/10">
                <CardContent className="p-6 space-y-4 text-slate-900">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Invite Worker</div>
                    <div className="text-sm text-slate-500 mt-1">Add a team member with role, country, and region/state for assignment matching.</div>
                  </div>

                  <form onSubmit={handleAdd} className="grid gap-4 md:grid-cols-2">
                    <div><Label htmlFor="worker-name-inline">Name</Label><Input id="worker-name-inline" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                    <div><Label htmlFor="worker-email-inline">Email</Label><Input id="worker-email-inline" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
                    <div><Label htmlFor="worker-phone-inline">Phone</Label><Input id="worker-phone-inline" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                    <div>
                      <Label htmlFor="worker-role-inline">Role</Label>
                      <select id="worker-role-inline" value={form.invite_role || "worker"} onChange={(e) => setForm({ ...form, invite_role: e.target.value })} className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900" data-testid="invite-role-select">
                        <option value="manager">Manager</option><option value="office_admin">Office Admin</option><option value="worker">Worker</option><option value="payroll">Payroll</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="worker-country-inline">Country</Label>
                      <select id="worker-country-inline" value={form.country || "New Zealand"} onChange={(e) => setForm({ ...form, country: e.target.value, region: "" })} className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900" data-testid="invite-country-select">
                        {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="worker-region-inline">Region / State</Label>
                      <select id="worker-region-inline" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900" data-testid="invite-region-select">
                        <option value="">Select region / state</option>
                        {getRegionOptions(form.country || "New Zealand").map((region) => <option key={region} value={region}>{region}</option>)}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => { setShowAdd(false); setForm({ name: "", email: "", phone: "", country: "New Zealand", region: "", invite_role: "worker" }); }}>Cancel</Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Send Invite</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {selectedWorker && (
              <Card className="bg-white border-slate-200 shadow-xl shadow-black/10 overflow-hidden">
                <div className="h-1 w-full bg-blue-600/80" />
                <CardContent className="p-6 space-y-5 text-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <div className="h-12 w-12 rounded-2xl bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-lg font-black text-blue-600">{str(selectedWorker?.name || "W").charAt(0).toUpperCase()}</div>
                        <div>
                          <div className="text-2xl font-black leading-tight">{selectedWorker?.name || "Worker"}</div>
                          <div className="text-xs text-slate-500">Worker profile, assigned work, and clients served</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">Status: {selectedWorker?.status || "active"}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">{selectedWorker?.country || "New Zealand"} · {selectedWorker?.region || "No region"}</span>
                        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">{regionMatchedWorkerJobs.length} job{regionMatchedWorkerJobs.length !== 1 ? "s" : ""}</span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{workerClients.length} client{workerClients.length !== 1 ? "s" : ""} served</span>
                      </div>
                      {hiddenRegionMismatchCount > 0 ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Hidden {hiddenRegionMismatchCount} out-of-region job{hiddenRegionMismatchCount !== 1 ? "s" : ""} for this worker location.</div> : null}
                    </div>
                    <Button type="button" variant="outline" onClick={closeWorkerPanel} className="border-slate-200 text-slate-500 hover:text-slate-900">Close</Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"><div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Email</div><div className="text-slate-900 break-all font-medium">{selectedWorker.email || "-"}</div></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"><div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Phone</div><div className="text-slate-900 font-medium">{selectedWorker.phone || "-"}</div></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Country</div>
                      <select value={selectedWorker?.country || "New Zealand"} onChange={(e) => setSelectedWorker((prev) => prev ? { ...prev, country: e.target.value, region: "" } : prev)} className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900">
                        {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Region / State</div>
                      <select value={selectedWorker?.region || ""} onChange={(e) => setSelectedWorker((prev) => prev ? { ...prev, region: e.target.value } : prev)} className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-slate-900">
                        <option value="">Select region / state</option>
                        {getRegionOptions(selectedWorker?.country || "New Zealand").map((region) => <option key={region} value={region}>{region}</option>)}
                      </select>
                      <Button type="button" onClick={saveWorkerGeo} disabled={savingWorkerGeo} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white">{savingWorkerGeo ? "Saving..." : "Save Location"}</Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/25 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3"><div><div className="text-slate-900 font-semibold">Worker Notes</div><div className="text-xs text-slate-500">Private notes for this team member</div></div><Button type="button" onClick={saveWorkerNotes} disabled={savingNotes} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">{savingNotes ? "Saving..." : "Save Notes"}</Button></div>
                    <textarea value={workerNotes} onChange={(e) => setWorkerNotes(e.target.value)} placeholder="Add notes for this worker..." rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50 text-slate-900 p-3 outline-none" />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div><div className="text-slate-900 font-semibold flex items-center gap-2"><Users size={17} /> Clients served by this worker</div><div className="text-xs text-slate-500">Client history is built from jobs assigned to this worker in their saved region. Clients still belong to the business.</div></div>
                    </div>
                    {workerJobsLoading ? <div className="text-sm text-slate-500">Loading worker client history...</div> : workerClients.length > 0 ? (
                      <div className="grid gap-3 lg:grid-cols-2">
                        {workerClients.map((client) => (
                          <div key={client.key} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-black text-slate-950 truncate">{client.name}</div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                                  {client.phone ? <span className="inline-flex items-center gap-1"><Phone size={12} />{client.phone}</span> : null}
                                  {client.email ? <span className="inline-flex items-center gap-1"><Mail size={12} />{client.email}</span> : null}
                                </div>
                              </div>
                              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{client.jobs} job{client.jobs !== 1 ? "s" : ""}</span>
                            </div>
                            {client.address ? <div className="mt-2 text-xs text-slate-500 flex items-center gap-1"><MapPin size={12} />{client.address}</div> : null}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded-xl bg-white border border-slate-200 p-2"><div className="text-slate-400 uppercase tracking-wide">Completed</div><div className="font-bold text-slate-900">{client.completed}</div></div>
                              <div className="rounded-xl bg-white border border-slate-200 p-2"><div className="text-slate-400 uppercase tracking-wide">Last job</div><div className="font-bold text-slate-900">{formatShortDate(client.lastDate)}</div></div>
                            </div>
                            <div className="mt-2 rounded-xl bg-white border border-slate-200 p-2 text-xs"><span className="text-slate-400 uppercase tracking-wide">Next scheduled: </span><span className="font-bold text-slate-900">{formatShortDate(client.nextDate)}</span></div>
                            <div className="mt-3 flex gap-2">
                              {client.id ? <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/clients/${client.id}`)}>Open Client</Button> : null}
                              {client.lastJobId ? <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/jobs/${client.lastJobId}`)}>Last Job</Button> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No client history yet. Assign jobs to this worker and clients will appear here automatically.</div>}
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/25 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3"><div><div className="text-slate-900 font-semibold flex items-center gap-2"><Briefcase size={17} /> Assigned Jobs</div><div className="text-xs text-slate-500">Jobs currently linked to this worker in their saved region</div></div><Button type="button" onClick={() => navigate(`/jobs/new?workerId=${workerId(selectedWorker)}`)} className="bg-blue-600 hover:bg-blue-700 text-white">Add / Assign Job</Button></div>
                    {workerJobsLoading ? <div className="text-sm text-slate-500">Loading assigned jobs...</div> : regionMatchedWorkerJobs.length > 0 ? (
                      <div className="space-y-3">
                        {regionMatchedWorkerJobs.map((job, index) => {
                          const id = jobId(job);
                          return <div key={id || index} className="rounded-lg border border-slate-200 bg-white p-3 flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-slate-900 font-medium">{getJobTitle(job)}</div><div className="text-sm text-slate-500">{getJobClient(job)}</div><div className="text-sm text-slate-500">{job.address || "-"}</div><div className="text-sm text-slate-500">Status: {job.status || "-"}</div><div className="text-sm text-slate-500 flex items-center gap-1"><CalendarDays size={13} /> {formatShortDate(getJobDate(job))}</div></div>{id && <Button type="button" variant="outline" onClick={() => navigate(`/jobs/${id}`)}>Open Job</Button>}</div>;
                        })}
                      </div>
                    ) : <div className="text-sm text-slate-500">No assigned jobs yet.</div>}
                  </div>
                </CardContent>
              </Card>
            )}

            {importResults && (
              <Card className="bg-white border-slate-200 shadow-sm" data-testid="csv-import-results"><CardContent className="p-4"><div className="flex items-center justify-between mb-3"><p className="text-sm font-medium text-slate-900">Import Results</p><button onClick={() => setImportResults(null)} className="text-slate-500 hover:text-slate-900 text-xs">Dismiss</button></div><p className="text-sm text-slate-500 mb-2">{importResults.invited || 0} invited, {importResults.skipped || 0} skipped of {importResults.total || 0} rows</p></CardContent></Card>
            )}

            {loading && workers.length === 0 ? (
              <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div>
            ) : workers.length === 0 && !loading ? (
              <Card className="bg-white border-slate-200 shadow-sm"><CardContent className="p-8 text-center"><UserPlus className="mx-auto mb-3 text-slate-500/40" size={32} /><p className="text-slate-900 font-medium mb-1">No team members yet</p><p className="text-xs text-slate-500 mb-4 max-w-xs mx-auto">Invite workers to join your team.</p><Button onClick={() => setShowAdd(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-first-worker"><UserPlus size={14} className="mr-1" />Invite Your First Worker</Button></CardContent></Card>
            ) : (
              <div className="space-y-3">
                {workers.map((worker) => {
                  const id = workerId(worker);
                  return (
                    <Card key={id} className="bg-white border-slate-200 hover:border-blue-600/40 transition-colors shadow-sm shadow-black/10" data-testid={`worker-card-${id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <button type="button" className="flex-1 text-left" onClick={() => openWorkerPanel(worker)}>
                            <div className="flex items-start gap-3"><div className="h-11 w-11 rounded-full bg-blue-600/15 border border-blue-600/30 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">{str(worker.name || "W").charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="text-slate-900 font-semibold">{worker.name || "Unnamed Worker"}</div>{worker.status && <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500">{worker.status}</span>}</div><div className="text-sm text-slate-500 mt-1 break-all">{worker.email || "-"}</div><div className="text-sm text-slate-500">{worker.phone || "-"}</div><div className="mt-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-500">Country: {worker.country || "New Zealand"} • Region: {worker.region || "-"}</span></div></div></div>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            {(worker.status === "pending" || worker.status === "invited") && <Button variant="outline" size="sm" onClick={() => handleResendInvite(id, worker.email)} className="border-slate-200 text-slate-500 hover:text-slate-900"><RefreshCw size={14} /></Button>}
                            <Button variant="outline" size="sm" onClick={() => handleDelete(worker)} className="border-red-500/30 text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
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
