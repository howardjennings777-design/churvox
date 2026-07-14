import React from "react";
import "./OfficeTeamTodayScreen.css";
import "./OfficeTeamTodayVision.css";
import { useOfficeTeamOverview } from "./OfficeTeamOverview";

const labShortcuts = ["command", "work", "jobdone", "schedule", "messages", "worker", "quotes", "invoices", "money", "clients", "staff", "payroll", "automation", "branding", "plans", "integrations", "readiness"];
const ownerShortcuts = ["command", "work", "jobdone", "money", "clients", "worker", "quotes", "invoices"];

const labels = {
  command: "Command",
  work: "Jobs",
  jobdone: "Job Done",
  schedule: "Schedule",
  messages: "Messages",
  worker: "Workers",
  quotes: "Quotes",
  invoices: "Invoices",
  money: "Money Radar",
  clients: "Clients",
  staff: "Staff",
  payroll: "Payroll",
  automation: "Automation",
  branding: "Branding",
  plans: "Plans",
  integrations: "Xero",
  readiness: "Readiness",
  activity: "Activity",
  settings: "Settings",
  help: "Help",
};

export default function OfficeTeamTodayScreen({ pending, resolved, approvalTrail = [], backendAudit = [], localQueue = [], localActivity = [], go, appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const shortcuts = ownerRoute ? ownerShortcuts : labShortcuts;
  const overview = useOfficeTeamOverview({ allowFallback });
  const top = pending.slice(0, 3);
  const preparedWaiting = ownerRoute ? top : localQueue.slice(0, 3);
  const recentApprovals = ownerRoute && backendAudit.length ? backendAudit.slice(0, 3) : approvalTrail.slice(0, 3);
  const recentOfficeTrail = localActivity.slice(0, 3);
  const cleared = Object.keys(resolved).length;

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Today</span>
        <h2>{ownerRoute ? "Your business, reduced to what needs you" : "Your office team has checked the business"}</h2>
        <p>{ownerRoute ? "Start here. Churvox keeps routine admin in the background and brings back only the work, decisions and exceptions that need the owner." : "Start here. The owner sees what matters, opens Command when a decision is needed, and leaves the rest with the office team."}</p>
      </header>

      <div className="cvSiteTodayGrid">
        <article className="cvSiteBriefing">
          <span>Daily briefing · {overview.label}</span>
          <h2>{pending.length ? `${pending.length} owner decision${pending.length === 1 ? "" : "s"} waiting. ${top.length} shown first.` : "Nothing needs your decision right now."}</h2>
          <p>{ownerRoute ? "Churvox checks live records, prepares the next admin step and keeps routine work off this screen. Nothing sends, syncs, charges or changes without the required owner decision." : "Today checks business areas in read-only mode where possible. It never sends, syncs, charges, edits records or changes money without owner approval."}</p>
          <div className="cvSiteBriefingActions">
            {shortcuts.map((key, index) => (
              <button key={key} className={index === 0 ? "primary" : ""} onClick={() => go(key)}>{labels[key] || key}</button>
            ))}
          </div>
        </article>

        <div className="cvSiteTodayStack">
          <article className="cvSiteTodayPanel cvSiteHandoverPanel">
            <span>{ownerRoute ? "Command handover" : "Office desk handover"}</span>
            <strong>{pending.length} waiting · {recentApprovals.length} recent decisions</strong>
            <p>{ownerRoute ? "Command is the only approval queue. Open the first decision, correct anything wrong and leave the rest parked until it matters." : "Prepared work stays waiting for Command. Owner decisions stay visible in the approval trail."}</p>
            <div className="cvSiteMiniList">
              {preparedWaiting.length ? preparedWaiting.map((item, index) => (
                <article key={item.id || item.action_id || item.title}>
                  <button onClick={() => go("command")}>
                    <b>{item.title}</b>
                    <small>Decision {index + 1} · {item.level || item.tray || item.roleName || "Review"}</small>
                  </button>
                </article>
              )) : <article><b>Command is clear</b><small>Routine admin stays in the background until a real decision is needed.</small></article>}
            </div>
            <div className="cvSiteHandoverFooter">
              <button onClick={() => go("command")}>Open Command</button>
              <button onClick={() => go("activity")}>View activity</button>
            </div>
          </article>

          <article className="cvSiteTodayPanel">
            <span>Recent owner decisions</span>
            <strong>{recentApprovals.length ? "Trail active" : "No recent decisions"}</strong>
            <p>The real Command trail shows what was approved, recorded, parked or superseded.</p>
            <div className="cvSiteMiniList">
              {recentApprovals.length ? recentApprovals.map((item, index) => (
                <article key={item.id || `${item.title}-${index}`}>
                  <button onClick={() => go("activity")}>
                    <b>{item.action || item.status || "Owner decision"} · {item.title || "Command item"}</b>
                    <small>{item.safety || "Recorded in Command"}</small>
                  </button>
                </article>
              )) : <article><b>No owner decisions yet</b><small>Completed Command decisions will appear here.</small></article>}
            </div>
          </article>

          <article className="cvSiteTodayPanel">
            <span>Live business areas</span>
            <strong>{overview.areas.reduce((sum, item) => sum + Number(item.count || 0), 0)} live records loaded</strong>
            <p>{allowFallback ? "These are read-only business checks. Action buttons remain approval paths." : "Only real read-only records appear here. Empty areas stay clear rather than showing examples."}</p>
            <div className="cvSiteMiniList">
              {overview.source === "loading" ? (
                <article>
                  <b>Checking live business areas</b>
                  <small>Jobs, clients, messages, invoices, workers and quotes</small>
                </article>
              ) : overview.areas.map((item) => (
                <article key={item.area}>
                  <button onClick={() => go(item.screen)}>
                    <b>{item.label}: {item.count}</b>
                    <small>{item.status} · {item.top}</small>
                  </button>
                </article>
              ))}
            </div>
          </article>

          {!ownerRoute ? <article className="cvSiteActionPanel">
            <span>Safety lock</span>
            <strong>Approval first</strong>
            <p>Every action stays prepared-only until the owner approves the next step.</p>
            <button onClick={() => go("safety")}>View safety rules</button>
          </article> : null}

          {!ownerRoute ? <article className="cvSiteActionPanel">
            <span>Office trail</span>
            <strong>{recentOfficeTrail.length || cleared} recent</strong>
            <p>Prepared and cleared work stays visible so the owner can see what Churvox has done.</p>
          </article> : null}
        </div>
      </div>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
