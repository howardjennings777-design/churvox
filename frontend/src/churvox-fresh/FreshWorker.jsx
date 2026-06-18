import React from "react";

const WORKER_KEY = "churvox:fresh-worker-jobs:v1";

const defaults = [
  { id: "worker-job-1", title: "Lawn service", client: "Aroha Property Care", address: "Naenae, Lower Hutt", status: "Assigned", time: "Today · 10:00 AM", notes: "Front lawn, edges, blower tidy. Take clear before and after photos.", photos: { before: false, after: false, extra: 0 }, workerNote: "" },
  { id: "worker-job-2", title: "Garden tidy", client: "Lower Hutt Medical Centre", address: "Lower Hutt", status: "Acknowledged", time: "Today · 1:30 PM", notes: "Trim entry hedge, weed garden edge, clean paths.", photos: { before: true, after: false, extra: 0 }, workerNote: "" },
];

function readJobs() {
  try {
    if (typeof window === "undefined") return defaults;
    const saved = window.localStorage.getItem(WORKER_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch { return defaults; }
}

function saveJobs(jobs) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKER_KEY, JSON.stringify(jobs));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "worker" } }));
    }
  } catch {}
}

function photoCount(job) {
  return Number(Boolean(job?.photos?.before)) + Number(Boolean(job?.photos?.after)) + Number(job?.photos?.extra || 0);
}

function workerFlowStatus(job) {
  if (!job) return "Pick a job";
  if (job.status === "Assigned") return "1. Tap Yep, got it";
  if (job.status === "Acknowledged") return "2. Start job";
  if (job.status === "In progress") return "3. Add photos + note";
  if (job.status === "Paused") return "Resume or complete";
  if (job.status === "Completed") return "Done";
  return "Next action";
}

export default function FreshWorker({ onNavigate }) {
  const [jobs, setJobs] = React.useState(readJobs);
  const [selectedId, setSelectedId] = React.useState(() => readJobs()[0]?.id || "");
  const selected = jobs.find((job) => job.id === selectedId) || jobs[0];

  function updateJob(id, patch) {
    setJobs((current) => {
      const next = current.map((job) => (job.id === id ? { ...job, ...patch } : job));
      saveJobs(next);
      return next;
    });
  }

  function updatePhoto(type, value) {
    if (!selected) return;
    const currentPhotos = selected.photos || {};
    updateJob(selected.id, { photos: { ...currentPhotos, [type]: value } });
  }

  function addExtraPhoto() {
    if (!selected) return;
    updatePhoto("extra", Number(selected.photos?.extra || 0) + 1);
  }

  function updateNote(value) {
    if (!selected) return;
    updateJob(selected.id, { workerNote: value });
  }

  function resetWorker() {
    saveJobs(defaults);
    setJobs(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  const completed = jobs.filter((job) => job.status === "Completed").length;
  const active = jobs.filter((job) => ["Acknowledged", "In progress", "Paused"].includes(job.status)).length;
  const readyToFinish = selected && photoCount(selected) > 0 && String(selected.workerNote || "").trim();

  return (
    <section className="freshWorkerPage workerDoFlow">
      <div className="freshWorkerHero">
        <div>
          <span>Worker app</span>
          <h1>Today’s work</h1>
          <p>Make the next step obvious. Worker sees the job, taps the button, adds photos, adds a note, then finishes.</p>
        </div>
        <div className="freshWorkerStats"><b>{jobs.length}</b><small>jobs today</small><b>{active}</b><small>active</small><b>{completed}</b><small>done</small></div>
      </div>

      <div className="freshWorkerLayout">
        <div className="freshWorkerPhone">
          <header><div><strong>Churvox Worker</strong><span>Oh yup, sweet — I do that</span></div><button type="button" onClick={resetWorker}>Reset</button></header>
          <div className="freshWorkerList">
            {jobs.map((job) => <button type="button" key={job.id} className={selected?.id === job.id ? "active" : ""} onClick={() => setSelectedId(job.id)}><b>{job.title}</b><span>{job.client}</span><small>{job.time} · {job.status} · {photoCount(job)} photos</small></button>)}
          </div>
        </div>

        {selected && <article className="freshWorkerDetail">
          <div className="freshWorkerDetailHead">
            <div><span>{workerFlowStatus(selected)}</span><h2>{selected.title}</h2><p>{selected.client} · {selected.address}</p></div>
            <button type="button" onClick={() => onNavigate?.("workercommand")}>Worker view</button>
          </div>

          <section className="freshWorkerNextStep">
            <span>Do this now</span>
            <h3>{selected.status === "Assigned" ? "Yep, got it" : selected.status === "Acknowledged" ? "Start job" : selected.status === "In progress" ? "Add photos and note" : selected.status === "Completed" ? "Job done" : "Keep going"}</h3>
            <p>{selected.status === "In progress" ? "Take proof photos here. Don’t make the worker hunt for it." : "One clear action at a time."}</p>
            <div className="freshWorkerPrimaryActions">
              <button type="button" onClick={() => updateJob(selected.id, { status: "Acknowledged" })}>Yep, got it</button>
              <button type="button" onClick={() => updateJob(selected.id, { status: "In progress" })}>Start job</button>
              <button type="button" onClick={() => document.getElementById("worker-add-photos")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Add photos</button>
              <button type="button" onClick={() => updateJob(selected.id, { status: "Completed" })} disabled={!readyToFinish}>Finish job</button>
            </div>
          </section>

          <div className="freshWorkerInfoGrid"><div><b>When</b><span>{selected.time}</span></div><div><b>Address</b><span>{selected.address}</span></div><div><b>Status</b><span>{selected.status}</span></div></div>

          <div className="freshWorkerNotes"><b>What the boss wants</b><p>{selected.notes}</p></div>

          <section id="worker-add-photos" className="freshWorkerProofBox">
            <div className="freshWorkerProofHead"><span>Proof photos</span><h3>Add photos here</h3><p>Worker taps these before finishing. Before photo, after photo, extra proof if needed.</p></div>
            <div className="freshWorkerPhotos">
              <button type="button" className={selected.photos?.before ? "done" : ""} onClick={() => updatePhoto("before", !selected.photos?.before)}>{selected.photos?.before ? "✓ Before photo added" : "+ Add before photo"}</button>
              <button type="button" className={selected.photos?.after ? "done" : ""} onClick={() => updatePhoto("after", !selected.photos?.after)}>{selected.photos?.after ? "✓ After photo added" : "+ Add after photo"}</button>
              <button type="button" className="wide" onClick={addExtraPhoto}>+ Add another proof photo {selected.photos?.extra ? `(${selected.photos.extra})` : ""}</button>
            </div>
          </section>

          <section className="freshWorkerNoteBox"><label><span>Worker note</span><textarea value={selected.workerNote || ""} onChange={(event) => updateNote(event.target.value)} placeholder="Done front lawn, edges, blower tidy. Gate was locked at first." /></label></section>

          <section className={`freshWorkerFinishBox ${readyToFinish ? "ready" : ""}`}><b>{readyToFinish ? "Ready to finish" : "Before finishing"}</b><span>{readyToFinish ? "Photo and note are done. Finish job when ready." : "Add at least one photo and a note so the owner knows what happened."}</span><button type="button" disabled={!readyToFinish} onClick={() => updateJob(selected.id, { status: "Completed" })}>Finish job</button></section>
        </article>}
      </div>
    </section>
  );
}
