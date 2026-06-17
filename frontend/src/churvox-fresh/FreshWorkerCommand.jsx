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
  if (total > 0 && total < 60) return "<1m";
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

function secondsSince(date) {
  if (!date) return 0;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  return Number.isFinite(diff) ? Math.max(0, diff) : 0;
}

function runningStatusText(value) {
  const text = lower(value).replaceAll(" ", "_");
  return ["on_job", "on_job_now", "clocked_in", "in_progress", "paused", "started"].some((key) => text.includes(key));
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

function identityTokens(...values) {
  const out = new Set();

  const add = (value) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }

    if (typeof value === "object") {
      [
        value.id,
        value._id,
        value.$oid,
        value.oid,
        value.uuid,
        value.worker_id,
        value.user_id,
        value.team_member_id,
        value.assigned_worker_id,
        value.assigned_to,
        value.email,
        value.worker_email,
        value.assigned_worker_email,
        value.name,
        value.full_name,
        value.display_name,
        value.assigned_worker_name,
        value.worker_name,
      ].forEach(add);
      return;
    }

    const text = lower(value);
    if (text && text !== "[object object]") out.add(text);
  };

  values.forEach(add);
  return [...out].filter(Boolean);
}

function workerKeys(worker) {
  return identityTokens(
    idOf(worker),
    worker,
    pick(worker, "worker_id", "user_id", "team_member_id"),
    workerEmail(worker),
    workerName(worker)
  );
}

function jobKeys(job) {
  return identityTokens(
    pick(job, "assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId"),
    pick(job, "assigned_worker_email", "worker_email", "assigned_to_email"),
    pick(job, "assigned_worker_name", "worker_name", "assigned_to_name"),
    job?.assigned_worker,
    job?.worker,
    job?.assignedWorker,
    job?.assigned_to_worker,
    job?.team_member
  );
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
  const saved = seconds(
    job?.total_job_seconds ||
    job?.total_time_seconds ||
    job?.timer_total_seconds ||
    job?.job_seconds ||
    job?.total_seconds ||
    job?.total_time_on_site_seconds ||
    job?.time_seconds ||
    job?.duration_seconds ||
    job?.payroll_seconds
  );

  const entries = Array.isArray(job?.time_entries) ? job.time_entries : [];
  let total = 0;
  let start = null;

  entries.forEach((entry) => {
    const action = lower(entry?.action);
    const raw = entry?.timestamp || entry?.time || entry?.created_at;
    const date = raw ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) return;

    if (["start", "resume"].includes(action)) {
      start = date;
    }

    if (["pause", "stop", "complete", "finish"].includes(action) && start) {
      total += Math.max(0, Math.floor((date.getTime() - start.getTime()) / 1000));
      start = null;
    }
  });

  if (start && ["in_progress", "started"].includes(statusOf(job))) {
    total += secondsSince(start);
  }

  const timerStart = dateValue(job, "timer_started_at", "started_at");
  if (!total && ["in_progress", "started"].includes(statusOf(job)) && timerStart) {
    total = secondsSince(timerStart);
  }

  return Math.max(saved, total);
}

function latestJobActivity(job) {
  return pick(
    job,
    "completed_at",
    "timer_completed_at",
    "timer_paused_at",
    "timer_started_at",
    "started_at",
    "acknowledged_at",
    "worker_acknowledged_at",
    "updated_at",
    "modified_at"
  );
}

function liveStatusFor(worker, view) {
  if (view?.currentJob && isActive(view.currentJob)) return "On job now";
  if (view?.todayJobs?.some((job) => statusOf(job) === "paused")) return "Paused";
  if (clockStatus(worker) === "Clocked in" || view?.shiftSeconds > 0) return "Clocked in";
  if (view?.todayJobs?.length) return "Jobs assigned";
  return "Waiting";
}

function gpsLabel(worker) {
  return pick(worker, "last_gps_label", "gps_label", "gps_address", "address_label", "last_location_label");
}

function gpsCoords(worker) {
  const lat = pick(worker, "last_lat", "gps_lat", "latitude", "lat");
  const lng = pick(worker, "last_lng", "gps_lng", "longitude", "lng");
  if (!lat || !lng) return null;
  return { lat, lng, key: `${lat},${lng}` };
}

function lastGps(worker, gpsLabels = {}) {
  const label = gpsLabel(worker);
  if (label) return label;

  const coords = gpsCoords(worker);
  if (!coords) return "";

  return gpsLabels[coords.key] || `${coords.lat}, ${coords.lng}`;
}

async function reverseGpsLabel(lat, lng) {
  if (!lat || !lng) return "";
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4500);
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1&zoom=18`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    window.clearTimeout(timer);

    if (!res.ok) return "";
    const data = await res.json();
    const address = data?.address || {};
    const street = [address.house_number, address.road].filter(Boolean).join(" ");
    const suburb = address.suburb || address.neighbourhood || address.city_district || address.locality || "";
    const town = address.city || address.town || address.village || address.state_district || "";
    const parts = [street, suburb, town].filter(Boolean);
    return [...new Set(parts)].join(", ") || data?.display_name || "";
  } catch {
    return "";
  }
}

function clockStatus(worker) {
  const direct = String(worker?.live_status || "").trim();
  if (direct) return direct;

  const text = lower(worker?.clock_status || worker?.shift_status || worker?.status);
  if (text.includes("on job")) return "On job now";
  if (text.includes("paused")) return "Paused";
  if (text.includes("clocked_in") || text.includes("clocked in")) return "Clocked in";
  if (text.includes("clocked_out") || text.includes("clocked out")) return "Clocked out";
  return "Not clocked in";
}

function isLiveActiveWorker(worker) {
  const text = lower([
    worker?.live_status,
    worker?.clock_status,
    worker?.shift_status,
    worker?.current_job_title,
    worker?.current_job_status,
  ].filter(Boolean).join(" "));

  return (
    text.includes("on job") ||
    text.includes("paused") ||
    text.includes("clocked_in") ||
    text.includes("clocked in") ||
    Boolean(worker?.current_job_title)
  );
}

function liveWorkerScore(worker) {
  const text = lower([
    worker?.live_status,
    worker?.clock_status,
    worker?.shift_status,
    worker?.current_job_status,
  ].filter(Boolean).join(" "));

  if (text.includes("on job") || text.includes("in_progress")) return 100;
  if (text.includes("paused")) return 90;
  if (text.includes("clocked_in") || text.includes("clocked in")) return 80;
  if (worker?.current_job_title) return 70;
  if (Number(worker?.today_job_count || 0) > 0) return 40;
  if (Number(worker?.assigned_job_count || 0) > 0) return 30;
  return 0;
}

function sortLiveWorkers(list) {
  return [...(list || [])].sort((a, b) => {
    const score = liveWorkerScore(b) - liveWorkerScore(a);
    if (score !== 0) return score;
    return workerName(a).localeCompare(workerName(b));
  });
}

function preferredWorkerId(list, currentId = "") {
  const ordered = sortLiveWorkers(list);
  const current = ordered.find((worker) => idOf(worker) === currentId);

  // If current worker is not active and another worker is live, show the live worker first.
  const active = ordered.find(isLiveActiveWorker);
  if (active && (!current || !isLiveActiveWorker(current))) return idOf(active);

  if (current) return currentId;
  return idOf(active || ordered[0] || "");
}

function directCurrentJob(worker, view) {
  return {
    title: pick(worker, "current_job_title", "job_title") || (view?.currentJob ? jobTitle(view.currentJob) : ""),
    status: pick(worker, "current_job_status", "job_status") || (view?.currentJob ? statusOf(view.currentJob) : ""),
  };
}

function buildWorkerView(worker, jobs) {
  const assignedJobs = jobs.filter((job) => jobForWorker(job, worker));
  const todayJobs = assignedJobs.filter((job) => isToday(dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const currentJob = todayJobs.find(isActive) || assignedJobs.find(isActive) || todayJobs.find((job) => !isComplete(job)) || null;
  const directJobSeconds = seconds(worker?.job_time_seconds || worker?.total_job_seconds || worker?.current_job_seconds);
  const calculatedJobSeconds = assignedJobs.reduce((sum, job) => sum + jobSeconds(job), 0);
  const activeJobSeconds = currentJob ? jobSeconds(currentJob) : 0;
  const jobTimeSeconds = Math.max(directJobSeconds, calculatedJobSeconds, activeJobSeconds);

  const directShiftSeconds = seconds(worker?.shift_seconds || worker?.today_shift_seconds || worker?.total_shift_seconds);
  const shiftStart = dateValue(worker, "shift_started_at", "clock_in_time", "shift_start_time", "last_clock_in_at");
  const computedShiftSeconds = runningStatusText(clockStatus(worker)) && shiftStart ? secondsSince(shiftStart) : 0;
  const shiftSeconds = Math.max(directShiftSeconds, computedShiftSeconds);
  const unallocatedSeconds = Math.max(0, shiftSeconds - jobTimeSeconds);

  const alerts = [];
  if (clockStatus(worker) === "Not clocked in" && todayJobs.length) alerts.push("Worker has jobs today but is not clocked in.");
  if (!lastGps(worker)) alerts.push("No Last location location recorded yet.");
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
  const [refreshing, setRefreshing] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [error, setError] = React.useState("");
  const [gpsLabels, setGpsLabels] = React.useState({});

  const selected = workers.find((worker) => idOf(worker) === selectedId) || workers[0] || null;
  const view = selected ? buildWorkerView(selected, jobs) : null;
  const selectedLiveStatus = selected && view ? liveStatusFor(selected, view) : "Waiting";
  const selectedGpsText = selected ? lastGps(selected, gpsLabels) : "";
  const selectedCurrent = selected ? directCurrentJob(selected, view) : { title: "", status: "" };
  const selectedTodayCount = selected?.today_job_count !== undefined ? Number(selected.today_job_count || 0) : Number(view?.todayJobs?.length || 0);
  const selectedLatestUpdate = selected ? (pick(selected, "live_updated_at", "last_live_status_at", "last_gps_at", "updated_at") || (view?.currentJob ? latestJobActivity(view.currentJob) : "")) : "";

  const load = React.useCallback(async (options = {}) => {
    const silent = Boolean(options?.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const liveRes = await get(`/worker/live-status?ts=${Date.now()}`, {
        timeout: 25000,
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      const liveWorkers = liveRes?.data?.workers || liveRes?.data?.data?.workers || [];
      const liveJobs = liveRes?.data?.jobs || liveRes?.data?.data?.jobs || [];

      if (liveRes?.success && Array.isArray(liveWorkers)) {
        const orderedWorkers = sortLiveWorkers(liveWorkers);
        setWorkers(orderedWorkers);
        setJobs(Array.isArray(liveJobs) ? liveJobs : []);
        setSelectedId((current) => preferredWorkerId(orderedWorkers, current));
        setLastUpdated(new Date());
        return;
      }

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

      const orderedWorkers = sortLiveWorkers(nextWorkers);
      setWorkers(orderedWorkers);
      setJobs(nextJobs);
      setSelectedId((current) => preferredWorkerId(orderedWorkers, current));
      if (!nextWorkers.length && lastWorkerError) setError(lastWorkerError);
      setLastUpdated(new Date());
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const refresh = () => load({ silent: true });
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => window.removeEventListener("churvox:fresh-data-updated", refresh);
  }, [load]);

  React.useEffect(() => {
    if (!autoRefresh) return undefined;

    const refreshLiveWorkerView = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      load({ silent: true });
    };

    const timer = window.setInterval(refreshLiveWorkerView, 5000);
    window.addEventListener("focus", refreshLiveWorkerView);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshLiveWorkerView);
    };
  }, [autoRefresh, load]); // worker-command-auto-refresh

  React.useEffect(() => {
    const missing = workers
      .map((worker) => gpsCoords(worker))
      .filter((coords) => coords && !gpsLabels[coords.key])
      .slice(0, 6);

    if (!missing.length) return undefined;

    let cancelled = false;

    missing.forEach(async (coords) => {
      const label = await reverseGpsLabel(coords.lat, coords.lng);
      if (!label || cancelled) return;
      setGpsLabels((current) => current[coords.key] ? current : { ...current, [coords.key]: label });
    });

    return () => {
      cancelled = true;
    };
  }, [workers, gpsLabels]); // boss-worker-gps-reverse-labels

  return (
    <section className="freshWorkerCommandPage">
      <header className="freshHero freshWorkerCommandHero">
        <span>Worker Command</span>
        <h1>Live worker view</h1>
        <p>See what workers are doing now: clock status, job timer, Last location status, today’s work and alerts.</p>
        <div className="freshWorkerLiveStrip">
          <b>{autoRefresh ? "Live updates on" : "Live updates paused"}</b>
          <span>{refreshing ? "Updating now…" : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Waiting for first update"}</span>
          <button type="button" onClick={() => setAutoRefresh((value) => !value)}>{autoRefresh ? "Pause live" : "Resume live"}</button>
          <button type="button" onClick={() => load({ silent: true })}>Refresh now</button>
        </div>
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
                <span>{clockStatus(worker)} · {worker.today_job_count !== undefined ? Number(worker.today_job_count || 0) : itemView.todayJobs.length} jobs today</span>
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
                <div className="freshWorkerStatusPill">{selectedLiveStatus}</div>
              </section>

              <section className="freshWorkerCommandStats">
                <aside className="freshCard freshWorkerTimeCard">
                  <span>Paid day time</span>
                  <b>{hoursText(view.shiftSeconds)}</b>
                  <small>Worker clock-in time to now. This is paid time for the day.</small>
                </aside>

                <aside className="freshCard freshWorkerTimeCard">
                  <span>Job timer time</span>
                  <b>{hoursText(view.jobTimeSeconds)}</b>
                  <small>Time from job Start/Pause/Resume/Finish timers.</small>
                </aside>

                <aside className="freshCard freshWorkerTimeCard">
                  <span>Paid time not on jobs</span>
                  <b>{hoursText(view.unallocatedSeconds)}</b>
                  <small>Paid day time minus job timer time. Travel, setup, waiting, or missed timer.</small>
                </aside>

                <aside className="freshCard freshWorkerTimeCard">
                  <span>Last location</span>
                  <b>{selectedGpsText ? "Recorded" : "Waiting"}</b>
                  <small>{selectedGpsText || "Latest GPS street/suburb will show here."}</small>
                </aside>
              </section>

              <section className="freshWorkerCommandGrid">
                <article className="freshCard">
                  <h2>Live now</h2>
                  <div className="freshMiniGrid">
                    <div><span>Current job</span><b>{selectedCurrent.title || "No active job"}</b></div>
                    <div><span>Status</span><b>{clockStatus(selected)}</b></div>
                    <div><span>Last Last location</span><b>{selectedGpsText || "Not recorded"}</b></div>
                    <div><span>Jobs today</span><b>{selectedTodayCount}</b></div>
                    <div><span>Latest update</span><b>{selectedLatestUpdate || "Waiting"}</b></div>
                  </div>
                  {view.currentJob ? <JobRow job={view.currentJob} /> : selectedCurrent.title ? <div className="freshItem"><b>{selectedCurrent.title}</b><span>{selectedCurrent.status ? selectedCurrent.status.replaceAll("_", " ") : "Live worker update"}</span></div> : <div className="freshItem"><b>No active job</b><span>Worker is not currently on a started job.</span></div>}
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
