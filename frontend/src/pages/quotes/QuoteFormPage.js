import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import { useApi } from "../../hooks/useApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "../../components/ui/select";
import { ArrowLeft, Plus, Trash2, FileSignature, Save } from "lucide-react";
import { toast } from "sonner";
import { JOB_TYPES_BY_CATEGORY } from "../../lib/utils";
import { PremiumPage, PremiumHero, PremiumCard, PremiumButton } from "../../components/premium";
import QuoteCreateForm from "../../components/forms/QuoteCreateForm";

const PRICING_TYPES = [
  { value: "fixed", label: "Fixed Price" },
  { value: "hourly", label: "Hourly" },
  { value: "fixed_extras", label: "Fixed + Extras" },
  { value: "hourly_extras", label: "Hourly + Extras" },
];

export default function QuoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, patch, loading } = useApi();
  const isEditing = !!id;

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    client_id: "", customer_name: "", customer_email: "", address: "",
    job_description: "", job_type: "other", price: "", pricing_type: "fixed",
    hourly_rate: "", extras: [], notes: "", valid_until: "",
  });

  const fetchData = useCallback(async () => {
    const clientsRes = await get("/clients");
    if (clientsRes.success) setClients(clientsRes.data);

    if (isEditing) {
      const res = await get(`/quotes/${id}`);
      if (res.success) {
        const q = res.data;
        setForm({
          client_id: q.client_id || "", customer_name: q.customer_name || "",
          customer_email: q.customer_email || "", address: q.address || "",
          job_description: q.job_description || "", job_type: q.job_type || "other",
          price: q.price || "", pricing_type: q.pricing_type || "fixed",
          hourly_rate: q.hourly_rate || "", extras: q.extras || [],
          notes: q.notes || "",
          valid_until: q.valid_until ? q.valid_until.split("T")[0] : "",
        });
      } else navigate("/quotes");
    }
  }, [get, id, isEditing, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleClientChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    setForm((prev) => ({
      ...prev, client_id: clientId,
      customer_name: client?.name || prev.customer_name,
      customer_email: client?.email || prev.customer_email,
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
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      client_id: form.client_id || null,
      valid_until: form.valid_until ? new Date(form.valid_until + "T23:59:59Z").toISOString() : null,
      extras: form.extras.map((e) => ({ description: e.description, amount: parseFloat(e.amount) || 0 })).filter((e) => e.description),
    };
    if (!payload.client_id) delete payload.client_id;
    if (!payload.valid_until) delete payload.valid_until;

    const res = isEditing ? await patch(`/quotes/${id}`, payload) : await post("/quotes", payload);
    if (res.success) { toast.success(isEditing ? "Quote updated" : "Quote created"); navigate("/quotes"); }
    else toast.error(res.error || "Failed to save quote");
  };

  const showHourly = form.pricing_type === "hourly" || form.pricing_type === "hourly_extras";
  const showFixed = form.pricing_type === "fixed" || form.pricing_type === "fixed_extras";
  const showExtras = form.pricing_type === "fixed_extras" || form.pricing_type === "hourly_extras";

  if (!isEdit) {
    return (
      <Layout>
        <PremiumPage maxWidth={820}>
          <PremiumHero eyebrow="New" title="New Quote" subtitle="Create in full page layout." />
          <PremiumCard>
            <QuoteCreateForm onCancel={() => navigate("/quotes")} onSuccess={() => navigate("/quotes")} submitLabel="Create" />
          </PremiumCard>
        </PremiumPage>
      </Layout>
    );
  }

  return (
    <Layout>
      <PremiumPage maxWidth={820}>
        <button onClick={() => navigate("/quotes")} className="flex items-center gap-2 text-[#5b6c87] hover:text-[#0d1b34] text-sm font-semibold" data-testid="back-to-quotes">
          <ArrowLeft size={16} /> Back to quotes
        </button>

        <PremiumHero
          eyebrow={isEditing ? "Edit quote" : "New quote"}
          title={isEditing ? "Edit Quote" : "New Quote"}
          subtitle={isEditing ? "Update pricing, description and validity." : "Create a quote to send to your customer for review."}
          icon={<FileSignature className="h-6 w-6" />}
        />

        <PremiumCard title="Quote details" icon={<FileSignature className="h-5 w-5" />} data-testid="quote-form-page">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#0d1b34] font-semibold">Client</Label>
                  <Select value={form.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-client-select"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent className="bg-white border-[#d8e3f3] shadow-lg">{clients.map((c) => <SelectItem key={c.id} value={c.id} className="text-[#0d1b34]">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[#0d1b34] font-semibold">Job Type</Label>
                  <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                    <SelectTrigger className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-job-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-[#d8e3f3] max-h-60">
                      {Object.entries(JOB_TYPES_BY_CATEGORY).map(([cat, types]) => (
                        <SelectGroup key={cat}><SelectLabel className="text-[#7d8ba3] text-xs">{cat}</SelectLabel>
                          {types.map((t) => <SelectItem key={t.value} value={t.value} className="text-[#0d1b34]">{t.label}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-[#0d1b34] font-semibold">Customer Name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-customer-name" />
              </div>
              <div>
                <Label className="text-[#0d1b34] font-semibold">Customer Email</Label>
                <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-customer-email" />
              </div>
              <div>
                <Label className="text-[#0d1b34] font-semibold">Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-address" />
              </div>
              <div>
                <Label className="text-[#0d1b34] font-semibold">Job Description</Label>
                <Textarea value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} required className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" rows={3} data-testid="quote-description" />
              </div>

              <div className="pt-3 border-t border-[#e6eef9]">
                <Label className="text-[#0d1b34] font-semibold">Pricing Type</Label>
                <Select value={form.pricing_type} onValueChange={(v) => setForm({ ...form, pricing_type: v })}>
                  <SelectTrigger className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-pricing-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-[#d8e3f3] shadow-lg">
                    {PRICING_TYPES.map((p) => <SelectItem key={p.value} value={p.value} className="text-[#0d1b34]">{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {showFixed && (
                  <div>
                    <Label className="text-[#0d1b34] font-semibold">Price ($)</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-price" />
                  </div>
                )}
                {showHourly && (
                  <div>
                    <Label className="text-[#0d1b34] font-semibold">Hourly Rate ($)</Label>
                    <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-hourly-rate" />
                  </div>
                )}
                <div>
                  <Label className="text-[#0d1b34] font-semibold">Valid Until</Label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" data-testid="quote-valid-until" />
                </div>
              </div>

              {showExtras && (
                <div className="space-y-2 bg-[#f6faff] border border-[#d8e3f3] rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#0d1b34] font-semibold">Extras</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addExtra} className="border-[#d8e3f3] text-[#1a2c4d] hover:bg-[#eff4ff]" data-testid="quote-add-extra"><Plus size={14} className="mr-1" /> Add Extra</Button>
                  </div>
                  {form.extras.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={ex.description} onChange={(e) => updateExtra(i, "description", e.target.value)} placeholder="Description" className="flex-1 bg-white border-[#d8e3f3] text-[#0d1b34]" data-testid={`quote-extra-desc-${i}`} />
                      <Input type="number" step="0.01" value={ex.amount} onChange={(e) => updateExtra(i, "amount", e.target.value)} placeholder="$" className="w-24 bg-white border-[#d8e3f3] text-[#0d1b34]" data-testid={`quote-extra-amount-${i}`} />
                      <button type="button" onClick={() => removeExtra(i)} className="text-[#dc2626] hover:text-[#dc2626]/80"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-[#0d1b34] font-semibold">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-[#f6faff] border-[#d8e3f3] text-[#0d1b34]" rows={2} data-testid="quote-notes" />
              </div>

              <div className="flex gap-3 pt-2 flex-wrap">
                <Button type="button" variant="outline" onClick={() => navigate("/quotes")} className="flex-1 min-w-[140px] border-[#d8e3f3] text-[#1a2c4d] hover:bg-[#eff4ff]">Cancel</Button>
                <PremiumButton type="submit" disabled={loading} dataTestId="submit-quote-button" className="flex-1 min-w-[200px]">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : isEditing ? "Update Quote" : "Create Quote"}
                </PremiumButton>
              </div>
            </form>
        </PremiumCard>
      </PremiumPage>
    </Layout>
  );
}
