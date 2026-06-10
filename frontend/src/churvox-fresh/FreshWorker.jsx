import React from "react";

const WORKER_KEY = "churvox:fresh-worker-jobs:v1";

const defaults = [
  {
    id: "worker-job-1",
    title: "Lawn service",
    client: "Aroha Property Care",
    address: "Naenae, Lower Hutt",
    status: "Assigned",
    time: "Today · 10:00 AM",
    pay: "2.0 hrs estimated",
    notes: "Front lawn, edges, blower tidy. Take after photo.",
    photos: {
      before: false,
      after: false,
    },
  },
  {
    id: "worker-job-2",
    title: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    address: "Lower Hutt",
    status: "Acknowledged",
    time: "Today · 1:30 PM",
    pay: "3.5 hrs estimated",
    notes: "Trim entry hedge, weed garden edge, clean paths.",
    photos: {
      before: true,
      after: false,
    },
  },
];

function readJobs() {
  try {
    if (typeof window === "undefined") return defaults;

    const saved = window.localStorage.getItem(WORKER_KEY);
    if (!saved) return defaults;

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

function saveJobs(jobs) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WORKER_KEY, JSON.stringify(jobs));
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "worker" } }));
    }
  } catch {
    // Fresh preview keeps working without local storage.
  }
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

  function togglePhoto(type) {
    if (!selected) return;

    updateJob(selected.id, {
      photos: {
        ...selected.photos,
        [type]: !selected.photos?.[type],
      },
    });
  }

  function resetWorker() {
    saveJobs(defaults);
    setJobs(defaults);
    setSelectedId(defaults[0]?.id || "");
  }

  const completed = jobs.filter((job) => job.status === "Completed").length;
  const active = jobs.filter((job) => ["Acknowledged", "In progress", "Paused"].includes(job.status)).length;

  return (
    <section className="freshWorkerPage">
      <div className="freshWorkerHero">
        <div>
          <span>Worker preview</span>
          <h1>Staff mobile app</h1>
          <p>Simple daily job list for workers: acknowledge, start, pause, complete and capture photo checks.</p>
        </div>

        <div className="freshWorkerStats">
          <b>{jobs.length}</b>
          <small>jobs today</small>
          <b>{active}</b>
          <small>active</small>
          <b>{completed}</b>
          <small>done</small>
        </div>
      </div>

      <div className="freshWorkerLayout">
        <div className="freshWorkerPhone">
          <header>
            <div>
              <strong>Churvox Worker</strong>
              <span>Today’s run</span>
            </div>
            <button type="button" onClick={resetWorker}>Reset</button>
          </header>

          <div className="freshWorkerList">
            {jobs.map((job) => (
              <button
                type="button"
                key={job.id}
                className={selected?.id === job.id ? "active" : ""}
                onClick={() => setSelectedId(job.id)}
              >
                <b>{job.title}</b>
                <span>{job.client}</span>
                <small>{job.time} · {job.status}</small>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <article className="freshWorkerDetail">
            <div className="freshWorkerDetailHead">
              <div>
                <span>{selected.status}</span>
                <h2>{selected.title}</h2>
                <p>{selected.client} · {selected.address}</p>
              </div>

              <button type="button" onClick={() => onNavigate?.("dispatch")}>
                Open Dispatch
              </button>
            </div>

            <div className="freshWorkerInfoGrid">
              <div>
                <b>Time</b>
                <span>{selected.time}</span>
              </div>
              <div>
                <b>Pay view</b>
                <span>{selected.pay}</span>
              </div>
              <div>
                <b>Address</b>
                <span>{selected.address}</span>
              </div>
            </div>

            <div className="freshWorkerNotes">
              <b>Job notes</b>
              <p>{selected.notes}</p>
            </div>

            <div className="freshWorkerPhotos">
              <button
                type="button"
                className={selected.photos?.before ? "done" : ""}
                onClick={() => togglePhoto("before")}
              >
                {selected.photos?.before ? "✓" : ""} Before photo
              </button>

              <button
                type="button"
                className={selected.photos?.after ? "done" : ""}
                onClick={() => togglePhoto("after")}
              >
                {selected.photos?.after ? "✓" : ""} After photo
              </button>
            </div>

            <div className="freshWorkerActions">
              <button type="button" onClick={() => updateJob(selected.id, { status: "Acknowledged" })}>
                Acknowledge
              </button>
              <button type="button" onClick={() => updateJob(selected.id, { status: "In progress" })}>
                Start
              </button>
              <button type="button" onClick={() => updateJob(selected.id, { status: "Paused" })}>
                Pause
              </button>
              <button type="button" onClick={() => updateJob(selected.id, { status: "Completed" })}>
                Complete
              </button>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
