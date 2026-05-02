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

function workerMatchesJobCountryRegion(worker, form) {
  const norm = (v) => String(v || "").trim().toLowerCase();

  const jobCountry = norm(form?.country);
  const jobRegion = norm(form?.region);
  const workerCountry = norm(worker?.country);
  const workerRegion = norm(worker?.region);

  // If job location is not fully chosen yet, do not hide workers.
  if (!jobCountry || !jobRegion) return true;

  // Once job location is chosen, require exact worker match.
  return workerCountry === jobCountry && workerRegion === jobRegion;
}

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [searchParams] = useSearchParams();
  const workerIdFromQuery = searchParams.get("workerId") || "";
  const { get, post, patch } = useApi();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({
    title: "",
        client_id: "",
    client_name: "",
    address: "",
    scheduled_date: "",
    country: "New Zealand",
    region: "",
    notes: "",
    assigned_worker_id: workerIdFromQuery,
    status: "assigned",
    is_recurring: false,
    recurring_frequency: "weekly",
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [clientsRes, workersRes] = await Promise.all([
          get("/clients"),
          get("/team/workers"),
        ]);

        setClients(clientsRes?.success && Array.isArray(clientsRes.data) ? clientsRes.data : []);
        setWorkers(workersRes?.success && Array.isArray(workersRes.data) ? workersRes.data : []);

        if (isEdit) {
          const jobRes = await get(`/jobs/${id}`);
          if (jobRes?.success && jobRes.data) {
            const j = jobRes.data;
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
              is_recurring: j.is_recurring || false,
              recurring_frequency: j.recurring_frequency || "weekly",
            });
          }
        }
      } catch {
        toast.error("Failed to load job form");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [get, id, isEdit]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredWorkers = workers.filter((worker) => workerMatchesJobCountryRegion(worker, form));

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => String(c.id || c._id) === String(clientId));
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      client_name: client?.name || client?.client_name || "",
      address: client?.address || prev.address || "",
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


  if (!isEdit) {
    return (
      <Layout>
        <PremiumPage maxWidth={820}>
          <PremiumHero eyebrow="New" title="New Job" subtitle="Create and assign a job." />
          <PremiumCard>
            <JobCreateForm onCancel={() => navigate("/jobs")} onSuccess={(data) => navigate(`/jobs/${data?.id || data?._id || ""}`)} submitLabel="Create Job" />
          </PremiumCard>
        </PremiumPage>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={820}>
        <button onClick={() => navigate("/jobs")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-jobs">
          <ArrowLeft size={16} /> Back to jobs
        </button>

        <PremiumHero
          eyebrow={isEdit ? "Edit job" : "New job"}
          title={isEdit ? "Edit Job" : "New Job"}
          subtitle={isEdit ? "Update job details, schedule and assignment." : "Create a job and assign it to a worker."}
          icon={<Briefcase className="h-6 w-6" />}
        />

        <PremiumCard title="Job details" icon={<Briefcase className="h-5 w-5" />}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-[#0d1b34] font-semibold">Job Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                />
              </div>

              <div>
                <Label htmlFor="client_id" className="text-[#0d1b34] font-semibold">Client</Label>
                <select
                  id="client_id"
                  value={form.client_id}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"
                >
                  <option value="">Select client</option>
                  {clients.map((client) => {
                    const clientId = client.id || client._id;
                    return (
                      <option key={clientId} value={clientId}>
                        {client.name || client.client_name || "Client"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label htmlFor="address" className="text-[#0d1b34] font-semibold">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                />
              </div>

              <div>
                <Label htmlFor="scheduled_date" className="text-[#0d1b34] font-semibold">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="datetime-local"
                  value={form.scheduled_date}
                  onChange={(e) => setField("scheduled_date", e.target.value)}
                  style={{ colorScheme: "light" }}
                  className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="job-country" className="text-[#0d1b34] font-semibold">Country</Label>
                  <select
                    id="job-country"
                    value={form.country || "New Zealand"}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, region: "", assigned_worker_id: "" }))}
                    className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"
                  >
                    {COUNTRY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="job-region" className="text-[#0d1b34] font-semibold">Region / State</Label>
                  <select
                    id="job-region"
                    value={form.region || ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value, assigned_worker_id: "" }))}
                    className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"
                  >
                    <option value="">Select region / state</option>
                    {getRegionOptions(form.country || "New Zealand").map((region) => (
                      <option key={region} value={region}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="assigned_worker_id" className="text-[#0d1b34] font-semibold">Assigned Worker</Label>
                <select
                  id="assigned_worker_id"
                  value={form.assigned_worker_id}
                  onChange={(e) => setField("assigned_worker_id", e.target.value)}
                  className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"
                >
                  <option value="">Select worker</option>
                  {filteredWorkers.map((worker) => {
                    const workerId = worker.id || worker._id;
                    const regionText = worker.region ? ` • ${worker.region}` : "";
                    const countryText = worker.country ? ` (${worker.country}${regionText})` : "";
                    return (
                      <option key={workerId} value={workerId}>
                        {(worker.name || worker.email || "Worker") + countryText}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label htmlFor="status" className="text-[#0d1b34] font-semibold">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3"
                >
                  <option value="assigned">Assigned</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <Label htmlFor="notes" className="text-[#0d1b34] font-semibold">Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-[#d8e3f3] bg-[#f6faff] text-[#0d1b34] p-3 outline-none focus:border-[#2563eb]"
                />
              </div>

              {/* Recurring Job */}
              <div className="border border-[#d8e3f3] bg-[#f6faff] rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_recurring}
                    onChange={(e) => setField("is_recurring", e.target.checked)}
                    className="h-4 w-4 rounded border-[#d8e3f3] text-[#2563eb] focus:ring-[#2563eb]"
                    data-testid="recurring-checkbox"
                  />
                  <span className="text-sm font-semibold text-[#0d1b34]">Recurring job</span>
                </label>
                {form.is_recurring && (
                  <div>
                    <Label htmlFor="recurring_frequency" className="text-[#0d1b34] font-semibold">Frequency</Label>
                    <select
                      id="recurring_frequency"
                      value={form.recurring_frequency}
                      onChange={(e) => setField("recurring_frequency", e.target.value)}
                      className="w-full rounded-md border border-[#d8e3f3] bg-white text-[#0d1b34] p-3"
                      data-testid="recurring-frequency"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 flex-wrap">
                <Button type="button" variant="outline" onClick={() => navigate("/jobs")} className="flex-1 min-w-[140px] border-[#d8e3f3] text-[#1a2c4d] hover:bg-[#eff4ff]">
                  Cancel
                </Button>
                <PremiumButton type="submit" disabled={saving} className="flex-1 min-w-[200px]">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : isEdit ? "Update Job" : "Create Job"}
                </PremiumButton>
              </div>
            </form>
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
