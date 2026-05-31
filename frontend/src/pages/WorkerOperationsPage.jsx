import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { PremiumButton, PremiumCard, PremiumHero, PremiumPage } from "../components/premium";
import { AlertTriangle, Camera, CheckCircle, Clock, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import "./WorkerOperationsPage.css";

function arr(value) { return Array.isArray(value) ? value : []; }
function idOf(value) { return String(value?.id || value?._id || ""); }

function WorkerJobCard({ job, onStart, onPause, onResume, onComplete, onIssue, onMaterial }) {
  const [note, setNote] = useState("");
  const [material, setMaterial] = useState("");

  return (
    <article className="cv-worker-card">
      <header>
        <div>
          <small>{job.status || "assigned"}</small>
          <h3>{job.title || job.job_name || job.customer_name || "Job"}</h3>
          <p>{job.address || job.site_address || "No address saved"}</p>
        </div>
        <Link to={`/jobs/${idOf(job)}`}>Open</Link>
      </header>

      <section className="cv-worker-details">
        <p><b>Instructions:</b> {job.description || job.notes || job.site_instructions || "No instructions saved."}</p>
        {job.access_notes ? <p><b>Access:</b> {job.access_notes}</p> : null}
        {job.worker_completion_notes ? <p><b>Completion:</b> {job.worker_completion_notes}</p> : null}
        {job.cannot_complete_reason ? <p className="issue"><b>Issue:</b> {job.cannot_complete_reason}</p> : null}
      </section>

      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Completion note or issue reason..." />

      <div className="cv-worker-actions">
        <button type="button" onClick={() => onStart(job)}><Play size={14} /> Start</button>
        <button type="button" onClick={() => onPause(job)}>Pause</button>
        <button type="button" onClick={() => onResume(job)}>Resume</button>
        <button type="button" className="complete" onClick={() => onComplete(job, note)}><CheckCircle size={14} /> Complete</button>
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
  const [ops, setOps] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  async function loadOps() {
    setLoading(true);
    const res = await api.get("/worker/ops");
    if (res.success) setOps(res.data?.worker_ops || {});
    else toast.error(res.error || "Could not load worker jobs");
    setLoading(false);
  }

  useEffect(() => { loadOps(); }, []);

  const today = arr(ops.today_jobs);
  const active = arr(ops.active_jobs);
  const upcoming = arr(ops.upcoming_jobs);
  const completed = arr(ops.completed_jobs);
  const issues = arr(ops.issue_jobs);
  const metrics = ops.metrics || {};

  const visibleJobs = useMemo(() => [...active, ...today, ...upcoming].filter((job, index, list) => {
    const id = idOf(job);
    return id && list.findIndex((x) => idOf(x) === id) === index;
  }), [active, today, upcoming]);

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
    run("start", () => api.post(`/worker/jobs/${idOf(job)}/start-work`, {}));
  }

  function pause(job) {
    const reason = window.prompt("Pause reason?", "Paused by worker");
    if (reason === null) return;
    run("pause", () => api.post(`/worker/jobs/${idOf(job)}/pause-work`, { reason }));
  }

  function resume(job) {
    run("resume", () => api.post(`/worker/jobs/${idOf(job)}/resume-work`, {}));
  }

  function complete(job, note) {
    run("complete", () => api.post(`/worker/jobs/${idOf(job)}/complete-work`, { completion_notes: note }));
  }

  function issue(job, reason) {
    const finalReason = reason || window.prompt("Why can’t this job be completed?");
    if (!finalReason) return toast.error("Issue reason is required");
    run("issue", () => api.post(`/worker/jobs/${idOf(job)}/report-issue`, { reason: finalReason }));
  }

  function material(job, text) {
    if (!text.trim()) return toast.error("Add a material first");
    run("material", () => api.post(`/worker/jobs/${idOf(job)}/materials`, { name: text }));
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
              {completed.length ? completed.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/jobs/${idOf(job)}`}>{job.title || job.customer_name || "Completed job"}</Link>) : <div className="cv-worker-empty">No completed jobs yet.</div>}
            </PremiumCard>
            <PremiumCard title="Reported issues">
              {issues.length ? issues.slice(0, 8).map((job) => <Link key={idOf(job)} to={`/jobs/${idOf(job)}`}>{job.title || job.customer_name || "Issue job"}</Link>) : <div className="cv-worker-empty">No issues reported.</div>}
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
