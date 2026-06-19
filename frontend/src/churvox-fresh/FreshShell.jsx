import React from "react";
import { useAuth } from "../context/AuthContext";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";

const groups = [
  { title: "Today", items: [["smart", "TD", "Today"], ["askchurvox", "AI", "Tell Churvox"], ["command", "CM", "Command"]] },
  { title: "Work", items: [["jobs", "JB", "Jobs"], ["dispatch", "SC", "Schedule"], ["clients", "CL", "Clients"]] },
  { title: "Money", items: [["quotes", "QT", "Quotes"], ["invoices", "IV", "Invoices"], ["payments", "PY", "Payments"], ["xero", "XE", "Xero"]] },
  { title: "Team", items: [["team", "TM", "Team"], ["workercommand", "WC", "Worker View"], ["time", "TS", "Time Sheets"], ["payroll", "PR", "Payroll"]] },
  { title: "Command", items: [["automation", "AT", "Automation"], ["reports", "RP", "Reports"], ["launchcontrol", "LC", "Launch"]] },
  { title: "Setup", items: [["settings", "SG", "Settings"], ["imports", "IM", "Imports"], ["exports", "EX", "Exports"], ["plans", "PL", "Plans"], ["support", "SP", "Support"]] },
];

const mobileItems = [["smart", "TD", "Today"], ["askchurvox", "AI", "Tell"], ["jobs", "JB", "Jobs"], ["invoices", "IV", "Money"], ["command", "CM", "Command"], ["more", "••", "More"]];
const parentByKey = { routes: "dispatch", areas: "dispatch", schedulerai: "dispatch", gps: "time", portal: "clients", followupwriter: "clients", reviewbooster: "clients" };
groups.forEach((group) => group.items.forEach(([key]) => { parentByKey[key] = key; }));

function guideIsComplete() { try { return window.localStorage.getItem(GUIDE_COMPLETE_KEY) === "true"; } catch { return false; } }
function uniqueItems(items) { const seen = new Set(); return items.filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }); }
function cleanGroups(sourceGroups, guideComplete = false) { const seen = new Set(); return sourceGroups.map((group) => ({ ...group, items: group.items.filter(([key]) => !(guideComplete && key === "setupassistant")).filter(([key]) => { if (seen.has(key)) return false; seen.add(key); return true; }) })).filter((group) => group.items.length); }
function resetScroll() { try { window.scrollTo({ top: 0, left: 0, behavior: "auto" }); } catch {} try { document.querySelectorAll(".freshMain,.freshPageScroll,.freshApp,main").forEach((el) => { el.scrollTop = 0; }); } catch {} }

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);
  const currentPrimary = parentByKey[active] || active;

  React.useEffect(() => { const refresh = () => setGuideComplete(guideIsComplete()); window.addEventListener("storage", refresh); window.addEventListener("churvox:ai-guide-status", refresh); window.addEventListener("churvox:fresh-data-updated", refresh); return () => { window.removeEventListener("storage", refresh); window.removeEventListener("churvox:ai-guide-status", refresh); window.removeEventListener("churvox:fresh-data-updated", refresh); }; }, []);
  React.useEffect(() => { resetScroll(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(groups, guideComplete), [guideComplete]);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => { const main = new Set(safeMobileItems.map(([key]) => key)); return uniqueItems(safeGroups.flatMap((group) => group.items)).filter(([key]) => !main.has(key)); }, [safeMobileItems, safeGroups]);

  function go(key) { if (key === "more") return; setMoreOpen(false); resetScroll(); navigate(key); }
  async function handleLogout() { try { if (auth?.logout) await auth.logout(); } finally { window.location.href = "/login"; } }
  function handleMobile(key) { if (key === "more") { setMoreOpen((value) => !value); return; } go(key); }

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand"><div className="freshLogo">C</div><div><strong>CHURVOX</strong><small>Owner workspace</small></div></div>
        <button className="freshLogoutSide" type="button" onClick={handleLogout}>Log out</button>
        <nav className="freshNav">{safeGroups.map((group) => <section className="freshNavGroup" key={group.title}><p>{group.title}</p>{group.items.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</section>)}</nav>
      </aside>
      <main className="freshMain"><div className="freshPageScroll">{children}</div></main>
      <button className="freshTellFloat" type="button" onClick={() => go("askchurvox")} aria-label="Open Tell Churvox">Tell</button>
      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
