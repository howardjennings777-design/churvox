import React from "react";
import { useApi } from "../hooks/useApi";

const REVIEW_KEY = "churvox:review-inbox:v1";
const OLD_REVIEW_KEY = "churvox:fresh-command-inbox:v1";

const ACTIONS = [
  ["add-job", "Add job", "bob 16 taita drive $60 repeat 23/07/09"],
  ["add-client", "Add client", "add client Sarah Johnson 027 555 1212 sarah@example.com 12 High Street"],
  ["add-quote", "Add quote", "quote Sarah hedge trim $180 at 12 High Street"],
  ["add-invoice", "Add invoice", "invoice Sarah hedge trim $120 due friday"],
  ["add-worker", "Add worker", "add worker Mike mike@example.com 021 555 999"],
  ["find-record", "Find record", "find Sarah"],
  ["move-job", "Move job", "move bob to next week"],
  ["complete-job", "Complete job", "mark bob complete"],
  ["update-price", "Update price", "change bob to $70"],
  ["invoice-job", "Invoice job", "invoice bob completed job"],
  ["invoice-jobs", "Invoice jobs", "invoice completed jobs"],
  ["chase-invoices", "Chase invoices", "chase unpaid invoices"],
];

const pillBar = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 };
const pillButton = { border: 0, borderRadius: 999, minHeight: 40, padding: "0 14px", background: "#fff7ed", color: "#9a3412", WebkitTextFillColor: "#9a3412", fontWeight: 1000, cursor: "pointer" };
const TYPE_LABEL = { job: "Job", client: "Client", quote: "Quote", invoice: "Invoice", person: "Worker" };
const TARGET_PAGE = { job: "jobs", client: "clients", quote: "quotes", invoice: "invoices", person: "team" };

function cleanText(value) {
  return String(value || "")
    .replace(/\bdrve\b|\bdrv\b|\bdriive\b/gi, "drive")
    .replace(/\bstrt\b|\bstret\b|\bstreeet\b/gi, "street")
    .replace(/\binvocie\b|\binvoce\b/gi, "invoice")
    .replace(/\bqoute\b|\bqupte\b/gi, "quote")
    .replace(/\bwrker\b|\bwoker\b/gi, "worker")
    .replace(/\btomorow\b|\btommorrow\b/gi, "tomorrow")
    .replace(/\s+/g, " ")
    .trim();
}
function pad(value) { return String(value).padStart(2, "0"); }
function title(value) { return String(value || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) && n > 0 ? `$${n.toFixed(n % 1 ? 2 : 0)}` : "Price needed"; }
function amountOf(value) { const m = String(value || "").match(/\$\s*(\d+(?:\.\d{1,2})?)/); return m ? Number(m[1]) : 0; }
function addressOf(value) { const m = String(value || "").match(/\b\d{1,5}\s+[A-Za-z0-9'. -]+?\b(?:street|road|avenue|drive|lane|place|crescent|terrace|court|way|highway)\b/i); return m ? title(m[0]) : ""; }
function emailOf(value) { return String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ""; }
function phoneOf(value) { return String(value || "").match(/(?:\+?64|0)\s?[\d\s().-]{7,14}\d/)?.[0]?.trim() || ""; }
function areaOf(value) { const low = String(value || "").toLowerCase(); if (low.includes("taita")) return "Taita"; if (low.includes("naenae")) return "Naenae"; if (low.includes("upper hutt")) return "Upper Hutt"; if (low.includes("lower hutt")) return "Lower Hutt"; if (low.includes("wainui")) return "Wainuiomata"; return "Wellington"; }
function serviceOf(value) { const low = String(value || "").toLowerCase(); if (low.includes("hedge")) return ["Hedge trimming", "garden_maintenance"]; if (low.includes("clean")) return ["Cleaning", "cleaning"]; if (low.includes("lawn") || low.includes("mow")) return ["Lawn mowing", "lawn_mowing"]; if (low.includes("paint")) return ["Painting", "painting"]; return ["General service", "other"]; }
function repeatOf(value) { const low = String(value || "").toLowerCase(); if (low.includes("fortnight")) return "fortnightly"; if (low.includes("weekly")) return "weekly"; if (low.includes("monthly")) return "monthly"; if (low.includes("repeat")) return "custom"; return "one-off"; }
function noteOf(value) { return String(value || "").match(/:\s*(.+)$/)?.[1]?.trim() || String(value || "").trim(); }
function isInvoiceBatch(value) { return /\binvoice\b/i.test(value) && /\b(all\s+)?(completed|complete|done|finished)\s+jobs?\b/i.test(value); }
function isInvoiceJob(value) { return /\binvoice\b/i.test(value) && !isInvoiceBatch(value) && !amountOf(value); }
function isComplete(value) { return /\b(mark|set|make)?\s*\w*\s*(complete|completed|done|finished)\b|\bcomplete\s+\w+/i.test(value); }
function isChase(value) { return /\b(chase|follow\s*up|remind|reminder)\b/i.test(value) && /\b(invoice|invoices|unpaid|overdue|outstanding)\b/i.test(value); }
function isFind(value) { return /\b(find|search|show|look up|lookup|open)\b/i.test(value); }
function intentOf(value) {
  const low = String(value || "").toLowerCase();
  if (isChase(low)) return "chase_invoices";
  if (isInvoiceBatch(low)) return "invoice_batch";
  if (isInvoiceJob(low)) return "invoice_job";
  if (isComplete(low)) return "complete";
  if (isFind(low)) return "find";
  if (/\b(move|reschedule|shift|postpone|push|next week|change date|tomorrow instead)\b/.test(low)) return "reschedule";
  if (/\b(change|update|edit|price to|add note|note to|notes? for)\b/.test(low)) return "update";
  return "create";
}
function nameOf(value, fallback = "Customer") {
  let cleaned = String(value || "").replace(addressOf(value), " ").replace(emailOf(value), " ").replace(phoneOf(value), " ").replace(/\$\s*\d+(?:\.\d+)?/g, " ").replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{1,4})?\b/g, " ");
  const stop = new Set("add create make new please client customer person worker staff team job jobs completed complete quote estimate invoice invoices bill for at to from the a an address phone mobile email price charge amount total due pay rate mow mowing lawn lawns hedge trim clean today tomorrow next week move reschedule shift postpone push show find search unpaid overdue outstanding chase follow up remind reminder tell message sms text send change update edit note notes mark done finished repeat custom all worker staff person employee role".split(" "));
  const words = cleaned.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  return words.filter((w) => !stop.has(w.toLowerCase())).slice(0, 2).map(title).join(" ") || fallback;
}
function scheduleOf(value) {
  const raw = String(value || "");
  const low = raw.toLowerCase();
  const now = new Date();
  let hour = 9;
  let minute = 0;
  const time = low.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (time) { hour = Number(time[1]); minute = Number(time[2] || 0); if (time[3] === "pm" && hour < 12) hour += 12; if (time[3] === "am" && hour === 12) hour = 0; }
  let date = null;
  let label = "Date needed";
  const short = raw.match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{1,4}))?\b/);
  if (short) { const d = Number(short[1]); const m = Number(short[2]); const third = short[3] ? Number(short[3]) : hour; if (third >= 0 && third <= 23 && !time) hour = third; date = new Date(now.getFullYear(), m - 1, d, hour, minute); if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setFullYear(now.getFullYear() + 1); label = `${pad(d)}/${pad(m)}`; }
  if (!date && low.includes("today")) { date = new Date(); label = "Today"; }
  if (!date && low.includes("tomorrow")) { date = new Date(); date.setDate(date.getDate() + 1); label = "Tomorrow"; }
  if (!date && low.includes("next week")) { date = new Date(); date.setDate(date.getDate() + 7); label = "Next week"; }
  if (!date) {
    const match = low.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/) || low.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (match) { const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; const target = days.indexOf(match[1]); date = new Date(); date.setDate(date.getDate() + ((target + 7 - date.getDay()) % 7 || 7)); label = title(match[1]); }
  }
  if (!date) return { human: label, input: "", time: "" };
  date.setHours(hour, minute, 0, 0);
  return { human: `${label} · ${pad(hour)}:${pad(minute)}`, input: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`, time: `${pad(hour)}:${pad(minute)}` };
}
function kindOf(value, intent) {
  const low = String(value || "").toLowerCase();
  if (["invoice_batch", "invoice_job"].includes(intent)) return "job";
  if (["chase_invoices"].includes(intent)) return "invoice";
  if (/\b(worker|staff|employee|team member|person)\b/.test(low)) return "person";
  if (/\b(client|customer)\b/.test(low) && !/\bjob|quote|invoice\b/.test(low)) return "client";
  if (/\bquote|estimate\b/.test(low)) return "quote";
  if (/\binvoice|bill\b/.test(low)) return "invoice";
  return "job";
}
function requiredMissing(p) {
  if (p.intent !== "create") return [];
  if (p.kind === "client") return [!p.clientName && "client name"].filter(Boolean);
  if (p.kind === "person") return [!p.personName && "worker name", !p.email && "email"].filter(Boolean);
  if (p.kind === "quote") return [!p.clientName && "client name", !p.amount && "quote price"].filter(Boolean);
  if (p.kind === "invoice") return [!p.clientName && "client name", !p.amount && "invoice amount"].filter(Boolean);
  return [!p.clientName && "client name", !p.address && "address", !p.schedule.input && "date"].filter(Boolean);
}
function parse(value) {
  const cleanedText = cleanText(value);
  const intent = intentOf(cleanedText);
  const kind = kindOf(cleanedText, intent);
  const amount = amountOf(cleanedText);
  const [service, jobType] = serviceOf(cleanedText);
  const personName = nameOf(cleanedText, "New worker");
  const clientName = kind === "person" ? "" : nameOf(cleanedText);
  const p = { intent, kind, clientName, personName, service, jobType, address: addressOf(cleanedText), area: areaOf(cleanedText), email: emailOf(cleanedText), phone: phoneOf(cleanedText), amount, priceText: money(amount), schedule: scheduleOf(cleanedText), repeat: repeatOf(cleanedText), notes: cleanedText, updateNote: noteOf(cleanedText), dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), cleanedText, targetPage: ["invoice_batch", "invoice_job", "chase_invoices"].includes(intent) ? "invoices" : TARGET_PAGE[kind] || "jobs" };
  p.actionTitle = intent === "chase_invoices" ? "Prepare invoice follow-ups" : intent === "invoice_batch" ? "Draft invoices for completed jobs" : intent === "invoice_job" ? "Create draft invoice" : intent === "complete" ? "Complete job" : intent === "reschedule" ? "Reschedule job" : intent === "update" ? "Update job" : intent === "find" ? "Find records" : `Create ${TYPE_LABEL[kind] || "Record"}`;
  p.missing = requiredMissing(p);
  return p;
}
function jobAmount(record, p = {}) { const r = record?.record || record || {}; return Number(p.amount || r.price || r.fixed_price || r.total || r.subtotal || r.amount || record?.amount || 0); }
function invoiceAmount(record) { const r = record?.record || record || {}; return Number(r.amount_due || r.balance_due || r.total || r.subtotal || r.amount || record?.amount || 0); }
function jobLabel(job) { return job?.title || job?.job_name || job?.customer_name || job?.client_name || job?.name || "Completed job"; }
function invoiceCustomer(inv) { return inv?.customer_name || inv?.client_name || inv?.name || "Customer"; }
function isAlreadyInvoiced(job) { return Boolean(job?.invoice_id || job?.invoiceId || job?.invoiced || job?.invoice_created || job?.invoice_number); }
function matchFromJob(job) { const amount = jobAmount(job); return { recordType: "job", id: job.id || job._id, label: jobLabel(job), summary: `${job.customer_name || job.client_name || "Customer"} · ${money(amount)}`, amount, record: job }; }
function matchFromInvoice(inv) { const amount = invoiceAmount(inv); const number = inv.invoice_number || inv.number || inv.id || "invoice"; return { recordType: "invoice", id: inv.id || inv._id, label: inv.invoice_number || inv.number || invoiceCustomer(inv), summary: `${invoiceCustomer(inv)} · ${money(amount)} · ${inv.status || "unpaid"}`, amount, record: inv, draftMessage: `Hi ${invoiceCustomer(inv)}, just a friendly reminder that ${number} for ${money(amount)} is still outstanding. Let me know if you need anything. Thanks.` }; }
function total(matches, getter) { return (matches || []).reduce((sum, item) => sum + getter(item), 0); }
function canApprove(p, live) { return Boolean(p.intent === "create" ? !p.missing?.length : p.intent === "chase_invoices" ? live?.matches?.length : p.intent === "invoice_batch" ? live?.matches?.length : p.intent === "find" ? false : live?.bestMatch && live.ambiguity === "none" && (p.intent === "complete" || (p.intent === "invoice_job" && jobAmount(live.bestMatch, p) > 0) || (p.intent === "reschedule" && p.schedule.input) || (p.intent === "update" && (p.amount > 0 || /note/i.test(p.cleanedText))))); }
function invoicePayload(p, match) { const r = match?.record || match || {}; const amount = jobAmount(match, p); const clientName = r.client_name || r.customer_name || p.clientName || match?.label || "Customer"; const description = r.title || r.job_name || r.description || p.service || "Completed job"; return { customer_name: clientName, client_name: clientName, customer_email: r.customer_email || r.client_email || null, customer_phone: r.customer_phone || r.client_phone || null, address: r.address || r.site_address || p.address || null, description, notes: `Draft invoice prepared from job ${match?.label || ""}.`, status: "draft", amount, subtotal: amount, total: amount, due_date: p.dueDate, job_id: match?.id || r.id || null, line_items: [{ description, quantity: 1, unit_price: amount, amount }] }; }
function createPlan(p) {
  if (p.kind === "client") return { endpoints: ["/clients"], success: "Client created", payload: { name: p.clientName, email: p.email || null, phone: p.phone || null, address: p.address || null, notes: p.notes || null } };
  if (p.kind === "person") return { endpoints: ["/team/workers", "/team", "/workers"], success: "Worker added", payload: { name: p.personName, email: p.email, phone: p.phone || null, role: "worker", team_role: "worker", notes: p.notes || null } };
  if (p.kind === "invoice") return { endpoints: ["/invoices"], success: "Draft invoice created", payload: { customer_name: p.clientName, client_name: p.clientName, description: p.service, notes: p.notes, status: "draft", amount: p.amount, subtotal: p.amount, total: p.amount, due_date: p.dueDate, line_items: [{ description: p.service, quantity: 1, unit_price: p.amount, amount: p.amount }] } };
  if (p.kind === "quote") return { endpoints: ["/quotes"], success: "Draft quote created", payload: { customer_name: p.clientName, client_name: p.clientName, address: p.address, site_address: p.address, job_description: p.service, price: p.amount, amount: p.amount, total: p.amount, status: "draft", notes: p.notes } };
  return { endpoints: ["/jobs"], success: "Job created", payload: { title: `${p.service} for ${p.clientName}`, job_name: `${p.service} for ${p.clientName}`, job_type: p.jobType, client_name: p.clientName, customer_name: p.clientName, address: p.address, site_address: p.address, scheduled_date: p.schedule.input, scheduled_time: p.schedule.time, estimated_duration: 60, region: p.area, notes: p.notes, status: "assigned", pricing_type: "fixed", price: p.amount, is_recurring: p.repeat !== "one-off", recurring_frequency: p.repeat !== "one-off" ? p.repeat : null } };
}
function detailsFor(p, live) {
  const batchCount = live?.matches?.length || 0;
  const batchTotal = p.intent === "chase_invoices" ? total(live?.matches, invoiceAmount) : total(live?.matches, jobAmount);
  const change = p.intent === "chase_invoices" ? `Prepare ${batchCount} follow-up draft(s) for ${money(batchTotal)}` : p.intent === "invoice_batch" ? `Create ${batchCount} draft invoice(s) for ${money(batchTotal)}` : p.intent === "invoice_job" ? `Create draft invoice for ${money(jobAmount(live?.bestMatch, p))}` : p.intent === "complete" ? "Mark job completed" : p.intent === "reschedule" ? p.schedule.human : p.intent === "find" ? "Find matching live records" : p.intent === "update" ? (p.amount > 0 ? `Set price to ${p.priceText}` : p.updateNote) : p.service;
  if (p.intent !== "create") return [["Action", p.actionTitle], ["Live match", ["chase_invoices", "invoice_batch"].includes(p.intent) ? `${batchCount} item(s)` : live?.bestMatch ? `${live.bestMatch.label} · ${live.bestMatch.summary || "matched"}` : "Needs matching"], ["Change", change], ["Status", canApprove(p, live) ? "Ready to approve" : "Save to Review"]];
  if (p.kind === "client") return [["Client", p.clientName], ["Email", p.email || "Optional"], ["Phone", p.phone || "Optional"], ["Address", p.address || "Optional"]];
  if (p.kind === "person") return [["Worker", p.personName], ["Email", p.email || "Needed"], ["Phone", p.phone || "Optional"], ["Role", "Worker"]];
  if (p.kind === "quote") return [["Client", p.clientName], ["Scope", p.service], ["Address", p.address || "Optional"], ["Price", p.priceText]];
  if (p.kind === "invoice") return [["Client", p.clientName], ["Line", p.service], ["Amount", p.priceText], ["Status", "Draft only"]];
  return [["Client", p.clientName], ["Job", p.service], ["Address", p.address || "Needed"], ["Schedule", p.schedule.human], ["Price", p.priceText], ["Repeat", p.repeat]];
}
async function postFirst(post, endpoints, payload) { let lastError = "Create failed"; for (const endpoint of endpoints) { try { const res = await post(endpoint, payload, { timeout: 20000 }); if (res?.success) return res; lastError = res?.error || lastError; } catch (error) { lastError = error?.message || lastError; } } return { success: false, error: lastError }; }
function fieldLabel(key) { return ({ clientName: "Client / target", personName: "Worker name", service: "Service", address: "Address", scheduleInput: "Date + time", amount: "Price", repeat: "Repeat", email: "Email", phone: "Phone", notes: "Notes" })[key] || key; }
function editorFields(p) { if (["chase_invoices", "invoice_batch", "find"].includes(p.intent)) return ["notes"]; if (p.intent === "complete") return ["clientName", "notes"]; if (p.intent !== "create") return ["clientName", "scheduleInput", "amount", "notes"]; if (p.kind === "client") return ["clientName", "email", "phone", "address", "notes"]; if (p.kind === "person") return ["personName", "email", "phone", "notes"]; if (["quote", "invoice"].includes(p.kind)) return ["clientName", "service", "amount", "address", "email", "phone", "notes"]; return ["clientName", "service", "address", "scheduleInput", "amount", "repeat", "email", "phone", "notes"]; }
function FieldEditor({ parsed, onChange }) { const fields = editorFields(parsed); const getValue = (key) => key === "scheduleInput" ? parsed.schedule.input : parsed[key] || ""; return <div className="freshQuickAiEdit"><b>Fix details here</b><div>{fields.map((key) => <label key={key} className={key === "notes" ? "wide" : ""}><span>{fieldLabel(key)}</span>{key === "notes" ? <textarea value={getValue(key)} onChange={(e) => onChange(key, e.target.value)} /> : key === "repeat" ? <select value={getValue(key)} onChange={(e) => onChange(key, e.target.value)}><option value="one-off">One-off</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select> : <input type={key === "amount" ? "number" : key === "scheduleInput" ? "datetime-local" : "text"} value={getValue(key)} onChange={(e) => onChange(key, e.target.value)} />}</label>)}</div></div>; }
function ApprovalModal({ parsed, live, rawText, saving, analysing, onEdit, onApprove, onReview, onClose }) { if (!parsed) return null; const items = (live?.matches || []).slice(0, 8); return <div className="freshQuickAiModalShade" role="dialog" aria-modal="true"><div className="freshQuickAiModal"><button className="freshQuickAiModalClose" type="button" onClick={onClose}>×</button><header><span>Owner approval</span><h2>{parsed.actionTitle}</h2><p>Check the details first. Nothing changes, sends, or syncs until you approve.</p></header><div className="freshQuickAiModalGrid"><section className="freshQuickAiResult modalCards">{detailsFor(parsed, live).map(([label, value]) => <section key={label} className={String(value).toLowerCase().includes("need") ? "need" : ""}><b>{label}</b><p>{value}</p></section>)}</section><section className="freshQuickAiPrepared modalExplain"><b>You typed</b><p>{rawText}</p><b>Churvox cleaned</b><p>{parsed.cleanedText}</p><b>Safe rule</b><p>{parsed.intent === "chase_invoices" ? "Follow-ups save as Review drafts only. Nothing is sent." : parsed.intent.startsWith("invoice") || parsed.kind === "invoice" ? "Invoices stay draft only. No send or Xero sync." : parsed.intent === "find" ? "Search only. Nothing changes." : "Live records update only after approval."}</p></section></div>{parsed.intent !== "create" ? <div className={canApprove(parsed, live) ? "freshQuickAiStatus ok" : "freshQuickAiStatus need"}><b>{live?.previewTitle || "Live match"}</b><span>{(live?.previewLines || []).join(" ") || (live?.bestMatch ? `Found ${live.bestMatch.label}` : "No confident match yet.")}</span>{items.length ? <span>{items.map((m) => `${m.label} — ${m.summary || money(m.amount)}`).join(" | ")}</span> : null}</div> : null}<FieldEditor parsed={parsed} onChange={onEdit} />{parsed.missing?.length ? <div className="freshQuickAiMissing"><b>Required before approve</b><span>{parsed.missing.join(", ")}</span></div> : null}<div className="freshQuickAiModalActions"><button type="button" disabled={saving || analysing || parsed.missing?.length || (parsed.intent !== "create" && !canApprove(parsed, live))} onClick={onApprove}>{saving ? "Working…" : parsed.intent === "chase_invoices" ? "Save follow-up drafts" : parsed.intent === "invoice_batch" ? "Approve draft invoices" : parsed.intent === "invoice_job" ? "Approve draft invoice" : parsed.intent === "create" ? "Approve + create" : "Approve change"}</button><button type="button" onClick={onReview}>Save to Review</button><button type="button" onClick={onClose}>Cancel</button></div></div></div>; }

export default function FreshAiQuickCreateBrainV6({ onNavigate }) {
  const { get, post, patch } = useApi();
  const [text, setText] = React.useState(ACTIONS[0][2]);
  const [draft, setDraft] = React.useState(null);
  const [live, setLive] = React.useState(null);
  const [aiEnabled, setAiEnabled] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [analysing, setAnalysing] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const parsed = draft || parse(text);
  const typoFixed = cleanText(text) !== String(text || "").replace(/\s+/g, " ").trim();

  function setExample(value) { setText(value); setDraft(null); setLive(null); setStatus(null); setOpen(false); }
  function updateText(value) { setText(value); setDraft(null); setLive(null); setStatus(null); setOpen(false); }
  function edit(key, value) { const next = { ...parsed }; if (key === "scheduleInput") next.schedule = { ...next.schedule, input: value, human: value ? value.replace("T", " · ") : "Date needed", time: value?.split("T")?.[1] || "" }; else if (key === "amount") { next.amount = Number(value || 0); next.priceText = money(next.amount); } else next[key] = value; next.missing = requiredMissing(next); setDraft(next); setLive(null); }
  async function loadBatchJobs() { const res = await get("/jobs", { params: { status: "completed" }, timeout: 15000 }); const jobs = Array.isArray(res?.data) ? res.data : []; const matches = jobs.filter((job) => jobAmount(job) > 0 && !isAlreadyInvoiced(job)).slice(0, 25).map(matchFromJob); const body = { batch: true, matches, bestMatch: matches[0] || null, ambiguity: matches.length ? "none" : "no_match", previewTitle: matches.length ? "Completed jobs ready to invoice" : "No completed priced jobs ready", previewLines: matches.length ? [`${matches.length} job(s) ready.`, `Draft total ${money(total(matches, jobAmount))}.`, "Draft only — no sending or Xero sync."] : ["No completed jobs with prices found."] }; setLive(body); return body; }
  async function loadInvoiceChase() { const res = await get("/invoices", { timeout: 15000 }); const invoices = Array.isArray(res?.data) ? res.data : []; const matches = invoices.filter((inv) => ["sent", "overdue", "unpaid"].includes(String(inv.status || "").toLowerCase()) && invoiceAmount(inv) > 0).slice(0, 25).map(matchFromInvoice); const body = { batch: true, matches, bestMatch: matches[0] || null, ambiguity: matches.length ? "none" : "no_match", previewTitle: matches.length ? "Unpaid invoices ready for follow-up" : "No unpaid invoices ready", previewLines: matches.length ? [`${matches.length} invoice(s) ready.`, `Outstanding total ${money(total(matches, invoiceAmount))}.`, "Draft follow-ups only — nothing sent."] : ["No sent or overdue invoices with balances found."] }; setLive(body); return body; }
  async function loadLive(candidate) { if (candidate.intent === "invoice_batch") return loadBatchJobs(); if (candidate.intent === "chase_invoices") return loadInvoiceChase(); const res = await post("/tell-churvox/preview", { text: candidate.cleanedText, parsed: candidate, intent: candidate.intent, kind: candidate.kind }, { timeout: 15000 }); const body = res?.success ? res.data : { previewTitle: "Live match unavailable", previewLines: [res?.error || "Could not search records yet."], matches: [], ambiguity: "error" }; setLive(body); return body; }
  async function understand({ show = false } = {}) { if (!text.trim()) return setStatus({ tone: "need", text: "Tell Churvox what you want done first." }); setAnalysing(true); const cleaned = cleanText(text); let next = parse(cleaned); try { const res = await post("/ai/quick-create/parse", { kind: "auto", text: cleaned, rawText: text, timezone: "Pacific/Auckland" }, { timeout: 30000 }); if (res?.success) { const body = res.data || {}; next = { ...next, ...(body.parsed || body.data?.parsed || {}), intent: next.intent, kind: next.kind, cleanedText: cleaned, targetPage: next.targetPage }; next.missing = requiredMissing(next); setAiEnabled(Boolean(body.ai_enabled)); } setDraft(next); const match = next.intent === "create" ? null : await loadLive(next); setStatus({ tone: res?.data?.ai_enabled ? "ok" : "need", text: `Churvox understood it.${match?.bestMatch ? ` Found ${match.bestMatch.label}.` : match?.matches?.length ? ` ${match.matches.length} item(s) ready.` : ""}` }); if (show) setOpen(true); return next; } catch (error) { setDraft(next); if (next.intent !== "create") await loadLive(next); setStatus({ tone: "need", text: error?.message || "Churvox used safe local understanding." }); if (show) setOpen(true); return next; } finally { setAnalysing(false); } }
  async function openModal() { const next = draft || await understand(); if (next && next.intent !== "create" && !live) await loadLive(next); if (next) setOpen(true); }
  async function saveReview(candidate = parsed, match = live) { const details = Object.fromEntries(detailsFor(candidate, match)); if (candidate.intent === "chase_invoices") details["Prepared drafts"] = (match?.matches || []).map((m) => `${m.label}: ${m.draftMessage}`).join("\n"); const slip = { id: `tell-churvox-${Date.now()}`, type: candidate.kind, category: candidate.intent, title: `${candidate.actionTitle} ready for review`, summary: candidate.actionTitle, details, livePreview: match, source: "Tell Churvox", status: "open", createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }; try { [REVIEW_KEY, OLD_REVIEW_KEY].forEach((key) => { const current = JSON.parse(window.localStorage.getItem(key) || "[]"); window.localStorage.setItem(key, JSON.stringify([slip, ...(Array.isArray(current) ? current : [])].slice(0, 50))); }); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-review" } })); } catch {} try { await post("/ai/actions", { title: slip.title, status: "pending", actionKey: candidate.intent, recordType: match?.bestMatch?.recordType || candidate.kind, recordId: match?.bestMatch?.id || "", notifyMode: "Internal only", afterApproval: candidate.intent === "chase_invoices" ? "Review follow-up drafts before sending" : "Apply after owner approval", ownerAuditNote: "Saved from Tell Churvox", form: { parsed: candidate, livePreview: match, details }, raw: slip }, { timeout: 12000 }); } catch {} setStatus({ tone: "ok", text: candidate.intent === "chase_invoices" ? "Follow-up drafts saved to Review. Nothing was sent." : "Saved to Review. Nothing changes until approved." }); setOpen(false); }
  async function approve() { const ready = draft || await understand(); if (!ready) return; if (ready.intent !== "create") { const match = live || await loadLive(ready); if (!canApprove(ready, match)) return saveReview(ready, match); if (ready.intent === "chase_invoices") return saveReview(ready, match); setSaving(true); try { let res = null; if (ready.intent === "invoice_batch") { const results = []; for (const job of match.matches || []) results.push(await post("/invoices", invoicePayload(ready, job), { timeout: 20000 })); res = results.find((r) => !r?.success) || { success: true }; } else if (ready.intent === "invoice_job") res = await post("/invoices", invoicePayload(ready, match.bestMatch), { timeout: 20000 }); else { const payload = ready.intent === "complete" ? { status: "completed" } : ready.intent === "reschedule" ? { scheduled_date: ready.schedule.input, scheduled_time: ready.schedule.time } : ready.amount > 0 ? { price: ready.amount, pricing_type: "fixed" } : { notes: ready.updateNote || ready.notes }; res = await patch(`/jobs/${match.bestMatch.id}`, payload, { timeout: 20000 }); } setSaving(false); if (!res?.success) return saveReview(ready, match); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-live-update" } })); setOpen(false); setStatus({ tone: "ok", text: ready.intent === "invoice_batch" ? `Created ${match.matches.length} draft invoice(s).` : ready.intent === "invoice_job" ? `Draft invoice created from ${match.bestMatch.label}.` : "Change approved and applied." }); return; } catch { setSaving(false); return saveReview(ready, match); } } if (ready.missing?.length) return setStatus({ tone: "need", text: `Add ${ready.missing.join(", ")} first.` }); setSaving(true); const plan = createPlan(ready); const res = await postFirst(post, plan.endpoints, plan.payload); setSaving(false); if (!res?.success) return setStatus({ tone: "need", text: res?.error || "Create failed." }); setOpen(false); setStatus({ tone: "ok", text: plan.success }); window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-create" } })); }
  const cards = detailsFor(parsed, live);
  return <section className="freshQuickAiPage"><div className="freshQuickAiHero"><div><span>Tell Churvox</span><h1>Say what you want done.</h1><p>No dropdown. Type messy. Churvox understands, finds records, shows a pop-up, then waits for approval.</p></div><div className="freshQuickAiStats"><div><b>{parsed.actionTitle}</b><small>understood</small></div><div><b>{parsed.intent === "chase_invoices" ? money(total(live?.matches, invoiceAmount)) : parsed.intent === "invoice_batch" ? money(total(live?.matches, jobAmount)) : parsed.intent === "invoice_job" ? money(jobAmount(live?.bestMatch, parsed)) : parsed.priceText}</b><small>money</small></div><div><b>{parsed.missing?.length || 0}</b><small>required</small></div><div><b>{aiEnabled ? "Real AI" : typoFixed ? "Typo fix" : "Smart"}</b><small>brain</small></div></div></div><div className="freshQuickAiGrid"><article className="freshQuickAiPanel"><header><span>One brain</span><h2>Tell Churvox like a real assistant.</h2><p>Use the daily actions below or type your own instruction.</p></header><textarea value={text} onChange={(e) => updateText(e.target.value)} />{typoFixed ? <div className="freshQuickAiStatus ok"><b>Auto cleaned</b><span>{cleanText(text)}</span></div> : null}<div className="freshQuickAiButtons"><button type="button" onClick={() => understand({ show: true })} disabled={analysing}>{analysing ? "Thinking…" : "Understand + show pop-up"}</button><button type="button" onClick={openModal} disabled={saving || analysing}>Open approval pop-up</button></div><div style={pillBar} aria-label="Tell Churvox examples">{ACTIONS.map(([key, label, value]) => <button key={key} type="button" style={pillButton} onClick={() => setExample(value)}>{label}</button>)}</div>{status ? <div className={`freshQuickAiStatus ${status.tone}`}><b>{status.tone === "ok" ? "Done" : "Needs attention"}</b><span>{status.text}</span></div> : null}</article><article className="freshQuickAiPanel"><header><span>{aiEnabled ? "Real AI preview" : "Smart preview"}</span><h2>{parsed.actionTitle}</h2><p>The approval pop-up is where Churvox does the final owner check.</p></header><div className="freshQuickAiResult">{cards.map(([label, value]) => <section key={label} className={String(value).toLowerCase().includes("need") ? "need" : ""}><b>{label}</b><p>{value}</p></section>)}</div>{parsed.intent !== "create" ? <div className={canApprove(parsed, live) ? "freshQuickAiStatus ok" : "freshQuickAiStatus need"}><b>{live?.previewTitle || "Live match"}</b><span>{(live?.previewLines || []).join(" ") || (live?.bestMatch ? `Found ${live.bestMatch.label}` : "Search runs when you ask Churvox to understand.")}</span>{live?.matches?.length ? <span>{live.matches.slice(0, 6).map((m) => `${m.label} — ${m.summary || money(m.amount)}`).join(" | ")}</span> : null}</div> : null}<div className="freshQuickAiPrepared"><b>Original</b><p>{text}</p><b>Cleaned</b><p>{parsed.cleanedText}</p><b>Safe rule</b><p>{parsed.intent === "chase_invoices" ? "Follow-ups are saved as drafts. Nothing is sent automatically." : parsed.intent.startsWith("invoice") || parsed.kind === "invoice" ? "Invoices stay draft only. Nothing is sent or synced without approval." : parsed.intent === "find" ? "Search only. Nothing changes." : "Live changes only happen after a confident match and approval."}</p></div><div className="freshQuickAiButtons"><button type="button" onClick={openModal}>Open approval pop-up</button><button type="button" onClick={() => onNavigate?.(parsed.targetPage)}>Open {parsed.targetPage}</button></div></article></div><ApprovalModal parsed={open ? parsed : null} live={live} rawText={text} saving={saving} analysing={analysing} onEdit={edit} onApprove={approve} onReview={() => saveReview(parsed, live)} onClose={() => setOpen(false)} /></section>;
}
