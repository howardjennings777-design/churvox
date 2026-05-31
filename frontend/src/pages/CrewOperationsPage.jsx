import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, Clock, HardHat, RefreshCw, UserCheck } from "lucide-react";
import { toast } from "sonner";
import "./CrewOperationsPage.css";

function arr(value) { return Array.isArray(value) ? value : []; }
function idOf(value) { return String(value?.id || value?._id || ""); }
function nameOf(worker) { return worker?.display_name || worker?.name || worker?.full_name || worker?.email || "Worker"; }

function statusLabel(status) {
  const s = String(status || "").replaceAll("_", " ");
  return s || "open";
}

function JobRow({ job, workers, onAssign, actionLabel, onAction }) {
  const [workerId, setWorkerId] = useState(job.assigned_worker_id || job.worker_id || "");
  return (
    <div className="cv-crew-job-row">
      <div>
        <b>{job.title || job.job_name || job.customer_name || job.client_name || "Job"}</b>
        <span>{statusLabel(job.status || job.job_status)} · {job.address || job.site_address || "No address"}</span>
        {job.assigned_worker_name ? <small>Assigned to {job.assigned_worker_name}</small> : <small>Unassigned</small>}
      </div>
      <div className="cv-crew-job-actions">
        <select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
          <option value="">Choose worker</option>
          {workers.map((worker) => <option key={idOf(worker)} value={idOf(worker)}>{nameOf(worker)}</option>)}
        </select>
        <button type="button" onClick={() => onAssign(job, workerId)}>Assign</button>
        {onAction ? <button type="button" className="secondary" onClick={() => onAction(job)}>{actionLabel}</button> : null}
        <Link to={`/jobs/${idOf(job)}`}>Open</Link>
      </div>
    </div>
  );
}

export default function CrewOperationsPage() {
  const api = useApi();
  const [crew, setCrew] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadCrew() {
    setLoading(true);
    const res = await api.get("/crew-ops");
    if (res.success) setCrew(res.data?.crew_ops || {});
    else toast.error(res.error || "Could not load crew operations");
    setLoading(false);
  }

  useEffect(() => { loadCrew(); }, []);

  const workers = arr(crew.workers);
  const unassigned = arr(crew.unassigned_jobs);
  const active = arr(crew.active_jobs);
  const review = arr(crew.completed_needing_review);
  const issues = arr(crew.issue_jobs);
  const metrics = crew.metrics || {};

  const workerGroups = useMemo(() => {
    return {
      available: workers.filter((w) => w.summary?.status === "available"),
      onJob: workers.filter((w) => w.summary?.status === "on_job"),
      busy: workers.filter((w) => w.summary?.status === "busy_today"),
    };
  }, [workers]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      if (res.data?.has_conflict) toast.warning("Assigned, but this worker has a possible schedule conflict.");
      else toast.success("Crew updated");
      await loadCrew();
      return res;
    }
    toast.error(res.error || "Crew action failed");
    return res;
  }

  async function assignWorker(job, workerId) {
    if (!workerId) return toast.error("Choose a worker first");
    const worker = workers.find((w) => idOf(w) === String(workerId));
    await run("assign", () => api.post(`/crew-ops/jobs/${idOf(job)}/assign-worker`, {
      worker_id: workerId,
      worker_name: nameOf(worker),
    }));
  }

  async function approveJob(job) {
    await run("approve", () => api.post(`/jobs/${idOf(job)}/approve-completion`));
  }

  return (
    <PremiumPage maxWidth={1240}>
      <PremiumHero
        eyebrow="Crew operations"
        title="Run the field team without exposing owner-only money."
        subtitle="See worker availability, unassigned jobs, active work, completed proof, issues and payroll-ready time summaries."
        icon={<HardHat className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadCrew} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-crew-metrics">
        <article><span>Workers</span><b>{metrics.workers || 0}</b><small>total crew</small></article>
        <article className="green"><span>Available</span><b>{metrics.available_workers || 0}</b><small>ready for work</small></article>
        <article className="blue"><span>Active jobs</span><b>{metrics.active_jobs || 0}</b><small>in progress</small></article>
        <article className="amber"><span>Unassigned</span><b>{metrics.unassigned_jobs || 0}</b><small>needs dispatch</small></article>
        <article className="red"><span>Issues</span><b>{metrics.issue_jobs || 0}</b><small>worker blocked</small></article>
        <article><span>Payroll hours</span><b>{metrics.payroll_hours || 0}</b><small>tracked</small></article>
      </section>

      <section className="cv-crew-grid">
        <PremiumCard title="Worker availability" icon={<UserCheck className="h-5 w-5" />}>
          <div className="cv-crew-worker-groups">
            {[
              ["Available", workerGroups.available],
              ["On job", workerGroups.onJob],
              ["Busy today", workerGroups.busy],
            ].map(([label, list]) => (
              <div key={label}>
                <h3>{label}</h3>
                {list.length ? list.map((worker) => (
                  <div className="cv-crew-worker" key={idOf(worker)}>
                    <b>{nameOf(worker)}</b>
                    <span>{worker.email || worker.phone || worker.role || "Crew member"}</span>
                    <small>{worker.summary?.assigned_count || 0} assigned · {worker.summary?.tracked_hours || 0}h tracked</small>
                  </div>
                )) : <div className="cv-crew-empty">None</div>}
              </div>
            ))}
          </div>
        </PremiumCard>

        <PremiumCard title="Unassigned jobs" icon={<AlertTriangle className="h-5 w-5" />}>
          {unassigned.length ? unassigned.map((job) => (
            <JobRow key={idOf(job)} job={job} workers={workers} onAssign={assignWorker} />
          )) : <div className="cv-crew-empty">No unassigned jobs.</div>}
        </PremiumCard>

        <PremiumCard title="Active field work" icon={<Clock className="h-5 w-5" />}>
          {active.length ? active.map((job) => (
            <JobRow key={idOf(job)} job={job} workers={workers} onAssign={assignWorker} />
          )) : <div className="cv-crew-empty">No active jobs right now.</div>}
        </PremiumCard>

        <PremiumCard title="Completed jobs needing owner review" icon={<UserCheck className="h-5 w-5" />}>
          {review.length ? review.map((job) => (
            <JobRow key={idOf(job)} job={job} workers={workers} onAssign={assignWorker} actionLabel="Approve completion" onAction={approveJob} />
          )) : <div className="cv-crew-empty">No completed work waiting for review.</div>}
        </PremiumCard>

        <PremiumCard title="Worker issues / cannot complete" icon={<AlertTriangle className="h-5 w-5" />}>
          {issues.length ? issues.map((job) => (
            <JobRow key={idOf(job)} job={job} workers={workers} onAssign={assignWorker} />
          )) : <div className="cv-crew-empty">No worker issues reported.</div>}
        </PremiumCard>
      </section>
    </PremiumPage>
  );
}
