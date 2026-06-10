import React from "react";

const slips = [
  ["Invoice ready to approve", "Aroha Property Care", "Draft invoice prepared from completed job."],
  ["Quote needs follow-up", "Birchville Rentals", "Sent quote has no response after 6 days."],
  ["Client missing billing email", "Birchville Rentals", "Billing detail missing before invoice automation."],
];

export default function FreshCommand() {
  return (
    <section>
      <header className="freshHero"><span>Churvox fresh · Command</span><h1>Command Board</h1><p>Fresh approval desk. One card opens one slip. Owner approves, edits, declines, or ignores.</p></header>
      <section className="freshGrid">
        <div className="freshCard"><h2>Pending slips</h2><p>AI prepares work. Owner controls what happens.</p></div>
        <div className="freshCard">
          <h2>Approval queue</h2>
          {slips.map(([title, client, note]) => (
            <details className="freshSlip" key={title}>
              <summary>{title}</summary>
              <p><b>Client:</b> {client}</p>
              <p><b>AI found:</b> {note}</p>
              <div className="freshActions"><button className="freshPrimary">Approve</button><button className="freshDark">Save edit</button><button className="freshWarn">Decline</button></div>
            </details>
          ))}
        </div>
        <aside className="freshCard"><h2>Owner rules</h2><p>Nothing sends automatically. Slips are for review first.</p></aside>
      </section>
    </section>
  );
}
