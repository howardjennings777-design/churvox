import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock3, Hand, LogOut, MapPin, Play, RefreshCw, RotateCcw, Settings } from "lucide-react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";
import WorkerBottomNav from "@/components/worker/WorkerBottomNav";
import WorkerContactOfficePanel from "@/components/worker/WorkerContactOfficePanel";
import "./WorkerJobsMobile.css";

const canAcknowledge = (status) => String(status || "").toLowerCase() === "assigned";
const canStart = (status) => ["assigned", "acknowledged"].includes(String(status || "").toLowerCase());
const canResume = (status) => String(status || "").toLowerCase() === "paused";
const reviewStatus = (job) => String(job?.work_review_status || job?.review_status || job?.owner_review_status || "").trim().toLowerCase();
const isSentBackJob = (job) => reviewStatus(job) === "sent_back" || job?.worker_action_required === true;
const sendBackNote = (job) => String(job?.send_back_note || job?.owner_note || job?.worker_note || "").trim();

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function oid(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return oid(value.$oid || value.oid || value.id || value._id || "");
  const text = String(value || "");
  return text === "[object Object]" ? "" : text;
}

function idOf(value) { return oid(value?.id || value?._id || value?.uuid || value?.job_id); }
function lower(value) { return String(value || "").trim().toLowerCase(); }
function userKeys(user) { return [user?.id, user?._id, user?.uuid, user?.worker_id, user?.team_member_id, user?.email, user?.name, user?.full_name, user?.display_name].map((v) => lower(oid(v))).filter(Boolean); }
function assignmentKeys(job) { return [job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assignedWorkerId, job?.worker?.id, job?.worker?._id, job?.assigned_worker?.id, job?.assigned_worker?._id, job?.assigned_worker_email, job?.worker_email, job?.assigned_to_email, job?.assigned_worker_name, job?.worker_name, job?.assigned_to_name].map((v) => lower(oid(v))).filter(Boolean); }
function hasAssignment(job) { return assignmentKeys(job).length > 0; }
function assignedToMe(job, user) { const mine = userKeys(user); const assigned = assignmentKeys(job); return Boolean(mine.length && assigned.length && assigned.some((key) => mine.includes(key))); }
function scopeJobsForWorker(rawJobs, user) { const list = arr(rawJobs); const scoped = list.filter((job) => assignedToMe(job, user)); const hasAssignedRecords = list.some(hasAssignment); if (scoped.length) return scoped; if (hasAssignedRecords) return []; return list; }
function statusOf(job) { return String(job?.status || "assigned").toLowerCase().replaceAll(" ", "_"); }
function isActiveJob(job) { return ["in_progress", "paused"].includes(statusOf(job)); }
function isComplete(job) { return statusOf(job) === "completed"; }
function jobTitle(job) { return job?.title || job?.job_name || job?.job_type || "Untitled job"; }
function clientName(job) { return job?.client_name || job?.customer_name || job?.client || job?.customer || "No client"; }
function addressOf(job) { return job?.address || job?.site_address || job?.service_address || job?.job_address || ""; }
function dateOf(job) { return String(job?.scheduled_date || job?.date || job?.start || job?.due_date || "").slice(0, 10); }
function timeOf(job) { return job?.scheduled_time || job?.time || ""; }
function todayKey() { return new Date().toISOString().slice(0, 10); }

function hoursText(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds || 0)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (!h && !m) return "0m";
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
}

function jobAction(job) {
  const status = statusOf(job);
  if (isSentBackJob(job)) return "Fix job";
  if (canAcknowledge(status)) return "Acknowledge";
  if (canResume(status)) return "Resume";
  if (canStart(status)) return "Start";
  if (status === "in_progress") return "Open active job";
  if (isComplete(job)) return "Completed";
  return "Open job";
}

function getGpsPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not available on this device"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function WorkerJobCard({ job, busy, onAcknowledge, onStart }) {
  const id = idOf(job);
  const status = statusOf(job);
  const sentBack = isSentBackJob(job);
  const note = sendBackNote(job);
  const address = addressOf(job);
  const startAllowed = canStart(status) || canResume(status);

  return (
    <article className={`worker-app-job ${sentBack ? "needs-fix" : ""} ${isActiveJob(job) ? "active" : ""}`}>
      <Link className="worker-app-job__main" to={`/worker/jobs/${id}`}>
        <div className="worker-app-job__top"><span>{sentBack ? "Fix needed" : status.replaceAll("_", " ")}</span><small>{timeOf(job) || "No time"}</small></div>
        <h2>{jobTitle(job)}</h2>
        <p>{clientName(job)}</p>
        <small>{address || "No address added"}</small>
      </Link>

      {sentBack ? <div className="worker-app-warning"><AlertTriangle className="h-4 w-4" /><span>{note || "Owner sent this back. Open the job and fix what was requested."}</span></div> : null}

      <div className="worker-app-job__actions">
        <Link to={`/worker/jobs/${id}`} className="worker-app-btn dark">Open</Link>
        {canAcknowledge(status) ? <button type="button" onClick={() => onAcknowledge(id)} disabled={busy === id}><Hand className="h-4 w-4" />{busy === id ? "Saving" : "Acknowledge"}</button> : null}
        {startAllowed ? <button type="button" onClick={() => onStart(job)} disabled={busy === id}>{status === "paused" ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}{busy === id ? "Starting" : status === "paused" ? "Resume" : "Start"}</button> : null}
        {status === "in_progress" ? <Link to={`/worker/jobs/${id}`} className="worker-app-btn go"><Clock3 className="h-4 w-4" /> Active</Link> : null}
        {isComplete(job) ? <span className="worker-app-done"><CheckCircle2 className="h-4 w-4" /> Done</span> : null}
        {address ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer" className="worker-app-btn map"><MapPin className="h-4 w-4" /> Directions</a> : null}
      </div>
    </article>
  );
}

export default function WorkerJobsPage() {
  const { user, logout } = useAuth();
  const { get, post } = useApi();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingId, setStartingId] = useState("");
  const [shiftStatus, setShiftStatus] = useState("clocked_out");
  const [shiftSeconds, setShiftSeconds] = useState(0);
  const [gpsTracking, setGpsTracking] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [showContactOffice, setShowContactOffice] = useState(false);

  async function sendLivePing(payload = {}) {
    try { await post("/worker/live-ping", payload); } catch { /* keep worker flow unblocked */ }
  }

  async function fetchShiftStatus() {
    const res = await get("/worker/shift/status");
    if (res?.success) {
      const data = res.data?.data || res.data || {};
      setShiftStatus(data.status || "clocked_out");
      setShiftSeconds(Number(data.shift_seconds || data.shift?.total_shift_seconds || 0));
      setGpsTracking(Boolean(data.gps_tracking_enabled));
    }
  }

  async function sendGpsPing(source = "hourly") {
    try {
      const location = await getGpsPosition();
      const res = await post("/worker/gps-ping", { location, source });
      await sendLivePing({ source, live_status: source === "hourly" ? "GPS checked" : "GPS checked now", clock_status: shiftStatus || "clocked_in", location });
      if (!res?.success && source !== "hourly") toast.error(res?.error || "GPS could not be recorded");
      if (res?.success && source !== "hourly") toast.success("GPS recorded");
    } catch (err) {
      if (source !== "hourly") toast.error(err?.message || "GPS permission is needed while clocked in");
    }
  }

  async function clockIn() {
    setShiftBusy(true);
    try {
      const location = await getGpsPosition();
      const res = await post("/worker/clock-in", { location });
      if (res?.success) {
        setShiftStatus("clocked_in");
        setGpsTracking(true);
        await sendLivePing({ source: "clock-in", live_status: "Clocked in", clock_status: "clocked_in", location });
        toast.success("Clocked in. GPS tracking is on.");
        await fetchShiftStatus();
      } else toast.error(res?.error || "Could not clock in");
    } catch (err) {
      toast.error(err?.message || "GPS permission is needed to clock in");
    } finally { setShiftBusy(false); }
  }

  async function clockOut() {
    setShiftBusy(true);
    try {
      let location = null;
      try { location = await getGpsPosition(); } catch { location = null; }
      const res = await post("/worker/clock-out", { location });
      if (res?.success) {
        setShiftStatus("clocked_out");
        setGpsTracking(false);
        setShiftSeconds(0);
        await sendLivePing({ source: "clock-out", live_status: "Clocked out", clock_status: "clocked_out", location });
        toast.success("Clocked out. GPS tracking is off.");
        await fetchShiftStatus();
      } else toast.error(res?.error || "Could not clock out");
    } finally { setShiftBusy(false); }
  }

  async function fetchJobs() {
    setLoading(true);
    setError("");
    const res = await get("/jobs");
    if (res.success) {
      setJobs(scopeJobsForWorker(arr(res.data), user));
      setLastSynced(new Date());
    } else setError("Could not load your jobs. Please refresh.");
    setLoading(false);
  }

  useEffect(() => { fetchJobs(); fetchShiftStatus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (shiftStatus !== "clocked_in") return undefined; const tick = window.setInterval(() => setShiftSeconds((value) => Number(value || 0) + 60), 60000); return () => window.clearInterval(tick); }, [shiftStatus]);
  useEffect(() => { if (shiftStatus !== "clocked_in" || !gpsTracking) return undefined; const gpsTimer = window.setInterval(() => sendGpsPing("hourly"), 60 * 60 * 1000); return () => window.clearInterval(gpsTimer); }, [gpsTracking, shiftStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayKey();
  const todayJobs = useMemo(() => jobs.filter((job) => dateOf(job) === today), [jobs, today]);
  const visibleTodayJobs = todayJobs.length ? todayJobs : jobs.filter((job) => !isComplete(job));
  const nextJob = useMemo(() => jobs.find(isSentBackJob) || jobs.find(isActiveJob) || visibleTodayJobs.find((j) => !isComplete(j)) || jobs.find((j) => !isComplete(j)), [jobs, visibleTodayJobs]);
  const stats = useMemo(() => ({ total: jobs.length, today: todayJobs.length, active: jobs.filter(isActiveJob).length, completed: jobs.filter(isComplete).length, needsFixing: jobs.filter(isSentBackJob).length }), [jobs, todayJobs]);

  const checkAnotherActiveJob = async (jobId) => {
    const res = await get("/jobs");
    const list = scopeJobsForWorker(res?.data, user);
    return list.find((item) => isActiveJob(item) && idOf(item) !== String(jobId));
  };

  const handleAcknowledge = async (jobId) => {
    setStartingId(jobId);
    const res = await post(`/jobs/${encodeURIComponent(jobId)}/acknowledge`, {});
    if (res?.success) toast.success("Job acknowledged");
    else toast.error(res?.error || "Could not acknowledge job");
    await fetchJobs();
    setStartingId("");
  };

  const handleTimerStart = async (job) => {
    const jobId = idOf(job);
    const status = statusOf(job);
    if (!jobId) return;
    setStartingId(jobId);
    try {
      const otherActive = await checkAnotherActiveJob(jobId);
      if (otherActive && status !== "paused") {
        toast.error(`Pause or finish your active job first: ${otherActive?.title || "current job"}`);
        return;
      }
      const endpoint = status === "paused" ? `/jobs/${encodeURIComponent(jobId)}/timer/resume` : `/jobs/${encodeURIComponent(jobId)}/timer/start`;
      let location = null;
      try { location = await getGpsPosition(); } catch { location = null; }
      const res = await post(endpoint, location ? { location } : {});
      if (res?.success) {
        await sendLivePing({ source: status === "paused" ? "job-resume" : "job-start", live_status: "On job now", clock_status: "on_job", job_id: jobId, job_title: job?.title || "", job_status: "in_progress", location });
        toast.success(status === "paused" ? "Job resumed" : "Job timer started");
      } else toast.error(res?.error || "Could not start job timer");
      await fetchJobs();
    } finally { setStartingId(""); }
  };

  return (
    <div className="worker-app-screen">
      <header className="worker-app-top">
        <div><b>My Day</b><span>{user?.name ? `Hi ${String(user.name).split(" ")[0]}` : "Worker app"} · {shiftStatus === "clocked_in" ? "Clocked in" : "Clocked out"}</span></div>
        <div><button type="button" onClick={fetchJobs} disabled={loading}><RefreshCw className={loading ? "spin" : ""} /></button><Link to="/worker/settings"><Settings /></Link><button type="button" onClick={logout}><LogOut /></button></div>
      </header>

      <main className="worker-app-main">
        <section className="worker-app-hero">
          <span>Next job</span>
          <h1>{nextJob ? jobTitle(nextJob) : "Waiting for dispatch"}</h1>
          <p>{nextJob ? `${clientName(nextJob)}${addressOf(nextJob) ? ` · ${addressOf(nextJob)}` : ""}` : "No jobs are assigned yet. Refresh or contact the office if you are expecting work."}</p>
          <div className="worker-app-hero__actions">
            {nextJob ? <Link to={`/worker/jobs/${idOf(nextJob)}`}>Open job</Link> : <button type="button" onClick={fetchJobs}>Refresh jobs</button>}
            {nextJob && (canStart(statusOf(nextJob)) || canResume(statusOf(nextJob))) ? <button type="button" onClick={() => handleTimerStart(nextJob)} disabled={startingId === idOf(nextJob)}>{jobAction(nextJob)}</button> : null}
            <button type="button" onClick={() => setShowContactOffice(true)}>Contact office</button>
          </div>
        </section>

        <section className="worker-app-clock">
          <div><span>Payroll clock</span><b>{shiftStatus === "clocked_in" ? hoursText(shiftSeconds) : "Off"}</b><small>{gpsTracking ? "GPS on while clocked in" : "Clock in to start paid time"}</small></div>
          {shiftStatus !== "clocked_in" ? <button type="button" disabled={shiftBusy} onClick={clockIn}>{shiftBusy ? "Clocking in" : "Clock in"}</button> : <><button type="button" disabled={shiftBusy} onClick={clockOut}>{shiftBusy ? "Clocking out" : "Clock out"}</button><button type="button" disabled={shiftBusy || !gpsTracking} onClick={() => sendGpsPing("manual")}>GPS check</button></>}
        </section>

        <section className="worker-app-stats">
          <article><span>Today</span><b>{stats.today || visibleTodayJobs.length}</b></article>
          <article><span>Active</span><b>{stats.active}</b></article>
          <article><span>Done</span><b>{stats.completed}</b></article>
        </section>

        {stats.needsFixing > 0 ? <section className="worker-app-alert"><AlertTriangle /><div><b>Work sent back</b><span>{stats.needsFixing} job{stats.needsFixing === 1 ? "" : "s"} need fixing before approval.</span></div></section> : null}
        {error ? <section className="worker-app-alert danger"><AlertTriangle /><div><b>Could not load jobs</b><span>{error}</span></div></section> : null}
        {loading ? <section className="worker-app-empty"><RefreshCw className="spin" /><b>Loading your jobs…</b></section> : null}

        {!loading && !error && jobs.length === 0 ? <section className="worker-app-empty"><b>Waiting for dispatch</b><span>No jobs are assigned to you yet.</span><button type="button" onClick={fetchJobs}>Refresh jobs</button><button type="button" onClick={() => setShowContactOffice(true)}>Contact office</button></section> : null}

        <section className="worker-app-list" id="jobs">
          <h2>Today’s jobs</h2>
          {!loading && !error ? visibleTodayJobs.map((job) => <WorkerJobCard key={idOf(job)} job={job} busy={startingId} onAcknowledge={handleAcknowledge} onStart={handleTimerStart} />) : null}
        </section>

        <div className="worker-app-sync">Last synced: {lastSynced ? lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</div>
      </main>

      <WorkerContactOfficePanel open={showContactOffice} onClose={() => setShowContactOffice(false)} defaultMessage="I need help with my assigned jobs." />
      <WorkerBottomNav active="today" />
    </div>
  );
}
