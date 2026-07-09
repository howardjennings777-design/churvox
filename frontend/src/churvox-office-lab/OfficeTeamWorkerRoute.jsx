import React, { useMemo, useState } from "react";
import "./OfficeTeamWorkerRoute.css";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const statusSteps = ["Acknowledge", "Start", "Pause", "Complete"];

export default function OfficeTeamWorkerRoute() {
  const live = useOfficeTeamRows("worker", []);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [note, setNote] = useState("");
  const [trail, setTrail] = useState([]);
  const rows = live.rows;
  const hasWork = rows.length > 0;
  const current = selectedRow(rows, selected, []);
  const title = hasWork ? current?.[1] || "today’s work" : "No assigned work yet";
  const detail = hasWork ? current?.[3] || "Check notes before starting." : "When the boss assigns real work, it will appear here. No fake demo jobs are shown in the worker app.";
  const badge = hasWork ? current?.[2] || "Ready" : "Waiting";
  const type = hasWork ? current?.[0] || "Assigned" : "Clear";
  const quickNotes = useMemo(() => ["Running late", "Need owner check", "Extra work found", "Proof added"], []);

  function recordWorkerStep(step) {
    if (!hasWork) {
      addTrail("No live assigned work to update yet.");
      return;
    }
    setStatus(step);
    addTrail(`${step} recorded on this phone preview.`);
  }

  function sendBossUpdate(text = note) {
    const clean = String(text || "Worker update from phone view").trim();
    const record = ["Worker update", title, "Owner review", clean];
    createOfficeTeamLocalCommand({ area: "worker", record, action: "Worker update" });
    addTrail(`Boss update prepared for Command: ${clean}`);
    setNote("");
  }

  function addTrail(text) {
    setTrail((currentTrail) => [{ id: `${Date.now()}-${text}`, text }, ...currentTrail].slice(0, 4));
  }

  return (
    <main className="cvWorkerRouteShell">
      <section className="cvWorkerRoutePhone" aria-label="Churvox worker phone app">
        <header>
          <div>
            <span>Churvox Worker</span>
            <h1>Today’s work</h1>
          </div>
          <strong>{hasWork ? status : "Waiting"}</strong>
        </header>

        <article className={`cvWorkerRouteJob ${hasWork ? "" : "cvWorkerRouteEmptyJob"}`}>
          <small>{type}</small>
          <h2>{title}</h2>
          <p>{detail}</p>
          <em>{badge}</em>
        </article>

        <div className="cvWorkerRouteSteps">
          {statusSteps.map((step) => <button key={step} type="button" disabled={!hasWork} onClick={() => recordWorkerStep(step)}>{step}</button>)}
        </div>

        <section className="cvWorkerRouteNoteBox">
          <span>Boss update</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell the boss if something changed…" />
          <button type="button" onClick={() => sendBossUpdate()}>{hasWork ? "Send to office" : "Send general update"}</button>
        </section>

        <div className="cvWorkerRouteQuickNotes">
          {quickNotes.map((item) => <button key={item} type="button" disabled={!hasWork} onClick={() => sendBossUpdate(item)}>{item}</button>)}
        </div>

        <section className="cvWorkerRouteProof">
          <button type="button" disabled={!hasWork} onClick={() => addTrail("Photo proof placeholder opened.")}>Photo proof</button>
          <button type="button" disabled={!hasWork} onClick={() => addTrail("Timer note placeholder opened.")}>Timer note</button>
        </section>
      </section>

      <aside className="cvWorkerRouteDesk">
        <span>Worker route</span>
        <h2>Staff update work. Churvox prepares the office admin.</h2>
        <p>This is the new worker-side shell. Real assigned work appears here without exposing owner screens or fake demo jobs to staff.</p>
        <strong>{hasWork ? live.label : "No live assigned work found"}</strong>

        <section>
          <h3>Worker queue</h3>
          {hasWork ? rows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
              <span>{row[0]}</span>
              <b>{row[1]}</b>
              <small>{row[2]}</small>
            </button>
          )) : <p>No assigned work yet. Nothing fake is shown here.</p>}
        </section>

        <section>
          <h3>Phone trail</h3>
          {trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No worker actions yet.</p>}
        </section>
      </aside>
    </main>
  );
}
