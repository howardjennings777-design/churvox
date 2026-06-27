import React from "react";

const PAGES = [
  { key: "dashboard", label: "Smart Hub", code: "SH", group: "Home" },
  { key: "command", label: "Command", code: "CM", group: "Home" },
  { key: "messages", label: "Messages", code: "MS", group: "Home" },
  { key: "jobs", label: "Jobs", code: "JB", group: "Work" },
  { key: "clients", label: "Clients", code: "CL", group: "Work" },
  { key: "team", label: "Team", code: "TM", group: "Work" },
  { key: "workers", label: "Worker View", code: "WV", group: "Work" },
  { key: "quotes", label: "Quotes", code: "QT", group: "Money" },
  { key: "invoices", label: "Invoices", code: "IV", group: "Money" },
  { key: "xero", label: "Xero Sync", code: "AC", group: "Money" },
  { key: "settings", label: "Settings", code: "SG", group: "Support" },
  { key: "plans", label: "Plans", code: "PL", group: "Support" },
  { key: "help", label: "Help", code: "HP", group: "Support" },
];

const ROUTE_ALIASES = {
  "": "dashboard",
  home: "dashboard",
  smart: "dashboard",
  hub: "dashboard",
  planday: "dashboard",
  today: "dashboard",
  calendar: "dashboard",
  schedule: "dashboard",
  recurring: "jobs",
  workercommand: "workers",
  worker: "workers",
  workerview: "workers",
  field: "workers",
  payroll: "team",
  time: "workers",
  payments: "invoices",
  accounting: "xero",
  sync: "xero",
  support: "help",
  helpdesk: "help",
  trust: "help",
};

const HERO_STATS = {
  dashboard: [["82", "Jobs watched"], ["21", "Need invoice"], ["32", "Worker gaps"], ["2", "Active workers"]],
  command: [["12", "To approve"], ["3", "Prepared forms"], ["1", "Memory match"], ["0", "Sent without owner"]],
  messages: [["6", "Draft replies"], ["2", "Client follow-ups"], ["1", "Worker note"], ["0", "Auto-sent"]],
  jobs: [["26", "Open jobs"], ["8", "Need worker"], ["5", "Ready to invoice"], ["14", "Recurring"]],
  clients: [["118", "Client records"], ["42", "With history"], ["9", "Need follow-up"], ["$85", "Last matched price"]],
  team: [["7", "People"], ["2", "Invite pending"], ["4", "Payroll ready"], ["1", "Needs access"]],
  workers: [["2", "Live"], ["5", "Jobs today"], ["9", "Proof items"], ["1", "Route alert"]],
  quotes: [["11", "Open quotes"], ["4", "Ready to send"], ["3", "Follow-up"], ["2", "Convert to job"]],
  invoices: [["9", "Drafts"], ["6", "Sent"], ["3", "Overdue"], ["$2.8k", "Waiting"]],
  xero: [["1", "Connection"], ["9", "Draft sync"], ["0", "Auto-send"], ["0", "Tax filing"]],
  settings: [["4", "Business checks"], ["1", "Branding"], ["3", "Defaults"], ["0", "Unsafe actions"]],
  plans: [["4", "Plans"], ["14", "Trial days"], ["1", "Popular"], ["$39", "Entry"]],
  help: [["5", "Launch checks"], ["3", "Guides"], ["1", "Contact"], ["0", "Dead ends"]],
};

const PAGE_META = {
  dashboard: {
    kicker: "Owner cockpit",
    title: "What needs doing now?",
    text: "One owner screen. Jobs, money, proof and worker gaps are already sorted so the next decision is obvious.",
    primary: "Add job",
    secondary: "Send top issue to Command",
  },
  command: {
    kicker: "Approval desk",
    title: "Churvox prepares. You approve.",
    text: "Invoices, quotes, messages, payroll checks and sync drafts arrive here as owner decisions, not scattered chores.",
    primary: "Approve selected",
    secondary: "Edit prepared form",
  },
  messages: {
    kicker: "Client and worker replies",
    title: "Messages without inbox hunting.",
    text: "Churvox drafts the useful replies, links them to the job or client, then waits for owner approval before anything leaves.",
    primary: "Review replies",
    secondary: "Open Command",
  },
  jobs: {
    kicker: "Work board",
    title: "Jobs stay simple: who, where, what next.",
    text: "Recurring work, worker gaps, proof and invoice prompts live on the job board without making the owner think through admin steps.",
    primary: "Create job",
    secondary: "Add recurring run",
  },
  clients: {
    kicker: "Customer memory",
    title: "Every client has a trail.",
    text: "Prices, notes, jobs, quotes, invoices and preferences stay together so Churvox can prepare the next admin move correctly.",
    primary: "Add client",
    secondary: "Prepare follow-up",
  },
  team: {
    kicker: "People and access",
    title: "Team is where people become usable.",
    text: "Invite workers, set access, watch missing setup and keep payroll links close without turning Team into another admin maze.",
    primary: "Add person",
    secondary: "Open payroll review",
  },
  workers: {
    kicker: "Field command",
    title: "Live GPS, proof, time and job status in one view.",
    text: "Worker activity becomes owner confidence: location, current job, photos, notes and time all feed Command decisions.",
    primary: "Refresh live view",
    secondary: "Open Team",
  },
  quotes: {
    kicker: "Offer pipeline",
    title: "Quotes should become jobs, not paperwork.",
    text: "Draft, send, follow up and convert quotes from one focused surface while Churvox watches what needs a decision.",
    primary: "Create quote",
    secondary: "Convert accepted quote",
  },
  invoices: {
    kicker: "Money desk",
    title: "Finished work becomes checked invoices.",
    text: "Draft value, unpaid money, overdue work and sync state stay visible so the owner reviews the bill instead of rebuilding it.",
    primary: "Create invoice",
    secondary: "Check payments",
  },
  xero: {
    kicker: "Accounting sync",
    title: "Draft sync only. Owner approval stays in control.",
    text: "Accounting stays useful and safe: draft invoices, payment checks and export readiness without auto-send, tax filing or payout files.",
    primary: "Check connection",
    secondary: "Prepare latest draft",
  },
  settings: {
    kicker: "Business controls",
    title: "Settings should protect the business, not hide it.",
    text: "Branding, GST, regions, defaults, account controls and safety rules are grouped around how the business actually runs.",
    primary: "Save business setup",
    secondary: "Review safety rules",
  },
  plans: {
    kicker: "Plans",
    title: "Simple plans. Real capability.",
    text: "Start simple, add crew, unlock the operator layer, then use Command when Churvox becomes the approval engine for the business.",
    primary: "Choose plan",
    secondary: "Compare tiers",
  },
  help: {
    kicker: "Launch support",
    title: "Help should get the owner unstuck fast.",
    text: "Setup checks, contact, launch guidance and safe support paths live here without sending users around the app looking for answers.",
    primary: "Run setup check",
    secondary: "Contact support",
  },
};

const COMMAND_QUEUE = [
  ["Invoice ready", "Lawn job is complete. Price matches client memory. Draft is prepared."],
  ["Assign worker", "Tomorrow job has no worker. Best match found from team availability."],
  ["Quote follow-up", "Quote has been viewed. Churvox prepared a short follow-up."],
  ["Payroll note", "Worker time changed after job completion. Owner review needed."],
];

const PLAN_CARDS = [
  ["Start", "$39/month + GST", "Jobs, clients, quotes and invoices for one owner getting organised."],
  ["Crew", "$89/month + GST", "Adds worker view, team access and field proof for small crews."],
  ["Operator", "$149/month + GST", "Most Popular. Adds the admin engine: follow-ups, checks and prepared work."],
  ["Command", "$299/month + GST", "Full approval desk, accounting sync option, payroll review and higher capacity."],
];

function normalisePage(value) {
  const raw = String(value || "").replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  return ROUTE_ALIASES[raw] || (PAGES.some((page) => page.key === raw) ? raw : "dashboard");
}

function usePageRouter() {
  const [page, setPage] = React.useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const fromHash = normalisePage(window.location.hash);
    if (fromHash) return fromHash;
    return normalisePage(window.localStorage?.getItem("churvox.owner.page"));
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onHash = () => setPage(normalisePage(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = React.useCallback((next) => {
    const target = normalisePage(next);
    setPage(target);
    if (typeof window !== "undefined") {
      window.localStorage?.setItem("churvox.owner.page", target);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
    }
  }, []);

  return [page, navigate];
}

function AppStyles() {
  return (
    <style>{`
      :root {
        --cvx-bg: #f4eadb;
        --cvx-panel: rgba(255, 252, 245, 0.92);
        --cvx-panel-strong: #fff8eb;
        --cvx-ink: #141415;
        --cvx-muted: #70685d;
        --cvx-line: rgba(31, 26, 21, 0.12);
        --cvx-black: #07090d;
        --cvx-orange: #f05a28;
        --cvx-gold: #e6a71e;
        --cvx-green: #13855b;
        --cvx-shadow: 0 24px 80px rgba(43, 31, 18, 0.18);
      }
      * { box-sizing: border-box; }
      html, body, #root { min-height: 100%; }
      body { margin: 0; background: var(--cvx-bg); color: var(--cvx-ink); }
      button, input { font: inherit; }
      .cvxApp {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 248px minmax(0, 1fr);
        background:
          radial-gradient(circle at 78% 8%, rgba(240, 90, 40, 0.18), transparent 28rem),
          linear-gradient(135deg, #fbf3e7 0%, #efe1d0 45%, #f8efe3 100%);
      }
      .cvxSide {
        position: sticky;
        top: 0;
        height: 100vh;
        padding: 18px 14px;
        background: linear-gradient(180deg, #0b0d12 0%, #11131a 58%, #090a0e 100%);
        color: #fff;
        overflow: auto;
      }
      .cvxBrand {
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 20px;
        padding: 16px;
        background: linear-gradient(145deg, rgba(240,90,40,0.24), rgba(255,255,255,0.04));
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
      }
      .cvxMark { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 12px; background: var(--cvx-orange); color: #fff; font-weight: 950; }
      .cvxBrand h1 { margin: 10px 0 3px; font-size: 17px; letter-spacing: 0.08em; text-transform: uppercase; }
      .cvxBrand p { margin: 0; color: rgba(255,255,255,0.72); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
      .cvxLogout { width: 100%; margin: 12px 0 18px; border: 0; border-radius: 14px; padding: 11px 12px; font-weight: 900; background: #f2edf1; color: #17151a; }
      .cvxNavGroup { margin: 14px 0; padding: 10px; border-radius: 18px; background: rgba(255,255,255,0.035); border: 1px solid rgba(255,255,255,0.06); }
      .cvxNavTitle { margin: 0 0 8px; color: rgba(255,255,255,0.46); font-size: 11px; font-weight: 950; letter-spacing: 0.1em; text-transform: uppercase; }
      .cvxNavGrid { display: grid; gap: 6px; }
      .cvxNavBtn { border: 0; width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 13px; background: transparent; color: rgba(255,255,255,0.82); font-size: 13px; font-weight: 850; text-align: left; cursor: pointer; }
      .cvxNavBtn.active { background: linear-gradient(135deg, var(--cvx-orange), #d94319); color: #fff; box-shadow: 0 10px 26px rgba(240,90,40,0.28); }
      .cvxCode { min-width: 28px; font-size: 10px; letter-spacing: 0.08em; opacity: 0.8; }
      .cvxSideFoot { margin-top: 18px; padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.82); font-size: 12px; font-weight: 850; }
      .cvxMain { min-width: 0; padding: 26px clamp(18px, 3vw, 44px) 46px; }
      .cvxTop { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
      .cvxBreadcrumb { font-size: 12px; font-weight: 950; letter-spacing: 0.12em; color: var(--cvx-muted); text-transform: uppercase; }
      .cvxAsk { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 18px; background: rgba(255,255,255,0.58); border: 1px solid var(--cvx-line); min-width: min(520px, 48vw); }
      .cvxAsk span { color: var(--cvx-muted); font-size: 11px; font-weight: 950; letter-spacing: 0.1em; text-transform: uppercase; }
      .cvxAsk input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; font-weight: 800; color: var(--cvx-ink); }
      .cvxAsk button, .cvxBtn { border: 0; border-radius: 14px; padding: 11px 14px; background: var(--cvx-orange); color: #fff; font-weight: 950; cursor: pointer; }
      .cvxBtn.dark { background: #11131a; }
      .cvxBtn.ghost { color: #17151a; background: rgba(255,255,255,0.62); border: 1px solid var(--cvx-line); }
      .cvxPage { min-height: calc(100vh - 72px); display: grid; gap: 18px; align-content: start; }
      .cvxHero { min-height: 260px; border-radius: 32px; padding: clamp(24px, 4vw, 48px); color: white; overflow: hidden; position: relative; display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 460px); gap: 24px; align-items: end; background:
          radial-gradient(circle at 88% 28%, rgba(240,90,40,0.78), transparent 11rem),
          radial-gradient(circle at 48% 24%, rgba(45, 70, 105, 0.34), transparent 18rem),
          linear-gradient(135deg, #07090d 0%, #111720 54%, #07090d 100%);
        box-shadow: var(--cvx-shadow);
      }
      .cvxHero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(110deg, rgba(255,255,255,0.08), transparent 34%, rgba(255,255,255,0.05)); pointer-events: none; }
      .cvxHero > * { position: relative; z-index: 1; }
      .cvxKicker { display: inline-flex; align-items: center; width: fit-content; border-radius: 999px; padding: 8px 11px; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 950; letter-spacing: 0.12em; text-transform: uppercase; }
      .cvxHero h2 { margin: 18px 0 10px; max-width: 760px; font-size: clamp(44px, 6vw, 82px); line-height: 0.92; letter-spacing: -0.04em; }
      .cvxHero p { margin: 0 0 20px; max-width: 780px; color: rgba(255,255,255,0.86); font-size: clamp(15px, 1.6vw, 19px); font-weight: 850; }
      .cvxHeroActions { display: flex; flex-wrap: wrap; gap: 10px; }
      .cvxHeroStats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .cvxStatTile { min-height: 98px; border: 1px solid rgba(255,255,255,0.12); border-radius: 22px; padding: 17px; background: rgba(255,255,255,0.09); box-shadow: inset 0 1px 0 rgba(255,255,255,0.1); }
      .cvxStatTile b { display: block; font-size: 34px; line-height: 1; }
      .cvxStatTile span { display: block; margin-top: 9px; color: rgba(255,255,255,0.72); font-size: 11px; font-weight: 950; letter-spacing: 0.08em; text-transform: uppercase; }
      .cvxBoard { display: grid; grid-template-columns: 1.1fr 1.35fr 0.9fr; gap: 18px; align-items: stretch; }
      .cvxPanel { border: 1px solid var(--cvx-line); border-radius: 26px; padding: 20px; background: var(--cvx-panel); box-shadow: 0 18px 50px rgba(54, 38, 20, 0.11); min-width: 0; }
      .cvxPanel.dark { background: #11131a; color: #fff; }
      .cvxPanel.gold { background: linear-gradient(145deg, #f7b731, #f05a28); color: #16120c; }
      .cvxPanel h3 { margin: 0 0 8px; font-size: 28px; letter-spacing: -0.04em; }
      .cvxPanel p { margin: 0; color: var(--cvx-muted); font-weight: 760; }
      .cvxPanel.dark p { color: rgba(255,255,255,0.68); }
      .cvxList { display: grid; gap: 10px; margin-top: 16px; }
      .cvxItem { border: 1px solid var(--cvx-line); border-left: 4px solid var(--cvx-orange); border-radius: 18px; padding: 13px; background: rgba(255,255,255,0.58); }
      .cvxItem b { display: block; margin-bottom: 4px; }
      .cvxItem span { color: var(--cvx-muted); font-size: 13px; font-weight: 760; }
      .cvxDecision { min-height: 320px; display: grid; align-content: center; gap: 18px; padding: 26px; border-radius: 28px; background: #fffaf1; border: 1px solid var(--cvx-line); }
      .cvxDecision h3 { font-size: clamp(32px, 3.8vw, 54px); line-height: 0.94; margin: 0; letter-spacing: -0.05em; }
      .cvxDecisionGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .cvxMini { border-radius: 16px; padding: 12px; background: rgba(20,20,21,0.04); border: 1px solid var(--cvx-line); }
      .cvxMini small { display: block; color: var(--cvx-muted); font-size: 10px; font-weight: 950; letter-spacing: 0.1em; text-transform: uppercase; }
      .cvxMini strong { display: block; margin-top: 5px; }
      .cvxRail { display: grid; gap: 10px; }
      .cvxRail .cvxItem { border-left-color: #11131a; }
      .cvxCommandDesk { display: grid; grid-template-columns: 0.95fr 1.2fr 0.85fr; gap: 18px; }
      .cvxQueueItem { border: 1px solid var(--cvx-line); border-radius: 18px; padding: 14px; background: rgba(255,255,255,0.7); }
      .cvxQueueItem:first-child { background: #11131a; color: #fff; border-color: #11131a; }
      .cvxQueueItem span { color: inherit; opacity: 0.68; font-size: 13px; font-weight: 760; }
      .cvxMap { min-height: 330px; border-radius: 28px; border: 1px solid rgba(20,20,21,0.1); background:
          linear-gradient(rgba(20,20,21,0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(20,20,21,0.05) 1px, transparent 1px),
          radial-gradient(circle at 62% 42%, rgba(240,90,40,0.2), transparent 9rem),
          #fff8eb;
        background-size: 34px 34px, 34px 34px, auto, auto;
        display: grid; place-items: center; text-align: center; padding: 26px;
      }
      .cvxMap b { width: 70px; height: 70px; display: grid; place-items: center; border-radius: 50%; background: var(--cvx-orange); color: #fff; margin: 0 auto 14px; }
      .cvxSplit { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
      .cvxPlans { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
      .cvxPlan { border-radius: 24px; padding: 20px; background: rgba(255,255,255,0.72); border: 1px solid var(--cvx-line); }
      .cvxPlan.popular { background: #11131a; color: #fff; transform: translateY(-8px); }
      .cvxPlan h3 { margin: 0 0 10px; font-size: 26px; }
      .cvxPlan strong { display: block; margin-bottom: 12px; color: var(--cvx-orange); }
      .cvxPlan.popular strong { color: #f8b33a; }
      .cvxPlan p { margin: 0; color: var(--cvx-muted); font-weight: 760; }
      .cvxPlan.popular p { color: rgba(255,255,255,0.72); }
      @media (max-width: 1040px) {
        .cvxApp { grid-template-columns: 1fr; }
        .cvxSide { position: relative; height: auto; display: block; }
        .cvxNavGroup { display: inline-block; vertical-align: top; width: calc(50% - 6px); }
        .cvxHero, .cvxBoard, .cvxCommandDesk, .cvxSplit { grid-template-columns: 1fr; }
        .cvxPlans { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .cvxAsk { min-width: 0; width: 100%; }
        .cvxTop { align-items: stretch; flex-direction: column; }
      }
      @media (max-width: 620px) {
        .cvxMain { padding: 14px; }
        .cvxHero { border-radius: 24px; padding: 24px; }
        .cvxHeroStats, .cvxDecisionGrid, .cvxPlans { grid-template-columns: 1fr; }
        .cvxNavGroup { width: 100%; }
      }
    `}</style>
  );
}

function Sidebar({ active, onNavigate }) {
  const groups = PAGES.reduce((acc, page) => {
    acc[page.group] = acc[page.group] || [];
    acc[page.group].push(page);
    return acc;
  }, {});

  return (
    <aside className="cvxSide">
      <div className="cvxBrand">
        <div className="cvxMark">C</div>
        <h1>Churvox</h1>
        <p>Command workspace</p>
      </div>
      <button className="cvxLogout" type="button">Log out</button>
      {Object.entries(groups).map(([group, pages]) => (
        <nav className="cvxNavGroup" key={group} aria-label={group}>
          <p className="cvxNavTitle">{group}</p>
          <div className="cvxNavGrid">
            {pages.map((page) => (
              <button
                key={page.key}
                type="button"
                className={`cvxNavBtn ${active === page.key ? "active" : ""}`}
                onClick={() => onNavigate(page.key)}
              >
                <span className="cvxCode">{page.code}</span>
                <span>{page.label}</span>
              </button>
            ))}
          </div>
        </nav>
      ))}
      <div className="cvxSideFoot">Churvox does the admin. You approve.</div>
    </aside>
  );
}

function TopBar({ page }) {
  const label = PAGES.find((item) => item.key === page)?.label || "Smart Hub";
  return (
    <div className="cvxTop">
      <div className="cvxBreadcrumb">Churvox / {label}</div>
      <div className="cvxAsk">
        <span>What needs doing?</span>
        <input aria-label="Ask Churvox" placeholder="Book a job, find unpaid work, prepare a follow-up..." />
        <button type="button">Ask</button>
      </div>
    </div>
  );
}

function Hero({ page }) {
  const meta = PAGE_META[page] || PAGE_META.dashboard;
  const stats = HERO_STATS[page] || HERO_STATS.dashboard;
  return (
    <section className="cvxHero">
      <div>
        <span className="cvxKicker">{meta.kicker}</span>
        <h2>{meta.title}</h2>
        <p>{meta.text}</p>
        <div className="cvxHeroActions">
          <button className="cvxBtn" type="button">{meta.primary}</button>
          <button className="cvxBtn dark" type="button">{meta.secondary}</button>
        </div>
      </div>
      <div className="cvxHeroStats">
        {stats.map(([value, label]) => (
          <div className="cvxStatTile" key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SmartHubPage({ onNavigate }) {
  return (
    <>
      <Hero page="dashboard" />
      <section className="cvxBoard">
        <div className="cvxPanel">
          <h3>Run today</h3>
          <p>Jobs stay simple: who, where, worker, status and next money step.</p>
          <div className="cvxList">
            {["Lawn - Naenae", "Worker proof job", "QA follow-up", "Tomorrow recurring run"].map((item) => <div className="cvxItem" key={item}><b>{item}</b><span>Ready for owner attention when needed.</span></div>)}
          </div>
        </div>
        <div className="cvxDecision">
          <span className="cvxKicker">Next best move</span>
          <h3>Prepare the completed lawn job as an invoice.</h3>
          <p>Worker proof is missing, so Churvox keeps it in Command instead of sending anything.</p>
          <div className="cvxHeroActions">
            <button className="cvxBtn" type="button" onClick={() => onNavigate("command")}>Prepare in Command</button>
            <button className="cvxBtn ghost" type="button" onClick={() => onNavigate("jobs")}>Open job board</button>
          </div>
        </div>
        <div className="cvxPanel dark">
          <h3>Silent engine</h3>
          <p>Things Churvox watches without turning them into extra screens.</p>
          <div className="cvxList">
            <div className="cvxItem"><b>Invoices watched</b><span>Completed jobs become invoice prompts.</span></div>
            <div className="cvxItem"><b>Quotes watched</b><span>Viewed quotes become follow-up prompts.</span></div>
            <div className="cvxItem"><b>Workers watched</b><span>GPS, proof and time feed owner confidence.</span></div>
          </div>
        </div>
      </section>
    </>
  );
}

function CommandPage() {
  return (
    <>
      <Hero page="command" />
      <section className="cvxCommandDesk">
        <div className="cvxPanel">
          <h3>Admin queue</h3>
          <p>Only what needs a decision.</p>
          <div className="cvxList">
            {COMMAND_QUEUE.map(([title, text]) => <div className="cvxQueueItem" key={title}><b>{title}</b><br /><span>{text}</span></div>)}
          </div>
        </div>
        <div className="cvxDecision">
          <span className="cvxKicker">Prepared by Churvox</span>
          <h3>Invoice draft is filled. Owner checks price and proof.</h3>
          <div className="cvxDecisionGrid">
            <div className="cvxMini"><small>Client</small><strong>Howard Jennings Naenae</strong></div>
            <div className="cvxMini"><small>Memory</small><strong>Last similar job was $85</strong></div>
            <div className="cvxMini"><small>Proof</small><strong>Worker note/photo missing</strong></div>
            <div className="cvxMini"><small>Decision</small><strong>Approve, edit or park</strong></div>
          </div>
          <div className="cvxHeroActions"><button className="cvxBtn" type="button">Approve</button><button className="cvxBtn dark" type="button">Save edit</button><button className="cvxBtn ghost" type="button">Park</button></div>
        </div>
        <div className="cvxPanel gold">
          <h3>Owner control</h3>
          <p>No auto-send, no tax filing, no bank payout files, no paid status without confirmed sync.</p>
        </div>
      </section>
    </>
  );
}

function JobsPage({ onNavigate }) {
  return (
    <>
      <Hero page="jobs" />
      <section className="cvxSplit">
        <div className="cvxPanel"><h3>Work board</h3><p>Recurring belongs here. The owner sees today, tomorrow, blocked and ready-to-invoice work without another sidebar item.</p><div className="cvxList">{["Today", "Recurring", "Needs worker", "Ready to invoice"].map((x) => <div className="cvxItem" key={x}><b>{x}</b><span>Filtered job lane with next action.</span></div>)}</div></div>
        <div className="cvxDecision"><span className="cvxKicker">Job record</span><h3>One job opens one focused workspace.</h3><p>Client, worker, time, proof, notes, quote and invoice history stay attached to the job.</p><button className="cvxBtn" type="button" onClick={() => onNavigate("command")}>Send issue to Command</button></div>
      </section>
    </>
  );
}

function ClientsPage() {
  return (
    <>
      <Hero page="clients" />
      <section className="cvxBoard">
        <div className="cvxPanel"><h3>Client list</h3><p>Search by name, email, phone or service address.</p><div className="cvxList"><div className="cvxItem"><b>bob</b><span>bob@bob / 0204957974</span></div><div className="cvxItem"><b>Kauri Dental</b><span>Quote and job history attached.</span></div></div></div>
        <div className="cvxDecision"><span className="cvxKicker">Client memory</span><h3>Reuse what worked before.</h3><p>Last price, notes, preferred wording, service address and recent work feed better Command approvals.</p><div className="cvxDecisionGrid"><div className="cvxMini"><small>Recent value</small><strong>$85</strong></div><div className="cvxMini"><small>Next action</small><strong>Prepare follow-up</strong></div></div></div>
        <div className="cvxPanel"><h3>Client actions</h3><p>Create job, create quote, import clients CSV, refresh record.</p><div className="cvxList"><button className="cvxBtn" type="button">Add client</button><button className="cvxBtn dark" type="button">Create quote</button></div></div>
      </section>
    </>
  );
}

function WorkersPage({ onNavigate }) {
  return (
    <>
      <Hero page="workers" />
      <section className="cvxSplit">
        <div className="cvxPanel"><h3>Workers</h3><p>Tap a worker to see full GPS, current job, proof, alerts and time.</p><div className="cvxList"><div className="cvxItem"><b>No live worker selected</b><span>Waiting for real worker app location data.</span></div><button className="cvxBtn dark" type="button" onClick={() => onNavigate("team")}>Open Team</button></div></div>
        <div className="cvxMap"><div><b>GPS</b><h3>Live GPS map</h3><p>Worker location, job site, route check, photos and timer proof appear here.</p></div></div>
      </section>
    </>
  );
}

function PipelinePage({ type }) {
  const isQuote = type === "quotes";
  return (
    <>
      <Hero page={type} />
      <section className="cvxBoard">
        <div className="cvxPanel"><h3>{isQuote ? "Quote trail" : "Invoice list"}</h3><p>{isQuote ? "Draft, sent, accepted and declined stay visible." : "Draft, sent, overdue, paid and sync state stay visible."}</p><div className="cvxList"><div className="cvxItem"><b>{isQuote ? "Open quote" : "Draft invoice"}</b><span>Prepared for owner review.</span></div><div className="cvxItem"><b>{isQuote ? "Follow-up needed" : "Payment check"}</b><span>Churvox watches quietly.</span></div></div></div>
        <div className="cvxDecision"><span className="cvxKicker">{isQuote ? "Offer decision" : "Money decision"}</span><h3>{isQuote ? "Approve, send or convert." : "Review before send or sync."}</h3><p>{isQuote ? "Accepted quotes move cleanly into Jobs." : "Invoices are checked against job, proof and client memory."}</p><button className="cvxBtn" type="button">{isQuote ? "Create quote" : "Create invoice"}</button></div>
        <div className="cvxPanel dark"><h3>{isQuote ? "Next step" : "Accounting guardrails"}</h3><p>{isQuote ? "Churvox prepares the follow-up and conversion path." : "Draft sync only. Owner approval stays required."}</p></div>
      </section>
    </>
  );
}

function TeamPage({ onNavigate }) {
  return (
    <>
      <Hero page="team" />
      <section className="cvxBoard">
        <div className="cvxPanel"><h3>People</h3><p>Staff, subcontractors, access and invite status.</p><div className="cvxList"><div className="cvxItem"><b>Worker access</b><span>Invite and app readiness.</span></div><div className="cvxItem"><b>Payroll link</b><span>Time review, not tax filing.</span></div></div></div>
        <div className="cvxDecision"><span className="cvxKicker">Team record</span><h3>People should unlock work, not create setup mess.</h3><p>Missing app access, missing payroll details and worker gaps are pushed to Command when owner action is needed.</p></div>
        <div className="cvxPanel"><h3>Actions</h3><div className="cvxList"><button className="cvxBtn" type="button">Add person</button><button className="cvxBtn dark" type="button" onClick={() => onNavigate("workers")}>Open worker view</button></div></div>
      </section>
    </>
  );
}

function XeroPage() {
  return (
    <>
      <Hero page="xero" />
      <section className="cvxSplit">
        <div className="cvxDecision"><span className="cvxKicker">Safe sync</span><h3>Accounting stays controlled.</h3><p>Churvox can prepare draft invoices and refresh payment status. It does not auto-send invoices, file tax or create payout files.</p><div className="cvxDecisionGrid"><div className="cvxMini"><small>Draft sync</small><strong>Owner approved</strong></div><div className="cvxMini"><small>Paid status</small><strong>Only after refresh</strong></div></div></div>
        <div className="cvxPanel"><h3>Connection</h3><p>Command includes one accounting sync option. Other paid tiers can add Accounting Sync Add-on for $39/month + GST where available.</p><div className="cvxList"><button className="cvxBtn" type="button">Check connection</button><button className="cvxBtn ghost" type="button">Download export</button></div></div>
      </section>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <Hero page="settings" />
      <section className="cvxBoard">
        {[["Business", "Name, logo, GST, region and defaults."], ["Safety", "Approval rules, sync guardrails and account controls."], ["Data", "Imports, exports and owner records."]].map(([title, text]) => <div className="cvxPanel" key={title}><h3>{title}</h3><p>{text}</p><div className="cvxList"><div className="cvxItem"><b>{title} setup</b><span>Grouped controls for this part of the business.</span></div></div></div>)}
      </section>
    </>
  );
}

function PlansPage() {
  return (
    <>
      <Hero page="plans" />
      <section className="cvxPlans">
        {PLAN_CARDS.map(([name, price, text]) => <div className={`cvxPlan ${name === "Operator" ? "popular" : ""}`} key={name}><h3>{name}</h3><strong>{price}</strong><p>{text}</p></div>)}
      </section>
      <section className="cvxPanel"><h3>Growth</h3><p>Command Growth Pack is $99/month + GST. Accounting Sync Add-on is $39/month + GST for non-Command tiers where available.</p></section>
    </>
  );
}

function HelpPage() {
  return (
    <>
      <Hero page="help" />
      <section className="cvxBoard">
        {[["Setup check", "Find what is missing before testers get in."], ["Contact", "Use hello@churvox.com for support."], ["Launch guide", "Simple steps for owner, worker and accounting checks."]].map(([title, text]) => <div className="cvxPanel" key={title}><h3>{title}</h3><p>{text}</p><div className="cvxList"><button className="cvxBtn ghost" type="button">Open</button></div></div>)}
      </section>
    </>
  );
}

function MessagesPage({ onNavigate }) {
  return (
    <>
      <Hero page="messages" />
      <section className="cvxSplit">
        <div className="cvxPanel"><h3>Prepared replies</h3><p>Nothing sends until the owner approves.</p><div className="cvxList"><div className="cvxItem"><b>Client follow-up</b><span>Quote viewed. Reply prepared.</span></div><div className="cvxItem"><b>Worker note</b><span>Proof request linked to job.</span></div></div></div>
        <div className="cvxDecision"><span className="cvxKicker">Owner approval</span><h3>Messages become decisions, not another inbox.</h3><p>Open Command to approve, edit or park prepared replies.</p><button className="cvxBtn" type="button" onClick={() => onNavigate("command")}>Open Command</button></div>
      </section>
    </>
  );
}

function PageBody({ page, onNavigate }) {
  if (page === "command") return <CommandPage />;
  if (page === "messages") return <MessagesPage onNavigate={onNavigate} />;
  if (page === "jobs") return <JobsPage onNavigate={onNavigate} />;
  if (page === "clients") return <ClientsPage />;
  if (page === "team") return <TeamPage onNavigate={onNavigate} />;
  if (page === "workers") return <WorkersPage onNavigate={onNavigate} />;
  if (page === "quotes") return <PipelinePage type="quotes" />;
  if (page === "invoices") return <PipelinePage type="invoices" />;
  if (page === "xero") return <XeroPage />;
  if (page === "settings") return <SettingsPage />;
  if (page === "plans") return <PlansPage />;
  if (page === "help") return <HelpPage />;
  return <SmartHubPage onNavigate={onNavigate} />;
}

export default function FreshApp() {
  const [page, navigate] = usePageRouter();

  return (
    <div className="cvxApp">
      <AppStyles />
      <Sidebar active={page} onNavigate={navigate} />
      <main className="cvxMain">
        <TopBar page={page} />
        <div className="cvxPage">
          <PageBody page={page} onNavigate={navigate} />
        </div>
      </main>
    </div>
  );
}
