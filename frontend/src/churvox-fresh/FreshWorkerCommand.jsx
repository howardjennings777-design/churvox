import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshWorkerCommand.css";

const workerEndpoints = ["/team/workers", "/team", "/workers"];

function arr(value) {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.workers)) return data.workers;
  if (Array.isArray(data?.team)) return data.team;
  if (Array.isArray(data?.members)) return data.members;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.jobs)) return data.jobs;
  return [];
}

function idOf(value, fallback = "") {
  const raw = value?.id || value?._id || value?.worker_id || value?.user_id || value?.team_member_id || value?.job_id || fallback;
  if (raw && typeof raw === "object") return String(raw.$oid || raw.oid || raw.id || raw._id || fallback || "");
  return String(raw || fallback || "");
}

function lower(value) {
  return String(value || "").trim().toLowerCase();
}

function pick(record, ...keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function seconds(value) {
  const n = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function hoursText(totalSeconds) {
  const total = Math.round(seconds(totalSeconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (!h && !m) return "0m";
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
}

function dateValue(record, ...keys) {
  const raw = pick(record, ...keys);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isToday(date) {
  if (!date) return false;
  return date.toDateString() === new Date().toDateString();
}

function timeText(date) {
  if (!date) return "No time";
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

function dayText(date) {
  if (!date) return "No date";
  return date.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });
}

function workerName(worker) {
  return pick(worker, "name", "full_name", "display_name", "first_name", "email") || "Unnamed worker";
}

function workerEmail(worker) {
  return pick(worker, "email", "worker_email", "assigned_worker_email");
}

function workerPhone(worker) {
  return pick(worker, "phone", "mobile", "worker_phone");
}

function workerKeys(worker) {
  return [
    idOf(worker),
    pick(worker, "worker_id", "user_id", "team_member_id"),
    workerEmail(worker),
    workerName(worker),
  ].map((x) => lower(x)).filter(Boolean);
}

function jobKeys(job) {
  return [
    pick(job, "assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId"),
    pick(job, "assigned_worker_email", "worker_email", "assigned_to_email"),
    pick(job, "assigned_worker_name", "worker_name", "assigned_to_name", "worker"),
  ].map((x) => lower(x)).filter(Boolean);
}

function jobForWorker(job, worker) {
  const mine = workerKeys(worker);
  const assigned = jobKeys(job);
  if (!mine.length || !assigned.length) return false;
  return assigned.some((key) => mine.includes(key));
}

function jobTitle(job) {
  return pick(job, "title", "job_name", "job_title", "service_type", "job_type", "description") || "Untitled job";
}

function clientName(job) {
  return pick(job, "client_name", "customer_name", "client", "customer", "name") || "No client";
}

function jobAddress(job) {
  return pick(job, "address", "site_address", "service_address", "job_address") || "No address";
}

function statusOf(job) {
  return lower(job?.status || job?.job_status || "assigned").replaceAll(" ", "_");
}

function isComplete(job) {
  return ["completed", "complete", "done", "finished"].includes(statusOf(job));
}

function isActive(job) {
  return ["in_progress", "paused", "started"].includes(statusOf(job));
}

function jobSeconds(job) {
  return seconds(job?.total_job_seconds || job?.total_time_seconds || job?.timer_total_seconds || job?.job_seconds);
}

function lastGps(worker) {
  const lat = pick(worker, "last_lat", "gps_lat", "latitude", "lat");
  const lng = pick(worker, "last_lng", "gps_lng", "longitude", "lng");
  if (!lat || !lng) return "";
  return `${lat}, ${lng}`;
}

function clockStatus(worker) {
  const text = lower(worker?.clock_status || worker?.shift_status || worker?.status);
  if (text.includes("clocked_in") || text.includes("clocked in")) return "Clocked in";
  if (text.includes("on job") || text.includes("working")) return "On job";
  if (text.includes("clocked_out") || text.includes("clocked out")) return "Clocked out";
  return "Not clocked in";
}

function buildWorkerView(worker, jobs) {
  const assignedJobs = jobs.filter((job) => jobForWorker(job, worker));
  const todayJobs = assignedJobs.filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const currentJob = todayJobs.find(isActive) || assignedJobs.find(isActive) || todayJobs.find((job) => !isComplete(job)) || null;
  const jobTimeSeconds = todayJobs.reduce((sum, job) => sum + jobSeconds(job), 0);

  const shiftSeconds = seconds(worker?.shift_seconds || worker?.today_shift_seconds || worker?.total_shift_seconds);
  const unallocatedSeconds = Math.max(0, shiftSeconds - jobTimeSeconds);

  const alerts = [];
  if (clockStatus(worker) === "Not clocked in" && todayJobs.length) alerts.push("Worker has jobs today but is not clocked in.");
  if (!lastGps(worker)) alerts.push("No GPS location recorded yet.");
  if (todayJobs.some((job) => !isComplete(job) && !pick(job, "acknowledged_at", "worker_acknowledged_at"))) alerts.push("Some jobs may still need acknowledgement.");
  if (todayJobs.some((job) => isComplete(job) && !pick(job, "photos", "photo_urls", "proof_photos"))) alerts.push("Check completion photos for finished jobs.");

  return { assignedJobs, todayJobs, currentJob, jobTimeSeconds, shiftSeconds, unallocatedSeconds, alerts };
}

function JobRow({ job }) {
  const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date");
  return (
    <div className="freshWorkerCommandJob">
      <b>{jobTitle(job)}</b>
      <span>{clientName(job)} · {jobAddress(job)}</span>
      <small>{dayText(when)} · {timeText(when)} · {statusOf(job).replaceAll("_", " ")} · {hoursText(jobSeconds(job))}</small>
    </div>
  );
}

export default function FreshWorkerCommand({ onNavigate }) {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  const selected = workers.find((worker) => idOf(worker) === selectedId) || workers[0] || null;
  const view = selected ? buildWorkerView(selected, jobs) : null;

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");

    let nextWorkers = [];
    let lastWorkerError = "";

    for (const endpoint of workerEndpoints) {
      const res = await get(endpoint, { timeout: 25000 });
      if (res?.success) {
        nextWorkers = arr(res.data);
        break;
      }
      lastWorkerError = res?.error || res?.detail || lastWorkerError;
    }

    const jobRes = await get("/jobs", { timeout: 25000 });
    const nextJobs = jobRes?.success ? arr(jobRes.data) : [];

    setWorkers(nextWorkers);
    setJobs(nextJobs);
    setSelectedId((current) => nextWorkers.some((worker) => idOf(worker) === current) ? current : idOf(nextWorkers[0] || ""));
    if (!nextWorkers.length && lastWorkerError) setError(lastWorkerError);
    setLoading(false);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const refresh = () => load();
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => window.removeEventListener("churvox:fresh-data-updated", refresh);
  }, [load]);

  return (
    <section className="freshWorkerCommandPage">
      <header className="freshHero freshWorkerCommandHero">
        <span>Worker Command</span>
        <h1>Worker command view</h1>
        <p>Pick a worker and see clock status, job time, GPS status, today’s work, alerts and owner controls in one place.</p>
      </header>

      {error ? <section className="freshCard freshItem need"><b>Worker command needs attention</b><span>{error}</span><button className="freshPrimary" type="button" onClick={load}>Retry</button></section> : null}

      <section className="freshWorkerCommandLayout">
        <aside className="freshCard freshWorkerCommandList">
          <h2>Workers</h2>
          {loading && !workers.length ? <div className="freshItem"><b>Loading workers…</b><span>Checking team records.</span></div> : null}
          {!loading && !workers.length ? <div className="freshItem"><b>No workers yet</b><span>Add workers from Team.</span></div> : null}

          {workers.map((worker) => {
            const active = idOf(worker) === idOf(selected);
            const itemView = buildWorkerView(worker, jobs);
            return (
              <button key={idOf(worker)} type="button" className={`freshWorkerCommandWorker ${active ? "active" : ""}`} onClick={() => setSelectedId(idOf(worker))}>
                <b>{workerName(worker)}</b>
                <span>{clockStatus(worker)} · {itemView.todayJobs.length} jobs today</span>
                <small>{workerEmail(worker) || "No email"}</small>
              </button>
            );
          })}
        </aside>

        <main className="freshWorkerCommandMain">
          {selected && view ? (
            <>
              <section className="freshCard freshWorkerProfileTop">
                <div>
                  <span>Selected worker</span>
                  <h2>{workerName(selected)}</h2>
                  <p>{workerEmail(selected) || "No email"} · {workerPhone(selected) || "No phone"}</p>
                </div>
                <div className="freshWorkerStatusPill">{clockStatus(selected)}</div>
              </section>

              <section className="freshWorkerCommandStats">
                <aside className="freshCard"><span>Payroll time today</span><b>{hoursText(view.shiftSeconds)}</b><small>Clock in/out total</small></aside>
                <aside className="freshCard"><span>Job time today</span><b>{hoursText(view.jobTimeSeconds)}</b><small>Job timers only</small></aside>
                <aside className="freshCard"><span>Unallocated time</span><b>{hoursText(view.unallocatedSeconds)}</b><small>Paid time not on job timers</small></aside>
                <aside className="freshCard"><span>GPS</span><b>{lastGps(selected) ? "Recorded" : "Waiting"}</b><small>{lastGps(selected) || "No location yet"}</small></aside>
              </section>

              <section className="freshWorkerCommandGrid">
                <article className="freshCard">
                  <h2>Live now</h2>
                  <div className="freshMiniGrid">
                    <div><span>Current job</span><b>{view.currentJob ? jobTitle(view.currentJob) : "No active job"}</b></div>
                    <div><span>Status</span><b>{clockStatus(selected)}</b></div>
                    <div><span>Last GPS</span><b>{lastGps(selected) || "Not recorded"}</b></div>
                    <div><span>Jobs today</span><b>{view.todayJobs.length}</b></div>
                  </div>
                  {view.currentJob ? <JobRow job={view.currentJob} /> : <div className="freshItem"><b>No active job</b><span>Worker is not currently on a started job.</span></div>}
                </article>

                <article className="freshCard">
                  <h2>Today’s timeline</h2>
                  <div className="freshWorkerTimeline">
                    <div><b>Clock in</b><span>{pick(selected, "clock_in_time", "shift_start_time") || "Not clocked in"}</span></div>
                    {view.todayJobs.map((job, index) => <div key={`${idOf(job, index)}-timeline`}><b>{jobTitle(job)}</b><span>{timeText(dateValue(job, "scheduled_date", "date", "start", "start_time"))} · {statusOf(job).replaceAll("_", " ")} · {hoursText(jobSeconds(job))}</span></div>)}
                    <div><b>Clock out</b><span>{pick(selected, "clock_out_time", "shift_end_time") || "Not clocked out"}</span></div>
                  </div>
                </article>

                <article className="freshCard">
                  <h2>Alerts</h2>
                  {view.alerts.length ? view.alerts.map((alert) => <div key={alert} className="freshItem need"><b>Needs attention</b><span>{alert}</span></div>) : <div className="freshItem"><b>No major alerts</b><span>Nothing urgent showing for this worker.</span></div>}
                </article>

                <article className="freshCard">
                  <h2>Owner controls</h2>
                  <div className="freshActions">
                    <button className="freshPrimary" type="button" onClick={load}>Refresh worker</button>
                    <button className="freshOrange" type="button" onClick={() => onNavigate?.("jobs")}>Open jobs</button>
                    <button className="freshDark" type="button" onClick={() => onNavigate?.("dispatch")}>Open schedule</button>
                    <button className="freshGhost" type="button" onClick={() => onNavigate?.("time")}>Open time logs</button>
                    <button className="freshGhost" type="button" onClick={() => onNavigate?.("payroll")}>Open payroll</button>
                  </div>
                </article>
              </section>

              <section className="freshCard">
                <h2>Assigned jobs</h2>
                <div className="freshWorkerCommandJobs">
                  {view.assignedJobs.length ? view.assignedJobs.map((job, index) => <JobRow key={idOf(job, index)} job={job} />) : <div className="freshItem"><b>No assigned jobs</b><span>No jobs are linked to this worker yet.</span></div>}
                </div>
              </section>
            </>
          ) : (
            <section className="freshCard"><h2>Select worker</h2><p className="freshMuted">Pick a worker to open the command view.</p></section>
          )}
        </main>
      </section>
    </section>
  );
}
