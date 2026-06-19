import React from "react";
import FreshSearch from "./FreshSearch";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";

const groups = [
  { title: "Today", items: [["smart", "TD", "Today"], ["quickcreateai", "AI", "Tell Churvox"], ["command", "RV", "Review"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"], ["payments", "PY", "Payments"], ["xero", "XE", "Xero"]] },
  { title: "Team", items: [["team", "TM", "Team"], ["workercommand", "WC", "Worker View"], ["time", "TS", "Time Sheets"], ["payroll", "PR", "Payroll"]] },
  { title: "Command", items: [["automation", "AT", "Automation"], ["reports", "RP", "Reports"], ["launchcontrol", "LC", "Launch"]] },
  { title: "Setup", items: [["settings", "SG", "Settings"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]] },
];

const relatedTools = {
  smart: [["quickcreateai", "AI", "Tell Churvox"], ["command", "RV", "Review"], ["launchcontrol", "LC", "Launch"], ["invoices", "IV", "Invoices"]],
  quickcreateai: [["smart", "TD", "Today"], ["command", "RV", "Review"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  command: [["quickcreateai", "AI", "Tell Churvox"], ["smart", "TD", "Today"], ["launchcontrol", "LC", "Launch"], ["exports", "EX", "Exports"]],
  jobs: [["quickcreateai", "AI", "Tell Churvox"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"], ["invoices", "IV", "Invoices"]],
  dispatch: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["team", "TM", "Team"], ["smart", "TD", "Today"]],
  clients: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["quotes", "QT", "Quotes"], ["exports", "EX", "Exports"]],
  quotes: [["quickcreateai", "AI", "Tell Churvox"], ["clients", "CL", "Clients"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  invoices: [["quickcreateai", "AI", "Tell Churvox"], ["quotes", "QT", "Quotes"], ["payments", "PY", "Payments"], ["xero", "XE", "Xero"]],
  payments: [["quickcreateai", "AI", "Tell Churvox"], ["invoices", "IV", "Invoices"], ["xero", "XE", "Xero"], ["command", "RV", "Review"]],
  xero: [["quickcreateai", "AI", "Tell Churvox"], ["invoices", "IV", "Invoices"], ["payments", "PY", "Payments"], ["plans", "PL", "Plans"]],
  team: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["workercommand", "WC", "Worker View"], ["time", "TS", "Time Sheets"]],
  workercommand: [["quickcreateai", "AI", "Tell Churvox"], ["team", "TM", "Team"], ["jobs", "JB", "Jobs"], ["time", "TS", "Time Sheets"]],
  time: [["quickcreateai", "AI", "Tell Churvox"], ["team", "TM", "Team"], ["payroll", "PR", "Payroll"], ["jobs", "JB", "Jobs"]],
  payroll: [["quickcreateai", "AI", "Tell Churvox"], ["time", "TS", "Time Sheets"], ["team", "TM", "Team"], ["exports", "EX", "Exports"]],
  reports: [["quickcreateai", "AI", "Tell Churvox"], ["invoices", "IV", "Invoices"], ["jobs", "JB", "Jobs"], ["launchcontrol", "LC", "Launch"]],
  automation: [["quickcreateai", "AI", "Tell Churvox"], ["command", "RV", "Review"], ["launchcontrol", "LC", "Launch"], ["settings", "SG", "Settings"]],
  launchcontrol: [["quickcreateai", "AI", "Tell Churvox"], ["smart", "TD", "Today"], ["command", "RV", "Review"], ["support", "SP", "Support"]],
  settings: [["quickcreateai", "AI", "Tell Churvox"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["plans", "PL", "Plans"]],
  imports: [["quickcreateai", "AI", "Tell Churvox"], ["clients", "CL", "Clients"], ["team", "TM", "Team"], ["exports", "EX", "Exports"]],
  exports: [["quickcreateai", "AI", "Tell Churvox"], ["imports", "IM", "Imports"], ["clients", "CL", "Clients"], ["command", "RV", "Review"]],
  plans: [["quickcreateai", "AI", "Tell Churvox"], ["settings", "SG", "Settings"], ["xero", "XE", "Xero"], ["support", "SP", "Support"]],
  support: [["quickcreateai", "AI", "Tell Churvox"], ["settings", "SG", "Settings"], ["exports", "EX", "Exports"], ["launchcontrol", "LC", "Launch"]],
  photos: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]],
  documents: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]],
  setupassistant: [["settings", "SG", "Settings"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["launchcontrol", "LC", "Launch"]],
  security: [["quickcreateai", "AI", "Tell Churvox"], ["settings", "SG", "Settings"], ["support", "SP", "Support"]],
};

const purpose = {
  smart: "Today: real jobs, money, and owner actions still needing attention.",
  quickcreateai: "Tell Churvox what happened so it can prepare the next admin step.",
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

const mobileItems = [["smart", "TD", "Today"], ["quickcreateai", "AI", "Tell"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Money"], ["command", "RV", "Review"], ["more", "••", "More"]];

function guideIsComplete() { try { return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true"; } catch { return false; } }
function uniqueItems(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function stripHiddenItems(items, guideComplete) { return items.filter(([key]) => !(guideComplete && key === "setupassistant")); }
function cleanGroups(sourceGroups, guideComplete = false) { const seen = new Set(); return sourceGroups.map((group) => ({ ...group, items: stripHiddenItems(group.items, guideComplete).filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }) })).filter((group) => group.items.length); }
function buildLabels() { const entries = [...groups.flatMap((group) => group.items), ...Object.values(relatedTools).flat()]; const nextLabels = Object.fromEntries(entries.map(([key, , label]) => [key, label])); nextLabels.quickcreateai = "Tell Churvox"; nextLabels.command = "Review"; nextLabels.smart = "Today"; nextLabels.dispatch = "Schedule"; nextLabels.workercommand = "Worker View"; nextLabels.time = "Time Sheets"; nextLabels.payments = "Payments"; nextLabels.imports = "Imports"; nextLabels.exports = "Exports"; nextLabels.launchcontrol = "Launch"; nextLabels.photos = "Photos"; nextLabels.documents = "Documents"; nextLabels.setupassistant = "AI Guide"; nextLabels.security = "Security"; return nextLabels; }
function buildParentMap() { const map = {}; Object.entries(relatedTools).forEach(([parent, items]) => { items.forEach(([key]) => { if (!map[key]) map[key] = parent; }); }); groups.forEach((group) => group.items.forEach(([key]) => { map[key] = key; })); map.routes = "dispatch"; map.areas = "dispatch"; map.schedulerai = "dispatch"; map.gps = "time"; map.portal = "clients"; map.followupwriter = "clients"; map.reviewbooster = "clients"; return map; }
function resetFreshScrollTop() { const top = () => { try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch { try { window.scrollTo(0, 0); } catch {} } try { document.documentElement.scrollTop = 0; } catch {} try { document.body.scrollTop = 0; } catch {} try { document.scrollingElement.scrollTop = 0; } catch {} [".freshMain", ".freshPageMount", ".freshApp", "main"].forEach((selector) => { try { document.querySelectorAll(selector).forEach((el) => { if (el && typeof el.scrollTo === "function") el.scrollTo({ top: 0, left: 0, behavior: "auto" }); if (el) el.scrollTop = 0; }); } catch {} }); }; top(); window.requestAnimationFrame(top); window.setTimeout(top, 80); }

const labels = buildLabels();
const parentByKey = buildParentMap();

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [verifySending, setVerifySending] = React.useState(false);
  const [verifySent, setVerifySent] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);

  React.useEffect(() => { const refreshGuide = () => setGuideComplete(guideIsComplete()); window.addEventListener("storage", refreshGuide); window.addEventListener("churvox:ai-guide-status", refreshGuide); window.addEventListener("churvox:fresh-data-updated", refreshGuide); return () => { window.removeEventListener("storage", refreshGuide); window.removeEventListener("churvox:ai-guide-status", refreshGuide); window.removeEventListener("churvox:fresh-data-updated", refreshGuide); }; }, []);
  React.useEffect(() => { resetFreshScrollTop(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(groups, guideComplete), [guideComplete]);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => { const mainKeys = new Set(safeMobileItems.map(([key]) => key)); return uniqueItems(safeGroups.flatMap((group) => group.items)).filter(([key]) => !mainKeys.has(key)); }, [safeMobileItems, safeGroups]);
  const currentPrimary = parentByKey[active] || active;
  const emailNeedsVerification = auth?.user && auth.user.email_verified === false;
  const currentLabel = labels[active] || labels[currentPrimary] || "Churvox";
  const currentPurpose = purpose[active] || purpose[currentPrimary] || purpose.default;

  async function handleLogout() { try { if (auth?.logout) await auth.logout(); } finally { try { window.localStorage.removeItem("token"); window.localStorage.removeItem("owner_portal_session"); window.localStorage.removeItem("platform_owner_email"); } catch {} window.location.href = "/login"; } }
  function go(key) { if (key === "more") return; if (guideComplete && key === "setupassistant") return; setMoreOpen(false); resetFreshScrollTop(); navigate(key); }
  function openTellChurvox() { go("quickcreateai"); }
  function openRealCreate(path) { if (String(path || "").startsWith("/jobs/new")) { try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, "true"); } catch {} window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { search: "" } })); return; } window.location.href = path; }
  function openClientPopup() { try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {} setMoreOpen(false); resetFreshScrollTop(); navigate("clients"); window.dispatchEvent(new CustomEvent("churvox:open-client-popup")); }
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
        <div className="freshTopbar freshTopbar--clean">
          <div className="freshTopbarTitle"><span>Current area</span><strong>{currentLabel}</strong><small>{currentPurpose}</small></div>
          <FreshSearch onNavigate={go} />
          <div className="freshTopActions freshTopActions--clean">
            <button className="freshTellTop" type="button" onClick={openTellChurvox}>Tell Churvox</button>
            {!guideComplete ? <button type="button" onClick={() => go("setupassistant")}>AI Guide</button> : null}
            <button type="button" onClick={() => openRealCreate("/jobs/new")}>New job</button>
            <button type="button" onClick={openClientPopup}>Add client</button>
            <button className="freshLogoutTop" type="button" onClick={handleLogout}>Log out</button>
          </div>
        </div>

        {emailNeedsVerification && <section className="freshCard freshItem need" style={{ marginBottom: 14 }}><b>Verify your email to keep your Churvox account secure</b><span>We have sent a verification link to {auth.user.email}. You can keep setting up, but please verify before sending customer emails.</span><div className="freshActions" style={{ maxWidth: 280 }}><button className="freshPrimary" type="button" onClick={resendVerification} disabled={verifySending}>{verifySending ? "Sending…" : verifySent ? "Verification sent" : "Resend verification email"}</button></div></section>}
        <div className="freshPageScroll">{children}</div>
      </main>

      <button className="freshTellFloat" type="button" onClick={openTellChurvox} aria-label="Open Tell Churvox">Tell</button>

      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
