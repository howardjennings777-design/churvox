import React from "react";
import { useAuth } from "../context/AuthContext";
import "./freshAskPreview.css";

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
function tidy(text) { return String(text || "").replace(/\s+/g, " ").trim(); }
function titleCase(text) { return tidy(text).replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function isJobCommand(text) { const lower = cleanAsk(text); return /(add|new|create|book|make).{0,50}(job|work|booking|service)/.test(lower) || /lawn|mowing|cleaning|garden|handyman|painting|plumbing|electrical/.test(lower); }
function isClientCommand(text) { const lower = cleanAsk(text); return /(add|new|create|make).{0,40}(client|customer)/.test(lower); }
function askRoute(text) { const lower = cleanAsk(text); if (isJobCommand(text)) return "jobs"; if (isClientCommand(text)) return "clients"; if (lower.includes("unpaid") || lower.includes("overdue") || lower.includes("payment")) return "payments"; if (lower.includes("xero") || lower.includes("myob")) return "xero"; if (lower.includes("payroll")) return "payroll"; if (lower.includes("import") || lower.includes("csv")) return "imports"; if (lower.includes("command") || lower.includes("review") || lower.includes("approve") || lower.includes("follow up")) return "command"; if (lower.includes("job")) return "jobs"; return "askchurvox"; }
function fireJobAsk(text) { window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text, instruction: text, source: "ask-churvox" } })); }
function jobKind(text) { const lower = cleanAsk(text); if (/lawn|mow/.test(lower)) return "Lawn mowing"; if (/garden|hedge|weed/.test(lower)) return "Garden maintenance"; if (/window/.test(lower)) return "Window cleaning"; if (/pressure|wash/.test(lower)) return "Pressure washing"; if (/clean/.test(lower)) return "Cleaning"; if (/paint/.test(lower)) return "Painting"; if (/plumb/.test(lower)) return "Plumbing"; if (/electric/.test(lower)) return "Electrical"; if (/pest/.test(lower)) return "Pest control"; if (/roof/.test(lower)) return "Roofing"; if (/handyman|repair/.test(lower)) return "Handyman"; return ""; }
function stopAtKnownWords(value) { const source = ` ${tidy(value)} `; const stops = [" tomorrow", " today", " next ", " monday", " tuesday", " wednesday", " thursday", " friday", " saturday", " sunday", " phone", " mobile", " email", " assign", " worker", " staff", " with ", " $", " price", " weekly", " fortnight", " monthly", " repeat", " recurring"]; const indexes = stops.map((word) => source.toLowerCase().indexOf(word)).filter((index) => index > -1); return tidy(source.slice(0, indexes.length ? Math.min(...indexes) : source.length).replace(/[,.;]+$/g, "")); }
function findClient(text) { return titleCase(stopAtKnownWords(text.match(/\b(?:for|client|customer)\s+(.+?)(?=\s+(?:at|address|site|location|tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|phone|mobile|email|\$|price|weekly|fortnightly|monthly|assign|worker|staff)\b|$)/i)?.[1] || "")); }
function findAddress(text) { const direct = stopAtKnownWords(text.match(/\b(?:at|address|site|location)\s+(.+)/i)?.[1] || ""); if (direct) return titleCase(direct); const street = text.match(/\b\d+\s+[A-Za-z0-9 .'-]+?\s+(?:road|rd|street|st|avenue|ave|drive|dr|lane|ln|place|pl|terrace|way|crescent|cres|court|ct)\b(?:\s+[A-Za-z .'-]{2,30})?/i)?.[0] || ""; return titleCase(stopAtKnownWords(street)); }
function findSchedule(text) { const lower = cleanAsk(text); const day = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].find((item) => lower.includes(item)); const time = text.match(/\b(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)?.[0] || (lower.includes("morning") ? "morning" : lower.includes("afternoon") ? "afternoon" : lower.includes("evening") ? "evening" : ""); return tidy([day ? titleCase(day) : "", time].filter(Boolean).join(" · ")); }
function findWorker(text) { return titleCase(stopAtKnownWords(text.match(/\b(?:assign|worker|staff)\s+(?:to\s+)?(.+?)(?=\s+(?:tomorrow|today|next|at|address|site|for|phone|mobile|email|\$|price|weekly|fortnightly|monthly)\b|$)/i)?.[1] || text.match(/\bwith\s+([A-Za-z][A-Za-z .'-]{1,40})(?=\s+(?:tomorrow|today|next|at|for|phone|email|\$|weekly|fortnightly|monthly)|$)/i)?.[1] || "")); }
function findRegion(text) { if (/lower hutt|upper hutt|wellington|naenae|wainuiomata|porirua/i.test(text)) return "Wellington"; if (/auckland/i.test(text)) return "Auckland"; if (/sydney|nsw|new south wales/i.test(text)) return "New South Wales"; if (/melbourne|victoria/i.test(text)) return "Victoria"; if (/brisbane|queensland/i.test(text)) return "Queensland"; return ""; }
function findRepeat(text) { const lower = cleanAsk(text); if (/fortnight|every 2 weeks/.test(lower)) return "Fortnightly"; if (/month/.test(lower)) return "Monthly"; if (/weekly|every week|recurring|repeat|regular/.test(lower)) return "Weekly"; return ""; }
function askFieldPreview(text) { const raw = tidy(text); const route = askRoute(raw); const phone = raw.match(/(?:phone|mobile|ph|number)\s*[:\-]?\s*([+\d][+\d\s().-]{6,})/i)?.[1] || raw.match(/\b(?:\+?64|0)\d[\d\s().-]{6,}\b/)?.[0] || ""; const price = raw.match(/\$\s*(\d+(?:\.\d{1,2})?)/)?.[0] || raw.match(/\b(?:price|fixed|charge)\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i)?.[1] || ""; const email = raw.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ""; return { route, fields: [["Action", route === "jobs" ? "Create job draft" : route === "clients" ? "Add client" : route === "payments" ? "Open payments" : route === "xero" ? "Open Xero" : route === "command" ? "Open Command" : "Open area"], ["Job type", jobKind(raw)], ["Client", findClient(raw)], ["Address", findAddress(raw)], ["Schedule", findSchedule(raw)], ["Phone", tidy(phone)], ["Email", email], ["Worker", findWorker(raw)], ["Price", price ? (price.startsWith("$") ? price : `$${price}`) : ""], ["Repeat", findRepeat(raw)], ["Region", findRegion(raw)], ["Notes", raw ? raw.slice(0, 90) : ""]].map(([label, value]) => ({ label, value: tidy(value), filled: Boolean(tidy(value)) })) }; }

export default function FreshShell({ active, onChange, onNavigate, children }) {
  const auth = useAuth();
  const navigate = onChange || onNavigate || (() => {});
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [guideComplete, setGuideComplete] = React.useState(guideIsComplete);
  const [globalAsk, setGlobalAsk] = React.useState("");
  const currentPrimary = parentByKey[active] || active;
  const preview = React.useMemo(() => askFieldPreview(globalAsk), [globalAsk]);

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
      try { window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, text, at: Date.now() })); } catch {}
      if (currentPrimary === "jobs") fireJobAsk(text);
      else {
        go("jobs");
        [120, 350, 800].forEach((delay) => window.setTimeout(() => fireJobAsk(text), delay));
      }
      return;
    }
    if (route === "clients") {
      try { window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); } catch {}
      if (currentPrimary === "clients") window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { text } }));
      else go("clients");
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
        {currentPrimary === "askchurvox" ? <section className={`freshAskPreview ${globalAsk.trim() ? "active" : ""}`}><header><span>Churvox picked up</span><b>{globalAsk.trim() ? "Ready to pre-fill what it can." : "Start with a normal sentence."}</b></header><div className="freshAskPreviewGrid">{preview.fields.map((field) => <div key={field.label} className={field.filled ? "filled" : "missing"}><span>{field.label}</span><b>{field.filled ? field.value : "Not found yet"}</b></div>)}</div></section> : null}
      </main>
      <button className="freshTellFloat" type="button" onClick={() => go("askchurvox")} aria-label="Open Tell Churvox">Tell</button>
      {moreOpen && <div className="freshMobileMore">{safeExtraMobile.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</div>}
      <nav className="freshMobileNav" aria-label="Mobile navigation">{safeMobileItems.map(([key, mark, label]) => <button key={key} type="button" className={currentPrimary === key || (key === "more" && moreOpen) ? "active" : ""} onClick={() => handleMobile(key)}><i>{mark}</i><span>{label}</span></button>)}</nav>
    </div>
  );
}
