import React, { useEffect, useMemo, useState } from "react";
import { normalizeRole } from "../../lib/roles";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, ClipboardList, DollarSign, Repeat, Users } from "lucide-react";

const COUNTRY_OPTIONS = [
  { value: "New Zealand", label: "New Zealand" },
  { value: "Australia", label: "Australia" },
];

const REGION_OPTIONS = {
  "New Zealand": [
    "Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland",
  ],
  "Australia": [
    "New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory",
  ],
};

const PRICING_OPTIONS = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed_extras", label: "Fixed + Extras" },
  { value: "hourly_extras", label: "Hourly + Extras" },
];

const JOB_TEMPLATES = [
  {
    id: "lawn_mowing",
    label: "Lawn mowing",
    title: "Lawn mowing service",
    pricing_type: "fixed",
    notes: "Mow lawns, trim edges, blow paths and check site is tidy before leaving.",
    estimated_hours: 1.5,
    job_type: "lawn_mowing",
    pricing_hint: "$80-$140 typical",
    checklist: ["Confirm site access", "Mow lawns", "Trim edges", "Blow paths and driveway", "Take completion photos"],
  },
  {
    id: "cleaning",
    job_type: "cleaning",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "Cleaning",
    title: "Cleaning service",
    pricing_type: "hourly",
    notes: "Complete agreed cleaning areas, report issues, and leave site ready for customer handover.",
    checklist: ["Confirm rooms/areas", "Complete clean", "Check bins/supplies", "Final walkthrough", "Take completion photos"],
  },
  {
    id: "plumbing_callout",
    job_type: "plumbing",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "Plumbing callout",
    title: "Plumbing callout",
    pricing_type: "hourly_extras",
    notes: "Attend site, diagnose plumbing issue, complete approved repair or record required follow-up parts.",
    checklist: ["Inspect issue", "Confirm approval before extras", "Complete repair", "Test water/pressure", "Record materials used"],
  },
  {
    id: "electrical_inspection",
    job_type: "electrical",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "Electrical inspection",
    title: "Electrical inspection",
    pricing_type: "fixed",
    notes: "Inspect electrical issue, record findings, complete safe approved work, and note any follow-up required.",
    checklist: ["Confirm safe access", "Inspect issue", "Record findings", "Complete approved work", "Customer-safe completion notes"],
  },
  {
    id: "landscaping",
    job_type: "landscaping",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "Landscaping",
    title: "Landscaping job",
    pricing_type: "fixed_extras",
    notes: "Complete landscaping scope, record materials/extras, and take progress/completion photos.",
    checklist: ["Confirm scope", "Prepare area", "Complete landscaping work", "Record materials/extras", "Take completion photos"],
  },
  {
    id: "pest_control",
    job_type: "pest_control",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "Pest control",
    title: "Pest control service",
    pricing_type: "fixed",
    notes: "Complete pest control treatment according to site instructions and record customer-safe notes.",
    checklist: ["Confirm pest issue", "Inspect site", "Complete treatment", "Record safety notes", "Customer handover"],
  },
  {
    id: "handyman_repair",
    job_type: "handyman",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "Handyman repair",
    title: "Handyman repair",
    pricing_type: "hourly_extras",
    notes: "Complete repair work, record extras/materials, and note any further work required.",
    checklist: ["Inspect repair", "Confirm parts/materials", "Complete repair", "Test/check work", "Record completion notes"],
  },
  {
    id: "general_service",
    job_type: "general",
    estimated_hours: 2,
    pricing_hint: "Set based on scope",
    label: "General service job",
    title: "General service job",
    pricing_type: "fixed",
    notes: "Complete agreed service work, add notes, and take completion photos if useful.",
    checklist: ["Confirm job scope", "Complete work", "Check quality", "Add notes", "Take completion photos"],
  },
];

function getRegionOptions(country) {
  return REGION_OPTIONS[country] || [];
}

function workerMatchesJobCountryRegion(worker, form) {
  const norm = (v) => String(v || "").trim().toLowerCase();
  const jobCountry = norm(form?.country);
  const jobRegion = norm(form?.region);
  const workerCountry = norm(worker?.country);
  const workerRegion = norm(worker?.region);
  if (!jobCountry || !jobRegion) return true;
  return workerCountry === jobCountry && workerRegion === jobRegion;
}

function jobId(job) {
  return String(job?.id || job?._id || "");
}

function recordId(item) {
  return String(item?.id || item?._id || "");
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return String(a).slice(0, 10) === String(b).slice(0, 10);
}

function sameHour(a, b) {
  if (!a || !b) return false;
  return String(a).slice(0, 13) === String(b).slice(0, 13);
}

function moneyNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clientCountry(client) {
  return client?.country || client?.client_country || client?.billing_country || "New Zealand";
}

function clientRegion(client) {
  return client?.region || client?.state || client?.area || client?.city || "";
}

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [searchParams] = useSearchParams();
  const workerIdFromQuery = searchParams.get("workerId") || "";
  const clientIdFromQuery = searchParams.get("clientId") || searchParams.get("client_id") || "";
  const { get, post, patch } = useApi();
  const currentRole = normalizeRole(JSON.parse(localStorage.getItem("user") || "{}").role);
  const canSeePricingHints = ["owner","manager","office_admin"].includes(currentRole);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [form, setForm] = useState({
    title: "",
    client_id: clientIdFromQuery,
    client_name: "",
    address: "",
    scheduled_date: "",
    country: "New Zealand",
    region: "",
    notes: "",
    assigned_worker_id: workerIdFromQuery,
    status: "assigned",
    pricing_type: "fixed",
    price: "",
    hourly_rate: "",
    estimated_hours: "",
    extras_amount: "",
    checklist_items: [],
    job_type: "",
    template_key: "",
    job_template: "",
    is_recurring: false,
    recurring_frequency: "weekly",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clientsRes, workersRes, jobsRes] = await Promise.all([
          get("/clients"),
          get("/team/workers"),
          get("/jobs"),
        ]);

        const clientsData = clientsRes?.success && Array.isArray(clientsRes.data) ? clientsRes.data : [];
        setClients(clientsData);
        setWorkers(workersRes?.success && Array.isArray(workersRes.data) ? workersRes.data : []);
        setJobs(jobsRes?.success && Array.isArray(jobsRes.data) ? jobsRes.data : []);

        if (isEdit) {
          const jobRes = await get(`/jobs/${id}`);
          if (jobRes?.success && jobRes.data) {
            const j = jobRes.data;
            setSelectedTemplate(j.job_template || "");
            setForm({
              title: j.title || "",
              client_id: j.client_id || "",
              client_name: j.client_name || "",
              address: j.address || "",
              scheduled_date: j.scheduled_date ? String(j.scheduled_date).slice(0, 16) : "",
              country: j.country || "New Zealand",
              region: j.region || "",
              notes: j.notes || "",
              assigned_worker_id: j.assigned_worker_id || "",
              status: j.status || "assigned",
              pricing_type: j.pricing_type || "fixed",
              price: j.price || j.fixed_price || "",
              hourly_rate: j.hourly_rate || "",
              estimated_hours: j.estimated_hours || j.hours_worked || "",
              extras_amount: j.extras_amount || "",
              checklist_items: Array.isArray(j.checklist_items || j.checklist) ? (j.checklist_items || j.checklist) : [],
              job_template: j.job_template || "",
              is_recurring: j.is_recurring || j.recurring || false,
              recurring_frequency: j.recurring_frequency || "weekly",
            });
          }
        } else if (clientIdFromQuery) {
          const selectedClient = clientsData.find((client) => recordId(client) === String(clientIdFromQuery));
          if (selectedClient) {
            setForm((prev) => ({
              ...prev,
              client_id: recordId(selectedClient),
              client_name: selectedClient.name || selectedClient.client_name || "",
              address: selectedClient.address || selectedClient.site_address || prev.address || "",
              country: clientCountry(selectedClient) || prev.country,
              region: clientRegion(selectedClient) || prev.region,
              title: prev.title || `Job for ${selectedClient.name || selectedClient.client_name || "client"}`,
            }));
          }
        }
      } catch {
        toast.error("Failed to load job form");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [get, id, isEdit, clientIdFromQuery]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyTemplate = (templateId) => {
    const template = JOB_TEMPLATES.find((item) => item.id === templateId);
    setSelectedTemplate(templateId);
    if (!template) return;
    setForm((prev) => ({
      ...prev,
      title: prev.title || template.title,
      notes: prev.notes ? `${prev.notes}\n\n${template.notes}` : template.notes,
      pricing_type: template.pricing_type,
      job_template: template.id,
      template_key: template.id,
      checklist_items: template.checklist.map((label, index) => ({
        id: `template-${template.id}-${index}`,
        label,
        done: false,
      })),
    }));
    toast.success(`${template.label} template applied`);
  };

  const filteredWorkers = useMemo(() => workers.filter((worker) => workerMatchesJobCountryRegion(worker, form)), [workers, form]);

  const selectedWorker = useMemo(
    () => workers.find((worker) => String(worker.id || worker._id) === String(form.assigned_worker_id)),
    [workers, form.assigned_worker_id],
  );

  const workerConflicts = useMemo(() => {
    if (!form.assigned_worker_id || !form.scheduled_date) return [];
    return jobs.filter((job) => {
      if (jobId(job) && id && jobId(job) === String(id)) return false;
      if (String(job.assigned_worker_id || job.worker_id || "") !== String(form.assigned_worker_id)) return false;
      if (["completed", "cancelled"].includes(String(job.status || "").toLowerCase())) return false;
      return sameDay(job.scheduled_date || job.date || job.start_date, form.scheduled_date);
    });
  }, [jobs, id, form.assigned_worker_id, form.scheduled_date]);

  const hardConflict = workerConflicts.some((job) => sameHour(job.scheduled_date || job.date || job.start_date, form.scheduled_date));

  const estimatedTotal = useMemo(() => {
    const price = moneyNumber(form.price);
    const hourly = moneyNumber(form.hourly_rate) * moneyNumber(form.estimated_hours);
    const extras = moneyNumber(form.extras_amount);
    if (form.pricing_type === "hourly") return hourly;
    if (form.pricing_type === "hourly_extras") return hourly + extras;
    if (form.pricing_type === "fixed_extras") return price + extras;
    return price;
  }, [form]);

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => String(c.id || c._id) === String(clientId));
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.name || client?.client_name || "",
      address: client?.address || client?.site_address || prev.address || "",
      country: client ? clientCountry(client) : prev.country,
      region: client ? clientRegion(client) : prev.region,
      assigned_worker_id: client ? "" : prev.assigned_worker_id,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: form.title || "Job",
        client_id: form.client_id || null,
        client_name: form.client_name || "",
        address: form.address || "",
        scheduled_date: form.scheduled_date || null,
        country: form.country || "New Zealand",
        region: form.region || "",
        notes: form.notes || "",
        assigned_worker_id: form.assigned_worker_id || null,
        status: form.status || "assigned",
        pricing_type: form.pricing_type || "fixed",
        price: moneyNumber(form.price),
        hourly_rate: moneyNumber(form.hourly_rate),
        estimated_hours: moneyNumber(form.estimated_hours),
        extras_amount: moneyNumber(form.extras_amount),
        estimated_total: estimatedTotal,
        checklist_items: form.checklist_items || [],
        job_type: form.job_type || null,
        template_key: form.template_key || selectedTemplate || null,
        job_template: form.job_template || selectedTemplate || null,
        is_recurring: Boolean(form.is_recurring),
        recurring_frequency: form.is_recurring ? form.recurring_frequency : null,
      };

      const res = isEdit ? await patch(`/jobs/${id}`, payload) : await post("/jobs", payload);

      if (res?.success) {
        toast.success(isEdit ? "Job updated" : "Job created");
        const nextId = res?.data?.id || res?.data?._id || id;
        navigate(nextId ? `/jobs/${nextId}` : "/jobs");
      } else {
        toast.error(res?.error || "Failed to save job");
      }
    } catch {
      toast.error("Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" data-testid="job-form-page">
        <section className="overflow-hidden rounded-3xl border border-slate-900/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Job setup centre</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{isEdit ? "Edit Job" : "New Job"}</h1>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-200">Create work with the right client, region, worker, schedule, recurring rule, template, checklist and pricing source for invoices.</p>
        </section>

        <Card className="bg-white border-slate-200 shadow-sm rounded-3xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isEdit && (
                <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4" data-testid="job-template-selector">
                  <div className="flex items-center gap-2 text-base font-black text-blue-950"><ClipboardList className="h-5 w-5 text-blue-700" /> Job templates</div>
                  <p className="text-sm font-semibold text-blue-800">Start faster with a trade/service template. You can still edit everything manually.</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {JOB_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        className={`rounded-2xl border p-3 text-left text-sm font-black transition ${selectedTemplate === template.id ? "border-blue-500 bg-white text-blue-800 shadow-sm" : "border-blue-100 bg-white/80 text-slate-800 hover:border-blue-300"}`}
                      >
                        {template.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div className="flex items-center gap-2 text-base font-black text-slate-950"><Users className="h-5 w-5 text-blue-600" /> Customer and site</div>
                <div>
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" value={form.title} onChange={(e) => setField("title", e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="client_id">Client</Label>
                    <select id="client_id" value={form.client_id} onChange={(e) => handleClientChange(e.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-3">
                      <option value="">Select client</option>
                      {clients.map((client) => {
                        const clientId = client.id || client._id;
                        return <option key={clientId} value={clientId}>{client.name || client.client_name || "Client"}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900" />
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 text-base font-black text-slate-950"><Repeat className="h-5 w-5 text-blue-600" /> Schedule and assignment</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="scheduled_date">Scheduled Date / Time</Label>
                    <Input id="scheduled_date" type="datetime-local" value={form.scheduled_date} onChange={(e) => setField("scheduled_date", e.target.value)} style={{ colorScheme: "light" }} className="bg-white border-slate-200 text-slate-900" />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select id="status" value={form.status} onChange={(e) => setField("status", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white text-slate-900 p-3">
                      <option value="assigned">Assigned</option>
                      <option value="acknowledged">Acknowledged</option>
                      <option value="on_the_way">On the way</option>
                      <option value="in_progress">In Progress</option>
                      <option value="paused">Paused</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="job-country">Country</Label>
                    <select id="job-country" value={form.country || "New Zealand"} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, region: "", assigned_worker_id: "" }))} className="w-full rounded-md border border-slate-200 bg-white text-slate-900 p-3">
                      {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="job-region">Region / State</Label>
                    <select id="job-region" value={form.region || ""} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value, assigned_worker_id: "" }))} className="w-full rounded-md border border-slate-200 bg-white text-slate-900 p-3">
                      <option value="">Select region / state</option>
                      {getRegionOptions(form.country || "New Zealand").map((region) => <option key={region} value={region}>{region}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="assigned_worker_id">Assigned Worker</Label>
                  <select id="assigned_worker_id" value={form.assigned_worker_id} onChange={(e) => setField("assigned_worker_id", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white text-slate-900 p-3">
                    <option value="">Select worker</option>
                    {filteredWorkers.map((worker) => {
                      const workerId = worker.id || worker._id;
                      const regionText = worker.region ? ` • ${worker.region}` : "";
                      const countryText = worker.country ? ` (${worker.country}${regionText})` : "";
                      return <option key={workerId} value={workerId}>{(worker.name || worker.email || "Worker") + countryText}</option>;
                    })}
                  </select>
                  {selectedWorker ? <p className="mt-2 text-xs font-semibold text-slate-500">Selected: {selectedWorker.name || selectedWorker.email}</p> : null}
                </div>

                {workerConflicts.length > 0 && (
                  <div className={`rounded-2xl border p-4 ${hardConflict ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`} data-testid="worker-schedule-conflict-warning">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                      <div>
                        <p className="text-sm font-black">Worker schedule warning</p>
                        <p className="mt-1 text-sm font-semibold">This worker already has {workerConflicts.length} active job{workerConflicts.length === 1 ? "" : "s"} on this date{hardConflict ? " around the same hour" : ""}.</p>
                        <div className="mt-2 space-y-1 text-xs font-semibold">
                          {workerConflicts.slice(0, 3).map((job) => <p key={jobId(job)}>• {job.title || "Job"} — {String(job.scheduled_date || "").slice(0, 16).replace("T", " ")}</p>)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-base font-black text-slate-950"><DollarSign className="h-5 w-5 text-blue-600" /> Pricing source for invoices</div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="pricing_type">Pricing Type</Label>
                    <select id="pricing_type" value={form.pricing_type} onChange={(e) => setField("pricing_type", e.target.value)} className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-3">
                      {PRICING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  {(form.pricing_type === "fixed" || form.pricing_type === "fixed_extras") && (
                    <div>
                      <Label htmlFor="price">Fixed Price</Label>
                      <Input id="price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setField("price", e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900" />
                    </div>
                  )}
                  {(form.pricing_type === "hourly" || form.pricing_type === "hourly_extras") && (
                    <>
                      <div>
                        <Label htmlFor="hourly_rate">Hourly Rate</Label>
                        <Input id="hourly_rate" type="number" min="0" step="0.01" value={form.hourly_rate} onChange={(e) => setField("hourly_rate", e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900" />
                      </div>
                      <div>
                        <Label htmlFor="estimated_hours">Estimated Hours</Label>
                        <Input id="estimated_hours" type="number" min="0" step="0.25" value={form.estimated_hours} onChange={(e) => setField("estimated_hours", e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900" />
                      </div>
                    </>
                  )}
                  {(form.pricing_type === "fixed_extras" || form.pricing_type === "hourly_extras") && (
                    <div>
                      <Label htmlFor="extras_amount">Extras Allowance</Label>
                      <Input id="extras_amount" type="number" min="0" step="0.01" value={form.extras_amount} onChange={(e) => setField("extras_amount", e.target.value)} className="bg-slate-50 border-slate-200 text-slate-900" />
                    </div>
                  )}
                </div>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-semibold text-blue-800">Estimated invoice source total: <span className="font-black">${estimatedTotal.toFixed(2)}</span></div>
              </section>

              {form.checklist_items?.length > 0 && (
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-base font-black text-slate-950"><ClipboardList className="h-5 w-5 text-blue-600" /> Template checklist</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {form.checklist_items.map((item, index) => <div key={item.id || index} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">{item.label || item}</div>)}
                  </div>
                </section>
              )}

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_recurring} onChange={(e) => setField("is_recurring", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-testid="recurring-checkbox" />
                  <span className="text-sm font-black text-slate-800">Recurring job</span>
                </label>
                {form.is_recurring && (
                  <div>
                    <Label htmlFor="recurring_frequency">Frequency</Label>
                    <select id="recurring_frequency" value={form.recurring_frequency} onChange={(e) => setField("recurring_frequency", e.target.value)} className="w-full rounded-md border border-slate-200 bg-white text-slate-900 p-3" data-testid="recurring-frequency">
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </section>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea id="notes" value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={4} className="w-full rounded-md border border-slate-200 bg-slate-50 text-slate-900 p-3 outline-none" />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/jobs")}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {saving ? "Saving..." : isEdit ? "Update Job" : "Create Job"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
