import React from "react";
import FreshNotificationBell from "./FreshNotificationBell";
import { useAuth } from "../context/AuthContext";
import "./freshMobileAppShell.css";
import "./freshSidebarCompact.css";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";

const groups = [
  { title: "Home", items: [["today", "TW", "Today's Work"], ["command", "CM", "Command"]] },
  { title: "Work", items: [["leads", "RQ", "Requests"], ["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"], ["payments", "PY", "Payments"], ["xero", "XE", "Xero"]] },
  { title: "Operator OS", items: [["planday", "PD", "Plan My Day"], ["workerbrief", "WB", "Worker Brief"], ["invoicecheck", "IC", "Invoice Check"], ["quoteai", "QA", "Quote AI"], ["portal", "PT", "Portal Links"]] },
  { title: "Team", items: [["team", "TM", "Team"], ["payroll", "PR", "Payroll"], ["settings", "SG", "Settings"]] },
];

const moreGroup = {
  title: "More tools",
  items: [
    ["askchurvox", "AI", "AI Guide"],
    ["aioperatorstudio", "AO", "AI Studio"],
    ["quickcreateai", "QC", "Quick Create"],
    ["followupwriter", "FU", "Follow-up Writer"],
    ["workercommand", "WC", "Worker View"],
    ["time", "TS", "Time Sheets"],
    ["automation", "AT", "Automation"],
    ["reports", "RP", "Reports"],
    ["launchcontrol", "LC", "Launch"],
    ["imports", "IM", "Imports"],
    ["exports", "EX", "Exports"],
    ["plans", "PL", "Plans"],
    ["support", "SP", "Support"],
  ],
};

const mobileItems = [["today", "TW", "Today"], ["jobs", "JB", "Jobs"], ["command", "CM", "Command"], ["invoices", "$", "Money"], ["more", "+", "More"]];
const mobileMoreOrder = ["planday", "workerbrief", "invoicecheck", "quoteai", "portal", "clients", "payments", "xero", "team", "workercommand", "time", "support", "settings"];

const mobileLabels = {
  today: "Today's Work",
  todayswork: "Today's Work",
  worktoday: "Today's Work",
  smart: "Today's Work",
  hub: "Today's Work",
  dashboard: "Today's Work",
  dispatch: "Today's Work",
  schedule: "Today's Work",
  calendar: "Today's Work",
  jobs: "Jobs",
  clients: "Clients",
  leads: "Requests",
  quotes: "Quotes",
  invoices: "Money",
  payments: "Money",
  xero: "Xero",
  planday: "Plan My Day",
  workerbrief: "Worker Brief",
  invoicecheck: "Invoice Check",
  quoteai: "Quote AI",
  portal: "Portal Links",
  team: "Team",
  workercommand: "Worker View",
  time: "Time Sheets",
  payroll: "Payroll",
  command: "Command",
  automation: "Automation",
  reports: "Reports",
  launchcontrol: "Launch",
  settings: "Settings",
  imports: "Imports",
  exports: "Exports",
  plans: "Plans",
  support: "Support",
  askchurvox: "AI Guide",
  aioperatorstudio: "AI Studio",
  quickcreateai: "Quick Create",
  followupwriter: "Follow-up Writer",
};

const parentByKey = {
  smart: "today",
  hub: "today",
  dashboard: "today",
  dispatch: "today",
  schedule: "today",
  calendar: "today",
  todayswork: "today",
  worktoday: "today",
  routes: "today",
  areas: "today",
  schedulerai: "today",
  gps: "time",
  customerportal: "portal",
  clientportal: "portal",
  proofpack: "portal",
  followupwriter: "followupwriter",
  reviewbooster: "clients",
};

[...groups, moreGroup].forEach((group) => group.items.forEach(([key]) => { parentByKey[key] = key; }));

function guideIsComplete() {
  try {
    return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true";
  } catch {
    return false;
  }
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter(([key]) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanGroups(sourceGroups, guideComplete = false) {
  const seen = new Set();
  return sourceGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter(([key]) => !(guideComplete && key === "setupassistant"))
        .filter(([key]) => {
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }),
    }))
    .filter((group) => group.items.length);
}

function resetScroll() {
  const run = () => {
    try {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      document.querySelectorAll(".freshMain,.freshPageScroll,.freshApp,main").forEach((el) => {
        if (el) el.scrollTop = 0;
      });
    } catch {}
  };

  run();
  try { window.requestAnimationFrame(run); } catch {}
  [40, 120, 300, 650].forEach((delay) => window.setTimeout(run, delay));
}

function cleanAsk(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9$@.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isJobCommand(text) {
  const lower = cleanAsk(text);
  return /(add|new|create|book|make).{0,50}(job|work|booking|service)/.test(lower) ||
    /lawn|mowing|cleaning|garden|handyman|painting|plumbing|electrical/.test(lower);
}

function isClientCommand(text) {
  const lower = cleanAsk(text);
  return /(add|new|create|make).{0,40}(client|customer)/.test(lower);
}

function askRoute(text) {
  const lower = cleanAsk(text);
  if (isJobCommand(text)) return "jobs";
  if (isClientCommand(text)) return "clients";
  if (lower.includes("worker brief") || lower.includes("brief worker") || lower.includes("staff brief")) return "workerbrief";
  if (lower.includes("plan my day") || lower.includes("day plan") || lower.includes("route today") || lower.includes("plan today")) return "planday";
  if (lower.includes("invoice check") || lower.includes("missing money") || lower.includes("missing extra")) return "invoicecheck";
  if (lower.includes("quote option") || lower.includes("quote ai") || lower.includes("quote draft")) return "quoteai";
  if (lower.includes("proof pack") || lower.includes("customer link") || lower.includes("client portal") || lower.includes("portal")) return "portal";
  if (lower.includes("unpaid") || lower.includes("overdue") || lower.includes("payment")) return "payments";
  if (lower.includes("xero") || lower.includes("myob")) return "xero";
  if (lower.includes("payroll")) return "payroll";
  if (lower.includes("import") || lower.includes("csv")) return "imports";
  if (lower.includes("command") || lower.includes("review") || lower.includes("approve") || lower.includes("follow up")) return "command";
  if (lower.includes("job")) return "jobs";
  return "askchurvox";
}

function fireJobAsk(text) {
  window.dispatchEvent(new CustomEvent("churvox:open-job-popup", {
    detail: { text, instruction: text, source: "ask-churvox" },
  }));
}

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);
  const [globalAsk, setGlobalAsk] = React.useState("");
  const currentPrimary = parentByKey[active] || active;
  const mobileTitle = mobileLabels[currentPrimary] || mobileLabels[active] || "Churvox";
  const showGlobalAsk = currentPrimary === "today";

  React.useEffect(() => {
    const refresh = () => setGuideComplete(guideIsComplete());
    window.addEventListener("storage", refresh);
    window.addEventListener("churvox:ai-guide-status", refresh);
    window.addEventListener("churvox:fresh-data-updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("churvox:ai-guide-status", refresh);
      window.removeEventListener("churvox:fresh-data-updated", refresh);
    };
  }, []);

  React.useLayoutEffect(() => { resetScroll(); }, [active]);
  React.useEffect(() => { resetScroll(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(groups, guideComplete), [guideComplete]);
  const safeMoreItems = React.useMemo(() => cleanGroups([moreGroup], guideComplete)[0]?.items || [], [guideComplete]);
  const moreHasActiveItem = safeMoreItems.some(([key]) => currentPrimary === key);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => {
    const byKey = new Map(uniqueItems([...safeGroups.flatMap((group) => group.items), ...safeMoreItems]).map((item) => [item[0], item]));
    return mobileMoreOrder.map((key) => byKey.get(key)).filter(Boolean);
  }, [safeGroups, safeMoreItems]);

  function go(key) {
    if (key === "more") return;
    setMoreOpen(false);
    resetScroll();
    navigate(key);
  }

  async function handleLogout() {
    try {
      if (auth?.logout) await auth.logout();
    } finally {
      window.location.href = "/login";
    }
  }

  function handleMobile(key) {
    if (key === "more") {
      setMoreOpen((value) => !value);
      return;
    }
    go(key);
  }

  function openMobileJob() {
    const text = "New job";
    try {
      window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, text, at: Date.now() }));
    } catch {}

    if (currentPrimary === "jobs") fireJobAsk(text);
    else {
      go("jobs");
      [120, 350, 800].forEach((delay) => window.setTimeout(() => fireJobAsk(text), delay));
    }
  }

  function openMobileClient() {
    try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {}
    if (currentPrimary === "clients") window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { source: "mobile-quick-action" } }));
    else go("clients");
  }

  function submitAsk(event) {
    event?.preventDefault?.();

    const text = globalAsk.trim();
    if (!text) return;

    const route = askRoute(text);

    try { window.localStorage.setItem(ASK_DRAFT_KEY, text); } catch {}

    if (route === "jobs") {
      try {
        window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({
          open: true,
          instruction: text,
          text,
          at: Date.now(),
        }));
      } catch {}

      if (currentPrimary === "jobs") fireJobAsk(text);
      else {
        go("jobs");
        [120, 350, 800].forEach((delay) => window.setTimeout(() => fireJobAsk(text), delay));
      }

      setGlobalAsk("");
      return;
    }

    if (route === "clients") {
      try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {}
      if (currentPrimary === "clients") {
        window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { text } }));
      } else {
        go("clients");
      }
      setGlobalAsk("");
      return;
    }

    go(route);
    setGlobalAsk("");
  }

  return (
    <>
      <FreshNotificationBell />

      <div className="freshApp">
        <aside className="freshSide">
          <div className="freshBrand">
            <div className="freshLogo">C</div>
            <div>
              <strong>CHURVOX</strong>
              <small>Owner workspace</small>
            </div>
          </div>

          <button className="freshLogoutSide" type="button" onClick={handleLogout}>Log out</button>

          <nav className="freshNav">
            {safeGroups.map((group) => (
              <section className="freshNavGroup" key={group.title}>
                <p>{group.title}</p>
                {group.items.map(([key, mark, label]) => (
                  <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}>
                    <i>{mark}</i>
                    <span>{label}</span>
                  </button>
                ))}
              </section>
            ))}

            {safeMoreItems.length ? (
              <section className="freshNavGroup freshNavMoreGroup">
                <details className="freshNavMore" open={moreHasActiveItem}>
                  <summary aria-label="More tools" title="More tools">
                    <span>More tools</span>
                    <small>{safeMoreItems.length}</small>
                  </summary>
                  <div className="freshNavMoreItems">
                    {safeMoreItems.map(([key, mark, label]) => (
                      <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}>
                        <i>{mark}</i>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </details>
              </section>
            ) : null}
          </nav>
        </aside>

        <main className="freshMain">
          <header className="freshMobileAppTop">
            <div>
              <b>Churvox</b>
              <span>{mobileTitle} - field mode</span>
            </div>
            <button className="freshMobileLogout" type="button" onClick={handleLogout}>Log out</button>
          </header>

          <section className="freshMobileQuickActions" aria-label="Mobile quick actions">
            <button type="button" aria-label="New job" title="New job" onClick={openMobileJob}><b>+</b><span>New job</span></button>
            <button type="button" aria-label="Add client" title="Add client" onClick={openMobileClient}><b>CL</b><span>Add client</span></button>
            <button type="button" aria-label="Open approvals" title="Open approvals" onClick={() => go("command")}><b>OK</b><span>Approve</span></button>
            <button type="button" aria-label="Open unpaid invoices" title="Open unpaid invoices" onClick={() => go("payments")}><b>$</b><span>Unpaid</span></button>
          </section>

          {showGlobalAsk ? (
            <form className="freshGlobalAsk" onSubmit={submitAsk}>
                <label>
                  <span>What do you want to do?</span>
                  <input
                    value={globalAsk}
                    onChange={(event) => setGlobalAsk(event.target.value)}
                    placeholder="book a job, plan my day, check invoices, prepare worker brief..."
                  />
                </label>
                <button type="submit">Ask Churvox</button>
            </form>
          ) : null}

          <div className="freshPageScroll" key={active}>{children}</div>
        </main>

        {moreOpen && (
          <div className="freshMobileMore">
            {safeExtraMobile.map(([key, mark, label]) => (
              <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}>
                <i>{mark}</i>
                <span>{label}</span>
              </button>
            ))}
            <div className="freshMobileMoreNote">
              <b>Desktop tools</b>
              <span>Payroll, reports, imports, exports, plans and launch controls are cleaner on PC. Phone mode keeps the fast owner actions up front.</span>
            </div>
          </div>
        )}

        <nav className="freshMobileNav" aria-label="Mobile navigation">
          {safeMobileItems.map(([key, mark, label]) => (
            <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}>
              <i>{mark}</i>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
