import React from "react";
import "./freshPreparedCommandDesk.css";
import "../styles/command-right-preview.css";

const OLD_KEY = "churvox:fresh-command-inbox:v1";
const KEY = "churvox:fresh-command-inbox:v3";
const API = "/api/command";
const DRAFT_VERSION = "right-panel-v3";

const cfg = {
  invoice: { cat: "money", title: "Invoice ready", approve: "Send invoice", fields: ["Customer", "Job", "Amount", "GST", "Due date", "Service line", "Invoice note"] },
  reminder: { cat: "money", title: "Payment reminder", approve: "Send reminder", fields: ["Customer", "Invoice", "Amount due", "Email", "Phone", "Reminder message"] },
  quote: { cat: "customers", title: "Quote follow-up", approve: "Send follow-up", fields: ["Customer", "Quote", "Quote value", "Email", "Phone", "Message"] },
  worker: { cat: "jobs", title: "Worker assignment", approve: "Assign + notify worker", fields: ["Job", "Worker", "Date", "Time window", "Address", "Notify worker", "Worker note"] },
  jobInfo: { cat: "missing", title: "Job info fix", approve: "Save job fix", fields: ["Job", "Price", "Worker", "Missing details", "Owner fix"] },
  time: { cat: "workers", title: "Worker time", approve: "Approve time", fields: ["Worker", "Job", "Date", "Start", "Finish", "Total", "Adjustment note"] },
  client: { cat: "missing", title: "Client details", approve: "Save client fix", fields: ["Client", "Phone", "Email", "Address", "Notes"] },
  setup: { cat: "missing", title: "Setup fix", approve: "Save setup fix", fields: ["Area", "Missing step", "What needs entering", "Notes"] },
  workerMessage: { cat: "workerMessages", title: "Worker reply", approve: "Send worker reply", fields: ["Worker", "Job", "Worker message", "Prepared reply", "Save to job note", "Notify worker"] },
  blocked: { cat: "blocked", title: "Blocked send", approve: "Mark reviewed", fields: ["What failed", "Missing setup/contact", "Next step"] },
};

const cats = [
  ["money", "Money ready", "Invoices and payment follow-ups"],
  ["jobs", "Jobs needing action", "Worker, price, access and job info"],
  ["workerMessages", "Worker messages", "Questions waiting on owner"],
  ["customers", "Customer follow-ups", "Quotes and replies"],
  ["workers", "Worker time", "Time checks before payroll"],
  ["missing", "Missing info", "Churvox will not guess"],
  ["blocked", "Blocked / failed", "Needs setup or contact fix"],
];

const fakeStarts = ["", "choose", "review", "upcoming", "completed job", "best available", "job address", "customer", "worker name", "missing", "add "];
const wide = new Set(["Service line", "Invoice note", "Reminder message", "Message", "Worker note", "Owner fix", "Worker message", "Prepared reply", "Save to job note", "Notes", "Missing details", "What needs entering", "Next step"]);
const today = () => new Date().toISOString().slice(0, 10);
const fake = (v) => fakeStarts.some((s) => String(v || "").toLowerCase().startsWith(s));
const missingFields = (draft) => (draft?.fields || []).filter((f) => fake(f.value)).map((f) => f.label);

function typeOf(s = {}) {
  const raw = `${s.type || ""} ${s.actionType || ""} ${s.title || ""}`.toLowerCase();
  if (raw.includes("worker") && raw.includes("message")) return "workerMessage";
  if (raw.includes("overdue") || raw.includes("payment")) return "reminder";
  if (raw.includes("quote")) return "quote";
  if (raw.includes("assign") || raw.includes("worker")) return "worker";
  if (raw.includes("time")) return "time";
  if (raw.includes("client")) return "client";
  if (raw.includes("setup")) return "setup";
  if (raw.includes("invoice")) return "invoice";
  if (raw.includes("blocked") || raw.includes("failed")) return "blocked";
  return "jobInfo";
}

function draftFor(type, slip = {}) {
  const c = cfg[type] || cfg.jobInfo;
  const values = {
    Customer: "", Job: "", Amount: "", GST: "15%", "Due date": today(), "Service line": "", "Invoice note": "Thanks for your business.", Invoice: "", "Amount due": "", Email: "", Phone: "", "Reminder message": "", Quote: "", "Quote value": "", Message: "", Worker: "", Date: today(), "Time window": "", Address: "", "Notify worker": "App + email + SMS", "Worker note": "", Price: "", "Missing details": "", "Owner fix": "", "Worker message": "", "Prepared reply": "", "Save to job note": "", Start: "", Finish: "", Total: "", "Adjustment note": "", Client: "", Notes: "", Area: "", "Missing step": "", "What needs entering": "", "What failed": "", "Missing setup/contact": "", "Next step": ""
  };
  return { version: DRAFT_VERSION, type, title: c.title, approve: c.approve, found: slip.found || slip.title || c.title, why: slip.why || "Owner approval required before Churvox changes or sends anything.", fields: c.fields.map((label) => ({ label, value: values[label] || "" })) };
}

function normalise(s, i = 0) {
  const type = typeOf(s);
  const keepDraft = s.draft && s.draft.version === DRAFT_VERSION;
  return { id: s.id || s._id || `cmd-${Date.now()}-${i}`, type, title: s.title || cfg[type]?.title || "Command action", status: s.status || "open", urgency: s.urgency || "Medium", draft: keepDraft ? s.draft : draftFor(type, s), source: s.source || s.info || "Prepared from real Churvox records", page: s.page || "jobs" };
}

function readSlips() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.map(normalise) : []; } catch { return []; } }
function saveSlips(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); localStorage.removeItem(OLD_KEY); } catch {} }
function clearSavedSlips() { try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch {} }
function category(s) { if ((s.status || "").includes("blocked") || s.type === "blocked") return "blocked"; if (missingFields(s.draft).length) return "missing"; return cfg[s.type]?.cat || "missing"; }
function detail(s) { const m = missingFields(s.draft); if (m.length) return `Missing: ${m.slice(0, 3).join(", ")}`; return (s.draft.fields || []).slice(0, 3).map((f) => f.value).filter(Boolean).join(" · "); }

async function request(path, body) {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${API}${path}`, { method: body ? "POST" : "GET", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.message || `Command API failed: ${res.status}`);
  return data;
}

function Input({ field, onChange }) {
  if (["Worker", "Notify worker", "Send by"].includes(field.label)) {
    const list = [field.value, "Best available worker", "Owner / myself", "Nearest available worker", "Backup worker", "Email + SMS", "Email only", "SMS only", "Do not notify yet"].filter(Boolean);
    return <select value={field.value} onChange={(e) => onChange(field.label, e.target.value)}>{[...new Set(list)].map((x) => <option key={x}>{x}</option>)}</select>;
  }
  if (wide.has(field.label)) return <textarea value={field.value} onChange={(e) => onChange(field.label, e.target.value)} />;
  return <input value={field.value} onChange={(e) => onChange(field.label, e.target.value)} />;
}

function Preview({ slip, onField, onApprove, onSave, onSnooze, onIgnore, onOpenArea }) {
  const m = missingFields(slip.draft);
  const isWorker = slip.type === "worker";
  return <section className="freshCommandPreviewPanel">
    <header><span>{m.length ? "Needs info first" : "Prepared decision"}</span><h2>{slip.draft.title}</h2><p>{slip.source}</p></header>
    <section className="freshPreparedRecommendation"><span>{isWorker ? "Recommended worker" : "Churvox recommends"}</span><h3>{isWorker ? (slip.draft.fields?.find((f) => f.label === "Worker")?.value || "Worker required") : slip.draft.approve}</h3><ul><li>{slip.draft.found}</li><li>{slip.draft.why}</li><li>{m.length ? "Finish missing fields before approval." : "Ready for owner approval."}</li></ul></section>
    {m.length > 0 && <section className="freshPreparedMissingBlock"><b>Missing info before approval</b><p>{m.join(", ")}</p></section>}
    <div className="freshPreparedFormGrid freshPreparedPreviewGrid">{(slip.draft.fields || []).map((field) => <label className={`freshPreparedFormField ${wide.has(field.label) ? "freshPreparedFormFieldWide" : ""}`} key={field.label}><span>{field.label}</span><Input field={field} onChange={onField} /></label>)}</div>
    <div className="freshSlipActions freshPreviewActions"><button className="freshPrimary" disabled={m.length > 0} onClick={onApprove}>{m.length ? "Finish missing info" : slip.draft.approve}</button><button className="freshDark" onClick={onSave}>Save edit</button><button className="freshGhost" onClick={onSnooze}>Snooze</button><button className="freshGhost" onClick={onIgnore}>Ignore</button><button className="freshOrange" onClick={onOpenArea}>Open area only if needed</button></div>
  </section>;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [slips, setSlips] = React.useState(readSlips);
  const [selectedId, setSelectedId] = React.useState(null);
  const [message, setMessage] = React.useState("Loading real Command data...");
  const open = slips.filter((s) => ["open", "edited"].includes(s.status));
  const handled = slips.filter((s) => !["open", "edited"].includes(s.status));
  const selected = slips.find((s) => s.id === selectedId) || open[0];
  const activeCats = cats.map(([id, title, sub]) => ({ id, title, sub, items: open.filter((s) => category(s) === id) })).filter((c) => c.items.length);

  React.useEffect(() => { load(); }, []);
  function setAndSave(next) { setSlips(next); saveSlips(next); }
  async function load() {
    try {
      const data = await request("/slips");
      const next = Array.isArray(data.slips) ? data.slips.map(normalise) : [];
      setAndSave(next);
      setMessage(next.length ? "Loaded real Command actions." : "Real scan found no actions needing approval.");
    } catch (err) {
      clearSavedSlips();
      setSlips([]);
      setMessage("Command API is not connected. No fake fallback shown.");
    }
  }
  async function runChecks() {
    try {
      const data = await request("/scan", {});
      const next = Array.isArray(data.slips) ? data.slips.map(normalise) : [];
      setAndSave(next);
      setMessage(next.length ? "Real Command scan updated." : "Real scan found no actions needing approval.");
    } catch (err) {
      clearSavedSlips();
      setSlips([]);
      setMessage("Command API is not connected. Backend deploy/wiring needed.");
    }
  }
  function patch(id, patchData) { setAndSave(slips.map((s) => s.id === id ? { ...s, ...patchData } : s)); }
  function editField(label, value) { if (!selected) return; const draft = { ...selected.draft, version: DRAFT_VERSION, fields: selected.draft.fields.map((f) => f.label === label ? { ...f, value } : f) }; patch(selected.id, { draft, status: "edited" }); }
  async function approve() { if (!selected) return; const m = missingFields(selected.draft); if (m.length) { setMessage(`Missing info first: ${m.join(", ")}`); return; } try { const data = await request("/execute", { slipId: selected.id, actionType: selected.type, draft: selected.draft }); patch(selected.id, { status: "approved", result: data.message || "Done" }); setMessage(data.message || "Approved and executed."); } catch { setMessage("Approve failed. Backend deploy/wiring needed."); } }

  return <section className="freshCommandDeskPage freshCommandPreparedPage"><div className="freshCommandDeskHero freshCommandPreparedHero"><div><span>Command</span><h1>Churvox prepared this for you.</h1><p>Command now shows real backend results only. No fake starter slips.</p></div><div className="freshCommandPreparedSummary"><button onClick={runChecks}>Run Command checks</button><small>{message}</small><b>{open.length} open · {handled.length} handled</b></div></div>{activeCats.length === 0 ? <section className="freshCommandUpToDate"><b>{message.includes("not connected") ? "Command API not connected" : "You’re up to date."}</b><p>{message.includes("not connected") ? "Backend must deploy the Command scanner before real prepared actions can show." : "No jobs, invoices, messages or worker issues need approval right now."}</p></section> : <section className="freshCommandWorkArea"><section className="freshPreparedTrayGrid">{activeCats.map((cat) => <article className={`freshPreparedTray freshPreparedTray-${cat.id}`} key={cat.id}><header><div><h2>{cat.title}</h2><p>{cat.sub}</p></div><strong>{cat.items.length}</strong></header><div className="freshPreparedTrayList">{cat.items.map((slip) => <button className={selected?.id === slip.id ? "is-selected" : ""} key={slip.id} onClick={() => setSelectedId(slip.id)}><b>{slip.title}</b><span className="freshPreparedItemDetail">{detail(slip)}</span><em>{category(slip) === "missing" ? "needs info" : `${slip.urgency} · preview`}</em></button>)}</div></article>)}</section>{selected ? <Preview slip={selected} onField={editField} onApprove={approve} onSave={() => { patch(selected.id, { status: "edited" }); setMessage("Edit saved."); }} onSnooze={() => patch(selected.id, { status: "snoozed" })} onIgnore={() => patch(selected.id, { status: "ignored" })} onOpenArea={() => onNavigate?.(selected.page || "jobs")} /> : <section className="freshCommandPreviewPanel"><header><span>Next action</span><h2>Select an action</h2><p>The prepared form opens here.</p></header></section>}</section>}</section>;
}
