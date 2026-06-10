import React from "react";

const dispatchJobs = [
  {
    id: 1,
    lane: "Unconfirmed",
    title: "Lawn service",
    client: "Aroha Property Care",
    worker: "Matiu",
    time: "Today 10:00",
    status: "Needs acknowledgement",
    risk: "Worker has not acknowledged yet.",
    notes: "Fortnightly service. Edge front path, mow, blow down and upload completion photos.",
  },
  {
    id: 2,
    lane: "Ready",
    title: "Garden tidy",
    client: "Lower Hutt Medical Centre",
    worker: "Ana",
    time: "Today 1:30",
    status: "Ready",
    risk: "No issue.",
    notes: "Back garden tidy and green waste removal. Office wants before/after photos.",
  },
  {
    id: 3,
    lane: "On site",
    title: "Hedge trim",
    client: "Aroha Property Care",
    worker: "Wiremu",
    time: "Now",
    status: "In progress",
    risk: "Track time before invoicing.",
    notes: "Trim roadside hedge and keep clippings off neighbour driveway.",
  },
  {
    id: 4,
    lane: "Complete",
    title: "Driveway clean",
    client: "Birchville Rentals",
    worker: "Ana",
    time: "Done",
    status: "Completed",
    risk: "Invoice draft can be prepared.",
    notes: "Completed. Needs invoice draft and photo check before customer email.",
  },
];

const lanes = ["Unconfirmed", "Ready", "On site", "Complete"];

export default function FreshDispatch({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(1);
  const selected = dispatchJobs.find((job) => job.id === selectedId) || dispatchJobs[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Dispatch</span>
        <h1>Dispatch</h1>
        <p>Daily route control. See who has acknowledged, who is ready, who is on site, and what needs owner action.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Today board</h2>
          <p>Open a card to control the job without leaving Dispatch.</p>

          <div style={{ display: "grid", gap: 12 }}>
            {lanes.map((lane) => (
              <section key={lane}>
                <div style={{ fontSize: 11, fontWeight: 1000, letterSpacing: ".12em", textTransform: "uppercase", color: "#7c2d12", marginBottom: 6 }}>
                  {lane}
                </div>

                {dispatchJobs.filter((job) => job.lane === lane).map((job) => (
                  <button
                    type="button"
                    key={job.id}
                    className={`freshItem ${job.status.includes("Needs") ? "need" : ""} ${selected.id === job.id ? "active" : ""}`}
                    style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                    onClick={() => setSelectedId(job.id)}
                  >
                    <b>{job.title}</b>
                    <span>{job.client} · {job.worker}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </aside>

        <section className="freshCard">
          <h2>{selected.title}</h2>

          <div className="freshTabs">
            <span className="active">Dispatch</span>
            <span>Worker</span>
            <span>Notes</span>
            <span>Photos</span>
          </div>

          <label className="freshField">
            <span>Client</span>
            <input value={selected.client} readOnly />
          </label>

          <label className="freshField">
            <span>Worker</span>
            <input value={selected.worker} readOnly />
          </label>

          <label className="freshField">
            <span>Time</span>
            <input value={selected.time} readOnly />
          </label>

          <label className="freshField">
            <span>Status</span>
            <input value={selected.status} readOnly />
          </label>

          <label className="freshField">
            <span>Dispatch notes</span>
            <textarea value={selected.notes} readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Dispatch is for route control. Anything risky goes to Command.</p>

          <div className={`freshItem ${selected.status.includes("Needs") ? "need" : ""}`}>
            <b>Risk check</b>
            <span>{selected.risk}</span>
          </div>

          <div className="freshActions">
            <button className="freshPrimary">Confirm route</button>
            <button className="freshOrange" onClick={() => onNavigate?.("team")}>Reassign worker</button>
            <button className="freshDark">Message worker</button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>Send issue to Command</button>
          </div>

          <div className="freshItem need">
            <b>Launch rule</b>
            <span>Assigned → Acknowledged → In Progress → Completed</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
