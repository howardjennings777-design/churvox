import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshWorkerCommand.css";

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
function clockStatus(worker) { const direct = String(worker?.live_status || "").trim(); if (direct) return direct; const text = lower(worker?.clock_status || worker?.shift_status || worker?.status); if (text.includes("on job")) return "On job now"; if (text.includes("paused")) return "Paused"; if (text.includes("clocked_in") || text.includes("clocked in")) return "Clocked in"; if (text.includes("clocked_out") || text.includes("clocked out")) return "Clocked out"; return "Not clocked in"; }
function runningStatusText(value) { const text = lower(value).replaceAll(" ", "_"); return ["on_job", "on_job_now", "clocked_in", "in_progress", "paused", "started"].some((key) => text.includes(key)); }
function gpsLabel(worker) { return pick(worker, "last_gps_label", "gps_label", "gps_address", "address_label", "last_location_label"); }
function gpsCoords(worker) { const lat = pick(worker, "last_lat", "gps_lat", "latitude", "lat"); const lng = pick(worker, "last_lng", "gps_lng", "longitude", "lng"); if (!lat || !lng) return null; return `${lat}, ${lng}`; }
function lastLocation(worker) { return gpsLabel(worker) || gpsCoords(worker) || "No location yet"; }

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
  if (clockStatus(worker) === "Not clocked in" && todayJobs.length) alerts.push("Worker has jobs today but is not clocked in.");
  if (!gpsLabel(worker) && !gpsCoords(worker)) alerts.push("No location recorded yet.");
  if (todayJobs.some((job) => !isComplete(job) && !pick(job, "acknowledged_at", "worker_acknowledged_at"))) alerts.push("Some jobs may still need acknowledgement.");
  if (todayJobs.some((job) => isComplete(job) && !pick(job, "photos", "photo_urls", "proof_photos"))) alerts.push("Check completion photos for finished jobs.");
  return { assignedJobs, todayJobs, currentJob, currentJobSeconds, jobTimeSeconds, shiftSeconds, unallocatedSeconds, completedToday, remainingToday, alerts };
}

function JobRow({ job, compact = false }) {
  const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date");
  return <div className={`freshWorkerCommandJob ${compact ? "compact" : ""}`}><b>{jobTitle(job)}</b><span>{clientName(job)} · {jobAddress(job)}</span><small>{dayText(when)} · {timeText(when)} · {statusOf(job).replaceAll("_", " ")} · {hoursText(jobSeconds(job))}</small></div>;
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

  return <section className="freshWorkerCommandPage workerFieldDeck">
    <header className="freshWorkerFieldHero">
      <div><span>Worker field deck</span><h1>Workers</h1><p>The clean field view: who is working, what job they are on now, what is next, and what needs attention.</p></div>
      <div className="freshWorkerHeroStats"><div><b>{workers.length}</b><small>workers</small></div><div><b>{liveCount}</b><small>live now</small></div><div><b>{todayCount}</b><small>jobs today</small></div><div><b>{lastUpdated ? lastUpdated.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" }) : "—"}</b><small>{refreshing ? "updating" : "updated"}</small></div></div>
      <div className="freshWorkerLiveStrip"><b>{autoRefresh ? "Live updates on" : "Live updates paused"}</b><span>{refreshing ? "Updating now…" : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for first update"}</span><button type="button" onClick={() => setAutoRefresh((value) => !value)}>{autoRefresh ? "Pause" : "Resume"}</button><button type="button" onClick={() => load({ silent: true })}>Refresh</button></div>
    </header>

    {error ? <section className="freshCard freshItem need"><b>Worker view needs attention</b><span>{error}</span><button className="freshPrimary" type="button" onClick={load}>Retry</button></section> : null}

    <section className="freshWorkerFieldLayout">
      <aside className="freshWorkerRail">
        <div className="freshWorkerRailHead"><b>Team today</b><button type="button" onClick={() => onNavigate?.("team")}>Team</button></div>
        {loading && !workers.length ? <div className="freshItem"><b>Loading workers…</b><span>Checking team and live status.</span></div> : null}
        {!loading && !workers.length ? <div className="freshItem"><b>No workers yet</b><span>Add workers from Team.</span></div> : null}
        {workers.map((worker) => { const active = idOf(worker) === idOf(selected); const itemView = buildWorkerView(worker, jobs); const status = liveStatusFor(worker, itemView); return <button key={idOf(worker)} type="button" className={`freshWorkerRailItem ${active ? "active" : ""}`} onClick={() => setSelectedId(idOf(worker))}><span>{status}</span><b>{workerName(worker)}</b><small>{itemView.remainingToday} left · {itemView.completedToday} done · {workerEmail(worker) || "No email"}</small></button>; })}
      </aside>

      <main className="freshWorkerFieldMain">
        {selected && view ? <>
          <section className="freshWorkerNowPanel">
            <div className="freshWorkerNowLeft"><span>Today’s field deck</span><h2>{workerName(selected)}</h2><p>{workerEmail(selected) || "No email"} · {workerPhone(selected) || "No phone"}</p><div className="freshWorkerStatusLine"><b>{selectedLiveStatus}</b><small>{lastLocation(selected)}</small></div></div>
            <div className="freshWorkerNowJob"><span>Now</span><h3>{selectedCurrent.title || (view.currentJob ? jobTitle(view.currentJob) : "No active job")}</h3><p>{view.currentJob ? `${clientName(view.currentJob)} · ${jobAddress(view.currentJob)}` : selectedCurrent.status ? selectedCurrent.status.replaceAll("_", " ") : "Worker is not currently on a started job."}</p><div className="freshWorkerNowActions"><button type="button" onClick={() => onNavigate?.("jobs")}>Open jobs</button><button type="button" onClick={() => onNavigate?.("dispatch")}>Schedule</button><button type="button" onClick={() => onNavigate?.("time")}>Time</button></div></div>
          </section>

          <section className="freshWorkerFieldStats">
            <article><span>Clocked in</span><b>{hoursText(view.shiftSeconds)}</b><small>Shift time</small></article>
            <article><span>Job timer</span><b>{hoursText(view.currentJobSeconds || view.jobTimeSeconds)}</b><small>Current/total job time</small></article>
            <article><span>Not on job</span><b>{hoursText(view.unallocatedSeconds)}</b><small>Travel, setup, waiting, missed timer</small></article>
            <article><span>Today</span><b>{view.completedToday}/{view.todayJobs.length}</b><small>Jobs done</small></article>
          </section>

          <section className="freshWorkerFieldGrid">
            <article className="freshCard freshWorkerFocusCard"><h2>Current job</h2>{view.currentJob ? <JobRow job={view.currentJob} /> : <div className="freshItem"><b>No active job</b><span>Worker is not currently on a started job.</span></div>}<div className="freshWorkerMiniInfo"><div><span>Status</span><b>{clockStatus(selected)}</b></div><div><span>Latest update</span><b>{selectedLatestUpdate || "Waiting"}</b></div></div></article>
            <article className="freshCard"><h2>Next jobs</h2><div className="freshWorkerCommandJobs">{view.todayJobs.filter((job) => !isComplete(job) && job !== view.currentJob).slice(0, 4).map((job, index) => <JobRow key={idOf(job, index)} job={job} compact />)}{!view.todayJobs.filter((job) => !isComplete(job) && job !== view.currentJob).length ? <div className="freshItem"><b>No next jobs</b><span>Nothing else scheduled for today.</span></div> : null}</div></article>
            <article className="freshCard"><h2>Alerts</h2>{view.alerts.length ? view.alerts.map((alert) => <div key={alert} className="freshItem need"><b>Needs attention</b><span>{alert}</span></div>) : <div className="freshItem"><b>No major alerts</b><span>Nothing urgent showing for this worker.</span></div>}</article>
            <article className="freshCard"><h2>Owner controls</h2><div className="freshActions"><button className="freshPrimary" type="button" onClick={() => load({ silent: false })}>Refresh worker</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("payroll")}>Payroll</button><button className="freshGhost" type="button" onClick={() => onNavigate?.("team")}>Team</button></div></article>
          </section>

          <section className="freshCard"><h2>All assigned jobs</h2><div className="freshWorkerCommandJobs">{view.assignedJobs.length ? view.assignedJobs.map((job, index) => <JobRow key={idOf(job, index)} job={job} />) : <div className="freshItem"><b>No assigned jobs</b><span>No jobs are linked to this worker yet.</span></div>}</div></section>
        </> : <section className="freshCard"><h2>Select worker</h2><p className="freshMuted">Pick a worker to open the field deck.</p></section>}
      </main>
    </section>
  </section>;
}
