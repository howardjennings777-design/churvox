// CHURVOX_COMMAND_JOB_FORM_20260607
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApi } from "../../hooks/useApi";
import { Briefcase, ChevronLeft, Save } from "lucide-react";
import { toast } from "sonner";

const FIRST_SETUP_KEY = "churvox_first_setup_pending";
const COUNTRY_OPTIONS = ["New Zealand", "Australia"];
const REGION_OPTIONS = {
  "New Zealand": ["Northland", "Auckland", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatu-Whanganui", "Wellington", "Tasman", "Nelson", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland"],
  Australia: ["New South Wales", "Victoria", "Queensland", "Western Australia", "South Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"],
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

function createdId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.job || data?.item || data?.record || data;
  return String(data?.id || data?._id || item?.id || item?._id || payload?.id || payload?._id || "");
}

function recordJob(payload) {
  const data = payload?.data ?? payload;
  return data?.job || data?.item || data?.record || data || {};
}

function clientName(client) {
  return client?.name || client?.client_name || client?.customer_name || "Client";
}

function clientId(client) {
  return String(client?.id || client?._id || client?.client_id || "");
}

function workerName(worker) {
  return worker?.name || worker?.display_name || worker?.full_name || worker?.email || "Worker";
}

function workerId(worker) {
  return String(worker?.id || worker?._id || worker?.worker_id || "");
}

function moneyNumber(value) {
  const n = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function firstSetupActive(searchParams) {
  try {
    return searchParams.get("first_setup") === "1" || localStorage.getItem(FIRST_SETUP_KEY) === "job";
  } catch {
    return false;
  }
}

function Field({ label, children, wide = false }) {
  return (
    <label className={wide ? "grid gap-2 md:col-span-2" : "grid gap-2"}>
      <span className="text-xs font-black uppercase tracking-[.14em] text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
const areaClass = "min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100";

function Section({ eyebrow, title, children }) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_46px_rgba(15,23,42,.07)] md:p-6">
      <div className="mb-5">
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">{eyebrow}</div>
        <h2 className="mt-1 text-2xl font-black tracking-[-.05em] text-slate-950">{title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function JobFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const api = useApi();
  const isEdit = Boolean(id);
  const firstSetup = !isEdit && firstSetupActive(searchParams);
  const workerIdFromQuery = searchParams.get("workerId") || searchParams.get("worker_id") || "";
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({
    title: "",
    client_id: "",
    client_name: "",
    customer_email: "",
    customer_phone: "",
    address: "",
    scheduled_date: "",
    country: "New Zealand",
    region: "",
    notes: "",
    assigned_worker_id: workerIdFromQuery,
    status: "assigned",
    pricing_type: "fixed",
    fixed_price: "",
    hourly_rate: "",
    is_recurring: false,
    recurring_frequency: "weekly",
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const [clientsRes, workersRes, jobRes] = await Promise.all([
          api.get("/clients"),
          api.get("/team/workers"),
          isEdit ? api.get(`/jobs/${encodeURIComponent(id)}`) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setClients(clientsRes?.success ? arr(clientsRes.data) : arr(clientsRes));
        setWorkers(workersRes?.success ? arr(workersRes.data) : arr(workersRes));
        if (isEdit && jobRes?.success) {
          const j = recordJob(jobRes);
          setForm({
            title: j.title || j.job_name || "",
            client_id: j.client_id || "",
            client_name: j.client_name || j.customer_name || "",
            customer_email: j.customer_email || j.client_email || "",
            customer_phone: j.customer_phone || j.client_phone || j.phone || "",
            address: j.address || j.site_address || "",
            scheduled_date: j.scheduled_date ? String(j.scheduled_date).slice(0, 16) : "",
            country: j.country || "New Zealand",
            region: j.region || "",
            notes: j.notes || j.description || "",
            assigned_worker_id: j.assigned_worker_id || j.worker_id || "",
            status: j.status || "assigned",
            pricing_type: j.pricing_type || "fixed",
            fixed_price: j.fixed_price || j.price || j.total || "",
            hourly_rate: j.hourly_rate || "",
            is_recurring: Boolean(j.is_recurring),
            recurring_frequency: j.recurring_frequency || "weekly",
          });
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [api, id, isEdit]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleClientChange(nextId) {
    const client = clients.find((c) => clientId(c) === String(nextId));
    setForm((prev) => ({
      ...prev,
      client_id: nextId,
      client_name: client ? clientName(client) : "",
      customer_email: client?.email || client?.customer_email || client?.client_email || prev.customer_email || "",
      customer_phone: client?.phone || client?.mobile || client?.customer_phone || prev.customer_phone || "",
      address: client?.address || client?.site_address || prev.address || "",
    }));
  }

  function filteredWorkers() {
    const norm = (v) => String(v || "").trim().toLowerCase();
    if (!form.country || !form.region) return workers;
    return workers.filter((w) => norm(w.country) === norm(form.country) && norm(w.region || w.state || w.area) === norm(form.region));
  }

  function finishCreate(data) {
    const nextId = createdId(data);
    if (firstSetup) {
      try { localStorage.setItem(FIRST_SETUP_KEY, "done"); } catch {}
      toast.success("First job created — Command Board is ready");
      navigate(`/dashboard?first_setup=done${nextId ? `&job_id=${encodeURIComponent(nextId)}` : ""}`);
      return;
    }
    navigate(nextId ? `/jobs/${nextId}` : "/jobs-board");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const worker = workers.find((w) => workerId(w) === String(form.assigned_worker_id));
      const price = form.pricing_type.includes("hourly") ? moneyNumber(form.hourly_rate) : moneyNumber(form.fixed_price);
      const payload = {
        title: form.title || "Job",
        job_name: form.title || "Job",
        client_id: form.client_id || null,
        client_name: form.client_name || "",
        customer_name: form.client_name || "",
        customer_email: form.customer_email || "",
        customer_phone: form.customer_phone || "",
        address: form.address || "",
        site_address: form.address || "",
        scheduled_date: form.scheduled_date || null,
        country: form.country || "New Zealand",
        region: form.region || "",
        notes: form.notes || "",
        description: form.notes || "",
        assigned_worker_id: form.assigned_worker_id || null,
        worker_id: form.assigned_worker_id || null,
        assigned_worker_name: worker ? workerName(worker) : "",
        worker_name: worker ? workerName(worker) : "",
        status: form.status || "assigned",
        pricing_type: form.pricing_type || "fixed",
        price,
        fixed_price: moneyNumber(form.fixed_price),
        hourly_rate: moneyNumber(form.hourly_rate),
        is_recurring: Boolean(form.is_recurring),
        recurring_frequency: form.recurring_frequency || "weekly",
      };
      const res = isEdit ? await api.patch(`/jobs/${encodeURIComponent(id)}`, payload) : await api.post("/jobs", payload);
      if (res?.success) {
        toast.success(isEdit ? "Job updated" : "Job created");
        const nextId = createdId(res) || id;
        if (isEdit) navigate(nextId ? `/jobs/${nextId}` : "/jobs-board");
        else finishCreate(res);
      } else {
        toast.error(res?.error || "Failed to save job");
      }
    } catch (error) {
      toast.error(error?.message || "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f3ea] p-4 pb-28 text-slate-950 lg:ml-[286px] lg:w-[calc(100vw-286px)] lg:p-8">
        <div className="mx-auto grid min-h-[60vh] max-w-6xl place-items-center">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-orange-400" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f3ea] p-4 pb-32 text-slate-950 lg:ml-[286px] lg:w-[calc(100vw-286px)] lg:p-8" data-command-record-page="job-form">
      <form onSubmit={handleSubmit} className="mx-auto max-w-6xl space-y-5" data-version="CHURVOX_COMMAND_JOB_FORM_20260607">
        <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_22px_62px_rgba(2,6,23,.22)] md:p-8">
          <span className="absolute left-0 top-0 h-full w-2 bg-gradient-to-b from-orange-400 via-amber-300 to-cyan-300" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="inline-flex rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-amber-200">{firstSetup ? "First setup" : isEdit ? "Edit job" : "New job"}</div>
              <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[.9] tracking-[-.08em] text-white md:text-7xl">{isEdit ? "Update this job." : "Create the job cleanly."}</h1>
              <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-300 md:text-base">Add the work, connect the client, set the schedule, choose pricing, and assign the crew. Churvox keeps the admin ready for approval.</p>
            </div>
            <Link to="/jobs-board" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white no-underline">
              <ChevronLeft className="h-4 w-4" /> Jobs Board
            </Link>
          </div>
        </section>

        <Section eyebrow="Job details" title="What work needs doing?">
          <Field label="Job title" wide><input value={form.title} onChange={(e) => setField("title", e.target.value)} className={inputClass} placeholder="Example: Lawn tidy, hedge trim, plumbing repair" required /></Field>
          <Field label="Notes / description" wide><textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} className={areaClass} placeholder="Add what needs doing, access notes, customer instructions, or internal notes." /></Field>
        </Section>

        <Section eyebrow="Client and location" title="Who is it for and where is it?">
          <Field label="Client"><select value={form.client_id} onChange={(e) => handleClientChange(e.target.value)} className={inputClass}><option value="">Select client</option>{clients.map((client) => <option key={clientId(client)} value={clientId(client)}>{clientName(client)}</option>)}</select></Field>
          <Field label="Client name"><input value={form.client_name} onChange={(e) => setField("client_name", e.target.value)} className={inputClass} placeholder="Manual client name" /></Field>
          <Field label="Customer email"><input value={form.customer_email} onChange={(e) => setField("customer_email", e.target.value)} className={inputClass} placeholder="customer@email.co.nz" /></Field>
          <Field label="Customer phone"><input value={form.customer_phone} onChange={(e) => setField("customer_phone", e.target.value)} className={inputClass} placeholder="Phone number" /></Field>
          <Field label="Address" wide><input value={form.address} onChange={(e) => setField("address", e.target.value)} className={inputClass} placeholder="Job address" /></Field>
          <Field label="Country"><select value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value, region: "", assigned_worker_id: "" }))} className={inputClass}>{COUNTRY_OPTIONS.map((country) => <option key={country} value={country}>{country}</option>)}</select></Field>
          <Field label="Region / state"><select value={form.region || ""} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value, assigned_worker_id: "" }))} className={inputClass}><option value="">Select region/state</option>{(REGION_OPTIONS[form.country] || []).map((region) => <option key={region} value={region}>{region}</option>)}</select></Field>
        </Section>

        <Section eyebrow="Schedule and assignment" title="When and who?">
          <Field label="Scheduled date"><input type="datetime-local" value={form.scheduled_date} onChange={(e) => setField("scheduled_date", e.target.value)} className={inputClass} style={{ colorScheme: "light" }} /></Field>
          <Field label="Assigned worker"><select value={form.assigned_worker_id} onChange={(e) => setField("assigned_worker_id", e.target.value)} className={inputClass}><option value="">Select worker</option>{filteredWorkers().map((worker) => <option key={workerId(worker)} value={workerId(worker)}>{workerName(worker)}</option>)}</select></Field>
          {isEdit ? <Field label="Status"><select value={form.status} onChange={(e) => setField("status", e.target.value)} className={inputClass}><option value="assigned">Assigned</option><option value="acknowledged">Acknowledged</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field> : null}
          <Field label="Recurring job"><div className="flex min-h-12 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4"><span className="text-sm font-black text-slate-700">Repeat this job</span><input type="checkbox" checked={form.is_recurring} onChange={(e) => setField("is_recurring", e.target.checked)} className="h-5 w-5 accent-orange-400" /></div></Field>
          {form.is_recurring ? <Field label="Repeat frequency"><select value={form.recurring_frequency} onChange={(e) => setField("recurring_frequency", e.target.value)} className={inputClass}><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option></select></Field> : null}
        </Section>

        <Section eyebrow="Pricing / invoice source" title="Give invoices a real amount source.">
          <Field label="Pricing type"><select value={form.pricing_type} onChange={(e) => setField("pricing_type", e.target.value)} className={inputClass}><option value="fixed">Fixed price</option><option value="hourly">Hourly</option><option value="fixed_extras">Fixed + extras</option><option value="hourly_extras">Hourly + extras</option></select></Field>
          {form.pricing_type.includes("hourly") ? <Field label="Hourly rate"><input value={form.hourly_rate} onChange={(e) => setField("hourly_rate", e.target.value)} className={inputClass} placeholder="$ per hour" inputMode="decimal" /></Field> : <Field label="Fixed price"><input value={form.fixed_price} onChange={(e) => setField("fixed_price", e.target.value)} className={inputClass} placeholder="$ amount" inputMode="decimal" /></Field>}
        </Section>

        <section className="sticky bottom-4 z-20 rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_20px_60px_rgba(15,23,42,.16)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={() => navigate("/jobs-board")} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-cyan-300 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-orange-500/20 disabled:opacity-60">
              <Save className="h-4 w-4" /> {saving ? "Saving…" : isEdit ? "Update job" : "Create Job"}
            </button>
          </div>
        </section>
      </form>
    </main>
  );
}
