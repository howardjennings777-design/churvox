import React from "react";
import { useApi } from "../hooks/useApi";

const SUPPORT_EMAIL = "hello@churvox.com";

const helpTopics = [
  { id: 1, title: "Need help setting up?", type: "Setup", status: "Recommended", note: "Send what is stuck and Churvox can help with business details, GST, branding, team roles, emails and first invoice setup." },
  { id: 2, title: "Command boxes", type: "Command", status: "Core feature", note: "Command shows decisions: approve invoices, follow up quotes, fix setup and confirm risky jobs." },
  { id: 3, title: "Worker app help", type: "Team", status: "Needed", note: "Workers acknowledge jobs, start timers, complete jobs and upload photos." },
  { id: 4, title: "Billing and plans", type: "Plans", status: "Ready", note: "Start, Crew, Operator and Command plans with 14-day Stripe trial." },
];
const launchChecks = [["Business settings", "Business name, email, GST and invoice terms are set."], ["Command rules", "Invoices, quote follow-ups and risky jobs go to Command."], ["Team roles", "Workers, payroll and admin access are separated."], ["Invoices", "Drafts need owner approval before sending."], ["Payroll", "CSV export only. No tax filing. No bank payout files."]];

function unwrap(result) { return result?.data ?? result; }

function buildMailto(helpType, message) {
  const subject = encodeURIComponent(`Churvox ${helpType || "setup help"}`);
  const body = encodeURIComponent(`${message || "I need help setting up Churvox."}\n\nPage: ${typeof window !== "undefined" ? window.location.href : ""}`);
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
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
      setStatus(response?.message || "Support request sent to Churvox.");
      setMessage("I need help setting up Churvox. The part I am stuck on is: ");
    } catch (err) {
      setFallbackHref(mailto);
      setError(err?.message || "Support message could not send automatically. Open the email draft instead.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section>
      <header className="freshHero"><span>Churvox fresh · Support</span><h1>Need help setting up?</h1><p>Send a simple setup/support request. No live chat yet — just clear help by email so nothing gets missed.</p></header>
      <section className="freshGrid">
        <aside className="freshCard"><h2>Help topics</h2><p>Quick guidance for common owner questions.</p>{helpTopics.map((item) => <button type="button" key={item.id} className={`freshItem ${item.status.includes("Needed") ? "need" : ""} ${selected.id === item.id ? "active" : ""}`} style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => { setSelectedId(item.id); setHelpType(`${item.type} help`); if (item.type === "Setup") setMessage("I need help setting up Churvox. The part I am stuck on is: "); }}><b>{item.title}</b><span>{item.type} · {item.status}</span></button>)}</aside>
        <section className="freshCard"><h2>{selected.title}</h2><div className="freshTabs"><span className="active">Guide</span><span>Steps</span><span>Contact</span><span>History</span></div><label className="freshField"><span>Area</span><input value={selected.type} readOnly /></label><label className="freshField"><span>Status</span><input value={selected.status} readOnly /></label><label className="freshField"><span>Support note</span><textarea value={selected.note} readOnly /></label><div className="freshItem"><b>Owner support rule</b><span>Support should explain the next action, not dump a long manual on the owner.</span></div></section>
        <aside className="freshCard"><h2>Contact Churvox</h2><p>Send a setup/support request to {SUPPORT_EMAIL}. The email draft fallback is there if the app request cannot send.</p>{status ? <div className="freshItem"><b>Support status</b><span>{status}</span></div> : null}{error ? <div className="freshItem need"><b>Support needs attention</b><span>{error}</span></div> : null}<label className="freshField"><span>Help type</span><select value={helpType} onChange={(event) => setHelpType(event.target.value)}><option>Setup help</option><option>Billing help</option><option>Bug report</option><option>Feature request</option><option>Worker app help</option><option>Accounting sync help</option><option>Xero sync help</option><option>MYOB sync help</option></select></label><label className="freshField"><span>Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what is stuck or what you expected to happen." /></label><div className="freshActions"><button className="freshPrimary" type="button" disabled={sending} onClick={sendSupportRequest}>{sending ? "Sending…" : "Send support request"}</button><a className="freshGhost" href={fallbackHref || buildMailto(helpType, message)}>Open email draft</a><button type="button" className="freshOrange" onClick={() => onNavigate?.("setupassistant")}>Open AI guide</button><button type="button" className="freshGhost" onClick={() => onNavigate?.("command")}>Send issue to Command</button></div><div className="freshItem need"><b>Launch note</b><span>Live chat can come later. Start with clean setup/support requests and helpful guides.</span></div></aside>
      </section>
      <section className="freshGrid two" style={{ marginTop: 14 }}><section className="freshCard"><h2>Launch checks</h2>{launchChecks.map(([name, detail]) => <div className="freshItem" key={name}><b>{name}</b><span>{detail}</span></div>)}</section><aside className="freshCard"><h2>Support rules</h2><div className="freshItem"><b>Be direct</b><span>Tell the owner what is wrong and what to do next.</span></div><div className="freshItem"><b>Connect to Command</b><span>Risky support/setup issues should become Command boxes.</span></div><div className="freshItem need"><b>No hidden confusion</b><span>If setup is incomplete, show it clearly.</span></div></aside></section>
    </section>
  );
}
