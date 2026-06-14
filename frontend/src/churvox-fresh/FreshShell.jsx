import React from "react";
import FreshQuickCreate from "./FreshQuickCreate";
import FreshSearch from "./FreshSearch";
import FreshTopStatus from "./FreshTopStatus";
import { useAuth } from "../context/AuthContext";

const groups = [
  {
    title: "Home",
    items: [
      ["setupassistant", "AI", "AI Guide"],
      ["command", "CM", "Command"],
      ["aioperator", "AO", "AI Operator"],
      ["quickcreateai", "QC", "Quick Create"],
      ["planday", "PD", "Plan My Day"],
    ],
  },
  {
    title: "Work",
    items: [
      ["jobs", "JB", "Jobs"],
      ["recurring", "RC", "Recurring"],
      ["dispatch", "SC", "Schedule"],
      ["routes", "RT", "Routes"],
      ["areas", "AR", "Areas"],
      ["clients", "CL", "Clients"],
      ["quotes", "QT", "Quotes"],
      ["quoteai", "QA", "AI Quote Builder"],
      ["invoices", "IV", "Invoices"],
      ["invoicecheck", "IC", "Invoice Checker"],
      ["payments", "PY", "Payments"],
      ["creditnotes", "CN", "Credit Notes"],
    ],
  },
  {
    title: "Team",
    items: [
      ["team", "TM", "Team"],
      ["roles", "RL", "Roles"],
      ["subcontractors", "SB", "Subcontractors"],
      ["availability", "AV", "Availability"],
      ["payroll", "PR", "Payroll"],
      ["time", "TL", "Time Logs"],
      ["gps", "GP", "GPS"],
      ["worker", "WK", "Worker"],
      ["workerbrief", "WB", "Worker Brief"],
      ["workerperformance", "WP", "Worker Performance"],
    ],
  },
  {
    title: "Customers",
    items: [
      ["customerportal", "CP", "Customer Portal"],
      ["portal", "PT", "Portal"],
      ["customermemory", "CM", "Customer Memory"],
      ["messages", "MS", "Messages"],
      ["messagetriage", "MT", "Message Triage"],
      ["followups", "FU", "Follow-ups"],
      ["followupwriter", "FW", "Follow-up Writer"],
      ["reviews", "RV", "Reviews"],
      ["reviewbooster", "RB", "Review Booster"],
      ["missinginfo", "MI", "Missing Info"],
    ],
  },
  {
    title: "Money",
    items: [
      ["billing", "BL", "Billing"],
      ["plans", "PL", "Plans"],
      ["aiusage", "AU", "AI Usage"],
      ["xero", "XE", "Xero"],
      ["integrations", "IN", "Integrations"],
      ["reports", "RP", "Reports"],
      ["profit", "PF", "Profit"],
      ["profitguard", "PG", "Profit Guard"],
      ["pricelearner", "PR", "Price Learner"],
      ["expenses", "EX", "Expenses"],
      ["cashflowai", "CF", "Cashflow AI"],
      ["paymentpromise", "PP", "Payment Promise"],
      ["upsellfinder", "UF", "Upsell Finder"],
    ],
  },
  {
    title: "Proof & Ops",
    items: [
      ["photos", "PH", "Photos"],
      ["photoproof", "PP", "Photo Proof"],
      ["documents", "DC", "Documents"],
      ["contracts", "CT", "Contracts"],
      ["assets", "AS", "Assets"],
      ["inventory", "IV", "Inventory"],
      ["materialsai", "MA", "Materials AI"],
      ["services", "SV", "Services"],
      ["industries", "ID", "Industries"],
      ["templates", "TP", "Templates"],
    ],
  },
  {
    title: "Control",
    items: [
      ["approvals", "AP", "Approvals"],
      ["alerts", "AL", "Alerts"],
      ["audit", "AD", "Audit"],
      ["automation", "AT", "Automation"],
      ["quality", "QL", "Quality"],
      ["reworkresolver", "RW", "Rework Resolver"],
      ["extras", "XT", "Extras"],
      ["variations", "VR", "Variations"],
      ["warranties", "WR", "Warranties"],
      ["cancellations", "CA", "Cancellations"],
      ["safety", "SF", "Safety"],
    ],
  },
  {
    title: "Launch & Help",
    items: [
      ["setup", "ST", "Setup"],
      ["onboarding", "OB", "Onboarding"],
      ["firstrun", "FR", "First Run"],
      ["launch", "LC", "Launch"],
      ["launchpack", "LP", "Launch Pack"],
      ["launchcontrol", "LC", "Launch Control"],
      ["businesshealth", "BH", "Business Health"],
      ["security", "SE", "Security"],
      ["trustcenter", "TC", "Trust Center"],
      ["support", "SP", "Support"],
      ["helpdesk", "HD", "Help Desk"],
      ["settings", "SG", "Settings"],
    ],
  },
];

const labels = Object.fromEntries(groups.flatMap((group) => group.items.map(([key, , label]) => [key, label])));
labels.smart = "Owner Brief";
labels.askchurvox = "Ask Churvox";
labels.globalactions = "Global Actions";
labels.schedulerai = "Scheduler AI";
labels.recurringSaver = "Recurring Saver";

const mobileItems = [
  ["jobs", "JB", "Jobs"],
  ["command", "CM", "Command"],
  ["setupassistant", "AI", "AI Guide"],
  ["more", "••", "More"],
];

const extraMobile = groups.flatMap((group) => group.items);

function uniqueItems(items) {
  const seen = new Set();
  return items.filter(([key]) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanGroups(sourceGroups) {
  const seen = new Set();
  return sourceGroups.map((group) => ({
    ...group,
    items: group.items.filter(([key]) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  }));
}

export default function FreshShell({ active, onChange, children }) {
  const auth = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [quickType, setQuickType] = React.useState(null);

  const safeGroups = React.useMemo(() => cleanGroups(groups), []);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => {
    const mainKeys = new Set(safeMobileItems.map(([key]) => key));
    return uniqueItems(extraMobile).filter(([key]) => !mainKeys.has(key));
  }, [safeMobileItems]);

  async function handleLogout() {
    try {
      if (auth?.logout) await auth.logout();
    } finally {
      try {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("owner_portal_session");
        window.localStorage.removeItem("platform_owner_email");
      } catch {
        // Keep logout moving.
      }

      window.location.href = "/login";
    }
  }

  function go(key) {
    if (key === "more") return;
    setMoreOpen(false);
    setQuickType(null);
    onChange(key);
  }

  function handleMobile(key) {
    if (key === "more") {
      setMoreOpen((value) => !value);
      return;
    }
    go(key);
  }

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand">
          <div className="freshLogo">C</div>
          <div>
            <strong>CHURVOX</strong>
            <small>Owner workspace</small>
          </div>
        </div>

        <button className="freshLogoutSide" type="button" onClick={handleLogout}>
          Log out
        </button>

        <nav className="freshNav">
          {safeGroups.map((group) => (
            <section className="freshNavGroup" key={group.title}>
              <p>{group.title}</p>
              {group.items.map(([key, mark, label]) => (
                <button
                  key={key}
                  type="button"
                  className={active === key ? "active" : ""}
                  onClick={() => go(key)}
                >
                  <i>{mark}</i>
                  <span>{label}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
      </aside>

      <main className="freshMain">
        <div className="freshTopbar">
          <div>
            <span>Current area</span>
            <strong>{labels[active] || "Churvox"}</strong>
          </div>

          <FreshTopStatus onNavigate={go} />
          <FreshSearch onNavigate={go} />

          <div className="freshTopActions">
            <button type="button" onClick={() => go("setupassistant")}>AI Guide</button>
            <button type="button" onClick={() => go("command")}>Command</button>
            <button type="button" onClick={() => setQuickType("job")}>New job</button>
            <button type="button" onClick={() => setQuickType("quote")}>New quote</button>
            <button type="button" onClick={() => setQuickType("client")}>Add client</button>
            <button className="freshLogoutTop" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        {children}
      </main>

      {moreOpen && (
        <div className="freshMobileMore">
          {safeExtraMobile.map(([key, mark, label]) => (
            <button
              key={key}
              type="button"
              className={active === key ? "active" : ""}
              onClick={() => handleMobile(key)}
            >
              <i>{mark}</i>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      <nav className="freshMobileNav" aria-label="Mobile navigation">
        {safeMobileItems.map(([key, mark, label]) => (
          <button
            key={key}
            type="button"
            className={active === key || (key === "more" && moreOpen) ? "active" : ""}
            onClick={() => handleMobile(key)}
          >
            <i>{mark}</i>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {quickType && (
        <FreshQuickCreate
          type={quickType}
          onClose={() => setQuickType(null)}
          onNavigate={go}
        />
      )}
    </div>
  );
}
