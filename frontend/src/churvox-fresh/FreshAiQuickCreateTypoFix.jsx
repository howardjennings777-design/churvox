import React from "react";
import { useApi } from "../hooks/useApi";

const REVIEW_INBOX_KEY = "churvox:review-inbox:v1";
const LEGACY_COMMAND_INBOX_KEY = "churvox:fresh-command-inbox:v1";

const LABEL = { client: "Client", job: "Job", quote: "Quote", invoice: "Invoice", person: "Person / worker" };
const PAGE = { client: "clients", job: "jobs", quote: "quotes", invoice: "invoices", person: "team" };

const examples = {
  job: "bob 16 taita drive $60 repeat 23/07/09",
  move: "move bob to next week",
  price: "change bob to $70",
  note: "add note to bob: dog in backyard, close gate after mowing",
  quote: "quote Sarah at 15 High strt Upper Hutt for overgrown lawn and hedge trim, $190 including GST",
  invoice: "invoice Sarah for hedge trim today, $120 including GST, due in 7 days",
  person: "add Mike Jones as a wrker, mike@example.com, 022 555 777, pay rate $28/hr",
  money: "show unpaid invoices and chase anything overdue",
};

const typoPairs = [
  [/\bdrve\b/gi, "drive"], [/\bdrv\b/gi, "drive"], [/\bdriive\b/gi, "drive"],
  [/\bstrt\b/gi, "street"], [/\bstret\b/gi, "street"], [/\bstreeet\b/gi, "street"],
  [/\bavene?u?\b/gi, "avenue"], [/\bav\b/gi, "avenue"],
  [/\brd\.?\b/gi, "road"], [/\bst\.?\b/gi, "street"], [/\bdr\.?\b/gi, "drive"],
  [/\bplce\b/gi, "place"], [/\bln\.?\b/gi, "lane"], [/\bct\.?\b/gi, "court"],
  [/\badress\b/gi, "address"], [/\badrs\b/gi, "address"],
  [/\bphon\b/gi, "phone"], [/\bfone\b/gi, "phone"],
  [/\bemial\b/gi, "email"], [/\bemailaddress\b/gi, "email address"],
  [/\bqoute\b/gi, "quote"], [/\bqupte\b/gi, "quote"],
  [/\binvocie\b/gi, "invoice"], [/\binvoce\b/gi, "invoice"],
  [/\bclint\b/gi, "client"], [/\bcient\b/gi, "client"], [/\bcustmer\b/gi, "customer"],
  [/\bwrker\b/gi, "worker"], [/\bwoker\b/gi, "worker"],
  [/\blawms\b/gi, "lawns"], [/\blawnmowing\b/gi, "lawn mowing"], [/\bmowng\b/gi, "mowing"],
  [/\bfortnighly\b/gi, "fortnightly"], [/\bfortnigthly\b/gi, "fortnightly"],
  [/\btomorow\b/gi, "tomorrow"], [/\btommorrow\b/gi, "tomorrow"],
  [/\bfridy\b/gi, "friday"], [/\bthurday\b/gi, "thursday"], [/\btuseday\b/gi, "tuesday"],
];

function cleanOwnerText(value) {
  let text = String(value || "");
  typoPairs.forEach(([from, to]) => { text = text.replace(from, to); });
  return text.replace(/\s+/g, " ").trim();
}

function pad(value) { return String(value).padStart(2, "0"); }
function title(value) { return String(value || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()); }
function money(value) { const amount = Number(value || 0); if (!Number.isFinite(amount) || amount <= 0) return "Price needed"; return `$${amount.toFixed(amount % 1 ? 2 : 0)}`; }
function isoDate(days = 7) { const d = new Date(); d.setDate(d.getDate() + days); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function emailOf(text) { return String(text || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ""; }
function phoneOf(text) { return String(text || "").match(/(?:\+?64|0)\s?[\d\s().-]{7,14}\d/)?.[0]?.trim() || ""; }
function priceOf(text) { const m = String(text || "").match(/\$\s*(\d+(?:\.\d{1,2})?)/) || String(text || "").match(/\b(\d+(?:\.\d{1,2})?)\s*(?:incl|inc|including)\s*gst\b/i); return m ? Number(m[1]) : 0; }
function addressOf(text) { const m = String(text || "").match(/\b\d{1,5}\s+[A-Za-z0-9'. -]+?\b(?:street|road|avenue|drive|lane|place|crescent|terrace|court|way|highway)\b/i); return m ? title(m[0]) : ""; }
function areaOf(text) { const low = String(text || "").toLowerCase(); if (low.includes("upper hutt")) return "Upper Hutt"; if (low.includes("lower hutt")) return "Lower Hutt"; if (low.includes("wainuiomata")) return "Wainuiomata"; if (low.includes("naenae")) return "Naenae"; if (low.includes("taita")) return "Taita"; return "Wellington"; }
function serviceOf(text) { const low = String(text || "").toLowerCase(); if (low.includes("hedge")) return ["Hedge trimming", "garden_maintenance"]; if (low.includes("clean")) return ["Cleaning", "cleaning"]; if (low.includes("repair") || low.includes("handyman")) return ["Handyman repair", "handyman"]; if (low.includes("paint")) return ["Painting", "painting"]; if (low.includes("lawn") || low.includes("mow")) return ["Lawn mowing", "lawn_mowing"]; return ["General service", "other"]; }
function repeatOf(text) { const low = String(text || "").toLowerCase(); if (low.includes("fortnight")) return "fortnightly"; if (low.includes("weekly")) return "weekly"; if (low.includes("monthly")) return "monthly"; if (low.includes("repeat")) return "custom"; return "one-off"; }
function roleOf(text) { const low = String(text || "").toLowerCase(); if (low.includes("subcontractor")) return "subcontractor"; if (low.includes("payroll")) return "payroll"; if (low.includes("lead")) return "lead_worker"; return "worker"; }
function roleText(role) { return role === "lead_worker" ? "Lead worker" : role === "subcontractor" ? "Subcontractor" : role === "payroll" ? "Payroll only" : "Worker"; }

function intentOf(text) {
  const low = String(text || "").toLowerCase();
  if (/\b(move|reschedule|shift|postpone|push|change date|next week|tomorrow instead)\b/.test(low)) return "reschedule";
  if (/\b(show|find|search|where is|list|what money|unpaid|overdue)\b/.test(low)) return low.includes("unpaid") || low.includes("overdue") ? "money_review" : "find";
  if (/\b(tell|message|sms|text|send)\b/.test(low)) return "message";
  if (/\b(change|update|edit|make .*\$|price to|add note|note to|notes? for)\b/.test(low)) return "update";
  return "create";
}

function kindOf(kind, text, intent = intentOf(text)) {
  if (kind && kind !== "auto") return kind;
  const low = String(text || "").toLowerCase();
  if (intent !== "create") {
    if (low.includes("invoice") || low.includes("unpaid") || low.includes("overdue")) return "invoice";
    if (low.includes("quote")) return "quote";
    if (low.includes("worker") || low.includes("staff") || low.includes("employee")) return "person";
    return "job";
  }
  if (low.includes("invoice") || low.includes("bill")) return "invoice";
  if (low.includes("quote") || low.includes("estimate")) return "quote";
  if (low.includes("worker") || low.includes("staff") || low.includes("employee")) return "person";
  if (low.includes("client") || low.includes("customer")) return "client";
  return "job";
}

function actionTitle(intent, kind) {
  if (intent === "reschedule") return "Reschedule job";
  if (intent === "money_review") return "Review money";
  if (intent === "find") return "Find records";
  if (intent === "message") return "Prepare message";
  if (intent === "update") return "Update job";
  return `Create ${LABEL[kind] || "record"}`;
}

function parseShortDate(text) {
  const m = String(text || "").match(/\b(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{1,4}))?\b/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const third = m[3] ? Number(m[3]) : null;
  if (!day || !month || day > 31 || month > 12) return null;
  const now = new Date();
  let year = now.getFullYear();
  let hour = 9;
  if (third !== null) {
    if (third >= 0 && third <= 23 && third !== Number(String(year).slice(-2))) hour = third;
    else if (third < 100) year = 2000 + third;
    else year = third;
  }
  let date = new Date(year, month - 1, day, hour, 0, 0, 0);
  if (date.getFullYear() < now.getFullYear() || date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    date = new Date(now.getFullYear(), month - 1, day, hour, 0, 0, 0);
    if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setFullYear(now.getFullYear() + 1);
  }
  return { human: `${pad(day)}/${pad(month)} · ${pad(hour)}:00`, input: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`, time: `${pad(hour)}:00` };
}

function parseSchedule(text) {
  const shortDate = parseShortDate(text);
  if (shortDate) return shortDate;
  const low = String(text || "").toLowerCase();
  const timeMatch = low.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  let hour = 9; let minute = 0; let time = "9:00 AM";
  if (timeMatch) { hour = Number(timeMatch[1]); minute = Number(timeMatch[2] || 0); if (timeMatch[3] === "pm" && hour < 12) hour += 12; if (timeMatch[3] === "am" && hour === 12) hour = 0; time = `${Number(timeMatch[1])}:${pad(minute)} ${timeMatch[3].toUpperCase()}`; }
  let date = null; let label = "Date needed";
  if (low.includes("today")) { date = new Date(); label = "Today"; }
  if (!date && low.includes("tomorrow")) { date = new Date(); date.setDate(date.getDate() + 1); label = "Tomorrow"; }
  if (!date && low.includes("next week")) { date = new Date(); date.setDate(date.getDate() + 7); label = "Next week"; }
  if (!date) {
    const m = low.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/) || low.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (m) { const names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; const target = names.indexOf(m[1]); date = new Date(); date.setDate(date.getDate() + ((target + 7 - date.getDay()) % 7 || 7)); label = title(m[1]); }
  }
  if (!date) return { human: "Date needed", input: "", time };
  date.setHours(hour, minute, 0, 0);
  return { human: `${label} · ${time}`, input: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`, time };
}

function nameOf(text, fallback) {
  let cleaned = String(text || "");
  [emailOf(text), phoneOf(text), addressOf(text)].filter(Boolean).forEach((piece) => { cleaned = cleaned.replace(piece, " "); });
  cleaned = cleaned.replace(/\$\s*\d+(?:\.\d{1,2})?/g, " ").replace(/\b\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{1,4})?\b/g, " ");
  const stop = new Set("add create make new please client customer person worker staff team job quote invoice bill for at to from his her their the a an address phone mobile email price charge amount total due pay rate mow mowing lawn lawns hedge trim clean cleaning repair handyman paint painting today tomorrow next monday tuesday wednesday thursday friday saturday sunday front back photos photo green waste gst including include included repeat custom move reschedule shift postpone push show find search unpaid overdue chase tell message sms text send next week change update edit make note notes".split(" "));
  const words = cleaned.match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const picked = words.filter((w) => !stop.has(w.toLowerCase())).slice(0, 2);
  return picked.map(title).join(" ") || fallback;
}

function noteTextOf(text) {
  const value = String(text || "").trim();
  const colon = value.match(/(?:add\s+)?notes?\s+(?:to|for)\s+[^:]+:\s*(.+)$/i) || value.match(/:\s*(.+)$/);
  if (colon?.[1]) return colon[1].trim();
  const note = value.match(/(?:add\s+)?notes?\s+(?:to|for)\s+(.+)$/i);
  return note?.[1]?.trim() || value;
}

function requiredMissing(p) {
  if (p.intent !== "create") return [];
  const missing = [];
  const need = (key, label) => { if (!String(key || "").trim()) missing.push(label); };
  if (p.kind === "client") need(p.clientName, "client name");
  if (p.kind === "job") { need(p.clientName, "client name"); need(p.address, "job address"); need(p.schedule?.input, "date"); }
  if (p.kind === "quote") { need(p.clientName, "client name"); need(p.address, "site address"); if (!Number(p.amount || 0)) missing.push("quote price"); }
  if (p.kind === "invoice") { need(p.clientName, "client name"); if (!Number(p.amount || 0)) missing.push("invoice amount"); }
  if (p.kind === "person") { need(p.personName, "person name"); need(p.email, "email for invite"); }
  return missing;
}

function normalise(raw, originalText) {
  const cleanedText = cleanOwnerText(originalText);
  const intent = raw?.intent || raw?.actionIntent || intentOf(cleanedText);
  const actualKind = kindOf(raw?.kind || "auto", cleanedText, intent);
  const [service, jobType] = serviceOf(cleanedText);
  const localSchedule = parseSchedule(cleanedText);
  const rawSchedule = raw?.schedule && typeof raw.schedule === "object" ? raw.schedule : {};
  const schedule = rawSchedule.input ? rawSchedule : localSchedule;
  const amount = Number(raw?.amount || raw?.price || raw?.total || priceOf(cleanedText) || 0);
  const role = raw?.role || roleOf(cleanedText);
  const clientName = raw?.clientName || raw?.client_name || raw?.customer_name || nameOf(cleanedText, actualKind === "person" ? "New person" : "New customer");
  const personName = raw?.personName || raw?.person_name || raw?.name || nameOf(cleanedText, "New person");
  const parsed = {
    intent,
    actionTitle: actionTitle(intent, actualKind),
    canExecuteNow: intent === "create",
    kind: actualKind,
    label: LABEL[actualKind] || "Action",
    clientName,
    personName,
    service: raw?.service || raw?.description || service,
    jobType: raw?.jobType || raw?.job_type || jobType,
    address: raw?.address || raw?.site_address || addressOf(cleanedText),
    area: raw?.area || raw?.region || areaOf(cleanedText),
    email: raw?.email || raw?.customer_email || raw?.client_email || emailOf(cleanedText),
    phone: raw?.phone || raw?.mobile || raw?.customer_phone || phoneOf(cleanedText),
    amount,
    priceText: money(amount),
    payRate: Number(raw?.payRate || raw?.pay_rate || 0),
    payRateText: raw?.payRateText || (raw?.payRate || raw?.pay_rate ? `$${raw?.payRate || raw?.pay_rate}/hr` : "Not set"),
    schedule: { human: schedule.human || "Date needed", input: schedule.input || "", time: schedule.time || "" },
    repeat: raw?.repeat || raw?.recurring_frequency || repeatOf(cleanedText),
    role,
    roleText: raw?.roleText || roleText(role),
    gst: raw?.gst || raw?.gstStatus || raw?.gst_status || (actualKind === "invoice" || cleanedText.toLowerCase().includes("gst") ? "GST included" : "Needs check"),
    dueDate: raw?.dueDate || raw?.due_date || isoDate(7),
    title: raw?.title || (actualKind === "person" ? personName : `${raw?.service || service} for ${clientName}`),
    notes: raw?.notes || cleanedText,
    updateNote: raw?.updateNote || noteTextOf(cleanedText),
    originalText,
    cleanedText,
    targetPage: raw?.targetPage || PAGE[actualKind] || "jobs",
    confidence: raw?.confidence ?? null,
  };
  parsed.missing = requiredMissing(parsed);
  return parsed;
}

function liveCanCommit(p, livePreview) {
  if (!p || !livePreview?.bestMatch || livePreview.ambiguity !== "none") return false;
  if (p.intent === "reschedule") return Boolean(p.schedule?.input);
  if (p.intent === "update") return Number(p.amount || 0) > 0 || Boolean(String(p.updateNote || p.notes || "").trim());
  return false;
}

function buildJobUpdatePayload(p) {
  const payload = {};
  if (Number(p.amount || 0) > 0) {
    payload.price = Number(p.amount || 0);
    payload.pricing_type = "fixed";
  }
  const low = String(p.cleanedText || p.notes || "").toLowerCase();
  if (/\b(add note|note to|notes? for)\b/.test(low)) {
    payload.notes = p.updateNote || p.notes || "";
  }
  return payload;
}

function detailsFor(p, livePreview) {
  if (p.intent !== "create") {
    const best = livePreview?.bestMatch;
    return [["Action", p.actionTitle], ["Live match", best ? `${best.label} · ${best.summary || best.status || "matched"}` : "Needs matching"], [p.intent === "reschedule" ? "New date" : "Change", p.intent === "reschedule" ? (p.schedule?.human || "Not supplied") : (Number(p.amount || 0) > 0 ? `Set price to ${p.priceText}` : p.updateNote || p.notes || "Prepared update")], ["Confidence", livePreview?.ambiguity === "none" ? "High" : livePreview?.ambiguity === "multiple_matches" ? "Needs choice" : "Needs review"], ["Notes", p.updateNote || p.notes || "Not supplied"], ["Status", liveCanCommit(p, livePreview) ? "Ready to approve" : "Save to Review"]];
  }
  if (p.kind === "client") return [["Client", p.clientName], ["Email", p.email || "Optional"], ["Phone", p.phone || "Optional"], ["Address", p.address || "Optional"], ["Notes", p.notes || "Optional"]];
  if (p.kind === "person") return [["Person", p.personName], ["Role", p.roleText], ["Email", p.email || "Needed"], ["Phone", p.phone || "Optional"], ["Pay rate", p.payRateText], ["Notes", p.notes || "Optional"]];
  if (p.kind === "invoice") return [["Client", p.clientName], ["Invoice line", p.service], ["Amount", p.priceText], ["GST", p.gst], ["Due", p.dueDate], ["Status", "Draft only"]];
  if (p.kind === "quote") return [["Client", p.clientName], ["Scope", p.service], ["Address", p.address || "Needed"], ["Price", p.priceText], ["GST", p.gst], ["Status", "Draft quote"]];
  return [["Client", p.clientName], ["Job", p.service], ["Address", p.address || "Needed"], ["Schedule", p.schedule.human], ["Price", p.priceText], ["Repeat", p.repeat]];
}

function editFieldsFor(p) {
  if (p.intent !== "create") return ["clientName", "service", "scheduleInput", "amount", "notes"];
  if (p.kind === "person") return ["personName", "role", "email", "phone", "payRate", "notes"];
  if (p.kind === "client") return ["clientName", "address", "email", "phone", "notes"];
  if (p.kind === "invoice") return ["clientName", "service", "amount", "dueDate", "email", "phone", "address", "notes"];
  if (p.kind === "quote") return ["clientName", "service", "address", "amount", "email", "phone", "notes"];
  return ["clientName", "service", "address", "scheduleInput", "amount", "repeat", "area", "email", "phone", "notes"];
}

function fieldLabel(key) { return ({ clientName: "Client / target", personName: "Person name", service: "Job / service", address: "Address", scheduleInput: "Date + time", amount: "Price", repeat: "Repeat", area: "Area", email: "Email", phone: "Phone", notes: "Notes", role: "Role", payRate: "Pay rate", dueDate: "Due date" })[key] || key; }
function fieldPlaceholder(key) { return ({ scheduleInput: "2026-07-23T09:00", email: "Optional for jobs", phone: "Optional", notes: "Optional notes", area: "Taita / Lower Hutt", amount: "60" })[key] || ""; }
function summary(p) { return p.intent !== "create" ? `${p.actionTitle} · ${p.clientName || p.personName || "target needed"}` : p.kind === "person" ? `${p.personName} · ${p.roleText} · ${p.email || "email needed"}` : `${p.clientName} · ${p.service} · ${p.priceText}`; }

function payloadFor(p) {
  if (p.kind === "client") return { endpoints: ["/clients"], success: "Client created", payload: { name: p.clientName, email: p.email || null, phone: p.phone || null, address: p.address || null, notes: p.notes || null } };
  if (p.kind === "person") return { endpoints: ["/team/workers", "/team", "/workers"], success: "Person added", payload: { name: p.personName, email: p.email, phone: p.phone || null, role: p.role, team_role: p.role, pay_rate: Number(p.payRate || 0) || null, notes: p.notes || null } };
  if (p.kind === "quote") return { endpoints: ["/quotes"], success: "Draft quote created", payload: { title: p.title, customer_name: p.clientName, client_name: p.clientName, customer_email: p.email || null, customer_phone: p.phone || null, address: p.address || null, site_address: p.address || null, job_description: p.service, description: p.notes, notes: p.notes, price: Number(p.amount || 0), amount: Number(p.amount || 0), total: Number(p.amount || 0), status: "draft", gst_status: p.gst, lines: [{ description: p.service, amount: Number(p.amount || 0) }] } };
  if (p.kind === "invoice") return { endpoints: ["/invoices"], success: "Draft invoice created", payload: { customer_name: p.clientName, client_name: p.clientName, customer_email: p.email || null, customer_phone: p.phone || null, address: p.address || null, description: p.service, notes: p.notes, status: "draft", amount: Number(p.amount || 0), subtotal: Number(p.amount || 0), total: Number(p.amount || 0), gst_status: p.gst, due_date: p.dueDate, line_items: [{ description: p.service, quantity: 1, unit_price: Number(p.amount || 0), amount: Number(p.amount || 0) }] } };
  return { endpoints: ["/jobs"], success: "Job created", payload: { title: p.title || `${p.service} for ${p.clientName}`, job_name: p.title || `${p.service} for ${p.clientName}`, job_type: p.jobType || "other", client_name: p.clientName, customer_name: p.clientName, customer_email: p.email || null, customer_phone: p.phone || null, address: p.address, site_address: p.address, scheduled_date: p.schedule.input, estimated_duration: 60, country: "New Zealand", region: p.area || "Wellington", notes: p.notes || "", description: p.notes || p.service, status: "assigned", pricing_type: "fixed", fixed_price: Number(p.amount || 0), price: Number(p.amount || 0), is_recurring: p.repeat !== "one-off", recurring_frequency: p.repeat !== "one-off" ? p.repeat : null, recurrence_pattern: p.repeat !== "one-off" ? p.repeat : null } };
}

async function postFirst(post, endpoints, payload) {
  let last = "Could not create this record.";
  for (const endpoint of endpoints) {
    try { const res = await post(endpoint, payload); if (res?.success) return res; last = res?.error || last; }
    catch (e) { last = e?.message || last; }
  }
  return { success: false, error: last };
}

async function saveToReview(p, raw, setStatus, closeModal = () => {}, livePreview = null, post = null) {
  const details = Object.fromEntries(detailsFor(p, livePreview));
  const slip = { id: `tell-churvox-${Date.now()}`, type: p.kind, category: p.intent === "create" ? p.kind : "action", title: `${p.actionTitle} ready for review`, summary: summary(p), urgency: p.missing.length ? "High" : p.intent === "create" ? "Normal" : "Needs matching", found: `Raw note: ${raw}`, prepared: `${p.actionTitle}: ${summary(p)}`, why: p.intent === "create" ? "The note has been cleaned and turned into a safe owner-approved create action." : (livePreview?.bestMatch ? `Matched ${livePreview.bestMatch.label}. Review before applying.` : "This needs owner review before changing anything."), source: "Tell Churvox", page: p.targetPage, details, livePreview, status: "open", createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
  try {
    [REVIEW_INBOX_KEY, LEGACY_COMMAND_INBOX_KEY].forEach((key) => {
      const saved = window.localStorage.getItem(key);
      const current = saved ? JSON.parse(saved) : [];
      window.localStorage.setItem(key, JSON.stringify([slip, ...(Array.isArray(current) ? current : [])].slice(0, 50)));
    });
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-review" } }));
  } catch {}
  if (post) {
    try {
      await post("/ai/actions", { title: slip.title, status: "pending", actionKey: p.intent, recordType: livePreview?.recordType || p.kind, recordId: livePreview?.bestMatch?.id || "", notifyMode: "Internal only", afterApproval: p.intent === "create" ? "Create after owner approval" : "Apply after owner approval", ownerAuditNote: slip.why, form: { parsed: p, livePreview, details }, raw: slip }, { timeout: 12000 });
      setStatus({ tone: "ok", text: "Saved to Review on this account. Nothing changes until approved." });
    } catch {
      setStatus({ tone: "ok", text: "Saved to Review on this device. Nothing changes until approved." });
    }
  } else {
    setStatus({ tone: "ok", text: "Saved to Review. Churvox will not change anything until approved." });
  }
  closeModal();
}

function FieldEditor({ parsed, patchDraft }) {
  const inputValue = (key) => key === "scheduleInput" ? parsed.schedule?.input || "" : parsed[key] ?? "";
  return (
    <div className="freshQuickAiEdit">
      <b>Fix details here</b>
      <div>
        {editFieldsFor(parsed).map((key) => (
          <label key={key} className={key === "notes" ? "wide" : ""}>
            <span>{fieldLabel(key)}</span>
            {key === "notes" ? <textarea value={inputValue(key)} placeholder={fieldPlaceholder(key)} onChange={(e) => patchDraft(key, e.target.value)} />
              : key === "repeat" ? <select value={inputValue(key)} onChange={(e) => patchDraft(key, e.target.value)}><option value="one-off">One-off</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="custom">Custom</option></select>
              : key === "role" ? <select value={inputValue(key)} onChange={(e) => patchDraft(key, e.target.value)}><option value="worker">Worker</option><option value="lead_worker">Lead worker</option><option value="subcontractor">Subcontractor</option><option value="payroll">Payroll only</option></select>
              : <input type={key === "amount" || key === "payRate" ? "number" : key === "scheduleInput" ? "datetime-local" : key === "dueDate" ? "date" : "text"} value={inputValue(key)} placeholder={fieldPlaceholder(key)} onChange={(e) => patchDraft(key, e.target.value)} />}
          </label>
        ))}
      </div>
    </div>
  );
}

function LiveMatchBlock({ livePreview }) {
  if (!livePreview) return <div className="freshQuickAiStatus need"><b>Live match</b><span>Churvox will search your records when you ask it to understand.</span></div>;
  const matches = Array.isArray(livePreview.matches) ? livePreview.matches : [];
  return (
    <div className={livePreview.canCommit || (livePreview.bestMatch && livePreview.ambiguity === "none") ? "freshQuickAiStatus ok" : "freshQuickAiStatus need"}>
      <b>{livePreview.previewTitle || "Live match"}</b>
      <span>{(livePreview.previewLines || []).join(" ") || (livePreview.bestMatch ? `Found ${livePreview.bestMatch.label}` : "No confident live match yet.")}</span>
      {matches.length > 1 ? <span>{matches.slice(0, 3).map((m) => `${m.label}${m.summary ? ` — ${m.summary}` : ""}`).join(" | ")}</span> : null}
    </div>
  );
}

function ApprovalModal({ parsed, rawText, saving, analysing, livePreview, onClose, onApprove, onReview, patchDraft }) {
  if (!parsed) return null;
  const canApproveLive = liveCanCommit(parsed, livePreview);
  return (
    <div className="freshQuickAiModalShade" role="dialog" aria-modal="true" aria-label="Tell Churvox approval">
      <div className="freshQuickAiModal">
        <button className="freshQuickAiModalClose" type="button" onClick={onClose}>×</button>
        <header>
          <span>Churvox understood this</span>
          <h2>{parsed.actionTitle}</h2>
          <p>{parsed.intent === "create" ? "Check the details, edit anything, then approve. Nothing happens until you approve." : canApproveLive ? "Churvox found the live job. Check the match, then approve the change." : "Churvox has prepared this action. Save it to Review if the match needs checking first."}</p>
        </header>
        <div className="freshQuickAiModalGrid">
          <section className="freshQuickAiResult modalCards">
            {detailsFor(parsed, livePreview).map(([label, value]) => <section key={label} className={String(value).toLowerCase().includes("needed") || String(value).toLowerCase().includes("needs") ? "need" : ""}><b>{label}</b><p>{value}</p></section>)}
          </section>
          <section className="freshQuickAiPrepared modalExplain">
            <b>You typed</b><p>{rawText}</p>
            <b>Churvox cleaned</b><p>{parsed.cleanedText}</p>
            <b>Why this is safe</b><p>{parsed.intent === "create" ? "This creates a draft/record only after owner approval. Invoices are draft only." : canApproveLive ? "This updates the matched job only after this approval." : "This will not update a live record until Churvox is confident or you review it."}</p>
          </section>
        </div>
        {parsed.intent !== "create" ? <LiveMatchBlock livePreview={livePreview} /> : null}
        <FieldEditor parsed={parsed} patchDraft={patchDraft} />
        {parsed.missing.length ? <div className="freshQuickAiMissing"><b>Required before approve</b><span>{parsed.missing.join(", ")}</span></div> : null}
        <div className="freshQuickAiModalActions">
          <button type="button" onClick={onApprove} disabled={saving || analysing || parsed.missing.length > 0 || (parsed.intent !== "create" && !canApproveLive)}>{saving ? "Working…" : parsed.intent === "create" ? `Approve + create ${parsed.label}` : canApproveLive ? "Approve change" : "Needs Review first"}</button>
          <button type="button" onClick={onReview}>Save to Review</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function FreshAiQuickCreateTypoFix({ onNavigate }) {
  const { post, patch } = useApi();
  const [text, setText] = React.useState(examples.job);
  const [draft, setDraft] = React.useState(null);
  const [livePreview, setLivePreview] = React.useState(null);
  const [aiInfo, setAiInfo] = React.useState({ provider: "local", ai_enabled: false });
  const [saving, setSaving] = React.useState(false);
  const [analysing, setAnalysing] = React.useState(false);
  const [status, setStatus] = React.useState(null);
  const [reviewOpen, setReviewOpen] = React.useState(false);

  const localParsed = React.useMemo(() => normalise({}, text), [text]);
  const parsed = draft || localParsed;
  const details = React.useMemo(() => detailsFor(parsed, livePreview), [parsed, livePreview]);
  const typoFixed = cleanOwnerText(text) !== String(text || "").replace(/\s+/g, " ").trim();

  function resetDraft() { setDraft(null); setLivePreview(null); setAiInfo({ provider: "local", ai_enabled: false }); setReviewOpen(false); }
  function updateText(value) { setText(value); setStatus(null); resetDraft(); }
  function loadExample(key) { setText(examples[key] || examples.job); setStatus(null); resetDraft(); }

  function patchDraft(key, value) {
    const base = parsed;
    const next = { ...base };
    if (key === "scheduleInput") next.schedule = { ...base.schedule, input: value, human: value ? value.replace("T", " · ") : "Date needed" };
    else if (key === "amount" || key === "payRate") next[key] = Number(value || 0);
    else next[key] = value;
    next.priceText = money(next.amount);
    next.payRateText = next.payRate ? `$${next.payRate}/hr` : "Not set";
    next.roleText = roleText(next.role);
    next.title = next.kind === "person" ? next.personName : `${next.service} for ${next.clientName}`;
    next.updateNote = key === "notes" ? noteTextOf(value) : next.updateNote;
    next.missing = requiredMissing(next);
    setDraft(next);
    setLivePreview(null);
    setStatus(null);
  }

  async function loadLivePreview(candidate) {
    if (!candidate) return null;
    try {
      const res = await post("/tell-churvox/preview", { text: candidate.cleanedText || text, parsed: candidate, intent: candidate.intent, kind: candidate.kind }, { timeout: 15000 });
      if (!res?.success) {
        const fallback = { success: false, previewTitle: "Live match unavailable", previewLines: [res?.error || "Could not search records yet."], matches: [], canCommit: false, ambiguity: "error" };
        setLivePreview(fallback);
        return fallback;
      }
      const body = res.data || {};
      setLivePreview(body);
      return body;
    } catch (error) {
      const fallback = { success: false, previewTitle: "Live match unavailable", previewLines: [error?.message || "Could not search records yet."], matches: [], canCommit: false, ambiguity: "error" };
      setLivePreview(fallback);
      return fallback;
    }
  }

  async function askRealAi({ quiet = false, openReview = false } = {}) {
    if (!text.trim()) { setStatus({ tone: "need", text: "Tell Churvox what you want done first." }); return null; }
    setAnalysing(true);
    if (!quiet) setStatus(null);
    const cleaned = cleanOwnerText(text);
    const res = await post("/ai/quick-create/parse", { kind: "auto", text: cleaned, rawText: text, typo_cleaned: cleaned !== text, timezone: "Pacific/Auckland" }, { timeout: 30000 });
    let next = normalise({}, cleaned);
    if (res?.success) {
      const body = res.data || {};
      next = normalise(body.parsed || body.data?.parsed || {}, cleaned);
      next.originalText = text;
      next.cleanedText = cleaned;
      setAiInfo({ provider: body.provider || "ai", ai_enabled: Boolean(body.ai_enabled), model: body.model || "" });
    } else if (!quiet) {
      setStatus({ tone: "need", text: res?.error || "AI could not read this yet. Safe preview is still available." });
    }
    setDraft(next);
    const live = await loadLivePreview(next);
    setAnalysing(false);
    if (!quiet) {
      const liveMsg = next.intent !== "create" && live?.bestMatch ? ` I found ${live.bestMatch.label}.` : "";
      setStatus({ tone: res?.success && res?.data?.ai_enabled ? "ok" : "need", text: res?.data?.ai_enabled ? `Churvox understood it.${liveMsg} Check the approval pop-up.` : ((res?.data?.message || "OpenAI key is not configured, so Churvox used safe extraction.") + liveMsg) });
    }
    if (openReview) setReviewOpen(true);
    return next;
  }

  async function openApproval() {
    const next = draft || await askRealAi({ quiet: true, openReview: false });
    if (next && next.intent !== "create" && !livePreview) await loadLivePreview(next);
    if (next) setReviewOpen(true);
  }

  async function createRecord(candidate = null) {
    setStatus(null);
    const ready = candidate || draft || await askRealAi({ quiet: true });
    if (!ready) return;
    if (ready.intent !== "create") {
      const live = livePreview || await loadLivePreview(ready);
      if (!liveCanCommit(ready, live) || !live?.bestMatch) {
        await saveToReview(ready, text, setStatus, () => setReviewOpen(false), live, post);
        return;
      }
      setSaving(true);
      if (ready.intent === "update") {
        const payload = buildJobUpdatePayload(ready);
        if (!Object.keys(payload).length) {
          setSaving(false);
          await saveToReview(ready, text, setStatus, () => setReviewOpen(false), live, post);
          return;
        }
        const res = await patch(`/jobs/${live.bestMatch.id}`, payload, { timeout: 20000 });
        setSaving(false);
        if (!res?.success) {
          setStatus({ tone: "need", text: `${res?.error || "Job update failed"}. Saved to Review instead.` });
          await saveToReview(ready, text, setStatus, () => setReviewOpen(false), live, post);
          return;
        }
        window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-job-update", source: "tell-churvox" } }));
        setReviewOpen(false);
        setStatus({ tone: "ok", text: Number(ready.amount || 0) > 0 ? `Updated ${live.bestMatch.label} to ${ready.priceText}.` : `Added note to ${live.bestMatch.label}.` });
        return;
      }
      const res = await post("/tell-churvox/commit", { text, parsed: ready, match: live.bestMatch, intent: ready.intent }, { timeout: 20000 });
      setSaving(false);
      if (!res?.success) {
        setStatus({ tone: "need", text: `${res?.error || "Change failed"}. Saved to Review instead.` });
        await saveToReview(ready, text, setStatus, () => setReviewOpen(false), live, post);
        return;
      }
      window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: "tell-churvox-live-update", source: "tell-churvox" } }));
      setReviewOpen(false);
      setStatus({ tone: "ok", text: res?.data?.message || "Change approved and applied." });
      return;
    }
    if (ready.missing.length) { setStatus({ tone: "need", text: `Add ${ready.missing.join(", ")} in the approval pop-up before Churvox creates it.` }); setReviewOpen(true); return; }
    setSaving(true);
    const plan = payloadFor(ready);
    const res = await postFirst(post, plan.endpoints, plan.payload);
    setSaving(false);
    if (!res.success) { setStatus({ tone: "need", text: `${res.error || "Create failed"}. You can still save this to Review.` }); return; }
    window.dispatchEvent(new CustomEvent("churvox:fresh-data-updated", { detail: { type: `${ready.kind}-created`, source: "tell-churvox" } }));
    setReviewOpen(false);
    setStatus({ tone: "ok", text: `${plan.success}. Churvox used the approved pop-up details.` });
  }

  return (
    <section className="freshQuickAiPage">
      <div className="freshQuickAiHero">
        <div>
          <span>Tell Churvox</span>
          <h1>Say what you want done.</h1>
          <p>No dropdown. Type messy. Churvox works out if it is a job, invoice, quote, person, search, message, or update — then opens an approval pop-up.</p>
        </div>
        <div className="freshQuickAiStats">
          <div><b>{parsed.actionTitle}</b><small>understood</small></div>
          <div><b>{parsed.priceText}</b><small>money</small></div>
          <div><b>{parsed.missing.length}</b><small>required</small></div>
          <div><b>{aiInfo.ai_enabled ? "Real AI" : typoFixed ? "Typo fix" : "Smart"}</b><small>{aiInfo.provider}</small></div>
        </div>
      </div>

      <div className="freshQuickAiGrid">
        <article className="freshQuickAiPanel">
          <header><span>One brain</span><h2>Tell Churvox like a real assistant.</h2><p>Try: move Bob to next week, change Bob to $70, add note to Bob, or chase unpaid invoices.</p></header>
          <textarea value={text} onChange={(e) => updateText(e.target.value)} placeholder="Example: Bob 16 Taita drive $60 repeat 23/07/09" />
          {typoFixed ? <div className="freshQuickAiStatus ok"><b>Auto cleaned</b><span>{cleanOwnerText(text)}</span></div> : null}
          <div className="freshQuickAiButtons">
            <button type="button" onClick={() => askRealAi({ openReview: true })} disabled={analysing}>{analysing ? "Thinking…" : "Understand + show pop-up"}</button>
            <button type="button" onClick={openApproval} disabled={saving || analysing}>Open approval pop-up</button>
            <button type="button" onClick={() => loadExample("job")}>Job</button>
            <button type="button" onClick={() => loadExample("move")}>Move job</button>
            <button type="button" onClick={() => loadExample("price")}>Price</button>
            <button type="button" onClick={() => loadExample("note")}>Note</button>
            <button type="button" onClick={() => loadExample("invoice")}>Invoice</button>
            <button type="button" onClick={() => loadExample("money")}>Money</button>
          </div>
          {status ? <div className={`freshQuickAiStatus ${status.tone}`}><b>{status.tone === "ok" ? "Done" : "Needs attention"}</b><span>{status.text}</span></div> : null}
        </article>

        <article className="freshQuickAiPanel">
          <header><span>{aiInfo.ai_enabled ? "Real AI preview" : "Smart preview"}</span><h2>{parsed.actionTitle}</h2><p>This is the preview. The approval pop-up is where Churvox does the final owner check.</p></header>
          <div className="freshQuickAiResult">{details.map(([label, value]) => <section key={label} className={String(value).toLowerCase().includes("needed") || String(value).toLowerCase().includes("needs") ? "need" : ""}><b>{label}</b><p>{value}</p></section>)}</div>
          {parsed.intent !== "create" ? <LiveMatchBlock livePreview={livePreview} /> : null}
          <div className="freshQuickAiPrepared"><b>Original</b><p>{text || "Tell Churvox what to do."}</p><b>Cleaned</b><p>{parsed.cleanedText || cleanOwnerText(text)}</p><b>Safe rule</b><p>{parsed.intent === "create" ? "Creates only after approval. Invoices stay draft only." : liveCanCommit(parsed, livePreview) ? "Churvox found a live match. It only updates after you approve." : "Update/search/message actions are saved for Review unless the live match is confident."}</p></div>
          {parsed.missing.length ? <div className="freshQuickAiMissing"><b>Required before safe create</b><span>{parsed.missing.join(", ")}</span></div> : null}
          <div className="freshQuickAiButtons"><button type="button" onClick={openApproval} disabled={saving || analysing}>Open approval pop-up</button><button type="button" onClick={() => onNavigate?.(parsed.targetPage)}>Open {parsed.targetPage}</button></div>
        </article>
      </div>

      <ApprovalModal parsed={reviewOpen ? parsed : null} rawText={text} saving={saving} analysing={analysing} livePreview={livePreview} onClose={() => setReviewOpen(false)} onApprove={() => createRecord(parsed)} onReview={() => saveToReview(parsed, text, setStatus, () => setReviewOpen(false), livePreview, post)} patchDraft={patchDraft} />
    </section>
  );
}
