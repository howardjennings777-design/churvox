import React from "react";
import "./OfficeTeamExtraScreens.css";
import OfficeTeamXeroScreen from "./OfficeTeamXeroScreen";
import OfficeTeamQuotesWorkspace from "./OfficeTeamQuotesWorkspace";
import OfficeTeamInvoicesWorkspace from "./OfficeTeamInvoicesWorkspace";

export function QuotesScreen(props) {
  return <OfficeTeamQuotesWorkspace {...props} />;
}

export function InvoicesScreen(props) {
  return <OfficeTeamInvoicesWorkspace {...props} />;
}

export function IntegrationsScreen() {
  return <OfficeTeamXeroScreen />;
}

export function HelpScreen() {
  const guides = [
    ["Start here", "Today", "See the live business overview and what needs your attention.", "today"],
    ["Approve work", "Command", "Open evidence-backed slips, edit the prepared form and approve only what is right.", "command"],
    ["Set up work", "Jobs and clients", "Add or import records through working forms that prepare Command slips first.", "work"],
    ["Worker flow", "Workers", "Check worker updates here; workers use their own simple phone route.", "worker"],
    ["Accounting", "Xero", "Connect Xero, check accounting health and prepare draft-sync approval.", "integrations"],
    ["Safety trail", "Activity", "See what was prepared, what the owner approved and what remains waiting.", "activity"],
  ];
  return (
    <section className="cvSiteScreen cvOwnerHelp">
      <header className="cvSiteScreenHeader">
        <span>Help</span>
        <h2>Use Churvox without guessing</h2>
        <p>Every help choice below opens a real owner page. Churvox prepares the admin, Command holds the decision, and the owner stays in control.</p>
      </header>
      <div className="cvOwnerHelpGrid">
        {guides.map(([eyebrow, title, text, screen]) => (
          <button key={screen} type="button" onClick={() => goToScreen(screen)}>
            <span>{eyebrow}</span>
            <strong>{title}</strong>
            <p>{text}</p>
            <small>Open {title}</small>
          </button>
        ))}
      </div>
      <section className="cvOwnerHelpSupport">
        <div><span>Need a person?</span><h3>Contact Churvox support</h3><p>Tell us what page you were on, what you clicked and what you expected to happen.</p></div>
        <a href="mailto:hello@churvox.com?subject=Churvox%20support">Email hello@churvox.com</a>
      </section>
    </section>
  );
}

function goToScreen(screen) {
  const next = String(screen || "today");
  window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${next}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}
