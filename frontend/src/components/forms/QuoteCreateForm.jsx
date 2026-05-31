// CHURVOX_FIRST_QUOTE_FLOW_STABLE_20260601
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function recordId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.quote || data?.item || data?.record || data;
  return String(data?.id || data?._id || item?.id || item?._id || "");
}
function clientId(client) { return String(client?.id || client?._id || client?.client_id || ""); }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || client?.contact_name || "Client"; }
function money(value) { const n = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function lineTotal(line) { return (money(line.qty) || 1) * money(line.rate); }
function todayPlus(days = 14) { const d = new Date(); d.setDate(d.getDate() + Number(days || 14)); return d.toISOString().slice(0, 10); }

export default function QuoteCreateForm({ onSuccess, onCancel, submitLabel = "Create quote" }) {
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [lines, setLines] = useState([{ description: "Service work", qty: "1", rate: "" }]);
  const [form, setForm] = useState({
    client_id: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    job_description: "",
    job_type: "general_service",
    price: "",
    pricing_type: "fixed",
    notes: "Quote is valid for 14 days unless stated otherwise.",
    valid_until: todayPlus(14),
    status: "draft",
  });

  useEffect(() => {
    let alive = true;
    get("/clients").then((r) => { if (alive) setClients(r?.success ? arr(r.data) : []); });
    return () => { alive = false; };
  }, [get]);

  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + lineTotal(line), 0), [lines]);
  const previewTotal = money(form.price) || subtotal;
  const busy = loading || saving;

  useEffect(() => { if (subtotal > 0) setForm((p) => ({ ...p, price: String(Number(subtotal.toFixed(2))) })); }, [subtotal]);

  function change(key, value) { setForm((p) => ({ ...p, [key]: value })); }
  function updateLine(index, key, value) { setLines((items) => items.map((item, i) => i === index ? { ...item, [key]: value } : item)); }
  function addLine() { setLines((items) => [...items, { description: "", qty: "1", rate: "" }]); }
  function removeLine(index) { setLines((items) => items.length <= 1 ? items : items.filter((_, i) => i !== index)); }

  function pickClient(selectedId) {
    const client = clients.find((c) => clientId(c) === String(selectedId));
    setForm((p) => ({
      ...p,
      client_id: selectedId,
      customer_name: client ? clientName(client) : p.customer_name,
      customer_email: client?.email || client?.customer_email || client?.client_email || p.customer_email,
      customer_phone: client?.phone || client?.mobile || p.customer_phone,
      address: client?.address || client?.site_address || client?.billing_address || p.address,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) return toast.error("Customer name is required");
    if (!form.address.trim()) return toast.error("Address is required");
    if (!form.job_description.trim()) return toast.error("Job description is required");
    if (previewTotal <= 0) return toast.error("Add a quote price or line item rate");
    setSaving(true);
    const cleanLines = lines.map((line) => ({
      description: line.description,
      quantity: money(line.qty) || 1,
      qty: money(line.qty) || 1,
      rate: money(line.rate),
      unit_price: money(line.rate),
      amount: lineTotal(line),
    })).filter((line) => line.description || line.amount > 0);
    const payload = {
      ...form,
      client_id: form.client_id || null,
      client_name: form.customer_name,
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      address: form.address,
      site_address: form.address,
      description: form.job_description,
      price: previewTotal,
      total: previewTotal,
      amount: previewTotal,
      line_items: cleanLines,
      status: form.status || "draft",
      valid_until: form.valid_until ? new Date(`${form.valid_until}T23:59:59`).toISOString() : null,
    };
    const res = await post("/quotes", payload);
    setSaving(false);
    if (!res?.success) return toast.error(res?.error || "Could not create quote");
    toast.success("Quote created");
    const id = recordId(res);
    onSuccess?.({ ...(res.data || res.quote || res.record || res), id: id || undefined, _id: id || undefined });
  }

  const section = "rounded-2xl border border-slate-700 bg-slate-950/50 p-4 md:p-5 space-y-4 shadow-[0_8px_28px_rgba(0,0,0,0.18)]";
  const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-white";

  return <form onSubmit={submit} className="min-h-full flex flex-col" data-version="CHURVOX_FIRST_QUOTE_FLOW_STABLE_20260601">
    <div className="space-y-4 pb-28">
      <section className={section}>
        <div><p className="text-sm font-black text-white">Quote details</p><p className="text-xs font-semibold text-slate-300">A quote can later become job context or invoice wording.</p></div>
        <div><Label>Client</Label><select className={fieldClass} value={form.client_id} onChange={(e)=>pickClient(e.target.value)}><option value="">Select client</option>{clients.map((c)=><option key={clientId(c)} value={clientId(c)}>{clientName(c)}</option>)}</select></div>
        <div><Label>Customer Name *</Label><Input className="rounded-xl" required value={form.customer_name} onChange={(e)=>change("customer_name", e.target.value)} /></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label>Customer Email</Label><Input className="rounded-xl" type="email" value={form.customer_email} onChange={(e)=>change("customer_email", e.target.value)} /></div><div><Label>Customer Phone</Label><Input className="rounded-xl" value={form.customer_phone} onChange={(e)=>change("customer_phone", e.target.value)} /></div></div>
        <div><Label>Address *</Label><Input className="rounded-xl" required value={form.address} onChange={(e)=>change("address", e.target.value)} /></div>
        <div><Label>Job Description *</Label><Textarea className="rounded-xl" required value={form.job_description} onChange={(e)=>change("job_description", e.target.value)} /></div>
      </section>
      <section className={section}>
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">Quote line items</p><p className="text-xs font-semibold text-slate-300">Break the quote into simple, customer-readable rows.</p></div><button type="button" className="px-button-secondary" onClick={addLine}>Add line</button></div>
        {lines.map((line, index)=><div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_90px_120px_90px] gap-2 items-end"><div><Label>Description</Label><Input value={line.description} onChange={(e)=>updateLine(index,"description",e.target.value)} /></div><div><Label>Qty</Label><Input type="number" step="0.1" value={line.qty} onChange={(e)=>updateLine(index,"qty",e.target.value)} /></div><div><Label>Rate</Label><Input type="number" step="0.01" value={line.rate} onChange={(e)=>updateLine(index,"rate",e.target.value)} /></div><button type="button" className="px-button-secondary" onClick={()=>removeLine(index)}>Remove</button></div>)}
        <div><Label>Total quote price</Label><Input className="rounded-xl" type="number" step="0.01" value={form.price} onChange={(e)=>change("price", e.target.value)} /></div>
        <div><Label>Valid until</Label><Input className="rounded-xl" type="date" value={form.valid_until} onChange={(e)=>change("valid_until", e.target.value)} /></div>
        <div><Label>Notes</Label><Textarea className="rounded-xl" value={form.notes} onChange={(e)=>change("notes", e.target.value)} /></div>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-200"><div className="flex justify-between text-white text-base"><span>Quote total</span><b>${previewTotal.toFixed(2)}</b></div></div>
      </section>
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-slate-700 bg-slate-950/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3"><button type="button" className="px-button-secondary" onClick={onCancel} disabled={busy}>Cancel</button><button type="submit" className="px-button-primary" disabled={busy}>{busy ? "Saving..." : submitLabel}</button></div>
  </form>;
}
