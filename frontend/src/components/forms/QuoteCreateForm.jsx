import React, { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function QuoteCreateForm({ onSuccess, onCancel, submitLabel = "Create quote" }) {
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ client_id: "", customer_name: "", customer_email: "", address: "", job_description: "", job_type: "other", price: "", pricing_type: "fixed", notes: "" });
  useEffect(() => { get('/clients').then((r) => setClients(r?.success ? r.data || [] : [])); }, [get]);
  const handleSubmit = async (e) => { e.preventDefault(); const res = await post('/quotes', { ...form, client_id: form.client_id || null, price: parseFloat(form.price) || 0 }); if (res?.success) onSuccess?.(res.data); };
  const section = "rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4";
  return <form onSubmit={handleSubmit} className="min-h-full flex flex-col"><div className="space-y-4 pb-28"><section className={section}><p className="text-sm font-semibold text-[#0d1b34]">Quote details</p><div><Label>Client</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3]" value={form.client_id} onChange={(e)=>setForm((p)=>({...p, client_id:e.target.value}))}><option value="">Select client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div><div><Label>Customer Name *</Label><Input className="rounded-xl" required value={form.customer_name} onChange={(e)=>setForm((p)=>({...p, customer_name:e.target.value}))}/></div><div><Label>Address *</Label><Input className="rounded-xl" required value={form.address} onChange={(e)=>setForm((p)=>({...p, address:e.target.value}))}/></div><div><Label>Job Description *</Label><Textarea className="rounded-xl" required value={form.job_description} onChange={(e)=>setForm((p)=>({...p, job_description:e.target.value}))}/></div><div><Label>Price</Label><Input className="rounded-xl" type="number" step="0.01" value={form.price} onChange={(e)=>setForm((p)=>({...p, price:e.target.value}))}/></div></section></div><div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between"><button type="button" className="px-button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="px-button-primary" disabled={loading}>{loading?"Saving...":submitLabel}</button></div></form>;
}
