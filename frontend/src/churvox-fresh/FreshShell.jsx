import React from "react";
import { useAuth } from "../context/AuthContext";

const GUIDE_COMPLETE_KEY = "churvox:ai-guide-complete:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";

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
function cleanAsk(text) { return String(text || "").toLowerCase().replace(/[^a-z0-9$@.\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function isJobCommand(text) { const lower = cleanAsk(text); return /(add|new|create|book|make).{0,50}(job|work|booking|service)/.test(lower) || /\bjob\b/.test(lower) || /lawn|mowing|cleaning|garden|handyman|painting|plumbing|electrical/.test(lower); }
function isClientCommand(text) { const lower = cleanAsk(text); return /(add|new|create|make).{0,40}(client|customer)/.test(lower); }
function askRoute(text) { const lower = cleanAsk(text); if (isJobCommand(text)) return "jobs"; if (isClientCommand(text)) return "clients"; if (lower.includes("unpaid") || lower.includes("overdue") || lower.includes("payment")) return "payments"; if (lower.includes("xero") || lower.includes("myob")) return "xero"; if (lower.includes("payroll")) return "payroll"; if (lower.includes("import") || lower.includes("csv")) return "imports"; if (lower.includes("command") || lower.includes("review") || lower.includes("approve") || lower.includes("follow up")) return "command"; return "askchurvox"; }

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);
  const [globalAsk, setGlobalAsk] = React.useState("");
  const currentPrimary = parentByKey[active] || active;

  React.useEffect(() => { const refresh = () => setGuideComplete(guideIsComplete()); window.addEventListener("storage", refresh); window.addEventListener("churvox:ai-guide-status", refresh); window.addEventListener("churvox:fresh-data-updated", refresh); return () => { window.removeEventListener("storage", refresh); window.removeEventListener("churvox:ai-guide-status", refresh); window.removeEventListener("churvox:fresh-data-updated", refresh); }; }, []);
  React.useEffect(() => { resetScroll(); }, [active]);

  const safeGroups = React.useMemo(() => cleanGroups(groups, guideComplete), [guideComplete]);
  const safeMobileItems = React.useMemo(() => uniqueItems(mobileItems), []);
  const safeExtraMobile = React.useMemo(() => { const main = new Set(safeMobileItems.map(([key]) => key)); return uniqueItems(safeGroups.flatMap((group) => group.items)).filter(([key]) => !main.has(key)); }, [safeMobileItems, safeGroups]);

  function go(key) { if (key === "more") return; setMoreOpen(false); resetScroll(); navigate(key); }
  async function handleLogout() { try { if (auth?.logout) await auth.logout(); } finally { window.location.href = "/login"; } }
  function handleMobile(key) { if (key === "more") { setMoreOpen((value) => !value); return; } go(key); }
  function submitAsk(event) {
    event?.preventDefault?.();
    const text = globalAsk.trim();
    const route = askRoute(text);
    try { window.localStorage.setItem(ASK_DRAFT_KEY, text); } catch {}
    if (route === "jobs") {
      try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, at: Date.now() })); } catch {}
      go("jobs");
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text, instruction: text } })), 120);
      return;
    }
    if (route === "clients") {
      try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {}
      go("clients");
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { text } })), 120);
      return;
    }
    go(route);
  }

  return (
    <div className="freshApp">
      <aside className="freshSide">
        <div className="freshBrand"><div className="freshLogo">C</div><div><strong>CHURVOX</strong><small>Owner workspace</small></div></div>
        <button className="freshLogoutSide" type="button" onClick={handleLogout}>Log out</button>
        <nav className="freshNav">{safeGroups.map((group) => <section className="freshNavGroup" key={group.title}><p>{group.title}</p>{group.items.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => go(key)}><i>{mark}</i><span>{label}</span></button>)}</section>)}</nav>
      </aside>
      <main className="freshMain">
        <div className="freshPageScroll">{children}</div>
        <form className="freshGlobalAsk" onSubmit={submitAsk}><label><span>What do you want to do?</span><input value={globalAsk} onChange={(event) => setGlobalAsk(event.target.value)} placeholder="open jobs, add client, show unpaid invoices…" /></label><button type="submit">Ask Churvox</button></form>
      </main>
      <button className="freshTellFloat" type="button" onClick={() => go("askchurvox")} aria-label="Open Tell Churvox">Tell</button>
      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
