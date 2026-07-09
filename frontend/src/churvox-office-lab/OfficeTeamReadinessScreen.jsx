import React, { useState } from "react";
import "./OfficeTeamReadinessScreen.css";

const groups = [
  {
    name: "Ready in hidden shell",
    status: "Built",
    items: ["Today owner start", "Command queue limit", "Actioned cards leave Command", "Office Team roles", "Playbooks", "Owner safety locks", "Plans pricing screen"],
  },
  {
    name: "Needs real data wiring",
    status: "Next",
    items: ["Work list from jobs API", "Clients from live clients API", "Messages loop", "Worker updates", "Quotes and invoices from real records", "Mimic activity logs"],
  },
  {
    name: "Must be tested before live",
    status: "Check",
    items: ["Owner login", "Worker iPhone view", "Command approve/park/edit", "No auto-send", "No auto-sync", "Mobile tap and scroll", "Render deploy"],
  },
  {
    name: "Move into real app",
    status: "Later",
    items: ["Use Today as owner dashboard", "Move Command queue into owner app", "Move Worker View to staff routes", "Keep public site untouched", "Remove demo rows", "Connect real actions safely"],
  },
];

const launchSteps = [
  ["1", "Keep hidden lab", "Finish flow and visual decisions here without risking public pages."],
  ["2", "Connect real data", "Replace demo rows with APIs one screen at a time."],
  ["3", "Test owner + worker", "Run desktop, mobile and worker message loop checks."],
  ["4", "Move into app", "Ship Today and Command first, then the rest of the owner screens."],
];

export default function OfficeTeamReadinessScreen() {
  const [active, setActive] = useState(groups[1]);
  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Readiness</span>
        <h2>What is left before this can become the real Churvox app</h2>
        <p>The shell is mostly shaped now. The remaining work is real data wiring, safe action handling, mobile testing and moving the best parts into the live owner app.</p>
      </header>

      <div className="cvReadyGrid">
        <section className="cvReadyGroups">
          {groups.map((group) => (
            <button key={group.name} className={active.name === group.name ? "active" : ""} onClick={() => setActive(group)}>
              <span>{group.status}</span>
              <strong>{group.name}</strong>
              <small>{group.items.length} items</small>
            </button>
          ))}
        </section>

        <aside className="cvReadyDetail">
          <span>{active.status}</span>
          <h3>{active.name}</h3>
          <ul>{active.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </aside>
      </div>

      <section className="cvLaunchSteps">
        <span>Finish path</span>
        <h3>Best order from here</h3>
        <div>
          {launchSteps.map(([num, title, text]) => <article key={num}><strong>{num}</strong><b>{title}</b><p>{text}</p></article>)}
        </div>
      </section>
    </section>
  );
}
