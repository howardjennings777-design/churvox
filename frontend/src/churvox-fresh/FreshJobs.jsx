import React from "react";

const jobs = [
  { id: 1, title: "Lawn service", client: "Aroha Property Care", status: "Assigned", worker: "Matiu", time: "Today 10:00", price: "$85 fixed", note: "Fortnightly service. Edge front path and send completion photos." },
  { id: 2, title: "Garden tidy", client: "Lower Hutt Medical Centre", status: "In progress", worker: "Ana", time: "Today 1:30", price: "$420 fixed", note: "Back garden tidy and green waste removal." },
  { id: 3, title: "Driveway clean", client: "Birchville Rentals", status: "Needs access", worker: "Unassigned", time: "Awaiting", price: "$240 quote", note: "Tenant access not confirmed. Send to Command before dispatch." },
];

export default function FreshJobs() {
  const [selectedId, setSelectedId] = React.useState(1);
  const selected = jobs.find((job) => job.id === selectedId) || jobs[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Jobs</span>
        <h1>Jobs</h1>
        <p>Fresh job control: list on the left, job detail in the middle, owner actions on the right.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Job list</h2>
          {jobs.map((job) => (
            <button
              type="button"
              className={`freshItem ${job.status.includes("Needs") ? "need" : ""} ${selected.id === job.id ? "active" : ""}`}
              onClick={() => setSelectedId(job.id)}
              key={job.id}
            >
              <b>{job.title}</b>
              <span>{job.client} · {job.status}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{selected.title}</h2>
          <div className="freshTabs">
            <span className="active">Details</span><span>Time</span><span>Notes</span><span>Photos</span>
          </div>
          <label className="freshField"><span>Client</span><input value={selected.client} readOnly /></label>
          <label className="freshField"><span>Status</span><input value={selected.status} readOnly /></label>
          <label className="freshField"><span>Worker</span><input value={selected.worker} readOnly /></label>
          <label className="freshField"><span>Scheduled</span><input value={selected.time} readOnly /></label>
          <label className="freshField"><span>Price</span><input value={selected.price} readOnly /></label>
          <label className="freshField"><span>Job notes</span><textarea value={selected.note} readOnly /></label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Jobs should stay simple. Anything risky goes to Command.</p>
          <div className="freshActions">
            <button className="freshPrimary">Save job</button>
            <button className="freshOrange">Complete job</button>
            <button className="freshDark">Create invoice draft</button>
            <button className="freshGhost">Send issue to Command</button>
          </div>
          <div className="freshItem need"><b>Status flow</b><span>Assigned → Acknowledged → In Progress → Completed</span></div>
        </aside>
      </section>
    </section>
  );
}
