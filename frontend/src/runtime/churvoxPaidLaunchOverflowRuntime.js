// Paid launch owner visual guard.
// Keeps the real nav usable, hides the audit-only proof rail, and restores decided page content.

const STYLE_ID = "churvox-paid-launch-owner-visual-guard";
const DECK_ID = "churvox-decided-page-deck";

const PAGE_DECKS = {
  aiguide: ["Smart Hub / AI Guide", "Run the business from one clean starting point.", ["First setup", "Add clients, create jobs, invite workers and check approval basics."], ["Today check", "Jobs, messages, money due and missing details surface here."], ["Owner rule", "Churvox prepares admin. Final decisions stay in Command."]],
  command: ["Command approval desk", "Approve, edit or park from one owner desk.", ["Waiting approval", "Draft invoices, quote follow-ups, worker updates and missing details queue here."], ["Filled slip", "Each item opens as a proper filled form with evidence and next step."], ["Decision memory", "Approved, edited and parked actions feed back into jobs, clients and money records."]],
  jobs: ["Jobs desk", "Jobs are for work records, forms, proof and recurring work.", ["Editable job form", "Client, site, service, worker, price, date, time and repeat frequency."], ["Recurring lives here", "Weekly, fortnightly, monthly and custom repeat work belongs inside Jobs."], ["Status and proof", "Assigned, acknowledged, in progress, proof ready, completed and needs check."]],
  clients: ["Client workbench", "Clients need records, memory and import tools.", ["Client form", "Name, phone, email, address, service notes, saved price and access notes."], ["CSV import/export", "Client import must be visible and useful for setup."], ["Service memory", "Job history, pricing memory, notes and repeat service stay with the client."]],
  quotes: ["Quote pipeline", "Quotes move from draft to follow-up to accepted job.", ["Draft quote", "Scope, price, terms, client and next step are clear."], ["Follow-up", "Churvox prepares follow-ups; owner controls sending."], ["Accepted to job", "Accepted quotes carry details through to Jobs."]],
  invoices: ["Money desk", "Invoices show draft, due, overdue, paid and sync-ready state.", ["Draft from job", "Job, client, proof, time and price details prepare the invoice."], ["Due and overdue", "Money due should be obvious without hunting."], ["Paid guard", "Only mark paid after accounting refresh confirms paid."]],
  team: ["Team control", "Staff, roles, access and worker app status stay tidy.", ["Roles", "Owner, manager, worker, subcontractor and payroll-only access stay separate."], ["Invite worker", "New staff get correct worker app access."], ["Staff records", "Contact info, active state, app access and role are easy to manage."]],
  payroll: ["Payroll review", "Review and export only. No tax filing. No payout files.", ["Timesheets", "Worker start, pause, resume, complete and manual adjustments feed review."], ["Pay periods", "Weekly, fortnightly and monthly views should be selectable."], ["Export only", "Payroll stays review/export. Churvox does not submit to government or banks."]],
  workers: ["Worker field view", "Maps, GPS, jobs, proof, messages and time live here.", ["Google Maps GPS", "Maps belong with Workers, not inside Jobs."], ["Worker app", "Simple job instructions, directions, messages, start and finish flow."], ["Proof return", "Photos, notes, issues and completion details come back to the owner desk."]],
  xero: ["Accounting handoff", "Xero/MYOB stays draft-sync only and owner-approved.", ["Draft invoices only", "Invoices are prepared as drafts before accounting sync."], ["Owner-approved sync", "Risky accounting decisions stay in Command."], ["No unsafe actions", "No automatic sending, no tax filing and no payout files."]],
  settings: ["Business controls", "Settings should be practical and clean.", ["Business details", "Business name, email, logo, country and GST rate."], ["Notifications", "Owner and worker notification controls stay simple."], ["Security", "Account, password, data and access controls are easy to find."]],
  plans: ["Plans and billing", "Locked pricing, usage and billing controls.", ["Current plan", "Show the live current plan clearly."], ["Locked pricing", "Start $39, Crew $89, Operator $149, Command $299 plus GST."], ["Add-ons", "Growth Pack $99 and Accounting Sync Add-on $39 plus GST."]],
  support: ["Support desk", "Setup help, imports, billing, Xero and Command help stay visible.", ["Setup help", "First setup and missing business details."], ["Accounting help", "Draft sync rules and guardrails stay clear."], ["Contact", "hello@churvox.com for support."]]
};

function putStyle(el, key, value) {
  try { el.style.setProperty(key, value, "important"); } catch (_) {}
}

function keyFromLocation() {
  const hash = String(window.location.hash || "").replace("#", "").toLowerCase();
  const path = String(window.location.pathname || "").split("/").pop().toLowerCase();
  const raw = hash || path || "aiguide";
  if (["setupassistant", "dashboard", "today", "setup", "ai", "guide"].includes(raw)) return "aiguide";
  return PAGE_DECKS[raw] ? raw : "aiguide";
}

function installCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html, body, #root { width:100% !important; max-width:100% !important; overflow-x:hidden !important; }
    .churvoxOptionC, .churvoxOptionC * { box-sizing:border-box !important; min-width:0 !important; }
    .churvoxOptionC { display:flex !important; flex-direction:column !important; width:100vw !important; height:100vh !important; max-width:100vw !important; overflow:hidden !important; background:#eeeeea !important; color:#111815 !important; }
    .churvoxOptionC .launchNavProof, .churvoxOptionC .launchNavProof span, .churvoxOptionC .xcf10-dock, .churvoxOptionC .xcf10-dock-launch { display:none !important; visibility:hidden !important; width:0 !important; height:0 !important; max-width:0 !important; max-height:0 !important; padding:0 !important; margin:0 !important; border:0 !important; overflow:hidden !important; opacity:0 !important; }
    .churvoxOptionC .cocBar { flex:0 0 auto !important; display:grid !important; grid-template-columns:auto minmax(0,1fr) auto !important; align-items:center !important; gap:20px !important; width:auto !important; min-height:74px !important; margin:18px 20px 8px !important; padding:17px 20px !important; border-radius:17px !important; background:radial-gradient(circle at 86% 46%,rgba(240,100,47,.32),transparent 28%),linear-gradient(115deg,#101513 0%,#171b19 48%,#4c2a1c 100%) !important; color:#fff !important; box-shadow:0 18px 46px rgba(16,21,19,.18) !important; overflow:hidden !important; }
    .churvoxOptionC .brand { display:flex !important; align-items:center !important; gap:9px !important; min-width:190px !important; color:#fff !important; }
    .churvoxOptionC .brand i { display:block !important; width:29px !important; height:29px !important; min-width:29px !important; min-height:29px !important; border-radius:10px !important; background:#ef553c !important; }
    .churvoxOptionC .brand b, .churvoxOptionC .cocBar b { color:#fff !important; font-size:17px !important; font-weight:950 !important; }
    .churvoxOptionC .brand small, .churvoxOptionC .cocBar small { color:rgba(255,255,255,.78) !important; font-size:8px !important; font-weight:950 !important; text-transform:uppercase !important; }
    .churvoxOptionC .title h1 { margin:0 !important; color:#fff !important; font-size:38px !important; line-height:.86 !important; font-weight:950 !important; }
    .churvoxOptionC .title p { margin:4px 0 0 !important; color:rgba(255,255,255,.82) !important; font-size:11px !important; font-weight:900 !important; }
    .churvoxOptionC .owner { display:none !important; }
    .churvoxOptionC .cocNav { flex:0 0 auto !important; display:flex !important; flex-direction:row !important; align-items:center !important; justify-content:flex-start !important; gap:7px !important; width:auto !important; max-width:none !important; min-height:46px !important; margin:0 20px 12px !important; padding:7px !important; border-radius:16px !important; background:rgba(255,255,255,.72) !important; box-shadow:0 12px 28px rgba(16,21,19,.08) !important; overflow-x:auto !important; overflow-y:hidden !important; }
    .churvoxOptionC .cocNav button { display:inline-flex !important; align-items:center !important; justify-content:center !important; flex:0 0 auto !important; width:auto !important; min-width:auto !important; max-width:none !important; height:auto !important; min-height:32px !important; max-height:36px !important; aspect-ratio:auto !important; padding:8px 14px !important; border:0 !important; border-radius:999px !important; background:#e4e7e7 !important; color:#1e2422 !important; font-size:12px !important; font-weight:950 !important; line-height:1 !important; white-space:nowrap !important; box-shadow:none !important; transform:none !important; opacity:1 !important; }
    .churvoxOptionC .cocNav button.active { background:#ef553c !important; color:#fff !important; box-shadow:0 8px 22px rgba(239,85,60,.28) !important; }
    .churvoxOptionC .workspace { flex:1 1 auto !important; width:auto !important; margin:0 20px 22px !important; padding:0 !important; overflow-y:auto !important; overflow-x:hidden !important; background:transparent !important; }
    .churvoxOptionC .cocPage { display:grid !important; grid-template-columns:repeat(3,minmax(0,1fr)) !important; gap:12px !important; align-items:start !important; padding:0 0 22px !important; }
    .churvoxOptionC .cocPanel { border:1px solid rgba(16,21,19,.08) !important; border-radius:16px !important; background:rgba(255,255,255,.78) !important; color:#111815 !important; box-shadow:0 13px 30px rgba(16,21,19,.06) !important; padding:16px !important; overflow:hidden !important; }
    .churvoxOptionC .cocPanel.full, .churvoxOptionC .cocPanel.wide { grid-column:1/-1 !important; }
    #${DECK_ID} { grid-column:1/-1 !important; display:grid !important; grid-template-columns:1.2fr repeat(3,1fr) !important; gap:12px !important; margin-bottom:0 !important; }
    #${DECK_ID} .deckHero, #${DECK_ID} article { border:1px solid rgba(16,21,19,.08) !important; border-radius:16px !important; background:rgba(255,255,255,.82) !important; box-shadow:0 13px 30px rgba(16,21,19,.06) !important; padding:16px !important; }
    #${DECK_ID} .deckHero { background:radial-gradient(circle at 86% 22%,rgba(239,85,60,.18),transparent 32%),linear-gradient(135deg,#101513,#1f2925 65%,#ef553c) !important; color:#fff !important; }
    #${DECK_ID} small { display:block !important; margin-bottom:8px !important; color:#ffd7c6 !important; font-size:10px !important; font-weight:950 !important; letter-spacing:.08em !important; text-transform:uppercase !important; }
    #${DECK_ID} h2 { margin:0 0 8px !important; color:#fff !important; font-size:28px !important; line-height:.95 !important; font-weight:950 !important; }
    #${DECK_ID} p { margin:0 !important; color:rgba(255,255,255,.86) !important; font-size:13px !important; font-weight:850 !important; line-height:1.35 !important; }
    #${DECK_ID} article b { display:block !important; margin-bottom:7px !important; color:#111815 !important; font-size:15px !important; font-weight:950 !important; }
    #${DECK_ID} article span { display:block !important; color:#44504c !important; font-size:12px !important; font-weight:800 !important; line-height:1.35 !important; }
    @media(max-width:980px){ .churvoxOptionC .cocBar{grid-template-columns:1fr !important; margin:12px !important;} .churvoxOptionC .title h1{font-size:30px !important;} .churvoxOptionC .cocNav{margin:0 12px 10px !important;} .churvoxOptionC .workspace{margin:0 12px 16px !important;} .churvoxOptionC .cocPage, #${DECK_ID}{grid-template-columns:1fr !important;} }
  `;
  document.head.appendChild(style);
}

function mountDeck() {
  const page = keyFromLocation();
  const data = PAGE_DECKS[page] || PAGE_DECKS.aiguide;
  const pageNode = document.querySelector(".churvoxOptionC .workspace .cocPage");
  if (!pageNode) return;
  let deck = document.getElementById(DECK_ID);
  if (!deck) {
    deck = document.createElement("section");
    deck.id = DECK_ID;
    pageNode.prepend(deck);
  }
  if (deck.dataset.page === page) return;
  deck.dataset.page = page;
  deck.innerHTML = `<div class="deckHero"><small>${data[0]}</small><h2>${data[1]}</h2><p>Churvox does the admin. You approve.</p></div>${data.slice(2).map(([title, text]) => `<article><b>${title}</b><span>${text}</span></article>`).join("")}`;
}

function fixOwnerShell() {
  const root = document.querySelector(".churvoxOptionC");
  if (!root) return;
  installCss();
  root.querySelectorAll(".launchNavProof, .launchNavProof span, .xcf10-dock, .xcf10-dock-launch").forEach((el) => {
    putStyle(el, "display", "none");
    putStyle(el, "visibility", "hidden");
    putStyle(el, "width", "0");
    putStyle(el, "height", "0");
    putStyle(el, "overflow", "hidden");
    el.setAttribute("aria-hidden", "true");
  });
  root.querySelectorAll(".cocNav").forEach((el) => { putStyle(el, "display", "flex"); putStyle(el, "overflow-x", "auto"); });
  root.querySelectorAll(".cocNav button").forEach((el) => { putStyle(el, "width", "auto"); putStyle(el, "height", "auto"); putStyle(el, "min-height", "32px"); putStyle(el, "aspect-ratio", "auto"); putStyle(el, "border-radius", "999px"); });
  mountDeck();
}

function run() {
  [0, 1, 25, 100, 300, 700, 1300, 2200].forEach((ms) => window.setTimeout(fixOwnerShell, ms));
  window.requestAnimationFrame?.(fixOwnerShell);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  window.addEventListener("hashchange", run);
  window.addEventListener("popstate", run);
  window.addEventListener("click", run, true);
  window.addEventListener("churvox:fresh-data-updated", run);
  run();
}
