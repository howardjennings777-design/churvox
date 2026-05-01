import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
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

  return (
    <Layout>
      <div className="p-4 md:p-6 max-w-2xl mx-auto" data-testid="quote-form-page">
        <button onClick={() => navigate("/quotes")} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-4" data-testid="back-to-quotes">
          <ArrowLeft size={18} /> Quotes
        </button>

        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-slate-900">{isEditing ? "Edit Quote" : "New Quote"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-slate-500">Client</Label>
                  <Select value={form.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-client-select"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 shadow-sm">{clients.map((c) => <SelectItem key={c.id} value={c.id} className="text-slate-900">{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-500">Job Type</Label>
                  <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                    <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-job-type"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-60">
                      {Object.entries(JOB_TYPES_BY_CATEGORY).map(([cat, types]) => (
                        <SelectGroup key={cat}><SelectLabel className="text-slate-500 text-xs">{cat}</SelectLabel>
                          {types.map((t) => <SelectItem key={t.value} value={t.value} className="text-slate-900">{t.label}</SelectItem>)}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-slate-500">Customer Name</Label>
                <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-customer-name" />
              </div>
              <div>
                <Label className="text-slate-500">Customer Email</Label>
                <Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-customer-email" />
              </div>
              <div>
                <Label className="text-slate-500">Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-address" />
              </div>
              <div>
                <Label className="text-slate-500">Job Description</Label>
                <Textarea value={form.job_description} onChange={(e) => setForm({ ...form, job_description: e.target.value })} required className="bg-slate-50 border-slate-200 text-slate-900" rows={3} data-testid="quote-description" />
              </div>

              {/* Pricing */}
              <div className="pt-3 border-t border-slate-200">
                <Label className="text-slate-500">Pricing Type</Label>
                <Select value={form.pricing_type} onValueChange={(v) => setForm({ ...form, pricing_type: v })}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-pricing-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 shadow-sm">
                    {PRICING_TYPES.map((p) => <SelectItem key={p.value} value={p.value} className="text-slate-900">{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {showFixed && (
                  <div>
                    <Label className="text-slate-500">Price ($)</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-price" />
                  </div>
                )}
                {showHourly && (
                  <div>
                    <Label className="text-slate-500">Hourly Rate ($)</Label>
                    <Input type="number" step="0.01" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-hourly-rate" />
                  </div>
                )}
                <div>
                  <Label className="text-slate-500">Valid Until</Label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900" data-testid="quote-valid-until" />
                </div>
              </div>

              {showExtras && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-500">Extras</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addExtra} className="border-slate-200 text-slate-500" data-testid="quote-add-extra"><Plus size={14} className="mr-1" /> Add Extra</Button>
                  </div>
                  {form.extras.map((ex, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={ex.description} onChange={(e) => updateExtra(i, "description", e.target.value)} placeholder="Description" className="flex-1 bg-slate-50 border-slate-200 text-slate-900" data-testid={`quote-extra-desc-${i}`} />
                      <Input type="number" step="0.01" value={ex.amount} onChange={(e) => updateExtra(i, "amount", e.target.value)} placeholder="$" className="w-24 bg-slate-50 border-slate-200 text-slate-900" data-testid={`quote-extra-amount-${i}`} />
                      <button type="button" onClick={() => removeExtra(i)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label className="text-slate-500">Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-slate-50 border-slate-200 text-slate-900" rows={2} data-testid="quote-notes" />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate("/quotes")} className="flex-1 border-slate-200 text-slate-500">Cancel</Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="submit-quote-button">
                  {loading ? "Saving..." : isEditing ? "Update Quote" : "Create Quote"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
