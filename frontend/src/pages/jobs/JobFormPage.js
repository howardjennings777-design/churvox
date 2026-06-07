// CHURVOX_JOB_EDIT_FLOW_FIXED_20260607
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
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
const JOB_TYPE_OPTIONS = [
  ["other", "General service"],
  ["lawn_mowing", "Lawn mowing"],
  ["garden_maintenance", "Garden maintenance"],
  ["landscaping", "Landscaping"],
  ["cleaning", "Cleaning"],
  ["window_cleaning", "Window cleaning"],
  ["pressure_washing", "Pressure washing"],
  ["handyman", "Handyman"],
  ["plumbing", "Plumbing"],
  ["electrical", "Electrical"],
  ["painting", "Painting"],
  ["carpentry", "Carpentry"],
  ["pest_control", "Pest control"],
  ["pool_maintenance", "Pool maintenance"],
  ["hvac", "HVAC"],
  ["roofing", "Roofing"],
];

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}
function createdId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.job || data?.item || data?.record || data;
  return normalizeId(data?.id || data?._id || item?.id || item?._id || payload?.id || payload?._id || "");
}
function recordJob(payload) { const data = payload?.data ?? payload; return data?.job || data?.item || data?.record || data || {}; }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || "Client"; }
function clientId(client) { return normalizeId(client?.id || client?._id || client?.client_id || ""); }
function workerName(worker) { return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker"; }
function workerId(worker) { return normalizeId(worker?.id || worker?._id || worker?.worker_id || ""); }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function firstSetupActive(searchParams) {
  try { return searchParams.get("first_setup") === "1" || localStorage.getItem(FIRST_SETUP_KEY) === "job"; } catch { return false; }
}
function inputDate(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [originalWorkerId, setOriginalWorkerId] = useState("");
  const [form, setForm] = useState({
    title: "",
    job_type: "other",
    client_id: "",
    client_name: "",
    address: "",
    scheduled_date: "",
    country: "New Zealand",
    region: "",
    notes: "",
    assigned_worker_id: workerIdFromQuery,
    status: "assigned",
    pricing_type: "fixed",
    fixed_price: "",
    hourly_rate: "",
    estimated_duration: 60,
    is_recurring: false,
    recurring_frequency: "weekly",
  });

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
        const workerValue = normalizeId(j.assigned_worker_id || j.worker_id || "");
        setOriginalWorkerId(workerValue);
        setForm({
          title: j.title || j.job_name || "",
          job_type: j.job_type || "other",
          client_id: normalizeId(j.client_id || ""),
          client_name: j.client_name || j.customer_name || "",
          address: j.address || j.site_address || "",
          scheduled_date: inputDate(j.scheduled_date || j.scheduled_at || j.date),
          country: j.country || "New Zealand",
          region: j.region || j.state || "",
          notes: j.notes || j.description || "",
          assigned_worker_id: workerValue,
          status: j.status || "assigned",
          pricing_type: j.pricing_type || "fixed",
          fixed_price: j.fixed_price ?? j.price ?? j.total ?? "",
          hourly_rate: j.hourly_rate ?? "",
          estimated_duration: j.estimated_duration || 60,
          is_recurring: Boolean(j.is_recurring),
          recurring_frequency: j.recurring_frequency || j.recurrence_pattern || "weekly",
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
      toast.success("First job created — Command Board is ready");
      navigate(`/dashboard?first_setup=done${nextId ? `&job_id=${encodeURIComponent(nextId)}` : ""}`);
      return;
    }
    navigate(nextId ? `/jobs/${nextId}` : "/jobs-board");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim()) return toast.error("Job title is required");
    if (!form.job_type) return toast.error("Job type is required");
    if (!form.address.trim()) return toast.error("Address is required");
    if (!form.scheduled_date) return toast.error("Scheduled date is required");

    setSaving(true);
    const fixedPrice = money(form.fixed_price);
    const hourlyRate = money(form.hourly_rate);
    const payload = {
      title: form.title.trim(),
      job_type: form.job_type || "other",
      client_id: form.client_id || null,
      customer_name: form.client_name || "",
      address: form.address || "",
      scheduled_date: form.scheduled_date || null,
      estimated_duration: Number(form.estimated_duration || 60),
      price: ["fixed", "fixed_extras"].includes(form.pricing_type) ? fixedPrice : 0,
      pricing_type: form.pricing_type || "fixed",
      hourly_rate: ["hourly", "hourly_extras"].includes(form.pricing_type) ? hourlyRate : 0,
      notes: form.notes || "",
      is_recurring: Boolean(form.is_recurring),
      recurrence_pattern: form.is_recurring ? form.recurring_frequency : null,
      status: form.status || "assigned",
    };

    const res = isEdit ? await api.patch(`/jobs/${encodeURIComponent(id)}`, payload) : await api.post("/jobs", payload);
    if (!res?.success) {
      setSaving(false);
      toast.error(res?.error || "Failed to save job");
      return;
    }

    if (isEdit && form.assigned_worker_id && form.assigned_worker_id !== originalWorkerId) {
      const assignRes = await api.post(`/jobs/${encodeURIComponent(id)}/assign`, { worker_id: form.assigned_worker_id });
      if (!assignRes?.success) {
        setSaving(false);
        toast.error(assignRes?.error || "Job saved but worker assignment failed");
        return;
      }
    }

    setSaving(false);
    toast.success(isEdit ? "Job updated" : "Job created");
    const nextId = createdId(res) || id;
    navigate(nextId ? `/jobs/${nextId}` : "/jobs-board");
  }

  if (!isEdit) {
    return <Layout><PremiumPage maxWidth={820}>
      <PremiumHero eyebrow={firstSetup ? "Step 4 of 4" : "New"} title={firstSetup ? "Create your first job" : "New Job"} subtitle={firstSetup ? "This is the first real work item Churvox will show on Command Board. Client details should already be prefilled." : "Create a real job record with job type, schedule, assignment and invoice source."} icon={<Briefcase className="h-6 w-6" />} />
      {firstSetup ? <div className="mb-4 rounded-3xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm font-bold text-lime-100">After this job is created, Churvox will take you to Command Board with the first live record connected.</div> : null}
      <PremiumCard><JobCreateForm onCancel={() => navigate(firstSetup ? "/clients/new?first_setup=1" : "/jobs-board")} onSuccess={finishCreate} submitLabel={firstSetup ? "Create first job and open Command" : "Create Job"} /></PremiumCard>
    </PremiumPage></Layout>;
  }

  if (loading) return <Layout><div className="p-4 md:p-6 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" /></div></Layout>;

  const fieldClass = "w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3";

  return <Layout><PremiumPage maxWidth={920}>
    <button onClick={() => navigate("/jobs-board")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-jobs"><ArrowLeft size={16} /> Back to Jobs board</button>
    <PremiumHero eyebrow="Edit job record" title="Edit Job" subtitle="Update the job record, schedule, pricing source, recurrence and worker assignment." icon={<Briefcase className="h-6 w-6" />} />
    <PremiumCard title="Job details" icon={<Briefcase className="h-5 w-5" />}>
      <form onSubmit={handleSubmit} className="space-y-5" data-version="CHURVOX_JOB_EDIT_FLOW_FIXED_20260607">
        <section className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="title" className="text-[#0d1b34] font-semibold">Job Title *</Label><Input id="title" required value={form.title} onChange={(e) => setField("title", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
          <div><Label htmlFor="job_type" className="text-[#0d1b34] font-semibold">Job Type *</Label><select id="job_type" required value={form.job_type} onChange={(e) => setField("job_type", e.target.value)} className={fieldClass}>{JOB_TYPE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="client_id" className="text-[#0d1b34] font-semibold">Client</Label><select id="client_id" value={form.client_id} onChange={(e) => handleClientChange(e.target.value)} className={fieldClass}><option value="">Select client</option>{clients.map((client) => <option key={clientId(client)} value={clientId(client)}>{clientName(client)}</option>)}</select></div>
          <div><Label htmlFor="address" className="text-[#0d1b34] font-semibold">Address *</Label><Input id="address" required value={form.address} onChange={(e) => setField("address", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="scheduled_date" className="text-[#0d1b34] font-semibold">Scheduled Date *</Label><Input id="scheduled_date" required type="datetime-local" value={form.scheduled_date} onChange={(e) => setField("scheduled_date", e.target.value)} style={{ colorScheme: "light" }} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
          <div><Label htmlFor="estimated_duration" className="text-[#0d1b34] font-semibold">Estimated duration minutes</Label><Input id="estimated_duration" type="number" min="0" value={form.estimated_duration} onChange={(e) => setField("estimated_duration", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div><Label className="text-[#0d1b34] font-semibold">Country</Label><select value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, region: "", assigned_worker_id: "" }))} className={fieldClass}>{COUNTRY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><Label className="text-[#0d1b34] font-semibold">Region / State</Label><select value={form.region || ""} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value, assigned_worker_id: "" }))} className={fieldClass}><option value="">Select region / state</option>{(REGION_OPTIONS[form.country] || []).map((region) => <option key={region} value={region}>{region}</option>)}</select></div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="assigned_worker_id" className="text-[#0d1b34] font-semibold">Assigned Worker</Label><select id="assigned_worker_id" value={form.assigned_worker_id} onChange={(e) => setField("assigned_worker_id", e.target.value)} className={fieldClass}><option value="">Select worker</option>{filteredWorkers().map((worker) => <option key={workerId(worker)} value={workerId(worker)}>{workerName(worker)}</option>)}</select><p className="mt-2 text-xs font-semibold text-[#5b6c87]">Changing this uses the real Assign Worker endpoint.</p></div>
          <div><Label htmlFor="status" className="text-[#0d1b34] font-semibold">Status</Label><select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className={fieldClass}><option value="assigned">Assigned</option><option value="acknowledged">Acknowledged</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select></div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div><Label htmlFor="pricing_type" className="text-[#0d1b34] font-semibold">Pricing type</Label><select id="pricing_type" value={form.pricing_type} onChange={(e) => setField("pricing_type", e.target.value)} className={fieldClass}><option value="fixed">Fixed price</option><option value="hourly">Hourly</option><option value="fixed_extras">Fixed + Extras</option><option value="hourly_extras">Hourly + Extras</option></select></div>
          {["fixed", "fixed_extras"].includes(form.pricing_type) ? <div><Label htmlFor="fixed_price" className="text-[#0d1b34] font-semibold">Fixed price</Label><Input id="fixed_price" type="number" step="0.01" value={form.fixed_price} onChange={(e) => setField("fixed_price", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div> : <div><Label htmlFor="hourly_rate" className="text-[#0d1b34] font-semibold">Hourly rate</Label><Input id="hourly_rate" type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setField("hourly_rate", e.target.value)} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" /></div>}
        </section>

        <section className="border border-[#d8e3f3] bg-[#f6faff] rounded-xl p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={form.is_recurring} onChange={(e) => setField("is_recurring", e.target.checked)} className="h-4 w-4" data-testid="recurring-checkbox" /><span className="text-sm font-semibold text-[#0d1b34]">Recurring job</span></label>
          {form.is_recurring ? <select value={form.recurring_frequency} onChange={(e) => setField("recurring_frequency", e.target.value)} className="w-full rounded-md border border-[#d8e3f3] bg-white text-[#0d1b34] p-3" data-testid="recurring-frequency"><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select> : null}
        </section>

        <div><Label htmlFor="notes" className="text-[#0d1b34] font-semibold">Notes</Label><textarea id="notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3 outline-none focus:border-[#2563eb]" /></div>

        <div className="flex gap-3 pt-2 flex-wrap"><PremiumButton type="button" variant="secondary" onClick={() => navigate("/jobs-board")} className="flex-1 min-w-[140px]">Cancel</PremiumButton><PremiumButton type="submit" disabled={saving} className="flex-1 min-w-[200px]"><Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Update Job"}</PremiumButton></div>
      </form>
    </PremiumCard>
  </PremiumPage></Layout>;
}
