import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshWorkerCommand.css";
import "./freshWorkerMobileApp.css";

const workerEndpoints = ["/team/workers", "/team", "/workers"];

function arr(value, key = "") {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const k of ["workers", "team", "members", "items", "records", "results", "jobs", "data"]) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
}

function lower(value) { return String(value || "").trim().toLowerCase(); }
function pick(record, ...keys) { for (const key of keys) { const value = record?.[key]; if (value !== undefined && value !== null && String(value).trim() !== "") return value; } return ""; }
function objectId(value, fallback = "") { if (!value) return fallback; if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || fallback || ""); return String(value || fallback || ""); }
function idOf(value, fallback = "") { return objectId(value?.id || value?._id || value?.worker_id || value?.user_id || value?.team_member_id || value?.job_id, fallback); }
function seconds(value) { const n = Number(String(value || 0).replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? Math.max(0, n) : 0; }
function hoursText(totalSeconds) { const total = Math.round(seconds(totalSeconds)); if (total > 0 && total < 60) return "<1m"; const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); if (!h && !m) return "0m"; if (!h) return `${m}m`; return `${h}h ${m}m`; }
function dateValue(record, ...keys) { const raw = pick(record, ...keys); const date = raw ? new Date(raw) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function secondsSince(date) { if (!date) return 0; const diff = Math.floor((Date.now() - date.getTime()) / 1000); return Number.isFinite(diff) ? Math.max(0, diff) : 0; }
function isToday(date) { return Boolean(date && date.toDateString() === new Date().toDateString()); }
function timeText(date) { if (!date) return "No time"; return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" }); }
function dayText(date) { if (!date) return "No date"; return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }); }
function workerName(worker) { return pick(worker, "name", "full_name", "display_name", "first_name", "email") || "Unnamed worker"; }
function workerEmail(worker) { return pick(worker, "email", "worker_email", "assigned_worker_email"); }
function workerPhone(worker) { return pick(worker, "phone", "mobile", "worker_phone"); }
function jobTitle(job) { return pick(job, "title", "job_name", "job_title", "service_type", "job_type", "description") || "Untitled job"; }
function clientName(job) { return pick(job, "client_name", "customer_name", "client", "customer", "name") || "No client"; }
function jobAddress(job) { return pick(job, "address", "site_address", "service_address", "job_address") || "No address"; }
function statusOf(job) { return lower(job?.status || job?.job_status || "assigned").replaceAll(" ", "_"); }
function isComplete(job) { return ["completed", "complete", "done", "finished"].includes(statusOf(job)); }
function isActive(job) { return ["in_progress", "paused", "started"].includes(statusOf(job)); }
function isAcknowledged(job) { return Boolean(pick(job, "acknowledged_at", "worker_acknowledged_at")) || ["acknowledged", "in_progress", "paused", "started", "completed"].includes(statusOf(job)); }
function clockStatus(worker) { const direct = String(worker?.live_status || "").trim(); if (direct) return direct; const text = lower(worker?.clock_status || worker?.shift_status || worker?.status); if (text.includes("on job")) return "On job now"; if (text.includes("paused")) return "Paused"; if (text.includes("clocked_in") || text.includes("clocked in")) return "Clocked in"; if (text.includes("clocked_out") || text.includes("clocked out")) return "Clocked out"; return "Not clocked in"; }
function runningStatusText(value) { const text = lower(value).replaceAll(" ", "_"); return ["on_job", "on_job_now", "clocked_in", "in_progress", "paused", "started"].some((key) => text.includes(key)); }
function gpsLabel(worker) { return pick(worker, "last_gps_label", "gps_label", "gps_address", "address_label", "last_location_label"); }
function gpsCoords(worker) { const lat = pick(worker, "last_lat", "gps_lat", "latitude", "lat"); const lng = pick(worker, "last_lng", "gps_lng", "longitude", "lng"); if (!lat || !lng) return null; return `${lat}, ${lng}`; }
function lastLocation(worker) { return gpsLabel(worker) || gpsCoords(worker) || "No location yet"; }
function actionText(job) { const status = statusOf(job); if (!isAcknowledged(job)) return "Acknowledge"; if (["assigned", "scheduled", "acknowledged"].includes(status)) return "Start job"; if (["in_progress", "started"].includes(status)) return "Pause / complete"; if (status === "paused") return "Resume job"; if (isComplete(job)) return "Completed"; return "Open job"; }
function proofText(job) { const hasPhotos = Boolean(pick(job, "photos", "photo_urls", "proof_photos")); const hasNotes = Boolean(pick(job, "worker_notes", "completion_notes", "notes")); if (isComplete(job) && hasPhotos) return "Photo proof added"; if (isComplete(job)) return "Complete — photo check"; if (hasNotes) return "Notes added"; return "No proof yet"; }

function identityTokens(...values) {
  const out = new Set();
  const add = (value) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) return value.forEach(add);
    if (typeof value === "object") return [value.id, value._id, value.$oid, value.oid, value.worker_id, value.user_id, value.team_member_id, value.assigned_worker_id, value.assigned_to, value.email, value.worker_email, value.assigned_worker_email, value.name, value.full_name, value.display_name, value.assigned_worker_name, value.worker_name].forEach(add);
    const text = lower(value);
    if (text && text !== "[object object]") out.add(text);
  };
  values.forEach(add);
  return [...out].filter(Boolean);
}
function workerKeys(worker) { return identityTokens(idOf(worker), worker, pick(worker, "worker_id", "user_id", "team_member_id"), workerEmail(worker), workerName(worker)); }
function jobKeys(job) { return identityTokens(pick(job, "assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId"), pick(job, "assigned_worker_email", "worker_email", "assigned_to_email"), pick(job, "assigned_worker_name", "worker_name", "assigned_to_name"), job?.assigned_worker, job?.worker, job?.assignedWorker, job?.assigned_to_worker, job?.team_member); }
function jobForWorker(job, worker) { const mine = workerKeys(worker); const assigned = jobKeys(job); return Boolean(mine.length && assigned.length && assigned.some((key) => mine.includes(key))); }

function jobSeconds(job) {
  const saved = seconds(job?.total_job_seconds || job?.total_time_seconds || job?.timer_total_seconds || job?.job_seconds || job?.total_seconds || job?.total_time_on_site_seconds || job?.time_seconds || job?.duration_seconds || job?.payroll_seconds);
  const entries = Array.isArray(job?.time_entries) ? job.time_entries : [];
  let total = 0;
  let start = null;
  entries.forEach((entry) => {
    const action = lower(entry?.action);
    const date = dateValue(entry, "timestamp", "time", "created_at");
    if (!date) return;
    if (["start", "resume"].includes(action)) start = date;
    if (["pause", "stop", "complete", "finish"].includes(action) && start) { total += Math.max(0, Math.floor((date.getTime() - start.getTime()) / 1000)); start = null; }
  });
  if (start && ["in_progress", "started"].includes(statusOf(job))) total += secondsSince(start);
  const timerStart = dateValue(job, "timer_started_at", "started_at");
  if (!total && ["in_progress", "started"].includes(statusOf(job)) && timerStart) total = secondsSince(timerStart);
  return Math.max(saved, total);
}

function latestJobActivity(job) { return pick(job, "completed_at", "timer_completed_at", "timer_paused_at", "timer_started_at", "started_at", "acknowledged_at", "worker_acknowledged_at", "updated_at", "modified_at"); }
function isLiveActiveWorker(worker) { const text = lower([worker?.live_status, worker?.clock_status, worker?.shift_status, worker?.current_job_title, worker?.current_job_status].filter(Boolean).join(" ")); return text.includes("on job") || text.includes("paused") || text.includes("clocked_in") || text.includes("clocked in") || Boolean(worker?.current_job_title); }
function liveWorkerScore(worker) { const text = lower([worker?.live_status, worker?.clock_status, worker?.shift_status, worker?.current_job_status].filter(Boolean).join(" ")); if (text.includes("on job") || text.includes("in_progress")) return 100; if (text.includes("paused")) return 90; if (text.includes("clocked_in") || text.includes("clocked in")) return 80; if (worker?.current_job_title) return 70; if (Number(worker?.today_job_count || 0) > 0) return 40; if (Number(worker?.assigned_job_count || 0) > 0) return 30; return 0; }
function sortLiveWorkers(list) { return [...(list || [])].sort((a, b) => { const score = liveWorkerScore(b) - liveWorkerScore(a); return score || workerName(a).localeCompare(workerName(b)); }); }
function preferredWorkerId(list, currentId = "") { const ordered = sortLiveWorkers(list); const current = ordered.find((worker) => idOf(worker) === currentId); const active = ordered.find(isLiveActiveWorker); if (active && (!current || !isLiveActiveWorker(current))) return idOf(active); if (current) return currentId; return idOf(active || ordered[0] || ""); }
function directCurrentJob(worker, view) { return { title: pick(worker, "current_job_title", "job_title") || (view?.currentJob ? jobTitle(view.currentJob) : ""), status: pick(worker, "current_job_status", "job_status") || (view?.currentJob ? statusOf(view.currentJob) : "") }; }
function liveStatusFor(worker, view) { if (view?.currentJob && isActive(view.currentJob)) return "On job now"; if (view?.todayJobs?.some((job) => statusOf(job) === "paused")) return "Paused"; if (clockStatus(worker) === "Clocked in" || view?.shiftSeconds > 0) return "Clocked in"; if (view?.todayJobs?.length) return "Jobs assigned"; return "Waiting"; }

function buildWorkerView(worker, jobs) {
  const assignedJobs = jobs.filter((job) => jobForWorker(job, worker));
  const todayJobs = assignedJobs.filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const currentJob = todayJobs.find(isActive) || assignedJobs.find(isActive) || todayJobs.find((job) => !isComplete(job)) || null;
  const currentJobSeconds = currentJob ? jobSeconds(currentJob) : 0;
  const jobTimeSeconds = Math.max(seconds(worker?.job_time_seconds || worker?.total_job_seconds || worker?.current_job_seconds), assignedJobs.reduce((sum, job) => sum + jobSeconds(job), 0), currentJobSeconds);
  const shiftStart = dateValue(worker, "shift_started_at", "clock_in_time", "shift_start_time", "last_clock_in_at");
  const shiftSeconds = Math.max(seconds(worker?.shift_seconds || worker?.today_shift_seconds || worker?.total_shift_seconds), runningStatusText(clockStatus(worker)) && shiftStart ? secondsSince(shiftStart) : 0);
  const unallocatedSeconds = Math.max(0, shiftSeconds - jobTimeSeconds);
  const completedToday = todayJobs.filter(isComplete).length;
  const remainingToday = todayJobs.filter((job) => !isComplete(job)).length;
  const alerts = [];
  if (clockStatus(worker) === "Not clocked in" && todayJobs.length) alerts.push("Jobs assigned but not clocked in yet.");
  if (!gpsLabel(worker) && !gpsCoords(worker)) alerts.push("No location recorded yet.");
  if (todayJobs.some((job) => !isComplete(job) && !pick(job, "acknowledged_at", "worker_acknowledged_at"))) alerts.push("One or more jobs still need acknowledgement.");
  if (todayJobs.some((job) => isComplete(job) && !pick(job, "photos", "photo_urls", "proof_photos"))) alerts.push("Finished jobs may need completion photos.");
  return { assignedJobs, todayJobs, currentJob, currentJobSeconds, jobTimeSeconds, shiftSeconds, unallocatedSeconds, completedToday, remainingToday, alerts };
}

function WorkerJobCard({ job, compact = false }) {
  const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date");
  return <article className={`freshWorkerAppJob ${compact ? "compact" : ""}`}>
    <div className="freshWorkerAppJobTop"><span>{statusOf(job).replaceAll("_", " ")}</span><small>{timeText(when)}</small></div>
    <b>{jobTitle(job)}</b>
    <p>{clientName(job)}</p>
    <small>{jobAddress(job)}</small>
    <div className="freshWorkerAppJobMeta"><em>{dayText(when)}</em><em>{hoursText(jobSeconds(job))}</em><em>{proofText(job)}</em></div>
    <button type="button">{actionText(job)}</button>
  </article>;
}

export default function FreshWorkerCommand({ onNavigate }) {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [error, setError] = React.useState("");

  const selected = workers.find((worker) => idOf(worker) === selectedId) || workers[0] || null;
  const view = selected ? buildWorkerView(selected, jobs) : null;
  const selectedLiveStatus = selected && view ? liveStatusFor(selected, view) : "Waiting";
  const selectedCurrent = selected ? directCurrentJob(selected, view) : { title: "", status: "" };
  const selectedLatestUpdate = selected ? (pick(selected, "live_updated_at", "last_live_status_at", "last_gps_at", "updated_at") || (view?.currentJob ? latestJobActivity(view.currentJob) : "")) : "";
  const liveCount = workers.filter(isLiveActiveWorker).length;
  const todayCount = workers.reduce((sum, worker) => sum + Number(worker?.today_job_count ?? buildWorkerView(worker, jobs).todayJobs.length ?? 0), 0);

  const load = React.useCallback(async (options = {}) => {
    const silent = Boolean(options?.silent);
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const liveRes = await get(`/worker/live-status?ts=${Date.now()}`, { timeout: 25000, headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } });
      const liveWorkers = liveRes?.data?.workers || liveRes?.data?.data?.workers || [];
      const liveJobs = liveRes?.data?.jobs || liveRes?.data?.data?.jobs || [];
      if (liveRes?.success && Array.isArray(liveWorkers)) {
        const ordered = sortLiveWorkers(liveWorkers);
        setWorkers(ordered); setJobs(Array.isArray(liveJobs) ? liveJobs : []); setSelectedId((current) => preferredWorkerId(ordered, current)); setLastUpdated(new Date()); return;
      }
      let nextWorkers = [];
      let lastWorkerError = "";
      for (const endpoint of workerEndpoints) {
        const res = await get(endpoint, { timeout: 25000 });
        if (res?.success) { nextWorkers = arr(res.data); break; }
        lastWorkerError = res?.error || res?.detail || lastWorkerError;
      }
      const jobRes = await get("/jobs", { timeout: 25000 });
      const nextJobs = jobRes?.success ? arr(jobRes.data) : [];
      const ordered = sortLiveWorkers(nextWorkers);
      setWorkers(ordered); setJobs(nextJobs); setSelectedId((current) => preferredWorkerId(ordered, current)); if (!nextWorkers.length && lastWorkerError) setError(lastWorkerError); setLastUpdated(new Date());
    } finally { if (!silent) setLoading(false); setRefreshing(false); }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { const refresh = () => load({ silent: true }); window.addEventListener("churvox:fresh-data-updated", refresh); return () => window.removeEventListener("churvox:fresh-data-updated", refresh); }, [load]);
  React.useEffect(() => { if (!autoRefresh) return undefined; const refreshLiveWorkerView = () => { if (typeof document !== "undefined" && document.visibilityState !== "visible") return; load({ silent: true }); }; const timer = window.setInterval(refreshLiveWorkerView, 8000); window.addEventListener("focus", refreshLiveWorkerView); return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshLiveWorkerView); }; }, [autoRefresh, load]);

  return <section className="freshWorkerCommandPage workerFieldDeck freshWorkerAppView">
    <header className="freshWorkerAppHero">
      <div><span>Worker app</span><h1>My Day</h1><p>{selected ? `${workerName(selected)} · ${selectedLiveStatus}` : "Job-first field view for workers."}</p></div>
      <div className="freshWorkerAppSummary"><div><b>{view?.todayJobs?.length || 0}</b><small>today</small></div><div><b>{view?.remainingToday || 0}</b><small>left</small></div><div><b>{liveCount}</b><small>live</small></div></div>
    </header>

    <nav className="freshWorkerAppTabs" aria-label="Worker app sections"><button className="active" type="button">Today</button><button type="button">Jobs</button><button type="button" onClick={() => onNavigate?.("messages")}>Messages</button><button type="button">More</button></nav>

    {error ? <section className="freshCard freshItem need"><b>Worker view needs attention</b><span>{error}</span><button className="freshPrimary" type="button" onClick={load}>Retry</button></section> : null}

    <section className="freshWorkerAppLayout">
      <aside className="freshWorkerAppPeople">
        <div className="freshWorkerAppPeopleHead"><b>Workers</b><button type="button" onClick={() => load({ silent: true })}>{refreshing ? "Updating" : "Refresh"}</button></div>
        {loading && !workers.length ? <div className="freshItem"><b>Loading workers…</b><span>Checking today’s jobs.</span></div> : null}
        {!loading && !workers.length ? <div className="freshItem"><b>No workers yet</b><span>Add workers from Team.</span></div> : null}
        {workers.map((worker) => { const itemView = buildWorkerView(worker, jobs); const active = idOf(worker) === idOf(selected); return <button key={idOf(worker)} type="button" className={active ? "active" : ""} onClick={() => setSelectedId(idOf(worker))}><span>{liveStatusFor(worker, itemView)}</span><b>{workerName(worker)}</b><small>{itemView.remainingToday} left · {itemView.completedToday} done</small></button>; })}
      </aside>

      <main className="freshWorkerAppMain">
        {selected && view ? <>
          <section className="freshWorkerAppNext">
            <div><span>Next job</span><h2>{view.currentJob ? jobTitle(view.currentJob) : "No active job"}</h2><p>{view.currentJob ? `${clientName(view.currentJob)} · ${jobAddress(view.currentJob)}` : "Nothing is started right now."}</p><small>{lastLocation(selected)}</small></div>
            <button type="button" onClick={() => onNavigate?.("jobs")}>{view.currentJob ? actionText(view.currentJob) : "Open jobs"}</button>
          </section>

          <section className="freshWorkerAppStats">
            <article><span>Shift</span><b>{hoursText(view.shiftSeconds)}</b></article>
            <article><span>Job time</span><b>{hoursText(view.currentJobSeconds || view.jobTimeSeconds)}</b></article>
            <article><span>Done</span><b>{view.completedToday}/{view.todayJobs.length}</b></article>
          </section>

          <section className="freshWorkerAppGrid">
            <article className="freshWorkerAppPanel"><h2>Today’s jobs</h2><div className="freshWorkerAppJobs">{view.todayJobs.length ? view.todayJobs.map((job, index) => <WorkerJobCard key={idOf(job, index)} job={job} compact />) : <div className="freshItem"><b>No jobs today</b><span>Nothing assigned for today.</span></div>}</div></article>
            <article className="freshWorkerAppPanel"><h2>Needs action</h2>{view.alerts.length ? view.alerts.map((alert) => <div key={alert} className="freshItem need"><b>Check this</b><span>{alert}</span></div>) : <div className="freshItem"><b>No urgent actions</b><span>The worker can carry on with the day.</span></div>}<div className="freshWorkerAppProof"><b>Proof flow</b><span>Photo · note · complete</span></div></article>
            <article className="freshWorkerAppPanel"><h2>Messages</h2><div className="freshItem"><b>Job notes and updates</b><span>Workers should only see messages linked to their work.</span></div><button type="button" onClick={() => onNavigate?.("messages")}>Open messages</button></article>
            <article className="freshWorkerAppPanel"><h2>More</h2><div className="freshWorkerAppMore"><button type="button" onClick={() => onNavigate?.("photos")}>Photos</button><button type="button" onClick={() => onNavigate?.("time")}>Time</button><button type="button" onClick={() => onNavigate?.("support")}>Support</button></div></article>
          </section>

          <section className="freshWorkerAppPanel"><h2>All assigned jobs</h2><div className="freshWorkerAppJobs">{view.assignedJobs.length ? view.assignedJobs.map((job, index) => <WorkerJobCard key={idOf(job, index)} job={job} />) : <div className="freshItem"><b>No assigned jobs</b><span>No jobs are linked to this worker yet.</span></div>}</div></section>
        </> : <section className="freshCard"><h2>Select worker</h2><p className="freshMuted">Pick a worker to open the field app view.</p></section>}
      </main>
    </section>
  </section>;
}
