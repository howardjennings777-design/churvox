import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

function asArray(payload) {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  for (const key of ["jobs", "items", "records", "results", "data"]) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

function idOf(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return idOf(value.$oid || value.oid || value.id || value._id || value.job_id, fallback);
  return fallback;
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function jobTitle(job) {
  return pick(job, "title", "job_name", "service_type", "job_type", "description") || "Job brief";
}

function clientName(job) {
  return pick(job, "client_name", "customer_name", "client", "customer", "name") || "No client linked";
}

function workerName(job) {
  return pick(job, "assigned_worker_name", "worker_name", "worker", "assigned_worker", "assigned_to") || "Unassigned";
}

function scheduleText(job) {
  const date = String(pick(job, "scheduled_date", "date", "start", "due_date")).slice(0, 10);
  const time = pick(job, "scheduled_time", "time");
  return [date, time].filter(Boolean).join(" - ") || "No time set";
}

function notesOf(job) {
  return pick(job, "worker_instructions", "instructions", "worker_notes", "notes", "job_notes", "description");
}

function buildBrief(job, index) {
  const title = jobTitle(job);
  const notes = notesOf(job);
  const address = pick(job, "address", "site_address", "service_address", "job_address");
  const worker = workerName(job);

  return {
    id: idOf(job?.id || job?._id || job?.job_id, `brief-${index}`),
    worker,
    job: title,
    client: clientName(job),
    time: scheduleText(job),
    aiFound: notes ? `Job notes are ready: ${String(notes).slice(0, 160)}` : "No detailed worker notes are saved yet.",
    brief: notes ? String(notes) : `Complete ${title}. Check the site details, take completion photos, and message the owner if the scope changes.`,
    safety: address ? `Confirm access at ${address}. Check pets, gates, trip hazards and tools before starting.` : "Confirm access, check site hazards and message the owner if anything looks wrong.",
    customerMemory: pick(job, "customer_notes", "client_notes", "preferences") || "No customer preference saved yet.",
    page: "workercommand",
    source: "job",
  };
}

const emptyBrief = {
  id: "no-worker-briefs",
  worker: "No worker selected",
  job: "No worker briefs due",
  client: "Add or assign a job to create a worker brief.",
  time: "Up to date",
  aiFound: "No assigned jobs need a new worker brief right now.",
  brief: "Assign a job to a worker, then Churvox shows the job notes, safety checks and customer details here.",
  safety: "Worker safety notes appear here when a job is selected.",
  customerMemory: "Customer preferences appear here when saved on the job or client.",
  page: "jobs",
  source: "empty",
};

function sendBriefToCommand(item, briefText, onNavigate) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];

    const slip = {
      id: `worker-brief-${item.id}-${Date.now()}`,
      group: "Worker Brief",
      title: "Worker brief ready",
      info: `${item.worker} - ${item.job}`,
      urgency: "Medium",
      found: item.aiFound,
      prepared: briefText,
      why: "Clear worker instructions reduce mistakes, call-backs and owner typing.",
      owner: "Approve the brief, edit it, send it to the worker, or open the job.",
      area: "Worker Brief",
      page: "workerbrief",
      fromInbox: true,
      createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 50)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "worker-brief" } }));
  } catch {
    // Keep the page usable without local storage.
  }

  onNavigate?.("command");
}

export default function FreshWorkerBrief({ onNavigate }) {
  const { get } = useApi();
  const [briefs, setBriefs] = React.useState([emptyBrief]);
  const [selectedId, setSelectedId] = React.useState(emptyBrief.id);
  const [briefText, setBriefText] = React.useState(emptyBrief.brief);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const selected = briefs.find((item) => item.id === selectedId) || briefs[0] || emptyBrief;
  const realBriefs = briefs.filter((item) => item.source !== "empty");

  const loadBriefs = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await get("/jobs", { timeout: 25000 });
      if (!res?.success) throw new Error(res?.error || "Could not load jobs for worker briefs.");
      const rows = hideDemoRecords(asArray(res.data)).map(buildBrief);
      const next = rows.length ? rows : [emptyBrief];
      setBriefs(next);
      setSelectedId((current) => next.some((item) => item.id === current) ? current : next[0].id);
    } catch (err) {
      setBriefs([emptyBrief]);
      setSelectedId(emptyBrief.id);
      setError(err?.message || "Could not load worker briefs.");
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => { loadBriefs(); }, [loadBriefs]);
  React.useEffect(() => { setBriefText(selected.brief); }, [selected.id, selected.brief]);

  return (
    <section className="freshWorkerBriefPage">
      <div className="freshWorkerBriefHero">
        <div>
          <span>Worker Brief</span>
          <h1>Workers get clear instructions before they leave</h1>
          <p>Churvox turns saved job notes, customer details and safety checks into a worker brief the owner can approve.</p>
        </div>

        <div className="freshWorkerBriefStats">
          <div><b>{loading ? "..." : realBriefs.length}</b><small>job briefs</small></div>
          <div><b>Photos</b><small>requested</small></div>
          <div><b>Safety</b><small>checked</small></div>
          <div><b>Edit</b><small>owner control</small></div>
        </div>
      </div>

      {error ? <section className="freshCard freshItem need"><b>Worker briefs need attention</b><span>{error}</span><button type="button" className="freshPrimary" onClick={loadBriefs}>Retry</button></section> : null}

      <div className="freshWorkerBriefLayout">
        <aside className="freshWorkerBriefList">
          <header>
            <b>Worker briefs</b>
            <span>{realBriefs.length ? "Ready for owner approval" : "No briefs due"}</span>
          </header>

          {briefs.map((item) => (
            <button key={item.id} type="button" className={selected.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}>
              <b>{item.job}</b>
              <span>{item.worker}</span>
              <small>{item.client} - {item.time}</small>
            </button>
          ))}
        </aside>

        <article className="freshWorkerBriefDetail">
          <header>
            <span>{selected.worker}</span>
            <h2>{selected.job}</h2>
            <p>{selected.client} - {selected.time}</p>
          </header>

          <div className="freshWorkerBriefCards">
            <section><b>Churvox found</b><p>{selected.aiFound}</p></section>
            <section><b>Safety note</b><p>{selected.safety}</p></section>
            <section><b>Customer memory</b><p>{selected.customerMemory}</p></section>
          </div>

          <label className="freshWorkerBriefEditor">
            <span>Worker brief</span>
            <textarea value={briefText} onChange={(event) => setBriefText(event.target.value)} />
          </label>

          <div className="freshWorkerBriefButtons">
            <button type="button" disabled={selected.source === "empty"} onClick={() => sendBriefToCommand(selected, briefText, onNavigate)}>Send to Command</button>
            <button type="button" onClick={() => onNavigate?.(selected.page || "workercommand")}>Open Worker View</button>
            <button type="button" onClick={() => onNavigate?.("jobs")}>Open Jobs</button>
            <button type="button" onClick={loadBriefs}>Refresh</button>
          </div>
        </article>
      </div>
    </section>
  );
}
