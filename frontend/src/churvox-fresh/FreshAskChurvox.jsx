import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";

const examples = [
  "open jobs",
  "add client",
  "new job for Bob tomorrow lawn mowing $65",
  "show unpaid invoices",
  "open Xero",
  "follow up unpaid invoices",
  "open payroll",
  "import clients",
  "export invoices",
];

const quickButtons = ["Open jobs", "Add client", "New job", "Unpaid invoices", "Open Command", "Import CSV", "Open Xero", "Payroll"];

const navRules = [
  { page: "smart", label: "Today", words: ["today", "dashboard", "home", "smart", "hub", "pulse"] },
  { page: "jobs", label: "Jobs", words: ["job", "jobs", "work", "booking", "bookings"] },
  { page: "clients", label: "Clients", words: ["client", "clients", "customer", "customers"] },
  { page: "quotes", label: "Quotes", words: ["quote", "quotes", "estimate", "estimates"] },
  { page: "invoices", label: "Invoices", words: ["invoice", "invoices", "bill", "bills"] },
  { page: "payments", label: "Payments", words: ["payment", "payments", "paid", "unpaid", "overdue", "money", "cash"] },
  { page: "team", label: "Team", words: ["team", "staff", "worker", "workers", "crew"] },
  { page: "workercommand", label: "Worker view", words: ["worker view", "field deck", "worker command", "live workers"] },
  { page: "payroll", label: "Payroll", words: ["payroll", "wages", "pay run", "timesheet", "timesheets"] },
  { page: "command", label: "Command", words: ["command", "approval", "approve", "review desk", "admin desk"] },
  { page: "xero", label: "Xero", words: ["xero", "accounting", "myob", "sync"] },
  { page: "imports", label: "Imports", words: ["import", "csv", "upload clients", "upload jobs"] },
  { page: "exports", label: "Exports", words: ["export", "download csv", "backup"] },
  { page: "plans", label: "Plans", words: ["plan", "plans", "billing", "subscription", "price", "pricing"] },
  { page: "settings", label: "Settings", words: ["settings", "business details", "branding", "gst"] },
  { page: "support", label: "Support", words: ["support", "help", "contact", "ticket"] },
  { page: "reports", label: "Reports", words: ["report", "reports", "numbers"] },
  { page: "dispatch", label: "Dispatch", words: ["calendar", "schedule", "dispatch"] },
  { page: "routes", label: "Routes", words: ["route", "routes", "map"] },
  { page: "photos", label: "Photos", words: ["photo", "photos", "proof"] },
];

function normalise(text) { return String(text || "").toLowerCase().replace(/[^a-z0-9$@.\s-]/g, " ").replace(/\s+/g, " ").trim(); }
function hasAny(text, words) { return words.some((word) => text.includes(word)); }
function startsWithAction(text, actions) { return actions.some((word) => text === word || text.startsWith(`${word} `)); }
function detectNavigation(text) { const lower = normalise(text); const wantsOpen = startsWithAction(lower, ["open", "go", "show", "view", "take me", "find", "see"]); const match = navRules.find((rule) => hasAny(lower, rule.words)); return match ? { ...match, wantsOpen } : null; }

function resultFor({ mode, page, form, action, label, found, prepared, why, urgency = "Medium", button }) {
  return { mode, page, form, action, label, found, prepared, why, urgency, button: button || action };
}

function analyse(rawText) {
  const text = normalise(rawText);
  if (!text) return resultFor({ mode: "idle", page: "smart", action: "Waiting for command", label: "Tell Churvox", found: "Type what you want Churvox to do.", prepared: "Safe commands open areas. Important business work goes to Command for review.", why: "This keeps Churvox fast without letting it make important changes by itself.", urgency: "Low", button: "Try a command" });

  const importantWork = /(send|mark|bulk|all invoices|all clients|all jobs|follow up|chase|remind|overdue reminder|unpaid reminder)/i.test(text);
  if (importantWork) return resultFor({ mode: "command", page: /follow|chase|remind/.test(text) ? "followupwriter" : "command", action: /follow|chase|remind/.test(text) ? "Prepare follow-up" : "Prepare review", label: "Needs approval", found: `You asked: “${rawText}”`, prepared: "Create an owner-review slip so the owner can approve or edit it first.", why: "This could affect customers, money, accounting or records, so Churvox prepares it instead of doing it silently.", urgency: /unpaid|overdue|invoice/.test(text) ? "High" : "Medium", button: "Send to Command" });

  if (/(add|new|create|make)\s+(a\s+)?(client|customer)/i.test(text)) return resultFor({ mode: "openForm", page: "clients", form: "client", action: "Add client", label: "Safe create", found: `You want to add a client: “${rawText}”`, prepared: "Open Clients and show the Add Client form.", why: "Adding a client is safe, but you still review and save the details.", button: "Open Add Client" });
  if (/(add|new|create|make|book)\s+(a\s+)?(job|booking|work)/i.test(text)) return resultFor({ mode: "openForm", page: "jobs", form: "job", action: "Create job", label: "Safe create", found: `You want a job created from: “${rawText}”`, prepared: "Open Jobs and show the New Job form. The original instruction is saved for reference.", why: "The job still needs owner review before it is saved and assigned.", urgency: "High", button: "Open New Job" });
  if (/(add|new|create|make)\s+(a\s+)?(quote|estimate)/i.test(text)) return resultFor({ mode: "prepare", page: "quoteai", action: "Build quote", label: "Prepared action", found: `You want a quote from: “${rawText}”`, prepared: "Open AI Quote Builder so Churvox can structure the quote before you approve it.", why: "Quotes affect price and customer expectations, so Churvox prepares them first.", urgency: "High", button: "Open Quote Builder" });
  if (/(add|new|create|make)\s+(an?\s+)?(invoice|bill)/i.test(text)) return resultFor({ mode: "prepare", page: "invoicecheck", action: "Prepare invoice check", label: "Prepared action", found: `You want invoice help from: “${rawText}”`, prepared: "Open Invoice Checker to find the right job/invoice path first.", why: "Invoices touch money, so Churvox prepares them for owner approval.", urgency: "High", button: "Open Invoice Checker" });

  const nav = detectNavigation(text);
  if (/unpaid|overdue|owed|owing|money/i.test(text)) return resultFor({ mode: "navigate", page: "payments", action: "Show money to check", label: "Safe navigation", found: `You asked about money: “${rawText}”`, prepared: "Open Payments so unpaid and overdue work can be reviewed.", why: "This helps you get to money without hunting through invoices.", urgency: "High", button: "Open Payments" });
  if (/plan my day|what first|route today|today first/i.test(text)) return resultFor({ mode: "prepare", page: "planday", action: "Plan my day", label: "Prepared action", found: `You asked Churvox to organise the day: “${rawText}”`, prepared: "Open Plan My Day with route order and next actions.", why: "Planning changes work priority, so the owner reviews it.", button: "Open Plan My Day" });
  if (nav) return resultFor({ mode: "navigate", page: nav.page, action: `Open ${nav.label}`, label: "Safe navigation", found: `Churvox matched your words to ${nav.label}.`, prepared: `Navigate straight to ${nav.label}.`, why: "This is a safe shortcut.", urgency: "Low", button: `Open ${nav.label}` });

  return resultFor({ mode: "prepare", page: "quickcreateai", action: "Structure request", label: "Prepared action", found: `You typed: “${rawText}”`, prepared: "Open AI Quick Create and turn the rough instruction into a job, quote, task, or review slip.", why: "When Churvox is not fully sure, it prepares and asks the owner to confirm.", button: "Open Quick Create" });
}

function saveCommandSlip(result, text) {
  try {
    const saved = window.localStorage.getItem(COMMAND_INBOX_KEY);
    const current = saved ? JSON.parse(saved) : [];
    const safeCurrent = Array.isArray(current) ? current : [];
    const slip = { id: `tell-churvox-${Date.now()}`, group: "Tell Churvox", title: result.action, info: result.label, urgency: result.urgency, found: result.found, prepared: result.prepared, why: result.why, owner: "Approve, edit, open area, or ignore.", area: result.page || "Tell Churvox", page: result.page || "askchurvox", originalText: text, fromInbox: true, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...safeCurrent].slice(0, 70)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-command" } }));
  } catch {}
}

function openForm(result, text, onNavigate) {
  try { window.localStorage.setItem(ASK_DRAFT_KEY, text); if (result.form === "client") window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true"); if (result.form === "job") window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, at: Date.now() })); } catch {}
  if (result.form === "client") { onNavigate?.("clients"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("churvox:open-client-popup", { detail: { text } })), 80); return; }
  if (result.form === "job") { onNavigate?.("jobs"); window.setTimeout(() => window.dispatchEvent(new CustomEvent("churvox:open-job-popup", { detail: { text } })), 80); return; }
  onNavigate?.(result.page);
}

function runResult(result, text, onNavigate, setLastRun) {
  if (result.mode === "idle") return;
  setLastRun(`${result.action} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
  if (result.mode === "navigate") return onNavigate?.(result.page);
  if (result.mode === "openForm") return openForm(result, text, onNavigate);
  if (result.mode === "command") { saveCommandSlip(result, text); return onNavigate?.("command"); }
  if (result.mode === "prepare") return onNavigate?.(result.page);
}

function sendToCommand(result, text, onNavigate) { saveCommandSlip(result, text); onNavigate?.("command"); }

export default function FreshAskChurvox({ onNavigate }) {
  const [text, setText] = React.useState("open jobs");
  const [lastRun, setLastRun] = React.useState("");
  const result = analyse(text);
  function submit(event) { event?.preventDefault?.(); runResult(result, text, onNavigate, setLastRun); }

  return (
    <section className="freshAskPage tellChurvoxPage">
      <div className="freshAskHero tellHero"><div><span>Tell Churvox</span><h1>Type it. Churvox opens the right thing.</h1><p>Safe commands open pages. Create commands open the right form. Important business work goes to Command for owner approval.</p></div><div className="freshAskStats"><div><b>{result.label}</b><small>mode</small></div><div><b>{result.action}</b><small>detected</small></div><div><b>{result.urgency}</b><small>urgency</small></div><div><b>Approve</b><small>important work</small></div></div></div>
      <form className="tellCommandBox" onSubmit={submit}><label><span>What do you want to do?</span><input value={text} onChange={(event) => setText(event.target.value)} placeholder="open jobs, add client, show unpaid invoices…" autoFocus /></label><button type="submit">{result.button}</button></form>
      <div className="tellQuickButtons">{quickButtons.map((item) => <button type="button" key={item} onClick={() => setText(item)}>{item}</button>)}</div>
      {lastRun ? <section className="freshCard freshItem"><b>Last action</b><span>{lastRun}</span></section> : null}
      <div className="freshAskGrid tellGrid"><article className="freshAskPanel"><header><span>Decision</span><h2>{result.action}</h2><p>{result.why}</p></header><div className="freshAskResult"><section><b>Churvox understood</b><p>{result.found}</p></section><section><b>Churvox will do</b><p>{result.prepared}</p></section><section><b>Safety rule</b><p>{result.mode === "command" ? "This goes to Command because it could affect customers, money, records, payroll or accounting." : result.mode === "navigate" ? "Opening an area is safe and can happen immediately." : "Churvox prepares the area or form. You still review before saving or sending."}</p></section></div><div className="freshAskButtons"><button type="button" onClick={submit}>{result.button}</button><button type="button" onClick={() => sendToCommand(result, text, onNavigate)}>Send to Command</button><button type="button" onClick={() => onNavigate?.(result.page || "smart")}>Open best area</button><button type="button" onClick={() => setText("")}>Clear</button></div></article><article className="freshAskPanel"><header><span>Examples</span><h2>Use normal words</h2><p>This should feel like talking to an office person, not searching menus.</p></header><div className="freshAskExamples tellExamples">{examples.map((example) => <button type="button" key={example} onClick={() => setText(example)}>{example}</button>)}</div><div className="tellRules"><div><b>Open</b><span>“open jobs” goes straight to Jobs.</span></div><div><b>Create</b><span>“add client” opens the right form.</span></div><div><b>Approve</b><span>“follow up unpaid invoices” sends a Command slip.</span></div></div></article></div>
    </section>
  );
}
