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
  return <form onSubmit={handleSubmit} className="space-y-4"><div><Label>Client</Label><select className="w-full px-input" value={form.client_id} onChange={(e)=>setForm((p)=>({...p, client_id:e.target.value}))}><option value="">Select client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div><div><Label>Customer Name *</Label><Input required value={form.customer_name} onChange={(e)=>setForm((p)=>({...p, customer_name:e.target.value}))}/></div><div><Label>Address *</Label><Input required value={form.address} onChange={(e)=>setForm((p)=>({...p, address:e.target.value}))}/></div><div><Label>Job Description *</Label><Textarea required value={form.job_description} onChange={(e)=>setForm((p)=>({...p, job_description:e.target.value}))}/></div><div><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e)=>setForm((p)=>({...p, price:e.target.value}))}/></div><div className="flex gap-3 pt-2"><button type="button" className="px-button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="px-button-primary" disabled={loading}>{loading?"Saving...":submitLabel}</button></div></form>;
}
