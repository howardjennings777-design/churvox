import React from "react";

export default function FreshMaterialsAI({ onNavigate }) {
  return (
    <section className="freshSmartPage">
      <header className="freshHero">
        <span>Materials AI</span>
        <h1>Materials reminders</h1>
        <p>Plan materials, parts and stock reminders from upcoming jobs. This area is safe to open while the fuller materials workflow is connected.</p>
      </header>

      <section className="freshGrid">
        <article className="freshCard">
          <h2>What this should do</h2>
          <div className="freshItem"><b>Check jobs</b><span>Look at upcoming jobs and flag likely materials or parts needed.</span></div>
          <div className="freshItem"><b>Prepare reminders</b><span>Create review items before staff arrive without what they need.</span></div>
          <div className="freshItem"><b>Owner approval</b><span>Materials suggestions should stay review-first, not auto-order anything.</span></div>
        </article>

        <aside className="freshCard">
          <h2>Owner actions</h2>
          <div className="freshActions">
            <button className="freshPrimary" type="button" onClick={() => onNavigate?.("jobs")}>Open jobs</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("command")}>Open Command</button>
            <button className="freshGhost" type="button" onClick={() => onNavigate?.("inventory")}>Open inventory</button>
          </div>
        </aside>
      </section>
    </section>
  );
}
