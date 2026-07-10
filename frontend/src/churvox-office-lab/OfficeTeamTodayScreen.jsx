import React from "react";
import "./OfficeTeamTodayScreen.css";
import { useOfficeTeamOverview } from "./OfficeTeamOverview";

const labShortcuts = ["command", "work", "schedule", "messages", "worker", "quotes", "invoices", "money", "clients", "staff", "payroll", "automation", "branding", "plans", "integrations", "readiness"];
const ownerShortcuts = ["command", "work", "schedule", "clients", "messages", "worker", "quotes", "invoices", "money", "staff", "payroll", "integrations", "activity", "settings", "plans", "help"];

const labels = {
  command: "Command",
  work: "Jobs",
  schedule: "Schedule",
  messages: "Messages",
  worker: "Workers",
  quotes: "Quotes",
  invoices: "Invoices",
  money: "Money",
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

export default function OfficeTeamTodayScreen({ metrics, pending, resolved, approvalTrail = [], localQueue = [], localActivity = [], go, appMode = "lab" }) {
  const ownerRoute = isOwnerRoute();
  const allowFallback = appMode !== "owner" && !ownerRoute;
  const shortcuts = ownerRoute ? ownerShortcuts : labShortcuts;
  const overview = useOfficeTeamOverview({ allowFallback });
  const top = pending.slice(0, 3);
  const preparedWaiting = localQueue.slice(0, 3);
  const recentApprovals = approvalTrail.slice(0, 3);
  const recentOfficeTrail = localActivity.slice(0, 3);
  const cleared = Object.keys(resolved).length;

  return (
    <section className="cvSiteScreen">
      <header className="cvSiteScreenHeader">
        <span>Today</span>
        <h2>{ownerRoute ? "Your business, sorted into decisions" : "Your office team has checked the business"}</h2>
        <p>{ownerRoute ? "Start here. Churvox shows what needs you, what is already prepared, and what can stay off your plate." : "Start here. The owner sees what matters, opens Command when a decision is needed, and leaves the rest with the office team."}</p>
      </header>

      <div className="cvSiteTodayGrid">
        <article className="cvSiteBriefing">
          <span>Daily briefing · {overview.label}</span>
          <h2>{pending.length ? `${pending.length} decisions are prepared. ${top.length} are ready first.` : "No urgent decisions waiting right now."}</h2>
          <p>{ownerRoute ? "Churvox checks the business in read-only mode, prepares the next admin step, and waits for owner approval before anything moves." : "Today checks business areas in read-only mode where possible. It never sends, syncs, charges, edits records or changes money without owner approval."}</p>
          <div className="cvSiteBriefingActions">
            {shortcuts.map((key, index) => (
              <button key={key} className={index === 0 ? "primary" : ""} onClick={() => go(key)}>{labels[key] || key}</button>
            ))}
          </div>
        </article>

        <div className="cvSiteTodayStack">
          <article className="cvSiteTodayPanel cvSiteHandoverPanel">
            <span>{ownerRoute ? "Command handover" : "Office desk handover"}</span>
            <strong>{preparedWaiting.length} prepared · {recentApprovals.length} approved</strong>
            <p>Prepared work stays waiting for Command. Owner decisions stay visible in the approval trail.</p>
            <div className="cvSiteMiniList">
              {preparedWaiting.length ? preparedWaiting.map((item) => (
                <article key={item.id || item.title}>
                  <button onClick={() => go("command")}>
                    <b>{item.title}</b>
                    <small>{item.roleName || "Churvox"} prepared · owner approval required</small>
                  </button>
                </article>
              )) : <article><b>No prepared handoffs waiting</b><small>When work needs a decision, Churvox will bring it to Command.</small></article>}
            </div>
            <div className="cvSiteHandoverFooter">
              <button onClick={() => go("command")}>Open Command</button>
              <button onClick={() => go("activity")}>View approval trail</button>
            </div>
          </article>

          <article className="cvSiteTodayPanel">
            <span>Next decisions</span>
            <strong>{metrics[1]?.value || 0} need owner</strong>
            <p>Command only shows the next few, then replaces each card after action.</p>
            <div className="cvSiteMiniList">
              {top.length ? top.map((item) => (
                <article key={item.id || item.action_id || item.title}>
                  <b>{item.title}</b>
                  <small>{item.tray} · {item.roleName}</small>
                </article>
              )) : <article><b>Command is clear</b><small>Churvox keeps watching safely.</small></article>}
            </div>
          </article>

          <article className="cvSiteTodayPanel">
            <span>Recent owner approvals</span>
            <strong>{recentApprovals.length ? "Trail active" : "No approvals yet"}</strong>
            <p>Every approval records the safety lock before anything real is allowed later.</p>
            <div className="cvSiteMiniList">
              {recentApprovals.length ? recentApprovals.map((item) => (
                <article key={item.id}>
                  <button onClick={() => go("activity")}>
                    <b>{item.action} · {item.title}</b>
                    <small>{item.safety}</small>
                  </button>
                </article>
              )) : <article><b>Nothing approved yet</b><small>Action a Command card to start the approval trail.</small></article>}
            </div>
          </article>

          <article className="cvSiteTodayPanel">
            <span>Live business areas</span>
            <strong>{overview.areas.reduce((sum, item) => sum + Number(item.count || 0), 0)} read-only records</strong>
            <p>{allowFallback ? "These are read-only business checks. Action buttons remain approval paths." : "Only real read-only records appear here. No example area data is shown in the owner workspace."}</p>
            <div className="cvSiteMiniList">
              {overview.areas.map((item) => (
                <article key={item.area}>
                  <button onClick={() => go(item.screen)}>
                    <b>{item.label}: {item.count}</b>
                    <small>{item.status} · {item.top}</small>
                  </button>
                </article>
              ))}
            </div>
          </article>

          <article className="cvSiteActionPanel">
            <span>Safety lock</span>
            <strong>Approval first</strong>
            <p>{ownerRoute ? "Nothing sends, syncs, charges or changes a record until you approve it in Command." : "Every action stays prepared-only until the owner approves the next step."}</p>
            <button onClick={() => go(ownerRoute ? "command" : "safety")}>{ownerRoute ? "Open Command" : "View safety rules"}</button>
          </article>

          <article className="cvSiteActionPanel">
            <span>Office trail</span>
            <strong>{recentOfficeTrail.length || cleared} recent</strong>
            <p>Prepared and cleared work stays visible so the owner can see what Churvox has done.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function isOwnerRoute() {
  return typeof window !== "undefined" && window.location.pathname.includes("dashboard");
}
