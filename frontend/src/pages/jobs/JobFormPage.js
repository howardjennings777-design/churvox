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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../../components/ui/select";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPES_BY_CATEGORY } from "../../lib/utils";


const normalizeRecurringJobPayload = (formData) => {
  const isRecurring = !!formData?.is_recurring;
  const frequency = isRecurring ? (formData?.recurring_frequency || '') : '';
  const customDays =
    isRecurring && frequency === 'custom'
      ? Number(formData?.custom_repeat_days || 0)
      : null;

  return {
    ...formData,
    is_recurring: isRecurring,
    recurring_frequency: isRecurring ? frequency : null,
    custom_repeat_days: isRecurring ? customDays : null,
    recurring_parent_job_id: formData?.recurring_parent_job_id || null,
    next_recurring_due_date: formData?.next_recurring_due_date || null,
  };


const handleRecurringToggleChange = (e, formData, setFormData) => {
  const checked = !!e.target.checked;
  setFormData({
    ...formData,
    is_recurring: checked,
    recurring_frequency: checked ? (formData.recurring_frequency || 'weekly') : '',
    custom_repeat_days: checked ? formData.custom_repeat_days : '',
  });
};


};



const PRICING_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed_extras", label: "Fixed + Extras" },
  { value: "hourly_extras", label: "Hourly + Extras" },
];

function getJobTypeLabel(value) {
  for (const types of Object.values(JOB_TYPES_BY_CATEGORY)) {
    const found = types.find((t) => t.value === value);
    if (found) return found.label;
  }
  return value;
}

export default function JobFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployer } = useAuth();
  const { get, post, patch, loading } = useApi();
  const isEditing = !!id;

  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({
    title: "", job_type: "other", client_id: "", customer_name: "", address: "",
    scheduled_date: "", scheduled_time: "", estimated_duration: 60, price: "",
    pricing_type: "fixed", hourly_rate: "", extras: [],
    notes: "", is_recurring: false, recurrence_pattern: "", assigned_worker_id: "",
  });

  const fetchData = useCallback(async () => {
    const [clientsRes, workersRes] = await Promise.all([
      get("/clients"),
      isEmployer ? get("/team/workers") : Promise.resolve({ success: true, data: [] }),
    ]);
    if (clientsRes.success) setClients(clientsRes.data);
    if (workersRes.success) setWorkers(workersRes.data);

    if (isEditing) {
      const res = await get(`/jobs/${id}`);
      if (res.success) {
        const j = res.data;
        setForm({
          title: j.title || "", job_type: j.job_type || "other", client_id: j.client_id || "",
          customer_name: j.customer_name || "", address: j.address || "",
          scheduled_date: j.scheduled_date ? j.scheduled_date.split("T")[0] : "",
          scheduled_time: j.scheduled_time || "", estimated_duration: j.estimated_duration || 60,
          price: j.price || "", pricing_type: j.pricing_type || "fixed",
          hourly_rate: j.hourly_rate || "", extras: j.extras || [],
          notes: j.notes || "", is_recurring: j.is_recurring || false,
          recurrence_pattern: j.recurrence_pattern || "",
          assigned_worker_id: j.assigned_worker_id || "",
        });
      } else navigate("/jobs");
    }
  }, [get, id, isEditing, isEmployer, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((prev) => ({
      ...prev, client_id: clientId,
      customer_name: client?.name || prev.customer_name,
      address: client?.address || prev.address,
    }));
  };

  const addExtra = () => setForm((prev) => ({ ...prev, extras: [...prev.extras, { description: "", amount: "" }] }));
  const removeExtra = (i) => setForm((prev) => ({ ...prev, extras: prev.extras.filter((_, idx) => idx !== i) }));
  const updateExtra = (i, field, val) => setForm((prev) => {
    const extras = [...prev.extras];
    extras[i] = { ...extras[i], [field]: val };
    return { ...prev, extras };
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Auto-generate title from [Job Type] - [Client Name]
    const typeLabel = getJobTypeLabel(form.job_type);
    const clientName = form.customer_name || "No Client";
    const autoTitle = `${typeLabel} - ${clientName}`;

    const payload = {
      ...form,
      title: form.title || autoTitle,
      price: parseFloat(form.price) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      estimated_duration: parseInt(form.estimated_duration) || 60,
      scheduled_date: form.scheduled_date ? new Date(form.scheduled_date + "T00:00:00Z").toISOString() : null,
      client_id: form.client_id || null,
      assigned_worker_id: form.assigned_worker_id || null,
      extras: form.extras.map((e) => ({ description: e.description, amount: parseFloat(e.amount) || 0 })).filter((e) => e.description),
    };
    if (!payload.client_id) delete payload.client_id;
    if (!payload.assigned_worker_id) delete payload.assigned_worker_id;

    const res = isEditing ? await patch(`/jobs/${id}`, payload) : await post("/jobs", payload);
    if (res.success) { toast.success(isEditing ? "Job updated" : "Job created"); navigate("/jobs"); }
    else toast.error(res.error || "Failed to save job");
  };

  if (!isEmployer) return <Layout><div className="p-6 text-churvox-muted text-center">Only employers can create or edit jobs.</div></Layout>;

  const showHourly = form.pricing_type === "hourly" || form.pricing_type === "hourly_extras";
  const showFixed = form.pricing_type === "fixed" || form.pricing_type === "fixed_extras";
  const showExtras = form.pricing_type === "fixed_extras" || form.pricing_type === "hourly_extras";

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto" data-testid="job-form-page">
        <button onClick={() => { window.location.href="/emergency-job.html"; }} className="flex items-center gap-2 text-churvox-muted hover:text-white mb-4" data-testid="back-to-jobs">
          <ArrowLeft size={18} /> Jobs
        </button>

        <Card className="bg-churvox-card border-churvox-border">
          <CardHeader><CardTitle className="text-white">{isEditing ? "Edit Job" : "New Job"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-churvox-muted">Job Type</Label>
                  <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="job-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border max-h-60">
                      {Object.entries(JOB_TYPES_BY_CATEGORY).map(([cat, types]) => (
                        <SelectGroup key={cat}><SelectLabel className="text-churvox-muted text-xs">{cat}</SelectLabel>
                          {types.map((t) => <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-churvox-muted">Client</Label>
                  <Select value={form.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="job-client-select"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border">{(clients || []).map((c) => <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-churvox-muted">Customer Name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-customer-name" />
              </div>

              <div>
                <Label className="text-churvox-muted">Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" data-testid="job-address-input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-churvox-muted">Date</Label>
                  <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" data-testid="job-date-input" />
                </div>
                <div>
                  <Label className="text-churvox-muted">Time</Label>
                  <Input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-time-input" />
                </div>
              </div>

              {/* Pricing Type */}
              <div className="pt-3 border-t border-churvox-border">
                <Label className="text-churvox-muted">Pricing Type</Label>
                <Select value={form.pricing_type} onValueChange={(v) => setForm({ ...form, pricing_type: v })}>
                  <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="pricing-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-churvox-card border-churvox-border">
                    {PRICING_TYPES.map((p) => <SelectItem key={p.value} value={p.value} className="text-white">{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {showFixed && (
                  <div>
                    <Label className="text-churvox-muted">Fixed Price ($)</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-price-input" />
                  </div>
                )}
                {showHourly && (
                  <div>
                    <Label className="text-churvox-muted">Hourly Rate ($)</Label>
                    <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-hourly-rate" />
                  </div>
                )}
                <div>
                  <Label className="text-churvox-muted">Duration (min)</Label>
                  <Input type="number" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-duration-input" />
                </div>
              </div>

              {/* Extras */}
              {showExtras && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-churvox-muted">Extras</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addExtra} className="border-churvox-border text-churvox-muted" data-testid="add-extra-button">
                      <Plus size={14} className="mr-1" /> Add Extra
                    </Button>
                  </div>
                  {form.extras.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={ex.description} onChange={(e) => updateExtra(i, "description", e.target.value)} placeholder="Description" className="flex-1 bg-churvox-bg border-churvox-border text-white" data-testid={`extra-desc-${i}`} />
                      <Input type="number" step="0.01" value={ex.amount} onChange={(e) => updateExtra(i, "amount", e.target.value)} placeholder="$" className="w-24 bg-churvox-bg border-churvox-border text-white" data-testid={`extra-amount-${i}`} />
                      <button type="button" onClick={() => removeExtra(i)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              {/* Worker */}
              {workers.length > 0 && (
                <div>
                  <Label className="text-churvox-muted">Assign Worker (optional)</Label>
                  <Select value={form.assigned_worker_id} onValueChange={(v) => setForm({ ...form, assigned_worker_id: v })}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="job-worker-select"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border">{(workers || []).map((w) => <SelectItem key={w.id} value={w.id} className="text-white">{w.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-churvox-muted">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" rows={3} data-testid="job-notes-input" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { window.location.href="/emergency-job.html"; }} className="flex-1 border-churvox-border text-churvox-muted">Cancel</Button>
                
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-900">Recurring job</div>
            <div className="text-xs text-slate-500">Turn this on for weekly, fortnightly, monthly or custom repeat work.</div>
          </div>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={!!formData.is_recurring}
              onChange={(e) => handleRecurringToggleChange(e, formData, setFormData)}
            />
          </label>
        </div>

        {formData.is_recurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Repeat</label>
              <select
                value={formData.recurring_frequency || 'weekly'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurring_frequency: e.target.value,
                    custom_repeat_days:
                      e.target.value === 'custom'
                        ? (formData.custom_repeat_days || '')
                        : '',
                  })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {formData.recurring_frequency === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-1">Repeat every how many days?</label>
                <input
                  type="number"
                  min="1"
                  value={formData.custom_repeat_days || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      custom_repeat_days: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  placeholder="e.g. 10"
                />
              </div>
            )}
          </div>
        )}
      </div>


<Button type="submit" disabled={loading} className="flex-1 bg-churvox-accent hover:bg-churvox-accent/90" data-testid="submit-job-button">
                  {loading ? "Saving..." : isEditing ? "Update Job" : "Create Job"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
