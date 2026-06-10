import React from "react";

const commandBoxes = [
  {
    group: "Money",
    title: "Invoice ready",
    info: "Aroha Property Care · $85 draft",
    found: "Completed lawn service has price, notes and GST ready.",
    prepared: "Draft invoice is prepared for owner review.",
    action: "Approve invoice or edit before sending.",
  },
  {
    group: "Quotes",
    title: "Follow-up needed",
    info: "Birchville Rentals · 6 days no reply",
    found: "Quote was sent but has not been accepted or declined.",
    prepared: "Follow-up message is prepared, not sent.",
    action: "Approve, edit or ignore follow-up.",
  },
  {
    group: "Clients",
    title: "Billing detail missing",
    info: "Birchville Rentals · billing email blank",
    found: "Client has a service contact but no billing email.",
    prepared: "Client record is flagged before invoice automation runs.",
    action: "Open client and complete billing details.",
  },
  {
    group: "Jobs",
    title: "Job needs access",
    info: "Driveway clean · tenant access not confirmed",
    found: "Job is requested but access details are not safe yet.",
    prepared: "Command has marked it as blocked before dispatch.",
    action: "Confirm access or move job.",
  },
  {
    group: "Team",
    title: "Worker not acknowledged",
    info: "Today route · one assigned job not accepted",
    found: "A worker has not acknowledged an assigned job.",
    prepared: "Owner warning is ready before the route starts.",
    action: "Contact worker or reassign.",
  },
  {
    group: "Setup",
    title: "Automation paused",
    info: "1 client missing billing setup",
    found: "Automation should not run until the record is clean.",
    prepared: "Churvox is holding the risky action back.",
    action: "Fix setup, then approve automation.",
  },
];

const pulse = [
  ["4", "approval boxes"],
  ["3", "today actions"],
  ["$695", "money watched"],
];

export default function FreshCommand() {
  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Command</span>
        <h1>Command</h1>
        <p>Owner control room. Boxes show the problem fast, then open into a slip with AI found, AI prepared, why, and owner action.</p>
      </header>

      <section className="freshGrid" style={{ marginBottom: 14 }}>
        {pulse.map(([value, label]) => (
          <aside className="freshCard" key={label}>
            <h2>{value}</h2>
            <p>{label}</p>
          </aside>
        ))}
      </section>

      <section className="freshGrid">
        {commandBoxes.map((box) => (
          <details className="freshSlip" key={box.title}>
            <summary>
              <b>{box.title}</b>
              <span>{box.group} · {box.info}</span>
            </summary>
            <p><b>AI found:</b> {box.found}</p>
            <p><b>AI prepared:</b> {box.prepared}</p>
            <p><b>Owner action:</b> {box.action}</p>
            <div className="freshActions">
              <button className="freshPrimary">Approve</button>
              <button className="freshDark">Save edit</button>
              <button className="freshGhost">Decline</button>
            </div>
          </details>
        ))}
      </section>

      <section className="freshGrid two" style={{ marginTop: 14 }}>
        <section className="freshCard">
          <h2>Quick owner moves</h2>
          <p>Command gives control without turning into a messy dashboard.</p>
          <div className="freshActions">
            <button className="freshPrimary">Create job</button>
            <button className="freshOrange">Create quote</button>
            <button className="freshDark">Add client</button>
          </div>
        </section>
        <aside className="freshCard">
          <h2>How Command should feel</h2>
          <div className="freshItem need"><b>Small box first</b><span>Just enough info to understand the problem.</span></div>
          <div className="freshItem"><b>Full slip second</b><span>Open it only when the owner wants detail.</span></div>
        </aside>
      </section>
    </section>
  );
}
