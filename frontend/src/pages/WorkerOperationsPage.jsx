import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { useAuth } from "../context/AuthContext";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, Camera, CheckCircle, Clock, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import "./WorkerOperationsPage.css";

// CHURVOX_WORKER_OPS_STABLE_JOBS_20260601
// This page no longer depends on a custom /worker/ops backend route.
// It builds the worker operations view from stable /jobs and patches job records.

function arr(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.jobs)) return value.jobs;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  return [];
}
function oid(value) { if (!value) return ""; if (typeof value === "object" && value.$oid) return String(value.$oid); return String(value); }
function idOf(value) { return oid(value?.id || value?._id || value?.uuid || value?.job_id); }
function lower(value) { return String(value || "").trim().toLowerCase(); }
function statusOf(job) { return lower(job?.status || job?.job_status || job?.workflow_status || "assigned"); }
function dateOf(job) { return String(job?.scheduled_date || job?.date || job?.scheduled_at || "").slice(0, 10); }
function today() { return new Date().toISOString().slice(0, 10); }
function userKeys(user) {
  return [user?.id, user?._id, user?.uuid, user?.worker_id, user?.team_member_id, user?.email, user?.name, user?.full_name, user?.display_name]
    .map((v) => lower(oid(v))).filter(Boolean);
}
function assignmentKeys(job) {
  return [job?.assigned_worker_id, job?.worker_id, job?.assigned_to, job?.assignedWorkerId, job?.assigned_worker_email, job?.worker_email, job?.assigned_to_email, job?.assigned_worker_name, job?.worker_name, job?.assigned_to_name]
    .map((v) => lower(oid(v))).filter(Boolean);
}
function assignedToMe(job, user) {
  const mine = userKeys(user);
  const assigned = assignmentKeys(job);
  if (!mine.length || !assigned.length) return false;
  return assigned.some((key) => mine.includes(key));
}
function scopeJobs(rawJobs, user) {
  const list = arr(rawJobs);
  const scoped = list.filter((job) => assignedToMe(job, user));
  const anyAssigned = list.some((job) => assignmentKeys(job).length > 0);
  if (scoped.length) return scoped;
  if (anyAssigned) return [];
  return list;
}
function isOpen(job) { return !["completed", "complete", "done", "cancelled", "canceled"].includes(statusOf(job)); }
function isIssue(job) { return Boolean(job?.cannot_complete_reason || job?.issue_reason || job?.blocked_reason) || statusOf(job).includes("issue"); }

function WorkerJobCard({ job, onStart, onPause, onResume, onComplete, onIssue, onMaterial }) {
  const [note, setNote] = useState("");
  const [material, setMaterial] = useState("");
  const status = statusOf(job);

  return (
    <article className="cv-worker-card">
      <header>
        <div>
          <small>{job.status || "assigned"}</small>
          <h3>{job.title || job.job_name || job.customer_name || "Job"}</h3>
          <p>{job.address || job.site_address || "No address saved"}</p>
        </div>
        <Link to={`/worker/jobs/${idOf(job)}`}>Open</Link>
      </header>

      <section className="cv-worker-details">
        <p><b>Instructions:</b> {job.description || job.notes || job.site_instructions || "No instructions saved."}</p>
        {job.access_notes ? <p><b>Access:</b> {job.access_notes}</p> : null}
        {job.worker_completion_notes || job.worker_notes ? <p><b>Completion:</b> {job.worker_completion_notes || job.worker_notes}</p> : null}
        {job.cannot_complete_reason ? <p className="issue"><b>Issue:</b> {job.cannot_complete_reason}</p> : null}
      </section>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Completion note or issue reason..." />

      <div className="cv-worker-actions">
        <button type="button" onClick={() => onStart(job)} disabled={status === "in_progress" || status === "completed"}><Play size={14} /> Start</button>
        <button type="button" onClick={() => onPause(job)} disabled={status !== "in_progress"}>Pause</button>
        <button type="button" onClick={() => onResume(job)} disabled={status !== "paused"}>Resume</button>
        <button type="button" className="complete" onClick={() => onComplete(job, note)} disabled={status === "completed"}><CheckCircle size={14} /> Complete</button>
        <button type="button" className="issue" onClick={() => onIssue(job, note)}><AlertTriangle size={14} /> Issue</button>
      </div>

      <div className="cv-worker-material">
        <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Material used, e.g. 2 bags mulch" />
        <button type="button" onClick={() => { onMaterial(job, material); setMaterial(""); }}>Add material</button>
      </div>
    </article>
  );
}

export default function WorkerOperationsPage() {
  const api = useApi();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const loadOps = useCallback(async () => {
    setLoading(true);
    const res = await api.get("/jobs");
    if (res.success) setJobs(scopeJobs(res.data, user));
    else toast.error(res.error || "Could not load worker jobs");
    setLoading(false);
  }, [api, user]);

  useEffect(() => { loadOps(); }, [loadOps]);

  const todayKey = today();
  const todayJobs = jobs.filter((job) => isOpen(job) && (!dateOf(job) || dateOf(job) === todayKey));
  const active = jobs.filter((job) => ["in_progress", "in progress", "started", "paused"].includes(statusOf(job)));
  const upcoming = jobs.filter((job) => isOpen(job) && dateOf(job) && dateOf(job) > todayKey);
  const completed = jobs.filter((job) => ["completed", "complete", "done"].includes(statusOf(job)));
  const issues = jobs.filter(isIssue);

  const metrics = useMemo(() => ({
    today: todayJobs.length,
    active: active.length,
    upcoming: upcoming.length,
    completed: completed.length,
    issues: issues.length,
  }), [todayJobs.length, active.length, upcoming.length, completed.length, issues.length]);

  const visibleJobs = useMemo(() => [...active, ...todayJobs, ...upcoming].filter((job, index, list) => {
    const id = idOf(job);
    return id && list.findIndex((x) => idOf(x) === id) === index;
  }), [active, todayJobs, upcoming]);

  async function run(label, fn) {
    setBusy(label);
    const res = await fn();
    setBusy("");
    if (res.success) {
      toast.success("Job updated");
      await loadOps();
      return res;
    }
    toast.error(res.error || "Job update failed");
    return res;
  }

  function start(job) {
    run("start", () => api.patch(`/jobs/${encodeURIComponent(idOf(job))}`, { status: "in_progress", started_at: new Date().toISOString() }));
  }

  function pause(job) {
    const reason = window.prompt("Pause reason?", "Paused by worker");
    if (reason === null) return;
    run("pause", () => api.patch(`/jobs/${encodeURIComponent(idOf(job))}`, { status: "paused", pause_reason: reason, paused_at: new Date().toISOString() }));
  }

  function resume(job) {
    run("resume", () => api.patch(`/jobs/${encodeURIComponent(idOf(job))}`, { status: "in_progress", resumed_at: new Date().toISOString() }));
  }

  function complete(job, note) {
    const now = new Date().toISOString();
    run("complete", () => api.patch(`/jobs/${encodeURIComponent(idOf(job))}`, {
      status: "completed",
      completed: true,
      completed_at: now,
      worker_notes: note || job.worker_notes || "",
      worker_completion_notes: note || job.worker_completion_notes || "",
      work_review_status: "ready_for_review",
      review_status: "ready_for_review",
      owner_review_status: "ready_for_review",
    }));
  }

  function issue(job, reason) {
    const finalReason = reason || window.prompt("Why can’t this job be completed?");
    if (!finalReason) return toast.error("Issue reason is required");
    run("issue", () => api.patch(`/jobs/${encodeURIComponent(idOf(job))}`, { status: "issue", cannot_complete_reason: finalReason, issue_reported_at: new Date().toISOString() }));
  }

  function material(job, text) {
    if (!text.trim()) return toast.error("Add a material first");
    const existing = Array.isArray(job.materials) ? job.materials : [];
    run("material", () => api.patch(`/jobs/${encodeURIComponent(idOf(job))}`, { materials: [...existing, { name: text, added_at: new Date().toISOString() }] }));
  }

  return (
    <PremiumPage maxWidth={980}>
      <PremiumHero
        eyebrow="Worker app"
        title="Today’s jobs, proof and completion."
        subtitle="Workers can start, pause, resume, complete, add materials and report issues without seeing owner pricing or invoice values."
        icon={<Clock className="h-6 w-6" />}
        actions={<PremiumButton variant="secondary" onClick={loadOps} disabled={loading || Boolean(busy)}><RefreshCw size={16} className="mr-2" /> Refresh</PremiumButton>}
      />

      <section className="cv-worker-metrics">
        <article><span>Today</span><b>{metrics.today || 0}</b></article>
        <article><span>Active</span><b>{metrics.active || 0}</b></article>
        <article><span>Upcoming</span><b>{metrics.upcoming || 0}</b></article>
        <article><span>Completed</span><b>{metrics.completed || 0}</b></article>
        <article className="issue"><span>Issues</span><b>{metrics.issues || 0}</b></article>
      </section>

      {loading ? (
        <PremiumCard><div className="cv-worker-empty">Loading worker jobs…</div></PremiumCard>
      ) : (
        <>
          <section className="cv-worker-list">
            {visibleJobs.length ? visibleJobs.map((job) => (
              <WorkerJobCard key={idOf(job)} job={job} onStart={start} onPause={pause} onResume={resume} onComplete={complete} onIssue={issue} onMaterial={material} />
            )) : <div className="cv-worker-empty">No assigned jobs right now.</div>}
          </section>

          <section className="cv-worker-history">
            <PremiumCard title="Completed recently">
              {completed.length ? completed.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/worker/jobs/${idOf(job)}`}>{job.title || job.customer_name || "Completed job"}</Link>) : <div className="cv-worker-empty">No completed jobs yet.</div>}
            </PremiumCard>
            <PremiumCard title="Reported issues">
              {issues.length ? issues.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/worker/jobs/${idOf(job)}`}>{job.title || job.customer_name || "Issue job"}</Link>) : <div className="cv-worker-empty">No issues reported.</div>}
            </PremiumCard>
          </section>
        </>
      )}

      <section className="cv-worker-note">
        <Camera size={18} />
        <span>Photo upload support stays on the job detail/photo flow. This worker ops page keeps the daily actions fast and safe.</span>
      </section>
    </PremiumPage>
  );
}
