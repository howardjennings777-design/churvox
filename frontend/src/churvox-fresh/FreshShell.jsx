import React from "react";
import FreshQuickCreate from "./FreshQuickCreate";
import FreshSearch from "./FreshSearch";
import FreshTopStatus from "./FreshTopStatus";
import { useAuth } from "../context/AuthContext";

const groups = [
  {
    title: "Main",
    items: [
      ["smart", "SH", "Smart Hub"],
      ["command", "CM", "Command"],
      ["jobs", "JB", "Jobs"],
      ["dispatch", "SC", "Schedule"],
      ["clients", "CL", "Clients"],
      ["quotes", "QT", "Quotes"],
      ["invoices", "IV", "Invoices"],
    ],
  },
  {
    title: "Team",
    items: [
      ["team", "TM", "Team"],
      ["time", "TL", "Time Logs"],
      ["payroll", "PR", "Payroll"],
    ],
  },
  {
    title: "Money",
    items: [
      ["xero", "XE", "Xero / MYOB Sync"],
      ["payments", "PY", "Payments"],
      ["reports", "RP", "Reports"],
      ["plans", "PL", "Plans & Usage"],
    ],
  },
  {
    title: "Operations",
    items: [
      ["photos", "PH", "Photos & Proof"],
      ["documents", "DC", "Documents"],
      ["automation", "AT", "Automation"],
      ["settings", "SG", "Settings"],
    ],
  },
  {
    title: "Help",
    items: [
      ["setupassistant", "AI", "AI Guide"],
      ["security", "SE", "Security"],
      ["support", "SP", "Support"],
    ],
  },
];

const relatedTools = {
  command: [
    ["aioperator", "AO", "AI Operator"],
    ["quickcreateai", "QC", "Quick Create"],
    ["planday", "PD", "Plan My Day"],
    ["approvals", "AP", "Approvals"],
    ["alerts", "AL", "Alerts"],
    ["audit", "AD", "Audit"],
  ],
  jobs: [
    ["recurring", "RC", "Recurring Jobs"],
    ["services", "SV", "Services"],
    ["industries", "ID", "Industries"],
    ["templates", "TP", "Templates"],
    ["extras", "XT", "Extras"],
    ["variations", "VR", "Variations"],
    ["warranties", "WR", "Warranties"],
    ["cancellations", "CA", "Cancellations"],
    ["safety", "SF", "Safety"],
    ["quality", "QL", "Quality"],
    ["reworkresolver", "RW", "Rework Resolver"],
  ],
  dispatch: [
    ["schedulerai", "SA", "Scheduler AI"],
    ["planday", "PD", "Plan My Day"],
    ["routes", "RT", "Routes"],
    ["areas", "AR", "Areas"],
    ["availability", "AV", "Availability"],
    ["gps", "GP", "GPS"],
  ],
  clients: [
    ["customerportal", "CP", "Customer Portal"],
    ["customermemory", "CM", "Customer Memory"],
    ["messages", "MS", "Messages"],
    ["messagetriage", "MT", "Message Triage"],
    ["followups", "FU", "Follow-ups"],
    ["reviews", "RV", "Reviews"],
    ["missinginfo", "MI", "Missing Info"],
    ["upsellfinder", "UF", "Upsell Finder"],
  ],
  quotes: [
    ["quoteai", "QA", "AI Quote Builder"],
    ["extras", "XT", "Extras"],
    ["variations", "VR", "Variations"],
    ["templates", "TP", "Templates"],
  ],
  invoices: [
    ["invoicecheck", "IC", "Invoice Checker"],
    ["creditnotes", "CN", "Credit Notes"],
    ["paymentpromise", "PP", "Payment Promise"],
  ],
  team: [
    ["roles", "RL", "Roles"],
    ["subcontractors", "SB", "Subcontractors"],
    ["availability", "AV", "Availability"],
    ["worker", "WK", "Worker App"],
    ["workerbrief", "WB", "Worker Brief"],
    ["workerperformance", "WP", "Worker Performance"],
  ],
  time: [
    ["availability", "AV", "Availability"],
    ["gps", "GP", "GPS"],
    ["workerperformance", "WP", "Worker Performance"],
  ],
  payroll: [
    ["team", "TM", "Team"],
    ["time", "TL", "Time Logs"],
    ["roles", "RL", "Roles"],
  ],
  xero: [
    ["integrations", "IN", "Other Integrations"],
    ["billing", "BL", "Billing"],
    ["aiusage", "AU", "AI Usage"],
  ],
  payments: [
    ["paymentpromise", "PP", "Payment Promise"],
    ["invoices", "IV", "Invoices"],
    ["billing", "BL", "Billing"],
  ],
  reports: [
    ["profit", "PF", "Profit"],
    ["profitguard", "PG", "Profit Guard"],
    ["expenses", "EX", "Expenses"],
    ["cashflowai", "CF", "Cashflow AI"],
    ["businesshealth", "BH", "Business Health"],
    ["pricelearner", "PR", "Price Learner"],
    ["aiusage", "AU", "AI Usage"],
  ],
  plans: [
    ["billing", "BL", "Billing"],
    ["aiusage", "AU", "AI Usage"],
  ],
  photos: [
    ["photoproof", "PP", "Photo Proof"],
  ],
  documents: [
    ["contracts", "CT", "Contracts"],
    ["assets", "AS", "Assets"],
    ["inventory", "IV", "Inventory"],
    ["materialsai", "MA", "Materials AI"],
  ],
  automation: [
    ["approvals", "AP", "Approvals"],
    ["alerts", "AL", "Alerts"],
    ["audit", "AD", "Audit"],
    ["quality", "QL", "Quality"],
  ],
  settings: [
    ["setup", "ST", "Business Setup"],
    ["onboarding", "OB", "Onboarding"],
    ["firstrun", "FR", "First Run"],
    ["imports", "IM", "Imports"],
    ["exports", "EX", "Exports"],
  ],
  setupassistant: [
    ["setup", "ST", "Business Setup"],
    ["onboarding", "OB", "Onboarding"],
    ["firstrun", "FR", "First Run"],
    ["askchurvox", "AC", "Ask Churvox"],
    ["globalactions", "GA", "Global Actions"],
    ["launchcontrol", "GO", "Go Live Control"],
  ],
  security: [
    ["trustcenter", "TC", "Trust Center"],
    ["audit", "AD", "Audit"],
  ],
  support: [
    ["helpdesk", "HD", "Help Desk"],
    ["feedback", "FB", "Feedback"],
    ["roadmap", "RM", "Roadmap"],
  ],
};

const mobileItems = [
  ["jobs", "JB", "Jobs"],
  ["dispatch", "SC", "Schedule"],
  ["command", "CM", "Command"],
  ["invoices", "IV", "Invoices"],
  ["team", "TM", "Team"],
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

function buildLabels() {
  const entries = [
    ...groups.flatMap((group) => group.items),
    ...Object.values(relatedTools).flat(),
  ];
  const nextLabels = Object.fromEntries(entries.map(([key, , label]) => [key, label]));
  nextLabels.morningbrief = "Morning Brief";
  nextLabels.askchurvox = "Ask Churvox";
  nextLabels.globalactions = "Global Actions";
  nextLabels.schedulerai = "Scheduler AI";
  nextLabels.recurringSaver = "Recurring Saver";
  nextLabels.recurringsaver = "Recurring Saver";
  nextLabels.followupwriter = "Follow-up Writer";
  nextLabels.reviewbooster = "Review Booster";
  nextLabels.portal = "Portal View";
  nextLabels.nz = "New Zealand Setup";
  nextLabels.myob = "MYOB";
  return nextLabels;
}

function buildParentMap() {
  const map = {};
  Object.entries(relatedTools).forEach(([parent, items]) => {
    items.forEach(([key]) => {
      if (!map[key]) map[key] = parent;
    });
  });
  groups.forEach((group) => {
    group.items.forEach(([key]) => {
      map[key] = key;
    });
  });
  map.routes = "dispatch";
  map.areas = "dispatch";
  map.schedulerai = "dispatch";
  map.gps = "time";
  map.portal = "clients";
  map.followupwriter = "clients";
  map.reviewbooster = "clients";
  return map;
}

const labels = buildLabels();
const parentByKey = buildParentMap();

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

  const currentPrimary = parentByKey[active] || active;
  const currentRelatedTools = React.useMemo(
    () => uniqueItems(relatedTools[currentPrimary] || []),
    [currentPrimary]
  );

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
                  className={currentPrimary === key ? "active" : ""}
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
            <strong>{labels[active] || labels[currentPrimary] || "Churvox"}</strong>
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

        {currentRelatedTools.length > 0 && (
          <section className="freshRelatedTools" aria-label={`${labels[currentPrimary] || "Current area"} tools`}>
            <div className="freshRelatedHeader">
              <span>{labels[currentPrimary] || "Current area"}</span>
              <strong>Related tools</strong>
              <small>Extra actions sit here so the main sidebar stays clean.</small>
            </div>
            <div className="freshRelatedList">
              {currentRelatedTools.map(([key, mark, label]) => (
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
            </div>
          </section>
        )}

        {children}
      </main>

      {moreOpen && (
        <div className="freshMobileMore">
          {safeExtraMobile.map(([key, mark, label]) => (
            <button
              key={key}
              type="button"
              className={currentPrimary === key ? "active" : ""}
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
            className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""}
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
