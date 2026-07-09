import React, { useMemo, useState } from "react";
import "./OfficeTeamReadinessScreen.css";
import { useOfficeTeamOverview } from "./OfficeTeamOverview";

const launchSteps = [
  ["1", "Keep hidden lab", "Finish flow and visual decisions here without risking public pages."],
  ["2", "Connect real data safely", "Use read-only APIs first, then send approved actions back through Command."],
  ["3", "Test owner + worker", "Run desktop, mobile and worker message loop checks before moving anything live."],
  ["4", "Move into app", "Ship Today and Command first, then Work, Clients, Messages, Staff and Money."],
];

export default function OfficeTeamReadinessScreen() {
  const overview = useOfficeTeamOverview();
  const groups = useMemo(() => readinessGroups(overview), [overview]);
  const [activeKey, setActiveKey] = useState("live-wiring");
  const active = groups.find((group) => group.key === activeKey) || groups[0];

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Readiness</span>
        <h2>What is left before this can become the real Churvox app</h2>
        <p>The shell is mostly shaped now. Real data is being connected safely in read-only mode first, then approved actions can move through Command.</p>
      </header>

      <div className="cvReadyGrid">
        <section className="cvReadyGroups">
          {groups.map((group) => (
            <button key={group.key} className={active.key === group.key ? "active" : ""} onClick={() => setActiveKey(group.key)}>
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

function readinessGroups(overview) {
  const liveAreas = overview.areas.filter((item) => item.source === "live");
  const areaItems = overview.areas.map((item) => `${item.label}: ${item.count || 0} read-only records · ${item.source === "live" ? "live" : "fallback"}`);

  return [
    {
      key: "built",
      name: "Ready in hidden shell",
      status: "Built",
      items: ["Today owner start", "Command queue limit", "Actioned cards leave Command", "Office Team roles", "Playbooks", "Owner safety locks", "Plans pricing screen", "Read-only data fallback layer"],
    },
    {
      key: "live-wiring",
      name: "Live read-only wiring",
      status: liveAreas.length ? "Started" : "Ready",
      items: areaItems.length ? areaItems : ["Waiting for owner login to check live records"],
    },
    {
      key: "next",
      name: "Next safe wiring",
      status: "Next",
      items: ["Command cards from real records", "Owner-approved action handoff", "Messages loop", "Worker iPhone view", "Quote and invoice draft review", "Mimic activity logs"],
    },
    {
      key: "test",
      name: "Must be tested before live",
      status: "Check",
      items: ["Owner login", "Worker iPhone view", "Command approve/park/edit", "No auto-send", "No auto-sync", "Mobile tap and scroll", "Render deploy"],
    },
    {
      key: "move",
      name: "Move into real app",
      status: "Later",
      items: ["Use Today as owner dashboard", "Move Command queue into owner app", "Move Worker View to staff routes", "Keep public site untouched", "Remove demo rows", "Connect real actions safely"],
    },
  ];
}
