import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, CalendarDays, RefreshCw, Route, UserPlus } from "lucide-react";
import { toast } from "sonner";
import "./DispatchBoardPage.css";

// CHURVOX_DISPATCH_STABLE_JOB_RECORD_WIRING_20260601
// No dead /api/dispatch-board dependency.
// Dispatch is built from stable live records: GET /jobs + GET /team/workers.
// Saving dispatch patches the real job record with worker + date/time together.

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.workers)) return value.workers;
  if (Array.isArray(value?.team)) return value.team;
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

function oid(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.$oid) return String(value.$oid);
  return String(value);
}

function idOf(value) {
  return oid(value?.id || value?._id || value?.uuid || value?.job_id || value?.worker_id);
}

function nameOf(worker) {
  return worker?.display_name || worker?.name || worker?.full_name || worker?.first_name || worker?.email || "Worker";
}

function workerIdOf(job) {
  return oid(
    job?.assigned_worker_id ||
    job?.worker_id ||
    job?.assigned_to ||
    job?.assignedWorkerId ||
    job?.worker?.id ||
    job?.worker?._id ||
    job?.assigned_worker?.id ||
    job?.assigned_worker?._id
  );
}

function workerNameOf(job) {
  return job?.assigned_worker_name || job?.worker_name || job?.assigned_to_name || job?.worker?.name || job?.assigned_worker?.name || "Unassigned";
}

function dateOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes("T")) return raw.slice(0, 10);
  return raw.slice(0, 10);
}

function timeOnly(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  if (raw.includes("T")) return raw.split("T")[1]?.slice(0, 5) || "";
  return raw.slice(0, 5);
}

function jobDateOf(job) {
  return dateOnly(job?.scheduled_date || job?.scheduled_at || job?.date || job?.start_date || job?.due_date);
}

function jobTimeOf(job) {
  return (
    timeOnly(job?.scheduled_time) ||
    timeOnly(job?.time) ||
    timeOnly(job?.start_time) ||
    timeOnly(job?.scheduled_at) ||
    timeOnly(job?.scheduled_date) ||
    "09:00"
  );
}

function today(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function labelDate(day) {
  if (!day || day === "unscheduled") return "Unscheduled";
  try {
    return new Date(`${day}T00:00:00`).toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
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
    .map((items) => ({
      worker_id: workerIdOf(items[0]),
      date: jobDateOf(items[0]) || "unscheduled",
      time: jobTimeOf(items[0]) || "09:00",
      jobs: items,
      count: items.length,
    }));
}

function inDateRange(job, from, to) {
  const day = jobDateOf(job);
  if (!day) return true;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function dispatchPayload(job, worker, workerId, scheduledDate, scheduledTime) {
  const cleanWorkerId = workerId ? String(workerId) : null;
  const cleanWorkerName = cleanWorkerId && worker ? nameOf(worker) : "";
  const cleanDate = scheduledDate || null;
  const cleanTime = scheduledTime || "09:00";
  const existingStatus = String(job?.status || job?.job_status || "").toLowerCase();
  const shouldMarkAssigned = cleanWorkerId && (!existingStatus || ["open", "new", "unassigned"].includes(existingStatus));

  return {
    assigned_worker_id: cleanWorkerId,
    worker_id: cleanWorkerId,
    assigned_to: cleanWorkerId,
    assigned_worker_name: cleanWorkerName,
    worker_name: cleanWorkerName,
    assigned_to_name: cleanWorkerName,
    scheduled_date: cleanDate,
    date: cleanDate,
    scheduled_time: cleanTime,
    time: cleanTime,
    start_time: cleanTime,
    scheduled_at: cleanDate ? `${cleanDate}T${cleanTime}` : null,
    status: shouldMarkAssigned ? "assigned" : job?.status || "assigned",
  };
}

function conflictMessage(jobs, job, workerId, scheduledDate, scheduledTime) {
  if (!workerId || !scheduledDate) return "";
  const currentId = idOf(job);
  const cleanTime = scheduledTime || "09:00";

  const clashes = jobs.filter((other) => {
    if (idOf(other) === currentId) return false;
    if (!isOpenJob(other)) return false;
    return (
      workerIdOf(other) === String(workerId) &&
      (jobDateOf(other) || "") === scheduledDate &&
      (jobTimeOf(other) || "09:00") === cleanTime
    );
  });

  if (!clashes.length) return "";

  const names = clashes
    .slice(0, 3)
    .map((item) => item.title || item.job_name || item.client_name || item.customer_name || "another job")
    .join(", ");

  return `This worker already has ${clashes.length} open job${clashes.length === 1 ? "" : "s"} at ${scheduledDate} ${cleanTime}: ${names}. Save anyway?`;
}

function JobChip({ job, workers, allJobs, onSave, busy }) {
  const [workerId, setWorkerId] = useState(workerIdOf(job));
  const [date, setDate] = useState(jobDateOf(job));
  const [time, setTime] = useState(jobTimeOf(job));

  useEffect(() => {
    setWorkerId(workerIdOf(job));
    setDate(jobDateOf(job));
    setTime(jobTimeOf(job));
  }, [job]);

  const jobId = idOf(job);
  const isSaving = busy === jobId;

  function save() {
    const warning = conflictMessage(allJobs, job, workerId, date, time);
    if (warning && !window.confirm(warning)) return;
    onSave(job, { workerId, date, time });
  }

  return (
    <article className={`cv-dispatch-job ${statusClass(job.status || job.job_status)}`}>
      <header>
        <div>
          <b>{job.title || job.job_name || job.customer_name || job.client_name || "Job"}</b>
          <span>{job.address || job.site_address || "No address"} · {job.status || "open"}</span>
          <small>{workerNameOf(job)} · {time || "No time"}</small>
        </div>
        <Link to={`/jobs/${jobId}`}>Open</Link>
      </header>

      <div className="cv-dispatch-controls">
        <select value={workerId || ""} onChange={(e) => setWorkerId(e.target.value)} disabled={isSaving}>
          <option value="">Unassigned</option>
          {workers.map((worker) => (
            <option key={idOf(worker)} value={idOf(worker)}>{nameOf(worker)}</option>
          ))}
        </select>

        <input type="date" value={date || ""} onChange={(e) => setDate(e.target.value)} disabled={isSaving} />
        <input type="time" value={time || ""} onChange={(e) => setTime(e.target.value)} disabled={isSaving} />

        <button type="button" onClick={save} disabled={isSaving || !jobId}>
          {isSaving ? "Saving..." : "Save dispatch"}
        </button>
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

    try {
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
    } catch (err) {
      console.error("Dispatch board load failed:", err);
      toast.error("Could not load dispatch board");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDispatch();
    // First load only. Apply/Refresh reloads with current filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const workers = arr(dispatch.workers);
  const jobs = arr(dispatch.jobs);
  const conflicts = arr(dispatch.conflicts);
  const metrics = dispatch.metrics || {};

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const workerOk = !workerFilter || workerIdOf(job) === workerFilter;
      const statusText = String(job.status || job.job_status || job.workflow_status || "").toLowerCase();
      const statusOk = !statusFilter || statusText.includes(statusFilter);
      const areaText = [job.address, job.site_address, job.region, job.area, job.suburb].join(" ").toLowerCase();
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

    Object.values(map).forEach((items) => {
      items.sort((a, b) => String(jobTimeOf(a)).localeCompare(String(jobTimeOf(b))));
    });

    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredJobs]);

  async function saveDispatch(job, values) {
    const jobId = idOf(job);
    if (!jobId) return toast.error("Missing job ID");

    const worker = workers.find((w) => idOf(w) === String(values.workerId));
    const payload = dispatchPayload(job, worker, values.workerId, values.date, values.time);

    setBusy(jobId);
    const res = await api.patch(`/jobs/${encodeURIComponent(jobId)}`, payload);
    setBusy("");

    if (res.success) {
      toast.success("Dispatch updated");
      await loadDispatch();
      return;
    }

    toast.error(res.error || "Could not update dispatch");
  }

  return (
    <PremiumPage maxWidth={1280}>
      <PremiumHero
        eyebrow="Dispatch board"
        title="Plan the day, assign crew and catch conflicts."
        subtitle="Live jobs from /jobs, live workers from /team/workers, and every dispatch change saves back to the job record."
        icon={<Route className="h-6 w-6" />}
        actions={
          <PremiumButton variant="secondary" onClick={loadDispatch} disabled={loading || Boolean(busy)}>
            <RefreshCw size={16} className="mr-2" /> Refresh
          </PremiumButton>
        }
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
        <label>
          <span>Worker</span>
          <select value={workerFilter} onChange={(e) => setWorkerFilter(e.target.value)}>
            <option value="">All workers</option>
            {workers.map((w) => <option key={idOf(w)} value={idOf(w)}>{nameOf(w)}</option>)}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="assigned">Assigned</option>
            <option value="progress">In progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancel">Cancelled</option>
          </select>
        </label>
        <label><span>Area</span><input value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} placeholder="Suburb / region" /></label>
        <button type="button" onClick={loadDispatch} disabled={loading || Boolean(busy)}>Apply</button>
      </section>

      {conflicts.length ? (
        <section className="cv-dispatch-conflicts">
          <AlertTriangle size={18} />
          <div>
            <b>{conflicts.length} worker conflict warning{conflicts.length === 1 ? "" : "s"}</b>
            <span>Same worker, same date and same time. Open the affected jobs or save a new dispatch time.</span>
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
                <JobChip
                  key={idOf(job)}
                  job={job}
                  workers={workers}
                  allJobs={jobs}
                  onSave={saveDispatch}
                  busy={busy}
                />
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
