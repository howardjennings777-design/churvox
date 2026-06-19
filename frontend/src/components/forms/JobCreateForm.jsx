// CHURVOX_JOB_CREATE_REQUIRED_FIELDS_20260607
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
const JOB_TYPE_OPTIONS = [
  ["other", "General service"],
  ["lawn_mowing", "Lawn mowing"],
  ["garden_maintenance", "Garden maintenance"],
  ["landscaping", "Landscaping"],
  ["cleaning", "Cleaning"],
  ["window_cleaning", "Window cleaning"],
  ["pressure_washing", "Pressure washing"],
  ["handyman", "Handyman"],
  ["plumbing", "Plumbing"],
  ["electrical", "Electrical"],
  ["painting", "Painting"],
  ["carpentry", "Carpentry"],
  ["pest_control", "Pest control"],
  ["pool_maintenance", "Pool maintenance"],
  ["hvac", "HVAC"],
  ["roofing", "Roofing"],
];

function arr(value) { if (Array.isArray(value)) return value; if (Array.isArray(value?.data)) return value.data; if (Array.isArray(value?.clients)) return value.clients; if (Array.isArray(value?.workers)) return value.workers; if (Array.isArray(value?.items)) return value.items; if (Array.isArray(value?.results)) return value.results; return []; }
function normalizeId(value) { if (!value) return ""; if (typeof value === "string") return value; if (typeof value === "number") return String(value); if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || ""); const text = String(value || ""); return text === "[object Object]" ? "" : text; }
function recordId(payload) { const data = payload?.data ?? payload; const item = data?.job || data?.item || data?.record || data; return normalizeId(data?.id || data?._id || item?.id || item?._id || ""); }
function clientId(client) { return normalizeId(client?.id || client?._id || client?.client_id || ""); }
function workerId(worker) { return normalizeId(worker?.id || worker?._id || worker?.worker_id || ""); }
function clientName(client) { return client?.name || client?.client_name || client?.customer_name || client?.contact_name || "Client"; }
function workerName(worker) { return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker"; }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n : 0; }
function queryValue(search, key) { try { return new URLSearchParams(search).get(key) || ""; } catch { return ""; } }
function titleCase(value) { return String(value || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function inputDateTime(date) { const pad = (n) => String(n).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
function keyText(value) { return cleanText(value).toLowerCase(); }

function applyTime(date, text) {
  const lower = keyText(text);
  let hour = /evening|night/.test(lower) ? 17 : /afternoon/.test(lower) ? 13 : /morning/.test(lower) ? 9 : 9;
  let minute = 0;
  const timeMatch = lower.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) || lower.match(/\b(?:at\s*)?(\d{1,2}):(\d{2})\b/);
  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2] || 0);
    const suffix = timeMatch[3] || "";
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
  }
  date.setHours(hour, minute, 0, 0);
  return inputDateTime(date);
}

function dateFromInstruction(text) {
  const lower = keyText(text);
  const date = new Date();
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (/tomorrow/.test(lower)) {
    date.setDate(date.getDate() + 1);
    return applyTime(date, lower);
  }
  if (/next week/.test(lower)) {
    date.setDate(date.getDate() + 7);
    return applyTime(date, lower);
  }
  const dayMatch = lower.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch) {
    const target = days.indexOf(dayMatch[2]);
    let add = (target - date.getDay() + 7) % 7;
    if (add === 0 || dayMatch[1]) add += 7;
    date.setDate(date.getDate() + add);
    return applyTime(date, lower);
  }
  if (/today/.test(lower)) return applyTime(date, lower);
  return "";
}

function typeFromInstruction(text) { const lower = keyText(text); if (/lawn|mow|mowing/.test(lower)) return "lawn_mowing"; if (/garden|hedge|weed/.test(lower)) return "garden_maintenance"; if (/landscap/.test(lower)) return "landscaping"; if (/window/.test(lower)) return "window_cleaning"; if (/clean/.test(lower)) return "cleaning"; if (/pressure|wash/.test(lower)) return "pressure_washing"; if (/paint/.test(lower)) return "painting"; if (/plumb/.test(lower)) return "plumbing"; if (/electric/.test(lower)) return "electrical"; if (/pest/.test(lower)) return "pest_control"; if (/pool/.test(lower)) return "pool_maintenance"; if (/roof/.test(lower)) return "roofing"; if (/carpent/.test(lower)) return "carpentry"; if (/hvac|heat pump|air con/.test(lower)) return "hvac"; if (/handyman|repair|fix/.test(lower)) return "handyman"; return "other"; }
function priceFromInstruction(text) { const match = cleanText(text).match(/(?:\$|nzd\s*)\s*(\d+(?:\.\d{1,2})?)|\b(\d+(?:\.\d{1,2})?)\s*(?:dollars|bucks)\b/i); return match ? String(match[1] || match[2] || "") : ""; }
function hourlyRateFromInstruction(text) { const match = cleanText(text).match(/(?:\$|nzd\s*)\s*(\d+(?:\.\d{1,2})?)\s*(?:\/\s*hr|per\s+hour|an\s+hour|hourly)|\b(\d+(?:\.\d{1,2})?)\s*(?:\/\s*hr|per\s+hour|an\s+hour|hourly)\b/i); return match ? String(match[1] || match[2] || "") : ""; }
function clientFromInstruction(text) { const match = cleanText(text).match(/\b(?:for|client|customer)\s+([A-Za-z][A-Za-z .'-]{1,40})(?=\s+(?:tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|lawn|mowing|clean|garden|at|address|phone|mobile|email|\$|for\s+\$)|$)/i); return match ? titleCase(match[1]) : ""; }
function titleFromInstruction(text) { const raw = cleanText(text); const lower = raw.toLowerCase(); if (/lawn|mow|mowing/.test(lower)) return "Lawn mowing"; if (/garden|hedge|weed/.test(lower)) return "Garden maintenance"; if (/window/.test(lower)) return "Window cleaning"; if (/pressure|wash/.test(lower)) return "Pressure washing"; if (/clean/.test(lower)) return "Cleaning job"; if (/paint/.test(lower)) return "Painting job"; if (/plumb/.test(lower)) return "Plumbing job"; if (/electric/.test(lower)) return "Electrical job"; const cleaned = raw.replace(/^(add|new|create|book|make)\s+(a\s+)?(job|work|booking|service)\s*/i, "").replace(/\s+/g, " ").trim(); return titleCase(cleaned || "New job").slice(0, 80); }
function emailFromInstruction(text) { const match = cleanText(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i); return match ? match[0] : ""; }
function phoneFromInstruction(text) { const match = cleanText(text).match(/\b(?:phone|mobile|ph|call|number)\s*[:\-]?\s*([+()\d][+\d\s().-]{6,})/i); return match ? match[1].replace(/\s+/g, " ").trim() : ""; }
function addressFromInstruction(text) { const source = cleanText(text); const match = source.match(/\b(?:at|address|site|location)\s+(.+?)(?=\s+(?:today|tomorrow|next\s+week|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)|for\s+\$|\$|fixed|hourly|per\s+hour|weekly|fortnightly|monthly|phone|mobile|email|assign|worker|with\s+worker)\b|$)/i); let value = cleanText(match?.[1] || ""); if (!value || /^\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(value)) return ""; value = value.replace(/[,.;]+$/, "").trim(); if (!/\d/.test(value) && !/(street|st|road|rd|avenue|ave|drive|dr|lane|ln|way|place|pl|terrace|hutt|wellington|auckland|christchurch|hamilton|dunedin|tauranga)/i.test(value)) return ""; return titleCase(value); }
function countryFromInstruction(text) { const lower = keyText(text); if (/\b(australia|aussie|nsw|victoria|queensland|sydney|melbourne|brisbane|perth|adelaide)\b/.test(lower)) return "Australia"; return "New Zealand"; }
function regionFromInstruction(text, country = "New Zealand") { const lower = keyText(text); const regions = REGION_OPTIONS[country] || []; const direct = regions.find((region) => lower.includes(region.toLowerCase())); if (direct) return direct; if (country === "New Zealand" && /(wellington|lower hutt|upper hutt|naenae|wainuiomata|porirua|kapiti)/.test(lower)) return "Wellington"; if (country === "New Zealand" && /auckland/.test(lower)) return "Auckland"; if (country === "Australia" && /(sydney|nsw|new south wales)/.test(lower)) return "New South Wales"; if (country === "Australia" && /(melbourne|victoria)/.test(lower)) return "Victoria"; if (country === "Australia" && /(brisbane|queensland)/.test(lower)) return "Queensland"; return ""; }
function workerFromInstruction(text) { const match = cleanText(text).match(/\b(?:assign|worker|staff|with)\s+(?:to\s+)?([A-Za-z][A-Za-z .'-]{1,40})(?=\s+(?:tomorrow|today|next|at|for|\$|phone|email|weekly|fortnightly|monthly)|$)/i); return match ? titleCase(match[1]) : ""; }
function recurringFrequencyFromInstruction(text) { const lower = keyText(text); if (/fortnight|every\s+2\s+weeks|two\s+weekly/.test(lower)) return "fortnightly"; if (/month|monthly/.test(lower)) return "monthly"; if (/week|weekly|recurring|repeat|regular/.test(lower)) return "weekly"; return "weekly"; }
function isRecurringInstruction(text) { return /\b(recurring|repeat|regular|weekly|fortnightly|monthly|every\s+week|every\s+2\s+weeks|every\s+month)\b/i.test(text || ""); }
function pricingTypeFromInstruction(text, fixedPrice, hourlyRate) { const lower = keyText(text); const extras = /extra|extras|plus/.test(lower); if (hourlyRate || /hourly|per\s+hour|\/\s*hr/.test(lower)) return extras ? "hourly_extras" : "hourly"; return extras ? "fixed_extras" : "fixed"; }
function draftFromStorage() { try { return window.localStorage.getItem(ASK_DRAFT_KEY) || ""; } catch { return ""; } }

export default function JobCreateForm({ onSuccess, onCancel, submitLabel = "Create job", isWorker = false, modalSearch = null, initialInstruction = "" }) {
  const location = useLocation();
  const activeSearch = modalSearch ?? location.search;
  const clientFromQuery = queryValue(activeSearch, "client_id");
  const workerFromQuery = queryValue(activeSearch, "worker_id") || queryValue(activeSearch, "workerId");
  const { get, post, loading } = useApi();
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [instructionApplied, setInstructionApplied] = useState("");
  const [form, setForm] = useState({ title: "", job_type: "other", client_id: clientFromQuery, client_name: "", customer_email: "", customer_phone: "", address: "", scheduled_date: "", country: "New Zealand", region: "", notes: "", assigned_worker_id: workerFromQuery, assigned_worker_name: "", status: "assigned", pricing_type: "fixed", fixed_price: "", hourly_rate: "", is_recurring: false, recurring_frequency: "weekly" });

  useEffect(() => { let alive = true; async function load() { const [clientsRes, workersRes] = await Promise.all([get("/clients"), get("/team/workers")]); if (!alive) return; setClients(clientsRes?.success ? arr(clientsRes.data) : []); setWorkers(workersRes?.success ? arr(workersRes.data) : []); } load(); return () => { alive = false; }; }, [get]);

  useEffect(() => {
    const source = cleanText(initialInstruction || draftFromStorage() || "");
    if (!source || instructionApplied === source) return;
    const guessedClient = clientFromInstruction(source);
    const guessedPrice = priceFromInstruction(source);
    const guessedHourlyRate = hourlyRateFromInstruction(source);
    const guessedCountry = countryFromInstruction(source);
    const guessedRegion = regionFromInstruction(source, guessedCountry);
    const recurring = isRecurringInstruction(source);
    setForm((p) => ({
      ...p,
      title: p.title || titleFromInstruction(source),
      job_type: p.job_type && p.job_type !== "other" ? p.job_type : typeFromInstruction(source),
      client_name: p.client_name || guessedClient,
      customer_email: p.customer_email || emailFromInstruction(source),
      customer_phone: p.customer_phone || phoneFromInstruction(source),
      address: p.address || addressFromInstruction(source),
      scheduled_date: p.scheduled_date || dateFromInstruction(source),
      country: p.country || guessedCountry,
      region: p.region || guessedRegion,
      notes: p.notes || source,
      assigned_worker_name: p.assigned_worker_name || workerFromInstruction(source),
      pricing_type: pricingTypeFromInstruction(source, guessedPrice, guessedHourlyRate || p.hourly_rate),
      fixed_price: p.fixed_price || guessedPrice,
      hourly_rate: p.hourly_rate || guessedHourlyRate,
      is_recurring: p.is_recurring || recurring,
      recurring_frequency: recurring ? recurringFrequencyFromInstruction(source) : p.recurring_frequency,
    }));
    setInstructionApplied(source);
  }, [initialInstruction, instructionApplied]);

  useEffect(() => { if (prefilled) return; if (clientFromQuery && clients.length) { const client = clients.find((c) => clientId(c) === String(clientFromQuery)); if (client) pickClient(clientFromQuery); } if (workerFromQuery && workers.length) { const worker = workers.find((w) => workerId(w) === String(workerFromQuery)); if (worker) pickWorker(workerFromQuery); } if ((clientFromQuery && clients.length) || (workerFromQuery && workers.length) || (!clientFromQuery && !workerFromQuery)) setPrefilled(true); }, [clients, workers, clientFromQuery, workerFromQuery, prefilled]);

  useEffect(() => {
    if (form.client_id || !form.client_name || !clients.length) return;
    const wanted = keyText(form.client_name);
    const match = clients.find((client) => keyText(clientName(client)) === wanted || keyText(clientName(client)).includes(wanted) || wanted.includes(keyText(clientName(client))));
    if (match) pickClient(clientId(match));
  }, [clients, form.client_id, form.client_name]);

  useEffect(() => {
    if (form.assigned_worker_id || !form.assigned_worker_name || !workers.length) return;
    const wanted = keyText(form.assigned_worker_name);
    const match = workers.find((worker) => keyText(workerName(worker)) === wanted || keyText(workerName(worker)).includes(wanted) || wanted.includes(keyText(workerName(worker))));
    if (match) pickWorker(workerId(match));
  }, [workers, form.assigned_worker_id, form.assigned_worker_name]);

  const filteredWorkers = useMemo(() => workers.filter((worker) => { if (!form.country || !form.region) return true; return String(worker?.country || "").toLowerCase() === String(form.country || "").toLowerCase() && String(worker?.region || worker?.state || "").toLowerCase() === String(form.region || "").toLowerCase(); }), [workers, form.country, form.region]);

  function pickClient(clientIdValue) { const client = clients.find((c) => clientId(c) === String(clientIdValue)); setForm((p) => ({ ...p, client_id: clientIdValue, client_name: client ? clientName(client) : p.client_name, customer_email: client?.email || client?.customer_email || client?.client_email || p.customer_email, customer_phone: client?.phone || client?.mobile || client?.customer_phone || p.customer_phone, address: client?.address || client?.site_address || client?.billing_address || p.address, title: p.title || (client ? `Job for ${clientName(client)}` : p.title) })); }
  function pickWorker(workerIdValue) { const worker = workers.find((w) => workerId(w) === String(workerIdValue)); setForm((p) => ({ ...p, assigned_worker_id: workerIdValue, assigned_worker_name: worker ? workerName(worker) : "" })); }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Job title is required");
    if (!form.job_type) return toast.error("Job type is required");
    if (!form.scheduled_date) return toast.error("Scheduled date is required");
    if (!form.address.trim()) return toast.error("Job address is required");
    setSaving(true);
    const fixedPrice = money(form.fixed_price);
    const hourlyRate = money(form.hourly_rate);
    const payload = { title: form.title.trim(), job_name: form.title.trim(), job_type: form.job_type || "other", client_id: form.client_id || null, client_name: form.client_name, customer_name: form.client_name, customer_email: form.customer_email, customer_phone: form.customer_phone, address: form.address, site_address: form.address, scheduled_date: form.scheduled_date, estimated_duration: 60, country: form.country, region: form.region, notes: form.notes, description: form.notes, assigned_worker_id: form.assigned_worker_id || null, worker_id: form.assigned_worker_id || null, assigned_worker_name: form.assigned_worker_name, worker_name: form.assigned_worker_name, pricing_type: form.pricing_type, fixed_price: fixedPrice, price: ["fixed", "fixed_extras"].includes(form.pricing_type) ? fixedPrice : 0, hourly_rate: ["hourly", "hourly_extras"].includes(form.pricing_type) ? hourlyRate : 0, status: form.status || "assigned", is_recurring: Boolean(form.is_recurring), recurrence_pattern: form.is_recurring ? form.recurring_frequency : null, recurring_frequency: form.is_recurring ? form.recurring_frequency : null };
    const res = await post("/jobs", payload);
    setSaving(false);
    if (res?.success) { toast.success("Job created"); try { window.localStorage.removeItem(ASK_DRAFT_KEY); } catch {} onSuccess?.(res.data || res.job || res.record || res); } else { toast.error(res?.error || "Could not create job"); }
  };

  const section = "rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 space-y-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]";
  const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 shadow-sm";

  return <form onSubmit={handleSubmit} className="min-h-full flex flex-col" data-version="CHURVOX_JOB_CREATE_REQUIRED_FIELDS_20260607">
    <div className="space-y-4 pb-28">
      <section className={section}>
        <p className="text-sm font-black text-slate-950">Job details</p>
        {instructionApplied ? <p className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs font-bold text-orange-800">Opened from Ask Churvox. I carried the typed job info into the form.</p> : null}
        {clientFromQuery ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Opened from a client record. Customer details will prefill once the client loads.</p> : null}
        <div><Label htmlFor="job-title">Job title *</Label><Input id="job-title" required className="w-full rounded-xl" value={form.title} onChange={(e)=>setForm((p)=>({...p,title:e.target.value}))} data-testid="job-title-input" /></div>
        <div><Label htmlFor="job-type">Job type *</Label><select id="job-type" required className={fieldClass} value={form.job_type} onChange={(e)=>setForm((p)=>({...p,job_type:e.target.value}))} data-testid="job-type-select">{JOB_TYPE_OPTIONS.map(([value, label])=><option key={value} value={value}>{label}</option>)}</select></div>
        <div><Label htmlFor="job-notes">Notes / description</Label><Textarea id="job-notes" rows={3} className="w-full rounded-xl" value={form.notes} onChange={(e)=>setForm((p)=>({...p,notes:e.target.value}))} data-testid="job-notes-input" /></div>
      </section>
      <section className={section}>
        <p className="text-sm font-black text-slate-950">Client & location</p>
        <div><Label htmlFor="job-client">Client</Label><select id="job-client" className={fieldClass} value={form.client_id} onChange={(e)=>pickClient(e.target.value)} data-testid="job-client-select"><option value="">Select client</option>{clients.map((c)=><option key={clientId(c)} value={clientId(c)}>{clientName(c)}</option>)}</select></div>
        <div><Label htmlFor="job-client-name">Client name</Label><Input id="job-client-name" className="w-full rounded-xl" value={form.client_name} onChange={(e)=>setForm((p)=>({...p,client_name:e.target.value}))} data-testid="job-client-name-input" /></div>
        <div className="grid gap-3 md:grid-cols-2"><div><Label htmlFor="job-customer-email">Customer email</Label><Input id="job-customer-email" className="w-full rounded-xl" value={form.customer_email} onChange={(e)=>setForm((p)=>({...p,customer_email:e.target.value}))} data-testid="job-customer-email-input" /></div><div><Label htmlFor="job-customer-phone">Customer phone</Label><Input id="job-customer-phone" className="w-full rounded-xl" value={form.customer_phone} onChange={(e)=>setForm((p)=>({...p,customer_phone:e.target.value}))} data-testid="job-customer-phone-input" /></div></div>
        <div><Label htmlFor="job-address">Address *</Label><Input id="job-address" required className="w-full rounded-xl" value={form.address} onChange={(e)=>setForm((p)=>({...p,address:e.target.value}))} data-testid="job-address-input" /></div>
        <div className="grid md:grid-cols-2 gap-3"><div><Label htmlFor="job-country">Country</Label><select id="job-country" className={fieldClass} value={form.country} onChange={(e)=>setForm((p)=>({...p,country:e.target.value,region:"",assigned_worker_id:"",assigned_worker_name:""}))} data-testid="job-country-select">{COUNTRY_OPTIONS.map((c)=><option key={c} value={c}>{c}</option>)}</select></div><div><Label htmlFor="job-region">Region / State</Label><select id="job-region" className={fieldClass} value={form.region} onChange={(e)=>setForm((p)=>({...p,region:e.target.value,assigned_worker_id:"",assigned_worker_name:""}))} data-testid="job-region-select"><option value="">Select region/state</option>{(REGION_OPTIONS[form.country]||[]).map((r)=><option key={r} value={r}>{r}</option>)}</select></div></div>
      </section>
      <section className={section}>
        <p className="text-sm font-black text-slate-950">Schedule & assignment</p>
        <div><Label htmlFor="job-scheduled-date">Scheduled date *</Label><Input id="job-scheduled-date" required type="datetime-local" className="w-full rounded-xl" value={form.scheduled_date} onChange={(e)=>setForm((p)=>({...p,scheduled_date:e.target.value}))} data-testid="job-scheduled-date-input" /></div>
        <div><Label htmlFor="job-assigned-worker">Assigned worker</Label><select id="job-assigned-worker" className={fieldClass} value={form.assigned_worker_id} onChange={(e)=>pickWorker(e.target.value)} data-testid="job-worker-select"><option value="">Select worker</option>{filteredWorkers.map((w)=><option key={workerId(w)} value={workerId(w)}>{workerName(w)}</option>)}</select></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3"><label className="flex items-center gap-3 text-sm font-black text-slate-950"><input type="checkbox" checked={form.is_recurring} onChange={(e)=>setForm((p)=>({...p,is_recurring:e.target.checked}))} /> Recurring job</label>{form.is_recurring ? <select className={fieldClass} value={form.recurring_frequency} onChange={(e)=>setForm((p)=>({...p,recurring_frequency:e.target.value}))} data-testid="job-recurring-frequency"><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select> : null}</div>
      </section>
      {!isWorker ? <section className={section}>
        <p className="text-sm font-black text-slate-950">Pricing / invoice source</p>
        <div><Label htmlFor="job-pricing-type">Pricing type</Label><select id="job-pricing-type" className={fieldClass} value={form.pricing_type} onChange={(e)=>setForm((p)=>({...p,pricing_type:e.target.value}))} data-testid="job-pricing-type-select"><option value="fixed">Fixed price</option><option value="hourly">Hourly</option><option value="fixed_extras">Fixed + extras</option><option value="hourly_extras">Hourly + extras</option></select></div>
        {["fixed","fixed_extras"].includes(form.pricing_type)?<div><Label htmlFor="job-fixed-price">Fixed price</Label><Input id="job-fixed-price" type="number" step="0.01" className="w-full rounded-xl" value={form.fixed_price} onChange={(e)=>setForm((p)=>({...p,fixed_price:e.target.value}))} data-testid="job-fixed-price-input" /></div>:<div><Label htmlFor="job-hourly-rate">Hourly rate</Label><Input id="job-hourly-rate" type="number" step="0.01" className="w-full rounded-xl" value={form.hourly_rate} onChange={(e)=>setForm((p)=>({...p,hourly_rate:e.target.value}))} data-testid="job-hourly-rate-input" /></div>}
      </section> : null}
    </div>
    <div className="sticky bottom-0 mt-auto border-t border-slate-200 bg-white/95 backdrop-blur px-1 py-3 flex items-center justify-between gap-3">
      <PremiumButton type="button" variant="secondary" onClick={onCancel}>Cancel</PremiumButton>
      <PremiumButton type="submit" disabled={loading || saving}>{saving || loading ? "Saving..." : submitLabel}</PremiumButton>
    </div>
  </form>;
}
