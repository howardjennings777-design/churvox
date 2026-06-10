import React from "react";

const reportCards = [
  ["$1,385", "Revenue this week", "Invoices approved and paid"],
  ["18", "Jobs completed", "Across 6 active clients"],
  ["$190", "Overdue money", "1 invoice needs follow-up"],
  ["42.5", "Worker hours", "From job timers"],
];

const clientActivity = [
  ["Aroha Property Care", "4 jobs", "$340", "Good"],
  ["Lower Hutt Medical Centre", "2 jobs", "$840", "Good"],
  ["Birchville Rentals", "1 overdue", "$190", "Needs action"],
];

const commandInsights = [
  ["Money", "1 overdue invoice should go to Command before reminder."],
  ["Jobs", "1 job had access risk before dispatch."],
  ["Quotes", "1 quote needs follow-up approval."],
  ["Payroll", "1 manual time adjustment needs owner approval."],
];

const workerRows = [
  ["Ana Williams", "24.0 hrs", "9 jobs", "1 adjustment"],
  ["Matiu Rangi", "18.5 hrs", "7 jobs", "Ready"],
  ["Wiremu King", "12.75 hrs", "4 jobs", "Ready"],
];

export default function FreshReports({ onNavigate }) {
  const [view, setView] = React.useState("Overview");

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Reports</span>
        <h1>Reports</h1>
        <p>Owner numbers without clutter. Revenue, jobs, quotes, invoices, workers and Command risks.</p>
      </header>

      <section className="freshGrid" style={{ marginBottom: 14 }}>
        {reportCards.slice(0, 3).map(([value, label, note]) => (
          <aside className="freshCard" key={label}>
            <h2>{value}</h2>
            <p>{label}</p>
            <div className="freshItem">
              <b>{note}</b>
              <span>This week</span>
            </div>
          </aside>
        ))}
      </section>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Report views</h2>
          {["Overview", "Clients", "Workers", "Money", "Command"].map((item) => (
            <button
              type="button"
              key={item}
              className={`freshItem ${view === item ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setView(item)}
            >
              <b>{item}</b>
              <span>Open {item.toLowerCase()} report</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{view} report</h2>

          <div className="freshTabs">
            <span className="active">Week</span>
            <span>Month</span>
            <span>Quarter</span>
            <span>Export</span>
          </div>

          <label className="freshField">
            <span>Revenue</span>
            <input value="$1,385 this week" readOnly />
          </label>

          <label className="freshField">
            <span>Completed jobs</span>
            <input value="18 completed jobs" readOnly />
          </label>

          <label className="freshField">
            <span>Quote conversion</span>
            <input value="2 accepted from 5 sent" readOnly />
          </label>

          <label className="freshField">
            <span>Overdue</span>
            <input value="$190 overdue" readOnly />
          </label>

          <label className="freshField">
            <span>Owner note</span>
            <textarea value="Reports should stay simple. Anything risky is shown as a Command insight so the owner can decide." readOnly />
          </label>
        </section>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <p>Reports are for decisions, not noise.</p>

          <div className="freshActions">
            <button className="freshPrimary">Export report</button>
            <button className="freshOrange">Open money issues</button>
            <button className="freshDark" onClick={() => onNavigate?.("command")}>Open Command risks</button>
            <button className="freshGhost">Download CSV</button>
          </div>

          <div className="freshItem need">
            <b>Command risk</b>
            <span>1 overdue reminder needs approval before customer contact.</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Client activity</h2>
          {clientActivity.map(([client, jobs, money, status]) => (
            <div className={`freshItem ${status.includes("Needs") ? "need" : ""}`} key={client}>
              <b>{client}</b>
              <span>{jobs} · {money} · {status}</span>
            </div>
          ))}
        </section>

        <section className="freshCard">
          <h2>Worker hours</h2>
          {workerRows.map(([worker, hours, jobs, status]) => (
            <div className={`freshItem ${status.includes("adjustment") ? "need" : ""}`} key={worker}>
              <b>{worker}</b>
              <span>{hours} · {jobs} · {status}</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Command insights</h2>
          {commandInsights.map(([area, note]) => (
            <div className="freshItem need" key={area}>
              <b>{area}</b>
              <span>{note}</span>
            </div>
          ))}
        </aside>
      </section>
    </section>
  );
}
