import React from "react";
import { useApi } from "../hooks/useApi";

const REVIEW_KEY = "churvox:review-inbox:v1";
const OLD_REVIEW_KEY = "churvox:fresh-command-inbox:v1";
const LABEL = { client: "Client", job: "Job", quote: "Quote", invoice: "Invoice", person: "Person / worker" };
const PAGE = { client: "clients", job: "jobs", quote: "quotes", invoice: "invoices", person: "team" };
const EXAMPLES = {
  job: "bob 16 taita drive $60 repeat 23/07/09",
  move: "move bob to next week",
  price: "change bob to $70",
  note: "add note to bob: gate code is 1234",
  complete: "mark bob complete",
  invoice: "invoice sarah hedge trim $120 due friday",
  money: "show unpaid invoices and chase anything overdue",
};

function cleanText(v) {
  return String(v || "")
    .replace(/\bdrve\b|\bdrv\b/gi, "drive")
    .replace(/\bstrt\b|\bstret\b/gi, "street")
    .replace(/\bwrker\b/gi, "worker")
    .replace(/\bqoute\b/gi, "quote")
    .replace(/\binvocie\b|\binvoce\b/gi, "invoice")
    .replace(/\s+/g, " ")
    .trim();
}
function pad(v) { return String(v).padStart(2, "0"); }
function title(v) { return String(v || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function money(v) { const n = Number(v || 0); return Number.isFinite(n) && n > 0 ? `$${n.toFixed(n % 1 ? 2 : 0)}` : "Price needed"; }
function priceOf(t) { const m = String(t || "").match(/\$\s*(\d+(?:\.\d{1,2})?)/); return m ? Number(m[1]) : 0; }
function emailOf(t) { return String(t || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ""; }
function phoneOf(t) { return String(t || "").match(/(?:\+?64|0)\s?[\d\s().-]{7,14}\d/)?.[0]?.trim() || ""; }
function addressOf(t) { const m = String(t || "").match(/\b\d{1,5}\s+[A-Za-z0-9'. -]+?\b(?:street|road|avenue|drive|lane|place|crescent|terrace|court|way|highway)\b/i); return m ? title(m[0]) : ""; }
function serviceOf(t) { const low = String(t || "").toLowerCase(); if (low.includes("hedge")) return ["Hedge trimming", "garden_maintenance"]; if (low.includes("clean")) return ["Cleaning", "cleaning"]; if (low.includes("lawn") || low.includes("mow")) return ["Lawn mowing", "lawn_mowing"]; return ["General service", "other"]; }
function repeatOf(t) { const low = String(t || "").toLowerCase(); if (low.includes("fortnight")) return "fortnightly"; if (low.includes("weekly")) return "weekly"; if (low.includes("monthly")) return "monthly"; if (low.includes("repeat")) return "custom"; return "one-off"; }
function noteOf(t) { const m = String(t || "").match(/:\s*(.+)$/) || String(t || "").match(/notes?\s+(?:to|for)\s+[^,]+,?\s*(.+)$/i); return m?.[1]?.trim() || String(t || "").trim(); }
function areaOf(t) { const low = String(t || "").toLowerCase(); if (low.includes("taita")) return "Taita"; if (low.includes("naenae")) return "Naenae"; if (low.includes("upper hutt")) return "Upper Hutt"; if (low.includes("lower hutt")) return "Lower Hutt"; return "Wellington"; }
function isComplete(t) { return /\b(mark|set|make)?\s*\w*\s*(complete|completed|done|finished)\b|\bcomplete\s+\w+/i.test(String(t || "")); }
function intentOf(t) {
  const low = String(t || "").toLowerCase();
  if (isComplete(low)) return "complete";
  if (/\b(move|reschedule|shift|postpone|push|next week|change date)\b/.test(low)) return "reschedule";
  if (/\b(unpaid|overdue|what money|show|find|search|list)\b/.test(low)) return low.includes("unpaid") || low.includes("overdue") ? "money_review" : "find";
  if (/\b(tell|message|sms|text|send)\b/.test(low)) return "message";
  if (/\b(change|update|edit|price to|add note|note to|notes? for)\b/.test(low)) return "update";
  return "create";
}
function kindOf(text, intent) {
  const low = String(text || "").toLowerCase();
  if (intent !== "create") return low.includes("invoice") || low.includes("unpaid") || low.includes("overdue") ? "invoice" : low.includes("quote") ? "quote" : "job";
  if (low.includes("invoice") || low.includes("bill")) return "invoice";
  if (low.includes("quote") || low.includes("estimate")) return "quote";
  if (low.includes("worker") || low.includes("staff") || low.includes("employee")) return "person";
  if (low.includes("client") || low.includes("customer")) return "client";
  return "job";
}
function nameOf(text, fallback) {
  let s = String(text || "").replace(addressOf(text), " ").replace(/\$\s*\d+(?:\.\d+)?/g, " ").replace(/\b\d{1,2}[/.\-]\d{1,2}(?:[/.\-]\d{1,4})?\b/g, " ");
  const stop = new Set("add create make new please client customer person worker staff team job quote invoice bill for at to from the a an address phone mobile email price charge amount total due pay rate mow mowing lawn lawns hedge trim clean today tomorrow next week move reschedule shift show find search unpaid overdue chase tell message sms text send change update edit note notes mark complete completed done finished repeat custom".split(" "));
  const words = s.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.filter((w) => !stop.has(w.toLowerCase())).slice(0, 2).map(title).join(" ") || fallback;
}
function scheduleOf(text) {
  const short = String(text || "").match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{1,4}))?\b/);
  let date = null, label = "Date needed", hour = 9;
  const now = new Date();
  if (short) { const d = Number(short[1]), m = Number(short[2]), third = short[3] ? Number(short[3]) : 9; hour = third <= 23 ? third : 9; date = new Date(now.getFullYear(), m - 1, d, hour, 0); label = `${pad(d)}/${pad(m)} · ${pad(hour)}:00`; }
  const low = String(text || "").toLowerCase();
  if (!date && low.includes("today")) { date = new Date(); label = "Today · 9:00 AM"; }
  if (!date && low.includes("tomorrow")) { date = new Date(); date.setDate(date.getDate() + 1); label = "Tomorrow · 9:00 AM"; }
  if (!date && low.includes("next week")) { date = new Date(); date.setDate(date.getDate() + 7); label = "Next week · 9:00 AM"; }
  if (!date) return { human: label, input: "", time: "" };
  date.setHours(hour, 0, 0, 0);
  return { human: label, input: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`, time: `${pad(date.getHours())}:00` };
}
function actionTitle(intent, kind) { return intent === "complete" ? "Complete job" : intent === "reschedule" ? "Reschedule job" : intent === "update" ? "Update job" : intent === "money_review" ? "Review money" : intent === "find" ? "Find records" : intent === "message" ? "Prepare message" : `Create ${LABEL[kind] || "record"}`; }
function normalise(raw, text) {
  const cleanedText = cleanText(text);
  const localIntent = intentOf(cleanedText);
  const intent = ["complete", "reschedule", "update"].includes(localIntent) ? localIntent : (raw?.intent || localIntent);
  const kind = raw?.kind && raw.kind !== "auto" ? raw.kind : kindOf(cleanedText, intent);
  const [service, jobType] = serviceOf(cleanedText);
  const amount = Number(raw?.amount || raw?.price || priceOf(cleanedText) || 0);
  const clientName = raw?.clientName || raw?.client_name || raw?.customer_name || nameOf(cleanedText, kind === "person" ? "New person" : "New customer");
  const personName = raw?.personName || raw?.person_name || raw?.name || nameOf(cleanedText, "New person");
  const schedule = raw?.schedule?.input ? raw.schedule : scheduleOf(cleanedText);
  const parsed = { intent, kind, label: LABEL[kind] || "Action", actionTitle: actionTitle(intent, kind), clientName, personName, service: raw?.service || raw?.description || service, jobType: raw?.jobType || raw?.job_type || jobType, address: raw?.address || raw?.site_address || addressOf(cleanedText), area: raw?.area || raw?.region || areaOf(cleanedText), email: raw?.email || emailOf(cleanedText), phone: raw?.phone || phoneOf(cleanedText), amount, priceText: money(amount), schedule, repeat: raw?.repeat || repeatOf(cleanedText), role: raw?.role || "worker", roleText: raw?.roleText || "Worker", payRate: Number(raw?.payRate || 0), payRateText: raw?.payRate ? `$${raw.payRate}/hr` : "Not set", gst: raw?.gst || (kind === "invoice" ? "GST included" : "Needs check"), dueDate: raw?.dueDate || raw?.due_date || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), title: raw?.title || `${service} for ${clientName}`, notes: raw?.notes || cleanedText, updateNote: raw?.updateNote || noteOf(cleanedText), originalText: text, cleanedText, targetPage: PAGE[kind] || "jobs" };
  parsed.missing = requiredMissing(parsed);
  return parsed;
}
function requiredMissing(p) {
  if (p.intent !== "create") return [];
  const m = [];
  if (p.kind === "job") { if (!p.clientName) m.push("client name"); if (!p.address) m.push("job address"); if (!p.schedule?.input) m.push("date"); }
  if (p.kind === "quote") { if (!p.clientName) m.push("client name"); if (!p.address) m.push("site address"); if (!p.amount) m.push("quote price"); }
  if (p.kind === "invoice") { if (!p.clientName) m.push("client name"); if (!p.amount) m.push("invoice amount"); }
  if (p.kind === "person") { if (!p.personName) m.push("person name"); if (!p.email) m.push("email for invite"); }
  return m;
}
function canCommit(p, live) { return Boolean(live?.bestMatch && live?.ambiguity === "none" && (p.intent === "complete" || (p.intent === "reschedule" && p.schedule?.input) || (p.intent === "update" && (p.amount > 0 || /note/i.test(p.cleanedText))))); }
function changeText(p) { return p.intent === "complete" ? "Mark job completed" : p.intent === "reschedule" ? (p.schedule?.human || "Date needed") : p.amount > 0 ? `Set price to ${p.priceText}` : p.updateNote || p.notes; }
function detailsFor(p, live) {
  if (p.intent !== "create") return [["Action", p.actionTitle], ["Live match", live?.bestMatch ? `${live.bestMatch.label} · ${live.bestMatch.summary || live.bestMatch.status || "matched"}` : "Needs matching"], [p.intent === "reschedule" ? "New date" : "Change", changeText(p)], ["Confidence", live?.ambiguity === "none" ? "High" : live?.ambiguity === "multiple_matches" ? "Needs choice" : "Needs review"], ["Status", canCommit(p, live) ? "Ready to approve" : "Save to Review"]];
  if (p.kind === "person") return [["Person", p.personName], ["Role", p.roleText], ["Email", p.email || "Needed"], ["Phone", p.phone || "Optional"]];
  if (p.kind === "invoice") return [["Client", p.clientName], ["Line", p.service], ["Amount", p.priceText], ["Status", "Draft only"]];
  if (p.kind === "quote") return [["Client", p.clientName], ["Scope", p.service], ["Address", p.address || "Needed"], ["Price", p.priceText]];
  return [["Client", p.clientName], ["Job", p.service], ["Address", p.address || "Needed"], ["Schedule", p.schedule.human], ["Price", p.priceText], ["Repeat", p.repeat]];
}
function createPayload(p) {
  if (p.kind === "invoice") return { endpoints: ["/invoices"], success: "Draft invoice created", payload: { customer_name: p.clientName, client_name: p.clientName, description: p.service, notes: p.notes, status: "draft", amount: p.amount, subtotal: p.amount, total: p.amount, due_date: p.dueDate, line_items: [{ description: p.service, quantity: 1, unit_price: p.amount, amount: p.amount }] } };
  if (p.kind === "quote") return { endpoints: ["/quotes"], success: "Draft quote created", payload: { customer_name: p.clientName, client_name: p.clientName, address: p.address, site_address: p.address, job_description: p.service, price: p.amount, amount: p.amount, total: p.amount, status: "draft", notes: p.notes } };
  if (p.kind === "person") return { endpoints: ["/team/workers", "/team", "/workers"], success: "Person added", payload: { name: p.personName, email: p.email, phone: p.phone || null, role: p.role || "worker", team_role: p.role || "worker", notes: p.notes } };
  if (p.kind === "client") return { endpoints: ["/clients"], success: "Client created", payload: { name: p.clientName, email: p.email || null, phone: p.phone || null, address: p.address || null, notes: p.notes || null } };
  return { endpoints: ["/jobs"], success: "Job created", payload: { title: p.title, job_name: p.title, job_type: p.jobType, client_name: p.clientName, customer_name: p.clientName, address: p.address, site_address: p.address, scheduled_date: p.schedule.input, estimated_duration: 60, region: p.area, notes: p.notes, status: "assigned", pricing_type: "fixed", price: p.amount, is_recurring: p.repeat !== "one-off", recurring_frequency: p.repeat !== "one-off" ? p.repeat : null, recurrence_pattern: p.repeat !== "one-off" ? p.repeat : null } };
}
async function postFirst(post, endpoints, payload) { for (const ep of endpoints) { const res = await post(ep, payload); if (res?.success) return res; } return { success: false, error: "Create failed" }; }

function FieldEditor({ p, patchDraft }) {
  const fields = p.intent === "complete" ? ["clientName", "notes"] : p.intent !== "create" ? ["clientName", "scheduleInput", "amount", "notes"] : p.kind === "person" ? ["personName", "email", "phone", "notes"] : ["clientName", "service", "address", "scheduleInput", "amount", "repeat", "email", "phone", "notes"];
  const value = (k) => k === "scheduleInput" ? p.schedule?.input || "" : p[k] ?? "";
  return <div className="freshQuickAiEdit"><b>Fix details here</b><div>{fields.map((k) => <label key={k} className={k === "notes" ? "wide" : ""}><span>{k === "scheduleInput" ? "Date + time" : k}</span>{k === "notes" ? <textarea value={value(k)} onChange={(e) => patchDraft(k, e.target.value)} /> : k === "repeat" ? <select value={value(k)} onChange={(e) => patchDraft(k, e.target.value)}><option value="one-off">One-off</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select> : <input type={k === "amount" ? "number" : k === "scheduleInput" ? "datetime-local" : "text"} value={value(k)} onChange={(e) => patchDraft(k, e.target.value)} />}</label>)}</div></div>;
}
function ApprovalModal({ p, rawText, live, saving, analysing, patchDraft, onClose, onApprove, onReview }) {
  if (!p) return null;
  const ready = p.intent === "create" || canCommit(p, live);
  return <div className="freshQuickAiModalShade" role="dialog" aria-modal="true"><div className="freshQuickAiModal"><button className="freshQuickAiModalClose" type="button" onClick={onClose}>×</button><header><span>Churvox understood this</span><h2>{p.actionTitle}</h2><p>{ready ? "Check it, then approve. Nothing happens before approval." : "Churvox needs review before making a change."}</p></header><div className="freshQuickAiModalGrid"><section className="freshQuickAiResult modalCards">{detailsFor(p, live).map(([a, b]) => <section key={a} className={String(b).toLowerCase().includes("need") ? "need" : ""}><b>{a}</b><p>{b}</p></section>)}</section><section className="freshQuickAiPrepared modalExplain"><b>You typed</b><p>{rawText}</p><b>Churvox cleaned</b><p>{p.cleanedText}</p><b>Safe rule</b><p>{p.intent === "create" ? "Draft/record only after approval." : "Live records update only after approval."}</p></section></div>{p.intent !== "create" ? <div className={canCommit(p, live) ? "freshQuickAiStatus ok" : "freshQuickAiStatus need"}><b>{live?.previewTitle || "Live match"}</b><span>{(live?.previewLines || []).join(" ") || (live?.bestMatch ? `Found ${live.bestMatch.label}` : "No confident match yet.")}</span></div> : null}<FieldEditor p={p} patchDraft={patchDraft} />{p.missing.length ? <div className="freshQuickAiMissing"><b>Required before approve</b><span>{p.missing.join(", ")}</span></div> : null}<div className="freshQuickAiModalActions"><button type="button" onClick={onApprove} disabled={saving || analysing || p.missing.length > 0 || (p.intent !== "create" && !canCommit(p, live))}>{saving ? "Working…" : p.intent === "create" ? `Approve + create ${p.label}` : "Approve change"}</button><button type="button" onClick={onReview}>Save to Review</button><button type="button" onClick={onClose}>Cancel</button></div></div></div>;
}

export default function FreshAiQuickCreateBrain({ onNavigate }) {
  const { post, patch } = useApi();
  const [text, setText] = React.useState(EXAMPLES.job);
  const [draft, setDraft] = React.useState(null);
  const [live, setLive] = React.useState(null);
  const [aiInfo, setAiInfo] = React.useState({ provider: "local", ai_enabled: false });
  const [status, setStatus] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [analysing, setAnalysing] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const local = React.useMemo(() => normalise({}, text), [text]);
  const p = draft || local;
  const typoFixed = cleanText(text) !== String(text || "").replace(/\s+/g, " ").trim();

  function reset() { setDraft(null); setLive(null); setAiInfo({ provider: "local", ai_enabled: false }); setOpen(false); }
  function loadExample(k) { setText(EXAMPLES[k] || EXAMPLES.job); setStatus(null); reset(); }
  function updateText(v) { setText(v); setStatus(null); reset(); }
  function patchDraft(k, v) { const n = { ...p }; if (k === "scheduleInput") n.schedule = { ...p.schedule, input: v, human: v ? v.replace("T", " · ") : "Date needed" }; else if (k === "amount") n[k] = Number(v || 0); else n[k] = v; n.priceText = money(n.amount); n.updateNote = k === "notes" ? noteOf(v) : n.updateNote; n.missing = requiredMissing(n); setDraft(n); setLive(null); setStatus(null); }
  async function loadLive(candidate) { if (!candidate) return null; const res = await post("/tell-churvox/preview", { text: candidate.cleanedText || text, parsed: candidate, intent: candidate.intent, kind: candidate.kind }, { timeout: 15000 }); const body = res?.success ? res.data : { previewTitle: "Live match unavailable", previewLines: [res?.error || "Could not search records yet."], matches: [], canCommit: false, ambiguity: "error" }; setLive(body); return body; }
  async function understand({ show = false } = {}) { if (!text.trim()) return setStatus({ tone: "need", text: "Tell Churvox what you want done first." }); setAnalysing(true); const cleaned = cleanText(text); const res = await post("/ai/quick-create/parse", { kind: "auto", text: cleaned, rawText: text, timezone: "Pacific/Auckland" }, { timeout: 30000 }); let next = normalise({}, cleaned); if (res?.success) { const body = res.data || {}; next = normalise(body.parsed || body.data?.parsed || {}, cleaned); next.originalText = text; next.cleanedText = cleaned; setAiInfo({ provider: body.provider || "ai", ai_enabled: Boolean(body.ai_enabled) }); } setDraft(next); const match = await loadLive(next); setAnalysing(false); setStatus({ tone: res?.data?.ai_enabled ? "ok" : "need", text: `Churvox understood it.${next.intent !== "create" && match?.bestMatch ? ` I found ${match.bestMatch.label}.` : ""}` }); if (show) setOpen(true); return next; }
  async function openModal() { const next = draft || await understand(); if (next && next.intent !== "create" && !live) await loadLive(next); if (next) setOpen(true); }
  async function saveReview(candidate = p, match = live) { const slip = { id: `tell-churvox-${Date.now()}`, type: candidate.kind, category: candidate.intent, title: `${candidate.actionTitle} ready for review`, summary: `${candidate.actionTitle} · ${candidate.clientName || candidate.personName}`, details: Object.fromEntries(detailsFor(candidate, match)), livePreview: match, source: "Tell Churvox", status: "open", createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }; try { [REVIEW_KEY, OLD_REVIEW_KEY].forEach((key) => { const current = JSON.parse(window.localStorage.getItem(key) || "[]"); window.localStorage.setItem(key, JSON.stringify([slip, ...(Array.isArray(current) ? current : [])].slice(0, 50))); }); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-review" } })); } catch {} try { await post("/ai/actions", { title: slip.title, status: "pending", actionKey: candidate.intent, recordType: match?.recordType || candidate.kind, recordId: match?.bestMatch?.id || "", notifyMode: "Internal only", afterApproval: "Apply after owner approval", ownerAuditNote: "Saved from Tell Churvox", form: { parsed: candidate, livePreview: match, details: slip.details }, raw: slip }, { timeout: 12000 }); } catch {} setStatus({ tone: "ok", text: "Saved to Review. Nothing changes until approved." }); setOpen(false); }
  async function approve() { const ready = draft || await understand(); if (!ready) return; if (ready.intent !== "create") { const match = live || await loadLive(ready); if (!canCommit(ready, match) || !match?.bestMatch) return saveReview(ready, match); setSaving(true); let res; if (["update", "complete"].includes(ready.intent)) { const payload = ready.intent === "complete" ? { status: "completed" } : ready.amount > 0 ? { price: ready.amount, pricing_type: "fixed" } : { notes: ready.updateNote || ready.notes }; res = await patch(`/jobs/${match.bestMatch.id}`, payload, { timeout: 20000 }); } else { res = await post("/tell-churvox/commit", { text, parsed: ready, match: match.bestMatch, intent: ready.intent }, { timeout: 20000 }); } setSaving(false); if (!res?.success) return saveReview(ready, match); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-live-update" } })); setOpen(false); setStatus({ tone: "ok", text: ready.intent === "complete" ? `Marked ${match.bestMatch.label} completed.` : "Change approved and applied." }); return; } if (ready.missing.length) return setStatus({ tone: "need", text: `Add ${ready.missing.join(", ")} first.` }); setSaving(true); const plan = createPayload(ready); const res = await postFirst(post, plan.endpoints, plan.payload); setSaving(false); if (!res?.success) return setStatus({ tone: "need", text: res?.error || "Create failed." }); setOpen(false); setStatus({ tone: "ok", text: plan.success }); }

  const cards = detailsFor(p, live);
  return <section className="freshQuickAiPage"><div className="freshQuickAiHero"><div><span>Tell Churvox</span><h1>Say what you want done.</h1><p>No dropdown. Type messy. Churvox understands, finds records, shows a pop-up, then waits for approval.</p></div><div className="freshQuickAiStats"><div><b>{p.actionTitle}</b><small>understood</small></div><div><b>{p.priceText}</b><small>money</small></div><div><b>{p.missing.length}</b><small>required</small></div><div><b>{aiInfo.ai_enabled ? "Real AI" : typoFixed ? "Typo fix" : "Smart"}</b><small>{aiInfo.provider}</small></div></div></div><div className="freshQuickAiGrid"><article className="freshQuickAiPanel"><header><span>One brain</span><h2>Tell Churvox like a real assistant.</h2><p>Try move Bob, change Bob to $70, mark Bob complete, add a note, or chase unpaid invoices.</p></header><textarea value={text} onChange={(e) => updateText(e.target.value)} />{typoFixed ? <div className="freshQuickAiStatus ok"><b>Auto cleaned</b><span>{cleanText(text)}</span></div> : null}<div className="freshQuickAiButtons"><button type="button" onClick={() => understand({ show: true })} disabled={analysing}>{analysing ? "Thinking…" : "Understand + show pop-up"}</button><button type="button" onClick={openModal} disabled={saving || analysing}>Open approval pop-up</button>{Object.keys(EXAMPLES).map((k) => <button key={k} type="button" onClick={() => loadExample(k)}>{k}</button>)}</div>{status ? <div className={`freshQuickAiStatus ${status.tone}`}><b>{status.tone === "ok" ? "Done" : "Needs attention"}</b><span>{status.text}</span></div> : null}</article><article className="freshQuickAiPanel"><header><span>{aiInfo.ai_enabled ? "Real AI preview" : "Smart preview"}</span><h2>{p.actionTitle}</h2><p>The approval pop-up is where Churvox does the final owner check.</p></header><div className="freshQuickAiResult">{cards.map(([a, b]) => <section key={a} className={String(b).toLowerCase().includes("need") ? "need" : ""}><b>{a}</b><p>{b}</p></section>)}</div>{p.intent !== "create" ? <div className={canCommit(p, live) ? "freshQuickAiStatus ok" : "freshQuickAiStatus need"}><b>{live?.previewTitle || "Live match"}</b><span>{(live?.previewLines || []).join(" ") || (live?.bestMatch ? `Found ${live.bestMatch.label}` : "Search runs when you ask Churvox to understand.")}</span></div> : null}<div className="freshQuickAiPrepared"><b>Original</b><p>{text}</p><b>Cleaned</b><p>{p.cleanedText || cleanText(text)}</p><b>Safe rule</b><p>{p.intent === "create" ? "Creates only after approval. Invoices stay draft only." : "Live changes only happen after a confident match and approval."}</p></div><div className="freshQuickAiButtons"><button type="button" onClick={openModal}>Open approval pop-up</button><button type="button" onClick={() => onNavigate?.(p.targetPage)}>Open {p.targetPage}</button></div></article></div><ApprovalModal p={open ? p : null} rawText={text} live={live} saving={saving} analysing={analysing} patchDraft={patchDraft} onClose={() => setOpen(false)} onApprove={approve} onReview={() => saveReview(p, live)} /></section>;
}
