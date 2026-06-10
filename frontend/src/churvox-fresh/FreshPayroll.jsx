import React from "react";

const workers = [
  {
    id: 1,
    name: "Matiu Rangi",
    role: "Worker",
    hours: "18.5",
    jobs: "7 jobs",
    gross: "$555.00",
    rate: "$30/hr",
    status: "Ready",
    note: "All job timers match completed jobs.",
  },
  {
    id: 2,
    name: "Ana Williams",
    role: "Lead worker",
    hours: "24.0",
    jobs: "9 jobs",
    gross: "$840.00",
    rate: "$35/hr",
    status: "Needs check",
    note: "One manual adjustment needs owner approval.",
  },
  {
    id: 3,
    name: "Wiremu King",
    role: "Worker",
    hours: "12.75",
    jobs: "4 jobs",
    gross: "$382.50",
    rate: "$30/hr",
    status: "Ready",
    note: "Photos and job completion notes are attached.",
  },
];

const adjustments = [
  ["Ana Williams", "+0.75 hr", "Manual fix for paused timer"],
  ["Matiu Rangi", "$15", "Fuel allowance note"],
  ["Wiremu King", "0", "No adjustment"],
];

export default function FreshPayroll({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(2);
  const selected = workers.find((worker) => worker.id === selectedId) || workers[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Payroll</span>
        <h1>Payroll</h1>
        <p>Pay period review using job timers. Export clean payroll CSV. No tax filing. No bank payout files.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Pay period</h2>
          <p>Review hours before export.</p>

          <label className="freshField">
            <span>Period</span>
            <input value="Weekly · 03 Jun - 09 Jun" readOnly />
          </label>

          {workers.map((worker) => (
            <button
              type="button"
              key={worker.id}
              className={`freshItem ${worker.status.includes("Needs") ? "need" : ""} ${selected.id === worker.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedId(worker.id)}
            >
              <b>{worker.name}</b>
              <span>{worker.hours} hrs · {worker.gross} · {worker.status}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{selected.name}</h2>

          <div className="freshTabs">
            <span className="active">Hours</span>
            <span>Jobs</span>
            <span>Adjustments</span>
            <span>Export</span>
          </div>

          <label className="freshField">
            <span>Role</span>
            <input value={selected.role} readOnly />
          </label>

          <label className="freshField">
            <span>Hourly rate</span>
            <input value={selected.rate} readOnly />
          </label>

          <label className="freshField">
            <span>Total hours</span>
            <input value={`${selected.hours} hours`} readOnly />
          </label>

          <label className="freshField">
            <span>Jobs completed</span>
            <input value={selected.jobs} readOnly />
          </label>

          <label className="freshField">
            <span>Gross pay estimate</span>
            <input value={selected.gross} readOnly />
          </label>

          <label className="freshField">
            <span>Payroll note</span>
            <textarea value={selected.note} readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Payroll stays safe: review hours, approve adjustments, export CSV only.</p>

          <div className={`freshItem ${selected.status.includes("Needs") ? "need" : ""}`}>
            <b>Status</b>
            <span>{selected.status}</span>
          </div>

          <div className="freshActions">
            <button className="freshPrimary">Approve hours</button>
            <button className="freshOrange">Add adjustment</button>
            <button className="freshDark">Export CSV</button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>Send issue to Command</button>
          </div>

          <div className="freshItem need">
            <b>Payroll rule</b>
            <span>No tax filing. No bank payout file. CSV export only.</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Adjustments</h2>
          {adjustments.map(([name, amount, reason]) => (
            <div className={`freshItem ${amount !== "0" ? "need" : ""}`} key={`${name}-${amount}`}>
              <b>{name} · {amount}</b>
              <span>{reason}</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Payroll summary</h2>
          <div className="freshItem">
            <b>55.25 total hours</b>
            <span>Across 20 completed jobs</span>
          </div>
          <div className="freshItem">
            <b>$1,777.50 gross estimate</b>
            <span>Before any external payroll/tax process</span>
          </div>
          <div className="freshItem need">
            <b>1 item needs owner approval</b>
            <span>Ana has one manual timer adjustment.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
