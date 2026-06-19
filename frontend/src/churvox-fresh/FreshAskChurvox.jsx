import React from "react";

const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";
const OPEN_CLIENT_MODAL_KEY = "churvox:fresh-open-client-modal:v1";
const OPEN_JOB_MODAL_KEY = "churvox:fresh-open-job-modal:v1";
const ASK_DRAFT_KEY = "churvox:tell-command-draft:v1";

const examples = ["open jobs", "add client", "new job for Bob tomorrow lawn mowing $65", "show unpaid invoices", "open Xero", "follow up unpaid invoices", "open payroll", "import clients", "export invoices"];

function clean(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9$@.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function resultFor(text) {
  const lower = clean(text);
  if (!lower) return { mode: "idle", page: "smart", action: "Waiting for command", label: "Tell Churvox", urgency: "Low", button: "Try a command", found: "Type what you want Churvox to do.", prepared: "Churvox will open the right area or prepare owner review.", why: "This keeps the app quick without making important changes silently." };
  if (lower.includes("follow up") || lower.includes("unpaid reminder") || lower.includes("overdue reminder")) return { mode: "command", page: "command", action: "Prepare follow-up", label: "Needs approval", urgency: "High", button: "Send to Command", found: `You asked: ${text}`, prepared: "A Command approval slip will be prepared.", why: "Customer follow-up should be approved by the owner first." };
  if (lower.includes("add client") || lower.includes("new client") || lower.includes("create client")) return { mode: "clientForm", page: "clients", action: "Add client", label: "Safe create", urgency: "Low", button: "Open Add Client", found: `You want to add a client: ${text}`, prepared: "Open Clients with the add form ready.", why: "You still review and save the details." };
  if (lower.includes("new job") || lower.includes("add job") || lower.includes("create job")) return { mode: "jobForm", page: "jobs", action: "Create job", label: "Safe create", urgency: "High", button: "Open New Job", found: `You want a job from: ${text}`, prepared: "Open Jobs with the new job form ready.", why: "You still review the job before saving or assigning." };
  if (lower.includes("unpaid") || lower.includes("overdue") || lower.includes("payment")) return { mode: "navigate", page: "payments", action: "Open Payments", label: "Safe navigation", urgency: "High", button: "Open Payments", found: `You asked about money: ${text}`, prepared: "Open Payments so unpaid work can be checked.", why: "This gets you to the money area quickly." };
  if (lower.includes("xero") || lower.includes("myob")) return { mode: "navigate", page: "xero", action: "Open Xero", label: "Safe navigation", urgency: "Low", button: "Open Xero", found: "Churvox matched your words to accounting sync.", prepared: "Open the accounting sync page.", why: "Opening an area is safe." };
  if (lower.includes("payroll")) return { mode: "navigate", page: "payroll", action: "Open Payroll", label: "Safe navigation", urgency: "Low", button: "Open Payroll", found: "Churvox matched your words to Payroll.", prepared: "Open Payroll.", why: "Opening an area is safe." };
  if (lower.includes("import") || lower.includes("csv")) return { mode: "navigate", page: "imports", action: "Open Imports", label: "Safe navigation", urgency: "Low", button: "Open Imports", found: "Churvox matched your words to Imports.", prepared: "Open Imports.", why: "Opening an area is safe." };
  if (lower.includes("command") || lower.includes("review") || lower.includes("approve")) return { mode: "navigate", page: "command", action: "Open Command", label: "Safe navigation", urgency: "Low", button: "Open Command", found: "Churvox matched your words to Command.", prepared: "Open Command.", why: "Opening an area is safe." };
  if (lower.includes("job") || lower.includes("jobs")) return { mode: "navigate", page: "jobs", action: "Open Jobs", label: "Safe navigation", urgency: "Low", button: "Open Jobs", found: "Churvox matched your words to Jobs.", prepared: "Navigate straight to Jobs.", why: "This is a safe shortcut." };
  return { mode: "prepare", page: "quickcreateai", action: "Structure request", label: "Prepared action", urgency: "Medium", button: "Open Quick Create", found: `You typed: ${text}`, prepared: "Open Quick Create to structure it first.", why: "When Churvox is not fully sure, it prepares and asks you to confirm." };
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
  try {
    window.localStorage.setItem(ASK_DRAFT_KEY, text);
    if (result.mode === "clientForm") window.localStorage.setItem(OPEN_CLIENT_MODAL_KEY, "true");
    if (result.mode === "jobForm") window.localStorage.setItem(OPEN_JOB_MODAL_KEY, JSON.stringify({ open: true, instruction: text, at: Date.now() }));
  } catch {}
  onNavigate?.(result.page);
  window.setTimeout(() => window.dispatchEvent(new CustomEvent(result.mode === "clientForm" ? "churvox:open-client-popup" : "churvox:open-job-popup", { detail: { text } })), 80);
}

export default function FreshAskChurvox({ onNavigate }) {
  const [text, setText] = React.useState("open jobs");
  const [lastRun, setLastRun] = React.useState("");
  const result = resultFor(text);

  function submit(event) {
    event?.preventDefault?.();
    if (result.mode === "idle") return;
    setLastRun(`${result.action} · ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    if (result.mode === "command") { saveCommandSlip(result, text); onNavigate?.("command"); return; }
    if (result.mode === "clientForm" || result.mode === "jobForm") { openForm(result, text, onNavigate); return; }
    onNavigate?.(result.page);
  }

  function sendToCommand() { saveCommandSlip(result, text); onNavigate?.("command"); }

  return (
    <section className="freshAskPage tellChurvoxPage">
      <form className="tellCommandBox tellCommandBoxTop" onSubmit={submit}>
        <label><span>What do you want to do?</span><input value={text} onChange={(event) => setText(event.target.value)} placeholder="open jobs, add client, show unpaid invoices…" autoFocus /></label>
        <button type="submit">{result.button}</button>
      </form>
      <div className="freshAskHero tellHero"><div><span>Tell Churvox</span><h1>Type it. Churvox opens the right thing.</h1><p>Safe commands open pages. Create commands open the right form. Important business work goes to Command for owner approval.</p></div><div className="freshAskStats"><div><b>{result.label}</b><small>mode</small></div><div><b>{result.action}</b><small>detected</small></div><div><b>{result.urgency}</b><small>urgency</small></div><div><b>Approve</b><small>important work</small></div></div></div>
      {lastRun ? <section className="freshCard freshItem"><b>Last action</b><span>{lastRun}</span></section> : null}
      <div className="freshAskGrid tellGrid"><article className="freshAskPanel"><header><span>Decision</span><h2>{result.action}</h2><p>{result.why}</p></header><div className="freshAskResult"><section><b>Churvox understood</b><p>{result.found}</p></section><section><b>Churvox will do</b><p>{result.prepared}</p></section><section><b>Safety rule</b><p>{result.mode === "command" ? "This goes to Command because it could affect customers, money, records, payroll or accounting." : result.mode === "navigate" ? "Opening an area is safe and can happen immediately." : "Churvox prepares the area or form. You still review before saving or sending."}</p></section></div><div className="freshAskButtons"><button type="button" onClick={submit}>{result.button}</button><button type="button" onClick={sendToCommand}>Send to Command</button><button type="button" onClick={() => onNavigate?.(result.page || "smart")}>Open best area</button><button type="button" onClick={() => setText("")}>Clear</button></div></article><article className="freshAskPanel"><header><span>Examples</span><h2>Use normal words</h2><p>This should feel like talking to an office person, not searching menus.</p></header><div className="freshAskExamples tellExamples">{examples.map((example) => <button type="button" key={example} onClick={() => setText(example)}>{example}</button>)}</div><div className="tellRules"><div><b>Open</b><span>"open jobs" goes straight to Jobs.</span></div><div><b>Create</b><span>"add client" opens the right form.</span></div><div><b>Approve</b><span>"follow up unpaid invoices" sends a Command slip.</span></div></div></article></div>
    </section>
  );
}
