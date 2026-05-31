// CHURVOX_OFFLINE_SYNC_STABLE_WIRING_20260601
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import "./OfflineSyncPage.css";

// Offline sync now applies safe job updates through stable /jobs/:id PATCH calls.
// Photo binary upload and provider-specific offline sends stay queued until their real
// upload/send endpoints are proven.

function readQueue() {
  try {
    const raw = localStorage.getItem("churvox_offline_queue");
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(items) {
  try { localStorage.setItem("churvox_offline_queue", JSON.stringify(items)); } catch {}
}

function niceDate(value) {
  if (!value) return "Time not recorded";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" });
}

const actionLabels = {
  worker_note: "Worker note",
  job_note: "Job note",
  job_start: "Start job",
  start_job: "Start job",
  job_pause: "Pause job",
  pause_job: "Pause job",
  job_resume: "Resume job",
  resume_job: "Resume job",
  job_complete: "Complete job",
  complete_job: "Complete job",
  job_issue: "Issue report",
  issue_report: "Issue report",
  photo_upload: "Photo upload pending",
  job_photo: "Photo upload pending",
};

function actionType(item) { return String(item?.type || "offline_action"); }
function actionTitle(item) { const type = actionType(item); return item?.title || actionLabels[type] || item?.note || item?.message || type || "Offline action"; }
function actionTone(item) { const type = actionType(item); if (type.includes("complete")) return "complete"; if (type.includes("issue")) return "issue"; if (type.includes("photo")) return "photo"; if (type.includes("start") || type.includes("pause") || type.includes("resume")) return "time"; return "note"; }
function jobIdOf(item) { return item?.job_id || item?.jobId || item?.target_id || item?.id || ""; }
function stamp() { return new Date().toISOString(); }

function patchFor(item) {
  const type = actionType(item);
  const note = item.note || item.message || actionTitle(item);
  const when = item.created_at || item.createdAt || stamp();
  const baseNote = `${niceDate(when)} · ${actionLabels[type] || type}: ${note}`;
  if (type.includes("photo")) return null;
  if (type.includes("complete")) return { status: "completed", completed_at: when, worker_completion_note: note, latest_worker_note: baseNote };
  if (type.includes("start")) return { status: "in_progress", started_at: when, latest_worker_note: baseNote };
  if (type.includes("pause")) return { status: "paused", paused_at: when, latest_worker_note: baseNote };
  if (type.includes("resume")) return { status: "in_progress", resumed_at: when, latest_worker_note: baseNote };
  if (type.includes("issue")) return { latest_issue_note: baseNote, latest_worker_note: baseNote, has_worker_issue: true };
  if (type.includes("note")) return { latest_worker_note: baseNote };
  return { latest_worker_note: baseNote };
}

export default function OfflineSyncPage() {
  const api = useApi();
  const [queue, setQueue] = useState(() => readQueue());
  const [status, setStatus] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => {
    const notes = queue.filter((item) => ["worker_note", "job_note"].includes(actionType(item))).length;
    const jobActions = queue.filter((item) => /job_|start_job|pause_job|resume_job|complete_job/.test(actionType(item))).length;
    const completions = queue.filter((item) => actionType(item).includes("complete")).length;
    const issues = queue.filter((item) => actionType(item).includes("issue")).length;
    const photos = queue.filter((item) => actionType(item).includes("photo")).length;
    return { notes, jobActions, completions, issues, photos, total: queue.length };
  }, [queue]);

  function refreshQueue() {
    const next = readQueue();
    setQueue(next);
    setStatus(`Queue refreshed. ${next.length} item${next.length === 1 ? "" : "s"} waiting.`);
  }

  async function syncNow() {
    const latest = readQueue();
    setQueue(latest);
    if (!latest.length) { setStatus("Nothing to sync."); return; }

    setBusy(true);
    let applied = 0;
    const failed = [];
    const stillQueued = [];

    for (const item of latest) {
      const jobId = jobIdOf(item);
      const patch = patchFor(item);
      if (!jobId || !patch) {
        stillQueued.push(item);
        continue;
      }
      const res = await api.patch(`/jobs/${encodeURIComponent(jobId)}`, patch);
      if (res.success) applied += 1;
      else failed.push({ ...item, last_error: res.error || "Sync failed" });
    }

    const nextQueue = [...failed, ...stillQueued];
    saveQueue(nextQueue);
    setQueue(nextQueue);
    const result = { queued: latest.length, applied_count: applied, failed_count: failed.length, still_queued: stillQueued.length };
    setLastResult(result);
    setStatus(`Checked ${latest.length}. Applied ${applied} to job records. ${nextQueue.length} item${nextQueue.length === 1 ? "" : "s"} remain queued.`);
    setBusy(false);
  }

  function clearQueue() {
    saveQueue([]);
    setQueue([]);
    setLastResult(null);
    setStatus("Offline queue cleared on this device.");
  }

  return (
    <main className="cos-shell" data-version="CHURVOX_OFFLINE_SYNC_STABLE_WIRING_20260601">
      <section className="cos-hero"><div><p>OFFLINE SYNC</p><h1>Keep field work safe when signal drops.</h1><span>Worker notes, starts, pauses, completions and issue reports can be queued on device and applied back to job records when connection returns. Photo uploads remain queued until a real upload endpoint is available.</span></div><aside><small>Queue</small><b>{summary.total}</b><em>{status || "Device-safe worker actions"}</em></aside></section>
      <section className="cos-summary"><article><small>Notes</small><b>{summary.notes}</b></article><article><small>Job actions</small><b>{summary.jobActions}</b></article><article><small>Completed</small><b>{summary.completions}</b></article><article><small>Issues</small><b>{summary.issues}</b></article><article><small>Photos</small><b>{summary.photos}</b></article></section>
      {lastResult ? <section className="cos-result">Checked {lastResult.queued || 0}. Applied to jobs: {lastResult.applied_count || 0}. Failed: {lastResult.failed_count || 0}. Still queued: {lastResult.still_queued || 0}.</section> : null}
      <section className="cos-actions"><button type="button" onClick={refreshQueue} disabled={busy}>Refresh queue</button><button type="button" onClick={syncNow} disabled={busy}>{busy ? "Syncing…" : "Sync now"}</button><button type="button" onClick={clearQueue} disabled={busy}>Clear queue</button></section>
      <section className="cos-list">{queue.length ? queue.map((item, index) => (<article key={item.id || index} className={`cos-card tone-${actionTone(item)}`}><small>{actionType(item)}</small><h2>{actionTitle(item)}</h2><p>{jobIdOf(item) ? `Job: ${jobIdOf(item)}` : "Saved on this device until synced."}</p>{(item.note || item.message) ? <blockquote>{item.note || item.message}</blockquote> : null}{item.last_error ? <blockquote>{item.last_error}</blockquote> : null}<em>{niceDate(item.created_at || item.createdAt)}</em></article>)) : (<article className="cos-card"><small>Clear</small><h2>No offline actions waiting</h2><p>When field actions are saved offline, they will appear here until synced.</p></article>)}</section>
      <footer className="cos-footer"><Link to="/dashboard">Back to Command Floor</Link><Link to="/operator-tools">Open AI Operator tools</Link></footer>
    </main>
  );
}
