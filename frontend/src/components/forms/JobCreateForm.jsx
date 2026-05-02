import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumButton } from "@/components/premium";

const COUNTRY_OPTIONS = ["New Zealand", "Australia"];
const REGION_OPTIONS = {
  "New Zealand": ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
};

export default function JobCreateForm({ onSuccess, onCancel, submitLabel = "Create job", isWorker = false }) {
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({ title: "", client_id: "", client_name: "", address: "", scheduled_date: "", country: "New Zealand", region: "", notes: "", assigned_worker_id: "", status: "assigned", pricing_type: "fixed", fixed_price: "", hourly_rate: "" });

  useEffect(() => {
    Promise.all([get("/clients"), get("/team/workers")]).then(([c, w]) => {
      setClients(c?.success ? c.data || [] : []);
      setWorkers(w?.success ? w.data || [] : []);
    });
  }, [get]);

  const filteredWorkers = useMemo(() => workers.filter((worker) => {
    if (!form.country || !form.region) return true;
    return String(worker?.country || "").toLowerCase() === String(form.country || "").toLowerCase() && String(worker?.region || worker?.state || "").toLowerCase() === String(form.region || "").toLowerCase();
  }), [workers, form.country, form.region]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, client_id: form.client_id || null, assigned_worker_id: form.assigned_worker_id || null, fixed_price: Number(form.fixed_price || 0), hourly_rate: Number(form.hourly_rate || 0) };
    const res = await post("/jobs", payload);
    if (res?.success) onSuccess?.(res.data);
  };

  const section = "rounded-2xl border border-[#d8e3f3] bg-white p-4 md:p-5 space-y-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]";

  return <form onSubmit={handleSubmit} className="min-h-full flex flex-col">
    <div className="space-y-4 pb-28">
      <section className={section}><p className="text-sm font-semibold text-[#0d1b34]">Job details</p><div><Label>Job title</Label><Input required className="w-full rounded-xl" value={form.title} onChange={(e)=>setForm((p)=>({...p,title:e.target.value}))}/></div><div><Label>Notes / description</Label><Textarea rows={3} className="w-full rounded-xl" value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))}/></div></section>
      <section className={section}><p className="text-sm font-semibold text-[#0d1b34]">Client & location</p><div><Label>Client</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3] bg-white" value={form.client_id} onChange={(e)=>setForm((p)=>({...p,client_id:e.target.value}))}><option value="">Select client</option>{clients.map((c)=><option key={c.id||c._id} value={c.id||c._id}>{c.name||c.client_name}</option>)}</select></div><div><Label>Address</Label><Input className="w-full rounded-xl" value={form.address} onChange={(e)=>setForm((p)=>({...p,address:e.target.value}))}/></div><div className="grid md:grid-cols-2 gap-3"><div><Label>Country</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3] bg-white" value={form.country} onChange={(e)=>setForm((p)=>({...p,country:e.target.value,region:"",assigned_worker_id:""}))}>{COUNTRY_OPTIONS.map((c)=><option key={c} value={c}>{c}</option>)}</select></div><div><Label>Region / State</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3] bg-white" value={form.region} onChange={(e)=>setForm((p)=>({...p,region:e.target.value,assigned_worker_id:""}))}><option value="">Select region/state</option>{(REGION_OPTIONS[form.country]||[]).map((r)=><option key={r} value={r}>{r}</option>)}</select></div></div></section>
      <section className={section}><p className="text-sm font-semibold text-[#0d1b34]">Schedule & assignment</p><div><Label>Scheduled date</Label><Input type="datetime-local" className="w-full rounded-xl" value={form.scheduled_date} onChange={(e)=>setForm((p)=>({...p,scheduled_date:e.target.value}))}/></div><div><Label>Assigned worker</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3] bg-white" value={form.assigned_worker_id} onChange={(e)=>setForm((p)=>({...p,assigned_worker_id:e.target.value}))}><option value="">Select worker</option>{filteredWorkers.map((w)=><option key={w.id||w._id} value={w.id||w._id}>{w.name||w.email}</option>)}</select></div></section>
      {!isWorker ? <section className={section}><p className="text-sm font-semibold text-[#0d1b34]">Pricing / invoice source</p><div><Label>Pricing type</Label><select className="w-full rounded-xl px-3 py-2.5 border border-[#d8e3f3] bg-white" value={form.pricing_type} onChange={(e)=>setForm((p)=>({...p,pricing_type:e.target.value}))}><option value="fixed">Fixed price</option><option value="hourly">Hourly</option></select></div>{form.pricing_type==="fixed"?<div><Label>Fixed price</Label><Input type="number" step="0.01" className="w-full rounded-xl" value={form.fixed_price} onChange={(e)=>setForm((p)=>({...p,fixed_price:e.target.value}))}/></div>:<div><Label>Hourly rate</Label><Input type="number" step="0.01" className="w-full rounded-xl" value={form.hourly_rate} onChange={(e)=>setForm((p)=>({...p,hourly_rate:e.target.value}))}/></div>}</section> : null}
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-[#d8e3f3] bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3">
      <PremiumButton type="button" variant="secondary" onClick={onCancel}>Cancel</PremiumButton>
      <PremiumButton type="submit" disabled={loading}>{loading ? "Saving..." : submitLabel}</PremiumButton>
    </div>
  </form>;
}
