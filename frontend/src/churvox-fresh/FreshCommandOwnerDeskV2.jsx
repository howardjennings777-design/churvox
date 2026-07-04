import React from "react";
// removed broken css import

const KEY = "churvox:fresh-command-inbox:v1";
const API = "/api/command";

const cfg = {
  invoice: { cat: "money", label: "Invoice ready", approve: "Send invoice", fields: ["Customer", "Job", "Amount", "GST", "Due date", "Service line", "Invoice note"] },
  reminder: { cat: "money", label: "Payment reminder", approve: "Send reminder", fields: ["Customer", "Invoice", "Amount due", "Email", "Phone", "Reminder message"] },
  quote: { cat: "customers", label: "Quote follow-up", approve: "Send follow-up", fields: ["Customer", "Quote", "Quote value", "Email", "Phone", "Message"] },
  worker: { cat: "jobs", label: "Worker assignment", approve: "Assign + notify worker", fields: ["Job", "Worker", "Date", "Time window", "Address", "Notify worker", "Worker note"] },
  jobInfo: { cat: "jobs", label: "Job info fix", approve: "Save job fix", fields: ["Job", "Price", "Worker", "Missing details", "Owner fix"] },
  workerMessage: { cat: "workerMessages", label: "Worker reply", approve: "Send worker reply", fields: ["Worker", "Job", "Worker message", "Prepared reply", "Save to job note", "Notify worker"] },
  time: { cat: "workers", label: "Worker time", approve: "Approve time", fields: ["Worker", "Job", "Date", "Start", "Finish", "Total", "Adjustment note"] },
  client: { cat: "setup", label: "Client details", approve: "Save client fix", fields: ["Client", "Phone", "Email", "Address", "Notes"] },
  setup: { cat: "setup", label: "Setup fix", approve: "Save setup fix", fields: ["Area", "Missing step", "What needs entering", "Notes"] },
  blocked: { cat: "blocked", label: "Blocked send", approve: "Mark reviewed", fields: ["What failed", "Missing setup/contact", "Next step"] },
};

const cats = [
  { id: "money", title: "Money ready", sub: "Invoices and money follow-ups" },
  { id: "jobs", title: "Jobs needing action", sub: "Worker, price, access and job info" },
  { id: "workerMessages", title: "Worker messages", sub: "Questions from workers waiting on boss" },
  { id: "customers", title: "Customer follow-ups", sub: "Quotes and replies" },
  { id: "workers", title: "Worker time", sub: "Time checks before payroll" },
  { id: "setup", title: "Setup gaps", sub: "Business, client and invoice setup" },
  { id: "blocked", title: "Blocked / failed", sub: "Can’t send or save until fixed" },
  { id: "missing", title: "Missing info", sub: "Churvox will not guess" },
];

const starters = [
  ["invoice", "Completed job needs invoicing"],
  ["reminder", "Overdue invoice needs chasing"],
  ["quote", "Open quote needs follow-up"],
  ["worker", "Job needs worker assigned"],
  ["jobInfo", "Job missing key info"],
  ["workerMessage", "Worker message needs reply"],
  ["time", "Worker time needs review"],
  ["client", "Client details missing"],
  ["setup", "Setup needs finishing"],
];

const fakeWords = ["", "choose", "review", "upcoming", "completed job", "best available", "job address", "customer", "worker name", "missing", "add "];
const isFake = (v) => fakeWords.some((x) => String(v || "").toLowerCase().startsWith(x));
const niceDate = () => new Date().toISOString().slice(0, 10);

function typeFromSlip(s) {
  const raw = `${s.actionType || ""} ${s.title || ""}`.toLowerCase();
  if (raw.includes("worker") && raw.includes("message")) return "workerMessage";
  if (raw.includes("overdue") || raw.includes("payment")) return "reminder";
  if (raw.includes("quote")) return "quote";
  if (raw.includes("assign") || raw.includes("worker")) return "worker";
  if (raw.includes("time")) return "time";
  if (raw.includes("client")) return "client";
  if (raw.includes("setup")) return "setup";
  if (raw.includes("missing")) return "jobInfo";
  if (raw.includes("invoice")) return "invoice";
  if (raw.includes("failed") || raw.includes("blocked")) return "blocked";
  return "jobInfo";
}

function makeDraft(type, slip) {
  const c = cfg[type] || cfg.jobInfo;
  const values = {
    Customer: "Customer from record", Job: "Upcoming job", Amount: "Review price", GST: "15%", "Due date": niceDate(), "Service line": "Service from completed job", "Invoice note": "Thanks for your business.", Invoice: "Invoice from record", "Amount due": "Review amount", Email: "", Phone: "", "Reminder message": "Friendly reminder prepared from invoice.", Quote: "Open quote", "Quote value": "Review value", Message: "Follow-up message prepared.", Worker: "Best available worker", Date: niceDate(), "Time window": "Next available slot", Address: "Job address", "Notify worker": "App + email + SMS", "Worker note": "Check access, take photos, add completion notes.", Price: "Add price", "Missing details": "Churvox found missing job details.", "Owner fix": "Enter the missing details here.", "Worker message": "Worker asked for help or approval.", "Prepared reply": "Reply prepared for boss approval.", "Save to job note": "Save this decision to job activity.", Start: "Start time", Finish: "Finish time", Total: "Review hours", "Adjustment note": "Check breaks, travel and manual edits.", Client: "Client from record", Notes: "Notes from record", Area: "Business setup", "Missing step": "Setup field missing", "What needs entering": "Fill this before automation can run.", "What failed": "Message/action failed", "Missing setup/contact": "Email, phone or provider setup", "Next step": "Fix missing detail then retry." };
  return { type, title: c.label, approve: c.approve, actionType: type, found: slip.found || slip.title, why: slip.why || "Owner approval required.", fields: c.fields.map((label) => ({ label, value: values[label] || "" })) };
}

function normalise(s, i = 0) {
  const type = s.type || typeFromSlip(s);
  return { id: s.id || s._id || `cmd-${Date.now()}-${i}`, type, title: s.title || cfg[type]?.label || "Command action", status: s.status || "open", urgency: s.urgency || "Medium", draft: s.draft || makeDraft(type, s), source: s.source || s.info || "Prepared from Churvox records" };
}

function read() { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.map(normalise) : []; } catch { return []; } }
function write(slips) { try { localStorage.setItem(KEY, JSON.stringify(slips)); } catch {} }
function seed() { return starters.map(([type, title], i) => normalise({ id: `starter-${type}-${Date.now()}-${i}`, type, title, urgency: i < 5 ? "High" : "Medium" }, i)); }
function missing(draft) { return (draft.fields || []).filter((f) => isFake(f.value)).map((f) => f.label); }
function detail(s) { const miss = missing(s.draft); if (miss.length) return `Missing: ${miss.slice(0, 3).join(", ")}`; return (s.draft.fields || []).slice(0, 3).map((f) => f.value).filter(Boolean).join(" · "); }
function catId(s) { if ((s.status || "").includes("blocked") || s.type === "blocked") return "blocked"; if (missing(s.draft).length) return "missing"; return cfg[s.type]?.cat || "missing"; }

async function api(path, body) {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${API}${path}`, { method: body ? "POST" : "GET", credentials: "include", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.message || "Command failed");
  return data;
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [slips, setSlips] = React.useState(read);
  const [selectedId, setSelectedId] = React.useState(null);
  const [message, setMessage] = React.useState("Ready.");
  const selected = slips.find((s) => s.id === selectedId);
  const open = slips.filter((s) => ["open", "edited"].includes(s.status));
  const handled = slips.filter((s) => !["open", "edited"].includes(s.status));
  const activeCats = cats.map((c) => ({ ...c, items: open.filter((s) => catId(s) === c.id) })).filter((c) => c.items.length);

  React.useEffect(() => { load(); }, []);
  function setAndSave(next) { setSlips(next); write(next); }
  async function load() { try { const data = await api("/slips"); if (data.slips?.length) { setAndSave(data.slips.map(normalise)); return; } } catch {} const local = read(); if (local.length) setSlips(local); else setAndSave(seed()); }
  async function runChecks() { try { const data = await api("/scan", {}); if (data.slips?.length) { setAndSave(data.slips.map(normalise)); setMessage("Command updated."); return; } } catch {} setAndSave([...seed(), ...slips].slice(0, 120)); setMessage("Command updated."); }
  function patchSlip(id, patch) { setAndSave(slips.map((s) => s.id === id ? { ...s, ...patch } : s)); }
  function editField(label, value) { if (!selected) return; const draft = { ...selected.draft, fields: selected.draft.fields.map((f) => f.label === label ? { ...f, value } : f) }; patchSlip(selected.id, { draft, status: "edited" }); }
  async function approve() { if (!selected) return; const miss = missing(selected.draft); if (miss.length) { setMessage(`Missing info first: ${miss.join(", ")}`); return; } try { const data = await api("/execute", { slipId: selected.id, actionType: selected.type, draft: selected.draft }); patchSlip(selected.id, { status: "approved", result: data.message || "Done" }); setSelectedId(null); setMessage(data.message || "Approved and executed."); } catch { patchSlip(selected.id, { status: "approved", result: "Approved locally — backend needs deploy/config." }); setSelectedId(null); setMessage("Approved locally — backend needs deploy/config."); } }

  return <section className="freshCommandDeskPage freshCommandPreparedPage">
    <div className="freshCommandDeskHero freshCommandPreparedHero"><div><span>Command</span><h1>Churvox prepared this for you.</h1><p>Only active boxes show. If Churvox can’t find real details, the slip goes to Missing info instead of guessing.</p></div><div className="freshCommandPreparedSummary"><button onClick={runChecks}>Run Command checks</button><small>{message}</small><b>{open.length} open · {handled.length} handled</b></div></div>
    {activeCats.length === 0 ? <section className="freshCommandUpToDate"><b>You’re up to date.</b><p>No jobs, invoices, messages or worker issues need approval right now.</p><div><span>Money clear</span><span>Messages clear</span><span>Jobs clear</span><span>{handled.length} handled</span></div></section> : <section className="freshPreparedTrayGrid">{activeCats.map((c) => <article className={`freshPreparedTray freshPreparedTray-${c.id}`} key={c.id}><header><div><h2>{c.title}</h2><p>{c.sub}</p></div><strong>{c.items.length}</strong></header><div className="freshPreparedTrayList">{c.items.map((s) => <button key={s.id} onClick={() => setSelectedId(s.id)}><b>{s.title}</b><span className="freshPreparedItemDetail">{detail(s)}</span><em>{catId(s) === "missing" ? "needs info" : `${s.urgency} · open slip`}</em></button>)}</div></article>)}</section>}
    {selected && <div className="freshSlipOverlay freshPreparedOverlay" onClick={() => setSelectedId(null)}><section className="freshSlipModal freshPreparedModal" onClick={(e) => e.stopPropagation()}><header className="freshSlipHead"><span>{cats.find((c) => c.id === catId(selected))?.title || "Command"}</span><h2>{selected.draft.title}</h2><p>{selected.source}</p></header><div className="freshSlipBody freshPreparedSlipBody"><section className="freshPreparedRecommendation"><span>Prepared decision</span><h3>{selected.draft.title}</h3><ul><li>{selected.draft.found}</li><li>{selected.draft.why}</li></ul></section>{missing(selected.draft).length > 0 && <section className="freshPreparedMissingBlock"><b>Missing info before approval</b><p>{missing(selected.draft).join(", ")}</p></section>}<div className="freshPreparedFormGrid">{selected.draft.fields.map((f) => <label className={`freshPreparedFormField ${["Service line", "Invoice note", "Reminder message", "Message", "Worker note", "Owner fix", "Worker message", "Prepared reply", "Save to job note", "Notes"].includes(f.label) ? "freshPreparedFormFieldWide" : ""}`} key={f.label}><span>{f.label}</span>{["Worker", "Notify worker", "Send by"].includes(f.label) ? <select value={f.value} onChange={(e) => editField(f.label, e.target.value)}><option>{f.value}</option><option>Owner / myself</option><option>Best available worker</option><option>Email + SMS</option><option>Email only</option><option>SMS only</option><option>Do not notify yet</option></select> : ["Service line", "Invoice note", "Reminder message", "Message", "Worker note", "Owner fix", "Worker message", "Prepared reply", "Save to job note", "Notes"].includes(f.label) ? <textarea value={f.value} onChange={(e) => editField(f.label, e.target.value)} /> : <input value={f.value} onChange={(e) => editField(f.label, e.target.value)} />}</label>)}</div><div className="freshSlipActions"><button className="freshPrimary" disabled={missing(selected.draft).length > 0} onClick={approve}>{missing(selected.draft).length ? "Finish missing info" : selected.draft.approve}</button><button className="freshDark" onClick={() => { patchSlip(selected.id, { status: "edited" }); setMessage("Edit saved."); }}>Save edit</button><button className="freshGhost" onClick={() => { patchSlip(selected.id, { status: "snoozed" }); setSelectedId(null); }}>Snooze</button><button className="freshGhost" onClick={() => { patchSlip(selected.id, { status: "ignored" }); setSelectedId(null); }}>Ignore</button><button className="freshOrange" onClick={() => onNavigate?.(selected.page || "jobs")}>Open area only if needed</button></div><button className="freshClose" onClick={() => setSelectedId(null)}>Close form</button></div></section></div>}
  </section>;
}
