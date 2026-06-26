import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import { mergeRecentInvoices } from "./freshRecentInvoices";
import "./freshJobsPolish.css";

const filters = ["All", "Ready", "In progress", "Blocked", "Completed", "Needs invoice"];
const STORY_ENDPOINTS = { quotes: "/quotes", invoices: "/invoices", clients: "/clients", workers: "/team/workers" };
const TIMER_OPTIMISTIC = {
  start: { status: "In progress", job_status: "In Progress", timer_status: "running", timer_running: true },
  pause: { status: "In progress", job_status: "In Progress", timer_status: "paused", timer_running: false },
  resume: { status: "In progress", job_status: "In Progress", timer_status: "running", timer_running: true },
  complete: { status: "Completed", job_status: "Completed", timer_status: "stopped", timer_running: false, completed: true, invoice_ready: true },
};
const EMPTY_JOB_FORM = { title: "", client: "", client_id: "", address: "", scheduled: "", price: "", notes: "" };
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || value.job_id || value.quote_id || value.invoice_id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function unpackList(payload, key = "") {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const name of ["jobs", "quotes", "invoices", "clients", "workers", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[name])) return data[name];
  }
  return [];
}

function lower(value) { return String(value || "").trim().toLowerCase(); }
function pick(record, ...keys) { for (const key of keys) { const value = record?.[key]; if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim(); } return ""; }
function statusLabel(value) { const text = lower(value).replace(/[_-]+/g, " "); if (/complete|done|finished/.test(text)) return "Completed"; if (/progress|started|active/.test(text)) return "In progress"; if (/block|hold|issue|missing|cancel/.test(text)) return "Blocked"; return "Ready"; }
function dateScore(record) { const raw = record?.created_at || record?.createdAt || record?.scheduled_date || record?.updated_at || record?.date || record?.__cached_at || ""; const parsed = Date.parse(raw); if (Number.isFinite(parsed)) return parsed; const cached = Number(record?.__cached_at || 0); return Number.isFinite(cached) ? cached : 0; }
function scheduleText(job) { const raw = job?.scheduled_date || job?.scheduled_at || job?.date || ""; if (!raw) return "Not scheduled"; const parsed = Date.parse(raw); if (!Number.isFinite(parsed)) return String(raw); return new Date(parsed).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
function moneyNumber(value) { const n = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : 0; }
function money(value) { return `$${Number(value || 0).toLocaleString("en-NZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

function normalizeJob(job, index) {
  const title = pick(job, "title", "job_name", "name", "service_type", "job_type", "description") || `Job ${index + 1}`;
  const client = pick(job, "client_name", "customer_name", "client", "customer", "name") || "No client linked";
  const worker = pick(job, "assigned_worker_name", "worker_name", "worker", "assigned_worker", "assigned_to") || "Unassigned";
  const status = statusLabel(job?.status || job?.job_status);
  const priceAmount = moneyNumber(job?.fixed_price ?? job?.price ?? job?.amount ?? job?.total);
  return { ...job, id: normalizeId(job?.id || job?._id || job?.job_id) || `job-${index}`, title, client, clientId: normalizeId(job?.client_id || job?.customer_id), workerId: normalizeId(job?.worker_id || job?.assigned_worker_id || job?.assigned_to), address: pick(job, "address", "site_address", "service_address", "job_address") || "No address", status, worker, scheduled: scheduleText(job), price: priceAmount > 0 ? money(priceAmount) : "No price saved", priceAmount, notes: pick(job, "worker_notes", "notes", "description", "job_notes") || "No notes yet", sortTime: dateScore(job) };
}

function recordClientName(record) { return lower(pick(record, "client_name", "customer_name", "client", "customer", "name", "business_name")); }
function recordJobId(record) { return normalizeId(record?.job_id || record?.linked_job_id || record?.source_job_id || record?.jobId || record?.job?.id || record?.job?._id || ""); }
function recordStatus(record, fallback = "draft") { return String(record?.status || record?.payment_status || fallback).trim() || fallback; }
function hasJobInvoiceMarker(job) { if (!job) return false; if (normalizeId(job.invoice_id || job.linked_invoice_id || job.invoice?.id || job.invoice?._id)) return true; if (pick(job, "invoice_number", "invoice_status", "invoice_generated_at")) return true; return job.invoice_ready === true || job.invoiced === true || job.invoice_created === true; }
function matchesJob(record, job) { if (!job || !record) return false; const recordJob = recordJobId(record); if (recordJob && recordJob === job.id) return true; const jobClient = lower(job.client); const jobTitle = lower(job.title); const jobAddress = lower(job.address); const recClient = recordClientName(record); const recText = lower(`${pick(record, "title", "job_title", "job_description", "description", "notes", "address", "site_address", "billing_address", "service_address")} ${recClient}`); if (jobClient && (recClient === jobClient || recText.includes(jobClient))) return true; if (jobTitle && jobTitle !== "job" && recText.includes(jobTitle)) return true; if (jobAddress && jobAddress !== "no address" && recText.includes(jobAddress)) return true; return false; }
function normalizeRelated(rows, selected) { return rows.filter((row) => matchesJob(row, selected)).sort((a, b) => dateScore(b) - dateScore(a)); }
function hasLinkedInvoice(job, invoices) { return hasJobInvoiceMarker(job) || normalizeRelated(invoices || [], job).length > 0; }
function needsInvoice(job, invoices) { return Boolean(job?.status === "Completed" && !hasLinkedInvoice(job, invoices)); }
function storyStepState({ selected, quotes, invoices }) { const hasQuote = quotes.length > 0; const hasInvoice = hasJobInvoiceMarker(selected) || invoices.length > 0; const paid = invoices.some((invoice) => /paid|complete|closed/i.test(recordStatus(invoice))); return [{ label: "Request", state: selected ? "done" : "open", detail: selected?.client || "No job" }, { label: "Quote", state: hasQuote ? "done" : "open", detail: hasQuote ? `${quotes.length} linked` : "No quote linked" }, { label: "Job", state: selected?.status === "Completed" ? "done" : "open", detail: selected?.status || "Not started" }, { label: "Invoice", state: hasInvoice ? "done" : "open", detail: hasInvoice ? `${Math.max(invoices.length, 1)} linked` : "Not invoiced" }, { label: "Paid", state: paid ? "done" : "open", detail: paid ? "Payment confirmed" : "Not paid" }]; }
function photoCount(job) { if (Array.isArray(job?.photos)) return job.photos.length; if (Array.isArray(job?.photo_urls)) return job.photo_urls.length; if (Array.isArray(job?.attachments)) return job.attachments.filter((item) => /image|photo/i.test(String(item?.type || item?.url || item))).length; return Number(job?.photo_count || job?.photos_count || 0) || 0; }
function jobFromTimerResponse(data) { return data?.job || data?.data?.job || data?.data || data || null; }
function jobFromCreateResponse(data) { return data?.job || data?.data?.job || data?.data || data; }

function parseJobModalPayload(raw) {
  let payload = raw || {};
  if (typeof raw === "string") {
    try { payload = JSON.parse(raw); }
    catch {
      const params = new URLSearchParams(raw.replace(/^\?/, ""));
      payload = { client_id: params.get("client_id") || "", client: params.get("client") || "", address: params.get("address") || "" };
    }
  }
  if (!payload || typeof payload !== "object") payload = {};
  if (payload.detail && typeof payload.detail === "object") payload = payload.detail;
  if (typeof payload.search === "string" && payload.search) {
    const params = new URLSearchParams(payload.search.replace(/^\?/, ""));
    payload = { ...payload, client_id: payload.client_id || params.get("client_id") || "", client: payload.client || params.get("client") || "", address: payload.address || params.get("address") || "" };
  }
  return {
    title: pick(payload, "title", "job_title", "job_name"),
    client: pick(payload, "client", "client_name", "customer_name", "name"),
    client_id: normalizeId(payload.client_id || payload.customer_id || payload.id || ""),
    address: pick(payload, "address", "site_address", "service_address", "customer_address"),
    scheduled: pick(payload, "scheduled", "scheduled_date", "date"),
    price: pick(payload, "price", "fixed_price", "amount"),
    notes: pick(payload, "notes", "client_notes", "job_notes"),
  };
}

function jobFormFromPayload(raw) {
  const draft = parseJobModalPayload(raw);
  return { ...EMPTY_JOB_FORM, ...draft };
}

const selectedFilterButtonStyle = { background: "#111827", backgroundColor: "#111827", borderColor: "#111827", color: "#ffffff", WebkitTextFillColor: "#ffffff" };
const selectedFilterTextStyle = { color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1 };
const selectedFilterCountStyle = { background: "#f97316", backgroundColor: "#f97316", color: "#ffffff", WebkitTextFillColor: "#ffffff", opacity: 1, borderRadius: "999px" };
const modalBackdropStyle = { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,.46)", display: "grid", placeItems: "center", padding: 14 };
const modalCardStyle = { width: "min(720px, 100%)", maxHeight: "92vh", overflow: "auto", borderRadius: 28 };
const modalGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const inputStyle = { width: "100%", minHeight: 44, borderRadius: 14, border: "1px solid rgba(15,23,42,.14)", padding: "11px 12px", fontWeight: 800 };

export default function FreshJobs({ onNavigate }) {
  const { get, post } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [story, setStory] = React.useState({ quotes: [], invoices: [], clients: [], workers: [] });
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [storyLoading, setStoryLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [actionBusy, setActionBusy] = React.useState("");
  const [actionMessage, setActionMessage] = React.useState("");
  const [jobModalOpen, setJobModalOpen] = React.useState(false);
  const [jobForm, setJobForm] = React.useState(EMPTY_JOB_FORM);
  const [savingJob, setSavingJob] = React.useState(false);

  const jobsNeedingInvoice = React.useMemo(() => jobs.filter((job) => needsInvoice(job, story.invoices)), [jobs, story.invoices]);
  const visibleJobs = filter === "All" ? jobs : filter === "Needs invoice" ? jobsNeedingInvoice : jobs.filter((job) => job.status === filter);
  const selected = jobs.find((job) => job.id === selectedId) || visibleJobs[0] || jobs[0];
  const canCreateInvoice = Boolean(selected?.priceAmount > 0);
  const selectedNeedsInvoice = needsInvoice(selected, story.invoices);
  const related = React.useMemo(() => ({ quotes: normalizeRelated(story.quotes, selected), invoices: normalizeRelated(story.invoices, selected), clients: story.clients.filter((client) => selected && (normalizeId(client.id || client._id) === selected.clientId || recordClientName(client) === lower(selected.client))), workers: story.workers.filter((worker) => selected && (normalizeId(worker.id || worker._id || worker.worker_id || worker.user_id) === selected.workerId || lower(pick(worker, "name", "full_name", "email")) === lower(selected.worker))) }), [story, selected]);
  const steps = React.useMemo(() => storyStepState({ selected, quotes: related.quotes, invoices: related.invoices }), [selected, related]);

  const patchLocalJob = React.useCallback((jobId, patch = {}) => {
    if (!jobId) return;
    setJobs((currentJobs) => currentJobs.map((job, index) => job.id !== jobId ? job : normalizeJob({ ...job, ...patch, id: job.id, _id: job._id || job.id }, index)));
    setSelectedId(jobId);
  }, []);

  const loadJobs = React.useCallback(async () => {
    setLoading(true); setError("");
    const res = await get("/jobs", { timeout: 25000 });
    if (!res.success) { setJobs([]); setSelectedId(""); setError(res.error || "Could not load jobs"); setLoading(false); return; }
    const nextJobs = hideDemoRecords(unpackList(res.data, "jobs")).map(normalizeJob).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setJobs(nextJobs); setSelectedId((current) => nextJobs.some((job) => job.id === current) ? current : nextJobs[0]?.id || ""); setLoading(false);
  }, [get]);

  const loadStory = React.useCallback(async () => {
    setStoryLoading(true);
    const next = { quotes: [], invoices: [], clients: [], workers: [] };
    await Promise.all(Object.entries(STORY_ENDPOINTS).map(async ([key, endpoint]) => { try { const res = await get(endpoint, { timeout: 25000 }); if (res?.success) { const rows = hideDemoRecords(unpackList(res.data, key)); next[key] = key === "invoices" ? mergeRecentInvoices(rows) : rows; } } catch {} }));
    if (!next.invoices.length) next.invoices = mergeRecentInvoices([]);
    setStory(next); setStoryLoading(false);
  }, [get]);

  React.useEffect(() => { loadJobs(); loadStory(); }, [loadJobs, loadStory]);
  React.useEffect(() => { const onFreshDataUpdated = () => { loadJobs(); loadStory(); }; window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated); return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated); }, [loadJobs, loadStory]);
  React.useEffect(() => { if (!visibleJobs.length) return; if (!selectedId || !visibleJobs.some((job) => job.id === selectedId)) setSelectedId(visibleJobs[0].id); }, [visibleJobs, selectedId]);
  React.useEffect(() => {
    function openFromExternal(event) { openJobModalFromPayload(event?.detail || null); }
    window.addEventListener("churvox:open-job-popup", openFromExternal);
    try { const stored = window.localStorage.getItem(OPEN_JOB_MODAL_KEY); if (stored) window.setTimeout(() => openJobModalFromPayload(stored), 50); } catch {}
    return () => window.removeEventListener("churvox:open-job-popup", openFromExternal);
  }, []);

  function openJobModalFromPayload(payload) { setJobForm(jobFormFromPayload(payload)); setActionMessage(""); setError(""); setJobModalOpen(true); try { window.localStorage.removeItem(OPEN_JOB_MODAL_KEY); } catch {} }
  function openBlankJob() { openJobModalFromPayload(null); }
  function updateJobForm(key, value) { setJobForm((current) => ({ ...current, [key]: value })); }

  async function saveJob(event) {
    event?.preventDefault?.();
    const title = String(jobForm.title || "").trim();
    const client = String(jobForm.client || "").trim();
    if (!title || !client) { setError("Job title and client/customer are required."); return; }
    setSavingJob(true); setError("");
    const priceAmount = moneyNumber(jobForm.price);
    const payload = { title, job_name: title, client_id: jobForm.client_id || null, customer_id: jobForm.client_id || null, client_name: client, customer_name: client, address: jobForm.address, site_address: jobForm.address, scheduled_date: jobForm.scheduled || null, notes: jobForm.notes, description: jobForm.notes || title, fixed_price: priceAmount, price: priceAmount, status: "Ready", source: "fresh_jobs_modal" };
    const optimistic = normalizeJob({ ...payload, id: `local-${Date.now()}`, created_at: new Date().toISOString() }, 0);
    setJobs((current) => [optimistic, ...current]); setSelectedId(optimistic.id); setJobModalOpen(false);
    const res = await post("/jobs", payload, { timeout: 25000 });
    if (!res.success) { setJobs((current) => current.filter((job) => job.id !== optimistic.id)); setError(res.error || "Could not save job."); setSavingJob(false); setJobModalOpen(true); return; }
    const saved = normalizeJob(jobFromCreateResponse(res.data) || payload, 0);
    setJobs((current) => [saved, ...current.filter((job) => job.id !== optimistic.id)]);
    setSelectedId(saved.id); setActionMessage("Job created."); setSavingJob(false); setJobForm(EMPTY_JOB_FORM);
    try { window.dispatchEvent(new Event("churvox:fresh-data-updated")); } catch {}
  }

  async function runJobAction(action) {
    if (!selected || actionBusy) return;
    const optimistic = TIMER_OPTIMISTIC[action] || {}; const previous = selected;
    setActionBusy(action); setActionMessage(""); setError(""); patchLocalJob(selected.id, optimistic);
    const res = await post(`/jobs/${selected.id}/timer/${action}`, { source: "fresh_jobs", action }, { timeout: 25000 });
    if (!res.success) { patchLocalJob(previous.id, previous); setActionMessage(res.error || `Could not ${action} this job.`); setError(res.error || `Could not ${action} this job.`); setActionBusy(""); return; }
    const updated = jobFromTimerResponse(res.data); if (updated) patchLocalJob(selected.id, updated);
    setActionMessage(action === "complete" ? "Job completed. Invoice can now be prepared." : `Timer ${action} saved.`); if (action === "complete") loadStory(); setActionBusy("");
  }

  function createInvoiceForSelected() {
    if (!selected || !canCreateInvoice) return;
    const jobForInvoice = { id: selected.id, job_id: selected.id, title: selected.title, client: selected.client, customer_name: selected.client, address: selected.address, price: selected.price, priceAmount: selected.priceAmount, scheduled: selected.scheduled, notes: selected.notes };
    try { const packed = JSON.stringify(jobForInvoice); window.localStorage.setItem("churvox:selected-job-for-invoice", packed); window.sessionStorage.setItem("churvox:selected-job-for-invoice", packed); window.__churvoxSelectedJobForInvoice = jobForInvoice; window.dispatchEvent(new CustomEvent("churvox:invoice-handoff", { detail: jobForInvoice })); } catch {}
    onNavigate?.("invoices");
  }

  function filterCount(item) { if (item === "All") return jobs.length; if (item === "Needs invoice") return jobsNeedingInvoice.length; return jobs.filter((job) => job.status === item).length; }
  const filterPillStyle = (active) => active ? selectedFilterButtonStyle : undefined;
  const filterTextStyle = (active) => active ? selectedFilterTextStyle : undefined;
  const filterCountStyle = (active) => active ? selectedFilterCountStyle : undefined;
  const timerDisabled = !selected || Boolean(actionBusy);

  return (
    <section className="freshJobsPage" data-jobs-needs-invoice="20260626" data-owner-timer-actions="20260626" data-create-job-modal="20260626" data-client-job-handoff="20260626">
      <header className="freshHero"><span>Jobs</span><h1>Jobs</h1><p>Job records with customer, worker, schedule, price, notes and linked quote/invoice history.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{jobs.length}</h2><p>Total jobs</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Ready").length}</h2><p>Ready</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Completed").length}</h2><p>Completed</p></aside><aside className="freshCard freshJobsNeedsInvoicePulse"><h2>{jobsNeedingInvoice.length}</h2><p>Needs invoice</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Jobs need attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={() => { loadJobs(); loadStory(); }}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filterPillStyle(filter === item)} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{filterCount(item)}</b></button>)}</section>

      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard"><h2>Job list</h2>{loading && jobs.length === 0 ? <div className="freshItem"><b>Loading jobs...</b><span>Checking saved job records.</span></div> : visibleJobs.map((job) => { const jobNeedsInvoice = needsInvoice(job, story.invoices); return <button type="button" className={`freshItem ${selected?.id === job.id ? "active" : ""} ${job.status === "Blocked" || jobNeedsInvoice ? "need" : ""} ${jobNeedsInvoice ? "freshJobNeedsInvoiceItem" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><b>{job.title}{jobNeedsInvoice ? <em className="freshJobNeedsInvoiceBadge">Needs invoice</em> : null}</b><span>{job.client} - {jobNeedsInvoice ? "Completed, not invoiced" : job.status} - {job.scheduled}</span></button>; })}{loading && jobs.length > 0 ? <div className="freshItem"><b>Refreshing jobs...</b><span>Showing current saved jobs while Churvox refreshes.</span></div> : null}{!loading && visibleJobs.length === 0 ? <div className="freshItem"><b>No jobs found</b><span>Create a job or clear the filter.</span></div> : null}</aside>

        <section className="freshCard freshJobsDetailCard">
          <div className="freshJobsDetailHeader"><div><small>Job record</small><h2>{selected?.title || "Select job"}</h2></div>{selected ? <span className={selectedNeedsInvoice ? "need" : selected.status === "Completed" ? "ready" : selected.status === "Blocked" ? "need" : ""}>{selectedNeedsInvoice ? "Needs invoice" : selected.status}</span> : null}</div>
          {selected ? (<>
            {selectedNeedsInvoice ? <section className="freshJobsInvoiceAlert"><strong>Completed job needs invoice</strong><p>This job is finished and no linked invoice was found. Create the invoice so Command can prepare the approval step.</p><button type="button" className="freshOrange" disabled={!canCreateInvoice} onClick={createInvoiceForSelected}>{canCreateInvoice ? "Create invoice from this job" : "Add price before invoice"}</button></section> : null}
            <div className="freshMiniGrid freshJobsMiniGrid"><div><span>Client</span><b>{selected.client}</b></div><div className={selectedNeedsInvoice ? "need" : ""}><span>Status</span><b>{selectedNeedsInvoice ? "Completed - needs invoice" : selected.status}</b></div><div><span>Worker</span><b>{selected.worker}</b></div><div className={canCreateInvoice ? "" : "need"}><span>Price</span><b>{selected.price}</b></div></div>
            <section className="freshActions freshJobsActionStack" style={{ marginTop: 12 }}><button className="freshPrimary" type="button" disabled={timerDisabled || selected.status === "In progress"} onClick={() => runJobAction("start")}>{actionBusy === "start" ? "Starting..." : "Start job"}</button><button className="freshGhost" type="button" disabled={timerDisabled || selected.status !== "In progress"} onClick={() => runJobAction("pause")}>{actionBusy === "pause" ? "Pausing..." : "Pause"}</button><button className="freshGhost" type="button" disabled={timerDisabled || selected.status !== "In progress"} onClick={() => runJobAction("resume")}>{actionBusy === "resume" ? "Resuming..." : "Resume"}</button><button className="freshOrange" type="button" disabled={timerDisabled || selected.status === "Completed"} onClick={() => runJobAction("complete")}>{actionBusy === "complete" ? "Completing..." : "Complete job"}</button></section>
            {actionMessage ? <div className="freshItem"><b>Job action</b><span>{actionMessage}</span></div> : null}
            <section className="freshStoryRail">{steps.map((step) => <article key={step.label} className={step.label === "Invoice" && selectedNeedsInvoice ? "need" : step.state}><b>{step.label}</b><span>{step.label === "Invoice" && selectedNeedsInvoice ? "Needs invoice" : step.detail}</span></article>)}</section>
            <section className="freshJobsDetailBox"><span>Address</span><b>{selected.address}</b></section><section className="freshJobsDetailBox"><span>Scheduled</span><b>{selected.scheduled}</b></section><section className="freshJobsDetailBox notes"><span>Job notes</span><p>{selected.notes}</p></section>
            <section className="freshStoryLinks"><article><b>{related.quotes.length}</b><span>linked quote{related.quotes.length === 1 ? "" : "s"}</span></article><article className={selectedNeedsInvoice ? "need" : ""}><b>{related.invoices.length}</b><span>{selectedNeedsInvoice ? "needs invoice" : `linked invoice${related.invoices.length === 1 ? "" : "s"}`}</span></article><article><b>{photoCount(selected)}</b><span>proof photo{photoCount(selected) === 1 ? "" : "s"}</span></article><article><b>{related.workers.length}</b><span>worker match</span></article></section>
            {storyLoading ? <div className="freshItem"><b>Refreshing job links...</b><span>Checking quotes, invoices, clients and workers.</span></div> : null}
          </>) : <div className="freshItem"><b>No job selected</b><span>When a job is saved, its details will show here.</span></div>}
        </section>

        <aside className="freshCard freshJobsActionsCard"><h2>Job actions</h2><div className="freshActions freshJobsActionStack"><button className="freshPrimary" type="button" onClick={openBlankJob}>Create job</button><button className={selectedNeedsInvoice ? "freshPrimary" : "freshOrange"} type="button" disabled={!canCreateInvoice} onClick={createInvoiceForSelected}>{selectedNeedsInvoice && canCreateInvoice ? "Create needed invoice" : canCreateInvoice ? "Create invoice" : "Add price before invoice"}</button><button className="freshGhost" type="button" disabled={!selected} onClick={() => onNavigate?.("portal")}>Open customer links</button><button className="freshGhost" type="button" onClick={() => { loadJobs(); loadStory(); }}>Refresh jobs</button></div></aside>
      </section>

      {jobModalOpen ? <div style={modalBackdropStyle} onMouseDown={(event) => { if (event.target === event.currentTarget && !savingJob) setJobModalOpen(false); }}><form className="freshCard" style={modalCardStyle} onSubmit={saveJob}><div className="freshJobsDetailHeader"><div><small>Create job</small><h2>New job</h2></div><button type="button" className="freshGhost" disabled={savingJob} onClick={() => setJobModalOpen(false)}>Close</button></div><div style={modalGridStyle}><label><span>Job title *</span><input style={inputStyle} value={jobForm.title} onChange={(event) => updateJobForm("title", event.target.value)} placeholder="Lawn mow, clean, repair..." /></label><label><span>Client/customer *</span><input style={inputStyle} value={jobForm.client} onChange={(event) => updateJobForm("client", event.target.value)} placeholder="Customer name" /></label><label><span>Address</span><input style={inputStyle} value={jobForm.address} onChange={(event) => updateJobForm("address", event.target.value)} placeholder="Job address" /></label><label><span>Scheduled</span><input style={inputStyle} type="datetime-local" value={jobForm.scheduled} onChange={(event) => updateJobForm("scheduled", event.target.value)} /></label><label><span>Price</span><input style={inputStyle} value={jobForm.price} onChange={(event) => updateJobForm("price", event.target.value)} placeholder="85" /></label><label><span>Notes</span><textarea style={{ ...inputStyle, minHeight: 92 }} value={jobForm.notes} onChange={(event) => updateJobForm("notes", event.target.value)} placeholder="Access notes, scope, reminders..." /></label></div><div className="freshActions" style={{ marginTop: 16 }}><button className="freshPrimary" type="submit" disabled={savingJob}>{savingJob ? "Saving..." : "Save job"}</button><button className="freshGhost" type="button" disabled={savingJob} onClick={() => setJobModalOpen(false)}>Cancel</button></div></form></div> : null}
    </section>
  );
}
