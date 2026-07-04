// removed broken css import
import React from "react";
import FreshNotificationBell from "./FreshNotificationBell";
import { useAuth } from "../context/AuthContext";
import { currentPlanForUser, mobileItemsForUser, mobileMoreOrderForUser, sidebarGroupsForUser, sidebarMoreItemsForUser } from "./planRules";
// removed broken css import
// removed broken css import
// removed broken css import

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";

const mobileLabels = {
  planday: "Smart Hub", today: "Smart Hub", dashboard: "Smart Hub", smart: "Smart Hub", hub: "Smart Hub", dispatch: "Smart Hub", schedule: "Smart Hub", calendar: "Smart Hub", routes: "Smart Hub",
  jobs: "Jobs", clients: "Clients", quotes: "Quotes", invoices: "Money", payments: "Admin Debt", command: "Command", automation: "Follow-Ups", messages: "Messages", xero: "Accounting Sync",
  team: "Team", workercommand: "Worker Proof", time: "Time Approval", payroll: "Payroll", portal: "Proof Packs", reports: "Control Score", launchcontrol: "Setup Coach", settings: "Settings", imports: "Imports", exports: "Exports", plans: "Plans", support: "Help",
};

const parentByKey = {
  today: "planday", smart: "planday", hub: "planday", dashboard: "planday", dispatch: "planday", schedule: "planday", calendar: "planday", routes: "planday", todayswork: "planday", worktoday: "planday",
  askchurvox: "command", aioperatorstudio: "command", quickcreateai: "command", followupwriter: "command", quoteai: "command", invoicecheck: "command", workerbrief: "command",
  inbox: "messages", workermessages: "messages", workerinbox: "messages", gps: "time", customerportal: "portal", clientportal: "portal", proofpack: "portal", reviewbooster: "clients",
};

const CHURVOX_WORKSPACE_OS_CSS = `
  :root {
    --cvx-os-ink: #10131b;
    --cvx-os-muted: #5f6b7a;
    --cvx-os-line: rgba(16, 19, 27, .11);
    --cvx-os-paper: rgba(255, 252, 246, .9);
    --cvx-os-white: rgba(255, 255, 255, .86);
    --cvx-os-orange: #f97316;
    --cvx-os-green: #16a34a;
    --cvx-os-blue: #2563eb;
    --cvx-os-teal: #0f766e;
    --cvx-os-shadow: 0 22px 60px rgba(15, 23, 42, .14);
    --cvx-os-tight: 0 12px 30px rgba(15, 23, 42, .09);
  }

  body:has(.freshApp) {
    background: #f4eadc !important;
  }

  body:has(.freshApp) .freshApp {
    grid-template-columns: 232px minmax(0, 1fr) !important;
    background: #f4eadc !important;
  }

  body:has(.freshApp) .freshSide {
    width: 232px !important;
    padding: 14px 12px !important;
    background:
      linear-gradient(180deg, rgba(249, 115, 22, .18), transparent 18rem),
      linear-gradient(180deg, #080d16 0%, #111827 48%, #05070b 100%) !important;
    border-right: 1px solid rgba(255, 255, 255, .1) !important;
    box-shadow: 16px 0 44px rgba(15, 23, 42, .24) !important;
  }

  body:has(.freshApp) .freshBrand {
    min-height: 68px !important;
    padding: 12px !important;
    border-radius: 18px !important;
    background: rgba(255, 255, 255, .08) !important;
    border: 1px solid rgba(255, 255, 255, .1) !important;
  }

  body:has(.freshApp) .freshBrand strong {
    color: #fffaf0 !important;
    -webkit-text-fill-color: #fffaf0 !important;
    letter-spacing: .12em !important;
  }

  body:has(.freshApp) .freshBrand small {
    color: rgba(255, 250, 240, .68) !important;
    -webkit-text-fill-color: rgba(255, 250, 240, .68) !important;
  }

  body:has(.freshApp) .freshNav {
    display: grid !important;
    gap: 10px !important;
  }

  body:has(.freshApp) .freshNavGroup {
    margin: 0 !important;
    padding: 9px !important;
    border-radius: 18px !important;
    background: rgba(255, 255, 255, .045) !important;
    border: 1px solid rgba(255, 255, 255, .07) !important;
  }

  body:has(.freshApp) .freshNavGroup p,
  body:has(.freshApp) .freshNavMore summary span {
    color: rgba(255, 250, 240, .52) !important;
    -webkit-text-fill-color: rgba(255, 250, 240, .52) !important;
    letter-spacing: .13em !important;
  }

  body:has(.freshApp) .freshNav button,
  body:has(.freshApp) .freshNavMore summary {
    min-height: 36px !important;
    height: auto !important;
    border-radius: 12px !important;
    color: rgba(255, 250, 240, .82) !important;
    -webkit-text-fill-color: rgba(255, 250, 240, .82) !important;
  }

  body:has(.freshApp) .freshNav button.active {
    background: linear-gradient(90deg, #f97316, #ea580c) !important;
    color: #111827 !important;
    -webkit-text-fill-color: #111827 !important;
    box-shadow: 0 14px 30px rgba(249, 115, 22, .28) !important;
  }

  body:has(.freshApp) .freshMain {
    padding: 0 !important;
    background:
      radial-gradient(circle at 12% 0%, rgba(249, 115, 22, .13), transparent 30rem),
      linear-gradient(180deg, #fffaf1 0%, #f1e6d8 100%) !important;
  }

  body:has(.freshApp) .freshPageScroll {
    width: 100% !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 18px 22px 58px !important;
    box-sizing: border-box !important;
  }

  body:has(.freshApp) .freshPageScroll > section,
  body:has(.freshApp) .freshPageScroll > main,
  body:has(.freshApp) .freshPageScroll > div {
    width: 100% !important;
    max-width: none !important;
    min-height: calc(100vh - 36px) !important;
    display: grid !important;
    gap: 14px !important;
    align-content: start !important;
  }

  body:has(.freshApp) .freshHero,
  body:has(.freshApp) .freshTodayWorkHero,
  body:has(.freshApp) .freshCommandRebuildHero,
  body:has(.freshApp) .freshWorkerFieldHero,
  body:has(.freshApp) .cvPayHeader,
  body:has(.freshApp) .cvPlanHero {
    min-height: 182px !important;
    border-radius: 26px !important;
    border: 1px solid rgba(255, 255, 255, .16) !important;
    border-left: 8px solid var(--cvx-os-orange) !important;
    box-shadow: var(--cvx-os-shadow) !important;
    overflow: hidden !important;
    background:
      radial-gradient(circle at 90% 18%, rgba(249, 115, 22, .36), transparent 15rem),
      linear-gradient(120deg, #070b13 0%, #111827 58%, #231307 100%) !important;
  }

  body:has(.freshApp) .freshHero h1,
  body:has(.freshApp) .freshTodayWorkHero h1,
  body:has(.freshApp) .freshCommandRebuildHero h1,
  body:has(.freshApp) .freshWorkerFieldHero h1,
  body:has(.freshApp) .cvPayHeader h1,
  body:has(.freshApp) .cvPlanHero h1 {
    letter-spacing: -.035em !important;
    line-height: .92 !important;
    max-width: 980px !important;
  }

  body:has(.freshApp) .freshGrid,
  body:has(.freshApp) .freshCommandFixLayout,
  body:has(.freshApp) .freshWorkerNowPanel,
  body:has(.freshApp) .cvPlanMain,
  body:has(.freshApp) .cvPlanPanel,
  body:has(.freshApp) .cvPlanTruth,
  body:has(.freshApp) .cvPlanCompare {
    width: 100% !important;
    max-width: none !important;
    border: 1px solid var(--cvx-os-line) !important;
    border-radius: 26px !important;
    padding: 12px !important;
    gap: 12px !important;
    background:
      linear-gradient(135deg, rgba(255, 255, 255, .72), rgba(255, 247, 237, .72)),
      repeating-linear-gradient(90deg, rgba(249, 115, 22, .045) 0 1px, transparent 1px 84px) !important;
    box-shadow: var(--cvx-os-shadow) !important;
    backdrop-filter: blur(10px) !important;
  }

  body:has(.freshApp) .freshGrid {
    grid-template-columns: minmax(270px, .75fr) minmax(520px, 1.55fr) minmax(250px, .7fr) !important;
    align-items: stretch !important;
  }

  body:has(.freshApp) .freshCard,
  body:has(.freshApp) .cvPlanCard,
  body:has(.freshApp) .cvPlanSelected,
  body:has(.freshApp) .cvPlanCheckout,
  body:has(.freshApp) .cvPlanCurrentBox {
    border-radius: 22px !important;
    border: 1px solid var(--cvx-os-line) !important;
    background: var(--cvx-os-paper) !important;
    box-shadow: var(--cvx-os-tight) !important;
  }

  body:has(.freshJobsPage) .freshFlowPromiseStrip,
  body:has(.freshJobsPage) .freshCommandPulse,
  body:has(.freshJobsPage) .freshCommandFilterBar {
    margin: 0 !important;
  }

  body:has(.freshJobsPage) .freshJobsPage::before {
    content: "Jobs desk  /  Recurring lives here  /  Proof, timer, invoice readiness";
    display: block !important;
    padding: 12px 16px !important;
    border-radius: 18px !important;
    background: #111827 !important;
    color: #fffaf0 !important;
    -webkit-text-fill-color: #fffaf0 !important;
    font-size: 12px !important;
    font-weight: 1000 !important;
    letter-spacing: .08em !important;
    text-transform: uppercase !important;
    box-shadow: var(--cvx-os-tight) !important;
  }

  body:has(.freshJobsPage) .freshJobsPage .freshGrid {
    grid-template-columns: minmax(310px, .76fr) minmax(620px, 1.55fr) minmax(280px, .7fr) !important;
  }

  body:has(.freshJobsPage) .freshJobsListCard,
  body[data-fresh-page="command"] .freshCommandQueuePanel,
  body:has(.freshCommandStablePage) .freshCommandQueuePanel {
    background:
      linear-gradient(180deg, rgba(249, 115, 22, .18), transparent 16rem),
      linear-gradient(180deg, #0b1220, #111827) !important;
    color: #fffaf0 !important;
    -webkit-text-fill-color: #fffaf0 !important;
  }

  body:has(.freshJobsPage) .freshJobsListCard .freshItem,
  body:has(.freshCommandStablePage) .freshCommandFixItem {
    border-radius: 18px !important;
    background: rgba(255, 255, 255, .075) !important;
    border-color: rgba(255, 255, 255, .1) !important;
  }

  body:has(.freshJobsPage) .freshJobsDetailCard,
  body:has(.freshCommandStablePage) .freshCommandFixDetail {
    background: #fff !important;
    border-top: 7px solid var(--cvx-os-orange) !important;
  }

  body:has(.freshJobsPage) .freshJobsActionsCard::after {
    content: "GPS / proof panel\A Site location, worker proof and completion notes sit with the job instead of becoming another sidebar page.";
    white-space: pre-line !important;
    display: block !important;
    min-height: 170px !important;
    margin-top: 12px !important;
    padding: 16px !important;
    border-radius: 20px !important;
    border: 1px solid rgba(15, 118, 110, .18) !important;
    background:
      radial-gradient(circle at 62% 44%, rgba(249, 115, 22, .34), transparent 3.5rem),
      repeating-linear-gradient(90deg, rgba(15, 23, 42, .08) 0 1px, transparent 1px 34px),
      repeating-linear-gradient(0deg, rgba(15, 23, 42, .08) 0 1px, transparent 1px 34px),
      #f8fafc !important;
    color: #0f172a !important;
    -webkit-text-fill-color: #0f172a !important;
    font-weight: 950 !important;
    line-height: 1.35 !important;
  }

  body:has(.freshCommandStablePage) .freshCommandFixLayout {
    grid-template-columns: minmax(360px, .9fr) minmax(560px, 1.3fr) minmax(300px, .7fr) !important;
  }

  body:has(.freshCommandStablePage) .freshCommandFixLayout::before {
    content: "Approval desk";
    grid-column: 1 / -1 !important;
    padding: 10px 14px !important;
    border-radius: 16px !important;
    background: #111827 !important;
    color: #fffaf0 !important;
    -webkit-text-fill-color: #fffaf0 !important;
    font-weight: 1000 !important;
    letter-spacing: .1em !important;
    text-transform: uppercase !important;
  }

  body[data-fresh-page="settings"] .freshGrid,
  body[data-fresh-page="support"] .freshGrid,
  body:has(.freshSupportPage) .freshGrid {
    grid-template-columns: minmax(280px, .7fr) minmax(580px, 1.45fr) minmax(280px, .75fr) !important;
  }

  body[data-fresh-page="settings"] .freshHero,
  body[data-fresh-page="support"] .freshHero,
  body:has(.freshSupportPage) .freshHero {
    border-left-color: var(--cvx-os-blue) !important;
    background:
      radial-gradient(circle at 90% 18%, rgba(37, 99, 235, .34), transparent 15rem),
      linear-gradient(120deg, #09162f 0%, #132e52 100%) !important;
  }

  body[data-fresh-page="plans"] .cvPlansPage {
    display: grid !important;
    gap: 14px !important;
  }

  body[data-fresh-page="plans"] .cvPlanCards {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  }

  body[data-fresh-page="plans"] .cvPlanCard.best,
  body[data-fresh-page="plans"] .cvPlanCard.active {
    border-color: rgba(249, 115, 22, .62) !important;
    box-shadow: 0 18px 42px rgba(249, 115, 22, .16) !important;
  }

  body:has(.freshWorkerLivePage) .freshWorkerLiveMapCard,
  body:has(.freshWorkerCommandPage) .freshWorkerLiveMapCard,
  body[data-fresh-page="workercommand"] .freshWorkerLiveMapCard {
    min-height: 420px !important;
    border-radius: 24px !important;
    background:
      radial-gradient(circle at 50% 50%, rgba(249, 115, 22, .36), transparent 5rem),
      repeating-linear-gradient(90deg, rgba(15, 23, 42, .07) 0 1px, transparent 1px 38px),
      repeating-linear-gradient(0deg, rgba(15, 23, 42, .07) 0 1px, transparent 1px 38px),
      #f8fafc !important;
  }

  @media (max-width: 1180px) {
    body:has(.freshApp) .freshGrid,
    body:has(.freshApp) .freshCommandFixLayout,
    body:has(.freshApp) .freshWorkerNowPanel,
    body[data-fresh-page="plans"] .cvPlanCards {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 900px) {
    body:has(.freshApp) .freshApp {
      display: block !important;
    }

    body:has(.freshApp) .freshPageScroll {
      padding: 12px 12px 112px !important;
    }

    body:has(.freshApp) .freshPageScroll > section,
    body:has(.freshApp) .freshPageScroll > main,
    body:has(.freshApp) .freshPageScroll > div {
      min-height: auto !important;
    }

    body:has(.freshApp) .freshHero,
    body:has(.freshApp) .freshTodayWorkHero,
    body:has(.freshApp) .cvPlanHero {
      min-height: 150px !important;
      border-radius: 20px !important;
    }

    body:has(.freshJobsPage) .freshJobsPage::before,
    body:has(.freshCommandStablePage) .freshCommandFixLayout::before {
      font-size: 10px !important;
      line-height: 1.35 !important;
    }
  }
`;

function guideIsComplete() { try { return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true"; } catch { return false; } }
function titlePlan(plan) { return String(plan || "start").charAt(0).toUpperCase() + String(plan || "start").slice(1); }
function uniqueItems(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function cleanGroups(sourceGroups, guideComplete = false) { const seen = new Set(); return sourceGroups.map((group) => ({ ...group, items: group.items.filter(([key]) => !(guideComplete && key === "setupassistant")).filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }) })).filter((group) => group.items.length); }
function allKeys(groups, moreItems) { return new Set([...groups.flatMap((group) => group.items), ...moreItems].map(([key]) => key)); }

function resetScroll() {
  const run = () => { try { if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; window.scrollTo({ top: 0, left: 0, behavior: "auto" }); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; document.querySelectorAll(".freshMain,.freshPageScroll,.freshApp,main").forEach((el) => { if (el) el.scrollTop = 0; }); } catch {} };
  run();
  try { window.requestAnimationFrame(run); } catch {}
  [40, 120, 300, 650].forEach((delay) => window.setTimeout(run, delay));
}

function cleanAsk(text) { return String(text || "").toLowerCase().replace(/[^a-z0-9$@.\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function isJobCommand(text) { const lower = cleanAsk(text); return /(add|new|create|book|make).{0,50}(job|work|booking|service)/.test(lower) || /lawn|mowing|cleaning|garden|handyman|painting|plumbing|electrical/.test(lower); }
function isClientCommand(text) { return /(add|new|create|make).{0,40}(client|customer)/.test(cleanAsk(text)); }

function askRoute(text) {
  const lower = cleanAsk(text);
  if (isJobCommand(text)) return "jobs";
  if (isClientCommand(text)) return "clients";
  if (/message|inbox|worker note|contact office/.test(lower)) return "messages";
  if (/automation|follow up|follow-up/.test(lower)) return "automation";
  if (/today|plan my day|day plan|route today|plan today/.test(lower)) return "planday";
  if (/invoice check|missing money|missing extra|approve|approval|command|review/.test(lower)) return "command";
  if (/quote option|quote ai|quote draft/.test(lower)) return "command";
  if (/proof pack|customer link|client portal|portal/.test(lower)) return "portal";
  if (/unpaid|overdue|payment|admin debt/.test(lower)) return "payments";
  if (/xero|myob|accounting|sync/.test(lower)) return "xero";
  if (/payroll/.test(lower)) return "payroll";
  if (/import|csv/.test(lower)) return "imports";
  if (/job/.test(lower)) return "jobs";
  return "command";
}

function fireJobAsk(text) { window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text, instruction: text, source: "ask-churvox" } })); }

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const user = auth?.user;
  const [navRefresh, setNavRefresh] = React.useState(0);
  const currentPlan = currentPlanForUser(user);
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);
  const [globalAsk, setGlobalAsk] = React.useState("");
  const currentPrimary = parentByKey[active] || active;
  const mobileTitle = mobileLabels[currentPrimary] || mobileLabels[active] || "Churvox";
  const showGlobalAsk = currentPrimary === "planday";

  React.useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.dataset.freshPage = currentPrimary;
    document.body.dataset.freshPlan = currentPlan;
    let style = document.getElementById("churvox-workspace-os-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "churvox-workspace-os-style";
      document.head.appendChild(style);
    }
    if (style.textContent !== CHURVOX_WORKSPACE_OS_CSS) style.textContent = CHURVOX_WORKSPACE_OS_CSS;
    return undefined;
  }, [currentPrimary, currentPlan]);

  React.useEffect(() => {
    const refresh = () => { setGuideComplete(guideIsComplete()); setNavRefresh((value) => value + 1); };
    ["storage", "churvox:ai-guide-status", "churvox:fresh-data-updated", "churvox-auth-refresh", "churvox:plan-updated"].forEach((name) => window.addEventListener(name, refresh));
    return () => ["storage", "churvox:ai-guide-status", "churvox:fresh-data-updated", "churvox-auth-refresh", "churvox:plan-updated"].forEach((name) => window.removeEventListener(name, refresh));
  }, []);

  React.useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  React.useLayoutEffect(() => { resetScroll(); }, [active]);
  React.useEffect(() => { resetScroll(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(sidebarGroupsForUser(user), guideComplete), [guideComplete, currentPlan, navRefresh, user]);
  const safeMoreItems = React.useMemo(() => cleanGroups([{ title: "More tools", items: sidebarMoreItemsForUser(user) }], guideComplete)[0]?.items || [], [guideComplete, currentPlan, navRefresh, user]);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItemsForUser(user)), [currentPlan, navRefresh, user]);
  const safeMobileMoreOrder = React.useMemo(() => mobileMoreOrderForUser(user), [currentPlan, navRefresh, user]);
  const moreHasActiveItem = safeMoreItems.some(([key]) => currentPrimary === key);
  const availableKeys = React.useMemo(() => allKeys(safeGroups, safeMoreItems), [safeGroups, safeMoreItems]);
  const canOpenMessages = availableKeys.has("messages");
  const canOpenCommand = availableKeys.has("command");
  const safeExtraMobile = React.useMemo(() => {
    const byKey = new Map(uniqueItems([...safeGroups.flatMap((group) => group.items), ...safeMoreItems]).map((item) => [item[0], item]));
    return safeMobileMoreOrder.map((key) => byKey.get(key)).filter(Boolean);
  }, [safeGroups, safeMoreItems, safeMobileMoreOrder]);

  function go(key) { if (key === "more") return; setMoreOpen(false); resetScroll(); navigate(key); }
  async function handleLogout() { try { if (auth?.logout) await auth.logout(); } finally { window.location.href = "/login"; } }
  function handleMobile(key) { if (key === "more") { setMoreOpen((value) => !value); return; } go(key); }
  function openMobileJob() { const text = "New job"; try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, text, at: Date.now() })); } catch {} if (currentPrimary === "jobs") fireJobAsk(text); else { go("jobs"); [120, 350, 800].forEach((delay) => window.setTimeout(() => fireJobAsk(text), delay)); } }
  function openMobileClient() { try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {} if (currentPrimary === "clients") window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { source: "mobile-quick-action" } })); else go("clients"); }

  function submitAsk(event) {
    event?.preventDefault?.();
    const text = globalAsk.trim();
    if (!text) return;
    const route = askRoute(text);
    try { window.localStorage.setItem(ASK_DRAFT_KEY, text); } catch {}
    if (route === "jobs") { try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, text, at: Date.now() })); } catch {} if (currentPrimary === "jobs") fireJobAsk(text); else { go("jobs"); [120, 350, 800].forEach((delay) => window.setTimeout(() => fireJobAsk(text), delay)); } setGlobalAsk(""); return; }
    if (route === "clients") { try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {} if (currentPrimary === "clients") window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { text } })); else go("clients"); setGlobalAsk(""); return; }
    go(route === "messages" && !canOpenMessages ? "command" : route);
    setGlobalAsk("");
  }

  return (
    <>
      <FreshNotificationBell />
      <div className="freshApp">
        <aside className="freshSide">
          <div className="freshBrand"><div className="freshLogo">C</div><div><strong>CHURVOX</strong><small>{titlePlan(currentPlan)} workspace</small></div></div>
          <button className="freshLogoutSide" type="button" onClick={handleLogout}>Log out</button>
          <nav className="freshNav">
            {safeGroups.map((group) => <section className="freshNavGroup" key={group.title}><p>{group.title}</p>{group.items.map(([key, mark, label]) => <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</section>)}
            {safeMoreItems.length ? <section className="freshNavGroup freshNavMoreGroup"><details className="freshNavMore" open={moreHasActiveItem}><summary aria-label="More tools" title="More tools"><span>More tools</span><small>{safeMoreItems.length}</small></summary><div className="freshNavMoreItems">{safeMoreItems.map(([key, mark, label]) => <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</div></details></section> : null}
          </nav>
        </aside>
        <main className="freshMain">
          <header className="freshMobileAppTop"><div><b>Churvox</b><span>{mobileTitle} - field mode</span></div><button className="freshMobileLogout" type="button" onClick={handleLogout}>Log out</button></header>
          <section className="freshMobileQuickActions" aria-label="Mobile quick actions"><button type="button" aria-label="New job" title="New job" onClick={openMobileJob}><b>+</b><span>New job</span></button><button type="button" aria-label="Add client" title="Add client" onClick={openMobileClient}><b>CL</b><span>Add client</span></button>{canOpenCommand ? <button type="button" aria-label="Open approvals" title="Open approvals" onClick={() => go("command")}><b>OK</b><span>Approve</span></button> : null}{canOpenMessages ? <button type="button" aria-label="Open messages" title="Open messages" onClick={() => go("messages")}><b>MS</b><span>Messages</span></button> : null}</section>
          {showGlobalAsk ? <form className="freshGlobalAsk" onSubmit={submitAsk}><label><span>What needs doing?</span><input value={globalAsk} onChange={(event) => setGlobalAsk(event.target.value)} placeholder="book a job, find unpaid work, prepare a follow-up, check what needs approval..." /></label><button type="submit">Ask Churvox</button></form> : null}
          <div className="freshPageScroll" key={active} onClick={() => { if (moreOpen) setMoreOpen(false); }}>{children}</div>
        </main>
        {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}<div className="freshMobileMoreNote"><b>More tools</b><span>This menu only shows tools available on the current Churvox tier.</span></div></div>}
        <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
      </div>
    </>
  );
}
