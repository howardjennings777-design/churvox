import React from "react";

const slips = [
  {
    title: "Invoice ready to approve",
    area: "Money desk · Aroha Property Care",
    found: "Draft invoice prepared from a completed job.",
    why: "Nothing is sent until the owner approves it.",
  },
  {
    title: "Quote needs follow-up",
    area: "Quotes · Birchville Rentals",
    found: "Sent quote has had no response for 6 days.",
    why: "Owner can recover work without hunting through quotes.",
  },
  {
    title: "Client missing billing email",
    area: "Clients · Birchville Rentals",
    found: "Client has service details but no billing email.",
    why: "Invoice automation should not run with missing details.",
  },
];

export default function FreshCommand() {
  return (
    <section>
      <header className="freshHero">
        <span>Churvox fresh · Command</span>
        <h1>Command Board</h1>
        <p>Fresh-coded approval desk. One card opens one slip. Owner approves, edits, declines, or ignores.</p>
      </header>

      <section className="freshGrid">
        <aside className="freshCard">
          <h2>Pending slips</h2>
          <p>AI prepares the admin. The owner controls what happens.</p>
          <div className="freshItem need">
            <b>4 pending</b>
            <span>Nothing auto-sends</span>
          </div>
        </aside>

        <section className="freshCard">
          <h2>Approval queue</h2>
          {slips.map((slip) => (
            <details className="freshSlip" key={slip.title}>
              <summary>{slip.title}</summary>
              <p><b>{slip.area}</b></p>
              <p><b>AI found:</b> {slip.found}</p>
              <p><b>Why:</b> {slip.why}</p>
              <div className="freshActions">
                <button className="freshPrimary">Approve</button>
                <button className="freshDark">Save edit</button>
                <button className="freshGhost">Decline</button>
              </div>
            </details>
          ))}
        </section>

        <aside className="freshCard">
          <h2>Owner rules</h2>
          <p>Command is for decisions. Real pages do the work. Risky work comes here as a slip.</p>
          <div className="freshActions">
            <button className="freshOrange">Open newest slip</button>
            <button className="freshDark">Review all</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
