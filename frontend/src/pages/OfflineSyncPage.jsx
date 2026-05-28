// CHURVOX_OFFLINE_SYNC_PAGE_20260528
// CHURVOX_OFFLINE_SYNC_PRODUCTION_QUEUE_20260528
// CHURVOX_WORKER_OFFLINE_ACTION_QUEUE_EXPANSION_20260529
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { syncOfflineActions } from "../concept-c/churvoxTopTierApi";
import "./OfflineSyncPage.css";

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
  try {
    localStorage.setItem("churvox_offline_queue", JSON.stringify(items));
  } catch {}
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

function actionType(item) {
  return String(item?.type || "offline_action");
}

function actionTitle(item) {
  const type = actionType(item);
  return item?.title || actionLabels[type] || item?.note || item?.message || type || "Offline action";
}

function actionTone(item) {
  const type = actionType(item);
  if (type.includes("complete")) return "complete";
  if (type.includes("issue")) return "issue";
  if (type.includes("photo")) return "photo";
  if (type.includes("start") || type.includes("pause") || type.includes("resume")) return "time";
  return "note";
}

export default function OfflineSyncPage() {
  const [queue, setQueue] = useState(() => readQueue());
  const [status, setStatus] = useState("");
  const [lastResult, setLastResult] = useState(null);

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

    if (!latest.length) {
      setStatus("Nothing to sync.");
      return;
    }

    try {
      const result = await syncOfflineActions(latest);
      saveQueue([]);
      setQueue([]);
      setLastResult(result);
      setStatus(`Synced ${result.synced_count || result.queued || latest.length} offline action${latest.length === 1 ? "" : "s"}. Applied ${result.applied_count || 0} to job records.`);
    } catch (err) {
      setStatus(err?.message || "Sync failed. Actions remain saved on this device.");
    }
  }

  function clearQueue() {
    saveQueue([]);
    setQueue([]);
    setLastResult(null);
    setStatus("Offline queue cleared on this device.");
  }

  return (
    <main className="cos-shell" data-version="CHURVOX_OFFLINE_SYNC_PAGE_20260528 CHURVOX_OFFLINE_SYNC_PRODUCTION_QUEUE_20260528 CHURVOX_WORKER_OFFLINE_ACTION_QUEUE_EXPANSION_20260529">
      <section className="cos-hero">
        <div>
          <p>OFFLINE SYNC</p>
          <h1>Keep field work safe when signal drops.</h1>
          <span>
            Worker notes, starts, pauses, completions, issue reports and photo notes can be queued on device and synced back to Churvox when connection returns.
          </span>
        </div>
        <aside>
          <small>Queue</small>
          <b>{summary.total}</b>
          <em>{status || "Device-safe worker actions"}</em>
        </aside>
      </section>

      <section className="cos-summary">
        <article><small>Notes</small><b>{summary.notes}</b></article>
        <article><small>Job actions</small><b>{summary.jobActions}</b></article>
        <article><small>Completed</small><b>{summary.completions}</b></article>
        <article><small>Issues</small><b>{summary.issues}</b></article>
        <article><small>Photos</small><b>{summary.photos}</b></article>
      </section>

      {lastResult ? <section className="cos-result">Synced {lastResult.synced_count || lastResult.queued || 0}. Applied to jobs: {lastResult.applied_count || 0}.</section> : null}

      <section className="cos-actions">
        <button type="button" onClick={refreshQueue}>Refresh queue</button>
        <button type="button" onClick={syncNow}>Sync now</button>
        <button type="button" onClick={clearQueue}>Clear queue</button>
      </section>

      <section className="cos-list">
        {queue.length ? queue.map((item, index) => (
          <article key={item.id || index} className={`cos-card tone-${actionTone(item)}`}>
            <small>{actionType(item)}</small>
            <h2>{actionTitle(item)}</h2>
            <p>{item.job_id ? `Job: ${item.job_id}` : "Saved on this device until synced."}</p>
            {(item.note || item.message) ? <blockquote>{item.note || item.message}</blockquote> : null}
            <em>{niceDate(item.created_at || item.createdAt)}</em>
          </article>
        )) : (
          <article className="cos-card">
            <small>Clear</small>
            <h2>No offline actions waiting</h2>
            <p>When field actions are saved offline, they will appear here until synced.</p>
          </article>
        )}
      </section>

      <footer className="cos-footer">
        <Link to="/dashboard">Back to Command Floor</Link>
        <Link to="/operator-tools">Open AI Operator tools</Link>
      </footer>
    </main>
  );
}
