import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPES_BY_CATEGORY } from "../../lib/utils";

const PRICING_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed_extras", label: "Fixed + Extras" },
  { value: "hourly_extras", label: "Hourly + Extras" },
];

function getJobTypeLabel(value) {
  for (const types of Object.values(JOB_TYPES_BY_CATEGORY || {})) {
    const found = (types || []).find((t) => t.value === value);
    if (found) return found.label;
  }
  return value || "Other";
}

function getAllJobTypeOptions() {
  const categories = Object.entries(JOB_TYPES_BY_CATEGORY || {});
  if (!categories.length) {
    return [{ value: "other", label: "Other", category: "General" }];
  }

  const options = [];
  for (const [category, items] of categories) {
    for (const item of items || []) {
      options.push({
        value: item.value,
        label: item.label,
        category,
      });
    }
  }

  if (!options.find((x) => x.value === "other")) {
    options.push({ value: "other", label: "Other", category: "General" });
  }

  return options;
}

export default function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const isEmployer = !!auth.isEmployer;
  const { get, post, patch } = useApi();
  const isEditing = !!id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({
    title: "",
    job_type: "other",
    client_id: "",
    customer_name: "",
    address: "",
    scheduled_date: "",
    scheduled_time: "",
    estimated_duration: "60",
    price: "",
    pricing_type: "fixed",
    hourly_rate: "",
    extras: [],
    notes: "",
    assigned_worker_id: "",
    is_recurring: false,
    recurring_frequency: "weekly",
    custom_repeat_days: "",
  });

  const jobTypeOptions = getAllJobTypeOptions();

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const [clientsRes, workersRes] = await Promise.all([
        get("/clients"),
        isEmployer ? get("/team/workers") : Promise.resolve({ success: true, data: [] }),
      ]);

      const nextClients =
        clientsRes?.success && Array.isArray(clientsRes.data) ? clientsRes.data : [];
      const nextWorkers =
        workersRes?.success && Array.isArray(workersRes.data) ? workersRes.data : [];

      setClients(nextClients);
      setWorkers(nextWorkers);

      if (isEditing) {
        const res = await get(`/jobs/${id}`);
        if (!res?.success) {
          toast.error("Could not load job");
          navigate("/jobs");
          return;
        }

        const j = res.data || {};
        setForm({
          title: j.title || "",
          job_type: j.job_type || "other",
          client_id: j.client_id || "",
          customer_name: j.customer_name || "",
          address: j.address || "",
          scheduled_date: j.scheduled_date ? String(j.scheduled_date).split("T")[0] : "",
          scheduled_time: j.scheduled_time || "",
          estimated_duration: String(j.estimated_duration ?? 60),
          price: j.price ?? "",
          pricing_type: j.pricing_type || "fixed",
          hourly_rate: j.hourly_rate ?? "",
          extras: Array.isArray(j.extras) ? j.extras : [],
          notes: j.notes || "",
          assigned_worker_id: j.assigned_worker_id || "",
          is_recurring: !!j.is_recurring,
          recurring_frequency: j.recurring_frequency || "weekly",
          custom_repeat_days: j.custom_repeat_days ? String(j.custom_repeat_days) : "",
        });
      }
    } catch (err) {
      console.error("Job form load error:", err);
      toast.error("Failed to load job form");
    } finally {
      setLoading(false);
    }
  }, [get, id, isEditing, isEmployer, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => String(c.id || c._id) === String(clientId));
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      customer_name: client?.client_name || client?.name || client?.contact_name || prev.customer_name,
      address: client?.address || prev.address,
    }));
  };

  const addExtra = () => {
    setForm((prev) => ({
      ...prev,
      extras: [...(prev.extras || []), { description: "", amount: "" }],
    }));
  };

  const removeExtra = (index) => {
    setForm((prev) => ({
      ...prev,
      extras: (prev.extras || []).filter((_, i) => i !== index),
    }));
  };

  const updateExtra = (index, field, value) => {
    setForm((prev) => {
      const extras = [...(prev.extras || [])];
      extras[index] = { ...(extras[index] || {}), [field]: value };
      return { ...prev, extras };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const typeLabel = getJobTypeLabel(form.job_type);
      const clientName = form.customer_name || "No Client";
      const autoTitle = `${typeLabel} - ${clientName}`;

      const payload = {
        ...form,
        title: form.title || autoTitle,
        price: parseFloat(form.price) || 0,
        hourly_rate: parseFloat(form.hourly_rate) || 0,
        estimated_duration: parseInt(form.estimated_duration, 10) || 60,
        scheduled_date: form.scheduled_date
          ? new Date(`${form.scheduled_date}T00:00:00Z`).toISOString()
          : null,
        client_id: form.client_id || null,
        assigned_worker_id: form.assigned_worker_id || null,
        extras: (form.extras || [])
          .map((item) => ({
            description: item.description || "",
            amount: parseFloat(item.amount) || 0,
          }))
          .filter((item) => item.description),
        is_recurring: !!form.is_recurring,
        recurring_frequency: form.is_recurring ? form.recurring_frequency : null,
        custom_repeat_days:
          form.is_recurring && form.recurring_frequency === "custom"
            ? parseInt(form.custom_repeat_days, 10) || null
            : null,
      };

      if (!payload.client_id) delete payload.client_id;
      if (!payload.assigned_worker_id) delete payload.assigned_worker_id;

      const res = isEditing
        ? await patch(`/jobs/${id}`, payload)
        : await post("/jobs", payload);

      if (res?.success) {
        toast.success(isEditing ? "Job updated" : "Job created");
        navigate("/jobs");
      } else {
        toast.error(res?.error || "Failed to save job");
      }
    } catch (err) {
      console.error("Job save error:", err);
      toast.error("Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  if (!isEmployer) {
    return (
      <Layout>
        <div className="p-6 text-churvox-muted text-center">
          Only employers can create or edit jobs.
        </div>
      </Layout>
    );
  }

  const showHourly =
    form.pricing_type === "hourly" || form.pricing_type === "hourly_extras";
  const showFixed =
    form.pricing_type === "fixed" || form.pricing_type === "fixed_extras";
  const showExtras =
    form.pricing_type === "fixed_extras" || form.pricing_type === "hourly_extras";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto" data-testid="job-form-page">
        <button
          onClick={() => navigate("/jobs")}
          className="flex items-center gap-2 text-churvox-muted hover:text-white mb-4"
          data-testid="back-to-jobs"
          type="button"
        >
          <ArrowLeft size={18} />
          Back to Jobs
        </button>

        <Card className="bg-churvox-card border-churvox-border">
          <CardHeader>
            <CardTitle>{isEditing ? "Edit Job" : "New Job"}</CardTitle>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-churvox-muted">Loading job form...</div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="job_type">Job Type</Label>
                    <select
                      id="job_type"
                      value={form.job_type}
                      onChange={(e) => setField("job_type", e.target.value)}
                      className="w-full h-10 rounded-md border border-churvox-border bg-transparent px-3"
                    >
                      {jobTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.category} - {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_id">Client</Label>
                    <select
                      id="client_id"
                      value={form.client_id}
                      onChange={(e) => handleClientChange(e.target.value)}
                      className="w-full h-10 rounded-md border border-churvox-border bg-transparent px-3"
                    >
                      <option value="">No saved client</option>
                      {clients.map((client) => (
                        <option key={client.id || client._id} value={client.id || client._id}>
                          {client.client_name || client.name || client.contact_name || "Unnamed client"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name</Label>
                    <Input
                      id="customer_name"
                      value={form.customer_name}
                      onChange={(e) => setField("customer_name", e.target.value)}
                      placeholder="Customer name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assigned_worker_id">Assigned Worker</Label>
                    <select
                      id="assigned_worker_id"
                      value={form.assigned_worker_id}
                      onChange={(e) => setField("assigned_worker_id", e.target.value)}
                      className="w-full h-10 rounded-md border border-churvox-border bg-transparent px-3"
                    >
                      <option value="">Unassigned</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.full_name || worker.name || worker.email || "Worker"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      placeholder="Job address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date">Scheduled Date</Label>
                    <Input
                      id="scheduled_date"
                      type="date"
                      value={form.scheduled_date}
                      onChange={(e) => setField("scheduled_date", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="scheduled_time">Scheduled Time</Label>
                    <Input
                      id="scheduled_time"
                      type="time"
                      value={form.scheduled_time}
                      onChange={(e) => setField("scheduled_time", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="estimated_duration">Estimated Duration (mins)</Label>
                    <Input
                      id="estimated_duration"
                      type="number"
                      min="0"
                      value={form.estimated_duration}
                      onChange={(e) => setField("estimated_duration", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pricing_type">Pricing Type</Label>
                    <select
                      id="pricing_type"
                      value={form.pricing_type}
                      onChange={(e) => setField("pricing_type", e.target.value)}
                      className="w-full h-10 rounded-md border border-churvox-border bg-transparent px-3"
                    >
                      {PRICING_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {showFixed && (
                    <div className="space-y-2">
                      <Label htmlFor="price">Fixed Price</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={(e) => setField("price", e.target.value)}
                      />
                    </div>
                  )}

                  {showHourly && (
                    <div className="space-y-2">
                      <Label htmlFor="hourly_rate">Hourly Rate</Label>
                      <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.hourly_rate}
                        onChange={(e) => setField("hourly_rate", e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 rounded-lg border border-churvox-border p-4">
                  <div className="flex items-center gap-3">
                    <input
                      id="is_recurring"
                      type="checkbox"
                      checked={form.is_recurring}
                      onChange={(e) => setField("is_recurring", e.target.checked)}
                    />
                    <Label htmlFor="is_recurring" className="mb-0">
                      Recurring job
                    </Label>
                  </div>

                  {form.is_recurring && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="recurring_frequency">Repeat</Label>
                        <select
                          id="recurring_frequency"
                          value={form.recurring_frequency}
                          onChange={(e) => setField("recurring_frequency", e.target.value)}
                          className="w-full h-10 rounded-md border border-churvox-border bg-transparent px-3"
                        >
                          <option value="weekly">Weekly</option>
                          <option value="fortnightly">Fortnightly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      {form.recurring_frequency === "custom" && (
                        <div className="space-y-2">
                          <Label htmlFor="custom_repeat_days">Repeat every X days</Label>
                          <Input
                            id="custom_repeat_days"
                            type="number"
                            min="1"
                            value={form.custom_repeat_days}
                            onChange={(e) => setField("custom_repeat_days", e.target.value)}
                            placeholder="e.g. 10"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {showExtras && (
                  <div className="space-y-3 rounded-lg border border-churvox-border p-4">
                    <div className="flex items-center justify-between">
                      <Label>Extras</Label>
                      <Button type="button" variant="outline" onClick={addExtra}>
                        <Plus size={16} className="mr-2" />
                        Add Extra
                      </Button>
                    </div>

                    {(form.extras || []).length === 0 ? (
                      <div className="text-sm text-churvox-muted">No extras added yet.</div>
                    ) : (
                      <div className="space-y-3">
                        {(form.extras || []).map((extra, index) => (
                          <div key={index} className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
                            <Input
                              value={extra.description || ""}
                              onChange={(e) => updateExtra(index, "description", e.target.value)}
                              placeholder="Extra description"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={extra.amount || ""}
                              onChange={(e) => updateExtra(index, "amount", e.target.value)}
                              placeholder="Amount"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeExtra(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="Job notes"
                    rows={5}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? "Saving..." : isEditing ? "Update Job" : "Create Job"}
                  </Button>

                  <Button type="button" variant="outline" onClick={() => navigate("/jobs")}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
