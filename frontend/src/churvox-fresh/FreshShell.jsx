import React from "react";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";

const groups = [
  { title: "Today", items: [["smart", "TD", "Today"], ["askchurvox", "AI", "Tell Churvox"], ["command", "CM", "Command"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"], ["payments", "PY", "Payments"], ["xero", "XE", "Xero"]] },
  { title: "Team", items: [["team", "TM", "Team"], ["workercommand", "WC", "Worker View"], ["time", "TS", "Time Sheets"], ["payroll", "PR", "Payroll"]] },
  { title: "Command", items: [["automation", "AT", "Automation"], ["reports", "RP", "Reports"], ["launchcontrol", "LC", "Launch"]] },
  { title: "Setup", items: [["settings", "SG", "Settings"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]] },
];

const tellLink = ["askchurvox", "AI", "Tell Churvox"];
const commandLink = ["command", "CM", "Command"];

const relatedTools = {
  smart: [tellLink, commandLink, ["launchcontrol", "LC", "Launch"], ["invoices", "IV", "Invoices"]],
  askchurvox: [["smart", "TD", "Today"], ["quickcreateai", "QC", "Quick Create"], commandLink, ["jobs", "JB", "Jobs"]],
  quickcreateai: [tellLink, ["smart", "TD", "Today"], commandLink, ["jobs", "JB", "Jobs"]],
  command: [tellLink, ["smart", "TD", "Today"], ["launchcontrol", "LC", "Launch"], ["exports", "EX", "Exports"]],
  jobs: [tellLink, ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"], ["invoices", "IV", "Invoices"]],
  dispatch: [tellLink, ["jobs", "JB", "Jobs"], ["team", "TM", "Team"], ["smart", "TD", "Today"]],
  clients: [tellLink, ["jobs", "JB", "Jobs"], ["quotes", "QT", "Quotes"], ["exports", "EX", "Exports"]],
  quotes: [tellLink, ["clients", "CL", "Clients"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  invoices: [tellLink, ["quotes", "QT", "Quotes"], ["payments", "PY", "Payments"], ["xero", "XE", "Xero"]],
  payments: [tellLink, ["invoices", "IV", "Invoices"], ["xero", "XE", "Xero"], commandLink],
  xero: [tellLink, ["invoices", "IV", "Invoices"], ["payments", "PY", "Payments"], ["plans", "PL", "Plans"]],
  team: [tellLink, ["jobs", "JB", "Jobs"], ["workercommand", "WC", "Worker View"], ["time", "TS", "Time Sheets"]],
  workercommand: [tellLink, ["team", "TM", "Team"], ["jobs", "JB", "Jobs"], ["time", "TS", "Time Sheets"]],
  time: [tellLink, ["team", "TM", "Team"], ["payroll", "PR", "Payroll"], ["jobs", "JB", "Jobs"]],
  payroll: [tellLink, ["time", "TS", "Time Sheets"], ["team", "TM", "Team"], ["exports", "EX", "Exports"]],
  reports: [tellLink, ["invoices", "IV", "Invoices"], ["jobs", "JB", "Jobs"], ["launchcontrol", "LC", "Launch"]],
  automation: [tellLink, commandLink, ["launchcontrol", "LC", "Launch"], ["settings", "SG", "Settings"]],
  launchcontrol: [tellLink, ["smart", "TD", "Today"], commandLink, ["support", "SP", "Support"]],
  settings: [tellLink, ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["plans", "PL", "Plans"]],
  imports: [tellLink, ["clients", "CL", "Clients"], ["team", "TM", "Team"], ["exports", "EX", "Exports"]],
  exports: [tellLink, ["imports", "IM", "Imports"], ["clients", "CL", "Clients"], commandLink],
  plans: [tellLink, ["settings", "SG", "Settings"], ["xero", "XE", "Xero"], ["support", "SP", "Support"]],
  support: [tellLink, ["settings", "SG", "Settings"], ["exports", "EX", "Exports"], ["launchcontrol", "LC", "Launch"]],
  photos: [tellLink, ["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]],
  documents: [tellLink, ["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]],
  setupassistant: [["settings", "SG", "Settings"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["launchcontrol", "LC", "Launch"]],
  security: [tellLink, ["settings", "SG", "Settings"], ["support", "SP", "Support"]],
};

const purpose = {
  smart: "Today: real jobs, money, and owner actions still needing attention.",
  askchurvox: "Type plain words and Churvox opens the right area or prepares owner review.",
  quickcreateai: "Quick create turns rough notes into a prepared job, quote or task.",
  command: "Owner approval desk: review, edit, approve, or decline prepared admin work.",
  jobs: "Create, assign, complete, and invoice work from one job record.",
  dispatch: "Schedule jobs and keep the day organised.",
  clients: "Customer records, history, contact details, notes, quotes, and jobs.",
  quotes: "Price work, send quotes, and convert accepted work into jobs.",
  invoices: "Draft, send, mark paid, and follow up money owed.",
  payments: "Track paid, due, overdue, and follow-up status before accounting sync.",
  xero: "Owner-approved accounting sync: Churvox creates draft invoices only.",
  team: "Workers, invites, roles, and worker app access.",
  workercommand: "Worker view for jobs, status, time, photos, and field updates.",
  time: "Review worker time sheets before payroll review.",
  payroll: "Payroll review workspace from approved time. No tax filing. No bank files.",
  reports: "Business reporting from jobs, invoices, time, and payroll review data.",
  automation: "Rules that prepare actions for owner approval, not uncontrolled changes.",
  launchcontrol: "Live launch readiness board for blockers, tests, and controlled beta decisions.",
  settings: "Business details, branding, billing country, integrations, and setup.",
  imports: "Bring clients, workers, jobs, quotes and invoices into Churvox safely from CSV.",
  exports: "Download owner-controlled CSV exports from live Churvox records.",
  plans: "Plan, trial, usage, add-ons, and accounting sync access.",
  support: "Contact Churvox support and get setup help.",
  photos: "Job photos, proof and completion evidence.",
  documents: "Files, contracts, assets and job paperwork.",
  setupassistant: "Guided setup for new owners.",
  security: "Security, privacy and trust information.",
  default: "Extra tool connected to the current area.",
};

const mobileItems = [["smart", "TD", "Today"], ["askchurvox", "AI", "Tell"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Money"], ["command", "CM", "Command"], ["more", "••", "More"]];

function guideIsComplete() { try { return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true"; } catch { return false; } }
function uniqueItems(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function stripHiddenItems(items, guideComplete) { return items.filter(([key]) => !(guideComplete && key === "setupassistant")); }
function cleanGroups(sourceGroups, guideComplete = false) { const seen = new Set(); return sourceGroups.map((group) => ({ ...group, items: stripHiddenItems(group.items, guideComplete).filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }) })).filter((group) => group.items.length); }
function buildLabels() { const entries = [...groups.flatMap((group) => group.items), ...Object.values(relatedTools).flat()]; const nextLabels = Object.fromEntries(entries.map(([key, , label]) => [key, label])); nextLabels.askchurvox = "Tell Churvox"; nextLabels.quickcreateai = "Quick Create"; nextLabels.command = "Command"; nextLabels.smart = "Today"; nextLabels.dispatch = "Schedule"; nextLabels.workercommand = "Worker View"; nextLabels.time = "Time Sheets"; nextLabels.payments = "Payments"; nextLabels.imports = "Imports"; nextLabels.exports = "Exports"; nextLabels.launchcontrol = "Launch"; nextLabels.photos = "Photos"; nextLabels.documents = "Documents"; nextLabels.setupassistant = "AI Guide"; nextLabels.security = "Security"; return nextLabels; }
function buildParentMap() { const map = {}; Object.entries(relatedTools).forEach(([parent, items]) => { items.forEach(([key]) => { if (!map[key]) map[key] = parent; }); }); groups.forEach((group) => group.items.forEach(([key]) => { map[key] = key; })); map.routes = "dispatch"; map.areas = "dispatch"; map.schedulerai = "dispatch"; map.gps = "time"; map.portal = "clients"; map.followupwriter = "clients"; map.reviewbooster = "clients"; return map; }
function resetFreshScrollTop() { const top = () => { try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch { try { window.scrollTo(0, 0); } catch {} } try { document.documentElement.scrollTop = 0; } catch {} try { document.body.scrollTop = 0; } catch {} try { document.scrollingElement.scrollTop = 0; } catch {} [".freshMain", ".freshPageMount", ".freshApp", "main"].forEach((selector) => { try { document.querySelectorAll(selector).forEach((el) => { if (el && typeof el.scrollTo === "function") el.scrollTo({ top: 0, left: 0, behavior: "auto" }); if (el) el.scrollTop = 0; }); } catch {} }); }; top(); window.requestAnimationFrame(top); window.setTimeout(top, 80); }
function normaliseAsk(text) { return String(text || "").toLowerCase().replace(/[^a-z0-9$@.\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function askResult(text) { const lower = normaliseAsk(text); if (!lower) return { button: "Ask Churvox", page: "askchurvox", mode: "idle" }; if (lower.includes("follow up") || lower.includes("remind") || lower.includes("chase")) return { button: "Send to Command", page: "command", mode: "command" }; if (lower.includes("add client") || lower.includes("new client") || lower.includes("create client")) return { button: "Open Add Client", page: "clients", mode: "client" }; if (lower.includes("new job") || lower.includes("add job") || lower.includes("create job")) return { button: "Open New Job", page: "jobs", mode: "job" }; if (lower.includes("unpaid") || lower.includes("overdue") || lower.includes("payment")) return { button: "Open Payments", page: "payments", mode: "navigate" }; if (lower.includes("xero") || lower.includes("myob")) return { button: "Open Xero", page: "xero", mode: "navigate" }; if (lower.includes("payroll")) return { button: "Open Payroll", page: "payroll", mode: "navigate" }; if (lower.includes("import") || lower.includes("csv")) return { button: "Open Imports", page: "imports", mode: "navigate" }; if (lower.includes("command") || lower.includes("review") || lower.includes("approve")) return { button: "Open Command", page: "command", mode: "navigate" }; if (lower.includes("job")) return { button: "Open Jobs", page: "jobs", mode: "navigate" }; return { button: "Open Quick Create", page: "quickcreateai", mode: "navigate" }; }
function saveAskSlip(text) { try { const saved = window.localStorage.getItem(COMMAND_INBOX_KEY); const current = saved ? JSON.parse(saved) : []; const safeCurrent = Array.isArray(current) ? current : []; const slip = { id: `global-ask-${Date.now()}`, group: "Ask Churvox", title: "Owner review", info: "Needs approval", urgency: "Medium", found: `You asked: ${text}`, prepared: "Churvox prepared this for Command approval.", why: "Important work should be approved before it affects customers, money, records or accounting.", owner: "Approve, edit, open area, or ignore.", area: "Command", page: "command", originalText: text, fromInbox: true, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }; window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 70))); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "global-ask-command" } })); } catch {} }

const labels = buildLabels();
const parentByKey = buildParentMap();

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [verifySending, setVerifySending] = React.useState(false);
  const [verifySent, setVerifySent] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);
  const [globalAsk, setGlobalAsk] = React.useState("");

  React.useEffect(() => { const refreshGuide = () => setGuideComplete(guideIsComplete()); window.addEventListener("storage", refreshGuide); window.addEventListener("churvox:ai-guide-status", refreshGuide); window.addEventListener("churvox:fresh-data-updated", refreshGuide); return () => { window.removeEventListener("storage", refreshGuide); window.removeEventListener("churvox:ai-guide-status", refreshGuide); window.removeEventListener("churvox:fresh-data-updated", refreshGuide); }; }, []);
  React.useEffect(() => { resetFreshScrollTop(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(groups, guideComplete), [guideComplete]);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => { const mainKeys = new Set(safeMobileItems.map(([key]) => key)); return uniqueItems(safeGroups.flatMap((group) => group.items)).filter(([key]) => !mainKeys.has(key)); }, [safeMobileItems, safeGroups]);
  const currentPrimary = parentByKey[active] || active;
  const emailNeedsVerification = auth?.user && auth.user.email_verified === false;
  const currentLabel = labels[active] || labels[currentPrimary] || "Churvox";
  const currentPurpose = purpose[active] || purpose[currentPrimary] || purpose.default;
  const globalAskAction = askResult(globalAsk);

  async function handleLogout() { try { if (auth?.logout) await auth.logout(); } finally { try { window.localStorage.removeItem("token"); window.localStorage.removeItem("owner_portal_session"); window.localStorage.removeItem("platform_owner_email"); } catch {} window.location.href = "/login"; } }
  function go(key) { if (key === "more") return; if (guideComplete && key === "setupassistant") return; setMoreOpen(false); resetFreshScrollTop(); navigate(key); }
  function openTellChurvox() { go("askchurvox"); }
  function openRealCreate(path) { if (String(path || "").startsWith("/jobs/new")) { try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, "true"); } catch {} window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: "" } })); return; } window.location.href = path; }
  function openClientPopup() { try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {} setMoreOpen(false); resetFreshScrollTop(); navigate("clients"); window.dispatchEvent(new CustomEvent("churvox:open-client-popup")); }
  function submitGlobalAsk(event) { event?.preventDefault?.(); const text = globalAsk.trim(); if (!text) return openTellChurvox(); try { window.localStorage.setItem(ASK_DRAFT_KEY, text); } catch {} if (globalAskAction.mode === "command") { saveAskSlip(text); go("command"); return; } if (globalAskAction.mode === "client") { try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {} go("clients"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { text } })), 80); return; } if (globalAskAction.mode === "job") { try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, at: Date.now() })); } catch {} go("jobs"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text } })), 80); return; } go(globalAskAction.page || "askchurvox"); }
  async function resendVerification() { setVerifySending(true); try { const token = window.localStorage.getItem("token") || ""; await fetch(`${API_BASE}/api/auth/resend-verification`, { method: "POST", credentials: "include", headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }); setVerifySent(true); } catch { setVerifySent(false); } finally { setVerifySending(false); } }
  function handleMobile(key) { if (key === "more") { setMoreOpen((value) => !value); return; } go(key); }

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand"><div className="freshLogo">C</div><div><strong>CHURVOX</strong><small>Owner workspace</small></div></div>
        <button className="freshTellSide" type="button" onClick={openTellChurvox}>Tell Churvox</button>
        <button className="freshLogoutSide" type="button" onClick={handleLogout}>Log out</button>
        <nav className="freshNav">{safeGroups.map((group) => <section className="freshNavGroup" key={group.title}><p>{group.title}</p>{group.items.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</section>)}</nav>
      </aside>

      <main className="freshMain">
        <div className="freshTopbar freshTopbar--clean freshTopbar--askSticky">
          <div className="freshTopbarTitle"><span>Current area</span><strong>{currentLabel}</strong><small>{currentPurpose}</small></div>
          <div className="freshTopActions freshTopActions--clean">
            <button className="freshTellTop" type="button" onClick={openTellChurvox}>Ask Churvox</button>
            {!guideComplete ? <button type="button" onClick={() => go("setupassistant")}>AI Guide</button> : null}
            <button type="button" onClick={() => openRealCreate("/jobs/new")}>New job</button>
            <button type="button" onClick={openClientPopup}>Add client</button>
            <button className="freshLogoutTop" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        <form className="freshGlobalAsk" onSubmit={submitGlobalAsk}>
          <label><span>What do you want to do?</span><input value={globalAsk} onChange={(event) => setGlobalAsk(event.target.value)} placeholder="open jobs, add client, show unpaid invoices…" /></label>
          <button type="submit">{globalAskAction.button}</button>
        </form>

        {emailNeedsVerification && <section className="freshCard freshItem need" style={{ marginBottom: 14 }}><b>Verify your email to keep your Churvox account secure</b><span>We have sent a verification link to {auth.user.email}. You can keep setting up, but please verify before sending customer emails.</span><div className="freshActions" style={{ maxWidth: 280 }}><button className="freshPrimary" type="button" onClick={resendVerification} disabled={verifySending}>{verifySending ? "Sending…" : verifySent ? "Verification sent" : "Resend verification email"}</button></div></section>}
        <div className="freshPageScroll">{children}</div>
      </main>

      <button className="freshTellFloat" type="button" onClick={openTellChurvox} aria-label="Open Tell Churvox">Tell</button>
      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
