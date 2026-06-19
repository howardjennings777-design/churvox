import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PremiumButton } from "@/components/premium";

const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";
const COUNTRY_OPTIONS = ["New Zealand", "Australia"];
const REGION_OPTIONS = {
  "New Zealand": ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  "Australia": ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
};
const JOB_TYPES = [
  ["other", "General service"], ["lawn_mowing", "Lawn mowing"], ["garden_maintenance", "Garden maintenance"], ["landscaping", "Landscaping"],
  ["cleaning", "Cleaning"], ["window_cleaning", "Window cleaning"], ["pressure_washing", "Pressure washing"], ["handyman", "Handyman"],
  ["plumbing", "Plumbing"], ["electrical", "Electrical"], ["painting", "Painting"], ["carpentry", "Carpentry"],
  ["pest_control", "Pest control"], ["pool_maintenance", "Pool maintenance"], ["hvac", "HVAC"], ["roofing", "Roofing"],
];

function list(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.clients)) return value.clients;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function idOf(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return idOf(value.$oid || value.oid || value.id || value._id || value.client_id || value.worker_id || "");
}
function nameOf(record) { return record?.name || record?.client_name || record?.customer_name || record?.display_name || record?.full_name || record?.email || ""; }
function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function lower(value) { return clean(value).toLowerCase(); }
function titleCase(value) { return clean(value).replace(/\b\w/g, (m) => m.toUpperCase()); }
function q(search, key) { try { return new URLSearchParams(search).get(key) || ""; } catch { return ""; } }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function storedAsk() { try { return window.localStorage.getItem(ASK_DRAFT_KEY) || ""; } catch { return ""; } }
function pad(n) { return String(n).padStart(2, "0"); }
function toInputDate(date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function jobTypeLabel(value) { return JOB_TYPES.find(([key]) => key === value)?.[1] || "New job"; }

function parseTimeInto(date, text) {
  const input = lower(text);
  const match = input.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || input.match(/\b(?:at\s*)?(\d{1,2}):(\d{2})\b/);
  let hour = input.includes("evening") ? 17 : input.includes("afternoon") ? 13 : input.includes("morning") ? 9 : 9;
  let minute = 0;
  if (match) {
    hour = Number(match[1]);
    minute = Number(match[2] || 0);
    if (match[3] === "pm" && hour < 12) hour += 12;
    if (match[3] === "am" && hour === 12) hour = 0;
  }
  date.setHours(hour, minute, 0, 0);
  return toInputDate(date);
}
function parseDate(text) {
  const input = lower(text);
  const today = new Date();
  const numeric = input.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (numeric) {
    const year = numeric[3] ? Number(String(numeric[3]).length === 2 ? `20${numeric[3]}` : numeric[3]) : today.getFullYear();
    const date = new Date(year, Number(numeric[2]) - 1, Number(numeric[1]));
    return parseTimeInto(date, input);
  }
  const date = new Date();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (input.includes("tomorrow")) { date.setDate(date.getDate() + 1); return parseTimeInto(date, input); }
  if (input.includes("next week")) { date.setDate(date.getDate() + 7); return parseTimeInto(date, input); }
  const day = days.find((d) => input.includes(d));
  if (day) {
    let add = (days.indexOf(day) - date.getDay() + 7) % 7;
    if (add === 0 || input.includes(`next ${day}`)) add += 7;
    date.setDate(date.getDate() + add);
    return parseTimeInto(date, input);
  }
  if (input.includes("today")) return parseTimeInto(date, input);
  return "";
}
function jobType(text) {
  const input = lower(text);
  if (input.includes("lawn") || input.includes("mow")) return "lawn_mowing";
  if (input.includes("garden") || input.includes("hedge") || input.includes("weed")) return "garden_maintenance";
  if (input.includes("window")) return "window_cleaning";
  if (input.includes("pressure") || input.includes("wash")) return "pressure_washing";
  if (input.includes("clean")) return "cleaning";
  if (input.includes("paint")) return "painting";
  if (input.includes("plumb")) return "plumbing";
  if (input.includes("electric")) return "electrical";
  if (input.includes("pest")) return "pest_control";
  if (input.includes("pool")) return "pool_maintenance";
  if (input.includes("roof")) return "roofing";
  if (input.includes("handyman") || input.includes("repair")) return "handyman";
  return "other";
}
function jobTitle(text) {
  const type = jobType(text);
  return jobTypeLabel(type);
}
function stopSlice(value) {
  const stops = [" tomorrow", " today", " next ", " monday", " tuesday", " wednesday", " thursday", " friday", " saturday", " sunday", " phone ", " mobile ", " email ", " assign ", " worker ", " staff ", " with ", " price ", " for $", " $", " weekly", " fortnightly", " monthly", " recurring", " repeat"];
  const input = ` ${clean(value)} `;
  const indexes = stops.map((stop) => input.toLowerCase().indexOf(stop)).filter((n) => n > -1);
  const end = indexes.length ? Math.min(...indexes) : input.length;
  return clean(input.slice(0, end).replace(/[,.;]+$/g, ""));
}
function removeKnownBits(source) {
  return clean(source)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, " ")
    .replace(/(?:phone|mobile|ph|number)\s*[:\-]?\s*[+\d][+\d\s().-]{6,}/ig, " ")
    .replace(/\b(?:\+?64|0)\d[\d\s().-]{6,}\b/g, " ")
    .replace(/\$\s*\d+(?:\.\d{1,2})?/g, " ")
    .replace(/\b\d+(?:\.\d{1,2})?\s*(?:dollars|bucks)\b/ig, " ");
}
function parseAddress(source) {
  const direct = source.match(/\b(?:at|address|site|location)\s+(.+)/i)?.[1] || "";
  const value = stopSlice(direct);
  if (value) return titleCase(value);
  const cleaned = removeKnownBits(source);
  const street = cleaned.match(/\b\d+\s+[A-Za-z0-9 .'-]+?\s+(?:road|rd|street|st|avenue|ave|drive|dr|lane|ln|place|pl|terrace|way|crescent|cres|court|ct)\b(?:\s+[A-Za-z .'-]{2,30})?/i)?.[0] || "";
  return titleCase(stopSlice(street));
}
function parseClient(source) {
  const direct = source.match(/\b(?:for|client|customer)\s+(.+?)(?=\s+(?:at|address|site|location|tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|phone|mobile|email|\$|price|weekly|fortnightly|monthly|assign|worker|staff)\b|$)/i)?.[1] || "";
  if (direct) return titleCase(stopSlice(direct));
  const beforeAddress = source.match(/\b(?:job|booking|service|work)\s+(.+?)\s+(?:at|address|site|location)\b/i)?.[1] || "";
  return titleCase(stopSlice(beforeAddress.replace(/^(for\s+)?/i, "")));
}
function parseWorker(source) {
  const direct = source.match(/\b(?:assign|worker|staff)\s+(?:to\s+)?(.+?)(?=\s+(?:tomorrow|today|next|at|address|site|for|phone|mobile|email|\$|price|weekly|fortnightly|monthly)\b|$)/i)?.[1] || "";
  if (direct) return titleCase(stopSlice(direct));
  const withWorker = source.match(/\bwith\s+([A-Za-z][A-Za-z .'-]{1,40})(?=\s+(?:tomorrow|today|next|at|for|phone|email|\$|weekly|fortnightly|monthly)|$)/i)?.[1] || "";
  return titleCase(stopSlice(withWorker));
}
function parseInstruction(text) {
  const source = clean(text);
  const input = lower(source);
  const priceMatch = source.match(/\$\s*(\d+(?:\.\d{1,2})?)/) || source.match(/\b(?:price|fixed|charge)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i) || source.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)\b/i);
  const hourlyMatch = source.match(/\$\s*(\d+(?:\.\d{1,2})?)\s*(?:per hour|hourly|\/hr)/i) || source.match(/\b(\d+(?:\.\d{1,2})?)\s*(?:per hour|hourly|\/hr)\b/i);
  const emailMatch = source.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const labelledPhone = source.match(/(?:phone|mobile|ph|number)\s*[:\-]?\s*([+\d][+\d\s().-]{6,})/i)?.[1] || "";
  const loosePhone = source.match(/\b(?:\+?64|0)\d[\d\s().-]{6,}\b/)?.[0] || "";
  const country = /australia|sydney|melbourne|brisbane|nsw|victoria|queensland/i.test(source) ? "Australia" : "New Zealand";
  let region = "";
  if (/lower hutt|upper hutt|wellington|naenae|wainuiomata|porirua/i.test(source)) region = "Wellington";
  if (/auckland/i.test(source)) region = "Auckland";
  if (/sydney|nsw|new south wales/i.test(source)) region = "New South Wales";
  if (/melbourne|victoria/i.test(source)) region = "Victoria";
  if (/brisbane|queensland/i.test(source)) region = "Queensland";
  const recurring = /fortnightly|fortnight|weekly|monthly|recurring|repeat|regular|every\s+week|every\s+2\s+weeks|every\s+month/i.test(source);
  const frequency = /fortnight|every\s+2\s+weeks/i.test(input) ? "fortnightly" : /month/i.test(input) ? "monthly" : "weekly";
  return {
    title: jobTitle(source),
    job_type: jobType(source),
    client_name: parseClient(source),
    customer_email: emailMatch?.[0] || "",
    customer_phone: clean(labelledPhone || loosePhone),
    address: parseAddress(source),
    scheduled_date: parseDate(source),
    country,
    region,
    notes: source,
    assigned_worker_name: parseWorker(source),
    pricing_type: hourlyMatch ? "hourly" : "fixed",
    fixed_price: hourlyMatch ? "" : String(priceMatch?.[1] || ""),
    hourly_rate: String(hourlyMatch?.[1] || ""),
    is_recurring: recurring,
    recurring_frequency: frequency,
  };
}

export default function JobCreateForm({ onSuccess, onCancel, submitLabel = "Create job", isWorker = false, modalSearch = null, initialInstruction = "" }) {
  const location = useLocation();
  const activeSearch = modalSearch ?? location.search;
  const clientFromQuery = q(activeSearch, "client_id");
  const workerFromQuery = q(activeSearch, "worker_id") || q(activeSearch, "workerId");
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [appliedAsk, setAppliedAsk] = useState("");
  const [form, setForm] = useState({ title: "", job_type: "other", client_id: clientFromQuery, client_name: "", customer_email: "", customer_phone: "", address: "", scheduled_date: "", country: "New Zealand", region: "", notes: "", assigned_worker_id: workerFromQuery, assigned_worker_name: "", status: "assigned", pricing_type: "fixed", fixed_price: "", hourly_rate: "", is_recurring: false, recurring_frequency: "weekly" });

  useEffect(() => {
    let alive = true;
    Promise.all([get("/clients"), get("/team/workers")]).then(([clientRes, workerRes]) => {
      if (!alive) return;
      setClients(clientRes?.success ? list(clientRes.data) : []);
      setWorkers(workerRes?.success ? list(workerRes.data) : []);
    });
    return () => { alive = false; };
  }, [get]);

  useEffect(() => {
    const source = clean(initialInstruction || storedAsk());
    if (!source || source === appliedAsk) return;
    const parsed = parseInstruction(source);
    setForm((current) => ({
      ...current,
      title: current.title || parsed.title,
      job_type: current.job_type !== "other" ? current.job_type : parsed.job_type,
      client_name: current.client_name || parsed.client_name,
      customer_email: current.customer_email || parsed.customer_email,
      customer_phone: current.customer_phone || parsed.customer_phone,
      address: current.address || parsed.address,
      scheduled_date: current.scheduled_date || parsed.scheduled_date,
      country: parsed.country || current.country,
      region: current.region || parsed.region,
      notes: current.notes || parsed.notes,
      assigned_worker_name: current.assigned_worker_name || parsed.assigned_worker_name,
      pricing_type: parsed.pricing_type || current.pricing_type,
      fixed_price: current.fixed_price || parsed.fixed_price,
      hourly_rate: current.hourly_rate || parsed.hourly_rate,
      is_recurring: current.is_recurring || parsed.is_recurring,
      recurring_frequency: parsed.is_recurring ? parsed.recurring_frequency : current.recurring_frequency,
    }));
    setAppliedAsk(source);
  }, [initialInstruction, appliedAsk]);

  useEffect(() => {
    if (form.client_id || !form.client_name || !clients.length) return;
    const wanted = lower(form.client_name);
    const match = clients.find((client) => lower(nameOf(client)) === wanted || lower(nameOf(client)).includes(wanted) || wanted.includes(lower(nameOf(client))));
    if (match) pickClient(idOf(match));
  }, [clients, form.client_id, form.client_name]);

  useEffect(() => {
    if (form.assigned_worker_id || !form.assigned_worker_name || !workers.length) return;
    const wanted = lower(form.assigned_worker_name);
    const match = workers.find((worker) => lower(nameOf(worker)) === wanted || lower(nameOf(worker)).includes(wanted) || wanted.includes(lower(nameOf(worker))));
    if (match) pickWorker(idOf(match));
  }, [workers, form.assigned_worker_id, form.assigned_worker_name]);

  const filteredWorkers = useMemo(() => workers.filter((worker) => !form.region || lower(worker?.region || worker?.state) === lower(form.region)), [workers, form.region]);
  const aiFilled = useMemo(() => [["Client", form.client_name], ["Address", form.address], ["Phone", form.customer_phone], ["Email", form.customer_email], ["Schedule", form.scheduled_date], ["Region", form.region], ["Worker", form.assigned_worker_name], ["Price", form.fixed_price ? `$${form.fixed_price}` : form.hourly_rate ? `$${form.hourly_rate}/hr` : ""], ["Repeat", form.is_recurring ? form.recurring_frequency : ""]].filter(([, value]) => Boolean(value)), [form]);

  function pickClient(value) {
    const client = clients.find((item) => idOf(item) === String(value));
    setForm((current) => ({ ...current, client_id: value, client_name: client ? nameOf(client) : current.client_name, customer_email: client?.email || client?.customer_email || client?.client_email || current.customer_email, customer_phone: client?.phone || client?.mobile || client?.customer_phone || current.customer_phone, address: client?.address || client?.site_address || client?.billing_address || current.address }));
  }
  function pickWorker(value) {
    const worker = workers.find((item) => idOf(item) === String(value));
    setForm((current) => ({ ...current, assigned_worker_id: value, assigned_worker_name: worker ? nameOf(worker) : current.assigned_worker_name }));
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.job_type) return toast.error("Job type is required");
    if (!form.scheduled_date) return toast.error("Scheduled date is required");
    if (!form.address.trim()) return toast.error("Job address is required");
    setSaving(true);
    const fixedPrice = money(form.fixed_price);
    const hourlyRate = money(form.hourly_rate);
    const finalTitle = clean(form.title) || jobTypeLabel(form.job_type) || "New job";
    const payload = { title: finalTitle, job_name: finalTitle, job_type: form.job_type || "other", client_id: form.client_id || null, client_name: form.client_name, customer_name: form.client_name, customer_email: form.customer_email, customer_phone: form.customer_phone, address: form.address, site_address: form.address, scheduled_date: form.scheduled_date, estimated_duration: 60, country: form.country, region: form.region, notes: form.notes, description: form.notes, assigned_worker_id: form.assigned_worker_id || null, worker_id: form.assigned_worker_id || null, assigned_worker_name: form.assigned_worker_name, worker_name: form.assigned_worker_name, pricing_type: form.pricing_type, fixed_price: fixedPrice, price: ["fixed", "fixed_extras"].includes(form.pricing_type) ? fixedPrice : 0, hourly_rate: ["hourly", "hourly_extras"].includes(form.pricing_type) ? hourlyRate : 0, status: form.status || "assigned", is_recurring: Boolean(form.is_recurring), recurrence_pattern: form.is_recurring ? form.recurring_frequency : null, recurring_frequency: form.is_recurring ? form.recurring_frequency : null };
    const res = await post("/jobs", payload);
    setSaving(false);
    if (res?.success) { toast.success("Job created"); try { window.localStorage.removeItem(ASK_DRAFT_KEY); } catch {} onSuccess?.(res.data || res.job || res.record || res); }
    else toast.error(res?.error || "Could not create job");
  }

  const section = "rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]";
  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 shadow-sm";
  return <form onSubmit={handleSubmit} className="min-h-full flex flex-col" data-version="CHURVOX_CLEAN_JOB_FORM_20260619">
    <div className="space-y-4 pb-28">
      <section className={section}>
        <p className="text-sm font-black text-slate-950">Job details</p>
        {appliedAsk ? <p className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs font-bold text-orange-800">Opened from Ask Churvox. I carried the typed job info into the form.</p> : null}
        {appliedAsk && aiFilled.length ? <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3"><p className="mb-2 text-xs font-black uppercase tracking-[.14em] text-orange-900">AI filled</p><div className="grid gap-2 md:grid-cols-2">{aiFilled.map(([label, value]) => <div key={label} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-950"><span className="block text-[10px] uppercase tracking-[.12em] text-orange-800">{label}</span>{value}</div>)}</div></div> : null}
        <div><Label htmlFor="job-type">Job type *</Label><select id="job-type" required className={fieldClass} value={form.job_type} onChange={(e)=>setForm((p)=>({...p,job_type:e.target.value,title:p.title || jobTypeLabel(e.target.value)}))} data-testid="job-type-select">{JOB_TYPES.map(([value, label])=><option key={value} value={value}>{label}</option>)}</select></div>
        <div><Label htmlFor="job-notes">Notes / description</Label><Textarea id="job-notes" rows={3} className="w-full rounded-xl" value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))} data-testid="job-notes-input" /></div>
      </section>
      <section className={section}>
        <p className="text-sm font-black text-slate-950">Client & location</p>
        <div><Label htmlFor="job-client">Client</Label><select id="job-client" className={fieldClass} value={form.client_id} onChange={(e)=>pickClient(e.target.value)} data-testid="job-client-select"><option value="">Select client</option>{clients.map((c)=><option key={idOf(c)} value={idOf(c)}>{nameOf(c)}</option>)}</select></div>
        <div><Label htmlFor="job-client-name">Client name</Label><Input id="job-client-name" className="w-full rounded-xl" value={form.client_name} onChange={(e)=>setForm((p)=>({...p,client_name:e.target.value}))} data-testid="job-client-name-input" /></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label htmlFor="job-customer-email">Customer email</Label><Input id="job-customer-email" className="w-full rounded-xl" value={form.customer_email} onChange={(e)=>setForm((p)=>({...p,customer_email:e.target.value}))} data-testid="job-customer-email-input" /></div><div><Label htmlFor="job-customer-phone">Customer phone</Label><Input id="job-customer-phone" className="w-full rounded-xl" value={form.customer_phone} onChange={(e)=>setForm((p)=>({...p,customer_phone:e.target.value}))} data-testid="job-customer-phone-input" /></div></div>
        <div><Label htmlFor="job-address">Address *</Label><Input id="job-address" required className="w-full rounded-xl" value={form.address} onChange={(e)=>setForm((p)=>({...p,address:e.target.value}))} data-testid="job-address-input" /></div>
        <div className="grid md:grid-cols-2 gap-3"><div><Label htmlFor="job-country">Country</Label><select id="job-country" className={fieldClass} value={form.country} onChange={(e)=>setForm((p)=>({...p,country:e.target.value,region:"",assigned_worker_id:"",assigned_worker_name:""}))}>{COUNTRY_OPTIONS.map((c)=><option key={c} value={c}>{c}</option>)}</select></div><div><Label htmlFor="job-region">Region / State</Label><select id="job-region" className={fieldClass} value={form.region} onChange={(e)=>setForm((p)=>({...p,region:e.target.value,assigned_worker_id:"",assigned_worker_name:""}))}><option value="">Select region/state</option>{(REGION_OPTIONS[form.country]||[]).map((r)=><option key={r} value={r}>{r}</option>)}</select></div></div>
      </section>
      <section className={section}>
        <p className="text-sm font-black text-slate-950">Schedule & assignment</p>
        <div><Label htmlFor="job-scheduled-date">Scheduled date *</Label><Input id="job-scheduled-date" required type="datetime-local" className="w-full rounded-xl" value={form.scheduled_date} onChange={(e)=>setForm((p)=>({...p,scheduled_date:e.target.value}))} data-testid="job-scheduled-date-input" /></div>
        <div><Label htmlFor="job-assigned-worker">Assigned worker</Label><select id="job-assigned-worker" className={fieldClass} value={form.assigned_worker_id} onChange={(e)=>pickWorker(e.target.value)}><option value="">Select worker</option>{filteredWorkers.map((w)=><option key={idOf(w)} value={idOf(w)}>{nameOf(w)}</option>)}</select></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3"><label className="flex items-center gap-3 text-sm font-black text-slate-950"><input type="checkbox" checked={form.is_recurring} onChange={(e)=>setForm((p)=>({...p,is_recurring:e.target.checked}))} /> Recurring job</label>{form.is_recurring ? <select className={fieldClass} value={form.recurring_frequency} onChange={(e)=>setForm((p)=>({...p,recurring_frequency:e.target.value}))}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select> : null}</div>
      </section>
      {!isWorker ? <section className={section}>
        <p className="text-sm font-black text-slate-950">Pricing / invoice source</p>
        <div><Label htmlFor="job-pricing-type">Pricing type</Label><select id="job-pricing-type" className={fieldClass} value={form.pricing_type} onChange={(e)=>setForm((p)=>({...p,pricing_type:e.target.value}))}><option value="fixed">Fixed price</option><option value="hourly">Hourly</option><option value="fixed_extras">Fixed + extras</option><option value="hourly_extras">Hourly + extras</option></select></div>
        {["fixed","fixed_extras"].includes(form.pricing_type)?<div><Label htmlFor="job-fixed-price">Fixed price</Label><Input id="job-fixed-price" type="number" step="0.01" className="w-full rounded-xl" value={form.fixed_price} onChange={(e)=>setForm((p)=>({...p,fixed_price:e.target.value}))} /></div>:<div><Label htmlFor="job-hourly-rate">Hourly rate</Label><Input id="job-hourly-rate" type="number" step="0.01" className="w-full rounded-xl" value={form.hourly_rate} onChange={(e)=>setForm((p)=>({...p,hourly_rate:e.target.value}))} /></div>}
      </section> : null}
    </div>
    <div className="sticky bottom-0 z-50 mt-auto border-t border-slate-200 bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3">
      <PremiumButton type="button" variant="secondary" onClick={onCancel}>Cancel</PremiumButton>
      <PremiumButton type="submit" disabled={loading || saving}>{saving || loading ? "Saving..." : submitLabel}</PremiumButton>
    </div>
  </form>;
}
