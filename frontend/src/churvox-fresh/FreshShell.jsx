import React from "react";
import FreshSearch from "./FreshSearch";
import FreshTopStatus from "./FreshTopStatus";
import { useAuth } from "../context/AuthContext";
import API_BASE from "../lib/apiBase";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";

const groups = [
  { title: "Run the business", items: [["smart", "BP", "Business Pulse"], ["command", "CM", "Command"], ["jobs", "JB", "Jobs"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"], ["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"]] },
  { title: "People", items: [["team", "TM", "Team Access"], ["time", "TL", "Time Logs"], ["payroll", "PR", "Payroll"]] },
  { title: "Money", items: [["xero", "XE", "Xero Sync"], ["payments", "PY", "Payments"], ["reports", "RP", "Reports"], ["plans", "PL", "Plans & Usage"]] },
  { title: "Operations", items: [["photos", "PH", "Photos & Proof"], ["documents", "DC", "Documents"], ["automation", "AT", "Automation"], ["settings", "SG", "Settings"]] },
  { title: "Help", items: [["setupassistant", "AI", "AI Guide"], ["security", "SE", "Security"], ["support", "SP", "Support"]] },
];

const relatedTools = {
  smart: [["command", "CM", "Open approvals"], ["alerts", "AL", "Alerts"], ["setup", "ST", "Business Setup"]],
  command: [["approvals", "AP", "Approvals"], ["alerts", "AL", "Alerts"], ["audit", "AD", "Audit"], ["aioperator", "AO", "AI Operator"]],
  jobs: [["recurring", "RC", "Recurring Jobs"], ["services", "SV", "Services"], ["templates", "TP", "Templates"], ["extras", "XT", "Extras"], ["variations", "VR", "Variations"], ["warranties", "WR", "Warranties"], ["cancellations", "CA", "Cancellations"], ["safety", "SF", "Safety"], ["quality", "QL", "Quality"], ["reworkresolver", "RW", "Rework Resolver"]],
  dispatch: [["planday", "PD", "Plan My Day"], ["schedulerai", "SA", "Scheduler AI"], ["routes", "RT", "Routes"], ["areas", "AR", "Areas"], ["availability", "AV", "Availability"], ["gps", "GP", "GPS"]],
  clients: [["customerportal", "CP", "Customer Portal"], ["customermemory", "CM", "Customer Memory"], ["messages", "MS", "Messages"], ["messagetriage", "MT", "Message Triage"], ["followups", "FU", "Follow-ups"], ["reviews", "RV", "Reviews"], ["missinginfo", "MI", "Missing Info"], ["upsellfinder", "UF", "Upsell Finder"]],
  quotes: [["quoteai", "QA", "AI Quote Builder"], ["templates", "TP", "Templates"], ["extras", "XT", "Extras"], ["variations", "VR", "Variations"]],
  invoices: [["invoicecheck", "IC", "Invoice Checker"], ["creditnotes", "CN", "Credit Notes"], ["paymentpromise", "PP", "Payment Promise"], ["xero", "XE", "Xero Sync"]],
  team: [["worker", "WK", "Worker App"], ["time", "TL", "Time Logs"], ["payroll", "PR", "Payroll"], ["roles", "RL", "Roles"], ["subcontractors", "SB", "Subcontractors"], ["availability", "AV", "Availability"], ["workerbrief", "WB", "Worker Brief"], ["workerperformance", "WP", "Worker Performance"]],
  time: [["team", "TM", "Team Access"], ["payroll", "PR", "Payroll"], ["workerperformance", "WP", "Worker Performance"], ["gps", "GP", "GPS"]],
  payroll: [["team", "TM", "Team Access"], ["time", "TL", "Time Logs"], ["roles", "RL", "Roles"]],
  xero: [["invoices", "IV", "Invoices"], ["integrations", "IN", "Other Integrations"], ["billing", "BL", "Billing"]],
  payments: [["invoices", "IV", "Invoices"], ["paymentpromise", "PP", "Payment Promise"], ["billing", "BL", "Billing"]],
  reports: [["profit", "PF", "Profit"], ["expenses", "EX", "Expenses"], ["cashflowai", "CF", "Cashflow AI"], ["businesshealth", "BH", "Business Health"], ["aiusage", "AU", "AI Usage"]],
  plans: [["billing", "BL", "Billing"], ["aiusage", "AU", "AI Usage"]],
  photos: [["photoproof", "PP", "Photo Proof"], ["jobs", "JB", "Jobs"]],
  documents: [["contracts", "CT", "Contracts"], ["assets", "AS", "Assets"], ["inventory", "IV", "Inventory"], ["materialsai", "MA", "Materials AI"]],
  automation: [["command", "CM", "Command"], ["approvals", "AP", "Approvals"], ["alerts", "AL", "Alerts"], ["audit", "AD", "Audit"]],
  settings: [["setup", "ST", "Business Setup"], ["onboarding", "OB", "Onboarding"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"]],
  setupassistant: [["setup", "ST", "Business Setup"], ["onboarding", "OB", "Onboarding"], ["askchurvox", "AC", "Ask Churvox"]],
  security: [["trustcenter", "TC", "Trust Center"], ["audit", "AD", "Audit"]],
  support: [["helpdesk", "HD", "Help Desk"], ["feedback", "FB", "Feedback"]],
};

const purpose = {
  smart: "Business overview: today, cash, crew gaps and quick links.",
  command: "Decision desk: approve, decline or edit prepared admin actions.",
  jobs: "Create, assign and complete work.",
  dispatch: "Plan the day and move jobs into the right slots.",
  clients: "Customer records, history, contact details and notes.",
  quotes: "Price work, send quotes and convert accepted work into jobs.",
  invoices: "Draft, send, track and follow up money owed.",
  team: "People, invites, roles and worker app access.",
  time: "Worker hours and job time logs.",
  payroll: "Pay period workspace from approved time, no tax filing or bank files.",
  xero: "Owner-approved draft invoice sync only.",
  payments: "Payment status, billing links and payment follow-up tools.",
  reports: "Business reporting, cashflow and performance.",
  plans: "Plan, trial, usage and add-ons.",
  photos: "Job photos, proof and completion evidence.",
  documents: "Files, contracts, assets and job paperwork.",
  automation: "Rules and alerts that prepare work for approval.",
  settings: "Business details, branding, billing country and setup.",
  setupassistant: "Guided setup for new owners.",
  security: "Security, privacy and trust information.",
  support: "Contact Churvox support.",
  default: "Extra tool connected to the current area.",
};

const mobileItems = [["smart", "BP", "Pulse"], ["jobs", "JB", "Jobs"], ["dispatch", "SC", "Schedule"], ["command", "CM", "Command"], ["invoices", "IV", "Invoices"], ["more", "••", "More"]];

function guideIsComplete() { try { return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true"; } catch { return false; } }
function uniqueItems(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function stripHiddenItems(items, guideComplete) { return items.filter(([key]) => !(guideComplete && key === "setupassistant")); }
function cleanGroups(sourceGroups, guideComplete = false) { const seen = new Set(); return sourceGroups.map((group) => ({ ...group, items: stripHiddenItems(group.items, guideComplete).filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }) })).filter((group) => group.items.length); }
function buildLabels() { const entries = [...groups.flatMap((group) => group.items), ...Object.values(relatedTools).flat()]; const nextLabels = Object.fromEntries(entries.map(([key, , label]) => [key, label])); nextLabels.morningbrief = "Morning Brief"; nextLabels.askchurvox = "Ask Churvox"; nextLabels.globalactions = "Global Actions"; nextLabels.schedulerai = "Scheduler AI"; nextLabels.recurringSaver = "Recurring Saver"; nextLabels.recurringsaver = "Recurring Saver"; nextLabels.followupwriter = "Follow-up Writer"; nextLabels.reviewbooster = "Review Booster"; nextLabels.portal = "Portal View"; nextLabels.nz = "New Zealand Setup"; return nextLabels; }
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
  const currentRelatedTools = React.useMemo(() => uniqueItems(stripHiddenItems(relatedTools[currentPrimary] || [], guideComplete)), [currentPrimary, guideComplete]);
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
        <div className="freshTopbar"><div><span>Current area</span><strong>{currentLabel}</strong><small>{currentPurpose}</small></div><FreshTopStatus onNavigate={go} /><FreshSearch onNavigate={go} /><div className="freshTopActions">{!guideComplete ? <button type="button" onClick={() => go("setupassistant")}>AI Guide</button> : null}<button type="button" onClick={() => go("command")}>Command</button><button type="button" onClick={() => openRealCreate("/jobs/new")}>New job</button><button type="button" onClick={() => openRealCreate("/quotes/new")}>New quote</button><button type="button" onClick={openClientPopup}>Add client</button><button className="freshLogoutTop" type="button" onClick={handleLogout}>Log out</button></div></div>
        {emailNeedsVerification && <section className="freshCard freshItem need" style={{ marginBottom: 14 }}><b>Verify your email to keep your Churvox account secure</b><span>We have sent a verification link to {auth.user.email}. You can keep setting up, but please verify before sending customer emails.</span><div className="freshActions" style={{ maxWidth: 280 }}><button className="freshPrimary" type="button" onClick={resendVerification} disabled={verifySending}>{verifySending ? "Sending…" : verifySent ? "Verification sent" : "Resend verification email"}</button></div></section>}
        {currentRelatedTools.length > 0 && <section className="freshRelatedTools" aria-label={`${labels[currentPrimary] || "Current area"} tools`}><div className="freshRelatedHeader"><span>{labels[currentPrimary] || "Current area"}</span><strong>Related tools</strong><small>Extra actions sit here so the main sidebar stays clean.</small></div><div className="freshRelatedList">{currentRelatedTools.map(([key, mark, label]) => <button key={key} type="button" className={active === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</div></section>}
        {children}
      </main>
      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
