import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshJobsPolish.css";

const filters = ["All", "Ready", "In progress", "Blocked", "Completed"];

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


const selectedFilterButtonStyle = {
  background: "#111827",
  backgroundColor: "#111827",
  borderColor: "#111827",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
};

const selectedFilterTextStyle = {
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
};

const selectedFilterCountStyle = {
  background: "#f97316",
  backgroundColor: "#f97316",
  color: "#ffffff",
  WebkitTextFillColor: "#ffffff",
  opacity: 1,
  borderRadius: "999px",
};

export default function FreshJobs({ onNavigate }) {
  const { get } = useApi();
  const [jobs, setJobs] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [filter, setFilter] = React.useState("All");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const visibleJobs = filter === "All" ? jobs : jobs.filter((job) => job.status === filter);
  const selected = jobs.find((job) => job.id === selectedId) || visibleJobs[0] || jobs[0];

  const loadJobs = React.useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await get("/jobs", { timeout: 25000 });
    if (!res.success) { setJobs([]); setSelectedId(""); setError(res.error || "Could not load real jobs"); setLoading(false); return; }
    const nextJobs = hideDemoRecords(unpackList(res.data)).map(normalizeJob).sort((a, b) => b.sortTime - a.sortTime || String(b.id).localeCompare(String(a.id)));
    setJobs(nextJobs);
    setSelectedId((current) => nextJobs.some((job) => job.id === current) ? current : nextJobs[0]?.id || "");
    setLoading(false);
  }, [get]);

  React.useEffect(() => { loadJobs(); }, [loadJobs]);

  React.useEffect(() => {
    const onFreshDataUpdated = () => loadJobs();
    window.addEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
    const filterPillStyle = (active) => active ? {
    background: "#111827",
    borderColor: "#111827",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
  } : undefined;

  const filterTextStyle = (active) => active ? {
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  const filterCountStyle = (active) => active ? {
    background: "#f97316",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  return () => window.removeEventListener("churvox:fresh-data-updated", onFreshDataUpdated);
  }, [loadJobs]);

  React.useEffect(() => {
    if (!visibleJobs.length) return;
    if (!selectedId || !visibleJobs.some((job) => job.id === selectedId)) setSelectedId(visibleJobs[0].id);
  }, [visibleJobs, selectedId]);

  function openBlankJob() {
    window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: "" } }));
  }

  const filterPillStyle = (active) => active ? {
    background: "#111827",
    borderColor: "#111827",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
  } : undefined;

  const filterTextStyle = (active) => active ? {
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  const filterCountStyle = (active) => active ? {
    background: "#f97316",
    color: "#ffffff",
    WebkitTextFillColor: "#ffffff",
    opacity: 1,
  } : undefined;

  return (
    <section className="freshJobsPage">
      <header className="freshHero"><span>Churvox fresh · Jobs</span><h1>Jobs</h1><p>Real job records from your business account. New jobs should appear here after save.</p></header>
      <section className="freshCommandPulse"><aside className="freshCard"><h2>{jobs.length}</h2><p>Total jobs</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Ready").length}</h2><p>Ready</p></aside><aside className="freshCard"><h2>{jobs.filter((job) => job.status === "Blocked").length}</h2><p>Blocked</p></aside></section>
      {error ? <section className="freshCard freshItem need"><b>Could not load jobs</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadJobs}>Retry</button></section> : null}
      <section className="freshCommandFilterBar">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} style={filterPillStyle(filter === item)} onClick={() => setFilter(item)}><span style={filterTextStyle(filter === item)}>{item}</span><b style={filterCountStyle(filter === item)}>{item === "All" ? jobs.length : jobs.filter((job) => job.status === item).length}</b></button>)}</section>
      <section className="freshGrid">
        <aside className="freshCard freshJobsListCard"><h2>Job list</h2>{loading && jobs.length === 0 ? <div className="freshItem"><b>Loading real jobs…</b><span>Checking your business account.</span></div> : visibleJobs.map((job) => <button type="button" className={`freshItem ${selected?.id === job.id ? "active" : ""} ${job.status === "Blocked" ? "need" : ""}`} key={job.id} onClick={() => setSelectedId(job.id)}><b>{job.title}</b><span>{job.client} · {job.status} · {job.scheduled}</span></button>)}{loading && jobs.length > 0 ? <div className="freshItem"><b>Refreshing jobs…</b><span>Showing your current saved jobs while Churvox refreshes.</span></div> : null}{!loading && visibleJobs.length === 0 ? <div className="freshItem"><b>No jobs yet</b><span>Create your first real job to start the workflow.</span></div> : null}</aside>
        <section className="freshCard freshJobsDetailCard"><h2>{selected?.title || "Select job"}</h2>{selected ? <><div className="freshMiniGrid"><div><span>Client</span><b>{selected.client}</b></div><div><span>Status</span><b>{selected.status}</b></div><div><span>Worker</span><b>{selected.worker}</b></div><div><span>Price</span><b>{selected.price}</b></div></div><label className="freshField"><span>Address</span><input value={selected.address} readOnly /></label><label className="freshField"><span>Scheduled</span><input value={selected.scheduled} readOnly /></label><label className="freshField"><span>Job notes</span><textarea value={selected.notes} readOnly /></label><div className="freshItem need"><b>Command check</b><span>{selected.risk}</span></div></> : <div className="freshItem"><b>No job selected</b><span>Create a job to see the connected detail record.</span></div>}</section>
        <aside className="freshCard freshJobsActionsCard"><h2>Owner actions</h2><div className="freshActions"><button className="freshPrimary" type="button" onClick={openBlankJob}>New job</button><button className="freshPrimary" type="button" onClick={loadJobs}>Refresh jobs</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Send issue to Command</button></div></aside>
      </section>
    </section>
  );
}
