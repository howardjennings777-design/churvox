import React from "react";
import FreshNotificationBell from "./FreshNotificationBell";
import { useAuth } from "../context/AuthContext";
import { currentPlanForUser, mobileItemsForUser, mobileMoreOrderForUser, sidebarGroupsForUser, sidebarMoreItemsForUser } from "./planRules";
import "./freshMobileAppShell.css";
import "./freshSidebarCompact.css";
import "./freshPlansTierLadder.css";

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
          <section className="freshMobileQuickActions" aria-label="Mobile quick actions"><button type="button" aria-label="New job" title="New job" onClick={openMobileJob}><b>+</b><span>New job</span></button><button type="button" aria-label="Add client" title="Add client" onClick={openMobileClient}><b>CL</b><span>Add client</span></button><button type="button" aria-label="Open approvals" title="Open approvals" onClick={() => go("command")}><b>OK</b><span>Approve</span></button>{canOpenMessages ? <button type="button" aria-label="Open messages" title="Open messages" onClick={() => go("messages")}><b>MS</b><span>Messages</span></button> : null}</section>
          {showGlobalAsk ? <form className="freshGlobalAsk" onSubmit={submitAsk}><label><span>What do you want to do?</span><input value={globalAsk} onChange={(event) => setGlobalAsk(event.target.value)} placeholder="book a job, review admin debt, approve an invoice, prepare a follow-up..." /></label><button type="submit">Ask Churvox</button></form> : null}
          <div className="freshPageScroll" key={active} onClick={() => { if (moreOpen) setMoreOpen(false); }}>{children}</div>
        </main>
        {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}<div className="freshMobileMoreNote"><b>More tools</b><span>This menu only shows tools available on the current Churvox tier.</span></div></div>}
        <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" aria-label={label} title={label} className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
      </div>
    </>
  );
}
