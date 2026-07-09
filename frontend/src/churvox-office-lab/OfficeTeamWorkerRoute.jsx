import React, { useMemo, useState } from "react";
import "./OfficeTeamWorkerRoute.css";
import { rowKey, selectedRow, useOfficeTeamRows } from "./OfficeTeamLiveRows";
import { createOfficeTeamLocalCommand } from "./OfficeTeamLocalCommand";

const fallbackRows = [
  ["Assigned", "Morning service run", "Ready", "Check notes, acknowledge, start, complete and add proof."],
  ["Next", "Green waste pickup", "Needs note", "Staff can send a boss update if the scope changes."],
  ["Proof", "Final photo needed", "Before complete", "Proof keeps invoices clean for owner approval."],
];

const statusSteps = ["Acknowledge", "Start", "Pause", "Complete"];

export default function OfficeTeamWorkerRoute() {
  const live = useOfficeTeamRows("worker", fallbackRows);
  const [selected, setSelected] = useState(fallbackRows[0]);
  const [status, setStatus] = useState("Ready");
  const [note, setNote] = useState("");
  const [trail, setTrail] = useState([]);
  const rows = live.rows;
  const current = selectedRow(rows, selected, fallbackRows);
  const title = current?.[1] || "today’s work";
  const quickNotes = useMemo(() => ["Running late", "Need owner check", "Extra work found", "Proof added"], []);

  function recordWorkerStep(step) {
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
          <strong>{status}</strong>
        </header>

        <article className="cvWorkerRouteJob">
          <small>{current[0]}</small>
          <h2>{title}</h2>
          <p>{current[3]}</p>
          <em>{current[2]}</em>
        </article>

        <div className="cvWorkerRouteSteps">
          {statusSteps.map((step) => <button key={step} type="button" onClick={() => recordWorkerStep(step)}>{step}</button>)}
        </div>

        <section className="cvWorkerRouteNoteBox">
          <span>Boss update</span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell the boss if something changed…" />
          <button type="button" onClick={() => sendBossUpdate()}>Send to office</button>
        </section>

        <div className="cvWorkerRouteQuickNotes">
          {quickNotes.map((item) => <button key={item} type="button" onClick={() => sendBossUpdate(item)}>{item}</button>)}
        </div>

        <section className="cvWorkerRouteProof">
          <button type="button" onClick={() => addTrail("Photo proof placeholder opened.")}>Photo proof</button>
          <button type="button" onClick={() => addTrail("Timer note placeholder opened.")}>Timer note</button>
        </section>
      </section>

      <aside className="cvWorkerRouteDesk">
        <span>Worker route</span>
        <h2>Staff update work. Churvox prepares the office admin.</h2>
        <p>This is the new worker-side shell. Safe preview updates can prepare Command cards for the owner without exposing the owner app to staff.</p>
        <strong>{live.label}</strong>

        <section>
          <h3>Worker queue</h3>
          {rows.map((row) => (
            <button key={rowKey(row)} className={rowKey(current) === rowKey(row) ? "active" : ""} onClick={() => setSelected(row)} type="button">
              <span>{row[0]}</span>
              <b>{row[1]}</b>
              <small>{row[2]}</small>
            </button>
          ))}
        </section>

        <section>
          <h3>Phone trail</h3>
          {trail.length ? trail.map((item) => <p key={item.id}>{item.text}</p>) : <p>No worker actions yet.</p>}
        </section>
      </aside>
    </main>
  );
}
