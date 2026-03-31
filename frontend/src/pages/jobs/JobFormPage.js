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
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPES_BY_CATEGORY } from "../../lib/utils";

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
          price: j.price || "", notes: j.notes || "", is_recurring: j.is_recurring || false,
          recurrence_pattern: j.recurrence_pattern || "",
          assigned_worker_id: j.assigned_worker_id || "",
        });
      } else {
        navigate("/jobs");
      }
    }
  }, [get, id, isEditing, isEmployer, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClientChange = (clientId) => {
    setForm((prev) => ({ ...prev, client_id: clientId }));
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setForm((prev) => ({
        ...prev,
        client_id: clientId,
        customer_name: client.name || prev.customer_name,
        address: client.address || prev.address,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      estimated_duration: parseInt(form.estimated_duration) || 60,
      scheduled_date: form.scheduled_date ? new Date(form.scheduled_date + "T00:00:00Z").toISOString() : null,
      client_id: form.client_id || null,
      assigned_worker_id: form.assigned_worker_id || null,
    };
    if (!payload.client_id) delete payload.client_id;
    if (!payload.assigned_worker_id) delete payload.assigned_worker_id;

    const res = isEditing ? await patch(`/jobs/${id}`, payload) : await post("/jobs", payload);
    if (res.success) {
      toast.success(isEditing ? "Job updated" : "Job created");
      navigate("/jobs");
    } else {
      toast.error(res.error || "Failed to save job");
    }
  };

  if (!isEmployer) {
    return <Layout><div className="p-6 text-churvox-muted text-center">Only employers can create or edit jobs.</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto" data-testid="job-form-page">
        <button onClick={() => navigate("/jobs")} className="flex items-center gap-2 text-churvox-muted hover:text-white mb-4" data-testid="back-to-jobs">
          <ArrowLeft size={18} /> Jobs
        </button>

        <Card className="bg-churvox-card border-churvox-border">
          <CardHeader>
            <CardTitle className="text-white">{isEditing ? "Edit Job" : "New Job"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-churvox-muted">Job Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" placeholder="e.g., Fix kitchen plumbing" data-testid="job-title-input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-churvox-muted">Job Type</Label>
                  <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="job-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border max-h-60">
                      {Object.entries(JOB_TYPES_BY_CATEGORY).map(([cat, types]) => (
                        <SelectGroup key={cat}>
                          <SelectLabel className="text-churvox-muted text-xs">{cat}</SelectLabel>
                          {types.map((t) => (
                            <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-churvox-muted">Client</Label>
                  <Select value={form.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="job-client-select">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border">
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-churvox-muted">Customer Name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-customer-name" />
              </div>

              <div>
                <Label className="text-churvox-muted">Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" placeholder="Job site address" data-testid="job-address-input" />
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-churvox-muted">Price ($)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required className="bg-churvox-bg border-churvox-border text-white" data-testid="job-price-input" />
                </div>
                <div>
                  <Label className="text-churvox-muted">Duration (min)</Label>
                  <Input type="number" value={form.estimated_duration} onChange={(e) => setForm({ ...form, estimated_duration: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" data-testid="job-duration-input" />
                </div>
              </div>

              {/* Worker Assignment */}
              {workers.length > 0 && (
                <div>
                  <Label className="text-churvox-muted">Assign Worker (optional)</Label>
                  <Select value={form.assigned_worker_id} onValueChange={(v) => setForm({ ...form, assigned_worker_id: v })}>
                    <SelectTrigger className="bg-churvox-bg border-churvox-border text-white" data-testid="job-worker-select">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="bg-churvox-card border-churvox-border">
                      {workers.map((w) => (
                        <SelectItem key={w.id} value={w.id} className="text-white">{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-churvox-muted">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-churvox-bg border-churvox-border text-white" rows={3} placeholder="Job notes..." data-testid="job-notes-input" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/jobs")} className="flex-1 border-churvox-border text-churvox-muted">
                  Cancel
                </Button>
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
