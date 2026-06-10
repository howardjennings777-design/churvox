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
      ["recurringsaver", "RS", "Recurring Saver"],
      ["dispatch", "DP", "Dispatch"],
      ["schedulerai", "SR", "Scheduler AI"],
      ["planday", "PD", "Plan My Day"],
      ["routes", "RT", "Routes"],
  ["areas", "AR", "Areas"],
      ["areas", "AR", "Areas"],
      ["photos", "PH", "Photos"],
      ["photoproof", "PP", "Photo Proof"],
      ["documents", "DC", "Documents"],
      ["contracts", "CT", "Contracts"],
  ["safety", "SF", "Safety"],
      ["safety", "SF", "Safety"],
      ["extras", "EX", "Extras"],
      ["variations", "VR", "Variations"],
      ["warranties", "WA", "Warranties"],
      ["reworkresolver", "RR", "Rework Resolver"],
      ["clients", "CL", "Clients"],
      ["customermemory", "CM", "Customer Memory"],
      ["upsellfinder", "UF", "Upsell Finder"],
      ["quotes", "QT", "Quotes"],
      ["quoteai", "AQ", "AI Quote"],
      ["invoices", "IV", "Invoices"],
      ["portal", "PT", "Portal"],
      ["customerportal", "CR", "Portal Requests"],
      ["messages", "MS", "Messages"],
      ["messagetriage", "MT", "Message Triage"],
  ["followups", "FU", "Follow-ups"],
  ["reviews", "RV", "Reviews"],
  ["quality", "QC", "Quality"],
      ["quality", "QC", "Quality"],
      ["reviews", "RV", "Reviews"],
      ["reviewbooster", "RB", "Review Booster"],
      ["followups", "FU", "Follow-ups"],
      ["followupwriter", "FW", "AI Follow-up"],
      ["cancellations", "CA", "Cancellations"],
    ],
  },
  {
    title: "Business",
    items: [
      ["team", "TM", "Team"],
      ["subcontractors", "SC", "Subcontractors"],
      ["availability", "AV", "Availability"],
      ["worker", "WK", "Worker"],
      ["workerbrief", "WB", "Worker Brief"],
      ["workerperformance", "WP", "Worker Watch"],
      ["missinginfo", "MI", "Missing Info"],
      ["payroll", "PR", "Payroll"],
      ["time", "TL", "Time logs"],
      ["gps", "GP", "GPS"],
      ["reports", "RP", "Reports"],
      ["businesshealth", "BH", "Business Health"],
      ["cashflowai", "CF", "Cashflow Coach"],
      ["paymentpromise", "PP", "Payment Promise"],
      ["expenses", "EP", "Expenses"],
  ["profit", "PF", "Profit"],
      ["payments", "PY", "Payments"],
      ["creditnotes", "CN", "Credit Notes"],
      ["profit", "PF", "Profit"],
      ["profitguard", "PG", "Profit Guard"],
      ["pricelearner", "PL", "Price Learner"],
      ["assets", "AS", "Assets"],
  ["inventory", "IV", "Inventory"],
      ["inventory", "IV", "Inventory"],
      ["materialsai", "MA", "Materials AI"],
      ["services", "SV", "Services"],
      ["industries", "IN", "Industries"],
    ],
  },
  {
    title: "System",
    items: [
      ["integrations", "IN", "Integrations"],
      ["xero", "XE", "Xero"],
      ["settings", "ST", "Settings"],
      ["approvals", "AP", "Approvals"],
      ["alerts", "AL", "Alerts"],
      ["audit", "AT", "Activity Log"],
      ["setup", "SU", "Setup"],
      ["launch", "LN", "Launch"],
      ["launchpack", "LP", "Launch Pack"],
      ["launchcontrol", "LC", "Launch Control"],
      ["demo", "DM", "Demo Mode"],
      ["qa", "QA", "QA"],
      ["flags", "FG", "Flags"],
      ["feedback", "FB", "Feedback"],
      ["roadmap", "RM", "Roadmap"],
      ["onboarding", "OB", "Onboarding"],
      ["firstrun", "FR", "First Run"],
      ["setupassistant", "SA", "Setup AI"],
      ["imports", "IM", "Imports"],
      ["exports", "EX", "Exports"],
      ["security", "SC", "Security"],
      ["trustcenter", "TC", "Trust Center"],
      ["roles", "RL", "Roles"],
      ["automation", "AU", "Automation"],
      ["plans", "PL", "Plans"],
      ["billing", "BL", "Billing"],
      ["aiusage", "AI", "AI Usage"],
      ["templates", "TP", "Templates"],
      ["support", "SP", "Support"],
      ["helpdesk", "HD", "Help Desk"],
    ],
  },
];

const labels = {
  smart: "Smart Hub",
  morningbrief: "Morning Brief",
  askchurvox: "Ask Churvox",
  globalactions: "Global Actions",
  aioperator: "AI Operator",
  quickcreateai: "AI Quick Create",
  missinginfo: "Missing Info",
  command: "Command",
  jobs: "Jobs",
  leads: "Leads",
  recurring: "Recurring",
  recurringsaver: "Recurring Saver",
  dispatch: "Dispatch",
  schedulerai: "Scheduler AI",
  planday: "Plan My Day",
  routes: "Routes",
  areas: "Areas",
  photos: "Photos",
  photoproof: "Photo Proof",
  documents: "Documents",
  contracts: "Contracts",
  safety: "Safety",
  extras: "Extras",
  variations: "Variations",
  clients: "Clients",
  customermemory: "Customer Memory",
  upsellfinder: "Upsell Finder",
  quotes: "Quotes",
  quoteai: "AI Quote",
  invoices: "Invoices",
  invoicecheck: "Invoice Checker",
  payments: "Payments",
  creditnotes: "Credit Notes",
  portal: "Client Portal",
  customerportal: "Portal Requests",
  messages: "Messages",
  messagetriage: "Message Triage",
  followups: "Follow-ups",
  followupwriter: "AI Follow-up",
  cancellations: "Cancellations",
  reviews: "Reviews",
  reviewbooster: "Review Booster",
  quality: "Quality",
  reworkresolver: "Rework Resolver",
  warranties: "Warranties",
  team: "Team",
  subcontractors: "Subcontractors",
  availability: "Availability",
  worker: "Worker",
  workerbrief: "Worker Brief",
  workerperformance: "Worker Watch",
  payroll: "Payroll",
  time: "Time logs",
  gps: "GPS",
  reports: "Reports",
  businesshealth: "Business Health",
  cashflowai: "Cashflow Coach",
  paymentpromise: "Payment Promise",
  profit: "Profit",
  profitguard: "Profit Guard",
  pricelearner: "Price Learner",
  expenses: "Expenses",
  assets: "Assets",
  inventory: "Inventory",
  materialsai: "Materials AI",
  services: "Services",
  industries: "Industries",
  integrations: "Integrations",
  xero: "Xero",
  settings: "Settings",
  approvals: "Approvals",
  alerts: "Alerts",
  audit: "Activity Log",
  setup: "Setup",
  launch: "Launch",
  launchpack: "Launch Pack",
  launchcontrol: "Launch Control",
  demo: "Demo Mode",
  qa: "QA",
  flags: "Flags",
  feedback: "Feedback",
  roadmap: "Roadmap",
  onboarding: "Onboarding",
  firstrun: "First Run",
  setupassistant: "Setup AI",
  imports: "Imports",
  exports: "Exports",
  security: "Security",
  trustcenter: "Trust Center",
  roles: "Roles",
  automation: "Automation",
  plans: "Plans",
  billing: "Billing",
  aiusage: "AI Usage",
  templates: "Templates",
  support: "Support",
  helpdesk: "Help Desk",
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
      ["setupassistant", "SA", "Setup AI"],
  ["reviewbooster", "RB", "Review Booster"],
  ["materialsai", "MA", "Materials AI"],
  ["workerperformance", "WP", "Worker Watch"],
  ["upsellfinder", "UF", "Upsell Finder"],
  ["paymentpromise", "PP", "Payment Promise"],
  ["pricelearner", "PL", "Price Learner"],
  ["schedulerai", "SR", "Scheduler AI"],
  ["messagetriage", "MT", "Message Triage"],
  ["morningbrief", "MB", "Morning Brief"],
  ["reworkresolver", "RR", "Rework Resolver"],
  ["cashflowai", "CF", "Cashflow Coach"],
  ["photoproof", "PP", "Photo Proof"],
  ["profitguard", "PG", "Profit Guard"],
  ["recurringsaver", "RS", "Recurring Saver"],
  ["quoteai", "AQ", "AI Quote"],
  ["helpdesk", "HD", "Help Desk"],
  ["trustcenter", "TC", "Trust Center"],
  ["firstrun", "FR", "First Run"],
  ["globalactions", "GA", "Global Actions"],
  ["launchcontrol", "LC", "Launch Control"],
  ["askchurvox", "AC", "Ask Churvox"],
  ["businesshealth", "BH", "Business Health"],
  ["customermemory", "CM", "Customer Memory"],
  ["missinginfo", "MI", "Missing Info"],
  ["workerbrief", "WB", "Worker Brief"],
  ["planday", "PD", "Plan My Day"],
  ["followupwriter", "FW", "AI Follow-up"],
  ["invoicecheck", "IC", "Invoice Checker"],
  ["quickcreateai", "QC", "AI Quick Create"],
  ["demo", "DM", "Demo Mode"],
  ["aioperator", "AI", "AI Operator"],
  ["launchpack", "LP", "Launch Pack"],
  ["smart", "SH", "Smart Hub"],
  ["leads", "LD", "Leads"],
  ["recurring", "RC", "Recurring"],
  ["photos", "PH", "Photos"],
  ["documents", "DC", "Documents"],
  ["contracts", "CT", "Contracts"],
  ["extras", "EX", "Extras"],
  ["variations", "VR", "Variations"],
  ["warranties", "WA", "Warranties"],
  ["clients", "CL", "Clients"],
  ["quotes", "QT", "Quotes"],
  ["cancellations", "CA", "Cancellations"],
  ["invoices", "IV", "Invoices"],
  ["creditnotes", "CN", "Credit Notes"],
  ["portal", "PT", "Portal"],
  ["customerportal", "CR", "Portal Requests"],
  ["messages", "MS", "Messages"],
  ["team", "TM", "Team"],
  ["subcontractors", "SC", "Subcontractors"],
  ["availability", "AV", "Availability"],
  ["worker", "WK", "Worker"],
  ["payroll", "PR", "Payroll"],
  ["gps", "GP", "GPS"],
  ["reports", "RP", "Reports"],
  ["expenses", "EP", "Expenses"],
  ["assets", "AS", "Assets"],
  ["services", "SV", "Services"],
  ["industries", "IN", "Industries"],
  ["integrations", "IN", "Integrations"],
  ["xero", "XE", "Xero"],
  ["settings", "ST", "Settings"],
  ["approvals", "AP", "Approvals"],
  ["alerts", "AL", "Alerts"],
  ["audit", "AT", "Activity Log"],
  ["setup", "SU", "Setup"],
  ["launch", "LN", "Launch"],
  ["qa", "QA", "QA"],
  ["flags", "FG", "Flags"],
  ["feedback", "FB", "Feedback"],
  ["roadmap", "RM", "Roadmap"],
  ["onboarding", "OB", "Onboarding"],
  ["imports", "IM", "Imports"],
  ["exports", "EX", "Exports"],
  ["security", "SC", "Security"],
  ["roles", "RL", "Roles"],
  ["automation", "AU", "Automation"],
  ["plans", "PL", "Plans"],
  ["billing", "BL", "Billing"],
  ["aiusage", "AI", "AI Usage"],
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
