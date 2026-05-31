import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, CalendarDays, RefreshCw, Route, UserPlus } from "lucide-react";
import { toast } from "sonner";
import "./DispatchBoardPage.css";

// CHURVOX_DISPATCH_NO_MISSING_BACKEND_ROUTE_20260601
// The old page called /api/dispatch-board, but that backend route does not exist live.
// This page now builds the dispatch board from stable existing endpoints: /jobs and /team/workers.

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}

function pickList(response, keys = []) {
  const data = response?.data ?? response;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
  }
  return arr(data);
}

function idOf(value) { return String(value?.id || value?._id || value?.uuid || ""); }
function nameOf(worker) { return worker?.display_name || worker?.name || worker?.full_name || worker?.email || "Worker"; }
function workerIdOf(job) { return String(job?.assigned_worker_id || job?.worker_id || job?.assigned_to || ""); }
function jobDateOf(job) { return String(job?.scheduled_date || job?.date || job?.start_date || job?.due_date || "").slice(0, 10); }
function jobTimeOf(job) { return job?.scheduled_time || job?.time || job?.start_time || "09:00"; }

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function labelDate(day) {
  if (!day || day === "unscheduled") return "Unscheduled";
  try {
    return new Date(`${day}T00:00:00`).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
  } catch {
    return day;
  }
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("complete")) return "green";
  if (s.includes("progress") || s.includes("start")) return "blue";
  if (s.includes("pause")) return "amber";
  if (s.includes("cancel") || s.includes("issue") || s.includes("cannot")) return "red";
  return "grey";
}

function isOpenJob(job) {
  const status = String(job?.status || job?.job_status || job?.workflow_status || "").toLowerCase();
  return !["completed", "complete", "done", "cancelled", "canceled", "paid"].includes(status);
}

function buildConflicts(jobs) {
  const active = jobs.filter(isOpenJob).filter((job) => workerIdOf(job));
  const groups = new Map();
  active.forEach((job) => {
    const key = `${workerIdOf(job)}|${jobDateOf(job) || "unscheduled"}|${jobTimeOf(job) || "09:00"}`;
    groups.set(key, [...(groups.get(key) || []), job]);
  });
  return Array.from(groups.values())
    .filter((items) => items.length > 1)
    .map((items) => ({ worker_id: workerIdOf(items[0]), jobs: items, count: items.length }));
}

function inDateRange(job, from, to) {
  const day = jobDateOf(job);
  if (!day) return true;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function JobChip({ job, workers, onAssign, onReschedule }) {
  const [workerId, setWorkerId] = useState(workerIdOf(job));
  const [date, setDate] = useState(jobDateOf(job));
  const [time, setTime] = useState(jobTimeOf(job));

  return (
    <article className={`cv-dispatch-job ${statusClass(job.status || job.job_status)}`}>
      <header>
        <div>
          <b>{job.title || job.job_name || job.customer_name || job.client_name || "Job"}</b>
          <span>{job.address || job.site_address || "No address"} · {job.status || "open"}</span>
          <small>{job.assigned_worker_name || job.worker_name || "Unassigned"} · {time || "No time"}</small>
        </div>
        <Link to={`/jobs/${idOf(job)}`}>Open</Link>
      </header>

      <div className="cv-dispatch-controls">
        <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
          <option value="">Choose worker</option>
          {workers.map((worker) => <option key={idOf(worker)} value={idOf(worker)}>{nameOf(worker)}</option>)}
        </select>
        <button type="button" onClick={() => onAssign(job, workerId)}>Assign</button>
        <input type="date" value={date || ""} onChange={(e) => setDate(e.target.value)} />
        <input type="time" value={time || ""} onChange={(e) => setTime(e.target.value)} />
        <button type="button" className="secondary" onClick={() => onReschedule(job, date, time)}>Reschedule</button>
      </div>
    </article>
  );
}

export default function DispatchBoardPage() {
  const api = useApi();
  const [dispatch, setDispatch] = useState({ jobs: [], workers: [], unassigned_jobs: [], conflicts: [], metrics: {} });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [from, setFrom] = useState(today(-1));
  const [to, setTo] = useState(today(14));
  const [workerFilter, setWorkerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  async function loadDispatch() {
    setLoading(true);

    const [jobsRes, workersRes] = await Promise.all([
      api.get("/jobs"),
      api.get("/team/workers"),
    ]);

    if (!jobsRes.success) toast.error(jobsRes.error || "Could not load jobs for dispatch");
    if (!workersRes.success) toast.error(workersRes.error || "Could not load workers for dispatch");

    const allJobs = pickList(jobsRes, ["jobs", "items", "results"]);
    const workers = pickList(workersRes, ["workers", "team", "items", "results"]);
    const jobs = allJobs.filter((job) => inDateRange(job, from, to));
    const unassigned = jobs.filter((job) => isOpenJob(job) && !workerIdOf(job));
    const conflicts = buildConflicts(jobs);
    const scheduledDays = new Set(jobs.map(jobDateOf).filter(Boolean)).size;

    setDispatch({
      jobs,
      workers,
      unassigned_jobs: unassigned,
      conflicts,
      metrics: {
        jobs: jobs.length,
        workers: workers.length,
        unassigned_jobs: unassigned.length,
        conflicts: conflicts.length,
        scheduled_days: scheduledDays,
      },
    });

    setLoading(false);
  }

  useEffect(() => { loadDispatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const workers = arr(dispatch.workers);
  const jobs = arr(dispatch.jobs);
  const conflicts = arr(dispatch.conflicts);
  const metrics = dispatch.metrics || {};

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const workerOk = !workerFilter || workerIdOf(job) === workerFilter;
      const statusOk = !statusFilter || String(job.status || job.job_status || "").toLowerCase().includes(statusFilter);
      const areaText = [job.address, job.site_address, job.region, job.area].join(" ").toLowerCase();
      const areaOk = !areaFilter || areaText.includes(areaFilter.toLowerCase());
      return workerOk && statusOk && areaOk;
    });
  }, [jobs, workerFilter, statusFilter, areaFilter]);

  const byDay = useMemo(() => {
    const map = {};
    filteredJobs.forEach((job) => {
      const day = jobDateOf(job) || "unscheduled";
      map[day] = map[day] || [];
      map[day].push(job);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredJobs]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("Dispatch updated");
      await loadDispatch();
      return res;
    }
    toast.error(res.error || "Dispatch action failed");
    return res;
  }

  async function assign(job, workerId) {
    if (!workerId) return toast.error("Choose a worker first");
    const worker = workers.find((w) => idOf(w) === String(workerId));
    return run("assign", () => api.patch(`/jobs/${idOf(job)}`, {
      assigned_worker_id: workerId,
      worker_id: workerId,
      assigned_worker_name: nameOf(worker),
      worker_name: nameOf(worker),
      status: job.status || "assigned",
    }));
  }

  async function reschedule(job, scheduledDate, scheduledTime) {
    if (!scheduledDate) return toast.error("Choose a date");
    return run("reschedule", () => api.patch(`/jobs/${idOf(job)}`, {
      scheduled_date: scheduledDate,
      date: scheduledDate,
      scheduled_time: scheduledTime || "09:00",
      estimated_duration: job.estimated_duration || job.duration_minutes || 60,
    }));
  }

  return (
    <PremiumPage maxWidth={1280}>
      <PremiumHero
        eyebrow="Dispatch board"
        title="Plan the day, assign crew and catch conflicts."
        subtitle="Jobs by day, worker, area and status with safe assign/reschedule controls."
        icon={<Route className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadDispatch} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-dispatch-metrics">
        <article><span>Jobs</span><b>{metrics.jobs || 0}</b><small>in range</small></article>
        <article><span>Workers</span><b>{metrics.workers || 0}</b><small>available list</small></article>
        <article className="amber"><span>Unassigned</span><b>{metrics.unassigned_jobs || 0}</b><small>needs worker</small></article>
        <article className="red"><span>Conflicts</span><b>{metrics.conflicts || 0}</b><small>overlap warnings</small></article>
        <article><span>Days</span><b>{metrics.scheduled_days || 0}</b><small>scheduled</small></article>
      </section>

      <section className="cv-dispatch-filters">
        <label><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label><span>Worker</span><select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}><option value="">All workers</option>{workers.map((w) => <option key={idOf(w)} value={idOf(w)}>{nameOf(w)}</option>)}</select></label>
        <label><span>Status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option><option value="assigned">Assigned</option><option value="progress">In progress</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="cancel">Cancelled</option></select></label>
        <label><span>Area</span><input value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Suburb / region" /></label>
        <button type="button" onClick={loadDispatch}>Apply</button>
      </section>

      {conflicts.length ? (
        <section className="cv-dispatch-conflicts">
          <AlertTriangle size={18} />
          <div>
            <b>{conflicts.length} worker conflict warning{conflicts.length === 1 ? "" : "s"}</b>
            <span>Open the affected jobs and reschedule or assign a different worker.</span>
          </div>
        </section>
      ) : null}

      {loading ? (
        <PremiumCard><div className="cv-dispatch-empty">Loading dispatch board…</div></PremiumCard>
      ) : (
        <section className="cv-dispatch-board">
          {byDay.length ? byDay.map(([day, dayJobs]) => (
            <PremiumCard key={day} title={labelDate(day)} icon={<CalendarDays className="h-5 w-5" />}>
              {dayJobs.map((job) => (
                <JobChip key={idOf(job)} job={job} workers={workers} onAssign={assign} onReschedule={reschedule} />
              ))}
            </PremiumCard>
          )) : <div className="cv-dispatch-empty">No jobs match the current filters.</div>}
        </section>
      )}

      <section className="cv-dispatch-side">
        <PremiumCard title="Unassigned quick list" icon={<UserPlus className="h-5 w-5" />}>
          {arr(dispatch.unassigned_jobs).length ? arr(dispatch.unassigned_jobs).slice(0, 12).map((job) => (
            <Link key={idOf(job)} to={`/jobs/${idOf(job)}`}>{job.title || job.customer_name || "Unassigned job"}</Link>
          )) : <div className="cv-dispatch-empty">No unassigned jobs.</div>}
        </PremiumCard>
      </section>
    </PremiumPage>
  );
}
