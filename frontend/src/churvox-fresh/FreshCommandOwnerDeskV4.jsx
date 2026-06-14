import React from "react";
import "./freshPreparedCommandDesk.css";
import "../styles/command-right-preview.css";

const KEY = "churvox:fresh-command-inbox:v1";
const API = "/api/command";

const CONFIG = {
  setup: { cat: "missing", title: "Command setup check", approve: "Approve setup fix", fields: ["Area", "Missing step", "What needs entering", "Notes"] },
  invoice: { cat: "money", title: "Invoice ready", approve: "Approve invoice step", fields: ["Customer", "Job", "Amount", "GST", "Due date", "Service line", "Invoice note"] },
  reminder: { cat: "money", title: "Payment reminder", approve: "Approve reminder", fields: ["Customer", "Invoice", "Amount due", "Email", "Phone", "Reminder message"] },
  quote: { cat: "customers", title: "Quote follow-up", approve: "Approve follow-up", fields: ["Customer", "Quote", "Quote value", "Email", "Phone", "Message"] },
  worker: { cat: "jobs", title: "Worker assignment", approve: "Approve assignment", fields: ["Job", "Worker", "Date", "Time window", "Address", "Notify worker", "Worker note"] },
  jobInfo: { cat: "missing", title: "Job info fix", approve: "Approve job fix", fields: ["Job", "Price", "Worker", "Missing details", "Owner fix"] },
  time: { cat: "workers", title: "Worker time", approve: "Approve time", fields: ["Worker", "Job", "Date", "Start", "Finish", "Total", "Adjustment note"] },
  client: { cat: "missing", title: "Client details", approve: "Approve client fix", fields: ["Client", "Phone", "Email", "Address", "Notes"] },
  workerMessage: { cat: "workerMessages", title: "Worker reply", approve: "Approve reply", fields: ["Worker", "Job", "Worker message", "Prepared reply", "Save to job note", "Notify worker"] },
  blocked: { cat: "blocked", title: "Blocked send", approve: "Mark reviewed", fields: ["What failed", "Missing setup/contact", "Next step"] },
};

const CATS = [
  ["money", "Money ready", "Invoices and payment follow-ups"],
  ["jobs", "Jobs needing action", "Workers, price, access and job info"],
  ["workerMessages", "Worker messages", "Questions waiting on owner"],
  ["customers", "Customer follow-ups", "Quotes and replies"],
  ["workers", "Worker time", "Time checks before payroll"],
  ["missing", "Missing info", "Churvox will not guess"],
  ["blocked", "Blocked / failed", "Needs setup or contact fix"],
];

const WIDE = new Set(["Service line", "Invoice note", "Reminder message", "Message", "Worker note", "Owner fix", "Worker message", "Prepared reply", "Save to job note", "Notes", "Missing details", "What needs entering", "Next step"]);
const PLACEHOLDERS = ["", "choose", "review", "upcoming", "completed job", "best available", "job address", "customer from", "client from", "worker name", "missing", "add "];
const today = () => new Date().toISOString().slice(0, 10);
const isPlaceholder = (value) => PLACEHOLDERS.some((word) => String(value || "").toLowerCase().startsWith(word));

function typeOf(slip = {}) {
  const raw = `${slip.type || ""} ${slip.actionType || ""} ${slip.title || ""}`.toLowerCase();
  if (raw.includes("worker") && raw.includes("message")) return "workerMessage";
  if (raw.includes("overdue") || raw.includes("payment")) return "reminder";
  if (raw.includes("quote")) return "quote";
  if (raw.includes("assign") || raw.includes("worker")) return "worker";
  if (raw.includes("time")) return "time";
  if (raw.includes("client")) return "client";
  if (raw.includes("invoice")) return "invoice";
  if (raw.includes("blocked") || raw.includes("failed")) return "blocked";
  if (raw.includes("setup")) return "setup";
  return "jobInfo";
}

function makeDraft(type, slip = {}) {
  const config = CONFIG[type] || CONFIG.setup;
  const values = {
    Area: "Command setup", "Missing step": "Live Command actions", "What needs entering": "Add or scan real clients, jobs, invoices, workers or messages so Churvox can prepare owner actions.", Notes: "This is here so Command never looks empty while setup/data is missing.",
    Customer: "Customer from record", Job: "Upcoming job", Amount: "Review price", GST: "15%", "Due date": today(), "Service line": "Service from completed job", "Invoice note": "Thanks for your business.", Invoice: "Invoice from record", "Amount due": "Review amount", Email: "", Phone: "", "Reminder message": "Friendly reminder prepared from invoice.", Quote: "Open quote", "Quote value": "Review value", Message: "Follow-up message prepared.", Worker: "Best available worker", Date: today(), "Time window": "Next available slot", Address: "Job address", "Notify worker": "App + email + SMS", "Worker note": "Check access, take photos, add completion notes.", Price: "Add price", "Missing details": "Churvox found missing job details.", "Owner fix": "Enter the missing details here.", "Worker message": "Worker asked for help or approval.", "Prepared reply": "Reply prepared for owner approval.", "Save to job note": "Save this decision to job activity.", Start: "Start time", Finish: "Finish time", Total: "Review hours", "Adjustment note": "Check breaks, travel and manual edits.", Client: "Client from record", "What failed": "Message/action failed", "Missing setup/contact": "Email, phone or provider setup", "Next step": "Fix missing detail then retry."
  };
  return { type, title: config.title, approve: config.approve, found: slip.found || slip.title || config.title, why: slip.why || "Owner approval is required before Churvox changes, sends or assigns anything.", fields: config.fields.map((label) => ({ label, value: values[label] || "" })) };
}

function normalise(slip, index = 0) {
  const type = typeOf(slip);
  return { id: slip.id || slip._id || `cmd-${type}-${Date.now()}-${index}`, type, title: slip.title || CONFIG[type]?.title || "Command action", status: slip.status || "open", urgency: slip.urgency || "Medium", draft: slip.draft || makeDraft(type, slip), source: slip.source || slip.info || "Prepared from Churvox records", page: slip.page || "jobs" };
}

function fallbackSlip() { return normalise({ id: "command-setup-review", type: "setup", title: "Command needs live data", urgency: "High", source: "No live Command actions came back from the backend yet" }, 0); }
function readLocal() { try { const value = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(value) ? value.map(normalise).filter((slip) => !["approved", "ignored"].includes(slip.status)) : []; } catch { return []; } }
function saveLocal(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {} }
function missing(draft) { return (draft?.fields || []).filter((field) => isPlaceholder(field.value)).map((field) => field.label); }
function category(slip) { if ((slip.status || "").includes("blocked") || slip.type === "blocked") return "blocked"; if (missing(slip.draft).length) return "missing"; return CONFIG[slip.type]?.cat || "missing"; }
function detail(slip) { const missed = missing(slip.draft); if (missed.length) return `Missing: ${missed.slice(0, 3).join(", ")}`; return (slip.draft.fields || []).slice(0, 3).map((field) => field.value).filter(Boolean).join(" · "); }

async function request(path, body) {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${API}${path}`, { method: body ? "POST" : "GET", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false || data.success === false) throw new Error(data.detail || data.message || data.error || "Command failed");
  return data;
}

function Input({ field, onChange }) {
  if (["Worker", "Notify worker", "Send by"].includes(field.label)) {
    const options = [field.value, "Best available worker", "Owner / myself", "Nearest available worker", "Backup worker", "Email + SMS", "Email only", "SMS only", "Do not notify yet"].filter(Boolean);
    return <select value={field.value} onChange={(event) => onChange(field.label, event.target.value)}>{[...new Set(options)].map((option) => <option key={option}>{option}</option>)}</select>;
  }
  if (WIDE.has(field.label)) return <textarea value={field.value} onChange={(event) => onChange(field.label, event.target.value)} />;
  return <input value={field.value} onChange={(event) => onChange(field.label, event.target.value)} />;
}

function Preview({ slip, onField, onApprove, onSave, onSnooze, onIgnore, onOpenArea }) {
  const missed = missing(slip.draft);
  const isWorker = slip.type === "worker";
  return <section className="freshCommandPreviewPanel"><header><span>{missed.length ? "Needs info first" : "Prepared decision"}</span><h2>{slip.draft.title}</h2><p>{slip.source}</p></header><section className="freshPreparedRecommendation"><span>{isWorker ? "Recommended worker" : "Churvox recommends"}</span><h3>{isWorker ? "Best available worker" : slip.draft.approve}</h3><ul><li>{slip.draft.found}</li><li>{slip.draft.why}</li><li>{missed.length ? "Finish missing fields before approval." : "Ready for owner approval."}</li></ul></section>{missed.length > 0 && <section className="freshPreparedMissingBlock"><b>Missing info before approval</b><p>{missed.join(", ")}</p></section>}<div className="freshPreparedFormGrid freshPreparedPreviewGrid">{(slip.draft.fields || []).map((field) => <label className={`freshPreparedFormField ${WIDE.has(field.label) ? "freshPreparedFormFieldWide" : ""}`} key={field.label}><span>{field.label}</span><Input field={field} onChange={onField} /></label>)}</div><div className="freshSlipActions freshPreviewActions"><button className="freshPrimary" disabled={missed.length > 0} onClick={onApprove}>{missed.length ? "Finish missing info" : slip.draft.approve}</button><button className="freshDark" onClick={onSave}>Save edit</button><button className="freshGhost" onClick={onSnooze}>Snooze</button><button className="freshGhost" onClick={onIgnore}>Ignore</button><button className="freshOrange" onClick={onOpenArea}>Open area only if needed</button></div></section>;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [slips, setSlips] = React.useState(() => readLocal());
  const [selectedId, setSelectedId] = React.useState(null);
  const [message, setMessage] = React.useState("Ready.");
  const open = slips.filter((slip) => ["open", "edited"].includes(slip.status));
  const handled = slips.filter((slip) => !["open", "edited"].includes(slip.status));
  const selected = slips.find((slip) => slip.id === selectedId) || open[0] || null;
  const activeCats = CATS.map(([id, title, sub]) => ({ id, title, sub, items: open.filter((slip) => category(slip) === id) })).filter((cat) => cat.items.length);

  React.useEffect(() => { load(); }, []);

  function setAndSave(next) { setSlips(next); saveLocal(next); }

  async function load() {
    try {
      const data = await request("/slips");
      if (Array.isArray(data.slips) && data.slips.length) { setAndSave(data.slips.map(normalise)); setMessage("Command loaded from live backend."); return; }
    } catch (err) {
      setMessage(err?.message || "Command backend unavailable.");
    }
    const local = readLocal();
    setAndSave(local.length ? local : [fallbackSlip()]);
  }

  async function runChecks() {
    try {
      const data = await request("/slips");
      if (Array.isArray(data.slips) && data.slips.length) { setAndSave(data.slips.map(normalise)); setMessage("Command checks refreshed."); return; }
      const local = readLocal();
      setAndSave(local.length ? local : [fallbackSlip()]);
      setMessage("No live approval slips returned yet. Setup check opened.");
    } catch (err) {
      const local = readLocal();
      setAndSave(local.length ? local : [fallbackSlip()]);
      setMessage(err?.message || "Command backend unavailable. Local slips kept.");
    }
  }

  function patch(id, patchData) { setAndSave(slips.map((slip) => slip.id === id ? { ...slip, ...patchData } : slip)); }
  function editField(label, value) { if (!selected) return; const draft = { ...selected.draft, fields: selected.draft.fields.map((field) => field.label === label ? { ...field, value } : field) }; patch(selected.id, { draft, status: "edited" }); }

  async function approve() {
    if (!selected) return;
    const missed = missing(selected.draft);
    if (missed.length) { setMessage(`Missing info first: ${missed.join(", ")}`); return; }
    try {
      const data = await request(`/slips/${encodeURIComponent(selected.id)}/approve`, { draft: selected.draft, actionType: selected.type });
      patch(selected.id, { status: "approved", result: data.message || "Approved" });
      setMessage(data.message || "Approved and recorded.");
    } catch (err) {
      patch(selected.id, { status: "approved", result: "Approved locally. Backend approval route needs checking." });
      setMessage(err?.message || "Approved locally. Backend approval route needs checking.");
    }
  }

  function saveEdit() { if (!selected) return; patch(selected.id, { status: "edited" }); setMessage("Edit saved on this Command slip."); }
  function snooze() { if (!selected) return; patch(selected.id, { status: "snoozed", snoozedAt: new Date().toISOString() }); setMessage("Slip snoozed."); }
  function ignore() { if (!selected) return; patch(selected.id, { status: "ignored", ignoredAt: new Date().toISOString() }); setMessage("Slip ignored."); }

  return <section className="freshCommandDeskPage freshCommandPreparedPage"><div className="freshCommandDeskHero freshCommandPreparedHero"><div><span>Command approval desk</span><h1>Approve, edit, or decline what Churvox prepared.</h1><p>Smart Hub shows the business overview. Command is only for decisions: approve, save edits, snooze, ignore, or open the exact area.</p></div><div className="freshCommandPreparedSummary"><button onClick={runChecks}>Run Command checks</button><small>{message}</small><b>{open.length} open · {handled.length} handled</b></div></div><section className="freshCommandWorkArea"><section className="freshPreparedTrayGrid">{activeCats.length ? activeCats.map((cat) => <article className={`freshPreparedTray freshPreparedTray-${cat.id}`} key={cat.id}><header><div><h2>{cat.title}</h2><p>{cat.sub}</p></div><strong>{cat.items.length}</strong></header><div className="freshPreparedTrayList">{cat.items.map((slip) => <button className={selected?.id === slip.id ? "is-selected" : ""} key={slip.id} onClick={() => setSelectedId(slip.id)}><b>{slip.title}</b><span className="freshPreparedItemDetail">{detail(slip)}</span><em>{category(slip) === "missing" ? "needs info" : `${slip.urgency} · approval`}</em></button>)}</div></article>) : <article className="freshPreparedTray"><header><div><h2>No approval slips</h2><p>Smart Hub still shows the overview. Command opens when an owner decision is needed.</p></div><strong>0</strong></header></article>}</section>{selected ? <Preview slip={selected} onField={editField} onApprove={approve} onSave={saveEdit} onSnooze={snooze} onIgnore={ignore} onOpenArea={() => onNavigate?.(selected.page || "jobs")} /> : <section className="freshCommandPreviewPanel"><header><span>Decision desk</span><h2>No slip selected</h2><p>Run Command checks or open one of the prepared slips from the left tray.</p></header></section>}</section></section>;
}
