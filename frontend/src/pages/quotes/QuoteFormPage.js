import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileSignature, Save } from "lucide-react";
import { toast } from "sonner";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import QuoteCreateForm from "../../components/forms/QuoteCreateForm";
import { JOB_TYPES_BY_CATEGORY } from "../../lib/utils";

const PRICING_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed_extras", label: "Fixed + Extras" },
  { value: "hourly_extras", label: "Hourly + Extras" },
];

const blankForm = {
  client_id: "",
  customer_name: "",
  customer_email: "",
  address: "",
  job_description: "",
  job_type: "other",
  price: "",
  pricing_type: "fixed",
  hourly_rate: "",
  notes: "",
  valid_until: "",
};

export default function QuoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, patch, loading } = useApi();
  const isEditing = Boolean(id);

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [pageLoading, setPageLoading] = useState(isEditing);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadData = useCallback(async () => {
    setPageLoading(true);
    try {
      const clientsRes = await get("/clients");
      if (clientsRes?.success) setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);

      if (!isEditing) return;

      const quoteRes = await get(`/quotes/${id}`);
      if (!quoteRes?.success) {
        toast.error(quoteRes?.error || "Quote not found");
        navigate("/quotes");
        return;
      }

      const q = quoteRes.data || {};
      setForm({
        client_id: q.client_id || "",
        customer_name: q.customer_name || q.client_name || "",
        customer_email: q.customer_email || q.email || "",
        address: q.address || "",
        job_description: q.job_description || q.description || "",
        job_type: q.job_type || "other",
        price: q.price ?? q.amount ?? "",
        pricing_type: q.pricing_type || "fixed",
        hourly_rate: q.hourly_rate ?? "",
        notes: q.notes || "",
        valid_until: q.valid_until ? String(q.valid_until).slice(0, 10) : "",
      });
    } finally {
      setPageLoading(false);
    }
  }, [get, id, isEditing, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => String(c.id || c._id) === String(clientId));
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      customer_name: client?.name || prev.customer_name,
      customer_email: client?.email || prev.customer_email,
      address: client?.address || prev.address,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...form,
      price: Number(form.price) || 0,
      hourly_rate: Number(form.hourly_rate) || 0,
      client_id: form.client_id || undefined,
      valid_until: form.valid_until ? new Date(`${form.valid_until}T23:59:59Z`).toISOString() : undefined,
    };

    const res = await patch(`/quotes/${id}`, payload);
    if (res?.success) {
      toast.success("Quote updated");
      navigate("/quotes");
    } else {
      toast.error(res?.error || "Failed to update quote");
    }
  };

  if (!isEditing) {
    return (
      <Layout>
        <PremiumPage maxWidth={820}>
          <PremiumHero
            eyebrow="New quote"
            title="Quote Builder"
            subtitle="Prepare a customer quote without leaving the Churvox workflow."
            icon={<FileSignature className="h-6 w-6" />}
          />
          <PremiumCard>
            <QuoteCreateForm
              onCancel={() => navigate("/quotes")}
              onSuccess={() => navigate("/quotes")}
              submitLabel="Create Quote"
            />
          </PremiumCard>
        </PremiumPage>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={860}>
        <button
          type="button"
          onClick={() => navigate("/quotes")}
          className="flex items-center gap-2 text-sm font-semibold text-[#5b6c87] hover:text-[#0d1b34]"
          data-testid="back-to-quotes"
        >
          <ArrowLeft size={16} /> Back to quotes
        </button>

        <PremiumHero
          eyebrow="Edit quote"
          title="Edit Quote"
          subtitle="Update the customer, service details, pricing and validity."
          icon={<FileSignature className="h-6 w-6" />}
        />

        <PremiumCard title="Quote details" icon={<FileSignature className="h-5 w-5" />} data-testid="quote-form-page">
          {pageLoading ? (
            <div className="py-10 text-center text-sm font-semibold text-[#64748b]">Loading quote…</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-[#0d1b34]">Client</span>
                  <select
                    value={form.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]"
                    data-testid="quote-client-select"
                  >
                    <option value="">Select client</option>
                    {clients.map((client) => (
                      <option key={client.id || client._id || client.email} value={client.id || client._id}>
                        {client.name || client.email || "Client"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-semibold text-[#0d1b34]">Job type</span>
                  <select
                    value={form.job_type}
                    onChange={(e) => updateField("job_type", e.target.value)}
                    className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]"
                    data-testid="quote-job-type"
                  >
                    {Object.entries(JOB_TYPES_BY_CATEGORY || {}).map(([category, types]) => (
                      <optgroup key={category} label={category}>
                        {types.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </optgroup>
                    ))}
                    <option value="other">Other</option>
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-[#0d1b34]">Customer name</span>
                <input value={form.customer_name} onChange={(e) => updateField("customer_name", e.target.value)} required className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-customer-name" />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-[#0d1b34]">Customer email</span>
                <input type="email" value={form.customer_email} onChange={(e) => updateField("customer_email", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-customer-email" />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-[#0d1b34]">Address</span>
                <input value={form.address} onChange={(e) => updateField("address", e.target.value)} required className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-address" />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-[#0d1b34]">Job description</span>
                <textarea value={form.job_description} onChange={(e) => updateField("job_description", e.target.value)} required rows={4} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-description" />
              </label>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-[#0d1b34]">Pricing type</span>
                  <select value={form.pricing_type} onChange={(e) => updateField("pricing_type", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-pricing-type">
                    {PRICING_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-[#0d1b34]">Price ($)</span>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => updateField("price", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-price" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-[#0d1b34]">Hourly rate ($)</span>
                  <input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => updateField("hourly_rate", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-hourly-rate" />
                </label>
              </div>

              <label className="block max-w-xs space-y-1">
                <span className="text-sm font-semibold text-[#0d1b34]">Valid until</span>
                <input type="date" value={form.valid_until} onChange={(e) => updateField("valid_until", e.target.value)} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-valid-until" />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-semibold text-[#0d1b34]">Notes</span>
                <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} className="w-full rounded-xl border border-[#d8e3f3] bg-[#f6faff] px-3 py-2 text-[#0d1b34]" data-testid="quote-notes" />
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button type="button" onClick={() => navigate("/quotes")} className="min-w-[140px] flex-1 rounded-xl border border-[#d8e3f3] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a2c4d] hover:bg-[#eff4ff]">
                  Cancel
                </button>
                <PremiumButton type="submit" disabled={loading} dataTestId="submit-quote-button" className="min-w-[200px] flex-1">
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Saving…" : "Update Quote"}
                </PremiumButton>
              </div>
            </form>
          )}
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
