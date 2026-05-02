import React, { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function InvoiceCreateForm({ onSuccess, onCancel, submitLabel = "Create invoice" }) {
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({ client_id: "", customer_name: "", customer_email: "", address: "", description: "", subtotal: "", gst_rate: 15, notes: "" });
  useEffect(() => { get('/clients').then((r) => setClients(r?.success ? r.data || [] : [])); }, [get]);
  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleClientSelect = (clientId) => { const c = clients.find((x) => String(x.id || x._id) === String(clientId)); setFormData((p) => ({ ...p, client_id: clientId, customer_name: c?.name || c?.client_name || "", customer_email: c?.email || "", address: c?.address || "" })); };
  const handleSubmit = async (e) => { e.preventDefault(); const res = await post('/invoices', { ...formData, client_id: formData.client_id || null, subtotal: Number(formData.subtotal), gst_rate: Number(formData.gst_rate) }); if (res?.success) onSuccess?.(res.data); };

  return <form onSubmit={handleSubmit} className="min-h-full flex flex-col"><div className="space-y-4 pb-28"><div className="rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4"><div><Label>Client</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3]" value={formData.client_id} onChange={(e)=>handleClientSelect(e.target.value)}><option value="">Select saved client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div><div><Label>Customer Name *</Label><Input name="customer_name" value={formData.customer_name} onChange={handleChange} required/></div><div><Label>Description *</Label><Textarea name="description" value={formData.description} onChange={handleChange} required /></div><div className="grid grid-cols-2 gap-3"><div><Label>Subtotal *</Label><Input name="subtotal" type="number" step="0.01" value={formData.subtotal} onChange={handleChange} required/></div><div><Label>GST %</Label><Input name="gst_rate" type="number" value={formData.gst_rate} onChange={handleChange}/></div></div></div></div><div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3"><button type="button" className="px-button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="px-button-primary" disabled={loading}>{loading?"Saving...":submitLabel}</button></div></form>;
}
