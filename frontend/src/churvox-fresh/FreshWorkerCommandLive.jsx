import React from "react";
import { useApi } from "../hooks/useApi";
import { hideDemoRecords } from "./freshDemoRecords";
import "./freshWorkerCommand.css";
import "./freshWorkerCommandLive.css";

const WORKER_ENDPOINTS = ["/worker/live-status", "/team/workers", "/team", "/workers"];

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

function listFrom(value, key = "") {
  const data = value?.data ?? value;
  if (Array.isArray(data)) return data;
  if (key && Array.isArray(data?.[key])) return data[key];
  for (const itemKey of ["workers", "team", "members", "items", "records", "results", "jobs", "data"]) {
    if (Array.isArray(data?.[itemKey])) return data[itemKey];
  }
  return [];
}

function idOf(record, fallback = "") {
  const value = record?.id || record?._id || record?.worker_id || record?.user_id || record?.team_member_id || record?.job_id;
  if (!value) return fallback;
  if (typeof value === "object") return String(value.$oid || value.oid || value.id || value._id || fallback || "");
  return String(value || fallback || "");
}

function workerName(worker) {
  return pick(worker, "name", "full_name", "display_name", "first_name", "email") || "Unnamed worker";
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

function statusOf(record) {
  return lower(record?.status || record?.job_status || record?.live_status || record?.clock_status || "waiting").replaceAll(" ", "_");
}

function isDone(job) {
  return ["complete", "completed", "done", "finished"].includes(statusOf(job));
}

function isActiveJob(job) {
  return ["in_progress", "started", "paused"].includes(statusOf(job));
}

function dateFrom(record, ...keys) {
  const raw = pick(record, ...keys);
  const date = raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function isToday(date) {
  return Boolean(date && date.toDateString() === new Date().toDateString());
}

function timeText(date) {
  if (!date) return "No time";
  return date.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
}

function seconds(value) {
  const parsed = Number(String(value || 0).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function durationText(totalSeconds) {
  const total = Math.round(seconds(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m`;
  return "0m";
}

function gpsPoint(worker) {
  const lat = Number(pick(worker, "last_lat", "gps_lat", "latitude", "lat", "lastLatitude", "last_latitude"));
  const lng = Number(pick(worker, "last_lng", "gps_lng", "longitude", "lng", "lastLongitude", "last_longitude"));
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };

  const combined = [
    pick(worker, "last_location", "lastLocation", "last_gps", "gps_label", "gps_address", "address_label"),
    worker?.location,
    worker?.last_known_location,
  ].filter(Boolean).join(" ");
  const match = String(combined).match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
  if (!match) return null;
  const parsedLat = Number(match[1]);
  const parsedLng = Number(match[2]);
  return Number.isFinite(parsedLat) && Number.isFinite(parsedLng) ? { lat: parsedLat, lng: parsedLng } : null;
}

function gpsAddress(worker) {
  const point = gpsPoint(worker);
  const saved = pick(worker, "gps_address", "last_gps_address", "last_address", "last_location_address", "formatted_address", "location_address", "last_location");
  if (saved) return saved;
  return point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : "No GPS yet";
}

function gpsUpdated(worker) {
  return pick(worker, "last_gps_at", "gps_updated_at", "last_location_at", "location_updated_at", "live_updated_at", "last_live_status_at", "updated_at");
}

function mapSearchUrl(worker) {
  const point = gpsPoint(worker);
  return point ? `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}` : "";
}

function mapEmbedUrl(worker) {
  const point = gpsPoint(worker);
  return point ? `https://maps.google.com/maps?q=${point.lat},${point.lng}&z=17&output=embed` : "";
}

function photoCount(job) {
  const raw = job?.photos || job?.photo_urls || job?.proof_photos || job?.completion_photos || job?.images || [];
  return Array.isArray(raw) ? raw.length : raw ? 1 : 0;
}

function workerTokens(worker) {
  return [
    idOf(worker),
    pick(worker, "worker_id", "user_id", "team_member_id"),
    pick(worker, "email", "worker_email"),
    workerName(worker),
  ].map(lower).filter(Boolean);
}

function jobTokens(job) {
  return [
    pick(job, "assigned_worker_id", "worker_id", "assigned_to", "assignedWorkerId"),
    pick(job, "assigned_worker_email", "worker_email", "assigned_to_email"),
    pick(job, "assigned_worker_name", "worker_name", "assigned_to_name"),
    job?.assigned_worker?.id,
    job?.assigned_worker?.email,
    job?.assigned_worker?.name,
    job?.worker?.id,
    job?.worker?.email,
    job?.worker?.name,
  ].map(lower).filter(Boolean);
}

function jobBelongsToWorker(job, worker) {
  const mine = workerTokens(worker);
  const assigned = jobTokens(job);
  return mine.length && assigned.length && assigned.some((token) => mine.includes(token));
}

function directCurrentJob(worker) {
  return {
    title: pick(worker, "current_job_title", "job_title"),
    status: pick(worker, "current_job_status", "job_status"),
    client: pick(worker, "current_client", "current_client_name", "client_name"),
  };
}

function workerLiveStatus(worker, view) {
  const direct = pick(worker, "live_status", "clock_status", "shift_status", "status");
  if (view?.currentJob) return statusOf(view.currentJob) === "paused" ? "Paused on job" : "On job now";
  if (direct) return direct.replaceAll("_", " ");
  if (view?.todayJobs?.length) return "Jobs assigned";
  return "Waiting";
}

function sortWorkers(workers) {
  return [...workers].sort((a, b) => {
    const aLive = gpsPoint(a) || directCurrentJob(a).title ? 1 : 0;
    const bLive = gpsPoint(b) || directCurrentJob(b).title ? 1 : 0;
    return bLive - aLive || workerName(a).localeCompare(workerName(b));
  });
}

function buildView(worker, jobs) {
  const assignedJobs = jobs.filter((job) => jobBelongsToWorker(job, worker));
  const todayJobs = assignedJobs.filter((job) => isToday(dateFrom(job, "scheduled_date", "date", "start", "start_time", "due_date")));
  const currentJob = todayJobs.find(isActiveJob) || assignedJobs.find(isActiveJob) || null;
  const completeToday = todayJobs.filter(isDone).length;
  const proofJobs = assignedJobs.filter((job) => photoCount(job) || pick(job, "worker_notes", "worker_message", "completion_note", "completion_notes"));
  const alerts = [];
  if (!gpsPoint(worker)) alerts.push("No GPS point has been sent from the worker app yet.");
  if (todayJobs.length && !currentJob && !todayJobs.every(isDone)) alerts.push("Jobs are assigned but no live active job is linked right now.");
  if (todayJobs.some((job) => isDone(job) && !photoCount(job))) alerts.push("Some completed jobs may still need photo proof.");
  if (!todayJobs.length) alerts.push("No jobs booked for this worker today.");
  return { assignedJobs, todayJobs, currentJob, completeToday, proofJobs, alerts };
}

function friendlyError(error) {
  if (!error) return "";
  if (/not found|404/i.test(String(error))) return "";
  return "Worker live data could not refresh. Saved team records and jobs can still show here.";
}

function JobRow({ job }) {
  const when = dateFrom(job, "scheduled_date", "date", "start", "start_time", "due_date");
  return (
    <article className="freshWorkerCommandJob compact">
      <b>{jobTitle(job)}</b>
      <span>{clientName(job)}</span>
      <small>{timeText(when)} - {statusOf(job).replaceAll("_", " ")} - {photoCount(job)} photos</small>
      <small>{jobAddress(job)}</small>
    </article>
  );
}

function EmptyGpsDeck({ onNavigate, onRefresh, refreshing }) {
  return (
    <section className="freshWorkerNowPanel freshWorkerLiveEmptyDeck">
      <article className="freshWorkerNowLeft">
        <span>Worker command ready</span>
        <h2>Live worker map</h2>
        <p>Add workers from Team and assign jobs. When the worker app sends location, Churvox shows GPS, current job, proof, alerts and time here.</p>
        <div className="freshWorkerStatusLine">
          <b>No live worker selected</b>
          <small>GPS, job status, proof and time appear here as soon as worker data arrives.</small>
        </div>
        <div className="freshWorkerNowActions">
          <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
          <button type="button" onClick={onRefresh}>{refreshing ? "Refreshing" : "Refresh live"}</button>
        </div>
      </article>

      <article className="freshWorkerLiveMapCard">
        <div className="freshWorkerMapStandby">
          <div className="freshWorkerMapPin">GPS</div>
          <b>Live GPS map</b>
          <span>Worker location, job site and route check appear here.</span>
        </div>
      </article>
    </section>
  );
}

export default function FreshWorkerCommandLive({ onNavigate }) {
  const { get } = useApi();
  const [workers, setWorkers] = React.useState([]);
  const [jobs, setJobs] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState(null);
  const [error, setError] = React.useState("");

  const selected = workers.find((worker, index) => idOf(worker, `worker-${index}`) === selectedId) || workers[0] || null;
  const view = selected ? buildView(selected, jobs) : null;
  const directJob = selected ? directCurrentJob(selected) : { title: "", status: "", client: "" };
  const mapUrl = selected ? mapSearchUrl(selected) : "";
  const embedUrl = selected ? mapEmbedUrl(selected) : "";
  const liveCount = workers.filter((worker) => gpsPoint(worker) || directCurrentJob(worker).title).length;
  const todayCount = workers.reduce((sum, worker) => sum + buildView(worker, jobs).todayJobs.length, 0);
  const proofCount = view ? view.proofJobs.reduce((sum, job) => sum + Math.max(1, photoCount(job)), 0) : 0;

  const load = React.useCallback(async (options = {}) => {
    const silent = Boolean(options.silent);
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    let nextWorkers = [];
    let nextJobs = [];
    let lastError = "";

    for (const endpoint of WORKER_ENDPOINTS) {
      try {
        const res = await get(`${endpoint}${endpoint.includes("?") ? "&" : "?"}ts=${Date.now()}`, {
          timeout: 25000,
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
        if (res?.success) {
          const data = res?.data?.data || res?.data || res;
          nextWorkers = listFrom(data, "workers");
          nextJobs = hideDemoRecords(listFrom(data, "jobs"));
          if (nextWorkers.length) break;
        } else {
          lastError = res?.error || res?.detail || lastError;
        }
      } catch (err) {
        lastError = err?.message || lastError;
      }
    }

    if (!nextJobs.length) {
      try {
        const jobRes = await get("/jobs", { timeout: 25000 });
        nextJobs = jobRes?.success ? hideDemoRecords(listFrom(jobRes.data)) : [];
      } catch (err) {
        lastError = lastError || err?.message || "Jobs could not load.";
      }
    }

    const ordered = sortWorkers(nextWorkers);
    const message = friendlyError(lastError);
    setWorkers(ordered);
    setJobs(nextJobs);
    setSelectedId((current) => {
      if (ordered.some((worker, index) => idOf(worker, `worker-${index}`) === current)) return current;
      return idOf(ordered[0], "");
    });
    setError(ordered.length || !message ? "" : message);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, [get]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(() => load({ silent: true }), 10000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load]);

  return (
    <section className="freshWorkerCommandPage workerFieldDeck freshWorkerLivePage">
      <header className="freshWorkerFieldHero">
        <div>
          <span>Owner worker view</span>
          <h1>Workers</h1>
          <p>{selected ? `${workerName(selected)} - ${workerLiveStatus(selected, view)}` : "Live GPS, current job, proof, alerts and time in one owner view."}</p>
        </div>
        <div className="freshWorkerHeroStats">
          <div><b>{workers.length}</b><small>workers</small></div>
          <div><b>{liveCount}</b><small>live</small></div>
          <div><b>{todayCount}</b><small>jobs today</small></div>
          <div><b>{proofCount}</b><small>proof items</small></div>
        </div>
        <div className="freshWorkerLiveStrip">
          <b>{loading ? "Loading worker command" : error ? "Worker data note" : "Worker command ready"}</b>
          <span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}` : "Checking worker GPS and jobs"}</span>
          <button type="button" onClick={() => load({ silent: true })}>{refreshing ? "Refreshing" : "Refresh"}</button>
          <button type="button" onClick={() => setAutoRefresh((value) => !value)}>{autoRefresh ? "Auto on" : "Auto off"}</button>
        </div>
      </header>

      {error ? (
        <section className="freshWorkerLiveNotice">
          <b>Worker data note</b>
          <span>{error}</span>
        </section>
      ) : null}

      <section className="freshWorkerFieldLayout">
        <aside className="freshWorkerRail">
          <div className="freshWorkerRailHead">
            <b>Workers</b>
            <button type="button" onClick={() => load({ silent: true })}>{refreshing ? "Updating" : "Refresh"}</button>
          </div>
          {loading && !workers.length ? <div className="freshWorkerLiveEmpty"><b>Loading workers</b><span>Checking worker GPS, jobs and app status.</span></div> : null}
          {!loading && !workers.length ? <div className="freshWorkerLiveEmpty"><b>No workers yet</b><span>Add workers from Team. GPS appears when the worker app sends location.</span></div> : null}
          {workers.map((worker, index) => {
            const workerId = idOf(worker, `worker-${index}`);
            const itemView = buildView(worker, jobs);
            const active = workerId === selectedId;
            const direct = directCurrentJob(worker);
            return (
              <button key={workerId} type="button" className={`freshWorkerRailItem ${active ? "active" : ""}`} onClick={() => setSelectedId(workerId)}>
                <span>{workerLiveStatus(worker, itemView)}</span>
                <b>{workerName(worker)}</b>
                <small>{direct.title || itemView.currentJob ? `On: ${direct.title || jobTitle(itemView.currentJob)}` : `${itemView.todayJobs.length} jobs today`}</small>
                <small>{gpsAddress(worker)}</small>
              </button>
            );
          })}
        </aside>

        <main className="freshWorkerFieldMain">
          {!selected ? (
            <EmptyGpsDeck onNavigate={onNavigate} onRefresh={() => load({ silent: true })} refreshing={refreshing} />
          ) : (
            <>
              <section className="freshWorkerNowPanel">
                <article className="freshWorkerNowLeft">
                  <span>{workerLiveStatus(selected, view)}</span>
                  <h2>{workerName(selected)}</h2>
                  <p>{directJob.title || view?.currentJob ? `${directJob.title || jobTitle(view.currentJob)} - ${directJob.client || clientName(view.currentJob)}` : "No active job linked right now."}</p>
                  <div className="freshWorkerStatusLine">
                    <b>{gpsAddress(selected)}</b>
                    <small>GPS updated: {gpsUpdated(selected) || "No GPS update yet"}</small>
                  </div>
                  <div className="freshWorkerNowActions">
                    {mapUrl ? <button type="button" onClick={() => window.open(mapUrl, "_blank", "noopener,noreferrer")}>Open GPS</button> : null}
                    <button type="button" onClick={() => onNavigate?.("team")}>Open Team</button>
                    <button type="button" onClick={() => load({ silent: true })}>Refresh live</button>
                  </div>
                </article>

                <article className="freshWorkerLiveMapCard">
                  {embedUrl ? (
                    <iframe title={`GPS map for ${workerName(selected)}`} src={embedUrl} loading="lazy" />
                  ) : (
                    <div className="freshWorkerMapStandby">
                      <div className="freshWorkerMapPin">GPS</div>
                      <b>No GPS map yet</b>
                      <span>Worker app has not sent coordinates for this worker.</span>
                    </div>
                  )}
                </article>
              </section>

              <section className="freshWorkerFieldStats">
                <article><span>Today</span><b>{view.todayJobs.length}</b><small>Jobs assigned today</small></article>
                <article><span>Complete</span><b>{view.completeToday}</b><small>Completed today</small></article>
                <article><span>Proof</span><b>{proofCount}</b><small>Photos or worker notes</small></article>
                <article><span>Time</span><b>{durationText(pick(selected, "shift_seconds", "today_shift_seconds", "job_time_seconds", "total_job_seconds"))}</b><small>Worker app timer total</small></article>
              </section>

              <section className="freshWorkerFieldGrid">
                <article className="freshWorkerNowJob">
                  <span>Current job</span>
                  <h3>{directJob.title || (view.currentJob ? jobTitle(view.currentJob) : "No active job")}</h3>
                  <p>{view.currentJob ? `${clientName(view.currentJob)} - ${jobAddress(view.currentJob)}` : "When a worker starts a job, it appears here with proof and time."}</p>
                  <div className="freshWorkerMiniInfo">
                    <div><span>Status</span><b>{directJob.status || (view.currentJob ? statusOf(view.currentJob).replaceAll("_", " ") : "Waiting")}</b></div>
                    <div><span>GPS</span><b>{gpsPoint(selected) ? "Live point saved" : "No point yet"}</b></div>
                  </div>
                </article>

                <article className="freshWorkerNowJob">
                  <span>Alerts</span>
                  <h3>Owner checks</h3>
                  <div className="freshWorkerLiveAlerts">
                    {view.alerts.map((alert) => <p key={alert}>{alert}</p>)}
                  </div>
                </article>

                <article className="freshWorkerNowJob">
                  <span>Jobs today</span>
                  <h3>Run sheet</h3>
                  <div className="freshWorkerCommandJobs">
                    {view.todayJobs.length ? view.todayJobs.slice(0, 5).map((job, index) => <JobRow key={idOf(job, `today-${index}`)} job={job} />) : <div className="freshWorkerLiveEmpty"><b>No jobs today</b><span>Book work in Jobs and assign this worker.</span></div>}
                  </div>
                </article>

                <article className="freshWorkerNowJob">
                  <span>Proof</span>
                  <h3>Photos and notes</h3>
                  <div className="freshWorkerCommandJobs">
                    {view.proofJobs.length ? view.proofJobs.slice(0, 5).map((job, index) => <JobRow key={idOf(job, `proof-${index}`)} job={job} />) : <div className="freshWorkerLiveEmpty"><b>No proof yet</b><span>Worker photos and completion notes will appear here.</span></div>}
                  </div>
                </article>
              </section>
            </>
          )}
        </main>
      </section>
    </section>
  );
}
