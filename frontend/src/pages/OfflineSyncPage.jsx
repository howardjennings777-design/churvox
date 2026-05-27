// CHURVOX_OFFLINE_SYNC_PAGE_20260528
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

export default function OfflineSyncPage() {
  const [queue, setQueue] = useState(() => readQueue());
  const [status, setStatus] = useState("");

  const sampleAction = useMemo(() => ({
    id: `offline-${Date.now()}`,
    type: "worker_note",
    note: "Offline worker note queued for sync.",
    created_at: new Date().toISOString(),
  }), []);

  function addSample() {
    const next = [sampleAction, ...queue];
    saveQueue(next);
    setQueue(next);
    setStatus("Offline action queued.");
  }

  async function syncNow() {
    if (!queue.length) {
      setStatus("Nothing to sync.");
      return;
    }

    try {
      const result = await syncOfflineActions(queue);
      saveQueue([]);
      setQueue([]);
      setStatus(`Synced ${result.queued || queue.length} offline actions.`);
    } catch (err) {
      setStatus(err?.message || "Sync failed. Actions remain saved on this device.");
    }
  }

  function clearQueue() {
    saveQueue([]);
    setQueue([]);
    setStatus("Offline queue cleared.");
  }

  return (
    <main className="cos-shell" data-version="CHURVOX_OFFLINE_SYNC_PAGE_20260528">
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
          <b>{queue.length}</b>
          <em>{status || "Device-safe worker actions"}</em>
        </aside>
      </section>

      <section className="cos-actions">
        <button type="button" onClick={addSample}>Queue sample worker note</button>
        <button type="button" onClick={syncNow}>Sync now</button>
        <button type="button" onClick={clearQueue}>Clear queue</button>
      </section>

      <section className="cos-list">
        {queue.length ? queue.map((item) => (
          <article key={item.id} className="cos-card">
            <small>{item.type}</small>
            <h2>{item.note || "Offline action"}</h2>
            <p>{item.created_at}</p>
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
