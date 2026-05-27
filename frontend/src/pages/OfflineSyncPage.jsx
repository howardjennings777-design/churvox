// CHURVOX_OFFLINE_SYNC_PAGE_20260528
// CHURVOX_OFFLINE_SYNC_PRODUCTION_QUEUE_20260528
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

function actionTitle(item) {
  return item?.note || item?.title || item?.message || item?.type || "Offline action";
}

export default function OfflineSyncPage() {
  const [queue, setQueue] = useState(() => readQueue());
  const [status, setStatus] = useState("");

  const summary = useMemo(() => {
    const workerNotes = queue.filter((item) => String(item?.type || "").includes("worker_note")).length;
    const jobActions = queue.filter((item) => String(item?.type || "").includes("job")).length;
    return { workerNotes, jobActions, total: queue.length };
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
      setStatus(`Synced ${result.queued || latest.length} offline action${latest.length === 1 ? "" : "s"}.`);
    } catch (err) {
      setStatus(err?.message || "Sync failed. Actions remain saved on this device.");
    }
  }

  function clearQueue() {
    saveQueue([]);
    setQueue([]);
    setStatus("Offline queue cleared on this device.");
  }

  return (
    <main className="cos-shell" data-version="CHURVOX_OFFLINE_SYNC_PAGE_20260528 CHURVOX_OFFLINE_SYNC_PRODUCTION_QUEUE_20260528">
      <section className="cos-hero">
        <div>
          <p>OFFLINE SYNC</p>
          <h1>Keep field work safe when signal drops.</h1>
          <span>
            Worker notes and actions can be queued on device and synced back to Churvox when connection returns.
          </span>
        </div>
        <aside>
          <small>Queue</small>
          <b>{summary.total}</b>
          <em>{status || "Device-safe worker actions"}</em>
        </aside>
      </section>

      <section className="cos-summary">
        <article><small>Worker notes</small><b>{summary.workerNotes}</b></article>
        <article><small>Job actions</small><b>{summary.jobActions}</b></article>
        <article><small>Total waiting</small><b>{summary.total}</b></article>
      </section>

      <section className="cos-actions">
        <button type="button" onClick={refreshQueue}>Refresh queue</button>
        <button type="button" onClick={syncNow}>Sync now</button>
        <button type="button" onClick={clearQueue}>Clear queue</button>
      </section>

      <section className="cos-list">
        {queue.length ? queue.map((item, index) => (
          <article key={item.id || index} className="cos-card">
            <small>{item.type || "offline action"}</small>
            <h2>{actionTitle(item)}</h2>
            <p>{item.job_id ? `Job: ${item.job_id}` : "Saved on this device until synced."}</p>
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
