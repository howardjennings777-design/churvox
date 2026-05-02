import React, { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function JobCreateForm({ onSuccess, onCancel, submitLabel = "Create job" }) {
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({ title:"", client_id:"", client_name:"", address:"", scheduled_date:"", notes:"", assigned_worker_id:"", status:"assigned" });
  useEffect(() => { Promise.all([get('/clients'), get('/team/workers')]).then(([c,w])=>{setClients(c?.success?c.data||[]:[]); setWorkers(w?.success?w.data||[]:[]);}); }, [get]);
  const handleSubmit = async (e) => { e.preventDefault(); const res = await post('/jobs', { ...form, client_id: form.client_id || null, assigned_worker_id: form.assigned_worker_id || null }); if (res?.success) onSuccess?.(res.data); };
  return <form onSubmit={handleSubmit} className="space-y-4"><div><Label>Job title</Label><Input value={form.title} onChange={(e)=>setForm((p)=>({...p,title:e.target.value}))}/></div><div><Label>Client</Label><select className="w-full px-input" value={form.client_id} onChange={(e)=>setForm((p)=>({...p,client_id:e.target.value}))}><option value="">Select client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div><div><Label>Assigned worker</Label><select className="w-full px-input" value={form.assigned_worker_id} onChange={(e)=>setForm((p)=>({...p,assigned_worker_id:e.target.value}))}><option value="">Select worker</option>{workers.map((w)=><option key={w.id||w._id} value={w.id||w._id}>{w.name||w.email}</option>)}</select></div><div><Label>Scheduled date</Label><Input type="datetime-local" value={form.scheduled_date} onChange={(e)=>setForm((p)=>({...p,scheduled_date:e.target.value}))}/></div><div className="flex gap-3 pt-2"><button type="button" className="px-button-secondary" onClick={onCancel}>Cancel</button><button type="submit" className="px-button-primary" disabled={loading}>{loading?"Saving...":submitLabel}</button></div></form>;
}
