import React from "react";
import FreshSearch from "./FreshSearch";
import FreshTopStatus from "./FreshTopStatus";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";

const groups = [
  { title: "Daily", items: [["smart", "TD", "Today"], ["quickcreateai", "AI", "Tell Churvox"], ["command", "RV", "Review"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"], ["xero", "XE", "Xero"]] },
  { title: "People", items: [["team", "TM", "Team"], ["time", "TL", "Time"], ["payroll", "PR", "Payroll"]] },
  { title: "More", items: [["reports", "RP", "Reports"], ["automation", "AT", "Automation"], ["settings", "SG", "Settings"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]] },
];

const relatedTools = {
  smart: [["quickcreateai", "AI", "Tell Churvox"], ["command", "RV", "Review"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  quickcreateai: [["smart", "TD", "Today"], ["command", "RV", "Review"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  command: [["quickcreateai", "AI", "Tell Churvox"], ["smart", "TD", "Today"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  jobs: [["quickcreateai", "AI", "Tell Churvox"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"], ["invoices", "IV", "Invoices"]],
  dispatch: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["team", "TM", "Team"], ["smart", "TD", "Today"]],
  clients: [["quickcreateai", "AI", "Tell Churvox"], ["jobs", "JB", "Jobs"], ["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]],
  quotes: [["quickcreateai", "AI", "Tell Churvox"], ["clients", "CL", "Clients"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Invoices"]],
  invoices: [["quickcreateai", "AI", "Tell Churvox"], ["quotes", "QT", "Quotes"], ["xero", "XE", "Xero"], ["reports", "RP", "Reports"]],
  xero: [["invoices", "IV", "Invoices"], ["quickcreateai", "AI", "Tell Churvox"], ["settings", "SG", "Settings"]],
  team: [["quickcreateai", "AI", "Tell Churvox"], ["time", "TL", "Time"], ["payroll", "PR", "Payroll"], ["jobs", "JB", "Jobs"]],
  time: [["team", "TM", "Team"], ["payroll", "PR", "Payroll"], ["jobs", "JB", "Jobs"]],
  payroll: [["team", "TM", "Team"], ["time", "TL", "Time"], ["reports", "RP", "Reports"]],
  reports: [["invoices", "IV", "Invoices"], ["jobs", "JB", "Jobs"], ["payroll", "PR", "Payroll"]],
  automation: [["quickcreateai", "AI", "Tell Churvox"], ["command", "RV", "Review"], ["settings", "SG", "Settings"]],
  settings: [["quickcreateai", "AI", "Tell Churvox"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]],
  plans: [["settings", "SG", "Settings"], ["support", "SP", "Support"]],
  support: [["quickcreateai", "AI", "Tell Churvox"], ["settings", "SG", "Settings"]],
  payments: [["invoices", "IV", "Invoices"], ["xero", "XE", "Xero"]],
  photos: [["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]],
  documents: [["jobs", "JB", "Jobs"], ["clients", "CL", "Clients"]],
  setupassistant: [["settings", "SG", "Settings"], ["quickcreateai", "AI", "Tell Churvox"]],
  security: [["settings", "SG", "Settings"], ["support", "SP", "Support"]],
};

const purpose = {
  smart: "Today: jobs, money, review tray and the next best action.",
  quickcreateai: "Tell Churvox what happened or what you want done.",
  command: "Review tray: approve, decline or edit prepared admin actions.",
  jobs: "Create, assign and complete work.",
  dispatch: "Plan the day and move jobs into the right slots.",
  clients: "Customer records, history, contact details and notes.",
  quotes: "Price work, send quotes and convert accepted work into jobs.",
  invoices: "Draft, send, track and follow up money owed.",
  xero: "Owner-approved draft invoice sync only.",
  team: "People, invites, roles and worker app access.",
  time: "Worker hours and job time logs.",
  payroll: "Pay period workspace from approved time, no tax filing or bank files.",
  reports: "Business reporting, cashflow and performance.",
  automation: "Rules and alerts that prepare work for approval.",
  settings: "Business details, branding, billing country and setup.",
  plans: "Plan, trial, usage and add-ons.",
  support: "Contact Churvox support.",
  payments: "Payment status and payment follow-up tools.",
  photos: "Job photos, proof and completion evidence.",
  documents: "Files, contracts, assets and job paperwork.",
  setupassistant: "Guided setup for new owners.",
  security: "Security, privacy and trust information.",
  default: "Extra tool connected to the current area.",
};

const mobileItems = [["smart", "TD", "Today"], ["quickcreateai", "AI", "Tell"], ["command", "RV", "Review"], ["jobs", "JB", "Work"], ["invoices", "IV", "Money"], ["more", "••", "More"]];

function guideIsComplete() { try { return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true"; } catch { return false; } }
function uniqueItems(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function stripHiddenItems(items, guideComplete) { return items.filter(([key]) => !(guideComplete && key === "setupassistant")); }
function cleanGroups(sourceGroups, guideComplete = false) { const seen = new Set(); return sourceGroups.map((group) => ({ ...group, items: stripHiddenItems(group.items, guideComplete).filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }) })).filter((group) => group.items.length); }
function buildLabels() { const entries = [...groups.flatMap((group) => group.items), ...Object.values(relatedTools).flat()]; const nextLabels = Object.fromEntries(entries.map(([key, , label]) => [key, label])); nextLabels.quickcreateai = "Tell Churvox"; nextLabels.command = "Review"; nextLabels.smart = "Today"; nextLabels.dispatch = "Schedule"; nextLabels.payments = "Payments"; nextLabels.photos = "Photos"; nextLabels.documents = "Documents"; nextLabels.setupassistant = "AI Guide"; nextLabels.security = "Security"; return nextLabels; }
function buildParentMap() { const map = {}; Object.entries(relatedTools).forEach(([parent, items]) => { items.forEach(([key]) => { if (!map[key]) map[key] = parent; }); }); groups.forEach((group) => group.items.forEach(([key]) => { map[key] = key; })); map.routes = "dispatch"; map.areas = "dispatch"; map.schedulerai = "dispatch"; map.gps = "time"; map.portal = "clients"; map.followupwriter = "clients"; map.reviewbooster = "clients"; return map; }
function resetFreshScrollTop() {
  const top = () => {
    try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch { try { window.scrollTo(0, 0); } catch {} }
    try { document.documentElement.scrollTop = 0; } catch {}
    try { document.body.scrollTop = 0; } catch {}
    try { document.scrollingElement.scrollTop = 0; } catch {}
    [".freshMain", ".freshPageMount", ".freshApp", "main"].forEach((selector) => {
      try { document.querySelectorAll(selector).forEach((el) => { if (el && typeof el.scrollTo === "function") el.scrollTo({ top: 0, left: 0, behavior: "auto" }); if (el) el.scrollTop = 0; }); } catch {}
    });
  };
  top();
  window.requestAnimationFrame(top);
  window.setTimeout(top, 80);
}
const labels = buildLabels();
const parentByKey = buildParentMap();

export default function FreshShell({ active, onChange, children }) {
  const auth = useAuth();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [verifySending, setVerifySending] = React.useState(false);
  const [verifySent, setVerifySent] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);

  React.useEffect(() => {
    const refreshGuide = () => setGuideComplete(guideIsComplete());
    window.addEventListener("storage", refreshGuide);
    window.addEventListener("churvox:ai-guide-status", refreshGuide);
    window.addEventListener("churvox:fresh-data-updated", refreshGuide);
    return () => { window.removeEventListener("storage", refreshGuide); window.removeEventListener("churvox:ai-guide-status", refreshGuide); window.removeEventListener("churvox:fresh-data-updated", refreshGuide); };
  }, []);

  React.useEffect(() => { resetFreshScrollTop(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(groups, guideComplete), [guideComplete]);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => { const mainKeys = new Set(safeMobileItems.map(([key]) => key)); return uniqueItems(safeGroups.flatMap((group) => group.items)).filter(([key]) => !mainKeys.has(key)); }, [safeMobileItems, safeGroups]);
  const currentPrimary = parentByKey[active] || active;
  const headerPagePills = React.useMemo(() => uniqueItems(stripHiddenItems(relatedTools[currentPrimary] || [], guideComplete)).slice(0, 4), [currentPrimary, guideComplete]);
  const headerPillKeys = React.useMemo(() => new Set(headerPagePills.map(([key]) => key)), [headerPagePills]);
  const emailNeedsVerification = auth?.user && auth.user.email_verified === false;
  const currentLabel = labels[active] || labels[currentPrimary] || "Churvox";
  const currentPurpose = purpose[active] || purpose[currentPrimary] || purpose.default;

  async function handleLogout() { try { if (auth?.logout) await auth.logout(); } finally { try { window.localStorage.removeItem("token"); window.localStorage.removeItem("owner_portal_session"); window.localStorage.removeItem("platform_owner_email"); } catch {} window.location.href = "/login"; } }
  function go(key) { if (key === "more") return; if (guideComplete && key === "setupassistant") return; setMoreOpen(false); resetFreshScrollTop(); onChange(key); }
  function openRealCreate(path) { setMoreOpen(false); window.location.href = path; }
  function openClientPopup() { try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {} setMoreOpen(false); resetFreshScrollTop(); onChange("clients"); window.dispatchEvent(new CustomEvent("churvox:open-client-popup")); }
  async function resendVerification() { setVerifySending(true); try { const token = window.localStorage.getItem("token") || ""; await fetch(`${API_BASE}/api/auth/resend-verification`, { method: "POST", credentials: "include", headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }); setVerifySent(true); } catch { setVerifySent(false); } finally { setVerifySending(false); } }
  function handleMobile(key) { if (key === "more") { setMoreOpen((value) => !value); return; } go(key); }

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand"><div className="freshLogo">C</div><div><strong>CHURVOX</strong><small>Owner workspace</small></div></div>
        <button className="freshLogoutSide" type="button" onClick={handleLogout}>Log out</button>
        <nav className="freshNav">{safeGroups.map((group) => <section className="freshNavGroup" key={group.title}><p>{group.title}</p>{group.items.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</section>)}</nav>
      </aside>
      <main className="freshMain">
        <div className="freshTopbar">
          <div><span>Current area</span><strong>{currentLabel}</strong><small>{currentPurpose}</small></div>
          <FreshTopStatus onNavigate={go} />
          <FreshSearch onNavigate={go} />
          <div className="freshTopActions">
            {!guideComplete ? <button type="button" onClick={() => go("setupassistant")}>AI Guide</button> : null}
            {!headerPillKeys.has("quickcreateai") ? <button type="button" onClick={() => go("quickcreateai")}>Tell Churvox</button> : null}
            {!headerPillKeys.has("command") ? <button type="button" onClick={() => go("command")}>Review</button> : null}
            <button type="button" onClick={() => openRealCreate("/jobs/new")}>New job</button>
            <button type="button" onClick={openClientPopup}>Add client</button>
            <button className="freshLogoutTop" type="button" onClick={handleLogout}>Log out</button>
          </div>
          {headerPagePills.length > 0 ? <div className="freshHeaderPills" aria-label={`${labels[currentPrimary] || "Current area"} page shortcuts`}>{headerPagePills.map(([key, mark, label]) => <button key={key} type="button" className={active === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</div> : null}
        </div>
        {emailNeedsVerification && <section className="freshCard freshItem need" style={{ marginBottom: 14 }}><b>Verify your email to keep your Churvox account secure</b><span>We have sent a verification link to {auth.user.email}. You can keep setting up, but please verify before sending customer emails.</span><div className="freshActions" style={{ maxWidth: 280 }}><button className="freshPrimary" type="button" onClick={resendVerification} disabled={verifySending}>{verifySending ? "Sending…" : verifySent ? "Verification sent" : "Resend verification email"}</button></div></section>}
        {children}
      </main>
      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
