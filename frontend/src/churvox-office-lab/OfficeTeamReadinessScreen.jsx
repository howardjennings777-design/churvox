import React, { useMemo, useState } from "react";
import "./OfficeTeamReadinessScreen.css";
import { useOfficeTeamOverview } from "./OfficeTeamOverview";

const launchSteps = [
  ["1", "Test hidden lab", "Run build, click through Today, Command, Work, Messages, Worker View, Activity and Readiness."],
  ["2", "Confirm live coverage", "Check which screens load live read-only rows and which still fall back safely."],
  ["3", "Move owner core", "Move Today, Command and Activity into the real owner app first."],
  ["4", "Move worker core", "Move the simple Worker View into staff routes after mobile and message-loop testing."],
];

export default function OfficeTeamReadinessScreen() {
  const overview = useOfficeTeamOverview();
  const groups = useMemo(() => readinessGroups(overview), [overview]);
  const [activeKey, setActiveKey] = useState("built");
  const active = groups.find((group) => group.key === activeKey) || groups[0];

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Readiness</span>
        <h2>Hidden lab is functionally shaped</h2>
        <p>The owner flow is now in place: Today checks the business, Command controls decisions, screens prepare safe cards, Worker View is phone-first, and Activity shows the local trail.</p>
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
  const liveWiringItems = [
    "Command fallback drafts from read-only records",
    "Screen buttons changed to prepared-only local controls",
    "Prepare Command card now feeds a local Command queue",
    "Local Command cards clear locally after owner action",
    "Activity now shows local prepared and cleared trail",
    ...(areaItems.length ? areaItems : ["Waiting for owner login to check live records"]),
  ];

  return [
    {
      key: "built",
      name: "Hidden lab shaped",
      status: "Built",
      items: ["Today owner start", "Command queue limit", "Actioned cards leave Command", "Office Team roles", "Playbooks", "Owner safety locks", "Plans pricing screen", "Read-only data fallback layer", "Prepared-only screen controls", "Local Command handoff queue", "Local Activity trail", "Owner Messages approval desk", "Phone-style Worker View"],
    },
    {
      key: "live-wiring",
      name: "Live read-only wiring",
      status: liveAreas.length ? "Started" : "Ready",
      items: liveWiringItems,
    },
    {
      key: "test",
      name: "Must be tested before live",
      status: "Check",
      items: ["Owner login", "Command prepare / approve / park", "Messages reply and staff ask flow", "Worker iPhone view", "No auto-send", "No auto-sync", "Mobile tap and scroll", "Render deploy"],
    },
    {
      key: "move",
      name: "Move into real app",
      status: "Later",
      items: ["Use Today as owner dashboard", "Move Command queue into owner app", "Move Activity into owner app", "Move Worker View to staff routes", "Keep public site untouched", "Remove demo rows once live coverage is reliable", "Connect approved actions safely"],
    },
  ];
}
