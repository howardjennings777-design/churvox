import React from "react";
import { useApi } from "../hooks/useApi";
import JobCreateForm from "../components/forms/JobCreateForm";
import "./freshJobsPolish.css";

const filters = ["All", "Ready", "In progress", "Blocked", "Completed"];
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";

function normalizeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") return normalizeId(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function unpackList(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.jobs)) return data.jobs;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.jobs)) return data.data.jobs;
  return [];
}

function statusLabel(value) {
  const text = String(value || "").trim().toLowerCase().replace(/[_-]+/g, " ");
  if (/complete|done|finished/.test(text)) return "Completed";
  if (/progress|started|active/.test(text)) return "In progress";
  if (/block|hold|issue|missing|cancel/.test(text)) return "Blocked";
  return "Ready";
}

function dateScore(job) {
  const raw = job?.created_at || job?.createdAt || job?.scheduled_date || job?.updated_at || "";
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function scheduleText(job) {
  const raw = job?.scheduled_date || job?.scheduled_at || job?.date || "";
  if (!raw) return "Not scheduled";
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return String(raw);
  return new Date(parsed).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function moneyText(job) {
  const raw = job?.fixed_price ?? job?.price ?? job?.amount ?? job?.total ?? "";
  const amount = Number(raw || 0);
  if (!Number.isFinite(amount) || amount <= 0) return "No price yet";
  return `$${amount.toFixed(amount % 1 ? 2 : 0)}`;
}

function normalizeJob(job, index) {
  const title = job?.title || job?.job_name || job?.name || `Job ${index + 1}`;
  const client = job?.client_name || job?.customer_name || job?.client || job?.customer || "No client linked";
  const worker = job?.assigned_worker_name || job?.worker_name || job?.worker || "Unassigned";
  const status = statusLabel(job?.status);
  return { ...job, id: normalizeId(job?.id || job?._id || job?.job_id) || `job-${index}`, title, client, address: job?.address || job?.site_address || job?.service_address || "No address", status, worker, scheduled: scheduleText(job), price: moneyText(job), notes: job?.notes || job?.description || "No notes yet", risk: status === "Blocked" ? "Needs owner review" : worker === "Unassigned" ? "Worker not assigned" : "Ready to dispatch", sortTime: dateScore(job) };
}

function createdId(payload) {
  const data = payload?.data ?? payload;
  const item = data?.job || data?.item || data?.record || data;
  return normalizeId(data?.id || data?._id || item?.id || item?._id || payload?.id || payload?._id || "");
}

export default function FreshJobs({ onNavigate }) {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  const visibleJobs = filter === "All" ? jobs : jobs.filter((job) => job.status === filter);
  const selected = jobs.find((job) => job.id === selectedId) || visibleJobs[0] || jobs[0];

  const loadJobs = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/jobs", { timeout: 25000 });
    if (!res.success) { setJobs([]); setSelectedId(""); setError(res.error || "Could not load real jobs"); setLoading(false); return; }
    const nextJobs = unpackList(res.data).map(normalizeJob).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setJobs(nextJobs);
    setSelectedId((current) => nextJobs.some((job) => job.id === current) ? current : nextJobs[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadJobs(); }, [loadJobs]);

  React.useEffect(() => {
    const onFreshDataUpdated = () => loadJobs();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadJobs]);

  React.useEffect(() => {
    function openJobPopup() { setCreateOpen(true); try { window.localStorage.removeItem(OPEN_JOB_MODAL_KEY); } catch {} }
    window.addEventListener("churvox:open-job-popup", openJobPopup);
    try {
      const saved = window.localStorage.getItem(OPEN_JOB_MODAL_KEY);
      if (saved) window.setTimeout(openJobPopup, 80);
    } catch {}
    return () => window.removeEventListener("churvox:open-job-popup", openJobPopup);
  }, []);

  React.useEffect(() => {
    if (!visibleJobs.length) return;
    if (!selectedId || !visibleJobs.some((job) => job.id === selectedId)) setSelectedId(visibleJobs[0].id);
  }, [visibleJobs, selectedId]);

  function handleJobCreated(payload) {
    const nextId = createdId(payload);
    setCreateOpen(false);
    if (nextId) setSelectedId(nextId);
    window.dispatchEvent(new Event("churvox:fresh-data-updated"));
    loadJobs();
  }

  return (
    <section className="freshJobsPage">
      <header className="freshHero"><span>Churvox fresh · Jobs</span><h1>Jobs</h1><p>Real job records from your business account. New jobs should appear here after save.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{jobs.length}</h2><p>Total jobs</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Ready").length}</h2><p>Ready</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Blocked").length}</h2><p>Blocked</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Could not load jobs</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadJobs}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}><span>{item}</span><b>{item === "All" ? jobs.length : jobs.filter((job) => job.status === item).length}</b></button>)}</section>
      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard"><h2>Job list</h2>{loading && jobs.length === 0 ? <div className="freshItem"><b>Loading real jobs…</b><span>Checking your business account.</span></div> : visibleJobs.map((job) => <button type="button" className={`freshItem ${selected?.id === job.id ? "active" : ""} ${job.status === "Blocked" ? "need" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><b>{job.title}</b><span>{job.client} · {job.status} · {job.scheduled}</span></button>)}{loading && jobs.length > 0 ? <div className="freshItem"><b>Refreshing jobs…</b><span>Showing your current saved jobs while Churvox refreshes.</span></div> : null}{!loading && visibleJobs.length === 0 ? <div className="freshItem"><b>No jobs yet</b><span>Create your first real job to start the workflow.</span></div> : null}</aside>
        <section className="freshCard freshJobsDetailCard"><h2>{selected?.title || "Select job"}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Client</span><b>{selected.client}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Worker</span><b>{selected.worker}</b></div><div><span>Price</span><b>{selected.price}</b></div></div><label className="freshField"><span>Address</span><input value={selected.address} readOnly /></label><label className="freshField"><span>Scheduled</span><input value={selected.scheduled} readOnly /></label><label className="freshField"><span>Job notes</span><textarea value={selected.notes} readOnly /></label><div className="freshItem need"><b>Command check</b><span>{selected.risk}</span></div></> : <div className="freshItem"><b>No job selected</b><span>Create a job to see the connected detail record.</span></div>}</section>
        <aside className="freshCard freshJobsActionsCard"><h2>Owner actions</h2><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => setCreateOpen(true)}>New job</button><button className="freshPrimary" type="button" onClick={loadJobs}>Refresh jobs</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Send issue to Command</button></div></aside>
      </section>
      {createOpen ? <div role="dialog" aria-modal="true" aria-label="Create new job" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.72)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: "18px" }} onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><section className="freshCard" style={{ width: "min(920px, 100%)", maxHeight: "92vh", overflow: "auto", padding: 0 }}><header style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "18px 20px", borderBottom: "1px solid rgba(148, 163, 184, 0.24)", background: "rgba(15, 23, 42, 0.96)" }}><div><span style={{ color: "#fb923c", fontWeight: 1000, textTransform: "uppercase", letterSpacing: ".14em", fontSize: 12 }}>New job</span><h2 style={{ margin: "4px 0 0" }}>Create job without leaving Jobs</h2></div><button className="freshGhost" type="button" onClick={() => setCreateOpen(false)}>Close</button></header><div style={{ padding: "18px 20px 0" }}><JobCreateForm onCancel={() => setCreateOpen(false)} onSuccess={handleJobCreated} submitLabel="Create job" /></div></section></div> : null}
    </section>
  );
}
