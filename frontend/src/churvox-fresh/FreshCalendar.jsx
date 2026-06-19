import React from "react";

const sampleDay = [
  { time: "8:00", title: "First job", detail: "Check assignment, notes and travel." },
  { time: "10:30", title: "Second job", detail: "Confirm worker status and photos." },
  { time: "1:30", title: "Follow-up", detail: "Review any completed jobs for invoice prep." },
];

export default function FreshCalendar({ onNavigate }) {
  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>Schedule</span>
        <h1>Calendar</h1>
        <p>Plan the day, check jobs and keep the schedule connected to owner review.</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>Today</h2>
          {sampleDay.map((item) => (
            <div className="freshItem" key={`${item.time}-${item.title}`}>
              <b>{item.time} · {item.title}</b>
              <span>{item.detail}</span>
            </div>
          ))}
        </article>

        <article className="freshCard">
          <h2>Schedule flow</h2>
          <div className="freshItem"><b>Jobs first</b><span>Calendar should stay connected to live jobs and worker assignment.</span></div>
          <div className="freshItem"><b>Review first</b><span>Changes that affect customers or workers should be checked by the owner.</span></div>
          <div className="freshItem"><b>Plan my day</b><span>Use Plan My Day for a guided daily route and job order.</span></div>
        </article>

        <aside className="freshCard">
          <h2>Open</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => onNavigate?.("jobs")}>Open jobs</button>
            <button className="freshOrange" type="button" onClick={() => onNavigate?.("planday")}>Plan my day</button>
            <button className="freshDark" type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
