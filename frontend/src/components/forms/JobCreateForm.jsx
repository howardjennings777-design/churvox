// CHURVOX_JOB_FROM_CLIENT_STABLE_PREFILL_20260601
import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
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

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function recordId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.job || data?.item || data?.record || data;
  return String(data?.id || data?._id || item?.id || item?._id || "");
}
function clientId(client) { return String(client?.id || client?._id || client?.client_id || ""); }
function workerId(worker) { return String(worker?.id || worker?._id || worker?.worker_id || ""); }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || client?.contact_name || "Client"; }
function workerName(worker) { return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker"; }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function queryValue(search, key) { try { return new URLSearchParams(search).get(key) || ""; } catch { return ""; } }

export default function JobCreateForm({ onSuccess, onCancel, submitLabel = "Create job", isWorker = false }) {
  const location = useLocation();
  const clientFromQuery = queryValue(location.search, "client_id");
  const workerFromQuery = queryValue(location.search, "worker_id");
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [form, setForm] = useState({
    title: "",
    client_id: clientFromQuery,
    client_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    scheduled_date: "",
    country: "New Zealand",
    region: "",
    notes: "",
    assigned_worker_id: workerFromQuery,
    assigned_worker_name: "",
    status: "assigned",
    pricing_type: "fixed",
    fixed_price: "",
    hourly_rate: "",
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      const [clientsRes, workersRes] = await Promise.all([get("/clients"), get("/team/workers")]);
      if (!alive) return;
      setClients(clientsRes?.success ? arr(clientsRes.data) : []);
      setWorkers(workersRes?.success ? arr(workersRes.data) : []);
    }
    load();
    return () => { alive = false; };
  }, [get]);

  useEffect(() => {
    if (prefilled) return;
    if (clientFromQuery && clients.length) {
      const client = clients.find((c) => clientId(c) === String(clientFromQuery));
      if (client) pickClient(clientFromQuery);
    }
    if (workerFromQuery && workers.length) {
      const worker = workers.find((w) => workerId(w) === String(workerFromQuery));
      if (worker) pickWorker(workerFromQuery);
    }
    if ((clientFromQuery && clients.length) || (workerFromQuery && workers.length) || (!clientFromQuery && !workerFromQuery)) setPrefilled(true);
  }, [clients, workers, clientFromQuery, workerFromQuery, prefilled]);

  const filteredWorkers = useMemo(() => workers.filter((worker) => {
    if (!form.country || !form.region) return true;
    return String(worker?.country || "").toLowerCase() === String(form.country || "").toLowerCase() && String(worker?.region || worker?.state || "").toLowerCase() === String(form.region || "").toLowerCase();
  }), [workers, form.country, form.region]);

  function pickClient(clientIdValue) {
    const client = clients.find((c) => clientId(c) === String(clientIdValue));
    setForm((p) => ({
      ...p,
      client_id: clientIdValue,
      client_name: client ? clientName(client) : "",
      customer_email: client?.email || client?.customer_email || client?.client_email || p.customer_email,
      customer_phone: client?.phone || client?.mobile || client?.customer_phone || p.customer_phone,
      address: client?.address || client?.site_address || client?.billing_address || p.address,
      title: p.title || (client ? `Job for ${clientName(client)}` : p.title),
    }));
  }

  function pickWorker(workerIdValue) {
    const worker = workers.find((w) => workerId(w) === String(workerIdValue));
    setForm((p) => ({ ...p, assigned_worker_id: workerIdValue, assigned_worker_name: worker ? workerName(worker) : "" }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Job title is required");
    setSaving(true);
    const payload = {
      ...form,
      title: form.title.trim(),
      job_name: form.title.trim(),
      client_id: form.client_id || null,
      client_name: form.client_name,
      customer_name: form.client_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      address: form.address,
      site_address: form.address,
      assigned_worker_id: form.assigned_worker_id || null,
      worker_id: form.assigned_worker_id || null,
      assigned_worker_name: form.assigned_worker_name,
      worker_name: form.assigned_worker_name,
      fixed_price: money(form.fixed_price),
      price: money(form.fixed_price),
      hourly_rate: money(form.hourly_rate),
      status: form.status || "assigned",
    };
    const res = await post("/jobs", payload);
    setSaving(false);
    if (res?.success) {
      toast.success("Job created");
      onSuccess?.(res.data || res.job || res.record || res);
    } else {
      toast.error(res?.error || "Could not create job");
    }
  };

  const section = "rounded-2xl border border-slate-700 bg-slate-950/50 p-4 md:p-5 space-y-4 shadow-[0_8px_28px_rgba(0,0,0,0.18)]";
  const fieldClass = "w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5 text-white";

  return <form onSubmit={handleSubmit} className="min-h-full flex flex-col" data-version="CHURVOX_JOB_FROM_CLIENT_STABLE_PREFILL_20260601">
    <div className="space-y-4 pb-28">
      <section className={section}><p className="text-sm font-black text-white">Job details</p>{clientFromQuery ? <p className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-3 text-xs font-bold text-lime-100">Opened from a client record. Customer details will prefill once the client loads.</p> : null}<div><Label>Job title *</Label><Input required className="w-full rounded-xl" value={form.title} onChange={(e)=>setForm((p)=>({...p,title:e.target.value}))}/></div><div><Label>Notes / description</Label><Textarea rows={3} className="w-full rounded-xl" value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))}/></div></section>
      <section className={section}><p className="text-sm font-black text-white">Client & location</p><div><Label>Client</Label><select className={fieldClass} value={form.client_id} onChange={(e)=>pickClient(e.target.value)}><option value="">Select client</option>{clients.map((c)=><option key={clientId(c)} value={clientId(c)}>{clientName(c)}</option>)}</select></div><div className="grid gap-3 md:grid-cols-2"><div><Label>Customer email</Label><Input className="w-full rounded-xl" value={form.customer_email} onChange={(e)=>setForm((p)=>({...p,customer_email:e.target.value}))}/></div><div><Label>Customer phone</Label><Input className="w-full rounded-xl" value={form.customer_phone} onChange={(e)=>setForm((p)=>({...p,customer_phone:e.target.value}))}/></div></div><div><Label>Address</Label><Input className="w-full rounded-xl" value={form.address} onChange={(e)=>setForm((p)=>({...p,address:e.target.value}))}/></div><div className="grid md:grid-cols-2 gap-3"><div><Label>Country</Label><select className={fieldClass} value={form.country} onChange={(e)=>setForm((p)=>({...p,country:e.target.value,region:"",assigned_worker_id:"",assigned_worker_name:""}))}>{COUNTRY_OPTIONS.map((c)=><option key={c} value={c}>{c}</option>)}</select></div><div><Label>Region / State</Label><select className={fieldClass} value={form.region} onChange={(e)=>setForm((p)=>({...p,region:e.target.value,assigned_worker_id:"",assigned_worker_name:""}))}><option value="">Select region/state</option>{(REGION_OPTIONS[form.country]||[]).map((r)=><option key={r} value={r}>{r}</option>)}</select></div></div></section>
      <section className={section}><p className="text-sm font-black text-white">Schedule & assignment</p><div><Label>Scheduled date</Label><Input type="datetime-local" className="w-full rounded-xl" value={form.scheduled_date} onChange={(e)=>setForm((p)=>({...p,scheduled_date:e.target.value}))}/></div><div><Label>Assigned worker</Label><select className={fieldClass} value={form.assigned_worker_id} onChange={(e)=>pickWorker(e.target.value)}><option value="">Select worker</option>{filteredWorkers.map((w)=><option key={workerId(w)} value={workerId(w)}>{workerName(w)}</option>)}</select></div></section>
      {!isWorker ? <section className={section}><p className="text-sm font-black text-white">Pricing / invoice source</p><div><Label>Pricing type</Label><select className={fieldClass} value={form.pricing_type} onChange={(e)=>setForm((p)=>({...p,pricing_type:e.target.value}))}><option value="fixed">Fixed price</option><option value="hourly">Hourly</option><option value="fixed_extras">Fixed + extras</option><option value="hourly_extras">Hourly + extras</option></select></div>{["fixed","fixed_extras"].includes(form.pricing_type)?<div><Label>Fixed price</Label><Input type="number" step="0.01" className="w-full rounded-xl" value={form.fixed_price} onChange={(e)=>setForm((p)=>({...p,fixed_price:e.target.value}))}/></div>:<div><Label>Hourly rate</Label><Input type="number" step="0.01" className="w-full rounded-xl" value={form.hourly_rate} onChange={(e)=>setForm((p)=>({...p,hourly_rate:e.target.value}))}/></div>}</section> : null}
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-slate-700 bg-slate-950/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3">
      <PremiumButton type="button" variant="secondary" onClick={onCancel}>Cancel</PremiumButton>
      <PremiumButton type="submit" disabled={loading || saving}>{saving || loading ? "Saving..." : submitLabel}</PremiumButton>
    </div>
  </form>;
}
