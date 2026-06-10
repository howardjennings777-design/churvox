import React from "react";

const helpTopics = [
  {
    id: 1,
    title: "Getting started",
    type: "Setup",
    status: "Recommended",
    note: "Set business details, GST, branding, team roles and email before sending real work.",
  },
  {
    id: 2,
    title: "Command boxes",
    type: "Command",
    status: "Core feature",
    note: "Command shows decisions: approve invoices, follow up quotes, fix setup and confirm risky jobs.",
  },
  {
    id: 3,
    title: "Worker app help",
    type: "Team",
    status: "Needed",
    note: "Workers acknowledge jobs, start timers, complete jobs and upload photos.",
  },
  {
    id: 4,
    title: "Billing and plans",
    type: "Plans",
    status: "Ready",
    note: "Start, Crew, Operator and Command plans with 14-day free trial.",
  },
];

const launchChecks = [
  ["Business settings", "Business name, email, GST and invoice terms are set."],
  ["Command rules", "Invoices, quote follow-ups and risky jobs go to Command."],
  ["Team roles", "Workers, payroll and admin access are separated."],
  ["Invoices", "Drafts need owner approval before sending."],
  ["Payroll", "CSV export only. No tax filing. No bank payout files."],
];

export default function FreshSupport({ onNavigate }) {
  const [selectedId, setSelectedId] = React.useState(1);
  const selected = helpTopics.find((item) => item.id === selectedId) || helpTopics[0];

  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Support</span>
        <h1>Support</h1>
        <p>Help, setup guidance and launch checks. Keep support simple so owners know what to do next.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Help topics</h2>
          <p>Quick guidance for common owner questions.</p>

          {helpTopics.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`freshItem ${item.status.includes("Needed") ? "need" : ""} ${selected.id === item.id ? "active" : ""}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedId(item.id)}
            >
              <b>{item.title}</b>
              <span>{item.type} · {item.status}</span>
            </button>
          ))}
        </aside>

        <section className="freshCard">
          <h2>{selected.title}</h2>

          <div className="freshTabs">
            <span className="active">Guide</span>
            <span>Steps</span>
            <span>Contact</span>
            <span>History</span>
          </div>

          <label className="freshField">
            <span>Area</span>
            <input value={selected.type} readOnly />
          </label>

          <label className="freshField">
            <span>Status</span>
            <input value={selected.status} readOnly />
          </label>

          <label className="freshField">
            <span>Support note</span>
            <textarea value={selected.note} readOnly />
          </label>

          <div className="freshItem">
            <b>Owner support rule</b>
            <span>Support should explain the next action, not dump a long manual on the owner.</span>
          </div>
        </section>

        <aside className="freshCard">
          <h2>Contact</h2>
          <p>Keep this clear and trustworthy.</p>

          <label className="freshField">
            <span>Support email</span>
            <input value="hello@churvox.com" readOnly />
          </label>

          <div className="freshActions">
            <button className="freshPrimary" onClick={() => onNavigate?.("settings")}>Open setup guide</button>
            <button className="freshOrange">Email support</button>
            <button className="freshDark">Report issue</button>
            <button className="freshGhost" onClick={() => onNavigate?.("command")}>Send issue to Command</button>
          </div>

          <div className="freshItem need">
            <b>Launch note</b>
            <span>Live chat can come later. Start with clean email support and helpful guides.</span>
          </div>
        </aside>
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Launch checks</h2>
          {launchChecks.map(([name, detail]) => (
            <div className="freshItem" key={name}>
              <b>{name}</b>
              <span>{detail}</span>
            </div>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Support rules</h2>
          <div className="freshItem">
            <b>Be direct</b>
            <span>Tell the owner what is wrong and what to do next.</span>
          </div>
          <div className="freshItem">
            <b>Connect to Command</b>
            <span>Risky support/setup issues should become Command boxes.</span>
          </div>
          <div className="freshItem need">
            <b>No hidden confusion</b>
            <span>If setup is incomplete, show it clearly.</span>
          </div>
        </aside>
      </section>
    </section>
  );
}
