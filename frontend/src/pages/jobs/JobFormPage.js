import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

const EMPTY_FORM = {
  title: "",
  job_type: "",
  client_id: "",
  client_name: "",
  address: "",
  scheduled_date: "",
  notes: "",
  assigned_worker_id: "",
  status: "assigned",
  pricing_type: "fixed",
  fixed_price: "",
  hourly_rate: "",
};

function toInputDateTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [searchParams] = useSearchParams();
  const workerIdFromQuery = searchParams.get("workerId") || "";

  const { get, post, patch } = useApi();

  const [form, setForm] = useState(EMPTY_FORM);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);

  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id || c._id) === String(form.client_id)),
    [clients, form.client_id]
  );

  const loadPage = useCallback(async () => {
    setLoadingPage(true);

    try {
      const [clientsRes, workersRes, jobRes] = await Promise.all([
        get("/clients"),
        get("/team/workers"),
        isEdit ? get(`/jobs/${id}`) : Promise.resolve(null),
      ]);

      const loadedClients = clientsRes?.success && Array.isArray(clientsRes.data) ? clientsRes.data : [];
      const loadedWorkers = workersRes?.success && Array.isArray(workersRes.data) ? workersRes.data : [];

      setClients(loadedClients);
      setWorkers(loadedWorkers);

      if (isEdit && jobRes?.success && jobRes?.data) {
        const j = jobRes.data;
        setForm({
          title: j.title || "",
          job_type: j.job_type || "",
          client_id: j.client_id || "",
          client_name: j.client_name || "",
          address: j.address || "",
          scheduled_date: toInputDateTime(j.scheduled_date),
          notes: j.notes || "",
          assigned_worker_id: j.assigned_worker_id || "",
          status: j.status || "assigned",
          pricing_type: j.pricing_type || "fixed",
          fixed_price: j.fixed_price ?? "",
          hourly_rate: j.hourly_rate ?? "",
        });
      } else {
        setForm((prev) => ({
          ...EMPTY_FORM,
          assigned_worker_id: workerIdFromQuery || prev.assigned_worker_id || "",
        }));
      }
    } catch {
      toast.error("Failed to load job form");
    } finally {
      setLoadingPage(false);
    }
  }, [get, id, isEdit, workerIdFromQuery]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!selectedClient) return;
    setForm((prev) => ({
      ...prev,
      client_name: selectedClient.name || selectedClient.client_name || "",
      address: prev.address || selectedClient.address || "",
    }));
  }, [selectedClient]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        title: form.title.trim() || form.job_type.trim() || "Job",
        job_type: form.job_type.trim() || form.title.trim() || "General",
        client_id: form.client_id || null,
        client_name: form.client_name || "",
        address: form.address || "",
        scheduled_date: form.scheduled_date || null,
        notes: form.notes || "",
        assigned_worker_id: form.assigned_worker_id || null,
        status: form.status || "assigned",
        pricing_type: form.pricing_type || "fixed",
        fixed_price: form.pricing_type === "fixed" ? Number(form.fixed_price || 0) : 0,
        hourly_rate: form.pricing_type === "hourly" ? Number(form.hourly_rate || 0) : 0,
      };

      const res = isEdit ? await patch(`/jobs/${id}`, payload) : await post("/jobs", payload);

      if (res?.success) {
        toast.success(isEdit ? "Job updated" : "Job created");
        const nextId = res?.data?.id || res?.data?._id || id;
        if (nextId) {
          navigate(`/jobs/${nextId}`);
        } else {
          navigate("/jobs");
        }
      } else {
        toast.error(res?.error || "Failed to save job");
      }
    } catch {
      toast.error("Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  if (loadingPage) {
    return (
      <Layout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          <Card className="bg-churvox-card border-churvox-border">
            <CardContent className="p-6 text-white">Loading job form...</CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{isEdit ? "Edit Job" : "New Job"}</h1>
          <p className="text-sm text-churvox-muted mt-1">Create or update a job.</p>
        </div>

        <Card className="bg-churvox-card border-churvox-border">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="bg-churvox-bg border-churvox-border text-white"
                  placeholder="Window Cleaning"
                />
              </div>

              <div>
                <Label htmlFor="job_type">Job Type</Label>
                <Input
                  id="job_type"
                  value={form.job_type}
                  onChange={(e) => setField("job_type", e.target.value)}
                  className="bg-churvox-bg border-churvox-border text-white"
                  placeholder="Window Cleaning"
                />
              </div>

              <div>
                <Label htmlFor="client_id">Client</Label>
                <select
                  id="client_id"
                  value={form.client_id}
                  onChange={(e) => setField("client_id", e.target.value)}
                  className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3"
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
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setField("address", e.target.value)}
                  className="bg-churvox-bg border-churvox-border text-white"
                  placeholder="Job address"
                />
              </div>

              <div>
                <Label htmlFor="scheduled_date">Scheduled Date</Label>
                <Input
                  id="scheduled_date"
                  type="datetime-local"
                  value={form.scheduled_date}
                  onChange={(e) => setField("scheduled_date", e.target.value)}
                  className="bg-churvox-bg border-churvox-border text-white"
                />
              </div>

              <div>
                <Label htmlFor="assigned_worker_id">Assigned Worker</Label>
                <select
                  id="assigned_worker_id"
                  value={form.assigned_worker_id}
                  onChange={(e) => setField("assigned_worker_id", e.target.value)}
                  className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3"
                >
                  <option value="">Select worker</option>
                  {workers.map((worker) => {
                    const workerId = worker.id || worker._id;
                    return (
                      <option key={workerId} value={workerId}>
                        {worker.name || worker.email || "Worker"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label htmlFor="pricing_type">Pricing Type</Label>
                <select
                  id="pricing_type"
                  value={form.pricing_type}
                  onChange={(e) => setField("pricing_type", e.target.value)}
                  className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3"
                >
                  <option value="fixed">Fixed</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>

              {form.pricing_type === "fixed" ? (
                <div>
                  <Label htmlFor="fixed_price">Fixed Price</Label>
                  <Input
                    id="fixed_price"
                    type="number"
                    value={form.fixed_price}
                    onChange={(e) => setField("fixed_price", e.target.value)}
                    className="bg-churvox-bg border-churvox-border text-white"
                    placeholder="0"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    value={form.hourly_rate}
                    onChange={(e) => setField("hourly_rate", e.target.value)}
                    className="bg-churvox-bg border-churvox-border text-white"
                    placeholder="0"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3"
                >
                  <option value="assigned">Assigned</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-churvox-border bg-churvox-bg text-white p-3 outline-none"
                  placeholder="Job notes"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/jobs")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-churvox-accent hover:bg-churvox-accent/90">
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
