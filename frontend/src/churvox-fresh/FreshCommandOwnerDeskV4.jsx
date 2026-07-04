import React from "react";
// removed broken css import
// removed broken css import

const KEY = "churvox:fresh-command-inbox:v1";
const API = "/api/command";

const CATS = [
  ["money", "Money", "Invoices, payments and quote money"],
  ["jobs", "Jobs", "Assignment, job gaps and dispatch decisions"],
  ["customers", "Customers", "Quotes, follow-ups and customer replies"],
  ["workers", "Workers", "Worker time, replies and payroll checks"],
  ["missing", "Missing info", "Churvox needs owner input first"],
  ["blocked", "Blocked", "Something failed or setup is missing"],
];

function safe(value, fallback = "Not supplied") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function idOf(item, index = 0) {
  return String(item?.id || item?._id || item?.slip_id || item?.uuid || `cmd-${index}`);
}

function typeOf(item = {}) {
  const raw = `${item.type || ""} ${item.category || ""} ${item.title || ""} ${item.summary || ""}`.toLowerCase();
  if (raw.includes("overdue") || raw.includes("payment") || raw.includes("invoice") || raw.includes("money") || raw.includes("xero")) return "money";
  if (raw.includes("quote") || raw.includes("customer") || raw.includes("client")) return "customers";
  if (raw.includes("worker") || raw.includes("time") || raw.includes("payroll")) return "workers";
  if (raw.includes("assign") || raw.includes("job") || raw.includes("dispatch")) return "jobs";
  if (raw.includes("blocked") || raw.includes("failed")) return "blocked";
  return "missing";
}

function priorityOf(item = {}) {
  const raw = String(item.priority || item.urgency || item.status || "").toLowerCase();
  if (raw.includes("high") || raw.includes("urgent") || raw.includes("overdue") || raw.includes("blocked")) return "High";
  if (raw.includes("low")) return "Low";
  return "Normal";
}

function normalise(item = {}, index = 0) {
  const details = item.details && typeof item.details === "object" ? item.details : {};
  const found = item.found || item.summary || item.ai_found || item.message || details.found || item.title;
  const prepared = item.prepared || item.ai_prepared || item.recommendation || details.prepared || item.primary_action || item.secondary_action;
  const why = item.why || item.reason || details.reason || details.why || "This needs owner review before Churvox changes, sends, assigns or syncs anything.";
  const title = item.title || item.name || prepared || "Command decision";
  return {
    raw: item,
    id: idOf(item, index),
    title: safe(title, "Command decision"),
    category: typeOf(item),
    priority: priorityOf(item),
    status: item.status || "open",
    found: safe(found, "Churvox found something that needs owner review."),
    prepared: safe(prepared, "Churvox prepared the next safe action for you to review."),
    why: safe(why, "Owner approval keeps risky admin under control."),
    source: item.source || item.info || item.prepared_by || "Churvox AI Operator",
    page: item.page || details.page || item.area || "jobs",
    details,
    editableNote: item.editableNote || item.owner_note || details.message || details.note || "",
  };
}

function readLocal() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.map(normalise).filter((slip) => !["approved", "declined", "ignored"].includes(String(slip.status).toLowerCase())) : [];
  } catch {
    return [];
  }
}

function saveLocal(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

async function request(path, body) {
  const token = localStorage.getItem("token") || "";
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false || data.success === false) throw new Error(data.detail || data.message || data.error || "Command failed");
  return data;
}

function detailRows(slip) {
  const rows = Object.entries(slip.details || {}).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "");
  if (rows.length) return rows.slice(0, 8);
  return [
    ["Source", slip.source],
    ["Priority", slip.priority],
    ["Related area", slip.page],
  ];
}

function DecisionPanel({ slip, note, setNote, onApprove, onDecline, onSave, onSnooze, onOpenArea }) {
  if (!slip) {
    return <section className="freshCommandPreviewPanel"><header><span>Decision desk</span><h2>No approval selected</h2><p>Select a Command card on the left, or run Command checks.</p></header></section>;
  }
  return (
    <section className="freshCommandPreviewPanel">
      <header><span>{slip.priority} priority</span><h2>{slip.title}</h2><p>{slip.source}</p></header>
      <section className="freshPreparedRecommendation"><span>AI found</span><h3>{slip.found}</h3><ul><li><b>Prepared:</b> {slip.prepared}</li><li><b>Why:</b> {slip.why}</li></ul></section>
      <div className="freshPreparedFormGrid freshPreparedPreviewGrid">
        {detailRows(slip).map(([key, value]) => <label className="freshPreparedFormField" key={key}><span>{String(key).replaceAll("_", " ")}</span><input readOnly value={String(value)} /></label>)}
        <label className="freshPreparedFormField freshPreparedFormFieldWide"><span>Owner edit / note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Edit the instruction, add a note, or leave blank." /></label>
      </div>
      <div className="freshSlipActions freshPreviewActions">
        <button className="freshPrimary" onClick={onApprove}>Approve</button>
        <button className="freshDark" onClick={onSave}>Save edit</button>
        <button className="freshGhost" onClick={onSnooze}>Snooze</button>
        <button className="freshGhost" onClick={onDecline}>Decline</button>
        <button className="freshOrange" onClick={onOpenArea}>Open related area</button>
      </div>
    </section>
  );
}

export default function FreshCommandOwnerDesk({ onNavigate }) {
  const [slips, setSlips] = React.useState(() => readLocal());
  const [selectedId, setSelectedId] = React.useState(null);
  const [message, setMessage] = React.useState("Ready.");
  const [note, setNote] = React.useState("");
  const open = slips.filter((slip) => ["open", "edited"].includes(String(slip.status).toLowerCase()));
  const handled = slips.filter((slip) => !["open", "edited"].includes(String(slip.status).toLowerCase()));
  const selected = slips.find((slip) => slip.id === selectedId) || open[0] || null;
  const activeCats = CATS.map(([id, title, sub]) => ({ id, title, sub, items: open.filter((slip) => slip.category === id) })).filter((cat) => cat.items.length);

  React.useEffect(() => { load(); }, []);
  React.useEffect(() => { setNote(selected?.editableNote || ""); }, [selected?.id]);

  function setAndSave(next) { setSlips(next); saveLocal(next); }
  function patch(id, patchData) { setAndSave(slips.map((slip) => slip.id === id ? { ...slip, ...patchData } : slip)); }

  async function load() {
    try {
      const data = await request("/slips");
      const rows = Array.isArray(data.slips) ? data.slips : [];
      const normalised = rows.map(normalise).filter((slip) => !["approved", "declined", "ignored"].includes(String(slip.status).toLowerCase()));
      setAndSave(normalised);
      setMessage(normalised.length ? "Command loaded live approval work." : "No approvals needed right now.");
      return;
    } catch (err) {
      const local = readLocal();
      setAndSave(local);
      setMessage(local.length ? "Using saved Command items. Live check failed." : err?.message || "No live Command items available.");
    }
  }

  async function approve() {
    if (!selected) return;
    try {
      const data = await request(`/slips/${encodeURIComponent(selected.id)}/approve`, { owner_note: note, slip: selected.raw || selected });
      patch(selected.id, { status: "approved", editableNote: note, result: data.message || "Approved" });
      setMessage(data.message || "Approved and recorded.");
    } catch (err) {
      patch(selected.id, { status: "approved", editableNote: note, result: "Approved locally" });
      setMessage(err?.message || "Approved locally. Backend did not confirm.");
    }
  }
  function saveEdit() { if (!selected) return; patch(selected.id, { status: "edited", editableNote: note }); setMessage("Edit saved on this Command card."); }
  function snooze() { if (!selected) return; patch(selected.id, { status: "snoozed", editableNote: note, snoozedAt: new Date().toISOString() }); setMessage("Snoozed. It is out of the open list for now."); }
  function decline() { if (!selected) return; patch(selected.id, { status: "declined", editableNote: note, declinedAt: new Date().toISOString() }); setMessage("Declined. Nothing was sent or changed."); }
  function openArea() { if (!selected) return; onNavigate?.(selected.page || "jobs"); }

  return (
    <section className="freshCommandDeskPage freshCommandPreparedPage">
      <div className="freshCommandDeskHero freshCommandPreparedHero"><div><span>Command approval desk</span><h1>Review the decisions Churvox prepared.</h1><p>Command is not the dashboard. It only holds work that needs owner approval before anything is sent, assigned, synced or changed.</p></div><div className="freshCommandPreparedSummary"><button onClick={load}>Run Command checks</button><small>{message}</small><b>{open.length} open · {handled.length} handled</b></div></div>
      <section className="freshCommandWorkArea">
        <section className="freshPreparedTrayGrid">
          {activeCats.length ? activeCats.map((cat) => <article className={`freshPreparedTray freshPreparedTray-${cat.id}`} key={cat.id}><header><div><h2>{cat.title}</h2><p>{cat.sub}</p></div><strong>{cat.items.length}</strong></header><div className="freshPreparedTrayList">{cat.items.map((slip) => <button className={selected?.id === slip.id ? "is-selected" : ""} key={slip.id} onClick={() => setSelectedId(slip.id)}><b>{slip.title}</b><span className="freshPreparedItemDetail">{slip.found}</span><em>{slip.priority} · decision</em></button>)}</div></article>) : <article className="freshPreparedTray"><header><div><h2>No approvals waiting</h2><p>Dashboard still gives the overview. Command opens when a real decision is needed.</p></div><strong>0</strong></header></article>}
        </section>
        <DecisionPanel slip={selected} note={note} setNote={setNote} onApprove={approve} onDecline={decline} onSave={saveEdit} onSnooze={snooze} onOpenArea={openArea} />
      </section>
    </section>
  );
}
