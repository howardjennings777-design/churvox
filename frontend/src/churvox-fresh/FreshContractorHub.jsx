import React from "react";

const contractorCards = [
  ["Subcontractors", "Track approved subcontractors, roles and job access."],
  ["Job access", "Keep contractor work tied to assigned jobs and owner review."],
  ["Time and proof", "Review job updates, time and photos before admin moves forward."],
];

export default function FreshContractorHub({ onNavigate }) {
  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>Contractors</span>
        <h1>Contractor hub</h1>
        <p>Manage subcontractor access and keep outside work connected to jobs, time and owner review.</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>Contractor flow</h2>
          {contractorCards.map(([title, detail]) => (
            <div className="freshItem" key={title}>
              <b>{title}</b>
              <span>{detail}</span>
            </div>
          ))}
        </article>

        <article className="freshCard">
          <h2>Review-first</h2>
          <div className="freshItem"><b>Owner controls</b><span>Contractor changes should stay visible before they affect jobs or payroll review.</span></div>
          <div className="freshItem"><b>Worker app</b><span>Field updates should stay simple: job status, time, notes and photos.</span></div>
        </article>

        <aside className="freshCard">
          <h2>Open</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => onNavigate?.("team")}>Open team</button>
            <button className="freshOrange" type="button" onClick={() => onNavigate?.("jobs")}>Open jobs</button>
            <button className="freshDark" type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
