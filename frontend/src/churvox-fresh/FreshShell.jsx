import React from "react";
import FreshQuickCreate from "./FreshQuickCreate";
import FreshSearch from "./FreshSearch";
import FreshTopStatus from "./FreshTopStatus";

const groups = [
  { title: "Home", items: [["command", "CM", "Command"]] },
  {
    title: "Work",
    items: [
      ["jobs", "JB", "Jobs"],
      ["leads", "LD", "Leads"],
      ["recurring", "RC", "Recurring"],
      ["dispatch", "DP", "Dispatch"],
      ["routes", "RT", "Routes"],
  ["areas", "AR", "Areas"],
      ["areas", "AR", "Areas"],
      ["photos", "PH", "Photos"],
      ["documents", "DC", "Documents"],
  ["safety", "SF", "Safety"],
      ["safety", "SF", "Safety"],
      ["extras", "EX", "Extras"],
      ["clients", "CL", "Clients"],
      ["quotes", "QT", "Quotes"],
      ["invoices", "IV", "Invoices"],
      ["portal", "PT", "Portal"],
      ["customerportal", "CR", "Portal Requests"],
      ["messages", "MS", "Messages"],
  ["followups", "FU", "Follow-ups"],
  ["reviews", "RV", "Reviews"],
  ["quality", "QC", "Quality"],
      ["quality", "QC", "Quality"],
      ["reviews", "RV", "Reviews"],
      ["followups", "FU", "Follow-ups"],
    ],
  },
  {
    title: "Business",
    items: [
      ["team", "TM", "Team"],
      ["availability", "AV", "Availability"],
      ["worker", "WK", "Worker"],
      ["payroll", "PR", "Payroll"],
      ["time", "TL", "Time logs"],
      ["reports", "RP", "Reports"],
      ["expenses", "EP", "Expenses"],
  ["profit", "PF", "Profit"],
      ["payments", "PY", "Payments"],
      ["creditnotes", "CN", "Credit Notes"],
      ["profit", "PF", "Profit"],
      ["assets", "AS", "Assets"],
  ["inventory", "IV", "Inventory"],
      ["inventory", "IV", "Inventory"],
      ["services", "SV", "Services"],
    ],
  },
  {
    title: "System",
    items: [
      ["integrations", "IN", "Integrations"],
      ["settings", "ST", "Settings"],
      ["approvals", "AP", "Approvals"],
      ["alerts", "AL", "Alerts"],
      ["audit", "AT", "Activity Log"],
      ["setup", "SU", "Setup"],
      ["roles", "RL", "Roles"],
      ["automation", "AU", "Automation"],
      ["plans", "PL", "Plans"],
      ["billing", "BL", "Billing"],
      ["templates", "TP", "Templates"],
      ["support", "SP", "Support"],
    ],
  },
];

const labels = {
  command: "Command",
  jobs: "Jobs",
  leads: "Leads",
  recurring: "Recurring",
  dispatch: "Dispatch",
  routes: "Routes",
  areas: "Areas",
  photos: "Photos",
  documents: "Documents",
  safety: "Safety",
  extras: "Extras",
  clients: "Clients",
  quotes: "Quotes",
  invoices: "Invoices",
  payments: "Payments",
  creditnotes: "Credit Notes",
  portal: "Client Portal",
  customerportal: "Portal Requests",
  messages: "Messages",
  followups: "Follow-ups",
  reviews: "Reviews",
  quality: "Quality",
  team: "Team",
  availability: "Availability",
  worker: "Worker",
  payroll: "Payroll",
  time: "Time logs",
  reports: "Reports",
  profit: "Profit",
  expenses: "Expenses",
  assets: "Assets",
  inventory: "Inventory",
  services: "Services",
  integrations: "Integrations",
  settings: "Settings",
  approvals: "Approvals",
  alerts: "Alerts",
  audit: "Activity Log",
  setup: "Setup",
  roles: "Roles",
  automation: "Automation",
  plans: "Plans",
  billing: "Billing",
  templates: "Templates",
  support: "Support",
};

const mobileItems = [
  ["command", "CM", "Command"],
  ["jobs", "JB", "Jobs"],
  ["dispatch", "DP", "Dispatch"],
  ["routes", "RT", "Routes"],
  ["time", "TL", "Time"],
  ["more", "••", "More"],
];

const extraMobile = [
  ["leads", "LD", "Leads"],
  ["recurring", "RC", "Recurring"],
  ["photos", "PH", "Photos"],
  ["documents", "DC", "Documents"],
  ["extras", "EX", "Extras"],
  ["clients", "CL", "Clients"],
  ["quotes", "QT", "Quotes"],
  ["invoices", "IV", "Invoices"],
  ["creditnotes", "CN", "Credit Notes"],
  ["portal", "PT", "Portal"],
  ["customerportal", "CR", "Portal Requests"],
  ["messages", "MS", "Messages"],
  ["team", "TM", "Team"],
  ["availability", "AV", "Availability"],
  ["worker", "WK", "Worker"],
  ["payroll", "PR", "Payroll"],
  ["reports", "RP", "Reports"],
  ["expenses", "EP", "Expenses"],
  ["assets", "AS", "Assets"],
  ["services", "SV", "Services"],
  ["integrations", "IN", "Integrations"],
  ["settings", "ST", "Settings"],
  ["approvals", "AP", "Approvals"],
  ["alerts", "AL", "Alerts"],
  ["audit", "AT", "Activity Log"],
  ["setup", "SU", "Setup"],
  ["roles", "RL", "Roles"],
  ["automation", "AU", "Automation"],
  ["plans", "PL", "Plans"],
  ["billing", "BL", "Billing"],
  ["templates", "TP", "Templates"],
  ["support", "SP", "Support"],
];

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
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [quickType, setQuickType] = React.useState(null);

  const safeGroups = React.useMemo(() => cleanGroups(groups), []);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => {
    const mainKeys = new Set(safeMobileItems.map(([key]) => key));
    return uniqueItems(extraMobile).filter(([key]) => !mainKeys.has(key));
  }, [safeMobileItems]);

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
            <small>Fresh build</small>
          </div>
        </div>

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
            <strong>{labels[active] || "Command"}</strong>
          </div>

          <FreshTopStatus onNavigate={go} />
          <FreshSearch onNavigate={go} />

          <div className="freshTopActions">
            <button type="button" onClick={() => go("command")}>Command</button>
            <button type="button" onClick={() => setQuickType("job")}>New job</button>
            <button type="button" onClick={() => setQuickType("quote")}>New quote</button>
            <button type="button" onClick={() => setQuickType("client")}>Add client</button>
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
