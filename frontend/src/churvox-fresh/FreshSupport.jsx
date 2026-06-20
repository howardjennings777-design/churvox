import React from "react";
import { useApi } from "../hooks/useApi";
import "./freshPayrollCompact.css";

const SUPPORT_EMAIL = "hello@churvox.com";
const COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const helpTopics = [
  { id: 1, title: "Need help setting up?", type: "Setup", status: "Recommended", note: "Get help with business details, GST, branding, team roles, imports and your first invoice." },
  { id: 2, title: "Command approval desk", type: "Command", status: "Core feature", note: "Command holds prepared admin work so the owner can approve, review or ignore it." },
  { id: 3, title: "Worker app help", type: "Team", status: "Needed", note: "Workers can acknowledge jobs, start timers, complete work and add field updates." },
  { id: 4, title: "Billing and plans", type: "Plans", status: "Ready", note: "Start, Crew, Operator and Command plans with a 14-day trial and optional accounting sync add-on." },
  { id: 5, title: "Accounting sync help", type: "Accounting", status: "Owner controlled", note: "Accounting sync is draft/owner-review focused. The owner stays in control before anything is sent or closed out." },
];

const launchChecks = [
  ["Business settings", "Business name, contact email, GST and invoice defaults are set."],
  ["Imports", "CSV rows are checked before they become live records."],
  ["Command", "Payments, payroll reviews, imports, Xero checks and AI actions can be tracked in Command."],
  ["Invoices", "Drafts need owner approval before sending or syncing."],
  ["Payroll", "Payroll stays a review and export workspace."],
  ["Accounting", "Accounting handoff stays owner-controlled."],
];

const trustRules = [
  ["Owner approval", "Churvox prepares the admin. The owner approves important actions."],
  ["Clear setup", "New owners should see the next setup step, not guess where to go."],
  ["Data control", "Imports, exports and support help owners keep their business records understandable."],
  ["Visible support", "Support issues can be copied into Command so they do not disappear."],
  ["Safe accounting", "Accounting sync is treated as a final review step after invoice/payment checks."],
];

function unwrap(result) { return result?.data ?? result; }
function buildMailto(helpType, message) {
  const subject = encodeURIComponent(`Churvox ${helpType || "setup help"}`);
  const body = encodeURIComponent(`${message || "I need help setting up Churvox."}\n\nPage: ${typeof window !== "undefined" ? window.location.href : ""}`);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}
function readCommandInbox() { try { const raw = window.localStorage.getItem(COMMAND_INBOX_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function sendSupportToCommand({ helpType, message, selected }) {
  try {
    const slip = { id: `support-${Date.now()}`, group: "Support", area: "Support", page: "support", title: `Support request: ${helpType || "Setup help"}`, info: selected?.title || "Owner needs help", urgency: helpType?.includes("Bug") ? "Needs attention" : "Support", found: message || "Owner needs Churvox support.", prepared: "Churvox prepared this support issue as an owner review slip.", why: selected?.note || "Support should leave the owner with one clear next step.", owner: `Email ${SUPPORT_EMAIL}, open the right area, or keep this in Command until resolved.`, payload: { help_type: helpType, message, topic: selected?.title, email: SUPPORT_EMAIL }, createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), fromInbox: true };
    window.localStorage.setItem(COMMAND_INBOX_KEY, JSON.stringify([slip, ...readCommandInbox()].slice(0, 30)));
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "support-command" } }));
    return true;
  } catch { return false; }
}

export default function FreshSupport({ onNavigate }) {
  const { post } = useApi();
  const [selectedId, setSelectedId] = React.useState(1);
  const [helpType, setHelpType] = React.useState("Setup help");
  const [message, setMessage] = React.useState("I need help setting up Churvox. The part I am stuck on is: ");
  const [sending, setSending] = React.useState(false);
  const [status, setStatus] = React.useState("");
  const [error, setError] = React.useState("");
  const [fallbackHref, setFallbackHref] = React.useState("");
  const selected = helpTopics.find((item) => item.id === selectedId) || helpTopics[0];

  async function sendSupportRequest() {
    const cleanMessage = message.trim();
    if (!cleanMessage) { setError("Tell us what you need help with first."); return; }
    setSending(true); setError(""); setStatus(""); setFallbackHref("");
    const mailto = buildMailto(helpType, cleanMessage);
    try {
      const response = unwrap(await post("/support/contact", { help_type: helpType, message: cleanMessage, page_url: window.location.href }));
      if (response?.success === false) throw new Error(response?.error || response?.message || "Support message could not send.");
      sendSupportToCommand({ helpType, message: cleanMessage, selected });
      setStatus(response?.message || "Support request sent to Churvox and copied to Command.");
      setMessage("I need help setting up Churvox. The part I am stuck on is: ");
    } catch (err) {
      sendSupportToCommand({ helpType, message: cleanMessage, selected });
      setFallbackHref(mailto);
      setError(err?.message || "Support message could not send automatically. The issue was copied to Command; open the email draft as backup.");
    } finally { setSending(false); }
  }

  function sendIssueToCommand() {
    const ok = sendSupportToCommand({ helpType, message: message.trim() || selected.note, selected });
    setStatus(ok ? "Support issue sent to Command." : "Could not write support issue to Command.");
    if (ok) onNavigate?.("command");
  }

  return <section>
    <header className="freshHero"><span>Churvox fresh · Support</span><h1>Support and trust centre</h1><p>Clear setup help, owner-controlled support, and plain safety guidance for real business owners.</p></header>
    <section className="freshGrid freshPayrollCompactPage">
      <aside className="freshCard"><h2>Help topics</h2><p>Pick the area that is stuck. Churvox should explain the next action, not dump a long manual on the owner.</p>{helpTopics.map((item) => <button type="button" key={item.id} className={`freshItem ${item.status.includes("Needed") ? "need" : ""} ${selected.id === item.id ? "active" : ""}`} style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => { setSelectedId(item.id); setHelpType(`${item.type} help`); if (item.type === "Setup") setMessage("I need help setting up Churvox. The part I am stuck on is: "); }}><b>{item.title}</b><span>{item.type} · {item.status}</span></button>)}</aside>
      <section className="freshCard"><h2>{selected.title}</h2><div className="freshTabs"><span className="active">Guide</span><span>Safety</span><span>Contact</span><span>Command</span></div><label className="freshField"><span>Area</span><input value={selected.type} readOnly /></label><label className="freshField"><span>Status</span><input value={selected.status} readOnly /></label><label className="freshField"><span>Support note</span><textarea value={selected.note} readOnly /></label><div className="freshItem"><b>Owner support rule</b><span>Support should leave the owner with one clear next step.</span></div><div className="freshActions"><button type="button" className="freshPrimary" onClick={() => onNavigate?.("settings")}>Open Settings</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("imports")}>Open Imports</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("command")}>Open Command</button></div></section>
      <aside className="freshCard"><h2>Contact Churvox</h2><p>Send a setup/support request to {SUPPORT_EMAIL}. The email draft fallback is there if the app request cannot send.</p>{status ? <div className="freshItem"><b>Support status</b><span>{status}</span></div> : null}{error ? <div className="freshItem need"><b>Support needs attention</b><span>{error}</span></div> : null}<label className="freshField"><span>Help type</span><select value={helpType} onChange={(event) => setHelpType(event.target.value)}><option>Setup help</option><option>Billing help</option><option>Bug report</option><option>Feature request</option><option>Worker app help</option><option>Payroll review help</option><option>Accounting sync help</option><option>Xero sync help</option><option>MYOB sync help</option></select></label><label className="freshField"><span>Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what is stuck or what you expected to happen." /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={sending} onClick={sendSupportRequest}>{sending ? "Sending…" : "Send support request"}</button><button type="button" className="freshOrange" onClick={sendIssueToCommand}>Send to Command</button><a className="freshGhost" href={fallbackHref || buildMailto(helpType, message)}>Open email draft</a><button type="button" className="freshGhost" onClick={() => onNavigate?.("setupassistant")}>Open AI guide</button></div><div className="freshItem need"><b>Launch note</b><span>Live chat can come later. Start with clean setup/support requests and helpful owner guidance.</span></div></aside>
    </section>
    <section className="freshGrid two" style={{ marginTop: 14 }}><section className="freshCard"><h2>Trust rules</h2>{trustRules.map(([name, detail]) => <div className="freshItem" key={name}><b>{name}</b><span>{detail}</span></div>)}</section><section className="freshCard"><h2>Launch checks</h2>{launchChecks.map(([name, detail]) => <div className="freshItem" key={name}><b>{name}</b><span>{detail}</span></div>)}</section></section>
    <section className="freshGrid two" style={{ marginTop: 14 }}><section className="freshCard"><h2>Owner-controlled limits</h2><div className="freshItem need"><b>Accounting sync</b><span>Draft/review focused, with the owner controlling the handoff.</span></div><div className="freshItem need"><b>Payroll</b><span>Review and export workspace for owner checking.</span></div><div className="freshItem"><b>Support trail</b><span>Support issues can be emailed and copied into Command.</span></div></section><aside className="freshCard"><h2>Useful owner shortcuts</h2><div className="freshActions"><button type="button" className="freshPrimary" onClick={() => onNavigate?.("smart")}>Today</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("imports")}>Imports</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("xero")}>Xero</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("payroll")}>Payroll</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("plans")}>Plans</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("security")}>Security</button></div></aside></section>
  </section>;
}
