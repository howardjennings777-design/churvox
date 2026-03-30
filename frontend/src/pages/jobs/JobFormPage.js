import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { JOB_TYPES_BY_CATEGORY } from "@/lib/utils";

const RECURRENCE_PATTERNS = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
];

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { get, post, patch, loading } = useApi();
  const isEdit = !!id;

  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    job_type: "other",
    client_id: searchParams.get("client_id") || "",
    customer_name: "",
    address: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "09:00",
    estimated_duration: 60,
    price: "",
    notes: "",
    is_recurring: false,
    recurrence_pattern: "weekly",
  });

  useEffect(() => {
    loadClients();
    if (isEdit) {
      loadJob();
    }
  }, [id]);

  const loadClients = async () => {
    const result = await get("/clients");
    if (result.success) {
      setClients(result.data);
    }
  };

  const loadJob = async () => {
    const result = await get(`/jobs/${id}`);
    if (result.success) {
      const job = result.data;
      setFormData({
        title: job.title || "",
        job_type: job.job_type || "other",
        client_id: job.client_id || "",
        customer_name: job.customer_name || "",
        address: job.address || "",
        scheduled_date: job.scheduled_date ? job.scheduled_date.split("T")[0] : "",
        scheduled_time: job.scheduled_time || "09:00",
        estimated_duration: job.estimated_duration || 60,
        price: job.price?.toString() || "",
        notes: job.notes || "",
        is_recurring: job.is_recurring || false,
        recurrence_pattern: job.recurrence_pattern || "weekly",
      });
    } else {
      toast.error("Job not found");
      navigate("/jobs");
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value 
    });
  };

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setFormData({
      ...formData,
      client_id: clientId,
      customer_name: client?.name || "",
      address: client?.address || formData.address,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!formData.address.trim()) {
      toast.error("Address is required");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error("Valid price is required");
      return;
    }

    const jobData = {
      ...formData,
      price: Number(formData.price),
      estimated_duration: Number(formData.estimated_duration),
      scheduled_date: new Date(formData.scheduled_date).toISOString(),
      client_id: formData.client_id || null,
      recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
    };

    const result = isEdit
      ? await patch(`/jobs/${id}`, jobData)
      : await post("/jobs", jobData);

    if (result.success) {
      toast.success(isEdit ? "Job updated" : "Job created");
      navigate("/jobs");
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 animate-in" data-testid="job-form-page">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/jobs")}
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-white font-heading">
              {isEdit ? "Edit Job" : "New Job"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEdit ? "Update job details" : "Schedule a new job for your client"}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="card-surface">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Weekly service, Kitchen renovation"
                  className="bg-secondary border-border"
                  required
                  data-testid="job-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_type">Job Type</Label>
                <Select
                  value={formData.job_type}
                  onValueChange={(value) => setFormData({ ...formData, job_type: value })}
                >
                  <SelectTrigger className="bg-secondary border-border" data-testid="job-type-select">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border max-h-[300px]">
                    {Object.entries(JOB_TYPES_BY_CATEGORY).map(([category, types]) => (
                      <SelectGroup key={category}>
                        <SelectLabel className="text-muted-foreground text-xs uppercase tracking-wider">
                          {category}
                        </SelectLabel>
                        {types.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_id">Client (Optional)</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={handleClientChange}
                >
                  <SelectTrigger className="bg-secondary border-border" data-testid="job-client-select">
                    <SelectValue placeholder="Select a client or enter manually" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="">No client (manual entry)</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!formData.client_id && (
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    placeholder="Customer name for this job"
                    className="bg-secondary border-border"
                    data-testid="job-customer-name-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="address">Job Address *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, Auckland"
                  className="bg-secondary border-border"
                  required
                  data-testid="job-address-input"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-surface">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Date *</Label>
                  <Input
                    id="scheduled_date"
                    name="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    required
                    data-testid="job-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled_time">Time</Label>
                  <Input
                    id="scheduled_time"
                    name="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={handleChange}
                    className="bg-secondary border-border"
                    data-testid="job-time-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_duration">Estimated Duration (minutes)</Label>
                <Input
                  id="estimated_duration"
                  name="estimated_duration"
                  type="number"
                  value={formData.estimated_duration}
                  onChange={handleChange}
                  min="15"
                  step="15"
                  className="bg-secondary border-border"
                  data-testid="job-duration-input"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                <div>
                  <Label htmlFor="is_recurring" className="text-base">Recurring Job</Label>
                  <p className="text-sm text-muted-foreground">Schedule this job to repeat automatically</p>
                </div>
                <Switch
                  id="is_recurring"
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                  data-testid="job-recurring-switch"
                />
              </div>

              {formData.is_recurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_pattern">Repeat</Label>
                  <Select
                    value={formData.recurrence_pattern}
                    onValueChange={(value) => setFormData({ ...formData, recurrence_pattern: value })}
                  >
                    <SelectTrigger className="bg-secondary border-border" data-testid="job-recurrence-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      {RECURRENCE_PATTERNS.map((pattern) => (
                        <SelectItem key={pattern.value} value={pattern.value}>
                          {pattern.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-surface">
            <CardHeader>
              <CardTitle className="text-lg font-heading">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (NZD) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="bg-secondary border-border"
                  required
                  data-testid="job-price-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional notes about this job..."
                  className="bg-secondary border-border min-h-[100px]"
                  data-testid="job-notes-input"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-border"
              onClick={() => navigate("/jobs")}
              data-testid="cancel-button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={loading}
              data-testid="save-job-button"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Job"
              ) : (
                "Create Job"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
