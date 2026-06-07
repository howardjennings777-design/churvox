// CHURVOX_FIRST_JOB_TO_COMMAND_FLOW_20260601
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ArrowLeft, Briefcase, Save } from "lucide-react";
import { toast } from "sonner";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import JobCreateForm from "../../components/forms/JobCreateForm";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const COUNTRY_OPTIONS = ["New Zealand", "Australia"];
const REGION_OPTIONS = {
  "New Zealand": ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
};

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function createdId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.job || data?.item || data?.record || data;
  return String(data?.id || data?._id || item?.id || item?._id || payload?.id || payload?._id || "");
}
function recordJob(payload) { const data = payload?.data ?? payload; return data?.job || data?.item || data?.record || data || {}; }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || "Client"; }
function clientId(client) { return String(client?.id || client?._id || client?.client_id || ""); }
function workerName(worker) { return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker"; }
function workerId(worker) { return String(worker?.id || worker?._id || worker?.worker_id || ""); }
function firstSetupActive(searchParams) {
  try { return searchParams.get("first_setup") === "1" || localStorage.getItem(FIRST_SETUP_KEY) === "job"; } catch { return false; }
}

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const api = useApi();
  const isEdit = Boolean(id);
  const firstSetup = !isEdit && firstSetupActive(searchParams);
  const workerIdFromQuery = searchParams.get("workerId") || searchParams.get("worker_id") || "";
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({ title: "", client_id: "", client_name: "", address: "", scheduled_date: "", country: "New Zealand", region: "", notes: "", assigned_worker_id: workerIdFromQuery, status: "assigned", is_recurring: false, recurring_frequency: "weekly" });

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const [clientsRes, workersRes, jobRes] = await Promise.all([
        api.get("/clients"),
        api.get("/team/workers"),
        isEdit ? api.get(`/jobs/${encodeURIComponent(id)}`) : Promise.resolve(null),
      ]);
      if (!alive) return;
      setClients(clientsRes?.success ? arr(clientsRes.data) : []);
      setWorkers(workersRes?.success ? arr(workersRes.data) : []);
      if (isEdit && jobRes?.success) {
        const j = recordJob(jobRes);
        setForm({
          title: j.title || j.job_name || "",
          client_id: j.client_id || "",
          client_name: j.client_name || j.customer_name || "",
          address: j.address || j.site_address || "",
          scheduled_date: j.scheduled_date ? String(j.scheduled_date).slice(0, 16) : "",
          country: j.country || "New Zealand",
          region: j.region || "",
          notes: j.notes || j.description || "",
          assigned_worker_id: j.assigned_worker_id || j.worker_id || "",
          status: j.status || "assigned",
          is_recurring: Boolean(j.is_recurring),
          recurring_frequency: j.recurring_frequency || "weekly",
        });
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [api, id, isEdit]);

  function setField(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  function handleClientChange(nextId) {
    const client = clients.find((c) => clientId(c) === String(nextId));
    setForm((prev) => ({ ...prev, client_id: nextId, client_name: client ? clientName(client) : "", address: client?.address || client?.site_address || prev.address || "" }));
  }
  function filteredWorkers() {
    const norm = (v) => String(v || "").trim().toLowerCase();
    if (!form.country || !form.region) return workers;
    return workers.filter((w) => norm(w.country) === norm(form.country) && norm(w.region || w.state) === norm(form.region));
  }
  function finishCreate(data) {
    const nextId = createdId(data);
    if (firstSetup) {
      try { localStorage.setItem(FIRST_SETUP_KEY, "done"); } catch {}
      toast.success("First job created — Command Floor is ready");
      navigate(`/dashboard?first_setup=done${nextId ? `&job_id=${encodeURIComponent(nextId)}` : ""}`);
      return;
    }
    navigate(nextId ? `/jobs/${nextId}` : "/jobs");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    const worker = workers.find((w) => workerId(w) === String(form.assigned_worker_id));
    const payload = {
      title: form.title || "Job",
      job_name: form.title || "Job",
      client_id: form.client_id || null,
      client_name: form.client_name || "",
      customer_name: form.client_name || "",
      address: form.address || "",
      site_address: form.address || "",
      scheduled_date: form.scheduled_date || null,
      country: form.country || "New Zealand",
      region: form.region || "",
      notes: form.notes || "",
      description: form.notes || "",
      assigned_worker_id: form.assigned_worker_id || null,
      worker_id: form.assigned_worker_id || null,
      assigned_worker_name: worker ? workerName(worker) : "",
      worker_name: worker ? workerName(worker) : "",
      status: form.status || "assigned",
      is_recurring: Boolean(form.is_recurring),
      recurring_frequency: form.recurring_frequency || "weekly",
    };
    const res = isEdit ? await api.patch(`/jobs/${encodeURIComponent(id)}`, payload) : await api.post("/jobs", payload);
    setSaving(false);
    if (res?.success) {
      toast.success(isEdit ? "Job updated" : "Job created");
      const nextId = createdId(res) || id;
      navigate(nextId ? `/jobs/${nextId}` : "/jobs");
    } else toast.error(res?.error || "Failed to save job");
  }

  if (!isEdit) {
    return <Layout><PremiumPage maxWidth={820}>
      <PremiumHero eyebrow={firstSetup ? "Step 4 of 4" : "New"} title={firstSetup ? "Create your first job" : "New Job"} subtitle={firstSetup ? "This is the first real work item Churvox will show on Command Floor. Client details should already be prefilled." : "Create and assign a job."} icon={<Briefcase className="h-6 w-6" />} />
      {firstSetup ? <div className="mb-4 rounded-3xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm font-bold text-lime-100">After this job is created, Churvox will take you to Command Floor with the first live record connected.</div> : null}
      <PremiumCard><JobCreateForm onCancel={() => navigate(firstSetup ? "/clients/new?first_setup=1" : "/jobs")} onSuccess={finishCreate} submitLabel={firstSetup ? "Create first job and open Command" : "Create Job"} /></PremiumCard>
    </PremiumPage></Layout>;
  }

  if (loading) return <Layout><div className="p-4 md:p-6 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  return <Layout><PremiumPage maxWidth={820}>
    <button onClick={() => navigate("/jobs")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-jobs"><ArrowLeft size={16} /> Back to jobs</button>
    <PremiumHero eyebrow="Edit job" title="Edit Job" subtitle="Update job details, schedule and assignment." icon={<Briefcase className="h-6 w-6" />} />
    <PremiumCard title="Job details" icon={<Briefcase className="h-5 w-5" />}>
      <form onSubmit={handleSubmit} className="space-y-4" data-version="CHURVOX_FIRST_JOB_TO_COMMAND_FLOW_20260601">
        <div><Label htmlFor="title" className="text-[#0d1b34] font-semibold">Job Title</Label><Input id="title" value={form.title} onChange={(e) => setField("title", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
        <div><Label htmlFor="client_id" className="text-[#0d1b34] font-semibold">Client</Label><select id="client_id" value={form.client_id} onChange={(e) => handleClientChange(e.target.value)} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"><option value="">Select client</option>{clients.map((client) => <option key={clientId(client)} value={clientId(client)}>{clientName(client)}</option>)}</select></div>
        <div><Label htmlFor="address" className="text-[#0d1b34] font-semibold">Address</Label><Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
        <div><Label htmlFor="scheduled_date" className="text-[#0d1b34] font-semibold">Scheduled Date</Label><Input id="scheduled_date" type="datetime-local" value={form.scheduled_date} onChange={(e) => setField("scheduled_date", e.target.value)} style={{ colorScheme: "light" }} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><Label className="text-[#0d1b34] font-semibold">Country</Label><select value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, region: "", assigned_worker_id: "" }))} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3">{COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div><div><Label className="text-[#0d1b34] font-semibold">Region / State</Label><select value={form.region || ""} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value, assigned_worker_id: "" }))} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"><option value="">Select region / state</option>{(REGION_OPTIONS[form.country] || []).map((region) => <option key={region} value={region}>{region}</option>)}</select></div></div>
        <div><Label htmlFor="assigned_worker_id" className="text-[#0d1b34] font-semibold">Assigned Worker</Label><select id="assigned_worker_id" value={form.assigned_worker_id} onChange={(e) => setField("assigned_worker_id", e.target.value)} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"><option value="">Select worker</option>{filteredWorkers().map((worker) => <option key={workerId(worker)} value={workerId(worker)}>{workerName(worker)}</option>)}</select></div>
        <div><Label htmlFor="status" className="text-[#0d1b34] font-semibold">Status</Label><select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"><option value="assigned">Assigned</option><option value="acknowledged">Acknowledged</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
        <div><Label htmlFor="notes" className="text-[#0d1b34] font-semibold">Notes</Label><textarea id="notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3 outline-none focus:border-[#2563eb]" /></div>
        <div className="border border-[#d8e3f3] bg-[#f6faff] rounded-xl p-4 space-y-3"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_recurring} onChange={(e) => setField("is_recurring", e.target.checked)} className="h-4 w-4" data-testid="recurring-checkbox" /><span className="text-sm font-semibold text-[#0d1b34]">Recurring job</span></label>{form.is_recurring ? <select value={form.recurring_frequency} onChange={(e) => setField("recurring_frequency", e.target.value)} className="w-full rounded-md border border-[#d8e3f3] bg-white text-[#0d1b34] p-3" data-testid="recurring-frequency"><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select> : null}</div>
        <div className="flex gap-3 pt-2 flex-wrap"><Button type="button" variant="outline" onClick={() => navigate("/jobs")} className="flex-1 min-w-[140px] border-[#d8e3f3] text-[#1a2c4d] hover:bg-[#eff4ff]">Cancel</Button><PremiumButton type="submit" disabled={saving} className="flex-1 min-w-[200px]"><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Update Job"}</PremiumButton></div>
      </form>
    </PremiumCard>
  </PremiumPage></Layout>;
}
