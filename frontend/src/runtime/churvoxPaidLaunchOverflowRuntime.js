// Owner app recovery guard.
// Hides audit-only rail, keeps the paid-launch shell usable, and restores missing page depth across owner pages.

const STYLE_ID = "churvox-owner-recovery-style-v1";
const RECOVERY_ID = "churvox-owner-page-recovery";

const PAGE_DATA = {
  aiguide: {
    kicker: "SMART HUB / AI GUIDE",
    title: "Business control without hunting.",
    text: "Today, gaps, money, worker updates and owner checks should be obvious from the first screen.",
    actions: ["Add client", "Add job", "Open Command", "Setup guide"],
    panels: [
      ["Today pulse", "Jobs moving, messages waiting, invoices due and worker proof come together here."],
      ["Admin debt radar", "Missing price, worker, date, address, proof or invoice details are surfaced before they become a problem."],
      ["First setup", "Business details, GST, clients, jobs, team, worker app and billing basics stay visible until complete."],
      ["Command handoff", "Anything risky is prepared and sent to Command. Churvox does the admin. You approve."],
    ],
  },
  command: {
    kicker: "OWNER APPROVAL DESK",
    title: "Approve, edit or park from one place.",
    text: "Command is the decision desk. Other pages show records; Command holds the owner actions.",
    actions: ["Approve ready", "Edit slip", "Park item", "Open history"],
    panels: [
      ["Waiting approval", "Draft invoices, quote follow-ups, worker proof, client issues and missing details queue here."],
      ["Filled approval slip", "Each item should open with job, client, price, proof, worker, note and next step already filled."],
      ["Decision memory", "Approved, edited and parked outcomes should feed back into Jobs, Clients, Quotes and Invoices."],
      ["Safe actions only", "No automatic invoice sending, tax filing or payout files. Owner approval stays required."],
    ],
  },
  jobs: {
    kicker: "JOBS WORK BOARD",
    title: "Jobs need records, proof and proper forms.",
    text: "Jobs are not for approval clutter. They hold work details, recurring setup, status, photos and worker notes.",
    actions: ["Add job", "Recurring", "Import jobs", "Review proof"],
    fields: ["Client", "Service", "Worker", "Price", "Date", "Time", "Repeat", "Billing type"],
    panels: [
      ["Editable job form", "Client, site, service, worker, price, date, time, recurrence and billing type must be editable."],
      ["Status lanes", "Assigned, acknowledged, in progress, proof ready, completed and needs check."],
      ["Recurring lives here", "Weekly, fortnightly, monthly and custom repeat work belongs inside Jobs."],
      ["Job detail popup", "Tapping a job should open a filled slip, not send the owner hunting through pages."],
    ],
  },
  clients: {
    kicker: "CLIENT WORKBENCH",
    title: "Clients need memory, imports and history.",
    text: "Client records should carry service notes, saved prices, access notes, jobs, quotes and invoices.",
    actions: ["Add client", "CSV import", "Export", "Open record"],
    fields: ["Name", "Phone", "Email", "Address", "Service notes", "Saved price", "Access notes", "Preferred schedule"],
    panels: [
      ["Client form", "Name, phone, email, address, notes, saved price and repeat service details."],
      ["CSV import/export", "Setup needs a clear import path and usable exports."],
      ["Service memory", "Previous jobs, notes, pricing and frequency should follow the client."],
      ["Linked history", "Jobs, quotes, invoices and messages should be visible from the client record."],
    ],
  },
  workers: {
    kicker: "WORKER FIELD VIEW",
    title: "Maps, GPS, proof, messages and time live here.",
    text: "Jobs should not carry maps. Worker location and field activity belong on Workers.",
    actions: ["Open map", "Worker jobs", "Messages", "Timesheets"],
    panels: [
      ["Google Maps / GPS", "Live worker GPS, route context and site location stay with Workers."],
      ["Worker app", "Simple instructions: job, address, directions, start, finish, notes and photos."],
      ["Proof return", "Photos, notes, issues and completion details come back for owner review."],
      ["Worker messages", "Worker-to-owner messages should be visible here and on the main attention flow."],
    ],
  },
  quotes: {
    kicker: "QUOTE PIPELINE",
    title: "Quotes move from draft to accepted job.",
    text: "Quotes need stages, follow-up and a clean accepted-to-job flow.",
    actions: ["New quote", "Follow up", "Accepted to job", "Review drafts"],
    panels: [
      ["Draft", "Client, scope, price, terms and photos should be together before sending."],
      ["Sent / viewed", "Follow-up timing and client response should be clear."],
      ["Accepted", "Accepted quotes should create or update a job with details carried through."],
      ["Command check", "Prepared follow-ups and risky edits belong in Command."],
    ],
  },
  invoices: {
    kicker: "MONEY DESK",
    title: "Invoices show money state clearly.",
    text: "Draft, due, overdue, paid and accounting-ready invoices should not be buried.",
    actions: ["New invoice", "Drafts", "Overdue", "Open Xero"],
    panels: [
      ["Draft from job", "Job, client, price, worker time and proof prepare the invoice."],
      ["Due and overdue", "Money due today and overdue needs a clear owner view."],
      ["Paid guard", "Only mark paid after accounting refresh confirms paid."],
      ["Sync ready", "Accounting handoff remains draft-sync only and owner-approved."],
    ],
  },
  messages: {
    kicker: "MESSAGES",
    title: "Worker and client messages need an owner desk.",
    text: "Messages should not disappear. Worker updates, issues and client replies need context and next steps.",
    actions: ["Worker messages", "Client replies", "Prepared reply", "Send to Command"],
    panels: [
      ["Worker updates", "Notes, issues and job changes sent by workers should appear here."],
      ["Client replies", "Quote, invoice and job replies should stay linked to records."],
      ["Prepared response", "Churvox can prepare a reply, but the owner controls sending."],
      ["Needs decision", "Anything risky becomes a Command item instead of being auto-handled."],
    ],
  },
  team: {
    kicker: "TEAM CONTROL",
    title: "Roles, invites and access stay tidy.",
    text: "Team is for people and permissions. Payroll stays separate.",
    actions: ["Add staff", "Invite worker", "CSV import", "Access rules"],
    fields: ["Name", "Role", "Email", "Phone", "Access", "Worker app", "Active", "Notes"],
    panels: [
      ["Roles", "Owner, manager, worker, subcontractor and payroll-only access stay separate."],
      ["Worker invite", "Invite links should give workers the right mobile app access."],
      ["Active staff", "Active/inactive state matters for billing and worker lists."],
      ["Access control", "Staff should only see what their role needs."],
    ],
  },
  payroll: {
    kicker: "PAYROLL REVIEW",
    title: "Review time and export only.",
    text: "Payroll is not tax filing and not bank payouts. It is review, periods and exports.",
    actions: ["Weekly", "Fortnightly", "Monthly", "Export CSV"],
    panels: [
      ["Timesheets", "Start, pause, resume, complete and manual adjustments feed review."],
      ["Pay periods", "Weekly, fortnightly and monthly views should be selectable."],
      ["Worker slips", "Worker time slips should open for review before export."],
      ["Locked guardrails", "No tax filing and no bank payout files."],
    ],
  },
  xero: {
    kicker: "ACCOUNTING HANDOFF",
    title: "Draft sync only. Owner-approved.",
    text: "Xero/MYOB should show connection, guarded actions, exports and paid-status rules clearly.",
    actions: ["Connect", "Refresh status", "Sync draft", "Export pack"],
    panels: [
      ["Live status", "Connection state, tenant, scopes and last sync should be visible."],
      ["Draft invoices only", "Invoices are prepared as drafts before accounting sync."],
      ["Payment status guard", "Only mark paid after accounting refresh confirms paid."],
      ["No unsafe actions", "No automatic invoice sending, tax filing or payout files."],
    ],
  },
  settings: {
    kicker: "BUSINESS CONTROLS",
    title: "Settings should be practical and clean.",
    text: "Business profile, logo, GST, country, security and notifications belong here.",
    actions: ["Branding", "GST", "Security", "Save"],
    fields: ["Business name", "Logo", "Email", "Country", "GST rate", "Notifications", "Security", "Exports"],
    panels: [
      ["Business details", "Business name, contact email, logo, country and GST rate."],
      ["Notifications", "Owner and worker notifications should be simple."],
      ["Security", "Password, access, delete account and data controls stay visible."],
      ["Exports", "CSV/export defaults and records should be easy to find."],
    ],
  },
  plans: {
    kicker: "PLANS AND BILLING",
    title: "Current plan, usage and locked pricing.",
    text: "Plans should show live plan state, usage, checkout and add-ons clearly.",
    actions: ["Current plan", "Usage", "Manage billing", "Checkout"],
    panels: [
      ["Locked pricing", "Start $39, Crew $89, Operator $149, Command $299 per month + GST."],
      ["Add-ons", "Growth Pack $99 and Accounting Sync Add-on $39 per month + GST."],
      ["Usage", "Clients, jobs, active team and AI/action usage should be visible."],
      ["Stripe guard", "Checkout starts only when the owner chooses it."],
    ],
  },
  support: {
    kicker: "SUPPORT DESK",
    title: "Help should be a real workspace.",
    text: "Setup, imports, worker app, billing, Xero and Command help should be easy to start.",
    actions: ["New ticket", "Setup help", "Email support", "Guides"],
    panels: [
      ["Contact", "hello@churvox.com"],
      ["Setup help", "Business setup, first client, first job and worker invite help."],
      ["Billing help", "Plans, trial, checkout, account and invoice questions."],
      ["Sync help", "Xero/MYOB draft-sync rules and guardrails."],
    ],
  },
};

function putStyle(el, key, value) {
  try { el.style.setProperty(key, value, "important"); } catch (_) {}
}

function currentPageKey() {
  const path = (window.location.pathname || "").toLowerCase();
  const hash = (window.location.hash || "").replace("#", "").toLowerCase();
  const raw = hash || (path === "/plans" ? "plans" : "aiguide");
  const aliases = { "": "aiguide", today: "aiguide", dashboard: "aiguide", setup: "aiguide", setupassistant: "aiguide", firstrun: "aiguide", help: "support", support: "support", payroll: "payroll", messages: "messages", sync: "xero", accounting: "xero" };
  return PAGE_DATA[raw] ? raw : (aliases[raw] || "aiguide");
}

function installCss() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html,body,#root{width:100%!important;max-width:100%!important;overflow-x:hidden!important}
    body:has(.churvoxOptionC){margin:0!important;background:#eeeeea!important}
    .churvoxOptionC,.churvoxOptionC *{box-sizing:border-box!important;min-width:0!important}
    .churvoxOptionC{display:flex!important;flex-direction:column!important;width:100vw!important;height:100vh!important;max-width:100vw!important;overflow:hidden!important;background:#eeeeea!important;color:#111815!important}
    .churvoxOptionC .launchNavProof,.churvoxOptionC .launchNavProof span,.churvoxOptionC .xcf10-dock,.churvoxOptionC .xcf10-dock-launch{display:none!important;visibility:hidden!important;width:0!important;height:0!important;max-width:0!important;max-height:0!important;padding:0!important;margin:0!important;border:0!important;overflow:hidden!important;opacity:0!important}
    .churvoxOptionC .cocBar{flex:0 0 auto!important;display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:20px!important;width:auto!important;min-height:74px!important;margin:18px 20px 8px!important;padding:17px 20px!important;border-radius:17px!important;background:radial-gradient(circle at 86% 46%,rgba(240,100,47,.32),transparent 28%),linear-gradient(115deg,#101513 0%,#171b19 48%,#4c2a1c 100%)!important;color:#fff!important;box-shadow:0 18px 46px rgba(16,21,19,.18)!important;overflow:hidden!important}
    .churvoxOptionC .brand{display:flex!important;align-items:center!important;gap:9px!important;min-width:190px!important;color:#fff!important}.churvoxOptionC .brand i{display:block!important;width:29px!important;height:29px!important;min-width:29px!important;min-height:29px!important;border-radius:10px!important;background:#ef553c!important;box-shadow:0 0 0 4px rgba(239,85,60,.15)!important}.churvoxOptionC .brand b,.churvoxOptionC .cocBar b{color:#fff!important;font-size:17px!important;font-weight:950!important}.churvoxOptionC .brand small,.churvoxOptionC .cocBar small{color:rgba(255,255,255,.78)!important;font-size:8px!important;font-weight:950!important;text-transform:uppercase!important}.churvoxOptionC .title h1{margin:0!important;color:#fff!important;font-size:38px!important;line-height:.86!important;font-weight:950!important;letter-spacing:-.05em!important}.churvoxOptionC .title p{margin:4px 0 0!important;color:rgba(255,255,255,.82)!important;font-size:11px!important;font-weight:900!important}.churvoxOptionC .owner{display:none!important}
    .churvoxOptionC .cocNav{flex:0 0 auto!important;display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:7px!important;width:auto!important;max-width:none!important;min-height:46px!important;margin:0 20px 12px!important;padding:7px!important;border-radius:16px!important;background:rgba(255,255,255,.72)!important;box-shadow:0 12px 28px rgba(16,21,19,.08)!important;overflow-x:auto!important;overflow-y:hidden!important}.churvoxOptionC .cocNav button{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;width:auto!important;min-width:auto!important;max-width:none!important;height:auto!important;min-height:32px!important;max-height:36px!important;aspect-ratio:auto!important;padding:8px 14px!important;border:0!important;border-radius:999px!important;background:#e4e7e7!important;color:#1e2422!important;font-size:12px!important;font-weight:950!important;line-height:1!important;white-space:nowrap!important;box-shadow:none!important;transform:none!important;opacity:1!important}.churvoxOptionC .cocNav button.active{background:#ef553c!important;color:#fff!important;box-shadow:0 8px 22px rgba(239,85,60,.28)!important}
    .churvoxOptionC .workspace{flex:1 1 auto!important;width:auto!important;margin:0 20px 22px!important;padding:0!important;overflow-y:auto!important;overflow-x:hidden!important;background:transparent!important}.churvoxOptionC .cocPage{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px!important;align-items:start!important;padding:0 0 22px!important;background:transparent!important}.churvoxOptionC .cocPanel{border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:rgba(255,255,255,.82)!important;color:#111815!important;box-shadow:0 13px 30px rgba(16,21,19,.06)!important;padding:16px!important;overflow:hidden!important}.churvoxOptionC .cocPanel.full,.churvoxOptionC .cocPanel.wide{grid-column:1/-1!important}
    #${RECOVERY_ID}{grid-column:1/-1!important;display:grid!important;grid-template-columns:1.25fr repeat(4,minmax(0,1fr))!important;gap:12px!important;margin-bottom:0!important;color:#111815!important}.recoveryHero,.recoveryCard,.recoveryForm{border:1px solid rgba(16,21,19,.08)!important;border-radius:16px!important;background:rgba(255,255,255,.86)!important;box-shadow:0 13px 30px rgba(16,21,19,.06)!important;padding:16px!important;overflow:hidden!important}.recoveryHero{background:radial-gradient(circle at 88% 18%,rgba(239,85,60,.22),transparent 32%),linear-gradient(135deg,#101513,#1f2925 68%,#ef553c)!important;color:#fff!important}.recoveryHero small{display:block;margin-bottom:8px;color:#ffd7c6!important;font-size:10px!important;font-weight:950!important;letter-spacing:.08em!important;text-transform:uppercase!important}.recoveryHero h2{margin:0 0 8px!important;color:#fff!important;font-size:28px!important;line-height:.95!important;font-weight:950!important}.recoveryHero p{margin:0 0 12px!important;color:rgba(255,255,255,.86)!important;font-size:13px!important;font-weight:850!important}.recoveryActions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}.recoveryActions button{border:0!important;border-radius:999px!important;min-height:32px!important;padding:7px 11px!important;background:#fff!important;color:#111815!important;font-size:11px!important;font-weight:950!important}.recoveryCard b,.recoveryForm b{display:block!important;margin-bottom:7px!important;color:#111815!important;font-size:15px!important;font-weight:950!important}.recoveryCard span,.recoveryForm span{display:block!important;color:#44504c!important;font-size:12px!important;font-weight:800!important;line-height:1.35!important}.recoveryForm{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important}.recoveryField{display:grid!important;gap:5px!important}.recoveryField label{color:#44504c!important;font-size:10px!important;font-weight:950!important;text-transform:uppercase!important}.recoveryField input{width:100%!important;min-height:38px!important;border:1px solid rgba(16,21,19,.12)!important;border-radius:12px!important;background:#fff!important;padding:8px 10px!important;color:#111815!important;font-weight:850!important}
    @media(max-width:1100px){#${RECOVERY_ID}{grid-template-columns:1fr 1fr!important}.recoveryHero,.recoveryForm{grid-column:1/-1!important}.recoveryForm{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:720px){.churvoxOptionC .cocBar{grid-template-columns:1fr!important;margin:12px!important}.churvoxOptionC .title h1{font-size:30px!important}.churvoxOptionC .cocNav{margin:0 12px 10px!important}.churvoxOptionC .workspace{margin:0 12px 16px!important}.churvoxOptionC .cocPage,#${RECOVERY_ID},.recoveryForm{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(style);
}

function safe(text) {
  return String(text || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderRecovery(page) {
  const data = PAGE_DATA[page] || PAGE_DATA.aiguide;
  const actions = data.actions.map((action) => `<button type="button" data-churvox-recovery-action="${safe(action)}">${safe(action)}</button>`).join("");
  const cards = data.panels.map(([title, text]) => `<article class="recoveryCard"><b>${safe(title)}</b><span>${safe(text)}</span></article>`).join("");
  const fields = data.fields ? `<section class="recoveryForm"><b>Required form fields</b>${data.fields.map((field) => `<div class="recoveryField"><label>${safe(field)}</label><input readonly value="${safe(field)} ready" /></div>`).join("")}</section>` : "";
  return `<section class="recoveryHero"><small>${safe(data.kicker)}</small><h2>${safe(data.title)}</h2><p>${safe(data.text)}</p><div class="recoveryActions">${actions}</div></section>${cards}${fields}`;
}

function ensureMessagesNav(root) {
  const nav = root.querySelector(".cocNav");
  if (!nav || nav.querySelector('[data-recovery-nav="messages"]')) return;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Messages";
  button.dataset.recoveryNav = "messages";
  button.addEventListener("click", () => {
    window.history.replaceState({}, document.title, "/dashboard#messages");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  const workers = Array.from(nav.querySelectorAll("button")).find((item) => /workers/i.test(item.textContent || ""));
  nav.insertBefore(button, workers || nav.lastChild);
}

function mountRecovery() {
  const root = document.querySelector(".churvoxOptionC");
  const pageRoot = document.querySelector(".churvoxOptionC .workspace .cocPage");
  if (!root || !pageRoot) return;
  installCss();
  ensureMessagesNav(root);
  root.querySelectorAll(".launchNavProof,.launchNavProof span,.xcf10-dock,.xcf10-dock-launch").forEach((el) => {
    putStyle(el, "display", "none");
    putStyle(el, "visibility", "hidden");
    putStyle(el, "width", "0");
    putStyle(el, "height", "0");
    putStyle(el, "overflow", "hidden");
    el.setAttribute("aria-hidden", "true");
  });

  const page = currentPageKey();
  let node = document.getElementById(RECOVERY_ID);
  if (!node) {
    node = document.createElement("section");
    node.id = RECOVERY_ID;
    pageRoot.prepend(node);
  }
  if (node.dataset.page !== page) {
    node.dataset.page = page;
    node.innerHTML = renderRecovery(page);
  }
  root.querySelectorAll(".cocNav button").forEach((button) => {
    const isMessages = button.dataset.recoveryNav === "messages";
    if (isMessages) button.classList.toggle("active", page === "messages");
    putStyle(button, "width", "auto");
    putStyle(button, "height", "auto");
    putStyle(button, "aspect-ratio", "auto");
    putStyle(button, "border-radius", "999px");
  });
}

function handleAction(event) {
  const button = event.target?.closest?.("[data-churvox-recovery-action]");
  if (!button) return;
  const action = (button.dataset.churvoxRecoveryAction || "").toLowerCase();
  if (action.includes("add job")) window.location.href = "/jobs/new";
  else if (action.includes("add client")) window.location.href = "/clients/new";
  else if (action.includes("open command")) window.history.replaceState({}, document.title, "/dashboard#command");
  else if (action.includes("open xero")) window.history.replaceState({}, document.title, "/dashboard#xero");
  else if (action.includes("email support")) window.location.href = "mailto:hello@churvox.com";
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function run() {
  [0, 1, 25, 100, 300, 700, 1300, 2200].forEach((ms) => window.setTimeout(mountRecovery, ms));
  window.requestAnimationFrame?.(mountRecovery);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.addEventListener("DOMContentLoaded", run);
  window.addEventListener("load", run);
  window.addEventListener("resize", run);
  window.addEventListener("hashchange", run);
  window.addEventListener("popstate", run);
  window.addEventListener("click", handleAction, true);
  window.addEventListener("click", run, true);
  window.addEventListener("churvox:fresh-data-updated", run);
  run();
}
