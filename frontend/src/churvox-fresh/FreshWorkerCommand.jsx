import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
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
function gpsPoint(worker) {
  const lat = pick(worker, "last_lat", "gps_lat", "latitude", "lat", "lastLatitude", "last_latitude");
  const lng = pick(worker, "last_lng", "gps_lng", "longitude", "lng", "lastLongitude", "last_longitude");
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  return { lat: latNum, lng: lngNum };
}
function gpsCoords(worker) { const point = gpsPoint(worker); if (!point) return null; return `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`; }
function lastLocation(worker) { return gpsLabel(worker) || gpsCoords(worker) || "No location yet"; }
function gpsUpdatedAt(worker) { return pick(worker, "last_gps_at", "gps_updated_at", "last_location_at", "location_updated_at", "live_updated_at", "last_live_status_at", "updated_at"); }
function gpsAccuracy(worker) { const raw = pick(worker, "gps_accuracy", "location_accuracy", "accuracy", "last_gps_accuracy"); return raw ? `${raw}m accuracy` : "Accuracy not sent"; }
function mapsSearchUrl(worker) { const point = gpsPoint(worker); if (!point) return ""; return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`; }
function mapsEmbedUrl(worker) { const point = gpsPoint(worker); if (!point) return ""; return `https://maps.google.com/maps?q=${point.lat},${point.lng}&z=17&output=embed`; }
function jobSiteMapUrl(job) {
  const lat = Number(pick(job, "site_lat", "job_lat", "latitude", "lat"));
  const lng = Number(pick(job, "site_lng", "job_lng", "longitude", "lng"));
  if (Number.isFinite(lat) && Number.isFinite(lng)) return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const address = jobAddress(job);
  return address && address !== "No address" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
}
function actionText(job) { const status = statusOf(job); if (!isAcknowledged(job)) return "Acknowledge"; if (["assigned", "scheduled", "acknowledged"].includes(status)) return "Start job"; if (["in_progress", "started"].includes(status)) return "Pause / complete"; if (status === "paused") return "Resume job"; if (isComplete(job)) return "Completed"; return "Open job"; }
function proofText(job) { const hasPhotos = Boolean(pick(job, "photos", "photo_urls", "proof_photos")); const hasNotes = Boolean(pick(job, "worker_notes", "completion_notes", "notes")); if (isComplete(job) && hasPhotos) return "Photo proof added"; if (isComplete(job)) return "Complete — photo check"; if (hasNotes) return "Notes added"; return "No proof yet"; }

function photosForJob(job) {
  const raw = job?.photos || job?.photo_urls || job?.proof_photos || job?.completion_photos || job?.images || [];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((photo) => {
      if (typeof photo === "string") return photo;
      return pick(photo, "url", "src", "secure_url", "download_url", "thumbnail", "thumb");
    })
    .filter(Boolean);
}

function photoProofsFromJobs(jobs) {
  return (jobs || [])
    .flatMap((job) => photosForJob(job).map((url) => ({ url, job })))
    .slice(0, 6);
}

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

function WorkerJobCard({ job, compact = false, onOpen }) {
  const when = dateValue(job, "scheduled_date", "date", "start", "start_time", "due_date");
  return <article className={`freshWorkerAppJob ${compact ? "compact" : ""}`}>
    <div className="freshWorkerAppJobTop"><span>{statusOf(job).replaceAll("_", " ")}</span><small>{timeText(when)}</small></div>
    <b>{jobTitle(job)}</b>
    <p>{clientName(job)}</p>
    <small>{jobAddress(job)}</small>
    <div className="freshWorkerAppJobMeta"><em>{dayText(when)}</em><em>{hoursText(jobSeconds(job))}</em><em>{proofText(job)}</em></div>
    <button type="button" onClick={() => onOpen?.(job)}>{compact ? "View job" : actionText(job)}</button>
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
  const [panelModal, setPanelModal] = React.useState(null);

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
      const liveJobs = hideDemoRecords(liveRes?.data?.jobs || liveRes?.data?.data?.jobs || []);
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
      const nextJobs = jobRes?.success ? hideDemoRecords(arr(jobRes.data)) : [];
      const ordered = sortLiveWorkers(nextWorkers);
      setWorkers(ordered); setJobs(nextJobs); setSelectedId((current) => preferredWorkerId(ordered, current)); if (!nextWorkers.length && lastWorkerError) setError(lastWorkerError); setLastUpdated(new Date());
    } finally { if (!silent) setLoading(false); setRefreshing(false); }
  }, [get]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { const refresh = () => load({ silent: true }); window.addEventListener("churvox:fresh-data-updated", refresh); return () => window.removeEventListener("churvox:fresh-data-updated", refresh); }, [load]);
  React.useEffect(() => { if (!autoRefresh) return undefined; const refreshLiveWorkerView = () => { if (typeof document !== "undefined" && document.visibilityState !== "visible") return; load({ silent: true }); }; const timer = window.setInterval(refreshLiveWorkerView, 8000); window.addEventListener("focus", refreshLiveWorkerView); return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshLiveWorkerView); }; }, [autoRefresh, load]);

  const photoProofs = view ? photoProofsFromJobs(view.assignedJobs) : [];
  const importantJobs = view
    ? (view.currentJob
      ? [view.currentJob, ...view.todayJobs.filter((job) => idOf(job) !== idOf(view.currentJob))]
      : view.todayJobs.length
        ? view.todayJobs
        : view.assignedJobs.filter((job) => !isComplete(job))).slice(0, 4)
    : [];
  const recentCompleted = view ? view.assignedJobs.filter(isComplete).slice(0, 4) : [];

  const openJobModal = (job) => setPanelModal({ type: "job", job });
  const openPhotosModal = () => setPanelModal({ type: "photos", photos: photoProofs });

  return <section className="freshWorkerCommandPage workerFieldDeck freshWorkerAppView freshWorkerSimpleView">
    <header className="freshWorkerAppHero freshWorkerSimpleHero">
      <div>
        <span>Owner worker view</span>
        <h1>Workers</h1>
        <p>{selected ? `${workerName(selected)} · ${selectedLiveStatus}` : "Pick a worker on the left. See only the important field info on the right."}</p>
      </div>
      <div className="freshWorkerAppSummary">
        <div><b>{workers.length}</b><small>workers</small></div>
        <div><b>{liveCount}</b><small>live</small></div>
        <div><b>{todayCount}</b><small>jobs today</small></div>
      </div>
    </header>

    {error ? <section className="freshCard freshItem need"><b>Worker view needs attention</b><span>{error}</span><button className="freshPrimary" type="button" onClick={load}>Retry</button></section> : null}

    <section className="freshWorkerSimpleLayout">
      <aside className="freshWorkerAppPeople freshWorkerSimplePeople">
        <div className="freshWorkerAppPeopleHead">
          <b>Workers</b>
          <button type="button" onClick={() => load({ silent: true })}>{refreshing ? "Updating" : "Refresh"}</button>
        </div>

        {loading && !workers.length ? <div className="freshItem"><b>Loading workers…</b><span>Checking live status.</span></div> : null}
        {!loading && !workers.length ? <div className="freshItem"><b>No workers yet</b><span>Add workers from Team.</span></div> : null}

        {workers.map((worker) => {
          const itemView = buildWorkerView(worker, jobs);
          const active = idOf(worker) === idOf(selected);
          const current = directCurrentJob(worker, itemView);
          return <button
            key={idOf(worker)}
            type="button"
            className={active ? "active" : ""}
            onClick={() => {
              setSelectedId(idOf(worker));
              setPanelModal({ type: "worker", worker });
            }}
          >
            <span>{liveStatusFor(worker, itemView)}</span>
            <b>{workerName(worker)}</b>
            <small>{current.title ? `On: ${current.title}` : `${itemView.remainingToday} left · ${itemView.completedToday} done`}</small>
          </button>;
        })}
      </aside>

      <main className="freshWorkerAppMain freshWorkerSimpleMain">
        {selected && view ? <>
          <section className="freshWorkerAppNext freshWorkerSimpleNow">
            <div>
              <span>{selectedLiveStatus}</span>
              <h2>{workerName(selected)}</h2>
              <p>{view.currentJob ? `${jobTitle(view.currentJob)} · ${clientName(view.currentJob)}` : "No active job right now."}</p>
              <small>Last location: {lastLocation(selected)}</small>
              <small>Last update: {selectedLatestUpdate ? selectedLatestUpdate : "No update yet"}</small>
            </div>
            <div className="freshWorkerDetailActions">
              <button type="button" onClick={() => setPanelModal({ type: "worker", worker: selected })}>Worker detail</button>
              <button type="button" onClick={() => setPanelModal({ type: "jobs", jobs: view.assignedJobs })}>{view.currentJob ? "View current" : "View jobs"}</button>
            </div>
          </section>

          <section className="freshWorkerSimpleBoard">
            <div className="freshWorkerSimplePrimary">
              <article className="freshWorkerAppPanel">
                <h2>Important jobs</h2>
                <div className="freshWorkerAppJobs">
                  {importantJobs.length
                    ? importantJobs.map((job, index) => <WorkerJobCard key={idOf(job, index)} job={job} compact onOpen={openJobModal} />)
                    : <div className="freshItem"><b>No active job</b><span>No urgent job for this worker right now.</span></div>}
                </div>
              </article>

              <article className="freshWorkerAppPanel">
                <h2>Recently completed</h2>
                <div className="freshWorkerAppJobs">
                  {recentCompleted.length
                    ? recentCompleted.map((job, index) => <WorkerJobCard key={idOf(job, index)} job={job} compact onOpen={openJobModal} />)
                    : <div className="freshItem"><b>No completed jobs yet</b><span>Completed work will show here.</span></div>}
                </div>
              </article>
            </div>

            <div className="freshWorkerSimpleSide">
              <article className="freshWorkerAppPanel">
                <h2>Uploaded photos</h2>
                {photoProofs.length ? <div className="freshWorkerPhotoGrid">
                  {photoProofs.slice(0, 4).map((photo, index) => <button key={`${photo.url}-${index}`} type="button" onClick={() => setPanelModal({ type: "photo", photo })}>
                    <img src={photo.url} alt={`Proof for ${jobTitle(photo.job)}`} />
                    <span>{jobTitle(photo.job)}</span>
                  </button>)}
                </div> : <div className="freshItem"><b>No photos uploaded yet</b><span>Completed job photos will show here.</span></div>}
                <button type="button" onClick={openPhotosModal}>{photoProofs.length ? "View photos" : "Open photos"}</button>
              </article>

              <article className="freshWorkerAppPanel">
                <h2>Needs action</h2>
                {view.alerts.length ? view.alerts.map((alert) => <div key={alert} className="freshItem need"><b>Check this</b><span>{alert}</span></div>) : <div className="freshItem"><b>No urgent actions</b><span>The worker can carry on with the day.</span></div>}
              </article>
            </div>
          </section>
        </> : <section className="freshCard"><h2>Select worker</h2><p className="freshMuted">Pick a worker to see current job, proof photos and urgent actions.</p></section>}
      </main>
    </section>

    {panelModal ? <div className="freshWorkerInlineOverlay" onClick={() => setPanelModal(null)}>
      <section className="freshWorkerInlineModal" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>Worker view</span>
            <h2>{panelModal.type === "worker" ? "Worker detail" : panelModal.type === "photo" ? "Uploaded photo" : panelModal.type === "photos" ? "Uploaded photos" : panelModal.type === "jobs" ? "Assigned jobs" : "Job detail"}</h2>
          </div>
          <button type="button" aria-label="Close worker popup" onClick={() => setPanelModal(null)}>Close</button>
        </header>

        {panelModal.type === "worker" && (() => {
          const modalWorker = workers.find((worker) => idOf(worker) === idOf(panelModal.worker)) || panelModal.worker;
          const modalView = buildWorkerView(modalWorker, jobs);
          const modalCurrent = directCurrentJob(modalWorker, modalView);
          const point = gpsPoint(modalWorker);
          const mapUrl = mapsSearchUrl(modalWorker);
          const embedUrl = mapsEmbedUrl(modalWorker);
          const currentJobMap = modalView.currentJob ? jobSiteMapUrl(modalView.currentJob) : "";
          return <div className="freshWorkerDetailSheet">
            <section className="freshWorkerDetailTop">
              <div>
                <span>{liveStatusFor(modalWorker, modalView)}</span>
                <h3>{workerName(modalWorker)}</h3>
                <p>{workerEmail(modalWorker) || "No email saved"} {workerPhone(modalWorker) ? `· ${workerPhone(modalWorker)}` : ""}</p>
              </div>
              <div className="freshWorkerDetailBadges">
                <b>{modalView.currentJob ? "On job" : "No active job"}</b>
                <b>{modalView.todayJobs.length} today</b>
                <b>{modalView.completedToday} done</b>
              </div>
            </section>

            <section className="freshWorkerGpsBox">
              <div className="freshWorkerGpsMap">
                {embedUrl ? <iframe title={`Map for ${workerName(modalWorker)}`} src={embedUrl} loading="lazy" /> : <div><b>No GPS map yet</b><span>Worker app has not sent coordinates.</span></div>}
              </div>

              <div className="freshWorkerGpsInfo">
                <span>Last GPS</span>
                <h3>{lastLocation(modalWorker)}</h3>
                <p>{gpsCoords(modalWorker) || "No coordinates recorded."}</p>
                <small>Updated: {gpsUpdatedAt(modalWorker) || "No GPS update yet"}</small>
                <small>{gpsAccuracy(modalWorker)}</small>
                <div className="freshWorkerDetailActions">
                  {mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer">Open in Maps</a> : null}
                  <button type="button" onClick={() => load({ silent: true })}>Refresh live GPS</button>
                </div>
              </div>
            </section>

            <section className="freshWorkerDetailStats">
              <article><span>Shift time</span><b>{hoursText(modalView.shiftSeconds)}</b></article>
              <article><span>Job time</span><b>{hoursText(modalView.jobTimeSeconds)}</b></article>
              <article><span>Gap time</span><b>{hoursText(modalView.unallocatedSeconds)}</b></article>
              <article><span>Photos</span><b>{photoProofsFromJobs(modalView.assignedJobs).length}</b></article>
            </section>

            <section className="freshWorkerCurrentJobBox">
              <span>Current work</span>
              <h3>{modalView.currentJob ? jobTitle(modalView.currentJob) : modalCurrent.title || "No current job"}</h3>
              <p>{modalView.currentJob ? `${clientName(modalView.currentJob)} · ${jobAddress(modalView.currentJob)}` : "No active job is linked to this worker right now."}</p>
              <div className="freshWorkerDetailActions">
                {modalView.currentJob ? <button type="button" onClick={() => setPanelModal({ type: "job", job: modalView.currentJob })}>Open job detail</button> : null}
                {currentJobMap ? <a href={currentJobMap} target="_blank" rel="noreferrer">Open job site map</a> : null}
              </div>
            </section>

            <section className="freshWorkerDetailColumns">
              <article>
                <h3>Today’s jobs</h3>
                <div className="freshWorkerAppJobs">
                  {modalView.todayJobs.length ? modalView.todayJobs.map((job, index) => <WorkerJobCard key={idOf(job, index)} job={job} compact onOpen={openJobModal} />) : <div className="freshItem"><b>No jobs today</b><span>This worker has no jobs booked today.</span></div>}
                </div>
              </article>

              <article>
                <h3>Needs action</h3>
                {modalView.alerts.length ? modalView.alerts.map((alert) => <div key={alert} className="freshItem need"><b>Check this</b><span>{alert}</span></div>) : <div className="freshItem"><b>No urgent actions</b><span>Worker can carry on.</span></div>}
              </article>
            </section>
          </div>;
        })()}

        {panelModal.type === "photo" && <div className="freshWorkerPhotoLarge">
          <img src={panelModal.photo.url} alt={`Proof for ${jobTitle(panelModal.photo.job)}`} />
          <b>{jobTitle(panelModal.photo.job)}</b>
          <span>{clientName(panelModal.photo.job)} · {jobAddress(panelModal.photo.job)}</span>
        </div>}

        {panelModal.type === "photos" && <div className="freshWorkerModalGrid">
          {panelModal.photos.length ? panelModal.photos.map((photo, index) => <button key={`${photo.url}-${index}`} type="button" onClick={() => setPanelModal({ type: "photo", photo })}>
            <img src={photo.url} alt={`Proof for ${jobTitle(photo.job)}`} />
            <b>{jobTitle(photo.job)}</b>
            <span>{clientName(photo.job)}</span>
          </button>) : <div className="freshItem"><b>No photos yet</b><span>Photos uploaded by the worker will show here.</span></div>}
        </div>}

        {panelModal.type === "jobs" && <div className="freshWorkerAppJobs">
          {panelModal.jobs.length ? panelModal.jobs.map((job, index) => <WorkerJobCard key={idOf(job, index)} job={job} compact onOpen={openJobModal} />) : <div className="freshItem"><b>No assigned jobs</b><span>No jobs are linked to this worker yet.</span></div>}
        </div>}

        {panelModal.type === "job" && <div className="freshWorkerJobDetail">
          <span>{statusOf(panelModal.job).replaceAll("_", " ")}</span>
          <h3>{jobTitle(panelModal.job)}</h3>
          <p>{clientName(panelModal.job)}</p>
          <p>{jobAddress(panelModal.job)}</p>
          <div className="freshWorkerAppJobMeta"><em>{dayText(dateValue(panelModal.job, "scheduled_date", "date", "start", "start_time", "due_date"))}</em><em>{hoursText(jobSeconds(panelModal.job))}</em><em>{proofText(panelModal.job)}</em></div>
          {photosForJob(panelModal.job).length ? <div className="freshWorkerPhotoGrid">{photosForJob(panelModal.job).map((url, index) => <button key={`${url}-${index}`} type="button" onClick={() => setPanelModal({ type: "photo", photo: { url, job: panelModal.job } })}><img src={url} alt="Job proof" /><span>Proof photo</span></button>)}</div> : null}
        </div>}
      </section>
    </div> : null}
  </section>;
}
