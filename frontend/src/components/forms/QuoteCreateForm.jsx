import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const MARKER = "CHURVOX_QUOTE_EDITOR_LINE_ITEMS_PREVIEW_20260529";
const money = (value) => { const n = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; };
const lineTotal = (line) => (money(line.qty) || 1) * money(line.rate);

export default function QuoteCreateForm({ onSuccess, onCancel, submitLabel = "Create quote" }) {
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ description: "Service work", qty: "1", rate: "" }]);
  const [form, setForm] = useState({ client_id: "", customer_name: "", customer_email: "", address: "", job_description: "", job_type: "other", price: "", pricing_type: "fixed", notes: "Quote is valid for 14 days unless stated otherwise.", valid_until: "" });

  useEffect(() => { get("/clients").then((r) => setClients(r?.success ? r.data || [] : [])); }, [get]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const previewTotal = money(form.price) || subtotal;
  const busy = loading || saving;

  useEffect(() => { if (subtotal > 0) setForm((p) => ({ ...p, price: String(Number(subtotal.toFixed(2))) })); }, [subtotal]);

  const change = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const updateLine = (index, key, value) => setLines((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item));
  const addLine = () => setLines((items) => [...items, { description: "", qty: "1", rate: "" }]);
  const removeLine = (index) => setLines((items) => items.length <= 1 ? items : items.filter((_, i) => i !== index));

  const pickClient = (clientId) => {
    const client = clients.find((c) => String(c.id || c._id) === String(clientId));
    setForm((p) => ({ ...p, client_id: clientId, customer_name: client?.name || client?.client_name || p.customer_name, customer_email: client?.email || p.customer_email, address: client?.address || p.address }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.address.trim()) return toast.error("Address is required");
    if (!form.job_description.trim()) return toast.error("Job description is required");
    if (previewTotal <= 0) return toast.error("Add a quote price or line item rate");
    setSaving(true);
    try {
      const payload = { ...form, client_id: form.client_id || null, price: previewTotal, line_items: lines.map((line) => ({ description: line.description, quantity: money(line.qty) || 1, rate: money(line.rate), amount: lineTotal(line) })).filter((line) => line.description || line.amount > 0) };
      const res = await post("/quotes", payload);
      if (!res?.success) return toast.error(res?.error || "Could not create quote");
      toast.success("Quote created");
      onSuccess?.(res.data || res.quote || res.record || res.result || res);
    } catch (err) { toast.error(err?.message || "Could not create quote"); }
    finally { setSaving(false); }
  };

  const section = "rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4";

  return <form onSubmit={submit} className="min-h-full flex flex-col" data-marker={MARKER}>
    <div className="space-y-4 pb-28">
      <section className={section}>
        <div><p className="text-sm font-black text-[#0d1b34]">Quote details</p><p className="text-xs font-semibold text-[#64748b]">Prepare the quote clearly before sending to the customer.</p></div>
        <div><Label>Client</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3]" value={form.client_id} onChange={(e)=>pickClient(e.target.value)}><option value="">Select client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div>
        <div><Label>Customer Name *</Label><Input className="rounded-xl" required value={form.customer_name} onChange={(e)=>change("customer_name", e.target.value)} /></div>
        <div><Label>Customer Email</Label><Input className="rounded-xl" type="email" value={form.customer_email} onChange={(e)=>change("customer_email", e.target.value)} /></div>
        <div><Label>Address *</Label><Input className="rounded-xl" required value={form.address} onChange={(e)=>change("address", e.target.value)} /></div>
        <div><Label>Job Description *</Label><Textarea className="rounded-xl" required value={form.job_description} onChange={(e)=>change("job_description", e.target.value)} /></div>
      </section>
      <section className={section}>
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-[#0d1b34]">Quote line items</p><p className="text-xs font-semibold text-[#64748b]">Break the quote into simple, customer-readable rows.</p></div><button type="button" className="px-button-secondary" onClick={addLine}>Add line</button></div>
        {lines.map((line, index)=><div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_90px] gap-2 items-end"><div><Label>Description</Label><Input value={line.description} onChange={(e)=>updateLine(index,"description",e.target.value)} /></div><div><Label>Qty</Label><Input type="number" step="0.1" value={line.qty} onChange={(e)=>updateLine(index,"qty",e.target.value)} /></div><div><Label>Rate</Label><Input type="number" step="0.01" value={line.rate} onChange={(e)=>updateLine(index,"rate",e.target.value)} /></div><button type="button" className="px-button-secondary" onClick={()=>removeLine(index)}>Remove</button></div>)}
        <div><Label>Total quote price</Label><Input className="rounded-xl" type="number" step="0.01" value={form.price} onChange={(e)=>change("price", e.target.value)} /></div>
        <div><Label>Valid until</Label><Input className="rounded-xl" type="date" value={form.valid_until} onChange={(e)=>change("valid_until", e.target.value)} /></div>
        <div><Label>Notes</Label><Textarea className="rounded-xl" value={form.notes} onChange={(e)=>change("notes", e.target.value)} /></div>
        <div className="rounded-2xl border border-[#d8e3f3] bg-[#f8fafc] p-3 text-sm text-[#334155]"><div className="flex justify-between text-[#071225] text-base"><span>Quote total</span><b>${previewTotal.toFixed(2)}</b></div></div>
      </section>
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3"><button type="button" className="px-button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="px-button-primary" disabled={busy}>{busy ? "Saving..." : submitLabel}</button></div>
  </form>;
}
